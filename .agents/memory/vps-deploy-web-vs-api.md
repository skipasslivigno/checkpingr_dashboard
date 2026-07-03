---
name: VPS deploy - web build vs API deploy are separate
description: Ski Area Dashboard VPS deploy has two independent halves (PM2 API reload vs static web export+rsync); redeploying one does not redeploy the other, and this caused a real incident.
---

On the skiarea-dashboard VPS (Hostinger, nginx + PM2 + Traefik), the API server
(PM2 process) and the static Expo web build (served by nginx from
`/var/www/skiarea/dist`) are deployed through completely separate steps:
`pm2 reload`/`startOrReload` only touches the API; the web frontend requires a
separate `expo export --platform web` + rsync to `/var/www/skiarea/dist/`.

**Why:** A real production incident happened where the API was fixed and
verified working (curl login/healthz returned 200), but the live site still
looked broken to users ("responds but doesn't extract data and doesn't
login"). Root cause: the static web build in `/var/www/skiarea/dist` had not
been rebuilt in over a month, so the browser was running stale JS that
predated login/auth fixes — even though the backend was fully up to date.
Curl-testing the API alone gave false confidence that the deploy was
complete.

**How to apply:** Whenever investigating a "prod is broken" report for this
app, check freshness of BOTH halves independently:
- API: `pm2 list` / `pm2 logs api-server`, and confirm the running dist
  matches the latest build.
- Web: `stat /var/www/skiarea/dist/index.html` (or diff the `entry-*.js`
  hash against a fresh `expo export`) to confirm the static build isn't
  stale, since nginx will happily keep serving old files with zero errors.
Don't conclude "deploy is fine" from API health checks alone.
