# Estateflow — Real Estate CRM

A full-stack CRM for real-estate teams: leads and clients, property inventory
with photo galleries, deals pipeline, site visits, tasks, communication
history, marketing campaigns, reports, documents and team management.

It started as a single HTML file that stored everything in the browser's
`localStorage` (kept for reference in `legacy/estateflow-crm.html`). The design
— colours, typography, table-first layout, light/dark mode — is carried over
unchanged; the data now lives in PostgreSQL behind an authenticated API.

```
real-estate-crm/
├── frontend/   React 19 + Vite + TypeScript, React Router, Axios
├── backend/    NestJS 11 + TypeORM + PostgreSQL, JWT auth, Swagger
├── database/   Schema notes (tables, relationships, delete rules)
└── legacy/     Original single-file HTML app (reference only)
```

Request flow for every feature:
`React page → services/crm.ts (Axios) → NestJS controller → service → PostgreSQL → JSON → React state`.

---

## 1. Prerequisites

| Tool        | Version  | Check            |
|-------------|----------|------------------|
| Node.js     | 20+ (tested on 24) | `node -v` |
| npm         | 10+      | `npm -v`         |
| PostgreSQL  | 14+ (tested on 18) | running on port 5432 |

## 2. First-time setup

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env          # Windows: copy .env.example .env
```

Edit `backend/.env`:

- `DB_PASSWORD` — your PostgreSQL password
- `JWT_SECRET` — at least 32 random characters. Generate one:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Create the databases (once), then build the schema and load demo data:

```bash
# in psql, or pgAdmin → Create Database
CREATE DATABASE estateflow_crm;
CREATE DATABASE estateflow_crm_test;   -- only needed for e2e tests

npm run migration:run
npm run seed
```

```bash
# 2. Frontend
cd ../frontend
npm install
cp .env.example .env          # optional; defaults work for local dev
```

## 3. Run locally

Two terminals:

```bash
cd backend  && npm run start:dev     # API  → http://localhost:3000/api
cd frontend && npm run dev           # App  → http://localhost:5173
```

API documentation (Swagger): **http://localhost:3000/api/docs**
Health check: `GET http://localhost:3000/api/health`

The Vite dev server proxies `/api` to the backend, so no CORS setup is needed
in development.

### Demo accounts (created by `npm run seed`)

| Role    | Email                     | Password      |
|---------|---------------------------|---------------|
| Admin   | admin@estateflow.local    | Admin@12345   |
| Manager | amit@estateflow.local     | Agent@12345   |
| Agent   | simran@estateflow.local   | Agent@12345   |

Change these (or set `SEED_*` variables before seeding) for anything beyond
local development.

To start with **no demo data at all** (only the admin login), run
`npm run db:clean` in `backend/`. This deletes every record and uploaded-file
reference in the database, so use it only before real data is entered. Anyone can also sign up at `/register`; new accounts are
**Agents**. On an empty database the first registered account becomes **Admin**.

## 4. Environment variables

### `backend/.env`

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | API port |
| `NODE_ENV` | `development` | `production` disables seeding and enforces a real JWT secret |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed browser origins |
| `SWAGGER_ENABLED` | `true` | Serve docs at `/api/docs` |
| `DB_HOST` / `DB_PORT` | `localhost` / `5432` | PostgreSQL server |
| `DB_USER` / `DB_PASSWORD` | `postgres` / — | Credentials |
| `DB_NAME` | `estateflow_crm` | Database |
| `DB_NAME_TEST` | `estateflow_crm_test` | Database used by e2e tests (wiped on each run) |
| `DB_SSL` | `false` | `true` for managed Postgres that requires TLS |
| `DB_LOGGING` | `false` | Log every SQL query |
| `JWT_SECRET` | — | **Required**, ≥ 32 chars |
| `JWT_EXPIRES_IN` | `8h` | Session length; users are signed out after this |
| `UPLOAD_DIR` | `./uploads` | Where files are stored (local storage driver) |
| `MAX_IMAGE_SIZE_MB` | `5` | Per property image / contact photo |
| `MAX_DOCUMENT_SIZE_MB` | `10` | Per document |
| `MAX_IMAGES_PER_PROPERTY` | `20` | Gallery limit |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_AGENT_PASSWORD` | see file | Demo accounts |

### `frontend/.env`

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` | API base URL as seen by the browser. Use a full URL (`https://api.example.com/api`) when the API is on another domain |
| `VITE_PROXY_TARGET` | `http://localhost:3000` | Dev server proxy target |

