import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import express from "express";
import { inArray } from "drizzle-orm";
import { db, pool, tenantsTable, liftSnapshotsTable } from "@workspace/db";
import type { SeasonTrend, WeekTrend } from "@workspace/api-zod";
import liftsRouter from "./lifts";
import { parseComparisonSeasons } from "../lib/comparison-seasons";

// Isolated temporary tenants only: never change real accounts, settings or snapshots.
const tenantId = randomUUID();
const otherTenantId = randomUUID();
const seasons = ["2025-2026", "2024-2025", "2023-2024", "2022-2023"];
let server: Server | undefined;
let base: string;

before(async () => {
  assert.equal(process.env.NODE_ENV, "test", "Run only against the development database in test mode");
  await db.insert(tenantsTable).values([tenantId, otherTenantId].map((id) => ({
    id, name: "Temporary chart regression test", slug: `chart-test-${id}`, apiKey: randomUUID(),
  })));
  await db.insert(liftSnapshotsTable).values(seasons.flatMap((season, i) => {
    const date = `${season.slice(0, 4)}-12-01`;
    return [
      { tenantId, eser: season, dtgg: date, dupd: `${date.replaceAll("-", "")}090000`, ggnr: 1, ggbz: "Test", npin: 1 },
      { tenantId, eser: season, dtgg: date, dupd: `${date.replaceAll("-", "")}160000`, ggnr: 1, ggbz: "Test", npin: 100 + i },
      { tenantId: otherTenantId, eser: season, dtgg: date, dupd: `${date.replaceAll("-", "")}160000`, ggnr: 1, ggbz: "Other tenant", npin: 9999 },
    ];
  }));
  const app = express();
  // Test-only identity; this server is not mounted in the running app.
  app.use((req, _res, next) => { Object.assign(req, { user: { tenantId } }); next(); });
  app.use(liftsRouter);
  server = createServer(app);
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  base = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
  try {
    await db.delete(tenantsTable).where(inArray(tenantsTable.id, [tenantId, otherTenantId]));
  } finally {
    await pool.end();
  }
});

test("parser supports four and twenty seasons without silent truncation", () => {
  assert.deepEqual(parseComparisonSeasons(seasons.join(",")), seasons);
  assert.equal(parseComparisonSeasons(Array.from({ length: 20 }, (_, i) => `season-${i}`).join(","))?.length, 20);
  assert.deepEqual(parseComparisonSeasons(` ${seasons[0]},${seasons[0]}, ${seasons[1]} `), seasons.slice(0, 2));
  assert.throws(() => parseComparisonSeasons(Array.from({ length: 21 }, (_, i) => `season-${i}`).join(",")));
});

for (const endpoint of ["season-trend", "week-trend"]) {
  test(`${endpoint}: returns all four seasons, latest daily values, and no other tenant's data`, async () => {
    const response = await fetch(`${base}/lifts/${endpoint}?seasons=${seasons.join(",")}`);
    assert.equal(response.status, 200);
    const rows = await response.json() as (SeasonTrend | WeekTrend)[];
    assert.deepEqual(rows.map((row: { season: string }) => row.season), seasons);
    for (const [i, row] of rows.entries()) {
      const points = "data" in row ? row.data : row.weeks;
      assert.equal(points.length, 1);
      assert.equal(points[0].totalFirstPassages, 100 + i);
    }
  });

  test(`${endpoint}: supports twenty seasons and rejects excessive or malformed input`, async () => {
    const many = Array.from({ length: 20 }, (_, i) => `${2025 - i}-${2026 - i}`);
    const response = await fetch(`${base}/lifts/${endpoint}?seasons=${many.join(",")}`);
    assert.equal(response.status, 200);
    assert.equal((await response.json() as (SeasonTrend | WeekTrend)[]).length, 20);
    const tooMany = await fetch(`${base}/lifts/${endpoint}?seasons=${[...many, "2000-2001"].join(",")}`);
    assert.equal(tooMany.status, 400);
    const malformed = await fetch(`${base}/lifts/${endpoint}?seasons=a&seasons=b`);
    assert.equal(malformed.status, 400);
  });
}
