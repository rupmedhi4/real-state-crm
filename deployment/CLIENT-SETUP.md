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
Browser/mobile acceptance testing and a real R2 upload remain necessary before
customer handover. Automated email/SMS, WhatsApp API sending, payment collection,
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
   into R2 with their exact storage keys; changing STORAGE_DRIVER alone does not
   move them. For a new customer create an empty workspace from the master console. Existing single-company data is not automatically assigned to a new client schema.

Neon Free currently lists 1 GB Postgres storage and 100 CU-hours monthly per project.
All client schemas in this platform share that project allowance; it is not a
separate 1 GB allowance per CRM customer.
Monitor compute, storage and network quotas. These limits can change.
Sources: https://neon.com/pricing , https://neon.com/docs/connect/connect-from-any-app

## 2. Cloudflare R2 for property images and private documents

1. In your Cloudflare dashboard activate R2. Review billing/payment requirements
   before enabling the service; the free allowance is not an unlimited storage plan.
2. Create a **Standard** private platform bucket, e.g. `estateflow-platform-files`.
   Keep the bucket private. This app reads through its backend, so a public bucket,
   r2.dev URL and browser-to-R2 CORS rule are unnecessary.
3. Create an R2 S3 API access key with **Object Read & Write** limited to that
   bucket. Copy the S3 endpoint, access key ID and secret into the backend host's
   secret environment variables. Do not use an unrestricted account-wide key.
4. Set `STORAGE_DRIVER=s3`, `S3_REGION=auto`, `S3_ENDPOINT`, `S3_BUCKET`,
   `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` from `backend.env.example`.
5. After deploying, create a temporary property, upload two real photos, select a
   cover and delete one. Also upload a document and verify its unauthenticated
   download is rejected. Delete the temporary records after verification.

R2 Standard free allowance currently includes 10 GB-month storage, 1 million Class A
and 10 million Class B requests monthly; egress is free. Overages can be billed.
Property image optimisation reduces file sizes, but this app does not impose an
account-wide billing cap. Set provider budget alerts and monitor usage.
Sources: https://developers.cloudflare.com/r2/pricing/ ,
https://developers.cloudflare.com/r2/get-started/

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
`check:services` verifies DB access/schema and R2 bucket access; it does not prove
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
- Keep PostgreSQL backups and R2 object backups together. Test recovery.
- Give clients only their workspace credentials. Keep master, database and storage credentials with the platform owner. Agree separately whether a customer also receives a licensed source copy.
- Specify included support, free-tier limits and ongoing hosting responsibility.

Local preview remains http://127.0.0.1:5173. The old demo remains a legacy workspace in development; `Demo Realty` is an isolated client workspace. The active local backend is connected to the Neon estateflow-crm project under medhi0164@gmail.com. Cloudflare R2 activation awaits explicit usage-based billing approval; hosting has not been deployed.
