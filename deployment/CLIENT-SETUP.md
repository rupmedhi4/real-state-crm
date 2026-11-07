# Client installation: Estateflow Real Estate CRM

This build is a platform with one master administrator and multiple client workspaces.
The master creates clients and owner logins, enables features, sets the photo limit,
resets owner passwords, suspends clients and opens their CRM with an audited session.
Each client has its own PostgreSQL schema and its own team/records/settings. The
application resolves a client's schema from a verified token, never an arbitrary
client header. Public property photos carry a workspace code; documents require login.

Master console: `/master`. Client login: `/login?workspace=client-code`.
Local master credentials are in the git-ignored `.local/master-login.txt` file.
Do not reuse local credentials in production. See [MASTER-ADMIN.md](MASTER-ADMIN.md).

## Included product

- Leads/clients, assignment, follow-ups, interaction history and search/filtering.
- Property inventory with price, location, owner details, bathrooms, balconies,
  parking, floor, furnishing, possession, RERA and amenities.
- Up to 20 photos per property: multiple selection/drop, previews, optional WebP
  optimisation, upload progress, cover selection, deletion and resumable UI retry.
- Property gallery, WhatsApp listing text and print/save-as-PDF brochure. Internal
  owner contacts are excluded from both brochure and WhatsApp text. Photos remain
  public listing material; upload identity documents only in Documents.
- Deals, commission, visits, tasks, documents, reports, team and company branding.
- Company name on sign-in, sidebar and brochure; contact details in brochure.

Automated tests cover API/database behavior, permissions and photo operations.
The running app has passed a real Neon cloud multi-photo upload/read/delete,
cover-selection and private-document access check. Full browser/mobile acceptance
testing remains necessary before customer handover. Automated email/SMS, WhatsApp API sending, payment collection,
and password-reset email are not implemented; sharing opens WhatsApp for the user.

## Choose hosting

WordPress itself runs PHP and MySQL/MariaDB, while this CRM backend needs Node.js
and PostgreSQL. A WordPress-only/PHP-only plan cannot run the API. Hosting must
explicitly support a long-running Node.js process, or the API must run separately.
See https://wordpress.org/about/requirements/ . This is not a WordPress plugin.

Two supported arrangements:

1. **One Node.js app (simpler):** WordPress stays at `yourdomain.com`; deploy this
   entire repository to a Node.js host, with `crm.yourdomain.com` pointing to it.
   The backend serves the React build and API on the same domain. `render.yaml`
   supplies a Render Blueprint; choose an always-on paid instance for a sold
   production installation if that reliability is required.
2. **Static frontend on your WordPress hosting account:** create a *separate*
   subdomain/document root (`crm.yourdomain.com`) in the hosting panel, upload the
   frontend build there, and run the Node.js API on another host/domain. The provided
   Apache `.htaccess` handles React routes. Do not overwrite the WordPress site.
   This option requires file-manager/static hosting access; managed WordPress
   providers may restrict it. Nginx hosts need `try_files $uri $uri/ /index.html;`.

Render Free sleeps after 15 minutes idle and may take about a minute to wake.
Render explicitly advises against Free for production. Do not promise uninterrupted
service for a one-time ₹5,000 fee. Separate your setup/software price from hosting,
provider overages and future maintenance in the customer agreement.
Source: https://render.com/docs/free

## 1. Neon PostgreSQL

1. In https://console.neon.tech create a project for this platform and choose a
   region close to the API server. Create/select the database and role.
2. Under **Connect**, copy the PostgreSQL connection URL into the backend host's
   secret environment variable `DATABASE_URL`. Never put it in frontend variables.
   The URL overrides the separate DB_HOST/DB_USER/DB_NAME variables.
3. Keep `DB_SSL=true` and `DB_SSL_REJECT_UNAUTHORIZED=true`. Public CA certificates
   are verified. Prefer the direct connection URL for migrations; use a pooled URL
   for the running application if your deployment setup separates those phases.
4. The deployment command runs shared migrations and creates the configured master
   administrator; it does not seed demo leads or properties. New client schemas are
   provisioned by the master console. The database role must have CREATE SCHEMA
   permission. Never expose this backend database role to client users.
5. For a real-data move from local PostgreSQL, take a database backup and restore it
   into the new, empty Neon database using `pg_dump`/`pg_restore`. Verify that a
   backup restores successfully. Existing local uploaded files must also be copied
   into the selected object store with their exact storage keys; changing STORAGE_DRIVER alone does not
   move them. For a new customer create an empty workspace from the master console. Existing single-company data is not automatically assigned to a new client schema.

Neon Free currently lists 1 GB Postgres storage and 100 CU-hours monthly per project.
All client schemas in this platform share that project allowance; it is not a
separate 1 GB allowance per CRM customer.
Monitor compute, storage and network quotas. These limits can change.
Sources: https://neon.com/pricing , https://neon.com/docs/connect/connect-from-any-app

