import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  Flag,
  Layers3,
  Lightbulb,
  ListChecks,
  MessageCircle,
  Pause,
  Play,
  Quote,
  ShieldCheck,
  Square,
  Target,
  TrendingUp,
  Users,
  Volume2,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { normalizeAnalysisReport } from '../lib/analysis-report';
import { collectLanguageParticipants, scopeLanguageItems, type LanguageItemScope } from '../lib/language-attribution';
import { findTranscriptSegmentForCorrection } from '../lib/transcript-segment-match';
import type { TranscriptSegment } from '../platform';

type AnalysisMode = 'interview' | 'language' | 'meeting';
type PlayAudioSegment = (key: string, startSeconds: number, endSeconds: number) => void;

interface AIAnalysisProps {
  analysis: any;
  grammarAudioEnabled?: boolean;
  transcriptSegments?: TranscriptSegment[];
  audioAvailable?: boolean;
  activeAudioSegmentKey?: string | null;
  isAudioPlaying?: boolean;
  onPlayAudioSegment?: PlayAudioSegment;
  onPauseRecordingAudio?: () => void;
}

const asArray = (value: any) => Array.isArray(value) ? value : [];
const sentence = (value: any, fallback: string) => typeof value === 'string' && value.trim() ? value : fallback;
const level = (value: any) => String(value || 'unknown').replaceAll('_', ' ');
const score = (value: any, _fallback: string) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}/10` : 'N/A';
const statement = (value: any, fallback: string) => sentence(typeof value === 'object' ? value?.statement : value, fallback);

function focusReportTarget(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
}

function Evidence({ items, label }: { items: any[]; label: string }) {
  const evidence = asArray(items).filter((item) => item?.quote || typeof item === 'string');
  if (!evidence.length) return null;
  return (
    <aside className="evidence-disclosure" aria-label={label}>
      <header><Quote aria-hidden="true" /><span>{label}</span><b aria-label={`${evidence.length}`}>{evidence.length}</b></header>
      <div className="evidence-stack">
        {evidence.map((item, index) => {
          const quote = typeof item === 'string' ? item : item.quote;
          const speaker = typeof item === 'object' ? item.speaker : '';
          const citationId = typeof item === 'object' ? item.citationId : '';
          return <blockquote key={`${quote}-${index}`}><header>{citationId && <code>[{citationId}]</code>}{speaker && <b>{speaker}</b>}</header><span>{quote}</span></blockquote>;
        })}
      </div>
    </aside>
  );
}

function ReportSection({ title, icon: Icon, count, children, className = '' }: { title: string; icon: any; count?: number; children: ReactNode; className?: string }) {
  return (
    <section className={`report-section ${className}`}>
      <header className="report-section-heading"><Icon aria-hidden="true" /><h4>{title}</h4>{typeof count === 'number' && <b aria-label={`${count}`}>{count}</b>}</header>
      <div className="report-section-body">{children}</div>
    </section>
  );
}

function EvidenceQuality({ quality, t }: { quality: any; t: any }) {
  const uncertainties = asArray(quality?.transcriptionUncertainties);
  const limitations = asArray(quality?.limitations);
  const missing = asArray(quality?.missingInformation);
  const citationSummary = quality?.citationSummary || {};
  return (
    <ReportSection title={t('ai', 'evidenceQuality')} icon={ShieldCheck} count={limitations.length + missing.length + uncertainties.length} className="evidence-quality-disclosure">
      {quality?.confidenceRationale && <p>{quality.confidenceRationale}</p>}
      <dl className="quality-stats"><div><dt>{t('ai', 'evidenceQuality')}</dt><dd>{level(quality?.level)}</dd></div><div><dt>{t('ai', 'uniqueCitations')}</dt><dd>{citationSummary.uniqueCitations ?? 0}</dd></div><div><dt>{t('ai', 'evidenceReferences')}</dt><dd>{citationSummary.totalReferences ?? 0}</dd></div><div><dt>{t('ai', 'repeatedReferences')}</dt><dd>{citationSummary.repeatedReferences ?? 0}</dd></div></dl>
      {!!limitations.length && <div><h5>{t('ai', 'limitations')}</h5><InsightList items={limitations} empty={t('ai', 'notAvailable')} /></div>}
      {!!missing.length && <div><h5>{t('ai', 'missingInformation')}</h5><InsightList items={missing} empty={t('ai', 'notAvailable')} /></div>}
      {!!uncertainties.length && <div className="transcription-uncertainties"><h5><AlertTriangle aria-hidden="true" />{t('ai', 'transcriptionUncertainties')}</h5>{uncertainties.map((item, index) => <article key={`${item.turnId}-${item.original}-${index}`}><header><b>{item.turnId}</b><span>{level(item.confidence)}</span></header><del>{item.original}</del><p><strong>{t('ai', 'probableReading')}:</strong> {item.probableReading}</p><small>{item.rationale}</small></article>)}</div>}
    </ReportSection>
  );
}

function InsightList({ items, empty }: { items: any[]; empty: string }) {
  if (!items?.length) return <p className="analysis-muted">{empty}</p>;
  return <ul className="insight-list">{items.map((item, index) => <li key={`${String(item)}-${index}`}>{String(item)}</li>)}</ul>;
}

function SectionHeading({ icon: Icon, title, description }: { icon: any; title: string; description?: string }) {
  return <header className="mode-section-heading"><div><Icon aria-hidden="true" /><h3>{title}</h3></div>{description && <p>{description}</p>}</header>;
}

function RegisterHeading({ icon: Icon, title, count, id }: { icon: any; title: string; count?: number; id?: string }) {
  return <header className="register-heading"><div><Icon aria-hidden="true" /><h4 id={id}>{title}</h4></div>{typeof count === 'number' && <span aria-label={`${count}`}>{count}</span>}</header>;
}

function ContextStrip({ items }: { items: Array<{ label: string; value: any }> }) {
  const visible = items.filter((item) => item.value !== null && item.value !== undefined && item.value !== '' && (!Array.isArray(item.value) || item.value.length));
  if (!visible.length) return null;
  return <dl className="analysis-context-strip">{visible.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{Array.isArray(item.value) ? item.value.join(', ') : String(item.value)}</dd></div>)}</dl>;
}

function ScopeLabel({ scope, t }: { scope: LanguageItemScope; t: any }) {
  return scope === 'general' ? <span className="general-context-label">{t('ai', 'generalContext')}</span> : null;
}

function SignalRegister({ title, icon, items, fallback, evidenceLabel, tone = '' }: { title: string; icon: any; items: any[]; fallback: string; evidenceLabel: string; tone?: string }) {
  return <section className={`analysis-register ${tone}`}><RegisterHeading icon={icon} title={title} count={items.length} />{items.length ? <div className="register-rows">{items.map((item, index) => <article key={`${item.signal || item.insight || item.claim}-${index}`}><header><strong>{item.signal || item.insight || item.claim}</strong>{item.severity && <span className="semantic-label">{level(item.severity)}</span>}</header><p>{item.demonstratedBy || item.observedIssue || item.whyItMatters || item.hiringRelevance}</p>{item.hiringRelevance && item.demonstratedBy && <small>{item.hiringRelevance}</small>}{item.missingProof && <p><b>{item.missingProof}</b></p>}{item.verificationQuestion && <p className="next-question">{item.verificationQuestion}</p>}<Evidence items={item.evidence} label={evidenceLabel} /></article>)}</div> : <p className="analysis-muted">{fallback}</p>}</section>;
}

function InterviewReport({ interview, t, fallback }: { interview: any; t: any; fallback: string }) {
  const assessment = interview.executiveAssessment || interview.scorecard || {
    overallScore: interview.overallScore,
    evidenceSignal: interview.outcomeForecast?.label,
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

      <ReportSection title={t('ai', 'overallAssessment')} icon={BriefcaseBusiness}>
      <section className="executive-assessment">
        <div className="large-score"><strong>{score(assessment.overallScore, fallback)}</strong><small>{t('ai', 'overallScore')}</small></div>
        <div><span>{t('ai', 'evidenceSignal')}</span><h4>{level(assessment.evidenceSignal || assessment.outcomeForecast)}</h4><p>{sentence(assessment.rationale, fallback)}</p>{assessment.keyTradeoff && <p className="next-question"><b>{t('ai', 'keyTradeoff')}:</b> {assessment.keyTradeoff}</p>}<div className="assessment-meta"><b>{t('ai', 'confidence')}</b><span>{level(assessment.scoreConfidence)}</span><b>{t('ai', 'decisionReadiness')}</b><span>{level(assessment.decisionReadiness)}</span></div><Evidence items={assessment.evidence} label={t('ai', 'showEvidence')} /><small>{sentence(assessment.caveat, t('ai', 'forecastCaveat'))}</small></div>
      </section>
      </ReportSection>

      <ReportSection title={t('ai', 'signalsAndCompetencies')} icon={Target}>
      <div className="analysis-register-grid">
        <SignalRegister title={t('ai', 'strongestEvidence')} icon={CheckCircle2} items={asArray(interview.strengths)} fallback={fallback} evidenceLabel={t('ai', 'showEvidence')} tone="is-positive" />
        <SignalRegister title={t('ai', 'materialConcerns')} icon={Flag} items={asArray(interview.concerns)} fallback={fallback} evidenceLabel={t('ai', 'showEvidence')} tone="is-warning" />
      </div>

      {!!contradictions.length && <section className="analysis-register is-critical"><RegisterHeading icon={AlertTriangle} title={t('ai', 'contradictions')} count={contradictions.length} /><div className="contradiction-list">{contradictions.map((item, index) => <article key={`${item.topic}-${index}`}><header><strong>{item.topic}</strong></header><div><blockquote>{item.firstStatement}</blockquote><blockquote>{item.secondStatement}</blockquote></div><p>{item.whyItMatters}</p><p className="next-question"><b>{t('ai', 'verifyWith')}:</b> {item.verificationQuestion}</p><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section>}

      <section className="analysis-register"><RegisterHeading icon={Target} title={t('ai', 'competencies')} count={asArray(interview.competencies).length} /><div className="competency-table">{asArray(interview.competencies).map((item, index) => <article key={`${item.name}-${index}`}><header><strong>{item.name}</strong><b>{score(item.score, fallback)}</b></header><div><p>{item.demonstrated || item.assessment}</p><small>{item.missing || item.gap}</small></div><span>{level(item.confidence)}</span><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section>
      </ReportSection>

      <ReportSection title={t('ai', 'evaluatedAnswers')} icon={MessageCircle} count={questions.length}>
      <section className="analysis-register"><RegisterHeading icon={MessageCircle} title={t('ai', 'questionReview')} count={questions.length} /><div className="question-review-list">{questions.map((item, index) => <article key={`${item.question}-${index}`}><header><span>{index + 1}</span><strong>{item.question}</strong><b>{score(item.score, fallback)}</b></header><div className="question-review-body"><p>{item.answerSummary}</p><div className="dimension-grid">{Object.entries(item.dimensions || {}).map(([key, value]) => <div key={key}><small>{t('ai', key)}</small><strong>{score(value, fallback)}</strong></div>)}</div><div className="review-columns"><div><small>{t('ai', 'whatWorked')}</small><InsightList items={asArray(item.whatWorked)} empty={fallback} /></div><div><small>{t('ai', 'improve')}</small><InsightList items={asArray(item.improve)} empty={fallback} /></div></div>{item.betterAnswerOutline && <p className="better-answer"><b>{t('ai', 'betterAnswer')}:</b> {item.betterAnswerOutline}</p>}{!!asArray(item.followUps).length && <div><small>{t('ai', 'followUps')}</small><InsightList items={item.followUps} empty={fallback} /></div>}<Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></div></article>)}</div></section>
      </ReportSection>

      <ReportSection title={t('ai', 'preparationPlan')} icon={ClipboardCheck} count={asArray(coaching.priorities).length}>
      <section className="analysis-register coaching-register"><div className="priority-list">{asArray(coaching.priorities).map((item, index) => <article key={`${item.focus}-${index}`}><span>{item.priority || index + 1}</span><div><strong>{item.focus}</strong><p>{item.basedOn}</p><InsightList items={asArray(item.actions)} empty={fallback} /><small>{t('ai', 'successMetric')}: {sentence(item.successMetric, fallback)}</small><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></div></article>)}</div><div className="coaching-questions"><div><h5>{t('ai', 'candidateQuestions')}</h5>{asArray(coaching.candidateQuestions).map((item, index) => <article key={`${item.question}-${index}`}><strong>{item.question}</strong><p>{item.whyAsk}</p><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div><div><h5>{t('ai', 'practiceQuestions')}</h5>{asArray(coaching.practiceQuestions).map((item, index) => <article key={`${item.question}-${index}`}><strong>{item.question}</strong><p>{item.why}</p><small>{item.targetSignal}</small><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></div></section>
      </ReportSection>
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

interface LanguageReportProps {
  languageClass: any;
  legacySpeakers: any[];
  t: any;
  fallback: string;
  grammarAudioEnabled?: boolean;
  transcriptSegments?: TranscriptSegment[];
  audioAvailable?: boolean;
  activeAudioSegmentKey?: string | null;
  isAudioPlaying?: boolean;
  onPlayAudioSegment?: PlayAudioSegment;
  onPauseRecordingAudio?: () => void;
}

function LanguageReport({
  languageClass,
  legacySpeakers,
  t,
  fallback,
  grammarAudioEnabled,
  transcriptSegments,
  audioAvailable,
  activeAudioSegmentKey,
  isAudioPlaying,
  onPlayAudioSegment,
  onPauseRecordingAudio,
}: LanguageReportProps) {
  const lesson = languageClass.lessonContext || languageClass.lessonBrief || {};
  const learnerProfiles = asArray(languageClass.learnerProfiles);
  const profiles = (learnerProfiles.length
    ? learnerProfiles
    : legacySpeakers.map((speaker) => ({ speaker: speaker.id, cefrEstimate: speaker.language?.cefrEstimate || speaker.proficiency?.level, scores: speaker.language?.scores || {}, strengths: asArray(speaker.language?.strengths).map((insight: string) => ({ signal: insight })), priorities: asArray(speaker.language?.improvements).map((insight: string) => ({ signal: insight })), teacherFeedback: speaker.language?.feedback || speaker.feedback }))).map(normalizeLearner);
  const progress = languageClass.lessonProgress || {};
  const teacherPlan = languageClass.teacherPlan || languageClass.teacherBrief || {};
  const patterns = asArray(languageClass.languagePatterns).length ? asArray(languageClass.languagePatterns) : asArray(progress.recurringPatterns);
  const corrections = asArray(languageClass.corrections);
  const participants = collectLanguageParticipants({
    learnerProfiles,
    legacySpeakers,
    languagePatterns: patterns,
    corrections,
    lessonProgress: progress,
    teacherPlan: { ...teacherPlan, studyPlan: languageClass.studyPlan },
  });
  const [activeLearner, setActiveLearner] = useState(participants[0] || '');
  const [speakingCorrectionKey, setSpeakingCorrectionKey] = useState<string | null>(null);
  const [grammarQueue, setGrammarQueue] = useState({ isPlaying: false, index: 0, total: 0 });
  const [speechSupported] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window);
  const speechRequestRef = useRef(0);
  const grammarQueueRef = useRef<{ key: string; phrase: string }[]>([]);
  const grammarQueuePlayingRef = useRef(false);
  const learnerTabsId = useId().replaceAll(':', '');
  const selectedSpeaker = participants.find((speaker) => speaker.toLocaleLowerCase() === activeLearner.toLocaleLowerCase()) || participants[0] || '';
  const learner = profiles.find((item) => String(item.speaker || '').toLocaleLowerCase() === selectedSpeaker.toLocaleLowerCase());
  const visibleCorrections = scopeLanguageItems(corrections, selectedSpeaker);
  const queuedGrammarCorrections = visibleCorrections
    .filter((entry) => entry.scope === 'participant')
    .map(({ item }) => ({
      key: `${item.original}-${corrections.indexOf(item)}`,
      phrase: typeof item.corrected === 'string' ? item.corrected.trim() : '',
      category: String(item.category || '').toLocaleLowerCase(),
    }))
    .filter((item) => grammarAudioEnabled && item.category === 'grammar' && item.phrase);
  const grammarQueueProgress = `${Math.min(grammarQueue.index + 1, grammarQueue.total)} ${t('ai', 'queueOf')} ${grammarQueue.total}`;
  useEffect(() => { if (!participants.some((speaker) => speaker.toLocaleLowerCase() === activeLearner.toLocaleLowerCase())) setActiveLearner(participants[0] || ''); }, [activeLearner, participants]);
  useEffect(() => () => {
    speechRequestRef.current += 1;
    grammarQueuePlayingRef.current = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);
  const stopBrowserSpeech = () => {
    speechRequestRef.current += 1;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeakingCorrectionKey(null);
    grammarQueuePlayingRef.current = false;
    setGrammarQueue({ isPlaying: false, index: 0, total: 0 });
  };
  const speakCorrection = (key: string, phrase: string, onFinished?: () => void) => {
    if (!speechSupported) return;
    onPauseRecordingAudio?.();
    window.speechSynthesis.cancel();
    const request = ++speechRequestRef.current;
    const utterance = new SpeechSynthesisUtterance(phrase);
    const voices = window.speechSynthesis.getVoices();
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase() === 'en-us')
      || voices.find((voice) => voice.lang.toLowerCase().startsWith('en'))
      || null;
    utterance.onend = utterance.onerror = () => {
      if (speechRequestRef.current !== request) return;
      setSpeakingCorrectionKey(null);
      onFinished?.();
    };
    setSpeakingCorrectionKey(key);
    window.speechSynthesis.speak(utterance);
  };
  const speakCorrectedPhrase = (key: string, phrase: string) => {
    if (!speechSupported) return;
    if (speakingCorrectionKey === key) {
      stopBrowserSpeech();
      return;
    }
    grammarQueuePlayingRef.current = false;
    setGrammarQueue((current) => ({ ...current, isPlaying: false }));
    speakCorrection(key, phrase);
  };
  const playGrammarQueueItem = (index: number) => {
    const entry = grammarQueueRef.current[index];
    if (!entry || !grammarQueuePlayingRef.current) {
      grammarQueuePlayingRef.current = false;
      setGrammarQueue((current) => ({ ...current, isPlaying: false, index: current.total }));
      return;
    }
    setGrammarQueue({ isPlaying: true, index, total: grammarQueueRef.current.length });
    speakCorrection(entry.key, entry.phrase, () => playGrammarQueueItem(index + 1));
  };
  const toggleGrammarQueue = () => {
    if (grammarQueuePlayingRef.current) {
      stopBrowserSpeech();
      return;
    }
    if (!queuedGrammarCorrections.length) return;
    grammarQueueRef.current = queuedGrammarCorrections.map(({ key, phrase }) => ({ key, phrase }));
    grammarQueuePlayingRef.current = true;
    playGrammarQueueItem(0);
  };
  const visiblePatterns = scopeLanguageItems(patterns, selectedSpeaker);
  const visibleSuccessfulUse = scopeLanguageItems(asArray(progress.successfulUse), selectedSpeaker);
  const visibleSelfCorrections = scopeLanguageItems(asArray(progress.selfCorrections), selectedSpeaker);
  const visibleMissedOpportunities = scopeLanguageItems(asArray(progress.missedOpportunities), selectedSpeaker);
  const visibleReinforce = scopeLanguageItems(asArray(teacherPlan.reinforce || teacherPlan.whatToReinforce), selectedSpeaker);
  const visibleNextLessonFocus = scopeLanguageItems(asArray(teacherPlan.nextLessonFocus || languageClass.studyPlan), selectedSpeaker);
  const visibleHomework = scopeLanguageItems(asArray(teacherPlan.homework), selectedSpeaker);
  return (
    <section className={`analysis-mode-section mode-language${grammarQueue.isPlaying ? ' has-playing-queue' : ''}`}>
      <SectionHeading icon={BookOpen} title={t('ai', 'languageAnalysis')} description={t('ai', 'languageTeacherDescription')} />
      {!!participants.length && <label className="language-participant-focus" id={`${learnerTabsId}-label`}><span>{t('ai', 'participantFocus')}</span><select value={selectedSpeaker} onChange={(event) => { stopBrowserSpeech(); setActiveLearner(event.target.value); }}>{participants.map((speaker) => <option key={speaker.toLocaleLowerCase()} value={speaker}>{speaker}</option>)}</select></label>}
      {grammarQueue.isPlaying && <div className="grammar-queue-toolbar is-playing"><div className="grammar-queue-now" aria-live="polite"><span>{selectedSpeaker} · {t('ai', 'grammar')} · {grammarQueueProgress}</span><strong>{queuedGrammarCorrections[grammarQueue.index]?.phrase}</strong></div><div className="grammar-queue-action"><button type="button" onClick={toggleGrammarQueue} aria-pressed="true"><Square aria-hidden="true" /><span>{t('ai', 'stopGrammarQueue')}</span></button></div></div>}
      <ReportSection title={t('ai', 'learnerAssessment')} icon={BookOpen}>
      {lesson.executiveBrief && <section className="manager-brief"><small>{t('ai', 'executiveBrief')}</small><h4>{lesson.executiveBrief}</h4><Evidence items={lesson.evidence} label={t('ai', 'showEvidence')} /></section>}

      {learner ? <section className="learner-profile" id={`${learnerTabsId}-panel`} aria-labelledby={`${learnerTabsId}-label`}><header><div><small>{t('ai', 'learnerAssessment')}</small><h4>{learner.speaker}</h4><p>{learner.overallAssessment || learner.teacherFeedback}</p>{learner.highestLeverageChange && <p className="next-question"><b>{t('ai', 'highestLeverageChange')}:</b> {learner.highestLeverageChange}</p>}</div><div className="learner-level"><strong>{learner.cefr?.level || 'unknown'}</strong><span>CEFR</span><small>{level(learner.cefr?.confidence || learner.evidenceSufficiency)}</small></div></header>{learner.cefr?.rationale && <p className="cefr-rationale">{learner.cefr.rationale}</p>}<div className="skill-table">{Object.entries(learner.skills || {}).map(([key, value]: [string, any]) => <article key={key}><header><strong>{t('ai', key)}</strong><b>{score(value?.score, fallback)}</b></header><p>{value?.observation || fallback}</p><Evidence items={value?.evidence} label={t('ai', 'showEvidence')} /></article>)}</div><div className="analysis-register-grid"><SignalRegister title={t('ai', 'whatToReinforce')} icon={CheckCircle2} items={asArray(learner.strengths)} fallback={fallback} evidenceLabel={t('ai', 'showEvidence')} tone="is-positive" /><SignalRegister title={t('ai', 'priorityGaps')} icon={TrendingUp} items={asArray(learner.priorities).map((item) => ({ ...item, demonstratedBy: item.pattern, hiringRelevance: item.communicationImpact || item.impact, verificationQuestion: item.nextStep }))} fallback={fallback} evidenceLabel={t('ai', 'showEvidence')} tone="is-warning" /></div>{learner.participation && <div className="participation-note"><b>{t('ai', 'participation')}:</b> {level(learner.participation.share)}. {learner.participation.interactionPattern}<Evidence items={learner.participation.evidence} label={t('ai', 'showEvidence')} /></div>}</section> : selectedSpeaker ? <section className="learner-profile-empty" id={`${learnerTabsId}-panel`} aria-labelledby={`${learnerTabsId}-label`}><h4>{selectedSpeaker}</h4><p>{t('ai', 'noProfileForParticipant')}</p></section> : <p className="analysis-muted">{t('ai', 'noProfileForParticipant')}</p>}
      </ReportSection>

      <ReportSection title={t('ai', 'patternsAndCorrections')} icon={Layers3} count={visiblePatterns.length + visibleCorrections.length}>
      <section className="analysis-register"><RegisterHeading icon={Layers3} title={t('ai', 'languagePatterns')} count={visiblePatterns.length} />{visiblePatterns.length ? <div className="pattern-table">{visiblePatterns.map(({ item, scope }, index) => <article key={`${item.pattern}-${index}`}><header><span>{level(item.category || item.frequency)}</span><strong>{item.pattern}</strong><b>{level(item.frequency)}</b></header><ScopeLabel scope={scope} t={t} /><p>{item.impact}</p><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div> : <p className="analysis-muted">{t('ai', 'noPatternsForParticipant')}</p>}</section>

      <section className="analysis-register">
        <RegisterHeading icon={ShieldCheck} title={t('ai', 'corrections')} count={visibleCorrections.length} />
        {!grammarQueue.isPlaying && !!visibleCorrections.length && (
          <div className="grammar-queue-toolbar">
            <div className="grammar-queue-now" aria-live="polite">
              <span>{selectedSpeaker} · {t('ai', 'grammar')} · {grammarQueue.isPlaying ? grammarQueueProgress : queuedGrammarCorrections.length}</span>
              {grammarQueue.isPlaying && <strong>{queuedGrammarCorrections[grammarQueue.index]?.phrase}</strong>}
            </div>
            <div className="grammar-queue-action">
              <button type="button" onClick={toggleGrammarQueue} disabled={!speechSupported || queuedGrammarCorrections.length === 0} aria-pressed={grammarQueue.isPlaying}>
                {grammarQueue.isPlaying ? <Square aria-hidden="true" /> : <Play aria-hidden="true" />}
                <span>{grammarQueue.isPlaying ? `${t('ai', 'stopGrammarQueue')} · ${grammarQueueProgress}` : t('ai', 'playAllGrammar')}</span>
              </button>
              {!speechSupported ? <small>{t('ai', 'speechUnavailable')}</small> : queuedGrammarCorrections.length === 0 ? <small>{t('ai', 'noPlayableGrammar')}</small> : null}
            </div>
          </div>
        )}
        {visibleCorrections.length ? <div className="correction-list">
          {visibleCorrections.map(({ item, scope }) => {
            const correctionKey = `${item.original}-${corrections.indexOf(item)}`;
            const isGrammar = grammarAudioEnabled && String(item.category || '').toLowerCase() === 'grammar';
            const segment = isGrammar ? findTranscriptSegmentForCorrection(transcriptSegments, item) : undefined;
            const segmentKey = segment ? `grammar:${segment.id}` : '';
            const canPlayOriginal = Boolean(
              audioAvailable
              && segment
              && segment.endMs > segment.startMs
              && onPlayAudioSegment,
            );
            const correctedPhrase = typeof item.corrected === 'string' ? item.corrected.trim() : '';
            const canSpeakCorrection = isGrammar && speechSupported && Boolean(correctedPhrase);
            const showAudioComparison = canPlayOriginal || canSpeakCorrection;
            const originalIsPlaying = canPlayOriginal && activeAudioSegmentKey === segmentKey && isAudioPlaying;
            const correctionIsPlaying = speakingCorrectionKey === correctionKey;
            return (
              <article className={`${showAudioComparison ? 'has-audio-comparison ' : ''}${grammarQueue.isPlaying && speakingCorrectionKey === correctionKey ? 'is-current' : ''}`.trim()} key={correctionKey}>
                <header><span className={`priority priority-${item.priority || 'medium'}`}>{item.priority || 'medium'}</span><small>{scope === 'general' ? t('ai', 'generalContext') : selectedSpeaker} {item.category ? `/ ${item.category}` : ''}</small></header>
                <div><p><small>{t('ai', 'youSaid')}</small><del>{item.original}</del></p><p><small>{t('ai', 'suggestedForm')}</small><strong>{item.corrected}</strong></p></div>
                <p>{item.explanation}</p>
                {item.rule && <small>{t('ai', 'rule')}: {item.rule}. {level(item.recurrence)}</small>}
                <Evidence items={item.evidence} label={t('ai', 'showEvidence')} />
                {showAudioComparison && (
                  <div className="grammar-audio-comparison" role="group" aria-label={t('ai', 'compareGrammarAudio')}>
                    {canPlayOriginal && segment && onPlayAudioSegment && (
                      <button
                        type="button"
                        aria-pressed={Boolean(originalIsPlaying)}
                        onClick={() => {
                          stopBrowserSpeech();
                          onPlayAudioSegment(segmentKey, segment.startMs / 1000, segment.endMs / 1000);
                        }}
                      >
                        {originalIsPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
                        <span>{originalIsPlaying ? t('ai', 'pauseOriginalAudio') : t('ai', 'listenOriginalAudio')}</span>
                      </button>
                    )}
                    {canSpeakCorrection && (
                      <button
                        type="button"
                        aria-pressed={correctionIsPlaying}
                        onClick={() => speakCorrectedPhrase(correctionKey, correctedPhrase)}
                      >
                        {correctionIsPlaying ? <Square aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
                        <span>{correctionIsPlaying ? t('ai', 'stopCorrectedAudio') : t('ai', 'listenCorrectedAudio')}</span>
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div> : <p className="analysis-muted">{t('ai', 'noCorrectionsForParticipant')}</p>}
      </section>
      </ReportSection>

      <ReportSection title={t('ai', 'lessonProgress')} icon={TrendingUp} count={visibleSuccessfulUse.length + visibleSelfCorrections.length + visibleMissedOpportunities.length}>
      <section className="analysis-register"><div className="progress-columns"><div><h5>{t('ai', 'successfulUse')}</h5>{visibleSuccessfulUse.map(({ item, scope }, index) => <article key={`${item.skill}-${index}`}><ScopeLabel scope={scope} t={t} /><strong>{item.skill}</strong><p>{item.whySuccessful}</p><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div><div><h5>{t('ai', 'selfCorrections')}</h5>{visibleSelfCorrections.map(({ item, scope }, index) => <article key={`${item.observation}-${index}`}><ScopeLabel scope={scope} t={t} /><strong>{item.observation}</strong><p>{item.significance}</p><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div><div><h5>{t('ai', 'missedOpportunities')}</h5>{visibleMissedOpportunities.map(({ item, scope }, index) => <article key={`${item.opportunity}-${index}`}><ScopeLabel scope={scope} t={t} /><strong>{item.opportunity}</strong><p>{item.coachPrompt}</p><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></div></section>
      </ReportSection>

      <ReportSection title={t('ai', 'nextLessonPlan')} icon={CalendarClock} count={visibleNextLessonFocus.length}>
      <section className="analysis-register coaching-register">{!!visibleReinforce.length && <div className="reinforce-list"><h5>{t('ai', 'whatToReinforce')}</h5>{visibleReinforce.map(({ item, scope }, index) => typeof item === 'string' ? <p key={`${item}-${index}`}><ScopeLabel scope={scope} t={t} />{item}</p> : <article key={`${item.focus}-${index}`}><ScopeLabel scope={scope} t={t} /><strong>{item.focus}</strong><p>{item.reason}</p><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div>}<div className="priority-list">{visibleNextLessonFocus.map(({ item, scope }, index) => <article key={`${item.focus}-${index}`}><span>{index + 1}</span><div><ScopeLabel scope={scope} t={t} /><strong>{item.focus}</strong><p>{item.why}</p><InsightList items={asArray(item.activities)} empty={fallback} /><small>{t('ai', 'successMetric')}: {sentence(item.successMetric, fallback)}</small><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></div></article>)}</div>{!!visibleHomework.length && <div className="homework-list"><h5>{t('ai', 'homework')}</h5>{visibleHomework.map(({ item, scope }, index) => <article key={`${item.task}-${index}`}><ScopeLabel scope={scope} t={t} /><strong>{item.task}</strong><span>{item.durationMinutes ? `${item.durationMinutes} min` : ''}</span><p>{item.basedOn}</p><small>{item.successMetric}</small><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div>}</section>
      </ReportSection>
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

      <ReportSection title={t('ai', 'decisionsAndActions')} icon={CheckCircle2} count={asArray(meeting.decisions).length + asArray(meeting.actionItems).length}>
      <section className="analysis-register"><RegisterHeading icon={CheckCircle2} title={t('ai', 'decisions')} count={asArray(meeting.decisions).length} /><div className="decision-register">{asArray(meeting.decisions).map((item, index) => <article key={`${item.decision}-${index}`}><header><strong>{item.decision}</strong><span>{item.owner || level(item.confidence)}</span></header><p>{item.impact}</p>{item.rationale && <small>{item.rationale}</small>}{item.tradeoffs && <p className="next-question"><b>{t('ai', 'keyTradeoff')}:</b> {item.tradeoffs}</p>}<Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section>

      <section className="analysis-register"><RegisterHeading icon={ListChecks} title={t('ai', 'actionItems')} count={asArray(meeting.actionItems).length} /><div className="action-register"><header><span>{t('ai', 'action')}</span><span>{t('ai', 'owner')}</span><span>{t('ai', 'dueDate')}</span><span>{t('ai', 'dependency')}</span></header>{asArray(meeting.actionItems).map((item, index) => <article key={`${item.task}-${index}`}><strong>{item.task}{item.priority && <small> · {level(item.priority)}</small>}</strong><span>{item.owner || t('ai', 'unassigned')}</span><span>{item.dueDate || t('ai', 'noDueDate')}</span><span>{item.dependency || item.expectedOutcome || fallback}</span><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section>

      <section className="analysis-register"><RegisterHeading icon={MessageCircle} title={t('ai', 'proposals')} count={asArray(meeting.proposals).length} /><div className="proposal-register">{asArray(meeting.proposals).map((item, index) => <article key={`${item.proposal}-${index}`}><header><strong>{item.proposal}</strong><span>{level(item.status)}</span></header><p>{item.implication}</p>{item.proposedBy && <small>{item.proposedBy}</small>}<Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section>
      </ReportSection>

      <ReportSection title={t('ai', 'risksAndPending')} icon={AlertTriangle}>
      <div className="analysis-register-grid"><section className="analysis-register is-warning"><RegisterHeading icon={AlertTriangle} title={t('ai', 'risks')} count={asArray(meeting.risks).length} /><div className="register-rows">{asArray(meeting.risks).map((item, index) => <article key={`${item.risk}-${index}`}><header><strong>{item.risk}</strong><span className="semantic-label">{level(item.severity || item.likelihood || item.basis)}</span></header><p>{item.impact}</p>{item.trigger && <small>{item.trigger}</small>}{item.mitigation && <p className="next-question"><b>{t('ai', 'mitigation')}:</b> {item.mitigation}</p>}<Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section><section className="analysis-register"><RegisterHeading icon={Flag} title={t('ai', 'blockersAndDependencies')} count={asArray(meeting.blockers).length + asArray(meeting.dependencies).length} /><div className="register-rows">{asArray(meeting.blockers).map((item, index) => <article key={`${item.blocker}-${index}`}><strong>{item.blocker}</strong><p>{item.consequence}</p><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}{asArray(meeting.dependencies).map((item, index) => <article key={`${item.dependency}-${index}`}><header><strong>{item.dependency}</strong><span className="semantic-label">{level(item.status)}</span></header>{item.owner && <p>{item.owner}</p>}<Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section></div>
      {!!asArray(meeting.openQuestions).length && <section className="analysis-register"><RegisterHeading icon={CircleHelp} title={t('ai', 'openQuestions')} count={asArray(meeting.openQuestions).length} /><div className="register-rows">{asArray(meeting.openQuestions).map((item, index) => <article key={`${item.question}-${index}`}><strong>{typeof item === 'string' ? item : item.question}</strong>{item.whyItMatters && <p>{item.whyItMatters}</p>}<Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section>}
      {meeting.nextMeeting && <section className="next-meeting-card"><CalendarClock /><div><small>{t('ai', 'nextMeeting')}</small><strong>{sentence(meeting.nextMeeting.objective, fallback)}</strong><p>{meeting.nextMeeting.timing || meeting.nextMeeting.rationale}</p><InsightList items={asArray(meeting.nextMeeting.agenda)} empty={fallback} /></div></section>}
      </ReportSection>

      <ReportSection title={t('ai', 'contextAndParticipants')} icon={Users}>
      <ContextStrip items={[{ label: t('ai', 'purpose'), value: context.purpose }, { label: t('ai', 'participants'), value: context.participants }, { label: t('ai', 'topics'), value: context.topics }]} />
      <section className="manager-brief"><small>{t('ai', 'managerBrief')}</small><h4>{sentence(brief.bottomLine || brief.outcome, fallback)}</h4>{brief.bottomLine && <p>{brief.outcome}</p>}<div><div><b>{t('ai', 'whatChanged')}</b><InsightList items={asArray(brief.whatChanged)} empty={fallback} /></div><div><b>{t('ai', 'needsDecision')}</b><InsightList items={asArray(brief.needsDecision)} empty={fallback} /></div><div><b>{t('ai', 'needsEscalation')}</b><InsightList items={asArray(brief.needsEscalation)} empty={fallback} /></div><div><b>{t('ai', 'managementAttention')}</b><InsightList items={asArray(brief.managementAttention)} empty={fallback} /></div></div><Evidence items={brief.evidence} label={t('ai', 'showEvidence')} /></section>
      {!!participantViews.length && <section className="analysis-register"><RegisterHeading icon={Users} title={t('ai', 'participantViews')} count={participantViews.length} /><div className="participant-register">{participantViews.map((item, index) => <article key={`${item.speaker}-${index}`}><header><strong>{item.speaker}</strong></header><p>{item.position}</p><div><div><small>{t('ai', 'commitments')}</small><InsightList items={asArray(item.commitments)} empty={fallback} /></div><div><small>{t('ai', 'concerns')}</small><InsightList items={asArray(item.concerns)} empty={fallback} /></div></div><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section>}
      {!!asArray(meeting.topics).length && <section className="analysis-register"><RegisterHeading icon={Layers3} title={t('ai', 'topics')} count={asArray(meeting.topics).length} /><div className="topic-register">{asArray(meeting.topics).map((item, index) => <article key={`${item.topic}-${index}`}><header><strong>{item.topic}</strong><span>{level(item.status)}</span></header><p>{item.summary}</p><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section>}
      </ReportSection>

      <ReportSection title={t('ai', 'metricsAndImplications')} icon={TrendingUp}>
      <section className="analysis-register"><RegisterHeading icon={TrendingUp} title={t('ai', 'metrics')} count={asArray(meeting.metrics).length} /><div className="metric-list">{asArray(meeting.metrics).map((item, index) => <article key={`${item.metric}-${index}`}><strong>{item.value}</strong><span>{item.metric}</span><p>{item.context}</p><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section>
      {(!!asArray(meeting.tensions).length || !!asArray(meeting.strategicImplications).length) && <div className="analysis-register-grid"><section className="analysis-register is-warning"><RegisterHeading icon={Layers3} title={t('ai', 'tensions')} count={asArray(meeting.tensions).length} /><div className="register-rows">{asArray(meeting.tensions).map((item, index) => <article key={`${item.topic}-${index}`}><strong>{item.topic}</strong><InsightList items={asArray(item.positions)} empty={fallback} /><p>{item.implication}</p><p className="next-question">{item.resolutionNeeded}</p><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section><section className="analysis-register"><RegisterHeading icon={TrendingUp} title={t('ai', 'strategicImplications')} count={asArray(meeting.strategicImplications).length} /><div className="register-rows">{asArray(meeting.strategicImplications).map((item, index) => <article key={`${item.implication}-${index}`}><header><strong>{item.implication}</strong><span className="semantic-label">{level(item.timeHorizon)}</span></header><p>{item.whyItMatters}</p><Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section></div>}
      </ReportSection>
    </section>
  );
}

export default function AIAnalysis({
  analysis,
  grammarAudioEnabled,
  transcriptSegments,
  audioAvailable,
  activeAudioSegmentKey,
  isAudioPlaying,
  onPlayAudioSegment,
  onPauseRecordingAudio,
}: AIAnalysisProps) {
  const { t } = useLanguage();
  const reportId = useId().replaceAll(':', '');
  const fallback = t('ai', 'notAvailable');
  const report = useMemo(() => normalizeAnalysisReport(analysis), [analysis]);
  const modes = useMemo(() => {
    const declared = asArray(report?.analysisModes).filter((mode): mode is AnalysisMode => ['interview', 'language', 'meeting'].includes(mode));
    if (declared.length) return declared;
    return (['interview', 'language', 'meeting'] as AnalysisMode[]).filter((mode) => report?.[mode === 'language' ? 'languageClass' : mode]);
  }, [report]);
  if (!analysis) return <div className="analysis-empty">{t('ai', 'noData')}</div>;
  const quality = report.evidenceQuality || {};
  const summary = report.summary || {};
  const keyFindings = asArray(summary.keyFindings);
  return (
    <article className="analysis-view" aria-labelledby={`${reportId}-title`}>
      <section className="analysis-hero" id={`${reportId}-overview`} tabIndex={-1}>
        <div><span className="analysis-kicker"><ShieldCheck aria-hidden="true" />{t('ai', 'verifiedReport')}</span><h2 id={`${reportId}-title`}>{summary.title || t('ai', 'overview')}</h2>{summary.purpose && <p className="analysis-purpose"><b>{t('ai', 'purpose')}:</b> {statement(summary.purpose, fallback)}</p>}</div>
        <dl className="analysis-report-stats"><div><dt>{t('ai', 'evidenceQuality')}</dt><dd>{level(quality.level)}</dd></div><div><dt>{t('ai', 'analysisLenses')}</dt><dd>{modes.length}</dd></div><div><dt>{t('ai', 'version')}</dt><dd>v{report.version || 'legacy'}</dd></div></dl>
      </section>

      <nav className="analysis-section-nav" aria-label={t('ai', 'analysisLenses')}>
        <button type="button" onClick={() => focusReportTarget(`${reportId}-summary`)}><Lightbulb aria-hidden="true" /><span>{t('ai', 'summary')}</span></button>
        <button type="button" onClick={() => focusReportTarget(`${reportId}-details`)}><Layers3 aria-hidden="true" /><span>{t('ai', 'detailedAnalysis')}</span></button>
        <button type="button" onClick={() => focusReportTarget(`${reportId}-quality`)}><ShieldCheck aria-hidden="true" /><span>{t('ai', 'evidenceQuality')}</span></button>
      </nav>

      <div className="analysis-executive-flow" id={`${reportId}-summary`} tabIndex={-1}>
        {summary.bottomLine?.statement && <section className="manager-brief"><small>{t('ai', 'bottomLine')} · {level(summary.bottomLine.confidence)}</small><h3>{summary.bottomLine.statement}</h3><Evidence items={summary.bottomLine.evidence} label={t('ai', 'showEvidence')} /></section>}
        {!!keyFindings.length && <section className="analysis-register"><RegisterHeading icon={Target} title={t('ai', 'keyFindings')} count={keyFindings.length} /><div className="register-rows">{keyFindings.map((item, index) => <article key={`${item.finding}-${index}`}><header><strong>{item.finding}</strong><span className="semantic-label">{level(item.confidence)}</span></header><p>{item.significance}</p>{item.businessImpact && <p className="next-question"><b>{t('ai', 'businessImpact')}:</b> {item.businessImpact}</p>}<Evidence items={item.evidence} label={t('ai', 'showEvidence')} /></article>)}</div></section>}
      </div>

      <section className="analysis-lens-workspace" id={`${reportId}-details`} tabIndex={-1} aria-labelledby={`${reportId}-details-title`}>
        <header className="analysis-lens-header"><span>{t('ai', 'analysisLenses')}</span><h2 id={`${reportId}-details-title`}>{t('ai', 'detailedAnalysis')}</h2></header>
        <nav className="analysis-lens-index" aria-label={t('ai', 'analysisLenses')}>{modes.map((mode) => <button type="button" key={mode} onClick={() => focusReportTarget(`${reportId}-mode-${mode}`)}>{mode === 'interview' ? <BriefcaseBusiness aria-hidden="true" /> : mode === 'language' ? <BookOpen aria-hidden="true" /> : <Users aria-hidden="true" />}<span>{t('analysisModes', mode)}</span><small>{t('ai', `${mode}Lens`)}</small></button>)}</nav>
        <div className="analysis-lens-sections">
          {modes.includes('interview') && report.interview && <div className="analysis-lens-panel" id={`${reportId}-mode-interview`} tabIndex={-1}><InterviewReport interview={report.interview} t={t} fallback={fallback} /></div>}
          {modes.includes('language') && report.languageClass && <div className="analysis-lens-panel" id={`${reportId}-mode-language`} tabIndex={-1}><LanguageReport languageClass={report.languageClass} legacySpeakers={asArray(report.speakers)} t={t} fallback={fallback} grammarAudioEnabled={grammarAudioEnabled} transcriptSegments={transcriptSegments} audioAvailable={audioAvailable} activeAudioSegmentKey={activeAudioSegmentKey} isAudioPlaying={isAudioPlaying} onPlayAudioSegment={onPlayAudioSegment} onPauseRecordingAudio={onPauseRecordingAudio} /></div>}
          {modes.includes('meeting') && report.meeting && <div className="analysis-lens-panel" id={`${reportId}-mode-meeting`} tabIndex={-1}><MeetingReport meeting={report.meeting} t={t} fallback={fallback} /></div>}
        </div>
      </section>

      <div id={`${reportId}-quality`} tabIndex={-1}><EvidenceQuality quality={quality} t={t} /></div>
      <p className="analysis-disclaimer"><ShieldCheck aria-hidden="true" />{t('ai', 'disclaimer')}</p>
    </article>
  );
}
