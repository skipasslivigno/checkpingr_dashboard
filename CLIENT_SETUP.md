# Ski Area Dashboard — Guida all'installazione

Questo documento descrive come installare il dashboard su un tuo server.  
I dati rimangono sul tuo server: nessuna informazione viene trasmessa a terzi.

---

## Requisiti del server

| Requisito | Minimo | Consigliato |
|-----------|--------|-------------|
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1 GB | 2 GB |
| Disco | 10 GB | 20 GB |
| Porta aperta | 80, 443 | 80, 443 |
| Dominio | DNS puntato al server | es. `dashboard.miaski.it` |

Un VPS economico (Hetzner CX22, DigitalOcean Droplet, Hostinger VPS) va benissimo.

---

## Installazione automatica

### 1. Copia lo script sul server

```bash
scp install-client.sh utente@tuo-server:~/
ssh utente@tuo-server
```

### 2. Esegui l'installer

```bash
chmod +x install-client.sh
sudo ./install-client.sh
```

Lo script chiederà interattivamente:

| Campo | Esempio |
|-------|---------|
| Dominio del dashboard | `dashboard.miaski.it` |
| URL del repository Git | fornito da chi ha sviluppato l'app |
| Nome database | `skiarea` (default) |
| Password database | scegli una password sicura |
| Nome admin | `Mario Rossi` |
| Email admin | `admin@miaski.it` |
| Password admin | min 8 caratteri |
| Nome ski area | `Sci Club Bormio` |
| Slug identificativo | `sci-club-bormio` |

Al termine, l'installer crea il file `/opt/skiarea/SETUP_KEYS.txt` con tutte le chiavi necessarie — **conservarlo in luogo sicuro**.

---

## Dopo l'installazione

### Configurare lo script SQL Server Agent

Aprire `SETUP_KEYS.txt` e copiare:
- **Dashboard URL** → l'indirizzo da usare nello script T-SQL
- **API Key** → il valore per l'header `X-Api-Key`

Nello script SQL Server Agent, aggiornare:

```sql
DECLARE @url     NVARCHAR(512) = N'https://dashboard.miaski.it/api/lifts/sync'
DECLARE @api_key NVARCHAR(128) = N'<API Key da SETUP_KEYS.txt>'
```

L'app mostra anche le istruzioni complete nella scheda **Integrazione**.

### Primo accesso all'app

1. Aprire `https://dashboard.miaski.it` dal browser o scaricare l'app mobile
2. Accedere con email e password admin scelti durante l'installazione
3. Dalla scheda **Info → Amministrazione** è possibile creare altri utenti

---

## Aggiornamenti

Quando è disponibile una nuova versione, eseguire sul server:

```bash
sudo /opt/skiarea/scripts/update.sh
```

Lo script aggiorna il codice, migra il database, ricompila l'app e riavvia tutto automaticamente. I dati non vengono toccati.

---

## Comandi utili

```bash
# Stato dei servizi
pm2 status

# Log in tempo reale
pm2 logs api-server

# Riavvio manuale dell'API
pm2 restart api-server

# Verifica salute dell'API
curl https://dashboard.miaski.it/api/healthz

# Backup del database
pg_dump -U skiarea skiarea > backup_$(date +%Y%m%d).sql
```

---

## Backup

Si consiglia di pianificare un backup automatico del database con `pg_dump`:

```bash
# Aggiunge un cron job giornaliero alle 03:00
(crontab -l 2>/dev/null; echo "0 3 * * * pg_dump -U skiarea skiarea > /opt/skiarea/backups/backup_\$(date +\%Y\%m\%d).sql") | crontab -
mkdir -p /opt/skiarea/backups
```

---

## Supporto

Per assistenza tecnica contattare chi ha fornito questo software.  
In caso di problemi urgenti, fornire l'output di:

```bash
pm2 status
pm2 logs api-server --lines 50
curl -v http://localhost:5000/api/healthz
```
