import { AlertTriangle, ArrowUpRight, Check, CreditCard, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { platform, type BillingStatus } from '../platform';
import { Skeleton } from './ui/Skeleton';
import { useLanguage } from '../contexts/LanguageContext';

type BillingCopy = (key: string) => string;

function interpolate(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
}

export function voxaBillingPresentation(status: BillingStatus, copy: BillingCopy, locale = 'en') {
  const periodEnd = status.currentPeriodEnd ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(status.currentPeriodEnd)) : null;
  const grace = status.graceUntil ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(status.graceUntil)) : null;
  const trialEnd = status.trialEndsAt ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(status.trialEndsAt)) : null;
  if (status.normalizedState === 'trial_active') return { tone: 'paid', title: copy('trialActiveTitle'), detail: interpolate(copy('trialActiveDetail'), { plan: status.planLabel, end: trialEnd || copy('sevenDays') }) };
  if (status.normalizedState === 'trial_expired') return { tone: 'attention', title: copy('trialExpiredTitle'), detail: copy('trialExpiredDetail') };
  if (status.normalizedState === 'checkout_pending') return { tone: 'pending', title: copy('checkoutPendingTitle'), detail: copy('checkoutPendingDetail') };
  if (status.normalizedState === 'active' || status.normalizedState === 'trialing') return { tone: 'paid', title: copy('paymentConfirmedTitle'), detail: interpolate(copy('paymentConfirmedDetail'), { plan: status.planLabel, renewal: periodEnd ? ` ${interpolate(copy('renewsOn'), { date: periodEnd })}` : '' }) };
  if (status.normalizedState === 'cancel_scheduled') return { tone: 'pending', title: copy('cancelScheduledTitle'), detail: periodEnd ? interpolate(copy('cancelScheduledUntilDetail'), { date: periodEnd }) : copy('cancelScheduledDetail') };
  if (status.normalizedState === 'past_due_grace' || status.normalizedState === 'past_due_blocked') return { tone: 'attention', title: copy('paymentAttentionTitle'), detail: grace && status.normalizedState === 'past_due_grace' ? interpolate(copy('paymentGraceDetail'), { date: grace }) : copy('paymentBlockedDetail') };
  if (status.normalizedState === 'canceled') return { tone: 'neutral', title: copy('subscriptionEndedTitle'), detail: copy('subscriptionEndedDetail') };
  if (status.normalizedState === 'reconciliation_required') return { tone: 'attention', title: copy('reconciliationTitle'), detail: copy('reconciliationDetail') };
  if (status.normalizedState === 'incomplete') return { tone: 'attention', title: copy('paymentIncompleteTitle'), detail: copy('paymentIncompleteDetail') };
  return { tone: 'neutral', title: copy('freePlanTitle'), detail: copy('freePlanDetail') };
}

