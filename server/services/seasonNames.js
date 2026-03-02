/**
 * Season name generation service
 * Lazy-generates author-voiced season names for a climate zone
 * Caches in author_season_names table
 */

const { v4: uuidv4 } = require('uuid');
const http = require('http');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:32b';

/**
 * Author style profiles
 */
const AUTHOR_PROFILES = {
  hemingway: {
    name: 'Ernest Hemingway',
    style: 'spare, declarative, one true thing',
    example: ['First Snow', 'The Waiting', 'November Light']
  },
  carver: {
    name: 'Raymond Carver',
    style: 'plain, working class, nothing extra',
    example: ['Ordinary Days', 'Cold Wind', 'What We Do']
  },
  munro: {
    name: 'Alice Munro',
    style: 'observational, layered, domestic',
    example: ['The Living Room', 'Small Hours', 'Kitchen Weather']
  },
  morrison: {
    name: 'Toni Morrison',
    style: 'ancestral, weighted, mythic',
    example: ['The Singing Blood', 'Memory\'s Rising', 'Old Wisdom']
  },
  oates: {
    name: 'Joyce Carol Oates',
    style: 'dark, psychological, gothic undertone',
    example: ['The Watching Eyes', 'Silent Threats', 'Beautiful Terror']
  },
  lopez: {
    name: 'Barry Lopez',
    style: 'ecological, reverent, place-specific',
    example: ['The Creature\'s Return', 'Ancient Knowing', 'Restless Movement']
  },
  strout: {
    name: 'Elizabeth Strout',
    style: 'quiet, Maine-inflected, emotionally precise',
    example: ['The Settling In', 'Salt Air', 'What Goes Unsaid']
  },
  bass: {
    name: 'Rick Bass',
    style: 'wilderness, Montana, physical and spiritual',
    example: ['The Last Wild Days', 'Stone Silence', 'Mountain Breathing']
  },
  mccarthy: {
    name: 'Cormac McCarthy',
    style: 'biblical, stark, no punctuation flourishes',
    example: ['Desolation Comes', 'The Gray Hour', 'What Endures']
  },
  oconnor: {
    name: 'Flannery O\'Connor',
    style: 'grotesque, Southern Gothic, grace through darkness',
    example: ['The Violent Bloom', 'Divine Darkness', 'Earthly Riddle']
  },
  hurston: {
    name: 'Zora Neale Hurston',
    style: 'rhythmic, vernacular, joyful and rooted',
    example: ['The Jubilee Time', 'Singing Grows', 'Life Calling']
  },
  saunders: {
    name: 'George Saunders',
    style: 'warm, comic, humanist',
    example: ['The Sweet Stumble', 'Funny Turning', 'Love Breaking Through']
  }
};

/**
 * Call Ollama to generate season names
 * @param {string} climateZoneId
 * @param {string} authorKey
 * @param {object} microSeasons - array of { season_number, name, observable_signal }
 * @returns {Promise<array>} - array of { season_number, season_name }
 */
