// Migration 0002: one-time seed from the original JSON files.
//
// Reads each of the five JSON data files, normalises each record to the blocks
// schema (common columns + everything else into the `data` JSONB column), and
// inserts with a position value that preserves original seed order within each
// type. The source JSON files are NOT dropped — they remain as documentation.
//
// This migration is idempotent via ON CONFLICT DO NOTHING; re-running is safe
// but is a no-op because all seed ids are fixed strings.

const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../server/data');

// Types in the order they appear in block-types.json
const TYPE_FILENAMES = {
  document: 'documents',
  photo: 'photos',
  audio: 'audio',
  link: 'links',
  project: 'projects',
};

// Common columns stored as top-level DB columns; everything else goes in `data`
const COMMON_COLS = new Set(['id', 'type', 'title', 'date', 'size', 'tags']);

function readJson(filename) {
  const filePath = path.join(DATA_DIR, `${filename}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Split a flat block record into common columns + the `data` object.
 *
 * @param {object} block
 * @returns {{ id: string, type: string, title: string, date: string,
 *             size: string|null, tags: string[], data: object }}
 */
function split(block) {
  const common = { tags: [] };
  const data = {};
  for (const [key, value] of Object.entries(block)) {
    if (COMMON_COLS.has(key)) {
      common[key] = value;
    } else {
      data[key] = value;
    }
  }
  return { ...common, data };
}

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = async (pgm) => {
  for (const [type, filename] of Object.entries(TYPE_FILENAMES)) {
    let records;
    try {
      records = readJson(filename);
    } catch (err) {
      console.warn(`[seed] Could not read ${filename}.json — skipping (${err.message})`);
      continue;
    }

    for (let i = 0; i < records.length; i++) {
      const { id, title, date, size, tags, data } = split(records[i]);

      await pgm.db.query({
        text: `
          INSERT INTO blocks (id, type, title, date, size, tags, position, data)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING
        `,
        values: [id, type, title, date, size ?? null, tags, i + 1, data],
      });
    }
  }
};

// Down: remove only the seeded rows (identified by their well-known ids).
// Any admin-created blocks added after the seed are untouched.
exports.down = async (pgm) => {
  for (const filename of Object.values(TYPE_FILENAMES)) {
    let records;
    try {
      records = readJson(filename);
    } catch (_err) {
      continue;
    }
    const ids = records.map(r => r.id);
    if (ids.length > 0) {
      // Build $1, $2, ... placeholders
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
      await pgm.db.query({
        text: `DELETE FROM blocks WHERE id IN (${placeholders})`,
        values: ids,
      });
    }
  }
};
