const express = require('express');
const fs = require('fs');
const net = require('net');
const path = require('path');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');
const { nanoid } = require('nanoid');
const ogs = require('open-graph-scraper');
const { BLOCK_REGISTRY, DEFAULT_SEARCH_FIELDS } = require('../blockRegistry');
const store = require('../store');
const { requireAuth } = require('../middleware/auth');
const { validateLink, validateProject } = require('../validators/blocks');

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

// ---------------------------------------------------------------------------
// SSRF guard — rejects loopback, link-local, and RFC1918 private ranges.
// Cloud metadata endpoint (169.254.169.254) is covered by the link-local check.
// ---------------------------------------------------------------------------

/**
 * Returns true if the hostname resolves to a private/restricted address space
 * that should never be reached from a public-facing scraper.
 *
 * Only inspects the literal hostname string — no DNS resolution.
 * DNS rebinding is out of scope for a single-user app on Heroku.
 *
 * @param {string} hostname
 * @returns {boolean}
 */
function isPrivateHost(hostname) {
  const h = hostname.toLowerCase();

  // Reject named loopback aliases.
  if (h === 'localhost' || h.endsWith('.localhost')) return true;

  // Only perform numeric range checks when the host is a bare IP.
  const version = net.isIP(h); // 0 = not an IP, 4 or 6
  if (version === 0) return false;

  if (version === 6) {
    // Reject ::1 (loopback) and fc00::/7 (unique-local, covers fd00::/8).
    if (h === '::1' || /^f[cd]/i.test(h)) return true;
    return false;
  }

  // IPv4 — check against loopback, link-local and RFC1918 ranges.
  const parts = h.split('.').map(Number);
  const [a, b] = parts;
  if (a === 127) return true;                        // 127.0.0.0/8  loopback
  if (a === 169 && b === 254) return true;           // 169.254.0.0/16 link-local / cloud metadata
  if (a === 10) return true;                         // 10.0.0.0/8   RFC1918
  if (a === 172 && b >= 16 && b <= 31) return true;  // 172.16.0.0/12 RFC1918
  if (a === 192 && b === 168) return true;           // 192.168.0.0/16 RFC1918
  return false;
}

// ---------------------------------------------------------------------------
// OG scraper helper
// ---------------------------------------------------------------------------

const OG_TIMEOUT_MS = 5000;

/**
 * Fetch OG metadata for a URL. Returns a partial draft — callers must handle
 * missing fields gracefully.
 *
 * @param {string} url
 * @returns {Promise<{ title?: string, description?: string, og_image?: string, favicon?: string, url: string }>}
 */
async function fetchOgMeta(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OG_TIMEOUT_MS);

  try {
    const { result } = await ogs({
      url,
      fetchOptions: { signal: controller.signal },
    });

    let host;
    try { host = new URL(url).hostname; } catch { host = null; }

    const ogImages = result.ogImage;
    const og_image = Array.isArray(ogImages) && ogImages.length > 0
      ? ogImages[0].url
      : (ogImages && ogImages.url) || undefined;

    const favicon = result.favicon ||
      (host ? `https://www.google.com/s2/favicons?domain=${host}&sz=64` : undefined);

    return {
      title: result.ogTitle || result.twitterTitle || undefined,
      description: result.ogDescription || result.twitterDescription || undefined,
      og_image,
      favicon,
      url,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Write routes — all gated by requireAuth
// ---------------------------------------------------------------------------

// POST /api/blocks/link/from-url — scrape OG metadata, does NOT persist
router.post('/link/from-url', requireAuth, async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(422).json({ error: 'url is required' });
  }
  let parsed;
  try { parsed = new URL(url); } catch {
    return res.status(422).json({ error: 'Malformed URL' });
  }
  if (isPrivateHost(parsed.hostname)) {
    return res.status(400).json({ error: 'URL host is not allowed' });
  }

  let meta;
  try {
    meta = await fetchOgMeta(url);
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn(`OG scrape timeout for ${url}`);
      return res.status(504).json({ error: 'OG scrape timed out' });
    }
    console.error(`OG scrape failed for ${url}:`, err.message);
    return res.status(502).json({ error: 'Failed to fetch OG metadata' });
  }

  // Partial success is fine — return whatever was found (200) so the user can fill in the rest.
  return res.json(meta);
});

