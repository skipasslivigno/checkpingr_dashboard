#!/usr/bin/env bash
# =============================================================================
# Ski Area Dashboard — Client Self-Hosted Installer
# =============================================================================
# Installs the full stack (API + web app + PostgreSQL + nginx + SSL) on a
# fresh Ubuntu 22.04 / 24.04 server.
#
# Usage:
#   chmod +x install-client.sh
#   sudo ./install-client.sh
#
# What it does:
#   1. Installs Node.js 24, pnpm, pm2, PostgreSQL, nginx, certbot
#   2. Clones (or copies) the codebase to /opt/skiarea
#   3. Creates the .env.production file
#   4. Runs the DB schema migration
#   5. Builds the API server
#   6. Builds the Expo web app
#   7. Configures nginx + HTTPS (Let's Encrypt)
#   8. Starts everything with PM2
#   9. Creates the first tenant + admin via /api/setup/init
# =============================================================================
set -euo pipefail

# ── colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GRN='\033[0;32m'; YLW='\033[1;33m'; CYN='\033[1;36m'; RST='\033[0m'
log()  { printf "\n${CYN}==> %s${RST}\n" "$1"; }
ok()   { printf "${GRN}    ✓ %s${RST}\n" "$1"; }
warn() { printf "${YLW}    ⚠ %s${RST}\n" "$1"; }
die()  { printf "${RED}    ✗ %s${RST}\n" "$1"; exit 1; }
ask()  { printf "${YLW}  ? %s: ${RST}" "$1"; }

# ── root check ───────────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  die "Run this script with sudo: sudo ./install-client.sh"
fi

REPO_DIR="/opt/skiarea"
WEB_ROOT="/var/www/skiarea"
ENV_FILE="$REPO_DIR/.env.production"
ECOSYSTEM="$REPO_DIR/ecosystem.config.cjs"

# =============================================================================
echo ""
echo "  ┌─────────────────────────────────────────────────┐"
echo "  │   Ski Area Dashboard — Installer                │"
echo "  │   Questo script configura tutto automaticamente │"
echo "  └─────────────────────────────────────────────────┘"
echo ""

# ── gather inputs ─────────────────────────────────────────────────────────────
log "Configurazione iniziale"

ask "Dominio del dashboard (es. dashboard.miaskiarea.it)"; read -r DOMAIN
ask "URL del repository Git"; read -r REPO_URL
ask "Ramo Git (default: main)"; read -r GIT_BRANCH; GIT_BRANCH="${GIT_BRANCH:-main}"
ask "Nome del database PostgreSQL (default: skiarea)"; read -r DB_NAME; DB_NAME="${DB_NAME:-skiarea}"
ask "Utente PostgreSQL (default: skiarea)"; read -r DB_USER; DB_USER="${DB_USER:-skiarea}"

