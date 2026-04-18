const express = require('express');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const router = express.Router();

const DATA_DIR = path.join(__dirname, '../data');
const CONTENT_DIR = path.join(__dirname, '../content');
// Normalized with trailing sep so startsWith check is dir-boundary safe
const CONTENT_DIR_PREFIX = CONTENT_DIR + path.sep;

// Maps block type names to their JSON filenames
const TYPE_FILES = {
  document: 'documents',
  photo:    'photos',
  audio:    'audio',
  link:     'links',
};

// Load all block data once at startup and cache in memory.
// The dataset is small and static; re-reading on every request is unnecessary
// I/O. Restart the server to pick up data changes.
const store = {};
for (const [type, filename] of Object.entries(TYPE_FILES)) {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, `${filename}.json`), 'utf8');
    store[type] = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to load ${type} data:`, err.message);
    store[type] = [];
  }
}

function getByType(type) {
  return store[type] ?? [];
}

// Each block type exposes different text fields for search
const SEARCH_FIELDS = {
  document: b => [b.title, b.preview],
  link:     b => [b.title, b.description],
  photo:    b => [b.title, b.caption, ...(b.tags ?? [])],
  audio:    b => [b.title, b.description, ...(b.tags ?? [])],
};

const DEFAULT_SEARCH_FIELDS = b => [b.title];

function matchesSearch(block, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  const getFields = SEARCH_FIELDS[block.type] ?? DEFAULT_SEARCH_FIELDS;
  return getFields(block).filter(Boolean).some(f => f.toLowerCase().includes(q));
}

function applySort(blocks, sort) {
  if (blocks.length < 2) return blocks;
  return [...blocks].sort((a, b) => {
    const diff = new Date(b.date) - new Date(a.date);
    return sort === 'oldest' ? -diff : diff;
  });
}

// GET /api/blocks/document/:id — defined before /:type to avoid route shadowing
router.get('/document/:id', (req, res) => {
  const doc = getByType('document').find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  if (!doc.src) return res.status(404).json({ error: 'No content file for this document' });

  const filePath = path.join(CONTENT_DIR, doc.src);
  if (!filePath.startsWith(CONTENT_DIR_PREFIX)) {
    return res.status(400).json({ error: 'Invalid document path' });
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    res.json({ ...doc, body: marked(raw) });
  } catch (err) {
    console.error(`Failed to read document ${doc.id}:`, err.message);
    res.status(500).json({ error: 'Could not read document content' });
  }
});

// GET /api/blocks/:type
router.get('/:type', (req, res) => {
  const { type } = req.params;
  if (!TYPE_FILES[type]) return res.status(400).json({ error: `Unknown block type: ${type}` });

  const { sort, search } = req.query;
  const blocks = applySort(
    getByType(type).filter(b => matchesSearch(b, search)),
    sort,
  );
  res.json(blocks);
});

// GET /api/blocks
router.get('/', (req, res) => {
  const { type, sort, search } = req.query;
  const types = type ? type.split(',').filter(t => TYPE_FILES[t]) : Object.keys(TYPE_FILES);
  const blocks = applySort(
    types.flatMap(getByType).filter(b => matchesSearch(b, search)),
    sort,
  );
  res.json(blocks);
});

module.exports = router;
