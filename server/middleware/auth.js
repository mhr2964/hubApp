/**
 * requireAuth — gates routes to authenticated sessions only.
 *
 * Checks req.session.authed === true. Returns 401 if not set so unauthenticated
 * callers get a clear signal without leaking any implementation detail.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function requireAuth(req, res, next) {
  if (req.session?.authed === true) return next();
  return res.status(401).json({ error: 'Auth required' });
}

module.exports = { requireAuth };
