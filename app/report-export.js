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
  const scorecard = interview.scorecard || { overallScore: interview.overallScore, outcomeForecast: interview.outcomeForecast?.label, rationale: interview.outcomeForecast?.rationale, caveat: interview.outcomeForecast?.caveat };
  const questions = array(interview.questionReviews).length ? interview.questionReviews : interview.questions;
  return section(copy.interview, `
    <div class="score-row"><div class="score"><span>${score(scorecard.overallScore)}</span><small>${copy.score}</small></div><div class="forecast"><small>${copy.forecast}</small><h3>${text(label(scorecard.outcomeForecast))}</h3><p>${text(scorecard.rationale)}</p>${evidence(scorecard.evidence, copy)}<p class="note">${text(scorecard.caveat)}</p></div></div>
    <div class="columns"><div><h3>${copy.strengths}</h3>${itemCards(interview.strengths, 'insight', (item) => `<p>${text(item.whyItMatters)}</p>`, copy, 'No grounded strengths identified')}</div><div><h3>${copy.concerns}</h3>${itemCards(interview.concerns, 'insight', (item) => `<p>${text(item.missingEvidence)}</p><p class="tag">${text(item.severity)}</p>`, copy, 'No grounded concerns identified')}</div></div>
    <h3>${copy.competencies}</h3>${itemCards(interview.competencies, 'name', (item) => `<strong>${score(item.score)}/10</strong><p>${text(item.assessment || item.gap)}</p>${item.assessment && item.gap ? `<p class="note">${text(item.gap)}</p>` : ''}`, copy, 'No grounded competencies identified')}
    <h3>${copy.questions}</h3>${array(questions).map((item, index) => `<article class="question"><header><b>${index + 1}. ${text(item.question)}</b><strong>${score(item.score)}/10</strong></header><p>${text(item.answerSummary)}</p><div class="columns"><div><small>${copy.whatWorked}</small>${list(item.whatWorked)}</div><div><small>${copy.improve}</small>${list(item.improve)}</div></div>${evidence(item.evidence, copy)}${item.betterAnswerOutline ? `<p class="callout"><b>${copy.betterAnswer}:</b> ${text(item.betterAnswerOutline)}</p>` : ''}</article>`).join('') || '<p class="muted">No grounded questions identified</p>'}
    <h3>${copy.plan}</h3>${array(interview.preparationPlan).map((item) => `<article><h4>${text(item.priority)}. ${text(item.focus)}</h4>${item.basedOn ? `<p>${text(item.basedOn)}</p>` : ''}${list(item.actions)}<p class="note">${copy.success}: ${text(item.successMetric)}</p></article>`).join('') || '<p class="muted">No preparation plan generated</p>'}
    <h3>${copy.candidateQuestions}</h3>${list([...(array(interview.candidateQuestions)), ...(array(interview.practiceQuestions))], (item) => `${item.question}${item.why ? `: ${item.why}` : ''}`)}
  `, 'mode-section');
}

