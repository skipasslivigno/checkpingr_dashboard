import { Router, type Request, type Response, type NextFunction, type RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db, emailSettingsTable, usersTable, tenantsTable } from "@workspace/db";
import { requireRole } from "../middleware/requireAuth";
import { z } from "zod";
import {
  DEFAULT_EMAIL_BODY, DEFAULT_EMAIL_SUBJECT, EMAIL_PLACEHOLDERS, EmailDraft, EmailError,
  encryptAppPassword, decryptAppPassword, renderEmail, sendViaGmail, validateTemplate, type GmailSender,
} from "../lib/email";

const ConfigInput = EmailDraft.extend({
  senderName: z.string().trim().min(1).max(120).refine(value => !/[\r\n]/.test(value)),
  appPassword: z.string().max(64).optional(),
});
const PreviewInput = EmailDraft.extend({ userId: z.string().uuid().optional() });
const SendInput = z.object({ confirmReset: z.literal(true), expectedEmail: z.string().email() });
const idSchema = z.string().uuid();

// Error responses are deliberately sanitized: no secrets, email content or SQL.
function handled(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch(error => {
      res.setHeader("Cache-Control", "no-store");
      if (error instanceof EmailError) {
        res.status(error.status).json({ error: error.message, code: error.code });
      } else {
        req.log?.error({ code: "EMAIL_INTERNAL_ERROR" }, "Email operation failed");
        res.status(500).json({ error: "Operazione email non completata. Controlla lo stato dell'utente prima di riprovare.", code: "EMAIL_INTERNAL_ERROR" });
      }
    });
  };
}

function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new EmailError(400, "INVALID_EMAIL_INPUT", result.error.issues.map(i => i.message).join(" "));
  return result.data;
}
function cooldown(last: Date | null) {
  if (last && Date.now() - last.getTime() < 60000) {
    throw new EmailError(429, "EMAIL_COOLDOWN", "Attendi almeno un minuto prima di inviare nuovamente.");
  }
}

