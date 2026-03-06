/**
 * Seed climate zones and micro-seasons
 */

const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { DB_PATH } = require('./init');

const CLIMATE_ZONES = [
  {
    id: 'high_plains',
    name: 'High Plains & Intermountain West',
    description: 'Semi-arid, high altitude, dramatic temperature swings, chinook winds, hail season, 300 sunny days. Short growing season, last frost mid-May.',
    koppen_codes: JSON.stringify(['BSk','Dfb','BWk']),
    representative_cities: JSON.stringify(['Boulder CO','Denver CO','Albuquerque NM','Salt Lake City UT','Boise ID','Cheyenne WY']),
    hemisphere: 'N',
    micro_seasons_built: 1,
  },
  {
    id: 'pacific_maritime',
    name: 'Pacific Maritime',
    description: 'Mild wet winters, dry summers, slugs eternal, mild frost, long growing season. Rhododendrons, ferns, rain gardens.',
    koppen_codes: JSON.stringify(['Csb','Cfb']),
    representative_cities: JSON.stringify(['Seattle WA','Portland OR','Vancouver BC','Olympia WA','Astoria OR']),
    hemisphere: 'N',
    micro_seasons_built: 0,
  },
  {
    id: 'california_med',
    name: 'California Mediterranean',
    description: 'Summer drought, mild wet winter, fire risk, no hard freeze in many areas. Year-round growing with irrigation.',
    koppen_codes: JSON.stringify(['Csa','Csb']),
    representative_cities: JSON.stringify(['Los Angeles CA','San Francisco CA','Sacramento CA','San Diego CA','Fresno CA']),
    hemisphere: 'N',
    micro_seasons_built: 0,
  },
  {
    id: 'upper_midwest_continental',
    name: 'Upper Midwest Continental',
    description: 'Brutal winters, short intense summer, high humidity, early spring mud. Frost through May, first frost September. Zone 4a-5b.',
    koppen_codes: JSON.stringify(['Dfa','Dfb']),
    representative_cities: JSON.stringify(['Minneapolis MN','Milwaukee WI','Chicago IL','Madison WI','Indianapolis IN']),
    hemisphere: 'N',
    micro_seasons_built: 0,
  },
  {
    id: 'great_plains',
    name: 'Great Plains',
    description: 'Wind, tornado season, wet spring, hot summer, variable winter. Huge sky, dramatic weather, resilient gardeners.',
    koppen_codes: JSON.stringify(['Dfa','Cfa','BSk']),
    representative_cities: JSON.stringify(['Kansas City MO','Omaha NE','Oklahoma City OK','Wichita KS','Des Moines IA']),
    hemisphere: 'N',
    micro_seasons_built: 0,
  },
  {
    id: 'humid_subtropical',
    name: 'Humid Subtropical',
    description: 'Heat and humidity, mild winters, long growing season, pests year-round, hurricane season. No frost in deep south. Zone 7a-9b.',
    koppen_codes: JSON.stringify(['Cfa']),
    representative_cities: JSON.stringify(['Atlanta GA','Houston TX','New Orleans LA','Charlotte NC','Nashville TN']),
    hemisphere: 'N',
    micro_seasons_built: 0,
  },
  {
    id: 'northeast',
    name: 'Northeast Temperate',
    description: 'Four true seasons, maple sugaring, mud season, foliage. Last frost mid-May, first frost mid-October.',
    koppen_codes: JSON.stringify(['Dfb','Dfa']),
    representative_cities: JSON.stringify(['Boston MA','New York NY','Philadelphia PA','Hartford CT','Burlington VT']),
    hemisphere: 'N',
    micro_seasons_built: 0,
  },
  {
    id: 'appalachian',
    name: 'Appalachian & Mid-Atlantic',
    description: 'Elevation variance, humid summers, cold winters, lush and green. Mountain microclimates complicate everything.',
    koppen_codes: JSON.stringify(['Dfb','Cfb']),
    representative_cities: JSON.stringify(['Asheville NC','Roanoke VA','Pittsburgh PA','Knoxville TN','Charleston WV']),
    hemisphere: 'N',
    micro_seasons_built: 0,
  },
  {
    id: 'uk_maritime',
    name: 'UK & Ireland Maritime',
    description: 'Rain is the default, mild all year, slugs and snails are the main pest, Chelsea Flower Show is the calendar.',
    koppen_codes: JSON.stringify(['Cfb']),
    representative_cities: JSON.stringify(['London UK','Manchester UK','Edinburgh UK','Dublin IE','Cardiff UK']),
    hemisphere: 'N',
    micro_seasons_built: 0,
  },
  {
    id: 'central_europe',
    name: 'Central European',
    description: 'Cold winters, warm summers, four distinct seasons, highly structured gardening culture, allotments (Kleingarten).',
    koppen_codes: JSON.stringify(['Dfb','Cfb']),
    representative_cities: JSON.stringify(['Berlin DE','Paris FR','Amsterdam NL','Vienna AT','Zurich CH']),
    hemisphere: 'N',
    micro_seasons_built: 0,
  },
  {
    id: 'mediterranean_eu',
    name: 'Mediterranean European',
    description: 'Hot dry summer, mild wet winter, olives and citrus, drought gardening, ancient agricultural tradition.',
    koppen_codes: JSON.stringify(['Csa','Csb']),
    representative_cities: JSON.stringify(['Barcelona ES','Rome IT','Athens GR','Lisbon PT','Marseille FR']),
    hemisphere: 'N',
    micro_seasons_built: 0,
  },
  {
    id: 'australia_temperate',
    name: 'Australian Temperate (South)',
    description: 'Seasons inverted, bush fire risk, dry summers, mild winters. Victoria, NSW, SA. Spring = September.',
    koppen_codes: JSON.stringify(['Csb','Cfa','Cfb']),
    representative_cities: JSON.stringify(['Melbourne AU','Adelaide AU','Sydney AU','Canberra AU']),
    hemisphere: 'S',
    micro_seasons_built: 0,
  },
  {
    id: 'australia_tropical',
    name: 'Australian Tropical (North)',
    description: 'Wet/dry seasons not four seasons. Wet season Nov-Apr, dry May-Oct. Entirely different gardening logic.',
    koppen_codes: JSON.stringify(['Aw','Am']),
    representative_cities: JSON.stringify(['Darwin AU','Cairns AU','Broome AU','Townsville AU']),
    hemisphere: 'S',
    micro_seasons_built: 0,
  },
  {
    id: 'canada_prairie',
    name: 'Canadian Prairie',
    description: 'Brutal winters, short intense summer, extreme temperature range (-40 to +35°C), gardening is defiant optimism.',
    koppen_codes: JSON.stringify(['Dfb','Dfc']),
    representative_cities: JSON.stringify(['Calgary AB','Edmonton AB','Saskatoon SK','Winnipeg MB']),
    hemisphere: 'N',
    micro_seasons_built: 0,
  },
  {
    id: 'canada_maritime',
    name: 'Canadian Maritime & Great Lakes',
    description: 'Mixed, humid, maple syrup season, four seasons, lake effect snow, great gardening culture.',
    koppen_codes: JSON.stringify(['Dfb','Cfb']),
    representative_cities: JSON.stringify(['Toronto ON','Ottawa ON','Montreal QC','Halifax NS','Victoria BC']),
    hemisphere: 'N',
    micro_seasons_built: 0,
  },

  // ─── NEW ZONES (2026-03-06 zone expansion) ────────────────────────────────

  // ALASKA ZONES
  {
    id: 'alaska_interior',
    name: 'Alaska Interior',
    description: 'Extreme continental subarctic. Fairbanks area, -40°F winters, compressed spring. Zone 1a-2a.',
    koppen_codes: JSON.stringify(['Dfc']),
    representative_cities: JSON.stringify(['Fairbanks AK','Denali AK']),
    hemisphere: 'N',
    micro_seasons_built: 0,
  },
  {
    id: 'alaska_south_coastal',
    name: 'South-Central Alaska',
    description: 'Maritime subarctic. Anchorage, Juneau, -10°F winters, extended winter, spring delayed 2 weeks. Zone 2a-3b.',
    koppen_codes: JSON.stringify(['Dfc','Cfc']),
    representative_cities: JSON.stringify(['Anchorage AK','Juneau AK','Ketchikan AK']),
    hemisphere: 'N',
    micro_seasons_built: 0,
  },

  // GREAT LAKES ZONE (NEW)
  {
    id: 'great_lakes',
    name: 'Great Lakes Maritime',
    description: 'Lake-effect snow belt. Marquette, Duluth, Cleveland. 200+ inches annual snow, extended winter, spring delayed 2-3 weeks. Zone 4a-5b.',
    koppen_codes: JSON.stringify(['Dfb']),
    representative_cities: JSON.stringify(['Marquette MI','Duluth MN','Cleveland OH','Detroit MI','Green Bay WI']),
    hemisphere: 'N',
    micro_seasons_built: 0,
  },

  // SOUTHERN PLAINS / RIO GRANDE
  {
    id: 'southern_plains',
    name: 'South Texas & Rio Grande Valley',
    description: 'Subtropical, hot long growing season, minimal winter, irrigation-dependent. Zone 8a-9b.',
    koppen_codes: JSON.stringify(['BSh','Cfa']),
    representative_cities: JSON.stringify(['San Antonio TX','Corpus Christi TX','McAllen TX','Brownsville TX']),
    hemisphere: 'N',
    micro_seasons_built: 0,
  },

  // FLORIDA TROPICAL ZONES
  {
    id: 'florida_southern',
    name: 'Southern Florida Subtropical',
    description: 'Heat and humidity, mild winters, wet/dry seasons, pests year-round. Frost possible, no year-round tropics. Zone 9a-9b.',
    koppen_codes: JSON.stringify(['Cfa']),
    representative_cities: JSON.stringify(['Miami FL','Tampa FL','Fort Myers FL','West Palm Beach FL']),
    hemisphere: 'N',
    micro_seasons_built: 0,
  },
  {
    id: 'florida_keys_tropical',
    name: 'Florida Keys & Tropical Extreme South',
    description: 'Frost-free tropical. Trade winds shape seasons. Hurricane season (Jun-Nov), calm dry winter (Dec-May). Zone 11-12.',
    koppen_codes: JSON.stringify(['Af','Am']),
    representative_cities: JSON.stringify(['Key West FL','Dry Tortugas FL','Marathon FL']),
    hemisphere: 'N',
    micro_seasons_built: 0,
  },

  // DESERT SOUTHWEST
  {
    id: 'desert_southwest',
    name: 'Desert Southwest',
    description: 'Extreme heat, zero frost, low rain, intense UV. Cooling season year-round in monsoon. Zone 9b-10a.',
    koppen_codes: JSON.stringify(['BWh','BWk']),
    representative_cities: JSON.stringify(['Phoenix AZ','Las Vegas NV','Tucson AZ','Palm Springs CA']),
    hemisphere: 'N',
    micro_seasons_built: 0,
  },

  // HAWAII
  {
    id: 'hawaii',
    name: 'Hawaiian Islands',
    description: 'Tropical year-round, trade winds, wet/dry seasons. No frost. Trade wind dry (May-Sep), Kona wet (Oct-Apr). Zone 10b-12.',
    koppen_codes: JSON.stringify(['Af','Am']),
    representative_cities: JSON.stringify(['Honolulu HI','Hilo HI','Maui HI','Kauai HI']),
    hemisphere: 'N',
    micro_seasons_built: 0,
  },

  // INTERNATIONAL ZONES
  {
    id: 'iceland_subarctic',
    name: 'Iceland Subarctic Maritime',
    description: 'Harsh maritime subarctic. Reykjavik, midnight sun summer, polar twilight winter. Gulf Stream moderates. Zone 2b-3b.',
    koppen_codes: JSON.stringify(['Cfc']),
    representative_cities: JSON.stringify(['Reykjavik IS','Akureyri IS']),
    hemisphere: 'N',
    micro_seasons_built: 0,
  },
  {
    id: 'japan_temperate',
    name: 'Japan Temperate',
    description: 'Monsoon-influenced, cherry blossom spring, typhoon fall. Four seasons. Zone 5b-8a.',
    koppen_codes: JSON.stringify(['Cfa','Cfb']),
    representative_cities: JSON.stringify(['Tokyo','Osaka','Kyoto','Yokohama']),
    hemisphere: 'N',
    micro_seasons_built: 0,
  },
  {
    id: 'south_africa_temperate',
    name: 'South Africa Temperate (Cape Region)',
    description: 'Inverted seasons (Dec-Feb summer), Mediterranean-influenced, mild winters. Zone 7b-9a.',
    koppen_codes: JSON.stringify(['Csa','Cfb']),
    representative_cities: JSON.stringify(['Cape Town','Stellenbosch','Hermanus']),
    hemisphere: 'S',
    micro_seasons_built: 0,
  },
  {
    id: 'south_africa_subtropical',
    name: 'South Africa Subtropical (KwaZulu-Natal)',
    description: 'Inverted seasons (Dec-Feb hottest), summer rain, humid. Zone 9a-11.',
    koppen_codes: JSON.stringify(['Aw','Cfa']),
    representative_cities: JSON.stringify(['Durban','Pietermaritzburg']),
    hemisphere: 'S',
    micro_seasons_built: 0,
  },
  {
    id: 'brazil_subtropical',
    name: 'Brazil Subtropical & Tropical',
    description: 'Tropical monsoon, high humidity, afternoon storms. Year-round growing. Zone 8a-10b.',
    koppen_codes: JSON.stringify(['Aw','Cfa']),
    representative_cities: JSON.stringify(['São Paulo','Rio de Janeiro','Brasília']),
    hemisphere: 'S',
    micro_seasons_built: 0,
  },
];

