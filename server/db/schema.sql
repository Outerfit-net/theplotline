-- Plot Lines Database Schema
-- SQLite with better-sqlite3
-- v2: Global climate zone system

-- ─── CLIMATE ZONES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS climate_zones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    koppen_codes TEXT,             -- JSON array
    representative_cities TEXT,    -- JSON array
    hemisphere TEXT DEFAULT 'N',
    micro_seasons_built INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ─── MICRO SEASONS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS micro_seasons (
    id TEXT PRIMARY KEY,
    climate_zone_id TEXT NOT NULL,
    season_number INTEGER NOT NULL,
    day_of_year_start INTEGER NOT NULL,
    day_of_year_end INTEGER NOT NULL,
    name TEXT NOT NULL,
    observable_signal TEXT,
    topic_weights TEXT NOT NULL,   -- JSON object
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(climate_zone_id, season_number),
    FOREIGN KEY (climate_zone_id) REFERENCES climate_zones(id)
);

CREATE INDEX IF NOT EXISTS idx_micro_seasons_zone ON micro_seasons(climate_zone_id);
CREATE INDEX IF NOT EXISTS idx_micro_seasons_doy ON micro_seasons(day_of_year_start, day_of_year_end);

-- ─── SUBSCRIBERS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscribers (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    location_city TEXT,
    location_state TEXT,
    location_country TEXT DEFAULT 'US',
    zipcode TEXT,
    lat REAL,
    lon REAL,
    timezone TEXT,
    hemisphere TEXT DEFAULT 'N',
    author_key TEXT DEFAULT 'hemingway',
    climate_zone_id TEXT,
    station_code TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    confirmed_at TEXT,
    unsubscribed_at TEXT,
    stripe_customer_id TEXT,
    subscription_id TEXT,
    confirm_token TEXT,
    unsubscribe_token TEXT,
    FOREIGN KEY (climate_zone_id) REFERENCES climate_zones(id)
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_station ON subscribers(station_code);
CREATE INDEX IF NOT EXISTS idx_subscribers_active ON subscribers(active);
CREATE INDEX IF NOT EXISTS idx_subscribers_confirm_token ON subscribers(confirm_token);
CREATE INDEX IF NOT EXISTS idx_subscribers_unsubscribe_token ON subscribers(unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_subscribers_climate_zone ON subscribers(climate_zone_id);

-- ─── COMBINATIONS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS combinations (
    id TEXT PRIMARY KEY,
    location_key TEXT NOT NULL,
    author_key TEXT NOT NULL,
    climate_zone_id TEXT,
    location_city TEXT,
    location_state TEXT,
    location_country TEXT DEFAULT 'US',
    zipcode TEXT,
    lat REAL,
    lon REAL,
    hemisphere TEXT DEFAULT 'N',
    timezone TEXT,
    station_code TEXT,
    weather_source TEXT DEFAULT 'nws',
    garden_context TEXT,
    garden_context_fetched_at TEXT,
    UNIQUE(location_key, author_key),
    FOREIGN KEY (climate_zone_id) REFERENCES climate_zones(id)
);

CREATE INDEX IF NOT EXISTS idx_combinations_location ON combinations(location_key);
CREATE INDEX IF NOT EXISTS idx_combinations_author ON combinations(author_key);
CREATE INDEX IF NOT EXISTS idx_combinations_station ON combinations(station_code);
CREATE INDEX IF NOT EXISTS idx_combinations_zone ON combinations(climate_zone_id);

-- ─── TOPIC WHEEL STATE ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS topic_wheel_state (
    combination_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    last_used_date TEXT,
    last_topic TEXT,
    PRIMARY KEY (combination_id, category_id),
    FOREIGN KEY (combination_id) REFERENCES combinations(id)
);

CREATE INDEX IF NOT EXISTS idx_wheel_combination ON topic_wheel_state(combination_id);

-- ─── DAILY RUNS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_runs (
    id TEXT PRIMARY KEY,
    combination_id TEXT NOT NULL,
    run_date TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    prose_text TEXT,
    prose_html TEXT,
    topic TEXT,
    topic_category TEXT,
    micro_season_id TEXT,
    quote TEXT,
    author_name TEXT,
    weather_summary TEXT,
    characters TEXT,
    generated_at TEXT,
    generation_ms INTEGER,
    UNIQUE(combination_id, run_date),
    FOREIGN KEY (combination_id) REFERENCES combinations(id),
    FOREIGN KEY (micro_season_id) REFERENCES micro_seasons(id)
);

CREATE INDEX IF NOT EXISTS idx_daily_runs_combination ON daily_runs(combination_id);
CREATE INDEX IF NOT EXISTS idx_daily_runs_date ON daily_runs(run_date);
CREATE INDEX IF NOT EXISTS idx_daily_runs_status ON daily_runs(status);

-- ─── DELIVERIES ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deliveries (
    id TEXT PRIMARY KEY,
    daily_run_id TEXT NOT NULL,
    subscriber_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    sent_at TEXT,
    error TEXT,
    FOREIGN KEY (daily_run_id) REFERENCES daily_runs(id),
    FOREIGN KEY (subscriber_id) REFERENCES subscribers(id)
);

CREATE INDEX IF NOT EXISTS idx_deliveries_run ON deliveries(daily_run_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_subscriber ON deliveries(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);

-- ─── AUTHORS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS authors (
    key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    style_prompt TEXT,
    active INTEGER DEFAULT 1,
    added_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_authors_active ON authors(active);

-- ─── MASTHEADS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mastheads (
    id TEXT PRIMARY KEY,
    location_key TEXT NOT NULL,
    author_key TEXT NOT NULL,
    weather_type TEXT NOT NULL,
    season TEXT NOT NULL,
    name TEXT NOT NULL,
    image_url TEXT,
    image_data BLOB,
    generated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(location_key, author_key, weather_type, season)
);

CREATE INDEX IF NOT EXISTS idx_mastheads_lookup ON mastheads(location_key, author_key, weather_type, season);

-- ─── AUTHOR SEASON NAMES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS author_season_names (
    id TEXT PRIMARY KEY,
    climate_zone_id TEXT NOT NULL,
    author_key TEXT NOT NULL,
    season_number INTEGER NOT NULL,
    season_name TEXT NOT NULL,
    generated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(climate_zone_id, author_key, season_number),
    FOREIGN KEY (climate_zone_id) REFERENCES climate_zones(id)
);

CREATE INDEX IF NOT EXISTS idx_asn_zone_author ON author_season_names(climate_zone_id, author_key);

-- ─── SUBSCRIBERS (EXTENDED FOR STRIPE) ─────────────────────────────────────
-- Adding columns to existing table in schema if not present
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS plan TEXT;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS subscription_end_date TEXT;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS referral_code TEXT;

CREATE INDEX IF NOT EXISTS idx_subscribers_stripe_sub ON subscribers(stripe_subscription_id);

-- ─── REFERRALS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY,
    referrer_id TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    redeemed_at TEXT,
    reward_applied_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (referrer_id) REFERENCES subscribers(id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_redeemed ON referrals(redeemed_at);

-- ─── GIFTS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gifts (
    id TEXT PRIMARY KEY,
    gifter_id TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    code TEXT NOT NULL,
    sent_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (gifter_id) REFERENCES subscribers(id)
);

CREATE INDEX IF NOT EXISTS idx_gifts_gifter ON gifts(gifter_id);
CREATE INDEX IF NOT EXISTS idx_gifts_code ON gifts(code);
CREATE INDEX IF NOT EXISTS idx_gifts_sent_at ON gifts(sent_at);
