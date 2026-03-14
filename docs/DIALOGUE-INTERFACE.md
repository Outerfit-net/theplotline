# DIALOGUE-INTERFACE.md — Bootstrap & Turn Prompt Contracts

*Source of truth for what each character receives at each stage of the dialogue.*

---

## Bootstrap Prompt

Each character is bootstrapped in sequence. Character 1 speaks first (no prior conversation). Character N sees characters 1 through N-1's bootstrap lines.

### Inputs (per character)

| Input | Source | Tokens (approx) | Grows? | Notes |
|-------|--------|-----------------|--------|-------|
| **Soul** | `persona-{name}.md` | 200-400 | No | Character's full persona file. Identity, voice, quirks. |
| **Character Memory** | `read_character_memory()` | 0-2000 chars | No | Past 2 days of conversations this character participated in. Capped at `max_chars=2000`. |
| **Date** | `date_str` | 10 | No | e.g. "2026-03-14" |
| **Sekki** | `term` dict | 50-80 | No | Solar term: name, description, season_bucket, date marker |
| **Weather** | `weather.weather_report` | 200-400 | No | Full NWS forecast summary |
| **Garden Context** | `garden_context` | 100-300 | No | Zone-specific growing context (LLM-generated, cached) |
| **Topic** | `topic` | 10-30 | No | Today's discussion topic |
| **Quote** | `quote` | 20-60 | No | Reference quote for natural inclusion |
| **Participants** | `chars_names` | 20-40 | No | Comma-separated character names in today's cast |
| **Conversation So Far** | `convo_so_far` | 0 → ~N×50 | **Yes** | Previous bootstrap lines. Empty for char 1, grows by ~1 line per character. |

### Prompt Section Order

The prompt must follow this order. Rationale: identity first (who am I?), then memory (what do I remember?), then world state (what's happening today?), then conversation (what's been said?), then instruction (what do I do?).

### XML Prompt Template — Bootstrap

```xml
<identity>
You are {name}. Here is your character:

{soul}

Stay in character at all times.
</identity>

<memory>
Your recent conversations (reference naturally if relevant):

{character_memory}
</memory>

<world>
<date>{date_str}</date>
<sekki>
  <name>{term_name}</name>
  <season>{season_bucket}</season>
  <calendar>{term_date}</calendar>
  <description>{term_description}</description>
</sekki>
<weather>{weather_report}</weather>
<location>{garden_context}</location>
<topic>{topic}</topic>
<quote>{quote}</quote>
<participants>{chars_names}</participants>
</world>

<conversation>
{convo_so_far}
</conversation>

<instruction>
Output exactly one line:
**{name}:** <your response>
</instruction>
```

### XML Prompt Template — Dialogue Turn

```xml
<identity>
You are {name}. Here is your character:

{soul}
</identity>

<memory>
Your recent conversations (reference naturally if relevant):

{character_memory}
</memory>

<world>
<date>{date_str}</date>
<sekki>
  <name>{term_name}</name>
  <season>{season_bucket}</season>
  <calendar>{term_date}</calendar>
  <description>{term_description}</description>
</sekki>
<weather>{weather_report}</weather>
<location>{garden_context}</location>
<topic>{topic}</topic>
<quote>{quote}</quote>
<participants>{chars_names}</participants>
</world>

<conversation>
{convo_window}
</conversation>

<instruction>
Output EXACTLY this, nothing else:
**{name}:** <dialogue or action beat>

Rules: stay in character, 1-2 sentences, react to recent dialogue, no meta framing.
</instruction>
```

**Key difference:** Bootstrap uses `{convo_so_far}` (all prior bootstrap lines, grows). Dialogue turn uses `{convo_window}` (`hist[-6:]`, capped at 6 turns).

### Token Budget (bootstrap)

| Section | Char 1 | Char 5 | Char 12 |
|---------|--------|--------|---------|
| Identity (soul) | ~300 | ~300 | ~300 |
| Memory (archive) | ~500 | ~500 | ~500 |
| World (date+sekki+weather+context+topic+quote) | ~600 | ~600 | ~600 |
| Conversation (prior bootstraps) | 0 | ~200 | ~550 |
| Instruction | ~30 | ~30 | ~30 |
| **Total** | **~1430** | **~1630** | **~1980** |

Growth is modest — ~50 tokens per additional character in the conversation section only. All other sections are fixed.

---

## Dialogue Turn Prompt

After bootstrap, characters take turns. Weighted random speaker selection (previous speaker gets 0.1 weight).

### Inputs (per turn)

