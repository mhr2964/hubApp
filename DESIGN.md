# Admin UI + Public Share URLs — Design

## Problem
Add owner-only write access (login, CRUD across the 5 block types, with OG/GitHub auto-fill and file upload) and per-block share URLs (`/b/:id`) with server-injected OG meta — both touching the auth and public/private boundary.

---

## 1. Auth approach — session cookie, single password

**Decision:** `express-session` with `cookie-session` style or memory store, single bcrypt-hashed password in `ADMIN_PASSWORD_HASH` env var, `SESSION_SECRET` env var, secure+httpOnly+sameSite=lax cookie. Pinatapals uses `connect-pg-simple` because it has Postgres; hub-app does not, so use `memorystore` (LRU in-memory, survives within a dyno) — Heroku single-dyno setup makes this acceptable for a one-user app. Sessions die on restart; that is fine — the owner logs back in.

- Rejected JWT: no logout-revocation story for a single owner, and we have no need for stateless scaling.
- Rejected signed cookies alone: still need a "logged-in" flag and CSRF defense; sessions give us both.

Auth wires in at `server/index.js:11` (after `express.json()`). New middleware `requireAuth` lives in `server/middleware/auth.js` and gates every write route. Read routes stay open. Add `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`. Login compares with `bcrypt.compare` and rate-limits (`express-rate-limit`, 5 attempts / 15 min / IP).

CSRF: because cookies are sameSite=lax and admin routes are same-origin only, accept that risk for v1; add `csurf`-style double-submit token only if we ever expose cross-origin.

## 2. Write endpoints + persistence

**Routes** (all under `/api/blocks`, all behind `requireAuth`):

- `POST /:type` — create. Body: type-specific JSON. Server assigns `id` (`${type}-${nanoid(8)}`), `date` defaulted to today.
- `PUT /:type/:id` — full replace (simpler than PATCH for v1).
- `DELETE /:type/:id` — remove.
- `POST /link/from-url` — body `{ url }` → scrape OG → return draft block (NOT persisted). Client confirms then POSTs to `/link`.
- `POST /project/from-repo` — body `{ repo_url }` → fetch GitHub → return draft.
- `POST /upload/:kind` (kind = `photo` | `audio`) — multipart, returns `{ src: "photos/abc.jpg" }`. Caller then POSTs to `/photo` with that src.

**Validation:** lightweight hand-rolled validator per type in `server/validators/blocks.js` (one function per type returning `{ valid, errors }`). No Zod/Joi — too much weight for 5 shapes. Required-field tables come straight from the existing seed JSON. Reject unknown fields to keep `data/*.json` clean.

**Cache strategy — update-in-place + atomic write:**

`server/routes/api.js:25-34` already caches all five files in a `store` object at startup. Refactor: extract to `server/store.js` exporting `{ getByType, create, update, remove, persist }`. On mutation:
1. Mutate `store[type]` in memory.
2. `persist(type)` writes the array to `data/${filename}.json.tmp` then `fs.renameSync` over the real file — atomic on POSIX and Windows-NTFS-same-volume. Wrapped in an async mutex (one inflight write per type) to serialize concurrent admin actions.
3. No restart needed; no re-read on next request.

Risk: if the process crashes between mutate and persist, in-memory wins and disk loses. Accept it — single user, no concurrent writers.

## 3. External fetchers

- **OG scraping:** `open-graph-scraper` (~150k weekly downloads, maintained, returns normalized `{ ogTitle, ogDescription, ogImage, favicon }`). Avoid hand-rolling cheerio for v1. Wrap in a 5-second `AbortController` timeout. Failure modes: site blocks bots (return partial draft, let user fill in), redirect loops (timeout catches), non-HTML response (library returns error — surface as 422).
- **GitHub:** plain `fetch` to `https://api.github.com/repos/{owner}/{repo}` and `/languages`. No token needed for public; if rate-limited (60/hr unauth), document optional `GITHUB_TOKEN` env var that bumps to 5000/hr. Parse `owner/repo` from the URL with a single regex; reject if no match.

## 4. File upload

`multer` with `diskStorage`:
- `dest`: `server/content/photos/` and `server/content/audio/` (mirrors the existing `documents/` pattern under `CONTENT_DIR` from `server/routes/api.js:10`).
- Filename: `${nanoid(10)}${ext}` — never trust client name (defeats path traversal at the source).
- `fileFilter`: whitelist mime types — `image/jpeg|png|webp|gif` for photo; `audio/mpeg|wav|ogg|mp4` for audio.
- `limits.fileSize`: 10 MB photo, 30 MB audio.
- Serve uploaded files via `express.static(CONTENT_DIR)` mounted at `/content` (currently no static serve of content — documents are read through the API). Photo/audio blocks then reference `src: "photos/abc.jpg"` and the client requests `/content/photos/abc.jpg`.
- Validate that the final resolved path still starts with `CONTENT_DIR + path.sep` (same guard as `api.js:62`).

## 5. Admin UI shape

**Single route `/admin`, two states: login vs. dashboard.** No multi-page admin; the surface is small.

- New top-level `AdminPage.jsx` mounted via React Router (need to add `react-router-dom` — not currently a dep, but justified: we need `/admin` and `/b/:id` both, and hand-rolled location parsing in `App.jsx:9` will get ugly fast).
- Dashboard layout: left rail "New block" with 5 buttons (one per type) + "Manage existing" list. Right pane shows the active form OR the existing-block list with inline edit/delete.
- **Form-per-type, not one big form.** Each block type has 3–8 distinct fields; a unified form means a giant `if (type === ...)` ladder. Keep `LinkForm.jsx`, `ProjectForm.jsx`, etc. — mirrors `BLOCK_REGISTRY` 1:1.
- For link/project, form has a "Fetch metadata" button that calls `/from-url` or `/from-repo` and populates fields the user can then edit before save.
- State: local component state per form. No global store needed. After successful save, invalidate the `useBlocks` cache (lift the fetch into a context, or use a `refreshKey` prop) — see Risk section.

