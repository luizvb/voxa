import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Flag,
  Layers3,
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
const score = (value: any, _fallback: string) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}/10` : 'N/A';
const statement = (value: any, fallback: string) => sentence(typeof value === 'object' ? value?.statement : value, fallback);

function Evidence({ items, label }: { items: any[]; label: string }) {
  const evidence = asArray(items).filter((item) => item?.quote || typeof item === 'string');
  if (!evidence.length) return null;
  return (
    <details className="evidence-disclosure">
      <summary><Quote /><span>{label}</span><b>{evidence.length}</b><ChevronDown /></summary>
      <div className="evidence-stack">
        {evidence.map((item, index) => {
          const quote = typeof item === 'string' ? item : item.quote;
          const speaker = typeof item === 'object' ? item.speaker : '';
          return <blockquote key={`${quote}-${index}`}>{speaker && <b>{speaker}</b>}<span>{quote}</span></blockquote>;
        })}
      </div>
    </details>
  );
}

function InsightList({ items, empty }: { items: any[]; empty: string }) {
  if (!items?.length) return <p className="analysis-muted">{empty}</p>;
  return <ul className="insight-list">{items.map((item, index) => <li key={`${String(item)}-${index}`}>{String(item)}</li>)}</ul>;
}

function SectionHeading({ icon: Icon, title, description }: { icon: any; title: string; description?: string }) {
  return <header className="mode-section-heading"><div><Icon /><span>{title}</span></div>{description && <p>{description}</p>}</header>;
}

function RegisterHeading({ icon: Icon, title, count }: { icon: any; title: string; count?: number }) {
  return <header className="register-heading"><div><Icon /><h4>{title}</h4></div>{typeof count === 'number' && <span>{count}</span>}</header>;
}

function ContextStrip({ items }: { items: Array<{ label: string; value: any }> }) {
  const visible = items.filter((item) => item.value !== null && item.value !== undefined && item.value !== '' && (!Array.isArray(item.value) || item.value.length));
  if (!visible.length) return null;
  return <dl className="analysis-context-strip">{visible.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{Array.isArray(item.value) ? item.value.join(', ') : String(item.value)}</dd></div>)}</dl>;
}

function SignalRegister({ title, icon, items, fallback, evidenceLabel, tone = '' }: { title: string; icon: any; items: any[]; fallback: string; evidenceLabel: string; tone?: string }) {
  return <section className={`analysis-register ${tone}`}><RegisterHeading icon={icon} title={title} count={items.length} />{items.length ? <div className="register-rows">{items.map((item, index) => <article key={`${item.signal || item.insight || item.claim}-${index}`}><header><strong>{item.signal || item.insight || item.claim}</strong>{item.severity && <span className="semantic-label">{level(item.severity)}</span>}</header><p>{item.demonstratedBy || item.observedIssue || item.whyItMatters || item.hiringRelevance}</p>{item.hiringRelevance && item.demonstratedBy && <small>{item.hiringRelevance}</small>}{item.missingProof && <p><b>{item.missingProof}</b></p>}{item.verificationQuestion && <p className="next-question">{item.verificationQuestion}</p>}<Evidence items={item.evidence} label={evidenceLabel} /></article>)}</div> : <p className="analysis-muted">{fallback}</p>}</section>;
}

function InterviewReport({ interview, t, fallback }: { interview: any; t: any; fallback: string }) {
  const assessment = interview.executiveAssessment || interview.scorecard || {
    overallScore: interview.overallScore,
    outcomeForecast: interview.outcomeForecast?.label,
    rationale: interview.outcomeForecast?.rationale,
    caveat: interview.outcomeForecast?.caveat,
    evidence: [],
  };
  const context = interview.context || interview.participants || {};
  const coaching = interview.coaching || {
    priorities: interview.preparationPlan,
    candidateQuestions: interview.candidateQuestions,
    practiceQuestions: interview.practiceQuestions,
  };
  const questions = asArray(interview.questionReviews).length ? asArray(interview.questionReviews) : asArray(interview.questions);
  const contradictions = asArray(interview.contradictions);
  return (
    <section className="analysis-mode-section mode-interview">
      <SectionHeading icon={BriefcaseBusiness} title={t('ai', 'interviewAnalysis')} description={t('ai', 'interviewDescription')} />
      <ContextStrip items={[
        { label: t('ai', 'interviewType'), value: context.interviewType },
        { label: t('ai', 'stage'), value: context.stage },
        { label: t('ai', 'targetRole'), value: context.targetRole },
        { label: t('ai', 'candidate'), value: context.candidate },
        { label: t('ai', 'interviewers'), value: context.interviewers },
      ]} />

      <section className="executive-assessment">
        <div className="large-score"><strong>{score(assessment.overallScore, fallback)}</strong><small>{t('ai', 'overallScore')}</small></div>
        <div><span>{t('ai', 'outcomeForecast')}</span><h4>{level(assessment.outcomeForecast)}</h4><p>{sentence(assessment.rationale, fallback)}</p><div className="assessment-meta"><b>{t('ai', 'confidence')}</b><span>{level(assessment.scoreConfidence)}</span></div><Evidence items={assessment.evidence} label={t('ai', 'showEvidence')} /><small>{sentence(assessment.caveat, t('ai', 'forecastCaveat'))}</small></div>
      </section>

      <div className="analysis-register-grid">
        <SignalRegister title={t('ai', 'strongestEvidence')} icon={CheckCircle2} items={asArray(interview.strengths)} fallback={fallback} evidenceLabel={t('ai', 'showEvidence')} tone="is-positive" />
        <SignalRegister title={t('ai', 'materialConcerns')} icon={Flag} items={asArray(interview.concerns)} fallback={fallback} evidenceLabel={t('ai', 'showEvidence')} tone="is-warning" />
      </div>

      {!!contradictions.length && <section className="analysis-register is-critical"><RegisterHeading icon={AlertTriangle} title={t('ai', 'contradictions')} count={contradictions.length} /><div className="contradiction-list">{contradictions.map((item, index) => <article key={`${item.topic}-${index}`}><header><strong>{item.topic}</strong></header><div><blockquote>{item.firstStatement}</blockquote><blockquote>{item.secondStatement}</blockquote></div><p>{item.whyItMatters}</p><p className="next-question"><b>{t('ai', 'verifyWith')}:</b> {item.verificationQuestion}</p><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section>}

      <section className="analysis-register"><RegisterHeading icon={Target} title={t('ai', 'competencies')} count={asArray(interview.competencies).length} /><div className="competency-table">{asArray(interview.competencies).map((item, index) => <article key={`${item.name}-${index}`}><header><strong>{item.name}</strong><b>{score(item.score, fallback)}</b></header><div><p>{item.demonstrated || item.assessment}</p><small>{item.missing || item.gap}</small></div><span>{level(item.confidence)}</span><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section>

      <section className="analysis-register"><RegisterHeading icon={MessageCircle} title={t('ai', 'questionReview')} count={questions.length} /><div className="question-review-list">{questions.map((item, index) => <details key={`${item.question}-${index}`} open={index === 0}><summary><span>{index + 1}</span><strong>{item.question}</strong><b>{score(item.score, fallback)}</b><ChevronDown /></summary><div className="question-review-body"><p>{item.answerSummary}</p><div className="dimension-grid">{Object.entries(item.dimensions || {}).map(([key, value]) => <div key={key}><small>{t('ai', key)}</small><strong>{score(value, fallback)}</strong></div>)}</div><div className="review-columns"><div><small>{t('ai', 'whatWorked')}</small><InsightList items={asArray(item.whatWorked)} empty={fallback} /></div><div><small>{t('ai', 'improve')}</small><InsightList items={asArray(item.improve)} empty={fallback} /></div></div>{item.betterAnswerOutline && <p className="better-answer"><b>{t('ai', 'betterAnswer')}:</b> {item.betterAnswerOutline}</p>}{!!asArray(item.followUps).length && <div><small>{t('ai', 'followUps')}</small><InsightList items={item.followUps} empty={fallback} /></div>}<Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></div></details>)}</div></section>

      <section className="analysis-register coaching-register"><RegisterHeading icon={ClipboardCheck} title={t('ai', 'preparationPlan')} count={asArray(coaching.priorities).length} /><div className="priority-list">{asArray(coaching.priorities).map((item, index) => <article key={`${item.focus}-${index}`}><span>{item.priority || index + 1}</span><div><strong>{item.focus}</strong><p>{item.basedOn}</p><InsightList items={asArray(item.actions)} empty={fallback} /><small>{t('ai', 'successMetric')}: {sentence(item.successMetric, fallback)}</small><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></div></article>)}</div><div className="coaching-questions"><div><h5>{t('ai', 'candidateQuestions')}</h5>{asArray(coaching.candidateQuestions).map((item, index) => <article key={`${item.question}-${index}`}><strong>{item.question}</strong><p>{item.whyAsk}</p><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div><div><h5>{t('ai', 'practiceQuestions')}</h5>{asArray(coaching.practiceQuestions).map((item, index) => <article key={`${item.question}-${index}`}><strong>{item.question}</strong><p>{item.why}</p><small>{item.targetSignal}</small><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></div></section>
    </section>
  );
}

function normalizeLearner(profile: any) {
  const legacySkills = Object.fromEntries(Object.entries(profile?.scores || {}).map(([key, value]) => [key, { score: value, observation: '', evidence: [] }]));
  return {
    ...profile,
    cefr: profile?.cefr || { level: profile?.cefrEstimate, confidence: profile?.evidenceSufficiency, rationale: '' },
    skills: profile?.skills || legacySkills,
  };
}

function LanguageReport({ languageClass, legacySpeakers, t, fallback }: { languageClass: any; legacySpeakers: any[]; t: any; fallback: string }) {
  const lesson = languageClass.lessonContext || languageClass.lessonBrief || {};
  const profiles = (asArray(languageClass.learnerProfiles).length
    ? asArray(languageClass.learnerProfiles)
    : legacySpeakers.map((speaker) => ({ speaker: speaker.id, cefrEstimate: speaker.language?.cefrEstimate || speaker.proficiency?.level, scores: speaker.language?.scores || {}, strengths: asArray(speaker.language?.strengths).map((insight: string) => ({ signal: insight })), priorities: asArray(speaker.language?.improvements).map((insight: string) => ({ signal: insight })), teacherFeedback: speaker.language?.feedback || speaker.feedback }))).map(normalizeLearner);
  const [activeLearner, setActiveLearner] = useState(profiles[0]?.speaker || '');
  useEffect(() => { if (!profiles.some((item) => item.speaker === activeLearner)) setActiveLearner(profiles[0]?.speaker || ''); }, [activeLearner, profiles]);
  const learner = profiles.find((item) => item.speaker === activeLearner) || profiles[0];
  const progress = languageClass.lessonProgress || {};
  const teacherPlan = languageClass.teacherPlan || languageClass.teacherBrief || {};
  const patterns = asArray(languageClass.languagePatterns).length ? asArray(languageClass.languagePatterns) : asArray(progress.recurringPatterns);
  return (
    <section className="analysis-mode-section mode-language">
      <SectionHeading icon={BookOpen} title={t('ai', 'languageAnalysis')} description={t('ai', 'languageTeacherDescription')} />
      <ContextStrip items={[
        { label: t('ai', 'lessonObjective'), value: lesson.objective },
        { label: t('ai', 'targetLanguage'), value: lesson.targetLanguage },
        { label: t('ai', 'learners'), value: lesson.learnerSpeakers },
        { label: t('ai', 'teachers'), value: lesson.teacherSpeakers },
        { label: t('ai', 'topics'), value: lesson.topics },
      ]} />
      <Evidence items={lesson.evidence} label={t('ai', 'showEvidence')} />

      {!!profiles.length && <><div className="speaker-tabs" role="tablist" aria-label={t('ai', 'learners')}>{profiles.map((item) => <button type="button" role="tab" aria-selected={activeLearner === item.speaker} key={item.speaker} className={activeLearner === item.speaker ? 'is-active' : ''} onClick={() => setActiveLearner(item.speaker)}>{item.speaker}</button>)}</div>{learner && <section className="learner-profile"><header><div><small>{t('ai', 'learnerAssessment')}</small><h4>{learner.speaker}</h4><p>{learner.overallAssessment || learner.teacherFeedback}</p></div><div className="learner-level"><strong>{learner.cefr?.level || 'unknown'}</strong><span>CEFR</span><small>{level(learner.cefr?.confidence || learner.evidenceSufficiency)}</small></div></header>{learner.cefr?.rationale && <p className="cefr-rationale">{learner.cefr.rationale}</p>}<div className="skill-table">{Object.entries(learner.skills || {}).map(([key, value]: [string, any]) => <article key={key}><header><strong>{t('ai', key)}</strong><b>{score(value?.score, fallback)}</b></header><p>{value?.observation || fallback}</p><Evidence items={value?.evidence} label={t('ai', 'showEvidence')} /></article>)}</div><div className="analysis-register-grid"><SignalRegister title={t('ai', 'whatToReinforce')} icon={CheckCircle2} items={asArray(learner.strengths)} fallback={fallback} evidenceLabel={t('ai', 'showEvidence')} tone="is-positive" /><SignalRegister title={t('ai', 'priorityGaps')} icon={TrendingUp} items={asArray(learner.priorities).map((item) => ({ ...item, demonstratedBy: item.pattern, hiringRelevance: item.communicationImpact || item.impact, verificationQuestion: item.nextStep }))} fallback={fallback} evidenceLabel={t('ai', 'showEvidence')} tone="is-warning" /></div>{learner.participation && <div className="participation-note"><b>{t('ai', 'participation')}:</b> {level(learner.participation.share)}. {learner.participation.interactionPattern}<Evidence items={learner.participation.evidence} label={t('ai', 'showEvidence')} /></div>}</section>}</>}

      <section className="analysis-register"><RegisterHeading icon={Layers3} title={t('ai', 'languagePatterns')} count={patterns.length} /><div className="pattern-table">{patterns.map((item, index) => <article key={`${item.pattern}-${index}`}><header><span>{level(item.category || item.frequency)}</span><strong>{item.pattern}</strong><b>{level(item.frequency)}</b></header><p>{item.impact}</p><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section>

      <section className="analysis-register"><RegisterHeading icon={ShieldCheck} title={t('ai', 'corrections')} count={asArray(languageClass.corrections).length} /><div className="correction-list">{asArray(languageClass.corrections).map((item, index) => <article key={`${item.original}-${index}`}><header><span className={`priority priority-${item.priority || 'medium'}`}>{item.priority || 'medium'}</span><small>{item.speaker} {item.category ? `/ ${item.category}` : ''}</small></header><div><del>{item.original}</del><strong>{item.corrected}</strong></div><p>{item.explanation}</p>{item.rule && <small>{t('ai', 'rule')}: {item.rule}. {level(item.recurrence)}</small>}<Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section>

      <section className="analysis-register"><RegisterHeading icon={TrendingUp} title={t('ai', 'lessonProgress')} /><div className="progress-columns"><div><h5>{t('ai', 'successfulUse')}</h5>{asArray(progress.successfulUse).map((item, index) => <article key={`${item.skill}-${index}`}><strong>{item.skill}</strong><p>{item.whySuccessful}</p><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div><div><h5>{t('ai', 'selfCorrections')}</h5>{asArray(progress.selfCorrections).map((item, index) => <article key={`${item.observation}-${index}`}><strong>{item.observation}</strong><p>{item.significance}</p><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div><div><h5>{t('ai', 'missedOpportunities')}</h5>{asArray(progress.missedOpportunities).map((item, index) => <article key={`${item.opportunity}-${index}`}><strong>{item.opportunity}</strong><p>{item.coachPrompt}</p><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></div></section>

      <section className="analysis-register coaching-register"><RegisterHeading icon={CalendarClock} title={t('ai', 'nextLessonPlan')} count={asArray(teacherPlan.nextLessonFocus).length} />{!!asArray(teacherPlan.reinforce || teacherPlan.whatToReinforce).length && <div className="reinforce-list"><h5>{t('ai', 'whatToReinforce')}</h5>{asArray(teacherPlan.reinforce || teacherPlan.whatToReinforce).map((item: any, index: number) => typeof item === 'string' ? <p key={item}>{item}</p> : <article key={`${item.focus}-${index}`}><strong>{item.focus}</strong><p>{item.reason}</p><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div>}<div className="priority-list">{asArray(teacherPlan.nextLessonFocus || languageClass.studyPlan).map((item, index) => <article key={`${item.focus}-${index}`}><span>{index + 1}</span><div><strong>{item.focus}</strong><p>{item.why}</p><InsightList items={asArray(item.activities)} empty={fallback} /><small>{t('ai', 'successMetric')}: {sentence(item.successMetric, fallback)}</small><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></div></article>)}</div>{!!asArray(teacherPlan.homework).length && <div className="homework-list"><h5>{t('ai', 'homework')}</h5>{asArray(teacherPlan.homework).map((item, index) => <article key={`${item.task}-${index}`}><strong>{item.task}</strong><span>{item.durationMinutes ? `${item.durationMinutes} min` : ''}</span><p>{item.basedOn}</p><small>{item.successMetric}</small><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div>}</section>
    </section>
  );
}

function MeetingReport({ meeting, t, fallback }: { meeting: any; t: any; fallback: string }) {
  const context = meeting.meetingContext || {};
  const brief = meeting.executiveBrief || meeting.managerBrief || { outcome: meeting.executiveSummary, whatChanged: [], needsDecision: [], needsEscalation: [] };
  const participantViews = asArray(meeting.participantViews).length ? asArray(meeting.participantViews) : asArray(meeting.participantSummaries).map((item) => ({ speaker: item.speaker, position: item.statedPosition, commitments: item.commitments, concerns: [], evidence: item.evidence }));
  return (
    <section className="analysis-mode-section mode-meeting">
      <SectionHeading icon={Users} title={t('ai', 'meetingAnalysis')} description={t('ai', 'managerDescription')} />
      <ContextStrip items={[{ label: t('ai', 'purpose'), value: context.purpose }, { label: t('ai', 'participants'), value: context.participants }, { label: t('ai', 'topics'), value: context.topics }]} />
      <section className="manager-brief"><small>{t('ai', 'managerBrief')}</small><h4>{sentence(brief.outcome, fallback)}</h4><div><div><b>{t('ai', 'whatChanged')}</b><InsightList items={asArray(brief.whatChanged)} empty={fallback} /></div><div><b>{t('ai', 'needsDecision')}</b><InsightList items={asArray(brief.needsDecision)} empty={fallback} /></div><div><b>{t('ai', 'needsEscalation')}</b><InsightList items={asArray(brief.needsEscalation)} empty={fallback} /></div></div><Evidence items={brief.evidence} label={t('ai', 'showEvidence')} /></section>

      <section className="analysis-register"><RegisterHeading icon={CheckCircle2} title={t('ai', 'decisions')} count={asArray(meeting.decisions).length} /><div className="decision-register">{asArray(meeting.decisions).map((item, index) => <article key={`${item.decision}-${index}`}><header><strong>{item.decision}</strong>{item.owner && <span>{item.owner}</span>}</header><p>{item.impact}</p>{item.rationale && <small>{item.rationale}</small>}<Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section>

      <section className="analysis-register"><RegisterHeading icon={ListChecks} title={t('ai', 'actionItems')} count={asArray(meeting.actionItems).length} /><div className="action-register"><header><span>{t('ai', 'action')}</span><span>{t('ai', 'owner')}</span><span>{t('ai', 'dueDate')}</span><span>{t('ai', 'dependency')}</span></header>{asArray(meeting.actionItems).map((item, index) => <article key={`${item.task}-${index}`}><strong>{item.task}</strong><span>{item.owner || t('ai', 'unassigned')}</span><span>{item.dueDate || t('ai', 'noDueDate')}</span><span>{item.dependency || fallback}</span><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section>

      <section className="analysis-register"><RegisterHeading icon={MessageCircle} title={t('ai', 'proposals')} count={asArray(meeting.proposals).length} /><div className="proposal-register">{asArray(meeting.proposals).map((item, index) => <article key={`${item.proposal}-${index}`}><header><strong>{item.proposal}</strong><span>{level(item.status)}</span></header><p>{item.implication}</p>{item.proposedBy && <small>{item.proposedBy}</small>}<Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section>

      <div className="analysis-register-grid"><section className="analysis-register is-warning"><RegisterHeading icon={AlertTriangle} title={t('ai', 'risks')} count={asArray(meeting.risks).length} /><div className="register-rows">{asArray(meeting.risks).map((item, index) => <article key={`${item.risk}-${index}`}><header><strong>{item.risk}</strong><span className="semantic-label">{level(item.likelihood || item.basis)}</span></header><p>{item.impact}</p>{item.mitigation && <p className="next-question"><b>{t('ai', 'mitigation')}:</b> {item.mitigation}</p>}<Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section><section className="analysis-register"><RegisterHeading icon={Flag} title={t('ai', 'blockersAndDependencies')} count={asArray(meeting.blockers).length + asArray(meeting.dependencies).length} /><div className="register-rows">{asArray(meeting.blockers).map((item, index) => <article key={`${item.blocker}-${index}`}><strong>{item.blocker}</strong><p>{item.consequence}</p><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}{asArray(meeting.dependencies).map((item, index) => <article key={`${item.dependency}-${index}`}><header><strong>{item.dependency}</strong><span className="semantic-label">{level(item.status)}</span></header>{item.owner && <p>{item.owner}</p>}<Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section></div>

      {!!participantViews.length && <section className="analysis-register"><RegisterHeading icon={Users} title={t('ai', 'participantViews')} count={participantViews.length} /><div className="participant-register">{participantViews.map((item, index) => <article key={`${item.speaker}-${index}`}><header><strong>{item.speaker}</strong></header><p>{item.position}</p><div><div><small>{t('ai', 'commitments')}</small><InsightList items={asArray(item.commitments)} empty={fallback} /></div><div><small>{t('ai', 'concerns')}</small><InsightList items={asArray(item.concerns)} empty={fallback} /></div></div><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section>}

      <div className="analysis-register-grid"><section className="analysis-register"><RegisterHeading icon={TrendingUp} title={t('ai', 'metrics')} count={asArray(meeting.metrics).length} /><div className="metric-list">{asArray(meeting.metrics).map((item, index) => <article key={`${item.metric}-${index}`}><strong>{item.value}</strong><span>{item.metric}</span><p>{item.context}</p><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section><section className="analysis-register"><RegisterHeading icon={CircleHelp} title={t('ai', 'openQuestions')} count={asArray(meeting.openQuestions).length} /><div className="register-rows">{asArray(meeting.openQuestions).map((item, index) => <article key={`${item.question}-${index}`}><strong>{typeof item === 'string' ? item : item.question}</strong>{item.whyItMatters && <p>{item.whyItMatters}</p>}<Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section></div>

      {!!asArray(meeting.topics).length && <section className="analysis-register"><RegisterHeading icon={Layers3} title={t('ai', 'topics')} count={asArray(meeting.topics).length} /><div className="topic-register">{asArray(meeting.topics).map((item, index) => <article key={`${item.topic}-${index}`}><header><strong>{item.topic}</strong><span>{level(item.status)}</span></header><p>{item.summary}</p><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section>}
      {meeting.nextMeeting && <section className="next-meeting-card"><CalendarClock /><div><small>{t('ai', 'nextMeeting')}</small><strong>{sentence(meeting.nextMeeting.objective, fallback)}</strong><p>{meeting.nextMeeting.timing || meeting.nextMeeting.rationale}</p><InsightList items={asArray(meeting.nextMeeting.agenda)} empty={fallback} /></div></section>}
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
  const summary = analysis.summary || {};
  const brief = summary.executiveBrief || summary.overview;
  const keyPoints = asArray(summary.keyPoints);
  return (
    <div className="analysis-view">
      <section className="analysis-hero">
        <div><span className="analysis-kicker"><ShieldCheck />{t('ai', 'verifiedReport')}</span><h3>{summary.title || t('ai', 'overview')}</h3><p>{statement(brief, fallback)}</p>{summary.purpose && <small className="analysis-purpose">{t('ai', 'purpose')}: {statement(summary.purpose, fallback)}</small>}</div>
        <dl className="analysis-report-stats"><div><dt>{t('ai', 'evidenceQuality')}</dt><dd>{level(quality.level)}</dd></div><div><dt>{t('ai', 'analysisLenses')}</dt><dd>{modes.length}</dd></div><div><dt>{t('ai', 'keyPoints')}</dt><dd>{keyPoints.length}</dd></div><small>v{analysis.version || 'legacy'}</small></dl>
      </section>

      {!!keyPoints.length && <section className="key-point-strip">{keyPoints.slice(0, 5).map((item, index) => <article key={`${item.statement}-${index}`}><span>{level(item.category)}</span><p>{item.statement}</p><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</section>}
      {!!asArray(quality.limitations).length && <section className="analysis-limitations"><AlertTriangle /><div><strong>{t('ai', 'limitations')}</strong><InsightList items={quality.limitations} empty={fallback} /></div></section>}

      <nav className="analysis-lens-tabs" aria-label={t('ai', 'analysisLenses')}>{modes.map((mode) => <button type="button" key={mode} className={activeMode === mode ? 'is-active' : ''} aria-pressed={activeMode === mode} onClick={() => setActiveMode(mode)}>{mode === 'interview' ? <BriefcaseBusiness /> : mode === 'language' ? <BookOpen /> : <Users />}<span>{t('analysisModes', mode)}</span><small>{t('ai', `${mode}Lens`)}</small></button>)}</nav>

      {activeMode === 'interview' && analysis.interview && <InterviewReport interview={analysis.interview} t={t} fallback={fallback} />}
      {activeMode === 'language' && analysis.languageClass && <LanguageReport languageClass={analysis.languageClass} legacySpeakers={asArray(analysis.speakers)} t={t} fallback={fallback} />}
      {activeMode === 'meeting' && analysis.meeting && <MeetingReport meeting={analysis.meeting} t={t} fallback={fallback} />}

      <p className="analysis-disclaimer"><ShieldCheck />{t('ai', 'disclaimer')}</p>
    </div>
  );
}
