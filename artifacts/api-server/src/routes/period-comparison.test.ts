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
test("NULL first entries count as zero despite passages, but negatives remain invalid", async () => {
  const previousBatch = and(eq(liftSnapshotsTable.tenantId, tenantId),
    eq(liftSnapshotsTable.dupd, "20241209233000"));
  const currentBatch = and(eq(liftSnapshotsTable.tenantId, tenantId),
    eq(liftSnapshotsTable.dupd, "20251208140000"));
  const extractions = ["20241209233000", "20251208140000"];
  const extraRows = and(eq(liftSnapshotsTable.tenantId, tenantId),
    eq(liftSnapshotsTable.ggnr, 2), inArray(liftSnapshotsTable.dupd, extractions));
  const read = async () => GetPeriodComparisonResponse.parse(
    await (await fetch(`${base}${url}&extraction=20251208140000`)).json(),
  );
  try {
    await db.insert(liftSnapshotsTable).values(extractions.map((dupd, i) => ({
      tenantId, eser: i === 0 ? previous : season,
      dtgg: i === 0 ? "2024-12-09" : "2025-12-08", dupd,
      ggnr: 2, ggbz: "NULL entries with passages", nuin: null, npas: 382,
    })));
    let data = await read();
    assert.equal(data.progressive.previousTotal, 500);
    assert.equal(data.progressive.currentTotal, 960);
    assert.equal(data.weekly.previousTotal, 150);
    assert.equal(data.weekly.currentTotal, 260);
    assert.deepEqual(data.progressive.missingPreviousDays, []);
    assert.deepEqual(data.progressive.missingCurrentDays, []);

    // Entire batches of NULL counters are genuine zero days, not missing days.
    await db.update(liftSnapshotsTable).set({ nuin: null }).where(previousBatch);
    await db.update(liftSnapshotsTable).set({ nuin: null }).where(currentBatch);
    data = await read();
    assert.equal(data.progressive.previousTotal, 450);
    assert.equal(data.progressive.currentTotal, 900);
    assert.equal(data.weekly.previousTotal, 100);
    assert.equal(data.weekly.currentTotal, 200);
    assert.equal(data.includedSelectedDay, true);
    assert.deepEqual(data.progressive.missingPreviousDays, []);
    assert.deepEqual(data.progressive.missingCurrentDays, []);

    await db.update(liftSnapshotsTable).set({ nuin: -1 }).where(previousBatch);
    await db.update(liftSnapshotsTable).set({ nuin: -1 }).where(currentBatch);
    data = await read();
    assert.equal(data.progressive.previousTotal, null);
    assert.equal(data.progressive.currentTotal, null);
    assert.deepEqual(data.progressive.missingPreviousDays, ["2024-12-09"]);
    assert.deepEqual(data.progressive.missingCurrentDays, ["2025-12-08"]);
  } finally {
    await db.delete(liftSnapshotsTable).where(extraRows);
    await db.update(liftSnapshotsTable).set({ nuin: 50 }).where(previousBatch);
    await db.update(liftSnapshotsTable).set({ nuin: 60 }).where(currentBatch);
  }
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

async function saveBounds(s: string, data: { startDate?: string | null; endDate?: string | null }, role = "admin") {
  return fetch(`${base}/settings/season-starts/${s}`, {
    method: "PUT", headers: { "content-type": "application/json", "x-test-role": role },
    body: JSON.stringify(data),
  });
}
test("closing dates persist and produce a definitive prior total without altering opening dates", async () => {
  await save(previous, "2024-11-30");
  assert.equal((await saveBounds(previous, { endDate: "2024-12-07" })).status, 200);
  let dates = GetSeasonStartsResponse.parse(await (await fetch(`${base}/settings/season-starts`)).json());
  assert.equal(dates.find(s => s.season === previous)?.startDate, "2024-11-30");
  assert.equal(dates.find(s => s.season === previous)?.endDate, "2024-12-07");
  const r = GetPeriodComparisonResponse.parse(await (await fetch(`${base}${url}&extraction=20251208140000`)).json());
  assert.equal(r.progressive.previousTotal, 400);
  assert.equal(r.progressive.previousDefinitive, true);
  assert.deepEqual(r.progressive.missingPreviousDays, []);
  // The old start-only API still preserves the closing date.
  assert.equal((await save(previous, "2024-11-30")).status, 200);
  dates = GetSeasonStartsResponse.parse(await (await fetch(`${base}/settings/season-starts`)).json());
  assert.equal(dates.find(s => s.season === previous)?.endDate, "2024-12-07");
});
test("closing date validation and permissions prevent invalid or unauthorized bounds", async () => {
  for (const role of ["viewer", "operator"])
    assert.equal((await saveBounds(previous, { endDate: "2025-05-01" }, role)).status, 403);
  for (const data of [
    { endDate: "2025-02-29" }, { endDate: "2024-11-29" }, { endDate: "2099-05-01" },
    { startDate: "2024-12-08" }, {},
  ]) assert.equal((await saveBounds(previous, data)).status, 400);
  assert.equal((await saveBounds(previous, { endDate: null })).status, 200);
  const dates = GetSeasonStartsResponse.parse(await (await fetch(`${base}/settings/season-starts`)).json());
  assert.equal(dates.find(s => s.season === previous)?.startDate, "2024-11-30");
  assert.equal(dates.find(s => s.season === previous)?.endDate, null);
});

test("API includes the current day's partial or final even after the configured season end", async () => {
  assert.equal((await saveBounds(season, { endDate: "2025-12-07" })).status, 200);
  const extra = ["20251208113000", "20251208163000", "20251208233000"];
  try {
    await db.insert(liftSnapshotsTable).values(extra.slice(0, 2).map(dupd => ({
      tenantId, eser: season, dtgg: "2025-12-08", dupd, ggnr: 1, ggbz: "Temporary test",
      nuin: dupd.endsWith("163000") ? 80 : 15, npas: 1000,
    })));
    for (const [hour, total] of [["140000", 960], ["163000", 980], ["180000", 960]] as const) {
      const response = await fetch(`${base}${url}&extraction=20251208${hour}`);
      assert.equal(response.status, 200);
      const r = GetPeriodComparisonResponse.parse(await response.json());
      assert.equal(r.progressive.currentTotal, total);
      assert.equal(r.progressive.currentToDate, "2025-12-08");
      assert.equal(r.includedSelectedDay, true);
      assert.equal(r.progressive.currentDefinitive, false);
    }
    for (const hour of ["103000", "113000"]) {
      const r = GetPeriodComparisonResponse.parse(await (await fetch(`${base}${url}&extraction=20251208${hour}`)).json());
      assert.equal(r.progressive.currentTotal, 900);
      assert.equal(r.includedSelectedDay, false);
      assert.equal(r.progressive.currentDefinitive, false);
    }
    await db.insert(liftSnapshotsTable).values({
      tenantId, eser: season, dtgg: "2025-12-08", dupd: extra[2], ggnr: 1,
      ggbz: "Temporary test", nuin: 120, npas: 1000,
    });
    for (const hour of ["103000", "113000", "140000", "163000", "180000", "233000"]) {
      const r = GetPeriodComparisonResponse.parse(await (await fetch(`${base}${url}&extraction=20251208${hour}`)).json());
      assert.equal(r.progressive.currentTotal, 1020);
      assert.equal(r.weekly.currentTotal, 320);
      assert.equal(r.progressive.currentToDate, "2025-12-08");
      assert.equal(r.sourceExtraction, extra[2]);
      assert.equal(r.includedSelectedDay, true);
    }
  } finally {
    await db.delete(liftSnapshotsTable).where(and(eq(liftSnapshotsTable.tenantId, tenantId), inArray(liftSnapshotsTable.dupd, extra)));
    await saveBounds(season, { endDate: null });
  }
});

test("API automatically uses the last previous-season date unless an explicit end overrides it", async () => {
  await saveBounds(previous, { endDate: null });
  const removed = await db.delete(liftSnapshotsTable).where(and(
    eq(liftSnapshotsTable.tenantId, tenantId), eq(liftSnapshotsTable.eser, previous),
    inArray(liftSnapshotsTable.dtgg, ["2024-12-08", "2024-12-09"]),
  )).returning();
  try {
    const r = GetPeriodComparisonResponse.parse(await (await fetch(`${base}${url}&extraction=20251208140000`)).json());
    assert.equal(r.progressive.previousToDate, "2024-12-07");
    assert.equal(r.progressive.previousTotal, 400);
    assert.equal(r.progressive.previousDefinitive, true);
    assert.deepEqual(r.progressive.missingPreviousDays, []);
    assert.equal(r.weekly.previousTotal, 50);
    assert.equal(r.weekly.previousDefinitive, true);
    // Inference is not written over admin settings.
    const settings = GetSeasonStartsResponse.parse(await (await fetch(`${base}/settings/season-starts`)).json());
    assert.equal(settings.find(s => s.season === previous)?.endDate, null);
    await saveBounds(previous, { endDate: "2024-12-09" });
    const explicit = GetPeriodComparisonResponse.parse(await (await fetch(`${base}${url}&extraction=20251208140000`)).json());
    assert.equal(explicit.progressive.previousToDate, "2024-12-09");
    assert.equal(explicit.progressive.previousTotal, null);
    assert.equal(explicit.progressive.previousDefinitive, false);
    assert.deepEqual(explicit.progressive.missingPreviousDays, ["2024-12-08", "2024-12-09"]);
  } finally {
    if (removed.length) await db.insert(liftSnapshotsTable).values(removed);
    await saveBounds(previous, { endDate: null });
  }
});
