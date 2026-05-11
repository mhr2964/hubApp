// Input validation for block write endpoints.
// Returns { valid: boolean, errors: string[] } — no throwing, no external deps.

const VALID_SIZES = ['small', 'medium', 'large'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Covers http and https only — data URIs and relative paths rejected at boundary.
// \S+ instead of .+ rejects embedded whitespace (e.g. "https://foo bar.com").
const URL_RE = /^https?:\/\/\S+/i;

const LINK_ALLOWED_FIELDS = new Set([
  'title', 'url', 'description', 'og_image', 'favicon', 'tags', 'size', 'date',
]);

const DOCUMENT_ALLOWED_FIELDS = new Set([
  'title', 'body', 'preview', 'tags', 'size', 'date',
]);

const PROJECT_ALLOWED_FIELDS = new Set([
  'title', 'description', 'status', 'stack', 'tags', 'size', 'date', 'repo_url', 'live_url',
]);

const VALID_PROJECT_STATUSES = ['active', 'paused', 'shipped'];

/**
 * Validate the body of a POST/PUT link request.
 *
 * @param {object} body - Raw request body
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateLink(body) {
  // Guard against null / non-object bodies (e.g. Content-Type:application/json with literal null).
  // Object.keys(null) throws; Express 4 doesn't catch sync throws from async handlers.
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, errors: ['Request body must be a JSON object'] };
  }

  const errors = [];

  // Reject unknown fields to keep the data clean.
  for (const key of Object.keys(body)) {
    if (!LINK_ALLOWED_FIELDS.has(key)) {
      errors.push(`Unknown field: ${key}`);
    }
  }

  // Required fields.
  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    errors.push('title is required and must be a non-empty string');
  }
  if (!body.url || typeof body.url !== 'string' || !URL_RE.test(body.url.trim())) {
    errors.push('url is required and must be a valid http(s) URL');
  }

  // Optional fields — only validate when present.
  if (body.description !== undefined && typeof body.description !== 'string') {
    errors.push('description must be a string');
  }
  if (body.og_image !== undefined) {
    if (typeof body.og_image !== 'string' || !URL_RE.test(body.og_image)) {
      errors.push('og_image must be a valid http(s) URL');
    }
  }
  if (body.favicon !== undefined) {
    if (typeof body.favicon !== 'string' || !URL_RE.test(body.favicon)) {
      errors.push('favicon must be a valid http(s) URL');
    }
  }
  if (body.size !== undefined && !VALID_SIZES.includes(body.size)) {
    errors.push(`size must be one of: ${VALID_SIZES.join(', ')}`);
  }
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags) || body.tags.some(t => typeof t !== 'string')) {
      errors.push('tags must be an array of strings');
    }
  }
  if (body.date !== undefined && !DATE_RE.test(body.date)) {
    errors.push('date must be in YYYY-MM-DD format');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate the body of a POST/PUT project request.
 *
 * @param {object} body - Raw request body
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateProject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, errors: ['Request body must be a JSON object'] };
  }

  const errors = [];

  // Reject unknown fields to keep the data clean.
  for (const key of Object.keys(body)) {
    if (!PROJECT_ALLOWED_FIELDS.has(key)) {
      errors.push(`Unknown field: ${key}`);
    }
  }

  // Required fields.
  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    errors.push('title is required and must be a non-empty string');
  }

  // Optional fields — only validate when present.
  if (body.description !== undefined && typeof body.description !== 'string') {
    errors.push('description must be a string');
  }
  if (body.status !== undefined && !VALID_PROJECT_STATUSES.includes(body.status)) {
    errors.push(`status must be one of: ${VALID_PROJECT_STATUSES.join(', ')}`);
  }
  if (body.stack !== undefined) {
    if (!Array.isArray(body.stack) || body.stack.some(s => typeof s !== 'string')) {
      errors.push('stack must be an array of strings');
    }
  }
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags) || body.tags.some(t => typeof t !== 'string')) {
      errors.push('tags must be an array of strings');
    }
  }
  if (body.size !== undefined && !VALID_SIZES.includes(body.size)) {
    errors.push(`size must be one of: ${VALID_SIZES.join(', ')}`);
  }
  if (body.date !== undefined && !DATE_RE.test(body.date)) {
    errors.push('date must be in YYYY-MM-DD format');
  }
  if (body.repo_url !== undefined) {
    if (typeof body.repo_url !== 'string' || !URL_RE.test(body.repo_url.trim())) {
      errors.push('repo_url must be a valid http(s) URL');
    }
  }
  if (body.live_url !== undefined) {
    if (typeof body.live_url !== 'string' || !URL_RE.test(body.live_url.trim())) {
      errors.push('live_url must be a valid http(s) URL');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate the body of a POST/PUT document request.
 *
 * @param {object} body - Raw request body
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateDocument(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, errors: ['Request body must be a JSON object'] };
  }

  const errors = [];

  // Reject unknown fields to keep the data clean.
  for (const key of Object.keys(body)) {
    if (!DOCUMENT_ALLOWED_FIELDS.has(key)) {
      errors.push(`Unknown field: ${key}`);
    }
  }

  // Required fields.
  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    errors.push('title is required and must be a non-empty string');
  }
  if (!body.body || typeof body.body !== 'string' || body.body.trim() === '') {
    errors.push('body is required and must be a non-empty string');
  }

  // Optional fields — only validate when present.
  if (body.preview !== undefined && typeof body.preview !== 'string') {
    errors.push('preview must be a string');
  }
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags) || body.tags.some(t => typeof t !== 'string')) {
      errors.push('tags must be an array of strings');
    }
  }
  if (body.size !== undefined && !VALID_SIZES.includes(body.size)) {
    errors.push(`size must be one of: ${VALID_SIZES.join(', ')}`);
  }
  if (body.date !== undefined && !DATE_RE.test(body.date)) {
    errors.push('date must be in YYYY-MM-DD format');
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateLink, validateProject, validateDocument };
