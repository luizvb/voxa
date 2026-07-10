import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AudioLines,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Clock3,
  FileAudio,
  FileText,
  Keyboard,
  Languages,
  Mic,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Settings2,
  Square,
  Users,
} from 'lucide-react';
import type { LibraryStatus, Recording } from '../App';
import { useLanguage } from '../contexts/LanguageContext';
import { useRecorder } from '../hooks/useRecorder';

interface DashboardProps {
  recordings: Recording[];
  libraryStatus: LibraryStatus;
  onRetry: () => void;
  onOpenLibrary: () => void;
  onSelectRecording: (id: string) => void;
  onRecordingComplete: (id: string) => void;
}

type ShortcutSettings = { record: string; options: string[] };
type AnalysisMode = 'interview' | 'language' | 'meeting';

const analysisModeIcons = { interview: BriefcaseBusiness, language: Languages, meeting: Users };

function getSavedAnalysisModes(): AnalysisMode[] {
  try {
    const value = JSON.parse(localStorage.getItem('voxa_analysis_modes') || '[]');
    const modes = Array.isArray(value) ? value.filter((item): item is AnalysisMode => ['interview', 'language', 'meeting'].includes(item)) : [];
    return modes.length > 0 ? modes : ['language'];
  } catch {
    return ['language'];
  }
}

