import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import ComponentsShowcase from './components/ComponentsShowcase';
import Dashboard from './components/Dashboard';
import HistoryView from './components/HistoryView';
import Login from './components/Login';
import MiniWidget from './components/MiniWidget';
import Onboarding from './components/Onboarding';
import Sidebar from './components/Sidebar';
import { useAuth } from './hooks/useAuth';
import { useKeyboardActions } from './hooks/useKeyboardActions';
import { useLanguage } from './contexts/LanguageContext';

export type AppView = 'workspace' | 'library';
export type LibraryStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface Recording {
  id: string;
  name: string;
  durationMs: number;
  createdAt?: string;
  transcript?: any;
  playbackUrl?: string;
}

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeView, setActiveView] = useState<AppView>('workspace');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCompact, setIsCompact] = useState(false);
  const [isWidget, setIsWidget] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [libraryStatus, setLibraryStatus] = useState<LibraryStatus>('idle');
  const [libraryError, setLibraryError] = useState('');
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  const [autoProcessRecordingId, setAutoProcessRecordingId] = useState<string | null>(null);

  const isElectronApp = typeof window !== 'undefined' && Boolean(window.recorder);
  const isUiPreview = import.meta.env.DEV && window.location.hash === '#/ui';
  const sidebarCollapsed = isCompact || !isSidebarOpen;

  const loadRecordings = useCallback(async () => {
    if (!window.recorder) return;

    setLibraryStatus('loading');
    setLibraryError('');
    let timeoutId: number | undefined;
    try {
      const data = await Promise.race([
        window.recorder.listRecordings(),
        new Promise<never>((_, reject) => {
          timeoutId = window.setTimeout(() => reject(new Error(t('common', 'serviceUnavailable'))), 6000);
        }),
      ]);
      setRecordings(Array.isArray(data) ? data : []);
      setLibraryStatus('ready');
    } catch (error: any) {
      setLibraryStatus('error');
      setLibraryError(error?.message || t('common', 'serviceUnavailable'));
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  }, [t]);

  const handleSelectRecording = useCallback((id: string | null, autoProcess = false) => {
    setSelectedRecordingId(id);
    setAutoProcessRecordingId(autoProcess && id ? id : null);
    setActiveView('library');
  }, []);

  useEffect(() => {
    setIsWidget(window.location.hash === '#/widget');
    setShowOnboarding(!localStorage.getItem('voxa_has_seen_onboarding'));

    const query = window.matchMedia('(max-width: 959px)');
    const syncCompactMode = () => setIsCompact(query.matches);
    syncCompactMode();
    query.addEventListener('change', syncCompactMode);
    return () => query.removeEventListener('change', syncCompactMode);
  }, []);

  useEffect(() => {
    if (!isElectronApp || isLoading) return;
    loadRecordings();
  }, [isElectronApp, isLoading, loadRecordings]);

  useEffect(() => {
    const handleShowLogin = () => setShowLoginModal(true);
    window.addEventListener('auth:show-login', handleShowLogin);
    return () => window.removeEventListener('auth:show-login', handleShowLogin);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    setShowLoginModal(false);
    const pending = localStorage.getItem('pendingRecordingId');
    if (pending) {
      localStorage.removeItem('pendingRecordingId');
      loadRecordings().then(() => handleSelectRecording(pending, true));
    }
  }, [handleSelectRecording, isAuthenticated, loadRecordings]);

  useEffect(() => {
    if (!isElectronApp) return;
    window.addEventListener('recordings:changed', loadRecordings);
    return () => window.removeEventListener('recordings:changed', loadRecordings);
  }, [isElectronApp, loadRecordings]);

  const handleRecordingComplete = useCallback((id: string) => {
    setSelectedRecordingId(id);
    loadRecordings();

    if (!isAuthenticated) {
      localStorage.setItem('pendingRecordingId', id);
      setShowLoginModal(true);
      return;
    }

    setAutoProcessRecordingId(id);
    setActiveView('library');
  }, [isAuthenticated, loadRecordings]);

  const completeOnboarding = () => {
    localStorage.setItem('voxa_has_seen_onboarding', 'true');
    setShowOnboarding(false);
    setActiveView('workspace');
    window.setTimeout(() => document.querySelector<HTMLInputElement>('[data-recording-title]')?.focus(), 120);
  };

  const handleEscape = useCallback(() => {
    if (showLoginModal) {
      setShowLoginModal(false);
      return;
    }
    if (selectedRecordingId) setSelectedRecordingId(null);
  }, [selectedRecordingId, showLoginModal]);

  useKeyboardActions({ enabled: isElectronApp && !isWidget, onEscape: handleEscape });

  if (isUiPreview) return <ComponentsShowcase />;
  if (isWidget) return <MiniWidget />;
  if (!isElectronApp) return null;

  if (isLoading) {
    return (
      <div className="app-loading drag-region">
        <div className="app-loading-mark" aria-hidden>V</div>
        <span>{t('common', 'loading')}</span>
      </div>
    );
  }

  const pageTitle = activeView === 'workspace'
    ? t('navigation', 'workspace')
    : selectedRecordingId
      ? t('navigation', 'conversation')
      : t('navigation', 'library');

  return (
    <div className="app-shell">
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            className="modal-layer no-drag"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={t('login', 'title')}
          >
            <motion.div
              className="auth-modal"
              initial={{ opacity: 0, y: 12, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.99 }}
              transition={{ duration: 0.16 }}
            >
              <button
                type="button"
                className="icon-button auth-modal-close"
                onClick={() => setShowLoginModal(false)}
                aria-label={t('common', 'close')}
                data-keyboard-cancel="true"
              >
                <X />
              </button>
              <Login />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOnboarding && <Onboarding onComplete={completeOnboarding} />}
      </AnimatePresence>

      <aside className={sidebarCollapsed ? 'app-sidebar is-collapsed' : 'app-sidebar'}>
        <Sidebar
          activeView={activeView}
          onViewChange={(view) => {
            setActiveView(view);
            if (view === 'workspace') setSelectedRecordingId(null);
          }}
          collapsed={sidebarCollapsed}
          showToggle={!isCompact}
          onToggle={() => setIsSidebarOpen((value) => !value)}
        />
      </aside>

      <section className="app-main drag-region">
        <header className="app-toolbar no-drag">
          <div>
            <span className="toolbar-kicker">Voxa</span>
            <h1>{pageTitle}</h1>
          </div>
          {activeView === 'library' && (
            <button
              type="button"
              className="button button-primary toolbar-action"
              onClick={() => {
                setSelectedRecordingId(null);
                setActiveView('workspace');
              }}
            >
              <Plus />
              {t('navigation', 'newRecording')}
            </button>
          )}
        </header>

        <div className="app-content no-drag">
          <AnimatePresence mode="wait" initial={false}>
            {activeView === 'workspace' ? (
              <motion.div
                key="workspace"
                className="view-frame"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
              >
                <Dashboard
                  recordings={recordings}
                  libraryStatus={libraryStatus}
                  onRetry={loadRecordings}
                  onOpenLibrary={() => {
                    setSelectedRecordingId(null);
                    setActiveView('library');
                  }}
                  onSelectRecording={handleSelectRecording}
                  onRecordingComplete={handleRecordingComplete}
                />
              </motion.div>
            ) : (
              <motion.div
                key="library"
                className="view-frame"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
              >
                <HistoryView
                  recordings={recordings}
                  selectedId={selectedRecordingId}
                  onSelect={handleSelectRecording}
                  loadRecordings={loadRecordings}
                  libraryStatus={libraryStatus}
                  libraryError={libraryError}
                  onRetry={loadRecordings}
                  onStartRecording={() => setActiveView('workspace')}
                  autoProcess={autoProcessRecordingId === selectedRecordingId}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
