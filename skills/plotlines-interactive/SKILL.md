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

## Commands

### `run weather for EMAIL`
```bash
python3 $DISPATCH --date $DATE --no-send \
  --skip-dialogue --skip-art --skip-title --skip-masthead \
  --email EMAIL 2>&1
```
Then immediately show the full raw weather JSON — every field, no truncation:
```bash
cat /opt/plotlines/data/runs/$DATE/weather_STATION.json
```
Show everything. The user reads it. Do not summarize, do not verify on their behalf.

---

### `run dialogue for EMAIL`
```bash
python3 $DISPATCH --date $DATE --no-send \
  --skip-art --skip-title --skip-masthead \
  --email EMAIL 2>&1
```
Then show the full raw dialogue JSON — every field, no truncation:
```bash
cat /opt/plotlines/data/runs/$DATE/dialogue_STATION_AUTHOR.json
```
Show everything. The user reads it. Do not summarize.

---

### `run art for EMAIL`
```bash
python3 $DISPATCH --date $DATE --no-send \
  --skip-title --skip-masthead \
  --email EMAIL 2>&1
```
Show full output. Then open the art PNG in browser and display the screenshot inline. The user looks at it.

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

### `run full for EMAIL`
Run all stages in order, pausing between each for "next" / "stop".
Bust cache first if user says "uncached" or "from scratch":
```bash
rm -rf /opt/plotlines/data/runs/$DATE \
       /opt/plotlines/data/runs/$DATE-dry \
       /opt/plotlines/data/prose-cache/$DATE
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
