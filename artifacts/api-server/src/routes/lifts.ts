import { Router, type IRouter } from "express";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, liftSnapshotsTable, tenantsTable } from "@workspace/db";
import {
  GetLatestLiftsQueryParams,
  GetDashboardSummaryQueryParams,
  GetLiftHistoryQueryParams,
  GetLiftExtractionsQueryParams,
} from "@workspace/api-zod";
import { z } from "zod";

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
    id_societa:   z.string().nullish(),
    codgrp:       z.string().nullish(),
  })),
});
const router: IRouter = Router();

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

router.get("/lifts/latest", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
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
          eq(liftSnapshotsTable.tenantId, tenantId),
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
        eq(liftSnapshotsTable.tenantId, tenantId),
        sql`${liftSnapshotsTable.dtgg} LIKE ${datePattern}`,
        season ? eq(liftSnapshotsTable.eser, season) : undefined
      )
    )
    .orderBy(liftSnapshotsTable.ggnr, desc(liftSnapshotsTable.dupd));

  res.json(latestPerLift);
});

router.get("/lifts/summary", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const parsed = GetDashboardSummaryQueryParams.safeParse(req.query);
  const date = parsed.success && parsed.data.date ? parsed.data.date : todayIso();
  const season = parsed.success ? parsed.data.season : undefined;
  const extraction = parsed.success ? parsed.data.extraction : undefined;

  const datePattern = `${date}%`;

  const baseWhere = and(
    eq(liftSnapshotsTable.tenantId, tenantId),
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
    .where(eq(liftSnapshotsTable.tenantId, tenantId))
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
  const tenantId = req.user!.tenantId;
  const season = req.query["season"] as string | undefined;

  const rows = await db
    .selectDistinct({
      date: sql<string>`LEFT(${liftSnapshotsTable.dtgg}, 10)`,
    })
    .from(liftSnapshotsTable)
    .where(and(
      eq(liftSnapshotsTable.tenantId, tenantId),
      season ? eq(liftSnapshotsTable.eser, season) : undefined
    ))
    .orderBy(desc(sql`LEFT(${liftSnapshotsTable.dtgg}, 10)`));

  res.json(rows.map((r) => r.date));
});

router.get("/lifts/extractions", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const parsed = GetLiftExtractionsQueryParams.safeParse(req.query);
  const date = parsed.success && parsed.data.date ? parsed.data.date : todayIso();
  const season = parsed.success ? parsed.data.season : undefined;

  const datePattern = `${date}%`;

  const rows = await db
    .selectDistinct({ dupd: liftSnapshotsTable.dupd })
    .from(liftSnapshotsTable)
    .where(
      and(
        eq(liftSnapshotsTable.tenantId, tenantId),
        sql`${liftSnapshotsTable.dtgg} LIKE ${datePattern}`,
        season ? eq(liftSnapshotsTable.eser, season) : undefined
      )
    )
    .orderBy(asc(liftSnapshotsTable.dupd));

  res.json(rows.map((r) => r.dupd));
});

router.get("/lifts/history", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
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
        eq(liftSnapshotsTable.tenantId, tenantId),
        eq(liftSnapshotsTable.ggnr, ggnr),
        sql`${liftSnapshotsTable.dtgg} LIKE ${datePattern}`,
        season ? eq(liftSnapshotsTable.eser, season) : undefined
      )
    )
    .orderBy(desc(liftSnapshotsTable.dupd));

  res.json(rows);
});

