/**
 * Creates the first admin login. Safe to run on every deploy: it does nothing
 * when ADMIN_EMAIL is not set or that user already exists. Works in
 * production, unlike the seed.
 *
 *   ADMIN_EMAIL=me@example.com ADMIN_PASSWORD=... npm run create-admin
 *   node dist/database/create-admin.js        (after npm run build)
 */
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { Role } from '../common/constants';
import { User } from '../users/user.entity';
import { dbOptions } from './db-options';

async function run() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? '';
  if (!email) {
    console.log('ADMIN_EMAIL not set; skipping admin creation.');
    return;
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }

  const ds = await new DataSource(dbOptions()).initialize();
  try {
    const users = ds.getRepository(User);
    if (await users.exist({ where: { email } })) {
      console.log(`User ${email} already exists; nothing to do.`);
      return;
    }
    await users.save({
      name: process.env.ADMIN_NAME?.trim() || 'Admin',
      email,
      role: Role.ADMIN,
      designation: 'Admin',
      passwordHash: await bcrypt.hash(password, 12),
    });
    console.log(`Admin login created: ${email}`);
  } finally {
    await ds.destroy();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
