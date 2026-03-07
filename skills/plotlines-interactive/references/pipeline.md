# Plot Lines Pipeline Reference

## Key Paths

| Resource | Path |
|---|---|
| Dispatch script | `/home/administrator/openclaw/skills/garden-conversation/garden-dispatch.py` |
| Dialogue script | `/home/administrator/openclaw/skills/garden-conversation/garden-dialogue.py` |
| Art script | `/home/administrator/openclaw/skills/garden-conversation/generate_art.py` |
| Title dict | `/home/administrator/openclaw/skills/garden-conversation/title_dict.py` |
| Run dir | `/opt/plotlines/data/runs/YYYY-MM-DD/` |
| Prose cache | `/opt/plotlines/data/prose-cache/YYYY-MM-DD/` |
| Art dir | `/opt/plotlines/data/mastheads/art/generated/` |
| Mastheads | `/opt/plotlines/data/mastheads/` |
| Dispatch log | `/opt/plotlines/logs/dispatch.log` |
| TODO | `/opt/plotlines/docs/TODO.md` |
| Architecture doc | `/opt/plotlines/docs/THE-GARDEN-architecture.md` |

## Dispatch Flags

| Flag | Effect |
|---|---|
| `--email EMAIL` | Restrict to one subscriber's combo (resolved via email_hash) |
| `--no-send` | Run full pipeline (real LLM calls) but skip email delivery |
| `--dry-run` | Fast test mode — skips LLM calls AND email |
| `--skip-weather` | Skip weather fetch (requires cache) |
| `--skip-dialogue` | Skip dialogue generation (requires cache) |
| `--skip-art` | Skip art generation |
| `--skip-title` | Skip title dict lookup |
| `--skip-masthead` | Skip masthead generation (requires cache) |
| `--date YYYY-MM-DD` | Override run date |
| `--clear-cache` | Wipe caches then run (do NOT use in step-through — wipes and dispatches) |
| `--bust-cache` | Step-through only — use `rm -rf` directly instead |

## DAG Grain

```
Master query: GROUP BY (station_code, author_key)
  ↓
Weather:   per station_code
Art:       per (climate_zone_id, condition)
Dialogue:  per (station_code, author_key)
Title:     per (season_bucket=sekki_name, climate_zone_id, condition)
Masthead:  per (station_code, author_key) — composite of art + title
Assemble:  per (station_code, author_key, run_date)
Send:      per (station_code, author_key) → all subscribers in that combo
```

## Active Combos (as of 2026-03-07)

| Station | Author | Zone | Subscribers |
|---|---|---|---|
| AJK | gabaldon | alaska_south_coastal | mdcscry@gmail.com |
| BOU | hemingway | high_plains | mdcscry@yahoo.com, moltibot@agentmail.to |
| KEY | munro | florida_keys_tropical | outerfit.net@gmail.com |

## Cache Files Per Stage

| Stage | Cache file |
|---|---|
| Weather | `runs/DATE/weather_STATION.json` |
| Dialogue | `runs/DATE/dialogue_STATION_AUTHOR.json` |
| Art | `mastheads/art/generated/HASH.png` (internal cache in generate_art.py) |
| Masthead | `mastheads/HASH.png` + DB `mastheads` table |
| Assemble | DB `email_templates` table |

## Known Issues (open TODOs)

- **W2** — Weather: current obs null, AFD not summarized, only 7-day forecast
- **A1** — Art prompt: coarse season bucket not sekki; first sentence of description = bugs
- **D1** — `--no-send` mailer counts DRY RUN sends as sent=N in summary (misleading)
- **title_dict** — Always starts with "The"; zone differentiation could be stronger
