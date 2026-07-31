const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const Module = require('node:module');
const test = require('node:test');
const { transformSync } = require('esbuild');

const source = readFileSync('src/lib/language-attribution.ts', 'utf8');
const compiled = transformSync(source, { format: 'cjs', loader: 'ts', target: 'es2021' }).code;
const helperModule = new Module('language-attribution.test-runtime');
helperModule._compile(compiled, 'language-attribution.js');
const { collectLanguageParticipants, inferLanguageItemSpeaker, languageItemScope, scopeLanguageItems } = helperModule.exports;

test('explicit speaker attribution takes precedence', () => {
  const item = { speaker: ' Alex ', evidence: [{ speaker: 'Morgan' }] };
  assert.equal(inferLanguageItemSpeaker(item), 'Alex');
  assert.equal(languageItemScope(item, 'alex'), 'participant');
  assert.equal(languageItemScope(item, 'Morgan'), 'other');
});

test('legacy evidence attribution requires unanimous named evidence', () => {
  assert.equal(inferLanguageItemSpeaker({ evidence: [{ speaker: 'Alex' }, { speaker: ' alex ' }] }), 'alex');
  assert.equal(inferLanguageItemSpeaker({ evidence: [{ speaker: 'Alex' }, { speaker: 'Morgan' }] }), null);
  assert.equal(inferLanguageItemSpeaker({ evidence: [{ speaker: 'Alex' }, { quote: 'missing label' }] }), null);
  assert.equal(inferLanguageItemSpeaker({ evidence: [] }), null);
});

test('scoping keeps the selected participant and general context without leaking other speakers', () => {
  const selected = { speaker: 'Alex', pattern: 'selected' };
  const other = { speaker: 'Morgan', pattern: 'other' };
  const mixed = { pattern: 'mixed', evidence: [{ speaker: 'Alex' }, { speaker: 'Morgan' }] };
  const global = { pattern: 'global' };
  assert.deepEqual(scopeLanguageItems([selected, other, mixed, global], 'Alex'), [
    { item: selected, scope: 'participant' },
    { item: mixed, scope: 'general' },
    { item: global, scope: 'general' },
  ]);
});

test('participant collection keeps a correction-only speaker accessible', () => {
  assert.deepEqual(collectLanguageParticipants({
    learnerProfiles: [],
    legacySpeakers: [],
    corrections: [{ speaker: 'Taylor', original: 'I has', corrected: 'I have' }],
  }), ['Taylor']);
});

test('participant collection works without profiles and preserves first label casing across all scoped sections', () => {
  assert.deepEqual(collectLanguageParticipants({
    learnerProfiles: [],
    languagePatterns: [{ evidence: [{ speaker: 'ALEX' }], pattern: 'pattern' }],
    corrections: [{ speaker: 'alex', original: 'x', corrected: 'y' }],
    lessonProgress: {
      successfulUse: [{ speaker: 'Morgan', skill: 'clarity' }],
      selfCorrections: [{ evidence: [{ speaker: 'Sam' }], observation: 'repair' }],
    },
    teacherPlan: {
      homework: [{ speaker: 'Riley', task: 'practice' }],
      nextLessonFocus: [{ evidence: [{ speaker: 'Casey' }], focus: 'timing' }],
    },
  }), ['ALEX', 'Morgan', 'Sam', 'Riley', 'Casey']);
});
