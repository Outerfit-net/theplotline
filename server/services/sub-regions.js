/**
 * Sub-region assignment service
 *
 * Two-pass lookup:
 *   1. Lat/lon bounding box → sub_region (PRIMARY for Colorado and anywhere
 *      NWS coverage areas are too large to be useful)
 *   2. NWS station code → sub_region (fallback for regions where station
 *      coverage is tight enough to be meaningful)
 *
 * NOTE: For Colorado, bounding boxes are authoritative. NWS stations like
 * GJT cover Grand Junction *and* Vail (4,500 ft elevation difference).
 * PUB covers Pueblo *and* the San Juans. Station codes are useless here.
 *
 * Returns sub_region_id string, or null if no match.
 */

// ── NWS station → sub-region ─────────────────────────────────────────────────
// FALLBACK ONLY for states where NWS coverage areas are sensibly sized.
// Do NOT use for Colorado — bounding boxes handle CO entirely.

const STATION_MAP = {
  // Colorado — intentionally omitted. Bounding boxes handle CO.
  // GJT covers Grand Junction AND Vail. PUB covers Pueblo AND San Juans.
  // Station codes are not useful at the sub-region level for CO.

  // Pacific Northwest
  PDX: 'or_willamette',         // Portland
  EUG: 'or_willamette',         // Eugene
  SEA: 'wa_puget_sound',        // Seattle
  OTX: 'wa_inland',             // Spokane/Inland NW
  MFR: 'or_rogue_valley',       // Medford/Ashland
  BND: 'or_high_desert',        // Bend (Central Oregon)
  SPA: 'wa_inland',             // Spokane

  // Carolinas / Appalachian
  RNK: 'va_southern_appalachia', // Blacksburg/SW Virginia
  GSP: 'sc_upstate',             // Greenville/Spartanburg
  CLT: 'nc_piedmont',            // Charlotte
  RAH: 'nc_piedmont',            // Raleigh
  AKQ: 'va_tidewater',           // Eastern Virginia
  LWX: 'md_dc_area',             // Baltimore/DC
  PIT: 'pa_western',             // Pittsburgh

  // New York / Northeast
  BUF: 'ny_western',             // Buffalo
  ALB: 'ny_hudson',              // Albany
  NYC: 'ny_metro',               // NYC area

  // Texas
  DFW: 'tx_north_central',       // Dallas-Fort Worth
  HOU: 'tx_gulf_coast',          // Houston
  AUS: 'tx_hill_country',        // Austin
  SAT: 'tx_hill_country',        // San Antonio
  AMA: 'tx_panhandle',           // Amarillo
  ELP: 'tx_trans_pecos',         // El Paso
  CRP: 'tx_coastal_bend',        // Corpus Christi

  // California
  SFO: 'ca_bay_area',            // San Francisco Bay Area
  LAX: 'ca_socal_coastal',       // Los Angeles
  SAN: 'ca_socal_coastal',       // San Diego
  FAT: 'ca_central_valley',      // Fresno / Central Valley
  SAC: 'ca_bay_area',            // Sacramento area (near Bay)

  // Midwest
  CHI: 'il_chicago',             // Chicago
  STL: 'mo_eastern',             // St. Louis
  KCI: 'mo_western',             // Kansas City
  MSP: 'mn_twin_cities',         // Minneapolis-St. Paul
  MKE: 'wi_eastern',             // Milwaukee
  CLE: 'oh_northern',            // Cleveland
  CMH: 'oh_central',             // Columbus
  DET: 'mi_southern',            // Detroit area

  // Southeast / Deep South
  ATL: 'ga_piedmont',            // Atlanta
  JAX: 'fl_northern',            // Jacksonville
  MIA: 'fl_southern',            // Miami
  MCO: 'fl_central',             // Orlando
  TPA: 'fl_west_coast',          // Tampa
  MSY: 'la_new_orleans',         // New Orleans
  MEM: 'tn_western',             // Memphis
  BNA: 'tn_central',             // Nashville
  CHA: 'tn_eastern',             // Chattanooga

  // Mountain West
  MSO: 'mt_western',             // Missoula
  BZN: 'mt_western',             // Bozeman
  BIL: 'mt_eastern',             // Billings
  BOI: 'id_statewide',           // Boise
};

// ── Bounding boxes → sub-region ──────────────────────────────────────────────
// Fallback when station_code is missing or not in STATION_MAP.
// Format: [minLat, maxLat, minLon, maxLon, sub_region_id]
// Order matters — more specific boxes first.

