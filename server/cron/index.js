/**
 * Cron job registration
 */

const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');

const DISPATCH_SCRIPT = path.join(
  '/home/administrator/openclaw/skills/garden-conversation/garden-dispatch.py'
);

/**
 * Run the Python DAG dispatcher.
 * Returns a Promise that resolves when the process exits.
 */
function runPythonDispatch() {
  return new Promise((resolve, reject) => {
    console.log('[cron] Spawning garden-dispatch.py...');
    const proc = spawn('python3', [DISPATCH_SCRIPT], {
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    proc.stdout.on('data', (d) => process.stdout.write(d));
    proc.stderr.on('data', (d) => process.stderr.write(d));

    proc.on('close', (code) => {
      if (code === 0) {
        console.log('[cron] garden-dispatch.py completed successfully');
        resolve();
      } else {
        console.error(`[cron] garden-dispatch.py exited with code ${code}`);
        reject(new Error(`garden-dispatch.py exited ${code}`));
      }
    });

    proc.on('error', (err) => {
      console.error(`[cron] Failed to spawn garden-dispatch.py: ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Register all cron jobs
 * @param {object} db - database wrapper (fastify.db) — unused, kept for API compat
 */
function registerCrons(db) {
  // Daily dispatch at 6:00 AM local time
  cron.schedule('0 6 * * *', async () => {
    console.log('[cron] Starting daily dispatch...');
    try {
      await runPythonDispatch();
      console.log('[cron] Daily dispatch completed');
    } catch (err) {
      console.error('[cron] Daily dispatch failed:', err);
    }
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'America/Denver'
  });

  console.log('[cron] Registered daily dispatch at 6:00 AM');

  // Heartbeat
  cron.schedule('0 * * * *', () => {
    console.log(`[cron] Heartbeat: ${new Date().toISOString()}`);
  });
}

module.exports = { registerCrons };
