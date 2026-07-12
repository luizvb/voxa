import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FilePlus2, Plus, X } from 'lucide-react';
import ComponentsShowcase from './components/ComponentsShowcase';
import Dashboard from './components/Dashboard';
import ExtensionAuth from './components/ExtensionAuth';
import HistoryView from './components/HistoryView';
import Login from './components/Login';
import MiniWidget from './components/MiniWidget';
import Onboarding from './components/Onboarding';
import Sidebar from './components/Sidebar';
import { useAuth } from './hooks/useAuth';
import { useKeyboardActions } from './hooks/useKeyboardActions';
import { useLanguage } from './contexts/LanguageContext';
import { platform, type Recording } from './platform';

export type AppView = 'workspace' | 'library';
export type LibraryStatus = 'idle' | 'loading' | 'ready' | 'error';
const EvalsLab = import.meta.env.DEV ? lazy(() => import('./components/EvalsLab')) : null;
const InsightsPreview = import.meta.env.DEV ? lazy(() => import('./components/InsightsPreview')) : null;

export default function App() {
  const isExtensionAuth = window.location.pathname === '/extension-auth';
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
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const isElectronApp = platform.capabilities.kind === 'electron';
  const isUiPreview = import.meta.env.DEV && window.location.hash === '#/ui';
  const isEvalsLab = import.meta.env.DEV && window.location.hash === '#/evals';
  const isInsightsPreview = import.meta.env.DEV && window.location.hash === '#/insights-preview';
  const sidebarCollapsed = isCompact || !isSidebarOpen;

  const loadRecordings = useCallback(async () => {
    setLibraryStatus('loading');
    setLibraryError('');
    let timeoutId: number | undefined;
    try {
      const data = await Promise.race([
        platform.listRecordings(),
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
    if (isLoading || !isAuthenticated) return;
    loadRecordings();
  }, [isAuthenticated, isLoading, loadRecordings]);

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
    return platform.subscribeToRecordingsChanged(loadRecordings);
  }, [loadRecordings]);

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
    if (isImportDialogOpen) {
      setIsImportDialogOpen(false);
      return;
    }
    if (showLoginModal) {
      setShowLoginModal(false);
      return;
    }
    if (selectedRecordingId) setSelectedRecordingId(null);
  }, [isImportDialogOpen, selectedRecordingId, showLoginModal]);

  useKeyboardActions({ enabled: isElectronApp && !isWidget, onEscape: handleEscape });

  if (isExtensionAuth) return <ExtensionAuth />;
  if (isUiPreview) return <ComponentsShowcase />;
  if (isEvalsLab && isLoading) return <div className="app-loading"><span>Loading eval lab...</span></div>;
  if (isEvalsLab && !isAuthenticated) return <div className="evals-auth"><Login /></div>;
  if (isEvalsLab && EvalsLab) return <Suspense fallback={<div className="app-loading"><span>Loading eval lab...</span></div>}><EvalsLab /></Suspense>;
  if (isInsightsPreview && InsightsPreview) return <Suspense fallback={<div className="app-loading"><span>Loading insights...</span></div>}><InsightsPreview /></Suspense>;
  if (isWidget) return <MiniWidget />;
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
    <div className={isElectronApp ? 'app-shell is-electron' : 'app-shell is-web'}>
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
            <div className="toolbar-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  setSelectedRecordingId(null);
                  setIsImportDialogOpen(true);
                }}
              >
                <FilePlus2 />
                {t('history', 'importTranscript')}
              </button>
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
            </div>
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
                  isImportDialogOpen={isImportDialogOpen}
                  onImportDialogOpenChange={setIsImportDialogOpen}
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
