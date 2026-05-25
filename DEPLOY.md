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
git clone <your-repo-url> /opt/skiarea
cd /opt/skiarea
pnpm install
```

---

## 3 — Environment variables

Create `/opt/skiarea/.env.production`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/skiarea
SYNC_API_KEY=your-secret-key          # optional; protects POST /api/lifts/sync
PORT=5000
NODE_ENV=production
```

---

## 4 — Database migration (first deploy only)

```bash
source /opt/skiarea/.env.production
pnpm --filter @workspace/db run push
```

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
cd /opt/skiarea
pnpm --filter @workspace/skiarea-dashboard run export
# output: artifacts/skiarea-dashboard/dist/
```

Copy static files to the web root:

```bash
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

Change the sync URL in the T-SQL script to:

```
https://yourdomain.com/api/lifts/sync
```

If `SYNC_API_KEY` is set, add the header:

```sql
EXEC sp_OAMethod @http, 'setRequestHeader', NULL, 'X-Api-Key', 'your-secret-key'
```

---

## Redeployment (subsequent updates)

```bash
cd /opt/skiarea
git pull
pnpm install

# Rebuild API
pnpm --filter @workspace/api-server run build
pm2 restart api-server

# Rebuild web app (only if UI changed)
pnpm --filter @workspace/skiarea-dashboard run export
sudo cp -r artifacts/skiarea-dashboard/dist /var/www/skiarea

# Run migrations (only if DB schema changed)
source .env.production && pnpm --filter @workspace/db run push
```

---

## Checklist

- [ ] VPS: Node.js 24, pnpm, pm2, PostgreSQL, nginx installed
- [ ] `.env.production` created with `DATABASE_URL`, `SYNC_API_KEY`, `PORT=5000`
- [ ] DB migration run (`pnpm --filter @workspace/db run push`)
- [ ] API server running (`pm2 status`)
- [ ] nginx serving static files and proxying `/api/`
- [ ] TLS certificate active (`certbot`)
- [ ] SQL Server Agent job URL updated to `https://yourdomain.com/api/lifts/sync`
- [ ] Test sync: run the Agent job manually and verify data appears in the app
