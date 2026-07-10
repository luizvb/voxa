import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleHelp,
  Lightbulb,
  ListChecks,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface AIAnalysisProps { analysis: any; }

const asArray = (value: any) => Array.isArray(value) ? value : [];
const displayScore = (value: any) => Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}/10` : '—';
const displayMetric = (value: any) => Number.isFinite(Number(value)) ? displayScore(value) : String(value || '—');
const displayLevel = (value: any) => String(value || 'unknown').replaceAll('_', ' ');

function InsightList({ items, empty = '—' }: { items: any[]; empty?: string }) {
  if (!items?.length) return <p className="analysis-muted">{empty}</p>;
  return <ul className="insight-list">{items.map((item, index) => <li key={`${String(item)}-${index}`}>{String(item)}</li>)}</ul>;
}

function SignalCard({ title, icon: Icon, items }: { title: string; icon: any; items: any[] }) {
  return (
    <section className="signal-card">
      <div className="analysis-section-title"><Icon /><span>{title}</span></div>
      <InsightList items={items} />
    </section>
  );
}

export default function AIAnalysis({ analysis }: AIAnalysisProps) {
  const { t } = useLanguage();
  const speakers = asArray(analysis?.speakers);
  const [activeSpeaker, setActiveSpeaker] = useState(speakers[0]?.id || '');

  useEffect(() => {
    if (!speakers.some((speaker) => speaker.id === activeSpeaker)) setActiveSpeaker(speakers[0]?.id || '');
  }, [activeSpeaker, speakers]);

  if (!analysis) return <div className="analysis-empty">{t('ai', 'noData')}</div>;

  const speaker = speakers.find((item: any) => item.id === activeSpeaker) || speakers[0];
  const language = speaker?.language || {};
  const legacy = speaker?.proficiency || {};
  const scores = language.scores || {};
  const signals = analysis.executiveSignals || {};
  const interview = analysis.interview;
  const languageClass = analysis.languageClass;
  const meeting = analysis.meeting;

  return (
    <div className="analysis-view">
      <section className="analysis-hero">
        <div>
          <span className="analysis-kicker"><Sparkles /> {t('ai', 'intelligenceReport')}</span>
          <h3>{analysis.summary?.title || t('ai', 'overview')}</h3>
          <p>{analysis.summary?.overview || '—'}</p>
        </div>
        <div className="analysis-mode-badges">
          {asArray(analysis.analysisModes).map((mode) => <span key={mode}>{t('analysisModes', mode)}</span>)}
        </div>
      </section>

      <div className="executive-signal-grid">
        <SignalCard title={t('ai', 'keyTakeaways')} icon={CheckCircle2} items={asArray(signals.keyTakeaways)} />
        <SignalCard title={t('ai', 'risks')} icon={AlertTriangle} items={asArray(signals.risks)} />
        <SignalCard title={t('ai', 'opportunities')} icon={Lightbulb} items={asArray(signals.opportunities)} />
        <SignalCard title={t('ai', 'openQuestions')} icon={CircleHelp} items={asArray(signals.unresolvedQuestions)} />
      </div>

      {speakers.length > 0 && (
        <section className="analysis-mode-section">
          <header className="mode-section-heading"><div><Users /><span>{t('ai', 'speakerInsights')}</span></div><p>{t('ai', 'speakerInsightsDescription')}</p></header>
          <div className="speaker-tabs" role="tablist" aria-label={t('ai', 'speakers')}>
            {speakers.map((item: any) => (
              <button type="button" role="tab" aria-selected={activeSpeaker === item.id} key={item.id} className={activeSpeaker === item.id ? 'is-active' : ''} onClick={() => setActiveSpeaker(item.id)}>
                {item.id}{item.role ? ` · ${item.role}` : ''}
              </button>
            ))}
          </div>
          {speaker && (
            <>
              <div className="speaker-overview-row">
                <div><small>{t('ai', 'speakerSummary')}</small><p>{speaker.overview || '—'}</p></div>
                <div className="cefr-tile"><small>{t('ai', 'cefrLevel')}</small><strong>{language.cefrEstimate || legacy.level || '?'}</strong></div>
              </div>
              <div className="communication-signal-grid">
                {(['confidence', 'nervousness'] as const).map((key) => {
                  const item = speaker.communicationSignals?.[key] || {};
                  return <article key={key}><header><span>{t('ai', key)}</span><b>{displayLevel(item.level)}</b></header><InsightList items={asArray(item.evidence)} /><p className="analysis-caveat">{item.caveat || t('ai', 'signalCaveat')}</p></article>;
                })}
              </div>
              <div className="proficiency-grid">
                {Object.entries({ grammar: scores.grammar ?? legacy.accuracy, vocabulary: scores.vocabulary ?? legacy.range, fluency: scores.fluency ?? legacy.fluency, intelligibility: scores.intelligibility, coherence: scores.coherence, interaction: scores.interaction ?? legacy.interaction }).map(([key, value]) => (
                  <div key={key}><span>{t('ai', key)}</span><strong>{displayMetric(value)}</strong></div>
                ))}
              </div>
              {(language.feedback || speaker.feedback || speaker.nlp) && <p className="speaker-feedback"><BrainCircuit /> {language.feedback || speaker.feedback || speaker.nlp}</p>}
            </>
          )}
        </section>
      )}

      {interview && (
        <section className="analysis-mode-section">
          <header className="mode-section-heading"><div><BriefcaseBusiness /><span>{t('ai', 'interviewAnalysis')}</span></div><p>{t('ai', 'interviewDescription')}</p></header>
          <div className="interview-score-row">
            <div className="large-score"><strong>{Number(interview.overallScore || 0).toFixed(1)}</strong><span>/10</span><small>{t('ai', 'overallScore')}</small></div>
            <div className="forecast-card"><span>{t('ai', 'outcomeForecast')}</span><strong>{displayLevel(interview.outcomeForecast?.label)}</strong><p>{interview.outcomeForecast?.rationale || '—'}</p><small>{interview.outcomeForecast?.caveat || t('ai', 'forecastCaveat')}</small></div>
          </div>
          <h4 className="analysis-subheading"><BarChart3 /> {t('ai', 'competencies')}</h4>
          <div className="competency-grid">{asArray(interview.competencies).map((item, index) => <article key={`${item.name}-${index}`}><header><strong>{item.name}</strong><b>{displayScore(item.score)}</b></header><InsightList items={asArray(item.evidence)} /><p>{item.gap}</p></article>)}</div>
          <h4 className="analysis-subheading"><MessageCircle /> {t('ai', 'questionReview')}</h4>
          <div className="question-review-list">{asArray(interview.questions).map((item, index) => <article key={`${item.question}-${index}`}><header><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.question}</strong><b>{displayScore(item.score)}</b></header><p>{item.answerSummary}</p><div className="review-columns"><div><small>{t('ai', 'whatWorked')}</small><InsightList items={asArray(item.whatWorked)} /></div><div><small>{t('ai', 'improve')}</small><InsightList items={asArray(item.improve)} /></div></div>{item.betterAnswerOutline && <p className="better-answer"><b>{t('ai', 'betterAnswer')}:</b> {item.betterAnswerOutline}</p>}</article>)}</div>
          <h4 className="analysis-subheading"><Target /> {t('ai', 'preparationPlan')}</h4>
          <div className="plan-list">{asArray(interview.preparationPlan).map((item, index) => <article key={`${item.focus}-${index}`}><span>P{item.priority || index + 1}</span><div><strong>{item.focus}</strong><InsightList items={asArray(item.actions)} /><small>{t('ai', 'successMetric')}: {item.successMetric || '—'}</small></div></article>)}</div>
          <h4 className="analysis-subheading"><CircleHelp /> {t('ai', 'practiceQuestions')}</h4>
          <div className="practice-list">{asArray(interview.practiceQuestions).map((item, index) => <article key={`${item.question}-${index}`}><strong>{item.question}</strong><p>{item.why}</p></article>)}</div>
        </section>
      )}

      {languageClass && (
        <section className="analysis-mode-section">
          <header className="mode-section-heading"><div><BookOpen /><span>{t('ai', 'languageAnalysis')}</span></div><p>{t('ai', 'languageDescription')}</p></header>
          <div className="language-summary-row"><div className="large-score"><strong>{languageClass.overallCefr || '?'}</strong><small>{t('ai', 'cefrEstimate')}</small></div><div className="large-score"><strong>{Number(languageClass.overallScore || 0).toFixed(1)}</strong><span>/10</span><small>{t('ai', 'overallScore')}</small></div></div>
          <div className="analysis-two-column"><SignalCard title={t('ai', 'whatWentWell')} icon={CheckCircle2} items={asArray(languageClass.whatWentWell)} /><SignalCard title={t('ai', 'needsWork')} icon={TrendingUp} items={asArray(languageClass.needsWork)} /></div>
          <h4 className="analysis-subheading"><ShieldCheck /> {t('ai', 'corrections')}</h4>
          <div className="correction-list">{asArray(languageClass.corrections).map((item, index) => <article key={`${item.original}-${index}`}><span className={`priority priority-${item.priority || 'medium'}`}>{item.priority || 'medium'}</span><p className="correction-original">{item.original}</p><p className="correction-better">{item.corrected}</p><small>{item.explanation}</small></article>)}</div>
          <h4 className="analysis-subheading"><CalendarClock /> {t('ai', 'studyPlan')}</h4>
          <div className="plan-list">{asArray(languageClass.studyPlan).map((item, index) => <article key={`${item.period}-${index}`}><span>{item.period || index + 1}</span><div><strong>{item.focus}</strong><InsightList items={asArray(item.activities)} /><small>{t('ai', 'successMetric')}: {item.successMetric || '—'}</small></div></article>)}</div>
        </section>
      )}

      {meeting && (
        <section className="analysis-mode-section">
          <header className="mode-section-heading"><div><Users /><span>{t('ai', 'meetingAnalysis')}</span></div><p>{t('ai', 'meetingDescription')}</p></header>
          <p className="meeting-summary">{meeting.executiveSummary || '—'}</p>
          <div className="analysis-two-column">
            <section className="signal-card"><div className="analysis-section-title"><CheckCircle2 /><span>{t('ai', 'decisions')}</span></div>{asArray(meeting.decisions).map((item, index) => <article className="compact-insight" key={`${item.decision}-${index}`}><strong>{item.decision}</strong><small>{item.owner || t('ai', 'unassigned')}</small></article>)}</section>
            <section className="signal-card"><div className="analysis-section-title"><ListChecks /><span>{t('ai', 'actionItems')}</span></div>{asArray(meeting.actionItems).map((item, index) => <article className="compact-insight" key={`${item.task}-${index}`}><strong>{item.task}</strong><small>{item.owner || t('ai', 'unassigned')} · {item.dueDate || t('ai', 'noDueDate')}</small></article>)}</section>
          </div>
          <div className="analysis-two-column"><SignalCard title={t('ai', 'risks')} icon={AlertTriangle} items={asArray(meeting.risks).map((item) => `${item.risk}${item.impact ? ` — ${item.impact}` : ''}`)} /><SignalCard title={t('ai', 'opportunities')} icon={Lightbulb} items={asArray(meeting.opportunities).map((item) => `${item.opportunity}${item.value ? ` — ${item.value}` : ''}`)} /></div>
          {meeting.nextMeeting && <article className="next-meeting-card"><CalendarClock /><div><small>{t('ai', 'nextMeeting')}</small><strong>{meeting.nextMeeting.objective || '—'}</strong><p>{meeting.nextMeeting.timing}</p><InsightList items={asArray(meeting.nextMeeting.agenda)} /></div></article>}
        </section>
      )}

      <p className="analysis-disclaimer"><ShieldCheck /> {t('ai', 'disclaimer')}</p>
    </div>
  );
}