const BOUNDING_BOXES = [
  // ── Colorado ────────────────────────────────────────────────────────────────
  // IMPORTANT: More specific boxes must come before broader ones.
  // Elevation matters more than lat/lon here — use geography, not NWS zones.

  // San Luis Valley — high flat basin, ringed by mountains, unmistakable
  [37.1, 38.1, -106.4, -105.3, 'co_san_luis'],

  // Mountain communities first — carve out high-elevation towns BEFORE broader boxes
  [37.1, 38.3, -108.1, -107.2, 'co_mountain'],
  [38.7, 39.7, -107.5, -106.5, 'co_mountain'],
  [39.2, 40.6, -107.2, -105.6, 'co_mountain'],

  // Western Slope valleys — low-elevation Grand Valley
  [37.0, 39.8, -109.1, -107.2, 'co_western_slope'],

  // Boulder / Foothills corridor
  [39.8, 40.8, -105.6, -105.0, 'co_boulder_foothills'],

  // Front Range urban corridor
  [38.5, 40.0, -105.2, -104.4, 'co_front_range'],

  // True Plains — Pueblo south + eastern plains
  [36.9, 38.5, -105.2, -102.0, 'co_true_plains'],
  [38.5, 41.0, -104.4, -102.0, 'co_true_plains'],

  // ── Oregon ────────────────────────────────────────────────────────────────
  [45.0, 47.5, -124.5, -121.5, 'or_willamette'],
  [44.0, 44.5, -121.5, -120.5, 'or_high_desert'],
  [42.0, 42.5, -123.5, -122.5, 'or_rogue_valley'],

  // ── Washington ──────────────────────────────────────────────────────────────
  [46.5, 48.5, -122.8, -121.5, 'wa_puget_sound'],
  [46.0, 49.0, -121.0, -117.5, 'wa_inland'],

  // ── California ──────────────────────────────────────────────────────────────
  [37.5, 40.5, -122.5, -120.5, 'ca_bay_area'],
  [35.0, 37.5, -121.0, -119.0, 'ca_central_valley'],
  [33.0, 35.0, -120.0, -115.0, 'ca_socal_coastal'],
  [35.5, 39.0, -121.5, -119.5, 'ca_sierra_foothills'],
  [39.5, 41.5, -122.5, -120.0, 'ca_far_north'],
  [38.0, 39.5, -120.0, -118.5, 'ca_high_sierra'],

  // ── Texas ──────────────────────────────────────────────────────────────────
  // Hill Country first (most specific)
  [29.5, 31.5, -99.0, -97.5, 'tx_hill_country'],
  // Rio Grande Valley (far south, narrow)
  [26.0, 27.5, -97.5, -96.5, 'tx_rio_grande_valley'],
  // Coastal Bend
  [27.5, 29.0, -97.5, -96.0, 'tx_coastal_bend'],
  // Gulf Coast (Houston area)
  [29.0, 30.0, -95.5, -93.0, 'tx_gulf_coast'],
  // Piney Woods (East Texas)
  [30.0, 32.5, -96.0, -94.0, 'tx_piney_woods'],
  // South Central (transitional)
  [28.5, 30.5, -98.5, -96.0, 'tx_south_central'],
  // North Central (DFW)
  [31.5, 33.5, -97.5, -95.5, 'tx_north_central'],
  // Panhandle
  [33.0, 36.5, -102.0, -97.5, 'tx_panhandle'],
  // Trans-Pecos (far west)
  [30.0, 33.0, -106.5, -98.0, 'tx_trans_pecos'],

  // ── North Carolina ──────────────────────────────────────────────────────────
  [35.0, 36.0, -82.5, -80.5, 'nc_mountains'],
  [35.2, 36.0, -81.5, -78.5, 'nc_piedmont'],
  [34.5, 35.5, -78.5, -76.0, 'nc_coastal'],

  // ── South Carolina ──────────────────────────────────────────────────────────
  [34.2, 35.2, -82.5, -80.5, 'sc_upstate'],
  [33.5, 34.5, -81.5, -80.0, 'sc_midlands'],
  [32.5, 33.5, -80.5, -78.5, 'sc_lowcountry'],

  // ── Virginia ────────────────────────────────────────────────────────────────
  [36.5, 37.5, -83.0, -81.0, 'va_southern_appalachia'],
  [37.0, 38.5, -80.0, -78.0, 'va_piedmont'],
  [37.0, 38.0, -77.5, -75.5, 'va_tidewater'],

  // ── Maryland & DC ────────────────────────────────────────────────────────────
  [38.0, 39.5, -77.5, -75.0, 'md_dc_area'],

  // ── West Virginia ───────────────────────────────────────────────────────────
  [37.0, 40.5, -82.5, -77.5, 'wv_appalachian'],

  // ── Kentucky ────────────────────────────────────────────────────────────────
  [36.5, 39.0, -89.5, -81.5, 'ky_bluegrass'],
  [36.5, 37.5, -88.5, -82.0, 'ky_eastern_mountains'],

  // ── Tennessee ───────────────────────────────────────────────────────────────
  [35.0, 36.5, -84.0, -81.0, 'tn_eastern'],
  [35.5, 36.5, -87.5, -84.0, 'tn_central'],
  [35.0, 35.8, -89.5, -87.5, 'tn_western'],

  // ── Georgia ────────────────────────────────────────────────────────────────
  [33.5, 34.5, -85.0, -82.5, 'ga_mountains'],
  [33.5, 34.5, -84.5, -82.0, 'ga_piedmont'],
  [30.5, 32.0, -83.5, -80.5, 'ga_coastal'],

  // ── Florida ─────────────────────────────────────────────────────────────────
  [30.0, 31.0, -87.5, -85.0, 'fl_panhandle'],
  [27.5, 29.0, -83.0, -80.5, 'fl_central'],
  [27.5, 28.5, -82.5, -80.5, 'fl_west_coast'],
  [24.4, 27.0, -80.5, -79.8, 'fl_southern'],  // extended south to include Florida Keys / Key West (lat ~24.55)

  // ── Alabama ────────────────────────────────────────────────────────────────
  [32.0, 35.0, -88.5, -85.0, 'al_north'],
  [30.5, 32.5, -87.5, -85.0, 'al_central'],

  // ── Mississippi ────────────────────────────────────────────────────────────
  [30.0, 35.0, -91.5, -88.0, 'ms_delta'],

  // ── Louisiana ───────────────────────────────────────────────────────────────
  [29.0, 32.0, -93.5, -91.0, 'la_new_orleans'],
  [31.0, 33.0, -92.5, -91.0, 'la_central'],

  // ── Arkansas ────────────────────────────────────────────────────────────────
  [33.5, 36.5, -94.5, -89.5, 'ar_ozarks'],
  [33.0, 35.0, -92.5, -90.0, 'ar_central'],

  // ── New York ────────────────────────────────────────────────────────────────
  [40.5, 42.0, -77.0, -71.5, 'ny_hudson'],
  [40.5, 41.5, -76.0, -73.5, 'ny_metro'],
  [42.5, 43.0, -78.5, -77.0, 'ny_western'],
  [42.0, 44.5, -76.5, -72.0, 'ny_finger_lakes'],

  // ── Pennsylvania ────────────────────────────────────────────────────────────
  [39.5, 41.0, -80.5, -76.0, 'pa_western'],
  [40.0, 41.5, -77.5, -75.0, 'pa_central'],
  [39.5, 40.5, -76.0, -74.5, 'pa_eastern'],

  // ── New Jersey ──────────────────────────────────────────────────────────────
  [40.0, 41.5, -75.5, -73.5, 'nj_northern'],
  [39.5, 40.5, -75.0, -73.5, 'nj_southern'],

  // ── Connecticut ─────────────────────────────────────────────────────────────
  [41.0, 42.0, -73.5, -71.5, 'ct_statewide'],

  // ── Massachusetts ───────────────────────────────────────────────────────────
  [41.5, 42.5, -73.5, -70.5, 'ma_western'],
  [42.0, 42.5, -71.5, -70.5, 'ma_metro'],

  // ── Vermont & New Hampshire ─────────────────────────────────────────────────
  [43.0, 45.0, -73.5, -71.0, 'vt_statewide'],
  [43.0, 45.0, -72.5, -70.5, 'nh_statewide'],

  // ── Maine ───────────────────────────────────────────────────────────────────
  [43.0, 47.5, -71.0, -67.0, 'me_statewide'],

  // ── Ohio ────────────────────────────────────────────────────────────────────
  [40.0, 41.5, -84.5, -82.0, 'oh_northern'],
  [39.5, 40.5, -83.5, -81.5, 'oh_central'],
  [38.5, 40.0, -84.0, -81.5, 'oh_southern'],

  // ── Indiana ─────────────────────────────────────────────────────────────────
  [37.5, 41.5, -88.0, -84.5, 'in_statewide'],

  // ── Illinois ────────────────────────────────────────────────────────────────
  [37.0, 40.0, -91.5, -87.0, 'il_southern'],
  [40.0, 42.0, -88.5, -87.0, 'il_central'],
  [41.5, 42.5, -88.0, -87.0, 'il_chicago'],

  // ── Michigan ────────────────────────────────────────────────────────────────
  [41.5, 48.0, -90.5, -83.0, 'mi_southern'],
  [42.5, 48.0, -88.5, -83.5, 'mi_northern'],

  // ── Wisconsin ───────────────────────────────────────────────────────────────
  [42.0, 47.0, -92.5, -86.5, 'wi_eastern'],

  // ── Minnesota ───────────────────────────────────────────────────────────────
  [43.5, 49.5, -97.5, -89.0, 'mn_twin_cities'],
  [43.0, 45.0, -93.5, -91.0, 'mn_southern'],
  [47.0, 49.5, -92.5, -88.0, 'mn_northern'],

  // ── Iowa ────────────────────────────────────────────────────────────────────
  [40.0, 43.5, -96.5, -90.0, 'ia_statewide'],

  // ── Missouri ────────────────────────────────────────────────────────────────
  [36.5, 38.5, -90.5, -87.0, 'mo_eastern'],
  [37.5, 39.5, -95.5, -92.0, 'mo_western'],

  // ── Kansas & Nebraska ──────────────────────────────────────────────────────
  [37.0, 40.0, -102.0, -94.5, 'ks_statewide'],
  [40.0, 43.0, -104.0, -95.0, 'ne_statewide'],

  // ── South Dakota ────────────────────────────────────────────────────────────
  [42.5, 45.5, -104.0, -96.0, 'sd_statewide'],

  // ── North Dakota ────────────────────────────────────────────────────────────
  [46.0, 49.0, -104.0, -96.5, 'nd_statewide'],

  // ── Oklahoma ────────────────────────────────────────────────────────────────
  [33.5, 36.5, -100.5, -94.0, 'ok_statewide'],

  // ── Wyoming ─────────────────────────────────────────────────────────────────
  [41.0, 45.0, -111.0, -104.0, 'wy_statewide'],

  // ── Utah ────────────────────────────────────────────────────────────────────
  [37.0, 42.0, -114.0, -109.0, 'ut_statewide'],

  // ── Nevada ──────────────────────────────────────────────────────────────────
  [35.0, 42.0, -120.0, -114.5, 'nv_statewide'],

  // ── Arizona ─────────────────────────────────────────────────────────────────
  [31.0, 37.0, -114.5, -109.0, 'az_statewide'],

  // ── New Mexico ──────────────────────────────────────────────────────────────
  [31.5, 37.0, -109.0, -106.0, 'nm_statewide'],

  // ── Montana ─────────────────────────────────────────────────────────────────
  [45.0, 49.0, -116.0, -104.0, 'mt_western'],
  [45.5, 49.0, -110.0, -104.0, 'mt_central'],
  [45.0, 47.0, -107.0, -104.0, 'mt_eastern'],

  // ── Idaho ───────────────────────────────────────────────────────────────────
  [42.0, 49.0, -117.0, -111.0, 'id_statewide'],

  // ── Alaska ──────────────────────────────────────────────────────────────────
  // NOTE: lon range extended to -140.0 to include Southeast Alaska (Juneau = -134.4)
  // and the Aleutian Islands wrap past -180 but we handle that via the station map
  [54.0, 72.0, -180.0, -140.0, 'ak_statewide'],
  [54.0, 72.0, -140.0, -129.0, 'ak_statewide'],  // Southeast AK: Juneau, Ketchikan, Sitka

  // ── Hawaii ──────────────────────────────────────────────────────────────────
  [18.5, 22.5, -160.0, -154.5, 'hi_statewide'],
];

