import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, ClipboardCopy, Download, FlaskConical, Play, RefreshCw, RotateCcw, Settings2, Sparkles, Square, X } from 'lucide-react';
import { evalsApi } from '../lib/evals-api';
import type { AnalysisMode, EvalCaseResult, EvalCategory, EvalDimension, EvalRun, EvalRunConfig } from '../types/evals';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/Dialog';

const MODES: AnalysisMode[] = ['interview', 'language', 'meeting'];
const CATEGORIES: EvalCategory[] = ['normal', 'incomplete', 'ambiguous', 'long', 'contradictory', 'adversarial'];
const DIMENSIONS: EvalDimension[] = ['factuality', 'coverage', 'specificity', 'depth', 'actionability', 'calibration', 'executiveQuality'];
const LABELS: Record<string, string> = { interview: 'Interview', language: 'Language', meeting: 'Meeting', normal: 'Normal', incomplete: 'Incomplete', ambiguous: 'Ambiguous', long: 'Long', contradictory: 'Contradictory', adversarial: 'Adversarial', factuality: 'Factuality', coverage: 'Coverage', specificity: 'Specificity', depth: 'Depth', actionability: 'Actionability', calibration: 'Calibration', executiveQuality: 'Executive quality' };

const defaultConfig: EvalRunConfig = { caseCount: 6, language: 'pt-BR', outputLanguage: 'pt-BR', modes: [...MODES], difficulty: 'hard', categories: ['normal', 'incomplete', 'ambiguous', 'contradictory', 'adversarial'], insightModel: 'google/gemini-3.1-flash-lite', supervisorModel: 'anthropic/claude-haiku-4.5', systemPrompt: '', supervisorPrompt: '' };
const terminal = (status?: string) => ['completed', 'completed_with_errors', 'canceled'].includes(status || '');
const formatMoney = (value = 0) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 4 }).format(value);
const formatDuration = (value = 0) => value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;

