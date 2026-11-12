import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import express from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, pool, tenantsTable, usersTable, emailSettingsTable } from "@workspace/db";
import authRouter from "./auth";
import { requireAuth } from "../middleware/requireAuth";
import { createEmailRouter } from "./email";
import {
  DEFAULT_EMAIL_BODY, DEFAULT_EMAIL_SUBJECT, EmailError, encryptAppPassword,
  decryptAppPassword, renderEmail, validateTemplate, type GmailMessage,
} from "../lib/email";

// Integration tests use isolated tenants and a fake SMTP dependency. No external
// SMTP connections are made and no real accounts/passwords are modified.
let server: Server;
let base: string;
let tenantId: string;
let otherTenantId: string;
let adminId: string;
let otherAdminId: string;
let viewerId: string;
let inactiveId: string;
let foreignId: string;
let adminToken: string;
let otherToken: string;
let viewerToken: string;
const suffix = randomBytes(6).toString("hex");
const initialPassword = randomBytes(20).toString("base64url");
const fakeAppPassword = "abcdefghijklmnop";
let messages: GmailMessage[] = [];
let rejectSmtp = false;

interface TestPayload {
  token: string;
  user: { mustChangePassword: boolean };
  mustChangePassword: boolean;
  configured: boolean;
  hasPassword: boolean;
  senderEmail: string;
  recipient: string;
  text: string;
  html: string;
}
async function request(path: string, token: string, method = "GET", body?: unknown) {
  const response = await fetch(base + path, {
    method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  // Each test asserts the HTTP status before consuming the operation's fields.
  const data = (response.status === 204 ? {} : await response.json()) as TestPayload;
  return { status: response.status, data };
}
async function login(email: string, password = initialPassword) {
  return request("/auth/login", "", "POST", { email, password });
}
const configInput = {
  senderName: "Test administrator", appPassword: fakeAppPassword,
  loginUrl: "https://example.com/login", subject: DEFAULT_EMAIL_SUBJECT, body: DEFAULT_EMAIL_BODY,
};
const adminEmail = `mail-admin-${suffix}@example.com`;
const viewerEmail = `mail-viewer-${suffix}@example.com`;
const otherEmail = `mail-other-${suffix}@example.com`;
const sendInput = { confirmReset: true, expectedEmail: viewerEmail };

before(async () => {
  assert.equal(process.env.NODE_ENV, "test", "Run only with NODE_ENV=test against development database");
  assert.ok(process.env.SESSION_SECRET);
  const hash = await bcrypt.hash(initialPassword, 12);
  [tenantId, otherTenantId] = (await db.insert(tenantsTable).values([
    { name: "Mail integration test", slug: `mail-test-${suffix}`, apiKey: randomUUID() },
    { name: "Other mail integration test", slug: `mail-other-${suffix}`, apiKey: randomUUID() },
  ]).returning({ id: tenantsTable.id })).map(t => t.id);
  const accounts = await db.insert(usersTable).values([
    { tenantId, email: adminEmail, name: "Sender Test", passwordHash: hash, role: "admin" },
    { tenantId, email: otherEmail, name: "Other Sender Test", passwordHash: hash, role: "admin" },
    { tenantId, email: viewerEmail, name: "<Recipient & Test>", passwordHash: hash, role: "viewer" },
    { tenantId, email: `inactive-${suffix}@example.com`, name: "Inactive", passwordHash: hash, role: "viewer", isActive: false },
    { tenantId: otherTenantId, email: `foreign-${suffix}@example.com`, name: "Foreign", passwordHash: hash, role: "admin" },
  ]).returning({ id: usersTable.id });
  [adminId, otherAdminId, viewerId, inactiveId, foreignId] = accounts.map(a => a.id);
  const app = express();
  app.use(express.json());
  app.use("/api", requireAuth, authRouter, createEmailRouter(async message => {
    if (rejectSmtp) throw new EmailError(502, "EMAIL_SEND_FAILED", "Test SMTP rejected");
    messages.push(message);
    return { messageId: `mock-${messages.length}` };
  }));
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  base = `http://127.0.0.1:${address.port}/api`;
  adminToken = (await login(adminEmail)).data.token;
  otherToken = (await login(otherEmail)).data.token;
  viewerToken = (await login(viewerEmail)).data.token;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  if (tenantId) await db.delete(tenantsTable).where(eq(tenantsTable.id, tenantId));
  if (otherTenantId) await db.delete(tenantsTable).where(eq(tenantsTable.id, otherTenantId));
  await pool.end();
  messages = [];
});

test("template escapes HTML, forbids unknown variables, subject secrets and missing login details", () => {
  const rendered = renderEmail(DEFAULT_EMAIL_SUBJECT, DEFAULT_EMAIL_BODY, {
    nome_app: "<script>alert(1)</script>", nome_organizzazione: "Test", nome_utente: "<Recipient>",
    email_utente: "user@example.com", password_temporanea: "example", url_accesso: "https://example.com",
    nome_amministratore: "Admin",
  });
  assert.ok(!rendered.html.includes("<script>"));
  assert.ok(rendered.html.includes("&lt;Recipient&gt;"));
  assert.throws(() => validateTemplate("{{password_temporanea}}", DEFAULT_EMAIL_BODY), EmailError);
  assert.throws(() => validateTemplate(DEFAULT_EMAIL_SUBJECT, "Missing credentials"), EmailError);
  assert.throws(() => validateTemplate("{{not_supported}}", DEFAULT_EMAIL_BODY), EmailError);
  const encrypted = encryptAppPassword(fakeAppPassword, "test-owner");
  assert.ok(!encrypted.includes(fakeAppPassword));
  assert.ok(decryptAppPassword(encrypted, "test-owner") === fakeAppPassword);
  assert.throws(() => decryptAppPassword(encrypted, "another-owner"), EmailError);
});

test("admin-only access; settings are personal and never expose saved credentials", async () => {
  assert.equal((await request("/email/settings", "")).status, 401);
  assert.equal((await request("/email/settings", viewerToken)).status, 403);
  assert.equal((await request("/email/settings", adminToken)).data.configured, false);
  assert.equal((await request("/email/settings", adminToken, "PUT", { ...configInput, appPassword: "" })).status, 400);
  assert.equal((await request("/email/settings", adminToken, "PUT", { ...configInput, loginUrl: "http://example.com" })).status, 400);
  assert.equal((await request("/email/settings", adminToken, "PUT", { ...configInput, loginUrl: "not-a-url" })).status, 400);
  assert.equal((await request("/email/settings", adminToken, "PUT", { ...configInput, subject: "bad\r\nBcc:x@example.com" })).status, 400);
  const saved = await request("/email/settings", adminToken, "PUT", { ...configInput, senderEmail: "forged@example.com" });
  assert.equal(saved.status, 200);
  assert.equal(saved.data.senderEmail, adminEmail);
  assert.ok(saved.data.hasPassword && saved.data.configured);
  assert.ok(!JSON.stringify(saved.data).includes(fakeAppPassword));
  assert.ok(!("encryptedPassword" in saved.data));
  assert.equal((await request("/email/settings", otherToken)).data.configured, false);
  const [stored] = await db.select().from(emailSettingsTable).where(eq(emailSettingsTable.userId, adminId));
  assert.ok(stored.encryptedPassword !== fakeAppPassword);
  // An omitted or empty app password keeps the existing encrypted secret.
  assert.equal((await request("/email/settings", adminToken, "PUT", { ...configInput, appPassword: "", senderName: "Updated" })).status, 200);
  assert.equal(messages.length, 0);
});

test("preview substitutes tenant/user data safely and never changes accounts or sends mail", async () => {
  const preview = await request("/email/preview", adminToken, "POST", { ...configInput, userId: viewerId });
  assert.equal(preview.status, 200);
  assert.equal(preview.data.recipient, viewerEmail);
  assert.ok(preview.data.text.includes("[PASSWORD DI ESEMPIO"));
  assert.ok(preview.data.html.includes("&lt;Recipient &amp; Test&gt;"));
  assert.equal((await request("/email/preview", adminToken, "POST", { ...configInput, userId: foreignId })).status, 404);
  assert.equal(messages.length, 0);
  assert.equal((await login(viewerEmail)).status, 200);
});

test("test mail only goes to logged administrator; cooldown prevents repeated sends", async () => {
  const result = await request("/email/test", adminToken, "POST", { recipient: "ignored@example.com" });
  assert.equal(result.status, 200);
  assert.equal(result.data.recipient, adminEmail);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].recipient, adminEmail);
  assert.equal(messages[0].senderEmail, adminEmail);
  assert.equal((await request("/email/test", adminToken, "POST")).status, 429);
  assert.equal(messages.length, 1);
});

