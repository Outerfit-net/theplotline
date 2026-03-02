/**
 * Daily dispatch - generates and sends garden conversations
 *
 * For each unique location_key+author combination with active subscribers:
 * 1. Spawn Python engine subprocess to generate prose
 * 2. Store result in daily_runs
 * 3. Email all matching active, confirmed subscribers
 */

const { spawn } = require('child_process');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { sendDailyEmail } = require('../services/email');
const { getSeasonName } = require('../services/seasonNames');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'plotlines.db');
const PYTHON_PATH = process.env.PYTHON_PATH || 'python3';
const ENGINE_PATH = path.join(__dirname, '..', 'garden', 'engine.py');

/**
 * Get author-voiced season name for a daily run
 * Returns the name, or null if not available
 */
async function getAuthorSeasonName(dailyRun, combo, db) {
  if (!dailyRun.micro_season_id || !combo.climate_zone_id) {
    return null;
  }

  try {
    // Get season number from micro_season_id
    const microSeason = db.prepare(`
      SELECT season_number FROM micro_seasons WHERE id = ?
    `).get(dailyRun.micro_season_id);

    if (!microSeason) {
      console.warn(`[dispatch] Micro season not found: ${dailyRun.micro_season_id}`);
      return null;
    }

    // Get author-voiced season name
    const seasonName = await getSeasonName(
      combo.climate_zone_id,
      combo.author_key,
      microSeason.season_number,
      db
    );

    return seasonName;
  } catch (err) {
    console.warn(`[dispatch] Failed to get author season name:`, err.message);
    return null;
  }
}

