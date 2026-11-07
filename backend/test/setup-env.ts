import 'dotenv/config';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// e2e tests run against a separate database and a throwaway upload folder,
// so they never touch development data.
if (process.env.DATABASE_URL && !process.env.DATABASE_URL_TEST) {
  throw new Error('DATABASE_URL_TEST is required when DATABASE_URL is set; refusing to wipe the application database');
}
if (process.env.DATABASE_URL_TEST) process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
process.env.REGISTRATION_ENABLED = 'true';
process.env.STORAGE_DRIVER = 'local';
process.env.DB_NAME = process.env.DB_NAME_TEST || 'estateflow_crm_test';
process.env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), 'estateflow-test-'));
process.env.SWAGGER_ENABLED = 'false';
process.env.JWT_SECRET ||= 'test-secret-that-is-at-least-32-characters-long';
