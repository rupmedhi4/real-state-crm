# Local development on this machine

Dependencies, environment files, migrations and demo data are installed.
PostgreSQL runs from `.local/postgres-runtime` and keeps persistent data in
`.local/postgres-data`. These files and `.env` credentials are git-ignored.

To restart after stopping the current servers, run these commands in three
separate terminals from this project directory:

```sh
node .local/start-db.mjs
```

```sh
cd backend
npm run start:dev
```

```sh
cd frontend
npm run dev -- --host 127.0.0.1
```

App: http://127.0.0.1:5173

API docs: http://localhost:3000/api/docs

Demo admin: `admin@estateflow.local` / `Admin@12345`

Stop each process with Ctrl+C. Restarting the database preserves its records.
Do not run a second database instance while the current one is running.

## Master/client platform

Master console: http://127.0.0.1:5173/master

Read `.local/master-login.txt` for the local master credential. A separate
`Demo Realty` workspace is available; its credentials are in
`.local/demo-client-login.txt`. Neither credential file is included in releases.

The master creates new clients and enables/disables modules. Keep the old demo
login's workspace blank to access the preserved legacy development data. Legacy
logins are disabled by default in production.

## Active database: Neon

The active `backend/.env` now connects to the `estateflow-crm` Neon project
under `medhi0164@gmail.com`, region Singapore. Shared migrations and the master
account are created. The API still runs locally on port 3000; hosting is not deployed.
Images and documents now use the private `estateflow-crm-files` bucket in Neon Object
Storage on the same Free project. Cloudflare R2 was not activated because it requires
usage-based billing approval. All clients share the project's free storage allowance.
Property multi-image uploads, cover selection, private document downloads and cloud
file deletion have been verified against the running app.

Active master credentials: `.local/master-login.txt` (also
`.local/cloud-master-login.txt`). Previous local database configuration is preserved
in `.local/backend-local.env` and previous master credentials in
`.local/local-master-login.txt`. `.local/start-db.mjs` reads the preserved local configuration when available;
the local PostgreSQL process is optional while the API uses Neon.
Do not run the development database seed against Neon. E2E tests refuse to run with
an application DATABASE_URL unless DATABASE_URL_TEST is explicitly supplied.

## Viewing the local app on a phone

Run `./.local/start-mobile.sh` instead of `npm run dev` in the frontend
terminal. It binds Vite to all interfaces and prints the address to open on
the phone. Nothing is deployed. If the phone is not on this WiFi, connect the
Mac to the phone's hotspot and run it again. See `.local/MOBILE.md`.

`.local/start-tunnel.sh` is also present; it exposes the dev server on a
temporary public URL and is only needed when the two devices cannot share a
network at all. See `.local/TUNNEL.md`.

## Repeat the cloud upload check

From the project root, with the local frontend/API running:

```sh
node .local/verify-cloud-uploads.cjs
```

This creates temporary records only in `demo-realty`, verifies that two uploaded
photos actually exist in the Neon private bucket, checks cover selection and
private document access, then removes its records and files. It reads the active
backend environment without printing credentials. It requires network access.
