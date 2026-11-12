import assert from "node:assert/strict";
import { test } from "node:test";
import { comparePeriods, saturday, shiftDate, validCalendarDate, type EntryBatch } from "./period-comparison";

const season = "2025-2026";
const previousSeason = "2024-2025";
const date = "2025-12-08";
const starts = { [season]: "2025-11-29", [previousSeason]: "2024-11-30" };
const batch = (date: string, season: string, entries: number, hour = "233000"): EntryBatch => ({
  date, season, entries, extraction: date.replaceAll("-", "") + hour, valid: true,
});
function data() {
  return [
    ...Array.from({ length: 9 }, (_, i) => batch(shiftDate(starts[season], i), season, 100)),
    ...Array.from({ length: 10 }, (_, i) => batch(shiftDate(starts[previousSeason], i), previousSeason, 50)),
    ...["103000", "113000", "140000", "163000", "180000"].map((h, i) => batch(date, season, [10, 15, 60, 80, 90][i], h)),
  ];
}
function run(hour: string, rows = data()) {
  return comparePeriods({ date, season, previousSeason, starts, rows, extraction: date.replaceAll("-", "") + hour });
}
test("weeks begin Saturday; comparisons align opening weeks and weekdays, not calendar anniversaries", () => {
  assert.equal(saturday(date), "2025-12-06");
  const r = run("140000");
  assert.equal(r.weekly.currentFromDate, "2025-12-06");
  assert.equal(r.weekly.previousFromDate, "2024-12-07");
  assert.equal(r.weekly.previousToDate, "2024-12-09");
  assert.equal(r.weekly.currentTotal, 260);
  assert.equal(r.weekly.previousTotal, 150);
  assert.equal(r.progressive.currentTotal, 960);
  assert.equal(r.progressive.previousTotal, 500);
  assert.equal(r.progressive.changePercent, 92);
});
test("10:30 and 11:30 stop both periods on the preceding equivalent day", () => {
  for (const h of ["103000", "113000"]) {
    const r = run(h);
    assert.equal(r.includedSelectedDay, false);
    assert.equal(r.weekly.currentToDate, "2025-12-07");
    assert.equal(r.weekly.previousToDate, "2024-12-08");
    assert.equal(r.weekly.currentTotal, 200);
    assert.equal(r.progressive.currentTotal, 900);
    assert.equal(r.progressive.changePercent, 100);
  }
});
test("14:00, 16:30 and 18:00 include the chosen partial, not later batches", () => {
  for (const [h, value] of [["140000", 60], ["163000", 80], ["180000", 90]] as const) {
    const r = run(h);
    assert.equal(r.includedSelectedDay, true);
    assert.equal(r.weekly.currentTotal, 200 + value);
    assert.equal(r.weekly.previousTotal, 150);
  }
});
test("existing 23:30 final includes the day even for a morning selection", () => {
  const r = run("103000", [...data(), batch(date, season, 120)]);
  assert.equal(r.sourceExtraction, "20251208233000");
  assert.equal(r.includedSelectedDay, true);
  assert.equal(r.progressive.currentTotal, 1020);
});
test("history never substitutes 18:00 or a later non-final batch for the 23:30 final", () => {
  const rows = data().filter(r => !(r.season === previousSeason && r.date === "2024-12-07"));
  rows.push(batch("2024-12-07", previousSeason, 9999, "180000"));
  rows.push(batch("2024-12-08", previousSeason, 9999, "234500"));
  const r = run("140000", rows);
  assert.equal(r.weekly.previousTotal, null);
  assert.equal(r.weekly.changePercent, null);
  assert.deepEqual(r.weekly.missingPreviousDays, ["2024-12-07"]);
});
test("missing current finals are not zeros and do not produce misleading differences", () => {
  const r = run("140000", data().filter(r => !(r.season === season && r.date === "2025-12-07")));
  assert.equal(r.weekly.currentTotal, null);
  assert.equal(r.progressive.changePercent, null);
  assert.deepEqual(r.weekly.missingCurrentDays, ["2025-12-07"]);
});
test("real zero totals are preserved and zero denominators have no percentage", () => {
  const r = run("140000", data().map(r => ({ ...r, entries: 0 })));
  assert.equal(r.weekly.currentTotal, 0);
  assert.equal(r.weekly.previousTotal, 0);
  assert.equal(r.weekly.changePercent, null);
});
test("opening dates must be explicitly configured, not silently guessed", () => {
  const r = comparePeriods({ date, season, previousSeason, starts: {}, rows: data() });
  assert.equal(r.status, "configuration_required");
  assert.deepEqual(r.missingConfiguration, [season, previousSeason]);
  assert.equal(r.progressive.currentTotal, null);
});
test("Saturday morning uses the completed previous week and the season boundary is safe", () => {
  const d = "2025-12-06";
  const r = comparePeriods({
    date: d, season, previousSeason, starts, rows: [...data(), batch(d, season, 20, "103000")],
    extraction: "20251206103000",
  });
  // That date already has a final in the fixture: remove it to exercise an open Saturday.
  const open = comparePeriods({
    date: d, season, previousSeason, starts, rows: [...data().filter(b => b.date !== d), batch(d, season, 20, "103000")],
    extraction: "20251206103000",
  });
  assert.equal(r.includedSelectedDay, true);
  assert.equal(open.weekly.currentFromDate, "2025-11-29");
  assert.equal(open.weekly.currentToDate, "2025-12-05");
  assert.equal(open.weekly.currentTotal, 700);
  const first = comparePeriods({ date: starts[season], season, previousSeason, starts,
    rows: [batch(starts[season], season, 10, "103000")], extraction: "20251129103000" });
  assert.equal(first.status, "before_season");
  assert.equal(first.progressive.currentTotal, 0);
});
test("non-Saturday opening dates still align identical weekdays and leap/DST dates stay calendar-safe", () => {
  assert.ok(validCalendarDate("2024-02-29"));
  assert.ok(!validCalendarDate("2025-02-29"));
  assert.equal(shiftDate("2026-03-28", 1), "2026-03-29");
  const r = comparePeriods({ date, season, previousSeason,
    starts: { ...starts, [season]: "2025-12-01" }, rows: data(), extraction: "20251208140000" });
  assert.equal(r.weekly.previousToDate, "2024-12-09");
  assert.equal(r.progressive.currentFromDate, "2025-12-01");
});

