/**
 * Database initialization script
 * Creates SQLite database and applies schema
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'plotlines.db');

function initDatabase() {
  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created data directory: ${dataDir}`);
  }

  // Open database
  const db = new Database(DB_PATH);
  console.log(`Opened database: ${DB_PATH}`);

  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL');

  // Read and execute schema
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Execute schema (multiple statements)
  db.exec(schema);
  console.log('Schema applied successfully');

  // Verify tables exist
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table'
    ORDER BY name
  `).all();

  console.log('Tables created:', tables.map(t => t.name).join(', '));

  db.close();
  console.log('Database initialization complete');
}

// Run if called directly
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase, DB_PATH };
