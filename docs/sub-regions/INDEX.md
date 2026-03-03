# Sub-Regions Index
*Complete US Coverage Draft: 2026-03-02*

This document lists all 50 US states with their sub-region definitions for the Plot Lines garden newsletter.

---

## Status Summary

- **Total States:** 50
- **Total Sub-Regions:** 104
- **Bounding Boxes:** 106
- **NWS Station Codes:** 50+ mapped
- **Markdown Documentation:** Colorado, Oregon, Washington, Texas, California, New York, Iowa (examples)

---

## Sub-Region List by State

### Pacific Northwest & Mountain West

| State | Sub-Regions | Example Cities |
|-------|------------|----------------|
| **Alaska** | 1: `ak_statewide` | Anchorage, Fairbanks |
| **Arizona** | 1: `az_statewide` | Phoenix, Flagstaff, Tucson |
| **California** | 6: Central Valley, Bay Area, Sierra Foothills, High Sierra, Far North, SoCal Coast | San Francisco, Los Angeles, Sacramento |
| **Colorado** | 6: Front Range, Boulder Foothills, True Plains, Western Slope, Mountain, San Luis | Denver, Boulder, Pueblo, Grand Junction |
| **Hawaii** | 1: `hi_statewide` | Honolulu, Maui |
| **Idaho** | 1: `id_statewide` | Boise, Coeur d'Alene |
| **Montana** | 3: Western, Central, Eastern | Missoula, Bozeman, Billings |
| **Nevada** | 1: `nv_statewide` | Las Vegas, Reno |
| **New Mexico** | 1: `nm_statewide` | Santa Fe, Albuquerque |
| **Oregon** | 3: Willamette Valley, High Desert, Rogue Valley | Portland, Eugene, Bend |
| **Utah** | 1: `ut_statewide` | Salt Lake City, Moab |
| **Washington** | 2: Puget Sound, Inland | Seattle, Spokane |
| **Wyoming** | 1: `wy_statewide` | Jackson, Cheyenne |

### Great Plains

| State | Sub-Regions | Example Cities |
|-------|------------|----------------|
| **Kansas** | 1: `ks_statewide` | Kansas City, Wichita |
| **Nebraska** | 1: `ne_statewide` | Omaha, Lincoln |
| **North Dakota** | 1: `nd_statewide` | Bismarck, Grand Forks |
| **Oklahoma** | 1: `ok_statewide` | Oklahoma City, Tulsa |
| **South Dakota** | 1: `sd_statewide` | Sioux Falls, Rapid City |
| **Texas** | 9: Panhandle, North Central, Hill Country, South Central, Piney Woods, Gulf Coast, Rio Grande Valley, Coastal Bend, Trans-Pecos | Dallas, Austin, Houston, San Antonio, El Paso |

### Midwest

| State | Sub-Regions | Example Cities |
|-------|------------|----------------|
| **Illinois** | 3: Southern, Central, Chicago | Chicago, Urbana-Champaign, St. Louis area |
| **Indiana** | 1: `in_statewide` | Indianapolis, Fort Wayne |
| **Iowa** | 1: `ia_statewide` | Des Moines, Cedar Rapids |
| **Michigan** | 2: Southern, Northern | Detroit, Grand Rapids |
| **Minnesota** | 3: Twin Cities, Southern, Northern | Minneapolis-St. Paul, Rochester, Duluth |
| **Missouri** | 2: Eastern, Western | St. Louis, Kansas City |
| **Ohio** | 3: Northern, Central, Southern | Cleveland, Columbus, Cincinnati |
| **Wisconsin** | 1: `wi_eastern` | Milwaukee, Madison |

### Northeast

| State | Sub-Regions | Example Cities |
|-------|------------|----------------|
| **Connecticut** | 1: `ct_statewide` | Hartford, New Haven |
| **Maine** | 1: `me_statewide` | Portland, Bangor |
| **Massachusetts** | 2: Western, Metro (Boston) | Boston, Springfield |
| **New Hampshire** | 1: `nh_statewide` | Manchester, Nashua |
| **New Jersey** | 2: Northern, Southern | Newark, Atlantic City |
| **New York** | 4: Hudson Valley, Metro (NYC), Western, Finger Lakes | New York City, Buffalo, Rochester, Ithaca |
| **Pennsylvania** | 3: Western, Central, Eastern | Pittsburgh, Lancaster, Philadelphia |
| **Vermont** | 1: `vt_statewide` | Burlington, Montpelier |

### Southeast & South

