# Regional Specificity — The Problem and a Plan
*Created: 2026-03-02*

---

## The Problem

Our current climate zone system (`climate_zones` table) is intentionally coarse. It groups subscribers into ~12 macro-regions based on Koppen climate codes and general character:

- `high_plains` — Colorado, Wyoming, New Mexico high country
- `pacific_maritime` — Seattle, Portland, Eugene
- `humid_southeast` — Charlotte, Atlanta, New Orleans

This works for season timing and general weather character. It completely fails for **local gardening identity**.

### Colorado is not one place

| Region | City | Zone | Precip | Last Frost | Growing Reality |
|--------|------|------|--------|------------|-----------------|
| Front Range | Denver | 6a | 14" | May 7 | Chinook winds, hail, alkaline clay |
| True Plains | Pueblo | 6b | 12" | Apr 15 | Hotter, drier, windier than Denver |
| Western Slope | Grand Junction | 7a | 8" | Apr 10 | Desert, irrigation-dependent, fruit country |
| Mountains | Telluride | 4b | 26" | Jun 15 | 90-day season, acidic soil, elk pressure |
| Foothills | Boulder | 5b | 20" | May 5 | Microclimate chaos, west wind, clay to sand in 2 miles |

A gardener in Grand Junction is talking about peaches and drip irrigation. A gardener in Telluride is talking about row covers and whether the elk got the kale. They share a state, nothing else.

### Oregon is not one place

| Region | City | Zone | Precip | Character |
|--------|------|------|--------|-----------|
| Valley Maritime | Eugene | 8b | 47" | Slugs, gray rot, lush excess, mild winters |
| High Desert | Bend | 5b | 11" | Alkaline pumice soil, irrigation, cold snaps in June |
| Coast | Astoria | 8a | 66" | Wind, salt spray, fog, Sitka spruce everywhere |
| Rogue Valley | Ashland | 7a | 19" | Mediterranean-ish, wine country, fire risk |

Eugene and Bend are 120 miles apart and gardening on different planets.

### The Asheville / Charlotte problem

Both `appalachian` in our system. But:
- **Asheville** (2,134 ft): Zone 6b, 47" rain, mountain microclimate, cool summers, frost through April
- **Charlotte** (751 ft): Zone 7b, 43" rain, humid subtropical edge, hot summers, mild winters

Asheville is growing hostas and mountain laurel. Charlotte is fighting crepe myrtle scale and summer heat stress. Same macro zone, totally different conversation.

---

## Why Existing Systems Don't Solve This

**USDA Hardiness Zones** — Only measures average annual minimum temperature. Useful for "will this plant survive winter" but says nothing about summer heat, rainfall, soil, wind, or growing season length.

**Koppen Climate Classification** — What we're using now. Good macro classifier, too coarse for intra-state differentiation.

**Sunset Climate Zones** — The best existing garden-specific system. 45 zones in the West, accounts for elevation, fog, wind, summer heat. But: Western US only, proprietary, and still misses hyperlocal texture.

**NWS Forecast Zones** — ~3,000 zones, weather-accurate, but not garden-specific and no community identity attached.

---

## What Actually Differentiates Gardening Regions

In rough order of importance:

1. **Frost dates** — Last spring frost + first fall frost = the growing window. This is the #1 number every gardener knows.
2. **Summer heat** — Days above 90°F. Tomatoes don't set fruit above 95°F. Lettuce bolts. Everything changes.
3. **Annual precipitation + distribution** — Total matters less than *when*. 14" in Colorado falls as summer thunderstorms. 14" in Central Oregon falls as winter rain. Completely different irrigation strategies.
4. **Elevation band** — Every 1,000 feet = ~3°F cooler, shorter season, different plants possible.
5. **Humidity regime** — Humid vs arid affects pests (slugs vs spider mites), disease pressure (fungal vs bacterial), and watering strategy entirely.
6. **Soil parent material** — Clay (Denver, Charlotte), sand (coastal), pumice (Bend), limestone (Texas Hill Country), granite (Sierra Nevada foothills). Determines drainage, pH, amendment strategy.
7. **Wind character** — Chinook, marine layer, afternoon thunderstorm, none. Changes what you can grow without staking.
8. **Community identity** — "I'm a mountain gardener" vs "I'm in the valley" vs "I'm in the high desert." Characters should sound like they belong somewhere specific.

