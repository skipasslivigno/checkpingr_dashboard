import { Router, type IRouter } from "express";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, liftSnapshotsTable } from "@workspace/db";
import {
  SyncLiftsBody,
  GetLatestLiftsQueryParams,
  GetDashboardSummaryQueryParams,
  GetLiftHistoryQueryParams,
  GetLiftExtractionsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

router.get("/lifts/latest", async (req, res): Promise<void> => {
  const parsed = GetLatestLiftsQueryParams.safeParse(req.query);
  const date = parsed.success && parsed.data.date ? parsed.data.date : todayIso();
  const season = parsed.success ? parsed.data.season : undefined;
  const extraction = parsed.success ? parsed.data.extraction : undefined;

  const datePattern = `${date}%`;

  if (extraction) {
    const rows = await db
      .selectDistinctOn([liftSnapshotsTable.ggnr], {
        id: liftSnapshotsTable.id,
        idin: liftSnapshotsTable.idin,
        dupd: liftSnapshotsTable.dupd,
        dtgg: liftSnapshotsTable.dtgg,
        ggnr: liftSnapshotsTable.ggnr,
        ggbz: liftSnapshotsTable.ggbz,
        nsoc: liftSnapshotsTable.nsoc,
        npin: liftSnapshotsTable.npin,
        npic: liftSnapshotsTable.npic,
        nuin: liftSnapshotsTable.nuin,
        npas: liftSnapshotsTable.npas,
        eser: liftSnapshotsTable.eser,
      })
      .from(liftSnapshotsTable)
      .where(
        and(
          sql`${liftSnapshotsTable.dtgg} LIKE ${datePattern}`,
          eq(liftSnapshotsTable.dupd, extraction),
          season ? eq(liftSnapshotsTable.eser, season) : undefined
        )
      )
      .orderBy(liftSnapshotsTable.ggnr);

    res.json(rows);
    return;
  }

  const latestPerLift = await db
    .selectDistinctOn([liftSnapshotsTable.ggnr], {
      id: liftSnapshotsTable.id,
      idin: liftSnapshotsTable.idin,
      dupd: liftSnapshotsTable.dupd,
      dtgg: liftSnapshotsTable.dtgg,
      ggnr: liftSnapshotsTable.ggnr,
      ggbz: liftSnapshotsTable.ggbz,
      nsoc: liftSnapshotsTable.nsoc,
      npin: liftSnapshotsTable.npin,
      npic: liftSnapshotsTable.npic,
      nuin: liftSnapshotsTable.nuin,
      npas: liftSnapshotsTable.npas,
      eser: liftSnapshotsTable.eser,
    })
    .from(liftSnapshotsTable)
    .where(
      and(
        sql`${liftSnapshotsTable.dtgg} LIKE ${datePattern}`,
        season ? eq(liftSnapshotsTable.eser, season) : undefined
      )
    )
    .orderBy(liftSnapshotsTable.ggnr, desc(liftSnapshotsTable.dupd));

  res.json(latestPerLift);
});

router.get("/lifts/summary", async (req, res): Promise<void> => {
  const parsed = GetDashboardSummaryQueryParams.safeParse(req.query);
  const date = parsed.success && parsed.data.date ? parsed.data.date : todayIso();
  const season = parsed.success ? parsed.data.season : undefined;
  const extraction = parsed.success ? parsed.data.extraction : undefined;

  const datePattern = `${date}%`;

  const baseWhere = and(
    sql`${liftSnapshotsTable.dtgg} LIKE ${datePattern}`,
    extraction ? eq(liftSnapshotsTable.dupd, extraction) : undefined,
    season ? eq(liftSnapshotsTable.eser, season) : undefined
  );

  const latestPerLift = await db
    .selectDistinctOn([liftSnapshotsTable.ggnr], {
      npin: liftSnapshotsTable.npin,
      npas: liftSnapshotsTable.npas,
      nuin: liftSnapshotsTable.nuin,
      ggnr: liftSnapshotsTable.ggnr,
      dupd: liftSnapshotsTable.dupd,
      eser: liftSnapshotsTable.eser,
    })
    .from(liftSnapshotsTable)
    .where(baseWhere)
    .orderBy(
      liftSnapshotsTable.ggnr,
      extraction ? liftSnapshotsTable.ggnr : desc(liftSnapshotsTable.dupd)
    );

  const totalPassages = latestPerLift.reduce((sum, r) => sum + (r.npas ?? 0), 0);
  const totalGuests = latestPerLift.reduce((sum, r) => sum + (r.nuin ?? 0), 0);
  const totalLifts = latestPerLift.length;
  const activeLifts = latestPerLift.filter((r) => (r.npas ?? 0) > 0).length;

  const lastSyncRow = await db
    .select({ dupd: liftSnapshotsTable.dupd })
    .from(liftSnapshotsTable)
    .orderBy(desc(liftSnapshotsTable.createdAt))
    .limit(1);

  const lastSyncAt = lastSyncRow[0]?.dupd ?? null;

  const detectedSeason =
    season ??
    latestPerLift[0]?.eser ??
    (() => {
      const y = new Date().getFullYear();
      return `${y - 1}-${y}`;
    })();

  res.json({
    date,
    season: detectedSeason,
    totalPassages,
    totalGuests,
    totalLifts,
    activeLifts,
    lastSyncAt,
  });
});

router.get("/lifts/extractions", async (req, res): Promise<void> => {
  const parsed = GetLiftExtractionsQueryParams.safeParse(req.query);
  const date = parsed.success && parsed.data.date ? parsed.data.date : todayIso();
  const season = parsed.success ? parsed.data.season : undefined;

  const datePattern = `${date}%`;

  const rows = await db
    .selectDistinct({ dupd: liftSnapshotsTable.dupd })
    .from(liftSnapshotsTable)
    .where(
      and(
        sql`${liftSnapshotsTable.dtgg} LIKE ${datePattern}`,
        season ? eq(liftSnapshotsTable.eser, season) : undefined
      )
    )
    .orderBy(asc(liftSnapshotsTable.dupd));

  res.json(rows.map((r) => r.dupd));
});

router.get("/lifts/history", async (req, res): Promise<void> => {
  const parsed = GetLiftHistoryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { ggnr, date, season } = parsed.data;
  const datePattern = date ? `${date}%` : `${todayIso()}%`;

  const rows = await db
    .select()
    .from(liftSnapshotsTable)
    .where(
      and(
        eq(liftSnapshotsTable.ggnr, ggnr),
        sql`${liftSnapshotsTable.dtgg} LIKE ${datePattern}`,
        season ? eq(liftSnapshotsTable.eser, season) : undefined
      )
    )
    .orderBy(desc(liftSnapshotsTable.dupd));

  res.json(rows);
});

router.post("/lifts/sync", async (req, res): Promise<void> => {
  const apiKey = process.env["SYNC_API_KEY"];
  if (apiKey) {
    const provided = req.headers["x-api-key"];
    if (provided !== apiKey) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  const parsed = SyncLiftsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { snapshots } = parsed.data;
  if (!snapshots.length) {
    res.json({ inserted: 0, updated: 0, total: 0, message: "Nothing to sync" });
    return;
  }

  let inserted = 0;
  let updated = 0;

  for (const snap of snapshots) {
    const existing = await db
      .select({ id: liftSnapshotsTable.id })
      .from(liftSnapshotsTable)
      .where(eq(liftSnapshotsTable.idin, snap.idin))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(liftSnapshotsTable)
        .set({
          dupd: snap.dupd,
          dtgg: snap.dtgg,
          ggnr: snap.ggnr,
          ggbz: snap.ggbz,
          nsoc: snap.nsoc ?? null,
          npin: snap.npin ?? null,
          npic: snap.npic ?? null,
          nuin: snap.nuin ?? null,
          npas: snap.npas ?? null,
          eser: snap.eser,
        })
        .where(eq(liftSnapshotsTable.idin, snap.idin));
      updated++;
    } else {
      await db.insert(liftSnapshotsTable).values({
        idin: snap.idin,
        dupd: snap.dupd,
        dtgg: snap.dtgg,
        ggnr: snap.ggnr,
        ggbz: snap.ggbz,
        nsoc: snap.nsoc ?? null,
        npin: snap.npin ?? null,
        npic: snap.npic ?? null,
        nuin: snap.nuin ?? null,
        npas: snap.npas ?? null,
        eser: snap.eser,
      });
      inserted++;
    }
  }

  res.json({ inserted, updated, total: snapshots.length });
});

router.get("/seasons", async (_req, res): Promise<void> => {
  const rows = await db
    .selectDistinct({ eser: liftSnapshotsTable.eser })
    .from(liftSnapshotsTable)
    .orderBy(desc(liftSnapshotsTable.eser));

  res.json(rows.map((r) => r.eser));
});

export default router;