`.env` files are git-ignored; only the `.env.example` templates are committed.

## 5. Tests

```bash
cd backend
npm test            # unit tests (file validation, pagination, env checks)
npm run test:e2e    # API end-to-end tests against DB_NAME_TEST (schema is dropped and rebuilt)

cd ../frontend
npm run lint
npm run build       # type-checks and builds
```

The e2e suite covers: registration & login, invalid/expired tokens, DTO
validation, lead creation, assignment and stage changes with history logging,
search/filter/pagination, multi-image property upload and content-type
spoofing, deal ↔ client ↔ property links and commission maths, the RESTRICT
rule on deleting clients with deals, visit scheduling with automatic follow-up
task, private document downloads, role checks, and immediate lock-out of
disabled users.

## 6. Modules and permissions

| Module | Page | API |
|--------|------|-----|
| Dashboard | `/` | `GET /api/reports/dashboard` |
| Leads / Clients | `/leads`, `/clients`, `/contacts/:id` | `/api/contacts` (+ `/stage`, `/assign`, `/bulk-assign`, `/photo`, `/duplicates`) |
| Properties | `/properties` | `/api/properties` (+ `/images`, `/images/order`) |
| Deals | `/deals` | `/api/deals` (+ `/summary`, `/stage`) |
| Site Visits | `/visits` | `/api/visits` |
| Tasks | `/tasks` | `/api/tasks` (+ `/counts`, `/complete`) |
| Communications | `/communications` | `/api/activities` |
| Marketing | `/marketing` | `/api/marketing/sources`, `/api/marketing/campaigns` |
| Agents & Team | `/agents` | `/api/agents` (stats), `/api/users` (accounts) |
| Reports | `/reports` | `/api/reports/*` |
| Documents | `/documents` | `/api/documents` (+ `/download`) |
| Settings | `/settings` | `/api/settings`, `/api/settings/meta`, `/api/users/me` |

All list endpoints accept `page`, `limit` (≤ 100), `search`, `sortBy`,
`sortOrder` plus module-specific filters, and return
`{ items, total, page, limit, totalPages }`. Errors always look like
`{ statusCode, error, message, path, timestamp }`.

| Action | Agent | Manager | Admin |
|--------|:-----:|:-------:|:-----:|
| View / create / edit leads, properties, deals, visits, tasks, documents | ✅ | ✅ | ✅ |
| Reassign leads | — | ✅ | ✅ |
| Delete leads, properties, deals, documents | — | ✅ | ✅ |
| Create campaigns | — | ✅ | ✅ |
| Add / edit / disable team members | — | ✅ (not admins) | ✅ |
| Company settings | — | — | ✅ |

Permissions are enforced by the API (`RolesGuard`); the UI only hides
buttons a user can't use.

## 7. Files and storage

- **Property images**: JPG/PNG/WebP, ≤ 5 MB each, many per upload. Listing
  photos are public by design (served at `/api/files/property-images/<uuid>`).
- **Contact photos and documents** (PDF, Word, Excel, images, ≤ 10 MB) are
  private: they are only streamed to signed-in users and are never exposed by
  URL.
- Every upload is checked against an allow-list **and** its actual file
  signature, so a renamed `.exe` can't pass as a `.pdf`.
- Files are stored through `StorageService` (`backend/src/storage/`).
  `STORAGE_DRIVER=local` (default) writes to `UPLOAD_DIR`;
  `STORAGE_DRIVER=s3` uses S3-compatible object storage (AWS S3, Cloudflare R2,
  Supabase) configured by the `S3_*` variables.

