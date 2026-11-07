import { validateEnv } from './env.validation';

const base = { JWT_SECRET: 'a-secure-test-secret-with-at-least-32-characters', DB_HOST: 'localhost', DB_USER: 'postgres', DB_NAME: 'crm' };

describe('deployment configuration', () => {
  it('accepts a Neon URL without separate DB credentials', () => {
    expect(() => validateEnv({ JWT_SECRET: base.JWT_SECRET, DATABASE_URL: 'postgresql://user:password@db.example/crm?sslmode=require' })).not.toThrow();
  });
  it('rejects an invalid or non-Postgres URL', () => {
    for (const DATABASE_URL of ['not-a-url', 'https://user:password@db.example/crm', 'postgres://db.example']) {
      expect(() => validateEnv({ ...base, DATABASE_URL })).toThrow('DATABASE_URL');
    }
  });
  it('rejects missing cloud storage credentials', () => {
    expect(() => validateEnv({ ...base, STORAGE_DRIVER: 's3' })).toThrow('S3_BUCKET');
  });
  it('rejects invalid upload limits and registration switches', () => {
    expect(() => validateEnv({ ...base, MAX_IMAGES_PER_PROPERTY: '21' })).toThrow('MAX_IMAGES');
    expect(() => validateEnv({ ...base, REGISTRATION_ENABLED: 'yes' })).toThrow('REGISTRATION_ENABLED');
  });
});
