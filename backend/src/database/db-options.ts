import { join } from 'path';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { ENTITIES } from './entities';

/** Shared by the Nest app and the TypeORM CLI (migrations, seed). */
export function dbOptions(
  env: NodeJS.ProcessEnv = process.env,
): PostgresConnectionOptions {
  const url = env.DATABASE_URL ? new URL(env.DATABASE_URL) : null;
  const sslMode = url?.searchParams.get('sslmode');
  const ssl = env.DB_SSL === 'true' || (!!url && sslMode !== 'disable');
  return {
    type: 'postgres',
    host: url?.hostname ?? env.DB_HOST ?? 'localhost',
    port: Number(url?.port || env.DB_PORT || 5432),
    username: url ? decodeURIComponent(url.username) : env.DB_USER ?? 'postgres',
    password: url ? decodeURIComponent(url.password) : env.DB_PASSWORD ?? '',
    database: url ? decodeURIComponent(url.pathname.slice(1)) : env.DB_NAME ?? 'estateflow_crm',
    ssl: ssl ? { rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : false,
    extra: { max: 5, connectionTimeoutMillis: 15000, idleTimeoutMillis: 30000 },
    entities: ENTITIES,
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    // Schema changes only ever go through migrations.
    synchronize: false,
    migrationsRun: false,
    logging: env.DB_LOGGING === 'true' ? 'all' : ['error', 'warn', 'migration'],
  };
}