---

## Proposed Solution: Two-Layer Region System

### Layer 1: Macro Zone (existing)
Keep `climate_zones` as-is for season timing, micro-season generation, and broad character. This layer handles:
- When spring starts
- Whether it's humid or arid
- Koppen-based general persona

### Layer 2: Sub-Region (new)
A `sub_regions` table that lives *inside* macro zones. Assigned at signup by ZIP code lookup.

```
high_plains
  ├── front_range          (Denver, Boulder, Fort Collins)
  ├── true_plains          (Pueblo, Lamar, Sterling)
  ├── western_slope        (Grand Junction, Montrose, Delta)
  ├── mountain             (Telluride, Aspen, Steamboat)
  └── front_range_foothills (Evergreen, Golden, Morrison)

pacific_maritime
  ├── willamette_valley    (Eugene, Salem, Portland)
  ├── high_desert_pnw      (Bend, Redmond, Sisters)
  ├── oregon_coast         (Astoria, Newport, Coos Bay)
  ├── rogue_valley         (Ashland, Medford, Grants Pass)
  └── puget_sound          (Seattle, Tacoma, Olympia)

appalachian
  ├── southern_appalachian (Asheville, Boone)
  ├── piedmont_carolina    (Charlotte, Raleigh, Greensboro)
  ├── shenandoah           (Harrisonburg, Staunton)
  └── appalachian_plateau  (Morgantown, Charleston WV)
```

Each sub-region carries:
- **Flavor text** injected into character prompts ("You garden in the high desert of Central Oregon — pumice soil, 11 inches of rain, irrigation is not optional, late frosts are real in June")
- **Frost date range** (last spring / first fall)
- **Precip character** (amount, distribution — summer storms vs winter rain vs year-round)
- **Soil notes** (alkaline clay / volcanic pumice / coastal sand / red clay)
- **Local references** (plants, pests, landmarks that make it feel real)

### How Sub-Region Assignment Works

At signup, subscriber provides ZIP code (already collected). Lookup flow:

```
ZIP → lat/lon (already doing this) → sub_region lookup by bounding box or nearest centroid
```

No API needed. We build a static lookup table of ~500 ZIP prefixes → sub_region IDs. Most ZIP prefixes are geographically coherent (80xxx = Colorado, 972xx = Portland area, etc.).

Alternative: use the NWS station already assigned to the subscriber. Each NWS station belongs to a county; counties map to sub-regions cleanly.

---

## How It Surfaces in Dialog

The sub-region flavor text gets injected into the character system prompt alongside the existing garden context:

**Before (current):**
> "You are Buck Thorn. You garden in the High Plains & Intermountain West. It is early spring."

**After (proposed):**
> "You are Buck Thorn. You garden on Colorado's Front Range — Denver metro, clay soil that cracks in August, hail in May, chinook winds that confuse the fruit trees, 14 inches of rain a year mostly as afternoon thunderstorms. It is early spring, last frost probably two weeks out."

The difference in output is enormous. Buck stops being generic and starts sounding like he actually gardens in Lakewood.

### Character-Region Affinity (future)

Eventually, characters could have *home regions* — not hardcoded to one place (we keep them stateless), but the system could weight which characters appear based on what's relevant to the subscriber's region:

- Buster Native in Bend talks about native bunchgrasses and sagebrush restoration
- Buster Native in Charlotte talks about native piedmont species, muscadine grapes, pawpaws
- Same character, completely different conversation

---

## What Needs to Be Built

### Phase 1: Sub-Region Data (research + write)
- Define ~40-60 sub-regions covering US + Canada
- Write flavor text for each (2-3 sentences: soil, frost, precip, character)
- Include local plant/pest/weather references that make it feel real
- Store in `sub_regions` table or a static JSON file