// POST /api/blocks/link — create a new link block
router.post('/link', requireAuth, async (req, res) => {
  const { valid, errors } = validateLink(req.body);
  if (!valid) return res.status(400).json({ errors });

  const today = new Date().toISOString().slice(0, 10);
  const block = {
    id: `link-${nanoid(8)}`,
    type: 'link',
    title: req.body.title.trim(),
    url: req.body.url.trim(),
    description: req.body.description ?? undefined,
    og_image: req.body.og_image ?? undefined,
    favicon: req.body.favicon ?? undefined,
    tags: req.body.tags ?? [],
    size: req.body.size ?? undefined,
    date: req.body.date ?? today,
  };

  try {
    const created = await store.create(block);
    return res.status(201).json(created);
  } catch (err) {
    console.error('POST /link db error:', err.message);
    return res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/blocks/link/:id — full replace
router.put('/link/:id', requireAuth, async (req, res) => {
  const { valid, errors } = validateLink(req.body);
  if (!valid) return res.status(400).json({ errors });

  const today = new Date().toISOString().slice(0, 10);
  const block = {
    type: 'link',
    title: req.body.title.trim(),
    url: req.body.url.trim(),
    description: req.body.description ?? undefined,
    og_image: req.body.og_image ?? undefined,
    favicon: req.body.favicon ?? undefined,
    tags: req.body.tags ?? [],
    size: req.body.size ?? undefined,
    date: req.body.date ?? today,
  };

  try {
    const updated = await store.update(req.params.id, block);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    return res.json(updated);
  } catch (err) {
    console.error(`PUT /link/${req.params.id} db error:`, err.message);
    return res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/blocks/link/:id — remove
router.delete('/link/:id', requireAuth, async (req, res) => {
  try {
    const existed = await store.remove(req.params.id);
    if (!existed) return res.status(404).json({ error: 'Not found' });
    return res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /link/${req.params.id} db error:`, err.message);
    return res.status(500).json({ error: 'Database error' });
  }
});

// ---------------------------------------------------------------------------
// Project routes
// ---------------------------------------------------------------------------

const GITHUB_REPO_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i;
const GITHUB_TIMEOUT_MS = 5000;

// POST /api/blocks/project/from-repo — fetch GitHub metadata, does NOT persist
router.post('/project/from-repo', requireAuth, async (req, res) => {
  const { repo_url } = req.body;
  if (!repo_url || typeof repo_url !== 'string') {
    return res.status(422).json({ error: 'repo_url is required' });
  }

  const match = GITHUB_REPO_RE.exec(repo_url.trim());
  if (!match) {
    return res.status(422).json({ error: 'Not a recognizable GitHub repo URL' });
  }

  const [, owner, repo] = match;
  const headers = { 'User-Agent': 'hub-app', Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GITHUB_TIMEOUT_MS);

  let repoData, langsData;
  try {
    const [repoRes, langsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers, signal: controller.signal }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers, signal: controller.signal }),
    ]);

    if (repoRes.status === 404) {
      return res.status(404).json({ error: 'GitHub repo not found' });
    }
    if (!repoRes.ok) {
      console.error(`GitHub API error for ${owner}/${repo}: ${repoRes.status}`);
      return res.status(502).json({ error: 'GitHub API error' });
    }
    if (!langsRes.ok) {
      console.error(`GitHub languages API error for ${owner}/${repo}: ${langsRes.status}`);
      return res.status(502).json({ error: 'GitHub API error' });
    }

    repoData = await repoRes.json();
    langsData = await langsRes.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn(`GitHub fetch timeout for ${owner}/${repo}`);
      return res.status(504).json({ error: 'GitHub fetch timed out' });
    }
    console.error(`GitHub fetch failed for ${owner}/${repo}:`, err.message);
    return res.status(502).json({ error: 'Failed to fetch GitHub metadata' });
  } finally {
    clearTimeout(timer);
  }

  // Top 3 languages by byte count (API returns { Lang: bytes } object).
  const stack = Object.entries(langsData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([lang]) => lang);

  return res.json({
    title: repoData.name ?? undefined,
    description: repoData.description ?? undefined,
    repo_url: repoData.html_url ?? undefined,
    live_url: repoData.homepage || undefined,
    stack,
  });
});

// POST /api/blocks/project — create a new project block
router.post('/project', requireAuth, async (req, res) => {
  const { valid, errors } = validateProject(req.body);
  if (!valid) return res.status(400).json({ errors });

  const today = new Date().toISOString().slice(0, 10);
  const block = {
    id: `project-${nanoid(8)}`,
    type: 'project',
    title: req.body.title.trim(),
    description: req.body.description ?? undefined,
    status: req.body.status ?? 'active',
    stack: req.body.stack ?? [],
    tags: req.body.tags ?? [],
    size: req.body.size ?? undefined,
    date: req.body.date ?? today,
    repo_url: req.body.repo_url ?? undefined,
    live_url: req.body.live_url ?? undefined,
  };

  try {
    const created = await store.create(block);
    return res.status(201).json(created);
  } catch (err) {
    console.error('POST /project db error:', err.message);
    return res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/blocks/project/:id — full replace
router.put('/project/:id', requireAuth, async (req, res) => {
  const { valid, errors } = validateProject(req.body);
  if (!valid) return res.status(400).json({ errors });

  const today = new Date().toISOString().slice(0, 10);
  const block = {
    type: 'project',
    title: req.body.title.trim(),
    description: req.body.description ?? undefined,
    status: req.body.status ?? 'active',
    stack: req.body.stack ?? [],
    tags: req.body.tags ?? [],
    size: req.body.size ?? undefined,
    date: req.body.date ?? today,
    repo_url: req.body.repo_url ?? undefined,
    live_url: req.body.live_url ?? undefined,
  };

  try {
    const updated = await store.update(req.params.id, block);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    return res.json(updated);
  } catch (err) {
    console.error(`PUT /project/${req.params.id} db error:`, err.message);
    return res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/blocks/project/:id — remove
router.delete('/project/:id', requireAuth, async (req, res) => {
  try {
    const existed = await store.remove(req.params.id);
    if (!existed) return res.status(404).json({ error: 'Not found' });
    return res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /project/${req.params.id} db error:`, err.message);
    return res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
