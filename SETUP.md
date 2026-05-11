# Local setup

## Prerequisites

Node 18+ and one of:
- A local Postgres installation, or
- Docker (one-liner below)

## 1. Create a local database

**Docker (no local Postgres needed):**

```sh
docker run --rm -d --name hub-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=hubapp \
  -p 5432:5432 postgres:16
```

Stop and remove with `docker stop hub-pg` (the `--rm` flag cleans it up automatically).

**Local Postgres:** create the database manually:

```sh
createdb hubapp
```

## 2. Environment

Copy `.env.example` to `.env` and fill in `DATABASE_URL`:

```sh
cp .env.example .env
# then edit DATABASE_URL if your Postgres credentials differ
```

Default value works with the Docker one-liner above:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/hubapp
```

## 3. Install dependencies

```sh
npm install
npm install --prefix client
```

## 4. Run migrations

Applies all pending migrations (creates the `blocks` table and seeds data from
the JSON files in `server/data/`):

```sh
npm run db:migrate
```

Roll back the last migration:

```sh
npm run db:rollback
```

## 5. Set up auth credentials

Generate a bcrypt hash of your chosen admin password:

```sh
node scripts/hash-password.js your-password
```

Copy the output into `.env` as `ADMIN_PASSWORD_HASH`.

Also set `SESSION_SECRET` to a long random string:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy that into `.env` as `SESSION_SECRET`.

Your `.env` should now have all four required vars:

```
DATABASE_URL=...
SESSION_SECRET=<long random string>
ADMIN_PASSWORD_HASH=<bcrypt hash from above>
PORT=5053
```

## 6. Start dev server

```sh
npm run dev       # Express server with nodemon on PORT (default 5053)
npm run client    # React dev server in a separate terminal
```

### Verify auth routes

```sh
# Expect 401
curl -X POST -H "Content-Type: application/json" \
  -d '{"password":"wrong"}' http://localhost:5053/api/auth/login

# Expect {"authed":false}
curl http://localhost:5053/api/auth/me
```

To test a successful login, set `ADMIN_PASSWORD_HASH` in `.env` first (step 5),
then POST with the matching password — you should get `{"ok":true}`.

## Heroku

`DATABASE_URL` is injected automatically by the Heroku Postgres add-on. Run
migrations as a release phase command or manually via:

```sh
heroku run npm run db:migrate
```

Set auth env vars on Heroku before deploying:

```sh
heroku config:set SESSION_SECRET=<long-random-string>
heroku config:set ADMIN_PASSWORD_HASH=<bcrypt-hash>
```
