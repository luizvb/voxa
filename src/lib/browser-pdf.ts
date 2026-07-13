import { jsPDF } from 'jspdf';
import type { Recording } from '../platform/types';

type PdfInput = { analysis: unknown; recording: Recording; locale: string };
type Language = 'en' | 'pt' | 'es';
type AnalysisRecord = Record<string, unknown>;

const COPY: Record<Language, Record<string, string>> = {
  en: {
    report: 'Verified conversation report', recorded: 'Recorded', generated: 'Generated', page: 'Page', of: 'of',
    evidenceQuality: 'Evidence quality', analysisModes: 'Analysis lenses', keyPoints: 'Key points', version: 'Report version',
    purpose: 'Purpose', limitations: 'Evidence limitations', summary: 'Executive brief', transcriptEvidence: 'Transcript evidence',
    interview: 'Interview analysis', languageClass: 'Language lesson analysis', meeting: 'Meeting analysis', lens: 'Analysis lens',
    verify: 'AI-generated analysis should be checked against the transcript. Recommendations are guidance, not transcript facts.',
    context: 'Context', executiveAssessment: 'Executive assessment', overallScore: 'Overall score', scoreConfidence: 'Score confidence', outcomeForecast: 'Directional forecast', rationale: 'Rationale', caveat: 'Caveat',
    strengths: 'Strongest evidence', concerns: 'Material concerns', contradictions: 'Contradictions', competencies: 'Competencies', questionReviews: 'Question-by-question review', coaching: 'Coaching plan', priorities: 'Priorities', candidateQuestions: 'Candidate questions', practiceQuestions: 'Practice questions',
    lessonContext: 'Lesson context', objective: 'Objective', targetLanguage: 'Target language', learnerSpeakers: 'Learners', teacherSpeakers: 'Teachers', topics: 'Topics', learnerProfiles: 'Learner profiles', cefr: 'CEFR', skills: 'Skills', languagePatterns: 'Language patterns', corrections: 'Priority corrections', lessonProgress: 'Lesson progress', teacherPlan: 'Next lesson plan', homework: 'Homework',
    meetingContext: 'Meeting context', executiveBrief: 'Manager brief', decisions: 'Confirmed decisions', actionItems: 'Explicit action items', proposals: 'Proposals', risks: 'Risks', blockers: 'Blockers', dependencies: 'Dependencies', participantViews: 'Participant views', metrics: 'Metrics', openQuestions: 'Open questions', nextMeeting: 'Recommended next meeting',
    statement: 'Statement', evidence: 'Evidence', speaker: 'Speaker', quote: 'Quote', level: 'Level', reasons: 'Reasons', coverage: 'Coverage', title: 'Title', language: 'Language',
  },
  pt: {
    report: 'Relatório verificado da conversa', recorded: 'Gravado em', generated: 'Gerado em', page: 'Página', of: 'de',
    evidenceQuality: 'Qualidade das evidências', analysisModes: 'Perspectivas de análise', keyPoints: 'Pontos principais', version: 'Versão do relatório',
    purpose: 'Objetivo', limitations: 'Limitações das evidências', summary: 'Resumo executivo', transcriptEvidence: 'Evidência da transcrição',
    interview: 'Análise de entrevista', languageClass: 'Análise da aula de idioma', meeting: 'Análise da reunião', lens: 'Perspectiva de análise',
    verify: 'A análise gerada por IA deve ser conferida na transcrição. Recomendações são orientações, não fatos da conversa.',
    context: 'Contexto', executiveAssessment: 'Avaliação executiva', overallScore: 'Nota geral', scoreConfidence: 'Confiança da nota', outcomeForecast: 'Expectativa direcional', rationale: 'Justificativa', caveat: 'Ressalva',
    strengths: 'Evidências mais fortes', concerns: 'Pontos de atenção', contradictions: 'Contradições', competencies: 'Competências', questionReviews: 'Análise pergunta a pergunta', coaching: 'Plano de preparação', priorities: 'Prioridades', candidateQuestions: 'Perguntas do candidato', practiceQuestions: 'Perguntas para prática',
    lessonContext: 'Contexto da aula', objective: 'Objetivo', targetLanguage: 'Idioma-alvo', learnerSpeakers: 'Alunos', teacherSpeakers: 'Professores', topics: 'Tópicos', learnerProfiles: 'Perfis dos alunos', cefr: 'CEFR', skills: 'Habilidades', languagePatterns: 'Padrões de linguagem', corrections: 'Correções prioritárias', lessonProgress: 'Progresso da aula', teacherPlan: 'Plano da próxima aula', homework: 'Tarefa de casa',
    meetingContext: 'Contexto da reunião', executiveBrief: 'Briefing do gerente', decisions: 'Decisões confirmadas', actionItems: 'Pontos de ação explícitos', proposals: 'Propostas', risks: 'Riscos', blockers: 'Bloqueios', dependencies: 'Dependências', participantViews: 'Visões dos participantes', metrics: 'Métricas', openQuestions: 'Perguntas em aberto', nextMeeting: 'Próxima reunião recomendada',
    statement: 'Síntese', evidence: 'Evidência', speaker: 'Participante', quote: 'Trecho', level: 'Nível', reasons: 'Motivos', coverage: 'Cobertura', title: 'Título', language: 'Idioma',
  },
  es: {
    report: 'Informe verificado de la conversación', recorded: 'Grabado', generated: 'Generado', page: 'Página', of: 'de',
    evidenceQuality: 'Calidad de la evidencia', analysisModes: 'Perspectivas de análisis', keyPoints: 'Puntos principales', version: 'Versión del informe',
    purpose: 'Objetivo', limitations: 'Limitaciones de la evidencia', summary: 'Resumen ejecutivo', transcriptEvidence: 'Evidencia de la transcripción',
    interview: 'Análisis de entrevista', languageClass: 'Análisis de la clase de idioma', meeting: 'Análisis de la reunión', lens: 'Perspectiva de análisis',
    verify: 'El análisis generado por IA debe verificarse con la transcripción. Las recomendaciones son orientación, no hechos de la conversación.',
    context: 'Contexto', executiveAssessment: 'Evaluación ejecutiva', overallScore: 'Puntuación general', scoreConfidence: 'Confianza de la puntuación', outcomeForecast: 'Previsión orientativa', rationale: 'Justificación', caveat: 'Salvedad',
    strengths: 'Evidencias más sólidas', concerns: 'Puntos de atención', contradictions: 'Contradicciones', competencies: 'Competencias', questionReviews: 'Revisión pregunta por pregunta', coaching: 'Plan de preparación', priorities: 'Prioridades', candidateQuestions: 'Preguntas del candidato', practiceQuestions: 'Preguntas de práctica',
    lessonContext: 'Contexto de la clase', objective: 'Objetivo', targetLanguage: 'Idioma objetivo', learnerSpeakers: 'Alumnos', teacherSpeakers: 'Profesores', topics: 'Temas', learnerProfiles: 'Perfiles de alumnos', cefr: 'CEFR', skills: 'Habilidades', languagePatterns: 'Patrones de lenguaje', corrections: 'Correcciones prioritarias', lessonProgress: 'Progreso de la clase', teacherPlan: 'Plan de la próxima clase', homework: 'Tarea',
    meetingContext: 'Contexto de la reunión', executiveBrief: 'Resumen para el gerente', decisions: 'Decisiones confirmadas', actionItems: 'Acciones explícitas', proposals: 'Propuestas', risks: 'Riesgos', blockers: 'Bloqueos', dependencies: 'Dependencias', participantViews: 'Perspectivas de participantes', metrics: 'Métricas', openQuestions: 'Preguntas abiertas', nextMeeting: 'Próxima reunión recomendada',
    statement: 'Síntesis', evidence: 'Evidencia', speaker: 'Participante', quote: 'Fragmento', level: 'Nivel', reasons: 'Motivos', coverage: 'Cobertura', title: 'Título', language: 'Idioma',
  },
};