/**
 * Get sub-region for a subscriber.
 * @param {string|null} stationCode - NWS station code (e.g. 'BOU')
 * @param {number|null} lat
 * @param {number|null} lon
 * @returns {string|null} sub_region_id or null
 */
function getSubRegion(stationCode, lat, lon) {
  // Pass 1: station code
  if (stationCode && STATION_MAP[stationCode]) {
    return STATION_MAP[stationCode];
  }

  // Pass 2: bounding box
  if (lat != null && lon != null) {
    for (const [minLat, maxLat, minLon, maxLon, regionId] of BOUNDING_BOXES) {
      if (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon) {
        return regionId;
      }
    }
  }

  return null;
}

/**
 * Get sub-region flavor text for prompt injection.
 * Returns null if no flavor text defined for this sub-region.
 * @param {string} subRegionId
 * @returns {string|null}
 */
function getSubRegionFlavor(subRegionId) {
  return FLAVOR_TEXT[subRegionId] || null;
}

// ── Flavor text — injected into character system prompts ─────────────────────
// Keep these concise (2-4 sentences). They go into every LLM call.

const FLAVOR_TEXT = {
  // ── Colorado ───────────────────────────────────────────────────────────────
  co_front_range:
    'You garden on Colorado\'s Front Range — Denver metro, clay soil that cracks in August, hail in May, chinook winds that confuse the fruit trees, 14 inches of rain a year mostly as afternoon thunderstorms. Alkaline soil (pH 7.5–8.0), Japanese beetles since 2020, and UV so intense plants sunscald. Your growing season is 155 days if you\'re lucky.',

  co_boulder_foothills:
    'You garden in Boulder County where the mountains begin — west wind constant and drying, soil that changes every half-mile from river loam to clay bench to decomposed granite. Spring comes fast and mean: 70°F then blizzard then 70°F again. Wildfire smoke has become a June reality. Last frost officially May 5 but you don\'t trust it until Mother\'s Day.',

  co_true_plains:
    'You garden on Colorado\'s plains — Pueblo south through Rocky Ford, La Junta, and out to Lamar. This is where the Front Range runs out and the sky takes over. Pueblo is the hinge: hotter than Denver, drier, more wind, and the mountains are behind you now rather than next door. Pueblo green chiles are a point of fierce local pride — different from Hatch, don\'t let anyone tell you otherwise. Rocky Ford cantaloupes and watermelons are famous for a reason: alkaline soil, brutal sun, and hot nights concentrate the sugar like nowhere else. Wind is your constant adversary. Spring comes 2–3 weeks earlier than Denver. Summer heat is your limiting factor, not frost.',

  co_western_slope:
    'You garden on Colorado\'s Western Slope — the rain shadow side, where Grand Junction gets 8 inches of rain a year and irrigation is not optional, it\'s the only reason anything grows. Palisade peaches are famous for a reason. Sandy loam over alkaline clay, caliche layer common. Spring comes earlier here than anywhere else in Colorado.',

  co_mountain:
    'You garden at altitude — somewhere between 7,000 and 10,000 feet, where your growing season is 90 days long if you\'re lucky. Last frost mid-June. First frost September 1. Elk eat everything that isn\'t fenced. UV radiation is intense, soil is rocky and acidic, and snow in any month is a real possibility. You grow with ferocious intensity because the season is short.',

  co_san_luis:
    'You garden in the San Luis Valley — high-altitude flatland at 7,500 feet, ringed by mountains, one of the coldest inhabited places in the contiguous US. Seven inches of rain a year but artesian wells run beneath you. The valley grows potatoes at industrial scale because that\'s what thrives: cold-tolerant, underground, patient. Your 90-day window demands efficiency.',

  // ── Oregon ─────────────────────────────────────────────────────────────────
  or_willamette:
    'You garden in the Willamette Valley — Portland, Eugene, Salem. Forty-five inches of rain a year, almost all of it October through May. Your summers are dry and brilliant, your winters are gray and endless. The soil is volcanic, naturally rich, and slugs are the dominant gardening concern. You grow amazing berries. Last frost is May 1.',

  or_high_desert:
    'You garden in Central Oregon high desert — Bend, Redmond, the pumice plateau. Eleven inches of rain a year, alkaline volcanic soil, late frosts real into June. Irrigation is not optional. Summer days hit 95°F, nights drop to 45°F. Tomatoes love the swing if they can make it through spring. Completely different from Portland.',

  or_rogue_valley:
    'You garden in the Rogue Valley — Ashland, Medford, a Mediterranean-ish pocket between ranges. Less rain than the coast, warmer summers, mild winters. Wine grapes and pears do well here. Fire risk has become a summer reality. The valley is famous for its own microclimate.',

  // ── Washington ──────────────────────────────────────────────────────────────
  wa_puget_sound:
    'You garden in the Puget Sound lowlands — Seattle, Tacoma, maritime mild. Perpetually cloudy October through June, summers surprisingly dry and lovely. Slugs are your eternal enemy. Rhododendrons grow into trees. You can garden year-round if you embrace root vegetables and alliums in winter.',

  wa_inland:
    'You garden east of the Cascades — Spokane, the rain shadow. Dry summers, cold winters, nine inches of rain a year. Irrigation is the only option. Zone 5b. Wild temperature swings: 100°F summers, -20°F winters. What you grow there, you grow tough.',

  // ── California ─────────────────────────────────────────────────────────────
  ca_bay_area:
    'You garden in the Bay Area — San Francisco, Oakland, Marin. Year-round growing season, no frost really. Cool foggy summers, mild wet winters. The soil is variable: clay in some places, sandy loam in others. You pick crops in December. Tomatoes struggle with cool foggy mornings.',

  ca_central_valley:
    'You garden in the Central Valley — Fresno, Visalia, Bakersfield. Flat, hot, and agricultural. Summer temps regularly hit 105°F. Fog in winter. The soil is rich alluvial but often alkaline. Cotton, almonds, and peaches surround you. Zone 8b–9a. Your biggest enemy is summer heat stress.',

  ca_sierra_foothills:
    'You garden in the Sierra foothills — Grass Valley, Placerville, above the valley but below the snow. Elevation brings coolness, gold country charm, and occasional deep snow. Zone 8a–8b. Summer is hot and dry, winter is rainy but not freezing. The soil is decomposed granite over clay.',

  ca_high_sierra:
    'You garden at Lake Tahoe elevation — thin cool air, short season, snow through May. Zone 4b–5a. You grow what survives altitude and cold: hardy vegetables, cold-tolerant herbs. July and August are your garden. Lightning storms almost daily in late summer.',

  ca_far_north:
    'You garden in far Northern California — Redding, the mountain region. Hot dry summers, cool winters. Zone 8a–8b. Less fog than the coast, more heat. The redwoods and oak savannas define the landscape. Water in summer is a challenge.',

  ca_socal_coastal:
    'You garden in Southern California — Los Angeles, San Diego, the coast. No frost, year-round growing, Mediterranean dry-summer climate. Zone 9b–10a. Fog drip in some areas, totally dry in others. Your biggest enemies are drought and occasional freeze events.',

  // ── Texas ──────────────────────────────────────────────────────────────────
  tx_panhandle:
    'You garden in the Texas Panhandle — Amarillo, Lubbock, the high plains. Zone 7b–8a. Short growing season, intense sun, wind that never stops. Hail season is real. The soil is caliche-heavy, water-restrictive; hardpan is typical. Winter lows hit -15°F.',

  tx_north_central:
    'You garden in North Central Texas — Dallas, Fort Worth, the metroplex. Zone 8a. Hot humid summers, mild winters, hail and severe thunderstorms. Red clay soil, hard and tight. Spring arrives early, summer arrives hard. Oak wilt is a threat to shade trees.',

  tx_hill_country:
    'You garden in the Hill Country — Austin, San Antonio. Zone 8b. Limestone hills, challenging soil, incredibly variable terrain. Spring wildflowers define the season. Summer heat hits 100°F regularly. Your soil pH is often 8.0 or higher. Soil varies radically within miles.',

  tx_south_central:
    'You garden in South Central Texas — San Antonio area transitional zone. Zone 8b–9a. Hot dry summers, mild winters, limestone hills mixed with flatter terrain. The Balcones Escarpment defines the region. Fire danger in drought years.',

  tx_piney_woods:
    'You garden in East Texas Piney Woods — Nacogdoches, Lufkin, deep forest. Zone 8a–8b. Acidic sandy soil, pine trees everywhere, humid summers, mild winters. It feels like the Deep South because it is. Water availability is good.',

  tx_gulf_coast:
    'You garden on the Texas Gulf Coast — Houston, Beaumont, coastal humid subtropical. Zone 9a. Ninety-five inches of rain a year, tropical feel, salt spray in exposed areas. Humidity breeds fungal diseases. Summer feels like 110°F from June through September.',

  tx_rio_grande_valley:
    'You garden in the Rio Grande Valley — McAllen, Brownsville, southernmost Texas. Zone 9b–10a. No frost some years. Tropical, humid, subtropical fruit paradise. Sugarcane, citrus, avocados. Hurricane season is real. Salinity in some soils.',

  tx_coastal_bend:
    'You garden in the Coastal Bend — Corpus Christi, Kingsville. Zone 9a–9b. Salt spray in coastal areas, humid subtropical. Cattle ranching defines the landscape. Water can be saline in some areas.',

  tx_trans_pecos:
    'You garden in the Trans-Pecos — El Paso, far west Texas. Zone 8a. High desert, low rain, intense sun, wind. Elevation near 4,000 feet. Soil is alkaline and poor. It\'s more like Arizona than the rest of Texas.',

  // ── Carolinas ──────────────────────────────────────────────────────────────
  nc_mountains:
    'You garden in the North Carolina mountains — Asheville, Boone, the Blue Ridge. Zone 6a–6b. Cool springs, short summers, frost through April. Acidic soil, rhododendrons love it here. Wildfire smoke in late summer. Elevation makes all the difference.',

  nc_piedmont:
    'You garden in the North Carolina Piedmont — Charlotte, Raleigh, the red clay country. Zone 7b–8a. Hot humid summers, mild winters. Red clay soil needs heavy amendment. Japanese beetles, deer pressure. Four-season gardening but summer heat is brutal.',

  nc_coastal:
    'You garden in the North Carolina coastal plain — Wilmington, the Outer Banks. Zone 8b. Maritime influence, sandy soil, salt spray exposure. Hurricanes are annual consideration. Growing season is long.',

  sc_upstate:
    'You garden in Upstate South Carolina — Greenville, Spartanburg, the Piedmont. Zone 7b–8a. Similar to NC Piedmont: red clay, hot humid summers, mild winters. Part of the broader Piedmont ecosystem.',

  sc_midlands:
    'You garden in the South Carolina Midlands — Columbia area. Zone 8a. Red clay, hot humid summers, mild winters. Slightly warmer than upstate.',

  sc_lowcountry:
    'You garden in the South Carolina Lowcountry — Charleston, the coastal marshes. Zone 9a. Maritime influence, sandy soil, salt spray, high humidity. Spanish moss defines the aesthetic. Subtropical feel.',

  // ── Virginia ───────────────────────────────────────────────────────────────
  va_southern_appalachia:
    'You garden in Southwest Virginia mountains — Blacksburg, the foothills. Zone 6b–7a. Cool springs, acidic soil, frost through May. The mountains define everything. Similar to the NC mountains.',

  va_piedmont:
    'You garden in the Virginia Piedmont — Richmond, Charlottesville, rolling hills. Zone 7b–8a. Red clay, hot humid summers, frost risk into April. Thomas Jefferson gardened here.',

  va_tidewater:
    'You garden in the Virginia Tidewater — Norfolk, the coast. Zone 8a–8b. Maritime influence, sandy soil, salt spray in exposed areas. High humidity, thunderstorms. The Elizabeth River defines the region.',

  // ── Maryland & DC ──────────────────────────────────────────────────────────
  md_dc_area:
    'You garden in the DC-Baltimore corridor — Washington, Baltimore, the Mid-Atlantic. Zone 7a–7b. Hot humid summers, cold winters, moderate moisture. Highly variable soil in the region. Urban heat island effect is real.',

  // ── West Virginia ──────────────────────────────────────────────────────────
  wv_appalachian:
    'You garden in West Virginia — mountains everywhere, deep hollows, coal country history. Zone 6a–7a. Acidic soil, plenty of rain, cool springs, frost into May. The mountains define gardening here more than latitude.',

  // ── Kentucky ───────────────────────────────────────────────────────────────
  ky_bluegrass:
    'You garden in the Kentucky Bluegrass — Lexington, horse country. Zone 6b–7a. Limestone underlies everything; pH is neutral to alkaline. Rich soil, moderate rain. Spring comes fast. Frost risk into mid-May.',

  ky_eastern_mountains:
    'You garden in Eastern Kentucky mountains — Appalachian coal region. Zone 6a–6b. Acidic soil, cool springs, mountains everywhere. Similar to West Virginia.',

  // ── Tennessee ──────────────────────────────────────────────────────────────
  tn_eastern:
    'You garden in East Tennessee — Knoxville, the Great Smoky region. Zone 7a–7b. Acidic soil, mountains, cool springs, humid summers. The Smokies define the landscape.',

  tn_central:
    'You garden in Central Tennessee — Nashville, rolling hills. Zone 7a–7b. Limestone underlies some areas, clay elsewhere. Hot humid summers, mild winters, 48 inches of rain.',

  tn_western:
    'You garden in West Tennessee — Memphis, the Mississippi Delta region. Zone 7b–8a. Flat, rich alluvial soil, high humidity, longer growing season. Very different from eastern mountains.',

  // ── Georgia ────────────────────────────────────────────────────────────────
  ga_mountains:
    'You garden in North Georgia mountains — cool springs, frost through April, acidic soil. Zone 6b–7a. The mountains create their own climate. Much cooler than Atlanta.',

  ga_piedmont:
    'You garden in the Georgia Piedmont — Atlanta metro, red clay country. Zone 7b–8a. Hot humid summers, red clay soil. Explosive spring, brutal summer.',

  ga_coastal:
    'You garden in Coastal Georgia — Savannah, the maritime lowcountry. Zone 8a–8b. Sandy soil, salt spray, subtropical feel. Spanish moss, maritime live oaks.',

  // ── Florida ────────────────────────────────────────────────────────────────
  fl_panhandle:
    'You garden on the Florida Panhandle — Pensacola, the beach region. Zone 8b–9a. Sand soil, hurricanes annual, salt spray. Subtropical gardens.',

  fl_central:
    'You garden in Central Florida — Orlando, the interior. Zone 8b–9a. Flat, sandy soil, lakes everywhere, no frost most years. Summer afternoon thunderstorms. Growing season is effectively year-round.',

  fl_west_coast:
    'You garden on Florida\'s West Coast — Tampa, the Gulf side. Zone 8b–9a. Sandy soil, hurricane alley, salt spray in coastal areas. Subtropical fruit is possible.',

  fl_southern:
    'You garden in South Florida — Miami, the Keys. Zone 10b. Tropical, no frost, limestone bedrock, high humidity. Salt spray is intense in Keys. Year-round growing.',

  fl_northern:
    'You garden in Northern Florida — Jacksonville, the panhandle transition. Zone 8b–9a. Sandy soil, humid subtropical, ocean influence. Transitional between panhandle and central.',

  // ── Alabama ────────────────────────────────────────────────────────────────
  al_north:
    'You garden in North Alabama — Huntsville, foothills region. Zone 7a–7b. Red clay, cool springs, moderate rain. Not as mountainous as Tennessee but hills are present.',

  al_central:
    'You garden in Central Alabama — Auburn, Montgomery, piedmont and coastal plain transition. Zone 7b–8a. Red clay in some areas, flatter terrain in others. Hot humid summers.',

  // ── Mississippi ────────────────────────────────────────────────────────────
  ms_delta:
    'You garden in the Mississippi Delta — flat, rich alluvial soil, humid subtropical. Zone 8a–8b. The greatest gardening soil in North America: river-deposited fertility. Summer heat and humidity are extreme.',

  // ── Louisiana ──────────────────────────────────────────────────────────────
  la_new_orleans:
    'You garden in Coastal Louisiana — New Orleans, the bayous. Zone 9a–9b. High humidity, tropical feel, seasonal flooding risk. The Mississippi River defines everything. Year-round growing possible.',

  la_central:
    'You garden in Central Louisiana — Alexandria, transitional zone. Zone 8a–8b. Hot humid summers, mild winters, adequate moisture. Part of the broader Deep South.',

  // ── Arkansas ───────────────────────────────────────────────────────────────
  ar_ozarks:
    'You garden in the Arkansas Ozarks — northern mountains. Zone 6b–7a. Cool springs, rocky soil, limestone underlies some areas. The Buffalo National River defines the region aesthetically.',

  ar_central:
    'You garden in Central Arkansas — Little Rock, piedmont/plains transition. Zone 7b–8a. Hot humid summers, red clay, mild winters. Four-season gardening.',

  // ── New York ───────────────────────────────────────────────────────────────
  ny_hudson:
    'You garden in the Hudson Valley — Albany, the river towns. Zone 6a–6b. Cool springs, frost through late May, adequate moisture. Stone fruit and apples thrive here.',

  ny_metro:
    'You garden in the NYC metro area — New York, New Jersey suburbs. Zone 6b–7a. Urban heat island, variable soil, high humidity. Italian vegetables and heritage heirlooms thrive in urban gardens.',

  ny_western:
    'You garden in Western New York — Buffalo area, near Lake Ontario. Zone 5b–6a. Lake effect snow and moisture. Cooler than rest of state. Fruit belt region.',

  ny_finger_lakes:
    'You garden in the Finger Lakes — Ithaca, wine country. Zone 5b–6b. The glacial lakes moderate temperature. Cool growing season, wine grapes thrive. Acidic soil.',

  // ── Pennsylvania ───────────────────────────────────────────────────────────
  pa_western:
    'You garden in Western Pennsylvania — Pittsburgh area. Zone 5b–6a. Cold winters, moderate moisture, acidic soil. Appalachian foothills.',

  pa_central:
    'You garden in Central Pennsylvania — Lancaster, Harrisburg. Zone 6a–6b. Lancaster is Amish farm country: rich soil, intensive agriculture. Limestone bedrock in some areas.',

  pa_eastern:
    'You garden in the Philadelphia area — Eastern Pennsylvania. Zone 6b–7a. Urban heat island, variable soil, high humidity. Urban/suburban gardens.',

  // ── New Jersey ─────────────────────────────────────────────────────────────
  nj_northern:
    'You garden in Northern New Jersey — Zone 6a–6b. Similar to Western NY / Eastern PA. Cold winters, moderate moisture. Some Appalachian influence.',

  nj_southern:
    'You garden in Southern New Jersey — coastal plain. Zone 7a. Sandy soil, coastal influence in southern parts. Less elevation, more maritime feel.',

  // ── Connecticut ────────────────────────────────────────────────────────────
  ct_statewide:
    'You garden in Connecticut — Zone 6a–6b. Coastal influence in south, rocky soil throughout. Transitional between Northeast and Mid-Atlantic. Cold springs, humid summers.',

  // ── Massachusetts ──────────────────────────────────────────────────────────
  ma_western:
    'You garden in Western Massachusetts — Berkshires, hills. Zone 5b–6a. Acidic soil, cold springs, moderate moisture. Upland region.',

  ma_metro:
    'You garden in the Boston area — Eastern Massachusetts. Zone 6a–6b. Coastal influence, cold springs, rocky glacial soil. Urban/suburban gardens.',

  // ── Vermont & New Hampshire ────────────────────────────────────────────────
  vt_statewide:
    'You garden in Vermont — the Green Mountains. Zone 4b–5b. Short growing season, cold winters, abundant moisture. Maple country. Frost is possible in any month.',

  nh_statewide:
    'You garden in New Hampshire — White Mountains, Lakes region. Zone 4a–5b. Cold winters, short season, rocky soil. Similar to Vermont but slightly warmer in south.',

  // ── Maine ──────────────────────────────────────────────────────────────────
  me_statewide:
    'You garden in Maine — the northeasternmost state. Zone 4a–5a. Short intense growing season, cool nights, rocky glacial soil. Blueberries and cold-hardy crops define the region.',

  // ── Ohio ───────────────────────────────────────────────────────────────────
  oh_northern:
    'You garden in Northern Ohio — Cleveland area. Zone 5b–6a. Lake influence, moderate moisture, clay/silt soil. Similar to Michigan.',

  oh_central:
    'You garden in Central Ohio — Columbus, Ohio farmland. Zone 6a–6b. Rich deep soil, flat terrain, moderate moisture. Agricultural heartland.',

  oh_southern:
    'You garden in Southern Ohio — Cincinnati area, hills. Zone 6a–6b. Slightly warmer, hills present, transitional to Kentucky/Appalachia.',

  // ── Indiana ────────────────────────────────────────────────────────────────
  in_statewide:
    'You garden in Indiana — the Corn Belt. Zone 5b–6a. Flat, rich deep soil, good moisture. Agricultural heartland. One of the most consistent growing zones in America.',

  // ── Illinois ───────────────────────────────────────────────────────────────
  il_southern:
    'You garden in Southern Illinois — Carbondale, hilly region. Zone 6a–6b. Transitional to Kentucky. Less flat than central Illinois.',

  il_central:
    'You garden in Central Illinois — Urbana, Champaign, prairie heartland. Zone 5b–6a. Flat, rich deep soil, the most consistent climate in the Midwest. Perfect for corn and soybeans.',

  il_chicago:
    'You garden in the Chicago metro area — Northern Illinois. Zone 5b–6a. Lake influence, urban heat island, clay soil. Very variable from yard to yard.',

  // ── Michigan ───────────────────────────────────────────────────────────────
  mi_southern:
    'You garden in Southern Michigan — near the Great Lakes. Zone 5b–6a. Lake effect snow and moderation, fruit belt region. Glacial soil, variable.',

  mi_northern:
    'You garden in Northern Michigan — dunes region, cooler. Zone 4b–5a. Lake effect is even stronger here. Shorter season.',

  // ── Wisconsin ──────────────────────────────────────────────────────────────
  wi_eastern:
    'You garden in Eastern Wisconsin — near Lake Michigan. Zone 4b–5b. Lake effect snow and moderation, glacial soil. Cool springs, adequate moisture.',

  // ── Minnesota ──────────────────────────────────────────────────────────────
  mn_twin_cities:
    'You garden in the Twin Cities — Minneapolis, St. Paul. Zone 4a–4b. Cold winters, short summers, glacial soil. Cold hardy crops, season extension necessary.',

  mn_southern:
    'You garden in Southern Minnesota — slightly warmer than Twin Cities. Zone 4b–5a. Rolling prairie terrain. Agricultural heartland.',

  mn_northern:
    'You garden in Northern Minnesota — short season, cold. Zone 3b–4a. Cold hardy crops only. Boreal forest influence.',

  // ── Iowa ───────────────────────────────────────────────────────────────────
  ia_statewide:
    'You garden in Iowa — Corn Belt heartland. Zone 4b–5b. Rolling prairie, rich deep soil, good moisture. Agricultural heartland. Consistent growing conditions.',

  // ── Missouri ───────────────────────────────────────────────────────────────
  mo_eastern:
    'You garden in Eastern Missouri — St. Louis area, Ozarks foothills. Zone 6a–6b. Mississippi River influence. Hot humid summers, mild winters.',

  mo_western:
    'You garden in Western Missouri — Kansas City area, plains. Zone 5b–6a. Prairie-transitional. Hot dry summers, cold winters.',

  // ── Kansas & Nebraska ──────────────────────────────────────────────────────
  ks_statewide:
    'You garden in Kansas — the Great Plains. Zone 5b–6a. Flat, prairie soil, hot dry summers, cold winters. Dust bowl history. Wind is your constant.',

  ne_statewide:
    'You garden in Nebraska — the Great Plains heartland. Zone 4b–5b. Flat, rich prairie soil, good moisture from Corn Belt to drier west. Transitions from humid to semi-arid.',

  // ── South Dakota ────────────────────────────────────────────────────────────
  sd_statewide:
    'You garden in South Dakota — high plains. Zone 4a–5a. Short season, cold winters, moderate moisture. Similar to Nebraska but cooler and drier.',

  // ── North Dakota ───────────────────────────────────────────────────────────
  nd_statewide:
    'You garden in North Dakota — the northern high plains. Zone 3b–4b. Extremely cold winters, short season, low moisture. Growing is a challenge.',

  // ── Oklahoma ───────────────────────────────────────────────────────────────
  ok_statewide:
    'You garden in Oklahoma — transitional from Great Plains to Gulf South. Zone 7a–7b. Hot dry summers, cold winters, moderate moisture. Dust bowl history. Severe thunderstorms, hail.',

  // ── Wyoming ────────────────────────────────────────────────────────────────
  wy_statewide:
    'You garden in Wyoming — high plains and mountains. Zone 4a–5a. Cold winters, short season, low rain. Wind is relentless. Altitude makes gardening challenging.',

  // ── Utah ───────────────────────────────────────────────────────────────────
  ut_statewide:
    'You garden in Utah — Wasatch Mountains and desert. Zone 5a–7a (variable). Low rain, alkaline soil common, intense sun. Salt Lake City area is temperate; desert is harsh.',

  // ── Nevada ─────────────────────────────────────────────────────────────────
  nv_statewide:
    'You garden in Nevada — high desert. Zone 5b–8a. Low rain, alkaline soil, intense sun, extreme temperatures. Las Vegas is zone 9b; Reno is zone 6a. Massive variation.',

  // ── Arizona ────────────────────────────────────────────────────────────────
  az_statewide:
    'You garden in Arizona — Sonoran and Chihuahuan deserts with mountains. Zone 7b–10a. Intense heat, low rain, alkaline soil, extreme temperature swings. Phoenix summers are brutal (120°F). Northern Arizona is high elevation, cool.',

  // ── New Mexico ─────────────────────────────────────────────────────────────
  nm_statewide:
    'You garden in New Mexico — high desert, mountains, mesas. Zone 5a–8a (variable). Low rain, alkaline soil, intense sun, seasonal afternoon thunderstorms. Elevation is everything: Santa Fe is 7,000 feet and zone 5.',

  // ── Montana ────────────────────────────────────────────────────────────────
  mt_western:
    'You garden in Western Montana — Missoula, Bozeman, intermountain valleys. Zone 5a–5b. Cold winters, short growing season, moderate moisture, acidic soil. Glacial valleys, beautiful mountains.',

  mt_central:
    'You garden in Central Montana — transitional zone. Zone 4b–5a. Similar to western but drier. High plains and mountains mixed.',

  mt_eastern:
    'You garden in Eastern Montana — Billings area, high plains. Zone 4b–5a. Drier than west, colder than west, wind relentless. Prairie region.',

  // ── Idaho ──────────────────────────────────────────────────────────────────
  id_statewide:
    'You garden in Idaho — high mountain country. Zone 4a–6b (variable). Short season in north, longer in south (Boise area). Alkaline soil in some areas, acidic in others. Intense seasonal shifts.',

  // ── Alaska ─────────────────────────────────────────────────────────────────
  ak_statewide:
    'You garden in Alaska — the far north. Zone 1b–7a (varies wildly by location). Anchorage is zone 3a. Midnight sun in summer, darkness in winter. Permafrost in north. Season is extremely short: June through August for most areas.',

  // ── Hawaii ─────────────────────────────────────────────────────────────────
  hi_statewide:
    'You garden in Hawaii — tropical year-round. Zone 10a–12 (varies by island and elevation). No frost, no cold season. Abundant rain on windward sides, dry on leeward. Ocean salt spray in exposed areas. Volcanic soil.',
};

