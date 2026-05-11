-- Migration 0004: create block_files table
--
-- Stores raw binary file data (photo, audio) in Postgres so uploads survive
-- Heroku dyno restarts. The ephemeral filesystem is wiped on every restart;
-- keeping files in the DB is the only durable option on the free/eco tier.
--
-- Design notes:
--   block_id is both PK and FK — one file per block, no standalone file rows.
--   ON DELETE CASCADE: removing a block row automatically removes its file.
--   content_type is stored separately so Content-Type headers can be set
--     correctly when serving, without materializing the bytes first.
--   size_bytes is denormalized (bytes.length is always authoritative) to allow
--     "how big is this file?" queries without loading the full binary column.
--   No additional index: all access is by block_id, which is the primary key.

-- ──────────────────────────────────────────────────────────────────────────────
-- Up
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS block_files (
  block_id     TEXT PRIMARY KEY REFERENCES blocks(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  bytes        BYTEA NOT NULL,
  size_bytes   INTEGER NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
