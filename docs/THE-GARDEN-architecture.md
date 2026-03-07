# THE GARDEN — Architecture Document
*Last Updated: 2026-03-06*

---

## ⚠️ AGENT RULES — READ FIRST

**These are non-negotiable. Violating them breaks production.**

1. **POSTGRES ONLY. ZERO SQLite.** The database is PostgreSQL at `postgresql://plotlines:plines2026@localhost:5432/plotlines`. There is no SQLite, no `plotlines.db`, no `better-sqlite3`, no `sqlite3` Python module, no `:memory:` anything. Not in production code. Not in tests. Not in seed scripts. Not in comments. Zero. None. If you write `import sqlite3` or `require('better-sqlite3')`, you are wrong.

2. **Emails are encrypted.** The `subscribers.email` column is BYTEA (`pgp_sym_encrypt`). To read an email: `pgp_sym_decrypt(email::bytea, $1)::text`. The key is `DB_ENCRYPTION_KEY` env var. Same for `location_city`, `location_state`, `lat_enc`, `lon_enc`, `zipcode`. Never store or log plaintext email.

3. **Tests must test the real pipeline.** Tests that pass while the app is broken are worse than no tests. Run both test suites before every commit:
   ```bash
   cd /opt/plotlines/server && npm test                          # Node — 7s
   python3 -m pytest ~/openclaw/skills/garden-conversation/test_pipeline.py -v  # Python — 3 min
   ```

4. **The Python pipeline scripts read from Postgres.** `garden-dispatch.py`, `garden-assembler.py`, `garden-mailer.py` all use `psycopg2`. `DATABASE_URL` and `DB_ENCRYPTION_KEY` from `/opt/plotlines/.env`.

5. **Climate zones: 28 zones, exact names matter.** Old names (`alaska`, `humid_southeast`, `upper_midwest`) no longer exist. Use current names listed in the Climate Zones section.

6. **Run tests before committing.** Both suites must be green. No exceptions.

---

## The Product

Every morning, 12 fictional garden characters — each powered by a different LLM with a distinct personality — convene to discuss the day. Their conversation is grounded in real weather data, the current solar term, a daily quote, and the subscriber's specific growing region. The exchange closes with a passage written in the style of the subscriber's chosen author voice.

It is absurdist. It is horticultural. It is oddly wise.

**Pricing:**
- Weekly: $1.99/month
- Monthly: $3.99/month
- Annual: $40/year

---

## Tech Stack

| Component | Technology | Version | Notes |
|-----------|-----------|---------|-------|
| VPS | DatabaseMart RTX Pro 4000 Blackwell | — | Shared with Outerfit |
| OS | Ubuntu 22.04 | — | |
| Reverse proxy | Caddy | 2.11.1 | TLS via Cloudflare DNS |
| Domain | theplotline.net | — | Cloudflare proxied |
| Runtime | Node.js | 22.22.0 | |
| Web framework | Fastify | 4.26.0 | Port 3001 |
| Database | PostgreSQL | 14 | `plotlines` db |
| DB client (Node) | pg | 8.19.0 | |
| DB client (Python) | psycopg2 | — | |
| Payments | Stripe | 20.4.0 | |
| Transactional email | nodemailer | 6.9.8 | Gmail SMTP relay |
| Dispatch email | garden-mailer.py | — | Resend API |
| Process manager | PM2 | — | Cluster mode |
| Frontend | React + Vite + Tailwind | 18.2 / 5.1 / 4.0 | Built to `/opt/plotlines/client/dist` |
| Python | Python | 3.10.12 | Pipeline scripts |
| Art generation | Stable Diffusion XL (SDXL) | diffusers 0.36.0 | torch 2.10.0, RTX 4000 |
| LLM (dialogue) | mistral:latest | — | Ollama local |
| LLM (title) | mistral:latest | — | Ollama local, 30s timeout |
| LLM (other) | gemma2, granite3.3, phi4:14b, qwen3.5 | — | Ollama local, character rotation |
| Scheduling | OpenClaw cron | — | 5:30 AM Mountain daily |

---

## Infrastructure

```
theplotline.net (Cloudflare DNS)
        │
        ▼
Caddy 2.11.1 (TLS termination)
        │
        ├── /api/*        → localhost:3001 (Fastify)
        ├── /mastheads/*  → localhost:3001 (Fastify static)
        └── /*            → /opt/plotlines/client/dist (React SPA)

Fastify (port 3001, PM2 cluster)
        │
        └── PostgreSQL 14 (localhost:5432)

Python Pipeline (cron 5:30 AM MT)
        │
        └── PostgreSQL 14 (localhost:5432, psycopg2)
```

