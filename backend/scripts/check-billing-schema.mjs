import dotenv from 'dotenv';
import pg from 'pg';
import { missingBillingSchema } from './billing-schema.mjs';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Billing schema check requires DIRECT_URL or DATABASE_URL.');
  process.exitCode = 1;
} else {
  const pool = new pg.Pool({ connectionString, max: 1 });
  try {
    const missing = await missingBillingSchema(pool);
    if (missing.length) {
      console.error(`Billing schema is outdated. Missing: ${missing.join(', ')}`);
      process.exitCode = 1;
    } else {
      console.log('Billing schema is ready.');
    }
  } catch (error) {
    console.error(`Billing schema check failed (${String(error?.code || 'DATABASE_ERROR').slice(0, 80)}).`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
