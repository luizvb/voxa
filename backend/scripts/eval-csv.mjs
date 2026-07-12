import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const directory = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(directory, '..');
dotenv.config({ path: path.join(backendRoot, '.env') });

const { analyzeTranscriptWithOpenRouter, completeJsonWithOpenRouter } = await import('../dist/services/llm.js');
const { DEFAULT_EVAL_SUPERVISOR_PROMPT, runDeterministicChecks } = await import('../dist/services/evals.js');

function parseCsv(source) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const headers = rows.shift().map((value) => value.replace(/^\uFEFF/, ''));
  return rows.filter((values) => values.some(Boolean)).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

function requestedPositions(value) {
  return String(value || '0,1,2').split(',').map(Number).filter(Number.isInteger);
}

const csvPath = process.argv[2];
if (!csvPath) throw new Error('Usage: node scripts/eval-csv.mjs <csv-path> [positions]');
const positions = requestedPositions(process.argv[3]);
const insightModel = process.env.EVAL_INSIGHT_MODEL || 'openai/gpt-5.4-mini';
const supervisorModel = process.env.EVAL_SUPERVISOR_MODEL || 'anthropic/claude-haiku-4.5';
const apiKey = process.env.OPENROUTER_API_KEY || '';
const rows = parseCsv(fs.readFileSync(path.resolve(csvPath), 'utf8')).filter((row) => positions.includes(Number(row.position)) && row.transcript && row.mode);
const results = [];

for (const row of rows) {
  const scenario = { title: row.title, category: row.category, mode: row.mode, context: '', transcript: row.transcript, expectedFacts: [], absentFacts: [], expectedSignals: [] };
  const started = Date.now();
  try {
    const candidate = await analyzeTranscriptWithOpenRouter(apiKey, row.transcript, insightModel, { modes: [row.mode], outputLanguage: 'pt-BR' });
    const checks = runDeterministicChecks(candidate.data, scenario);
    const deterministicFailures = checks.filter((check) => !check.passed);
    const judgment = await completeJsonWithOpenRouter({
      apiKey,
      model: supervisorModel,
      maxTokens: 3500,
      systemPrompt: `${DEFAULT_EVAL_SUPERVISOR_PROMPT}\nCurrent task: judge one completed Voxa v3 analysis.`,
      userPrompt: `Judge this ${row.mode} analysis for factuality, specificity, depth, actionability, calibration and mode-specific usefulness. A critical deterministic failure forces fail and overallScore no higher than 4. Passing requires exact schema, zero mode leakage, exact evidence, grounded owners/dates and specialist usefulness. Interview preparation and practice questions are valid interview coaching, not cross-mode leakage. Recommendations may extend beyond transcript facts when clearly framed as recommendations and tied to observed evidence. Return exactly {"overallScore":0,"verdict":"pass|mixed|fail","scores":{"factuality":0,"specificity":0,"depth":0,"actionability":0,"calibration":0,"specialistUsefulness":0},"strengths":[],"improvements":[],"failureTags":[]}.
TRANSCRIPT:\n${row.transcript}\nDETERMINISTIC CHECKS:\n${JSON.stringify(checks)}\nCANDIDATE:\n${JSON.stringify(candidate.data)}`
    });
    results.push({
      position: Number(row.position), mode: row.mode, category: row.category,
      status: 'completed', overallScore: judgment.data.overallScore, verdict: judgment.data.verdict,
      deterministicFailures: deterministicFailures.map((check) => check.id),
      scores: judgment.data.scores, failureTags: judgment.data.failureTags,
      strengths: judgment.data.strengths,
      improvements: judgment.data.improvements,
      limitations: candidate.data.evidenceQuality?.limitations || [],
      shape: row.mode === 'interview' ? {
        scorecard: candidate.data.interview?.scorecard,
        strengths: candidate.data.interview?.strengths?.length || 0,
        concerns: candidate.data.interview?.concerns?.length || 0,
        competencies: candidate.data.interview?.competencies?.map((item) => ({ name: item.name, score: item.score })) || [],
        questionReviews: candidate.data.interview?.questionReviews?.length || 0
      } : undefined,
      latencyMs: Date.now() - started,
      tokens: candidate.usage.totalTokens + judgment.usage.totalTokens,
      costUsd: candidate.usage.costUsd + judgment.usage.costUsd
    });
  } catch (error) {
    results.push({ position: Number(row.position), mode: row.mode, category: row.category, status: 'failed', error: error instanceof Error ? error.message : String(error), latencyMs: Date.now() - started });
  }
  process.stdout.write(`${JSON.stringify(results.at(-1))}\n`);
}

const completed = results.filter((item) => item.status === 'completed');
const summary = {
  cases: results.length,
  completed: completed.length,
  passed: completed.filter((item) => item.verdict === 'pass').length,
  deterministicPass: completed.filter((item) => item.deterministicFailures.length === 0).length,
  averageScore: completed.length ? completed.reduce((sum, item) => sum + Number(item.overallScore || 0), 0) / completed.length : 0,
  totalTokens: completed.reduce((sum, item) => sum + item.tokens, 0),
  totalCostUsd: completed.reduce((sum, item) => sum + item.costUsd, 0),
  models: { insightModel, supervisorModel }
};
process.stdout.write(`SUMMARY ${JSON.stringify(summary)}\n`);