---

## The 12 Characters

Each character has a `persona-*.md` file in `~/openclaw/skills/garden-conversation/`. Each is powered by a rotating LLM. Not all appear every day.

| Key | Name | Voice |
|-----|------|-------|
| `buckthorn` | Buck Thorn | Weathered pragmatist, 40 years experience, terse |
| `harry-kvetch` | Harry Kvetch | Perpetually aggrieved, complaints are his love language |
| `miss-canthus` | Ms. Canthus | Poetic, observational, finds beauty in decay |
| `poppy-seed` | Poppy Seed | Enthusiastic, trend-aware, slightly exhausting |
| `ivy-league` | Ivy League | Over-educated, Latin binomials, footnotes everything |
| `chelsea-flower` | Chelsea Flower | Designer eye, cross-quarter calendar devotee |
| `buster-native` | Buster Native | Native plant purist, deep land knowledge |
| `fern` | Fern Young | New to all of this, asks the questions nobody else will |
| `esther-potts` | Esther Potts | — |
| `herb-berryman` | Herb Berryman | — |
| `muso-maple` | Muso Maple | 72 micro-seasons devotee |
| `edie-bell` | Edie Bell | Black woman, ancestral soil knowledge, edible+bell pun |

---

## Signup Flow

**URL:** theplotline.net (React SPA)

**Fields collected:**
- Email (required)
- City (required)
- State (required for US)
- Zipcode (optional — preferred for geocoding precision)
- Author voice (currently Hemingway only)
- Plan (weekly / monthly / annual)

**No country field** — inferred from state. International signups handled separately.

**Flow:**
```
1. User submits signup form → POST /api/subscribe
2. Geocode: zipcode preferred → fallback "city, state" → Nominatim
3. lat/lon → NWS points API → station_code
4. assignClimateZone(lat, lon) → climate_zone_id
5. Insert subscriber (email encrypted, PII encrypted at rest)
6. Create/find combination (location_key, author_key)
7. Send confirmation email → confirm_token link
8. User clicks confirm → POST /api/confirm → active=1, confirmed_at=NOW()
9. User clicks Subscribe → POST /api/stripe/create-checkout → Stripe Checkout
10. Stripe webhook checkout.session.completed → subscription_status='active'
11. Webhook backfills zipcode + re-geocodes from Stripe billing address if missing
```

---

## Cancel Flow

**Self-serve** via unsubscribe link in every email footer.

```
1. User clicks unsubscribe link → /manage?email=&token=
2. User clicks Cancel → POST /api/subscription/cancel
3. Sets: active=0, cancelled_at=NOW(), subscription_status='canceled'
4. Stripe subscription cancelled via API
5. Stripe webhook customer.subscription.deleted → confirms cancellation
```

**Data retention:** 3 months after cancellation, then delete.

⚠️ **TODO:** Build automated deletion process for subscribers cancelled > 3 months.
⚠️ **TODO:** Build delete-on-request flow (GDPR/CCPA compliance).

---

## Stripe Integration

**Plans:**
| Plan | Price ID | Amount |
|------|----------|--------|
| Weekly | `price_1T6O428OA2NW5jQ16JctMJER` | $1.99/mo |
| Monthly | `price_1T6O428OA2NW5jQ1R3ddq4Kv` | $3.99/mo |
| Annual | `price_1T7oFi8OA2NW5jQ1x72A5uCK` | $40/yr |

**Beta coupon:** `z3TAEuwH` (free month)

**Webhook events handled** (`POST /api/webhooks/stripe`):
- `checkout.session.completed` → activate subscription, backfill zip + re-geocode
- `invoice.paid` → extend subscription_end_date
- `customer.subscription.deleted` → cancel subscription
- `invoice.payment_failed` → mark as past_due

**Zipcode backfill on checkout:**
- If subscriber has no zip → store from Stripe billing address
- If subscriber has no lat/lon → geocode using subscriber's zip (preferred) or Stripe zip (fallback)
- Updates climate_zone_id accordingly

**Referrals:** referrer gets free month on referee's first payment. Tracked in `referrals` table.

**Gift subscriptions:** purchaser buys gift code → recipient redeems for free period. Tracked in `gifts` table.

---

## Privacy & Security

