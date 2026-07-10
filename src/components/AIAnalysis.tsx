import { useState } from 'react';
import { Activity, BarChart3, BrainCircuit, CheckCircle, MessageCircle, Target, TrendingUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface AIAnalysisProps {
  analysis: any;
}

export default function AIAnalysis({ analysis }: AIAnalysisProps) {
  const { t } = useLanguage();
  const speakers = Array.isArray(analysis?.speakers) ? analysis.speakers : [];
  const [activeSpeaker, setActiveSpeaker] = useState(speakers[0]?.id || '');

  if (!analysis || speakers.length === 0) {
    return <div className="analysis-empty">{t('ai', 'noData')}</div>;
  }

  const speaker = speakers.find((item: any) => item.id === activeSpeaker) || speakers[0];
  const metrics = [
    { icon: Activity, label: t('ai', 'range'), value: speaker.proficiency?.range },
    { icon: CheckCircle, label: t('ai', 'accuracy'), value: speaker.proficiency?.accuracy },
    { icon: TrendingUp, label: t('ai', 'fluency'), value: speaker.proficiency?.fluency },
    { icon: MessageCircle, label: t('ai', 'interaction'), value: speaker.proficiency?.interaction },
  ];

  return (
    <div className="analysis-view">
      <section className="analysis-overview">
        <div className="analysis-section-title"><Target /><span>{t('ai', 'overview')}</span></div>
        <div className="analysis-overview-grid">
          <div><small>{t('ai', 'primaryIntent')}</small><p>{analysis.summary?.intent || '—'}</p></div>
          <div><small>{t('ai', 'summary')}</small><p>{analysis.summary?.overview || '—'}</p></div>
        </div>
      </section>

      <div className="speaker-tabs" role="tablist" aria-label={t('ai', 'speakers')}>
        {speakers.map((item: any) => (
          <button
            type="button"
            role="tab"
            aria-selected={activeSpeaker === item.id}
            key={item.id}
            className={activeSpeaker === item.id ? 'is-active' : ''}
            onClick={() => setActiveSpeaker(item.id)}
          >
            {item.id}
          </button>
        ))}
      </div>

      <div className="analysis-grid">
        <aside className="analysis-score-card">
          <small>{t('ai', 'cefrLevel')}</small>
          <strong>{speaker.proficiency?.level || '?'}</strong>
          <span>{speaker.id}</span>
        </aside>

        <section className="analysis-metrics">
          <div className="analysis-section-title"><BarChart3 /><span>{t('ai', 'proficiencyBreakdown')}</span></div>
          <div className="analysis-metrics-grid">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <span><metric.icon /> {metric.label}</span>
                <p>{metric.value || '—'}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="analysis-notes-grid">
        <section>
          <div className="analysis-section-title"><BrainCircuit /><span>{t('ai', 'behavioralNlp')}</span></div>
          <p>{speaker.nlp || '—'}</p>
        </section>
        <section className="analysis-feedback">
          <div className="analysis-section-title"><TrendingUp /><span>{t('ai', 'actionableFeedback')}</span></div>
          <p>{speaker.feedback || '—'}</p>
        </section>
      </div>
    </div>
  );
}
