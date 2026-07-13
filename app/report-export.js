function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function text(value, fallback = 'Not determinable from the transcript') {
  return escapeHtml(value === null || value === undefined || value === '' ? fallback : value);
}

function array(value) { return Array.isArray(value) ? value : []; }
function score(value) { if (value === null || value === undefined || value === '') return 'N/A'; const parsed = Number(value); return Number.isFinite(parsed) ? Math.max(0, Math.min(10, parsed)).toFixed(1) : 'N/A'; }
function label(value) { return String(value || 'unknown').replaceAll('_', ' '); }

const COPY = {
  en: { report: 'Specialist conversation report', recorded: 'Recorded', generated: 'Generated', modes: 'Analysis lenses', quality: 'Evidence quality', limitations: 'Evidence limitations', interview: 'Interview analysis', language: 'Language lesson analysis', meeting: 'Meeting analysis', score: 'Overall score', forecast: 'Directional forecast', strengths: 'Strongest evidence', concerns: 'Material concerns', competencies: 'Competencies', questions: 'Question-by-question review', plan: 'Preparation plan', candidateQuestions: 'Candidate and practice questions', objective: 'Lesson objective', learners: 'Learners', corrections: 'Priority corrections', progress: 'Lesson progress', reinforce: 'What to reinforce', priorities: 'Priority gaps', nextLesson: 'Next lesson plan', homework: 'Homework', managerBrief: 'Manager brief', changed: 'What changed', decisionNeeded: 'Needs a decision', escalation: 'Needs escalation', decisions: 'Confirmed decisions', actions: 'Explicit action items', proposals: 'Open proposals', risks: 'Risks', blockers: 'Blockers', openQuestions: 'Open questions', metrics: 'Metrics', topics: 'Topics', nextMeeting: 'Recommended next meeting', evidence: 'Transcript evidence', owner: 'Owner', due: 'Due date', unassigned: 'Not explicitly assigned', noDate: 'Not explicitly stated', verify: 'AI-generated analysis should be checked against the transcript. Recommendations are guidance, not transcript facts.' },
  pt: { report: 'Relatório especialista da conversa', recorded: 'Gravado em', generated: 'Gerado em', modes: 'Perspectivas de análise', quality: 'Qualidade das evidências', limitations: 'Limitações das evidências', interview: 'Análise de entrevista', language: 'Análise da aula de idioma', meeting: 'Análise da reunião', score: 'Nota geral', forecast: 'Expectativa direcional', strengths: 'Evidências mais fortes', concerns: 'Pontos de atenção', competencies: 'Competências', questions: 'Análise pergunta a pergunta', plan: 'Plano de preparação', candidateQuestions: 'Perguntas do candidato e para prática', objective: 'Objetivo da aula', learners: 'Alunos', corrections: 'Correções prioritárias', progress: 'Progresso da aula', reinforce: 'O que reforçar', priorities: 'Prioridades de evolução', nextLesson: 'Plano da próxima aula', homework: 'Tarefa de casa', managerBrief: 'Briefing do gerente', changed: 'O que mudou', decisionNeeded: 'Precisa de decisão', escalation: 'Precisa escalar', decisions: 'Decisões confirmadas', actions: 'Pontos de ação explícitos', proposals: 'Propostas em aberto', risks: 'Riscos', blockers: 'Bloqueios', openQuestions: 'Perguntas em aberto', metrics: 'Métricas', topics: 'Tópicos', nextMeeting: 'Próxima reunião recomendada', evidence: 'Evidência da transcrição', owner: 'Responsável', due: 'Prazo', unassigned: 'Não atribuído explicitamente', noDate: 'Não informado explicitamente', verify: 'A análise gerada por IA deve ser conferida na transcrição. Recomendações são orientações, não fatos da conversa.' },
  es: { report: 'Informe especialista de la conversación', recorded: 'Grabado', generated: 'Generado', modes: 'Perspectivas de análisis', quality: 'Calidad de la evidencia', limitations: 'Limitaciones de la evidencia', interview: 'Análisis de entrevista', language: 'Análisis de la clase de idioma', meeting: 'Análisis de la reunión', score: 'Puntuación general', forecast: 'Previsión orientativa', strengths: 'Evidencias más sólidas', concerns: 'Puntos de atención', competencies: 'Competencias', questions: 'Revisión pregunta por pregunta', plan: 'Plan de preparación', candidateQuestions: 'Preguntas del candidato y de práctica', objective: 'Objetivo de la clase', learners: 'Alumnos', corrections: 'Correcciones prioritarias', progress: 'Progreso de la clase', reinforce: 'Qué reforzar', priorities: 'Prioridades de mejora', nextLesson: 'Plan de la próxima clase', homework: 'Tarea', managerBrief: 'Resumen para el gerente', changed: 'Qué cambió', decisionNeeded: 'Necesita decisión', escalation: 'Necesita escalar', decisions: 'Decisiones confirmadas', actions: 'Acciones explícitas', proposals: 'Propuestas abiertas', risks: 'Riesgos', blockers: 'Bloqueos', openQuestions: 'Preguntas abiertas', metrics: 'Métricas', topics: 'Temas', nextMeeting: 'Próxima reunión recomendada', evidence: 'Evidencia de la transcripción', owner: 'Responsable', due: 'Fecha', unassigned: 'No asignado explícitamente', noDate: 'No indicado explícitamente', verify: 'El análisis generado por IA debe verificarse con la transcripción. Las recomendaciones son orientación, no hechos de la conversación.' },
};