const VALUE_COPY: Record<Language, Record<string, string>> = {
  en: { true: 'Yes', false: 'No', interview: 'Interview', language: 'Language', meeting: 'Meeting', high: 'High', medium: 'Medium', low: 'Low', explicit: 'Explicit', inferred: 'Inferred', unknown: 'Unknown', open: 'Open', at_risk: 'At risk', balanced: 'Balanced', repeated: 'Repeated', single: 'Single', grammar: 'Grammar', vocabulary: 'Vocabulary', naturalness: 'Naturalness', coherence: 'Coherence', register: 'Register' },
  pt: { true: 'Sim', false: 'Não', interview: 'Entrevista', language: 'Idioma', meeting: 'Reunião', high: 'Alta', medium: 'Média', low: 'Baixa', explicit: 'Explícita', inferred: 'Inferida', unknown: 'Não informado', open: 'Em aberto', at_risk: 'Em risco', balanced: 'Equilibrada', repeated: 'Recorrente', single: 'Pontual', grammar: 'Gramática', vocabulary: 'Vocabulário', naturalness: 'Naturalidade', coherence: 'Coerência', register: 'Registro' },
  es: { true: 'Sí', false: 'No', interview: 'Entrevista', language: 'Idioma', meeting: 'Reunión', high: 'Alta', medium: 'Media', low: 'Baja', explicit: 'Explícita', inferred: 'Inferida', unknown: 'No indicado', open: 'Abierto', at_risk: 'En riesgo', balanced: 'Equilibrada', repeated: 'Recurrente', single: 'Puntual', grammar: 'Gramática', vocabulary: 'Vocabulario', naturalness: 'Naturalidad', coherence: 'Coherencia', register: 'Registro' },
};

