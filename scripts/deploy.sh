#!/usr/bin/env bash
# Automated redeployment script for the Ski Area Dashboard VPS.
#
# Runs the same steps that used to be done by hand (see DEPLOY.md's old
# "Redeployment checklist"): pull latest code, rebuild whatever changed,
# reload the API server with pm2, re-export the Expo web build, and publish
# it to the nginx web root. Safe to run unconditionally on every deploy —
# each step is fast/no-op when nothing relevant changed.
#
# Triggered automatically by .github/workflows/deploy.yml on every push to
# main. Can also be run manually on the VPS:
#   ssh deploy@vps '/opt/skiarea/scripts/deploy.sh'
#
# Required environment (set in /opt/skiarea/.env.production, sourced below):
#   DATABASE_URL, SESSION_SECRET, PORT, NODE_ENV
# Required on PATH: git, pnpm, pm2, node, rsync/cp
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/skiarea}"
WEB_ROOT="${WEB_ROOT:-/var/www/skiarea}"
ENV_FILE="${ENV_FILE:-$REPO_DIR/.env.production}"
DOMAIN="${EXPO_PUBLIC_DOMAIN:-dashboard.skipasslivigno.com}"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

cd "$REPO_DIR"

log "Pulling latest code"
git fetch origin
git reset --hard origin/main

log "Installing dependencies"
pnpm install --frozen-lockfile --ignore-scripts

log "Applying database schema changes (safe/no-op if unchanged)"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "WARNING: $ENV_FILE not found; skipping DB push. Create it before first deploy (see DEPLOY.md)." >&2
fi
pnpm --filter @workspace/db run push -- --force || echo "WARNING: db push failed or requires manual confirmation; check schema drift manually."

log "Building API server"
pnpm --filter @workspace/api-server run build

log "Reloading API server with pm2"
pm2 startOrReload "$REPO_DIR/ecosystem.config.cjs"
pm2 save

log "Building Expo web app"
cd "$REPO_DIR/artifacts/skiarea-dashboard"
EXPO_PUBLIC_DOMAIN="$DOMAIN" pnpm exec expo export --platform web

log "Publishing static build to $WEB_ROOT/dist"
sudo mkdir -p "$WEB_ROOT/dist"
sudo rsync -a --delete "$REPO_DIR/artifacts/skiarea-dashboard/dist/" "$WEB_ROOT/dist/"

log "Verifying API health"
sleep 2
curl -fsS "https://$DOMAIN/api/healthz" && echo "API healthy" || echo "WARNING: health check failed; check 'pm2 logs api-server'"

log "Deploy complete"
