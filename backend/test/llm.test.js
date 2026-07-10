const assert = require('node:assert/strict');
const test = require('node:test');

const { buildAnalysisPrompt, normalizeAnalysisModes } = require('../dist/services/llm');

test('analysis modes are validated, deduplicated and default to language', () => {
  assert.deepEqual(normalizeAnalysisModes(['meeting', 'interview', 'meeting', 'invalid']), ['meeting', 'interview']);
  assert.deepEqual(normalizeAnalysisModes([]), ['language']);
  assert.deepEqual(normalizeAnalysisModes('meeting'), ['language']);
});

test('combined analysis prompt includes selected schemas and safety boundaries', () => {
  const prompt = buildAnalysisPrompt('**Speaker 0** Hello', {
    modes: ['interview', 'language', 'meeting'],
    outputLanguage: 'pt-BR',
    context: 'Principal Engineer role'
  });

  assert.match(prompt, /Selected modes: interview, language, meeting/);
  assert.match(prompt, /INTERVIEW:/);
  assert.match(prompt, /LANGUAGE CLASS:/);
  assert.match(prompt, /MEETING:/);
  assert.match(prompt, /likely_advance\|uncertain\|likely_not_advance/);
  assert.match(prompt, /communicationSignals/);
  assert.match(prompt, /Principal Engineer role/);
  assert.match(prompt, /\*\*Speaker 0\*\* Hello/);
});

test('single analysis prompt excludes unselected instructions', () => {
  const prompt = buildAnalysisPrompt('Transcript', { modes: ['language'] });
  assert.match(prompt, /LANGUAGE CLASS:/);
  assert.doesNotMatch(prompt, /INTERVIEW:/);
  assert.doesNotMatch(prompt, /MEETING:/);
});
