# Deployment Guide — Hostinger VPS

Develop on Replit, then deploy to your VPS when ready.

## Architecture

```
Internet → nginx :443 (HTTPS)
              ├── /api/*  → proxy → Node.js :5000  (API server)
              └── /*      → static files            (Expo web build)

PostgreSQL :5432  (local on VPS)
```

---

## 1 — Prepare the VPS

```bash
# Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# pnpm + process manager
npm install -g pnpm pm2

# PostgreSQL
sudo apt install -y postgresql
sudo -u postgres createuser --superuser $USER
sudo -u postgres createdb skiarea
```

---

## 2 — Clone the repo and install dependencies

```bash
git clone https://github.com/skipasslivigno/checkpingr_dashboard.git /opt/skiarea
cd /opt/skiarea
pnpm install
```

---

## 3 — Environment variables

Create `/opt/skiarea/.env.production`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/skiarea
SESSION_SECRET=<random-64-char-hex>   # signs JWT tokens — generate with: openssl rand -hex 32
PORT=5000
NODE_ENV=production
```

> **Note:** `SYNC_API_KEY` is no longer used. The sync endpoint now authenticates
> via per-tenant API keys stored in the database (set up in step 4b below).

---

## 4 — Database migration (first deploy only)

```bash
source /opt/skiarea/.env.production
pnpm --filter @workspace/db run push   # risponde 'y' se chiede conferma
```

This creates all tables: `lift_snapshots`, `tenants`, `users`.

### 4b — First-run tenant + admin setup (one-time only)

After the API server is running (step 5), create the first tenant and admin user:

```bash
curl -s -X POST https://dashboard.skipasslivigno.com/api/setup/init \
  -H "Content-Type: application/json" \
  -d '{
    "tenantName":  "SKIPASSion Livigno",
    "tenantSlug":  "skipassion-livigno",
    "adminEmail":  "admin@skipassion.it",
    "adminName":   "Admin",
    "adminPassword": "YOUR_ADMIN_PASSWORD"
  }' | jq .
```

The response contains the tenant `apiKey` — copy it, you'll need it for the SQL Agent job (step 8).
This endpoint returns 409 if the tenant/user already exist, so it is safe to call again.

---

## 5 — Build the API server

```bash
cd /opt/skiarea
pnpm --filter @workspace/api-server run build
# output: artifacts/api-server/dist/index.mjs
```

Start with PM2:

```bash
pm2 start artifacts/api-server/dist/index.mjs \
  --name api-server \
  --env-file /opt/skiarea/.env.production
