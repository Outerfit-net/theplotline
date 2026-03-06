/**
 * Postgres test infrastructure
 * Replaces the SQLite in-memory test DB with real Postgres
 */

const { Client } = require('pg');

const MAIN_DB_URL = 'postgresql://plotlines:plines2026@localhost:5432/plotlines';
const TEST_DB_URL = 'postgresql://plotlines:plines2026@localhost:5432/plotlines_test';
const ENC_KEY = 'test-encryption-key-32-chars-xxx';

let _dbCreated = false;

async function ensureTestDb() {
  if (_dbCreated) return;
  // Try connecting to plotlines_test directly to verify it exists
  const check = new Client({ connectionString: TEST_DB_URL });
  try {
    await check.connect();
    _dbCreated = true;
    await check.end();
    return;
  } catch (e) {
    // DB doesn't exist — try creating it via superuser
    try { await check.end(); } catch (_) {}
  }

  // Attempt creation via postgres superuser
  const admin = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres' });
  try {
    await admin.connect();
    await admin.query('CREATE DATABASE plotlines_test OWNER plotlines');
    _dbCreated = true;
  } catch (e) {
    if (!e.message.includes('already exists')) {
      throw new Error(`Cannot create plotlines_test DB. Create it manually:\n  CREATE DATABASE plotlines_test OWNER plotlines;\n  Original error: ${e.message}`);
    }
    _dbCreated = true;
  } finally {
    await admin.end();
  }
}

const SCHEMA = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS climate_zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  koppen_codes TEXT,
  representative_cities TEXT,
  hemisphere TEXT DEFAULT 'N',
  micro_seasons_built INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS micro_seasons (
  id TEXT PRIMARY KEY,
  climate_zone_id TEXT NOT NULL REFERENCES climate_zones(id),
  season_number INTEGER NOT NULL,
  day_of_year_start INTEGER NOT NULL,
  day_of_year_end INTEGER NOT NULL,
  name TEXT NOT NULL,
  observable_signal TEXT,
  topic_weights TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(climate_zone_id, season_number)
);

CREATE TABLE IF NOT EXISTS authors (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  style_prompt TEXT,
  active INTEGER DEFAULT 1,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  email BYTEA,
  email_hash TEXT,
  email_enc BYTEA,
  location_city BYTEA,
  location_state BYTEA,
  location_country TEXT DEFAULT 'US',
  zipcode BYTEA,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  lat_enc BYTEA,
  lon_enc BYTEA,
  timezone TEXT,
  hemisphere TEXT DEFAULT 'N',
  author_key TEXT DEFAULT 'hemingway',
  climate_zone_id TEXT REFERENCES climate_zones(id),
  station_code TEXT,
  active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP,
  unsubscribed_at TIMESTAMP,
  stripe_customer_id TEXT,
  subscription_id TEXT,
  stripe_subscription_id TEXT,
  confirm_token TEXT,
  unsubscribe_token TEXT,
  plan TEXT,
  subscription_status TEXT,
  subscription_end_date TEXT,
  referral_code TEXT,
  beta_invite TEXT,
  management_token UUID DEFAULT gen_random_uuid(),
  auth_token_expires_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  subscribed_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_email_hash ON subscribers(email_hash);
CREATE INDEX IF NOT EXISTS idx_subscribers_active ON subscribers(active);
CREATE INDEX IF NOT EXISTS idx_subscribers_climate_zone ON subscribers(climate_zone_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_confirm_token ON subscribers(confirm_token);
CREATE INDEX IF NOT EXISTS idx_subscribers_unsubscribe_token ON subscribers(unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_subscribers_station ON subscribers(station_code);

CREATE TABLE IF NOT EXISTS combinations (
  id TEXT PRIMARY KEY,
  location_key TEXT NOT NULL,
  author_key TEXT NOT NULL,
  climate_zone_id TEXT REFERENCES climate_zones(id),
  location_city TEXT,
  location_state TEXT,
  location_country TEXT DEFAULT 'US',
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  hemisphere TEXT DEFAULT 'N',
  timezone TEXT,
  station_code TEXT,
  weather_source TEXT DEFAULT 'nws',
  garden_context TEXT,
  garden_context_fetched_at TIMESTAMP,
  UNIQUE(location_key, author_key)
);

CREATE TABLE IF NOT EXISTS topic_wheel_state (
  combination_id TEXT NOT NULL REFERENCES combinations(id),
  category_id TEXT NOT NULL,
  last_used_date TEXT,
  last_topic TEXT,
  PRIMARY KEY (combination_id, category_id)
);

CREATE TABLE IF NOT EXISTS daily_runs (
  id TEXT PRIMARY KEY,
  combination_id TEXT NOT NULL REFERENCES combinations(id),
  run_date TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  prose_text TEXT,
  prose_html TEXT,
  topic TEXT,
  topic_category TEXT,
  micro_season_id TEXT REFERENCES micro_seasons(id),
  quote TEXT,
  author_name TEXT,
  weather_summary TEXT,
  characters TEXT,
  generated_at TIMESTAMP,
  generation_ms INTEGER,
  UNIQUE(combination_id, run_date)
);

CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  daily_run_id TEXT NOT NULL REFERENCES daily_runs(id),
  subscriber_id TEXT NOT NULL REFERENCES subscribers(id),
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMP,
  error TEXT
);

CREATE TABLE IF NOT EXISTS mastheads (
  id TEXT PRIMARY KEY,
  location_key TEXT NOT NULL,
  author_key TEXT NOT NULL,
  weather_type TEXT NOT NULL,
  season TEXT NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  image_data BYTEA,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(location_key, author_key, weather_type, season)
);

CREATE TABLE IF NOT EXISTS author_season_names (
  id TEXT PRIMARY KEY,
  climate_zone_id TEXT NOT NULL REFERENCES climate_zones(id),
  author_key TEXT NOT NULL,
  season_number INTEGER NOT NULL,
  season_name TEXT NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(climate_zone_id, author_key, season_number)
);

CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL REFERENCES subscribers(id),
  referee_email TEXT,
  code TEXT UNIQUE NOT NULL,
  redeemed_at TIMESTAMP,
  reward_applied_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gifts (
  id TEXT PRIMARY KEY,
  gifter_id TEXT NOT NULL REFERENCES subscribers(id),
  recipient_email TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS beta_invites (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP,
  failed_at TIMESTAMP
);
`;

const ALL_TABLES = [
  'beta_invites', 'gifts', 'referrals', 'deliveries', 'daily_runs',
  'topic_wheel_state', 'mastheads', 'author_season_names',
  'combinations', 'subscribers', 'micro_seasons', 'climate_zones', 'authors'
];

async function getTestDb() {
  await ensureTestDb();
  const client = new Client({ connectionString: TEST_DB_URL });
  await client.connect();
  await client.query(SCHEMA);
  return client;
}

async function resetTestDb(client) {
  await client.query(`TRUNCATE ${ALL_TABLES.join(', ')} RESTART IDENTITY CASCADE`);
}

module.exports = { getTestDb, resetTestDb, ENC_KEY, TEST_DB_URL };
