import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { eq, inArray } from "drizzle-orm";
import { db, pool, tenantsTable, usersTable, liftSnapshotsTable, operationalNotesTable } from "@workspace/db";
import { GetOperationalNotesResponse, UpdateOperationalNoteResponse } from "@workspace/api-zod";
import { requireAuth } from "../middleware/requireAuth";
import router from "./operational-notes";

const tenantId = randomUUID(), otherId = randomUUID();
const userIds = { admin: randomUUID(), operator: randomUUID(), viewer: randomUUID(), other: randomUUID() };
const tokens: Record<string, string> = {};
let server: Server | undefined, base = "", noteId = "";
const input = { date: "2030-07-15", liftId: null as number | null, category: "weather", text: "Vento <forte> & neve \"à\"\nSeconda riga" };
async function request(path = "", method = "GET", body?: unknown, role = "admin") {
  return fetch(`${base}/operational-notes${path}`, {
    method, headers: { "Content-Type": "application/json", ...(tokens[role] ? { Authorization: `Bearer ${tokens[role]}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
const range = "?from=2030-07-01&to=2030-07-31";
before(async () => {
  assert.equal(process.env.NODE_ENV, "test");
  assert.ok(process.env.SESSION_SECRET);
  await db.insert(tenantsTable).values([tenantId, otherId].map(id => ({
    id, name: "Temporary diary tests", slug: `diary-${id}`, apiKey: randomUUID(),
  })));
  for (const [role, id] of Object.entries(userIds)) {
    const tenant = role === "other" ? otherId : tenantId;
    const accountRole = role === "other" ? "admin" : role as "admin" | "operator" | "viewer";
    await db.insert(usersTable).values({ id, tenantId: tenant, name: `Diary ${role}`, email: `${id}@example.invalid`, role: accountRole });
    tokens[role] = jwt.sign({ userId: id, tenantId: tenant, sessionVersion: 0 }, process.env.SESSION_SECRET!);
  }
  await db.insert(liftSnapshotsTable).values([
    { tenantId, ggnr: 1, ggbz: "Historical lift", dtgg: "2020-01-01", dupd: "20200101233000", eser: "2019-2020" },
    { tenantId: otherId, ggnr: 99, ggbz: "Other tenant lift", dtgg: "2020-01-01", dupd: "20200101233000", eser: "2019-2020" },
  ]);
  const app = express(); app.use(express.json(), requireAuth, router);
  server = createServer(app);
  await new Promise<void>(resolve => server!.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  base = `http://127.0.0.1:${address.port}`;
});
after(async () => {
  if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
  try { await db.delete(tenantsTable).where(inArray(tenantsTable.id, [tenantId, otherId])); }
  finally { await pool.end(); }
});
test("all routes require a real authenticated session; viewers can only read", async () => {
  for (const path of [range, "/lifts"]) assert.equal((await request(path, "GET", undefined, "anonymous")).status, 401);
  assert.equal((await request(range, "GET", undefined, "viewer")).status, 200);
  assert.equal((await request("", "POST", input, "viewer")).status, 403);
  assert.equal((await request(`/${randomUUID()}`, "PUT", input, "viewer")).status, 403);
  assert.equal((await request(`/${randomUUID()}`, "DELETE", undefined, "viewer")).status, 403);
});
test("CRUD persists without any extraction on the date and retains original attribution", async () => {
  const created = await request("", "POST", input);
  assert.equal(created.status, 201);
  const note = UpdateOperationalNoteResponse.parse(await created.json()); noteId = note.id;
  assert.equal(note.authorName, "Diary admin"); assert.equal(note.liftId, null);
  assert.equal(note.text, input.text); assert.ok(!("tenantId" in note)); assert.ok(!("authorId" in note));
  const updated = await request(`/${noteId}`, "PUT", { ...input, text: "Modificato", liftId: 1 }, "operator");
  assert.equal(updated.status, 200);
  const saved = UpdateOperationalNoteResponse.parse(await updated.json());
  assert.equal(saved.authorName, "Diary admin"); assert.equal(saved.updatedByName, "Diary operator");
  assert.equal(saved.createdAt, note.createdAt); assert.ok(saved.updatedAt >= saved.createdAt);
  assert.equal(saved.liftName, "Historical lift"); assert.equal(saved.date, input.date);
  const catalog = await (await request("/lifts")).json();
  assert.deepEqual(catalog, [{ id: 1, name: "Historical lift" }]);
});
test("tenant isolation covers listing, IDs, catalog and forged lift references", async () => {
  assert.deepEqual(await (await request(range, "GET", undefined, "other")).json(), []);
  for (const method of ["PUT", "DELETE"]) {
    assert.equal((await request(`/${noteId}`, method, method === "PUT" ? input : undefined, "other")).status, 404);
  }
  for (const liftId of [99, 123456]) {
    assert.equal((await request("", "POST", { ...input, liftId })).status, 400);
    assert.equal((await request(`/${noteId}`, "PUT", { ...input, liftId })).status, 400);
  }
  assert.deepEqual(await (await request(`${range}&scope=lift&liftId=99`)).json(), []);
  assert.deepEqual(await (await request("/lifts", "GET", undefined, "other")).json(), [{ id: 99, name: "Other tenant lift" }]);
});
test("date, body, ID and filter validation rejects invalid and forged inputs", async () => {
  const invalid = [
    { date: "2030-02-29" }, { date: "2030-04-31" }, { date: "2030-13-01" }, { date: "0000-01-01" }, { text: " \n\t " }, { text: "\0" },
    { text: "x".repeat(4001) }, { category: "unknown" }, { liftId: -1 }, { liftId: 1.5 },
    { tenantId: otherId }, { authorName: "forged" }, { authorId: userIds.other }, { updatedByName: "forged" },
  ];
  for (const patch of invalid) {
    assert.equal((await request("", "POST", { ...input, ...patch })).status, 400, JSON.stringify(patch));
    assert.equal((await request(`/${noteId}`, "PUT", { ...input, ...patch })).status, 400);
  }
  for (const query of ["?from=2030-02-29&to=2030-03-01", "?from=2030-08-01&to=2030-07-01", range + "&scope=lift",
    range + "&scope=nope", range + "&scope=lift&liftId=1.5", range + "&scope=general&liftId=1",
    range + "&scope=lift&liftId=1&includeGeneral=banana", "?from=x&to=y"]) {
    assert.equal((await request(query)).status, 400, query);
  }
  for (const method of ["DELETE", "PUT"]) assert.equal((await request("/bad-id", method, method === "PUT" ? input : undefined)).status, 400);
});
test("inclusive filters return chronological notes, general/lift union and actual season dates", async () => {
  for (const item of [
    { ...input, date: "2030-07-01", text: "First" },
    { ...input, date: "2030-07-31", text: "Last" },
    { ...input, date: "2029-07-15", text: "Previous season" },
  ]) assert.equal((await request("", "POST", item, "operator")).status, 201);
  const all = GetOperationalNotesResponse.parse(await (await request(range)).json());
  assert.deepEqual(all.map(n => n.date), ["2030-07-01", "2030-07-15", "2030-07-31"]);
  assert.equal(GetOperationalNotesResponse.parse(await (await request(range + "&scope=general")).json()).length, 2);
  assert.equal(GetOperationalNotesResponse.parse(await (await request(range + "&scope=lift&liftId=1")).json()).length, 1);
  assert.equal(GetOperationalNotesResponse.parse(await (await request(range + "&scope=lift&liftId=1&includeGeneral=true")).json()).length, 3);
  assert.equal(GetOperationalNotesResponse.parse(await (await request("?from=2029-07-01&to=2029-07-31")).json())[0].text, "Previous season");
});
test("user deletion and snapshot removal retain readable attribution; deletion is tenant-scoped", async () => {
  await db.delete(usersTable).where(eq(usersTable.id, userIds.admin));
  await db.delete(liftSnapshotsTable).where(eq(liftSnapshotsTable.tenantId, tenantId));
  const notes = GetOperationalNotesResponse.parse(await (await request(range, "GET", undefined, "operator")).json());
  const note = notes.find(n => n.id === noteId)!;
  assert.equal(note.authorName, "Diary admin"); assert.equal(note.liftName, "Historical lift");
  const [stored] = await db.select().from(operationalNotesTable).where(eq(operationalNotesTable.id, noteId));
  assert.equal(stored.authorId, null);
  assert.equal((await request(`/${noteId}`, "PUT", { ...input, liftId: 1 }, "operator")).status, 200);
  assert.equal((await request(`/${noteId}`, "DELETE", undefined, "operator")).status, 204);
  assert.equal((await request(`/${noteId}`, "DELETE", undefined, "operator")).status, 404);
  assert.equal((await request(range, "GET", undefined, "operator")).status, 200);
});
