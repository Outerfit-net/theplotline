# Plot Lines — TODO
*Last Updated: 2026-03-07*
*Keep this in sync with THE-GARDEN-architecture.md. When a TODO is done, mark it ✅ and note the commit.*

---

## 🔴 CRITICAL — App Correctness

### C1. Master Query — add climate_zone_id, hemisphere, lat, lon
**Status:** ✅ DONE — commit `b4d45f5`

### C2. Master Query — collapse to single GROUP BY query with JSON_AGG
**Status:** ✅ DONE — commit `b4d45f5` — `_load_combos()` replaces `_load_combinations()` + `_load_subscribers()`

### C3. Solar Term — hemisphere not used
**Status:** ✅ DONE — commit `c94a3a7` — `get_current_solar_term(date, zone, hemisphere)` flips spring↔fall, summer↔winter for S hemisphere

### C4. SUBJECTS_BY_ZONE_SEASON — all 28 zones
**Status:** ✅ DONE — commit `6d8f199` — 112 entries (28 zones × 4 seasons), old key names migrated

### C5. Node.js server routes still use `?` placeholder shim
**File:** `server/routes/subscribers.js`, `server/routes/stripe.js`, all routes
**Issue:** `index.js` has a shim converting `?` → `$1,$2` for Postgres. Works but fragile — any `?` in a string value breaks it. Migrate to native `$1` syntax.
**Status:** ⬜ TODO

### C6. `fallback-prose.py` — purpose unknown
**Status:** ✅ DONE — commit `b7696ae` — confirmed dead, deleted

### C7. Dead scripts — delete or archive
**Status:** ✅ DONE — commit `b7696ae` — deleted garden-daily-v2/v3, garden-daily-single-email, fallback-prose

---

## 🟡 CONTENT — Missing Pipeline Components

### P1a. Topic Bank — current active zone+season combos
**Status:** ✅ DONE — agent generated 42 topics (14 per combo), `get_topic(term, bucket, zone)` function with fallback chain added to `topic_bank_24.py`; dialogue now calls `get_topic()`

### P1b. Topic Bank — full expansion to all 28 zones × 24 terms (do later)
**Spec:** 24 terms × 28 zones × 14 topics = 9,408 topics
**Action:** Spawn model in a loop, one zone+term at a time, collect results, store in `topics` DB table
**Status:** ⬜ LATER

### P2. Quote Module — `garden-quotes.py` (doesn't exist)
**Spec:** 24 solar terms × 14 quotes = 336 quotes
**Interface:** `get_quote(season_bucket, run_date)` → `{text, attribution}`
**Storage:** `quotes` table `(id, text, attribution, season_bucket)`
**Non-repeat:** `quote_usage` table `(quote_id, run_date)` — cycle all 14 before repeating
**Status:** ⬜ TODO

### P3. Title Dict — `title_dict.py` (doesn't exist)
**Spec:** Pre-generate titles per `(season_bucket, climate_zone_id, condition)` = 24×28×6 = 4,032 titles
**Issue:** Currently generated per-run via mistral with 30s timeout — slow and inconsistent
**Storage:** `title_dict` DB table, look up at dispatch time
**Status:** ⬜ TODO

### P4. DB tables for P1/P2/P3
**Tables needed:**
- `topics (id, text, season_bucket, climate_zone_id, used_date)`
- `quotes (id, text, attribution, season_bucket)`
- `quote_usage (quote_id, run_date)`
- `title_dict (id, title, season_bucket, climate_zone_id, condition)`
**Status:** ⬜ TODO

---

## 🟡 DIALOGUE — Code Review & Sync

### D1. Full dialogue code review
**Status:** ✅ DONE — `--zone` + `--hemisphere` now passed from dispatch; solar term correct per subscriber; commits `e6dac06`
**Remaining sub-item:** Quote still from hardcoded QUOTE_BANK — blocked on P2 (garden-quotes.py)

### D2. Character memory — filter to participated conversations
**Status:** ✅ DONE — commit `967ad56` — reads `**Characters:**` line, only includes conversations char appeared in

