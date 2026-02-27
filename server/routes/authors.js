/**
 * Authors routes
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'plotlines.db');

function getDb() {
  return new Database(DB_PATH);
}

async function authorRoutes(fastify) {
  /**
   * GET /api/authors
   * List all active authors
   */
  fastify.get('/authors', async (request, reply) => {
    const db = getDb();

    try {
      const authors = db.prepare(`
        SELECT key, name, style_prompt
        FROM authors
        WHERE active = 1
        ORDER BY name
      `).all();

      db.close();

      return reply.send({
        authors: authors.map(a => ({
          key: a.key,
          name: a.name,
          description: a.style_prompt ? a.style_prompt.split('.')[0] : ''
        }))
      });

    } catch (err) {
      db.close();
      console.error('Authors error:', err);

      // Fallback to hardcoded list if DB not initialized
      return reply.send({
        authors: [
          { key: 'hemingway', name: 'Ernest Hemingway', description: 'Short declarative sentences' },
          { key: 'carver', name: 'Raymond Carver', description: 'Minimalist' },
          { key: 'munro', name: 'Alice Munro', description: 'Time moves unexpectedly' },
          { key: 'morrison', name: 'Toni Morrison', description: 'Language that has music in it' },
          { key: 'oates', name: 'Joyce Carol Oates', description: 'Psychological intensity' },
          { key: 'lopez', name: 'Barry Lopez', description: 'Nature writing with moral weight' },
          { key: 'strout', name: 'Elizabeth Strout', description: 'Small-town plainness' },
          { key: 'bass', name: 'Rick Bass', description: 'Wilderness sensibility' },
          { key: 'mccarthy', name: 'Cormac McCarthy', description: 'Sparse, biblical cadence' },
          { key: 'oconnor', name: "Flannery O'Connor", description: 'Sharp, unsentimental, darkly comic' },
          { key: 'hurston', name: 'Zora Neale Hurston', description: 'Rich vernacular' },
          { key: 'saunders', name: 'George Saunders', description: 'Satirical warmth' }
        ]
      });
    }
  });
}

module.exports = authorRoutes;
