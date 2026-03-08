---
name: plotlines-interactive
description: Interactive Plot Lines pipeline runner. Use when the user says "run weather/dialogue/art/title/masthead/full for [email or station]", "step through dispatch", "show me the [stage] for [subscriber]", or wants to inspect/debug any stage of the pipeline. Supports targeting by subscriber email. Each stage runs independently using cached dependencies.
---

# Plot Lines Interactive Pipeline Runner

Run any pipeline stage on demand. Show ALL raw output — never summarize, never paraphrase. Open art and mastheads in the browser. Log issues to TODO as they appear.

## Behaviour Rules

- **Show the guts.** After every stage, dump the raw output — JSON, prose, logs, all of it. No truncation. No summaries. No pass/fail tables. The user reads it.
- **Never paraphrase.** Paste raw stdout/stderr verbatim.
- **Always open images in browser** — `browser(action=open, profile=openclaw)` then `browser(action=screenshot)` — display screenshot inline. Every time.
- **Log every defect** to `/opt/plotlines/docs/TODO.md`, commit immediately.
- **Show full prose** after dialogue — every word.
- **Show full prompt** when asked — every word.
- **Ask before sending real email.** Never send without explicit confirmation.

## ⚠️ Test Rules
**NEVER run the full test suite without explicit user permission.** LLM tests take 2+ minutes and spawn real agent calls.

```bash
# Safe default — fast only (no LLM, no network)
python3 run_tests.py --fast          # all suites, ~4s

# Single suite
python3 run_tests.py art             # ~1s
python3 run_tests.py seasons         # ~0.1s

# With network (Postgres, NWS)
python3 run_tests.py --network

# With LLM (dialogue, masthead) — explicit permission required
python3 run_tests.py --slow

# Everything
python3 run_tests.py --all-marks
```

**NEVER run `pytest test_pipeline*.py`** — those files are deleted. Use `run_tests.py` or `pytest tests/test_NAME.py::TestClass -v`.

## Setup

```bash
DISPATCH=/home/administrator/openclaw/skills/garden-conversation/garden-dispatch.py
RESOLVE=/home/administrator/openclaw/skills/garden-conversation/resolve_email.py
DATE=$(TZ=America/Denver date +%Y-%m-%d)   # override with --date if needed
```

**Always resolve the email first** before running any stage:

```bash
python3 $RESOLVE EMAIL --date $DATE
```

This returns full grain: `station_code`, `author_key`, `climate_zone_id`, `hemisphere`, `lat`, `lon`, `season_bucket` (offset-adjusted sekki name), `season_bucket_description`, `weather_condition`, `title_dict_key`.

Show the full resolution output to the user — this is the first verification step. If anything looks wrong (wrong zone, wrong sekki, wrong condition), stop and investigate before running any stage.

All `--email EMAIL` flags in dispatch resolve via `email_hash` internally — same lookup.

## Interactive Step-Through (recommended) — dispatch-step.py

**"Run standalone"** always means `dispatch-step.py`. No exceptions.

```bash
STEP=/home/administrator/openclaw/skills/garden-conversation/dispatch-step.py
```

### Single stage (non-interactive) — the primary testing tool

```bash
# Run exactly one stage for one subscriber
python3 $STEP --stage weather  --email EMAIL
python3 $STEP --stage art      --email EMAIL
python3 $STEP --stage dialogue --email EMAIL
python3 $STEP --stage title    --email EMAIL
python3 $STEP --stage masthead --email EMAIL
python3 $STEP --stage email    --email EMAIL   # sends real email — confirm first

# Bust only the cache for that stage, then run it
python3 $STEP --stage art --email EMAIL --bust-cache

# Test subscribers only (is_test=true in DB)
python3 $STEP --stage art --test-subs
```

### Dependency rules — hard constraints, never skip
- **weather** has no dependencies
- **art** needs weather. If `weather_condition` is null → run weather first. Never fall back to `cloudy`.
- **dialogue** needs weather. Art is NOT a dependency of dialogue.
- **title** needs weather + zone/season
- **masthead** needs art + title (weather+dialogue from cache)
- **email** needs everything

### Fresh full run (nuke all caches including art)
```bash
python3 $STEP --fresh                    # interactive confirmation, then full DAG
python3 $STEP --fresh --test-subs        # test subs only
```

### Interactive walk-through
```bash
python3 $STEP --date $DATE --email EMAIL          # step through all stages
python3 $STEP --from-stage art --email EMAIL      # start from a specific stage
python3 $STEP --bust-cache --email EMAIL          # scoped bust then walk-through
```

