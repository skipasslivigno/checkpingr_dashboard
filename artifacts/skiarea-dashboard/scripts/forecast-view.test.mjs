import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultForecastSlot, extractionBelongsToDate, forecastDateAllowed, romeDate } from "../lib/forecast-view.ts";

test("requests allow a latest extraction but never an old date's extraction", () => {
  assert.equal(extractionBelongsToDate(undefined, "2026-02-10"), true);
  assert.equal(extractionBelongsToDate("20260210103000", "2026-02-10"), true);
  assert.equal(extractionBelongsToDate("20260209103000", "2026-02-10"), false);
  assert.equal(extractionBelongsToDate("invalid", "2026-02-10"), false);
});

test("latest available scheduled estimate is focused, never a future slot", () => {
  const points = new Map([
    ["10:30", { status: "ready" }],
    ["11:30", { status: "before_extraction" }],
    ["14:00", { status: "before_extraction" }],
  ]);
  assert.equal(defaultForecastSlot(points), "10:30");
  points.set("11:30", { status: "ready" });
  assert.equal(defaultForecastSlot(points), "11:30");
  points.set("14:00", { status: "ready" });
  assert.equal(defaultForecastSlot(points), "14:00");
  points.set("14:00", { status: "missing_extraction" });
  assert.equal(defaultForecastSlot(points), "11:30");
});

test("without a ready estimate the latest reached status is shown safely", () => {
  assert.equal(defaultForecastSlot(new Map()), "10:30");
  assert.equal(defaultForecastSlot(new Map([
    ["10:30", { status: "insufficient_history" }],
    ["11:30", { status: "missing_extraction" }],
    ["14:00", { status: "before_extraction" }],
  ])), "11:30");
});

test("normal mode is today only and verification also permits past but never future days", () => {
  const now = new Date("2026-02-10T10:00:00Z");
  assert.equal(forecastDateAllowed("2026-02-10", false, now), true);
  assert.equal(forecastDateAllowed("2026-02-09", false, now), false);
  assert.equal(forecastDateAllowed("2026-02-09", true, now), true);
  assert.equal(forecastDateAllowed("2026-02-11", true, now), false);
});

test("a screen left open across Rome midnight stops considering yesterday as today", () => {
  const before = new Date("2026-07-10T21:59:59Z");
  const after = new Date("2026-07-10T22:00:01Z");
  assert.equal(romeDate(before), "2026-07-10");
  assert.equal(romeDate(after), "2026-07-11");
  assert.equal(forecastDateAllowed("2026-07-10", false, before), true);
  assert.equal(forecastDateAllowed("2026-07-10", false, after), false);
});
