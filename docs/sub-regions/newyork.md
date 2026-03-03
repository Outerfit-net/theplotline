# New York Sub-Regions
*Draft: 2026-03-02*

Parent macro zone: `northeast`

---

## Overview

New York's gardening varies with latitude and proximity to water bodies. The Hudson Valley produces incredible stone fruit and grapes. Western NY near Lake Ontario has fruit belt microclimates. The Finger Lakes are wine country with moderate, consistent conditions. NYC is an urban heat island. Elevation gradually increases going north and west toward the Adirondacks.

---

## Sub-Regions

### `ny_hudson`
**Hudson Valley**
*Albany, Poughkeepsie, Kingston, New Paltz*
Elevation: 0–300 ft | Zone: 6a–6b | Last frost: May 10 | First frost: Oct 10

**Flavor text for character prompts:**
> You garden in the Hudson Valley — Albany, the river towns. Zone 6a–6b. Cool springs, frost through late May, adequate moisture. Stone fruit and apples thrive here.

**Local references:**
- Historic fruit belt: apples, peaches, pears thrive on south-facing slopes
- Hudson River moderates temperature slightly; north–south orientation matters
- Spring comes variable: warm spell then frost is typical
- Acidic to neutral soil; glacial deposits mean rocky soil
- Elevation carve-outs: higher elevations are cooler, later frost

---

### `ny_metro`
**NYC Metro Area**
*New York City, Newark, Westchester County*
Elevation: 0–400 ft | Zone: 6b–7a | Last frost: Apr 20 | First frost: Nov 10

**Flavor text for character prompts:**
> You garden in the NYC metro area — New York, New Jersey suburbs. Zone 6b–7a. Urban heat island, variable soil, high humidity. Italian vegetables and heritage heirlooms thrive in urban gardens.

**Local references:**
- Urban heat island: 5–10°F warmer than surrounding areas due to pavement, buildings
- Roof gardens, containers, small yards dominate; community gardens are strong
- Soil quality varies wildly: old brownfields, good yards, terrible clay soil
- Italian immigrant gardening tradition: tomatoes, basil, escarole, bitter greens
- High humidity; air circulation can be poor in urban canyons
- Spring is variable; spring frost risk through mid-May

---

### `ny_western`
**Western New York (Lake Ontario)**
*Buffalo, Rochester, Niagara Falls*
Elevation: 250–400 ft | Zone: 5b–6a | Last frost: May 20 | First frost: Sep 30

**Flavor text for character prompts:**
> You garden in Western New York — Buffalo area, near Lake Ontario. Zone 5b–6a. Lake effect snow and moisture. Cooler than rest of state. Fruit belt region.

**Local references:**
- Lake Ontario moderates winter but brings heavy snow (150+ inches in some years)
- Fruit belt: apples, cherries, grapes are traditional; lake effect moisture helps
- Spring is late (May 20 frost) due to lake moderation
- Cold winters (-10 to -20°F possible) but lake delays freeze-up
- Lake effect can be blessing (moisture) or curse (snow, cloud cover)

---

### `ny_finger_lakes`
**Finger Lakes**
*Ithaca, Corning, Geneva, Seneca Falls*
Elevation: 300–600 ft | Zone: 5b–6b | Last frost: May 15 | First frost: Oct 5

**Flavor text for character prompts:**
> You garden in the Finger Lakes — Ithaca, wine country. Zone 5b–6b. The glacial lakes moderate temperature. Cool growing season, wine grapes thrive. Acidic soil.

**Local references:**
- Wine country: Riesling, other cool-climate grapes thrive on lake-facing slopes
- Glacial lakes (Seneca, Cayuga) moderate temperature slightly
- Deep glacial valleys create north–south orientation effect
- Acidic soil from glacial deposits
- College towns (Ithaca, Corning): gardening culture and interest is strong
- Spring fog from lakes can delay bud break (good for frost protection)

---

## Implementation Notes

### NWS Station Mapping

| Sub-region | Primary NWS station |
|------------|-------------------|
| `ny_hudson` | ALB (Albany) |
| `ny_metro` | NYC (New York) |
| `ny_western` | BUF (Buffalo) |
| `ny_finger_lakes` | ITH (Ithaca) — approximate |

---

## QA Notes

1. Hudson Valley stone fruit pride — universally recognized?
2. Western NY Lake Ontario effect — snow curse or moisture blessing, or both?
3. NYC urban gardening culture — is this strong enough identity?
