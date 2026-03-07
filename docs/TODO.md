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
**Status:** ✅ DONE — commit `5c3628a` — all routes migrated to native `$N` placeholders, shim removed from `index.js`

### C6. `fallback-prose.py` — purpose unknown
**Status:** ✅ DONE — commit `b7696ae` — confirmed dead, deleted

### C7. Dead scripts — delete or archive
**Status:** ✅ DONE — commit `b7696ae` — deleted garden-daily-v2/v3, garden-daily-single-email, fallback-prose

### C8. `_run_dialogue` zone/hemisphere as free variables (was)
**Status:** ✅ DONE — commit `f776831` — fixed: now explicit params

### C9. `garden_context` not zone-aware — always fetched for `(city, state, location_key)` only
**File:** `garden-dialogue.py: fetch_garden_context()`
**Issue:** Context is cached by `location_key` only. Two subscribers in same city but different zones would share context. Minor — but the context prompt also has no zone-specific language injected.
**Fix:** Cache key should include `climate_zone_id`; prompt should include zone-specific context
**Status:** ✅ DONE — commit `1fcb0cd` — new signature `fetch_garden_context(climate_zone_id, sub_region, season_bucket)`; cache key is `zone:sub_region:season_bucket`; prompt is zone/season-aware; city/state/location_key dropped entirely

### C10. Prose cache keyed by `(today, author, zone)` — not `(station_code, author, zone)`
**File:** `garden-dialogue.py: cache_path(today, author, zone)`
**Issue:** Two stations in the same zone + same author would share a prose cache entry. `BOU/hemingway/high_plains` and a hypothetical `DEN/hemingway/high_plains` would collide.
**Fix:** Add `station_code` to cache key: `f"{author}_{station}_{zone}.json"`
**Status:** ✅ DONE — commit `70f999e` — cache key is now `(date, climate_zone_id, sub_region, author_key)`; station_code dropped (not part of dialogue grain); sub_region added (nullable, stored as 'none')

### C11. `season_bucket` passed to `get_newsletter_title()` but not `climate_zone_id`
**File:** `garden-dispatch.py: get_newsletter_title()` call at masthead step
**Issue:** Title generation doesn't know the zone — can't generate zone-specific titles until title_dict is wired. After P3 is done, update the call to pass `climate_zone_id` too.
**Fix:** Pass `zone` to `get_newsletter_title()` and on to `get_title()` once P3 is wired
**Status:** ✅ DONE — `climate_zone_id` was already being passed through (TODO was stale). title_dict cleaned up: deleted `foggy` rows (never matches), added `frost` + `heat` for all 3 active zones × current season_bucket. 21 rows, all 3 zones × 7 conditions covered. Condition buckets expanded to 7 (added `windy`), classify_condition ordering fixed.

---

## 🟡 CONTENT — Missing Pipeline Components

### P1a. Topic Bank — current active zone+season combos
**Status:** ✅ DONE — agent generated 42 topics (14 per combo), `get_topic(term, bucket, zone)` function with fallback chain added to `topic_bank_24.py`; dialogue now calls `get_topic()`

### P1b. Topic Bank — full expansion to all 28 zones × 24 terms (do later)
**Spec:** 24 terms × 28 zones × 14 topics = 9,408 topics
**Action:** Spawn model in a loop, one zone+term at a time, collect results, store in `topics` DB table
**Status:** ⬜ LATER

### P2. Quote Module — `garden-quotes.py`
**Spec:** 24 solar terms × 14 quotes = 336 quotes
**Interface:** `get_quote(term_name, run_date, station_code)` → `{text, attribution}`
**Storage:** `quote_usage` table for non-repeat tracking
**Status:** ✅ DONE — `garden_quotes.py` exists with 336 quotes, wired into `garden-dialogue.py` via `from garden_quotes import get_quote`; QUOTE_BANK removed from dialogue; `quote_usage` table in Postgres

### P3. Title Dict — `title_dict.py`
**Spec:** Pre-generate titles per `(season_bucket=sekki_name, climate_zone_id, condition)` = up to 4,704 titles (24 sekki × 28 zones × 7 conditions)
**Issue:** Was generated per-run via mistral with 30s timeout — slow and inconsistent
**Storage:** `title_dict` DB table, look up at dispatch time
**Status:** ✅ DONE — `title_dict.py` exists, wired into `garden-dispatch.py` via `get_or_create_title(sekki_name, climate_zone_id, condition)`; self-populates on miss (generates all 7 conditions at once via phi4); grain corrected to sekki name not coarse bucket.