async function callOllama(climateZoneId, authorKey, microSeasons) {
  const author = AUTHOR_PROFILES[authorKey];
  if (!author) {
    throw new Error(`Unknown author: ${authorKey}`);
  }

  // Build the prompt
  const seasonsList = microSeasons
    .map(s => `${s.season_number}. "${s.name}" — ${s.observable_signal}`)
    .join('\n');

  const prompt = `You are voicing the 12 seasons of the ${climateZoneId} climate zone as ${author.name} would name them.

${author.name}'s literary voice: ${author.style}

Here are the 12 seasonal concepts with their canonical names and observable signals:

${seasonsList}

Your task: Give each season a new name in ${author.name}'s distinctive voice. Names should be:
- 2-5 words
- Evocative and poetic
- True to ${author.name}'s literary style
- Capturing the essence of what makes each season unique

Example of this voice applied to seasons:
- ${author.example.join(', ')}

Respond with ONLY a JSON array of objects with this exact structure:
[
  {"season_number": 1, "name": "..."},
  {"season_number": 2, "name": "..."},
  ...
  {"season_number": 12, "name": "..."}
]

Do not include any other text, explanation, or markdown. Just the JSON array.`;

  return new Promise((resolve, reject) => {
    const payload = {
      model: OLLAMA_MODEL,
      prompt,
      stream: false
    };

    const options = {
      hostname: new URL(OLLAMA_URL).hostname,
      port: new URL(OLLAMA_URL).port || 11434,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(payload))
      },
      timeout: 120000 // 2 minutes
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.error) {
            reject(new Error(`Ollama error: ${response.error}`));
            return;
          }

          // Parse the response text to extract JSON
          const responseText = response.response || '';
          const jsonMatch = responseText.match(/\[[\s\S]*\]/);
          if (!jsonMatch) {
            reject(new Error(`Failed to find JSON in Ollama response: ${responseText.substring(0, 200)}`));
            return;
          }

          const names = JSON.parse(jsonMatch[0]);

          // Validate we got exactly 12 names
          if (!Array.isArray(names) || names.length !== 12) {
            reject(new Error(`Expected 12 season names, got ${names.length}`));
            return;
          }

          // Validate structure
          for (let i = 0; i < names.length; i++) {
            if (!names[i].season_number || !names[i].name) {
              reject(new Error(`Invalid response structure at index ${i}`));
              return;
            }
          }

          resolve(names);
        } catch (err) {
          reject(new Error(`Failed to parse Ollama response: ${err.message}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.abort();
      reject(new Error('Ollama request timeout'));
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

/**
 * Get all 12 season names for a zone+author combo
 * Lazy-generates if not cached
 * @param {string} climateZoneId
 * @param {string} authorKey
 * @param {object} db - better-sqlite3 instance
 * @returns {Promise<array>} - array of { id, climate_zone_id, author_key, season_number, season_name, generated_at }
 */
async function getSeasonNames(climateZoneId, authorKey, db) {
  // Check cache first
  const cached = db.prepare(`
    SELECT * FROM author_season_names
    WHERE climate_zone_id = ? AND author_key = ?
    ORDER BY season_number
  `).all(climateZoneId, authorKey);

  if (cached.length === 12) {
    console.log(`[seasonNames] Cache hit: ${climateZoneId}/${authorKey}`);
    return cached;
  }

  console.log(`[seasonNames] Cache miss: ${climateZoneId}/${authorKey} (found ${cached.length}/12)`);

  // Load micro-seasons from DB
  const microSeasons = db.prepare(`
    SELECT season_number, name, observable_signal FROM micro_seasons
    WHERE climate_zone_id = ?
    ORDER BY season_number
  `).all(climateZoneId);

  if (microSeasons.length !== 12) {
    throw new Error(`Expected 12 micro-seasons for ${climateZoneId}, found ${microSeasons.length}`);
  }

  // Call Ollama to generate names
  console.log(`[seasonNames] Calling Ollama to generate ${climateZoneId}/${authorKey}`);
  const generatedNames = await callOllama(climateZoneId, authorKey, microSeasons);

  // Store all 12 in DB
  const insertStmt = db.prepare(`
    INSERT INTO author_season_names (id, climate_zone_id, author_key, season_number, season_name)
    VALUES (?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    for (const item of generatedNames) {
      insertStmt.run(
        uuidv4(),
        climateZoneId,
        authorKey,
        item.season_number,
        item.name
      );
    }
  });

  transaction();

  console.log(`[seasonNames] Stored ${generatedNames.length} season names`);

  // Return from DB (to get all fields including id and generated_at)
  return db.prepare(`
    SELECT * FROM author_season_names
    WHERE climate_zone_id = ? AND author_key = ?
    ORDER BY season_number
  `).all(climateZoneId, authorKey);
}

/**
 * Get a single season name by number
 * Triggers generation of all 12 if not cached
 * @param {string} climateZoneId
 * @param {string} authorKey
 * @param {number} seasonNumber
 * @param {object} db - better-sqlite3 instance
 * @returns {Promise<string>} - the season name
 */
async function getSeasonName(climateZoneId, authorKey, seasonNumber, db) {
  // Get all (this will use cache or generate)
  const allNames = await getSeasonNames(climateZoneId, authorKey, db);

  const result = allNames.find(n => n.season_number === seasonNumber);
  if (!result) {
    throw new Error(`Season ${seasonNumber} not found for ${climateZoneId}/${authorKey}`);
  }

  return result.season_name;
}

module.exports = {
  getSeasonNames,
  getSeasonName,
  AUTHOR_PROFILES
};
