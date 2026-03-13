const PASSWORD_MIN_LENGTH = 8;
const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const DIGIT_REGEX = /\d/;
const SYMBOL_REGEX = /[^A-Za-z0-9]/;

const detectLanguage = (locale) => {
  const value = (locale || '').toString().trim().toLowerCase();
  if (value.startsWith('en')) return 'en';
  if (value.startsWith('es')) return 'es';
  if (value.startsWith('fr')) return 'fr';
  return 'pt';
};

const copyByLanguage = {
  pt: {
    policy: 'Use no minimo 8 caracteres com letra maiuscula, minuscula, numero e simbolo.',
    weak: 'Essa senha e fraca.',
    medium: 'Essa senha e media.',
    strong: 'Essa senha e forte.'
  },
  en: {
    policy: 'Use at least 8 characters with uppercase, lowercase, number, and symbol.',
    weak: 'This password is weak.',
    medium: 'This password is medium.',
    strong: 'This password is strong.'
  },
  es: {
    policy: 'Use al menos 8 caracteres con mayuscula, minuscula, numero y simbolo.',
    weak: 'Esta contrasena es debil.',
    medium: 'Esta contrasena es media.',
    strong: 'Esta contrasena es fuerte.'
  },
  fr: {
    policy: 'Utilisez au moins 8 caracteres avec majuscule, minuscule, chiffre et symbole.',
    weak: 'Ce mot de passe est faible.',
    medium: 'Ce mot de passe est moyen.',
    strong: 'Ce mot de passe est fort.'
  }
};

export const evaluatePasswordStrength = (password, locale = 'pt-BR') => {
  const value = (password || '').toString();
  const language = detectLanguage(locale);
  const copy = copyByLanguage[language] || copyByLanguage.pt;

  const checks = {
    minLength: value.length >= PASSWORD_MIN_LENGTH,
    uppercase: UPPERCASE_REGEX.test(value),
    lowercase: LOWERCASE_REGEX.test(value),
    digit: DIGIT_REGEX.test(value),
    symbol: SYMBOL_REGEX.test(value)
  };

  const score = Object.values(checks).reduce((sum, ok) => sum + (ok ? 1 : 0), 0);
  const isStrong = score === 5;

  let level = 'weak';
  let message = `${copy.weak} ${copy.policy}`;
  if (!value) {
    level = 'empty';
    message = copy.policy;
  } else if (isStrong) {
    level = 'strong';
    message = copy.strong;
  } else if (score >= 3) {
    level = 'medium';
    message = `${copy.medium} ${copy.policy}`;
  }

  return {
    level,
    score,
    checks,
    isStrong,
    message,
    policyMessage: copy.policy
  };
};

export const validateStrongPassword = (password, locale = 'pt-BR') => {
  const result = evaluatePasswordStrength(password, locale);
  return {
    ok: result.isStrong,
    message: result.policyMessage,
    result
  };
};

