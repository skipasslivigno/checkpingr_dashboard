import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import express from "express";
import { inArray } from "drizzle-orm";
import { db, pool, tenantsTable, liftSnapshotsTable } from "@workspace/db";
import { GetFirstEntriesForecastResponse, type FirstEntriesForecast } from "@workspace/api-zod";
import forecastRouter, { createForecastRouter } from "./forecast";
import { requireAuth } from "../middleware/requireAuth";

const tenantId = randomUUID();
const otherTenantId = randomUUID();
const date = "2026-02-15";
const season = "2025-2026";
let server: Server | undefined;
let base = "";

before(async () => {
  assert.equal(process.env.NODE_ENV, "test", "Use only the development database in test mode");
  await db.insert(tenantsTable).values([tenantId, otherTenantId].map((id) => ({
    id, name: "Temporary forecast regression test", slug: `forecast-test-${id}`, apiKey: randomUUID(),
  })));
  const rows = Array.from({ length: 61 }, (_, day) => {
    const current = new Date(Date.parse(`${date}T12:00:00Z`) - (60 - day) * 86_400_000).toISOString().slice(0, 10);
    return ["103000", "113000", "140000", "233000"].flatMap((hour, i) =>
      [tenantId, otherTenantId].map((tenant) => ({
        tenantId: tenant, dtgg: current, dupd: current.replaceAll("-", "") + hour,
        eser: season, ggnr: 1, ggbz: "Test",
        // Deliberately different: prediction must use nuin, as the dashboard does, not npin.
        nuin: tenant === tenantId ? [100, 150, 180, 200][i] : 999999,
        npin: 7, npas: 1000,
      })));
  }).flat();
  await db.insert(liftSnapshotsTable).values(rows);
  // A different season on the selected date must not override the selected season's batch.
  await db.insert(liftSnapshotsTable).values({
    tenantId, dtgg: date, dupd: "20260215184500", eser: "different-season",
    ggnr: 2, ggbz: "Other season", nuin: 555555, npin: 8, npas: 1000,
  });
  const app = express();
  app.use("/authenticated", requireAuth, forecastRouter);
  // Test-only identity on an isolated ephemeral server, never installed in the application.
  app.use((req, _res, next) => {
    Object.assign(req, { user: { tenantId, role: req.headers["x-test-role"] ?? "admin" } });
    next();
  });
  app.use("/live", createForecastRouter(() => new Date("2026-02-15T10:45:00Z")));
  app.use("/closed", createForecastRouter(() => new Date("2026-02-15T22:45:00Z")));
  app.use("/midnight", createForecastRouter(() => new Date("2026-02-15T23:30:00Z")));
  app.use(createForecastRouter(() => new Date("2026-02-16T20:00:00Z")));
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

const liveQuery = `date=${date}&season=${season}`;
const query = `${liveQuery}&mode=verification`;

test("forecast route uses real tenant-scoped history and the dashboard metric", async () => {
  const response = await fetch(`${base}/lifts/first-entries-forecast?${query}`);
  assert.equal(response.status, 200);
  const result = GetFirstEntriesForecastResponse.parse(await response.json());
  assert.equal(result.availability, "verification");
  assert.equal(result.history.completeDays, 60);
  for (const point of result.forecasts) {
    assert.equal(point.status, "ready");
    assert.equal(point.predictedTotal, 200);
    assert.ok(point.validation.sampleDays >= 12);
    assert.ok(point.upperBound! < 999999);
  }
});

test("forecast route respects the extraction cutoff and refuses a batch from a different season", async () => {
  const response = await fetch(`${base}/lifts/first-entries-forecast?${query}&extraction=20260215103000`);
  assert.equal(response.status, 200);
  const result = await response.json() as FirstEntriesForecast;
  assert.equal(result.forecasts[0].status, "ready");
  assert.equal(result.forecasts[1].status, "before_extraction");
  assert.equal(result.forecasts[2].predictedTotal, null);
  const other = await fetch(`${base}/lifts/first-entries-forecast?${query}&extraction=20260215184500`);
  assert.equal(other.status, 404);
});

test("forecast route validates real dates, hours, mandatory inputs and duplicate query parameters", async () => {
  const cases = [
    "", `date=2026-02-31&season=${season}`, `date=${date}`, `${query}&extraction=20260214103000`,
    `${query}&extraction=20260215993000`, `${query}&season=another`,
    `${query}&date=${date}`, `${query}&extraction=20260215103000&extraction=20260215113000`,
    `${query}&mode=live`, `${liveQuery}&mode=invalid`,
  ];
  for (const params of cases) {
    const response = await fetch(`${base}/lifts/first-entries-forecast?${params}`);
    assert.equal(response.status, 400, params);
  }
});

test("unauthenticated requests cannot reach the production-protected route", async () => {
  const response = await fetch(`${base}/authenticated/lifts/first-entries-forecast?${query}`);
  assert.equal(response.status, 401);
});

test("empty data produces explicit unavailability rather than fabricated values", async () => {
  const response = await fetch(`${base}/lifts/first-entries-forecast?date=2026-02-16&season=${season}&mode=verification`);
  assert.equal(response.status, 200);
  const result = await response.json() as FirstEntriesForecast;
  assert.equal(result.availability, "verification");
  assert.equal(result.forecasts.length, 3);
  assert.ok(result.forecasts.every((p) => p.status === "no_data" && p.predictedTotal === null));
});

test("past days are withheld for viewers, operators and admins unless verification is enabled", async () => {
  for (const role of ["viewer", "operator", "admin"]) {
    const response = await fetch(`${base}/lifts/first-entries-forecast?${liveQuery}`, {
      headers: { "x-test-role": role },
    });
    assert.equal(response.status, 200);
    const result = GetFirstEntriesForecastResponse.parse(await response.json());
    assert.equal(result.availability, "past_day");
    assert.deepEqual(result.forecasts, []);
    assert.equal(result.history.daysExamined, 0);
  }
});

test("viewers and operators cannot bypass the restriction by requesting verification directly", async () => {
  for (const role of ["viewer", "operator"]) {
    const response = await fetch(`${base}/lifts/first-entries-forecast?${query}`, {
      headers: { "x-test-role": role },
    });
    assert.equal(response.status, 403);
  }
});

test("today's viewer forecast works before closure and ignores future-imported final batches", async () => {
  const response = await fetch(`${base}/live/lifts/first-entries-forecast?${liveQuery}`, {
    headers: { "x-test-role": "viewer" },
  });
  assert.equal(response.status, 200);
  const result = GetFirstEntriesForecastResponse.parse(await response.json());
  assert.equal(result.availability, "live");
  assert.equal(result.forecasts[0].status, "ready");
  assert.equal(result.forecasts[1].status, "ready");
  assert.equal(result.forecasts[2].status, "before_extraction");
});

test("after closure, selecting the morning cannot restore a viewer forecast; admin override can", async () => {
  const endpoint = `${base}/closed/lifts/first-entries-forecast?${liveQuery}&extraction=20260215103000`;
  const viewer = await fetch(endpoint, { headers: { "x-test-role": "viewer" } });
  assert.equal(viewer.status, 200);
  const hidden = GetFirstEntriesForecastResponse.parse(await viewer.json());
  assert.equal(hidden.availability, "day_closed");
  assert.deepEqual(hidden.forecasts, []);
  const admin = await fetch(`${endpoint}&mode=verification`);
  assert.equal(admin.status, 200);
  const verified = GetFirstEntriesForecastResponse.parse(await admin.json());
  assert.equal(verified.availability, "verification");
  assert.equal(verified.forecasts[0].status, "ready");
  assert.equal(verified.forecasts[1].status, "before_extraction");
});

test("midnight in Rome closes yesterday even when the UTC date is still the previous day", async () => {
  const response = await fetch(`${base}/midnight/lifts/first-entries-forecast?${liveQuery}`);
  const result = GetFirstEntriesForecastResponse.parse(await response.json());
  assert.equal(result.availability, "past_day");
  assert.deepEqual(result.forecasts, []);
});

test("future dates are excluded even with admin verification", async () => {
  const response = await fetch(`${base}/lifts/first-entries-forecast?date=2026-02-17&season=${season}&mode=verification`);
  assert.equal(response.status, 200);
  const result = GetFirstEntriesForecastResponse.parse(await response.json());
  assert.equal(result.availability, "future_day");
  assert.deepEqual(result.forecasts, []);
});
