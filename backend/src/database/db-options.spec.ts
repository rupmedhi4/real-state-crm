import { dbOptions } from './db-options';

describe('Neon connection options', () => {
  it('decodes credentials and verifies TLS certificates by default', () => {
    const options = dbOptions({ DATABASE_URL: 'postgresql://my%40user:p%23ss@ep-test.neon.tech/crm?sslmode=require' });
    expect(options).toMatchObject({ host: 'ep-test.neon.tech', username: 'my@user', password: 'p#ss', database: 'crm', port: 5432, ssl: { rejectUnauthorized: true } });
  });
  it('supports a non-TLS local test database with discrete credentials', () => {
    expect(dbOptions({ DB_HOST: '127.0.0.1', DB_PORT: '5433', DB_USER: 'local', DB_NAME: 'crm_test' })).toMatchObject({ host: '127.0.0.1', port: 5433, database: 'crm_test', ssl: false });
  });
});
