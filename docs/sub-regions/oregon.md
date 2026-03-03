# Oregon Sub-Regions
*Draft: 2026-03-02*

Parent macro zone: `pacific_northwest`

---

## Overview

Oregon's gardening divides into three distinct worlds: the wet maritime Willamette Valley where everything grows and slugs reign, the high desert east of the Cascades where irrigation is survival, and the Mediterranean Rogue Valley where wine and pears thrive. The Cascade Range is the spine that defines it all.

---

## Sub-Regions

### `or_willamette`
**Willamette Valley**
*Portland, Eugene, Salem, Corvallis*
Elevation: 50–500 ft | Zone: 8b–9a | Last frost: May 1 | First frost: Oct 15

**Flavor text for character prompts:**
> You garden in the Willamette Valley — Portland, Eugene, Salem. Forty-five inches of rain a year, almost all of it October through May. Your summers are dry and brilliant, your winters are gray and endless. The soil is volcanic, naturally rich, and slugs are the dominant gardening concern. You grow amazing berries. Last frost is May 1.

**Local references:**
- Volcanic loam soil — naturally fertile, excellent drainage
- Marionberries, boysenberries, raspberries thrive here — it's berry country
- Slugs are legendary; copper tape and beer traps are way of life
- Spring bulbs and rhododendrons go crazy — acid-loving plants love the soil pH
- Oregon Wine Country in the valley — grapes do well on south-facing slopes
- Summer is truly dry and hot (occasionally reaching 95°F) — completely different feel from winter
- Fungal disease pressure is real — powdery mildew on roses common
- Fall colors are spectacular: Japanese maples, liquid ambers

---

### `or_high_desert`
**Central Oregon High Desert**
*Bend, Redmond, La Pine, Sisters*
Elevation: 3,500–4,500 ft | Zone: 6b–7a | Last frost: Jun 1 | First frost: Sep 5

**Flavor text for character prompts:**
> You garden in Central Oregon high desert — Bend, Redmond, the pumice plateau. Eleven inches of rain a year, alkaline volcanic soil, late frosts real into June. Irrigation is not optional. Summer days hit 95°F, nights drop to 45°F. Tomatoes love the swing if they can make it through spring. Completely different from Portland.

**Local references:**
- Pumice soil — alkaline, retains water poorly, must amend heavily
- High altitude: Bend is 3,600 feet, creates dramatic day/night temperature swings
- Winter is real: temperatures regularly drop to -10°F; snow is annual
- Irrigation water availability — some areas have restrictions
- Mountain pine beetle changed forest canopy — impacts shade and runoff
- Extreme UV due to altitude and clear air — plants can sunscald
- Growing season is short and late: June plantings are normal
- Winter gardening is possible for cold-hardy crops (garlic, kale, miner's lettuce)

---

### `or_rogue_valley`
**Rogue Valley**
*Ashland, Medford, Jacksonville, Grants Pass*
Elevation: 1,200–2,000 ft | Zone: 8a–8b | Last frost: Apr 15 | First frost: Oct 20

**Flavor text for character prompts:**
> You garden in the Rogue Valley — Ashland, Medford, a Mediterranean-ish pocket between ranges. Less rain than the coast, warmer summers, mild winters. Wine grapes and pears do well here. Fire risk has become a summer reality. The valley is famous for its own microclimate.

**Local references:**
- Mediterranean microclimate: hot dry summers, mild winters, moderate rain (25 inches/year)
- Wine country — Rogue Valley wine region is established; grapes love south-facing slopes
- Pears grow exceptionally well; commercial orchards thrive here
- Fire risk: late summer brings smoke and heat stress on plants
- Elevation creates frost pockets in valley floor — cold air sinks, south-facing is warmer
- Soil is variable: volcanic in some areas, alluvial in others
- Unlike the wet coast: you get real summer heat here (90°F+ is normal)
- Shakespeare Festival in Ashland draws culture; gardening is popular

---

## Implementation Notes

### Elevation Carve-Outs

The Cascades divide Oregon dramatically:
- **West side (Willamette):** Low elevation, wet, mild, maritime influence
- **East side (High Desert):** Altitude, dryness, extreme temperature swings, alkaline soil
- **Southern pocket (Rogue):** Mediterranean, warmer, its own microclimate

For subscribers near the Cascade crest (elevation >4,000 ft), use high_desert rules even if lat/lon might suggest Willamette.

### NWS Station Mapping

| Sub-region | Primary NWS station |
|------------|-------------------|
| `or_willamette` | PDX (Portland) |
| `or_high_desert` | BND (Bend) |
| `or_rogue_valley` | MFR (Medford) |

### ZIP Code Coverage (approximate)

| Sub-region | ZIP prefixes |
|------------|-------------|
| `or_willamette` | 970, 971, 972, 973 |
| `or_high_desert` | 977 (Bend area) |
| `or_rogue_valley` | 975 (Medford/Ashland) |

---

## Questions for Gardeners

1. Is the Rogue Valley Mediterranean comparison accurate, or is it overstated?
2. For Bend gardeners: is the mountain pine beetle canopy change impacting your gardens now?
3. Berry country pride — is "marionberry" strong enough cultural reference, or miss something?
