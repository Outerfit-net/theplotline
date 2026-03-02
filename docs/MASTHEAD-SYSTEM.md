# The Plot Line — Masthead System Design

*Created: 2026-03-01*
*Status: In Development*

---

## Overview

Every The Plot Line email arrives with a unique masthead — a 600×100px banner image that serves as the artistic identity of that day's edition. The masthead is not decoration. It is the product. Subscribers open the email for the art as much as the conversation.

The masthead is **generative art**. Organic, painterly, botanical. The opposite of photorealistic. Every morning is a new print that will never exist again.

---

## The Vision

The masthead reflects the day through an artistic lens — season, weather, climate zone — but interpreted, not literal. Some days spare and cold. Some days chaotic and overgrown. The art has moods that don't always match the forecast.

The stickiness is in the surprise. A subscriber who knows every morning brings a unique unrepeatable piece opens every email.

---

## Generation Pipeline

### Two-Layer Compositor

**Layer 1 — Art (Flux)**
- Flux.1-schnell on RTX Pro 4000 Blackwell (24GB VRAM)
- Non-photorealistic, painterly, botanical
- Generated at 512×768 or 768×768, then cropped/composited into 600×100
- Generated **once per combo**, cached forever as PNG

**Layer 2 — Typography (PIL)**
- Masthead title text (season/weather driven)
- Author-mapped garden font from 159-font library
- `plotlines.com · Season` subtitle
- Decorative border + corner marks

### Generation Trigger
- Lazy: generated on **first subscriber** from a new (station × author × season × weather) combo
- Cached in `/opt/plotlines/data/mastheads/{md5hash}.png`
- Cache key: `md5(station:author:season:weather)`
- Never regenerated unless explicitly purged

---

## Art Direction

### Aesthetic Pool
Each generation draws 1–2 style tags from a weighted pool. Same inputs → different outputs across generations.

```
risograph print       woodblock print       linocut
botanical watercolor  Japanese woodcut      silkscreen
etching               gouache               vintage seed catalog
pressed flower        herbarium plate       woodcut engraving
ink wash              pen and ink           naive folk art
```

Season weighting (soft, not hard):
- Spring → watercolor, pressed flower, risograph
- Summer → silkscreen, gouache, folk art
- Fall → etching, woodcut, linocut
- Winter → woodblock, ink wash, engraving

### Subject Matter
Pulled from season + climate zone. What's actually in that garden right now:

| Zone | Spring | Summer | Fall | Winter |
|------|--------|--------|------|--------|
| high_plains | crocus shoots, bare soil, frost grass | sunflower, squash vine, heat haze | dried seed heads, kale, frost | bare beds, snow, rabbit tracks |
| pacific_coast | oxalis, early brassicas | fog + tomatoes | pumpkin, persimmon | citrus, winter greens |
| humid_southeast | azalea bud, red clay | humidity haze, okra | sweet potato, pecan | camelia, mild overcast |
| ... | | | | |

### Weather Modifiers
Overlaid on subject matter:
- `sunny` → warm tone, long shadows, optimism
- `cloudy` → muted palette, flat light, introspection
- `rainy` → wet texture, dark soil, green saturation
- `snowy` → high contrast, sparse, white space
- `frost` → pale blue-grey, crystalline detail, stillness
- `heat` → ochre, shimmer, wilted edges

---

## Masthead Titles

The newsletter title on the masthead changes with season + weather. This is part of the art — the name itself is a small poem.

| Season | Weather | Title |
|--------|---------|-------|
| spring | sunny | The First Bloom |
| spring | cloudy | Sprout Notes |
| spring | rainy | Notes from the Mud |
| spring | snowy | The Late Thaw |
| spring | frost | The Late Thaw |
| spring | heat | The Green Wave |
| summer | sunny | High Summer |
| summer | cloudy | Midseason |
| summer | rainy | The Long Day |
| summer | heat | The Dry Spell Dispatch |
| fall | sunny | Harvest Letter |
| fall | cloudy | The Last Bloom |
| fall | rainy | Notes from the Mud |
| fall | snowy | The Frost Line |
| fall | frost | The Frost Line |
| fall | heat | The Burn |
| winter | sunny | The Cold Frame |
| winter | cloudy | The Dormant |
| winter | rainy | Frost & Folly |
| winter | snowy | Snow Days |
| winter | frost | Winter Plot |

