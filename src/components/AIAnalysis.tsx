import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  Flag,
  Lightbulb,
  ListChecks,
  MessageCircle,
  Quote,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

type AnalysisMode = 'interview' | 'language' | 'meeting';
interface AIAnalysisProps { analysis: any; }

const asArray = (value: any) => Array.isArray(value) ? value : [];
const sentence = (value: any, fallback: string) => typeof value === 'string' && value.trim() ? value : fallback;
const level = (value: any) => String(value || 'unknown').replaceAll('_', ' ');
const score = (value: any, fallback: string) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}/10` : fallback;

function Evidence({ items }: { items: any[] }) {
  const evidence = asArray(items).filter((item) => item?.quote || typeof item === 'string');
  if (!evidence.length) return null;
  return (
    <div className="evidence-stack">
      {evidence.map((item, index) => {
        const quote = typeof item === 'string' ? item : item.quote;
        const speaker = typeof item === 'object' ? item.speaker : '';
        return <blockquote key={`${quote}-${index}`}><Quote />{speaker && <b>{speaker}</b>}<span>{quote}</span></blockquote>;
      })}
    </div>
  );
}

function InsightList({ items, empty }: { items: any[]; empty: string }) {
  if (!items?.length) return <p className="analysis-muted">{empty}</p>;
  return <ul className="insight-list">{items.map((item, index) => <li key={`${String(item)}-${index}`}>{String(item)}</li>)}</ul>;
}

function SectionHeading({ icon: Icon, title, description }: { icon: any; title: string; description?: string }) {
  return <header className="mode-section-heading"><div><Icon /><span>{title}</span></div>{description && <p>{description}</p>}</header>;
}

function InsightPair({ title, icon: Icon, items, fallback }: { title: string; icon: any; items: any[]; fallback: string }) {
  return <section className="signal-card"><div className="analysis-section-title"><Icon /><span>{title}</span></div><InsightList items={items} empty={fallback} /></section>;
}

function InterviewReport({ interview, t, fallback }: { interview: any; t: any; fallback: string }) {
  const scorecard = interview.scorecard || {
    overallScore: interview.overallScore,
    outcomeForecast: interview.outcomeForecast?.label,
    rationale: interview.outcomeForecast?.rationale,
    caveat: interview.outcomeForecast?.caveat,
    evidence: [],
  };
  const questions = asArray(interview.questionReviews).length ? asArray(interview.questionReviews) : asArray(interview.questions);
  return (
    <section className="analysis-mode-section mode-interview">
      <SectionHeading icon={BriefcaseBusiness} title={t('ai', 'interviewAnalysis')} description={t('ai', 'interviewDescription')} />
      <div className="mode-briefing">
        <div className="large-score"><strong>{score(scorecard.overallScore, fallback)}</strong><small>{t('ai', 'overallScore')}</small></div>
        <div className="forecast-card"><span>{t('ai', 'outcomeForecast')}</span><strong>{level(scorecard.outcomeForecast)}</strong><p>{sentence(scorecard.rationale, fallback)}</p><Evidence items={scorecard.evidence} /><small>{sentence(scorecard.caveat, t('ai', 'forecastCaveat'))}</small></div>
      </div>

      <div className="analysis-two-column">
        <section className="specialist-list is-positive"><h4><CheckCircle2 />{t('ai', 'strongestEvidence')}</h4>{asArray(interview.strengths).map((item, index) => <article key={`${item.insight}-${index}`}><strong>{item.insight}</strong><p>{item.whyItMatters}</p><Evidence items={item.evidence} /></article>)}{!asArray(interview.strengths).length && <p className="analysis-muted">{fallback}</p>}</section>
        <section className="specialist-list is-warning"><h4><Flag />{t('ai', 'materialConcerns')}</h4>{asArray(interview.concerns).map((item, index) => <article key={`${item.insight}-${index}`}><header><strong>{item.insight}</strong><span>{item.severity}</span></header><p>{item.missingEvidence}</p><Evidence items={item.evidence} /></article>)}{!asArray(interview.concerns).length && <p className="analysis-muted">{fallback}</p>}</section>
      </div>

      <h4 className="analysis-subheading"><Target />{t('ai', 'competencies')}</h4>
      <div className="competency-grid">{asArray(interview.competencies).map((item, index) => <article key={`${item.name}-${index}`}><header><strong>{item.name}</strong><b>{score(item.score, fallback)}</b></header><p>{item.assessment || item.gap}</p>{item.assessment && item.gap && <small>{item.gap}</small>}<Evidence items={item.evidence} /></article>)}</div>

      <h4 className="analysis-subheading"><MessageCircle />{t('ai', 'questionReview')}</h4>
      <div className="question-review-list">{questions.map((item, index) => <article key={`${item.question}-${index}`}><header><span>{index + 1}</span><strong>{item.question}</strong><b>{score(item.score, fallback)}</b></header><p>{item.answerSummary}</p><div className="review-columns"><div><small>{t('ai', 'whatWorked')}</small><InsightList items={asArray(item.whatWorked)} empty={fallback} /></div><div><small>{t('ai', 'improve')}</small><InsightList items={asArray(item.improve)} empty={fallback} /></div></div><Evidence items={item.evidence} />{item.betterAnswerOutline && <p className="better-answer"><b>{t('ai', 'betterAnswer')}:</b> {item.betterAnswerOutline}</p>}</article>)}</div>

      <div className="analysis-two-column">
        <section><h4 className="analysis-subheading"><ClipboardCheck />{t('ai', 'preparationPlan')}</h4><div className="plan-list">{asArray(interview.preparationPlan).map((item, index) => <article key={`${item.focus}-${index}`}><span>{item.priority || index + 1}</span><div><strong>{item.focus}</strong>{item.basedOn && <p>{item.basedOn}</p>}<InsightList items={asArray(item.actions)} empty={fallback} /><small>{t('ai', 'successMetric')}: {sentence(item.successMetric, fallback)}</small></div></article>)}</div></section>
        <section><h4 className="analysis-subheading"><CircleHelp />{t('ai', 'candidateQuestions')}</h4><div className="practice-list">{asArray(interview.candidateQuestions).map((item, index) => <article key={`${item.question}-${index}`}><strong>{item.question}</strong><Evidence items={item.evidence} /></article>)}{asArray(interview.practiceQuestions).map((item, index) => <article key={`${item.question}-${index}`}><strong>{item.question}</strong><p>{item.why}</p>{item.targetSignal && <small>{item.targetSignal}</small>}</article>)}</div></section>
      </div>
    </section>
  );
}

function LanguageReport({ languageClass, legacySpeakers, t, fallback }: { languageClass: any; legacySpeakers: any[]; t: any; fallback: string }) {
  const profiles = asArray(languageClass.learnerProfiles).length
    ? asArray(languageClass.learnerProfiles)
    : legacySpeakers.map((speaker) => ({ speaker: speaker.id, cefrEstimate: speaker.language?.cefrEstimate || speaker.proficiency?.level, scores: speaker.language?.scores || {}, strengths: asArray(speaker.language?.strengths).map((insight: string) => ({ insight })), priorities: asArray(speaker.language?.improvements).map((insight: string) => ({ insight })), teacherFeedback: speaker.language?.feedback || speaker.feedback }));
  const [activeLearner, setActiveLearner] = useState(profiles[0]?.speaker || '');
  useEffect(() => { if (!profiles.some((item) => item.speaker === activeLearner)) setActiveLearner(profiles[0]?.speaker || ''); }, [activeLearner, profiles]);
  const learner = profiles.find((item) => item.speaker === activeLearner) || profiles[0];
  const progress = languageClass.lessonProgress || {};
  const teacherBrief = languageClass.teacherBrief || {};
  const corrections = asArray(languageClass.corrections);
  return (
    <section className="analysis-mode-section mode-language">
      <SectionHeading icon={BookOpen} title={t('ai', 'languageAnalysis')} description={t('ai', 'languageTeacherDescription')} />
      {languageClass.lessonBrief && <article className="lesson-brief"><div><small>{t('ai', 'lessonObjective')}</small><strong>{sentence(languageClass.lessonBrief.objective, fallback)}</strong></div><div><small>{t('ai', 'learners')}</small><p>{asArray(languageClass.lessonBrief.learnerSpeakers).join(', ') || fallback}</p></div><Evidence items={languageClass.lessonBrief.evidence} /></article>}

      {!!profiles.length && <><div className="speaker-tabs" role="tablist" aria-label={t('ai', 'learners')}>{profiles.map((item) => <button type="button" role="tab" aria-selected={activeLearner === item.speaker} key={item.speaker} className={activeLearner === item.speaker ? 'is-active' : ''} onClick={() => setActiveLearner(item.speaker)}>{item.speaker}</button>)}</div>{learner && <div className="learner-profile"><div className="learner-level"><small>{t('ai', 'cefrEstimate')}</small><strong>{learner.cefrEstimate || 'unknown'}</strong><span>{learner.evidenceSufficiency || t('ai', 'legacyEstimate')}</span></div><div className="proficiency-grid">{Object.entries(learner.scores || {}).map(([key, value]) => <div key={key}><span>{t('ai', key)}</span><strong>{score(value, fallback)}</strong></div>)}</div><div className="analysis-two-column"><section className="specialist-list is-positive"><h4><CheckCircle2 />{t('ai', 'whatToReinforce')}</h4>{asArray(learner.strengths).map((item, index) => <article key={`${item.insight}-${index}`}><strong>{item.insight}</strong><Evidence items={item.evidence} /></article>)}</section><section className="specialist-list is-warning"><h4><TrendingUp />{t('ai', 'priorityGaps')}</h4>{asArray(learner.priorities).map((item, index) => <article key={`${item.insight}-${index}`}><strong>{item.insight}</strong>{item.pattern && <small>{item.pattern}</small>}<p>{item.impact}</p><Evidence items={item.evidence} /></article>)}</section></div>{learner.teacherFeedback && <p className="teacher-feedback">{learner.teacherFeedback}</p>}</div>}</>}

      <h4 className="analysis-subheading"><ShieldCheck />{t('ai', 'corrections')}</h4>
      <div className="correction-list">{corrections.map((item, index) => <article key={`${item.original}-${index}`}><span className={`priority priority-${item.priority || 'medium'}`}>{item.priority || 'medium'}</span><div><small>{item.speaker} {item.category ? `/${item.category}` : ''}</small><p className="correction-original">{item.original}</p></div><p className="correction-better">{item.corrected}</p><small>{item.explanation}</small></article>)}</div>

      <div className="progress-grid">
        <InsightPair title={t('ai', 'successfulUse')} icon={CheckCircle2} items={asArray(progress.successfulUse).map((item) => item.skill)} fallback={fallback} />
        <InsightPair title={t('ai', 'recurringPatterns')} icon={TrendingUp} items={asArray(progress.recurringPatterns).map((item) => item.pattern)} fallback={fallback} />
        <InsightPair title={t('ai', 'selfCorrections')} icon={ClipboardCheck} items={asArray(progress.selfCorrections).map((item) => item.observation)} fallback={fallback} />
        <InsightPair title={t('ai', 'missedOpportunities')} icon={Lightbulb} items={asArray(progress.missedOpportunities).map((item) => item.opportunity)} fallback={fallback} />
      </div>

      <h4 className="analysis-subheading"><CalendarClock />{t('ai', 'nextLessonPlan')}</h4>
      <div className="plan-list">{asArray(teacherBrief.nextLessonFocus || languageClass.studyPlan).map((item, index) => <article key={`${item.focus}-${index}`}><span>{index + 1}</span><div><strong>{item.focus}</strong><p>{item.why}</p><InsightList items={asArray(item.activities)} empty={fallback} /><small>{t('ai', 'successMetric')}: {sentence(item.successMetric, fallback)}</small><Evidence items={item.evidence} /></div></article>)}</div>
      {!!asArray(teacherBrief.homework).length && <section className="homework-strip"><h4>{t('ai', 'homework')}</h4>{asArray(teacherBrief.homework).map((item, index) => <article key={`${item.task}-${index}`}><strong>{item.task}</strong><span>{item.durationMinutes ? `${item.durationMinutes} min` : ''}</span><small>{item.successMetric}</small></article>)}</section>}
    </section>
  );
}

function MeetingReport({ meeting, t, fallback }: { meeting: any; t: any; fallback: string }) {
  const brief = meeting.managerBrief || { outcome: meeting.executiveSummary, whatChanged: [], needsDecision: [], needsEscalation: [] };
  return (
    <section className="analysis-mode-section mode-meeting">
      <SectionHeading icon={Users} title={t('ai', 'meetingAnalysis')} description={t('ai', 'managerDescription')} />
      <article className="manager-brief"><small>{t('ai', 'managerBrief')}</small><h4>{sentence(brief.outcome, fallback)}</h4><div className="manager-brief-grid"><div><b>{t('ai', 'whatChanged')}</b><InsightList items={asArray(brief.whatChanged)} empty={fallback} /></div><div><b>{t('ai', 'needsDecision')}</b><InsightList items={asArray(brief.needsDecision)} empty={fallback} /></div><div><b>{t('ai', 'needsEscalation')}</b><InsightList items={asArray(brief.needsEscalation)} empty={fallback} /></div></div></article>

      <div className="analysis-two-column">
        <section className="specialist-list is-positive"><h4><CheckCircle2 />{t('ai', 'decisions')}</h4>{asArray(meeting.decisions).map((item, index) => <article key={`${item.decision}-${index}`}><strong>{item.decision}</strong><p>{item.impact}</p>{item.owner && <small>{t('ai', 'owner')}: {item.owner}</small>}<Evidence items={typeof item.evidence === 'string' ? [item.evidence] : item.evidence} /></article>)}{!asArray(meeting.decisions).length && <p className="analysis-muted">{fallback}</p>}</section>
        <section className="specialist-list"><h4><ListChecks />{t('ai', 'actionItems')}</h4>{asArray(meeting.actionItems).map((item, index) => <article key={`${item.task}-${index}`}><strong>{item.task}</strong><div className="action-meta"><span>{item.owner || t('ai', 'unassigned')}</span><span>{item.dueDate || t('ai', 'noDueDate')}</span></div><Evidence items={typeof item.evidence === 'string' ? [item.evidence] : item.evidence} /></article>)}{!asArray(meeting.actionItems).length && <p className="analysis-muted">{fallback}</p>}</section>
      </div>

      <h4 className="analysis-subheading"><MessageCircle />{t('ai', 'proposals')}</h4>
      <div className="proposal-grid">{asArray(meeting.proposals).map((item, index) => <article key={`${item.proposal}-${index}`}><header><strong>{item.proposal}</strong><span>{item.status}</span></header>{item.proposedBy && <p>{item.proposedBy}</p>}<Evidence items={item.evidence} /></article>)}</div>

      <div className="progress-grid">
        <InsightPair title={t('ai', 'risks')} icon={AlertTriangle} items={asArray(meeting.risks).map((item) => `${item.risk}${item.basis ? ` (${item.basis})` : ''}`)} fallback={fallback} />
        <InsightPair title={t('ai', 'blockers')} icon={Flag} items={asArray(meeting.blockers).map((item) => item.blocker)} fallback={fallback} />
        <InsightPair title={t('ai', 'openQuestions')} icon={CircleHelp} items={asArray(meeting.openQuestions).map((item) => typeof item === 'string' ? item : item.question)} fallback={fallback} />
        <InsightPair title={t('ai', 'metrics')} icon={TrendingUp} items={asArray(meeting.metrics).map((item) => `${item.metric}: ${item.value}`)} fallback={fallback} />
      </div>

      {!!asArray(meeting.topics).length && <section className="topic-list"><h4>{t('ai', 'topics')}</h4>{asArray(meeting.topics).map((item, index) => <article key={`${item.topic}-${index}`}><header><strong>{item.topic}</strong><span>{item.status}</span></header><p>{item.summary}</p><Evidence items={item.evidence} /></article>)}</section>}
      {meeting.nextMeeting && <article className="next-meeting-card"><CalendarClock /><div><small>{t('ai', 'nextMeeting')}</small><strong>{sentence(meeting.nextMeeting.objective, fallback)}</strong><p>{meeting.nextMeeting.timing || meeting.nextMeeting.rationale}</p><InsightList items={asArray(meeting.nextMeeting.agenda)} empty={fallback} /></div></article>}
    </section>
  );
}

export default function AIAnalysis({ analysis }: AIAnalysisProps) {
  const { t } = useLanguage();
  const fallback = t('ai', 'notAvailable');
  const modes = useMemo(() => {
    const declared = asArray(analysis?.analysisModes).filter((mode): mode is AnalysisMode => ['interview', 'language', 'meeting'].includes(mode));
    if (declared.length) return declared;
    return (['interview', 'language', 'meeting'] as AnalysisMode[]).filter((mode) => analysis?.[mode === 'language' ? 'languageClass' : mode]);
  }, [analysis]);
  const [activeMode, setActiveMode] = useState<AnalysisMode>(modes[0] || 'language');
  useEffect(() => { if (!modes.includes(activeMode)) setActiveMode(modes[0] || 'language'); }, [activeMode, modes]);

  if (!analysis) return <div className="analysis-empty">{t('ai', 'noData')}</div>;
  const quality = analysis.evidenceQuality || {};
  return (
    <div className="analysis-view">
      <section className="analysis-hero">
        <div><span className="analysis-kicker"><ShieldCheck />{t('ai', 'verifiedReport')}</span><h3>{analysis.summary?.title || t('ai', 'overview')}</h3><p>{sentence(analysis.summary?.overview, fallback)}</p></div>
        <div className={`evidence-quality is-${quality.level || 'unknown'}`}><small>{t('ai', 'evidenceQuality')}</small><strong>{level(quality.level)}</strong><span>v{analysis.version || 'legacy'}</span></div>
      </section>

      {!!asArray(quality.limitations).length && <section className="analysis-limitations"><AlertTriangle /><div><strong>{t('ai', 'limitations')}</strong><InsightList items={quality.limitations} empty={fallback} /></div></section>}

      <nav className="analysis-lens-tabs" aria-label={t('ai', 'analysisLenses')}>{modes.map((mode) => <button type="button" key={mode} className={activeMode === mode ? 'is-active' : ''} aria-pressed={activeMode === mode} onClick={() => setActiveMode(mode)}>{mode === 'interview' ? <BriefcaseBusiness /> : mode === 'language' ? <BookOpen /> : <Users />}<span>{t('analysisModes', mode)}</span><small>{t('ai', `${mode}Lens`)}</small></button>)}</nav>

      {activeMode === 'interview' && analysis.interview && <InterviewReport interview={analysis.interview} t={t} fallback={fallback} />}
      {activeMode === 'language' && analysis.languageClass && <LanguageReport languageClass={analysis.languageClass} legacySpeakers={asArray(analysis.speakers)} t={t} fallback={fallback} />}
      {activeMode === 'meeting' && analysis.meeting && <MeetingReport meeting={analysis.meeting} t={t} fallback={fallback} />}

      <p className="analysis-disclaimer"><ShieldCheck />{t('ai', 'disclaimer')}</p>
    </div>
  );
}