test("cannot reset without confirmation, send cross-tenant, send inactive or use another admin's Gmail", async () => {
  assert.equal((await request(`/users/${viewerId}/send-credentials`, viewerToken, "POST", sendInput)).status, 403);
  assert.equal((await request(`/users/${viewerId}/send-credentials`, otherToken, "POST", sendInput)).status, 400);
  assert.equal((await request(`/users/${viewerId}/send-credentials`, adminToken, "POST", { ...sendInput, confirmReset: false })).status, 400);
  assert.equal((await request(`/users/${foreignId}/send-credentials`, adminToken, "POST", sendInput)).status, 404);
  assert.equal((await request(`/users/${inactiveId}/send-credentials`, adminToken, "POST", sendInput)).status, 409);
  assert.equal((await request(`/users/${viewerId}/send-credentials`, adminToken, "POST", { ...sendInput, expectedEmail: "changed@example.com" })).status, 409);
  assert.equal(messages.length, 1);
});

test("SMTP failure preserves the old password, flag and session", async () => {
  rejectSmtp = true;
  try {
    assert.equal((await request(`/users/${viewerId}/send-credentials`, adminToken, "POST", sendInput)).status, 502);
    assert.equal((await login(viewerEmail)).status, 200);
    const state = await request("/auth/me", viewerToken);
    assert.equal(state.status, 200);
    assert.equal(state.data.mustChangePassword, false);
    const [account] = await db.select({ sentAt: usersTable.credentialsSentAt }).from(usersTable).where(eq(usersTable.id, viewerId));
    assert.equal(account.sentAt, null);
  } finally { rejectSmtp = false; }
});