router.post("/lifts/sync", async (req, res): Promise<void> => {
  const providedKey = req.headers["x-api-key"] as string | undefined;
  if (!providedKey) {
    res.status(401).json({ error: "X-Api-Key header required" });
    return;
  }

  const tenant = await db
    .select({ id: tenantsTable.id })
    .from(tenantsTable)
    .where(eq(tenantsTable.apiKey, providedKey))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!tenant) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  const tenantId = tenant.id;

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

  type Snap = z.infer<typeof CoercedSyncBody>["snapshots"][number];
  const deduped = Array.from(
    snapshots.reduce((map, snap) => {
      const key = `${(snap.dupd ?? "").trim()}|${snap.ggnr}`;
      map.set(key, snap);
      return map;
    }, new Map<string, Snap>()).values()
  );

  const CHUNK = 500;
  for (let i = 0; i < deduped.length; i += CHUNK) {
    const chunk = deduped.slice(i, i + CHUNK);
    await db
      .insert(liftSnapshotsTable)
      .values(
        chunk.map((snap: Snap) => ({
          tenantId,
          idin: snap.idin != null ? snap.idin.trim() : null,
          dupd: (snap.dupd ?? "").trim(),
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
        target: [liftSnapshotsTable.tenantId, liftSnapshotsTable.dupd, liftSnapshotsTable.ggnr],
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

router.get("/lifts/period", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const from = req.query["from"] as string | undefined;
  const to = req.query["to"] as string | undefined;
  const season = req.query["season"] as string | undefined;

  if (!from || !to) {
    res.status(400).json({ error: "from and to query params are required (YYYY-MM-DD)" });
    return;
  }

  const liftRows = await db.execute<{
    ggnr: number;
    ggbz: string;
    total_passages: string;
    total_guests: string;
    total_first_passages: string;
    active_days: string;
  }>(sql`
    WITH latest_per_lift_per_day AS (
      SELECT DISTINCT ON (LEFT(${liftSnapshotsTable.dtgg}, 10), ${liftSnapshotsTable.ggnr})
        LEFT(${liftSnapshotsTable.dtgg}, 10) AS dtgg_date,
        ${liftSnapshotsTable.ggnr},
        ${liftSnapshotsTable.ggbz},
        ${liftSnapshotsTable.npas},
        ${liftSnapshotsTable.nuin},
        ${liftSnapshotsTable.npin}
      FROM ${liftSnapshotsTable}
      WHERE LEFT(${liftSnapshotsTable.dtgg}, 10) BETWEEN ${from} AND ${to}
        AND ${liftSnapshotsTable.tenantId} = ${tenantId}
        ${season ? sql`AND ${liftSnapshotsTable.eser} = ${season}` : sql``}
      ORDER BY LEFT(${liftSnapshotsTable.dtgg}, 10), ${liftSnapshotsTable.ggnr}, ${liftSnapshotsTable.dupd} DESC
    )
    SELECT
      ggnr,
      MAX(ggbz) AS ggbz,
      COALESCE(SUM(npas), 0)::int AS total_passages,
      COALESCE(SUM(nuin), 0)::int AS total_guests,
      COALESCE(SUM(npin), 0)::int AS total_first_passages,
      COUNT(DISTINCT CASE WHEN npas > 0 THEN dtgg_date END)::int AS active_days
    FROM latest_per_lift_per_day
    GROUP BY ggnr
    ORDER BY total_passages DESC
  `);

  const rows = liftRows.rows;

  const totalPassages = rows.reduce((s, r) => s + Number(r.total_passages), 0);
  const totalGuests = rows.reduce((s, r) => s + Number(r.total_guests), 0);

  const activeDaysRow = await db.execute<{ active_days: string }>(sql`
    SELECT COUNT(DISTINCT LEFT(${liftSnapshotsTable.dtgg}, 10))::int AS active_days
    FROM ${liftSnapshotsTable}
    WHERE LEFT(${liftSnapshotsTable.dtgg}, 10) BETWEEN ${from} AND ${to}
      AND ${liftSnapshotsTable.tenantId} = ${tenantId}
      ${season ? sql`AND ${liftSnapshotsTable.eser} = ${season}` : sql``}
  `);
  const activeDays = Number(activeDaysRow.rows[0]?.active_days ?? 0);

  const busiestDayRow = await db.execute<{ dtgg_date: string; day_total: string }>(sql`
    WITH latest_per_lift_per_day AS (
      SELECT DISTINCT ON (LEFT(${liftSnapshotsTable.dtgg}, 10), ${liftSnapshotsTable.ggnr})
        LEFT(${liftSnapshotsTable.dtgg}, 10) AS dtgg_date,
        ${liftSnapshotsTable.npas}
      FROM ${liftSnapshotsTable}
      WHERE LEFT(${liftSnapshotsTable.dtgg}, 10) BETWEEN ${from} AND ${to}
        AND ${liftSnapshotsTable.tenantId} = ${tenantId}
        ${season ? sql`AND ${liftSnapshotsTable.eser} = ${season}` : sql``}
      ORDER BY LEFT(${liftSnapshotsTable.dtgg}, 10), ${liftSnapshotsTable.ggnr}, ${liftSnapshotsTable.dupd} DESC
    )
    SELECT dtgg_date, COALESCE(SUM(npas), 0)::int AS day_total
    FROM latest_per_lift_per_day
    GROUP BY dtgg_date
    ORDER BY day_total DESC
    LIMIT 1
  `);
  const busiestDay = busiestDayRow.rows[0]?.dtgg_date ?? null;
  const busiestLift = rows[0]?.ggbz ?? null;

  res.json({
    from,
    to,
    season: season ?? null,
    totalPassages,
    totalGuests,
    activeDays,
    busiestDay,
    busiestLift,
    lifts: rows.map((r) => ({
      ggnr: r.ggnr,
      ggbz: r.ggbz,
      totalPassages: Number(r.total_passages),
      totalGuests: Number(r.total_guests),
      totalFirstPassages: Number(r.total_first_passages),
      activeDays: Number(r.active_days),
    })),
  });
});

router.get("/lifts/week-trend", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  let requestedSeasons: string[] | null = null;
  if (req.query["seasons"] && typeof req.query["seasons"] === "string") {
    requestedSeasons = req.query["seasons"]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  if (!requestedSeasons || requestedSeasons.length === 0) {
    const allSeasons = await db
      .selectDistinct({ eser: liftSnapshotsTable.eser })
      .from(liftSnapshotsTable)
      .where(eq(liftSnapshotsTable.tenantId, tenantId))
      .orderBy(desc(liftSnapshotsTable.eser))
      .limit(2);
    requestedSeasons = allSeasons.map((r) => r.eser);
  }

  if (requestedSeasons.length === 0) {
    res.json([]);
    return;
  }

  const result: Array<{
    season: string;
    weeks: Array<{ weekNumber: number; fromDate: string; toDate: string; totalPassages: number; totalGuests: number; totalFirstPassages: number }>;
  }> = [];

  for (const season of requestedSeasons) {
    const rows = await db.execute<{
      week_number: string;
      from_date: string;
      to_date: string;
      total_passages: string;
      total_guests: string;
      total_first_passages: string;
    }>(sql`
      WITH daily AS (
        SELECT DISTINCT ON (LEFT(${liftSnapshotsTable.dtgg}, 10), ${liftSnapshotsTable.ggnr})
          LEFT(${liftSnapshotsTable.dtgg}, 10) AS dtgg_date,
          COALESCE(${liftSnapshotsTable.npas}, 0) AS npas,
          COALESCE(${liftSnapshotsTable.nuin}, 0) AS nuin,
          COALESCE(${liftSnapshotsTable.npin}, 0) AS npin
        FROM ${liftSnapshotsTable}
        WHERE ${liftSnapshotsTable.eser} = ${season}
          AND ${liftSnapshotsTable.tenantId} = ${tenantId}
        ORDER BY LEFT(${liftSnapshotsTable.dtgg}, 10), ${liftSnapshotsTable.ggnr}, ${liftSnapshotsTable.dupd} DESC
      ),
      daily_totals AS (
        SELECT dtgg_date, SUM(npas)::int AS tp, SUM(nuin)::int AS tg, SUM(npin)::int AS tfp
        FROM daily
        GROUP BY dtgg_date
      ),
      first_sat AS (
        SELECT (MIN(dtgg_date::date) - ((EXTRACT(DOW FROM MIN(dtgg_date::date))::int + 1) % 7))::date AS sat
        FROM daily_totals
      )
      SELECT
        ((dtgg_date::date - (SELECT sat FROM first_sat)) / 7 + 1)::int AS week_number,
        MIN(dtgg_date)                                                   AS from_date,
        MAX(dtgg_date)                                                   AS to_date,
        SUM(tp)::int                                                     AS total_passages,
        SUM(tg)::int                                                     AS total_guests,
        SUM(tfp)::int                                                    AS total_first_passages
      FROM daily_totals
      GROUP BY ((dtgg_date::date - (SELECT sat FROM first_sat)) / 7 + 1)
      ORDER BY week_number
    `);

    result.push({
      season,
      weeks: rows.rows.map((r) => ({
        weekNumber: Number(r.week_number),
        fromDate: r.from_date,
        toDate: r.to_date,
        totalPassages: Number(r.total_passages),
        totalGuests: Number(r.total_guests),
        totalFirstPassages: Number(r.total_first_passages),
      })),
    });
  }

  res.json(result);
});

router.get("/seasons", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const rows = await db
    .selectDistinct({ eser: liftSnapshotsTable.eser })
    .from(liftSnapshotsTable)
    .where(eq(liftSnapshotsTable.tenantId, tenantId))
    .orderBy(desc(liftSnapshotsTable.eser));

  res.json(rows.map((r) => r.eser));
});

router.get("/lifts/season-trend", async (req, res): Promise<void> => {
  const tenantId = req.user!.tenantId;
  let requestedSeasons: string[] | null = null;
  if (req.query["seasons"] && typeof req.query["seasons"] === "string") {
    requestedSeasons = req.query["seasons"]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  if (!requestedSeasons || requestedSeasons.length === 0) {
    const allSeasons = await db
      .selectDistinct({ eser: liftSnapshotsTable.eser })
      .from(liftSnapshotsTable)
      .where(eq(liftSnapshotsTable.tenantId, tenantId))
      .orderBy(desc(liftSnapshotsTable.eser))
      .limit(2);
    requestedSeasons = allSeasons.map((r) => r.eser);
  }

  if (requestedSeasons.length === 0) {
    res.json([]);
    return;
  }

  const result: Array<{
    season: string;
    data: Array<{ date: string; dayIndex: number; totalPassages: number; totalGuests: number }>;
  }> = [];

  for (const season of requestedSeasons) {
    const rows = await db.execute<{
      dtgg_date: string;
      total_passages: string;
      total_guests: string;
      total_first_passages: string;
    }>(sql`
      WITH latest_per_lift_per_day AS (
        SELECT DISTINCT ON (LEFT(${liftSnapshotsTable.dtgg}, 10), ${liftSnapshotsTable.ggnr})
          LEFT(${liftSnapshotsTable.dtgg}, 10) AS dtgg_date,
          ${liftSnapshotsTable.npas},
          ${liftSnapshotsTable.nuin},
          ${liftSnapshotsTable.npin}
        FROM ${liftSnapshotsTable}
        WHERE ${liftSnapshotsTable.eser} = ${season}
          AND ${liftSnapshotsTable.tenantId} = ${tenantId}
        ORDER BY LEFT(${liftSnapshotsTable.dtgg}, 10), ${liftSnapshotsTable.ggnr}, ${liftSnapshotsTable.dupd} DESC
      )
      SELECT
        dtgg_date,
        COALESCE(SUM(npas), 0)::int  AS total_passages,
        COALESCE(SUM(nuin), 0)::int  AS total_guests,
        COALESCE(SUM(npin), 0)::int  AS total_first_passages
      FROM latest_per_lift_per_day
      GROUP BY dtgg_date
      ORDER BY dtgg_date ASC
    `);

    const firstDate = rows.rows[0]?.dtgg_date;
    const data = rows.rows.map((r) => {
      const dayIndex = firstDate
        ? Math.round(
            (new Date(r.dtgg_date).getTime() - new Date(firstDate).getTime()) / 86_400_000
          ) + 1
        : 1;
      return {
        date: r.dtgg_date,
        dayIndex,
        totalPassages: Number(r.total_passages),
        totalGuests: Number(r.total_guests),
        totalFirstPassages: Number(r.total_first_passages),
      };
    });

    result.push({ season, data });
  }

  res.json(result);
});

export default router;
