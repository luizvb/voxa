import { motion } from 'framer-motion';
import { ArrowRight, BrainCircuit, FileText, Mic } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const { t, language, setLanguage } = useLanguage();
  const steps = [
    { icon: Mic, title: t('onboarding', 'record'), description: t('onboarding', 'recordDesc') },
    { icon: FileText, title: t('onboarding', 'transcribe'), description: t('onboarding', 'transcribeDesc') },
    { icon: BrainCircuit, title: t('onboarding', 'analyze'), description: t('onboarding', 'analyzeDesc') },
  ];

  return (
    <motion.div
      className="onboarding-layer no-drag"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.section
        className="onboarding-card"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2 }}
      >
        <div className="onboarding-brand">
          <img src="/voxa-oficial-rounded.png" alt="" />
          <span>Voxa</span>
        </div>

        <div className="onboarding-copy">
          <span className="eyebrow">{t('onboarding', 'eyebrow')}</span>
          <h1>{t('onboarding', 'welcome')}</h1>
          <p>{t('onboarding', 'welcomeDesc')}</p>
        </div>

        <ol className="onboarding-steps">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className="onboarding-step-icon"><step.icon /></span>
              <div>
                <small>0{index + 1}</small>
                <strong>{step.title}</strong>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="onboarding-footer">
          <div className="onboarding-languages" aria-label={t('sidebar', 'changeLanguage')}>
            {(['pt', 'en', 'es'] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={language === item ? 'is-selected' : ''}
                onClick={() => setLanguage(item)}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" className="button button-primary" onClick={onComplete} data-keyboard-primary="true">
            {t('onboarding', 'start')}
            <ArrowRight />
          </button>
        </div>
        <p className="permission-note">{t('onboarding', 'permissionNote')}</p>
      </motion.section>
    </motion.div>
  );
}