test("confirmed send resets once, revokes old sessions and forces change; new password unlocks account", async () => {
  const [first, duplicate] = await Promise.all([
    request(`/users/${viewerId}/send-credentials`, adminToken, "POST", sendInput),
    request(`/users/${viewerId}/send-credentials`, adminToken, "POST", sendInput),
  ]);
  assert.deepEqual([first.status, duplicate.status].sort(), [200, 429]);
  assert.equal(messages.length, 2);
  const message = messages[1];
  assert.equal(message.senderEmail, adminEmail);
  assert.equal(message.recipient, viewerEmail);
  assert.equal((await login(viewerEmail)).status, 401);
  assert.equal((await request("/auth/me", viewerToken)).status, 401);
  const temporaryPassword = message.text.match(/Password temporanea: (.+)/)?.[1];
  assert.ok(temporaryPassword);
  const fresh = await login(viewerEmail, temporaryPassword);
  assert.equal(fresh.status, 200);
  assert.equal(fresh.data.user.mustChangePassword, true);
  assert.equal((await request("/email/settings", fresh.data.token)).status, 403);
  const changed = await request("/auth/change-password", fresh.data.token, "POST", {
    currentPassword: temporaryPassword, newPassword: randomBytes(20).toString("base64url"),
  });
  assert.equal(changed.status, 200);
  assert.equal(changed.data.user.mustChangePassword, false);
  const [account] = await db.select({ sentAt: usersTable.credentialsSentAt }).from(usersTable).where(eq(usersTable.id, viewerId));
  assert.ok(account.sentAt instanceof Date);
  assert.ok(!JSON.stringify(first.data).includes(temporaryPassword));
});

test("disconnect removes only the current administrator's Gmail settings", async () => {
  await request("/email/settings", otherToken, "PUT", configInput);
  assert.equal((await request("/email/settings", adminToken, "DELETE")).status, 204);
  assert.equal((await request("/email/settings", adminToken)).data.configured, false);
  assert.equal((await request("/email/settings", otherToken)).data.configured, true);
  assert.equal((await request("/email/test", adminToken, "POST")).status, 400);
});