// ─── Colorado 72 Micro-Seasons ────────────────────────────────────────────────
// day_of_year: 1=Jan1, 35=Feb4, 50=Feb19, etc.
// topic_weights: category_id → 0-3 (0=skip, 3=featured)

const HIGH_PLAINS_MICRO_SEASONS = [
  // ── DEEP WINTER (Jan 1 - Feb 3) ─────────────────────────────────────────
  { n:1,  start:1,   end:5,   name:"The itch begins — seed catalogues arrive",
    signal:"Baker Creek, Johnny's, Territorial in the mailbox. Sticky tabs on every other page.",
    w:{seed_ordering:3,planning:3,cabin_fever:2,tools:1,garden_philosophy:1} },
  { n:2,  start:6,   end:10,  name:"Paperwhites peak, cabin fever builds",
    signal:"Indoor blooms at their best. Outside: brown and still. The contrast is unbearable.",
    w:{bulbs:2,cabin_fever:3,seed_ordering:2,planning:2} },
  { n:3,  start:11,  end:15,  name:"The pepper math begins",
    signal:"Count back 10-12 weeks from May 15. Peppers need to start now. Do the math.",
    w:{seed_starting:3,timing_anxiety:3,cabin_fever:2,planning:2} },
  { n:4,  start:16,  end:20,  name:"Coldest weeks — pure potential",
    signal:"Deep cold. Ground locked. Nothing to do but read and dream and order more seeds.",
    w:{planning:3,seed_ordering:3,cabin_fever:3,garden_philosophy:2} },
  { n:5,  start:21,  end:25,  name:"Seed sorting and the annual reckoning",
    signal:"Seeds laid out, viability tested, old ones culled. Decisions made about what to try.",
    w:{seed_ordering:3,planning:3,tools:1,seed_starting:2} },
  { n:6,  start:26,  end:34,  name:"Leeks go under lights — it has begun",
    signal:"Leeks need 12 weeks. They go in late January. The season has officially started.",
    w:{seed_starting:3,timing_anxiety:2,cabin_fever:2,planning:2} },

  // ── LATE WINTER (Feb 4 - Mar 5) ─────────────────────────────────────────
  { n:7,  start:35,  end:39,  name:"Catalogues dog-eared, peppers and leeks started",
    signal:"Grow lights on timers. First seedlings emerging under glass. The waiting ends.",
    w:{seed_starting:3,seed_ordering:3,cabin_fever:2,bulbs:1} },
  { n:8,  start:40,  end:44,  name:"Crocus tips break frozen crust",
    signal:"First green noses visible in south-facing beds. Snowdrops possible. Proof of life.",
    w:{bulbs:3,false_spring:2,cabin_fever:2,timing_anxiety:1} },
  { n:9,  start:45,  end:49,  name:"Grow lights humming, tomatoes still weeks away",
    signal:"Peppers and leeks leggy but alive. Tomatoes not yet — 6 weeks to go at minimum.",
    w:{seed_starting:3,timing_anxiety:2,cabin_fever:2,tools:1} },
  { n:10, start:50,  end:54,  name:"Chinook wind strips the mulch",
    signal:"Warm west wind, 60°F, deceptive. Mulch blown. Soil still locked at 4 inches down.",
    w:{false_spring:3,weather_response:3,frost_protection:2,timing_anxiety:2} },
  { n:11, start:55,  end:59,  name:"Snowdrops open, gardeners argue",
    signal:"Is this spring? No. Yes. The annual debate. Someone already bought pansies.",
    w:{false_spring:3,bulbs:3,timing_anxiety:2,character_drama:2} },
  { n:12, start:60,  end:64,  name:"Witch hazel blooms, bees confused",
    signal:"First pollinators out but almost nothing to feed them. Witch hazel is the exception.",
    w:{wildlife:3,bulbs:2,false_spring:2,natives_xeri:1} },

  // ── MUD SEASON (Mar 6 - Mar 20) ─────────────────────────────────────────
  { n:13, start:65,  end:69,  name:"Mud season locks the beds",
    signal:"Snow melt saturates soil. Compaction risk high. The rule: look, don't touch.",
    w:{soil_prep:3,false_spring:2,timing_anxiety:2,weather_response:2} },
  { n:14, start:70,  end:74,  name:"Tomato seeds go in under lights",
    signal:"6-8 weeks to last frost. Optimists start tomatoes now. First tray of the season.",
    w:{seed_starting:3,timing_anxiety:2,catalog_fomo:2,food_garden:2} },
  { n:15, start:75,  end:79,  name:"Forsythia explodes, frost still 7 weeks out",
    signal:"Yellow everywhere but May 15 is still far. Don't be fooled by forsythia.",
    w:{false_spring:3,timing_anxiety:3,frost_protection:2,bulbs:2} },

  // ── EARLY SPRING (Mar 21 - Apr 19) ──────────────────────────────────────
  { n:16, start:80,  end:84,  name:"Equinox: equal day and night, soil temp 40°F",
    signal:"Days officially longer than nights. Soil temp 40°F. Not ready. Close.",
    w:{timing_anxiety:3,soil_prep:3,frost_protection:2,bulbs:2} },
  { n:17, start:85,  end:89,  name:"Cold frames gambled on",
    signal:"Row cover goes on. Cold frames opened by day, closed by night. The first bets placed.",
    w:{frost_protection:3,timing_anxiety:3,tools:2,food_garden:2} },
  { n:18, start:90,  end:94,  name:"Dandelions beat you to it",
    signal:"First weeds emerge before anything you planted. First pollinators too.",
    w:{wildlife:2,food_garden:1,natives_xeri:2,character_drama:2} },
  { n:19, start:95,  end:99,  name:"Pansies go in — they laugh at frost",
    signal:"Hardy annuals can go in now. Frost still likely but pansies are fearless.",
    w:{frost_protection:2,timing_anxiety:2,design:2,containers:2} },
  { n:20, start:100, end:104, name:"Hardening off begins — seedlings meet wind",
    signal:"Leggy seedlings hit real wind for the first time. Some sulk. Some die. That's fine.",
    w:{hardening_off:3,seed_starting:2,timing_anxiety:2,food_garden:2} },
  { n:21, start:105, end:109, name:"Soil temp hits 50°F — peas go in",
    signal:"Cool-season window opens. Peas, spinach, lettuce, radish. The soil is finally ready.",
    w:{timing_anxiety:3,food_garden:3,soil_prep:2,transplanting:2} },

  // ── TRUE SPRING (Apr 20 - May 19) ───────────────────────────────────────
  { n:22, start:110, end:114, name:"Last frost could still be weeks away",
    signal:"Average last frost May 7-15 in Boulder. The gamble intensifies. Phone weather app obsession begins.",
    w:{frost_protection:3,timing_anxiety:3,food_garden:2,character_drama:2} },
  { n:23, start:115, end:119, name:"Tulips open — Chelsea weeps with joy",
    signal:"Peak tulip window. Alliums fattening. Narcissus fading. The bulb payoff arrives.",
    w:{bulbs:3,design:3,containers:2,character_drama:2} },
  { n:24, start:120, end:124, name:"Warm-season starts — impatience peaks",
    signal:"Squash, cukes, melon started indoors. They grow fast. Don't rush them outside.",
    w:{seed_starting:3,timing_anxiety:3,food_garden:3,catalog_fomo:2} },
  { n:25, start:125, end:129, name:"Mother's Day gamble",
    signal:"Old timers say wait. Nurseries say buy. Gardeners split. Some lose everything.",
    w:{timing_anxiety:3,frost_protection:3,food_garden:3,character_drama:3} },
  { n:26, start:130, end:134, name:"Last frost watch — nightly phone checks",
    signal:"Weather app obsession. Cover or don't cover. The coin flip that defines the season.",
    w:{frost_protection:3,timing_anxiety:3,weather_response:3,food_garden:2} },
  { n:27, start:135, end:139, name:"Average last frost: the exhale",
    signal:"Statistical safety. Warm-season transplants go in. The long-held breath releases.",
    w:{transplanting:3,food_garden:3,timing_anxiety:2,soil_prep:2} },

  // ── EARLY SUMMER (May 20 - Jun 20) ──────────────────────────────────────
  { n:28, start:140, end:144, name:"Beds full, hearts full",
    signal:"Everything in ground. Establishment watering. Pure uncut hope.",
    w:{food_garden:3,water:2,transplanting:2,design:2} },
  { n:29, start:145, end:149, name:"First aphids, first panic",
    signal:"Rose aphids. Spinach aphids. The first pest crisis of the season.",
    w:{pests_disease:3,food_garden:2,wildlife:2,character_drama:2} },
  { n:30, start:150, end:154, name:"Squash explodes — gardeners fall behind",
    signal:"Zucchini planted 10 days ago is already enormous. Oh no. Here we go.",
    w:{food_garden:3,harvest:2,character_drama:2,succession:2} },
  { n:31, start:155, end:159, name:"Afternoon clouds build over the divide",
    signal:"Cumulus building by noon every day. Hail season officially open. Everyone checks radar.",
    w:{weather_response:3,food_garden:2,tools:2,character_drama:2} },
  { n:32, start:160, end:164, name:"First hail watch of the season",
    signal:"That green sky feeling. The silence before. Everyone scrambles for row cover.",
    w:{weather_response:3,frost_protection:2,food_garden:2,character_drama:3} },
  { n:33, start:165, end:171, name:"Strawberries ripen — race against birds",
    signal:"First real harvest. Netting debated. Birds winning. Worth it anyway.",
    w:{harvest:3,wildlife:3,food_garden:3,pests_disease:2} },

  // ── HIGH SUMMER (Jun 22 - Aug 7) ────────────────────────────────────────
  { n:34, start:172, end:177, name:"Solstice heat finds its stride",
    signal:"90°F days. Morning watering becomes religion. Shade cloth considered.",
    w:{water:3,heat_stress:3,food_garden:3,weather_response:2} },
  { n:35, start:178, end:182, name:"Squash vine borers arrive uninvited",
    signal:"The heartbreak pest. Zucchini wilts overnight. The annual expletives.",
    w:{pests_disease:3,food_garden:3,character_drama:3,heat_stress:2} },
  { n:36, start:183, end:187, name:"Garlic scapes curl — harvest signals",
    signal:"Hardneck garlic sends up its spiral. Cut for pesto or leave to seed?",
    w:{food_garden:3,harvest:3,character_drama:2,succession:1} },
  { n:37, start:188, end:192, name:"Monsoon moisture arrives from the south",
    signal:"Humidity shifts. Thunderstorms smell like wet desert. Irrigation eases. Fungal risk rises.",
    w:{weather_response:3,water:3,pests_disease:2,food_garden:2} },
  { n:38, start:193, end:197, name:"Tomatoes set fruit — daily inspection begins",
    signal:"Green tomatoes visible. Checking for blossom end rot. The obsessive phase.",
    w:{food_garden:3,water:2,pests_disease:2,heat_stress:2} },
  { n:39, start:198, end:202, name:"Beans exploding — neighbors getting bags",
    signal:"Green beans, pole beans, dry beans all at once. Everyone you know has too many.",
    w:{harvest:3,food_garden:3,succession:2,character_drama:2} },
  { n:40, start:203, end:207, name:"Garlic harvest — the underground revealed",
    signal:"Pull garlic, cure in shade two weeks. Braid if you're Chelsea. Count if you're Esther.",
    w:{harvest:3,food_garden:3,tools:1,character_drama:2} },
  { n:41, start:208, end:212, name:"Corn tassels, melons swell",
    signal:"Corn silk emerging. You can smell the melon patch. Summer's peak is near.",
    w:{food_garden:3,harvest:2,water:2,character_drama:1} },
  { n:42, start:213, end:219, name:"The great ripening begins",
    signal:"First tomatoes turning. Peppers blushing. Abundance imminent. Canning jars located.",
    w:{harvest:3,food_garden:3,succession:2,character_drama:2} },

  // ── LATE SUMMER (Aug 8 - Sep 21) ────────────────────────────────────────
  { n:43, start:220, end:224, name:"Tomato wall — too many, too fast",
    signal:"Counter covered. Sauce every weekend. Neighbors refusing bags. Gifting to strangers.",
    w:{harvest:3,food_garden:3,character_drama:3,succession:2} },
  { n:44, start:225, end:229, name:"Fall crops go in — optimists plant",
    signal:"Kale, chard, arugula, brassicas. 60 days to frost. Do the math.",
    w:{succession:3,food_garden:3,timing_anxiety:2,soil_prep:2} },
  { n:45, start:230, end:234, name:"Monsoon fades, August heat returns dry",
    signal:"August heat without the moisture. Watering resumes hard. Drip emitters checked.",
    w:{water:3,heat_stress:2,weather_response:3,food_garden:2} },
  { n:46, start:235, end:239, name:"The exhale — summer peaks, starts releasing",
    signal:"Nights cooling slightly. First whisper of fall in the morning air.",
    w:{weather_response:2,harvest:3,food_garden:2,garden_philosophy:2} },
  { n:47, start:240, end:244, name:"Peppers finally give everything",
    signal:"After a summer of patience, peppers go wild in late heat. The payoff.",
    w:{harvest:3,food_garden:3,heat_stress:1,character_drama:2} },
  { n:48, start:245, end:249, name:"Seed saving — the purists emerge",
    signal:"Tomato seeds fermented. Bean pods dried on the vine. The annual ideological split.",
    w:{food_garden:2,planning:3,character_drama:3,garden_philosophy:2} },
  { n:49, start:250, end:254, name:"First frost watch — the nervous weeks",
    signal:"Morning temps dropping below 50°F. Covers come out of storage. The anxiety returns.",
    w:{frost_protection:3,timing_anxiety:3,weather_response:3,food_garden:2} },
  { n:50, start:255, end:259, name:"Green tomatoes and the race against frost",
    signal:"Every green tomato is a potential loss or a future windowsill ripener.",
    w:{frost_protection:3,food_garden:3,character_drama:2,timing_anxiety:3} },
  { n:51, start:260, end:264, name:"Basil blackens — the first casualty",
    signal:"Frost hits basil first. Always. You always forget to cover it. Every year.",
    w:{frost_protection:3,food_garden:2,character_drama:3,weather_response:2} },

  // ── FALL (Sep 22 - Nov 7) ────────────────────────────────────────────────
  { n:52, start:265, end:269, name:"Equinox harvest — more than you can handle",
    signal:"Everything coming in at once. Overwhelm. The beauty and the burden of abundance.",
    w:{harvest:3,food_garden:3,character_drama:2,garden_philosophy:2} },
  { n:53, start:270, end:274, name:"Garlic ordered, planting beds prepared",
    signal:"Seed garlic arrives. Bed prep for fall planting. Compost worked in.",
    w:{planning:3,soil_prep:3,food_garden:2,garlic:3} },
  { n:54, start:275, end:279, name:"Hard frost imminent — the sprint",
    signal:"Pulling green tomatoes, potting up herbs, hauling in winter squash.",
    w:{frost_protection:3,harvest:3,food_garden:3,weather_response:3} },
  { n:55, start:280, end:284, name:"Tulip bulbs go in — the act of faith",
    signal:"Planting for next April. Optimism in a hole in the ground. Esther has a plan.",
    w:{bulbs:3,planning:3,design:2,character_drama:2} },
  { n:56, start:285, end:289, name:"Garlic cloves split and planted",
    signal:"Garlic in the ground is next July's harvest. The longest delayed gratification.",
    w:{garlic:3,food_garden:3,planning:2,character_drama:1} },
  { n:57, start:290, end:294, name:"First hard freeze — the reckoning",
    signal:"What you covered lives. What you forgot died. Acceptance follows.",
    w:{frost_protection:3,weather_response:3,character_drama:3,garden_philosophy:2} },
  { n:58, start:295, end:299, name:"Cleanup debate: cut or leave standing",
    signal:"Chelsea cuts for tidiness. Buster leaves for wildlife. Harry has strong opinions.",
    w:{fall_cleanup:3,wildlife:3,character_drama:3,perennial_div:2} },
  { n:59, start:300, end:304, name:"Mulch goes down — the great insulation",
    signal:"Leaves, straw, wood chips. Depth matters. 3-4 inches. Harry has opinions.",
    w:{fall_cleanup:3,soil_prep:2,tools:2,character_drama:2} },
  { n:60, start:305, end:311, name:"Beds rest, gardener does not",
    signal:"Soil put to bed. Perennials mulched. Catalogues already in the mailbox.",
    w:{planning:3,fall_cleanup:2,overwintering:3,seed_ordering:2} },

  // ── EARLY WINTER (Nov 8 - Dec 21) ───────────────────────────────────────
  { n:61, start:312, end:316, name:"Tool cleanup and the annual reckoning",
    signal:"Sharpening hoes, oiling handles, inventorying what broke. What needs replacing.",
    w:{tools:3,planning:2,garden_philosophy:2,character_drama:1} },
  { n:62, start:317, end:321, name:"First seed catalogues arrive",
    signal:"Baker Creek, High Mowing, Territorial. The browsing begins. Sticky tabs multiply.",
    w:{seed_ordering:3,planning:3,catalog_fomo:3,cabin_fever:1} },
  { n:63, start:322, end:326, name:"Amaryllis potted, paperwhites started",
    signal:"Esther's windowsill comes alive. Indoor gardening season opens fully.",
    w:{bulbs:3,containers:3,design:2,character_drama:1} },
  { n:64, start:327, end:331, name:"Thanksgiving harvest table",
    signal:"Squash, garlic, dried beans, preserved tomatoes. The accounting of the season.",
    w:{harvest:2,food_garden:2,garden_philosophy:3,character_drama:2} },
  { n:65, start:332, end:336, name:"Seed order wishlist grows, budget shrinks",
    signal:"The negotiation between want and space and money. Every gardener's December.",
    w:{seed_ordering:3,planning:3,catalog_fomo:3,cabin_fever:2} },
  { n:66, start:337, end:341, name:"Cold frames still producing — the diehards",
    signal:"Spinach and mache survive under glass. Esther smug about her kale.",
    w:{containers:2,food_garden:2,frost_protection:2,character_drama:3} },
  { n:67, start:342, end:346, name:"Deep cold — roots sleeping, gardener dreaming",
    signal:"Ground frozen hard. Perennial roots safe below frost line. Nothing to do but plan.",
    w:{planning:3,overwintering:2,garden_philosophy:3,seed_ordering:2} },
  { n:68, start:347, end:351, name:"Grow lights on timers — infrastructure reviewed",
    signal:"Light timer batteries replaced. New LED strip ordered. Setup reconsidered.",
    w:{tools:3,seed_starting:2,planning:2,cabin_fever:2} },
  { n:69, start:352, end:356, name:"Winter solstice: light returns",
    signal:"Darkest day behind us. Amaryllis blooming. Seed order nearly placed.",
    w:{bulbs:2,garden_philosophy:3,planning:2,seed_ordering:2} },
  { n:70, start:357, end:361, name:"Year's end: the garden audit",
    signal:"What worked, what failed, what to change. The honest reckoning.",
    w:{planning:3,garden_philosophy:3,character_drama:2,design:2} },
  { n:71, start:362, end:365, name:"New year, seed order finalized",
    signal:"Decisions committed to. Varieties chosen. Order placed or about to be.",
    w:{seed_ordering:3,planning:3,catalog_fomo:2,cabin_fever:2} },
  // n:72 = n:6 (Jan 26-Feb 3) — already covered above, wraps the year
];