test("a shorter previous season uses its final annual total and its last operating week", () => {
  const r = comparePeriods({ date, season, previousSeason, starts,
    ends: { [previousSeason]: "2024-12-07" }, rows: data(), extraction: "20251208140000" });
  assert.equal(r.progressive.currentTotal, 960);
  assert.equal(r.progressive.previousTotal, 400);
  assert.equal(r.progressive.previousToDate, "2024-12-07");
  assert.equal(r.progressive.previousDefinitive, true);
  assert.equal(r.progressive.changePercent, 140);
  assert.deepEqual(r.progressive.missingPreviousDays, []);
  // Do not mix an annual total into a weekly comparison.
  assert.equal(r.weekly.previousFromDate, "2024-12-07");
  assert.equal(r.weekly.previousToDate, "2024-12-07");
  assert.equal(r.weekly.previousTotal, 50);
  assert.equal(r.weekly.previousDefinitive, true);
  assert.equal(r.weekly.changePercent, 420);
});

test("without a configured end, trailing absent imports are not guessed to be season closure", () => {
  const rows = data().filter(r => r.season !== previousSeason || r.date <= "2024-12-07");
  const unknown = run("140000", rows);
  assert.equal(unknown.progressive.previousTotal, null);
  assert.equal(unknown.progressive.previousDefinitive, false);
  const closed = comparePeriods({ date, season, previousSeason, starts,
    ends: { [previousSeason]: "2024-12-07" }, rows, extraction: "20251208140000" });
  assert.equal(closed.progressive.previousTotal, 400);
  assert.equal(closed.progressive.previousDefinitive, true);
});

test("closure never conceals missing imports within the operating season", () => {
  const r = comparePeriods({ date, season, previousSeason, starts,
    ends: { [previousSeason]: "2024-12-07" },
    rows: data().filter(r => r.season !== previousSeason || r.date !== "2024-12-04"),
    extraction: "20251208140000" });
  assert.equal(r.progressive.previousTotal, null);
  assert.equal(r.progressive.previousDefinitive, false);
  assert.equal(r.progressive.changePercent, null);
  assert.deepEqual(r.progressive.missingPreviousDays, ["2024-12-04"]);
});

