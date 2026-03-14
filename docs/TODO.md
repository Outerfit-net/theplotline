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

### DEV7. AgentDoor — make theplotline.net agent-friendly
**Issue:** AI agents can't discover, authenticate, or subscribe to Plot Lines programmatically. No `/.well-known/` discovery, no headless auth flow, no agent-native onboarding.
**Solution:** Integrate [AgentDoor](https://0xaron.github.io/agentdoor/) — drop-in middleware (Express/Fastify/Next.js) that adds:
- `/.well-known/agentdoor.json` — auto-discovery of API capabilities, scopes, pricing
- Ed25519 challenge-response auth — no browser, no CAPTCHA, <500ms onboarding
- Scoped API access — agents can subscribe, read newsletters, manage preferences
- Optional x402 payment protocol (USDC) for paid tiers
**Why:** Agent-to-agent commerce is coming. Plot Lines should be subscribable by AI agents, not just humans. This also opens up API-first integrations (RSS readers, aggregators, other agents).
**Package:** `npm install @agentdoor/express` (MIT licensed, TypeScript + Python)
**Status:** ⬜ TODO

### DEV4. Website copy refresh — How It Works + About pages
**Issue:** Product and pipeline evolved (local-first dispatch, single-pass refine, richer author/station matrix), but website marketing pages still reflect older flow.
**Fix:** Update `/how-it-works` and `/about` to match current architecture and voice.
**Status:** ⬜ TODO

### DEV5. Manage subscription link is broken
**Issue:** "Manage subscription" link in email footer navigates to a broken page.
**Fix:** Repair/manage route and token handling for `/manage?email=...&token=...`; validate end-to-end from received email click.
**Status:** ⬜ TODO

### DEV5b. Website admin page stats not rendering
**Issue:** Admin dashboard stats section fails to render.
**Fix:** Debug admin stats API + frontend binding/render path; validate with live data.
**Status:** ⬜ TODO

### DEV5c. Stress test matrix — seed 11 new test subscribers before morning run
**Issue:** Need realistic load spread to validate behavior under stress.
**Spec:** Add `outerfit.net+test5@gmail.com` through `outerfit.net+test15@gmail.com` as test subscribers with distinct stations/zip codes/authors (plus existing 4), then run morning local dispatch and review outcomes.
**Status:** ⬜ TODO (next action after compaction)

### DEV6. Plotlines agent docs/tooling sync with dispatch-step UX
**Issue:** `dispatch-step.py` gained `--yes` and `--send-test`, but Plot Lines operator docs/checklists still need full sync and examples.
**Fix:** Update Plot Lines agent docs/runbook snippets so testing + send workflows use new flags consistently.
**Status:** ⬜ TODO

### OPS3. ACP harness reliability for TUI/Telegram workflows
**Issue:** ACP one-shot runs are accepted but no payload has surfaced; thread-bound ACP requires thread binding unavailable on webchat. Need clear supported-path doc and health check for TUI-first usage.
**Fix:** Validate ACP path on TUI session, document supported/unsupported surfaces, and add a repeatable ACP health-check command set.
**Status:** ⬜ TODO

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

### EML2. Duplicate email protection — idempotent sends per (subscriber, run_date)
**Issue:** When dispatch re-runs for the same date (e.g. after a fix), subscribers who already received an email get it again. The mailer doesn't check if a delivery already exists for that subscriber+date before sending.
**Fix:** Before sending, check `deliveries` table for existing `(subscriber_id, daily_run_id)` with `status='sent'`. Skip if found. This makes re-runs safe.
**Status:** ⬜ TODO

### ZONE1. Hawaii topic/solar term mismatch — tropical zones getting temperate topics
**Issue:** Hawaii (HFO) got "Brassica hardening off — how cold is too cold for overnight exposure?" with references to 32-40°F. It's never been 32° in Hawaii. The solar term system assigned "Pure Brightness" with a -30d offset, but the term's description and associated topics are written for temperate climates. The weather data was correct (72-81°F) but the topic selection ignored it.
**Root cause:** Solar term descriptions in `garden_seasons.py` are temperate-centric. Topic selection from `topic_bank_24.py` doesn't filter by zone climate type. Tropical, desert, and subtropical zones need different topic pools or at minimum a zone-climate filter on topic selection.
**Fix:** Either (a) add zone-aware topic filtering (skip frost/cold topics for tropical zones), (b) create separate topic banks for tropical/desert/temperate, or (c) pass weather data into topic selection so it never picks "hardening off brassicas" when it's 80°F.
**Status:** ⬜ TODO

---

### W4. Weather pipeline makes unnecessary failing 3-letter station call before succeeding with 4-letter
**Issue:** Weather fetch first tries the 3-letter station code (e.g. `BOU`), gets an error, then falls back to the 4-letter variant (e.g. `KBOU`) and succeeds. The initial failure is expected behavior but generates noisy error logs and wastes a request on every fetch.
**Fix:** Determine the correct station format upfront — either always use the 4-letter format, or check the NWS points response for the canonical station identifier and cache it. Eliminate the retry-on-error pattern.
**File:** Weather fetch logic in `garden-dispatch.py` or the weather service it calls
**Status:** ⬜ TODO

---

### W1. Condition bucket not zip-specific
**Closed by design.** Weather grain is per-station, matching the newsletter edition grain `(station, author)`. Per-zip weather would require per-subscriber art and titles, blowing up the GROUP BY. The AFD narrative gives dialogue plenty of local texture. Early desire, superseded by architecture.
**Status:** ✅ CLOSED — by design

---

## 🔴 INFRASTRUCTURE — Climate Zone Accuracy

### GEO1. Promote sub-regions to first-class zones where climate actually differs
**Issue:** The 16 US zones are too coarse. Sub-regions were designed to carry local nuance but they're just prompt flavor text — not part of the pipeline grain (GROUP BY, season offsets, topic bank, art). This means fundamentally different growing climates get the same newsletter content.

**Known misclassifications:**
- **Bend, OR / Boise, ID** → `pacific_maritime` (should be intermountain/high desert — 10" rain vs Portland's 40")
- **Billings, MT** → `high_plains` (should be northern Rockies/Montana rangeland — not the same as Boulder/Denver Front Range)
- Likely more: eastern WA (Spokane, Yakima), eastern OR, northern NV/UT edges

**Root cause:** Sub-regions were the intended solution but got stuck at the flavor-text level due to grain issues. The master query GROUP BY is `(station_code, zipcode, author_key, climate_zone_id, hemisphere)` — zone is part of the grain, sub-region is not. Promoting sub-regions to zones means each gets its own weather context, season offsets, topic bank, and art subjects.

**Fix — promote where needed:**
1. Identify sub-regions where the climate genuinely differs from parent zone (not just local color)
2. Create new `climate_zones` rows for each (e.g. `intermountain_west`, `northern_rockies`)
3. Add zone rules in `climate.js` ZONE_RULES (ordered correctly — first match wins)
4. Add season offsets in `garden_seasons.py` ZONE_OFFSETS
5. Add topic bank entries
6. Migrate affected subscribers + combinations to new zones
7. Sub-regions that DON'T need promotion stay as prompt flavor (e.g. "Front Range" vs "Western Slope" within `high_plains` may be fine)

**Prior work:** This was discussed before but bailed due to grain issues. The grain issue is solved — zone IS in the GROUP BY now. The blocker is gone.

**The data integrity check:**
There are 122 NWS Weather Forecast Offices (WFOs) in the US. Each WFO has a primary city. These are the actual grain of our weather data — every subscriber maps to a WFO via `station_code`. The check is:
1. Get all 122 WFO primary cities + lat/lon
2. Run each through `assignClimateZone()` 
3. Eyeball: does this city belong in the zone it got assigned to? A gardener in Boise would laugh at "pacific_maritime."
4. Flag mismatches → these tell us where bounding boxes need adjustment or new zones need to be created

**Why WFO level, not sub-station level:**
There are thousands of observation stations in the US. The cross product of thousands of stations × 15+ authors = too many potential dialogues to generate. The newsletter grain is `(WFO station_code, author)`, so the zone assignment only needs to be correct at WFO resolution. If Boise WFO maps to the right zone, every subscriber under that WFO gets the right content.

**The dream (someday):** Sub-region level dialogue — each sub-station gets its own micro-local content. Requires massive parallelism (hundreds of concurrent dialogues). Not today. But the zone/sub-region data model is already designed to support it when the hardware catches up.

**First step (easy, do anytime):** Pull the 122 WFO list (NWS API or Wikipedia), run each through `assignClimateZone()`, output a table: WFO code, city, lat/lon, assigned zone, expected zone, notes. That table drives all fixes — bounding box adjustments, new zone definitions, and the confidence that every subscriber in the country gets the right garden content.

**Status:** ⬜ TODO

---

### ARCH1. Decouple pipeline — 5 independent stages
**Issue:** `garden-dispatch.py` is a monolith. Weather, dialogue, refinement, art, and email are tangled together. One failure cascades. Can't retry a stage without re-running everything. Can't scale stages independently.

**Goal:** 5 standalone stages, each runnable independently, each with its own retry/cache:

**Stage 1: WEATHER** (no dependencies)
- Fetch NWS weather + AFD for all stations
- Output: `weather_{station}.json` per station
- Fast (~1s/station), network-only, can run early (5:00 AM)
- Failure: retry 3x, skip station on total failure

**Stage 2: DIALOGUE** (depends on: weather)
- Run LLM dialogue for each (station, author) combo
- Input: weather JSON + topic bank + character personas + archive memory
- Output: `dialogue_{station}_{author}.json` (raw turns + metadata)
- Bottleneck stage — Ollama sequential per combo, parallel across combos
- Each combo is independent — Portland doesn't need Tucson
- Pool(3) workers, 3 models concurrent on GPU

**Stage 3: REFINEMENT** (depends on: dialogue)
- Author voice rewrite (Hemingway, Le Guin, etc.)
- Input: raw dialogue JSON
- Output: `prose_{station}_{author}.json` (final prose text)
- Currently baked into dialogue script — extract as standalone
- **Gets one big model, full GPU.** Flush dialogue models first.
- This is the most sophisticated task — literary voice, prose craft, character preservation
- Candidate: dolphin-llama3:8b now, but could be phi4:14b or a 13B+ model with full 24GB available
- Runs serial across combos (one model, one GPU) — but each refinement is fast (~10-20s)

**Stage 4: ART** (no dependencies — can run overnight)
- Generate masthead art for each (zone, condition) combo
- Input: zone + weather condition + solar term
- Output: `art_{zone}_{condition}.png`
- GPU-bound (~3s/image on SD 1.5), fully cacheable
- Same zone/condition = same art across stations. ~15 unique combos max.

**Stage 5: EMAIL** (depends on: refinement + art)
- Assemble HTML: title → masthead composite → prose → template → send
- Input: prose JSON + art PNG + subscriber list
- Output: sent emails + delivery log
- **Streams as pieces land.** Doesn't wait for all combos to finish.
- Art is cached from stage 1. As each combo's refinement completes → assemble → send immediately.
- First subscriber gets email while later combos are still refining.
- No GPU needed — pure CPU/network. Can overlap with refinement stage.
- Failed sends retry independently per subscriber.

**Dependency graph:**
```
WEATHER ──→ DIALOGUE ──→ REFINEMENT ──→ EMAIL
                                          ↑
ART ──────────────────────────────────────┘
```

**DAG orchestration:**
- Each stage is a standalone CLI: `python3 dispatch-stage.py --stage weather --all`
- DAG runner checks inputs exist before launching each stage
- Stages fire as soon as dependencies are met — no waiting for unrelated work
- `--combo BOU/hemingway` for single-combo runs, `--all` for full dispatch
- Failed stages retry independently. No combo blocks another.

**GPU exclusivity — ART gets the whole GPU:**
- Art generation (SD 1.5 / SD 3.5 / FLUX) needs dedicated VRAM — no Ollama models loaded
- DAG must enforce: **unload all Ollama models before art, reload after**
- Art runs overnight/pre-dawn when Ollama is idle. Cache by (zone, condition, term).
- `curl -s http://localhost:11434/api/generate -d '{"model":"X","keep_alive":0}'` to flush before art

**Execution model — two GPU phases, no model switching within either:**

**Phase 1: ALL DIALOGUE (load models once, run everything)**
- Pre-load 3-4 dialogue models. They stay hot the entire phase. Zero cold starts.
- Run ALL combos through dialogue concurrently: `asyncio.gather(combo1(), combo2(), combo3(), combo4())`
- Each combo runs its 7-10 turns sequentially (turn 5 needs turn 4, can't parallelize within a combo)
- Parallelism is ACROSS combos, not within them. Multiple combos share the GPU models.
- Ollama queues requests to the same model (`OLLAMA_NUM_PARALLEL=1`). When 2 combos hit the same model simultaneously, one waits. This is fine — the other models are serving other combos.
- 12 characters spread across 3-4 models = good load distribution. Contention is occasional, not constant.
- No per-turn scheduling, no runtime DAG. Just concurrent combo coroutines sharing a model pool.
- `OLLAMA_NUM_PARALLEL=2` could double-serve hot models at the cost of some VRAM.

**Phase 2: REFINE → EMAIL loop (per combo, streaming)**
- Flush all dialogue models. Load one refiner model (gemma3:4b, or bigger if VRAM allows).
- For each combo that has completed dialogue:
  - Refine raw dialogue → prose
  - Assemble HTML (masthead from cached art + prose)
  - Send email
  - Move to next combo
- First email lands while later combos are still refining. Streaming output.
- One model, one pass, zero switching.

**Dialogue GPU budget: 3-4 models concurrent in 24GB VRAM:**
- Art is done before dialogue starts — full 24GB available for Ollama
- Current measured VRAM: qwen2.5:3b (3.1GB), qwen3:4b (3.6GB), gemma3:4b (4.3GB) = 11GB
- With gemma2 for Muso: +8.7GB = 19.7GB. Fits with headroom.
- Without gemma2 (Muso on smaller model): 11GB total, massive headroom for bigger refiner.
- Models stay hot across ALL combos — no unload/reload between combos.

**Implementation:** Dagster for outer DAG (phases + retry + backfill), simple work queue within Phase 1:
- Dagster assets: `weather` → `art` → `all_dialogue` → `refine_email_loop`
- `all_dialogue` asset internally runs `asyncio.gather()` across combos
- `refine_email_loop` asset iterates combos: refine → assemble → send
- Postgres job queue tracks per-combo status for retry/backfill
- Cron at 4:30 AM → art (GPU exclusive)
- Cron at 5:00 AM → weather (network only)
- Cron at 5:30 AM → Phase 1 (dialogue) → Phase 2 (refine→email)

**Scaling path:**
- 15 combos today → 200+ at scale
- Weather + art: trivially parallel, done in seconds
- Dialogue: 4 concurrent combos × ~3min each = ~12min for 15 combos, ~2.5hr for 200
- At 200+ combos: faster models, `NUM_PARALLEL=2`, or stagger sends across a wider window
- Art cached aggressively — same zone/condition/term = same image across all stations

### ARCH1b. Evaluate DAG orchestrator for pipeline
**Issue:** At scale (15 authors × 128 WFOs = 1,920 possible combos), a Python for-loop won't cut it. Need a real DAG scheduler with parallel fan-out, per-job retry, GPU fencing, and asset caching.
**Requirements:**
- DAG with stage dependencies (weather → dialogue → refinement → email, art independent)
- Fan-out parallelism within stages (200+ combos concurrent where GPU allows)
- GPU fencing — exclusive VRAM access per stage type (art vs dialogue vs refinement)
- Per-combo retry without re-running the world
- Asset tracking — know what's cached, skip what's done, backfill what failed
- Simple — no K8s, no cloud service, runs on Blackwell, minimal ops burden
- Python-native — not YAML config hell

**Candidates to evaluate:**
1. **Dagster** — full data platform, asset-based DAG, sensors, web UI, backfill. Most complete but heaviest. MIT.
2. **Prefect** — workflow engine, Pythonic decorators, local mode, retries. Cloud-push but works locally. Apache 2.0.
3. **Hamilton** — micro-framework, function = DAG node, zero infra. No scheduler/retry/parallelism built in — would need a thin Postgres job layer on top.
4. **Taskiq** — async task queue, broker-agnostic (Postgres backend), lightweight. More Celery-lite than DAG.
5. **Custom `dispatch-dag.py`** — 200-line Postgres job queue, own the code. No deps but you build everything.
6. **Makefiles / Just** — file-based deps, parallel `-j`. Awkward for dynamic combos.

**Evaluation criteria:** install complexity, runtime footprint, learning curve, GPU fencing support (custom either way), community/maintenance health, fit for 200-2000 combo scale.
**Action:** Research top 3 (Dagster, Prefect, Hamilton), prototype the winner with weather+dialogue stages.
**Status:** ⬜ TODO

---

**Status:** ⬜ TODO (architectural — plan before building)

### AR3. Art model bakeoff — test alternative image models
**Issue:** Currently using SD 1.5 only. Other models may produce better botanical art for the masthead.
**Plan:** Run the same zone/condition/term prompts through multiple models side-by-side and compare.
**Candidates:**
1. **SD 1.5** (current) — 2.6s gen, flat botanical style, ~4GB VRAM
2. **SD 3.5 Medium** (2.5B params, ~5GB disk, ~10GB VRAM) — major quality jump, good composition. Download: `huggingface-cli download stabilityai/stable-diffusion-3.5-medium`. Needs HF license acceptance first. Optional fp8 text encoder variant from Comfy-Org saves more VRAM.
3. **FLUX.2 Klein 4B** (~8GB disk, ~13GB VRAM) — good A/B test partner for SD 3.5 Medium. Also needs HF license acceptance.
4. SDXL, Flux-schnell (already tried)
**Pre-req:** Accept HuggingFace licenses for SD 3.5 Medium and FLUX.2 Klein before downloading.
**Goal:** Find the best style-per-VRAM-dollar for flat illustrated botanical art. May end up using different models for different zones.
**Status:** ⬜ TODO

### T1. Titles are too long — make them pithier
**Issue:** Current title generation produces newspaper-style names like "The Equinox's Golden Window Herald" or "The Held Breath Chronicle Sentinel" — too many words, too pompous. A good newsletter title should be 3-5 words max, punchy, evocative.
**Examples of what we want:** "Frost Bites Back" / "Mud Season" / "The Last Snow" / "First Bee Report"
**Fix:** Tighten the title generation prompt. Fewer words, more punch. Drop the "The X Y Z Herald/Sentinel/Tribune" formula. Let the author voice come through in the title itself, not just the font.
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

## 🔴 INFRASTRUCTURE — Code Location

### INF1. Move Plot Lines code out of openclaw repo
**Issue:** `garden-dialogue.py`, `generate_art.py`, `garden_seasons.py`, and other Plot Lines pipeline code lives in `~/openclaw/skills/garden-conversation/`. The openclaw repo (`~/openclaw/` → `~/.openclaw/workspace`) is OpenClaw's config/workspace directory — it should contain agent configuration, not application code. Only agent persona files and skill configs belong there.
**Fix:** Move all Plot Lines pipeline code (dialogue, art, seasons, topics, quotes, weather, context) to `/opt/plotlines/scripts/` alongside `garden-dispatch.py`. Update `garden-dispatch.py` imports and OpenClaw agent configs to reference the new paths. Keep persona files (`persona-*.md`) and agent skill config in openclaw — those are agent artifacts.
**Status:** ⬜ TODO

---

### INF2. Hardcoded DB credentials in seed-test-subscribers.py
**File:** `scripts/seed-test-subscribers.py:18-19`
**Issue:** Database connection string and encryption key are hardcoded. Should be pulled from environment variables or Bitwarden at runtime.
**Fix:** Replace hardcoded values with `os.environ.get('DATABASE_URL')` and `os.environ.get('PLOTLINES_ENCRYPTION_KEY')`. Source from `.env` or Bitwarden.
**Severity:** HIGH (roborev)
**Status:** ⬜ TODO

### INF3. Hardcoded DB credentials in docs
**Files:** `SKILL.md:86-87`, `docs/RUNBOOK.md:28,117`
**Issue:** Database connection strings appear in documentation files. If repo is ever shared or public, credentials are exposed.
**Fix:** Replace with placeholder `$DATABASE_URL` references. Add note to fetch from `.env` or Bitwarden.
**Severity:** HIGH (roborev)
**Status:** ⬜ TODO

### INF4. Subscriber email addresses in docs
**Files:** `docs/RUNBOOK.md:99-103`, `references/pipeline.md`, `docs/TODO.md`
**Issue:** Real subscriber email addresses appear in documentation and reference files.
**Fix:** Replace with anonymized examples (`test@example.com`, `subscriber1@example.com`).
**Severity:** HIGH (roborev)
**Status:** ⬜ TODO

### INF5. Unsalted MD5 email hash in seed script
**File:** `scripts/seed-test-subscribers.py:141-142`
**Issue:** Email addresses are hashed with plain MD5 (no salt). Trivially reversible for known emails.
**Fix:** Use HMAC-SHA256 with a secret key, or bcrypt. The hash is used for unsubscribe tokens — needs to be deterministic but not reversible.
**Severity:** MEDIUM (roborev)
**Status:** ⬜ TODO

---

## 🔴 INFRASTRUCTURE — Healthchecks

### INF6. PostgreSQL health monitoring
**Issue:** Postgres cluster went down (status: `down` in `pg_lsclusters`) and nothing noticed until cron failed. matte_d_scry had to manually `sudo systemctl start postgresql@14-main`.
**Fix:** Add a healthcheck that runs before dispatch (preflight already checks DB, but should alert independently). Options:
- System cron: `*/15 * * * * pg_isready || openclaw system event --text "🔴 Postgres DOWN"`
- Or add to OpenClaw heartbeat checklist
**Status:** ⬜ TODO

### INF7. Cron start/finish notifications
**Issue:** No visibility into whether the daily dispatch started or finished. Failures were silent.
**Fix (DONE — partial):** `run-dispatch.sh` now sends `openclaw system event` on start and completion/failure. But these go to the main agent session — need to also deliver to Telegram (matte_d_scry at 8233843319) and moltibot.
**Remaining:**
- Wire `openclaw system event` to deliver to Telegram target
- Or use direct Telegram API call in run-dispatch.sh as fallback
- Consider adding to all production crons, not just Plot Lines
**Status:** ⬜ TODO

---