export function createEmailRouter(deliver: GmailSender = sendViaGmail) {
  const router = Router();
  router.use(["/email", "/users/:id/send-credentials"], requireRole("admin"), (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  async function getConfig(userId: string) {
    const [config] = await db.select().from(emailSettingsTable).where(eq(emailSettingsTable.userId, userId));
    return config;
  }
  function requireConfig(config: Awaited<ReturnType<typeof getConfig>>, email: string) {
    if (!config || config.senderEmail.toLowerCase() !== email.toLowerCase()) {
      throw new EmailError(400, "EMAIL_NOT_CONFIGURED", "Configura prima Gmail con l'indirizzo dell'amministratore attualmente collegato.");
    }
    return config;
  }
  function safeConfig(config: Awaited<ReturnType<typeof getConfig>>, email: string, name: string) {
    const valid = !!config && config.senderEmail.toLowerCase() === email.toLowerCase();
    return {
      senderEmail: email, senderName: config?.senderName ?? name, hasPassword: valid,
      configured: valid, loginUrl: config?.loginUrl ?? "", subject: config?.subject ?? DEFAULT_EMAIL_SUBJECT,
      body: config?.body ?? DEFAULT_EMAIL_BODY, defaultSubject: DEFAULT_EMAIL_SUBJECT,
      defaultBody: DEFAULT_EMAIL_BODY, placeholders: EMAIL_PLACEHOLDERS,
    };
  }
  async function variables(req: Request, recipient?: { name: string; email: string }) {
    const [tenant] = await db.select({ name: tenantsTable.name }).from(tenantsTable).where(eq(tenantsTable.id, req.user!.tenantId));
    return {
      nome_app: "Ski Area Dashboard", nome_organizzazione: tenant?.name ?? "",
      nome_utente: recipient?.name ?? "Nome utente", email_utente: recipient?.email ?? "utente@example.com",
      nome_amministratore: req.user!.name,
    };
  }

  router.get("/email/settings", handled(async (req, res) => {
    res.json(safeConfig(await getConfig(req.user!.userId), req.user!.email, req.user!.name));
  }));

  router.put("/email/settings", handled(async (req, res) => {
    const data = parsed(ConfigInput, req.body);
    validateTemplate(data.subject, data.body);
    const { userId, email, name } = req.user!;
    const old = await getConfig(userId);
    const password = data.appPassword?.replace(/\s/g, "");
    if (password && !/^[a-zA-Z]{16}$/.test(password)) {
      throw new EmailError(400, "INVALID_APP_PASSWORD", "Inserisci la password per app Google di 16 lettere, non la password normale della casella.");
    }
    if (!password && (!old || old.senderEmail.toLowerCase() !== email.toLowerCase())) {
      throw new EmailError(400, "APP_PASSWORD_REQUIRED", "Inserisci la password per app Gmail di questo amministratore.");
    }
    const encryptedPassword = password ? encryptAppPassword(password, userId) : old!.encryptedPassword;
    // Fail explicitly if the server key changed, rather than saving an unreadable secret.
    if (!password) decryptAppPassword(encryptedPassword, userId);
    const [saved] = await db.insert(emailSettingsTable).values({
      userId, senderEmail: email, senderName: data.senderName, encryptedPassword,
      loginUrl: data.loginUrl, subject: data.subject, body: data.body,
    }).onConflictDoUpdate({ target: emailSettingsTable.userId, set: {
      senderEmail: email, senderName: data.senderName, encryptedPassword, loginUrl: data.loginUrl,
      subject: data.subject, body: data.body, updatedAt: new Date(),
    } }).returning();
    res.json(safeConfig(saved, email, name));
  }));

  router.delete("/email/settings", handled(async (req, res) => {
    await db.delete(emailSettingsTable).where(eq(emailSettingsTable.userId, req.user!.userId));
    res.status(204).send();
  }));

  router.post("/email/preview", handled(async (req, res) => {
    const data = parsed(PreviewInput, req.body);
    let recipient: { name: string; email: string } | undefined;
    if (data.userId) {
      [recipient] = await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable)
        .where(and(eq(usersTable.id, data.userId), eq(usersTable.tenantId, req.user!.tenantId)));
      if (!recipient) throw new EmailError(404, "USER_NOT_FOUND", "Utente non trovato.");
    }
    const rendered = renderEmail(data.subject, data.body, {
      ...await variables(req, recipient), password_temporanea: "[PASSWORD DI ESEMPIO — NON VALIDA]",
      url_accesso: data.loginUrl,
    });
    res.json({ ...rendered, senderEmail: req.user!.email, recipient: recipient?.email ?? "utente@example.com" });
  }));

  router.post("/email/test", handled(async (req, res) => {
    const receipt = await db.transaction(async tx => {
      const [row] = await tx.select().from(emailSettingsTable).where(eq(emailSettingsTable.userId, req.user!.userId)).for("update");
      const config = requireConfig(row, req.user!.email);
      cooldown(config.lastTestAt);
      const result = await deliver({
        senderEmail: req.user!.email, senderName: config.senderName,
        appPassword: decryptAppPassword(config.encryptedPassword, req.user!.userId),
        recipient: req.user!.email, subject: "Prova invio email — Ski Area Dashboard",
        text: "Gmail ha accettato l'invio di questa email di prova. Nessuna password utente è stata modificata.",
        html: "<p>Gmail ha accettato l'invio di questa email di prova. Nessuna password utente è stata modificata.</p>",
      });
      const now = new Date();
      await tx.update(emailSettingsTable).set({ lastTestAt: now }).where(eq(emailSettingsTable.userId, req.user!.userId));
      return { sentAt: now.toISOString(), recipient: req.user!.email, messageId: result.messageId };
    });
    res.json(receipt);
  }));

  router.post("/users/:id/send-credentials", handled(async (req, res) => {
    const id = parsed(idSchema, req.params["id"]);
    const input = parsed(SendInput, req.body);
    const config = requireConfig(await getConfig(req.user!.userId), req.user!.email);
    const appPassword = decryptAppPassword(config.encryptedPassword, req.user!.userId);
    const common = await variables(req);
    const receipt = await db.transaction(async tx => {
      // Serializes repeated sends and account edits. SMTP rejection rolls back without
      // changing the old hash, flag or sessions. No plaintext password is persisted.
      const [target] = await tx.select().from(usersTable)
        .where(and(eq(usersTable.id, id), eq(usersTable.tenantId, req.user!.tenantId))).for("update");
      if (!target) throw new EmailError(404, "USER_NOT_FOUND", "Utente non trovato.");
      if (!target.isActive) throw new EmailError(409, "USER_INACTIVE", "L'utente è disattivato. Attivalo prima di inviare le credenziali.");
      if (input.expectedEmail.toLowerCase() !== target.email.toLowerCase()) {
        throw new EmailError(409, "RECIPIENT_CHANGED", "L'indirizzo del destinatario è cambiato. Ricarica l'elenco utenti.");
      }
      cooldown(target.credentialsSentAt);
      const password = "Tmp!" + randomBytes(18).toString("base64url");
      const passwordHash = await bcrypt.hash(password, 12);
      const rendered = renderEmail(config.subject, config.body, {
        ...common, nome_utente: target.name, email_utente: target.email,
        password_temporanea: password, url_accesso: config.loginUrl,
      });
      const result = await deliver({
        senderEmail: req.user!.email, senderName: config.senderName, appPassword,
        recipient: target.email, ...rendered,
      });
      const now = new Date();
      await tx.update(usersTable).set({
        passwordHash, mustChangePassword: true, sessionVersion: target.sessionVersion + 1,
        credentialsSentAt: now,
      }).where(eq(usersTable.id, target.id));
      return { sentAt: now.toISOString(), recipient: target.email, messageId: result.messageId };
    });
    res.json(receipt);
  }));
  return router;
}

export default createEmailRouter();
