# GENART.md — Plot Lines Art Generation

## Available Local Models (as of 2026-03-13)

### SD 3.5 Medium ⭐ (stabilityai/stable-diffusion-3.5-medium) — RECOMMENDED LOCAL
- **VRAM:** 17.1 GB loaded (fp16), 18.0 GB peak at 1024×384 masthead resolution
- **Speed:** ~5s at 512×512/25 steps, ~13s at 1024×1024/30 steps (full GPU)
- **Prompt limit:** 512 tokens (T5 encoder) — full descriptions fit. CLIP encoder still truncates at 77 tokens but T5 carries the detail.
- **Quality:** Massive upgrade from SD 1.5/SDXL — clean botanical watercolor, delicate layering, proper color gradation
- **Fits on Blackwell (24 GB)** with 6 GB headroom when Ollama models are unloaded
- **CPU offload available** but unnecessary during art pipeline stage (Ollama evicted)
- **CPU offload penalty:** 32.6s vs ~5s — don't use unless Ollama is competing for VRAM
- **HuggingFace:** gated repo, license accepted, token in Bitwarden "Hugging Face Token"
- **Cache:** `~/.cache/huggingface/hub/models--stabilityai--stable-diffusion-3.5-medium/` (16 GB)

### SD 1.5 (runwayml/stable-diffusion-v1-5) — CURRENT PIPELINE
- **VRAM:** ~4 GB
- **Speed:** ~2.6s at masthead resolution
- **Prompt limit:** 77 tokens (CLIP only)
- **Quality:** Flat botanical, adequate but limited
- **Cache:** 5.2 GB

### SDXL Turbo (stabilityai/sdxl-turbo) — SPEED OPTION
- **VRAM:** ~3.5 GB
- **Speed:** 1-4 inference steps, sub-second generation
- **Quality:** Good for previews/thumbnails, not masthead-quality
- **Cache:** 3.5 GB

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

### Models Tested & Rejected

| Model | Size | Why Rejected |
|-------|------|-------------|
| Playground v2.5 | 58 GB disk | Way too large for 24 GB VRAM, filled disk |
| FLUX.1 Schnell | 38 GB disk | Way too large, filled disk |
| PixArt-XL-2 | 21 GB disk | Downloaded without authorization, deleted |
| SD 3.5 Large Turbo | 15.3 GB model + 9 GB T5 | Exceeds 24 GB VRAM in fp16, needs CPU offload |
| SDXL Base 1.0 | 14 GB disk | Redundant — SD 3.5 Medium is strictly better |

### Blackwell VRAM Ceiling
- **Practical max:** ~18 GB loaded in fp16 with headroom for inference
- Any model >18 GB fp16 loaded requires CPU offload (10x slower) or won't run
- Future option: fp8/int8 quantized versions of larger models could fit — not a priority

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

### With local model (SD 3.5 Medium):
Art runs in GPU-exclusive phase before dialogue. Flush Ollama → load SD 3.5 Medium (17.1 GB) → generate at 1024×384 → flush art model → reload Ollama for dialogue.
- Full GPU speed: ~5s per image
- No CPU offload needed — Ollama models are evicted during art stage
- Peak VRAM: 18.0 GB at masthead resolution, 6 GB headroom on 24 GB

### With Gemini API:
Art is just an API call — runs in parallel with dialogue. No GPU contention. Eliminates the GPU-exclusive art phase entirely.

## Disk Management Rules

- **Check `df -h` before any model download** — refuse if available disk would drop below 50 GB
- **Never download models >20 GB disk** without explicit approval — they won't fit in VRAM anyway
- HuggingFace cache lives at `~/.cache/huggingface/hub/`
- Current cache total: ~24.7 GB (SD 3.5 Medium + SD 1.5 + SDXL Turbo + CLIP)
- 2026-03-13 incident: 117 GB of unauthorized downloads (Playground 58GB + Flux 38GB + PixArt 21GB) filled disk, crashed gateway

## History

- **Pre-March 2026:** `SUBJECTS_BY_ZONE_SEASON` lookup table per zone × season
- **March 8:** Dropped subjects table, added `visual_cue` per sekki — regression (zone-blind art)
- **March 13:** Killed `visual_cue` zombie, restored description-based prompts
- **March 13:** Added CLIP 77-token truncation (25 words) for SDXL
- **March 13:** Tested Gemini API — no token limit, superior quality, all models accessible
- **March 13:** SD 3.5 Medium downloaded, tested, verified — 18 GB peak VRAM, fits on Blackwell
- **March 13:** SDXL Turbo downloaded — speed option for previews
- **March 13:** Playground v2.5, FLUX.1 Schnell, PixArt-XL deleted — too large, filled disk to capacity
