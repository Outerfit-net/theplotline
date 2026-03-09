# Plot Lines — TODO
*Last Updated: 2026-03-08*
*Keep this in sync with THE-GARDEN-architecture.md. When a TODO is done, mark it ✅ and note the commit.*

---

## 🔴 EMAIL — Sender Identity

### EML1. Email deliverability — From, Reply-To, List-Unsubscribe
**Issue:** Emails landing in spam. SPF/DKIM/DMARC are set. Remaining gaps:

1. **From fixed** ✅ — `PlotLines@theplotline.net` (commit 5d36ebd)
2. **Reply-To** ✅ — `support@theplotline.net` (commit 49ace8a)
3. **List-Unsubscribe header missing** — required by Gmail/Yahoo for bulk senders. Add to `_send_one()`:
   ```python
   msg['List-Unsubscribe'] = f'<{unsub_url}>, <mailto:unsubscribe@theplotline.net?subject=unsubscribe>'
   msg['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
   ```
   The `unsub_url` is already built in `_build_html()` — needs to be passed through to `_send_one()`.

**File:** `garden-mailer.py` — `_send_one()` and `_build_html()`
**Status:** ⬜ TODO (Reply-To + List-Unsubscribe)

---

## 🔴 INFRASTRUCTURE — Dev Environment & CI/CD

### CH3. Harry Kvetch character drift — prose refinement erasing his kvetching
**Issue:** Harry Kvetch's core personality (chronic complainer, grumpy, short bursts, "everything is wrong") is being smoothed out by the Hemingway prose refinement pass. The literary style rewrite homogenizes all characters into the same spare, stoic voice. Harry ends up sounding thoughtful and controlled — the opposite of who he is.
**Root cause:** `refine_to_prose()` and the Hemingway style prompt have no instruction to preserve character-specific voice signatures. The style pass overwrites personality.
**Fix:** Add a character voice preservation rule to the refinement prompt — something like: "Preserve each character's defining voice signature. Harry Kvetch complains; Muso Maple speaks in Zen fragments; etc. The literary style should live in prose texture (sentence rhythm, imagery, word choice), not character personality."
**File:** `garden-dialogue.py` — `refine_to_prose()` and/or `h_prompt`
**Status:** ⬜ TODO


### OPS2. Configure dispatch log rotation (daily + size cap)
**Issue:** `/opt/plotlines/logs/dispatch.log` is currently unbounded (no logrotate rule found). File has already grown to ~1.3MB and will continue growing.
**Fix:** Add `/etc/logrotate.d/plotlines-dispatch`:
- target: `/opt/plotlines/logs/dispatch.log`
- rotate `daily`
- keep `14`
- `compress` + `delaycompress`
- `missingok`, `notifempty`, `copytruncate`
- optional `size 200k` cap (or agreed threshold)
Then run `logrotate -d` (dry run) and verify next rotation output.
**Status:** ⬜ TODO

### OPS1. Verify daily DB backup to R2 is running
**Verified 2026-03-08:** Cron fires at 2 AM daily. Last two runs successful — plotlines + thread DBs both pushed to R2. Restore not yet tested.
**Remaining:** Test a restore from R2 before production launch.
**Status:** ⬜ TODO — backup confirmed, restore untested

### DEV1. Create development environment + git workflow
**Issue:** No dev environment exists. All work happens directly on production. Need a clean promotion path before this goes to real paying subscribers.
**Spec:**
- `dev` branch → runs on a dev port (e.g. 3002) on the same box, or a separate process
- `master` branch → production (port 3001, current cron)
- GitHub Action or webhook: merge to master → pull + restart prod server
- Dev DB or dev schema (separate `plotlines_dev` DB or `dev_` table prefix) so test sends don't hit prod subscribers
- Dev cron optional — manual dispatch only in dev
- Promote path: dev branch → PR → merge to master → auto-deploy
**Files:** `/opt/plotlines/server/`, `.github/workflows/`, `run-dispatch.sh`
**Status:** ⬜ TODO — blocking production readiness

### DEV2. Update runbook — badly out of date
**Status:** ✅ DONE — commit af29755

