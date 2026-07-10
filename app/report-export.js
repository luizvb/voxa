function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function text(value, fallback = 'Not available') {
  return escapeHtml(value || fallback);
}

function score(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(10, parsed)).toFixed(1) : '-';
}

function list(items, mapper = (item) => item) {
  if (!Array.isArray(items) || items.length === 0) return '<p class="muted">No items identified.</p>';
  return `<ul>${items.map((item) => `<li>${text(mapper(item))}</li>`).join('')}</ul>`;
}

function section(title, body, className = '') {
  return `<section class="section ${className}"><h2>${escapeHtml(title)}</h2>${body}</section>`;
}

function buildInterview(interview) {
  if (!interview) return '';
  const forecast = interview.outcomeForecast || {};
  return section('Interview analysis', `
    <div class="score-row">
      <div class="score"><span>${score(interview.overallScore)}</span><small>Overall score / 10</small></div>
      <div><h3>${text(String(forecast.label || '').replaceAll('_', ' '), 'Outcome uncertain')}</h3><p>${text(forecast.rationale)}</p><p class="note">${text(forecast.caveat, 'Directional coaching estimate - not a hiring decision.')}</p></div>
    </div>
    <h3>Competencies</h3>
    <div class="grid">${(interview.competencies || []).map((item) => `<article><b>${text(item.name)}</b><strong>${score(item.score)}/10</strong><p>${text(item.gap, 'No material gap identified.')}</p>${list(item.evidence)}</article>`).join('') || '<p class="muted">No competencies identified.</p>'}</div>
    <h3>Questions and answers</h3>
    ${(interview.questions || []).map((item, index) => `<article class="question"><header><b>${index + 1}. ${text(item.question)}</b><strong>${score(item.score)}/10</strong></header><p>${text(item.answerSummary)}</p><div class="columns"><div><small>What worked</small>${list(item.whatWorked)}</div><div><small>Improve</small>${list(item.improve)}</div></div>${item.betterAnswerOutline ? `<p class="callout"><b>Better answer outline:</b> ${text(item.betterAnswerOutline)}</p>` : ''}</article>`).join('') || '<p class="muted">No interview questions identified.</p>'}
    <h3>Preparation plan</h3>
    ${(interview.preparationPlan || []).map((item) => `<article><b>P${text(item.priority)} - ${text(item.focus)}</b>${list(item.actions)}<p class="note">Success: ${text(item.successMetric)}</p></article>`).join('') || '<p class="muted">No preparation plan generated.</p>'}
    <h3>Practice questions</h3>${list(interview.practiceQuestions, (item) => `${item.question}${item.why ? ` - ${item.why}` : ''}`)}
  `, 'mode-section');
}

function buildLanguage(languageClass, speakers) {
  if (!languageClass) return '';
  return section('Language analysis', `
    <div class="score-row"><div class="score"><span>${text(languageClass.overallCefr, '?')}</span><small>Estimated CEFR</small></div><div class="score"><span>${score(languageClass.overallScore)}</span><small>Overall score / 10</small></div></div>
    <div class="columns"><div><h3>What went well</h3>${list(languageClass.whatWentWell)}</div><div><h3>Needs work</h3>${list(languageClass.needsWork)}</div></div>
    <h3>Speaker proficiency</h3>
    <div class="grid">${(speakers || []).map((speaker) => `<article><b>${text(speaker.id)} - ${text(speaker.language?.cefrEstimate, '?')}</b><p>${text(speaker.language?.feedback)}</p><small>Strengths</small>${list(speaker.language?.strengths)}<small>Improvements</small>${list(speaker.language?.improvements)}</article>`).join('') || '<p class="muted">No speaker-level assessment available.</p>'}</div>
    <h3>High-value corrections</h3>
    <table><thead><tr><th>Original</th><th>Better version</th><th>Why</th></tr></thead><tbody>${(languageClass.corrections || []).map((item) => `<tr><td>${text(item.original)}</td><td>${text(item.corrected)}</td><td>${text(item.explanation)}</td></tr>`).join('') || '<tr><td colspan="3">No reliable corrections identified.</td></tr>'}</tbody></table>
    <h3>Study plan</h3>${(languageClass.studyPlan || []).map((item) => `<article><b>${text(item.period)} - ${text(item.focus)}</b>${list(item.activities)}<p class="note">Success: ${text(item.successMetric)}</p></article>`).join('') || '<p class="muted">No study plan generated.</p>'}
  `, 'mode-section');
}

