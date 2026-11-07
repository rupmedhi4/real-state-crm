import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { dbOptions } from './db-options';

async function run() {
  const email = process.env.MASTER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.MASTER_ADMIN_PASSWORD ?? '';
  if (!email) { console.log('MASTER_ADMIN_EMAIL not set; skipping master creation.'); return; }
  if (password.length < 12 || password.length > 72) throw new Error('MASTER_ADMIN_PASSWORD must be 12–72 characters');
  const db = await new DataSource(dbOptions()).initialize();
  try {
    await db.query('INSERT INTO public.platform_admins (name, email, "passwordHash") VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING', [process.env.MASTER_ADMIN_NAME || 'Master Admin', email, await bcrypt.hash(password, 12)]);
    console.log('Master administrator is ready. Existing passwords are not overwritten.');
  } finally { await db.destroy(); }
}
void run().catch(() => { console.error('Master creation failed. Check migrations and MASTER_ADMIN_* configuration.'); process.exitCode = 1; });
