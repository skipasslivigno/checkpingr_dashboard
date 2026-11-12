import assert from "node:assert/strict";
import { test } from "node:test";
import { buildFirstEntriesForecast, romeTimestamp, validDate, type ForecastExtraction } from "./first-entries-forecast";
import { forecastAvailability } from "./forecast-access";

const target = "2026-02-15";
const season = "2025-2026";
const input = { date: target, season };
const now = new Date("2026-02-16T12:00:00Z");

function batches(date: string, amounts = [100, 150, 180, 200]): ForecastExtraction[] {
  return ["103000", "113000", "140000", "233000"].map((hour, i) => ({
    date, season, extraction: date.replaceAll("-", "") + hour,
    entries: amounts[i], liftIds: "1,2", valid: true,
  }));
}

function history(n = 60): ForecastExtraction[] {
  return Array.from({ length: n }, (_, i) => {
    const date = new Date(Date.parse(`${target}T12:00:00Z`) - (n - i) * 86_400_000).toISOString().slice(0, 10);
    return batches(date);
  }).flat();
}

test("predicts all three extraction times using earlier finals and calibrated bounds", () => {
  const result = buildFirstEntriesForecast([...history(), ...batches(target, [250, 375, 450, 500])], input, now);
  assert.equal(result.history.completeDays, 60);
  assert.equal(result.metric, "nuin");
  for (const point of result.forecasts) {
    assert.equal(point.status, "ready");
    assert.equal(point.predictedTotal, 500);
    assert.equal(point.lowerBound, 500);
    assert.equal(point.upperBound, 500);
    assert.ok(point.validation.sampleDays >= 12);
    assert.equal(point.validation.medianAbsolutePercentageError, 0);
    assert.equal(point.validation.meanAbsoluteError, 0);
    assert.equal(point.validation.intervalCoverage, 1);
  }
});

test("selected extraction cannot see a later slot, final, or a changed later lift roster", () => {
  const rows = [...history(), ...batches(target, [250, 375, 450, 500])];
  const selected = { ...input, extraction: "20260215103000" };
  const before = buildFirstEntriesForecast(rows, selected, now);
  assert.equal(before.forecasts[0].predictedTotal, 500);
  assert.equal(before.forecasts[1].status, "before_extraction");
  assert.equal(before.forecasts[2].status, "before_extraction");
  const changed = rows.map((r) => r.date === target && r.extraction > selected.extraction
    ? { ...r, entries: 999999, liftIds: "1,2,3" } : r);
  assert.deepEqual(buildFirstEntriesForecast(changed, selected, now), before);
  // Even at day's end, a 10:30 forecast never floors itself to the later actual.
  const finalView = buildFirstEntriesForecast(changed, input, now);
  assert.equal(finalView.forecasts[0].predictedTotal, 500);
});

test("future dates do not enter training or rolling validation", () => {
  const baseline = [...history(), ...batches(target)];
  const future = batches("2026-02-17", [1, 1, 1, 99999999]);
  assert.deepEqual(buildFirstEntriesForecast([...baseline, ...future], input, now), buildFirstEntriesForecast(baseline, input, now));
});

test("a simulated day's final never enters its own rolling validation forecast", () => {
  const rows = [...history(), ...batches(target)];
  const before = buildFirstEntriesForecast(rows, input, now);
  const lastDay = "2026-02-14";
  const changed = rows.map((r) => r.date === lastDay && r.extraction.endsWith("233000")
    ? { ...r, entries: 10000 } : r);
  const after = buildFirstEntriesForecast(changed, input, now);
  assert.equal(after.forecasts[0].predictedTotal, before.forecasts[0].predictedTotal);
  assert.ok(after.forecasts[0].validation.meanAbsoluteError! > before.forecasts[0].validation.meanAbsoluteError!);
});

test("requires both enough training and genuine out-of-sample validation", () => {
  const none = buildFirstEntriesForecast(batches(target), input, now);
  assert.equal(none.forecasts[0].status, "insufficient_history");
  const small = buildFirstEntriesForecast([...history(15), ...batches(target)], input, now);
  assert.equal(small.forecasts[0].status, "insufficient_validation");
  assert.equal(small.forecasts[0].predictedTotal, null);
  assert.equal(small.forecasts[0].validation.sampleDays, 3);
});