pm2 save
pm2 startup   # follow the printed command to enable on reboot
```

---

## 6 — Build the Expo web app

```bash
cd /opt/skiarea/artifacts/skiarea-dashboard
EXPO_PUBLIC_DOMAIN=yourdomain.com pnpm exec expo export --platform web
# output: dist/   (full path: /opt/skiarea/artifacts/skiarea-dashboard/dist)
```

Copy static files to the web root:

```bash
cd /opt/skiarea
sudo cp -r artifacts/skiarea-dashboard/dist /var/www/skiarea
```

---

## 7 — nginx configuration

Install nginx and obtain a TLS certificate:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Edit `/etc/nginx/sites-available/skiarea`:

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    # TLS managed by certbot — do not edit these lines manually
    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Expo web app (static)
    root /var/www/skiarea;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;   # SPA routing
    }

    # API reverse proxy
    location /api/ {
        proxy_pass         http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;            # allow time for large sync payloads
    }
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/skiarea /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 8 — Update the SQL Server Agent job

Change the sync URL and API key in the T-SQL script:

```sql
DECLARE @url     NVARCHAR(512) = N'https://dashboard.skipasslivigno.com/api/lifts/sync'
DECLARE @api_key NVARCHAR(128) = N'<apiKey from step 4b>'
```

The `X-Api-Key` header is **required** — the sync endpoint rejects requests without a valid tenant API key:

```sql
EXEC sp_OAMethod @http, 'setRequestHeader', NULL, 'X-Api-Key', @api_key
```

---

## Redeployment (subsequent updates)

### Workflow: Replit → GitHub → VPS (automatic)

Deployment to the VPS is now automated with GitHub Actions. Push to `main`
and the VPS updates itself within a minute or two — no manual SSH session
required.

```
Replit (push) → GitHub (main branch) → GitHub Actions → SSH → VPS runs scripts/deploy.sh
```

> **Important:** changes made on Replit are NOT automatically pushed to GitHub.
> You still need to push from Replit (or your local machine) to `main` — that
> push is what triggers the deploy.

`scripts/deploy.sh` runs on the VPS and performs every step that used to be
done by hand: pulls `main`, installs dependencies, applies DB schema changes,
rebuilds the API server, reloads it with pm2 (via `ecosystem.config.cjs`),
re-exports the Expo web build, and syncs it into the nginx web root. It is
safe to run on every push — steps are no-ops when nothing relevant changed.

### One-time setup

1. **On the VPS**, make sure the repo is cloned at `/opt/skiarea` (see steps
   1–4 above) and that `ecosystem.config.cjs` and `scripts/deploy.sh` exist
   there (they ship with the repo — just `git pull` once manually the first
   time). Generate a dedicated SSH keypair for CI and add the public key to
   `~/.ssh/authorized_keys` on the VPS:
   ```bash
   ssh-keygen -t ed25519 -f ./deploy_key -N "" -C "github-actions-deploy"
   # copy deploy_key.pub to the VPS user's ~/.ssh/authorized_keys
   ```
2. **In the GitHub repo settings** (Settings → Secrets and variables →
   Actions), add:
   - `VPS_HOST` — the VPS hostname or IP
   - `VPS_USER` — the SSH user (must be able to run `git`, `pnpm`, `pm2`,
     `sudo rsync` on `/opt/skiarea` and `/var/www/skiarea` without a password
     prompt)
   - `VPS_SSH_KEY` — the private half of the keypair generated above
   - `VPS_SSH_PORT` — optional, only if SSH runs on a non-default port
3. That's it. The workflow at `.github/workflows/deploy.yml` triggers on every
   push to `main`, and can also be run manually from the GitHub Actions tab
   (`workflow_dispatch`).

### Manual redeploy (fallback)

If GitHub Actions isn't available, SSH in and run the same script directly:

```bash
ssh deploy@vps '/opt/skiarea/scripts/deploy.sh'
```

### Quick verify after deploy

```bash
pm2 status                                                      # API running?
curl -s https://dashboard.skipasslivigno.com/api/healthz        # API reachable?
sudo -u postgres psql -d skiarea -c "SELECT COUNT(*) FROM lift_snapshots;"  # data ok?
```

The deploy script itself also curls `/api/healthz` at the end and prints a
warning if the API doesn't come back healthy, so a failed deploy is visible
directly in the GitHub Actions log.

---

## Checklist

- [ ] VPS: Node.js 24, pnpm, pm2, PostgreSQL, nginx installed
- [ ] `.env.production` created with `DATABASE_URL`, `SESSION_SECRET`, `PORT=5000`
- [ ] Code pushed to GitHub → GitHub Actions deploys automatically
- [ ] DB migration applied (`tenants`, `users`, `lift_snapshots.tenant_id`)
- [ ] API server running (`pm2 status`)
- [ ] `POST /api/setup/init` called → tenant + admin created, `apiKey` saved
- [ ] nginx serving static files and proxying `/api/`
- [ ] TLS certificate active (`certbot`)
- [ ] SQL Server Agent `@api_key` updated to tenant API key from setup
- [ ] Test sync: run the Agent job manually and verify data appears in the app
- [ ] GitHub Actions secrets configured (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`)
- [ ] Deploy key added to VPS `~/.ssh/authorized_keys`
- [ ] Test the pipeline: push a trivial commit to `main` and watch the
      "Deploy to VPS" workflow run in the GitHub Actions tab
