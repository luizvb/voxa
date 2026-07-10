import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { locales } from '../i18n/locales';
import type { LocaleSection } from '../i18n/locales';

type Language = 'en' | 'pt' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (section: LocaleSection, key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('voxa_language');
    if (saved) return saved as Language;

    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('pt')) return 'pt';
    if (browserLang.startsWith('es')) return 'es';
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('voxa_language', lang);
  };

  const t = (section: LocaleSection, key: string): string => {
    try {
      // @ts-ignore
      return locales[language][section][key] || key;
    } catch {
      return key;
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
