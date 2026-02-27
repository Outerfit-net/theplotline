/**
 * Seed authors table from authors.json
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { DB_PATH } = require('./init');

function seedAuthors() {
  const db = new Database(DB_PATH);
  console.log(`Seeding authors in: ${DB_PATH}`);

  // Read authors.json
  const authorsPath = path.join(__dirname, '..', 'garden', 'authors.json');
  const authors = JSON.parse(fs.readFileSync(authorsPath, 'utf8'));

  // Prepare insert statement
  const insert = db.prepare(`
    INSERT OR REPLACE INTO authors (key, name, style_prompt, active, added_at)
    VALUES (?, ?, ?, 1, datetime('now'))
  `);

  // Insert each author
  const insertMany = db.transaction((authors) => {
    for (const [key, data] of Object.entries(authors)) {
      insert.run(key, data.name, data.style);
      console.log(`  Seeded: ${key} (${data.name})`);
    }
  });

  insertMany(authors);

  // Verify
  const count = db.prepare('SELECT COUNT(*) as count FROM authors').get();
  console.log(`Total authors seeded: ${count.count}`);

  db.close();
  console.log('Seeding complete');
}

// Run if called directly
if (require.main === module) {
  seedAuthors();
}

module.exports = { seedAuthors };