const DETAIL_COPY = {
  en: { whatWorked: 'What worked', improve: 'Improve', betterAnswer: 'Better answer outline', success: 'Success', successfulUse: 'Successful use', recurringPatterns: 'Recurring patterns', selfCorrections: 'Self-corrections', missedOpportunities: 'Missed opportunities', explicit: 'explicit', inferred: 'inferred', open: 'open', resolved: 'resolved', accepted: 'accepted', rejected: 'rejected', deferred: 'deferred' },
  pt: { whatWorked: 'O que funcionou', improve: 'Como melhorar', betterAnswer: 'Estrutura de resposta melhor', success: 'Sucesso', successfulUse: 'Acertos observados', recurringPatterns: 'Padrões recorrentes', selfCorrections: 'Autocorreções', missedOpportunities: 'Oportunidades perdidas', explicit: 'explícito', inferred: 'inferido', open: 'aberto', resolved: 'resolvido', accepted: 'aceito', rejected: 'rejeitado', deferred: 'adiado' },
  es: { whatWorked: 'Qué funcionó', improve: 'Cómo mejorar', betterAnswer: 'Mejor estructura de respuesta', success: 'Éxito', successfulUse: 'Aciertos observados', recurringPatterns: 'Patrones recurrentes', selfCorrections: 'Autocorrecciones', missedOpportunities: 'Oportunidades perdidas', explicit: 'explícito', inferred: 'inferido', open: 'abierto', resolved: 'resuelto', accepted: 'aceptado', rejected: 'rechazado', deferred: 'aplazado' },
};

const SUMMARY_COPY = {
  en: { purpose: 'Purpose', keyPoints: 'Key points' },
  pt: { purpose: 'Objetivo', keyPoints: 'Pontos principais' },
  es: { purpose: 'Objetivo', keyPoints: 'Puntos principales' },
};

function languageFor(locale) { return String(locale || '').toLowerCase().startsWith('pt') ? 'pt' : String(locale || '').toLowerCase().startsWith('es') ? 'es' : 'en'; }
function enumLabel(value, copy) { return copy[String(value || '').toLowerCase()] || value; }

function list(items, mapper = (item) => item, empty = 'No grounded items identified') {
  if (!array(items).length) return `<p class="muted">${escapeHtml(empty)}</p>`;
  return `<ul>${array(items).map((item) => `<li>${text(mapper(item))}</li>`).join('')}</ul>`;
}

