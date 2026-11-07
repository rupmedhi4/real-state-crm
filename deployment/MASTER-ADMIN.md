# Master administrator and client workspaces

Open `/master` to manage the platform. Master accounts are separate from client
ADMIN/MANAGER/AGENT accounts: a client's Admin role does not grant master access.

## First master

Set `MASTER_ADMIN_EMAIL`, `MASTER_ADMIN_PASSWORD` (12–72 characters) and optionally
`MASTER_ADMIN_NAME` in the backend's secret environment configuration. Apply
migrations and run `npm run create-master` from `backend/`. Production's
`start:render` command also performs this step. Existing passwords are never reset
on a redeploy. Keep these credentials with the platform owner.

In local development, the account has already been created. Its login is stored in
`.local/master-login.txt`; a sample client login is in `.local/demo-client-login.txt`.
These files are ignored by Git and excluded from the release archives.

## Client creation

1. Choose **New client** in the master console.
2. Enter the company name, a unique lowercase workspace code, owner email and
   initial password. The same email can belong to different workspaces.
3. Select enabled modules and the maximum property photos (1–20).
4. Create the client. A separate PostgreSQL schema, empty CRM and primary owner
   account are created. Existing demo/business records are not copied.
5. Share `/login?workspace=THE-CODE`, owner email and password securely. The
   client can change their password from Settings and create their own team when
   Team management is enabled.

## Ongoing controls

- **Features & settings:** change the company label, modules and photo allowance.
  Disabled modules return HTTP 403, including direct API requests; client navigation
  hides those modules after reload. A photo gallery also needs Property inventory.
  Brochure/sharing controls are hidden when Brochures & sharing is off. Like any
  web application, this cannot prevent a user manually printing visible data.
- **Suspend/Reactivate:** stops/restores a client's entire account. Suspension
  blocks existing JWT sessions, new logins and public property-photo requests.
- **Reset owner password:** sets a replacement password for the primary owner.
  Passwords are hashed and are never displayed back by the API. Reset does not
  revoke already-issued owner JWTs; suspend the workspace for immediate lockout.
- **Open CRM:** opens that client's CRM as its owner with a one-hour support
  session. The master can return using the master-console link. Feature limits
  still apply; enable a disabled module first if support requires access.
- **Recent master activity:** records client creation/updates/suspension, owner
  password resets and master support access. Passwords and tokens are not logged.

Client admins cannot delete, disable or demote their primary owner account. The
master controls company-level suspension. Updating the owner's email from the
team page updates the credential label in the master console as well.

## Isolation and operations

Client schemas separate all CRM tables, relationships, settings and users. Scoped
repositories, transactions and raw reports use the authenticated client's data
source. Cross-client identifiers cannot resolve through another client's schema.
The `public` schema contains the platform registry, master accounts/audit, and the
preserved old single-company CRM. `ALLOW_LEGACY_LOGIN=false` prevents legacy login
in production. Keep `REGISTRATION_ENABLED=false`; masters create client owners.

All client schemas share one PostgreSQL project's compute/storage quota and the
configured file store. Files use random UUID keys; private downloads require the
matching client's metadata. Public listing photos use their workspace code and
are intentionally public while the account and photo feature are enabled.

Use the database role only on the trusted server. Tenant isolation here is enforced
by the application/data-source boundary, not a distinct database login per client.
Do not give clients SQL credentials. Test backups/restores for the complete database
(all client schemas, platform registry and audit) together with file storage.

CRM migrations are declared in `TenantRegistry.forClient`; new CRM migrations must
be added there as well as to the shared CLI migration directory. Platform migrations
must never run inside a client schema. Each client source applies pending CRM
migrations when first opened after a backend restart.

The local backend uses the verified Neon project under medhi0164@gmail.com for both
PostgreSQL and a private Object Storage bucket. The master console sign-in and
cloud multi-photo upload/read/delete, cover selection and authenticated-only
document download have been verified. Hosting is intentionally not deployed.
Cloudflare R2 was not activated; the user requested no payment. The Neon project
remains on Free, with quotas shared by all workspaces. Full mobile acceptance
testing remains part of customer handover.
