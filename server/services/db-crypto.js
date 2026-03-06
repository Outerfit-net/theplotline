/**
 * db-crypto.js — PII encryption helpers for PostgreSQL pgcrypto
 *
 * Uses pgp_sym_encrypt / pgp_sym_decrypt with a parameterized key
 * to avoid embedding the key in SQL strings.
 *
 * Usage pattern (with the db.prepare() wrapper in index.js):
 *
 *   const { encKey, encryptExpr, decryptExpr } = require('./db-crypto');
 *
 *   // Insert: pass encKey as an extra param
 *   db.prepare(`INSERT INTO subscribers (email_enc) VALUES (pgp_sym_encrypt(?::text, ?))`)
 *     .run(emailValue, encKey);
 *
 *   // Select: pass encKey as the first param
 *   db.prepare(`SELECT pgp_sym_decrypt(email_enc, ?)::text AS email FROM subscribers WHERE id = ?`)
 *     .get(encKey, id);
 *
 * TODO: Before production launch, back up DB_ENCRYPTION_KEY to Bitwarden.
 *       If the key is lost, all encrypted PII is permanently unrecoverable.
 */

const encKey = process.env.DB_ENCRYPTION_KEY;

if (!encKey) {
  throw new Error('DB_ENCRYPTION_KEY environment variable is not set. Cannot start without encryption key.');
}

module.exports = { encKey };
