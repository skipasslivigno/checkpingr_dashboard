import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import express from "express";
import { and, eq, inArray } from "drizzle-orm";
import { db, pool, tenantsTable, tenantSettingsTable, liftSnapshotsTable } from "@workspace/db";
import { GetPeriodComparisonResponse, GetSeasonStartsResponse } from "@workspace/api-zod";
import router from "./period-comparison";
import { requireAuth } from "../middleware/requireAuth";
import { shiftDate } from "../lib/period-comparison";

const tenantId = randomUUID(), otherTenantId = randomUUID();
const season = "2025-2026", previous = "2024-2025";
let server: Server | undefined, base = "";
before(async () => {
  assert.equal(process.env.NODE_ENV, "test");
  await db.insert(tenantsTable).values([tenantId, otherTenantId].map(id => ({
    id, name: "Temporary period comparison test", slug: `period-${id}`, apiKey: randomUUID(),
  })));
  await db.insert(tenantSettingsTable).values({ tenantId, primaryColor: "#0070BA", maxSeasons: 4 });
  const values = [tenantId, otherTenantId].flatMap(tenant => [season, previous].flatMap(s =>
    Array.from({ length: 10 }, (_, i) => {
      const date = shiftDate(s === season ? "2025-11-29" : "2024-11-30", i);
      const hours = s === season && i === 9 ? ["103000", "140000", "180000"] : ["180000", "233000"];
      return hours.map(hour => ({
        tenantId: tenant, eser: s, dtgg: date, dupd: date.replaceAll("-", "") + hour,
        ggnr: 1, ggbz: "Temporary test", npin: 777, npas: 9000,
        nuin: tenant === otherTenantId ? 999999 : s === previous ? 50 : hour === "233000" ? 100 : 60,
      }));
    }).flat(),
  ));
  await db.insert(liftSnapshotsTable).values(values);
  const app = express();
  app.use(express.json());
  app.use("/protected", requireAuth, router);
  app.use((req, _res, next) => {
    Object.assign(req, { user: { tenantId: req.headers["x-other-tenant"] ? otherTenantId : tenantId,
      role: req.headers["x-test-role"] ?? "admin" } }); next();
  });
  app.use(router);
  server = createServer(app);
  await new Promise<void>(resolve => server!.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  base = `http://127.0.0.1:${address.port}`;
});
after(async () => {
  if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
  try { await db.delete(tenantsTable).where(inArray(tenantsTable.id, [tenantId, otherTenantId])); }
  finally { await pool.end(); }
});
async function save(s: string, startDate: string | null, role = "admin") {
  return fetch(`${base}/settings/season-starts/${s}`, {
    method: "PUT", headers: { "content-type": "application/json", "x-test-role": role },
    body: JSON.stringify({ startDate }),
  });
}
const url = `/lifts/period-comparison?season=${season}&date=2025-12-08`;
test("lists all seasons without guessing or saving opening dates", async () => {
  const r = await fetch(`${base}/settings/season-starts`);
  const data = GetSeasonStartsResponse.parse(await r.json());
  assert.equal(data.length, 2);
  assert.equal(data[0].startDate, null);
  assert.equal(data[0].suggestedStartDate, "2025-11-29");
});
test("only admins can save or remove season dates; unauthenticated requests are blocked", async () => {
  for (const role of ["viewer", "operator"]) {
    assert.equal((await save(season, "2025-11-29", role)).status, 403);
    assert.equal((await save(season, null, role)).status, 403);
  }
  assert.equal((await fetch(`${base}/protected/settings/season-starts`)).status, 401);
});
test("rejects impossible dates, wrong years and unknown seasons", async () => {
  assert.equal((await save(season, "2025-02-29")).status, 400);
  assert.equal((await save(season, "2024-11-30")).status, 400);
  assert.equal((await save("unknown", "2025-11-29")).status, 404);
});
test("parallel row saves persist independently and preserve unrelated settings", async () => {
  const rs = await Promise.all([save(season, "2025-11-29"), save(previous, "2024-11-30")]);
  assert.ok(rs.every(r => r.status === 200));
  const data = GetSeasonStartsResponse.parse(await (await fetch(`${base}/settings/season-starts`)).json());
  assert.deepEqual(data.map(r => r.startDate), ["2025-11-29", "2024-11-30"]);
  const [settings] = await db.select().from(tenantSettingsTable).where(eq(tenantSettingsTable.tenantId, tenantId));
  assert.equal(settings.primaryColor, "#0070BA");
  assert.equal(settings.maxSeasons, 4);
});
test("real database comparison uses nuin, not npin, npas, other tenants or partial history", async () => {
  const r = await fetch(`${base}${url}&extraction=20251208140000`, { headers: { "x-test-role": "viewer" } });
  assert.equal(r.status, 200);
  const data = GetPeriodComparisonResponse.parse(await r.json());
  assert.equal(data.weekly.currentTotal, 260);
  assert.equal(data.weekly.previousTotal, 150);
  assert.equal(data.progressive.currentTotal, 960);
  assert.equal(data.progressive.previousTotal, 500);
  assert.equal(data.progressive.changePercent, 92);
  assert.equal(data.weekly.previousToDate, "2024-12-09");
});
test("morning excludes the day, final 23:30 overrides the morning selection", async () => {
  let data = GetPeriodComparisonResponse.parse(await (await fetch(`${base}${url}&extraction=20251208103000`)).json());
  assert.equal(data.includedSelectedDay, false);
  assert.equal(data.progressive.currentTotal, 900);
  await db.insert(liftSnapshotsTable).values({ tenantId, eser: season, dtgg: "2025-12-08",
    dupd: "20251208233000", ggnr: 1, ggbz: "Temporary test", nuin: 120, npas: 1000 });
  try {
    data = GetPeriodComparisonResponse.parse(await (await fetch(`${base}${url}&extraction=20251208103000`)).json());
    assert.equal(data.includedSelectedDay, true);
    assert.equal(data.sourceExtraction, "20251208233000");
    assert.equal(data.progressive.currentTotal, 1020);
  } finally {
    await db.delete(liftSnapshotsTable).where(and(eq(liftSnapshotsTable.tenantId, tenantId), eq(liftSnapshotsTable.dupd, "20251208233000")));
  }
});
test("tenant configuration never leaks and invalid extraction selections fail explicitly", async () => {
  const r = await fetch(`${base}${url}`, { headers: { "x-other-tenant": "1" } });
  assert.equal(GetPeriodComparisonResponse.parse(await r.json()).status, "configuration_required");
  for (const query of [
    `${url}&extraction=20251207140000`, `${url}&extraction=20251208999900`,
    url.replace("2025-12-08", "2025-02-31"),
  ]) assert.equal((await fetch(`${base}${query}`)).status, 400);
  assert.equal((await fetch(`${base}${url}&extraction=20251208150000`)).status, 404);
});
test("removing and restoring a start date is persisted and makes missing configuration explicit", async () => {
  assert.equal((await save(previous, null)).status, 200);
  const r = GetPeriodComparisonResponse.parse(await (await fetch(`${base}${url}`)).json());
  assert.equal(r.status, "configuration_required");
  assert.ok(r.missingConfiguration.includes(previous));
  assert.equal((await save(previous, "2024-12-02")).status, 200, "Non-Saturday opening is permitted");
});
