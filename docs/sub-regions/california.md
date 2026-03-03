# California Sub-Regions
*Draft: 2026-03-02*

Parent macro zone: `pacific_coast`

---

## Overview

California is the most botanically diverse gardening state in America. From the fog-drenched coast to the blistering Central Valley to the high Sierra to the desert, you can grow almost anything somewhere in California — but the location matters absolutely. The state's gardening divides primarily by elevation and rainfall.

---

## Sub-Regions

### `ca_bay_area`
**San Francisco Bay Area**
*San Francisco, Oakland, Marin, San Jose, Berkeley*
Elevation: 0–500 ft | Zone: 9b–10a | No frost | Year-round growing

**Flavor text for character prompts:**
> You garden in the Bay Area — San Francisco, Oakland, Marin. Year-round growing season, no frost really. Cool foggy summers, mild wet winters. The soil is variable: clay in some places, sandy loam in others. You pick crops in December. Tomatoes struggle with cool foggy mornings.

**Local references:**
- Fog is the defining feature: summer mornings are cold and gray (60°F in July)
- Tomatoes refuse to ripen in cool foggy summers; heat-loving crops struggle
- Soil is highly variable within neighborhoods: clay, sandy loam, decomposed granite
- Berkeley Hills have acidic soil; flatter areas are neutral to alkaline
- Microclimates within the Bay: Oakland is warmer than San Francisco; Marin is foggier
- Year-round gardening possible; winter is rainy (20 inches), spring-fall are dry
- Mediterranean garden plants thrive: olive, fig, artichoke, California poppy
- Urban gardening culture is strong; container gardening is common

---

### `ca_central_valley`
**Central Valley**
*Fresno, Visalia, Bakersfield, Stockton, Modesto*
Elevation: 100–500 ft | Zone: 8b–9a | No frost | Last frost: Feb, First frost: Nov

**Flavor text for character prompts:**
> You garden in the Central Valley — Fresno, Visalia, Bakersfield. Flat, hot, and agricultural. Summer temps regularly hit 105°F. Fog in winter. The soil is rich alluvial but often alkaline. Cotton, almonds, and peaches surround you. Zone 8b–9a. Your biggest enemy is summer heat stress.

**Local references:**
- Agricultural heartland: cotton, alfalfa, almonds, peaches, grapes define the landscape
- Summer heat is brutal: 105°F+ is normal July–August; heat stress kills sensitive plants
- Winter fog can be thick (tule fog); reduces light for winter crops
- Rich alluvial soil from Sierra runoff — naturally fertile but often alkaline (pH 7.5–8.5)
- Water is everything: irrigation essential, water rights are property rights
- Wind in spring can be severe; dust storms happen
- Growing season is long (300+ days) if plants survive summer heat
- Cooler north (Stockton) vs. hot south (Bakersfield); elevation affects heat a bit

---

### `ca_sierra_foothills`
**Sierra Foothills**
*Grass Valley, Placerville, Auburn, Jackson, Amador*
Elevation: 1,000–3,000 ft | Zone: 8a–8b | Last frost: May 1 | First frost: Oct 1

**Flavor text for character prompts:**
> You garden in the Sierra foothills — Grass Valley, Placerville, above the valley but below the snow. Elevation brings coolness, gold country charm, and occasional deep snow. Zone 8a–8b. Summer is hot and dry, winter is rainy but not freezing. The soil is decomposed granite over clay.

**Local references:**
- Gold Rush country: historic mining left marks on landscape; decomposed granite from old mines
- Elevation (1,500–2,500 ft typical) creates mild summer temps (85–95°F) vs. Valley (105°F+)
- Soil is decomposed granite over clay — drains well, slightly acidic, low organic matter
- Summer is hot and dry (4–5 months); irrigation necessary mid-June onward
- Winter brings rain and occasional snow (2–10 inches depending on elevation)
- Forest canopy: ponderosa pine, white fir, incense cedar define the landscape
- Slightly longer growing season than high Sierra, much shorter than valley
- Water scarcity in summer; winter rains feed springs

---

### `ca_high_sierra`
**High Sierra**
*Lake Tahoe, Mammoth Lakes, Sequoia National Park area, Carson City area*
Elevation: 6,000–8,000 ft | Zone: 4b–5a | Last frost: Jul 1 | First frost: Aug 15

