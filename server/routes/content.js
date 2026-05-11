// GET /api/content/:id — serve binary content stored in block_files.
//
// Public, no auth required: the home grid renders these as <img src> and
// <audio src> tags which cannot carry session cookies reliably cross-origin.
// Content is immutable per id (re-upload overwrites in place but keeps the
// same id), so long-lived cache headers are appropriate.

const express = require('express');
const store = require('../store');

const router = express.Router();

// GET /api/content/:id
router.get('/:id', async (req, res) => {
  let file;
  try {
    file = await store.getFile(req.params.id);
  } catch (err) {
    console.error(`GET /api/content/${req.params.id} db error:`, err.message);
    return res.status(500).json({ error: 'Database error' });
  }

  if (!file) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.set({
    'Content-Type':   file.content_type,
    'Content-Length': file.size_bytes,
    'Cache-Control':  'public, max-age=31536000, immutable',
  });
  return res.end(file.bytes);
});

module.exports = router;
