import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { z } from "zod";

export const EMAIL_PLACEHOLDERS = [
  "nome_app", "nome_organizzazione", "nome_utente", "email_utente",
  "password_temporanea", "url_accesso", "nome_amministratore",
] as const;

export const DEFAULT_EMAIL_SUBJECT = "Accesso a {{nome_app}} — {{nome_organizzazione}}";
export const DEFAULT_EMAIL_BODY = `Ciao {{nome_utente}},

il tuo account per {{nome_app}} è pronto.

Indirizzo di accesso: {{url_accesso}}
Email: {{email_utente}}
Password temporanea: {{password_temporanea}}

Al primo accesso ti verrà richiesto di impostare una nuova password personale. Non condividere queste credenziali.

Se hai già utilizzato l'app, queste credenziali sostituiscono quelle precedenti.
Per assistenza puoi rispondere a questa email.

{{nome_amministratore}}
{{nome_organizzazione}}`;

export class EmailError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

// No arbitrary SMTP hosts/ports: credentials are sent only to Google's TLS endpoint.
export const EmailDraft = z.object({
  loginUrl: z.string().url().max(2048).refine(value => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password && !url.hash;
    } catch { return false; }
  }, "Inserisci un indirizzo di accesso HTTPS, senza credenziali o frammenti."),
  subject: z.string().trim().min(1).max(200).refine(value => !/[\r\n]/.test(value), "L'oggetto non può contenere ritorni a capo."),
  body: z.string().trim().min(1).max(12000),
});

export function validateTemplate(subject: string, body: string) {
  const combined = subject + "\n" + body;
  const tokens = [...combined.matchAll(/{{\s*([^{}]+?)\s*}}/g)].map(m => m[1]);
  if (tokens.some(t => !(EMAIL_PLACEHOLDERS as readonly string[]).includes(t))) {
    throw new EmailError(400, "INVALID_TEMPLATE", "Il template contiene un segnaposto non supportato.");
  }
  // Credential secrets must never appear in a subject (notifications, mail indexes).
  if (/{{\s*password_temporanea\s*}}/.test(subject)) {
    throw new EmailError(400, "INVALID_TEMPLATE", "La password temporanea può comparire solo nel corpo dell'email.");
  }
  for (const required of ["email_utente", "password_temporanea", "url_accesso"]) {
    if (!new RegExp(`{{\\s*${required}\\s*}}`).test(body)) {
      throw new EmailError(400, "INVALID_TEMPLATE", `Nel corpo è richiesto il segnaposto {{${required}}}.`);
    }
  }
  if (combined.replace(/{{\s*([^{}]+?)\s*}}/g, "").includes("{{") ||
      combined.replace(/{{\s*([^{}]+?)\s*}}/g, "").includes("}}")) {
    throw new EmailError(400, "INVALID_TEMPLATE", "Controlla le parentesi dei segnaposto del template.");
  }
}

function encryptionKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new EmailError(503, "EMAIL_KEY_UNAVAILABLE", "L'invio email richiede una SESSION_SECRET stabile di almeno 32 caratteri sul server.");
  }
  // Domain separation: never use the JWT signing key directly as an AES key.
  return Buffer.from(hkdfSync("sha256", secret, "skiarea-mail-v1", "gmail-app-password", 32));
}

export function encryptAppPassword(password: string, userId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(userId));
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptAppPassword(value: string, userId: string) {
  try {
    const [version, iv, tag, encrypted] = value.split(".");
    if (version !== "v1" || !iv || !tag || !encrypted) throw new Error("Invalid ciphertext");
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
    decipher.setAAD(Buffer.from(userId));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
  } catch (error) {
    if (error instanceof EmailError) throw error;
    throw new EmailError(409, "EMAIL_RECONNECT_REQUIRED", "Reinserisci la password per app Gmail: la configurazione protetta non è più leggibile.");
  }
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]!));

export function renderEmail(subject: string, body: string, variables: Record<string, string>) {
  validateTemplate(subject, body);
  const render = (text: string) => text.replace(/{{\s*([^{}]+?)\s*}}/g, (_, key: string) => variables[key] ?? "");
  const renderedSubject = render(subject).replace(/[\r\n]/g, " ");
  const text = render(body);
  // Treat template and substitutions as plain text, escaping every HTML character.
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"></head><body style="margin:0;background:#eef7fb;font-family:Arial,sans-serif;color:#173044"><div style="max-width:600px;margin:32px auto;background:#fff;border-top:5px solid #0878ae;padding:32px;border-radius:12px"><h1 style="font-size:22px;margin:0 0 24px">${escapeHtml(renderedSubject)}</h1><div style="font-size:15px;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(text)}</div></div></body></html>`;
  return { subject: renderedSubject, text, html };
}

export interface GmailMessage {
  senderEmail: string;
  senderName: string;
  appPassword: string;
  recipient: string;
  subject: string;
  text: string;
  html: string;
}
export type GmailSender = (message: GmailMessage) => Promise<{ messageId: string }>;

export const sendViaGmail: GmailSender = async message => {
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com", port: 465, secure: true,
    auth: { user: message.senderEmail, pass: message.appPassword },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
    logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true,
    tls: { minVersion: "TLSv1.2", servername: "smtp.gmail.com" },
  });
  try {
    const result = await transport.sendMail({
      from: { name: message.senderName, address: message.senderEmail },
      replyTo: message.senderEmail, to: message.recipient,
      subject: message.subject, text: message.text, html: message.html,
    });
    if (!result.accepted?.some(address => String(address).toLowerCase() === message.recipient.toLowerCase())) {
      throw new EmailError(502, "EMAIL_SEND_FAILED", "Gmail non ha accettato il destinatario. La password precedente non è stata modificata.");
    }
    return { messageId: result.messageId };
  } catch (error) {
    if (error instanceof EmailError) throw error;
    const code = (error as { code?: string })?.code;
    if (code === "EAUTH") {
      throw new EmailError(502, "GMAIL_AUTH_FAILED", "Gmail ha rifiutato l'accesso. Verifica la password per app e le autorizzazioni Google Workspace. Nessuna password utente è stata modificata.");
    }
    // Never return/log the SMTP response; it may contain addresses or message content.
    throw new EmailError(502, "EMAIL_SEND_FAILED", "Invio non confermato da Gmail. Controlla la connessione e la configurazione. La password precedente non è stata modificata.");
  } finally {
    transport.close();
  }
};
