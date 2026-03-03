# Washington Sub-Regions
*Draft: 2026-03-02*

Parent macro zone: `pacific_northwest`

---

## Overview

Washington's gardening divides into two completely different climates separated by the Cascade Range. West of the mountains: marine, mild, wet, maritime influence, slugs. East of the mountains: dry, cold winters, hot summers, irrigation necessary. The state's gardeners in Seattle and Spokane have almost nothing in common.

---

## Sub-Regions

### `wa_puget_sound`
**Puget Sound Lowlands**
*Seattle, Tacoma, Bellingham, Olympia, Bremerton*
Elevation: 0–500 ft | Zone: 8b–9a | Last frost: Apr 15 | First frost: Nov 1

**Flavor text for character prompts:**
> You garden in the Puget Sound lowlands — Seattle, Tacoma, maritime mild. Perpetually cloudy October through June, summers surprisingly dry and lovely. Slugs are your eternal enemy. Rhododendrons grow into trees. You can garden year-round if you embrace root vegetables and alliums in winter.

**Local references:**
- Maritime mild: frost is rare; growing season is very long (200+ days)
- Slugs are the dominant predator: copper tape, beer traps, hand-picking are normal
- Rhododendrons and azaleas thrive in acidic soil and maritime conditions
- Cloudy, drizzly winters (45 inches rain/year, mostly October–May)
- Summers are surprisingly dry and warm (70–80°F regularly); July–August are golden
- Soil is glacially derived: rocky, acidic, variable; often clayey in older neighborhoods
- Conifer dominance: Douglas fir, western red cedar, Sitka spruce shade many yards
- Year-round gardening possible: winter crops (kale, miner's lettuce, root vegetables) thrive

---

### `wa_inland`
**Inland Washington (East of Cascades)**
*Spokane, Wenatchee, Tri-Cities, Ellensburg, Pullman*
Elevation: 1,000–2,500 ft | Zone: 5b–6a | Last frost: May 15 | First frost: Sep 15

**Flavor text for character prompts:**
> You garden east of the Cascades — Spokane, the rain shadow. Dry summers, cold winters, nine inches of rain a year. Irrigation is the only option. Zone 5b. Wild temperature swings: 100°F summers, -20°F winters. What you grow there, you grow tough.

**Local references:**
- Rain shadow of the Cascades: only 8–12 inches/year (one-fifth of west side)
- Irrigation is not a technique, it's survival: water access and rights matter enormously
- Extreme continental climate: 100°F+ summers, -20°F winters (40°F+ swings possible)
- Short growing season due to late spring frost (mid-May) and early fall frost (mid-September)
- Alkaline soil common (pH 7.5–8.0); volcanic soil in some areas
- Summer is dry and brilliant (clear skies, intense sun)
- Sagebrush steppe ecology: native plants adapted to aridity and cold
- Spring winds can be severe; dust storms happen
- Spokane area: urban gardening culture stronger; more temperate than eastern areas

---

## Implementation Notes

### Cascades Divide

The Cascade Range is the absolute dividing line:
- **West side:** Puget Sound climate — maritime, wet, mild
- **East side:** Rain shadow — dry, cold winters, hot summers

For subscribers on the Cascade crest or in transitional valleys, use elevation (if available) as tiebreaker. High elevation = inland rules.

### NWS Station Mapping

| Sub-region | Primary NWS station |
|------------|-------------------|
| `wa_puget_sound` | SEA (Seattle), TAC (Tacoma), OLM (Olympia) |
| `wa_inland` | SPA (Spokane), MLS (Wenatchee) |

### ZIP Code Coverage (approximate)

| Sub-region | ZIP prefixes |
|------------|-------------|
| `wa_puget_sound` | 980, 981, 982, 983 |
| `wa_inland` | 990, 991, 992, 993 |

---

## QA Notes

1. East of Cascades — is the 100°F / -20°F extreme accurate for all inland areas, or just Spokane/east?
2. West side slugs — universally recognized, or too specific to western gardening culture?
3. Rhododendrons as cultural symbol — accurate enough for a gardener's identity?
