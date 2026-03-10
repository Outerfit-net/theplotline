/**
 * Authors routes
 */

async function authorRoutes(fastify) {
  /**
   * GET /api/authors
   * List all active authors
   */
  fastify.get('/authors', async (request, reply) => {
    const db = fastify.db;

    try {
      const { rows: authors } = await db.query(`
        SELECT key, name, style_prompt
        FROM authors
        WHERE active = 1
        ORDER BY name
      `);

      return reply.send({
        authors: authors.map(a => ({
          key: a.key,
          name: a.name,
          description: a.style_prompt ? a.style_prompt.split('.')[0] : ''
        }))
      });

    } catch (err) {
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
          { key: 'saunders', name: 'George Saunders', description: 'Satirical warmth' },
          { key: 'vonnegut', name: 'Kurt Vonnegut', description: 'So it goes' },
          { key: 'robbins', name: 'Tom Robbins', description: 'Lush, digressive, sensual' },
          { key: 'gabaldon', name: 'Diana Gabaldon', description: 'Romantic, historically grounded' },
          { key: 'leguin', name: 'Ursula K. Le Guin', description: 'Mythic, anthropological, Taoist patience' }
        ]
      });
    }
  });
}

module.exports = authorRoutes;
