# GENART.md — Plot Lines Art Generation

## Current Model: SDXL (stabilityai/stable-diffusion-xl-base-1.0)
- **Local**, no API cost
- CLIP 77-token prompt limit — descriptions truncated to 25 words
- ~7s generation, ~6GB VRAM
- Quality: decent botanical watercolor, but limited by token budget

## Evaluated Models (2026-03-13 Bakeoff)

### Gemini API (Google) — all use existing API key

| Model | Codename | Time | Quality | Notes |
|-------|----------|------|---------|-------|
| `imagen-4.0-generate-001` | Imagen 4.0 | 7.9s | Good | Standalone image gen, `generate_images()` |
| `imagen-4.0-fast-generate-001` | Imagen 4.0 Fast | 3.5s | Good | Speed variant |
| `gemini-2.5-flash-image` | Nano Banana | 6.2s | Good | Conversational, fast, cheapest |
| `gemini-3-pro-image-preview` | **Nano Banana Pro** ⭐ | 17.6s | **Excellent** | Pro quality, reasoning, high-fidelity |
| `gemini-3.1-flash-image-preview` | **Nano Banana 2** ⭐ | 12.6s | **Excellent** | High efficiency, great quality |

### Winners: Nano Banana Pro + Nano Banana 2
- matte_d_scry preferred both over Imagen 4.0 and Nano Banana base
- No prompt token limit — full sekki descriptions work without truncation
- No local GPU needed — art generation doesn't compete with Ollama
- Conversational models (`generate_content()`) understand natural language prompts

### Local Models (not yet tested)
- **SD 3.5 Medium** (~5GB, 512 token prompts) — needs HuggingFace license acceptance
- **Flux schnell** — needs VRAM testing on Blackwell

## Prompt Interface

Art generation takes two inputs from the data model:
1. **Sekki description** — zone-offset solar term prose description
2. **Condition** — weather condition string (sunny/cloudy/rainy/snowy/frost/heat)

That's it. The description already contains the season, mood, and plants. No `visual_cue`, no `SUBJECTS_BY_ZONE_SEASON`, no keyword compression.

### Prompt Formats Tested

| Format | Description | Best For |
|--------|-------------|----------|
| Raw | Just the sekki description | Nano Banana (understands prose) |
| XML | `<condition>` `<style>` `<climate_zone>` `<content>` tags | SDXL (keyword-based) |
| Full | Watercolor framing + description + exclusions | Balance of style + content |

For Nano Banana models, the "full" prompt with style framing works best:
```
Vintage hand-drawn botanical watercolor illustration, garden scene, {zone}.
{sekki_description}
{condition}, {season}. No text, no people.
```

## Cost Considerations

- **Local SDXL:** $0/image, but needs GPU-exclusive phase (flush Ollama)
- **Gemini API:** per-token pricing, ~5,475 images/year at 15 zones
- Art is cached by (zone, term_id, condition) — same combo = same image
- At 15 zones × ~6 conditions × 24 terms = ~2,160 unique combos/year
- Many combos cache-hit across days within the same solar term

## Architecture (ARCH1)

### With local model:
Art runs in GPU-exclusive phase before dialogue. Flush Ollama → generate → flush art model → reload Ollama.

### With Gemini API:
Art is just an API call — runs in parallel with dialogue. No GPU contention. Eliminates the GPU-exclusive art phase entirely.

## History

- **Pre-March 2026:** `SUBJECTS_BY_ZONE_SEASON` lookup table per zone × season
- **March 8:** Dropped subjects table, added `visual_cue` per sekki — regression (zone-blind art)
- **March 13:** Killed `visual_cue` zombie, restored description-based prompts
- **March 13:** Added CLIP 77-token truncation (25 words) for SDXL
- **March 13:** Tested Gemini API — no token limit, superior quality, all models accessible
