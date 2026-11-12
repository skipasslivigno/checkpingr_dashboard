import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSeasonColorMap, resolveChartSeasons, toggleChartSeason } from "../lib/chart-seasons.ts";

const seasons = ["2025-2026", "2024-2025", "2023-2024", "2022-2023"];

test("all four seasons can be selected, with one distinct default color each", () => {
  let selected = [];
  for (const season of seasons.slice(2)) selected = toggleChartSeason(seasons, selected, season);
  assert.deepEqual(selected, seasons);
  const colors = buildSeasonColorMap(seasons, []);
  assert.equal(new Set(Object.values(colors)).size, 4);
});

test("custom colors retain their assigned season; missing colors get unique fallbacks", () => {
  const colors = buildSeasonColorMap(seasons, ["#0070BA", "#E6007E"]);
  assert.equal(colors[seasons[0]], "#0070BA");
  assert.equal(colors[seasons[1]], "#E6007E");
  assert.equal(new Set(Object.values(colors)).size, 4);
});

test("deselecting, reselecting and response reordering do not change season colors", () => {
  const colors = buildSeasonColorMap(seasons, []);
  const selected = toggleChartSeason(seasons, seasons, seasons[0]);
  assert.deepEqual(selected, seasons.slice(1));
  // Chips, daily/cumulative series, weekly bars and summaries all use this same lookup.
  assert.deepEqual(selected.map((season) => colors[season]), ["#E6007E", "#008577", "#D97706"]);
  for (const response of [selected, [...selected].reverse(), [seasons[3]]]) {
    assert.deepEqual(response.map((season) => colors[season]),
      response.map((season) => ["#0070BA", "#E6007E", "#008577", "#D97706"][seasons.indexOf(season)]));
  }
  assert.deepEqual(toggleChartSeason(seasons, selected, seasons[0]), seasons);
});

test("selection respects configured visible seasons and cannot deselect the last one", () => {
  assert.deepEqual(resolveChartSeasons(seasons.slice(0, 2), seasons), seasons.slice(0, 2));
  assert.deepEqual(toggleChartSeason(seasons, [seasons[2]], seasons[2]), [seasons[2]]);
  assert.deepEqual(toggleChartSeason(seasons, seasons, "2099-2100"), seasons);
});

test("newly added seasons can join the comparison without losing the current selection", () => {
  const previous = seasons.slice(0, 3);
  assert.deepEqual(toggleChartSeason(seasons, previous, seasons[3]), seasons);
  assert.deepEqual(resolveChartSeasons([], previous), []);
});

test("palette supports the configured maximum of 20 seasons without repeated fallback colors", () => {
  const many = Array.from({ length: 20 }, (_, i) => `${2025 - i}-${2026 - i}`);
  assert.equal(new Set(Object.values(buildSeasonColorMap(many, []))).size, 20);
  assert.equal(new Set(Object.values(buildSeasonColorMap(many, ["#0070BA", "#E6007E"])) ).size, 20);
});