**Email encryption at rest (pgcrypto):**
- `email`, `location_city`, `location_state`, `zipcode`, `lat`, `lon` — all encrypted as BYTEA
- `email_hash` — SHA-256 of `lower(trim(email))` for deduplication lookups
- `DB_ENCRYPTION_KEY` in `.env` (gitignored) and Bitwarden
- ⚠️ KEY LOSS = PERMANENT DATA LOSS

**Data collected:**
- Email, city, state, optional zipcode
- lat/lon (geocoded from city/zip)
- Climate zone, NWS station
- Stripe customer/subscription IDs
- Plan, subscription status

**Data retention:**
- Active: indefinitely while subscribed
- Cancelled: 3 months, then delete
- Delete on request: ⚠️ TODO

**Backups:** Daily PostgreSQL dump → GPG encrypted → Cloudflare R2

---

## Climate Zones (28 total)

**US:** `high_plains` | `pacific_maritime` | `california_med` | `desert_southwest` | `great_plains` | `great_lakes` | `upper_midwest_continental` | `appalachian` | `humid_subtropical` | `northeast` | `southern_plains` | `florida_southern` | `florida_keys_tropical` | `hawaii` | `alaska_interior` | `alaska_south_coastal`

**International:** `uk_maritime` | `mediterranean_eu` | `central_europe` | `canada_prairie` | `canada_maritime` | `japan_temperate` | `iceland_subarctic` | `australia_tropical` | `australia_temperate` | `south_africa_temperate` | `south_africa_subtropical` | `brazil_subtropical`

**Renamed (2026-03-06):** `alaska` → `alaska_interior`/`alaska_south_coastal` | `humid_southeast` → `humid_subtropical` | `upper_midwest` → `upper_midwest_continental`

---

## The DAG Pipeline

**Orchestrator:** `garden-dispatch.py`
**Schedule:** 5:30 AM Mountain daily via OpenClaw cron
**Working dir:** `~/openclaw/skills/garden-conversation/`

**Run manually:**
```bash
python3 garden-dispatch.py --dry-run      # test without sending
python3 garden-dispatch.py                # real run
python3 garden-dispatch.py --date 2026-03-06  # specific date
```

### Master Query

Grain: `(station_code, zipcode, author_key)` — one row per newsletter edition per unique zip.

```sql
SELECT
  c.station_code,
  pgp_sym_decrypt(s.zipcode::bytea, %s)   AS zipcode,
  c.author_key,
  c.climate_zone_id,
  c.timezone,
  COUNT(s.id)                              AS subscriber_count,
  JSON_AGG(JSON_BUILD_OBJECT(
    'id',                s.id,
    'email',             pgp_sym_decrypt(s.email::bytea, %s),
    'unsubscribe_token', s.unsubscribe_token
  ))                                       AS subscribers
FROM combinations c
JOIN subscribers s
  ON  s.station_code = c.station_code
  AND s.author_key   = c.author_key
  AND s.active       = 1
  AND s.confirmed_at IS NOT NULL
  AND s.subscription_status = 'active'
GROUP BY
  c.station_code,
  pgp_sym_decrypt(s.zipcode::bytea, %s),
  c.author_key,
  c.climate_zone_id,
  c.timezone
ORDER BY
  c.station_code, zipcode, c.author_key
```

### Pipeline Stages

| Stage | Group By | Output |
|-------|----------|--------|
| Zone Assignment | `(lat, lon, country)` | `{climate_zone_id, hemisphere}` → stored on subscriber at signup, drives all downstream lookups |
| Weather | `(station_code, zipcode)` | `{condition}` → Art, Title Dict, `{forecast}` → Dialogue |
| Solar Term | `(climate_zone_id, hemisphere)` | `{season_bucket, season_bucket_description}` → Art, Topic, Dialogue |
| Sub-region | `(station_code, climate_zone_id)` | `{sub_region_description}` → Dialogue |
| Topic ⚠️ TODO: generate 14 per `(season_bucket, climate_zone_id)` | `(season_bucket, climate_zone_id)` | `{topic}` → Dialogue |
| Quote ⚠️ TODO: `garden-quotes.py`, 14 per `season_bucket` | `(season_bucket)` | `{quote}` → Dialogue, Delivery |
| Title Dict ⚠️ TODO: pre-generate per group by | `(season_bucket, climate_zone_id, condition)` | `{title}` → Masthead |
| Art | `({condition, season_bucket, season_bucket_description})` | `{png_path}` → Masthead |
| Masthead | `({png_path, title})` | `{url}` → Delivery |
| Author Voice | `(author_key)` | `{style_prompt}` → Dialogue |
| Dialogue | `(author_key, {forecast, season_bucket_description, sub_region_description, topic, quote, style_prompt, character_souls})` | `{prose}` → Delivery |
| Unsubscribe Token | `(email_address)` | `{unsubscribe_token}` → Email Template |
| Email Template | `({url, prose, quote, unsubscribe_token})` | `{html}` → Delivery |
| Delivery | `(email_address, {html})` | `email sent` |