function buildLanguage(languageClass, legacySpeakers, copy) {
  if (!languageClass) return '';
  const profiles = array(languageClass.learnerProfiles).length ? languageClass.learnerProfiles : array(legacySpeakers).map((speaker) => ({ speaker: speaker.id, cefrEstimate: speaker.language?.cefrEstimate || speaker.proficiency?.level, scores: speaker.language?.scores || {}, strengths: array(speaker.language?.strengths).map((insight) => ({ insight })), priorities: array(speaker.language?.improvements).map((insight) => ({ insight })), teacherFeedback: speaker.language?.feedback || speaker.feedback }));
  const brief = languageClass.lessonBrief || {};
  const progress = languageClass.lessonProgress || {};
  const teacher = languageClass.teacherBrief || {};
  return section(copy.language, `
    <div class="lesson-brief"><div><small>${copy.objective}</small><h3>${text(brief.objective)}</h3></div><div><small>${copy.learners}</small><p>${text(array(brief.learnerSpeakers).join(', '))}</p></div>${evidence(brief.evidence, copy)}</div>
    ${profiles.map((profile) => `<article class="learner"><header><div><small>${copy.learners}</small><h3>${text(profile.speaker)}</h3></div><div class="level"><strong>${text(profile.cefrEstimate, 'unknown')}</strong><small>CEFR</small></div></header><div class="metrics">${Object.entries(profile.scores || {}).map(([key, value]) => `<div><small>${text(key)}</small><b>${score(value)}</b></div>`).join('')}</div><div class="columns"><div><h3>${copy.reinforce}</h3>${itemCards(profile.strengths, 'insight', () => '', copy, 'No grounded strengths identified')}</div><div><h3>${copy.priorities}</h3>${itemCards(profile.priorities, 'insight', (item) => `${item.pattern ? `<p class="note">${text(item.pattern)}</p>` : ''}<p>${text(item.impact)}</p>`, copy, 'No grounded priorities identified')}</div></div>${profile.teacherFeedback ? `<p class="callout">${text(profile.teacherFeedback)}</p>` : ''}</article>`).join('')}
    <h3>${copy.corrections}</h3><div class="corrections">${array(languageClass.corrections).map((item) => `<article><header><span class="tag">${text(item.priority)}</span><b>${text(item.speaker)} / ${text(item.category)}</b></header><div class="correction"><del>${text(item.original)}</del><strong>${text(item.corrected)}</strong></div><p>${text(item.explanation)}</p></article>`).join('') || '<p class="muted">No reliable corrections identified</p>'}</div>
    <h3>${copy.progress}</h3><div class="quad"><div><h4>${copy.successfulUse}</h4>${list(progress.successfulUse, (item) => item.skill)}</div><div><h4>${copy.recurringPatterns}</h4>${list(progress.recurringPatterns, (item) => item.pattern)}</div><div><h4>${copy.selfCorrections}</h4>${list(progress.selfCorrections, (item) => item.observation)}</div><div><h4>${copy.missedOpportunities}</h4>${list(progress.missedOpportunities, (item) => item.opportunity)}</div></div>
    <h3>${copy.nextLesson}</h3>${array(teacher.nextLessonFocus || languageClass.studyPlan).map((item) => `<article><h4>${text(item.focus)}</h4><p>${text(item.why)}</p>${list(item.activities)}<p class="note">${copy.success}: ${text(item.successMetric)}</p>${evidence(item.evidence, copy)}</article>`).join('') || '<p class="muted">No next lesson plan generated</p>'}
    ${array(teacher.homework).length ? `<h3>${copy.homework}</h3>${itemCards(teacher.homework, 'task', (item) => `<p>${item.durationMinutes ? `${text(item.durationMinutes)} min` : ''}</p><p class="note">${text(item.successMetric)}</p>`, copy, '')}` : ''}
  `, 'mode-section');
}

