import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import express from "express";
import bcrypt from "bcryptjs";
import { eq, inArray } from "drizzle-orm";
import { accessLogsTable, db, pool, tenantsTable, usersTable } from "@workspace/db";
import { GetAccessLogsResponse } from "@workspace/api-zod";
import { requireAuth } from "../middleware/requireAuth";
import authRouter from "./auth";
import accessRouter from "./access-logs";
import usersRouter from "./users";

const tenantId = randomUUID(), otherTenantId = randomUUID();
const unknownEmail = `unknown-${randomUUID()}@example.invalid`;
const password = randomUUID();
const ids = { admin: randomUUID(), viewer: randomUUID(), other: randomUUID(), inactive: randomUUID(), forced: randomUUID() };
const emails = Object.fromEntries(Object.entries(ids).map(([key, id]) => [key, `${id}@example.invalid`]));
let base = "", server: Server | undefined, adminToken = "", viewerToken = "", otherToken = "", forcedToken = "";
const app = express();

async function login(email: string, pass: string = password, agent = "Audit test browser", headers: Record<string, string> = {}) {
  return fetch(`${base}/auth/login`, {
    method: "POST", headers: { "content-type": "application/json", "user-agent": agent, ...headers },
    body: JSON.stringify({ email, password: pass }),
  });
}
async function list(query = "", token = adminToken) {
  return fetch(`${base}/access-logs${query}`, { headers: { authorization: `Bearer ${token}` } });
}
before(async () => {
  assert.equal(process.env.NODE_ENV, "test");
  assert.ok(process.env.SESSION_SECRET, "Test server requires SESSION_SECRET");
  await db.insert(tenantsTable).values([tenantId, otherTenantId].map(id => ({
    id, name: "Temporary access log test", slug: `audit-${id}`, apiKey: randomUUID(),
  })));
  const passwordHash = await bcrypt.hash(password, 4);
  await db.insert(usersTable).values(Object.entries(ids).map(([key, id]) => ({
    id, tenantId: key === "other" ? otherTenantId : tenantId,
    email: emails[key], name: key === "admin" ? "Audit %_ literal" : `Audit ${key}`,
    role: key === "viewer" ? "viewer" as const : "admin" as const,
    isActive: key !== "inactive", mustChangePassword: key === "forced", passwordHash,
  })));
  app.set("trust proxy", "loopback");
  app.use(express.json());
  app.use(requireAuth, authRouter, accessRouter, usersRouter);
  server = createServer(app);
  await new Promise<void>(resolve => server!.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  base = `http://127.0.0.1:${address.port}`;
  for (const key of ["admin", "viewer", "other", "forced"]) {
    const r = await login(emails[key]); assert.equal(r.status, 200);
    const { token } = await r.json() as { token: string };
    if (key === "admin") adminToken = token;
    if (key === "viewer") viewerToken = token;
    if (key === "other") otherToken = token;
    if (key === "forced") forcedToken = token;
  }
});
after(async () => {
  if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
  try {
    await db.delete(accessLogsTable).where(eq(accessLogsTable.email, unknownEmail));
    await db.delete(tenantsTable).where(inArray(tenantsTable.id, [tenantId, otherTenantId]));
  } finally { await pool.end(); }
});
test("successful login is persisted before issuing a session, without secrets", async () => {
  const r = await list(); assert.equal(r.status, 200);
  assert.equal(r.headers.get("cache-control"), "no-store");
  const data = GetAccessLogsResponse.parse(await r.json());
  assert.equal(data.total, 3);
  const entry = data.items.find(item => item.email === emails.admin)!;
  assert.equal(entry.success, true); assert.equal(entry.reason, "success");
  assert.equal(entry.userAgent, "Audit test browser");
  assert.equal(entry.ipAddress, "127.0.0.1");
  assert.equal(entry.userId, ids.admin); assert.ok(entry.createdAt);
  assert.deepEqual(Object.keys(entry).sort(), ["createdAt", "email", "id", "ipAddress", "name", "reason", "success", "userAgent", "userId"]);
  assert.ok(!JSON.stringify(data).includes(password));
  assert.ok(!JSON.stringify(data).includes(adminToken));
});
test("invalid credentials, inactive and unknown accounts keep generic login errors and record failures", async () => {
  for (const [email, pass] of [[emails.admin, "wrong"], [emails.inactive, password], [unknownEmail, "wrong"]]) {
    const r = await login(email, pass, "x".repeat(800));
    assert.equal(r.status, 401);
    assert.deepEqual(await r.json(), { error: "Invalid credentials" });
  }
  const data = GetAccessLogsResponse.parse(await (await list("?outcome=failure")).json());
  assert.equal(data.total, 2);
  assert.ok(data.items.every(item => !item.success && item.userAgent.length === 512));
  assert.equal(data.items.find(item => item.email === emails.inactive)!.reason, "account_inactive");
  const [unknown] = await db.select().from(accessLogsTable).where(eq(accessLogsTable.email, unknownEmail));
  assert.equal(unknown.tenantId, null); assert.equal(unknown.userId, null);
  assert.equal(unknown.reason, "invalid_credentials");
});
test("admins are tenant-isolated; viewers, forced-password sessions and anonymous requests cannot read logs", async () => {
  assert.equal((await list("", "")).status, 401);
  assert.equal((await list("", viewerToken)).status, 403);
  assert.equal((await list("", forcedToken)).status, 403);
  const other = GetAccessLogsResponse.parse(await (await list("", otherToken)).json());
  assert.equal(other.total, 1); assert.equal(other.items[0].email, emails.other);
  const ours = GetAccessLogsResponse.parse(await (await list()).json());
  assert.ok(ours.items.every(item => item.email !== emails.other && item.email !== unknownEmail));
});
test("users list reports only successful logins for each account in the current tenant", async () => {
  const users = (token: string) => fetch(`${base}/users`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal((await users(viewerToken)).status, 403);
  const result = await users(adminToken);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("cache-control"), "no-store");
  const rows = await result.json() as Array<{ id: string; hasLoggedIn: boolean; credentialsSentAt: string | null }>;
  assert.equal(rows.find(row => row.id === ids.viewer)?.hasLoggedIn, true);
  assert.equal(rows.find(row => row.id === ids.viewer)?.credentialsSentAt, null);
  assert.equal(rows.find(row => row.id === ids.inactive)?.hasLoggedIn, false);
  assert.ok(!rows.some(row => row.id === ids.other));
  const otherRows = await (await users(otherToken)).json() as typeof rows;
  assert.deepEqual(otherRows.map(row => [row.id, row.hasLoggedIn]), [[ids.other, true]]);
});
test("filters validate input and match literal search characters", async () => {
  for (const query of ["?page=0", "?page=1.5", "?page=100001", "?outcome=invalid", `?search=${"a".repeat(255)}`]) {
    assert.equal((await list(query)).status, 400, query);
  }
  const data = GetAccessLogsResponse.parse(await (await list("?search=%25_&outcome=success")).json());
  assert.equal(data.total, 1); assert.equal(data.items[0].email, emails.admin);
  const empty = GetAccessLogsResponse.parse(await (await list("?search=doesnotexist")).json());
  assert.equal(empty.total, 0); assert.deepEqual(empty.items, []);
});
test("audit storage failure is explicit and never issues an unaudited session", async () => {
  const originalInsert = db.insert;
  db.insert = (() => { throw new Error("Simulated audit storage failure"); }) as typeof db.insert;
  try {
    for (const pass of [password, "wrong"]) {
      const r = await login(emails.admin, pass);
      assert.equal(r.status, 503);
      assert.deepEqual(await r.json(), { error: "Login temporarily unavailable" });
    }
  } finally { db.insert = originalInsert; }
});
test("stable pagination is newest-first and retains events after deleting a user", async () => {
  const date = new Date("2020-01-01T12:00:00Z");
  await db.insert(accessLogsTable).values(Array.from({ length: 53 }, (_, i) => ({
    tenantId, userId: ids.viewer, email: emails.viewer, name: "Pagination test",
    success: true, reason: "success", userAgent: `page-${i}`, createdAt: date,
  })));
  const first = GetAccessLogsResponse.parse(await (await list()).json());
  const second = GetAccessLogsResponse.parse(await (await list("?page=2")).json());
  assert.equal(first.pageSize, 50); assert.equal(first.items.length, 50);
  assert.equal(first.total, 58); assert.equal(second.items.length, 8);
  assert.equal(new Set([...first.items, ...second.items].map(item => item.id)).size, 58);
  assert.ok(new Date(first.items[0].createdAt) >= new Date(first.items.at(-1)!.createdAt));
  await db.delete(usersTable).where(eq(usersTable.id, ids.viewer));
  const history = GetAccessLogsResponse.parse(await (await list(`?search=${emails.viewer}`)).json());
  assert.equal(history.total, 54);
  assert.ok(history.items.every(item => item.userId === null && item.email === emails.viewer));
});
test("records IPv4 and IPv6 through a trusted proxy without accepting spoofed leftmost addresses", async () => {
  const cases = [
    { forwarded: "203.0.113.99, 198.51.100.42", expected: "198.51.100.42", pass: password },
    { forwarded: "2001:db8::42", expected: "2001:db8::42", pass: "wrong" },
    { forwarded: "::ffff:192.0.2.24", expected: "192.0.2.24", pass: password },
    { forwarded: "not-an-ip", expected: null, pass: password },
  ];
  for (const [i, c] of cases.entries()) {
    const agent = `IP test ${i}`;
    const r = await login(emails.admin, c.pass, agent, {
      "x-forwarded-for": c.forwarded, "x-real-ip": "203.0.113.123",
    });
    assert.equal(r.status, c.pass === password ? 200 : 401);
    const data = GetAccessLogsResponse.parse(await (await list()).json());
    assert.equal(data.items.find(item => item.userAgent === agent)!.ipAddress, c.expected);
  }
});
test("ignores forwarded headers when the immediate peer is not trusted", async () => {
  // Same real HTTP connection, but its peer is now explicitly outside the trust policy.
  app.set("trust proxy", false);
  try {
    const r = await login(emails.admin, password, "Untrusted peer test", {
      "x-forwarded-for": "198.51.100.99", "x-real-ip": "203.0.113.123",
    });
    assert.equal(r.status, 200);
    const data = GetAccessLogsResponse.parse(await (await list()).json());
    assert.equal(data.items.find(item => item.userAgent === "Untrusted peer test")!.ipAddress, "127.0.0.1");
  } finally { app.set("trust proxy", "loopback"); }
});