**Flavor text for character prompts:**
> You garden at Lake Tahoe elevation — thin cool air, short season, snow through May. Zone 4b–5a. You grow what survives altitude and cold: hardy vegetables, cold-tolerant herbs. July and August are your garden. Lightning storms almost daily in late summer.

**Local references:**
- Snow and cold define life: 200+ inches of snow/year in high areas; snow through May common
- Growing season is extremely short: 60–90 days of frost-free nights
- Only cold-hardy crops: hardy greens, root vegetables, cabbage, potatoes, cold-tolerant herbs
- Elevation (7,000–8,000 ft) creates thin air, intense UV, extreme temperature swings
- Afternoon thunderstorms almost daily July–August; lightning is serious
- Soil is rocky, acidic, cold; doesn't warm up until July
- Alpine meadow ecology; native wildflowers are spectacular in July–August
- Year-round frost possible; you plan for it

---

### `ca_far_north`
**Far Northern California**
*Redding, Red Bluff, Chico, Paradise*
Elevation: 500–1,500 ft | Zone: 8a–8b | Last frost: Apr 15 | First frost: Oct 15

**Flavor text for character prompts:**
> You garden in far Northern California — Redding, the mountain region. Hot dry summers, cool winters. Zone 8a–8b. Less fog than the coast, more heat. The redwoods and oak savannas define the landscape. Water in summer is a challenge.

**Local references:**
- Redwood/oak savanna transition: mixed forest and grassland
- Hot dry summers (95°F+), cool winters; rain concentrated October–March
- Elevation and Sierra foothills influence: cooler than Valley, warmer than high mountains
- Sacramento River runs through region; water access varies
- Forest fire risk is real and growing; smoke season July–October affects gardens
- Soil varies: volcanic in some areas, alluvial in others
- Spring is longer than high Sierra, shorter than Central Valley
- Less Mediterranean influence than south; more continental climate

---

### `ca_socal_coastal`
**Southern California Coast**
*Los Angeles, San Diego, Santa Barbara, Ventura*
Elevation: 0–500 ft | Zone: 9b–10a | No frost | Year-round growing

**Flavor text for character prompts:**
> You garden in Southern California — Los Angeles, San Diego, the coast. No frost, year-round growing, Mediterranean dry-summer climate. Zone 9b–10a. Fog drip in some areas, totally dry in others. Your biggest enemies are drought and occasional freeze events.

**Local references:**
- Mediterranean climate: mild winters (frost rare), hot dry summers, winter rains
- Coast: fog moderates temperature in coastal areas (LA, Santa Monica); inland is hotter
- Southern California drought is ongoing; water restrictions common; drought-tolerant plants essential
- Chaparral ecology: native plants adapted to heat and aridity; fire risk
- San Diego is even warmer and drier than LA; frost extremely rare (zone 10a)
- Urban sprawl: soil quality varies wildly from yard to yard
- Year-round growing possible; winter is main growing season (rainy, mild)
- Occasional freeze events (2013, 2021) kill tender plants; frost protection essential in cold years
- Salt spray in coastal areas affects salt-sensitive plants

---

## Implementation Notes

### Elevation Carve-Outs

California's gardening divides primarily by elevation and fog influence:
- **Coast (Bay, SoCal):** Fog, marine layer, year-round mild
- **Central Valley:** Hot, flat, agricultural, alkaline
- **Sierra Foothills:** Mid-elevation, decomposed granite soil, clear summers
- **High Sierra:** Alpine, short season, snow, cold
- **Far North:** Transitional, fire risk, mixed forest/grassland

For subscribers on east side of Sierras (Reno area), this is Nevada/Mountain West territory, not California.

### NWS Station Mapping

| Sub-region | Primary NWS station |
|------------|-------------------|
| `ca_bay_area` | SFO (San Francisco) |
| `ca_central_valley` | FAT (Fresno), VIS (Visalia), BKL (Bakersfield) |
| `ca_sierra_foothills` | RDD (Redding area) — approximate |
| `ca_high_sierra` | Sparse; NWS coverage is thin; use lat/lon |
| `ca_far_north` | RDD (Redding) |
| `ca_socal_coastal` | LAX (Los Angeles), SAN (San Diego) |

---

## QA Notes

1. Bay Area fog/tomato struggle — universally recognized, or too specific to coast?
2. Central Valley heat stress (105°F) — this the defining enemy, or overstated?
3. High Sierra — is the 60–90 day growing season accurate across the region?
4. Southern California drought culture — is this strong enough identity marker?
