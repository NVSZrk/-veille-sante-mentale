const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.warn(
    'ATTENTION : DATABASE_URL n\'est pas définie. La plateforme ne pourra pas se connecter à la base de données.'
  );
}

// Neon (et la plupart des hébergeurs Postgres gratuits) exigent une connexion
// chiffrée (SSL), mais avec un certificat auto-signé côté client : on désactive
// donc la vérification stricte du certificat, ce qui est la pratique standard
// pour ce type d'hébergement.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false }
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS articles (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      source TEXT,
      keyword TEXT,
      category TEXT DEFAULT 'article',
      published_at TEXT,
      summary TEXT,
      raw_excerpt TEXT,
      saved BOOLEAN DEFAULT FALSE,
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL
    );
  `);

  console.log('Base de données prête (tables articles/users vérifiées).');
}

module.exports = { pool, init };