### DEV3. T5 — Reorganize Python test suite + master test runner
**Issue:** Three monolithic test_pipeline*.py files — can't run individual suites without triggering LLM calls. No master runner.
**Spec:**
- Split into: `test_art.py`, `test_weather.py`, `test_seasons.py`, `test_dialogue.py`, `test_dispatch.py`
- Markers: `@pytest.mark.slow` (LLM), `@pytest.mark.network` (NWS fetch)
- `run_tests.py` master runner:
  ```bash
  python3 run_tests.py                    # full suite
  python3 run_tests.py art seasons        # specific suites
  python3 run_tests.py --fast             # skip slow + network
  python3 run_tests.py --node             # Node suite only
  python3 run_tests.py --all              # Python + Node
  ```
- Per-suite summary: pass/fail/skip counts + time
- Non-zero exit on any failure
- NEVER run LLM tests without explicit flag
**Status:** ✅ DONE — commit 38dd2f7

---

## 🟡 ART — Prompt Quality

### IN1. Modules must run independently — skip flags broken
**Issue:** `--skip-art`, `--skip-dialogue`, `--skip-weather`, `--skip-masthead` flags raise `RuntimeError` when cache is missing instead of just running the stage. The whole point of the interactive runner is to run any single stage standalone without dependencies. Weather should run weather. Art should run art. Period.
**Fix:** Rewrite skip logic in `garden-dispatch.py` — skip flags mean "skip this stage and use cache IF available, otherwise run it." No raises. No hard dependencies between stages.
**File:** `garden-dispatch.py` — all `--skip-*` logic blocks
**Status:** ✅ DONE — commit e0fb2b0

### AR3. Art requires weather — enforce dependency explicitly
**Fix:** Enforced in `dispatch-step.py` — weather runs before art, null condition is never passed to art. DAG always runs full via dispatch-step; skip flags are not used in production.
**Status:** ✅ DONE

### AR1. Climate zone underscores in prompt — transform for readability
**Fix:** `zone_label = zone.replace("_", " ")` in `build_prompt()` — line 272
**Status:** ✅ DONE

### AR4. Remove dead code from generate_art.py
**Fix:** Deleted SUBJECTS_BY_ZONE_SEASON, STYLES_BY_SEASON, WEATHER_MODIFIERS — 190 lines gone. Prompt output verified identical.
**Status:** ✅ DONE — commit 770130b

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
**Fix:** `_run_weather()` now passes `--summarize` — AFD summary enabled. Obs conditions working.
**Status:** ✅ DONE

---

### W1. Condition bucket not zip-specific
**Closed by design.** Weather grain is per-station, matching the newsletter edition grain `(station, author)`. Per-zip weather would require per-subscriber art and titles, blowing up the GROUP BY. The AFD narrative gives dialogue plenty of local texture. Early desire, superseded by architecture.
**Status:** ✅ CLOSED — by design

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

---

### A1. Art prompt — wrong grain and bad sekki cue
**Fix:** `build_prompt()` now uses `term.get("visual_cue") or _transform_description(term["description"])` — sekki-aware, no raw first-sentence injection. `SUBJECTS_BY_ZONE_SEASON` is dead code (defined but never called).
**Status:** ✅ DONE

---

### D1. --no-send flag not respected by mailer
**Moot.** Production has two modes: cron (sends) and --fresh (sends). dispatch-step.py owns all no-send testing flows. Nobody calls --no-send directly.
**Status:** ✅ CLOSED — by design

---

### W3. Test subscribers missing zipcode
**Fix:** All 4 backfilled — AJK/99812, BOU/80303+80308, KEY/33040.
**Status:** ✅ DONE

---

### CH1. Muso Maple persona hardcoded to Colorado — refuses to engage in other zones
**Issue:** `persona-muso-maple.md` references "Colorado's high plains" explicitly in the 72 micro-seasons section. When Muso runs for an Alaska subscriber, the model takes the geographic identity so seriously it refuses to discuss Alaskan gardening at all. The "stateless" framing already in the file ("Japanese garden principles translate to any climate. The maple species changes. The silence doesn't.") is the right idea but gets overridden by the Colorado specifics.
**Fix:** Remove or generalize the Colorado reference. Replace with zone-adaptive language — Muso applies the 72 micro-season *principle* to whatever zone he's in, not Colorado specifically.
**Status:** ✅ DONE — commit 8e8f6ea

---
