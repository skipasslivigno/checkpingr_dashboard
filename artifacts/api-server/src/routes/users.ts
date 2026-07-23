import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireRole } from "../middleware/requireAuth";
import { z } from "zod";

const router = Router();

const CreateUserBody = z.object({
  email:    z.string().email(),
  name:     z.string().min(1),
  password: z.string().min(8),
  role:     z.enum(["admin", "operator", "viewer"]).default("viewer"),
});

const UpdateUserBody = z.object({
  name:     z.string().min(1).optional(),
  role:     z.enum(["admin", "operator", "viewer"]).optional(),
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
});

router.get("/users", requireRole("admin"), async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const users = await db
    .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name, role: usersTable.role, isActive: usersTable.isActive, createdAt: usersTable.createdAt })
    .from(usersTable)
    .where(eq(usersTable.tenantId, tenantId))
    .orderBy(usersTable.createdAt);

  res.json(users);
});

router.post("/users", requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const tenantId = req.user!.tenantId;
  const { email, name, password, role } = parsed.data;

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.email, email.toLowerCase()), eq(usersTable.tenantId, tenantId)))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (existing) {
    res.status(409).json({ error: "A user with this email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(usersTable)
    .values({ tenantId, email: email.toLowerCase(), name, passwordHash, role })
    .returning({ id: usersTable.id, email: usersTable.email, name: usersTable.name, role: usersTable.role, isActive: usersTable.isActive });

  res.status(201).json(user);
});

router.patch("/users/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const tenantId = req.user!.tenantId;
  const id = String(req.params["id"]);
  const { name, role, password, isActive } = parsed.data;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (role !== undefined) updates.role = role;
  if (isActive !== undefined) updates.isActive = isActive;
  if (password !== undefined) updates.passwordHash = await bcrypt.hash(password, 12);

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(and(eq(usersTable.id, id), eq(usersTable.tenantId, tenantId)))
    .returning({ id: usersTable.id, email: usersTable.email, name: usersTable.name, role: usersTable.role, isActive: usersTable.isActive });

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(updated);
});

router.delete("/users/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const id = String(req.params["id"]);

  if (id === req.user!.userId) {
    res.status(400).json({ error: "Cannot delete your own account" });
    return;
  }

  const [deleted] = await db
    .delete(usersTable)
    .where(and(eq(usersTable.id, id), eq(usersTable.tenantId, tenantId)))
    .returning({ id: usersTable.id });

  if (!deleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.status(204).send();
});

export default router;
