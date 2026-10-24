# Database

PostgreSQL schema for Estateflow CRM. The schema is owned by **TypeORM
migrations** in `backend/src/database/migrations/` — do not edit tables by
hand. `synchronize` is disabled, so the app never changes the schema on its own.

## Tables and relationships

| Table             | Purpose                                     | Key relationships |
|-------------------|---------------------------------------------|-------------------|
| `users`           | Sign-in accounts: admins, managers, agents  | — |
| `campaigns`       | Marketing campaigns per lead source         | — |
| `contacts`        | Leads **and** clients (one table)           | `agentId → users` (SET NULL), `campaignId → campaigns` (SET NULL) |
| `properties`      | Listings: sale / rent / lease               | `agentId → users` (SET NULL) |
| `property_images` | Photo metadata (files live in storage)      | `propertyId → properties` (CASCADE) |
| `deals`           | Negotiations, stages, commission, transaction status | `contactId → contacts` (**RESTRICT**), `propertyId → properties` (SET NULL), `agentId → users` (SET NULL) |
| `site_visits`     | Scheduled viewings and feedback             | `contactId → contacts` (CASCADE), `propertyId → properties` (SET NULL), `agentId → users` (SET NULL) |
| `tasks`           | Follow-ups and to-dos                       | `contactId → contacts` (CASCADE), `assigneeId → users` (SET NULL) |
| `activities`      | Communication history: calls, notes, stage changes | `contactId → contacts` (CASCADE), `agentId → users` (SET NULL) |
| `documents`       | Private file metadata                       | `contactId`, `propertyId`, `dealId` (CASCADE), `uploadedById → users` (SET NULL) |
| `settings`        | Key/value company configuration (jsonb)     | — |

**Why these delete rules**

- Deleting a **user** never deletes business records — their leads, deals and
  tasks become unassigned.
- Deleting a **contact** with deals is refused (RESTRICT, API returns 409) so
  closed revenue can't disappear by accident. Their visits, tasks, history and
  documents are removed with them.
- Deleting a **property** removes its photos; deals and visits keep existing
  without the property link.

**Leads vs clients**: one `contacts` table. A contact is shown as a *client*
once its `stage` is `Qualified`, `Site Visit`, `Negotiation` or `Won`.

**Money** is stored as `bigint` rupees (no paise), commission as
`numeric(5,2)` percent.

**Files** (property images, contact photos, documents) are never stored in
the database — only their storage key, original name, MIME type and size.

## Commands (run in `backend/`)

```bash
npm run migration:run        # apply pending migrations
npm run migration:show       # list applied / pending migrations
npm run migration:revert     # roll back the last migration
npm run migration:generate -- src/database/migrations/<Name>   # after changing entities
npm run seed                 # demo data on an empty database
npm run seed -- --reset      # wipe ALL data and re-seed (development only)
```

## Backups

```bash
pg_dump -U postgres -d estateflow_crm -F c -f estateflow.dump
pg_restore -U postgres -d estateflow_crm --clean estateflow.dump
```

Back up `backend/uploads/` (or your object-storage bucket) together with the
database dump: one is useless without the other.
