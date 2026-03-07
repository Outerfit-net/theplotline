---
name: plotlines-interactive
description: Interactive Plot Lines pipeline runner. Use when the user says "run weather/dialogue/art/title/masthead/full for [email or station]", "step through dispatch", "show me the [stage] for [subscriber]", or wants to inspect/debug any stage of the pipeline. Supports targeting by subscriber email. Each stage runs independently using cached dependencies.
---

# Plot Lines Interactive Pipeline Runner

Run any pipeline stage on demand. Show ALL raw output — never summarize, never paraphrase. Open art and mastheads in the browser. Log issues to TODO as they appear.

## Behaviour Rules

- **Never paraphrase output.** Paste raw stdout/stderr verbatim.
- **Always open images in browser** — `browser(action=open, profile=openclaw)` then `browser(action=screenshot)` — display screenshot inline.
- **Log every defect** to `/opt/plotlines/docs/TODO.md`, commit immediately.
- **Show full prose** after dialogue — all of it, no truncation.
- **Show full prompt** when asked — no paraphrasing.
- **Ask before sending real email.** Never send without explicit confirmation.

## Setup

```bash
DISPATCH=/home/administrator/openclaw/skills/garden-conversation/garden-dispatch.py
DATE=$(TZ=America/Denver date +%Y-%m-%d)   # override with --date if needed
```

Resolve email → combo via `--email EMAIL` flag (dispatch looks up via email_hash).

## Commands

### `run weather for EMAIL`
```bash
python3 $DISPATCH --date $DATE --no-send \
  --skip-dialogue --skip-art --skip-title --skip-masthead \
  --email EMAIL 2>&1
```
Show: full output + full contents of `runs/$DATE/weather_STATION.json`.
Check: current obs populated, afd_summary populated, 10-day forecast present.

---

### `run dialogue for EMAIL`
```bash
python3 $DISPATCH --date $DATE --no-send \
  --skip-art --skip-title --skip-masthead \
  --email EMAIL 2>&1
```
Show: full output. Read and paste full prose from `runs/$DATE/dialogue_STATION_AUTHOR.json`.
Check: turns > 1, prose is real (not placeholder), topic is zone-appropriate.

---

### `run art for EMAIL`
```bash
python3 $DISPATCH --date $DATE --no-send \
  --skip-title --skip-masthead \
  --email EMAIL 2>&1
```
Show: full output. Open art PNG in browser, display screenshot.
Check: garden scene, not literal sekki imagery.

---

### `run title for EMAIL`
```bash
python3 $DISPATCH --date $DATE --no-send \
  --skip-masthead \
  --email EMAIL 2>&1
```
Show: full output. Confirm `source=title_dict`, title appropriate for zone+sekki+condition.

---

### `run masthead for EMAIL`
```bash
python3 $DISPATCH --date $DATE --no-send \
  --email EMAIL 2>&1
```
Show: full output. Open masthead URL in browser, display screenshot.
Check: title text correct, sekki label correct, art appropriate.

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

See `references/pipeline.md` for DAG grain, file paths, flag reference, active combos, and known issues.
