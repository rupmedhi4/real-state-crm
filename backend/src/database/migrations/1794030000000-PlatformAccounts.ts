import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlatformAccounts1794030000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE public.platform_admins (
      id uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(), name varchar(120) NOT NULL,
      email varchar(160) UNIQUE NOT NULL, "passwordHash" varchar NOT NULL,
      "isActive" boolean NOT NULL DEFAULT true, "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE public.platform_clients (
      id uuid PRIMARY KEY, name varchar(120) NOT NULL, slug varchar(50) UNIQUE NOT NULL,
      "schemaName" varchar(64) UNIQUE NOT NULL, "ownerEmail" varchar(160) NOT NULL, "ownerId" uuid,
      "isActive" boolean NOT NULL DEFAULT false, features jsonb NOT NULL,
      "maxImages" integer NOT NULL DEFAULT 20 CHECK ("maxImages" BETWEEN 1 AND 20),
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE public.platform_audit (
      id uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(), "adminId" uuid NOT NULL REFERENCES public.platform_admins(id),
      "clientId" uuid REFERENCES public.platform_clients(id), action varchar(80) NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE public.platform_audit');
    await queryRunner.query('DROP TABLE public.platform_clients');
    await queryRunner.query('DROP TABLE public.platform_admins');
  }
}