## 2. Free Neon Object Storage (active setup)

The active platform uses the private `estateflow-crm-files` bucket in the same Neon
Free project as PostgreSQL. Neon currently includes 5 GB of Object Storage per
project; all client workspaces share that allowance and the project's network and
compute quotas. No paid plan was enabled. Cloudflare R2 was deliberately left
inactive because its activation page requires an auto-renewing usage-based
subscription, which does not fit the user's no-payment instruction.

For a fresh installation:

1. Open **Object storage** in the Neon project and create a **Private** bucket.
2. Open **Settings > Credentials** and create a dedicated branch credential with
   only `storage:read` and `storage:write`. Save the complete one-time `.env`
   snippet securely, including the full key and secret.
3. Map Neon's `AWS_ENDPOINT_URL_S3` to `S3_ENDPOINT`, `AWS_ACCESS_KEY_ID` to
   `S3_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` to `S3_SECRET_ACCESS_KEY`, and
   `AWS_REGION` to `S3_REGION`. Set `STORAGE_DRIVER=s3` and the bucket name in
   `S3_BUCKET`. Singapore uses `ap-southeast-1` as the signing region.
4. Keep the bucket private. The backend serves public listing photos through
   recorded property metadata; private document downloads require client login.
5. Verify two photos, cover selection and a private document through the app.
   The active installation has passed this check and removed the test files.

Do not activate R2 or upgrade the Neon project without the owner's permission.
Review the provider quotas before adding real clients; the free allocation is
shared by the whole platform and plan limits can change.
Sources: https://neon.com/docs/introduction/plans ,
https://neon.com/docs/storage/authentication

Cloudflare R2 remains an optional S3-compatible alternative if usage-based billing
is approved later. It is not configured or required for the current installation.

## 3. Deploy the backend and create the owner account

Use `backend.env.example` as the reference. Enter actual secrets in the hosting
provider's environment settings. Keep `NODE_ENV=production`, `REGISTRATION_ENABLED=false`,
`SWAGGER_ENABLED=false`, a random JWT secret and a unique master password of at least 12 characters. Also keep ALLOW_LEGACY_LOGIN=false.
Set CORS_ORIGINS to the exact HTTPS frontend origin(s), comma separated.

For Render, push the source to your private Git repository and create a Blueprint
from `render.yaml`; fill its secret values in the Render dashboard. For a generic
Node.js host, build from the repository root:

```sh
cd frontend
npm ci --include=dev
npm run build
cd ../backend
npm ci --include=dev
npm run build
npm run check:services
npm run start:render
```

`start:render` applies migrations, creates the requested master administrator if absent, and starts
the server serving both the app and API. Required env variables must already be set.
Do not run the development seed or `db:clean` on a customer database.
`check:services` verifies DB access/schema and object-storage bucket access; it does not prove
upload permission or perform a real file upload. Existing master passwords are not changed on subsequent deploys. Store the master credential securely; client owner passwords can be reset from the master console.

## 4. Build for separate static/WordPress hosting

Set the *public* API base URL at build time, then build:

```sh
cd frontend
VITE_API_URL=https://your-api.onrender.com/api npm run build
```

Upload the **contents** of `frontend/dist/` (including `.htaccess`) into the separate
CRM subdomain document root. The generated `index.html` must be at that root.
Set the backend's CORS_ORIGINS to `https://crm.yourdomain.com`. Use HTTPS on both.
For same-origin Node.js deployment, keep VITE_API_URL unset or `/api` instead.
The local preview ZIP uses `/api`; rebuild with the actual remote URL before
uploading it to static hosting. No secret belongs in any `VITE_` variable.

## 5. Customer handover

- Sign in to `/master`; create the client, set feature access and save the workspace code and initial owner credentials securely.
- Sign in with that client owner account; set company name/tagline/contact data.
- Create named team accounts under Agents & Teams; give only owners Admin access.
- Check property create/edit, two-photo upload, cover/reorder/delete, listing search,
  lead-to-deal workflow, follow-up task, private document download and mobile layout.
- Print a property brochure and check that owner contacts and internal controls
  are absent. WhatsApp sharing sends listing text; it does not attach gallery photos.
- Keep PostgreSQL backups and object-storage backups together. Test recovery.
- Give clients only their workspace credentials. Keep master, database and storage credentials with the platform owner. Agree separately whether a customer also receives a licensed source copy.
- Specify included support, free-tier limits and ongoing hosting responsibility.

Local preview remains http://127.0.0.1:5173. The old demo remains a legacy workspace in development; `Demo Realty` is an isolated client workspace. The active local backend is connected to the Neon estateflow-crm project under medhi0164@gmail.com. Photos/documents use the verified private Neon Free storage bucket. Cloudflare R2 has not been activated; hosting has not been deployed.
