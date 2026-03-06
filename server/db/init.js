/**
 * Database initialization script
 * Legacy SQLite init — production now uses Postgres.
 * Retained for reference; seed scripts may still use better-sqlite3 for local SQLite operations.
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'plotlines.db');

async function initDatabase() {
  const { Client } = require('pg');
  const dbUrl = process.env.DATABASE_URL || 'postgresql://plotlines:plines2026@localhost:5432/plotlines';
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  await client.query(schema);
  console.log('Schema applied successfully');

  const { rows: tables } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  console.log('Tables created:', tables.map(t => t.table_name).join(', '));

  await client.end();
  console.log('Database initialization complete');
}

if (require.main === module) {
  initDatabase().catch(err => {
    console.error('Init failed:', err);
    process.exit(1);
  });
}

module.exports = { initDatabase, DB_PATH };
