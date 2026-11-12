import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FirstEntriesForecast } from "../src/components/mockups/dashboard-compact/_ForecastTile";
import { PreviewAuthContext } from "../src/components/mockups/dashboard-compact/_stubs";
import { romeDate } from "../src/components/mockups/dashboard-compact/_forecast-view";

// The extracted component uses the application's actual render/visibility logic;
// only auth/API/native-context boundaries use isolated preview fixtures.
function render(role: string, date = romeDate(), hour = "113000") {
  return renderToStaticMarkup(
    <PreviewAuthContext.Provider value={{ user: { id: "preview", tenantId: "preview", role } }}>
      <FirstEntriesForecast date={date} season="2025-2026" extraction={`${date.replaceAll("-", "")}${hour}`} />
    </PreviewAuthContext.Provider>,
  );
}

test("ready tile contains the estimate and extraction time but no analytical block", () => {
  const html = render("admin");
  assert.ok(html.includes((2150).toLocaleString()));
  assert.ok(html.includes("Ingressi previsti"));
  assert.ok(html.includes("11:30"));
  assert.ok(html.includes("button-forecast-tile"));
  for (const hidden of [
    "forecast-panel", "switch-forecast-verification", "Intervallo indicativo",
    "Giorni di addestramento", "historical-ratio-v1", "Copertura intervallo",
  ]) assert.ok(!html.includes(hidden), hidden);
});

test("admin can reach verification from a past-day tile without inline controls", () => {
  const html = render("admin", "2025-02-10");
  assert.ok(html.includes("Verifica"));
  assert.ok(html.includes("button-forecast-tile"));
  assert.ok(!html.includes("switch-forecast-verification"));
  assert.ok(!html.includes("forecast-panel"));
});

test("viewer past-day forecasts remain hidden", () => {
  assert.equal(render("viewer", "2025-02-10"), "");
});

test("viewer without a usable scheduled estimate does not see a fake zero", () => {
  assert.equal(render("viewer", romeDate(), "090000"), "");
});

test("viewer ready tile does not expose admin settings or the previous season statistic", () => {
  const html = render("viewer");
  assert.ok(html.includes("button-forecast-tile"));
  assert.ok(html.includes("text-forecast-tile-value"));
  assert.ok(!html.includes("switch-forecast-verification"));
  assert.ok(!html.includes(">Stagione<"));
});
