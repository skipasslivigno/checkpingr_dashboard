import { and, eq, inArray, sql } from "drizzle-orm";
import { db, liftSnapshotsTable, tenantSettingsTable } from "@workspace/db";
import type { SeasonStart } from "@workspace/api-zod";
import { saturday, type EntryBatch } from "./period-comparison";

export async function loadSeasonStarts(tenantId: string): Promise<SeasonStart[]> {
  const [available, settings] = await Promise.all([
    db.select({
      season: liftSnapshotsTable.eser,
      firstDataDate: sql<string>`MIN(LEFT(${liftSnapshotsTable.dtgg}, 10))`,
    }).from(liftSnapshotsTable).where(eq(liftSnapshotsTable.tenantId, tenantId)).groupBy(liftSnapshotsTable.eser),
    db.select({ starts: tenantSettingsTable.seasonStartDates }).from(tenantSettingsTable)
      .where(eq(tenantSettingsTable.tenantId, tenantId)),
  ]);
  const starts = settings[0]?.starts ?? {};
  const firstDates = new Map(available.map(r => [r.season, r.firstDataDate]));
  return [...new Set([...firstDates.keys(), ...Object.keys(starts)])].sort().reverse().map(season => ({
    season, startDate: starts[season] ?? null, firstDataDate: firstDates.get(season) ?? null,
    suggestedStartDate: firstDates.get(season) ? saturday(firstDates.get(season)!) : null,
  }));
}

export async function loadComparisonBatches(
  tenantId: string, seasons: string[], fromDate: string, toDate: string,
): Promise<EntryBatch[]> {
  const rows = await db.select({
    date: sql<string>`LEFT(${liftSnapshotsTable.dtgg}, 10)`,
    season: liftSnapshotsTable.eser,
    extraction: liftSnapshotsTable.dupd,
    entries: sql<number>`COALESCE(SUM(${liftSnapshotsTable.nuin}), 0)::bigint`,
    valid: sql<boolean>`bool_and(
      (${liftSnapshotsTable.nuin} IS NULL OR ${liftSnapshotsTable.nuin} >= 0)
      AND (COALESCE(${liftSnapshotsTable.npas}, 0) = 0 OR ${liftSnapshotsTable.nuin} IS NOT NULL)
    )`,
  }).from(liftSnapshotsTable).where(and(
    eq(liftSnapshotsTable.tenantId, tenantId), inArray(liftSnapshotsTable.eser, seasons),
    sql`LEFT(${liftSnapshotsTable.dtgg}, 10) >= ${fromDate}`,
    sql`LEFT(${liftSnapshotsTable.dtgg}, 10) <= ${toDate}`,
  )).groupBy(sql`LEFT(${liftSnapshotsTable.dtgg}, 10)`, liftSnapshotsTable.eser, liftSnapshotsTable.dupd);
  return rows.map(row => ({ ...row, entries: Number(row.entries) }));
}
