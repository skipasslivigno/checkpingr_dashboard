import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, tenantsTable, usersTable } from "@workspace/db";
import { z } from "zod";

const router = Router();

const InitBody = z.object({
  tenantName: z.string().min(1),
  tenantSlug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  adminEmail:    z.string().email(),
  adminName:     z.string().min(1),
  adminPassword: z.string().min(8),
});

router.post("/setup/init", async (req, res): Promise<void> => {
  const existing = await db.select({ id: tenantsTable.id }).from(tenantsTable).limit(1).then((r) => r[0] ?? null);

  if (existing) {
    res.status(409).json({ error: "Setup already completed. Use the admin panel to manage tenants and users." });
    return;
  }

  const parsed = InitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { tenantName, tenantSlug, adminEmail, adminName, adminPassword } = parsed.data;

  const apiKey = crypto.randomBytes(32).toString("hex");
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const [tenant] = await db
    .insert(tenantsTable)
    .values({ name: tenantName, slug: tenantSlug, apiKey })
    .returning();

  if (!tenant) {
    res.status(500).json({ error: "Failed to create tenant" });
    return;
  }

  const [admin] = await db
    .insert(usersTable)
    .values({ tenantId: tenant.id, email: adminEmail.toLowerCase(), name: adminName, passwordHash, role: "admin" })
    .returning({ id: usersTable.id, email: usersTable.email, name: usersTable.name, role: usersTable.role });

  res.status(201).json({
    tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, apiKey: tenant.apiKey },
    admin,
    message: "Setup complete. Save the apiKey — it is required for the sync endpoint (X-Api-Key header).",
  });
});

export default router;