const FIELD_COPY: Record<Language, Record<string, string>> = {
  en: { confidence: 'Confidence', evidenceSufficiency: 'Evidence sufficiency', overallAssessment: 'Overall assessment', grammar: 'Grammar', vocabulary: 'Vocabulary', fluency: 'Fluency', coherence: 'Coherence', interaction: 'Interaction', intelligibility: 'Intelligibility', score: 'Score', observation: 'Observation', whyItMatters: 'Why it matters', pattern: 'Pattern', communicationImpact: 'Communication impact', nextStep: 'Next step', participation: 'Participation', share: 'Share', interactionPattern: 'Interaction pattern', teacherFeedback: 'Teacher feedback', category: 'Category', frequency: 'Frequency', impact: 'Impact', original: 'Original', corrected: 'Corrected', explanation: 'Explanation', rule: 'Rule', recurrence: 'Recurrence', priority: 'Priority', successfulUse: 'Successful use', skill: 'Skill', whySuccessful: 'Why it worked', selfCorrections: 'Self-corrections', missedOpportunities: 'Missed opportunities', opportunity: 'Opportunity', coachPrompt: 'Coach prompt', reinforce: 'Reinforce', reason: 'Reason', nextLessonFocus: 'Next lesson focus', why: 'Why', activities: 'Activities', successMetric: 'Success metric', durationMinutes: 'Duration in minutes', basedOn: 'Based on', participants: 'Participants', outcome: 'Outcome', whatChanged: 'What changed', needsDecision: 'Needs decision', needsEscalation: 'Needs escalation', owner: 'Owner', dueDate: 'Due date', status: 'Status', dependency: 'Dependency', basis: 'Basis', likelihood: 'Likelihood', mitigation: 'Mitigation', value: 'Value', recommended: 'Recommended', timing: 'Timing', agenda: 'Agenda' },
  pt: { confidence: 'Confiança', evidenceSufficiency: 'Suficiência das evidências', overallAssessment: 'Avaliação geral', grammar: 'Gramática', vocabulary: 'Vocabulário', fluency: 'Fluência', coherence: 'Coerência', interaction: 'Interação', intelligibility: 'Inteligibilidade', score: 'Nota', observation: 'Observação', whyItMatters: 'Por que importa', pattern: 'Padrão', communicationImpact: 'Impacto na comunicação', nextStep: 'Próximo passo', participation: 'Participação', share: 'Distribuição', interactionPattern: 'Padrão de interação', teacherFeedback: 'Feedback do professor', category: 'Categoria', frequency: 'Frequência', impact: 'Impacto', original: 'Original', corrected: 'Correção', explanation: 'Explicação', rule: 'Regra', recurrence: 'Recorrência', priority: 'Prioridade', successfulUse: 'Acertos observados', skill: 'Habilidade', whySuccessful: 'Por que funcionou', selfCorrections: 'Autocorreções', missedOpportunities: 'Oportunidades perdidas', opportunity: 'Oportunidade', coachPrompt: 'Pergunta do professor', reinforce: 'O que reforçar', reason: 'Motivo', nextLessonFocus: 'Foco da próxima aula', why: 'Motivo', activities: 'Atividades', successMetric: 'Critério de sucesso', durationMinutes: 'Duração em minutos', basedOn: 'Baseado em', participants: 'Participantes', outcome: 'Resultado', whatChanged: 'O que mudou', needsDecision: 'Precisa de decisão', needsEscalation: 'Precisa escalar', owner: 'Responsável', dueDate: 'Prazo', status: 'Status', dependency: 'Dependência', basis: 'Base', likelihood: 'Probabilidade', mitigation: 'Mitigação', value: 'Valor', recommended: 'Recomendada', timing: 'Momento', agenda: 'Pauta' },
  es: { confidence: 'Confianza', evidenceSufficiency: 'Suficiencia de evidencia', overallAssessment: 'Evaluación general', grammar: 'Gramática', vocabulary: 'Vocabulario', fluency: 'Fluidez', coherence: 'Coherencia', interaction: 'Interacción', intelligibility: 'Inteligibilidad', score: 'Puntuación', observation: 'Observación', whyItMatters: 'Por qué importa', pattern: 'Patrón', communicationImpact: 'Impacto en la comunicación', nextStep: 'Próximo paso', participation: 'Participación', share: 'Distribución', interactionPattern: 'Patrón de interacción', teacherFeedback: 'Comentario del profesor', category: 'Categoría', frequency: 'Frecuencia', impact: 'Impacto', original: 'Original', corrected: 'Corrección', explanation: 'Explicación', rule: 'Regla', recurrence: 'Recurrencia', priority: 'Prioridad', successfulUse: 'Aciertos observados', skill: 'Habilidad', whySuccessful: 'Por qué funcionó', selfCorrections: 'Autocorrecciones', missedOpportunities: 'Oportunidades perdidas', opportunity: 'Oportunidad', coachPrompt: 'Pregunta del profesor', reinforce: 'Qué reforzar', reason: 'Motivo', nextLessonFocus: 'Foco de la próxima clase', why: 'Motivo', activities: 'Actividades', successMetric: 'Criterio de éxito', durationMinutes: 'Duración en minutos', basedOn: 'Basado en', participants: 'Participantes', outcome: 'Resultado', whatChanged: 'Qué cambió', needsDecision: 'Necesita decisión', needsEscalation: 'Necesita escalar', owner: 'Responsable', dueDate: 'Fecha', status: 'Estado', dependency: 'Dependencia', basis: 'Base', likelihood: 'Probabilidad', mitigation: 'Mitigación', value: 'Valor', recommended: 'Recomendada', timing: 'Momento', agenda: 'Agenda' },
};

