/**
 * Seed 12 named micro-seasons for all climate zones.
 * high_plains (Boulder) is fully built.
 * All other zones stubbed — correct structure, fill in as subscribers arrive.
 */
const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');
const db = new Database('/opt/plotlines/data/plotlines.db');

const highPlains = [
  { n:1,  name:"The Seed Catalogs",        start:1,   end:41,  signal:"Frozen ground, seed catalogs arrive, crocuses weeks away",         weather:["snowy","sunny","frost"],             mood:"Warm interior glow against blue-white cold — seed packet on kitchen table, snow through the window." },
  { n:2,  name:"The False Spring",          start:42,  end:74,  signal:"65°F then 8\" of snow. Crocuses emerge then get buried",           weather:["sunny","snowy","frost","cloudy"],    mood:"Bright sun on melting snow with purple crocus heads — beautiful and doomed." },
  { n:3,  name:"The Mud Season",            start:75,  end:105, signal:"Snowmelt soup, too wet to work, spinach under row cover",          weather:["cloudy","rainy","snowy","frost"],    mood:"Brown and saturated — wet earth, puddles reflecting grey sky, muddy gloves." },
  { n:4,  name:"The Frost Roulette",        start:106, end:140, signal:"Warm days, late frost warnings, pajama-run to cover tomatoes",     weather:["sunny","frost","cloudy","rainy"],   mood:"Green growth under floating row cover catching dawn light, frost crystals on leaf edges." },
  { n:5,  name:"The Green Riot",            start:141, end:171, signal:"Everything explodes at once, lettuce bolts, squash takes over",    weather:["sunny","heat","rainy"],             mood:"Overwhelming abundance — saturated greens, overlapping leaves, dappled sunlight." },
  { n:6,  name:"The Hail Watch",            start:172, end:196, signal:"Afternoon anvil clouds, green-tinged sky, shredded chard",        weather:["heat","sunny","rainy","cloudy"],    mood:"Dark anvil clouds over bright garden rows — eerie pre-storm stillness." },
  { n:7,  name:"The Long Burn",             start:197, end:232, signal:"Relentless 5,400ft sun, tomatoes ripen, zucchini overtakes",      weather:["heat","sunny","cloudy"],            mood:"Golden-hour exhaustion — ripe tomatoes in low sun, heat shimmer, hose in hand." },
  { n:8,  name:"The Desperate Harvest",     start:233, end:258, signal:"Racing the calendar, every pepper picked, garlic goes in",        weather:["sunny","heat","cloudy"],            mood:"Urgent abundance — overflowing baskets, jars on counters, slant September light." },
  { n:9,  name:"The First Frost Scramble",  start:259, end:283, signal:"Frost warning hits phone, harvest everything, basil turns black",  weather:["frost","sunny","cloudy"],           mood:"Blackened tomato vines beside frost-kissed kale, breath visible in morning air." },
  { n:10, name:"The Golden Exhale",         start:284, end:314, signal:"Cottonwoods gold, carrots sweeter, compost spread, tools cleaned", weather:["sunny","frost","cloudy","snowy"],   mood:"Amber and blue — golden leaves, empty beds with dark compost, distant white peaks." },
  { n:11, name:"The Hard Quiet",            start:315, end:349, signal:"Ground hardens, last spinach under cover, seed saving begins",    weather:["cloudy","snowy","frost","sunny"],   mood:"Minimalist and stark — brown stubble, grey sky, single garden stake, snow dusting." },
  { n:12, name:"The Dark Tending",          start:350, end:365, signal:"Shortest days, garlic growing unseen, cold frame check, amaryllis", weather:["snowy","cloudy","frost","sunny"],  mood:"Quiet hope — snow-covered garden, one lit window, life dormant underneath." },
];

const makeStubs = (zone) => Array.from({length:12}, (_,i) => ({
  n: i+1,
  name: `Season ${i+1}`,
  start: Math.round(i * 365/12) + 1,
  end:   Math.round((i+1) * 365/12),
  signal: `Stub — ${zone} season ${i+1}. Customize when subscribers arrive from this zone.`,
  weather: ["sunny","cloudy","rainy"],
  mood: `Stub — ${zone} season ${i+1}.`,
}));

const zones = [
  'pacific_coast','mediterranean','inland_valley','mountain_west',
  'great_plains','humid_southeast','humid_northeast','great_lakes',
  'appalachian','desert_southwest','tropical','australia_temperate',
  'australia_tropical','generic'
];

db.exec(`DELETE FROM micro_seasons WHERE climate_zone_id = 'high_plains'`);
for (const z of zones) db.exec(`DELETE FROM micro_seasons WHERE climate_zone_id = '${z}'`);

const ins = db.prepare(`
  INSERT OR REPLACE INTO micro_seasons
    (id, climate_zone_id, season_number, day_of_year_start, day_of_year_end, name, observable_signal, topic_weights)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const seed = db.transaction((zone, seasons) => {
  for (const s of seasons) {
    const weights = JSON.stringify({ weather_types: s.weather, masthead_mood: s.mood });
    ins.run(randomUUID(), zone, s.n, s.start, s.end, s.name, s.signal, weights);
  }
});

seed('high_plains', highPlains);
console.log(`✅ high_plains: 12 seasons seeded (fully built)`);

for (const z of zones) {
  seed(z, makeStubs(z));
  console.log(`📋 ${z}: 12 stubs seeded`);
}

const summary = db.prepare(`SELECT climate_zone_id, COUNT(*) as n FROM micro_seasons GROUP BY climate_zone_id ORDER BY climate_zone_id`).all();
console.log('\nSummary:');
for (const r of summary) console.log(`  ${r.climate_zone_id}: ${r.n} seasons`);
db.close();
