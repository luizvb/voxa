import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = join(root, 'backend');
const envFile = join(backend, '.env');
const systemPromptFile = join(backend, 'voxa_prompt.txt');
const vercel = process.platform === 'win32' ? 'vercel.cmd' : 'vercel';
const productionKeys = [
  'DATABASE_URL',
  'AZURE_SPEECH_KEY',
  'AZURE_SPEECH_REGION',
  'DEEPGRAM_API_KEY',
  'NEON_AUTH_URL',
  'OPENROUTER_API_KEY',
  'VOXA_ANALYSIS_MODEL',
  'OPENROUTER_MODEL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'VOXA_EVAL_SUPERVISOR_MODEL',
  'VOXA_SYSTEM_PROMPT'
];

function parseEnv(source) {
  const values = new Map();
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values.set(key, value);
  }
  return values;
}

const values = parseEnv(readFileSync(envFile, 'utf8'));
values.set('VOXA_SYSTEM_PROMPT', readFileSync(systemPromptFile, 'utf8').trim());
for (const key of productionKeys) {
  const value = values.get(key);
  if (!value) {
    throw new Error(`Missing ${key} in backend/.env`);
  }

  const result = spawnSync(vercel, [
    'env', 'add', key, 'production', '--force', '--sensitive', '--yes', '--no-color'
  ], {
    cwd: backend,
    input: `${value}\n`,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    throw new Error(`Failed to sync ${key} to Vercel production.`);
  }
  console.log(`Synced ${key} to Vercel production.`);
}
