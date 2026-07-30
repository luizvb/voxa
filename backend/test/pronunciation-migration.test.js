const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migration = fs.readFileSync(
  path.join(__dirname, '../migrations/20260730_pronunciation_legacy_backfill.sql'),
  'utf8',
);

test('legacy English backfill is scoped, timed, and idempotent', () => {
  assert.match(migration, /WHERE t\.language IS NULL/);
  assert.match(migration, /SET language = 'en-US'/);
  assert.match(migration, /legacy\.duration_ms > 0/);
  assert.match(migration, /NOT EXISTS[\s\S]*FROM transcript_segments/);
  assert.match(migration, /header_match := regexp_match/);
  assert.match(migration, /string_to_array\(btrim\(header_match\[2\]\), ':'\)/);
  assert.match(migration, /next_start_ms > current_start_ms/);
  assert.match(migration, /transcript_record\.duration_ms > current_start_ms/);
  assert.match(migration, /ON CONFLICT \(transcript_id, position\) DO NOTHING/g);
});