test("rejects incomplete finals, missing rosters, falling counters and morning-only days", () => {
  const badDates = history(4).filter((r) => r.extraction.endsWith("233000")).map((r) => r.date);
  let bad = history(4).map((r) => {
    if (r.date === badDates[0] && r.extraction.endsWith("233000")) return { ...r, valid: false };
    if (r.date === badDates[1] && r.extraction.endsWith("233000")) return { ...r, liftIds: "1" };
    if (r.date === badDates[2] && r.extraction.endsWith("140000")) return { ...r, entries: 50 };
    return r;
  });
  bad = bad.filter((r) => !(r.date === badDates[3] && r.extraction.endsWith("233000")));
  const result = buildFirstEntriesForecast([...bad, ...batches(target)], input, now);
  assert.equal(result.history.daysExamined, 4);
  assert.equal(result.history.completeDays, 0);
});

test("missing scheduled batches are not replaced with a later extraction", () => {
  const rows = batches(target).map((r) => r.extraction.endsWith("103000")
    ? { ...r, extraction: "20260215103500" } : r);
  const result = buildFirstEntriesForecast([...history(), ...rows], input, now);
  assert.equal(result.forecasts[0].status, "missing_extraction");
  assert.equal(result.forecasts[0].predictedTotal, null);
});

test("handles zero counts, incomplete current batches, no data and seasonal scope", () => {
  const zero = buildFirstEntriesForecast([...history(), ...batches(target, [0, 0, 0, 0])], input, now);
  assert.equal(zero.forecasts[0].status, "zero_entries");
  const incomplete = buildFirstEntriesForecast([...history(), ...batches(target).map((r) => ({ ...r, valid: false }))], input, now);
  assert.equal(incomplete.forecasts[0].status, "incomplete_extraction");
  const empty = buildFirstEntriesForecast(history(), { ...input, season: "wrong-season" }, now);
  assert.equal(empty.forecasts[0].status, "no_data");
  assert.equal(empty.forecasts[0].predictedTotal, null);
  const broader = buildFirstEntriesForecast([...history(30), ...batches(target)], input, now);
  assert.equal(broader.forecasts[0].comparisonScope, "broader_history");
  assert.equal(broader.forecasts[0].confidence, "low");
});

test("detects a missing lift even in the day's first extraction using the earlier known roster", () => {
  const rows = [...history(), ...batches(target).map((r) => ({ ...r, liftIds: "1" }))];
  const result = buildFirstEntriesForecast(rows, input, now);
  assert.equal(result.forecasts[0].status, "incomplete_extraction");
  assert.equal(result.forecasts[0].predictedTotal, null);
});

test("uses Europe/Rome including daylight saving and caps future-imported timestamps", () => {
  assert.equal(romeTimestamp(new Date("2026-02-15T09:29:59Z")), "20260215102959");
  assert.equal(romeTimestamp(new Date("2026-07-15T08:30:00Z")), "20260715103000");
  const result = buildFirstEntriesForecast([...history(), ...batches(target)], input, new Date("2026-02-15T09:29:59Z"));
  assert.ok(result.forecasts.every((p) => p.status === "before_extraction" && p.predictedTotal === null));
});

test("rejects malformed timestamps and ambiguous duplicate historical dates", () => {
  const rows = history(1);
  const duplicated = [...rows, ...rows.map((r) => ({ ...r, season: "other-season" }))];
  const malformed = { ...batches("2026-02-13")[0], extraction: "20260213999900" };
  const result = buildFirstEntriesForecast([...duplicated, malformed, ...batches(target)], input, now);
  assert.equal(result.history.completeDays, 0);
  assert.ok(validDate("2024-02-29"));
  assert.ok(!validDate("2026-02-29"));
  assert.ok(!validDate("2026-02-31"));
});

test("live access uses the actual closing batch, not just the clock or another season", () => {
  const clock = new Date("2026-02-15T22:45:00Z");
  const rows = batches(target);
  assert.equal(forecastAvailability(target, season, false, rows.slice(0, 3), clock), "live");
  assert.equal(forecastAvailability(target, season, false, rows, clock), "day_closed");
  assert.equal(forecastAvailability(target, season, false, rows.map((r) => ({ ...r, season: "other" })), clock), "live");
  assert.equal(forecastAvailability(target, season, false, rows.map((r) => ({ ...r, valid: false })), clock), "live");
  assert.equal(forecastAvailability(target, season, false, batches(target, [0, 0, 0, 0]), clock), "day_closed");
  assert.equal(forecastAvailability(target, season, true, rows, clock), "verification");
});

test("18:00 is not a final and cannot close the viewer forecast or train the model", () => {
  const rows = history().map(r => ({ ...r, extraction: r.extraction.replace(/233000$/, "180000") }));
  const partial = batches(target).map(r => ({ ...r, extraction: r.extraction.replace(/233000$/, "180000") }));
  assert.equal(forecastAvailability(target, season, false, partial, new Date("2026-02-15T20:00:00Z")), "live");
  assert.equal(buildFirstEntriesForecast([...rows, ...partial], input, now).history.completeDays, 0);
});
