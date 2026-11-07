import 'dotenv/config';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env.validation';
import { dbOptions } from './db-options';

async function run() {
  validateEnv(process.env);
  const ds = new DataSource(dbOptions());
  try {
    await ds.initialize();
    await ds.query('SELECT 1');
    console.log('PostgreSQL connection: OK');
    const pending = await ds.showMigrations();
    console.log(pending ? 'Schema: pending migrations; run migration:run before starting.' : 'Schema: up to date');
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
  if (process.env.STORAGE_DRIVER === 's3') {
    const endpoint = process.env.S3_ENDPOINT || undefined;
    const client = new S3Client({
      endpoint, region: process.env.S3_REGION || 'auto', forcePathStyle: !!endpoint,
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
    });
    try {
      await client.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET }));
      console.log('Object storage bucket access: OK (read/write upload permissions still need a real upload check)');
    } finally { client.destroy(); }
  } else {
    console.log('Storage: local filesystem (use S3/R2 for an ephemeral cloud host)');
  }
}
void run().catch(() => {
  console.error('Service check failed. Check environment values, database access and bucket permissions; credentials have not been printed.');
  process.exitCode = 1;
});