export default function BillingView({ onStatusChange }: { onStatusChange?: (status: BillingStatus) => void }) {
  const { t, language } = useLanguage();
  const copy = useCallback((key: string) => t('billing', key), [t]);
  const [status, setStatus] = useState<BillingStatus | null>(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(''); const [error, setError] = useState('');
  const pollingRef = useRef<number | null>(null);
  const load = useCallback(async () => { try { const nextStatus = await platform.getBillingStatus(); setStatus(nextStatus); onStatusChange?.(nextStatus); setError(''); } catch (reason) { setError(reason instanceof Error ? reason.message : copy('loadFailed')); } finally { setLoading(false); } }, [copy, onStatusChange]);
  const startStatusPolling = useCallback(() => {
    if (pollingRef.current !== null) window.clearInterval(pollingRef.current);
    let attempts = 0;
    const poll = () => { attempts += 1; void load(); if (attempts >= 15 && pollingRef.current !== null) { window.clearInterval(pollingRef.current); pollingRef.current = null; } };
    pollingRef.current = window.setInterval(poll, 2_000); poll();
  }, [load]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('checkout') !== 'success') return;
    startStatusPolling();
  }, [startStatusPolling]);
  useEffect(() => {
    const onFocus = () => startStatusPolling();
    window.addEventListener('focus', onFocus);
    return () => { window.removeEventListener('focus', onFocus); if (pollingRef.current !== null) window.clearInterval(pollingRef.current); };
  }, [startStatusPolling]);
  const checkout = async () => { setBusy('checkout'); setError(''); try { const value = await platform.createCheckoutSession(); if (!value.url) throw new Error(copy('checkoutUnavailable')); await platform.openBillingUrl(value.url); startStatusPolling(); } catch (reason) { setError(reason instanceof Error ? reason.message : copy('checkoutOpenFailed')); setBusy(''); } };
  const portal = async () => { setBusy('portal'); setError(''); try { const value = await platform.createBillingPortalSession(); if (!value.url) throw new Error(copy('portalUnavailable')); await platform.openBillingUrl(value.url); } catch (reason) { setError(reason instanceof Error ? reason.message : copy('portalOpenFailed')); setBusy(''); } };
  if (loading) return <section className="billing-view" aria-label={copy('loading')}><Skeleton className="billing-skeleton"/><Skeleton className="billing-skeleton billing-skeleton-large"/></section>;
  if (!status) return <section className="billing-view"><div className="billing-state attention"><AlertTriangle/><div><strong>{copy('loadFailedTitle')}</strong><span>{error}</span></div><button className="button button-secondary" onClick={() => void load()}><RefreshCw/>{copy('retry')}</button></div></section>;
  const presentation = voxaBillingPresentation(status, copy, language);
  const shouldUsePortalForPlan = status.portalAvailable && !['free', 'canceled', 'trial_active', 'trial_expired'].includes(status.normalizedState);
  const accessLabel = status.normalizedState === 'trial_active' ? copy('accessTrial') : status.paidAccess ? copy('accessPaid') : status.checkoutRequired ? copy('accessLocked') : copy('accessFree');
  return <section className="billing-view"><header className="billing-view-head"><div><span>{copy('eyebrow')}</span><h2>Voxa Pro</h2><p>{copy('headerDescription')}</p></div>{status.portalAvailable && <button className="button button-secondary" disabled={busy === 'portal'} onClick={() => void portal()}><CreditCard/>{busy === 'portal' ? copy('opening') : copy('manageStripe')}</button>}</header>{error && <div className="billing-error" role="alert"><AlertTriangle/>{error}</div>}<div className={`billing-state ${presentation.tone}`} role="status" aria-live="polite"><div><strong>{presentation.title}</strong><span>{presentation.detail}</span></div>{(status.normalizedState.startsWith('past_due') || status.normalizedState === 'incomplete') && status.portalAvailable && <button className="button button-secondary" disabled={busy === 'portal'} onClick={() => void portal()}>{copy('updatePayment')}<ArrowUpRight/></button>}</div><article className="billing-plan"><div><span>Voxa Pro</span><h3>{copy('planTitle')}</h3><p><strong>{copy('price')}</strong>{copy('priceDetail')}</p><ul><li><Check/>{copy('featureTrial')}</li><li><Check/>{copy('featurePro')}</li><li><Check/>{copy('featureHistory')}</li><li><Check/>{copy('featureManage')}</li></ul></div><aside><span>{copy('currentAccess')}</span><strong>{accessLabel}</strong><small>{copy(`state${status.normalizedState.split('_').map((word) => word[0].toUpperCase() + word.slice(1)).join('')}`)}</small>{!shouldUsePortalForPlan && <button className="button button-primary" disabled={!status.configured || busy === 'checkout'} onClick={() => void checkout()}><ArrowUpRight/>{busy === 'checkout' ? copy('opening') : status.normalizedState === 'canceled' ? copy('subscribeAgain') : status.checkoutRequired ? copy('subscribeContinue') : copy('keepPro')}</button>}{!status.configured && <small>{copy('notConfigured')}</small>}</aside></article></section>;
}
