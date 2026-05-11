// Persistent block store backed by Postgres.
//
// Read path: blocks row is denormalized back to a flat object on the way out —
// all keys from the `data` JSONB column are spread to the top level so the
// existing API response shape is unchanged and the client needs no update.
//
// Write path (create/update/remove): implemented for future admin endpoints;
// the current public API only calls getByType and getById.

const { query } = require('./db');

/**
 * Merge `data` JSONB back into the flat shape the original JSON files used.
 * The DB stores common columns separately (id, type, title, date, size, tags,
 * position, created_at, updated_at); everything else lives in `data`.
 *
 * @param {object} row - Raw row from the blocks table
 * @returns {object}
 */
function denormalize(row) {
  // Strip DB-internal columns that the API consumers don't need.
  // eslint-disable-next-line no-unused-vars
  const { data, position, created_at, updated_at, ...common } = row;
  // date comes back as a JS Date object from pg; coerce to ISO string (YYYY-MM-DD)
  if (common.date instanceof Date) {
    common.date = common.date.toISOString().slice(0, 10);
  }
  return { ...common, ...(data ?? {}) };
}

/**
 * Return all blocks of the given type, ordered by position ASC (seed order)
 * then date DESC (newest first for ties / null positions).
 *
 * @param {string} type
 * @returns {Promise<object[]>}
 */
async function getByType(type) {
  const result = await query(
    `SELECT * FROM blocks
     WHERE type = $1
     ORDER BY position ASC NULLS LAST, date DESC`,
    [type],
  );
  return result.rows.map(denormalize);
}

/**
 * Return a single block by id, or null if not found.
 *
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function getById(id) {
  const result = await query('SELECT * FROM blocks WHERE id = $1', [id]);
  if (result.rows.length === 0) return null;
  return denormalize(result.rows[0]);
}

/**
 * Insert a new block. Common columns are extracted; everything else goes into
 * the `data` JSONB column. Returns the created row (denormalized).
 *
 * @param {object} block - Flat block object (same shape as JSON seed data)
 * @returns {Promise<object>}
 */
async function create(block) {
  const { id, type, title, date, size, tags, position, ...rest } = block;
  const result = await query(
    `INSERT INTO blocks (id, type, title, date, size, tags, position, data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [id, type, title, date, size ?? null, tags ?? [], position ?? null, rest],
  );
  return denormalize(result.rows[0]);
}

/**
 * Full replace of an existing block. Touches updated_at via the DB trigger.
 * Returns the updated row (denormalized), or null if the id was not found.
 *
 * @param {string} id
 * @param {object} block - Flat block object; id field is ignored (path param wins)
 * @returns {Promise<object|null>}
 */
async function update(id, block) {
  const { type, title, date, size, tags, position, ...rest } = block;
  const result = await query(
    `UPDATE blocks
     SET type = $2, title = $3, date = $4, size = $5,
         tags = $6, position = $7, data = $8, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, type, title, date, size ?? null, tags ?? [], position ?? null, rest],
  );
  if (result.rows.length === 0) return null;
  return denormalize(result.rows[0]);
}

/**
 * Delete a block by id. Returns true if a row was deleted, false if not found.
 *
 * @param {string} id
 * @returns {Promise<boolean>}
 */
async function remove(id) {
  const result = await query('DELETE FROM blocks WHERE id = $1', [id]);
  return result.rowCount > 0;
}

// ─── block_files helpers ──────────────────────────────────────────────────────
// Kept separate from the blocks CRUD above to make the binary path explicit.
// The file row lifecycle is tied entirely to its parent block row: ON DELETE
// CASCADE on the FK means no explicit removeFile is needed.

/**
 * Return the file record for a block, or null if none has been uploaded.
 * The `bytes` field is a Node Buffer (pg decodes BYTEA automatically).
 *
 * @param {string} blockId
 * @returns {Promise<{content_type: string, bytes: Buffer, size_bytes: number}|null>}
 */
async function getFile(blockId) {
  const { rows } = await query(
    'SELECT content_type, bytes, size_bytes FROM block_files WHERE block_id = $1',
    [blockId],
  );
  return rows[0] ?? null;
}

/**
 * Insert or replace the file for a block. Re-uploading the same block_id
 * overwrites the previous bytes in place (ON CONFLICT DO UPDATE).
 * size_bytes is computed from the buffer so callers cannot pass a wrong value.
 *
 * @param {string} blockId
 * @param {string} contentType  - MIME type, e.g. "image/jpeg"
 * @param {Buffer} bytes        - Raw binary content
 * @returns {Promise<void>}
 */
async function putFile(blockId, contentType, bytes) {
  const sizeBytes = bytes.length;
  await query(
    `INSERT INTO block_files (block_id, content_type, bytes, size_bytes)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (block_id) DO UPDATE
       SET content_type = EXCLUDED.content_type,
           bytes        = EXCLUDED.bytes,
           size_bytes   = EXCLUDED.size_bytes`,
    [blockId, contentType, bytes, sizeBytes],
  );
}

module.exports = { getByType, getById, create, update, remove, getFile, putFile };
