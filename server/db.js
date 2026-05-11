const { Pool } = require('pg');

// Connection age before the pool retires it on checkin. Heroku Postgres swaps
// backends during maintenance; a zombie socket would throw ECONNREFUSED until
// the dyno restarts. 10 min means the pool self-heals within one tick.
const MAX_CONN_AGE_MS = 10 * 60 * 1000;

let pool;

function getPool() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Add it to .env (e.g. postgres://localhost:5432/hubapp).',
    );
  }

  // Heroku appends ?sslmode=require to DATABASE_URL; localhost never does.
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    max: 10,
  });

  pool.on('error', (err) => {
    console.error('Postgres pool error:', err.code ?? err.message);
  });

  pool.on('connect', (client) => {
    client.__bornAt = Date.now();
  });

  pool.on('release', (_err, client) => {
    if (!client) return;
    const age = Date.now() - (client.__bornAt ?? 0);
    if (age > MAX_CONN_AGE_MS) {
      client.end().catch(() => {});
    }
  });

  return pool;
}

/**
 * Execute a SQL query against the pool.
 *
 * @param {string} text   - Parameterised SQL
 * @param {unknown[]} [params] - Positional parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  return getPool().query(text, params);
}

module.exports = { getPool, query };
