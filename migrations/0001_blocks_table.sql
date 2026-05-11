-- Migration 0001: create blocks table
-- Stores all five block types (document, photo, audio, link, project) in a
-- single table. Type-specific fields live in the `data` JSONB column so the
-- schema is stable across type additions; the CHECK constraint enforces the
-- closed set of current types. Adding a new type requires a new migration that
-- updates the CHECK constraint (or widens it via an ALTER TABLE).
--
-- The `position` column preserves insertion / seed order. It is nullable
-- because future admin-created blocks will be ordered by date alone.

-- ──────────────────────────────────────────────────────────────────────────────
-- Up
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS blocks (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL CHECK (type IN ('document','photo','audio','link','project')),
  title       TEXT NOT NULL,
  date        DATE NOT NULL,
  size        TEXT,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  position    INTEGER,
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for the most common read path: getByType (type=X, ORDER BY position, date)
CREATE INDEX IF NOT EXISTS idx_blocks_type ON blocks (type);

-- Index for date-sorted listing within a type
CREATE INDEX IF NOT EXISTS idx_blocks_date ON blocks (date DESC);

-- Trigger keeps updated_at current on every UPDATE without requiring callers to
-- set it explicitly.
CREATE OR REPLACE FUNCTION set_updated_at()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blocks_updated_at ON blocks;

CREATE TRIGGER trg_blocks_updated_at
  BEFORE UPDATE ON blocks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
