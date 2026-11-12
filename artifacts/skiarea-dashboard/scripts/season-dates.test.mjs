import assert from "node:assert/strict";
import { test } from "node:test";
import { getDateNavigation, resolveSeasonDate } from "../lib/season-dates.ts";

const dates = ["2025-05-04", "2025-05-03", "2024-11-30"];

test("first day cannot navigate to a previous season", () => {
  assert.deepEqual(getDateNavigation(dates, "2024-11-30"), {
    newerDate: "2025-05-03", olderDate: undefined,
  });
});

test("last day cannot navigate to a following season", () => {
  assert.deepEqual(getDateNavigation(dates, "2025-05-04"), {
    newerDate: undefined, olderDate: "2025-05-03",
  });
});

test("middle day can navigate in both directions, skipping unavailable days", () => {
  assert.deepEqual(getDateNavigation(dates, "2025-05-03"), {
    newerDate: "2025-05-04", olderDate: "2024-11-30",
  });
});

test("an invalid date during season loading cannot navigate", () => {
  assert.deepEqual(getDateNavigation(dates, "2026-11-12"), {
    newerDate: undefined, olderDate: undefined,
  });
});

test("a one-day or empty season cannot navigate", () => {
  for (const available of [[], ["2025-05-04"]]) {
    assert.deepEqual(getDateNavigation(available, "2025-05-04"), {
      newerDate: undefined, olderDate: undefined,
    });
  }
});

test("after refreshing on today, switching seasons selects that season's latest day", () => {
  assert.equal(resolveSeasonDate(dates, "2026-11-12", true), "2025-05-04");
  assert.equal(resolveSeasonDate(dates, "2026-11-12", false), "2025-05-04");
});

test("refresh preserves a valid day; switching back to cached season starts at latest", () => {
  assert.equal(resolveSeasonDate(dates, "2025-05-03", false), "2025-05-03");
  assert.equal(resolveSeasonDate(dates, "2025-05-03", true), "2025-05-04");
  assert.equal(resolveSeasonDate(["2026-11-12"], "2025-05-04", true), "2026-11-12");
});

test("wait for season dates without inventing a date if none exist", () => {
  assert.equal(resolveSeasonDate([], "2026-11-12", true), undefined);
});