---

## Typography

### Font Library
- 159 garden fonts downloaded from FontSpace
- Location on Mac: `~/Documents/theplotline/fonts/`
- Target on Blackwell: `/opt/plotlines/fonts/`
- Mix of .ttf and .otf — botanical, floral, handwritten, letterpress styles

### Author → Font Mapping
Each author voice maps to a font that reinforces their prose texture:

| Author | Font Style | Rationale |
|--------|-----------|-----------|
| hemingway | strong serif | clean, direct, no flourish |
| carver | plain serif | sparse, nothing extra |
| morrison | heavy serif | weighted, rooted |
| mccarthy | heavy serif | sparse but serious |
| oconnor | bold serif | gothic undertone |
| hurston | expressive | voice, rhythm, joy |
| saunders | friendly | accessible, warm |

Full mapping refined once garden fonts are on Blackwell.

---

## Color System

24 palettes — one per (season × weather) combo. Each palette defines:
- `bg` — background wash color
- `text` — title text color  
- `accent` — border, rule, subtitle color

All muted, paper-toned. No saturated primaries. Feels printed, not digital.

---

## Scale

**Total possible mastheads:** station × author × season × weather
- ~122 NWS stations (US) + international lat:lon keys
- 12 authors
- 4 seasons × 6 weather types = 24 art combos

**Practical ceiling for year one:** ~50 active stations × 12 authors × 24 = ~14,400 mastheads
**Generation cost:** ~2–5 seconds each on RTX Pro 4000, electricity only
**Storage:** ~5–8KB per PNG × 14,400 = ~100MB

Bootstrap: generate nothing upfront. First subscriber from a new combo triggers generation. Cache forever.

---

## Infrastructure

- **Generator:** `/opt/plotlines/server/services/generate_masthead.py`
- **Cache dir:** `/opt/plotlines/data/mastheads/`
- **Fonts dir:** `/opt/plotlines/fonts/` (needs transfer from Mac)
- **HuggingFace model:** `black-forest-labs/FLUX.1-schnell` (requires HF token + license accept)
- **Model cache:** `~/.cache/huggingface/hub/` (~12GB after download)
- **CDN:** `glyphmatic.us/mastheads/{hash}.png` (when ready to serve externally)

---

## Current Status

- [x] Compositor prototype built (`generate_masthead.py`) — PIL only, DejaVu fonts
- [x] 24 color palettes defined
- [x] 21 masthead titles defined
- [x] Cache key + lazy generation logic
- [x] CLI: `python3 generate_masthead.py BOU hemingway fall frost --batch`
- [ ] Flux integration — needs HF token + license acceptance
- [ ] Garden fonts transferred to Blackwell (`/opt/plotlines/fonts/`)
- [ ] Author → font mapping finalized (needs font inventory)
- [ ] Flux prompt system (aesthetic pool, subject matter by zone)
- [ ] DB integration — store masthead URL in combinations table
- [ ] CDN hosting (glyphmatic.us/mastheads/)
- [ ] Wire into email dispatch (embed URL in email header)

---

## Open Questions

1. Does the art layer need to reflect the **subscriber's specific zone** (high_plains vs pacific_coast) or is season+weather enough?
2. Crop strategy for Flux output → 6:1 banner — center crop, or intelligent crop to most interesting region?
3. Should there be **seasonal masthead name variation** per climate zone? (High plains winter ≠ Florida winter)
4. Font choice: subscriber-visible? ("Your edition arrives in Carver / Clearface Gothic")

---

*The masthead is art. Treat it that way.*