### Phase 2: ZIP → Sub-Region Lookup
- Build ZIP prefix → sub_region mapping (~500 entries covers 90% of US)
- Fallback: lat/lon bounding box lookup
- Assign `sub_region_id` at signup (or backfill from existing ZIP/lat/lon)

### Phase 3: Prompt Injection
- Pull sub-region flavor text in `dispatch.js` when building engine args
- Inject alongside existing `garden_context`
- Engine passes it into each character's system prompt

### Phase 4: Micro-Season Refinement (optional, later)
- Sub-regions could have their own frost date adjustments on top of macro-zone micro-seasons
- Telluride's "spring" starts 6 weeks later than Denver's even though both are `high_plains`

---

## Data Sources for Sub-Region Research

- **PRISM Climate Data** (prism.oregonstate.edu) — 30-year normals by ZIP, free
- **USDA PLANTS Database** — native species by county
- **NWS Climate Normals** — frost dates by station
- **Dave's Garden / GardenWeb** — community knowledge by region
- **Sunset Garden Books** — Western US gold standard
- **Personal knowledge** — matte_d_scry knows Colorado cold; characters should know their region

---

## The Hard Problem: Making Characters Actually Reflect It

Writing accurate flavor text is the easy part. The hard part is making characters *sound like they live there* rather than reciting facts about where they live.

There's a difference between:

> "The soil here is alkaline clay with a pH of 7.8 and the last frost date is May 7."

and:

> Buck nodding slowly: "You amend or you suffer. That's the Front Range rule."

The first is a geography lesson. The second is a character who *knows* something.

### Why Prompt Injection Alone Isn't Enough

Injecting flavor text into a character prompt works — the LLM will incorporate the facts. But facts aren't voice. A character from Pueblo and a character from Telluride might both correctly mention their frost dates without sounding like different people at all.

What actually makes regional voice work:

**1. Specific nouns, not general ones**
- Weak: "The soil drains poorly"
- Strong: "The clay's like concrete by August — you can hear it crack"

**2. Local grudges and pride**
- Pueblo gardeners have complicated feelings about being lumped in with Denver
- Bend gardeners are quietly smug about their summers (hot days, cold nights = perfect tomatoes) and tired of people assuming they're just wet Portland
- Asheville gardeners know they're not really Southern

**3. The thing you argue about locally**
- Front Range: hail nets — worth it or not?
- Western Slope: irrigation water rights and the Colorado River compact
- Mountain CO: is it worth even trying tomatoes or do you just buy them?
- Pacific maritime: slugs — beer traps vs copper tape vs accepting your fate

**4. What the season *feels* like, not just when it is**
- Denver spring: "You get three fake springs before the real one"
- Willamette Valley spring: "You stop waiting for it to stop raining and just go outside anyway"
- High desert: "Spring arrives as a rumor in March and becomes undeniable in May"

### Implementation: Two-Layer Prompt Strategy

**Layer 1: Location context** (already planned — flavor text injection)
Tells the character where they are and what the growing conditions are. Factual grounding.

**Layer 2: Character-region personality hints** (new idea — needs design)
Each character has a *stance* toward their region that colors how they talk about it. Not a home address — they remain stateless. But a disposition:

- **Buck Thorn** in any region: pragmatic acceptance, probably has a fix
- **Harry Kvetch** in any region: whatever's hardest about this region is what Harry leads with
- **Edie Bell** in any region: remembers when it was different, notes what's changed
- **Buster Native** in any region: knows which plants were here before the garden and misses them

The *same* regional facts read completely differently through each of these lenses:

> **Buck on Pueblo soil:** "Caliche hardpan three feet down. You hit it with a digging bar first, or you're just decorating the surface."

> **Harry on Pueblo soil:** "Everyone talks about Rocky Ford melons like they grew themselves. Nobody mentions you spend half the season fighting the wind and the other half watching the sky for hail."

