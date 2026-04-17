const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const DATA_DIR = path.join(__dirname, '../data');
const CONTENT_DIR = path.join(__dirname, '../content');

const TYPE_MAP = {
  document: 'documents',
  photo: 'photos',
  audio: 'audio',
  link: 'links',
};

function readType(type) {
  try {
    const file = path.join(DATA_DIR, `${TYPE_MAP[type]}.json`);
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function matchesSearch(block, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  const fields = {
    document: [block.title, block.preview],
    link: [block.title, block.description],
    photo: [block.title, block.caption, ...(block.tags || [])],
    audio: [block.title, block.description, ...(block.tags || [])],
  };
  return (fields[block.type] || [block.title])
    .filter(Boolean)
    .some(f => f.toLowerCase().includes(q));
}

function sortBlocks(blocks, sort) {
  return [...blocks].sort((a, b) => {
    const diff = new Date(b.date) - new Date(a.date);
    return sort === 'oldest' ? -diff : diff;
  });
}

// GET /api/blocks/document/:id — must be defined before /:type
router.get('/document/:id', (req, res) => {
  const docs = readType('document');
  const doc = docs.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });

  try {
    const filePath = path.join(CONTENT_DIR, doc.src);
    const raw = fs.readFileSync(filePath, 'utf8');
    res.json({ ...doc, body: marked(raw) });
  } catch {
    res.status(500).json({ error: 'Could not read document' });
  }
});

// GET /api/blocks/:type
router.get('/:type', (req, res) => {
  const { type } = req.params;
  if (!TYPE_MAP[type]) return res.status(400).json({ error: 'Unknown type' });
  const { sort, search } = req.query;
  let blocks = readType(type);
  blocks = blocks.filter(b => matchesSearch(b, search));
  blocks = sortBlocks(blocks, sort);
  res.json(blocks);
});

// GET /api/blocks
router.get('/', (req, res) => {
  const { type, sort, search } = req.query;
  const types = type ? type.split(',') : Object.keys(TYPE_MAP);
  let blocks = types.flatMap(t => (TYPE_MAP[t] ? readType(t) : []));
  blocks = blocks.filter(b => matchesSearch(b, search));
  blocks = sortBlocks(blocks, sort);
  res.json(blocks);
});

module.exports = router;
