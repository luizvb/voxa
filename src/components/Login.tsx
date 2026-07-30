import { AuthView } from '@neondatabase/auth-ui';
import { LockKeyhole } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export type LoginContext = 'generic' | 'post_recording' | 'billing' | 'import_transcript';

export default function Login({ context = 'generic' }: { context?: LoginContext }) {
  const { t } = useLanguage();
  const titleKey = context === 'post_recording' ? 'postRecordingTitle' : context === 'billing' ? 'billingTitle' : context === 'import_transcript' ? 'importTitle' : 'title';
  const descriptionKey = context === 'post_recording' ? 'afterRecording' : context === 'billing' ? 'billingDescription' : context === 'import_transcript' ? 'importDescription' : 'description';

  return (
    <section className="auth-panel">
      <div className="auth-heading">
        <span className="auth-icon"><LockKeyhole /></span>
        <div>
          <span className="eyebrow">Voxa</span>
          <h2 id="auth-modal-title">{t('login', titleKey)}</h2>
          <p>{t('login', descriptionKey)}</p>
        </div>
      </div>
      <div className="auth-provider-view">
        <AuthView />
      </div>
    </section>
  );
}
