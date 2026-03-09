# Plot Lines Runbook
*Updated: 2026-03-08*

---

## Quick Commands

```bash
# Server status
pm2 status plotlines

# Restart server
pm2 restart plotlines

# View logs (live)
pm2 logs plotlines --lines 50

# Dispatch log (cron)
tail -f /opt/plotlines/logs/dispatch.log

# SSH into server (from Mac)
ssh administrator@38.247.187.229
```

---

## Server Details

| Thing | Value |
|-------|-------|
| URL | https://theplotline.net (Cloudflare) |
| Local API | http://localhost:3001 |
| Database | PostgreSQL 14 — `plotlines` db |
| DB connection | `postgresql://plotlines:plines2026@localhost:5432/plotlines` |
| Mastheads | `/opt/plotlines/data/mastheads/` → `https://theplotline.net/mastheads/` |
| Art cache | `/opt/plotlines/data/mastheads/art/generated/` |
| Run dirs | `/opt/plotlines/data/runs/YYYY-MM-DD/` |
| Prose cache | `/opt/plotlines/data/prose-cache/YYYY-MM-DD/` |
| Dispatch log | `/opt/plotlines/logs/dispatch.log` |
| Server config | `/opt/plotlines/.env` |
| Pipeline scripts | `/home/administrator/openclaw/skills/garden-conversation/` |

---

## Daily Dispatch

**Schedule:** `30 12 * * *` (12:30 UTC = 5:30 AM MST)
**Cron wrapper:** `/opt/plotlines/run-dispatch.sh`
**Script:** `garden-dispatch.py`

The cron spawns `garden-dispatch.py` directly. The old `engine.py` is gone.

```bash
# Check cron is registered
crontab -l | grep dispatch

# View today's dispatch log
cat /opt/plotlines/logs/dispatch.log

# Trigger a full dry-run manually (no email sent)
cd /home/administrator/openclaw/skills/garden-conversation
python3 garden-dispatch.py --dry-run --clear-cache
```

### DAG stages (in order)
1. preflight — DB, Ollama, SMTP, NWS reachability
2. weather — NWS obs + forecast per station
   - Note: do not synthesize observation station codes from office IDs (no `K+` prefixing). For office codes like `AJK`/`BOU`/`KEY`, use station as provided and rely on lat/lon nearest-station fallback when direct obs lookup fails.
   - `garden-weather.py --station` now requires `--lat` + `--lon` (dispatch already provides both).
3. art + dialogue — parallel (art: SDXL; dialogue: multi-agent LLM)
4. title — sekki + zone + condition lookup
5. masthead — composite PNG (art + title + typography)
6. email — send via Resend SMTP

---

## Interactive Testing — dispatch-step.py

**The only tool for manual pipeline runs and debugging.**

```bash
cd /home/administrator/openclaw/skills/garden-conversation

# Run a single stage for one subscriber
python3 dispatch-step.py --stage weather  --email mdcscry@yahoo.com
python3 dispatch-step.py --stage art      --email mdcscry@yahoo.com
python3 dispatch-step.py --stage dialogue --email mdcscry@yahoo.com
python3 dispatch-step.py --stage title    --email mdcscry@yahoo.com
python3 dispatch-step.py --stage masthead --email mdcscry@yahoo.com
python3 dispatch-step.py --stage send     --email mdcscry@yahoo.com  # sends real email

# Run all test subscribers
python3 dispatch-step.py --stage weather --test-subs

# Bust cache for a stage then re-run
python3 dispatch-step.py --stage art --email mdcscry@yahoo.com --bust-cache

# Full fresh run (nukes all caches including art)
python3 dispatch-step.py --fresh --email mdcscry@yahoo.com

# Step through interactively from a stage
python3 dispatch-step.py --from-stage art --email mdcscry@yahoo.com
```

### Dependency order
- weather → no deps
- art → needs weather
- dialogue → needs weather
- title → needs weather + zone/season
- masthead → needs art + title
- send → needs everything

