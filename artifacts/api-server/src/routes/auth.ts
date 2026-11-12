import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, and, sql } from "drizzle-orm";
import { db, usersTable, tenantsTable } from "@workspace/db";
import { z } from "zod";

const router = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Server misconfiguration: SESSION_SECRET not set" });
    return;
  }

  const user = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.email, email.toLowerCase().trim()), eq(usersTable.isActive, true)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = jwt.sign(
    { userId: user.id, tenantId: user.tenantId, role: user.role, email: user.email, name: user.name, sessionVersion: user.sessionVersion },
    secret,
    { expiresIn: "30d" },
  );

  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId, mustChangePassword: user.mustChangePassword } });
});

const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72).refine((value) => Buffer.byteLength(value, "utf8") <= 72),
});

router.post("/auth/change-password", async (req, res): Promise<void> => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "New password must contain 8 to 72 characters (maximum 72 UTF-8 bytes)", code: "INVALID_PASSWORD" });
    return;
  }
  const [user] = await db.select().from(usersTable)
    .where(and(eq(usersTable.id, req.user!.userId), eq(usersTable.tenantId, req.user!.tenantId), eq(usersTable.isActive, true))).limit(1);
  if (!user?.passwordHash || !await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)) {
    res.status(400).json({ error: "Current password is incorrect", code: "INVALID_CURRENT_PASSWORD" });
    return;
  }
  if (await bcrypt.compare(parsed.data.newPassword, user.passwordHash)) {
    res.status(400).json({ error: "New password must differ from the current password", code: "PASSWORD_REUSED" });
    return;
  }
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  const [updated] = await db.update(usersTable).set({
    passwordHash, mustChangePassword: false, sessionVersion: sql`${usersTable.sessionVersion} + 1`,
  }).where(and(eq(usersTable.id, user.id), eq(usersTable.sessionVersion, user.sessionVersion), eq(usersTable.isActive, true)))
    .returning();
  if (!updated) {
    res.status(409).json({ error: "Account changed; sign in again", code: "ACCOUNT_CHANGED" });
    return;
  }
  const token = jwt.sign({
    userId: updated.id, tenantId: updated.tenantId, role: updated.role, email: updated.email,
    name: updated.name, sessionVersion: updated.sessionVersion,
  }, process.env.SESSION_SECRET!, { expiresIn: "30d" });
  res.json({ token, user: {
    id: updated.id, tenantId: updated.tenantId, name: updated.name, email: updated.email,
    role: updated.role, mustChangePassword: updated.mustChangePassword,
  } });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await db
    .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name, role: usersTable.role, tenantId: usersTable.tenantId, mustChangePassword: usersTable.mustChangePassword })
    .from(usersTable)
    .where(eq(usersTable.id, req.user.userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const tenant = await db
    .select({ id: tenantsTable.id, name: tenantsTable.name, slug: tenantsTable.slug })
    .from(tenantsTable)
    .where(eq(tenantsTable.id, user.tenantId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  res.json({ ...user, tenant });
});

export default router;
