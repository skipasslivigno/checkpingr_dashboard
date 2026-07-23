---
name: Multi-tenant auth architecture
description: How tenants, users, roles, and the sync API key work after the v0.2 multi-tenant rewrite.
---

## Schema
- `tenants(id uuid PK, name, slug unique, api_key unique, created_at)`
- `users(id uuid PK, tenant_id FK→tenants, email, password_hash, google_id, name, role enum, is_active, created_at)`
- `lift_snapshots` now has `tenant_id uuid FK→tenants` (nullable for backward compat with old rows); unique index is `(tenant_id, dupd, ggnr)`

## Auth flow
- `POST /api/auth/login` — email + bcrypt password → JWT `{userId, tenantId, role, email, name}` (30d expiry)
- `requireAuth` middleware decodes JWT and attaches `req.user` on every non-public route
- Public routes: `/auth/login`, `/lifts/sync`, `/healthz`, `/setup/init`

## Roles
- `admin` — can manage users (`GET/POST/PATCH/DELETE /api/users`), sees all data
- `operator` — reads all data, triggers sync
- `viewer` — read-only
- `requireRole(...roles)` middleware in `middleware/requireAuth.ts`

## Sync endpoint
- `POST /api/lifts/sync` — **no longer uses `SYNC_API_KEY` env var**; looks up tenant by `X-Api-Key` header against `tenants.api_key` column
- Returns per-tenant API key at setup time only

## First-run setup
- `POST /api/setup/init` — one-time, only works when `tenants` table is empty
- Creates tenant + admin user, returns `{tenant: {apiKey}, admin}`
- **Why:** avoids seeding credentials in env vars; apiKey must be saved by operator at setup time

## Mobile
- `AuthContext` stores `AuthUser {id, email, name, role, tenantId}` in AsyncStorage
- Login screen uses `email` field (not username)
- Info tab shows user profile card (name, email, role badge) + logout button
