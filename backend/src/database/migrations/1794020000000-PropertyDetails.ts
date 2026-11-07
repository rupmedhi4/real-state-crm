import { MigrationInterface, QueryRunner } from 'typeorm';

export class PropertyDetails1794020000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE properties
      ADD COLUMN "bathrooms" integer,
      ADD COLUMN "balconies" integer,
      ADD COLUMN "parkingSpaces" integer,
      ADD COLUMN "floorNumber" integer,
      ADD COLUMN "totalFloors" integer,
      ADD COLUMN "furnishing" varchar(30),
      ADD COLUMN "possessionStatus" varchar(40),
      ADD COLUMN "facing" varchar(20),
      ADD COLUMN "reraNumber" varchar(80),
      ADD COLUMN "ownerName" varchar(120),
      ADD COLUMN "ownerPhone" varchar(30),
      ADD COLUMN "amenities" text`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE properties
      DROP COLUMN "amenities",
      DROP COLUMN "ownerPhone",
      DROP COLUMN "ownerName",
      DROP COLUMN "reraNumber",
      DROP COLUMN "facing",
      DROP COLUMN "possessionStatus",
      DROP COLUMN "furnishing",
      DROP COLUMN "totalFloors",
      DROP COLUMN "floorNumber",
      DROP COLUMN "parkingSpaces",
      DROP COLUMN "balconies",
      DROP COLUMN "bathrooms"`);
  }
}