### Script Mapping

| Script | Stage | Status |
|--------|-------|--------|
| `garden-dispatch.py` | Orchestrator — runs full DAG | ✅ Active |
| `garden-weather.py` | Weather fetch (NWS + Open-Meteo fallback) | ✅ Active |
| `garden_seasons.py` | Solar term + zone offset lookup | ✅ Active |
| `garden-dialogue.py` | Topic gen + Dialogue + Author voice | ✅ Active |
| `generate_art.py` | Art generation (SD 1.5) | ✅ Active |
| `generate_masthead.py` | Masthead compositing (PIL) | ✅ Active |
| `garden-assembler.py` | Email template assembly | ✅ Active |
| `garden-mailer.py` | Email delivery (Resend) | ✅ Active |
| `garden_log.py` | Logging utilities | ✅ Active |
| `topic_bank_24.py` | 24-term topic bank (current) | ✅ Active |
| `garden-quotes.py` | Quote module | ⚠️ TODO |
| `garden-daily-v2.py` | Old monolithic script | 🗑️ Dead |
| `garden-daily-v3.py` | Old monolithic script | 🗑️ Dead |
| `garden-daily-single-email.py` | Dev/test tool | 🗑️ Dead |
| `fallback-prose.py` | Purpose unclear | ⚠️ Verify |

### TODOs

**Topic Bank** — Spawn agent to generate 14 topics per `(season_bucket, climate_zone_id)` = 24 × 28 × 14 = 9,408 topics. Non-repeat: round-robin per `(season_bucket, climate_zone_id, run_date)`. Store in DB.

**Quote Module (`garden-quotes.py`)** — 24 terms × 14 quotes = 336 quotes. Interface: `get_quote(season_bucket, run_date)`. Non-repeat: cycle all 14 before repeating. Store in `quotes` table with `quote_usage` tracking.

**Title Dict** — Pre-generate titles per `(season_bucket, climate_zone_id, condition)` = 24 × 28 × 6 = 4,032 titles. Currently generated per-run via mistral (slow, inconsistent). Store in DB, look up at dispatch time.

---

## Database Schema (Postgres 14)

Real tables: `subscribers`, `combinations`, `climate_zones`, `daily_runs`, `deliveries`, `micro_seasons`, `author_season_names`, `authors`, `mastheads`, `topic_wheel_state`, `referrals`, `gifts`, `beta_invites`

**Key columns on `subscribers`:**
- `email` BYTEA — `pgp_sym_encrypt(email, key)`
- `email_hash` TEXT — SHA-256 for lookups
- `active` INTEGER — 1=active, 0=cancelled/inactive
- `confirmed_at` TIMESTAMP — set once on email confirmation
- `subscribed_at` TIMESTAMP — updated on every reactivation
- `cancelled_at` TIMESTAMP — set on cancellation
- `subscription_status` TEXT — `active` | `past_due` | `canceled`
- `climate_zone_id` TEXT — FK to `climate_zones(id)`
- `station_code` TEXT — NWS observation station

**Soft delete convention:**
- Cancel: `active=0`, `cancelled_at=NOW()`, `subscription_status='canceled'`
- Reactivate: `active=1`, `cancelled_at=NULL`, `subscription_status='active'`

---

## Test Suite

```bash
# Node.js (API, webhooks, climate, geocoding) — 182 tests, ~7s
cd /opt/plotlines/server && npm test

# Python (full pipeline integration) — 16 tests, ~3 min
python3 -m pytest ~/openclaw/skills/garden-conversation/test_pipeline.py -v
```

**Both green = DAG works. Ship it.**

| Suite | Tests | What it proves |
|-------|-------|---------------|
| `climate.test.js` | 63 | Zone assignment correct for real coordinates |
| `stripe-webhook.test.js` | 11 | Money flow — activation, cancel, renewal |
| `webhook-zipcode-backfill.test.js` | 9 | Zip/geo backfill all 4 cases |
| `geocode-validation.test.js` | 7 | Key West, Juneau, Alaska zones correct |
| `location-outliers.test.js` | ~16 | Extreme locations don't crash |
| `zip-coverage.test.js` | ~8 | Sampled US zip coverage |
| `admin.test.js` | 2 | International subscribers, encryption |
| `test_pipeline.py` | 16 | DB, zones, solar terms, weather, art, dialogue, masthead, dry-run, decryption, zero SQLite |

