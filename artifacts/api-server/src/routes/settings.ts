import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, tenantSettingsTable } from "@workspace/db";
import { requireRole } from "../middleware/requireAuth";
import { z } from "zod";

const router = Router();

const UpdateSettingsBody = z.object({
  colors:     z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).max(10).optional(),
  maxSeasons: z.number().int().min(1).max(20).optional(),
});

const LogoBody = z.object({
  logoBase64: z.string().nullable(),
});

async function getOrDefault(tenantId: string) {
  const rows = await db.select().from(tenantSettingsTable).where(eq(tenantSettingsTable.tenantId, tenantId));
  if (rows.length === 0) return { tenantId, logoBase64: null, colors: [] as string[], maxSeasons: 3 };
  return rows[0];
}

router.get("/settings", async (req, res): Promise<void> => {
  res.json(await getOrDefault(req.user!.tenantId));
});

router.patch("/settings", requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const { colors, maxSeasons } = parsed.data;
  const existing = await db.select({ tenantId: tenantSettingsTable.tenantId }).from(tenantSettingsTable).where(eq(tenantSettingsTable.tenantId, tenantId));
  if (existing.length === 0) {
    const [row] = await db.insert(tenantSettingsTable).values({ tenantId, colors: colors ?? [], maxSeasons: maxSeasons ?? 3, updatedAt: new Date() }).returning();
    res.json(row);
  } else {
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (colors !== undefined) update["colors"] = colors;
    if (maxSeasons !== undefined) update["maxSeasons"] = maxSeasons;
    const [row] = await db.update(tenantSettingsTable).set(update).where(eq(tenantSettingsTable.tenantId, tenantId)).returning();
    res.json(row);
  }
});

router.post("/settings/logo", requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = LogoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenantId = req.user!.tenantId;
  const { logoBase64 } = parsed.data;
  const existing = await db.select({ tenantId: tenantSettingsTable.tenantId }).from(tenantSettingsTable).where(eq(tenantSettingsTable.tenantId, tenantId));
  if (existing.length === 0) {
    const [row] = await db.insert(tenantSettingsTable).values({ tenantId, logoBase64, colors: [], maxSeasons: 3, updatedAt: new Date() }).returning();
    res.json(row);
  } else {
    const [row] = await db.update(tenantSettingsTable).set({ logoBase64, updatedAt: new Date() }).where(eq(tenantSettingsTable.tenantId, tenantId)).returning();
    res.json(row);
  }
});

export default router;
