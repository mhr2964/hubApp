// Migration 0003: inline document markdown bodies into the `data` JSONB column.
//
// Previously each document block stored `data.src` pointing to a markdown file
// under server/content/. On Heroku the ephemeral filesystem means any file
// written after deploy is lost on dyno restart, so admin-created documents
// would lose their content. This migration copies the raw markdown from disk
// into `data.body` and removes `data.src` from each document row.
//
// The on-disk files are NOT deleted — they remain as historical reference and
// as the seed source for this migration. Future admin-created documents will
// write `data.body` directly and never use `data.src`.
//
// Down migration: throwing "not reversible" is simpler than trying to
// reconstruct filenames from content. The row itself is preserved; only the
// body text is lost on rollback. The seed files on disk still hold the
// original content so the data is never truly gone — it just needs to be
// re-run through 0003 again.

const path = require('path');
const fs = require('fs');

const CONTENT_DIR = path.join(__dirname, '../server/content');

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = async (pgm) => {
  // Fetch all document blocks that still have a src value.
  const { rows } = await pgm.db.query(
    `SELECT id, data FROM blocks WHERE type = 'document' AND data->>'src' IS NOT NULL`,
  );

  if (rows.length === 0) {
    console.log('[0003] No document blocks with src found — nothing to migrate.');
    return;
  }

  for (const row of rows) {
    const src = row.data.src;
    if (!src) {
      console.warn(`[0003] Block ${row.id}: data.src is present but empty — skipping.`);
      continue;
    }

    const filePath = path.join(CONTENT_DIR, src);

    let markdown;
    try {
      markdown = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      console.warn(`[0003] Block ${row.id}: could not read "${filePath}" — skipping (${err.message})`);
      continue;
    }

    // Build the new data object: add body, remove src.
    const { src: _removed, ...restData } = row.data;
    const newData = { ...restData, body: markdown };

    await pgm.db.query({
      text: `UPDATE blocks SET data = $1, updated_at = now() WHERE id = $2`,
      values: [JSON.stringify(newData), row.id],
    });

    console.log(`[0003] Block ${row.id}: inlined ${markdown.length} chars from ${src}.`);
  }

  console.log(`[0003] Done — processed ${rows.length} document block(s).`);
};

// Down: not reversible. The body text is still available in the on-disk seed
// files (server/content/documents/), so no content is permanently lost, but
// this migration cannot automatically reconstruct the original src paths for
// admin-created documents that were never on disk.
exports.down = async (_pgm) => {
  throw new Error(
    '[0003] Down migration is not supported. ' +
    'To restore, re-run "up" after checking out the seed markdown files.',
  );
};
