import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useSiteAutoTranslator } from './useSiteAutoTranslator';

const I18N_STORAGE_KEY = 'genesis_site_language';
const FLAG_CDN_BASE = 'https://flagcdn.com/w40';
const TRANSLATION_CODE_BY_LANGUAGE = {
  'en-US': 'en',
  'pt-BR': 'pt',
  'es-ES': 'es',
  'de-DE': 'de',
  'nl-NL': 'nl',
  'ja-JP': 'ja',
  'fr-FR': 'fr',
  'it-IT': 'it',
  'nb-NO': 'no',
  'pl-PL': 'pl',
  'ru-RU': 'ru',
  'sv-SE': 'sv',
  'cs-CZ': 'cs',
  'sr-RS': 'sr',
  'zh-CN': 'zh-CN',
  'ko-KR': 'ko',
  'ar-AE': 'ar',
  'uk-UA': 'uk'
};

const buildFlag = (code = '') => {
  const normalized = code.toString().trim().toLowerCase();
  return normalized ? `${FLAG_CDN_BASE}/${normalized}.png` : '';
};

const buildLanguageOption = ({
  id,
  label,
  country,
  countryCodes,
  uiLanguage,
  translationCode = TRANSLATION_CODE_BY_LANGUAGE[id] || 'en',
  translationStatus = 'auto'
}) => ({
  id,
  label,
  country,
  countryCodes,
  flagImages: countryCodes.map(buildFlag).filter(Boolean),
  uiLanguage: uiLanguage || id,
  translationCode,
  translationStatus
});

const LANGUAGE_OPTIONS = [
  buildLanguageOption({ id: 'en-US', label: 'English', country: 'United States', countryCodes: ['us'], uiLanguage: 'en-US' }),
  buildLanguageOption({ id: 'pt-BR', label: 'Português', country: 'Brasil / Portugal', countryCodes: ['br'], uiLanguage: 'pt-BR', translationStatus: 'native' }),
  buildLanguageOption({ id: 'es-ES', label: 'Español', country: 'Mexico / España', countryCodes: ['es'], uiLanguage: 'es-ES' })
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
  if (browser.startsWith('nl')) return 'nl-NL';
  if (browser.startsWith('it')) return 'it-IT';
  if (browser.startsWith('ja')) return 'ja-JP';
  if (browser.startsWith('nb') || browser.startsWith('no')) return 'nb-NO';
  if (browser.startsWith('pl')) return 'pl-PL';
  if (browser.startsWith('ru')) return 'ru-RU';
  if (browser.startsWith('sv')) return 'sv-SE';
  if (browser.startsWith('cs')) return 'cs-CZ';
  if (browser.startsWith('sr')) return 'sr-RS';
  if (browser.startsWith('zh')) return 'zh-CN';
  if (browser.startsWith('ko')) return 'ko-KR';
  if (browser.startsWith('ar')) return 'ar-AE';
  if (browser.startsWith('uk')) return 'uk-UA';
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
  if (uiLanguage === 'pt-BR') return 'pt';
  if (uiLanguage === 'en-US') return 'en';
  if (uiLanguage === 'es-ES') return 'es';
  if (uiLanguage === 'fr-FR') return 'fr';
  return 'pt';
};

const I18nContext = createContext(null);

export const I18nProvider = ({ children }) => {
  const [language, setLanguage] = useState(resolveInitialLanguage);
  const option = findLanguageOption(language) || LANGUAGE_OPTIONS[0];
  useSiteAutoTranslator(option);

  useEffect(() => {
    const isRtl = option.id.startsWith('ar');

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(I18N_STORAGE_KEY, option.id);
      } catch {
        // Ignore storage write errors.
      }
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = option.id;
      document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    }
  }, [option]);

  const value = useMemo(() => {
    const uiLanguage = option.uiLanguage || 'en-US';
    const uiVariant = resolveUiVariant(uiLanguage);

    return {
      language: option.id,
      uiLanguage,
      uiVariant,
      locale: option.id,
      currentLanguage: option,
      languages: LANGUAGE_OPTIONS,
      translationCode: option.translationCode,
      isEnglishUi: uiLanguage === 'en-US',
      isPortugueseUi: uiLanguage === 'pt-BR',
      isSpanishUi: uiLanguage === 'es-ES',
      isFrenchUi: uiLanguage === 'fr-FR',
      setLanguage
    };
  }, [option]);

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
