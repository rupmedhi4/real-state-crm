import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1792338998632 implements MigrationInterface {
  name = 'InitialSchema1792338998632';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TABLE "campaigns" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying(150) NOT NULL, "source" character varying(60) NOT NULL, "startDate" date, "endDate" date, "budget" bigint, "status" character varying(20) NOT NULL DEFAULT 'Active', "notes" text, CONSTRAINT "PK_831e3fcd4fc45b4e4c3f57a9ee4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'MANAGER', 'AGENT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying(120) NOT NULL, "email" character varying(160) NOT NULL, "phone" character varying(30), "passwordHash" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'AGENT', "designation" character varying(40) NOT NULL DEFAULT 'Agent', "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `,
    );
    await queryRunner.query(
      `CREATE TABLE "contacts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying(120) NOT NULL, "phone" character varying(30), "whatsapp" character varying(30), "email" character varying(160), "city" character varying(80), "address" character varying(255), "occupation" character varying(80), "source" character varying(60) NOT NULL DEFAULT 'Other', "campaignId" uuid, "propertyInterest" character varying(200), "propertyCategory" character varying(30) NOT NULL DEFAULT 'Residential', "intent" character varying(20) NOT NULL DEFAULT 'Buy', "configuration" character varying(40), "budgetMin" bigint, "budgetMax" bigint, "preferences" text, "stage" character varying(20) NOT NULL DEFAULT 'New', "priority" character varying(10) NOT NULL DEFAULT 'Medium', "score" integer NOT NULL DEFAULT '50', "agentId" uuid, "nextFollowup" date, "photoKey" character varying(255), "hasPhoto" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_b99cd40cfd66a99f1571f4f72e6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_82e70145f0669e778561f3877f" ON "contacts" ("name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_84cae51c485079bdd8cdf1d828" ON "contacts" ("phone") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_752866c5247ddd34fd05559537" ON "contacts" ("email") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5c861eb20c0a0b7cdb2770ac00" ON "contacts" ("source") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_48654fbe7490cd0e5298e2cae8" ON "contacts" ("stage") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2479631337b5cbb09083fa8dd5" ON "contacts" ("agentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_378cfaec08486c58ad32b7afca" ON "contacts" ("nextFollowup") `,
    );
    await queryRunner.query(
      `CREATE TABLE "activities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "contactId" uuid NOT NULL, "type" character varying(20) NOT NULL, "outcome" character varying(30), "agentId" uuid, "notes" text, "occurredAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7f4004429f731ffb9c88eb486a8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_69986e48aa4993df29847ccd80" ON "activities" ("contactId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b12671dc6bd64eed25eeabb2cd" ON "activities" ("agentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_413f803575767f62e355941111" ON "activities" ("occurredAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "property_images" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "propertyId" uuid NOT NULL, "storageKey" character varying(255) NOT NULL, "originalName" character varying(255) NOT NULL, "mimeType" character varying(60) NOT NULL, "sizeBytes" integer NOT NULL, "sortOrder" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_317c3774ee70c26d70c4f80e200" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7a07b6b7f9418bf1d516010669" ON "property_images" ("propertyId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "properties" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "title" character varying(150) NOT NULL, "listingType" character varying(10) NOT NULL DEFAULT 'Sale', "category" character varying(30) NOT NULL DEFAULT 'Residential', "propertyType" character varying(30) NOT NULL DEFAULT 'Apartment', "price" bigint, "bedrooms" integer, "areaSqft" integer, "city" character varying(80), "locality" character varying(120), "address" character varying(255), "status" character varying(20) NOT NULL DEFAULT 'Available', "description" text, "agentId" uuid, CONSTRAINT "PK_2d83bfa0b9fcd45dee1785af44d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9f67846300361680f5f0d53ac3" ON "properties" ("title") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c7aea7f222acdb48e3422361f8" ON "properties" ("city") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_92c923085d2eddf44188d41c8c" ON "properties" ("locality") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9cd2513cd04f57c9967f640b0a" ON "properties" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "deals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "title" character varying(150), "contactId" uuid NOT NULL, "propertyId" uuid, "value" bigint, "expectedClosing" date, "stage" character varying(30) NOT NULL DEFAULT 'New Opportunity', "probability" integer NOT NULL DEFAULT '50', "commissionPct" numeric(5,2) NOT NULL DEFAULT '2', "transactionStatus" character varying(30) NOT NULL DEFAULT 'Not Started', "agentId" uuid, "closedAt" TIMESTAMP WITH TIME ZONE, "notes" text, CONSTRAINT "PK_8c66f03b250f613ff8615940b4b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_329413f450746425e2a3d20b3d" ON "deals" ("contactId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_519428c5581e24fc0b8432fcee" ON "deals" ("propertyId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d9d02e1c6a8746af7b565df55c" ON "deals" ("stage") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_92ce46b4fa9abd0adb145ad5fd" ON "deals" ("agentId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "originalName" character varying(255) NOT NULL, "storageKey" character varying(255) NOT NULL, "mimeType" character varying(100) NOT NULL, "sizeBytes" integer NOT NULL, "category" character varying(40) NOT NULL DEFAULT 'Other', "contactId" uuid, "propertyId" uuid, "dealId" uuid, "uploadedById" uuid, CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b20c1ae2c7098e9a822f15aa6f" ON "documents" ("category") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_393c61f8f333d2451d0d13098d" ON "documents" ("contactId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_da53bc3356720fd3f80ce88fcb" ON "documents" ("propertyId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2002cf5422e6e01c9c907a6e6b" ON "documents" ("dealId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "settings" ("key" character varying(60) NOT NULL, "value" jsonb NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c8639b7626fa94ba8265628f214" PRIMARY KEY ("key"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "title" character varying(200) NOT NULL, "contactId" uuid, "type" character varying(30) NOT NULL DEFAULT 'Call', "priority" character varying(10) NOT NULL DEFAULT 'Medium', "dueDate" date, "dueTime" character varying(5), "assigneeId" uuid, "status" character varying(20) NOT NULL DEFAULT 'Pending', "completedAt" TIMESTAMP WITH TIME ZONE, "notes" text, CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_22e88bf5fa06f3df4f4edb1493" ON "tasks" ("contactId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c300d154a85801889174e92a3d" ON "tasks" ("dueDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9a16d2c86252529f622fa53f1e" ON "tasks" ("assigneeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6086c8dafbae729a930c04d865" ON "tasks" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "site_visits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "contactId" uuid NOT NULL, "propertyId" uuid, "visitDate" date NOT NULL, "visitTime" character varying(5), "agentId" uuid, "status" character varying(20) NOT NULL DEFAULT 'Scheduled', "notes" text, "feedback" text, CONSTRAINT "PK_33b7e3823d02ff3218134f0a277" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_356aa7391526222dd877a420b7" ON "site_visits" ("contactId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_193022fb2c689da0828d2b8590" ON "site_visits" ("visitDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_17d4bbc16422bfe071f02b67db" ON "site_visits" ("agentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0832820aced27267ca4d90c828" ON "site_visits" ("status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD CONSTRAINT "FK_52d2af67c625e5376efbfa44fb8" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD CONSTRAINT "FK_2479631337b5cbb09083fa8dd5d" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "FK_69986e48aa4993df29847ccd80a" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "FK_b12671dc6bd64eed25eeabb2cd7" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_images" ADD CONSTRAINT "FK_7a07b6b7f9418bf1d5160106694" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD CONSTRAINT "FK_353db6091069783cf1673cc82f6" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deals" ADD CONSTRAINT "FK_329413f450746425e2a3d20b3d9" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deals" ADD CONSTRAINT "FK_519428c5581e24fc0b8432fceee" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deals" ADD CONSTRAINT "FK_92ce46b4fa9abd0adb145ad5fd1" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "FK_393c61f8f333d2451d0d13098d0" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "FK_da53bc3356720fd3f80ce88fcb0" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "FK_2002cf5422e6e01c9c907a6e6b4" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "FK_5aad3bc717a4f483887ec61dbc8" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_22e88bf5fa06f3df4f4edb1493f" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_9a16d2c86252529f622fa53f1e3" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "site_visits" ADD CONSTRAINT "FK_356aa7391526222dd877a420b7d" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "site_visits" ADD CONSTRAINT "FK_95901bdf0095f9c4c3e7ba0e5c1" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "site_visits" ADD CONSTRAINT "FK_17d4bbc16422bfe071f02b67db0" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "site_visits" DROP CONSTRAINT "FK_17d4bbc16422bfe071f02b67db0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "site_visits" DROP CONSTRAINT "FK_95901bdf0095f9c4c3e7ba0e5c1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "site_visits" DROP CONSTRAINT "FK_356aa7391526222dd877a420b7d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "FK_9a16d2c86252529f622fa53f1e3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "FK_22e88bf5fa06f3df4f4edb1493f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT "FK_5aad3bc717a4f483887ec61dbc8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT "FK_2002cf5422e6e01c9c907a6e6b4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT "FK_da53bc3356720fd3f80ce88fcb0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT "FK_393c61f8f333d2451d0d13098d0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deals" DROP CONSTRAINT "FK_92ce46b4fa9abd0adb145ad5fd1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deals" DROP CONSTRAINT "FK_519428c5581e24fc0b8432fceee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deals" DROP CONSTRAINT "FK_329413f450746425e2a3d20b3d9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" DROP CONSTRAINT "FK_353db6091069783cf1673cc82f6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_images" DROP CONSTRAINT "FK_7a07b6b7f9418bf1d5160106694"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "FK_b12671dc6bd64eed25eeabb2cd7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "FK_69986e48aa4993df29847ccd80a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" DROP CONSTRAINT "FK_2479631337b5cbb09083fa8dd5d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" DROP CONSTRAINT "FK_52d2af67c625e5376efbfa44fb8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0832820aced27267ca4d90c828"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_17d4bbc16422bfe071f02b67db"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_193022fb2c689da0828d2b8590"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_356aa7391526222dd877a420b7"`,
    );
    await queryRunner.query(`DROP TABLE "site_visits"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6086c8dafbae729a930c04d865"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9a16d2c86252529f622fa53f1e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c300d154a85801889174e92a3d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_22e88bf5fa06f3df4f4edb1493"`,
    );
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TABLE "settings"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2002cf5422e6e01c9c907a6e6b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_da53bc3356720fd3f80ce88fcb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_393c61f8f333d2451d0d13098d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b20c1ae2c7098e9a822f15aa6f"`,
    );
    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_92ce46b4fa9abd0adb145ad5fd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d9d02e1c6a8746af7b565df55c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_519428c5581e24fc0b8432fcee"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_329413f450746425e2a3d20b3d"`,
    );
    await queryRunner.query(`DROP TABLE "deals"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9cd2513cd04f57c9967f640b0a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_92c923085d2eddf44188d41c8c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c7aea7f222acdb48e3422361f8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9f67846300361680f5f0d53ac3"`,
    );
    await queryRunner.query(`DROP TABLE "properties"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7a07b6b7f9418bf1d516010669"`,
    );
    await queryRunner.query(`DROP TABLE "property_images"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_413f803575767f62e355941111"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b12671dc6bd64eed25eeabb2cd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_69986e48aa4993df29847ccd80"`,
    );
    await queryRunner.query(`DROP TABLE "activities"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_378cfaec08486c58ad32b7afca"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2479631337b5cbb09083fa8dd5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_48654fbe7490cd0e5298e2cae8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5c861eb20c0a0b7cdb2770ac00"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_752866c5247ddd34fd05559537"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_84cae51c485079bdd8cdf1d828"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_82e70145f0669e778561f3877f"`,
    );
    await queryRunner.query(`DROP TABLE "contacts"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(`DROP TABLE "campaigns"`);
  }
}
