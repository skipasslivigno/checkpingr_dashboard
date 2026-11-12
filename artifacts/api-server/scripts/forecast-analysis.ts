import { db, pool, liftSnapshotsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { buildFirstEntriesForecast, validDate } from "../src/lib/first-entries-forecast";
import { loadForecastExtractions } from "../src/lib/forecast-data";

// Read-only development analysis. No credentials, personal information or raw imports are output.
async function main() {
try {
  const requestedDate = process.argv[2] ?? null;
  if (requestedDate !== null && !validDate(requestedDate)) {
    throw new Error("Use an optional date argument in YYYY-MM-DD format");
  }
  const tenants = await db.execute<{ tenant_id: string; date: string; season: string }>(sql`
    SELECT DISTINCT ON (tenant_id) tenant_id, LEFT(dtgg, 10) AS date, eser AS season
    FROM ${liftSnapshotsTable}
    WHERE tenant_id IS NOT NULL AND LEFT(dtgg, 10) < TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
      AND (${requestedDate}::text IS NULL OR LEFT(dtgg, 10) <= ${requestedDate})
    ORDER BY tenant_id, LEFT(dtgg, 10) DESC, dupd DESC
  `);
  const reports = [];
  for (const tenant of tenants.rows) {
    const started = performance.now();
    const rows = await loadForecastExtractions(tenant.tenant_id, tenant.date);
    const result = buildFirstEntriesForecast(rows, { date: tenant.date, season: tenant.season });
    const final = rows.filter((r) => r.date === tenant.date && r.season === tenant.season
      && r.valid && r.extraction.slice(8, 12) >= "1800").at(-1)?.entries ?? null;
    reports.push({
      date: result.date, season: result.season, history: result.history,
      milliseconds: Math.round(performance.now() - started),
      actualFinalForComparison: final,
      forecasts: result.forecasts,
    });
  }
  process.stdout.write(JSON.stringify(reports, null, 2) + "\n");
} finally {
  await pool.end();
}
}
main().catch((error: unknown) => {
  process.stderr.write((error instanceof Error ? error.message : "Analysis failed") + "\n");
  process.exitCode = 1;
});
