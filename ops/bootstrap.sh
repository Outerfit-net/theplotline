#!/bin/bash
# =============================================================================
# Blackwell Bootstrap Script — Full DR Recovery
# =============================================================================
# Usage: ./bootstrap.sh [--restore-from-r2]
# 
# This script rebuilds the entire Blackwell server from scratch.
# Run as: sudo ./bootstrap.sh
# =============================================================================

set -e

echo "🔧 Blackwell Bootstrap — DR Recovery"
echo "===================================="

# Phase 1: Install dependencies
echo "📦 Installing dependencies..."

# PostgreSQL
if ! command -v psql &> /dev/null; then
    apt update && apt install -y postgresql postgresql-contrib
fi

# rclone
if ! command -v rclone &> /dev/null; then
    curl -s https://rclone.org/install.sh | bash
fi

# Node.js (if not present)
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt install -y nodejs
fi

# PM2
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# =============================================================================
# Phase 2: PostgreSQL Setup
# =============================================================================
echo "🗄️ Setting up PostgreSQL..."

# Start PostgreSQL
systemctl enable postgresql
systemctl start postgresql

# Create user and databases
sudo -u postgres psql -c "CREATE USER plotlines WITH PASSWORD 'plines2026';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE plotlines OWNER plotlines;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE thread OWNER plotlines;" 2>/dev/null || true

# =============================================================================
# Phase 3: Clone and Deploy Code
# =============================================================================
echo "📂 Deploying code..."

# Plot Lines
if [ ! -d /opt/plotlines ]; then
    git clone https://github.com/mdcscry/plotlines.git /opt/plotlines
fi
cd /opt/plotlines/server && npm install --production

# THREAD
if [ ! -d /opt/thread ]; then
    git clone https://github.com/mdcscry/thread.git /opt/thread
fi
cd /opt/thread && npm install --production

# =============================================================================
# Phase 4: Restore from R2 (optional)
# =============================================================================
if [ "$1" = "--restore-from-r2" ]; then
    echo "☁️ Restoring databases from R2..."
    
    # Configure R2 if not done
    if ! rclone listremotes | grep -q r2-backups; then
        echo "⚠️ R2 not configured. Run: rclone config"
        echo "   Then add remote 'r2-backups' with your Cloudflare R2 credentials"
    else
        # Restore plotlines
        LATEST_PL=$(rclone ls r2-backups:plotlines-backups/plotlines/ | tail -1 | awk '{print $2}')
        if [ -n "$LATEST_PL" ]; then
            rclone copy r2-backups:plotlines-backups/plotlines/$LATEST_PL /tmp/
            gunzip < /tmp/$LATEST_PL | PGPASSWORD=plines2026 psql -U plotlines -h localhost -d plotlines
            echo "✅ Restored plotlines database"
        fi
        
        # Restore thread
        LATEST_TH=$(rclone ls r2-backups:plotlines-backups/thread/ | tail -1 | awk '{print $2}')
        if [ -n "$LATEST_TH" ]; then
            rclone copy r2-backups:plotlines-backups/thread/$LATEST_TH /tmp/
            gunzip < /tmp/$LATEST_TH | PGPASSWORD=plines2026 psql -U plotlines -h localhost -d thread
            echo "✅ Restored thread database"
        fi
    fi
fi

# =============================================================================
# Phase 5: Start Services
# =============================================================================
echo "🚀 Starting services..."

# PM2
cd /opt/plotlines
cp ops/ecosystem.config.cjs ~/
pm2 start ~/ecosystem.config.cjs
pm2 save

# Caddy (if needed)
if command -v caddy &> /dev/null; then
    cp /opt/plotlines/ops/Caddyfile /etc/caddy/
    systemctl reload caddy
fi

# =============================================================================
# Phase 6: Verify
# =============================================================================
echo "✅ Verifying services..."

sleep 3

# Check Plot Lines
if curl -s http://localhost:3001/health | grep -q ok; then
    echo "✅ Plot Lines: OK"
else
    echo "❌ Plot Lines: FAILED"
fi

# Check Thread
if curl -s http://localhost:3000/api/health | grep -q ok; then
    echo "✅ Thread: OK"
else
    echo "❌ Thread: FAILED"
fi

# Check PostgreSQL
if psql -U plotlines -h localhost -d plotlines -c "SELECT 1" &>/dev/null; then
    echo "✅ PostgreSQL: OK"
else
    echo "❌ PostgreSQL: FAILED"
fi

echo ""
echo "🎉 Bootstrap complete!"
echo ""
echo "Useful commands:"
echo "  pm2 status          # Check services"
echo "  pm2 logs            # View logs"
echo "  /opt/plotlines/ops/backup-db.sh  # Manual backup"
