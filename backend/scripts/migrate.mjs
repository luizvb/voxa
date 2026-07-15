import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import { missingBillingSchema } from './billing-schema.mjs';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error('Migrations require DIRECT_URL or DATABASE_URL.');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDirectory = path.join(root, 'migrations');
const migrations = (await readdir(migrationsDirectory))
  .filter((name) => name.endsWith('.sql'))
  .sort();
const pool = new pg.Pool({ connectionString, max: 1 });
const client = await pool.connect();

try {
  await client.query(`SELECT pg_advisory_lock(hashtext('voxa_schema_migrations'))`);
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    checksum VARCHAR(64) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  for (const name of migrations) {
    const sql = await readFile(path.join(migrationsDirectory, name), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const existing = await client.query(
      'SELECT checksum FROM schema_migrations WHERE name = $1',
      [name],
    );
    if (existing.rows[0]) {
      if (existing.rows[0].checksum !== checksum) {
        throw new Error(`Applied migration checksum changed: ${name}`);
      }
      console.log(`Already applied: ${name}`);
      continue;
    }

    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations(name, checksum) VALUES($1, $2)',
        [name, checksum],
      );
      await client.query('COMMIT');
      console.log(`Applied: ${name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }

  const missing = await missingBillingSchema(client);
  if (missing.length) throw new Error(`Billing schema remains incomplete: ${missing.join(', ')}`);
  console.log('Database migrations and billing schema verified.');
} finally {
  await client.query(`SELECT pg_advisory_unlock(hashtext('voxa_schema_migrations'))`).catch(() => undefined);
  client.release();
  await pool.end();
}
