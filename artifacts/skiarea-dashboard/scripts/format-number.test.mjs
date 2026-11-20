import assert from "node:assert/strict";
import test from "node:test";
import { formatCount, formatPercent } from "../lib/format-number.ts";

test("counts always group thousands, including Italian four-digit counts", () => {
  assert.equal(formatCount(999, "it"), "999");
  assert.equal(formatCount(1336, "it"), "1.336");
  assert.equal(formatCount(1315024, "it"), "1.315.024");
  assert.equal(formatCount(-1336, "it"), "-1.336");
  assert.equal(formatCount(1336.6, "en"), "1,337");
  assert.equal(formatCount(0, "it"), "0");
  assert.equal(formatCount(null, "it"), "—");
});

test("percentages group only the integer part and preserve sign and precision", () => {
  assert.equal(formatPercent(1234.5, "it", true), "+1.234,5%");
  assert.equal(formatPercent(-89.7, "it", true), "−89,7%");
  assert.equal(formatPercent(-1234.5, "en"), "−1,234.5%");
  assert.equal(formatPercent(0, "it", true), "0,0%");
});
