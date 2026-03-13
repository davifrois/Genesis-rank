import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const I18N_STORAGE_KEY = 'genesis_site_language';

const LANGUAGE_OPTIONS = [
  { id: 'pt-BR', label: 'Portugues', country: 'Brasil', flag: '🇧🇷', uiLanguage: 'pt-BR' },
  { id: 'en-US', label: 'English', country: 'United States', flag: '🇺🇸', uiLanguage: 'en-US' },
  { id: 'es-ES', label: 'Espanol', country: 'Espana', flag: '🇪🇸', uiLanguage: 'es-ES' },
  { id: 'fr-FR', label: 'Francais', country: 'France', flag: '🇫🇷', uiLanguage: 'fr-FR' },
  { id: 'de-DE', label: 'Deutsch', country: 'Deutschland', flag: '🇩🇪', uiLanguage: 'en-US' },
  { id: 'it-IT', label: 'Italiano', country: 'Italia', flag: '🇮🇹', uiLanguage: 'en-US' },
  { id: 'ja-JP', label: 'Nihongo', country: 'Nihon', flag: '🇯🇵', uiLanguage: 'en-US' },
  { id: 'ar-SA', label: 'Arabic', country: 'Saudi Arabia', flag: '🇸🇦', uiLanguage: 'en-US' }
];

const findLanguageOption = (id) => LANGUAGE_OPTIONS.find((option) => option.id === id) || null;

const resolveBrowserLanguage = (browserLanguage) => {
  const browser = (browserLanguage || '').toString().toLowerCase();
  if (!browser) return 'pt-BR';
  if (browser.startsWith('pt')) return 'pt-BR';
  if (browser.startsWith('en')) return 'en-US';
  if (browser.startsWith('es')) return 'es-ES';
  if (browser.startsWith('fr')) return 'fr-FR';
  if (browser.startsWith('de')) return 'de-DE';
  if (browser.startsWith('it')) return 'it-IT';
  if (browser.startsWith('ja')) return 'ja-JP';
  if (browser.startsWith('ar')) return 'ar-SA';
  return 'pt-BR';
};

const resolveInitialLanguage = () => {
  if (typeof window === 'undefined') return 'pt-BR';
  let savedLanguage = '';
  try {
    savedLanguage = window.localStorage.getItem(I18N_STORAGE_KEY) || '';
  } catch {
    savedLanguage = '';
  }
  if (savedLanguage && findLanguageOption(savedLanguage)) {
    return savedLanguage;
  }
  return resolveBrowserLanguage(window.navigator?.language || '');
};

const resolveUiVariant = (uiLanguage) => {
  if (uiLanguage === 'en-US') return 'en';
  if (uiLanguage === 'es-ES') return 'es';
  if (uiLanguage === 'fr-FR') return 'fr';
  return 'pt';
};

const I18nContext = createContext(null);

export const I18nProvider = ({ children }) => {
  const [language, setLanguage] = useState(resolveInitialLanguage);

  useEffect(() => {
    const option = findLanguageOption(language) || LANGUAGE_OPTIONS[0];
    const isRtl = option.id.startsWith('ar');

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(I18N_STORAGE_KEY, language);
      } catch {
        // Ignore storage write errors.
      }
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    }
  }, [language]);

  const value = useMemo(() => {
    const option = findLanguageOption(language) || LANGUAGE_OPTIONS[0];
    const uiLanguage = option.uiLanguage || 'pt-BR';
    const uiVariant = resolveUiVariant(uiLanguage);

    return {
      language,
      uiLanguage,
      uiVariant,
      locale: language,
      currentLanguage: option,
      languages: LANGUAGE_OPTIONS,
      isEnglishUi: uiLanguage === 'en-US',
      isPortugueseUi: uiLanguage === 'pt-BR',
      isSpanishUi: uiLanguage === 'es-ES',
      isFrenchUi: uiLanguage === 'fr-FR',
      setLanguage
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};