function buildMeeting(meeting, copy) {
  if (!meeting) return '';
  const brief = meeting.managerBrief || { outcome: meeting.executiveSummary };
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
  const copy = { ...COPY[language], ...DETAIL_COPY[language] };
  const generatedAt = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(new Date());
  const recordingDate = recording?.createdAt ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(recording.createdAt)) : copy.noDate;
  const limitations = array(safe.evidenceQuality?.limitations);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${text(recording?.name, 'Voxa report')}</title><style>
    @page { size: A4; margin: 15mm 14mm 17mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #232622; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 10px; line-height: 1.48; }
    .cover { min-height: 250mm; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }
    .brand { font-size: 17px; font-weight: 800; letter-spacing: -.04em; } .brand i { color: #647d69; font-style: normal; }
    .hero { max-width: 165mm; } .eyebrow, small { color: #737a72; font-size: 7.5px; font-weight: 750; letter-spacing: .07em; text-transform: uppercase; }
    h1 { margin: 9px 0 12px; font-size: 34px; line-height: 1.04; letter-spacing: -.045em; } h2 { margin: 0 0 12px; border-bottom: 1px solid #dfe4dd; padding-bottom: 7px; font-size: 19px; letter-spacing: -.025em; } h3 { margin: 15px 0 7px; font-size: 12px; break-after: avoid-page; page-break-after: avoid; } h4 { margin: 0; font-size: 10px; }
    p { margin: 5px 0; } .lead { color: #484e47; font-size: 14px; line-height: 1.58; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; border-top: 1px solid #dfe4dd; padding-top: 13px; } .meta p { color: #555c54; }
    .section { margin: 0 0 20px; } .mode-section { page-break-before: always; }
    .columns, .quad, .triple { display: grid; grid-template-columns: repeat(2, 1fr); gap: 9px; align-items: start; } .quad { grid-template-columns: repeat(2, 1fr); } .triple { grid-template-columns: repeat(3, 1fr); }
    .cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    article, .quad > div { break-inside: avoid; margin: 0 0 8px; border: 1px solid #e0e4de; border-radius: 7px; padding: 9px; }
    article strong { float: right; } ul { margin: 5px 0; padding-left: 16px; } li { margin: 3px 0; }
    .score-row { display: grid; grid-template-columns: 86px 1fr; gap: 12px; align-items: stretch; margin-bottom: 13px; } .score { display: grid; place-content: center; border: 1px solid #d7e0d8; border-radius: 9px; padding: 10px; background: #f2f6f1; text-align: center; } .score span { font-size: 25px; font-weight: 800; line-height: 1; } .score small { margin-top: 6px; }
    .forecast { border-left: 3px solid #718676; padding: 3px 0 3px 12px; } .forecast h3 { margin-top: 5px; text-transform: capitalize; }
    .question header, .learner > header, .corrections header { display: flex; justify-content: space-between; gap: 10px; } .question header strong { float: none; }
    .callout, .manager, .lesson-brief { border-color: #d2ddd4; background: #f2f6f1; } .note, .muted { color: #767c74; } .tag { display: inline-block; border-radius: 999px; padding: 2px 5px; background: #ecefe9; color: #60675f; font-size: 7.5px; text-transform: uppercase; }
    .evidence { clear: both; margin-top: 7px; border-top: 1px solid #e0e4de; padding-top: 6px; } .evidence blockquote { display: grid; grid-template-columns: auto 1fr; gap: 5px; margin: 4px 0 0; border-left: 2px solid #b7c6b9; padding: 4px 6px; background: #f6f8f5; color: #5b635a; font-size: 8.5px; } .evidence blockquote b { float: none; }
    .lesson-brief { display: grid; grid-template-columns: 1.4fr .6fr; gap: 10px; border: 1px solid #d2ddd4; border-radius: 8px; padding: 11px; } .lesson-brief .evidence { grid-column: 1 / -1; }
    .learner { margin-top: 10px; padding: 11px; } .level { text-align: center; } .level strong { float: none; display: block; font-size: 22px; }
    .metrics { display: grid; grid-template-columns: repeat(6, 1fr); gap: 1px; overflow: hidden; margin: 9px 0; border: 1px solid #e0e4de; border-radius: 6px; background: #e0e4de; } .metrics div { padding: 6px; background: white; } .metrics b { display: block; margin-top: 3px; }
    .correction { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 7px; } .correction strong { float: none; color: #45604b; }
    .manager { border: 1px solid #d2ddd4; border-radius: 9px; padding: 12px; } .manager > h3 { font-size: 14px; }
    footer { color: #838981; font-size: 8px; } footer b { color: #444a43; }
  </style></head><body>
    <section class="cover"><div class="brand">Voxa<i>.</i></div><div class="hero"><span class="eyebrow">${copy.report}</span><h1>${text(recording?.name, summary.title || 'Conversation report')}</h1><p class="lead">${text(summary.overview)}</p></div><div><div class="meta"><div><small>${copy.recorded}</small><p>${escapeHtml(recordingDate)}</p></div><div><small>${copy.generated}</small><p>${escapeHtml(generatedAt)}</p></div><div><small>${copy.modes}</small><p>${text(array(safe.analysisModes).join(', '))}</p></div><div><small>${copy.quality}</small><p>${text(safe.evidenceQuality?.level)}</p></div></div>${limitations.length ? `<h3>${copy.limitations}</h3>${list(limitations)}` : ''}<footer><b>Voxa:</b> ${copy.verify}</footer></div></section>
    ${buildInterview(safe.interview, copy)}
    ${buildLanguage(safe.languageClass, safe.speakers, copy)}
    ${buildMeeting(safe.meeting, copy)}
  </body></html>`;
}

module.exports = { buildAnalysisReportHtml, escapeHtml };