const TITLE_KEYS = ['title', 'name', 'speaker', 'question', 'task', 'decision', 'topic', 'focus', 'signal', 'metric', 'proposal', 'risk', 'blocker', 'pattern', 'skill', 'opportunity'];

function languageFor(locale: string): Language {
  const normalized = locale.toLowerCase();
  return normalized.startsWith('pt') ? 'pt' : normalized.startsWith('es') ? 'es' : 'en';
}

function isRecord(value: unknown): value is AnalysisRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function scalarText(value: unknown, language: Language): string {
  if (typeof value === 'boolean') return VALUE_COPY[language][String(value)];
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'string') {
    const clean = value.trim();
    return VALUE_COPY[language][clean.toLowerCase()] || clean;
  }
  return '';
}

function safeFileName(value: string): string {
  const normalized = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
  return `${normalized || 'voxa-conversation'}-report.pdf`;
}

export function createAnalysisPdfDocument({ analysis, recording, locale }: PdfInput): jsPDF {
  const language = languageFor(locale);
  const copy = { ...COPY[language], ...FIELD_COPY[language] };
  const safe = isRecord(analysis) ? analysis : {};
  const summary = isRecord(safe.summary) ? safe.summary : {};
  const evidenceQuality = isRecord(safe.evidenceQuality) ? safe.evidenceQuality : {};
  const modes = asArray(safe.analysisModes).map((mode) => scalarText(mode, language)).filter(Boolean);
  const keyPoints = asArray(summary.keyPoints);
  const limitations = asArray(evidenceQuality.limitations).map((item) => scalarText(item, language)).filter(Boolean);
  const doc = new jsPDF({ format: 'a4', unit: 'mm', compress: true, putOnlyUsedFonts: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 18;
  const contentWidth = pageWidth - (marginX * 2);
  const bottomLimit = pageHeight - 20;
  const ink: [number, number, number] = [31, 33, 30];
  const muted: [number, number, number] = [101, 106, 100];
  const accent: [number, number, number] = [62, 82, 66];
  const line: [number, number, number] = [214, 217, 212];
  const paper: [number, number, number] = [246, 247, 244];
  let y = 17;

  const addPage = () => { doc.addPage(); y = 18; };
  const ensureSpace = (height: number) => { if (y + height > bottomLimit) addPage(); };
  const labelFor = (key: string) => copy[key] || key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replaceAll('_', ' ').replace(/^./, (character) => character.toUpperCase());
  const measure = (text: string, size: number, width = contentWidth) => {
    doc.setFontSize(size);
    return (doc.splitTextToSize(text, width) as string[]).length * size * 0.43;
  };
  const addText = (text: string, options: { size?: number; bold?: boolean; color?: [number, number, number]; width?: number; x?: number; gapAfter?: number } = {}) => {
    const clean = text.trim();
    if (!clean) return;
    const size = options.size ?? 9.4;
    const width = options.width ?? contentWidth;
    const x = options.x ?? marginX;
    const gap = options.gapAfter ?? 2;
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...(options.color ?? ink));
    const lines = doc.splitTextToSize(clean, width) as string[];
    const lineHeight = size * 0.43;
    for (const lineText of lines) {
      ensureSpace(lineHeight + gap);
      doc.text(lineText, x, y);
      y += lineHeight;
    }
    y += gap;
  };
  const addEyebrow = (text: string) => addText(text.toUpperCase(), { size: 7, bold: true, color: accent, gapAfter: 4.5 });
  const addSectionTitle = (text: string) => {
    ensureSpace(22);
    if (y > 23) { doc.setDrawColor(...line); doc.line(marginX, y, pageWidth - marginX, y); y += 5; }
    addText(text, { size: 16, bold: true, gapAfter: 5 });
  };
  const addSubheading = (text: string) => {
    ensureSpace(15);
    addText(text, { size: 10.5, bold: true, gapAfter: 3 });
  };
  const addPanel = (title: string, body: string, tone: 'plain' | 'muted' = 'plain') => {
    const titleHeight = measure(title, 8.5, contentWidth - 12);
    const bodyHeight = measure(body, 9.3, contentWidth - 12);
    const height = Math.max(18, titleHeight + bodyHeight + 10);
    ensureSpace(height + 4);
    doc.setFillColor(...(tone === 'muted' ? [242, 239, 232] as [number, number, number] : paper));
    doc.setDrawColor(...line);
    doc.rect(marginX, y, contentWidth, height, 'FD');
    const start = y;
    y += 5;
    addText(title.toUpperCase(), { size: 7, bold: true, color: muted, width: contentWidth - 12, x: marginX + 6, gapAfter: 2 });
    addText(body, { size: 9.3, width: contentWidth - 12, x: marginX + 6, gapAfter: 0 });
    y = start + height + 4;
  };
  const addStatStrip = () => {
    const stats = [
      [copy.evidenceQuality, scalarText(evidenceQuality.level, language) || '—'],
      [copy.analysisModes, String(modes.length)],
      [copy.keyPoints, String(keyPoints.length)],
      [copy.version, scalarText(safe.version, language) || '—'],
    ];
    ensureSpace(22);
    doc.setDrawColor(...line);
    doc.line(marginX, y, pageWidth - marginX, y);
    const columnWidth = contentWidth / stats.length;
    stats.forEach(([label, value], index) => {
      const x = marginX + (index * columnWidth);
      if (index) doc.line(x, y + 3, x, y + 18);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...muted); doc.text(label.toUpperCase(), x + 3, y + 6);
      doc.setFontSize(12); doc.setTextColor(...ink); doc.text(value, x + 3, y + 14);
    });
    y += 24;
  };
  const addEvidence = (items: unknown[]) => {
    const evidence = items.filter(isRecord).filter((item) => scalarText(item.quote, language));
    if (!evidence.length) return;
    evidence.forEach((item) => {
      const speaker = scalarText(item.speaker, language);
      const quote = scalarText(item.quote, language);
      const body = speaker ? `${speaker}: “${quote}”` : `“${quote}”`;
      const height = measure(body, 8.6, contentWidth - 8) + 8;
      ensureSpace(height);
      addText(copy.transcriptEvidence.toUpperCase(), { size: 6.7, bold: true, color: accent, x: marginX + 4, width: contentWidth - 8, gapAfter: 1.5 });
      const start = y - 5;
      addText(body, { size: 8.6, color: muted, x: marginX + 4, width: contentWidth - 8, gapAfter: 3 });
      doc.setDrawColor(...accent);
      doc.setLineWidth(0.45);
      doc.line(marginX, start, marginX, y - 2);
      doc.setLineWidth(0.2);
    });
  };
  const estimateNodeHeight = (value: unknown): number => {
    if (value === null || value === undefined || value === '') return 0;
    if (scalarText(value, language)) return 5.5;
    if (Array.isArray(value)) return value.reduce((total, item) => total + estimateNodeHeight(item), 0);
    if (!isRecord(value)) return 0;
    return Object.entries(value).reduce((total, [childKey, childValue]) => {
      if (childKey === 'evidence' && Array.isArray(childValue)) return total + (childValue.length * 13);
      return total + estimateNodeHeight(childValue);
    }, 0);
  };
  const renderNode = (key: string, value: unknown, depth = 0) => {
    if (value === null || value === undefined || value === '') return;
    if (key === 'evidence' && Array.isArray(value)) { addEvidence(value); return; }
    const scalar = scalarText(value, language);
    if (scalar) {
      addText(`${labelFor(key)}: ${scalar}`, { color: depth > 1 ? muted : ink, gapAfter: 1.8 });
      return;
    }
    if (Array.isArray(value)) {
      if (!value.length) return;
      ensureSpace(Math.min(60, estimateNodeHeight(value[0]) + 17));
      addSubheading(labelFor(key));
      value.forEach((item, index) => {
        const itemScalar = scalarText(item, language);
        if (itemScalar) { addText(`• ${itemScalar}`, { gapAfter: 1.5 }); return; }
        if (!isRecord(item)) return;
        ensureSpace(Math.min(60, estimateNodeHeight(item) + 9));
        const titleKey = TITLE_KEYS.find((candidate) => scalarText(item[candidate], language));
        const title = titleKey ? scalarText(item[titleKey], language) : `${labelFor(key)} ${index + 1}`;
        ensureSpace(14);
        addText(`${String(index + 1).padStart(2, '0')}  ${title}`, { bold: true, gapAfter: 2.5 });
        Object.entries(item).forEach(([childKey, childValue]) => { if (childKey !== titleKey) renderNode(childKey, childValue, depth + 1); });
        y += 2;
      });
      return;
    }
    if (isRecord(value)) {
      const entries = Object.entries(value).filter(([, child]) => child !== null && child !== undefined && child !== '' && (!Array.isArray(child) || child.length));
      if (!entries.length) return;
      if (key === 'nextMeeting') ensureSpace(Math.min(60, estimateNodeHeight(value) + 8));
      addSubheading(labelFor(key));
      entries.forEach(([childKey, childValue]) => renderNode(childKey, childValue, depth + 1));
    }
  };

  doc.setProperties({ title: `${recording.name} — Voxa`, subject: copy.report, author: 'Voxa', creator: 'Voxa Web' });
  addText('Voxa.', { size: 13, bold: true, color: accent, gapAfter: 10 });
  addEyebrow(copy.report);
  addText(scalarText(summary.title, language) || recording.name || 'Voxa conversation', { size: 25, bold: true, gapAfter: 6 });
  const executiveBrief = isRecord(summary.executiveBrief) ? scalarText(summary.executiveBrief.statement, language) : scalarText(summary.executiveBrief, language);
  addText(executiveBrief, { size: 12.5, color: [67, 72, 66], gapAfter: 6 });
  const purpose = isRecord(summary.purpose) ? scalarText(summary.purpose.statement, language) : scalarText(summary.purpose, language);
  if (purpose) addPanel(copy.purpose, purpose);

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
  if (recording.createdAt) addText(`${copy.recorded}: ${dateFormatter.format(new Date(recording.createdAt))}`, { size: 8.2, color: muted, gapAfter: 1 });
  addText(`${copy.generated}: ${dateFormatter.format(new Date())}`, { size: 8.2, color: muted, gapAfter: 5 });
  addStatStrip();

  if (keyPoints.length) {
    addSectionTitle(copy.keyPoints);
    keyPoints.forEach((item, index) => {
      if (!isRecord(item)) return;
      const statement = scalarText(item.statement, language);
      const category = scalarText(item.category, language) || `${copy.keyPoints} ${index + 1}`;
      if (statement) addPanel(`${String(index + 1).padStart(2, '0')} · ${category}`, statement);
    });
  }
  if (limitations.length) {
    addSectionTitle(copy.limitations);
    addPanel(copy.evidenceQuality, limitations.map((item) => `• ${item}`).join('\n'), 'muted');
  }
  addText(copy.verify, { size: 7.8, color: muted, gapAfter: 3 });

  const modeEntries: Array<[string, unknown]> = [['interview', safe.interview], ['languageClass', safe.languageClass], ['meeting', safe.meeting]];
  let lensIndex = 0;
  modeEntries.forEach(([key, value]) => {
    if (!isRecord(value)) return;
    lensIndex += 1;
    if (lensIndex === 1 || y > 90) addPage();
    else {
      doc.setDrawColor(...line);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 9;
    }
    addEyebrow(`${copy.lens} ${String(lensIndex).padStart(2, '0')}`);
    addText(copy[key], { size: 22, bold: true, gapAfter: 8 });
    Object.entries(value).forEach(([childKey, childValue]) => renderNode(childKey, childValue));
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...line);
    doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...muted);
    doc.text('Voxa', marginX, pageHeight - 9);
    doc.text(`${copy.page} ${page} ${copy.of} ${pageCount}`, pageWidth - marginX, pageHeight - 9, { align: 'right' });
  }
  return doc;
}

export function createAnalysisPdf(input: PdfInput): Blob {
  return createAnalysisPdfDocument(input).output('blob');
}

export async function downloadAnalysisPdf(input: PdfInput): Promise<string> {
  const fileName = safeFileName(input.recording.name);
  const blob = createAnalysisPdf(input);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  return fileName;
}
