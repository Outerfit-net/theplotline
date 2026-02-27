/**
 * Cron job registration
 */

const cron = require('node-cron');
const { runDispatch } = require('./dispatch');

/**
 * Register all cron jobs
 */
function registerCrons() {
  // Daily dispatch at 6:00 AM local time
  // Cron format: minute hour day-of-month month day-of-week
  cron.schedule('0 6 * * *', async () => {
    console.log('[cron] Starting daily dispatch...');
    try {
      await runDispatch();
      console.log('[cron] Daily dispatch completed');
    } catch (err) {
      console.error('[cron] Daily dispatch failed:', err);
    }
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'America/Denver'
  });

  console.log('[cron] Registered daily dispatch at 6:00 AM');

  // Optional: Health check ping every hour
  cron.schedule('0 * * * *', () => {
    console.log(`[cron] Heartbeat: ${new Date().toISOString()}`);
  });
}

module.exports = { registerCrons };
