import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileAudio,
  FileText,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { LibraryStatus, Recording } from '../App';
import { useLanguage } from '../contexts/LanguageContext';
import AIAnalysis from './AIAnalysis';

interface HistoryViewProps {
  recordings: Recording[];
  selectedId: string | null;
  onSelect: (id: string | null, autoProcess?: boolean) => void;
  loadRecordings: () => Promise<void>;
  libraryStatus: LibraryStatus;
  libraryError: string;
  onRetry: () => void;
  onStartRecording: () => void;
  autoProcess?: boolean;
}

type TranscriptState = {
  markdown?: string;
  status?: string;
  isTranscribing: boolean;
  error?: boolean;
};

type AnalysisState = {
  analysis?: any;
  status?: string;
  isAnalyzing: boolean;
  error?: boolean;
};

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function TranscriptDocument({ markdown, youLabel }: { markdown: string; youLabel: string }) {
  const blocks = markdown.split(/(?:\r?\n){2,}/).filter((block) => block.trim());

  return (
    <article className="transcript-document">
      {blocks.map((block, index) => {
        const lines = block.split(/\r?\n/).filter((line) => line.trim());
        if (lines.length === 1) {
          return <div className="transcript-divider" key={`${lines[0]}-${index}`}>{lines[0]}</div>;
        }

        const [heading, ...body] = lines;
        const rawHeading = heading.replace(/\*\*/g, '').trim();
        const isSelf = rawHeading.includes('Speaker 0');
        const timestamp = rawHeading.match(/\((.*?)\)/)?.[1];
        const speaker = isSelf ? youLabel : rawHeading.split('(')[0].trim();

        return (
          <section className="transcript-block" key={`${rawHeading}-${index}`}>
            <header>
              <strong>{speaker}</strong>
              {timestamp && <time>{timestamp}</time>}
            </header>
            <p>{body.join(' ').trim()}</p>
          </section>
        );
      })}
    </article>
  );
}