## 6. Share URL `/b/:id`

**Server side (`server/index.js`):** Add `app.get('/b/:id', ...)` BEFORE the static middleware. Look up the block across all types via the store. If not found → fall through to SPA (renders a 404 view). If found:
1. Read `client/build/index.html` from disk (cache buffer at startup).
2. Inject a `<!-- OG_META -->` placeholder replacement: `<meta property="og:title" content="...">`, `og:description`, `og:image` (use first available: photo `src`, link `og_image`, doc preview-as-text, project description), `og:url`, `og:type=article`, plus Twitter card equivalents.
3. Return the modified HTML. SPA hydrates and reads the same `:id` from the URL to open a focused view.

**Client side:** Router has two routes:
- `/` → existing `App`
- `/b/:id` → `App` with an initial `focusedBlockId` prop. Reuse `DocumentModal.jsx:5` pattern for documents; for other types open a similar `BlockModal` that renders the block's component full-size. Closing the modal navigates to `/`.

Crawlers (Twitter/Slack/Discord) only read the HTML and never execute JS — meta injection is what matters. Escape all injected text with a tiny HTML-entity helper; OG strings come from JSON the owner wrote, but treat them as untrusted anyway.

## 7. Public/private visibility — DEFER

**Recommend NO for v1.** Adds a schema field, a filter on every read path, a UI toggle, and a test surface — for zero current need (there is no private content yet). When the journal mode actually arrives, add `visibility: 'public' | 'private'` defaulted to `'public'` (existing blocks need no migration — missing field = public). Filter applied in one place: `getByType` becomes visibility-aware, taking `{ includePrivate: req.session.authed }`. Plan it now, build it then.

## 8. Build order — smallest valuable slice first

1. **Auth skeleton** — bcrypt + session + login route + `requireAuth` + login page. Ship behind a feature flag; existing reads untouched. (~half day)
2. **One write endpoint end-to-end: link.** POST/PUT/DELETE for links + OG fetcher + LinkForm. Proves the persist/cache/atomic-write pattern. (~1 day)
3. **Replicate for project, document, photo, audio** — each is a thin variant once the pattern is set. Upload comes in with photo. (~2 days)
4. **Edit/delete UI** — list existing blocks, inline delete confirm, edit pulls into the type's form. (~half day)
5. **Share URLs** — router, `/b/:id` server route, meta injection, focused-block modal. (~1 day)
6. **Defer visibility** until needed.

Ship after step 2 if time-boxed — owner can add links from anywhere, which is 60% of the value.

## 9. Risks + gotchas

- **In-memory store on Heroku free/eco dynos cycles daily** — sessions and any unpersisted state vanish. The atomic JSON writes survive (dyno filesystem is ephemeral too, though — *this is the real risk*). On Heroku, `data/*.json` writes are LOST on every dyno restart. **Mitigation:** either move data to a Heroku Postgres add-on, or commit-back-to-git via a deploy hook (gross), or accept that hub-app on Heroku needs a persistent volume / move to a different host. Flag this loudly to the user before building writes on Heroku.
- **Registry drift** at `server/blockRegistry.js:32` will fire if write endpoints add a type-specific field that the client doesn't know about — keep new fields additive only.
- **OG scraping is slow and flaky** — set a 5s timeout and a "skip & fill manually" escape hatch in the form. Never block save on a fetch.
- **Multer + path traversal** — never use `req.file.originalname` in the saved path; only nanoid + validated extension.
- **The `useBlocks` hook (`client/src/hooks/useBlocks.js`) fetches once** — after a write, the grid won't update without a refresh strategy. Decide before step 2: refetch on admin → home navigation, or lift fetch state to a context with a `revalidate()` exposed.
- **React Router adds a dep** the project doesn't have. Justified by needing both `/admin` and `/b/:id`; hand-rolling `window.location.pathname` parsing in `App.jsx` will not age well.
- **Session secret + admin hash in env on Heroku** — set via `heroku config:set`, never commit. Document in README.
- **bcrypt is native** — pure-JS `bcryptjs` is simpler for Heroku slug builds and one-user verify perf is irrelevant. Use `bcryptjs`.

---

=== HANDOFF ===
did: designed admin UI (auth + CRUD + OG/GitHub fetchers + upload) and public share URLs (/b/:id with server-injected OG meta) for hub-app, with explicit cache/persist/build-order plans
found: in-memory JSON cache at server/routes/api.js:25 must become a store module with atomic tmp+rename persistence; no auth deps today (add bcryptjs, express-session, memorystore, express-rate-limit, multer, open-graph-scraper, nanoid, react-router-dom); Heroku ephemeral filesystem is a load-bearing risk for JSON-file writes; visibility field deferred; React Router justified by two new client routes
files-touched: C:/Users/Owner/Desktop/AI/Projects/hub-app/DESIGN.md
next-suggested-agent: builder (start with auth skeleton then links end-to-end per build order step 1-2)
blockers: confirm with user whether hub-app deploys to Heroku (data persistence implications) before step 2; confirm willingness to add react-router-dom and the auth/upload deps
=== END HANDOFF ===
