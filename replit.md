# Ski Area Dashboard

A mobile app (Expo) that shows a real-time dashboard of ski lift passages and guest counts for a ski area, with data pushed from an on-site MSSQL extraction script.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)
- Optional env: `SYNC_API_KEY` — if set, the POST /api/lifts/sync endpoint requires X-API-Key header

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo (React Native) with Expo Router
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- DB schema: `lib/db/src/schema/lift-snapshots.ts`
- API spec: `lib/api-spec/openapi.yaml`
- API routes: `artifacts/api-server/src/routes/lifts.ts`
- Mobile app: `artifacts/skiarea-dashboard/`
  - Screens: `app/(tabs)/index.tsx` (Dashboard), `app/(tabs)/lifts.tsx` (All Lifts), `app/(tabs)/info.tsx` (Integration guide)
  - Lift detail: `app/lift/[ggnr].tsx`
  - Components: `components/StatCard.tsx`, `components/LiftRow.tsx`, `components/SkeletonLoader.tsx`
  - Colors: `constants/colors.ts` (navy/ice blue ski theme)

## Architecture decisions

- Data flows from on-site MSSQL → extraction script → POST /api/lifts/sync → PostgreSQL → mobile app
- Snapshots are upserted by `idin` (original row ID) so re-pushing extraction data is safe
- `/api/lifts/latest` uses `SELECT DISTINCT ON (ggnr)` ordered by `dupd DESC` to get the most recent snapshot per lift
- The sync endpoint is optionally protected by `SYNC_API_KEY` env var (X-API-Key header)
- `/lifts/history` uses query param `?ggnr=` (not path param) to avoid Orval TS2308 collision between path params Zod schema and query params TypeScript type

## Product

- Dashboard tab: today's total passages, guests on lifts, active lifts, season, last sync time, top 5 lifts by passages
- Lifts tab: searchable list of all lifts with passage counts, sorted by `nsoc` (group number)
- Lift detail: current stats + all extraction snapshots for today
- Integration tab: step-by-step guide with copy buttons for the sync endpoint URL and example payloads

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm run typecheck:libs` after changing `lib/db/src/schema/` before typechecking api-server
- After OpenAPI spec changes: run codegen, then `typecheck:libs`, then test api-server typecheck
- expo-clipboard must stay at `~8.0.8` to match the Expo SDK version
- The `getLiftHistory` endpoint uses query params (not path params) to avoid Orval collision

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `DEPLOY.md` for production deployment to the VPS. Deploys to the VPS are automated: pushing to `main` triggers `.github/workflows/deploy.yml`, which SSHes in and runs `scripts/deploy.sh` (build, pm2 reload via `ecosystem.config.cjs`, Expo web export, nginx sync). Requires `VPS_HOST`/`VPS_USER`/`VPS_SSH_KEY` GitHub Actions secrets.
