require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const ConnectPgSimple = require('connect-pg-simple');

const { getPool } = require('./db');

const PgSession = ConnectPgSimple(session);

// SESSION_SECRET must be set in production. In development we warn and fall
// back to a hard-coded value so the server still starts without manual setup.
let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET env var must be set in production');
  }
  console.warn(
    '[warn] SESSION_SECRET not set — using insecure dev default. Set it in .env.',
  );
  sessionSecret = 'dev-insecure-secret-change-me';
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Session middleware — must come after express.json() and before route mounts.
// connect-pg-simple creates the "session" table automatically on first use.
app.use(
  session({
    store: new PgSession({
      pool: getPool(),
      createTableIfMissing: true,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  }),
);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/blocks', require('./routes/api'));
app.use('/api/content', require('./routes/content'));

if (process.env.NODE_ENV === 'production') {
  const buildDir = path.join(__dirname, '../client/build');
  app.use(express.static(buildDir));
  app.get('*', (_req, res) => res.sendFile(path.join(buildDir, 'index.html')));
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
