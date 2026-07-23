#!/usr/bin/env bash
# =============================================================================
# Ski Area Dashboard — Script di aggiornamento
# =============================================================================
# Aggiorna l'installazione esistente all'ultima versione rilasciata.
# Da eseguire sul server del cliente quando disponibile un aggiornamento.
#
# Uso:
#   sudo /opt/skiarea/scripts/update.sh
# =============================================================================
set -euo pipefail

CYN='\033[1;36m'; GRN='\033[0;32m'; YLW='\033[1;33m'; RED='\033[0;31m'; RST='\033[0m'
log()  { printf "\n${CYN}==> %s${RST}\n" "$1"; }
ok()   { printf "${GRN}    ✓ %s${RST}\n" "$1"; }
warn() { printf "${YLW}    ⚠ %s${RST}\n" "$1"; }
die()  { printf "${RED}    ✗ %s${RST}\n" "$1"; exit 1; }

REPO_DIR="${REPO_DIR:-/opt/skiarea}"
WEB_ROOT="${WEB_ROOT:-/var/www/skiarea}"
ENV_FILE="${ENV_FILE:-$REPO_DIR/.env.production}"
ECOSYSTEM="$REPO_DIR/ecosystem.config.cjs"

[[ ! -f "$ENV_FILE" ]] && die "File $ENV_FILE non trovato. Eseguire prima install-client.sh."
[[ ! -d "$REPO_DIR/.git" ]] && die "Repository non trovato in $REPO_DIR."

set -a; source "$ENV_FILE"; set +a
DOMAIN="${EXPO_PUBLIC_DOMAIN:-$(hostname -f)}"

# ── ricava il dominio dal config nginx se non è in .env ───────────────────────
if [[ -z "${EXPO_PUBLIC_DOMAIN:-}" ]]; then
  DOMAIN=$(grep -oP '(?<=server_name )[^;]+' /etc/nginx/sites-available/skiarea 2>/dev/null | head -1 || hostname -f)
fi

log "Aggiornamento Ski Area Dashboard"
echo "  Repo:    $REPO_DIR"
echo "  Dominio: $DOMAIN"

# ── pull ──────────────────────────────────────────────────────────────────────
log "Download aggiornamenti"
cd "$REPO_DIR"
BEFORE=$(git rev-parse --short HEAD)
git fetch origin
git reset --hard "origin/$(git rev-parse --abbrev-ref HEAD)"
AFTER=$(git rev-parse --short HEAD)

if [[ "$BEFORE" == "$AFTER" ]]; then
  ok "Già all'ultima versione ($AFTER) — nessuna modifica"
else
  ok "Aggiornato: $BEFORE → $AFTER"
fi

# ── dipendenze ────────────────────────────────────────────────────────────────
log "Aggiornamento dipendenze"
pnpm install --frozen-lockfile --ignore-scripts

# ── schema DB (no-op se invariato) ───────────────────────────────────────────
log "Allineamento schema database"
pnpm --filter @workspace/db run push <<<y || warn "db push fallito — verifica manualmente"

# ── build API ─────────────────────────────────────────────────────────────────
log "Build API server"
pnpm --filter @workspace/api-server run build

# ── riavvio API ───────────────────────────────────────────────────────────────
log "Riavvio API server"
pm2 startOrReload "$ECOSYSTEM"
pm2 save
ok "API server riavviato"

# ── build web app ─────────────────────────────────────────────────────────────
log "Build app web"
cd "$REPO_DIR/artifacts/skiarea-dashboard"
EXPO_PUBLIC_DOMAIN="$DOMAIN" pnpm exec expo export --clear --platform web
rsync -a --delete "$REPO_DIR/artifacts/skiarea-dashboard/dist/" "$WEB_ROOT/dist/"
ok "App web aggiornata"

# ── verifica salute API ───────────────────────────────────────────────────────
log "Verifica API"
sleep 3
curl -sf "http://localhost:5000/api/healthz" && ok "API healthy" || warn "Health check fallito — controlla: pm2 logs api-server"

echo ""
echo "  ✓ Aggiornamento completato ($(date '+%Y-%m-%d %H:%M'))"
echo "    Versione: $AFTER"
echo ""
