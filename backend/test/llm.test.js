const assert = require('node:assert/strict');
const test = require('node:test');

const { buildAnalysisPrompt, normalizeAnalysisModes, sanitizeAnalysisResult } = require('../dist/services/llm');
const { completeJsonWithOpenRouter } = require('../dist/services/llm');

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
  assert.match(prompt, /INTERVIEW LENS/);
  assert.match(prompt, /LANGUAGE LESSON LENS/);
  assert.match(prompt, /MEETING LENS/);
  assert.match(prompt, /likely_advance\|uncertain\|likely_not_advance/);
  assert.match(prompt, /learnerProfiles/);
  assert.match(prompt, /questionReviews/);
  assert.match(prompt, /managerBrief/);
  assert.match(prompt, /exact consecutive transcript quote/);
  assert.match(prompt, /Principal Engineer role/);
  assert.match(prompt, /\*\*Speaker 0\*\* Hello/);
});

test('single analysis prompt excludes unselected instructions', () => {
  const prompt = buildAnalysisPrompt('Transcript', { modes: ['language'] });
  assert.match(prompt, /LANGUAGE LESSON LENS/);
  assert.doesNotMatch(prompt, /INTERVIEW LENS/);
  assert.doesNotMatch(prompt, /MEETING LENS/);
});

test('analysis sanitizer enforces mode isolation, score ranges and exact evidence', () => {
  const transcript = 'Ana: I will send the launch checklist on Friday. Bruno: Great, I will review it.';
  const sanitized = sanitizeAnalysisResult({
    version: '2.0',
    analysisModes: ['meeting', 'language'],
    summary: { title: 'Launch', overview: 'The team discussed launch work.' },
    evidenceQuality: { level: 'high', reasons: [], limitations: [] },
    languageClass: { overallScore: 12 },
    meeting: {
      actionItems: [
        { task: 'Send checklist', owner: 'Ana', dueDate: 'Friday', evidence: [{ speaker: 'Ana', quote: 'I will send the launch checklist on Friday' }] },
        { task: 'Invented task', owner: 'Bruno', dueDate: 'Monday', evidence: [{ speaker: 'Bruno', quote: 'Bruno owns this next Monday' }] }
      ],
      decisions: [{ decision: 'Ship today', score: 14, evidence: [{ speaker: 'Ana', quote: 'This was never said' }] }]
    },
    extra: true
  }, transcript, ['meeting']);

  assert.deepEqual(Object.keys(sanitized), ['version', 'analysisModes', 'summary', 'evidenceQuality', 'interview', 'languageClass', 'meeting']);
  assert.deepEqual(sanitized.analysisModes, ['meeting']);
  assert.equal(sanitized.interview, null);
  assert.equal(sanitized.languageClass, null);
  assert.equal(sanitized.meeting.actionItems.length, 1);
  assert.equal(sanitized.meeting.actionItems[0].owner, 'Ana');
  assert.equal(sanitized.meeting.actionItems[0].dueDate, 'Friday');
  assert.equal(sanitized.meeting.decisions.length, 0);
  assert.equal(sanitized.evidenceQuality.level, 'low');
  assert.ok(sanitized.evidenceQuality.limitations.length >= 1);
});

test('JSON completion parses fenced output and reports usage with mocked provider', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: '```json\n{"ok":true}\n```' } }], usage: { total_tokens: 321, cost: 0.004 } })
  });
  const result = await completeJsonWithOpenRouter({ apiKey: 'test', model: 'judge', systemPrompt: 'system', userPrompt: 'user' });
  assert.deepEqual(result.data, { ok: true });
  assert.deepEqual(result.usage, { totalTokens: 321, costUsd: 0.004 });
});

test('JSON completion extracts the first complete object when a provider appends text', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: '{"ok":true,"text":"brace } inside"}\nExtra provider commentary' } }], usage: { total_tokens: 10, cost: 0.001 } })
  });
  const result = await completeJsonWithOpenRouter({ apiKey: 'test', model: 'candidate', systemPrompt: 'system', userPrompt: 'user' });
  assert.deepEqual(result.data, { ok: true, text: 'brace } inside' });
});
