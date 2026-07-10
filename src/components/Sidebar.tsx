import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AudioLines,
  ChevronRight,
  Globe2,
  Library,
  LogIn,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUpRight,
} from 'lucide-react';
import type { AppView } from '../App';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';

interface SidebarProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  collapsed: boolean;
  showToggle: boolean;
  onToggle: () => void;
}

const languages = [
  { id: 'en' as const, mark: 'EN', label: 'English' },
  { id: 'pt' as const, mark: 'PT', label: 'Português' },
  { id: 'es' as const, mark: 'ES', label: 'Español' },
];

export default function Sidebar({ activeView, onViewChange, collapsed, showToggle, onToggle }: SidebarProps) {
  const { t, language, setLanguage } = useLanguage();
  const { user, logout, isAuthenticated, loginWithRedirect } = useAuth();
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);

  const displayName = user?.name || user?.email || t('common', 'guest');
  const displayEmail = user?.email || '';
  const initials = displayName
    .split(' ')
    .map((part: string) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const navItems = [
    { id: 'workspace' as const, icon: AudioLines, label: t('navigation', 'workspace') },
    { id: 'library' as const, icon: Library, label: t('navigation', 'library') },
  ];

  const handleUpgrade = async () => {
    if (!isAuthenticated) {
      loginWithRedirect();
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id || user?.email }),
      });
      const data = await response.json();
      const electronWindow = window as unknown as Window & { electron?: { openExternal: (url: string) => void } };
      if (data.url) {
        if (electronWindow.electron) electronWindow.electron.openExternal(data.url);
        else window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
    }
  };

  return (
    <div className="sidebar-panel no-drag">
      <header className="sidebar-header drag-region">
        <button
          type="button"
          className="brand-button no-drag"
          onClick={() => onViewChange('workspace')}
          aria-label={t('navigation', 'workspace')}
        >
          <img src="/voxa-oficial-rounded.png" alt="" />
          {!collapsed && (
            <span className="brand-copy">
              <strong>Voxa</strong>
              <small>{t('navigation', 'desktopApp')}</small>
            </span>
          )}
        </button>

        {showToggle && (
          <button
            type="button"
            className="icon-button sidebar-toggle no-drag"
            onClick={onToggle}
            aria-label={collapsed ? t('navigation', 'expandSidebar') : t('navigation', 'collapseSidebar')}
            title={collapsed ? t('navigation', 'expandSidebar') : t('navigation', 'collapseSidebar')}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </button>
        )}
      </header>

      <nav className="sidebar-nav" aria-label={t('sidebar', 'menu')}>
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={isActive ? 'nav-item is-active' : 'nav-item'}
              onClick={() => onViewChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
            >
              <item.icon />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <footer className="sidebar-footer">
        {isAuthenticated && (
          <button
            type="button"
            className="upgrade-card"
            onClick={handleUpgrade}
            aria-label={t('sidebar', 'upgrade')}
            title={collapsed ? t('sidebar', 'upgrade') : undefined}
          >
            <span className="upgrade-icon"><ArrowUpRight /></span>
            {!collapsed && (
              <span className="upgrade-copy">
                <strong>{t('sidebar', 'upgrade')}</strong>
                <small>{t('sidebar', 'upgradeDescription')}</small>
              </span>
            )}
            {!collapsed && <ChevronRight className="upgrade-chevron" />}
          </button>
        )}

        <div className="sidebar-account">
          {!isAuthenticated ? (
            <button
              type="button"
              className="account-action"
              onClick={loginWithRedirect}
              aria-label={t('login', 'signIn')}
              title={collapsed ? t('login', 'signIn') : undefined}
            >
              <LogIn />
              {!collapsed && <span>{t('login', 'signIn')}</span>}
            </button>
          ) : collapsed ? (
            <button
              type="button"
              className="account-action"
              onClick={() => logout()}
              aria-label={t('sidebar', 'signOut')}
              title={t('sidebar', 'signOut')}
            >
              <LogOut />
            </button>
          ) : (
            <div className="account-row">
              {user?.image ? (
                <img className="account-avatar" src={user.image} alt={displayName} />
              ) : (
                <span className="account-avatar account-initials">{initials}</span>
              )}
              {!collapsed && (
                <span className="account-copy">
                  <strong>{displayName}</strong>
                  {displayEmail && <small>{displayEmail}</small>}
                </span>
              )}
              {!collapsed && (
                <button
                  type="button"
                  className="icon-button account-logout"
                  onClick={() => logout()}
                  aria-label={t('sidebar', 'signOut')}
                >
                  <LogOut />
                </button>
              )}
            </div>
          )}

          <div className="language-control">
            <button
              type="button"
              className="language-trigger"
              onClick={() => setIsLanguageOpen((value) => !value)}
              aria-expanded={isLanguageOpen}
              aria-label={t('sidebar', 'changeLanguage')}
            >
              <Globe2 />
              {!collapsed && <span>{languages.find((item) => item.id === language)?.label}</span>}
              {!collapsed && <small>{language.toUpperCase()}</small>}
            </button>

            <AnimatePresence>
              {isLanguageOpen && (
                <motion.div
                  className={collapsed ? 'language-menu is-compact' : 'language-menu'}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.12 }}
                >
                  {languages.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={language === item.id ? 'language-option is-selected' : 'language-option'}
                      onClick={() => {
                        setLanguage(item.id);
                        setIsLanguageOpen(false);
                      }}
                    >
                      <strong>{item.mark}</strong>
                      {!collapsed && <span>{item.label}</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </footer>
    </div>
  );
}