## 8. Deployment

### Free option: Render + Neon + Cloudflare R2

`render.yaml` defines one free Render web service that builds the frontend and
serves it from the backend (same domain, so no CORS setup is needed).

1. Create a free PostgreSQL database on [Neon](https://neon.tech) and note its
   host, user, password and database name.
2. Create a Cloudflare R2 bucket and an R2 API token (Object Read & Write).
3. Push this repo to GitHub, then in Render choose **New → Blueprint** and pick
   the repo. Fill in the `DB_*`, `S3_*`, `ADMIN_EMAIL` / `ADMIN_PASSWORD`
   values, and set `CORS_ORIGINS` to the service URL
   (`https://<name>.onrender.com`).
4. On each start, migrations run and the admin login is created if it does not
   exist yet. Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

Free Render services sleep after 15 minutes idle; the first request then takes
about a minute.

### First admin on any server

```bash
cd backend
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... npm run create-admin
# or, after npm run build: node dist/database/create-admin.js
```

### Manual / VPS

1. **Database**: create the production database and a dedicated DB user (not
   `postgres`). Set `DB_*`, `DB_SSL=true` if your provider requires it.
2. **Backend**
   ```bash
   cd backend
   npm ci
   npm run build
   NODE_ENV=production npm run migration:run:prod
   NODE_ENV=production node dist/main.js     # or run with pm2 / systemd / Docker
   ```
   Set `NODE_ENV=production`, a strong `JWT_SECRET`, `CORS_ORIGINS` to your
   site's URL, and consider `SWAGGER_ENABLED=false`. Use persistent storage for
   `UPLOAD_DIR` (or an object-storage driver). Never run `npm run seed` in
   production; it refuses when `NODE_ENV=production`.
3. **Frontend**
   ```bash
   cd frontend
   npm ci
   VITE_API_URL=/api npm run build      # outputs static files to dist/
   ```
   Serve `frontend/dist/` from any static host. Configure SPA fallback (all
   unknown paths → `index.html`).
4. **Reverse proxy (recommended)**: serve the app and API from one domain,
   e.g. with nginx:
   ```nginx
   location /api/ { proxy_pass http://127.0.0.1:3000; client_max_body_size 25m; }
   location /     { root /var/www/estateflow; try_files $uri /index.html; }
   ```
   Put HTTPS in front (Let's Encrypt). If the API lives on a different domain,
   build the frontend with that full `VITE_API_URL` and add the site to
   `CORS_ORIGINS`.
5. **Backups**: see `database/README.md`.

## 9. What changed from the HTML version

| Legacy (HTML + localStorage) | Now |
|-------------------------------|-----|
| Data in one browser only; lost if cleared | PostgreSQL, shared by the whole team |
| Images/documents as base64 in localStorage | Files on disk/object storage, metadata in DB, validated uploads |
| No login; roles were labels only | JWT login, bcrypt passwords, role-based API permissions |
| Agents separate from users | Agents are user accounts with roles |
| Contact notes saved but never shown | Full interaction history per contact; stage and assignment changes are logged automatically |
| Marketing = source counts only | Campaigns with budget, cost per lead, conversion and revenue |
| Global search filtered the loaded array | Server-side search, filters, sorting and pagination on every list |
| CSV export produced one line (`'\\n'` bug) | Fixed; UTF-8 CSV with proper line breaks |
| WhatsApp link didn't strip non-digits (regex bug) | Fixed |
| JSON backup / import, "reset demo data" | Replaced by `pg_dump` backups and `npm run seed -- --reset` (dev only) |

## 10. Known limitations / next steps

- No refresh tokens: sessions last `JWT_EXPIRES_IN`, then users sign in again.
- No email/SMS/WhatsApp sending or calendar invites; call/WhatsApp buttons open
  the device app and log the attempt.
- No password-reset email flow (admins can set a new password from Agents & Teams).
- Agents can see all records; per-agent data visibility is not implemented.
- CSV export is capped at 100 rows per export; narrow filters for larger sets.