function buildMeeting(meeting) {
  if (!meeting) return '';
  return section('Meeting analysis', `
    <p class="lead">${text(meeting.executiveSummary)}</p>
    <h3>Decisions</h3>${(meeting.decisions || []).map((item) => `<article><b>${text(item.decision)}</b><p>Owner: ${text(item.owner, 'Not assigned')}</p><p class="note">Evidence: ${text(item.evidence)}</p></article>`).join('') || '<p class="muted">No confirmed decisions identified.</p>'}
    <h3>Action items</h3>
    <table><thead><tr><th>Task</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead><tbody>${(meeting.actionItems || []).map((item) => `<tr><td>${text(item.task)}</td><td>${text(item.owner, 'Unassigned')}</td><td>${text(item.dueDate, 'Not stated')}</td><td>${text(item.status, 'Open')}</td></tr>`).join('') || '<tr><td colspan="4">No explicit action items identified.</td></tr>'}</tbody></table>
    <div class="columns"><div><h3>Risks</h3>${list(meeting.risks, (item) => `${item.risk}${item.impact ? ` - ${item.impact}` : ''}`)}</div><div><h3>Opportunities</h3>${list(meeting.opportunities, (item) => `${item.opportunity}${item.value ? ` - ${item.value}` : ''}`)}</div></div>
    <h3>Open questions</h3>${list(meeting.openQuestions)}
    ${meeting.nextMeeting ? `<article class="callout"><b>Recommended next meeting</b><p>${text(meeting.nextMeeting.objective)}</p><p><b>Timing:</b> ${text(meeting.nextMeeting.timing)}</p>${list(meeting.nextMeeting.agenda)}</article>` : ''}
  `, 'mode-section');
}

function buildAnalysisReportHtml({ analysis, recording, locale = 'en-US' }) {
  const safeAnalysis = analysis || {};
  const summary = safeAnalysis.summary || {};
  const signals = safeAnalysis.executiveSignals || {};
  const generatedAt = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(new Date());
  const recordingDate = recording?.createdAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(recording.createdAt))
    : 'Not available';

  return `<!doctype html><html><head><meta charset="utf-8"><title>${text(recording?.name, 'Voxa report')}</title><style>
    @page { size: A4; margin: 16mm 15mm 18mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #20211f; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 10.5px; line-height: 1.5; }
    .cover { min-height: 245mm; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }
    .brand { font-size: 16px; font-weight: 800; letter-spacing: -.04em; } .brand i { color: #617a68; font-style: normal; }
    .hero { max-width: 150mm; } .eyebrow, small { color: #73766f; font-size: 8px; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 10px 0 12px; font-size: 36px; line-height: 1.02; letter-spacing: -.05em; } .lead { color: #454843; font-size: 14px; line-height: 1.55; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; border-top: 1px solid #dfe1dc; padding-top: 14px; color: #656862; }
    .section { margin: 0 0 22px; break-inside: auto; } .section > h2 { margin: 0 0 12px; border-bottom: 1px solid #dfe1dc; padding-bottom: 7px; font-size: 19px; letter-spacing: -.025em; }
    h3 { margin: 16px 0 7px; font-size: 12px; } p { margin: 5px 0; } ul { margin: 6px 0; padding-left: 17px; } li { margin: 3px 0; }
    .grid, .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; } article { break-inside: avoid; margin: 0 0 8px; border: 1px solid #e0e2dd; border-radius: 7px; padding: 10px; }
    article strong { float: right; } .score-row { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; } .score { min-width: 88px; border: 1px solid #d8ddd7; border-radius: 9px; padding: 12px; background: #f2f5f1; text-align: center; }
    .score span { display: block; font-size: 26px; font-weight: 800; line-height: 1; } .score small { display: block; margin-top: 6px; }
    .callout { border-color: #d3ddd5; background: #f2f5f1; } .note, .muted { color: #73766f; } table { width: 100%; border-collapse: collapse; break-inside: avoid; } th, td { border-bottom: 1px solid #e0e2dd; padding: 7px 6px; text-align: left; vertical-align: top; } th { color: #6d706a; font-size: 8px; text-transform: uppercase; }
    .question header { display: flex; justify-content: space-between; gap: 12px; } .question header strong { float: none; white-space: nowrap; }
    .mode-section { page-break-before: always; } footer { color: #858880; font-size: 8px; } footer b { color: #3f423e; }
  </style></head><body>
    <section class="cover"><div class="brand">Voxa<i>.</i></div><div class="hero"><span class="eyebrow">Conversation intelligence report</span><h1>${text(recording?.name, summary.title || 'Conversation report')}</h1><p class="lead">${text(summary.overview)}</p></div><div><div class="meta"><div><small>Recorded</small><p>${escapeHtml(recordingDate)}</p></div><div><small>Report generated</small><p>${escapeHtml(generatedAt)}</p></div><div><small>Analysis modes</small><p>${text((safeAnalysis.analysisModes || []).join(', '))}</p></div><div><small>Evidence quality</small><p>${text(safeAnalysis.evidenceQuality?.level)}</p></div></div><footer><b>Important:</b> AI-generated analysis should be verified against the transcript. Communication signals and interview forecasts are directional, not definitive assessments.</footer></div></section>
    ${section('Executive brief', `<p class="lead">${text(summary.overview)}</p><div class="columns"><div><h3>Key takeaways</h3>${list(signals.keyTakeaways)}</div><div><h3>Unresolved questions</h3>${list(signals.unresolvedQuestions)}</div><div><h3>Risks</h3>${list(signals.risks)}</div><div><h3>Opportunities</h3>${list(signals.opportunities)}</div></div>`)}
    ${buildInterview(safeAnalysis.interview)}
    ${buildLanguage(safeAnalysis.languageClass, safeAnalysis.speakers)}
    ${buildMeeting(safeAnalysis.meeting)}
  </body></html>`;
}

module.exports = { buildAnalysisReportHtml, escapeHtml };