> **Edie on Pueblo soil:** "My grandmother grew chiles on this same ground. She didn't call them anything special. We just called them the chiles."

Same location. Completely different character voice. This is what we're after.

### The Practical Path

The flavor text we're writing now is Layer 1. It's necessary infrastructure. Layer 2 is a future prompt engineering problem — not a data problem.

**Don't block Layer 1 on solving Layer 2.** Get the facts right. The voice will follow once the LLM has something specific to work with. A generic "High Plains" prompt produces generic output. A Pueblo-specific prompt at least gives the model the right raw material.

---

## The 50-States Question

**The case for just doing it:**

The current situation is worse than imperfect regional coverage. Right now Denver and Telluride are in the same bucket. Charlotte and Asheville are the same newsletter. That's not a little wrong — it's completely wrong. Any sub-region data, even imperfect, is better than no sub-region data.

The QA problem is real but manageable:

- You can't personally QA 50 states, but you don't have to
- The flavor text doesn't need to be *perfect* — it needs to be *better than nothing*
- Factual errors (wrong frost date, wrong soil type) matter; vibe errors (slightly off tone) don't
- LLM-generated drafts from PRISM climate data + NWS normals will be factually solid
- Locals will notice if something is badly wrong — that's a feedback mechanism, not a launch blocker

**The case for restraint:**

- 50 states × 3-5 sub-regions = ~150-200 flavor text entries
- Bad flavor text is worse than no flavor text if it's confidently wrong
- Texas alone (Panhandle vs Hill Country vs Piney Woods vs Rio Grande Valley vs Gulf Coast) is a month of work if you try to do it right
- Better to do Colorado + PNW + Carolinas *well* and expand than to do 50 states *adequately*

**Proposed approach: Tier the rollout**

| Tier | States | Sub-regions | Method |
|------|--------|-------------|--------|
| 1 — Done | Colorado | 6 | Hand-crafted, matte_d_scry QA |
| 2 — Next | PNW, Carolinas/Appalachian | ~10 | Hand-crafted, high subscriber potential |
| 3 — LLM batch | Northeast, Midwest, Southeast, Texas, California | ~60 | LLM-drafted from PRISM+NWS data, light review |
| 4 — Fill | Remaining states | ~40 | LLM-drafted, deploy without review, fix on complaint |

Tier 3 and 4 don't need human QA for launch. If someone in the Texas Panhandle gets a flavor text that says "humid" instead of "arid," they'll tell us. The feedback loop is the QA.

**The bounding box infrastructure already exists.** Adding new sub-regions is just adding entries to `sub-regions.js`. The hard work (geography, boxes, ordering logic) is already solved for Colorado. Other states are simpler — most don't have Colorado's elevation complexity.

---

## Scope Note

Colorado is done. The pattern is proven. The question is just sequencing.

**Recommended next steps:**
1. Finish PNW and Carolinas by hand (already partially written in `sub-regions.js`)
2. Spawn a research agent to draft the remaining ~120 sub-regions from PRISM + NWS data
3. Review the drafts for obvious errors, deploy
4. Let subscriber feedback surface anything badly wrong

The bounding box geometry for most states is straightforward — no elevation complexity like Colorado. A research agent can draft Texas in one session with the right data sources.

---

## Open Questions

1. **Layer 2 prompt design** — how do character dispositions interact with regional facts? Needs a design spike with actual LLM testing.
2. **Micro-season frost date offsets** — Telluride's spring is 6 weeks later than Denver's. Should sub-regions carry frost date adjustments that modify the macro-zone micro-season calendar?
3. **Canada** — same problem, similar complexity (BC Interior vs Lower Mainland vs Ontario vs Quebec vs Maritimes). Defer to after US is solid.
4. **Feedback mechanism** — how does a subscriber tell us the regional flavor text is wrong? Support email for now; maybe a thumbs down in the manage page later.

---

*Colorado: done. PNW + Carolinas: next. Everything else: batch agent when ready.*