echo ""
ask "Password per il database"; read -rs DB_PASS; echo ""
[[ ${#DB_PASS} -lt 8 ]] && die "La password del DB deve essere di almeno 8 caratteri."

echo ""
echo "  -- Credenziali admin dell'app (primo accesso) --"
ask "Nome admin"; read -r ADMIN_NAME
ask "Email admin"; read -r ADMIN_EMAIL
ask "Password admin (min 8 caratteri)"; read -rs ADMIN_PASS; echo ""
[[ ${#ADMIN_PASS} -lt 8 ]] && die "La password admin deve essere di almeno 8 caratteri."
ask "Nome della ski area (es. Ski Area Bormio)"; read -r TENANT_NAME
ask "Slug identificativo (es. bormio, solo lettere/numeri/trattini)"; read -r TENANT_SLUG
[[ ! $TENANT_SLUG =~ ^[a-z0-9-]+$ ]] && die "Lo slug deve essere lowercase con trattini (es. ski-area-bormio)."

SESSION_SECRET=$(openssl rand -hex 32)

echo ""
echo "  ┌─ Riepilogo configurazione ───────────────────────"
echo "  │  Dominio:    $DOMAIN"
echo "  │  Repo:       $REPO_URL  (branch: $GIT_BRANCH)"
echo "  │  Database:   $DB_NAME  (utente: $DB_USER)"
echo "  │  Admin:      $ADMIN_EMAIL  ($ADMIN_NAME)"
echo "  │  Tenant:     $TENANT_NAME  [$TENANT_SLUG]"
echo "  └───────────────────────────────────────────────────"
echo ""
ask "Confermi? (y/n)"; read -r CONFIRM
[[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]] && die "Installazione annullata."

# =============================================================================
log "Aggiornamento pacchetti di sistema"
apt-get update -qq
apt-get install -y -qq curl git nginx certbot python3-certbot-nginx jq

# ── Node.js 24 ────────────────────────────────────────────────────────────────
log "Installazione Node.js 24"
if ! command -v node &>/dev/null || [[ $(node -e "process.exit(parseInt(process.version.slice(1)) >= 24 ? 0 : 1)" ; echo $?) -ne 0 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash - >/dev/null 2>&1
  apt-get install -y -qq nodejs
fi
ok "Node.js $(node --version)"

# ── pnpm + pm2 ────────────────────────────────────────────────────────────────
log "Installazione pnpm e pm2"
npm install -g pnpm pm2 --quiet
ok "pnpm $(pnpm --version)  /  pm2 $(pm2 --version)"

# ── PostgreSQL ────────────────────────────────────────────────────────────────
log "Installazione PostgreSQL"
apt-get install -y -qq postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
ok "PostgreSQL avviato"

log "Creazione database e utente"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE USER "$DB_USER" WITH PASSWORD '$DB_PASS';
  END IF;
END
\$\$;
CREATE DATABASE "$DB_NAME" OWNER "$DB_USER" ENCODING 'UTF8';
GRANT ALL PRIVILEGES ON DATABASE "$DB_NAME" TO "$DB_USER";
SQL
ok "Database '$DB_NAME' pronto"

DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"

# ── repo ─────────────────────────────────────────────────────────────────────
log "Download del codice sorgente"
if [[ -d "$REPO_DIR/.git" ]]; then
  warn "Cartella $REPO_DIR già esistente — aggiornamento dal repository"
  cd "$REPO_DIR"
  git fetch origin
  git reset --hard "origin/$GIT_BRANCH"
else
  git clone --branch "$GIT_BRANCH" "$REPO_URL" "$REPO_DIR"
fi
ok "Codice in $REPO_DIR"

# ── .env.production ───────────────────────────────────────────────────────────
log "Creazione file di configurazione"
cat > "$ENV_FILE" <<ENV
DATABASE_URL=${DATABASE_URL}
SESSION_SECRET=${SESSION_SECRET}
PORT=5000
NODE_ENV=production
ENV
chmod 600 "$ENV_FILE"
ok "$ENV_FILE creato"

# ── dipendenze ────────────────────────────────────────────────────────────────
log "Installazione dipendenze npm"
cd "$REPO_DIR"
pnpm install --frozen-lockfile --ignore-scripts

# ── schema DB ─────────────────────────────────────────────────────────────────
log "Migrazione schema del database"
set -a; source "$ENV_FILE"; set +a
pnpm --filter @workspace/db run push <<<y
ok "Tabelle create"

# ── build API ─────────────────────────────────────────────────────────────────
log "Build del server API"
pnpm --filter @workspace/api-server run build
ok "API compilata"

# ── PM2 ecosystem ─────────────────────────────────────────────────────────────
log "Configurazione PM2"
cat > "$ECOSYSTEM" <<CJS
module.exports = {
  apps: [{
    name: "api-server",
    script: "artifacts/api-server/dist/index.mjs",
    cwd: "$REPO_DIR",
    env_file: "$ENV_FILE",
    instances: 1,
    exec_mode: "fork",
    max_memory_restart: "300M",
    out_file: "/var/log/skiarea/api-out.log",
    error_file: "/var/log/skiarea/api-err.log",
  }]
};
CJS
mkdir -p /var/log/skiarea
pm2 startOrReload "$ECOSYSTEM"
pm2 save
pm2 startup systemd -u "$SUDO_USER" --hp "/home/$SUDO_USER" | tail -1 | bash || true
ok "API server avviato"

# ── wait for API ──────────────────────────────────────────────────────────────
log "Attesa avvio API..."
for i in $(seq 1 15); do
  sleep 2
  if curl -sf "http://localhost:5000/api/healthz" &>/dev/null; then
    ok "API risponde su :5000"
    break
  fi
  [[ $i -eq 15 ]] && die "API non risponde dopo 30s — controlla: pm2 logs api-server"
done

# ── build web app ─────────────────────────────────────────────────────────────
log "Build dell'app web (Expo)"
cd "$REPO_DIR/artifacts/skiarea-dashboard"
EXPO_PUBLIC_DOMAIN="$DOMAIN" pnpm exec expo export --clear --platform web
mkdir -p "$WEB_ROOT"
rsync -a --delete "$REPO_DIR/artifacts/skiarea-dashboard/dist/" "$WEB_ROOT/dist/"
ok "App web pubblicata in $WEB_ROOT/dist"

# ── nginx ─────────────────────────────────────────────────────────────────────
log "Configurazione nginx"
NGINX_CONF="/etc/nginx/sites-available/skiarea"
cat > "$NGINX_CONF" <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    root ${WEB_ROOT}/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass         http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
NGINX
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/skiarea
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
ok "nginx configurato per $DOMAIN"

# ── SSL ───────────────────────────────────────────────────────────────────────
log "Certificato HTTPS (Let's Encrypt)"
warn "Assicurati che il DNS $DOMAIN punti a questo server prima di continuare."
ask "Procedere con Let's Encrypt? (y/n)"; read -r DO_SSL
if [[ "$DO_SSL" == "y" || "$DO_SSL" == "Y" ]]; then
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@${DOMAIN#*.}" || \
    warn "certbot fallito — configura SSL manualmente"
  ok "HTTPS attivo su $DOMAIN"
else
  warn "SSL saltato — il dashboard è accessibile solo via HTTP per ora"
fi

# ── primo tenant + admin ──────────────────────────────────────────────────────
log "Creazione tenant e utente admin"
PROTO="https"; [[ "$DO_SSL" != "y" && "$DO_SSL" != "Y" ]] && PROTO="http"

INIT_RESP=$(curl -sf -X POST "${PROTO}://${DOMAIN}/api/setup/init" \
  -H "Content-Type: application/json" \
  -d "{
    \"tenantName\":   \"$TENANT_NAME\",
    \"tenantSlug\":   \"$TENANT_SLUG\",
    \"adminEmail\":   \"$ADMIN_EMAIL\",
    \"adminName\":    \"$ADMIN_NAME\",
    \"adminPassword\":\"$ADMIN_PASS\"
  }") || { warn "setup/init non raggiungibile via $PROTO — chiama l'endpoint manualmente (vedi SETUP_KEYS.txt)"; INIT_RESP="{}"; }

API_KEY=$(echo "$INIT_RESP" | jq -r '.tenant.apiKey // empty' 2>/dev/null || true)

# ── salva riepilogo ───────────────────────────────────────────────────────────
KEYS_FILE="$REPO_DIR/SETUP_KEYS.txt"
cat > "$KEYS_FILE" <<KEYS
Ski Area Dashboard — Chiavi di configurazione
Generato il: $(date)

Dashboard URL:  ${PROTO}://${DOMAIN}
Admin email:    ${ADMIN_EMAIL}

API Key (X-Api-Key per lo script MSSQL):
  ${API_KEY:-"<chiama manualmente POST /api/setup/init — vedi CLIENT_SETUP.md>"}

Database:
  URL: ${DATABASE_URL}

Session secret (non condividere):
  ${SESSION_SECRET}

Percorsi importanti:
  Codice:        ${REPO_DIR}
  Web app:       ${WEB_ROOT}/dist
  Config:        ${ENV_FILE}
  Log API:       pm2 logs api-server
KEYS
chmod 600 "$KEYS_FILE"

# =============================================================================
echo ""
echo "  ┌─────────────────────────────────────────────────────────┐"
echo "  │   ✓  Installazione completata!                          │"
echo "  └─────────────────────────────────────────────────────────┘"
echo ""
ok "Dashboard:    ${PROTO}://${DOMAIN}"
ok "Admin email:  ${ADMIN_EMAIL}"
[[ -n "${API_KEY:-}" ]] && ok "API Key:      ${API_KEY}"
echo ""
echo "  Le chiavi sono salvate in: $KEYS_FILE"
echo "  Configurare lo script MSSQL con l'API Key qui sopra."
echo ""
echo "  Comandi utili:"
echo "    pm2 status           — stato dei processi"
echo "    pm2 logs api-server  — log in tempo reale"
echo "    $REPO_DIR/scripts/update.sh  — aggiornamento a nuova versione"
echo ""