export default function HistoryView({
  recordings,
  selectedId,
  onSelect,
  loadRecordings,
  libraryStatus,
  libraryError,
  onRetry,
  onStartRecording,
  autoProcess,
}: HistoryViewProps) {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState('');
  const [transcriptData, setTranscriptData] = useState<TranscriptState>({ isTranscribing: false });
  const [aiData, setAiData] = useState<AnalysisState>({ isAnalyzing: false });
  const [activeTab, setActiveTab] = useState<'transcript' | 'analysis'>('transcript');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [autoProcessStep, setAutoProcessStep] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoProcessAttemptedRef = useRef<string | null>(null);

  const selected = recordings.find((recording) => recording.id === selectedId);
  const sortedRecordings = useMemo(
    () => [...recordings].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
    [recordings],
  );
  const filteredRecordings = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return sortedRecordings;
    return sortedRecordings.filter((recording) => recording.name.toLocaleLowerCase().includes(normalized));
  }, [query, sortedRecordings]);

  const locale = language === 'pt' ? 'pt-BR' : language === 'es' ? 'es-ES' : 'en-US';

  useEffect(() => {
    async function loadSelectedRecording() {
      if (!selected) return;

      setIsPlaying(false);
      setCurrentTime(0);
      setActiveTab('transcript');
      setTranscriptData({ isTranscribing: false });
      setAiData({ isAnalyzing: false });
      setShowDeleteDialog(false);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = selected.playbackUrl || '';
      }

      if (!selected.transcript) {
        setTranscriptData({ isTranscribing: false, status: t('history', 'noTranscript') });
        setAiData({ isAnalyzing: false, status: t('history', 'transcriptRequired') });
        return;
      }

      try {
        const result = await window.recorder.getTranscript(selected.id);
        setTranscriptData({
          markdown: result?.markdown || '',
          isTranscribing: false,
          status: t('history', 'transcriptSaved'),
        });

        const analysis = await window.recorder.getAnalysis(selected.id);
        setAiData(analysis
          ? { analysis, isAnalyzing: false }
          : { isAnalyzing: false, status: t('history', 'noAnalysis') });
      } catch (error: any) {
        setTranscriptData({ isTranscribing: false, status: error?.message || t('history', 'loadFailed'), error: true });
      }
    }

    loadSelectedRecording();
  }, [selectedId, selected?.transcript, selected?.playbackUrl, t]);

  useEffect(() => {
    async function runAutoProcess() {
      if (!autoProcess || !selected || selected.transcript || autoProcessAttemptedRef.current === selected.id) return;
      autoProcessAttemptedRef.current = selected.id;
      setIsAutoProcessing(true);
      setAutoProcessStep(t('history', 'transcribingStep'));

      try {
        const result = await window.recorder.transcribeWithDeepgram({ recordingId: selected.id, maxQuality: false });
        setTranscriptData({ markdown: result.markdown, isTranscribing: false, status: t('history', 'transcriptSaved') });
        await loadRecordings();

        setAutoProcessStep(t('history', 'analyzingStep'));
        const analysis = await window.recorder.analyzeWithLLM(selected.id);
        setAiData({ analysis, isAnalyzing: false });
        setActiveTab('analysis');
      } catch (error: any) {
        setTranscriptData((current) => ({ ...current, isTranscribing: false, status: error?.message || t('history', 'processingFailed'), error: true }));
      } finally {
        setIsAutoProcessing(false);
      }
    }

    runAutoProcess();
  }, [autoProcess, loadRecordings, selected, t]);

  const togglePlay = () => {
    if (!audioRef.current || !selected) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play().catch(() => undefined);
    setIsPlaying((value) => !value);
  };

  const handleTranscribe = async () => {
    if (!selected) return;
    setTranscriptData({ isTranscribing: true, status: t('history', 'transcribingStep') });
    try {
      const result = await window.recorder.transcribeWithDeepgram({ recordingId: selected.id, maxQuality: false });
      setTranscriptData({ markdown: result.markdown, isTranscribing: false, status: t('history', 'transcriptSaved') });
      await loadRecordings();
    } catch (error: any) {
      setTranscriptData({ isTranscribing: false, status: error?.message || t('history', 'processingFailed'), error: true });
    }
  };

  const handleAnalyze = async () => {
    if (!selected) return;
    setAiData({ isAnalyzing: true, status: t('history', 'analyzingStep') });
    setActiveTab('analysis');
    try {
      setAiData({ analysis: await window.recorder.analyzeWithLLM(selected.id), isAnalyzing: false });
    } catch (error: any) {
      setAiData({ isAnalyzing: false, status: error?.message || t('history', 'processingFailed'), error: true });
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setIsDeleting(true);
    try {
      await window.recorder.deleteRecording(selected.id);
      setShowDeleteDialog(false);
      onSelect(null);
      await loadRecordings();
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!selected) {
    return (
      <main className="library-view">
        <section className="library-intro">
          <div>
            <h2>{t('library', 'title')}</h2>
            <p>{t('library', 'subtitle')}</p>
          </div>
          <label className="search-field">
            <Search />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('history', 'search')} />
          </label>
        </section>

        {libraryStatus === 'loading' && recordings.length === 0 ? (
          <div className="library-list">
            {[0, 1, 2, 3].map((item) => <div className="library-row skeleton-row" key={item} />)}
          </div>
        ) : libraryStatus === 'error' ? (
          <div className="empty-state library-empty">
            <span className="empty-icon"><RefreshCw /></span>
            <strong>{t('library', 'offlineTitle')}</strong>
            <p>{libraryError || t('library', 'offlineDescription')}</p>
            <button type="button" className="button button-secondary" onClick={onRetry}>{t('common', 'retry')}</button>
          </div>
        ) : recordings.length === 0 ? (
          <div className="empty-state library-empty">
            <span className="empty-icon"><FileAudio /></span>
            <strong>{t('library', 'emptyTitle')}</strong>
            <p>{t('library', 'emptyDescription')}</p>
            <button type="button" className="button button-primary" onClick={onStartRecording}>{t('navigation', 'newRecording')}</button>
          </div>
        ) : filteredRecordings.length === 0 ? (
          <div className="empty-state library-empty">
            <span className="empty-icon"><Search /></span>
            <strong>{t('library', 'noResults')}</strong>
            <p>{t('library', 'noResultsDescription')}</p>
          </div>
        ) : (
          <div className="library-list">
            <div className="library-list-header">
              <span>{t('library', 'conversation')}</span>
              <span>{t('library', 'date')}</span>
              <span>{t('library', 'duration')}</span>
              <span>{t('library', 'status')}</span>
            </div>
            {filteredRecordings.map((recording) => (
              <button key={recording.id} type="button" className="library-row" onClick={() => onSelect(recording.id)}>
                <span className="library-name">
                  <span className="recording-file-icon">{recording.transcript ? <FileText /> : <FileAudio />}</span>
                  <span><strong>{recording.name}</strong><small>{recording.transcript ? t('library', 'transcriptReady') : t('library', 'audioSaved')}</small></span>
                </span>
                <time>{recording.createdAt ? new Date(recording.createdAt).toLocaleDateString(locale) : '—'}</time>
                <span>{formatDuration(recording.durationMs)}</span>
                <span className={recording.transcript ? 'recording-state is-ready' : 'recording-state'}>{recording.transcript ? t('library', 'ready') : t('library', 'audio')}</span>
              </button>
            ))}
          </div>
        )}
      </main>
    );
  }

  const durationSeconds = Math.max(0, selected.durationMs / 1000);
  const progress = durationSeconds ? Math.min(100, (currentTime / durationSeconds) * 100) : 0;

  return (
    <main className="detail-view">
      <audio
        ref={audioRef}
        src={selected.playbackUrl}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
      />

      <header className="detail-header">
        <button type="button" className="back-button" onClick={() => onSelect(null)}><ArrowLeft /> {t('library', 'back')}</button>
        <div className="detail-title-row">
          <div>
            <h2>{selected.name}</h2>
            <div className="detail-meta">
              <span><CalendarDays /> {selected.createdAt ? new Date(selected.createdAt).toLocaleString(locale) : t('library', 'unknownDate')}</span>
              <span><Clock3 /> {formatDuration(selected.durationMs)}</span>
              <span><CheckCircle2 /> {selected.transcript ? t('library', 'transcriptReady') : t('library', 'audioSaved')}</span>
            </div>
          </div>
          <button type="button" className="icon-button danger-icon" onClick={() => setShowDeleteDialog(true)} aria-label={t('history', 'deleteRecording')}><Trash2 /></button>
        </div>
      </header>

      <section className="audio-player">
        <button type="button" className="player-button" onClick={togglePlay} aria-label={isPlaying ? t('history', 'pauseAudio') : t('history', 'playAudio')}>
          {isPlaying ? <Pause /> : <Play />}
        </button>
        <div className="player-track">
          <div className="player-times"><time>{formatDuration(currentTime * 1000)}</time><time>{formatDuration(selected.durationMs)}</time></div>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        </div>
      </section>

      {isAutoProcessing && (
        <div className="processing-banner" role="status">
          <Loader2 className="spin" />
          <div><strong>{autoProcessStep}</strong><p>{t('history', 'processingDescription')}</p></div>
        </div>
      )}

      <section className="detail-content">
        <header className="detail-tabs-row">
          <div className="detail-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={activeTab === 'transcript'} className={activeTab === 'transcript' ? 'is-active' : ''} onClick={() => setActiveTab('transcript')}>
              <FileText /> {t('history', 'transcript')}
            </button>
            <button type="button" role="tab" aria-selected={activeTab === 'analysis'} className={activeTab === 'analysis' ? 'is-active' : ''} onClick={() => setActiveTab('analysis')}>
              <BrainCircuit /> {t('history', 'aiAnalysis')}
            </button>
          </div>

          {activeTab === 'transcript' ? (
            <button type="button" className="button button-secondary" onClick={handleTranscribe} disabled={transcriptData.isTranscribing} data-keyboard-primary="true">
              {transcriptData.isTranscribing ? <Loader2 className="spin" /> : <FileText />}
              {transcriptData.markdown ? t('history', 'retranscribe') : t('history', 'transcribeAudio')}
            </button>
          ) : transcriptData.markdown ? (
            <button type="button" className="button button-secondary" onClick={handleAnalyze} disabled={aiData.isAnalyzing} data-keyboard-primary="true">
              {aiData.isAnalyzing ? <Loader2 className="spin" /> : <Sparkles />}
              {aiData.analysis ? t('history', 'reAnalyze') : t('history', 'generateAiReport')}
            </button>
          ) : null}
        </header>

        <div className="detail-panel">
          <AnimatePresence mode="wait" initial={false}>
            {activeTab === 'transcript' ? (
              <motion.div key="transcript" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {transcriptData.isTranscribing ? (
                  <div className="content-status"><Loader2 className="spin" /><strong>{t('history', 'transcribingStep')}</strong></div>
                ) : transcriptData.markdown ? (
                  <TranscriptDocument markdown={transcriptData.markdown} youLabel={t('history', 'you')} />
                ) : (
                  <div className={transcriptData.error ? 'content-status is-error' : 'content-status'}>
                    <FileText /><strong>{transcriptData.status || t('history', 'noTranscript')}</strong>
                    <p>{t('history', 'transcriptEmptyDescription')}</p>
                    <button type="button" className="button button-secondary" onClick={handleTranscribe}>{t('history', 'transcribeAudio')}</button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="analysis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {aiData.isAnalyzing ? (
                  <div className="content-status"><Loader2 className="spin" /><strong>{t('history', 'analyzingStep')}</strong></div>
                ) : aiData.analysis ? (
                  <AIAnalysis analysis={aiData.analysis} />
                ) : (
                  <div className={aiData.error ? 'content-status is-error' : 'content-status'}>
                    <Sparkles /><strong>{aiData.status || t('history', 'readyForAnalysis')}</strong>
                    <p>{transcriptData.markdown ? t('history', 'analysisEmptyDescription') : t('history', 'transcriptRequired')}</p>
                    {transcriptData.markdown && <button type="button" className="button button-secondary" onClick={handleAnalyze}>{t('history', 'generateAiReport')}</button>}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <AnimatePresence>
        {showDeleteDialog && (
          <motion.div className="modal-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.section className="confirm-dialog" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 6, opacity: 0 }} role="alertdialog" aria-modal="true">
              <button type="button" className="icon-button confirm-close" onClick={() => setShowDeleteDialog(false)} aria-label={t('common', 'close')} data-keyboard-cancel="true"><X /></button>
              <span className="confirm-icon"><Trash2 /></span>
              <h3>{t('history', 'deleteTitle')}</h3>
              <p>{t('history', 'deleteConfirm')}</p>
              <div className="confirm-actions">
                <button type="button" className="button button-secondary" onClick={() => setShowDeleteDialog(false)}>{t('common', 'cancel')}</button>
                <button type="button" className="button button-danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting && <Loader2 className="spin" />}{t('common', 'delete')}</button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
