import assert from "node:assert/strict";
import { test } from "node:test";
import type { OperationalNote } from "@workspace/api-client-react";
import { diaryStrings } from "../i18n/diary";
import { buildPeriodNotesHtml, buildSinglePeriodHtml, escapeHtml, isRealDate, NOTES_PDF_CSS } from "./diary";

const base: OperationalNote = {
  id: "00000000-0000-4000-8000-000000000001", date: "2026-02-21",
  liftId: 1, liftName: "<img src=x onerror=alert(1)>", category: "technical",
  text: "<script>alert('x')</script> & neve è\n" + "lungo".repeat(700),
  authorName: "<b>Autore</b>", updatedByName: "<svg onload=alert(1)>",
  createdAt: "2026-02-21T10:00:00Z", updatedAt: "2026-02-21T11:00:00Z",
};

test("PDF escapes note content, lift and author names and preserves long Unicode text", () => {
  const html = buildPeriodNotesHtml({ from: "2026-02-01", to: "2026-02-28", notes: [base] }, null, diaryStrings("it"), "it");
  assert.ok(!html.includes("<script>")); assert.ok(!html.includes("<img")); assert.ok(!html.includes("<svg"));
  assert.ok(html.includes("&lt;script&gt;")); assert.ok(html.includes("&lt;b&gt;Autore&lt;/b&gt;"));
  assert.ok(html.includes("neve è\n")); assert.ok(html.includes("lungo".repeat(700)));
  assert.ok(html.includes("Problema tecnico")); assert.ok(html.includes("Ultima modifica"));
  assert.ok(NOTES_PDF_CSS.includes("white-space: pre-wrap")); assert.ok(NOTES_PDF_CSS.includes("break-inside: auto"));
  assert.equal(escapeHtml(`&<>"'`), "&amp;&lt;&gt;&quot;&#39;");
});
test("comparison keeps actual date intervals separate and sorts each section chronologically", () => {
  const html = buildPeriodNotesHtml(
    { from: "2026-02-01", to: "2026-02-28", notes: [{ ...base, text: "current-late" }, { ...base, date: "2026-02-02", text: "current-early" }] },
    { from: "2025-02-03", to: "2025-03-02", notes: [{ ...base, date: "2025-02-10", text: "previous-only" }] },
    diaryStrings("en"), "en",
  );
  assert.ok(html.includes("2026-02-01 / 2026-02-28")); assert.ok(html.includes("2025-02-03 / 2025-03-02"));
  assert.ok(html.indexOf("current-early") < html.indexOf("current-late"));
  const sections = html.split("</section>");
  assert.ok(sections[0].includes("Current interval") && !sections[0].includes("previous-only"));
  assert.ok(sections[1].includes("Compared interval") && sections[1].includes("previous-only") && !sections[1].includes("current-late"));
});
test("single period PDF includes notes and escapes other report strings", () => {
  const html = buildSinglePeriodHtml({
    from: "2026-02-01", to: "2026-02-28", season: "<script>season</script>", language: "it", s: diaryStrings("it"),
    totals: { passages: 10, guests: 5, activeDays: 1 },
    lifts: [{ ggbz: "<img>lift", totalPassages: 10, totalGuests: 5, activeDays: 1 }], notes: [base],
  });
  assert.ok(!html.includes("<script>")); assert.ok(!html.includes("<img"));
  assert.ok(html.includes("Note operative del periodo")); assert.ok(html.includes("2026-02-01 / 2026-02-28"));
  const empty = buildPeriodNotesHtml({ from: "2026-02-01", to: "2026-02-28", notes: [] }, null, diaryStrings("en"), "en");
  assert.ok(empty.includes("No notes.")); assert.ok(!empty.includes("Compared interval"));
});
test("civil date validation rejects impossible dates and accepts leap days without timezone shifts", () => {
  for (const value of ["0000-01-01", "2026-02-29", "2026-04-31", "2026-13-01", "2026-1-01", "", undefined]) assert.equal(isRealDate(value), false);
  assert.equal(isRealDate("2024-02-29"), true); assert.equal(isRealDate("2030-07-15"), true);
});