// ── Concise sub-region descriptions — injected as sub_region_description ─────
// Short, natural-language descriptions for characters to reference their location.
// Keys include both canonical names and aliases matching getSubRegion() IDs.

const SUB_REGION_FLAVOR = {
  // Canonical keys from spec
  colorado_front_range: "the Colorado Front Range, where gardens sit at 5,000-6,000 feet with intense sun, sudden hailstorms, and late frosts",
  co_eastern_plains: "the Colorado Eastern Plains, a vast shortgrass prairie with dry winds and unpredictable springs",
  wyoming_high_plains: "the Wyoming High Plains, where wind is constant and the growing season is short but intense",
  willamette_valley: "Oregon's Willamette Valley, with mild wet winters and dry summers perfect for cool-season crops",
  puget_sound: "the Puget Sound region, where maritime fog and year-round mild temps create a unique growing season",
  or_coast: "the Oregon Coast, perpetually cool and misty with a gardening season unlike anywhere else",
  norcal_central_valley: "California's Central Valley, with scorching summers and some of the most fertile farmland on earth",
  socal_coastal: "coastal Southern California, where Mediterranean sun and ocean breezes make year-round gardening possible",
  bay_area: "the San Francisco Bay Area, where microclimates shift block by block and fog is a gardening variable",
  fl_panhandle: "the Florida Panhandle, humid and subtropical but with genuine winters unlike South Florida",
  sc_lowcountry: "South Carolina's Lowcountry, coastal marshland with heat, humidity, and sandy soils",
  la_statewide: "Louisiana, where the Gulf Coast humidity and rich deltaic soils define everything that grows",
  me_coastal: "coastal Maine, where the short sharp growing season rewards patience and cold-hardy varieties",
  ny_hudson_valley: "New York's Hudson Valley, a gardening region with deep agricultural history and distinct seasons",
  new_england_inland: "inland New England, where late springs and early frosts bracket an intense summer of growth",
  fl_keys: "the Florida Keys, a subtropical island chain where frost is unknown and saltwater shapes every garden",
  hi_windward: "the windward slopes of Hawaii, lush and rainy with tropical abundance year-round",
  hi_leeward: "the leeward side of Hawaii, drier and sunnier with a completely different palette of plants",
  ak_anchorage: "the Anchorage bowl, where gardeners race the midnight sun and treasure every frost-free day",
  ak_juneau: "Southeast Alaska, rainforest-adjacent with surprising growing power under long summer days",
  ak_fairbanks: "Interior Alaska, where permafrost and 20-hour summer days create an extreme gardening challenge",

  // Aliases matching getSubRegion() IDs
  co_front_range: "the Colorado Front Range, where gardens sit at 5,000-6,000 feet with intense sun, sudden hailstorms, and late frosts",
  co_true_plains: "the Colorado Eastern Plains, a vast shortgrass prairie with dry winds and unpredictable springs",
  wy_statewide: "the Wyoming High Plains, where wind is constant and the growing season is short but intense",
  or_willamette: "Oregon's Willamette Valley, with mild wet winters and dry summers perfect for cool-season crops",
  wa_puget_sound: "the Puget Sound region, where maritime fog and year-round mild temps create a unique growing season",
  ca_central_valley: "California's Central Valley, with scorching summers and some of the most fertile farmland on earth",
  ca_socal_coastal: "coastal Southern California, where Mediterranean sun and ocean breezes make year-round gardening possible",
  ca_bay_area: "the San Francisco Bay Area, where microclimates shift block by block and fog is a gardening variable",
  la_new_orleans: "Louisiana, where the Gulf Coast humidity and rich deltaic soils define everything that grows",
  la_central: "Louisiana, where the Gulf Coast humidity and rich deltaic soils define everything that grows",
  me_statewide: "coastal Maine, where the short sharp growing season rewards patience and cold-hardy varieties",
  ny_hudson: "New York's Hudson Valley, a gardening region with deep agricultural history and distinct seasons",
  fl_southern: "the Florida Keys, a subtropical island chain where frost is unknown and saltwater shapes every garden",
  hi_statewide: "the windward slopes of Hawaii, lush and rainy with tropical abundance year-round",
  ak_statewide: "the Anchorage bowl, where gardeners race the midnight sun and treasure every frost-free day",
  vt_statewide: "inland New England, where late springs and early frosts bracket an intense summer of growth",
  nh_statewide: "inland New England, where late springs and early frosts bracket an intense summer of growth",
  ma_western: "inland New England, where late springs and early frosts bracket an intense summer of growth",
};

/**
 * Get concise sub-region description for prompt injection.
 * Falls back to formatted zone name if sub-region not in map.
 * @param {string|null} subRegionId - from getSubRegion()
 * @param {string} [zoneFallback] - climate_zone_id to format as fallback
 * @returns {string}
 */
function getSubRegionDescription(subRegionId, zoneFallback) {
  if (subRegionId && SUB_REGION_FLAVOR[subRegionId]) {
    return SUB_REGION_FLAVOR[subRegionId];
  }
  // Fallback: format zone name → "high_plains" → "the High Plains"
  const zone = zoneFallback || subRegionId || 'high_plains';
  const formatted = zone.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return `the ${formatted}`;
}

module.exports = { getSubRegion, getSubRegionFlavor, getSubRegionDescription, SUB_REGION_FLAVOR, STATION_MAP, BOUNDING_BOXES, FLAVOR_TEXT };
