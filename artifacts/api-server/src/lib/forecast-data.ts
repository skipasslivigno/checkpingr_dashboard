import { db, liftSnapshotsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import type { ForecastExtraction } from "./first-entries-forecast";

export async function loadForecastExtractions(tenantId: string, date: string): Promise<ForecastExtraction[]> {
  // Bound the scan to five years. Never mix tenant data or "latest per lift" from different batches.
  const result = await db.execute<{
    date: string; season: string; extraction: string; entries: number; lift_ids: string; valid: boolean;
  }>(sql`
    SELECT LEFT(dtgg, 10) AS date, eser AS season, dupd AS extraction,
      COALESCE(SUM(nuin), 0)::int AS entries,
      string_agg(ggnr::text, ',' ORDER BY ggnr) AS lift_ids,
      bool_and(
        (nuin IS NULL OR nuin >= 0)
        AND (npas IS NULL OR npas >= 0)
        AND (COALESCE(npas, 0) = 0 OR nuin IS NOT NULL)
      ) AS valid
    FROM ${liftSnapshotsTable}
    WHERE tenant_id = ${tenantId}
      AND LEFT(dtgg, 10) <= ${date}
      AND LEFT(dtgg, 10) >= TO_CHAR(${date}::date - INTERVAL '5 years', 'YYYY-MM-DD')
    GROUP BY LEFT(dtgg, 10), eser, dupd
    ORDER BY LEFT(dtgg, 10), eser, dupd
  `);
  return result.rows.map((r) => ({
    date: r.date, season: r.season, extraction: r.extraction,
    entries: Number(r.entries), liftIds: r.lift_ids, valid: r.valid,
  }));
}
