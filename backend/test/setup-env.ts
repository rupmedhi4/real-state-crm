import 'dotenv/config';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// e2e tests run against a separate database and a throwaway upload folder,
// so they never touch development data.
process.env.DB_NAME = process.env.DB_NAME_TEST || 'estateflow_crm_test';
process.env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), 'estateflow-test-'));
process.env.SWAGGER_ENABLED = 'false';
process.env.JWT_SECRET ||= 'test-secret-that-is-at-least-32-characters-long';