---

## Backups

**Script:** `/opt/plotlines/ops/backup-db.sh`
**Schedule:** Daily 02:00 UTC
**Destination:** Cloudflare R2 → `outerfit-backups:outerfit-llc/plotlines/`
**Encryption:** GPG before upload (key: `backup@theplotline.net`, private key in Bitwarden)
**Retention:** 7 days local, all in R2

**Restore:**
```bash
bw get notes "PlotLines Backup GPG Key" | gpg --import
rclone copy outerfit-backups:outerfit-llc/plotlines/plotlines_DATE.sql.gz.gpg /tmp/
gpg --decrypt /tmp/plotlines_DATE.sql.gz.gpg | gunzip | PGPASSWORD=plines2026 psql -h localhost -U plotlines plotlines
```

---

## Characters & Models

Each character is an OpenClaw agent with a dedicated model and persona file. Not all appear every day — rotation managed in `garden-dialogue.py`.

| Key | Name | Model | Persona File |
|-----|------|-------|-------------|
| `buckthorn` | Buck Thorn | claude-sonnet-4-6 | `persona-buckthorn.md` |
| `harry-kvetch` | Harry Kvetch | claude-haiku-4-5 | `persona-harry-kvetch.md` |
| `miss-canthus` | Ms. Canthus | claude-haiku-4-5 | `persona-miss-canthus.md` |
| `poppy-seed` | Poppy Seed | claude-opus-4-5 | `persona-poppy-seed.md` |
| `ivy-league` | Ivy League | claude-opus-4-6 | `persona-ivy-league.md` |
| `chelsea-flower` | Chelsea Flower | claude-sonnet-4-5 | `persona-chelsea-flower.md` |
| `buster-native` | Buster Native | claude-opus-4-5 | `persona-buster-native.md` |
| `fern` | Fern Young | claude-sonnet-4-5 | `persona-fern.md` |
| `esther-potts` | Esther Potts | claude-haiku-4-5 | `persona-esther-potts.md` |
| `herb-berryman` | Herb Berryman | claude-sonnet-4-6 | `persona-herb-berryman.md` |
| `muso-maple` | Muso Maple | claude-haiku-4-5 | `persona-muso-maple.md` |
| `edie-bell` | Edie Bell | claude-sonnet-4-6 | `persona-edie-bell.md` |

Characters are invoked via: `openclaw agent --agent <key> --session-id <sid>`

---

## Lookup Files & Data Sources

All static lookup data used by the pipeline.

| File / Source | Content | Used By |
|---------------|---------|---------|
| `authors.json` | 15 author voice style prompts keyed by author_key | `garden-dialogue.py` |
| `persona-*.md` (12 files) | Character soul/personality for each cast member | `garden-dialogue.py` |
| `garden_seasons.py: SOLAR_TERMS` | 24 solar terms — id, name, date, season_bucket, description | `garden_seasons.py` |
| `garden_seasons.py: ZONE_OFFSETS` | Day offsets per zone per season (28 zones) | `garden_seasons.py` |
| `garden_seasons.py: SUB_REGION_ZONES` | ~100 sub-regions → climate_zone_id mapping | `garden_seasons.py` |
| `topic_bank_24.py: TOPIC_BANK_24` | Topics keyed by solar term name (current) ⚠️ TODO: expand to (season_bucket, climate_zone_id) | `garden-dialogue.py` |
| `DB: climate_zones` | 28 climate zone ids + names | All pipeline scripts |
| `DB: micro_seasons` | Micro-seasons per zone (12 or 72 depending on zone) | `garden-dialogue.py` |
| `DB: authors` | Author keys + metadata | `garden-dialogue.py` |
| `DB: combinations` | location_key + author_key + lat/lon + station_code + zone | `garden-dispatch.py` |
| `DB: quotes` ⚠️ TODO | 336 quotes keyed by season_bucket (14 per term) | `garden-quotes.py` (TODO) |
| `DB: quote_usage` ⚠️ TODO | Tracks quote usage per run_date for non-repeat logic | `garden-quotes.py` (TODO) |
| `DB: title_dict` ⚠️ TODO | Pre-generated titles per (season_bucket, climate_zone_id, condition) | `title_dict.py` (TODO) |
| `solar-terms.md` / `SEKKI.md` | Reference docs for 24 solar terms | Documentation only |
| `garden-context-cache.json` | Cached garden context descriptions per location | `garden-dialogue.py` |