function evidence(items, copy) {
  const valid = array(items).filter((item) => item && (typeof item === 'string' || item.quote));
  if (!valid.length) return '';
  return `<div class="evidence"><small>${escapeHtml(copy.evidence)}</small>${valid.map((item) => {
    const quote = typeof item === 'string' ? item : item.quote;
    const speaker = typeof item === 'object' ? item.speaker : '';
    return `<blockquote>${speaker ? `<b>${text(speaker)}</b>` : ''}<span>${text(quote)}</span></blockquote>`;
  }).join('')}</div>`;
}

function section(title, body, className = '') { return `<section class="section ${className}"><h2>${escapeHtml(title)}</h2>${body}</section>`; }

function itemCards(items, titleField, body, copy, empty) {
  if (!array(items).length) return `<p class="muted">${escapeHtml(empty)}</p>`;
  return `<div class="cards">${array(items).map((item) => `<article><h4>${text(item[titleField])}</h4>${body(item)}${evidence(typeof item.evidence === 'string' ? [item.evidence] : item.evidence, copy)}</article>`).join('')}</div>`;
}

function buildInterview(interview, copy) {
  if (!interview) return '';
  const scorecard = interview.executiveAssessment || interview.scorecard || { overallScore: interview.overallScore, outcomeForecast: interview.outcomeForecast?.label, rationale: interview.outcomeForecast?.rationale, caveat: interview.outcomeForecast?.caveat };
  const questions = array(interview.questionReviews).length ? interview.questionReviews : interview.questions;
  const coaching = interview.coaching || { priorities: interview.preparationPlan, candidateQuestions: interview.candidateQuestions, practiceQuestions: interview.practiceQuestions };
  return section(copy.interview, `
    <div class="score-row"><div class="score"><span>${score(scorecard.overallScore)}</span><small>${copy.score}</small></div><div class="forecast"><small>${copy.forecast}</small><h3>${text(label(scorecard.outcomeForecast))}</h3><p>${text(scorecard.rationale)}</p>${evidence(scorecard.evidence, copy)}<p class="note">${text(scorecard.caveat)}</p></div></div>
    <div class="columns"><div><h3>${copy.strengths}</h3>${itemCards(interview.strengths, interview.strengths?.[0]?.signal ? 'signal' : 'insight', (item) => `<p>${text(item.demonstratedBy || item.whyItMatters)}</p><p class="note">${text(item.hiringRelevance, '')}</p>`, copy, 'No grounded strengths identified')}</div><div><h3>${copy.concerns}</h3>${itemCards(interview.concerns, interview.concerns?.[0]?.signal ? 'signal' : 'insight', (item) => `<p>${text(item.observedIssue || item.missingEvidence)}</p><p class="note">${text(item.missingProof, '')}</p><p class="tag">${text(item.severity)}</p>`, copy, 'No grounded concerns identified')}</div></div>
    <h3>${copy.competencies}</h3>${itemCards(interview.competencies, 'name', (item) => `<strong>${score(item.score)}/10</strong><p>${text(item.demonstrated || item.assessment || item.gap)}</p>${item.missing || (item.assessment && item.gap) ? `<p class="note">${text(item.missing || item.gap)}</p>` : ''}`, copy, 'No grounded competencies identified')}
    <h3>${copy.questions}</h3>${array(questions).map((item, index) => `<article class="question"><header><b>${index + 1}. ${text(item.question)}</b><strong>${score(item.score)}/10</strong></header><p>${text(item.answerSummary)}</p><div class="columns"><div><small>${copy.whatWorked}</small>${list(item.whatWorked)}</div><div><small>${copy.improve}</small>${list(item.improve)}</div></div>${evidence(item.evidence, copy)}${item.betterAnswerOutline ? `<p class="callout"><b>${copy.betterAnswer}:</b> ${text(item.betterAnswerOutline)}</p>` : ''}</article>`).join('') || '<p class="muted">No grounded questions identified</p>'}
    <h3>${copy.plan}</h3>${array(coaching.priorities).map((item) => `<article><h4>${text(item.priority)}. ${text(item.focus)}</h4>${item.basedOn ? `<p>${text(item.basedOn)}</p>` : ''}${list(item.actions)}<p class="note">${copy.success}: ${text(item.successMetric)}</p></article>`).join('') || '<p class="muted">No preparation plan generated</p>'}
    <h3>${copy.candidateQuestions}</h3>${list([...(array(coaching.candidateQuestions)), ...(array(coaching.practiceQuestions))], (item) => `${item.question}${item.why || item.whyAsk ? `: ${item.why || item.whyAsk}` : ''}`)}
  `, 'mode-section');
}

