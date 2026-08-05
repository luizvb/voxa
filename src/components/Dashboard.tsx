import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AudioLines,
  Check,
  ChevronDown,
  Clock3,
  Download,
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
  ShieldCheck,
  Square,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import type { LibraryStatus } from '../App';
import { platform, type PendingRecording, type Recording, type TranscriptionLanguage } from '../platform';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../hooks/useAuth';
import { useRecorder } from '../hooks/useRecorder';
import { safeRecordingFileName } from '../lib/recording-recovery';
import { getSavedTranscriptionLanguage, saveTranscriptionLanguage, TRANSCRIPTION_LANGUAGES } from '../lib/transcription-language';

interface DashboardProps {
  recordings: Recording[];
  libraryStatus: LibraryStatus;
  onRetry: () => void;
  onOpenLibrary: () => void;
  onSelectRecording: (id: string) => void;
  onRecordingComplete: (id: string) => void;
  onImportTranscript: () => void;
  onImportAudio: () => void;
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
  onImportTranscript,
  onImportAudio,
}: DashboardProps) {
  const { t, language } = useLanguage();
  const { user, isAuthenticated } = useAuth();
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
    emergencyRecording,
    retryEmergencyRecording,
  } = useRecorder();

  const [shortcutSettings, setShortcutSettings] = useState<ShortcutSettings>({
    record: 'Option+Space',
    options: ['Option+Space'],
  });
  const [isShortcutPanelOpen, setIsShortcutPanelOpen] = useState(false);
  const [shortcutStatus, setShortcutStatus] = useState('');
  const [micStatus, setMicStatus] = useState('');
  const [transcriptionLanguage, setTranscriptionLanguage] = useState<TranscriptionLanguage>(() => getSavedTranscriptionLanguage(language));
  const [pendingRecordings, setPendingRecordings] = useState<PendingRecording[]>([]);
  const [recoveryBusyId, setRecoveryBusyId] = useState('');
  const [recoveryStatus, setRecoveryStatus] = useState('');
  const initialRecoveryAttemptedRef = useRef(false);

  const refreshPendingRecordings = useCallback(async () => {
    const items = platform.listPendingRecordings ? await platform.listPendingRecordings() : [];
    setPendingRecordings(items);
    return items;
  }, []);

  const resumeProtectedRecordings = useCallback(async (items: PendingRecording[]) => {
    if (!platform.retryPendingRecording || !navigator.onLine) return;
    for (const item of items) {
      setRecoveryBusyId(item.id);
      try {
        await platform.retryPendingRecording(item.id);
        await onRetry();
      } catch {
        // The draft remains local and actionable.
      }
    }
    setRecoveryBusyId('');
    await refreshPendingRecordings();
  }, [onRetry, refreshPendingRecordings]);

  useEffect(() => {
    let active = true;
    void refreshPendingRecordings().then((items) => {
      if (!active || initialRecoveryAttemptedRef.current || !items.length) return;
      initialRecoveryAttemptedRef.current = true;
      void resumeProtectedRecordings(items);
    }).catch(() => {});
    const unsubscribe = platform.subscribeToPendingRecordingsChanged?.(() => {
      if (active) void refreshPendingRecordings();
    });
    const handleOnline = () => { void refreshPendingRecordings().then(resumeProtectedRecordings); };
    window.addEventListener('online', handleOnline);
    return () => {
      active = false;
      unsubscribe?.();
      window.removeEventListener('online', handleOnline);
    };
  }, [refreshPendingRecordings, resumeProtectedRecordings]);

  const currentShortcut = shortcutLabels[shortcutSettings.record] || shortcutSettings.record;
  const firstName = (user?.name || user?.email?.split('@')[0] || '').trim().split(/\s+/)[0];
  const welcomeMessage = firstName
    ? t('workspace', 'greeting').replace('{name}', firstName)
    : t('workspace', 'greetingGuest');
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
      await refreshPendingRecordings().catch(() => {});
    }
  };

  const handleRetryPending = async (id: string) => {
    if (!platform.retryPendingRecording) return;
    setRecoveryBusyId(id);
    setRecoveryStatus('');
    try {
      const saved = await platform.retryPendingRecording(id);
      await refreshPendingRecordings();
      onRecordingComplete(saved.id);
    } catch (error: any) {
      setRecoveryStatus(error?.message || t('recovery', 'retryFailed'));
      await refreshPendingRecordings().catch(() => {});
    } finally {
      setRecoveryBusyId('');
    }
  };

  const handleDeletePending = async (id: string) => {
    if (!platform.deletePendingRecording || !window.confirm(t('recovery', 'deleteConfirm'))) return;
    await platform.deletePendingRecording(id);
    await refreshPendingRecordings();
  };

  const formatSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  const emergencyNeedsSeparateCard = emergencyRecording && !pendingRecordings.some((item) => item.id === emergencyRecording.id);

  return (
    <main className="workspace-view">
      <section className="workspace-intro">
        <div>
          <span className={phase === 'error' ? 'status-pill is-error' : phase === 'recording' ? 'status-pill is-recording' : 'status-pill'}>
            <span className="status-dot" />
            {phaseLabel}
          </span>
          <h2>{welcomeMessage}</h2>
          <p>{t('workspace', 'greetingDescription')}</p>
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

      {(pendingRecordings.length > 0 || emergencyNeedsSeparateCard) && (
        <section className="recovery-panel" aria-labelledby="recording-recovery-title" aria-live="polite">
          <header>
            <span className="recovery-icon"><ShieldCheck /></span>
            <div>
              <h3 id="recording-recovery-title">{t('recovery', 'title')}</h3>
              <p>{t('recovery', 'description')}</p>
            </div>
          </header>
          <div className="recovery-list">
            {pendingRecordings.map((item) => (
              <article className="recovery-item" key={item.id}>
                <div className="recovery-copy">
                  <strong>{item.name}</strong>
                  <small>{formatDuration(item.durationMs)} · {formatSize(item.sizeBytes)}</small>
                  <span className={item.state === 'failed' ? 'recovery-state is-error' : item.state === 'uploading' ? 'recovery-state is-uploading' : item.state === 'finalizing' ? 'recovery-state is-finalizing' : 'recovery-state'}>
                    {recoveryBusyId === item.id ? t('recovery', 'uploading') : item.state === 'failed' ? t('recovery', 'needsAttention') : item.state === 'finalizing' ? t('recovery', 'finalizing') : t('recovery', 'protected')}
                  </span>
                  {item.lastError && <p className="recovery-error">{t('recovery', 'failureDetail')}</p>}
                </div>
                <div className="recovery-actions">
                  <button type="button" className="button button-primary" onClick={() => void handleRetryPending(item.id)} disabled={Boolean(recoveryBusyId)}><UploadCloud />{t('recovery', 'retryUpload')}</button>
                  <button type="button" className="button button-secondary" onClick={() => void platform.downloadPendingRecording?.(item.id)} disabled={recoveryBusyId === item.id}><Download />{t('recovery', 'downloadCopy')}</button>
                  <button type="button" className="icon-button recovery-delete" onClick={() => void handleDeletePending(item.id)} disabled={Boolean(recoveryBusyId)} aria-label={t('recovery', 'deleteLocal')} title={t('recovery', 'deleteLocal')}><Trash2 /></button>
                </div>
              </article>
            ))}
            {emergencyNeedsSeparateCard && emergencyRecording && (
              <article className="recovery-item is-emergency">
                <div className="recovery-copy">
                  <strong>{emergencyRecording.name}</strong>
                  <small>{formatDuration(emergencyRecording.durationMs)} · {formatSize(emergencyRecording.blob.size)}</small>
                  <span className="recovery-state is-error">{t('recovery', 'memoryOnly')}</span>
                  <p className="recovery-error">{t('recovery', 'failureDetail')}</p>
                </div>
                <div className="recovery-actions">
                  <button type="button" className="button button-primary" onClick={async () => {
                    setRecoveryStatus('');
                    try {
                      const saved = await retryEmergencyRecording();
                      if (saved?.id) onRecordingComplete(saved.id);
                    } catch (error: any) {
                      setRecoveryStatus(error?.message || t('recovery', 'retryFailed'));
                    }
                  }} disabled={Boolean(recoveryBusyId)}><UploadCloud />{t('recovery', 'retryUpload')}</button>
                  <a className="button button-secondary" href={emergencyRecording.url} download={`${safeRecordingFileName(emergencyRecording.name)}.webm`}><Download />{t('recovery', 'downloadCopy')}</a>
                </div>
              </article>
            )}
          </div>
          {recoveryStatus && <p className="recovery-error" role="alert">{recoveryStatus}</p>}
        </section>
      )}

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
          </label>

          <p className="recorder-description">
            {phase === 'error'
              ? pendingRecordings.length || emergencyRecording ? t('recovery', 'failureDetail') : status
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
              <button type="button" className="capture-choice capture-choice-import" onClick={onImportAudio}>
                <span className="capture-choice-icon"><FileAudio /></span>
                <span><strong>{t('history', 'importAudio')}</strong><small>{t('history', 'importAudioShortDescription')}</small></span>
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
          <div className="signal-storage">
            <span>{t('recorder', 'saveMode')}</span>
            <strong>{t('recorder', platform.capabilities.kind === 'web' ? 'cloudAfterStop' : 'localFirst')}</strong>
          </div>
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
            <div><strong>{t('workspace', 'emptyTitle')}</strong><p>{t('workspace', 'emptyDescription')}</p>{isAuthenticated && <button type="button" className="text-button" onClick={onImportTranscript}>{t('history', 'importTranscript')}</button>}</div>
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
