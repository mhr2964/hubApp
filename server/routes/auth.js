const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// 5 attempts per 15 minutes per IP. Standard 429 on breach — this is fine to
// distinguish from 401; we only suppress leaking _which_ credential was wrong.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts — try again later' },
});

// POST /api/auth/login
// Body: { password: string }
// Compares against ADMIN_PASSWORD_HASH env var via bcryptjs.compare.
// On match: marks session authed, returns { ok: true }.
// On mismatch: 401 with generic message so we don't hint at which field was wrong.
router.post('/login', loginLimiter, async (req, res) => {
  const { password } = req.body ?? {};

  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'password is required' });
  }

  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) {
    console.error('ADMIN_PASSWORD_HASH is not set — login will always fail');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  try {
    const match = await bcrypt.compare(password, hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Regenerate session id on privilege escalation to prevent fixation.
    req.session.regenerate((err) => {
      if (err) {
        console.error('session.regenerate error:', err.message);
        return res.status(500).json({ error: 'Session error' });
      }
      req.session.authed = true;
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('session.save error:', saveErr.message);
          return res.status(500).json({ error: 'Session error' });
        }
        return res.json({ ok: true });
      });
    });
  } catch (err) {
    console.error('bcrypt.compare error:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/auth/logout
// Destroys the session, returns { ok: true }.
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('session.destroy error:', err.message);
      return res.status(500).json({ error: 'Could not end session' });
    }
    res.clearCookie('connect.sid');
    return res.json({ ok: true });
  });
});

// GET /api/auth/me
// Returns { authed: bool }. No auth required — safe for client to poll.
router.get('/me', (req, res) => {
  res.json({ authed: !!req.session?.authed });
});

module.exports = router;
