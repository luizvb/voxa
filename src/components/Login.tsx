import { AuthView } from '@neondatabase/auth-ui';
import { LockKeyhole } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function Login() {
  const { t } = useLanguage();

  return (
    <section className="auth-panel">
      <div className="auth-heading">
        <span className="auth-icon"><LockKeyhole /></span>
        <div>
          <span className="eyebrow">Voxa</span>
          <h2>{t('login', 'title')}</h2>
          <p>{t('login', 'afterRecording')}</p>
        </div>
      </div>
      <div className="auth-provider-view">
        <AuthView />
      </div>
    </section>
  );
}
