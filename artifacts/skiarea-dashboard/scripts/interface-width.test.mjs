import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_INTERFACE_WIDTH, INTERFACE_WIDTH_PX, parseInterfaceWidth, resolveContentWidth, createInterfaceWidthWriter } from "../lib/interface-width.ts";

test("default is standard 960", () => {
  assert.equal(DEFAULT_INTERFACE_WIDTH, "standard");
  assert.equal(INTERFACE_WIDTH_PX.standard, 960);
});

test("parse rejects unknown values", () => {
  assert.equal(parseInterfaceWidth("wide"), "wide");
  assert.equal(parseInterfaceWidth("huge"), null);
  assert.equal(parseInterfaceWidth(null), null);
  assert.equal(parseInterfaceWidth(640), null);
});

test("content width is a max, not fixed; phones keep full width", () => {
  assert.equal(resolveContentWidth(390, "compact"), 390);
  assert.equal(resolveContentWidth(2560, "compact"), 640);
  assert.equal(resolveContentWidth(2560, "standard"), 960);
  assert.equal(resolveContentWidth(2560, "wide"), 1200);
  assert.equal(resolveContentWidth(2560, "full"), 2560);
  assert.equal(resolveContentWidth(800, "wide"), 800);
});

test("rapid changes write sequentially and keep the newest choice", async () => {
  const calls = [];
  let completeFirst;
  let stored;
  const write = createInterfaceWidthWriter(async value => {
    calls.push(value);
    if (calls.length === 1) await new Promise(resolve => { completeFirst = resolve; });
    stored = value;
  });
  const first = write("compact");
  const second = write("wide");
  const third = write("full");
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, ["compact"]);
  completeFirst();
  await Promise.all([first, second, third]);
  assert.deepEqual(calls, ["compact", "wide", "full"]);
  assert.equal(stored, "full");
});

test("a storage failure does not prevent saving a later choice", async () => {
  let stored;
  const write = createInterfaceWidthWriter(async value => {
    if (value === "compact") throw new Error("Storage unavailable");
    stored = value;
  });
  const rejected = write("compact");
  const accepted = write("standard");
  await assert.rejects(rejected, /Storage unavailable/);
  await accepted;
  assert.equal(stored, "standard");
});