test("the closing day's missing 23:30 final is still incomplete, never a definitive partial", () => {
  const r = comparePeriods({ date, season, previousSeason, starts,
    ends: { [previousSeason]: "2024-12-07" },
    rows: [...data().filter(r => r.season !== previousSeason || r.date !== "2024-12-07"),
      batch("2024-12-07", previousSeason, 50, "180000")], extraction: "20251208140000" });
  assert.equal(r.weekly.previousTotal, null);
  assert.equal(r.weekly.previousDefinitive, false);
  assert.deepEqual(r.weekly.missingPreviousDays, ["2024-12-07"]);
});

test("current season stops at its configured end only when no later eligible data exists", () => {
  const r = comparePeriods({ date, season, previousSeason, starts, ends: { [season]: "2025-12-06" },
    rows: data().filter(r => r.season !== season || r.date <= "2025-12-06") });
  assert.equal(r.progressive.currentToDate, "2025-12-06");
  assert.equal(r.progressive.currentTotal, 800);
  assert.equal(r.progressive.currentDefinitive, true);
  assert.equal(r.includedSelectedDay, false);
  assert.equal(r.sourceExtraction, "20251206233000");
  const stillOpen = comparePeriods({ date, season, previousSeason, starts, ends: { [season]: date },
    rows: data(), extraction: "20251208140000" });
  assert.equal(stillOpen.progressive.currentDefinitive, false);
});

test("afternoon and final selections cannot lose the selected day to an earlier configured end", () => {
  for (const [hour, value] of [["140000", 60], ["163000", 80], ["180000", 90], ["233000", 120]] as const) {
    const rows = hour === "233000" ? [...data(), batch(date, season, value)] : data();
    const r = comparePeriods({ date, season, previousSeason, starts, ends: { [season]: "2025-12-07" },
      rows, extraction: "20251208" + hour });
    assert.equal(r.progressive.currentToDate, date);
    assert.equal(r.progressive.currentTotal, 900 + value);
    assert.equal(r.weekly.currentTotal, 200 + value);
    assert.equal(r.includedSelectedDay, true);
    assert.equal(r.sourceExtraction, "20251208" + hour);
    assert.equal(r.progressive.currentDefinitive, false, "A contradicted end date does not confirm season closure");
  }
});

test("a closing batch overrides either morning selection even beyond the configured end", () => {
  for (const hour of ["103000", "113000"]) {
    const r = comparePeriods({ date, season, previousSeason, starts, ends: { [season]: "2025-12-07" },
      rows: [...data(), batch(date, season, 120)], extraction: "20251208" + hour });
    assert.equal(r.progressive.currentToDate, date);
    assert.equal(r.progressive.currentTotal, 1020);
    assert.equal(r.weekly.currentTotal, 320);
    assert.equal(r.sourceExtraction, "20251208233000");
    assert.equal(r.includedSelectedDay, true);
  }
});

test("without today's final, a morning selection retains yesterday's observed final beyond a stale end", () => {
  const r = comparePeriods({ date, season, previousSeason, starts, ends: { [season]: "2025-12-06" },
    rows: data(), extraction: "20251208103000" });
  assert.equal(r.progressive.currentToDate, "2025-12-07");
  assert.equal(r.progressive.currentTotal, 900);
  assert.equal(r.includedSelectedDay, false);
});

test("May 3 final adds the day's 325 entries to 998904 and leaves the previous closed season capped", () => {
  const r = comparePeriods({
    date: "2026-05-03", season, previousSeason,
    starts: { [season]: "2026-05-01", [previousSeason]: "2025-05-01" },
    ends: { [season]: "2026-05-02", [previousSeason]: "2025-05-01" },
    rows: [batch("2026-05-01", season, 997893), batch("2026-05-02", season, 1011),
      batch("2026-05-03", season, 325), batch("2025-05-01", previousSeason, 1315024)],
    extraction: "20260503233000",
  });
  assert.equal(r.progressive.currentTotal, 999229);
  assert.equal(r.weekly.currentTotal, 1336);
  assert.equal(r.progressive.currentToDate, "2026-05-03");
  assert.equal(r.progressive.previousTotal, 1315024);
  assert.equal(r.progressive.previousToDate, "2025-05-01");
  assert.equal(r.progressive.previousDefinitive, true);
});