function buildLanguage(languageClass, legacySpeakers, copy) {
  if (!languageClass) return '';
  const profiles = array(languageClass.learnerProfiles).length ? languageClass.learnerProfiles : array(legacySpeakers).map((speaker) => ({ speaker: speaker.id, cefrEstimate: speaker.language?.cefrEstimate || speaker.proficiency?.level, scores: speaker.language?.scores || {}, strengths: array(speaker.language?.strengths).map((insight) => ({ insight })), priorities: array(speaker.language?.improvements).map((insight) => ({ insight })), teacherFeedback: speaker.language?.feedback || speaker.feedback }));
  const brief = languageClass.lessonContext || languageClass.lessonBrief || {};
  const progress = languageClass.lessonProgress || {};
  const teacher = languageClass.teacherPlan || languageClass.teacherBrief || {};
  return section(copy.language, `
    <div class="lesson-brief"><div><small>${copy.objective}</small><h3>${text(brief.objective)}</h3></div><div><small>${copy.learners}</small><p>${text(array(brief.learnerSpeakers).join(', '))}</p></div>${evidence(brief.evidence, copy)}</div>
    ${profiles.map((profile) => { const skills = profile.skills || Object.fromEntries(Object.entries(profile.scores || {}).map(([key, value]) => [key, { score: value }])); return `<article class="learner"><header><div><small>${copy.learners}</small><h3>${text(profile.speaker)}</h3></div><div class="level"><strong>${text(profile.cefr?.level || profile.cefrEstimate, 'unknown')}</strong><small>CEFR</small></div></header><div class="metrics">${Object.entries(skills).map(([key, value]) => `<div><small>${text(key)}</small><b>${score(value?.score)}</b></div>`).join('')}</div><div class="columns"><div><h3>${copy.reinforce}</h3>${itemCards(profile.strengths, profile.strengths?.[0]?.signal ? 'signal' : 'insight', () => '', copy, 'No grounded strengths identified')}</div><div><h3>${copy.priorities}</h3>${itemCards(profile.priorities, profile.priorities?.[0]?.signal ? 'signal' : 'insight', (item) => `${item.pattern ? `<p class="note">${text(item.pattern)}</p>` : ''}<p>${text(item.communicationImpact || item.impact)}</p>`, copy, 'No grounded priorities identified')}</div></div>${profile.teacherFeedback ? `<p class="callout">${text(profile.teacherFeedback)}</p>` : ''}</article>`; }).join('')}
    <h3>${copy.corrections}</h3><div class="corrections">${array(languageClass.corrections).map((item) => `<article><header><span class="tag">${text(item.priority)}</span><b>${text(item.speaker)} / ${text(item.category)}</b></header><div class="correction"><del>${text(item.original)}</del><strong>${text(item.corrected)}</strong></div><p>${text(item.explanation)}</p></article>`).join('') || '<p class="muted">No reliable corrections identified</p>'}</div>
    <h3>${copy.progress}</h3><div class="quad"><div><h4>${copy.successfulUse}</h4>${list(progress.successfulUse, (item) => item.skill)}</div><div><h4>${copy.recurringPatterns}</h4>${list(progress.recurringPatterns, (item) => item.pattern)}</div><div><h4>${copy.selfCorrections}</h4>${list(progress.selfCorrections, (item) => item.observation)}</div><div><h4>${copy.missedOpportunities}</h4>${list(progress.missedOpportunities, (item) => item.opportunity)}</div></div>
    <h3>${copy.nextLesson}</h3>${array(teacher.nextLessonFocus || languageClass.studyPlan).map((item) => `<article><h4>${text(item.focus)}</h4><p>${text(item.why)}</p>${list(item.activities)}<p class="note">${copy.success}: ${text(item.successMetric)}</p>${evidence(item.evidence, copy)}</article>`).join('') || '<p class="muted">No next lesson plan generated</p>'}
    ${array(teacher.homework).length ? `<h3>${copy.homework}</h3>${itemCards(teacher.homework, 'task', (item) => `<p>${item.durationMinutes ? `${text(item.durationMinutes)} min` : ''}</p><p class="note">${text(item.successMetric)}</p>`, copy, '')}` : ''}
  `, 'mode-section');
}