const shortcutLabels: Record<string, string> = {
  'Option+Space': 'Option + Space',
  'CommandOrControl+Shift+Space': 'Command + Shift + Space',
  'Option+R': 'Option + R',
};

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function Dashboard({
  recordings,
  libraryStatus,
  onRetry,
  onOpenLibrary,
  onSelectRecording,
  onRecordingComplete,
}: DashboardProps) {
  const { t } = useLanguage();
  const {
    isRecording,
    isPaused,
    status,
    formattedTime,
    sessionName,
    setSessionName,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  } = useRecorder();

  const [shortcutSettings, setShortcutSettings] = useState<ShortcutSettings>({
    record: 'Option+Space',
    options: ['Option+Space'],
  });
  const [isShortcutPanelOpen, setIsShortcutPanelOpen] = useState(false);
  const [shortcutStatus, setShortcutStatus] = useState('');
  const [micStatus, setMicStatus] = useState('');
  const [analysisModes, setAnalysisModes] = useState<AnalysisMode[]>(getSavedAnalysisModes);

  const currentShortcut = shortcutLabels[shortcutSettings.record] || shortcutSettings.record;
  const recentRecordings = useMemo(
    () => [...recordings]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5),
    [recordings],
  );

  const phase = isRecording
    ? isPaused ? 'paused' : 'recording'
    : status.toLowerCase().includes('preparing')
      ? 'preparing'
      : status.toLowerCase().includes('saving')
        ? 'saving'
        : status.toLowerCase().includes('fail') || status.toLowerCase().includes('denied')
          ? 'error'
          : 'idle';

  const phaseLabel = t('recorder', phase);

  useEffect(() => {
    async function loadShortcutSettings() {
      try {
        if (!window.recorder?.getShortcutSettings) return;
        setShortcutSettings(await window.recorder.getShortcutSettings());
      } catch (error) {
        console.error(error);
      }
    }
    loadShortcutSettings();
  }, []);

  useEffect(() => {
    const handleShortcut = async () => {
      if (isRecording) {
        const saved = await stopRecording();
        if (saved?.id) onRecordingComplete(saved.id);
      } else {
        await startRecording();
      }
    };

    if (!window.recorder) return;
    window.recorder.onShortcutRecord(handleShortcut);
    return () => window.recorder.removeShortcutRecord(handleShortcut);
  }, [isRecording, onRecordingComplete, startRecording, stopRecording]);

  const handleShortcutChange = async (nextShortcut: string) => {
    try {
      setShortcutStatus(t('recorder', 'savingShortcut'));
      setShortcutSettings(await window.recorder.setRecordShortcut(nextShortcut));
      setShortcutStatus(t('recorder', 'shortcutUpdated'));
    } catch (error: any) {
      setShortcutStatus(error?.message || t('recorder', 'shortcutFailed'));
    }
  };

  const handleMicrophoneSettings = async () => {
    try {
      setMicStatus(t('recorder', 'openingAudioSettings'));
      if (window.recorder?.openMicrophoneSettings && await window.recorder.openMicrophoneSettings()) {
        setMicStatus(t('recorder', 'audioSettingsOpened'));
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicStatus(t('recorder', 'microphoneReady'));
    } catch {
      setMicStatus(t('recorder', 'microphoneFailed'));
    }
  };

  const handleStop = async () => {
    try {
      const saved = await stopRecording();
      if (saved?.id) onRecordingComplete(saved.id);
    } catch (error) {
      console.error(error);
    }
  };

  const toggleAnalysisMode = (mode: AnalysisMode) => {
    setAnalysisModes((current) => {
      const next = current.includes(mode) ? current.filter((item) => item !== mode) : [...current, mode];
      const safeNext = next.length > 0 ? next : current;
      localStorage.setItem('voxa_analysis_modes', JSON.stringify(safeNext));
      return safeNext;
    });
  };

  return (
    <main className="workspace-view">
      <section className="workspace-intro">
        <div>
          <span className={phase === 'error' ? 'status-pill is-error' : phase === 'recording' ? 'status-pill is-recording' : 'status-pill'}>
            <span className="status-dot" />
            {phaseLabel}
          </span>
          <h2>{t('workspace', 'title')}</h2>
          <p>{t('workspace', 'subtitle')}</p>
        </div>
        <div className="workspace-tools">
          <div className="shortcut-control">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setIsShortcutPanelOpen((value) => !value)}
              aria-expanded={isShortcutPanelOpen}
            >
              <Keyboard />
              {currentShortcut}
              <ChevronDown className={isShortcutPanelOpen ? 'is-rotated' : ''} />
            </button>
            <AnimatePresence>
              {isShortcutPanelOpen && (
                <motion.div
                  className="shortcut-menu"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.12 }}
                >
                  {shortcutSettings.options.map((shortcut) => (
                    <button
                      key={shortcut}
                      type="button"
                      className={shortcutSettings.record === shortcut ? 'shortcut-option is-selected' : 'shortcut-option'}
                      onClick={() => handleShortcutChange(shortcut)}
                    >
                      <span>{shortcutLabels[shortcut] || shortcut}</span>
                      {shortcutSettings.record === shortcut && <Check />}
                    </button>
                  ))}
                  {shortcutStatus && <p>{shortcutStatus}</p>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button type="button" className="icon-button" onClick={handleMicrophoneSettings} aria-label={t('recorder', 'audioSettings')} title={t('recorder', 'audioSettings')}>
            <Settings2 />
          </button>
        </div>
      </section>

      <section className={phase === 'recording' ? 'recorder-card is-live' : phase === 'error' ? 'recorder-card is-error' : 'recorder-card'}>
        <div className="recorder-main">
          <div className="recorder-meta">
            <span><Radio /> {isRecording ? t('recorder', 'liveSession') : t('recorder', 'newSession')}</span>
            <time>{formattedTime}</time>
          </div>

          <label className="recording-title-field">
            <span>{t('recorder', 'sessionTitle')}</span>
            <input
              data-recording-title
              value={sessionName}
              onChange={(event) => setSessionName(event.target.value)}
              placeholder={t('recorder', 'titlePlaceholder')}
            />
          </label>

          <p className="recorder-description">
            {phase === 'error' ? status : isRecording ? t('recorder', 'recordingDescription') : t('recorder', 'idleDescription')}
          </p>
          {!isRecording && (
            <div className="recorder-analysis-modes">
              <span>{t('recorder', 'analyzeAs')}</span>
              <div>
                {(Object.keys(analysisModeIcons) as AnalysisMode[]).map((mode) => {
                  const Icon = analysisModeIcons[mode];
                  const selectedMode = analysisModes.includes(mode);
                  return <button key={mode} type="button" className={selectedMode ? 'is-selected' : ''} aria-pressed={selectedMode} onClick={() => toggleAnalysisMode(mode)}><Icon />{t('analysisModes', mode)}{selectedMode && <Check />}</button>;
                })}
              </div>
            </div>
          )}
          {micStatus && <p className="inline-notice">{micStatus}</p>}

          <div className="recorder-actions">
            {!isRecording ? (
              <button
                type="button"
                className="button button-primary recorder-primary"
                onClick={() => startRecording()}
                data-keyboard-primary="true"
              >
                <Mic />
                {t('recorder', 'start')}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={isPaused ? resumeRecording : pauseRecording}
                >
                  {isPaused ? <Play /> : <Pause />}
                  {isPaused ? t('recorder', 'resume') : t('recorder', 'pause')}
                </button>
                <button
                  type="button"
                  className="button button-danger recorder-primary"
                  onClick={handleStop}
                  data-keyboard-primary="true"
                >
                  <Square />
                  {t('recorder', 'stop')}
                </button>
              </>
            )}
            <span className="shortcut-hint">{t('recorder', 'shortcut')}: {currentShortcut}</span>
          </div>
        </div>

        <aside className="signal-panel" aria-label={t('recorder', 'signalMonitor')}>
          <div className="signal-header">
            <span>{t('recorder', 'signalMonitor')}</span>
            <strong>{formattedTime}</strong>
          </div>
          <div className={isRecording && !isPaused ? 'signal-bars is-active' : 'signal-bars'} aria-hidden>
            {Array.from({ length: 30 }).map((_, index) => (
              <span key={index} style={{ height: `${18 + ((index * 29) % 72)}%` }} />
            ))}
          </div>
          <dl className="signal-details">
            <div><dt>{t('recorder', 'input')}</dt><dd>{t('recorder', 'micAndSystem')}</dd></div>
            <div><dt>{t('recorder', 'saveMode')}</dt><dd>{t('recorder', 'localFirst')}</dd></div>
          </dl>
        </aside>
      </section>

      <section className="recent-section">
        <div className="section-heading-row">
          <div>
            <h3>{t('workspace', 'recent')}</h3>
            <p>{t('workspace', 'recentDescription')}</p>
          </div>
          <button type="button" className="text-button" onClick={onOpenLibrary}>
            {t('workspace', 'viewLibrary')}
          </button>
        </div>

        {libraryStatus === 'loading' && recentRecordings.length === 0 ? (
          <div className="recording-list" aria-label={t('common', 'loading')}>
            {[0, 1, 2].map((item) => <div className="recording-row skeleton-row" key={item} />)}
          </div>
        ) : libraryStatus === 'error' ? (
          <div className="empty-state compact-state">
            <span className="empty-icon"><RefreshCw /></span>
            <div><strong>{t('library', 'offlineTitle')}</strong><p>{t('library', 'offlineDescription')}</p></div>
            <button type="button" className="button button-secondary" onClick={onRetry}>{t('common', 'retry')}</button>
          </div>
        ) : recentRecordings.length === 0 ? (
          <div className="empty-state compact-state">
            <span className="empty-icon"><AudioLines /></span>
            <div><strong>{t('workspace', 'emptyTitle')}</strong><p>{t('workspace', 'emptyDescription')}</p></div>
          </div>
        ) : (
          <div className="recording-list">
            {recentRecordings.map((recording) => (
              <button key={recording.id} type="button" className="recording-row" onClick={() => onSelectRecording(recording.id)}>
                <span className="recording-file-icon">{recording.transcript ? <FileText /> : <FileAudio />}</span>
                <span className="recording-row-copy">
                  <strong>{recording.name}</strong>
                  <small><Clock3 /> {formatDuration(recording.durationMs)} · {recording.transcript ? t('library', 'transcriptReady') : t('library', 'audioSaved')}</small>
                </span>
                <span className={recording.transcript ? 'recording-state is-ready' : 'recording-state'}>
                  {recording.transcript ? t('library', 'ready') : t('library', 'audio')}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
