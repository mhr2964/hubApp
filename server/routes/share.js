// GET /b/:id — server-side OG meta tag injection for share URLs.
//
// Social crawlers (Slack, Twitter, Discord, iMessage) read the initial HTML
// response before any JS runs. The SPA hydrates after the fact, so OG tags
// injected by React are invisible to crawlers. This middleware intercepts
// /b/:id before the SPA static catch-all, looks up the block, and returns the
// built index.html with OG tags already present in the <head>.
//
// Dev mode (NODE_ENV !== 'production'): Express never serves client/build in
// dev — Vite owns that. Reading a non-existent build/index.html would throw.
// Instead, the middleware returns a JSON preview of what the OG tags would
// contain, which lets you curl-test the data flow without a production build.
//
// index.html cache: read once on first request, cached in-module. A server
// restart (e.g. a new Heroku deploy) replaces the module, so the cache is
// always in sync with the current build.

const express = require('express');
const fs = require('fs');
const path = require('path');
const store = require('../store');

const router = express.Router();

// Resolved once, reused across requests.
const INDEX_HTML_PATH = path.join(__dirname, '../../client/build/index.html');

/** @type {string|null} */
let cachedHtml = null;

/**
 * Return the contents of client/build/index.html, reading and caching on first
 * call. Throws if the file cannot be read.
 *
 * @returns {string}
 */
function getIndexHtml() {
  if (cachedHtml !== null) return cachedHtml;
  cachedHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  return cachedHtml;
}

/**
 * Escape a string for safe insertion into an HTML attribute value.
 * Handles the five characters that are meaningful inside attribute content.
 *
 * @param {string} s
 * @returns {string}
 */
function htmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strip markdown syntax characters so a plain-text description can be derived
 * from a markdown body without rendering to HTML first.
 * Handles: headings, bold/italic, code fences, inline code, links, images.
 *
 * @param {string} md
 * @returns {string}
 */
function stripMarkdown(md) {
  return md
    .replace(/```[\s\S]*?```/g, '')   // fenced code blocks
    .replace(/`[^`]*`/g, '')          // inline code
    .replace(/!\[.*?\]\(.*?\)/g, '')  // images
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1') // links → link text
    .replace(/^#{1,6}\s+/gm, '')      // headings
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1') // bold/italic
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build the OG + Twitter card meta tag block for a block object.
 * Returns an object with:
 *   - tags: the HTML string to inject
 *   - hasImage: whether an og:image tag was included (drives twitter:card value)
 *   - meta: plain object of key→value pairs (used in dev JSON preview)
 *
 * @param {object} block
 * @param {string} shareUrl - absolute URL for this share page
 * @param {string} origin   - protocol + host (for resolving relative src URLs)
 * @returns {{ tags: string, meta: object }}
 */
function buildOgMeta(block, shareUrl, origin) {
  const meta = {};

  // --- common ---
  meta['og:title']     = block.title || 'hub';
  meta['og:url']       = shareUrl;
  meta['og:site_name'] = 'hub';

  // --- per-type ---
  switch (block.type) {
    case 'document': {
      meta['og:type'] = 'article';
      if (block.preview) {
        meta['og:description'] = block.preview;
      } else if (block.body) {
        meta['og:description'] = stripMarkdown(block.body).slice(0, 200);
      }
      break;
    }
    case 'link': {
      meta['og:type'] = 'website';
      if (block.description) meta['og:description'] = block.description;
      if (block.og_image)    meta['og:image']       = block.og_image;
      break;
    }
    case 'project': {
      meta['og:type'] = 'website';
      if (block.description) meta['og:description'] = block.description;
      break;
    }
    case 'photo': {
      meta['og:type'] = 'website';
      const desc = block.caption || block.alt;
      if (desc) meta['og:description'] = desc;
      if (block.src) {
        // Relative /api/content/... URLs need an absolute base.
        meta['og:image'] = block.src.startsWith('http')
          ? block.src
          : `${origin}${block.src}`;
      }
      break;
    }
    case 'audio': {
      meta['og:type'] = 'music.song';
      if (block.description) meta['og:description'] = block.description;
      if (block.album_art)   meta['og:image']       = block.album_art;
      break;
    }
    default: {
      meta['og:type'] = 'website';
      break;
    }
  }

  // twitter:card depends on whether we ended up with an image.
  meta['twitter:card'] = meta['og:image'] ? 'summary_large_image' : 'summary';

  // Build the HTML tag block.
  const lines = Object.entries(meta).map(([prop, value]) => {
    // og: and music: properties use property=; twitter: uses name=
    const attr = prop.startsWith('twitter:') ? 'name' : 'property';
    return `    <meta ${attr}="${htmlEscape(prop)}" content="${htmlEscape(value)}">`;
  });

  return { tags: lines.join('\n'), meta };
}

/**
 * Insert `injection` into `html` immediately after </title> if that tag
 * exists, otherwise immediately after <head>. Falls back to prepending before
 * </head> if neither anchor is found (defensive only — well-formed HTML always
 * has <head>).
 *
 * @param {string} html
 * @param {string} injection
 * @returns {string}
 */
function injectIntoHead(html, injection) {
  // Prefer inserting after </title>
  const afterTitle = html.replace('</title>', `</title>\n${injection}`);
  if (afterTitle !== html) return afterTitle;

  // Fall back to inserting after <head>
  const afterHead = html.replace(/<head([^>]*)>/, `<head$1>\n${injection}`);
  if (afterHead !== html) return afterHead;

  // Last resort — before </head>
  return html.replace('</head>', `${injection}\n</head>`);
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

router.get('/:id', async (req, res, next) => {
  const { id } = req.params;

  // Look up the block. Not found → fall through to next handler (SPA static
  // or Express default 404). Do not call next(err) — missing IDs are normal.
  let block;
  try {
    block = await store.getById(id);
  } catch (err) {
    console.error(`GET /b/${id} store error:`, err.message);
    return res.status(500).json({ error: 'Database error' });
  }

  if (!block) {
    // Let the SPA static handler (or Express 404) deal with unknown IDs.
    return next();
  }

  const origin   = `${req.protocol}://${req.get('host')}`;
  const shareUrl = `${origin}/b/${id}`;
  const { tags, meta } = buildOgMeta(block, shareUrl, origin);

  // Dev mode: return a JSON preview — no build/index.html exists in dev.
  if (process.env.NODE_ENV !== 'production') {
    return res.json(meta);
  }

  // Production: inject tags into the built index.html and serve it.
  let html;
  try {
    html = getIndexHtml();
  } catch (err) {
    console.error('GET /b/:id — failed to read index.html:', err.message);
    return res.status(500).send('Internal server error');
  }

  const modified = injectIntoHead(html, tags);

  res.set({
    'Content-Type':  'text/html',
    'Cache-Control': 'public, max-age=60',
  });
  return res.send(modified);
});

module.exports = router;