### D3. Dialogue archive → Postgres
**Status:** ✅ DONE — commit `b17bdd3` — upserts to `daily_runs` on each non-dry-run dispatch; combination_id now in master query

### D4. `garden_seasons.py` — full review
**Status:** ✅ DONE — all 28 zones in ZONE_OFFSETS; `get_current_solar_term(date, zone, hemisphere)` with S-flip; tropical zones return wet_season/dry_season; commits `c94a3a7` + `187ef83`

---

## 🟡 DATA & PRIVACY

### DA1. Automated deletion — subscribers cancelled > 3 months
**Issue:** Policy is 3-month retention after cancellation. No automated process exists.
**Fix:** Cron job or scheduled task to delete subscribers where `cancelled_at < NOW() - INTERVAL '3 months'`
**Status:** ⬜ TODO

### DA2. Delete on request (GDPR/CCPA)
**Issue:** No delete-on-request flow exists.
**Fix:** API endpoint + admin UI to permanently delete subscriber data
**Status:** ⬜ TODO

---

## 🟢 TESTS — Review & Expand

### T1. Full test suite review
**Task:** Review every test in `server/__tests__/` and `test_pipeline.py` against the approved architecture.
- Does each test test what we've decided is true?
- Are group bys correct?
- Are zone names current (28 zones, no old names)?
- Are encrypted field assertions using correct column names (`email_enc` not `email`)?
**Status:** ⬜ TODO

### T2. Add missing Node.js tests
Tests we need that don't exist:
- Signup flow end-to-end: form → geocode → zone → DB insert
- Duplicate email handling (active sub blocked, inactive reactivated)
- Confirmation email flow: confirm_token → confirmed_at set
- Cancel flow: unsubscribe_token → active=0
- Reactivation flow: cancelled subscriber can resubscribe
- Stripe referral: referee payment → referrer gets free month
- Zone assignment: verify `assignClimateZone` returns correct zone for all 28 zone boundaries
**Status:** ⬜ TODO

### T3. Add missing Python pipeline tests
Tests we need that don't exist:
- Master query returns correct GROUP BY grain `(station_code, zipcode, author_key, climate_zone_id, hemisphere)`
- `JSON_AGG(subscribers)` contains correct fields per combo
- Solar term flips correctly for southern hemisphere zones
- Art prompt contains `BASE_STYLE` string
- Art prompt contains seasonal style matching season_bucket
- Topic lookup uses `(season_bucket, climate_zone_id)` — not just season
- Quote non-repeat: same quote not returned twice within 14 days
- Weather fetch uses lat/lon for NWS gridpoint (7 forecast periods returned)
- Dispatch pre-flight: fails gracefully if Postgres unreachable
- Dispatch pre-flight: fails gracefully if Ollama unreachable
- Dispatch pre-flight: alerts if stale zone names in DB
- All 4 active subscribers receive email in dry-run
**Status:** ⬜ TODO

### T4. Pre-flight checks — build into dispatch
**Status:** ✅ DONE — commit `9b780df` — `_preflight()` checks DB, stale zones, Ollama, SMTP, NWS; hard-stops with Telegram alert on any error

---

## ✅ DONE

- [x] Zero SQLite — all Python scripts use psycopg2, Node uses pg via shim
- [x] Persona files in repo (`skills/garden-conversation/persona-*.md`)
- [x] Dialogue archive in repo (`skills/garden-conversation/archive/`)
- [x] Art cache dir model-agnostic (`art/generated/`)
- [x] BASE_STYLE added to art generation prompt
- [x] `flux` renamed to `generated` everywhere
- [x] Combinations vs subscribers split in dispatch (BOU=2 bug fixed)
- [x] Weather uses lat/lon for NWS gridpoint forecast
- [x] Zone names migrated in DB (alaska→alaska_south_coastal, etc.)
- [x] 28 zones seeded in climate_zones table
- [x] Node tests: --runInBand, 182 meaningful tests
- [x] Python pipeline tests: test_pipeline.py 16 tests
- [x] Architecture doc: complete rewrite with object model, DAG diagrams, all tables
- [x] Webhook backfill: split zip/geo logic, subscriber zip preferred
- [x] florida_keys wet season: "Hurricane Season" → "Wet Season"
