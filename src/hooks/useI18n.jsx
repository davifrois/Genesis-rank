import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const I18N_STORAGE_KEY = 'genesis_site_language';

const LANGUAGE_OPTIONS = [
  { id: 'pt-BR', label: 'Português', country: 'Brasil', flag: '\uD83C\uDDE7\uD83C\uDDF7' },
  { id: 'en-US', label: 'English', country: 'United States', flag: '\uD83C\uDDFA\uD83C\uDDF8' }
];

const resolveInitialLanguage = () => {
  if (typeof window === 'undefined') return 'pt-BR';
  let savedLanguage = '';
  try {
    savedLanguage = window.localStorage.getItem(I18N_STORAGE_KEY) || '';
  } catch {
    savedLanguage = '';
  }
  if (savedLanguage && LANGUAGE_OPTIONS.some((option) => option.id === savedLanguage)) {
    return savedLanguage;
  }
  const browserLanguage = window.navigator?.language || '';
  return browserLanguage.toLowerCase().startsWith('en') ? 'en-US' : 'pt-BR';
};

const I18nContext = createContext(null);

export const I18nProvider = ({ children }) => {
  const [language, setLanguage] = useState(resolveInitialLanguage);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(I18N_STORAGE_KEY, language);
      } catch {
        // Ignore storage write errors.
      }
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const value = useMemo(() => {
    const option = LANGUAGE_OPTIONS.find((item) => item.id === language) || LANGUAGE_OPTIONS[0];
    return {
      language,
      locale: language,
      currentLanguage: option,
      languages: LANGUAGE_OPTIONS,
      setLanguage
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};
