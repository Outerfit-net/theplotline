# Plot Lines — TODO
*Last Updated: 2026-03-07*
*Keep this in sync with THE-GARDEN-architecture.md. When a TODO is done, mark it ✅ and note the commit.*

---

## 🔴 CRITICAL — App Correctness

### C1. Master Query — add climate_zone_id, hemisphere, lat, lon
**File:** `skills/garden-conversation/garden-dispatch.py: _load_combinations()`
**Issue:** Master query GROUP BY is missing `climate_zone_id`, `hemisphere`, `lat`, `lon`. These are needed for Solar Term, Art, Topic, Title Dict, and Weather (lat/lon for NWS gridpoint).
**Expected:** GROUP BY `(station_code, zipcode, author_key, climate_zone_id, hemisphere, lat, lon)` with `JSON_AGG(subscribers)`
**Status:** ⬜ TODO

### C2. Master Query — collapse to single GROUP BY query with JSON_AGG
**File:** `skills/garden-conversation/garden-dispatch.py`
**Issue:** Currently two separate queries (`_load_combinations` + `_load_subscribers`). Should be one query grouped by `(station_code, zipcode, author_key, climate_zone_id, hemisphere, lat, lon)` with `JSON_AGG({email, unsubscribe_token})`.
**Status:** ⬜ TODO

### C3. Solar Term — hemisphere not used
**File:** `skills/garden-conversation/garden_seasons.py: get_current_solar_term()`
**Issue:** Southern hemisphere subscribers get wrong solar terms — seasons are not flipped. `hemisphere` parameter missing from function signature.
**Fix:** Accept `hemisphere` param, flip season bucket if `S` (spring↔fall, summer↔winter)
**Status:** ⬜ TODO

### C4. SUBJECTS_BY_ZONE_SEASON — only 6 of 28 zones covered
**File:** `skills/garden-conversation/generate_art.py`
**Issue:** 22 of 28 zones fall through to `high_plains` default subjects. Key West, Juneau, Seattle all get wrong art subjects.
**Fix:** Add subjects for all 28 zones × 4 seasons
**Status:** ⬜ TODO

### C5. Node.js server routes still use `?` placeholder shim
**File:** `server/routes/subscribers.js`, `server/routes/stripe.js`, all routes
**Issue:** `index.js` has a shim converting `?` → `$1,$2` for Postgres. Works but fragile — any `?` in a string value breaks it. Migrate to native `$1` syntax.
**Status:** ⬜ TODO

### C6. `fallback-prose.py` — purpose unknown
**File:** `skills/garden-conversation/fallback-prose.py`
**Issue:** Not documented, unclear if still used. Verify and either document or delete.
**Status:** ⬜ TODO

### C7. Dead scripts — delete or archive
**Files:** `garden-daily-v2.py`, `garden-daily-v3.py`, `garden-daily-single-email.py`
**Issue:** Old monolithic scripts superseded by dispatch. Cluttering the repo.
**Status:** ⬜ TODO

---

## 🟡 CONTENT — Missing Pipeline Components

### P1. Topic Bank — expand to `(season_bucket, climate_zone_id)`
**File:** `skills/garden-conversation/topic_bank_24.py`
**Issue:** Currently keyed on solar term name only. Needs `(season_bucket, climate_zone_id)` grain — a topic for "Awakening of Insects" in `florida_keys_tropical` should differ from `alaska_interior`.
**Spec:** 24 terms × 28 zones × 14 topics = 9,408 topics
**Non-repeat:** Round-robin per `(season_bucket, climate_zone_id)` tracked in DB
**Action:** Spawn agent to generate all topics, store in `topics` DB table
**Status:** ⬜ TODO

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
**File:** `skills/garden-conversation/garden-dialogue.py`
**Tasks:**
- Verify `get_current_solar_term()` is called with `(date, climate_zone_id, hemisphere)` not just date
- Verify topic is loaded from `(season_bucket, climate_zone_id)` not just random
- Verify quote is loaded from module not hardcoded bank
- Verify `garden_context` (sub-region description) is passed correctly
- Verify `char_memory` is filtered to conversations that character participated in (not all characters getting full archive)
- Verify 800 char limit is enforced and logged when hit
- Verify archive is written to `skills/garden-conversation/archive/` (SKILLS_DIR) not workspace/memory
**Status:** ⬜ TODO

### D2. Character memory — filter to participated conversations
**File:** `skills/garden-conversation/garden-dialogue.py: read_character_memory()`
**Issue:** Every character gets full archive of all conversations. Should only see conversations they participated in (check `**Characters:**` line in archive).
**Status:** ⬜ TODO

### D3. Dialogue archive → Postgres
**Issue:** Archive lives in flat files (`archive/station/author/YYYY-MM-DD.md`). Should be stored in `daily_runs` table (already exists) for backup, queryability, and rebuild survival.
**Keep:** Flat files as working cache — but write to DB as source of truth
**Status:** ⬜ TODO

### D4. `garden_seasons.py` — full review
**Issue:** matte_d_scry flagged dissatisfaction. Review:
- Are all 28 zones in `ZONE_OFFSETS`?
- Are southern hemisphere zones correctly offset?
- Is `get_current_solar_term()` callable with `(date, climate_zone_id, hemisphere)`?
- Is `season_bucket_description` the full description text or just the name?
- Are tropical zones (hawaii, florida_keys_tropical, australia_tropical) returning Wet/Dry seasons correctly?
**Status:** ⬜ TODO

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
**File:** `skills/garden-conversation/garden-dispatch.py`
**Spec:** Before sending any email, verify:
1. Postgres reachable, combinations exist
2. All active subscribers have valid decrypted emails
3. No stale zone names in DB (`alaska`, `humid_southeast`, `upper_midwest`)
4. Ollama up, required models loaded
5. NWS reachable (or Open-Meteo fallback available)
6. Resend API key valid
**On failure:** Hard stop + Telegram alert to 8233843319. No emails sent.
**Post-run:** Log "DISPATCH OK: N sent, 0 failed" or alert with specifics.
**Status:** ⬜ TODO

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