export default function EvalsLab() {
  const [config, setConfig] = useState(defaultConfig);
  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [activeRun, setActiveRun] = useState<EvalRun | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [caseFilter, setCaseFilter] = useState('all');
  const [compareId, setCompareId] = useState('');
  const [compareRun, setCompareRun] = useState<EvalRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewingPrompt, setReviewingPrompt] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [error, setError] = useState('');

  const loadRuns = useCallback(async () => {
    try { setRuns(await evalsApi.list()); setError(''); }
    catch (value) { setError(value instanceof Error ? value.message : 'Could not load eval history.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void loadRuns();
    void evalsApi.prompt().then(({ systemPrompt, supervisorPrompt }) => setConfig((current) => ({ ...current, systemPrompt: current.systemPrompt || systemPrompt, supervisorPrompt: current.supervisorPrompt || supervisorPrompt }))).catch((value) => setError(value instanceof Error ? value.message : 'Could not load the current prompts.'));
  }, [loadRuns]);
  useEffect(() => {
    if (!activeRun || terminal(activeRun.status)) return;
    const poll = window.setInterval(async () => {
      try {
        const next = await evalsApi.get(activeRun.id);
        setActiveRun(next);
        setRuns((items) => items.map((item) => item.id === next.id ? next : item));
        if (!selectedCaseId && next.cases?.length) setSelectedCaseId(next.cases[0].id);
      } catch (value) { setError(value instanceof Error ? value.message : 'Polling failed.'); }
    }, 2000);
    return () => window.clearInterval(poll);
  }, [activeRun, selectedCaseId]);

  const openRun = async (id: string) => {
    try { const run = await evalsApi.get(id); setActiveRun(run); setSelectedCaseId(run.cases?.[0]?.id || null); setError(''); }
    catch (value) { setError(value instanceof Error ? value.message : 'Could not open run.'); }
  };
  const createRun = async () => {
    setSubmitting(true); setError('');
    try { const created = await evalsApi.create(config); const run = await evalsApi.get(created.id); setActiveRun(run); setSelectedCaseId(run.cases?.[0]?.id || null); await loadRuns(); }
    catch (value) { setError(value instanceof Error ? value.message : 'Could not start the suite.'); }
    finally { setSubmitting(false); }
  };
  const toggleArray = <T extends string>(key: 'modes' | 'categories', value: T) => setConfig((current) => {
    const items = current[key] as T[];
    const next = items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
    return next.length ? { ...current, [key]: next } : current;
  });
  const loadComparison = async (id: string) => { setCompareId(id); setCompareRun(id ? await evalsApi.get(id) : null); };
  const improvePrompt = async () => {
    if (!activeRun) return;
    setReviewingPrompt(true); setError('');
    try { const promptReview = await evalsApi.improvePrompt(activeRun.id); setActiveRun({ ...activeRun, promptReview }); }
    catch (value) { setError(value instanceof Error ? value.message : 'Could not improve the prompt.'); }
    finally { setReviewingPrompt(false); }
  };

  const visibleCases = useMemo(() => activeRun?.cases?.filter((item) => caseFilter === 'all' || item.status === caseFilter || item.scenario?.mode === caseFilter) || [], [activeRun, caseFilter]);
  const selectedCase = activeRun?.cases?.find((item) => item.id === selectedCaseId) || visibleCases[0];
  const progress = activeRun ? Math.round((((activeRun.cases || []).filter((item) => ['completed', 'failed', 'canceled'].includes(item.status)).length) / Math.max(activeRun.config.caseCount, 1)) * 100) : 0;

  return (
    <main className="evals-lab">
      <header className="evals-header">
        <div><button className="evals-back" type="button" onClick={() => { window.location.hash = ''; }}><ArrowLeft /> Back to Voxa</button><span className="toolbar-kicker">Internal development tool</span><h1><FlaskConical /> Intelligence Evals</h1><p>Generate adversarial conversations, inspect Voxa insights and measure changes against a consistent rubric.</p></div>
        {activeRun && <div className="evals-run-meta"><span className={`evals-state is-${activeRun.status}`}>{activeRun.status.replaceAll('_', ' ')}</span><code>{activeRun.promptHash?.slice(0, 10)}</code></div>}
      </header>

      {error && <div className="evals-error" role="alert"><AlertTriangle /><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X /></button></div>}

      <div className="evals-layout">
        <aside className="evals-control-panel">
          <section><h2>Suite setup</h2><label>Cases<input type="number" min="1" max="20" value={config.caseCount} onChange={(event) => setConfig({ ...config, caseCount: Number(event.target.value) })} /></label><label>Difficulty<select value={config.difficulty} onChange={(event) => setConfig({ ...config, difficulty: event.target.value as EvalRunConfig['difficulty'] })}><option value="standard">Standard</option><option value="hard">Hard</option><option value="adversarial">Adversarial</option></select></label><label>Transcript language<select value={config.language} onChange={(event) => setConfig({ ...config, language: event.target.value, outputLanguage: event.target.value })}><option value="pt-BR">Portuguese</option><option value="en-US">English</option><option value="es-ES">Spanish</option></select></label></section>
          <section><h3>Analysis modes</h3><div className="evals-option-grid">{MODES.map((mode) => <button type="button" key={mode} className={config.modes.includes(mode) ? 'is-selected' : ''} onClick={() => toggleArray('modes', mode)}>{config.modes.includes(mode) && <Check />}{LABELS[mode]}</button>)}</div></section>
          <section><h3>Scenario mix</h3><div className="evals-option-grid is-compact">{CATEGORIES.map((category) => <button type="button" key={category} className={config.categories.includes(category) ? 'is-selected' : ''} onClick={() => toggleArray('categories', category)}>{LABELS[category]}</button>)}</div></section>
          <section><h3>Models</h3><label>Voxa insight model<input value={config.insightModel} onChange={(event) => setConfig({ ...config, insightModel: event.target.value })} /></label><label>Independent supervisor<input value={config.supervisorModel} onChange={(event) => setConfig({ ...config, supervisorModel: event.target.value })} /></label><PromptDialog config={config} setConfig={setConfig} /></section>
          <button className="button button-primary evals-start" type="button" disabled={submitting || !config.modes.length} onClick={createRun}>{submitting ? <RefreshCw className="spin" /> : <Play />}{submitting ? 'Starting suite' : 'Run suite'}</button>
          {activeRun && !terminal(activeRun.status) && <button className="button button-secondary evals-start" type="button" onClick={async () => { await evalsApi.cancel(activeRun.id); setActiveRun({ ...activeRun, status: 'canceling' }); }}><Square /> Cancel pending cases</button>}
        </aside>

        <section className="evals-workspace">
          {!activeRun ? (
            <div className="evals-empty"><FlaskConical /><h2>{loading ? 'Loading eval history' : 'No run selected'}</h2><p>{loading ? 'Reading previous suites and scorecards.' : 'Configure a suite or open a previous run from the history below.'}</p></div>
          ) : (
            <>
              <div className="evals-progress"><div><strong>{progress}%</strong><span>{(activeRun.cases || []).filter((item) => item.status === 'completed').length} of {activeRun.config.caseCount} completed</span></div><div className="evals-progress-line" aria-label={`${progress}% complete`}><i style={{ width: `${progress}%` }} /></div></div>
              <Scorecard run={activeRun} compareRun={compareRun} />
              <div className="evals-toolbar"><div className="evals-filters">{['all', ...MODES, 'failed'].map((filter) => <button key={filter} type="button" className={caseFilter === filter ? 'is-active' : ''} onClick={() => setCaseFilter(filter)}>{LABELS[filter] || filter}</button>)}</div><div className="evals-toolbar-actions">{terminal(activeRun.status) && <button type="button" className="button button-secondary" onClick={() => void evalsApi.exportCsv(activeRun.id)}><Download /> Export all CSV</button>}<label>Compare<select value={compareId} onChange={(event) => void loadComparison(event.target.value)}><option value="">No baseline</option>{runs.filter((run) => run.id !== activeRun.id && run.summary).map((run) => <option value={run.id} key={run.id}>{new Date(run.createdAt).toLocaleString()} ({run.summary?.overallScore?.toFixed(1)})</option>)}</select></label></div></div>
              <div className="evals-results"><div className="evals-case-list">{visibleCases.map((item) => <CaseRow key={item.id} item={item} active={selectedCase?.id === item.id} onClick={() => setSelectedCaseId(item.id)} />)}</div>{selectedCase && <CaseDetail item={selectedCase} onRetry={async () => { await evalsApi.retry(selectedCase.id); await openRun(activeRun.id); }} onExport={() => evalsApi.exportCsv(activeRun.id, selectedCase.id)} />}</div>
              {terminal(activeRun.status) && <section className="evals-prompt-review"><header><div><h2>AI prompt review</h2><p>Consolidate all completed cases into a concrete prompt revision.</p></div><button type="button" className="button button-primary" disabled={reviewingPrompt} onClick={improvePrompt}>{reviewingPrompt ? <RefreshCw className="spin" /> : <Sparkles />}{reviewingPrompt ? 'Reviewing prompt' : activeRun.promptReview ? 'Run review again' : 'Improve prompt'}</button></header>{activeRun.promptReview ? <div className="evals-prompt-review-body"><div className="evals-review-summary"><strong>Diagnosis</strong><p>{activeRun.promptReview.summary}</p><div><section><h3>Keep</h3>{activeRun.promptReview.recurringStrengths.map((item) => <p key={item}><Check />{item}</p>)}</section><section><h3>Fix</h3>{activeRun.promptReview.recurringFailures.map((item) => <p key={item}><AlertTriangle />{item}</p>)}</section></div></div><div className="evals-adjustments"><h3>Recommended adjustments</h3>{activeRun.promptReview.adjustments.map((item, index) => <article key={`${item.issue}-${index}`}><span>{item.priority}</span><strong>{item.issue}</strong><p>{item.change}</p><small>{item.expectedImpact}</small></article>)}</div><div className="evals-improved-prompt"><header><div><h3>Complete adjusted prompt</h3><small>{activeRun.promptReview.model} / {activeRun.promptReview.totalTokens.toLocaleString()} tokens / {formatMoney(activeRun.promptReview.costUsd)}</small></div><div><button type="button" className="button button-secondary" onClick={async () => { await navigator.clipboard.writeText(activeRun.promptReview!.improvedPrompt); setCopiedPrompt(true); window.setTimeout(() => setCopiedPrompt(false), 1500); }}><ClipboardCopy />{copiedPrompt ? 'Copied' : 'Copy'}</button><button type="button" className="button button-primary" onClick={() => setConfig({ ...config, systemPrompt: activeRun.promptReview!.improvedPrompt })}>Use next run</button></div></header><textarea readOnly value={activeRun.promptReview.improvedPrompt} spellCheck={false} /></div></div> : <div className="evals-review-empty"><Sparkles /><p>Run the AI review after the suite finishes to get a full replacement prompt.</p></div>}</section>}
            </>
          )}
          <section className="evals-history"><div><h2>Run history</h2><button type="button" onClick={() => void loadRuns()} aria-label="Refresh history"><RefreshCw /></button></div>{runs.length === 0 ? <p>No persisted runs yet.</p> : runs.map((run) => <button type="button" key={run.id} className={activeRun?.id === run.id ? 'is-active' : ''} onClick={() => void openRun(run.id)}><span><strong>{new Date(run.createdAt).toLocaleString()}</strong><small>{run.config.caseCount} cases, {run.config.difficulty}</small></span><span><b>{run.summary ? run.summary.overallScore.toFixed(1) : '-'}</b><small>{run.status.replaceAll('_', ' ')}</small></span></button>)}</section>
        </section>
      </div>
    </main>
  );
}

function PromptDialog({ config, setConfig }: { config: EvalRunConfig; setConfig: (value: EvalRunConfig) => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild><button type="button" className="button button-secondary evals-view-prompts"><Settings2 /> View prompts</button></DialogTrigger>
      <DialogContent className="evals-prompts-modal sm:max-w-5xl">
        <DialogHeader><DialogTitle>Run prompts</DialogTitle><DialogDescription>Edit the two system prompts used by this eval. Both are stored in the run fingerprint.</DialogDescription></DialogHeader>
        <div className="evals-prompts-grid">
          <label><span>Voxa insight prompt</span><small>Controls the analysis produced from each transcript.</small><textarea aria-label="Voxa insight prompt" value={config.systemPrompt || ''} onChange={(event) => setConfig({ ...config, systemPrompt: event.target.value })} spellCheck={false} /><b>{(config.systemPrompt || '').length.toLocaleString()} characters</b></label>
          <label><span>Supervisor prompt</span><small>Controls scenario generation, grading and the final prompt review.</small><textarea aria-label="Supervisor prompt" value={config.supervisorPrompt || ''} onChange={(event) => setConfig({ ...config, supervisorPrompt: event.target.value })} spellCheck={false} /><b>{(config.supervisorPrompt || '').length.toLocaleString()} characters</b></label>
        </div>
        <DialogFooter><DialogClose asChild><button type="button" className="button button-primary">Done</button></DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Scorecard({ run, compareRun }: { run: EvalRun; compareRun: EvalRun | null }) {
  const summary = run.summary;
  if (!summary) return <div className="evals-score-skeleton"><span /><span /><span /></div>;
  return <section className="evals-scorecard"><div className="evals-overall"><span>Overall</span><strong>{summary.overallScore.toFixed(1)}</strong>{compareRun?.summary && <small className={summary.overallScore >= compareRun.summary.overallScore ? 'is-positive' : 'is-negative'}>{(summary.overallScore - compareRun.summary.overallScore).toFixed(1)} vs baseline</small>}</div><div className="evals-dimensions">{DIMENSIONS.map((dimension) => <div key={dimension}><span>{LABELS[dimension]}</span><b>{(summary.dimensions?.[dimension] || 0).toFixed(1)}</b>{compareRun?.summary && <small>{((summary.dimensions?.[dimension] || 0) - (compareRun.summary.dimensions?.[dimension] || 0)).toFixed(1)}</small>}</div>)}</div><div className="evals-run-numbers"><div><span>Cost</span><b>{formatMoney(summary.costUsd)}</b></div><div><span>Avg latency</span><b>{formatDuration(summary.averageLatencyMs)}</b></div><div><span>Failures</span><b>{summary.failed}</b></div></div></section>;
}

function CaseRow({ item, active, onClick }: { item: EvalCaseResult; active: boolean; onClick: () => void }) {
  return <button type="button" className={active ? 'evals-case-row is-active' : 'evals-case-row'} onClick={onClick}><span className={`evals-case-status is-${item.status}`}>{item.status === 'completed' ? <Check /> : item.status === 'failed' ? <X /> : <RefreshCw className={!['queued', 'canceled'].includes(item.status) ? 'spin' : ''} />}</span><span><strong>{item.scenario?.title || `Case ${item.position + 1}`}</strong><small>{item.scenario ? `${LABELS[item.scenario.mode]} / ${LABELS[item.scenario.category]}` : item.status}</small></span><b>{item.judgment?.overallScore?.toFixed(1) || '-'}</b></button>;
}

function CaseDetail({ item, onRetry, onExport }: { item: EvalCaseResult; onRetry: () => void; onExport: () => void }) {
  return <article className="evals-case-detail"><header><div><span>Case {item.position + 1}</span><h2>{item.scenario?.title || 'Waiting for scenario'}</h2></div><div>{item.status === 'completed' && <button type="button" className="button button-secondary" onClick={onExport}><Download /> Export CSV</button>}{item.status === 'failed' && <button type="button" className="button button-secondary" onClick={onRetry}><RotateCcw /> Retry</button>}</div></header>{item.error && <div className="evals-inline-error">{item.error}</div>}<div className="evals-detail-grid"><section><h3>Transcript</h3><pre>{item.transcript || 'The supervisor is generating this conversation.'}</pre></section><section><h3>Voxa insights</h3><pre>{item.analysis ? JSON.stringify(item.analysis, null, 2) : 'Insights have not been generated yet.'}</pre></section></div><section className="evals-judge"><h3>Supervisor review</h3>{!item.judgment ? <p>Review pending.</p> : <><div className="evals-verdict"><strong>{item.judgment.overallScore.toFixed(1)}</strong><span>{item.judgment.verdict}</span></div><div className="evals-review-columns"><div><h4>What worked</h4>{item.judgment.strengths.map((text) => <p key={text}><Check />{text}</p>)}</div><div><h4>Improve</h4>{item.judgment.improvements.map((text) => <p key={text}><AlertTriangle />{text}</p>)}</div></div>{item.judgment.promptRecommendation && <div className="evals-recommendation"><strong>Prompt recommendation</strong><p>{item.judgment.promptRecommendation}</p></div>}</>}</section><section className="evals-checks"><h3>Deterministic checks</h3>{(item.deterministicChecks || []).map((check) => <div key={check.id} className={check.passed ? 'is-pass' : 'is-fail'}>{check.passed ? <Check /> : <X />}<span><strong>{check.label}</strong><small>{check.detail}</small></span></div>)}</section></article>;
}
