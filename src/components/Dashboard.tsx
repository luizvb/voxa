import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AudioLines,
  Check,
  ChevronDown,
  Clock3,
  FileAudio,
  FileText,
  Keyboard,
  Mic,
  Pause,
  Play,
  Radio,
  RefreshCw,
  ScreenShare,
  Settings2,
  Square,
} from 'lucide-react';
import type { LibraryStatus } from '../App';
import { platform, type Recording, type TranscriptionLanguage } from '../platform';
import { useLanguage } from '../contexts/LanguageContext';
import { useRecorder } from '../hooks/useRecorder';
import { getSavedTranscriptionLanguage, saveTranscriptionLanguage, TRANSCRIPTION_LANGUAGES } from '../lib/transcription-language';

interface DashboardProps {
  recordings: Recording[];
  libraryStatus: LibraryStatus;
  onRetry: () => void;
  onOpenLibrary: () => void;
  onSelectRecording: (id: string) => void;
  onRecordingComplete: (id: string) => void;
}

type ShortcutSettings = { record: string; options: string[] };
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
  const { t, language } = useLanguage();
  const {
    isRecording,
    isPaused,
    status,
    captureMode,
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
  const [transcriptionLanguage, setTranscriptionLanguage] = useState<TranscriptionLanguage>(() => getSavedTranscriptionLanguage(language));

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
        if (!platform.getShortcutSettings) return;
        setShortcutSettings(await platform.getShortcutSettings());
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

    if (!platform.subscribeToShortcutRecord) return;
    return platform.subscribeToShortcutRecord(handleShortcut);
  }, [isRecording, onRecordingComplete, startRecording, stopRecording]);

  const handleShortcutChange = async (nextShortcut: string) => {
    try {
      setShortcutStatus(t('recorder', 'savingShortcut'));
      if (!platform.setRecordShortcut) return;
      setShortcutSettings(await platform.setRecordShortcut(nextShortcut));
      setShortcutStatus(t('recorder', 'shortcutUpdated'));
    } catch (error: any) {
      setShortcutStatus(error?.message || t('recorder', 'shortcutFailed'));
    }
  };

  const handleMicrophoneSettings = async () => {
    try {
      setMicStatus(t('recorder', 'openingAudioSettings'));
      if (platform.openMicrophoneSettings && await platform.openMicrophoneSettings()) {
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

  const handleTranscriptionLanguageChange = (nextLanguage: TranscriptionLanguage) => {
    setTranscriptionLanguage(nextLanguage);
    saveTranscriptionLanguage(nextLanguage);
  };

  const handleStop = async () => {
    try {
      const saved = await stopRecording();
      if (saved?.id) onRecordingComplete(saved.id);
    } catch (error) {
      console.error(error);
    }
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
          {platform.capabilities.globalShortcuts && <div className="shortcut-control">
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
          </div>}
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

          <label className="transcription-language-field">
            <span>{t('common', 'transcriptionLanguage')}</span>
            <select
              value={transcriptionLanguage}
              onChange={(event) => handleTranscriptionLanguageChange(event.target.value as TranscriptionLanguage)}
              disabled={isRecording}
            >
              {TRANSCRIPTION_LANGUAGES.map((item) => (
                <option value={item} key={item}>{t('common', item === 'pt-BR' ? 'portuguese' : item === 'es' ? 'spanish' : 'english')}</option>
              ))}
            </select>
            <small>{t('recorder', 'transcriptionLanguageDescription')}</small>
          </label>

          <p className="recorder-description">
            {phase === 'error'
              ? status
              : isRecording
                ? captureMode === 'shared' ? t('recorder', 'recordingDescriptionShared') : t('recorder', 'recordingDescriptionMicrophone')
                : platform.capabilities.kind === 'web' ? t('recorder', 'idleDescriptionWeb') : t('recorder', 'idleDescription')}
          </p>
          {micStatus && <p className="inline-notice">{micStatus}</p>}

          {!isRecording && platform.capabilities.kind === 'web' ? (
            <div className="capture-choice-grid" aria-label={t('recorder', 'captureSource')}>
              <button
                type="button"
                className="capture-choice is-primary"
                onClick={() => startRecording({ captureMode: 'microphone' })}
                data-keyboard-primary="true"
              >
                <span className="capture-choice-icon"><Mic /></span>
                <span><strong>{t('recorder', 'recordComputerAudio')}</strong><small>{t('recorder', 'recordComputerAudioDescription')}</small></span>
              </button>
              <button
                type="button"
                className="capture-choice"
                onClick={() => startRecording({ captureMode: 'shared' })}
              >
                <span className="capture-choice-icon"><ScreenShare /></span>
                <span><strong>{t('recorder', 'shareTabOrScreen')}</strong><small>{t('recorder', 'shareTabOrScreenDescription')}</small></span>
              </button>
            </div>
          ) : (
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
              {platform.capabilities.globalShortcuts && <span className="shortcut-hint">{t('recorder', 'shortcut')}: {currentShortcut}</span>}
            </div>
          )}
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
            <div><dt>{t('recorder', 'input')}</dt><dd>{captureMode === 'shared' ? t('recorder', 'inputShared') : t('recorder', 'inputMicrophone')}</dd></div>
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