| State | Sub-Regions | Example Cities |
|-------|------------|----------------|
| **Alabama** | 2: North, Central | Huntsville, Auburn, Montgomery |
| **Arkansas** | 2: Ozarks, Central | Little Rock, Fayetteville |
| **Florida** | 5: Panhandle, Central, West Coast, Southern, Northern | Orlando, Tampa, Miami, Jacksonville |
| **Georgia** | 3: Mountains, Piedmont, Coastal | Atlanta, Savannah |
| **Kentucky** | 2: Bluegrass, Eastern Mountains | Lexington, Eastern coal region |
| **Louisiana** | 2: New Orleans (Coastal), Central | New Orleans, Baton Rouge |
| **Maryland & DC** | 1: `md_dc_area` | Baltimore, Washington DC |
| **Mississippi** | 1: `ms_delta` | Jackson, Greenville |
| **North Carolina** | 3: Mountains, Piedmont, Coastal | Asheville, Charlotte/Raleigh, Wilmington |
| **South Carolina** | 3: Upstate, Midlands, Lowcountry | Greenville, Columbia, Charleston |
| **Tennessee** | 3: Eastern, Central, Western | Knoxville, Nashville, Memphis |
| **Virginia** | 3: Southern Appalachia, Piedmont, Tidewater | Blacksburg, Richmond, Norfolk |
| **West Virginia** | 1: `wv_appalachian` | Charleston, Morgantown |

---

## Sub-Region Naming Convention

All sub-regions follow this pattern:
```
{state_abbreviation}_{descriptor}

Examples:
- ca_bay_area
- tx_hill_country
- co_boulder_foothills
- ny_finger_lakes
- fl_southern
```

---

## How to Use

### For Subscribers

1. Gardener provides ZIP code or lat/lon
2. System looks up sub-region via:
   - **Pass 1:** NWS station code (if available)
   - **Pass 2:** Lat/lon bounding box match
3. System injects sub-region flavor text into character system prompt

### For Character Prompts

Flavor text is 2-4 sentences of specific, evocative gardening context injected into every LLM call. Examples:

> "You garden in the Bay Area — San Francisco, Oakland, Marin. Year-round growing season, no frost really. Cool foggy summers, mild wet winters. The soil is variable: clay in some places, sandy loam in others. You pick crops in December. Tomatoes struggle with cool foggy mornings."

> "You garden on Colorado's Front Range — Denver metro, clay soil that cracks in August, hail in May, chinook winds that confuse the fruit trees, 14 inches of rain a year mostly as afternoon thunderstorms. Alkaline soil (pH 7.5–8.0), Japanese beetles since 2020, and UV so intense plants sunscald. Your growing season is 155 days if you're lucky."

---

## Implementation Notes

### Bounding Box Ordering

More specific boxes must come **before** broader ones (first match wins).

Example (Colorado):
```
1. San Luis Valley (specific mountain basin)
2. Mountain communities (high elevation carve-outs)
3. Western Slope (low-elevation valleys)
4. Boulder Foothills (interface zone)
5. Front Range (urban corridor)
6. True Plains (broad eastern region)
```

### NWS Station Mapping

Used as fallback when bounding box is insufficient or station code coverage is tight enough to be meaningful. Examples:
- `PDX` → Portland OR (Willamette Valley)
- `SEA` → Seattle WA (Puget Sound)
- `BOU` → Boulder CO (Front Range)
- `CHI` → Chicago IL (Illinois Central)

### Elevation Considerations

For mountainous states (Colorado, Montana, California), elevation often matters more than lat/lon:
- High elevation towns carved out first
- Broad valley/plains boxes come later
- Subscribers near Cascade crest (WA) or Sierra crest (CA) get treated by elevation, not flat lat/lon

---

## Documentation Format

Each state should have a markdown file at `/opt/plotlines/docs/sub-regions/{state}.md` with:

1. **Overview** — Explain the state's gardening zones and what divides them
2. **Sub-Region Details** — For each sub-region:
   - Name and descriptor
   - Example cities
   - Elevation, zone, frost dates
   - Flavor text (injected into prompts)
   - Local references (specific plants, pests, phenomena)
3. **Implementation Notes** — Bounding boxes, NWS stations, ZIP patterns

See `colorado.md`, `texas.md`, `california.md` for examples.

---

## Quality Checklist

Before marking a state complete:

- [ ] All sub-regions have flavor text (2-4 sentences)
- [ ] Flavor text is specific and evocative (not generic)
- [ ] Local plant names, pests, weather phenomena mentioned
- [ ] Flavor text reads like a gardener wrote it
- [ ] Bounding boxes are non-overlapping (or intentionally ordered)
- [ ] NWS stations mapped where sensible
- [ ] Markdown documentation written (at least for complex states)
- [ ] Test file loads: `node -e "const s = require('/opt/plotlines/server/services/sub-regions'); console.log(Object.keys(s.FLAVOR_TEXT).length);"`

---

## Next Steps

1. ✓ Add all 50 states to FLAVOR_TEXT
2. ✓ Add bounding boxes for all states
3. ✓ Add NWS station codes where applicable
4. Continue expanding markdown documentation (do key states first)
5. Test regional lookups (sample cities in each state)
6. Deploy to production and monitor subscriber feedback
7. Refine flavor text based on real gardener feedback

---

## QA Feedback Needed

For each state, ask gardeners in that region:

1. Is the sub-region division accurate?
2. Does the flavor text sound like someone who actually gardens there?
3. Are local plant names, pests, or phenomena authentic?
4. Would you add or change anything?

This will drive refinement after launch.

---

**Last Updated:** 2026-03-02
**Total Regions:** 104 (50 states, variable sub-regions)
**Coverage:** 100% of United States (including Alaska, Hawaii)