| Input | Source | Tokens (approx) | Grows? | Notes |
|-------|--------|-----------------|--------|-------|
| **Soul** | `persona-{name}.md` | 200-400 | No | Speaking character's persona only |
| **Character Memory** | `read_character_memory()` | 0-2000 chars | No | Same as bootstrap |
| **Date** | `date_str` | 10 | No | |
| **Sekki** | `term` dict | 50-80 | No | Same as bootstrap |
| **Weather** | `weather.weather_report` | 200-400 | No | |
| **Garden Context** | `garden_context` | 100-300 | No | |
| **Topic** | `topic` | 10-30 | No | |
| **Quote** | `quote` | 20-60 | No | |
| **Participants** | `chars_names` | 20-40 | No | |
| **Conversation Window** | `hist[-6:]` | ~300 | **Capped** | Last 6 turns only — sliding window |

### Prompt Section Order (same structure as bootstrap)

```
1. IDENTITY — soul
2. MEMORY — character archive
3. WORLD — date, sekki, weather, garden context, topic, quote, participants
4. CONVERSATION — last 6 turns (windowed)
5. INSTRUCTION — format rules
```

### Token Budget (dialogue turns)

Fixed at ~1400-1900 tokens per turn regardless of dialogue length, because the conversation window is capped at 6 turns.

---

## Sekki (Solar Term) — Full Object

The `term` dict from `get_current_solar_term()` contains:

```python
{
    "id": 3,                    # 1-24 solar term index
    "name": "Awakening of Insects",
    "date": "Mar 6",            # calendar marker
    "description": "Turn over a clod of earth...",  # rich prose
    "season_bucket": "spring",  # spring/summer/fall/winter
    "zone_offset": 0            # days offset for this zone vs high_plains baseline
}
```

**What should be in the prompt:**
- `name` — the solar term name (always)
- `season_bucket` — the broad season (always)
- `description` — the prose description (always — this is the richest content)
- `date` — calendar marker (for temporal grounding)

**What should NOT be in the prompt:**
- `id` — internal, meaningless to the character
- `zone_offset` — internal, already baked into which term was selected

### Current vs Correct

| Field | Before | After |
|-------|--------|-------|
| `name` | ✅ Included | ✅ In `<sekki><name>` |
| `description` | ✅ Included | ✅ In `<sekki><description>` |
| `season_bucket` | ❌ Missing | ✅ In `<sekki><season>` |
| `date` | ❌ Missing | ✅ In `<sekki><calendar>` |

---

## Character Memory — Interface Contract

`read_character_memory(archive_dir, char_name, max_days=2, max_chars=2000)`

| Param | Value | Notes |
|-------|-------|-------|
| `max_days` | 2 | Last 2 days of archives (doc said 7 — doc was wrong) |
| `max_chars` | 2000 | Hard cap on total memory injected |
| Filter | Character name in `**Characters:**` line | Only includes days this character actually participated |
| Output | Markdown with `## YOUR PAST CONVERSATIONS` header | Or empty string if no history |

### Known Issues

1. ~~Position in prompt: currently after conversation, should be after identity (section 2)~~ → Fixed
2. Doc said 7 days, code says 2 — 2 is correct for small context windows
3. Full prose included — at scale, should summarize older entries
4. No per-character filtering of content — gets full archive including other characters' lines

---

## Code vs Doc Discrepancies Found (2026-03-13)

| Item | Architecture Doc | Code | Correct |
|------|-----------------|------|---------|
| `char_memory` position | Not specified | After `convo_so_far` (end of prompt) | After identity (section 2) |
| `char_memory` days | "Last 7 days" | `max_days=2` | 2 (code is right, doc was wrong) |
| `season_context` | `{season_bucket, season_bucket_description}` | `f"{term['name']} — {term['description']}"` | Add `season_bucket` + `date` |
| Dialogue inputs (object model) | `{garden_context, author_voice}` | Much more (soul, weather, etc.) | Update object model |
| Prompt section order | Not documented | Identity→World→Convo→Memory→Instruction | Identity→Memory→World→Convo→Instruction |
| Bootstrap vs Turn contract | Not distinguished | Different (full hist vs windowed) | Document separately |

---

## Next Steps

1. ✅ Document correct bootstrap and turn interfaces (this file)
2. ⬜ Fix `garden-dialogue.py` — restructure prompt sections, add `season_bucket` + `date` to sekki
3. ⬜ Update `THE-GARDEN-architecture.md` object model table to match reality
4. ⬜ Update Dialogue Breakdown table to reflect correct prompt structure