function buildMeeting(meeting, copy) {
  if (!meeting) return '';
  const brief = meeting.executiveBrief || meeting.managerBrief || { outcome: meeting.executiveSummary };
  const actions = array(meeting.actionItems);
  return section(copy.meeting, `
    <div class="manager"><small>${copy.managerBrief}</small><h3>${text(brief.outcome)}</h3><div class="triple"><div><h4>${copy.changed}</h4>${list(brief.whatChanged)}</div><div><h4>${copy.decisionNeeded}</h4>${list(brief.needsDecision)}</div><div><h4>${copy.escalation}</h4>${list(brief.needsEscalation)}</div></div></div>
    <div class="columns"><div><h3>${copy.decisions}</h3>${itemCards(meeting.decisions, 'decision', (item) => `<p>${text(item.impact)}</p>${item.owner ? `<p class="note">${copy.owner}: ${text(item.owner)}</p>` : ''}`, copy, 'No confirmed decisions identified')}</div><div><h3>${copy.actions}</h3>${actions.map((item) => `<article><h4>${text(item.task)}</h4><p><b>${copy.owner}:</b> ${text(item.owner, copy.unassigned)}</p><p><b>${copy.due}:</b> ${text(item.dueDate, copy.noDate)}</p>${evidence(typeof item.evidence === 'string' ? [item.evidence] : item.evidence, copy)}</article>`).join('') || '<p class="muted">No explicit action items identified</p>'}</div></div>
    <h3>${copy.proposals}</h3>${itemCards(meeting.proposals, 'proposal', (item) => `<p class="tag">${text(enumLabel(item.status, copy))}</p>${item.proposedBy ? `<p>${text(item.proposedBy)}</p>` : ''}`, copy, 'No grounded proposals identified')}
    <div class="quad"><div><h4>${copy.risks}</h4>${list(meeting.risks, (item) => `${item.risk}${item.basis ? ` (${enumLabel(item.basis, copy)})` : ''}`)}</div><div><h4>${copy.blockers}</h4>${list(meeting.blockers, (item) => item.blocker)}</div><div><h4>${copy.openQuestions}</h4>${list(meeting.openQuestions, (item) => typeof item === 'string' ? item : item.question)}</div><div><h4>${copy.metrics}</h4>${list(meeting.metrics, (item) => `${item.metric}: ${item.value}`)}</div></div>
    ${array(meeting.topics).length ? `<h3>${copy.topics}</h3>${itemCards(meeting.topics, 'topic', (item) => `<p>${text(item.summary)}</p><p class="tag">${text(enumLabel(item.status, copy))}</p>`, copy, '')}` : ''}
    ${meeting.nextMeeting ? `<article class="callout"><h4>${copy.nextMeeting}</h4><p>${text(meeting.nextMeeting.objective)}</p><p class="note">${text(meeting.nextMeeting.timing || meeting.nextMeeting.rationale)}</p>${list(meeting.nextMeeting.agenda)}</article>` : ''}
  `, 'mode-section');
}

