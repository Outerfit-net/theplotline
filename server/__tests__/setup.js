const Database = require('better-sqlite3');

function initTestDb(dbPath) {
  const db = new Database(dbPath || ':memory:');
  
  const tables = [
    `CREATE TABLE climate_zones (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      koppen_codes TEXT,
      representative_cities TEXT,
      hemisphere TEXT DEFAULT 'N',
      micro_seasons_built INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    
    `CREATE TABLE micro_seasons (
      id TEXT PRIMARY KEY,
      climate_zone_id TEXT NOT NULL,
      season_number INTEGER NOT NULL,
      day_of_year_start INTEGER NOT NULL,
      day_of_year_end INTEGER NOT NULL,
      name TEXT NOT NULL,
      observable_signal TEXT,
      topic_weights TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(climate_zone_id, season_number),
      FOREIGN KEY (climate_zone_id) REFERENCES climate_zones(id)
    )`,
    
    `CREATE TABLE subscribers (
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
      stripe_subscription_id TEXT,
      confirm_token TEXT,
      unsubscribe_token TEXT,
      plan TEXT,
      subscription_status TEXT,
      subscription_end_date TEXT,
      referral_code TEXT,
      FOREIGN KEY (climate_zone_id) REFERENCES climate_zones(id)
    )`,
    
    `CREATE TABLE combinations (
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
    )`,
    
    `CREATE TABLE topic_wheel_state (
      combination_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      last_used_date TEXT,
      last_topic TEXT,
      PRIMARY KEY (combination_id, category_id),
      FOREIGN KEY (combination_id) REFERENCES combinations(id)
    )`,
    
    `CREATE TABLE daily_runs (
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
    )`,
    
    `CREATE TABLE deliveries (
      id TEXT PRIMARY KEY,
      daily_run_id TEXT NOT NULL,
      subscriber_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      sent_at TEXT,
      error TEXT,
      FOREIGN KEY (daily_run_id) REFERENCES daily_runs(id),
      FOREIGN KEY (subscriber_id) REFERENCES subscribers(id)
    )`,
    
    `CREATE TABLE authors (
      key TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      style_prompt TEXT,
      active INTEGER DEFAULT 1,
      added_at TEXT DEFAULT (datetime('now'))
    )`,
    
    `CREATE TABLE mastheads (
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
    )`,
    
    `CREATE TABLE author_season_names (
      id TEXT PRIMARY KEY,
      climate_zone_id TEXT NOT NULL,
      author_key TEXT NOT NULL,
      season_number INTEGER NOT NULL,
      season_name TEXT NOT NULL,
      generated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(climate_zone_id, author_key, season_number),
      FOREIGN KEY (climate_zone_id) REFERENCES climate_zones(id)
    )`,
    
    `CREATE TABLE referrals (
      id TEXT PRIMARY KEY,
      referrer_id TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      redeemed_at TEXT,
      reward_applied_at TEXT
    )`,
    
    `CREATE TABLE gifts (
      id TEXT PRIMARY KEY,
      gifter_id TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      sent_at TEXT DEFAULT (datetime('now'))
    )`
  ];
  
  const indexes = [
    'CREATE INDEX idx_micro_seasons_zone ON micro_seasons(climate_zone_id)',
    'CREATE INDEX idx_micro_seasons_doy ON micro_seasons(day_of_year_start, day_of_year_end)',
    'CREATE INDEX idx_subscribers_email ON subscribers(email)',
    'CREATE INDEX idx_subscribers_station ON subscribers(station_code)',
    'CREATE INDEX idx_subscribers_active ON subscribers(active)',
    'CREATE INDEX idx_subscribers_confirm_token ON subscribers(confirm_token)',
    'CREATE INDEX idx_subscribers_unsubscribe_token ON subscribers(unsubscribe_token)',
    'CREATE INDEX idx_subscribers_climate_zone ON subscribers(climate_zone_id)',
    'CREATE INDEX idx_combinations_location ON combinations(location_key)',
    'CREATE INDEX idx_combinations_author ON combinations(author_key)',
    'CREATE INDEX idx_combinations_station ON combinations(station_code)',
    'CREATE INDEX idx_combinations_zone ON combinations(climate_zone_id)',
    'CREATE INDEX idx_wheel_combination ON topic_wheel_state(combination_id)',
    'CREATE INDEX idx_daily_runs_combination ON daily_runs(combination_id)',
    'CREATE INDEX idx_daily_runs_date ON daily_runs(run_date)',
    'CREATE INDEX idx_daily_runs_status ON daily_runs(status)',
    'CREATE INDEX idx_deliveries_run ON deliveries(daily_run_id)',
    'CREATE INDEX idx_deliveries_subscriber ON deliveries(subscriber_id)',
    'CREATE INDEX idx_deliveries_status ON deliveries(status)',
    'CREATE INDEX idx_authors_active ON authors(active)',
    'CREATE INDEX idx_mastheads_lookup ON mastheads(location_key, author_key, weather_type, season)',
    'CREATE INDEX idx_asn_zone_author ON author_season_names(climate_zone_id, author_key)',
    'CREATE INDEX idx_referrals_code ON referrals(code)',
    'CREATE INDEX idx_referrals_referrer ON referrals(referrer_id)',
    'CREATE INDEX idx_gifts_code ON gifts(code)',
    'CREATE INDEX idx_gifts_gifter ON gifts(gifter_id)',
    'CREATE INDEX idx_gifts_recipient ON gifts(recipient_email)'
  ];
  
  for (const table of tables) {
    try {
      db.exec(table);
    } catch (e) {
      // Table already exists in some scenarios
    }
  }
  
  for (const index of indexes) {
    try {
      db.exec(index);
    } catch (e) {
      // Index might exist already
    }
  }
  
  return db;
}

module.exports = { initTestDb };
