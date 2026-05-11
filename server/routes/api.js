const express = require('express');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');
const { BLOCK_REGISTRY, DEFAULT_SEARCH_FIELDS } = require('../blockRegistry');
const store = require('../store');

const router = express.Router();

const CONTENT_DIR = path.join(__dirname, '../content');
// Normalized with trailing sep so startsWith check is dir-boundary safe
const CONTENT_DIR_PREFIX = CONTENT_DIR + path.sep;

// Derived from BLOCK_REGISTRY — do not edit directly
const TYPE_FILES = Object.fromEntries(
  Object.entries(BLOCK_REGISTRY).map(([type, entry]) => [type, entry.filename]),
);
const SEARCH_FIELDS = Object.fromEntries(
  Object.entries(BLOCK_REGISTRY).map(([type, entry]) => [type, entry.searchFields]),
);

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
router.get('/document/:id', async (req, res) => {
  try {
    const doc = await store.getById(req.params.id);
    if (!doc || doc.type !== 'document') return res.status(404).json({ error: 'Not found' });
    if (!doc.src) return res.status(404).json({ error: 'No content file for this document' });

    const filePath = path.join(CONTENT_DIR, doc.src);
    if (!filePath.startsWith(CONTENT_DIR_PREFIX)) {
      return res.status(400).json({ error: 'Invalid document path' });
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      res.json({ ...doc, body: sanitizeHtml(marked(raw)) });
    } catch (err) {
      console.error(`Failed to read document ${doc.id}:`, err.message);
      res.status(500).json({ error: 'Could not read document content' });
    }
  } catch (err) {
    console.error('GET /document/:id db error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/blocks/:type
router.get('/:type', async (req, res) => {
  const { type } = req.params;
  if (!TYPE_FILES[type]) return res.status(400).json({ error: `Unknown block type: ${type}` });

  try {
    const { sort, search } = req.query;
    const blocks = applySort(
      (await store.getByType(type)).filter(b => matchesSearch(b, search)),
      sort,
    );
    res.json(blocks);
  } catch (err) {
    console.error(`GET /:type db error (type=${type}):`, err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/blocks
router.get('/', async (req, res) => {
  const { type, sort, search } = req.query;
  const types = type ? type.split(',').filter(t => TYPE_FILES[t]) : Object.keys(TYPE_FILES);

  try {
    const allBlocks = await Promise.all(types.map(t => store.getByType(t)));
    const blocks = applySort(
      allBlocks.flat().filter(b => matchesSearch(b, search)),
      sort,
    );
    res.json(blocks);
  } catch (err) {
    console.error('GET / db error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
