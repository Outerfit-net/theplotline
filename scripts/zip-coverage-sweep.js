const { assignClimateZone } = require('/opt/plotlines/server/services/climate.js');
const fs = require('fs');

// Parse Census Gazetteer TSV
// Columns: GEOID ALAND AWATER ALAND_SQMI AWATER_SQMI INTPTLAT INTPTLONG
const lines = fs.readFileSync('/tmp/2023_Gaz_zcta_national.txt', 'utf8').trim().split('\n');
const header = lines[0].split('\t').map(h => h.trim());

const geoIdIdx = header.indexOf('GEOID');
const latIdx = header.indexOf('INTPTLAT');
const lonIdx = header.indexOf('INTPTLONG');

const results = { total: 0, resolved: 0, nulls: 0, byState: {}, byZone: {} };
const nullSamples = {};

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split('\t');
  const zip = cols[geoIdIdx]?.trim();
  const lat = parseFloat(cols[latIdx]);
  const lon = parseFloat(cols[lonIdx]);
  if (!zip || isNaN(lat) || isNaN(lon)) continue;

  results.total++;
  const zone = assignClimateZone(lat, lon, 'US');
  const state = zip.substring(0, 3); // first 3 digits as proxy — actually use lat ranges

  // Better state detection from zip prefix ranges
  const zipNum = parseInt(zip);
  let stateCode = 'XX';
  if (zipNum >= 99500 && zipNum <= 99999) stateCode = 'AK';
  else if (zipNum >= 96700 && zipNum <= 96899) stateCode = 'HI';
  else if (zipNum >= 00600 && zipNum <= 00985) stateCode = 'PR';
  else if (zipNum >= 96910 && zipNum <= 96932) stateCode = 'GU';

  if (zone) {
    results.resolved++;
    results.byZone[zone] = (results.byZone[zone] || 0) + 1;
  } else {
    results.nulls++;
    if (!results.byState[stateCode]) results.byState[stateCode] = 0;
    results.byState[stateCode]++;
    if (!nullSamples[stateCode]) nullSamples[stateCode] = [];
    if (nullSamples[stateCode].length < 5) nullSamples[stateCode].push({ zip, lat, lon });
  }
}

console.log('=== US ZIP CODE CLIMATE ZONE COVERAGE SWEEP ===');
console.log(`Total ZIPs: ${results.total}`);
console.log(`Resolved:   ${results.resolved} (${(results.resolved/results.total*100).toFixed(1)}%)`);
console.log(`NULL zones: ${results.nulls} (${(results.nulls/results.total*100).toFixed(1)}%)`);
console.log('\n=== GAPS BY STATE/TERRITORY ===');
Object.entries(results.byState).sort((a,b) => b[1]-a[1]).forEach(([s,n]) => console.log(`${s}: ${n} unresolved`));
console.log('\n=== ZONE DISTRIBUTION ===');
Object.entries(results.byZone).sort((a,b) => b[1]-a[1]).forEach(([z,n]) => console.log(`${z}: ${n}`));
console.log('\n=== SAMPLE NULL ZIPS ===');
Object.entries(nullSamples).forEach(([s, zips]) => zips.forEach(z => console.log(`${s} ${z.zip} (${z.lat}, ${z.lon})`)));