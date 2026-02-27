-- Plot Lines Database Schema
-- SQLite with better-sqlite3

-- Subscribers table
CREATE TABLE IF NOT EXISTS subscribers (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    location_city TEXT,
    location_state TEXT,
    author_key TEXT DEFAULT 'hemingway',
    station_code TEXT,
    timezone TEXT DEFAULT 'America/Denver',
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    confirmed_at TEXT,
    unsubscribed_at TEXT,
    stripe_customer_id TEXT,
    subscription_id TEXT,
    confirm_token TEXT,
    unsubscribe_token TEXT
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_station ON subscribers(station_code);
CREATE INDEX IF NOT EXISTS idx_subscribers_active ON subscribers(active);
CREATE INDEX IF NOT EXISTS idx_subscribers_confirm_token ON subscribers(confirm_token);
CREATE INDEX IF NOT EXISTS idx_subscribers_unsubscribe_token ON subscribers(unsubscribe_token);

-- Combinations table (unique station + author pairs for caching)
CREATE TABLE IF NOT EXISTS combinations (
    id TEXT PRIMARY KEY,
    station_code TEXT NOT NULL,
    author_key TEXT NOT NULL,
    location_city TEXT,
    location_state TEXT,
    lat REAL,
    lon REAL,
    garden_context TEXT,
    garden_context_fetched_at TEXT,
    UNIQUE(station_code, author_key)
);

CREATE INDEX IF NOT EXISTS idx_combinations_station ON combinations(station_code);
CREATE INDEX IF NOT EXISTS idx_combinations_author ON combinations(author_key);

-- Daily runs table (generated content per combination per day)
CREATE TABLE IF NOT EXISTS daily_runs (
    id TEXT PRIMARY KEY,
    combination_id TEXT NOT NULL,
    run_date TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    prose_text TEXT,
    prose_html TEXT,
    topic TEXT,
    quote TEXT,
    author_name TEXT,
    weather_summary TEXT,
    characters TEXT,
    generated_at TEXT,
    generation_ms INTEGER,
    UNIQUE(combination_id, run_date),
    FOREIGN KEY (combination_id) REFERENCES combinations(id)
);

CREATE INDEX IF NOT EXISTS idx_daily_runs_combination ON daily_runs(combination_id);
CREATE INDEX IF NOT EXISTS idx_daily_runs_date ON daily_runs(run_date);
CREATE INDEX IF NOT EXISTS idx_daily_runs_status ON daily_runs(status);

-- Deliveries table (email sends per subscriber per daily run)
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

-- Authors table (populated from authors.json)
CREATE TABLE IF NOT EXISTS authors (
    key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    style_prompt TEXT,
    active INTEGER DEFAULT 1,
    added_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_authors_active ON authors(active);
