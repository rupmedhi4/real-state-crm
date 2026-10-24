import 'dotenv/config';
import { DataSource } from 'typeorm';
import { dbOptions } from './db-options';

// Used by the TypeORM CLI: npm run migration:run / migration:generate
export default new DataSource(dbOptions());
