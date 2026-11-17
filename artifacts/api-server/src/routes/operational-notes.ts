import { Router } from "express";
import { and, asc, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db, liftSnapshotsTable, operationalNotesTable, type OperationalNote } from "@workspace/db";
import {
  CreateOperationalNoteBody,
  UpdateOperationalNoteBody, UpdateOperationalNoteParams, UpdateOperationalNoteResponse,
  DeleteOperationalNoteParams, GetOperationalNotesQueryParams, GetOperationalNotesResponse,
  GetOperationalNoteLiftsResponse,
} from "@workspace/api-zod";
import { requireRole } from "../middleware/requireAuth";
import { validCalendarDate } from "../lib/period-comparison";

const router = Router();
const table = operationalNotesTable;
const validDiaryDate = (value: string) => !value.startsWith("0000-") && validCalendarDate(value);

function serialize(note: OperationalNote) {
  const { tenantId: _tenant, authorId: _author, updatedById: _editor, ...publicNote } = note;
  return { ...publicNote, createdAt: note.createdAt.toISOString(), updatedAt: note.updatedAt.toISOString() };
}

async function liftName(tenantId: string, id: number) {
  const [lift] = await db.select({ name: liftSnapshotsTable.ggbz }).from(liftSnapshotsTable)
    .where(and(eq(liftSnapshotsTable.tenantId, tenantId), eq(liftSnapshotsTable.ggnr, id)))
    .orderBy(desc(liftSnapshotsTable.dupd), desc(liftSnapshotsTable.id)).limit(1);
  if (lift) return lift.name;
  const [retained] = await db.select({ name: table.liftName }).from(table)
    .where(and(eq(table.tenantId, tenantId), eq(table.liftId, id)))
    .orderBy(desc(table.updatedAt), desc(table.id)).limit(1);
  return retained?.name ?? undefined;
}

router.get("/operational-notes/lifts", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const lifts = await db.selectDistinctOn([liftSnapshotsTable.ggnr], {
    id: liftSnapshotsTable.ggnr, name: liftSnapshotsTable.ggbz,
  }).from(liftSnapshotsTable).where(eq(liftSnapshotsTable.tenantId, req.user!.tenantId))
    .orderBy(asc(liftSnapshotsTable.ggnr), desc(liftSnapshotsTable.dupd), desc(liftSnapshotsTable.id));
  // Retain saved lift labels even if historical snapshots are later removed.
  const retained = await db.selectDistinct({ id: table.liftId, name: table.liftName }).from(table)
    .where(eq(table.tenantId, req.user!.tenantId));
  const catalog = new Map(lifts.map(lift => [lift.id, lift]));
  for (const lift of retained) {
    if (lift.id !== null && lift.name !== null && !catalog.has(lift.id)) catalog.set(lift.id, { id: lift.id, name: lift.name });
  }
  res.json(GetOperationalNoteLiftsResponse.parse([...catalog.values()].sort((a, b) => a.id - b.id)));
});

router.get("/operational-notes", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const parsed = GetOperationalNotesQueryParams.safeParse(req.query);
  if (!parsed.success || !validDiaryDate(parsed.data.from) || !validDiaryDate(parsed.data.to)
    || parsed.data.from > parsed.data.to || parsed.data.liftId !== undefined && !Number.isSafeInteger(parsed.data.liftId)
    || parsed.data.scope === "lift" && parsed.data.liftId === undefined
    || parsed.data.scope !== "lift" && (parsed.data.liftId !== undefined || parsed.data.includeGeneral !== undefined)) {
    res.status(400).json({ error: "Invalid date range or scope" }); return;
  }
  const { from, to, scope, liftId, includeGeneral } = parsed.data;
  const rows = await db.select().from(table).where(and(
    eq(table.tenantId, req.user!.tenantId), gte(table.date, from), lte(table.date, to),
    scope === "general" ? isNull(table.liftId)
      : scope === "lift" ? includeGeneral === "true"
        ? or(eq(table.liftId, liftId!), isNull(table.liftId)) : eq(table.liftId, liftId!) : undefined,
  )).orderBy(asc(table.date), asc(table.createdAt), asc(table.id));
  res.json(GetOperationalNotesResponse.parse(rows.map(serialize)));
});

router.post("/operational-notes", requireRole("admin", "operator"), async (req, res): Promise<void> => {
  const parsed = CreateOperationalNoteBody.strict().safeParse(req.body);
  if (!parsed.success || !validDiaryDate(parsed.data.date) || !parsed.data.text.trim() || parsed.data.text.includes("\0")
    || parsed.data.liftId !== null && !Number.isSafeInteger(parsed.data.liftId)) {
    res.status(400).json({ error: "Invalid note: real date and non-empty text required (max 4000)" }); return;
  }
  const user = req.user!;
  const input = parsed.data;
  const name = input.liftId === null ? null : await liftName(user.tenantId, input.liftId);
  if (name === undefined) { res.status(400).json({ error: "Lift not found in tenant" }); return; }
  const [note] = await db.insert(table).values({
    ...input, text: input.text.trim(), tenantId: user.tenantId, liftName: name,
    authorId: user.userId, authorName: user.name, updatedById: user.userId, updatedByName: user.name,
  }).returning();
  res.status(201).json(UpdateOperationalNoteResponse.parse(serialize(note)));
});

router.put("/operational-notes/:id", requireRole("admin", "operator"), async (req, res): Promise<void> => {
  const params = UpdateOperationalNoteParams.safeParse(req.params);
  const parsed = UpdateOperationalNoteBody.strict().safeParse(req.body);
  if (!params.success || !parsed.success || !validDiaryDate(parsed.data.date) || !parsed.data.text.trim() || parsed.data.text.includes("\0")
    || parsed.data.liftId !== null && !Number.isSafeInteger(parsed.data.liftId)) {
    res.status(400).json({ error: "Invalid note or ID" }); return;
  }
  const user = req.user!;
  const where = and(eq(table.id, params.data.id), eq(table.tenantId, user.tenantId));
  const [existing] = await db.select().from(table).where(where).limit(1);
  if (!existing) { res.status(404).json({ error: "Note not found" }); return; }
  const input = parsed.data;
  const name = input.liftId === null ? null : await liftName(user.tenantId, input.liftId)
    ?? (existing.liftId === input.liftId ? existing.liftName : undefined);
  if (name === undefined) { res.status(400).json({ error: "Lift not found in tenant" }); return; }
  const [note] = await db.update(table).set({
    ...input, text: input.text.trim(), liftName: name,
    updatedById: user.userId, updatedByName: user.name, updatedAt: new Date(),
  }).where(where).returning();
  if (!note) { res.status(404).json({ error: "Note not found" }); return; }
  res.json(UpdateOperationalNoteResponse.parse(serialize(note)));
});

router.delete("/operational-notes/:id", requireRole("admin", "operator"), async (req, res): Promise<void> => {
  const params = DeleteOperationalNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [note] = await db.delete(table).where(and(eq(table.id, params.data.id), eq(table.tenantId, req.user!.tenantId))).returning({ id: table.id });
  if (!note) { res.status(404).json({ error: "Note not found" }); return; }
  res.status(204).end();
});

export default router;
