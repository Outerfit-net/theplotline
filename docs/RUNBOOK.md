# Plot Lines Runbook
*Updated: 2026-03-02*

## Quick Commands

```bash
# Server status
pm2 status plotlines

# Restart server
pm2 restart plotlines

# View logs (live)
pm2 logs plotlines --lines 50

# SSH into server (from Mac)
ssh administrator@38.247.187.229
```

## Server Details

- **URL**: https://theplotline.net (Cloudflare protected)
- **Local API**: http://localhost:3001
- **Database**: `/opt/plotlines/data/plotlines.db`
- **Mastheads**: `/opt/plotlines/data/mastheads/` — served at `/mastheads/<file>.png`
- **Logs**: `/data/logs/plotlines-out-2.log` + `/data/logs/plotlines-error-2.log`
- **Config**: `/opt/plotlines/server/.env`
- **Fastify version**: 4.x (use `@fastify/static@7`, not v8/v9)

## Key Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/authors` | GET | List available author voices |
| `/api/subscribe` | POST | New subscriber signup (requires Turnstile) |
| `/api/confirm/:token` | GET | Email confirmation |
| `/api/subscription/status` | GET | Subscriber status (email + token) |
| `/api/subscription/cancel` | POST | Cancel subscription |
| `/api/referral/link` | GET | Get/create referral link |
| `/api/gift` | POST | Send gift subscription |
| `/api/stripe/create-checkout` | POST | Create Stripe checkout session |
| `/api/webhooks/stripe` | POST | Stripe webhook handler |
| `/api/admin/*` | * | Admin panel (requires ADMIN_SECRET) |
| `/mastheads/:file` | GET | Serve cached masthead PNGs |
| `/health` | GET | Health check |

## Database

```bash
# Query subscribers
sqlite3 /opt/plotlines/data/plotlines.db "SELECT email, subscription_status, created_at FROM subscribers ORDER BY created_at DESC LIMIT 10;"

# Check active subscribers
sqlite3 /opt/plotlines/data/plotlines.db "SELECT COUNT(*) FROM subscribers WHERE active=1 AND confirmed_at IS NOT NULL;"

# Check today's dispatch
sqlite3 /opt/plotlines/data/plotlines.db "SELECT run_date, status, COUNT(*) FROM daily_runs GROUP BY run_date ORDER BY run_date DESC LIMIT 5;"
```

## Masthead System

Mastheads are 600×100px PNG banners, lazy-generated per `station-author-season-weather` combo:

```bash
# Generate manually
python3 /opt/plotlines/server/services/generate_masthead.py BOU hemingway spring cloudy

# Check cached mastheads
ls /opt/plotlines/data/mastheads/

# Test serving
curl -I http://localhost:3001/mastheads/BOU-hemingway-spring-cloudy.png
```

Filename pattern: `{station}-{author}-{season}-{weather}.png`
Served at: `https://theplotline.net/mastheads/{filename}.png`
Fallback: static logo if generation fails.

## Daily Dispatch

Runs at 6:00 AM via node-cron. For each active `location+author` combo:
1. Runs Python engine (`server/garden/engine.py`) → generates prose
2. Gets author-voiced season name
3. Generates (or loads cached) masthead
4. Sends email via SMTP to all matching active confirmed subscribers

```bash
# Trigger dispatch manually
node /opt/plotlines/server/cron/dispatch.js

# Check dispatch logs
pm2 logs plotlines --lines 100 | grep dispatch
```

## Common Issues

| Problem | Check |
|---------|-------|
| 404 on API | `pm2 logs plotlines` for route errors |
| Email not sending | SMTP credentials in `.env` |
| Stripe failures | Webhook endpoint `/api/webhooks/stripe` + `STRIPE_WEBHOOK_SECRET` |
| Masthead not generating | Python PIL installed? `python3 -c "from PIL import Image"` |
| Static plugin crash | Must use `@fastify/static@7` (Fastify 4.x compat) |
| Turnstile blocking tests | Use `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA` (Cloudflare test key) |

## Deployment

```bash
# Pull latest, rebuild client, restart
cd /opt/plotlines
git pull
cd client && npm run build && cd ..
pm2 restart plotlines
pm2 save
```

## Testing

```bash
# Run all tests
cd /opt/plotlines/server && npm test

# Stripe test card
4242424242424242

# Beta invite code
BETA-B6F22

# Cloudflare Turnstile test secret (bypasses bot check)
1x0000000000000000000000000000000AA
```
