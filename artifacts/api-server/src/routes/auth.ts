import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, and } from "drizzle-orm";
import { db, usersTable, tenantsTable } from "@workspace/db";

const router = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
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
    { userId: user.id, tenantId: user.tenantId, role: user.role, email: user.email, name: user.name },
    secret,
    { expiresIn: "30d" },
  );

  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId } });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await db
    .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name, role: usersTable.role, tenantId: usersTable.tenantId })
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
