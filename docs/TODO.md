# Plot Lines — TODO
*Last Updated: 2026-03-07*
*Keep this in sync with THE-GARDEN-architecture.md. When a TODO is done, mark it ✅ and note the commit.*

---

## 🟡 ART — Prompt Quality

### AR3. Art requires weather — enforce dependency explicitly
**Issue:** Art generation falls back to `cloudy` when `weather_condition` is null (subscriber has no cached weather). This causes wrong cache key and wrong imagery. The art stage must not run without a real weather condition.
**Fix:** In dispatch, enforce that weather runs before art. If `weather_condition` is null at art time, fail loudly rather than silently falling back to `cloudy`.
**File:** `garden-dispatch.py` — art stage dependency check
**Status:** ⬜ TODO

### AR1. Climate zone underscores in prompt — transform for readability
**Issue:** `<climate_zone>florida_keys_tropical</climate_zone>` — underscores may confuse the model. Should be `florida keys tropical`.
**Fix:** In `build_prompt()`, replace underscores with spaces before injecting zone into `<climate_zone>` tag.
**File:** `generate_art.py: build_prompt()`
**Status:** ⬜ TODO

### AR2. Art styles library — comprehensive technique list for randomized prompt injection (NICE TO HAVE)
**File:** `generate_art.py` — add `ART_STYLES` data structure
**Spec:** Create a data structure containing the full style list below. In the prompt build process, randomly inject 3–4 techniques into `<style>`. Techniques could be interpolated or weighted by season.

**Full style list:**
- Watercolor (loose, detailed)
- Pastel (oil pastel, pencil pastel, PanPastel)
- Gouache
- Colored pencil
- Graphite
- Silverpoint
- Egg tempera
- Acrylic
- Oil
- Charcoal
- Minimalist line art
- Abstract botanical
- Block print (woodblock, woodcut, linocut, white-line woodcut, wood engraving)
- Ukiyo-e
- Ink print
- Hand-drawn doodle
- Risograph
- Lithograph (chromolithograph, vintage lithograph)
- Engraving
- Photogram
- Cyanotype
- Stippling
- Cross-hatching
- Florilegium
- Monograph illustration
- Trompe l'oeil
- Cel shading
- L-system rendering
- Halftoning
- Impressionist
- Expressionist
- Gothic floral
- Eco-printing

**Status:** ⬜ NICE TO HAVE

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
**Status:** ✅ DONE — `title_dict.py` wired into `garden-dispatch.py` via `get_or_create_title(sekki_name, climate_zone_id, condition)`; on miss generates all 7 conditions in one batch prompt via Claude Haiku (openclaw agent — no API key needed); grain is sekki name × 28 zones × 7 conditions = 4,704. Prompt uses XML tags (`<instructions>`, `<context>`, `<priority>`) with zone+condition in `<priority>` for differentiation. Publication types drawn from 50-item historical list.

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

### W2. Weather fetch incomplete — missing current obs, AFD, full 10-day
**Issue:** Weather fetch returns 3 nulls where it should return data:
1. **Current conditions** — `temp_f`, `wind_mph`, `description` all null (obs station not returning current reading)
2. **AFD** — `afd_summary` is null — `fetch_weather()` called with `summarize=False`, AFD never processed
3. **Forecast** — only 7 periods returned, should be 10-day
**Fix:** Pass `--summarize` to `garden-weather.py` in `_run_weather()`; debug obs station current reading; extend forecast periods.
**Status:** ⬜ TODO

---

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

### T5. Modularize Python test suite — never run all tests at once
**Issue:** Running `pytest test_pipeline*.py` hits the full pipeline including dialogue (2+ min, spawns LLM calls). Tests need to be modular so individual classes/modules can be run in isolation.
**Fix:** Split into focused test files by module (test_art.py, test_weather.py, test_dialogue.py etc). Update SKILL.md for plotlines-agent and plotlines-interactive to explicitly forbid running the full pytest suite without permission.
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

---

### A1. Art prompt — wrong grain and bad sekki cue
**Issue:** Two problems with `generate_art.py` `build_prompt()`:
1. **Zone subjects use coarse season bucket** (`spring/summer/fall/winter`) not sekki — `high_plains/spring` always gives `crocus shoots, bare soil, frost-touched grass` regardless of which of the 6 spring sekki we're in. Should use sekki name or description to drive subject.
2. **Sekki cue = first sentence of description only** (`split(".")[0]`) — for Awakening of Insects this is `"Turn over a clod of earth and you'll find them: pale worms, a beetle tucking back into the dark"` which caused SDXL to paint a cockroach. Should use a garden-focused extract from the full description, not the opening sentence verbatim.
**Fix:** Replace `SUBJECTS_BY_ZONE_SEASON` lookup with sekki-aware subjects; replace `term_cue = term["description"].split(".")[0]` with a curated garden-focused phrase derived from the full description.
**Status:** ⬜ TODO

---

### D1. --no-send flag not respected by mailer
**Issue:** `--no-send` flag does not prevent email delivery. Dispatch sent 2 emails during masthead stage of step-through when it should have held. The `no_send` value is not being passed correctly through to the `send()` function call path.
**Fix:** Trace `no_send` through `run_dispatch` → `send()` — likely a missing pass-through somewhere in the call chain.
**Status:** ⬜ TODO

---

### W3. Test subscribers missing zipcode — never went through Stripe webhook
**Issue:** BOU/hemingway and KEY/munro subscribers have no zipcode because they were created directly in DB, bypassing the Stripe checkout webhook that backfills `postal_code` from Stripe billing address. The backfill code in `stripe.js` is correct but never fired.
**Fix:** Manually backfill zipcodes for test subscribers: mdcscry@yahoo.com (80302), moltibot@agentmail.to (80302), outerfit.net@gmail.com (33040). Run UPDATE via admin or psql with encryption.
**Status:** ⬜ TODO

---

### CH1. Muso Maple persona hardcoded to Colorado — refuses to engage in other zones
**Issue:** `persona-muso-maple.md` references "Colorado's high plains" explicitly in the 72 micro-seasons section. When Muso runs for an Alaska subscriber, the model takes the geographic identity so seriously it refuses to discuss Alaskan gardening at all. The "stateless" framing already in the file ("Japanese garden principles translate to any climate. The maple species changes. The silence doesn't.") is the right idea but gets overridden by the Colorado specifics.
**Fix:** Remove or generalize the Colorado reference. Replace with zone-adaptive language — Muso applies the 72 micro-season *principle* to whatever zone he's in, not Colorado specifically.
**Status:** ⬜ TODO

---

### W4. wind_mph field may be pulling gust reading instead of sustained wind
**Issue:** KEY station reported `wind_mph: 58.0` on 2026-03-07 while the NWS forecast text only mentioned 15–20 knots (~17–23 mph). The current observation field may be pulling a peak gust, not the sustained wind speed, from the NWS obs API.
**Fix:** Check the NWS obs JSON field being used for `wind_mph` — if it's `windGust` or a combined field, switch to `windSpeed` (sustained). Key West sits on open water so gust spikes are common and unrepresentative. Show both sustained + gust in the report when they differ significantly. The NWS narrative text (forecast/AFD) is the reliable piece — use that as the source of truth for prose. Add a sanity cap or warning if wind_mph > 50 mph and no storm/hurricane condition is present.
**Status:** ⬜ TODO