### P4. DB tables for P1/P2/P3
**Tables needed:**
- `quote_usage (quote_id, station_code, run_date)` — non-repeat tracking for quotes
- `title_dict (id, title, season_bucket, climate_zone_id, condition)` — cached titles
- `topics (id, text, season_bucket, climate_zone_id, used_date)` — for topic non-repeat tracking
**Note:** `quotes` table not needed — 336 quotes live in-memory in `garden_quotes.py`; `quote_usage` handles non-repeat correctly (14-day window per station). Topics have NO non-repeat tracking at all — same topic can repeat daily.
**Status:** ✅ DONE — `quote_usage` ✅ (14-day non-repeat per station), `title_dict` ✅ (18 rows seeded, grows over time), `topic_usage` ✅ (14-day non-repeat per station, table created, wired into `get_topic()` + `garden-dialogue.py`). `quotes` table not needed — quotes are in-memory dict, `quote_usage` handles state.

---

## 🟡 DIALOGUE — Code Review & Sync

### D1. Full dialogue code review
**Status:** ✅ DONE — `--zone` + `--hemisphere` now passed from dispatch; solar term correct per subscriber; commits `e6dac06`; QUOTE_BANK removed, now uses `garden_quotes.get_quote()`

### D2. Character memory — filter to participated conversations
**Status:** ✅ DONE — commit `967ad56` — reads `**Characters:**` line, only includes conversations char appeared in

### D3. Dialogue archive → Postgres
**Status:** ✅ DONE — commit `b17bdd3` — upserts to `daily_runs` on each non-dry-run dispatch; combination_id now in master query

### D4. `garden_seasons.py` — full review
**Status:** ✅ DONE — all 28 zones in ZONE_OFFSETS; `get_current_solar_term(date, zone, hemisphere)` with S-flip; tropical zones return wet_season/dry_season; commits `c94a3a7` + `187ef83`

---

## 🟡 WEATHER

### W1. Condition bucket not zip-specific
**Issue:** `classify_condition()` reads the NWS observation station's current reading at 5:30 AM dispatch time. For subscribers like Grand Junction vs Vail — same NWS grid area, very different actual conditions. The right answer is a 6-hour-ahead forecast per zipcode (available from NWS/Open-Meteo but not implemented).
**Known limitation:** condition drives art and title selection only — not a correctness issue, just a quality one.
**Status:** ⬜ LATER — not worth the complexity now

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

### T1. Full test suite review (ongoing — add as gaps found)
**Task:** Review every test in `server/__tests__/` and `test_pipeline.py` against the approved architecture.
- Does each test test what we've decided is true?
- Are group bys correct?
- Are zone names current (28 zones, no old names)?
- Are encrypted field assertions using correct column names (`email_enc` not `email`)?
**Status:** ✅ DONE — commit `06b2168` — only issue found: stale `alaska` zone name in geocode-validation.test.js *comments* (not assertions). Fixed. All assertions already correct.

### T2. Add missing Node.js tests
**Status:** ✅ DONE — commit `8225aef` — signup-flow.test.js (6 tests) + master-query.test.js (5 tests); 193 passing total
**Remaining:** Stripe referral test (blocked on P2/P3 completion)

### T3. Add missing Python pipeline tests
Tests we need that don't exist:
- Master query returns correct GROUP BY grain `(station_code, zipcode, author_key, climate_zone_id, hemisphere)` — ✅ already in master-query.test.js
- `JSON_AGG(subscribers)` contains correct fields per combo — ✅ already in master-query.test.js
- Solar term flips correctly for southern hemisphere zones — ✅ already in test_pipeline_extended.py
- Art prompt contains `BASE_STYLE` string — ✅ added
- Art prompt contains seasonal style matching season_bucket — ✅ added (4 seasons × parametrize)
- Topic lookup uses `(season_bucket, climate_zone_id)` — ✅ added (zone param + usage recorded)
- Quote non-repeat: same quote not returned twice within 14 days — ✅ added
- Weather fetch uses lat/lon for NWS gridpoint (7 forecast periods returned) — ✅ added
- Dispatch pre-flight: fails gracefully if Postgres unreachable — ✅ added
- Dispatch pre-flight: fails gracefully if Ollama unreachable — ✅ added
- Dispatch pre-flight: alerts if stale zone names in DB — ✅ added (via cursor mock)
- All 4 active subscribers receive email in dry-run — ✅ added (reads count from DB dynamically)
**Status:** ✅ DONE — commit `ea61ca8` — `test_pipeline_t3.py` added, 16 tests (15 fast + 1 slow dispatch)

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