---

## Script → Pipeline Stage Mapping

| Script | Stage | Inputs | Outputs |
|--------|-------|--------|---------|
| `server/services/climate.js: assignClimateZone()` | Zone Assignment | `(lat, lon, country)` | `{climate_zone_id, hemisphere}` — runs at signup only |
| `garden-weather.py` | Weather | `(station_code, zipcode)` | `{condition, forecast}` |
| `garden_seasons.py` | Solar Term | `(climate_zone_id, hemisphere)` | `{season_bucket, season_bucket_description}` |
| `server/services/sub-regions.js` | Sub-region | `(station_code, climate_zone_id)` | `{sub_region_description}` |
| `topic_bank_24.py` ⚠️ TODO | Topic | `(season_bucket, climate_zone_id)` | `{topic}` |
| `garden-quotes.py` ⚠️ TODO: doesn't exist | Quote | `(season_bucket)` | `{quote}` |
| `generate_art.py` | Art | `({condition, season_bucket, season_bucket_description})` | `{png_path}` |
| `generate_masthead.py` | Masthead | `({png_path, title})` | `{url}` |
| `title_dict.py` ⚠️ TODO: doesn't exist | Title Dict | `(season_bucket, climate_zone_id, condition)` | `{title}` |
| `authors.json` | Author Voice | `(author_key)` | `{style_prompt}` |
| `persona-*.md` | Character Souls | `(character_key)` | `{character_soul}` |
| `garden-dialogue.py` | Dialogue | `(author_key, {forecast, season_bucket_description, sub_region_description, topic, quote, style_prompt, character_souls})` | `{prose}` |
| `garden-assembler.py` | Email Template | `({url, prose, quote, unsubscribe_token})` | `{html}` |
| `garden-mailer.py` | Delivery | `(email_address, {html})` | `email sent` |
| `garden-dispatch.py` | Orchestrator | all of the above | coordinates full DAG |

---

## Dialogue — History, Memory & Archive

⚠️ **TODO: This section describes current implementation. Needs review and improvement — see TODOs below.**

### Where History Lives

Archive files live at: `~/.openclaw/workspace-garden/memory/<afd_station>/<author_key>/YYYY-MM-DD.md`

One file per day per `(station, author)` combination. Written after each successful dialogue run.

Each archive file contains:
- `**Topic:**` — that day's topic
- `**Quote:**` — that day's quote
- `**Characters:**` — which characters participated
- Weather summary
- Full prose output

### What Gets Included in the Prompt

Two types of history are injected at prompt time:

**1. Topic/Quote dedup (`read_archive_memory`)** — last 7 days
- Reads ONLY `**Topic:**` and `**Quote:**` lines from each archive file
- Injected into `generate_topic()` prompt to prevent repeats
- Lightweight — just the metadata lines, not full prose

**2. Character memory (`read_character_memory`)** — last 7 days
- Reads the FULL archive file content for each character's past conversations
- Injected into each character's prompt at bootstrap and each turn
- Enables callbacks: "Like I said before...", "Remember when we talked about..."
- Can be large — 7 days × full prose per day

### How Archive is Written

After dialogue completes, `write_archive()` writes a single `.md` file with:
- Topic, quote, character list
- Weather summary
- Full prose output

### TODOs

- **Archive lives outside the repo** (`~/.openclaw/workspace-garden/`) — not backed up, not version controlled. Should be stored in Postgres `daily_runs` table (already exists) and served from there.
- **7 days of full prose in every character prompt** — expensive. Should summarize or truncate older entries.
- **No per-character memory** — every character gets the same full archive. Should be filtered to conversations that character actually participated in.
- **`read_character_memory` loads full prose** — at 7 days this can be 10K+ tokens per character before the conversation even starts. Needs a cap or summarization step.
- **Archive path uses `afd_station`** — should use `(station_code, author_key)` to match master query grain.

---

## Object Model (Pipeline Stages)

One row per object. Every input and output explicit. Every group by defined.

