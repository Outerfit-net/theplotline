# Blackwell Rebuild Runbook

*For AI assistant to rebuild everything from scratch*

---

## Phase 1: Get Molti Running (Prerequisite)

```bash
# On Blackwell (or new machine)
git clone https://github.com/mdcscry/openclaw.git ~/openclaw
cd ~/openclaw
npm install -g openclaw
openclaw gateway start
```

Molti is now alive and can execute the rest.

---

## Phase 2: Restore from R2 (Databases)

### Prerequisites
- R2 bucket created with credentials
- rclone configured with `rclone config`

### Restore Commands
```bash
# 1. Configure rclone with R2 (one-time)
rclone config
# Add new remote: type=s3, provider=Cloudflare, access_key, secret_key, endpoint

# 2. Download latest backup from R2
rclone copy r2-backups:plotlines-backups/plotlines/latest.sql.gz /tmp/
rclone copy r2-backups:plotlines-backups/thread/latest.sql.gz /tmp/

# 3. Restore PostgreSQL databases
gunzip < /tmp/latest.sql.gz | psql -U postgres -d plotlines
gunzip < /tmp/latest.sql.gz | psql -U postgres -d thread
```

---

## Phase 3: Deploy Services

### PostgreSQL
```bash
sudo apt update && sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE USER plotlines WITH PASSWORD 'plines2026';"
sudo -u postgres psql -c "CREATE DATABASE plotlines OWNER plotlines;"
sudo -u postgres psql -c "CREATE DATABASE thread OWNER plotlines;"
```

### PM2 Services
```bash
# Clone repos
git clone https://github.com/mdcscry/plotlines.git /opt/plotlines
git clone https://github.com/mdcscry/thread.git /opt/thread

# Install deps
cd /opt/plotlines/server && npm install
cd /opt/thread && npm install

# Copy PM2 config
cp /opt/plotlines/ops/ecosystem.config.cjs ~/

# Start services
pm2 start ~/ecosystem.config.cjs
pm2 save
```

### Caddy Reverse Proxy
```bash
# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy

# Copy config
sudo cp /opt/plotlines/ops/Caddyfile /etc/caddy/
sudo systemctl reload caddy
```

---

## Phase 4: Verify

```bash
# Check services
pm2 list
curl http://localhost:3001/health  # Plot Lines
curl http://localhost:3000/api/health  # Thread

# Check R2 backups are working
/opt/plotlines/ops/backup-db.sh
```

---

## Quick Status Check

```bash
# What's running?
pm2 list

# Are ports open?
ss -tlnp | grep -E '3000|3001|5432'

# Database connectivity
psql -U plotlines -h localhost -d plotlines -c "SELECT COUNT(*) FROM users;"
```

---

## Daily Operations

### Manual Backup
```bash
/opt/plotlines/ops/backup-db.sh
```

### View Logs
```bash
pm2 logs plotlines
pm2 logs thread
```

---

*Last updated: 2026-03-03*