### Cache bust scope
`--bust-cache` without `--stage` clears: run dir + prose cache + mastheads (NOT art)
`--bust-cache` with `--stage` clears only that stage's files:
- weather → weather_*.json
- art → art/generated/*.png + art/pil/*.png
- dialogue → dialogue_*.json + prose-cache/*.json
- masthead → mastheads/*.png composites

`--fresh` clears everything including art (slow — ~60s/image to regenerate).

### Test subscribers
`is_test=true` in DB: mdcscry@yahoo.com, moltibot@agentmail.to, outerfit.net@gmail.com, mdcscry@gmail.com
Production cron runs without `--test-subs`. Dev always uses `--test-subs` or `--email`.

Show ALL output verbatim after each stage. Open images in browser. Never summarize.

---

## Commands (standalone — use dispatch-step.py --stage whenever possible)

**Prefer `dispatch-step.py --stage STAGE --email EMAIL` over all of the below.**
These are fallbacks for cases where you need finer control than dispatch-step provides.

### `run weather for EMAIL`
```bash
RESOLVED=$(python3 $RESOLVE EMAIL --date $DATE)
ZIP=$(echo $RESOLVED | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['zipcode'] or '')")
STATION=$(echo $RESOLVED | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['station_code'])")

if [ -n "$ZIP" ]; then
  python3 ~/openclaw/skills/garden-conversation/garden-weather.py --zip $ZIP --summarize 2>&1
else
  python3 ~/openclaw/skills/garden-conversation/garden-weather.py --station $STATION --summarize 2>&1
fi
```
Show ALL raw JSON — every field, no truncation.

---

### `run art for EMAIL`

⚠️ **Weather is a required dependency for art. Always run weather first.**
If `weather_condition` is null in resolve output — do NOT fall back to `cloudy`. Run weather first.

```bash
RESOLVED=$(python3 $RESOLVE EMAIL --date $DATE)
ZONE=$(echo $RESOLVED | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['climate_zone_id'])")
COND=$(echo $RESOLVED | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['weather_condition'] or '')")
ZIP=$(echo $RESOLVED | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['zipcode'] or '')")
STATION=$(echo $RESOLVED | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['station_code'])")

# Step 1: Run weather if condition is missing
if [ -z "$COND" ]; then
  echo "weather_condition is null — running weather first"
  if [ -n "$ZIP" ]; then
    python3 ~/openclaw/skills/garden-conversation/garden-weather.py --zip $ZIP --summarize 2>&1
  else
    python3 ~/openclaw/skills/garden-conversation/garden-weather.py --station $STATION --summarize 2>&1
  fi
  # Re-resolve to pick up the condition
  RESOLVED=$(python3 $RESOLVE EMAIL --date $DATE)
  COND=$(echo $RESOLVED | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['weather_condition'] or 'cloudy')")
fi

# Step 2: Show prompt
python3 ~/openclaw/skills/garden-conversation/generate_art.py $ZONE $COND --date $DATE --show-prompt

# Step 3: Generate
python3 ~/openclaw/skills/garden-conversation/generate_art.py $ZONE $COND --date $DATE 2>&1
```
Show prompt. Generate. Open PNG in browser. Screenshot inline.

---

### `run dialogue for EMAIL`
```bash
RESOLVED=$(python3 $RESOLVE EMAIL --date $DATE)
ZIP=$(echo $RESOLVED | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['zipcode'] or '')")
STATION=$(echo $RESOLVED | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['station_code'])")
AUTHOR=$(echo $RESOLVED | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['author_key'])")
ZONE=$(echo $RESOLVED | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['climate_zone_id'])")

if [ -n "$ZIP" ]; then
  python3 ~/openclaw/skills/garden-conversation/garden-weather.py --zip $ZIP --summarize > /tmp/wx_$STATION.json 2>/dev/null
else
  python3 ~/openclaw/skills/garden-conversation/garden-weather.py --station $STATION --summarize > /tmp/wx_$STATION.json 2>/dev/null
fi

python3 ~/openclaw/skills/garden-conversation/garden-dialogue.py \
  --weather-json /tmp/wx_$STATION.json \
  --author $AUTHOR --zone $ZONE --output-json 2>&1
```
Show ALL output — full prose, every word.

---

### `run title for EMAIL`
```bash
python3 $DISPATCH --date $DATE --no-send \
  --skip-masthead \
  --email EMAIL 2>&1
```
Show full output. Then show the full title_dict row:
```bash
psql postgresql://plotlines:plines2026@localhost:5432/plotlines \
  -c "SELECT season_bucket, climate_zone_id, condition, title FROM title_dict WHERE climate_zone_id = 'ZONE' AND condition = 'CONDITION' AND season_bucket = 'SEKKI';"
```
The user reads it.

---

### `run masthead for EMAIL`
```bash
python3 $DISPATCH --date $DATE --no-send \
  --email EMAIL 2>&1
```
Show full output. Then open the masthead URL in browser and display the screenshot inline. The user looks at it.

---

### `run full for EMAIL` / `fresh run`
```bash
# Preferred — interactive confirmation, nukes all caches including art
python3 $STEP --fresh --email EMAIL

# DAG directly with full cache bust
python3 $DISPATCH --clear-cache --clear-art --date $DATE --email EMAIL --no-send
```

---

### `send for EMAIL`
Ask explicitly: "Send real email to EMAIL?" Wait for confirmation.
```bash
python3 $DISPATCH --date $DATE --email EMAIL 2>&1
```
Show: full mailer output including sent/failed counts.

## Issue Logging

```markdown
### XX. Short description
**Issue:** What is wrong and where.
**Fix:** Specific file/function/flag to change.
**Status:** ⬜ TODO
```
```bash
cd /opt/plotlines && git add docs/TODO.md && git commit -m "todo: XX — short description"
```

## Reference

- `references/pipeline.md` — DAG grain, file paths, flag reference, active combos, known issues
- `references/interfaces.md` — Full input/output contract for every module. Use this to verify each stage. Any null where not-null is expected = broken interface = stop and fix.
