import { Request, Response } from 'express';
import db from '../config/db';
import { DEFAULT_SYSTEM_PROMPT } from '../services/llm';
import { DEFAULT_EVAL_SUPERVISOR_PROMPT, buildEvalCsv, cancelRun, ensureEvalTables, improveRunPrompt, normalizeEvalConfig, processRun, promptSnapshot, retryCase } from '../services/evals';

export async function createEvalRun(req: Request, res: Response) {
  try {
    await ensureEvalTables();
    await db.query("INSERT INTO users (id, email) VALUES ($1, 'unknown@voxa') ON CONFLICT (id) DO NOTHING", [req.user!.id]);
    const config = normalizeEvalConfig(req.body);
    const insightModel = config.insightModel || process.env.OPENROUTER_MODEL || 'google/gemini-3.1-flash-lite';
    const supervisorModel = config.supervisorModel || process.env.VOXA_EVAL_SUPERVISOR_MODEL || 'anthropic/claude-haiku-4.5';
    if (insightModel === supervisorModel) { res.status(400).json({ error: 'Insight and supervisor models must be different.' }); return; }
    const prompt = promptSnapshot(config);
    const { rows } = await db.query(`INSERT INTO eval_runs (user_id, config, insight_model, supervisor_model, prompt_hash, prompt_snapshot) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [req.user!.id, JSON.stringify(config), insightModel, supervisorModel, prompt.hash, prompt.snapshot]);
    const run = rows[0];
    for (let position = 0; position < config.caseCount; position += 1) await db.query('INSERT INTO eval_cases (run_id, position) VALUES ($1,$2)', [run.id, position]);
    void processRun(run.id, config, insightModel, supervisorModel);
    res.status(201).json({ ...run, config, insightModel, supervisorModel, promptHash: prompt.hash });
  } catch (error: any) { res.status(500).json({ error: error.message || 'Could not create eval run.' }); }
}

export async function listEvalRuns(req: Request, res: Response) {
  await ensureEvalTables();
  const { rows } = await db.query(`SELECT id, status, config - 'systemPrompt' - 'supervisorPrompt' AS config, insight_model AS "insightModel", supervisor_model AS "supervisorModel", prompt_hash AS "promptHash", summary, created_at AS "createdAt", started_at AS "startedAt", completed_at AS "completedAt" FROM eval_runs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`, [req.user!.id]);
  res.json(rows);
}

export async function getEvalPrompt(_req: Request, res: Response) {
  res.json({
    systemPrompt: process.env.VOXA_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT,
    supervisorPrompt: process.env.VOXA_EVAL_SUPERVISOR_PROMPT || DEFAULT_EVAL_SUPERVISOR_PROMPT
  });
}

export async function getEvalRun(req: Request, res: Response) {
  await ensureEvalTables();
  const runResult = await db.query(`SELECT id, status, config, insight_model AS "insightModel", supervisor_model AS "supervisorModel", prompt_hash AS "promptHash", summary, prompt_review AS "promptReview", created_at AS "createdAt", started_at AS "startedAt", completed_at AS "completedAt" FROM eval_runs WHERE id = $1 AND user_id = $2`, [req.params.id, req.user!.id]);
  if (!runResult.rows.length) { res.status(404).json({ error: 'Eval run not found.' }); return; }
  const cases = await db.query(`SELECT id, position, status, scenario, transcript, analysis, deterministic_checks AS "deterministicChecks", judgment, metrics, error, started_at AS "startedAt", completed_at AS "completedAt" FROM eval_cases WHERE run_id = $1 ORDER BY position`, [req.params.id]);
  res.json({ ...runResult.rows[0], cases: cases.rows });
}

export async function cancelEvalRun(req: Request, res: Response) {
  const owned = await db.query('SELECT 1 FROM eval_runs WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
  if (!owned.rows.length) { res.status(404).json({ error: 'Eval run not found.' }); return; }
  const runId = String(req.params.id);
  cancelRun(runId);
  await db.query("UPDATE eval_runs SET status = 'canceling' WHERE id = $1 AND status IN ('queued','running')", [req.params.id]);
  res.status(202).json({ status: 'canceling' });
}

export async function retryEvalCase(req: Request, res: Response) {
  if (!await retryCase(String(req.params.id), req.user!.id)) { res.status(404).json({ error: 'Eval case not found.' }); return; }
  res.status(202).json({ status: 'queued' });
}

export async function exportEvalCsv(req: Request, res: Response) {
  await ensureEvalTables();
  const runResult = await db.query('SELECT id, prompt_hash FROM eval_runs WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
  if (!runResult.rows.length) { res.status(404).json({ error: 'Eval run not found.' }); return; }
  const params: any[] = [req.params.id];
  let filter = '';
  if (typeof req.query.caseId === 'string' && req.query.caseId) { params.push(req.query.caseId); filter = ' AND id = $2'; }
  const cases = await db.query(`SELECT * FROM eval_cases WHERE run_id = $1${filter} ORDER BY position`, params);
  if (!cases.rows.length) { res.status(404).json({ error: 'No eval cases found.' }); return; }
  const suffix = params.length === 2 ? `case-${cases.rows[0].position + 1}` : 'all-cases';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="voxa-eval-${req.params.id}-${suffix}.csv"`);
  res.send(buildEvalCsv(runResult.rows[0], cases.rows));
}

export async function reviewEvalPrompt(req: Request, res: Response) {
  try {
    const review = await improveRunPrompt(String(req.params.id), req.user!.id);
    if (!review) { res.status(404).json({ error: 'Eval run not found.' }); return; }
    res.json(review);
  } catch (error: any) { res.status(409).json({ error: error.message || 'Could not review the prompt.' }); }
}