| Stage | Group By | Output |
|-------|----------|--------|
| Zone Assignment | `(lat, lon, country)` | `{climate_zone_id, hemisphere}` → stored on subscriber at signup, drives all downstream lookups |
| Weather | `(station_code, zipcode)` | `{condition}` → Art, Title Dict, `{forecast}` → Dialogue |
| Solar Term | `(climate_zone_id, hemisphere)` | `{season_bucket, season_bucket_description}` → Art, Topic, Dialogue |
| Sub-region | `(station_code, climate_zone_id)` | `{sub_region_description}` → Dialogue |
| Topic ⚠️ TODO: generate 14 per `(season_bucket, climate_zone_id)` | `(season_bucket, climate_zone_id)` | `{topic}` → Dialogue |
| Quote ⚠️ TODO: `garden-quotes.py`, 14 per `season_bucket` | `(season_bucket)` | `{quote}` → Dialogue, Delivery |
| Title Dict ⚠️ TODO: pre-generate per group by | `(season_bucket, climate_zone_id, condition)` | `{title}` → Masthead |
| Art | `({condition, season_bucket, season_bucket_description})` | `{png_path}` → Masthead |
| Masthead | `({png_path, title})` | `{url}` → Delivery |
| Author Voice | `(author_key)` | `{style_prompt}` → Dialogue |
| Dialogue | `(author_key, {forecast, season_bucket_description, sub_region_description, topic, quote, style_prompt, character_souls})` | `{prose}` → Delivery |
| Unsubscribe Token | `(email_address)` | `{unsubscribe_token}` → Email Template |
| Email Template | `({url, prose, quote, unsubscribe_token})` | `{html}` → Delivery |
| Delivery | `(email_address, {html})` | `email sent` |

---

## Script / File → Object Mapping

| Script / File | Object | Group By |
|---------------|--------|----------|
| `server/services/climate.js: assignClimateZone()` | Zone Assignment | `(lat, lon, country)` | `{climate_zone_id, hemisphere}` — runs at signup only |
| `garden-weather.py` | Weather | `(station_code, zipcode)` |
| `garden_seasons.py: SOLAR_TERMS` | Solar Term + `season_bucket_description` | `(climate_zone_id, hemisphere)` |
| `garden_seasons.py: ZONE_OFFSETS` | Zone offsets (28 zones) | `(climate_zone_id)` |
| `garden_seasons.py: SUB_REGION_ZONES` | Sub-region → zone mapping (~100 regions) | `(sub_region_id)` |
| `server/services/sub-regions.js` | Sub-region description | `(station_code, climate_zone_id)` |
| `topic_bank_24.py` ⚠️ TODO | Topic | `(season_bucket, climate_zone_id)` |
| `garden-quotes.py` ⚠️ TODO: doesn't exist | Quote | `(season_bucket)` |
| `generate_art.py` | Art | `({condition, season_bucket, season_bucket_description})` |
| `generate_masthead.py` | Masthead | `({png_path, title})` |
| `title_dict.py` ⚠️ TODO: doesn't exist | Title Dict | `(season_bucket, climate_zone_id, condition)` |
| `authors.json` | Author Voice (15 voices) | `(author_key)` |
| `persona-*.md` (12 files) | Character Souls | `(character_key)` |
| `garden-context-cache.json` | Garden context description | `(station_code)` |
| `archive/<station>/<author>/YYYY-MM-DD.md` | Dialogue history | `(station_code, author_key, date)` |
| `garden-dialogue.py` | Dialogue | `(author_key, {forecast, season_bucket_description, sub_region_description, topic, quote, style_prompt, character_souls})` |
| `garden-assembler.py` | Email Template | `({url, prose, quote, unsubscribe_token})` |
| `garden-mailer.py` | Delivery | `(email_address, {html})` |
| `garden-dispatch.py` | Orchestrator | all objects |
| `DB: climate_zones` | 28 zone ids + names | `(climate_zone_id)` |
| `DB: combinations` | Station + author + lat/lon + zone | `(station_code, author_key)` |
| `DB: subscribers` | All subscriber data (encrypted) | `(email_address)` |
| `DB: daily_runs` | Per-run output record | `(combination_id, run_date)` |
| `DB: deliveries` | Per-subscriber send record | `(subscriber_id, daily_run_id)` |

---

## Dialogue Breakdown

