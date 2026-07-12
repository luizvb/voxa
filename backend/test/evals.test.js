const assert = require('node:assert/strict');
const test = require('node:test');

const { aggregateCases, buildEvalCsv, normalizeEvalConfig, promptSnapshot, runDeterministicChecks } = require('../dist/services/evals');

test('eval config is bounded and rejects unknown modes and categories', () => {
  const config = normalizeEvalConfig({ caseCount: 99, modes: ['meeting', 'invalid'], categories: ['normal', 'unknown'], difficulty: 'wild' });
  assert.equal(config.caseCount, 20);
  assert.deepEqual(config.modes, ['meeting']);
  assert.deepEqual(config.categories, ['normal']);
  assert.equal(config.difficulty, 'hard');
});

test('deterministic checks reject invented action ownership and unselected mode output', () => {
  const scenario = { title: 'Planning', category: 'incomplete', mode: 'meeting', context: '', transcript: 'Ana: We should prepare the launch checklist.', expectedFacts: [], absentFacts: ['owner', 'date'], expectedSignals: [] };
  const analysis = {
    version: '3.0', analysisModes: ['meeting'], summary: {}, evidenceQuality: {}, interview: { scorecard: { overallScore: 8 } }, languageClass: null,
    meeting: { actionItems: [{ task: 'Prepare checklist', owner: 'Bruno', dueDate: 'Friday', evidence: [{ speaker: 'Ana', quote: 'We should prepare the launch checklist' }] }] }
  };
  const checks = runDeterministicChecks(analysis, scenario);
  assert.equal(checks.find((item) => item.id === 'mode-isolation').passed, false);
  assert.equal(checks.find((item) => item.id === 'ownership-grounding').passed, false);
});

test('deterministic checks accept exact v3 grounded meeting output', () => {
  const scenario = { title: 'Planning', category: 'normal', mode: 'meeting', context: '', transcript: 'Ana: I will prepare the launch checklist by Friday.', expectedFacts: [], absentFacts: [], expectedSignals: [] };
  const evidence = [{ speaker: 'Ana', quote: 'I will prepare the launch checklist by Friday' }];
  const analysis = {
    version: '3.0', analysisModes: ['meeting'], summary: {}, evidenceQuality: {}, interview: null, languageClass: null,
    meeting: { actionItems: [{ task: 'Prepare the launch checklist', owner: 'Ana', dueDate: 'Friday', evidence }] }
  };
  const checks = runDeterministicChecks(analysis, scenario);
  assert.equal(checks.every((item) => item.passed), true, JSON.stringify(checks));
});

test('aggregateCases calculates score, cost, latency and unique tags', () => {
  const summary = aggregateCases([
    { status: 'completed', judgment: { overallScore: 8, scores: { factuality: 9 }, failureTags: ['thin-evidence'] }, metrics: { costUsd: .02, latencyMs: 1000 } },
    { status: 'completed', judgment: { overallScore: 6, scores: { factuality: 7 }, failureTags: ['thin-evidence'] }, metrics: { costUsd: .03, latencyMs: 3000 } },
    { status: 'failed', metrics: {} }
  ]);
  assert.equal(summary.overallScore, 7);
  assert.equal(summary.dimensions.factuality, 8);
  assert.equal(summary.costUsd, .05);
  assert.equal(summary.averageLatencyMs, 2000);
  assert.deepEqual(summary.failureTags, ['thin-evidence']);
});

test('prompt snapshot produces a stable sha256 fingerprint', () => {
  const first = promptSnapshot();
  const second = promptSnapshot();
  assert.equal(first.hash, second.hash);
  assert.match(first.hash, /^[a-f0-9]{64}$/);
});

test('custom system prompt is trimmed, bounded and changes the snapshot fingerprint', () => {
  const baseline = normalizeEvalConfig({ modes: ['meeting'] });
  const custom = normalizeEvalConfig({ modes: ['meeting'], systemPrompt: '  Custom Voxa prompt  ', supervisorPrompt: '  Custom supervisor  ' });
  assert.equal(custom.systemPrompt, 'Custom Voxa prompt');
  assert.equal(custom.supervisorPrompt, 'Custom supervisor');
  assert.notEqual(promptSnapshot(baseline).hash, promptSnapshot(custom).hash);
  assert.match(promptSnapshot(custom).snapshot, /VOXA SYSTEM PROMPT:\nCustom Voxa prompt/);
  assert.match(promptSnapshot(custom).snapshot, /SUPERVISOR SYSTEM PROMPT:\nCustom supervisor/);
});

test('CSV export merges cases, escapes content and prevents spreadsheet formulas', () => {
  const csv = buildEvalCsv({ id: 'run-1', prompt_hash: 'hash-1' }, [
    { id: 'case-1', position: 0, status: 'completed', scenario: { mode: 'meeting', category: 'normal', title: 'Q1, planning' }, transcript: '=IMPORTXML("bad")', analysis: { summary: { title: 'A "quoted" title' } }, judgment: { overallScore: 8, verdict: 'pass', scores: { factuality: 9 }, failureTags: [], strengths: ['Clear'], improvements: [] }, deterministic_checks: [], metrics: { latencyMs: 10, totalTokens: 20, costUsd: .01 } },
    { id: 'case-2', position: 1, status: 'failed', scenario: { mode: 'interview', category: 'hard', title: 'Second' }, error: 'failed' }
  ]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv, /"Q1, planning"/);
  assert.match(csv, /"'\=IMPORTXML\(""bad""\)"/);
  assert.match(csv, /"case-2"/);
  assert.equal(csv.split('\r\n').length, 3);
});