### Test subscribers (is_test=true in DB)
| Email | Station | Zone | Author |
|-------|---------|------|--------|
| mdcscry@yahoo.com | BOU | high_plains | hemingway |
| moltibot@agentmail.to | BOU | high_plains | hemingway |
| outerfit.net@gmail.com | KEY | florida_keys_tropical | munro |
| mdcscry@gmail.com | AJK | alaska_south_coastal | gabaldon |

---

## Database

```bash
# Connect
psql postgresql://plotlines:plines2026@localhost:5432/plotlines

# Active subscribers
psql ... -c "SELECT pgp_sym_decrypt(email::bytea, '$DB_ENCRYPTION_KEY')::text, subscription_status FROM subscribers WHERE active=1 AND confirmed_at IS NOT NULL AND subscription_status='active';"

# All combinations
psql ... -c "SELECT station_code, author_key, climate_zone_id FROM combinations;"

# Today's weather cache
ls /opt/plotlines/data/runs/$(date +%Y-%m-%d)/
```

**All email, location, lat, lon, zipcode columns are encrypted** with `pgp_sym_encrypt`. Key is `DB_ENCRYPTION_KEY` in `.env`. Never log or store plaintext email.

---

## Email Delivery

| Header | Value |
|--------|-------|
| From | `PlotLines@theplotline.net` |
| Reply-To | `support@theplotline.net` |
| Provider | Resend via `smtp.resend.com:465` |

Valid addresses: `support@` / `noreply@` / `beta@` / `hello@` / `mcryer@theplotline.net`

See architecture doc for full env var reference.

---

## Key Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/subscribe` | POST | New subscriber signup (requires Turnstile) |
| `/api/confirm/:token` | GET | Email confirmation |
| `/api/subscription/status` | GET | Subscriber status |
| `/api/subscription/cancel` | POST | Cancel subscription |
| `/api/stripe/create-checkout` | POST | Stripe checkout |
| `/api/webhooks/stripe` | POST | Stripe webhook handler |
| `/api/admin/*` | * | Admin panel (requires ADMIN_SECRET) |
| `/mastheads/:file` | GET | Serve cached masthead PNGs |
| `/health` | GET | Health check |

---

## Testing

### Python Pipeline Tests

```bash
cd /home/administrator/openclaw/skills/garden-conversation

# Fast (no LLM, no network) — default, ~4s
python3 run_tests.py --fast

# Single suite
python3 run_tests.py art
python3 run_tests.py seasons

# With network (Postgres, NWS API) — ~30s
python3 run_tests.py --network

# With LLM calls (~2+ min) — explicit permission only
python3 run_tests.py --slow

# Everything: all Python + Node
python3 run_tests.py --all
```

Suites: `art` | `weather` | `seasons` | `dialogue` | `dispatch`

### Node Server Tests

```bash
cd /opt/plotlines/server && npm test
```

### Test credentials
| Thing | Value |
|-------|-------|
| Stripe test card | `4242424242424242` |
| Beta invite code | `BETA-B6F22` |
| Turnstile test secret | `1x0000000000000000000000000000000AA` |

---

## Deployment

```bash
cd /opt/plotlines
git pull
cd client && npm run build && cd ..
pm2 restart plotlines
pm2 save
```

---

## Common Issues

| Problem | Check |
|---------|-------|
| Dispatch not running | `crontab -l`, `cat /opt/plotlines/logs/dispatch.log` |
| Email not sending | `SMTP_PASS` in `.env`, check Resend dashboard |
| Art not generating | Ollama running? `curl http://localhost:11434/api/tags` |
| Dialogue hanging | LLM timeout — check `openclaw agent` reachable |
| Wrong wind speed | NWS obs unit varies by station (km/h vs m/s) — handled in `garden-weather.py` |
| Stripe failures | Webhook endpoint + `STRIPE_WEBHOOK_SECRET` in `.env` |
| Masthead not serving | Check `/opt/plotlines/data/mastheads/` permissions |