| Step | What Happens | Inputs | Notes |
|------|-------------|--------|-------|
| Character selection | Pick 3–5 randomly from 12 | `(author_key, --num-chars)` | `random.sample(CAST, 3-5)`, then shuffled |
| Session bootstrap | Spawn one OpenClaw session per character | `(character_key, model)` | One persistent session per run |
| Character bootstrap | Each character gets first prompt, says hello | `{name, date, season_context, topic, quote, weather_report, garden_context, char_memory, convo_so_far}` | One turn each in order |
| Dialogue loop | Characters take turns, weighted random speaker | Last 6 turns of `{hist}` + `{char_memory, other_personas, weather_report, garden_context, topic, quote}` | 6–10 turns, max `total_turns × 3` attempts |
| Speaker weighting | Previous speaker gets 0.1 weight, others 1.0 | `(last_speaker_idx)` | Prevents monologue |
| Other personas | Every non-speaking character's full persona injected | `persona-*.md` for all others | So each knows who they're talking to |
| Character memory | Last 7 days full archive per character | `archive/<station>/<author>/` | Injected every turn |
| Retry logic | 2 retries per turn if output fails parse | `(output, dt, SLOW_CALL_S=30s)` | Falls back if slow or fallbackish |
| Author voice — haiku pass | Haiku drafts prose from raw dialogue | `{hist, author_style}` | 120s timeout |
| Author voice — sonnet pass | Sonnet refines to final prose | `{haiku_draft, author_style}` | **800 char hard limit** |
| Archive write | Full conversation saved to `.md` | `(topic, quote, weather, prose, participants)` | `archive/<station>/<author>/YYYY-MM-DD.md` |

---

## Art Generation

| Step | What Happens | Inputs | Notes |
|------|-------------|--------|-------|
| Base style | Always-on aesthetic | hardcoded | `"folksy illustration, hand-drawn, vintage botanical print, old-world charm, not photorealistic, not digital"` |
| Seasonal style | 1-2 styles sampled per season | `(season_bucket)` | Spring: `botanical watercolor, risograph print, pressed flower` Summer: `silkscreen, gouache, folk art` Fall: `etching, linocut, woodcut` Winter: `woodblock print, ink wash, engraving` |
| Subject | Zone + season subject matter | `(climate_zone_id, season_bucket)` | ⚠️ TODO: 22 of 28 zones fall to `high_plains` default |
| Weather modifier | Lighting/tone | `(condition)` | `sunny`=warm/high contrast `cloudy`=muted/flat `rainy`=wet/dark `snowy`=sparse/white `frost`=pale blue `heat`=ochre/bleached |
| Solar term cue | First sentence of `season_bucket_description` | `(season_bucket_description)` | Grounds image in the specific seasonal moment |
| **Full prompt** | **Assembly** | **all above** | `"{base_style}, {seasonal_style}, {subject}, {term_cue}, {topic_hint}, {weather_modifier}, garden scene, no text, no people"` |
| Negative prompt | Block unwanted output | hardcoded | `"photorealistic, photograph, camera, DSLR, stock photo, 3d render, CGI, ugly, blurry, watermark, text, logo, people, faces"` |
| Model load | Load diffusion pipeline once | `MODEL_ID` (SDXL) | `torch.float16`, CUDA, loaded once per batch |
| Generation | Run diffusion | `(prompt, negative_prompt)` | 30 steps, guidance 7.5, native 1024×384 |
| Resize | Crop to masthead dimensions | `1024×384 → 700×200` | LANCZOS resample |
| Cache | Save PNG | `(zone, term_id, condition)` hash | `ART_DIR/generated/` — model-agnostic |
| VRAM cleanup | Unload model | — | `del pipe` + `torch.cuda.empty_cache()` |

---

## Operational Directories

Working directories used to pass objects between pipeline scripts.

| Directory | Path | Contents | Passed Between |
|-----------|------|----------|----------------|
| Run dir | `/opt/plotlines/data/runs/YYYY-MM-DD/` | All per-run working files | dispatch → all scripts |
| Weather cache | `runs/YYYY-MM-DD/weather_<station>.json` | `{condition, forecast, weather_report}` | dispatch → dialogue, art |
| Subscriber files | `runs/YYYY-MM-DD/subscribers_<station>_<author>.json` | `[{email, unsubscribe_token}]` | dispatch → mailer |
| Dialogue cache | `runs/YYYY-MM-DD/dialogue_<station>_<author>.json` | `{prose, topic, quote, characters}` | dispatch → assembler |
| Prose cache | `/opt/plotlines/data/prose-cache/YYYY-MM-DD/` | Author voice refined prose | dispatch → assembler |
| Art cache | `/opt/plotlines/data/mastheads/art/generated/` | PNG keyed by `(zone, term_id, condition)` hash | generate_art → masthead |
| Masthead output | `/opt/plotlines/data/mastheads/` | Final composited PNG, served via `/mastheads/*` | generate_masthead → assembler → email |
| Archive | `skills/garden-conversation/archive/<station>/<author>/YYYY-MM-DD.md` | Full conversation history | dialogue → next day's dialogue |
