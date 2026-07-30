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
  CreditCard,
} from 'lucide-react';
import type { AppView } from '../App';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { Logo } from './Logo';
import type { BillingStatus } from '../platform';

interface SidebarProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  collapsed: boolean;
  showToggle: boolean;
  onToggle: () => void;
  billingStatus: BillingStatus | null;
}

const languages = [
  { id: 'en' as const, mark: 'EN', label: 'English' },
  { id: 'pt' as const, mark: 'PT', label: 'Português' },
  { id: 'es' as const, mark: 'ES', label: 'Español' },
];

export default function Sidebar({ activeView, onViewChange, collapsed, showToggle, onToggle, billingStatus }: SidebarProps) {
  const { t, language, setLanguage } = useLanguage();
  const { user, logout, isAuthenticated, loginWithRedirect } = useAuth();
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [accountError, setAccountError] = useState('');

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
    { id: 'billing' as const, icon: CreditCard, label: t('billing', 'eyebrow') },
  ];

  const accountStatus = (() => {
    if (!billingStatus) return null;

    switch (billingStatus?.normalizedState) {
      case 'trial_active':
      case 'trialing':
        return { label: t('sidebar', 'statusTrial'), tone: 'trial' };
      case 'active':
      case 'cancel_scheduled':
        return { label: t('sidebar', 'statusPaid'), tone: 'paid' };
      case 'trial_expired':
        return { label: t('sidebar', 'statusExpired'), tone: 'expired' };
      case 'past_due_grace':
        return { label: t('billing', 'statePastDueGrace'), tone: 'attention' };
      case 'past_due_blocked':
        return { label: t('billing', 'statePastDueBlocked'), tone: 'attention' };
      case 'incomplete':
        return { label: t('billing', 'stateIncomplete'), tone: 'attention' };
      case 'checkout_pending':
        return { label: t('billing', 'stateCheckoutPending'), tone: 'attention' };
      case 'paused':
        return { label: t('billing', 'statePaused'), tone: 'attention' };
      case 'reconciliation_required':
        return { label: t('billing', 'stateReconciliationRequired'), tone: 'attention' };
      case 'canceled':
        return { label: t('billing', 'stateCanceled'), tone: 'expired' };
      default:
        return { label: t('sidebar', 'statusFree'), tone: 'free' };
    }
  })();

  const showUpgrade = isAuthenticated && billingStatus !== null
    && ['free', 'trial_active', 'trial_expired', 'canceled'].includes(billingStatus.normalizedState);

  const handlePlanClick = () => {
    if (!isAuthenticated) {
      loginWithRedirect();
      return;
    }

    onViewChange('billing');
  };

  const handleLogout = async () => {
    if (isSigningOut) return;
    setAccountError('');
    setIsSigningOut(true);
    try {
      await logout();
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : t('sidebar', 'signOutFailed'));
    } finally {
      setIsSigningOut(false);
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
          <span className="brand-mark"><Logo /></span>
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
        {showUpgrade && (
          <button
            type="button"
            className="upgrade-card"
            onClick={handlePlanClick}
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
          ) : (
            <>
              <div
                className="account-profile"
                role="group"
                aria-label={`${displayName}${accountStatus ? ` · ${accountStatus.label}` : ''}`}
                title={collapsed ? `${displayName}${accountStatus ? ` · ${accountStatus.label}` : ''}` : undefined}
              >
                {user?.image ? (
                  <img className="account-avatar" src={user.image} alt="" />
                ) : (
                  <span className="account-avatar account-initials" aria-hidden>{initials}</span>
                )}
                {!collapsed && (
                  <span className="account-copy">
                    <strong>{displayName}</strong>
                    {displayEmail && displayEmail !== displayName && <small>{displayEmail}</small>}
                  </span>
                )}
              </div>
              {!collapsed && accountStatus && (
                <div className="account-plan-summary">
                  <span className={`account-status is-${accountStatus.tone}`}>
                    <span aria-hidden />
                    {accountStatus.label}
                  </span>
                  {billingStatus?.planLabel && <small>{billingStatus.planLabel}</small>}
                </div>
              )}
              <button
                type="button"
                className="account-action account-plan-action"
                onClick={handlePlanClick}
                aria-label={t('billing', 'eyebrow')}
                title={collapsed ? t('billing', 'eyebrow') : undefined}
              >
                <CreditCard />
                {!collapsed && <span>{t('billing', 'eyebrow')}</span>}
                {!collapsed && <ChevronRight />}
              </button>
              {accountError && !collapsed && <p className="account-error" role="alert">{accountError}</p>}
            </>
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

          {isAuthenticated && (
            <button
              type="button"
              className="account-action account-signout"
              onClick={() => void handleLogout()}
              disabled={isSigningOut}
              aria-busy={isSigningOut}
              aria-label={t('sidebar', 'signOut')}
              title={collapsed ? t('sidebar', 'signOut') : undefined}
            >
              <LogOut />
              {!collapsed && <span>{t('sidebar', 'signOut')}</span>}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