function seedZones(db) {
  console.log('Seeding climate zones...');
  const insertZone = db.prepare(`
    INSERT OR REPLACE INTO climate_zones
      (id, name, description, koppen_codes, representative_cities, hemisphere, micro_seasons_built)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertZones = db.transaction((zones) => {
    for (const z of zones) {
      insertZone.run(z.id, z.name, z.description, z.koppen_codes,
        z.representative_cities, z.hemisphere, z.micro_seasons_built);
      console.log(`  Zone: ${z.id}`);
    }
  });

  insertZones(CLIMATE_ZONES);
  console.log(`Seeded ${CLIMATE_ZONES.length} climate zones`);
}

function seedMicroSeasons(db) {
  console.log('Seeding high_plains micro-seasons...');
  const insert = db.prepare(`
    INSERT OR REPLACE INTO micro_seasons
      (id, climate_zone_id, season_number, day_of_year_start, day_of_year_end,
       name, observable_signal, topic_weights)
    VALUES (?, 'high_plains', ?, ?, ?, ?, ?, ?)
  `);

  const insertAll = db.transaction((seasons) => {
    for (const s of seasons) {
      insert.run(
        `high_plains_${s.n}`,
        s.n, s.start, s.end,
        s.name, s.signal,
        JSON.stringify(s.w)
      );
    }
  });

  insertAll(HIGH_PLAINS_MICRO_SEASONS);
  console.log(`Seeded ${HIGH_PLAINS_MICRO_SEASONS.length} micro-seasons for high_plains`);
}

function seedAll() {
  const db = new Database(DB_PATH);
  try {
    seedZones(db);
    seedMicroSeasons(db);
    console.log('Zone seeding complete');
  } finally {
    db.close();
  }
}

if (require.main === module) {
  seedAll();
}

module.exports = { seedZones, seedMicroSeasons };
