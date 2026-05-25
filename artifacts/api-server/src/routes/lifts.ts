import { Router, type IRouter } from "express";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, liftSnapshotsTable } from "@workspace/db";
import {
  GetLatestLiftsQueryParams,
  GetDashboardSummaryQueryParams,
  GetLiftHistoryQueryParams,
  GetLiftExtractionsQueryParams,
} from "@workspace/api-zod";
import { z } from "zod";

// Coercing sync schema — uses z.coerce.number() so SQL Server string-typed
// numeric columns (DECIMAL, CHAR-stored IDs, etc.) are accepted without error.
const CoercedSyncBody = z.object({
  snapshots: z.array(z.object({
    idin:         z.string().nullish(),
    dupd:         z.string(),
    dtgg:         z.string(),
    ggnr:         z.coerce.number(),
    ggbz:         z.string(),
    nsoc:         z.coerce.number().nullish(),
    npin:         z.coerce.number().nullish(),
    npic:         z.coerce.number().nullish(),
    nuin:         z.coerce.number().nullish(),
    npas:         z.coerce.number().nullish(),
    eser:         z.string(),
    nome_societa: z.string().nullish(),
    descr_grp:    z.string().nullish(),
    id_societa:   z.coerce.number().nullish(),
    codgrp:       z.string().nullish(),
  })),
});
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

  const liftSelect = {
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
    nomeSocieta: liftSnapshotsTable.nomeSocieta,
    descrGrp: liftSnapshotsTable.descrGrp,
    idSocieta: liftSnapshotsTable.idSocieta,
    codgrp: liftSnapshotsTable.codgrp,
  } as const;

  if (extraction) {
    const rows = await db
      .selectDistinctOn([liftSnapshotsTable.ggnr], liftSelect)
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
    .selectDistinctOn([liftSnapshotsTable.ggnr], liftSelect)
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

router.get("/lifts/dates", async (req, res): Promise<void> => {
  const season = req.query["season"] as string | undefined;

  const rows = await db
    .selectDistinct({
      date: sql<string>`LEFT(${liftSnapshotsTable.dtgg}, 10)`,
    })
    .from(liftSnapshotsTable)
    .where(season ? eq(liftSnapshotsTable.eser, season) : undefined)
    .orderBy(desc(sql`LEFT(${liftSnapshotsTable.dtgg}, 10)`));

  res.json(rows.map((r) => r.date));
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

  req.log.info({ firstSnapshot: (req.body?.snapshots ?? [])[0] }, "sync first snapshot");

  const parsed = CoercedSyncBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.error({ zodIssues: parsed.error.issues.slice(0, 5) }, "sync validation failed");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { snapshots } = parsed.data;
  if (!snapshots.length) {
    res.json({ inserted: 0, updated: 0, total: 0, message: "Nothing to sync" });
    return;
  }

  // Batch upsert: unique key is (dupd, ggnr) — one lift per extraction time.
  // Inserting the same (dupd, ggnr) again updates all other fields in place.
  const CHUNK = 500;
  for (let i = 0; i < snapshots.length; i += CHUNK) {
    const chunk = snapshots.slice(i, i + CHUNK);
    await db
      .insert(liftSnapshotsTable)
      .values(
        chunk.map((snap) => ({
          idin: snap.idin ?? null,
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
          nomeSocieta: snap.nome_societa ?? null,
          descrGrp: snap.descr_grp ?? null,
          idSocieta: snap.id_societa ?? null,
          codgrp: snap.codgrp ?? null,
        }))
      )
      .onConflictDoUpdate({
        target: [liftSnapshotsTable.dupd, liftSnapshotsTable.ggnr],
        set: {
          idin: sql`excluded.idin`,
          dtgg: sql`excluded.dtgg`,
          ggbz: sql`excluded.ggbz`,
          nsoc: sql`excluded.nsoc`,
          npin: sql`excluded.npin`,
          npic: sql`excluded.npic`,
          nuin: sql`excluded.nuin`,
          npas: sql`excluded.npas`,
          eser: sql`excluded.eser`,
          nomeSocieta: sql`excluded.nome_societa`,
          descrGrp: sql`excluded.descr_grp`,
          idSocieta: sql`excluded.id_societa`,
          codgrp: sql`excluded.codgrp`,
        },
      });
  }

  res.json({ inserted: snapshots.length, updated: 0, total: snapshots.length });
});

router.get("/seasons", async (_req, res): Promise<void> => {
  const rows = await db
    .selectDistinct({ eser: liftSnapshotsTable.eser })
    .from(liftSnapshotsTable)
    .orderBy(desc(liftSnapshotsTable.eser));

  res.json(rows.map((r) => r.eser));
});

export default router;