function buildAnalysisReportHtml({ analysis, recording, locale = 'en-US' }) {
  const safe = analysis || {};
  const summary = safe.summary || {};
  const language = languageFor(locale);
  const copy = { ...COPY[language], ...DETAIL_COPY[language], ...SUMMARY_COPY[language] };
  const generatedAt = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(new Date());
  const recordingDate = recording?.createdAt ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(recording.createdAt)) : copy.noDate;
  const limitations = array(safe.evidenceQuality?.limitations);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${text(recording?.name, 'Voxa report')}</title><style>
    @page {
      size: A4;
      margin: 18mm 17mm 19mm;
      @bottom-left { content: "Voxa"; color: #7b7e79; font: 7px "Helvetica Neue", Helvetica, Arial, sans-serif; }
      @bottom-right { content: counter(page); color: #7b7e79; font: 7px "Helvetica Neue", Helvetica, Arial, sans-serif; }
    }
    * { box-sizing: border-box; }
    body { margin: 0; color: #20211f; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 9.5px; line-height: 1.55; }
    .cover { margin: 0 0 15mm; padding-bottom: 9mm; border-bottom: 1px solid #c9cbc7; }
    .brand { font-size: 14px; font-weight: 700; letter-spacing: -.03em; } .brand i { color: #6d716b; font-style: normal; }
    .hero { max-width: 165mm; margin: 16mm 0 10mm; } .eyebrow, small { color: #70736e; font-size: 7px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; }
    h1 { max-width: 155mm; margin: 5px 0 9px; font-size: 27px; font-weight: 600; line-height: 1.08; letter-spacing: -.035em; }
    h2 { margin: 0 0 9mm; border-bottom: 1px solid #c9cbc7; padding-bottom: 3mm; font-size: 18px; font-weight: 600; letter-spacing: -.025em; }
    h3 { margin: 8mm 0 3mm; font-size: 11px; font-weight: 700; break-after: avoid-page; page-break-after: avoid; }
    h4 { margin: 0; font-size: 9.5px; font-weight: 700; }
    p { margin: 3px 0; } .lead { max-width: 155mm; color: #4f524d; font-family: Georgia, "Times New Roman", serif; font-size: 13px; line-height: 1.55; }
    .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border-top: 1px solid #c9cbc7; border-bottom: 1px solid #c9cbc7; } .meta > div { min-height: 18mm; padding: 4mm 4mm 3mm 0; } .meta > div + div { padding-left: 4mm; border-left: 1px solid #e3e4e1; } .meta p { color: #393b38; }
    .purpose { margin: 0 0 7mm; padding: 4mm 5mm; border: 1px solid #d9dbd6; background: #f6f7f4; } .purpose p { margin-top: 1mm; }
    .key-points { margin-top: 9mm; } .key-points ol { margin: 3mm 0 0; padding: 0; list-style: none; counter-reset: keypoint; } .key-points li { counter-increment: keypoint; display: grid; grid-template-columns: 9mm 1fr; gap: 3mm; padding: 4mm 0; border-top: 1px solid #e3e4e1; } .key-points li::before { content: counter(keypoint, decimal-leading-zero); color: #70736e; font-size: 8px; font-weight: 700; }
    .section { margin: 0 0 12mm; } .mode-section ~ .mode-section { page-break-before: always; }
    .columns, .quad, .triple, .cards { display: block; }
    .columns > div, .quad > div, .triple > div { margin: 0 0 7mm; }
    article { break-inside: avoid; margin: 0; padding: 4mm 0; border-bottom: 1px solid #e3e4e1; }
    article:first-child { padding-top: 0; }
    article strong { float: right; } ul { margin: 3px 0; padding-left: 15px; } li { margin: 2px 0; }
    .score-row { display: grid; grid-template-columns: 29mm 1fr; gap: 8mm; align-items: start; margin-bottom: 9mm; }
    .score { padding-top: 1mm; border-top: 2px solid #262824; text-align: left; } .score span { display: block; margin-bottom: 3px; font-size: 28px; font-weight: 600; line-height: 1; } .score small { display: block; }
    .forecast { padding-top: 1mm; border-top: 1px solid #c9cbc7; } .forecast h3 { margin: 3px 0; text-transform: capitalize; }
    .question header, .learner > header, .corrections header { display: flex; justify-content: space-between; gap: 10px; } .question header strong { float: none; }
    .callout { margin-top: 4mm; padding-left: 4mm; border-left: 2px solid #70736e; border-bottom: 0; }
    .manager, .lesson-brief { margin-bottom: 8mm; padding: 0 0 6mm; border-bottom: 1px solid #c9cbc7; }
    .note, .muted { color: #747772; } .tag { display: inline-block; padding: 0; color: #686b66; font-size: 7px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    .evidence { clear: both; margin-top: 4mm; } .evidence blockquote { display: grid; grid-template-columns: auto 1fr; gap: 6px; margin: 2mm 0 0; border-left: 1px solid #aeb1ac; padding: 1mm 0 1mm 3mm; color: #626560; font-family: Georgia, "Times New Roman", serif; font-size: 8.5px; } .evidence blockquote b { float: none; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 7.5px; }
    .lesson-brief { display: grid; grid-template-columns: 1.4fr .6fr; gap: 8mm; } .lesson-brief .evidence { grid-column: 1 / -1; }
    .learner { margin-top: 5mm; } .level { min-width: 20mm; text-align: right; } .level strong { float: none; display: block; font-size: 18px; font-weight: 600; }
    .metrics { display: grid; grid-template-columns: repeat(6, 1fr); margin: 5mm 0 2mm; border-top: 1px solid #c9cbc7; border-bottom: 1px solid #c9cbc7; } .metrics div { padding: 3mm 2mm; border-right: 1px solid #e3e4e1; } .metrics div:last-child { border-right: 0; } .metrics b { display: block; margin-top: 2px; font-size: 11px; }
    .correction { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; margin-top: 3mm; } .correction strong { float: none; color: #30332f; }
    .manager > h3 { max-width: 155mm; margin-top: 3px; font-family: Georgia, "Times New Roman", serif; font-size: 13px; font-weight: 400; line-height: 1.5; }
    footer { margin-top: 7mm; color: #7b7e79; font-size: 7.5px; } footer b { color: #444743; }
  </style></head><body data-layout="editorial-minimal" data-report-version="analysis-aligned">
    <section class="cover"><div class="brand">Voxa<i>.</i></div><div class="hero"><span class="eyebrow">${copy.report}</span><h1>${text(summary.title || recording?.name, 'Conversation report')}</h1><p class="lead">${text(summary.executiveBrief?.statement || summary.overview)}</p></div>${summary.purpose?.statement ? `<div class="purpose"><small>${copy.purpose}</small><p>${text(summary.purpose.statement)}</p></div>` : ''}<div><div class="meta"><div><small>${copy.recorded}</small><p>${escapeHtml(recordingDate)}</p></div><div><small>${copy.generated}</small><p>${escapeHtml(generatedAt)}</p></div><div><small>${copy.modes}</small><p>${text(array(safe.analysisModes).join(', '))}</p></div><div><small>${copy.quality}</small><p>${text(safe.evidenceQuality?.level)}</p></div></div>${array(summary.keyPoints).length ? `<div class="key-points"><h3>${copy.keyPoints}</h3><ol>${array(summary.keyPoints).map((item) => `<li><span>${text(item.statement || item)}</span></li>`).join('')}</ol></div>` : ''}${limitations.length ? `<h3>${copy.limitations}</h3>${list(limitations)}` : ''}<footer><b>Voxa:</b> ${copy.verify}</footer></div></section>
    ${buildInterview(safe.interview, copy)}
    ${buildLanguage(safe.languageClass, safe.speakers, copy)}
    ${buildMeeting(safe.meeting, copy)}
  </body></html>`;
}

module.exports = { buildAnalysisReportHtml, escapeHtml };