function getDb() {
  return new Database(DB_PATH);
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getToday() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Run the Python garden engine for a combination
 * @param {object} combo - combination row
 * @returns {Promise<object>} - parsed JSON result
 */
function runEngine(combo) {
  return new Promise((resolve, reject) => {
    const args = [
      ENGINE_PATH,
      '--station', combo.station_code || combo.location_key,
      '--author', combo.author_key,
      '--city', combo.location_city || 'Unknown',
      '--state', combo.location_state || 'Unknown',
      '--lat', String(combo.lat || 39.7392),
      '--lon', String(combo.lon || -104.9903),
      '--context', combo.garden_context || '',
      '--output', 'json'
    ];

    console.log(`[dispatch] Running engine: ${PYTHON_PATH} ${args.join(' ')}`);

    const proc = spawn(PYTHON_PATH, args, {
      cwd: path.dirname(ENGINE_PATH),
      timeout: 120000 // 2 minute timeout
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        console.error(`[dispatch] Engine failed with code ${code}`);
        console.error(`[dispatch] stderr: ${stderr}`);
        reject(new Error(`Engine exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (err) {
        console.error(`[dispatch] Failed to parse engine output: ${stdout}`);
        reject(new Error(`Invalid engine output: ${err.message}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Main dispatch function - run daily
 */
async function runDispatch() {
  const today = getToday();
  console.log(`[dispatch] Starting daily dispatch for ${today}`);

  const db = getDb();

  try {
    // Get all combinations that have active, confirmed subscribers
    // Using location_key+author as the primary key (works for US and international)
    const combinations = db.prepare(`
      SELECT DISTINCT c.*
      FROM combinations c
      INNER JOIN subscribers s ON s.author_key = c.author_key 
        AND (
          (s.station_code = c.station_code AND c.station_code IS NOT NULL) OR
          (ROUND(s.lat * 20) / 20 = ROUND(c.lat * 20) / 20 AND 
           ROUND(s.lon * 20) / 20 = ROUND(c.lon * 20) / 20)
        )
      WHERE s.active = 1 AND s.confirmed_at IS NOT NULL
    `).all();

    console.log(`[dispatch] Found ${combinations.length} active combinations`);

    for (const combo of combinations) {
      // Check if we already have a run for today
      const existingRun = db.prepare(`
        SELECT id, status FROM daily_runs
        WHERE combination_id = ? AND run_date = ?
      `).get(combo.id, today);

      if (existingRun && existingRun.status === 'completed') {
        console.log(`[dispatch] Already completed: ${combo.location_key}/${combo.author_key}`);
        continue;
      }

      console.log(`[dispatch] Processing: ${combo.location_key}/${combo.author_key}`);

      const startTime = Date.now();

      try {
        // Run engine
        const result = await runEngine(combo);
        const generationMs = Date.now() - startTime;

        // Create or update daily run
        const runId = existingRun?.id || uuidv4();

        if (existingRun) {
          db.prepare(`
            UPDATE daily_runs
            SET status = 'completed',
                prose_text = ?, prose_html = ?, topic = ?, quote = ?,
                author_name = ?, weather_summary = ?, characters = ?,
                generated_at = datetime('now'), generation_ms = ?
            WHERE id = ?
          `).run(
            result.prose_text, result.prose_html, result.topic, result.quote,
            result.author_name, result.weather_summary, result.characters?.join(', '),
            generationMs, runId
          );
        } else {
          db.prepare(`
            INSERT INTO daily_runs (
              id, combination_id, run_date, status,
              prose_text, prose_html, topic, quote,
              author_name, weather_summary, characters,
              generated_at, generation_ms
            ) VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
          `).run(
            runId, combo.id, today,
            result.prose_text, result.prose_html, result.topic, result.quote,
            result.author_name, result.weather_summary, result.characters?.join(', '),
            generationMs
          );
        }

        console.log(`[dispatch] Generated in ${generationMs}ms: ${combo.location_key}/${combo.author_key}`);

        // Get subscribers for this combination
        // Match by location_key + author (supports both US and international)
        const subscribers = db.prepare(`
          SELECT id, email, unsubscribe_token
          FROM subscribers
          WHERE author_key = ?
            AND (
              (station_code = ? AND station_code IS NOT NULL) OR
              (ROUND(lat * 20) / 20 = ROUND(?) / 20 AND 
               ROUND(lon * 20) / 20 = ROUND(?) / 20)
            )
            AND active = 1 AND confirmed_at IS NOT NULL
        `).all(combo.author_key, combo.station_code, combo.lat, combo.lon);

        console.log(`[dispatch] Sending to ${subscribers.length} subscribers`);

        // Get the run for email
        const dailyRun = db.prepare('SELECT * FROM daily_runs WHERE id = ?').get(runId);

        // Attach author-voiced season name if available
        const authorSeasonName = await getAuthorSeasonName(dailyRun, combo, db);
        if (authorSeasonName) {
          dailyRun.author_season_name = authorSeasonName;
        }

        // Send emails
        for (const sub of subscribers) {
          try {
            await sendDailyEmail(sub.email, dailyRun, sub.unsubscribe_token);

            // Record delivery
            db.prepare(`
              INSERT INTO deliveries (id, daily_run_id, subscriber_id, status, sent_at)
              VALUES (?, ?, ?, 'sent', datetime('now'))
            `).run(uuidv4(), runId, sub.id);

            console.log(`[dispatch] Sent to ${sub.email}`);

          } catch (emailErr) {
            console.error(`[dispatch] Email failed for ${sub.email}:`, emailErr.message);

            db.prepare(`
              INSERT INTO deliveries (id, daily_run_id, subscriber_id, status, error)
              VALUES (?, ?, ?, 'failed', ?)
            `).run(uuidv4(), runId, sub.id, emailErr.message);
          }
        }

      } catch (engineErr) {
        console.error(`[dispatch] Engine failed for ${combo.location_key}/${combo.author_key}:`, engineErr.message);

        // Record failed run
        if (!existingRun) {
          db.prepare(`
            INSERT INTO daily_runs (id, combination_id, run_date, status)
            VALUES (?, ?, ?, 'failed')
          `).run(uuidv4(), combo.id, today);
        } else {
          db.prepare(`UPDATE daily_runs SET status = 'failed' WHERE id = ?`).run(existingRun.id);
        }
      }
    }

    console.log(`[dispatch] Completed daily dispatch for ${today}`);

  } catch (err) {
    console.error('[dispatch] Fatal error:', err);
  } finally {
    db.close();
  }
}

// Export for cron
module.exports = { runDispatch };

// Run directly if called as script
if (require.main === module) {
  runDispatch().then(() => {
    console.log('[dispatch] Done');
    process.exit(0);
  }).catch(err => {
    console.error('[dispatch] Error:', err);
    process.exit(1);
  });
}
