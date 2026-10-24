import { join } from 'path';
import { DataSourceOptions } from 'typeorm';
import { ENTITIES } from './entities';

/** Shared by the Nest app and the TypeORM CLI (migrations, seed). */
export function dbOptions(
  env: NodeJS.ProcessEnv = process.env,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? 5432),
    username: env.DB_USER ?? 'postgres',
    password: env.DB_PASSWORD ?? '',
    database: env.DB_NAME ?? 'estateflow_crm',
    ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    entities: ENTITIES,
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    // Schema changes only ever go through migrations.
    synchronize: false,
    migrationsRun: false,
    logging: env.DB_LOGGING === 'true' ? 'all' : ['error', 'warn', 'migration'],
  };
}
