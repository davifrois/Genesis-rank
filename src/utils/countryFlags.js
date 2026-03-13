const normalizeText = (value) => (
  (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
);

const toLocaleKey = (language) => {
  const normalized = (language || '').toString().toLowerCase();
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('es')) return 'es';
  if (normalized.startsWith('fr')) return 'fr';
  return 'pt';
};

const COUNTRY_ALIAS_LIST = [
  ['brasil', 'BR'],
  ['brazil', 'BR'],
  ['bresil', 'BR'],
  ['estados unidos', 'US'],
  ['united states', 'US'],
  ['usa', 'US'],
  ['eua', 'US'],
  ['franca', 'FR'],
  ['france', 'FR'],
  ['francia', 'FR'],
  ['espanha', 'ES'],
  ['spain', 'ES'],
  ['espana', 'ES'],
  ['espania', 'ES'],
  ['portugal', 'PT'],
  ['argentina', 'AR'],
  ['mexico', 'MX'],
  ['chile', 'CL'],
  ['colombia', 'CO'],
  ['peru', 'PE'],
  ['uruguai', 'UY'],
  ['uruguay', 'UY'],
  ['paraguai', 'PY'],
  ['paraguay', 'PY'],
  ['bolivia', 'BO'],
  ['venezuela', 'VE'],
  ['equador', 'EC'],
  ['ecuador', 'EC'],
  ['canada', 'CA'],
  ['alemanha', 'DE'],
  ['germany', 'DE'],
  ['deutschland', 'DE'],
  ['italia', 'IT'],
  ['italy', 'IT'],
  ['reino unido', 'GB'],
  ['united kingdom', 'GB'],
  ['uk', 'GB'],
  ['inglaterra', 'GB'],
  ['england', 'GB'],
  ['escocia', 'GB'],
  ['scotland', 'GB'],
  ['russia', 'RU'],
  ['russia federation', 'RU'],
  ['ucrania', 'UA'],
  ['ukraine', 'UA'],
  ['japao', 'JP'],
  ['japon', 'JP'],
  ['japan', 'JP'],
  ['china', 'CN'],
  ['coreia do sul', 'KR'],
  ['corea del sur', 'KR'],
  ['south korea', 'KR'],
  ['india', 'IN'],
  ['australia', 'AU'],
  ['nova zelandia', 'NZ'],
  ['new zealand', 'NZ'],
  ['africa do sul', 'ZA'],
  ['south africa', 'ZA'],
  ['emirados arabes unidos', 'AE'],
  ['united arab emirates', 'AE'],
  ['saudi arabia', 'SA'],
  ['arabia saudita', 'SA'],
  ['qatar', 'QA'],
  ['kuwait', 'KW'],
  ['turquia', 'TR'],
  ['turkiye', 'TR'],
  ['turkey', 'TR'],
  ['ira', 'IR'],
  ['iran', 'IR'],
  ['egito', 'EG'],
  ['egypt', 'EG'],
  ['marrocos', 'MA'],
  ['morocco', 'MA'],
  ['angola', 'AO'],
  ['mocambique', 'MZ'],
  ['mozambique', 'MZ'],
  ['cabo verde', 'CV']
];

const COUNTRY_ALIASES = new Map(
  COUNTRY_ALIAS_LIST.map(([term, code]) => [normalizeText(term), code])
);

const COUNTRY_LABELS = {
  BR: { pt: 'Brasil', en: 'Brazil', es: 'Brasil', fr: 'Bresil' },
  US: { pt: 'Estados Unidos', en: 'United States', es: 'Estados Unidos', fr: 'Etats-Unis' },
  FR: { pt: 'Franca', en: 'France', es: 'Francia', fr: 'France' },
  ES: { pt: 'Espanha', en: 'Spain', es: 'Espana', fr: 'Espagne' },
  PT: { pt: 'Portugal', en: 'Portugal', es: 'Portugal', fr: 'Portugal' },
  AR: { pt: 'Argentina', en: 'Argentina', es: 'Argentina', fr: 'Argentine' },
  MX: { pt: 'Mexico', en: 'Mexico', es: 'Mexico', fr: 'Mexique' },
  CL: { pt: 'Chile', en: 'Chile', es: 'Chile', fr: 'Chili' },
  CO: { pt: 'Colombia', en: 'Colombia', es: 'Colombia', fr: 'Colombie' },
  PE: { pt: 'Peru', en: 'Peru', es: 'Peru', fr: 'Perou' },
  UY: { pt: 'Uruguai', en: 'Uruguay', es: 'Uruguay', fr: 'Uruguay' },
  PY: { pt: 'Paraguai', en: 'Paraguay', es: 'Paraguay', fr: 'Paraguay' },
  BO: { pt: 'Bolivia', en: 'Bolivia', es: 'Bolivia', fr: 'Bolivie' },
  VE: { pt: 'Venezuela', en: 'Venezuela', es: 'Venezuela', fr: 'Venezuela' },
  EC: { pt: 'Equador', en: 'Ecuador', es: 'Ecuador', fr: 'Equateur' },
  CA: { pt: 'Canada', en: 'Canada', es: 'Canada', fr: 'Canada' },
  DE: { pt: 'Alemanha', en: 'Germany', es: 'Alemania', fr: 'Allemagne' },
  IT: { pt: 'Italia', en: 'Italy', es: 'Italia', fr: 'Italie' },
  GB: { pt: 'Reino Unido', en: 'United Kingdom', es: 'Reino Unido', fr: 'Royaume-Uni' },
  RU: { pt: 'Russia', en: 'Russia', es: 'Rusia', fr: 'Russie' },
  UA: { pt: 'Ucrania', en: 'Ukraine', es: 'Ucrania', fr: 'Ukraine' },
  JP: { pt: 'Japao', en: 'Japan', es: 'Japon', fr: 'Japon' },
  CN: { pt: 'China', en: 'China', es: 'China', fr: 'Chine' },
  KR: { pt: 'Coreia do Sul', en: 'South Korea', es: 'Corea del Sur', fr: 'Coree du Sud' },
  IN: { pt: 'India', en: 'India', es: 'India', fr: 'Inde' },
  AU: { pt: 'Australia', en: 'Australia', es: 'Australia', fr: 'Australie' },
  NZ: { pt: 'Nova Zelandia', en: 'New Zealand', es: 'Nueva Zelanda', fr: 'Nouvelle-Zelande' },
  ZA: { pt: 'Africa do Sul', en: 'South Africa', es: 'Sudafrica', fr: 'Afrique du Sud' },
  AE: { pt: 'Emirados Arabes Unidos', en: 'United Arab Emirates', es: 'Emiratos Arabes Unidos', fr: 'Emirats arabes unis' },
  SA: { pt: 'Arabia Saudita', en: 'Saudi Arabia', es: 'Arabia Saudita', fr: 'Arabie saoudite' },
  QA: { pt: 'Qatar', en: 'Qatar', es: 'Qatar', fr: 'Qatar' },
  KW: { pt: 'Kuwait', en: 'Kuwait', es: 'Kuwait', fr: 'Koweit' },
  TR: { pt: 'Turquia', en: 'Turkey', es: 'Turquia', fr: 'Turquie' },
  IR: { pt: 'Ira', en: 'Iran', es: 'Iran', fr: 'Iran' },
  EG: { pt: 'Egito', en: 'Egypt', es: 'Egipto', fr: 'Egypte' },
  MA: { pt: 'Marrocos', en: 'Morocco', es: 'Marruecos', fr: 'Maroc' },
  AO: { pt: 'Angola', en: 'Angola', es: 'Angola', fr: 'Angola' },
  MZ: { pt: 'Mocambique', en: 'Mozambique', es: 'Mozambique', fr: 'Mozambique' },
  CV: { pt: 'Cabo Verde', en: 'Cape Verde', es: 'Cabo Verde', fr: 'Cap-Vert' }
};

export const countryCodeFromValue = (value, fallback = 'BR') => {
  const raw = (value || '').toString().trim();
  if (!raw) return fallback;
  const uppercase = raw.toUpperCase();
  if (/^[A-Z]{2}$/.test(uppercase)) return uppercase;
  return COUNTRY_ALIASES.get(normalizeText(raw)) || fallback;
};

export const countryCodeFromAthlete = (athlete, fallback = 'BR') => {
  const rawCode = (
    athlete?.countryCode
    || athlete?.paisCode
    || ''
  ).toString().trim();
  if (/^[A-Za-z]{2}$/.test(rawCode)) {
    return rawCode.toUpperCase();
  }

  const rawCountry = (
    athlete?.country
    || athlete?.pais
    || athlete?.nacionalidade
    || ''
  ).toString().trim();

  return countryCodeFromValue(rawCountry, fallback);
};

export const flagFromCountryCode = (code) => {
  const safe = (code || 'BR').toString().trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(safe)) return '🏳️';
  return [...safe]
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
};

export const countryLabelFromCode = (code, language = 'pt-BR') => {
  const safe = (code || '').toString().trim().toUpperCase();
  if (!safe) return '';
  const key = toLocaleKey(language);
  return COUNTRY_LABELS[safe]?.[key] || safe;
};

export const countryLabelFromAthlete = (athlete, language = 'pt-BR') => {
  const rawCountry = (
    athlete?.country
    || athlete?.pais
    || athlete?.nacionalidade
    || ''
  ).toString().trim();
  const code = countryCodeFromAthlete(athlete, 'BR');
  const fallbackLabel = countryLabelFromCode(code, language);

  if (!rawCountry) return fallbackLabel;
  if (/^[A-Za-z]{2}$/.test(rawCountry)) return fallbackLabel;

  const normalized = normalizeText(rawCountry);
  const mappedCode = COUNTRY_ALIASES.get(normalized);
  if (mappedCode) return countryLabelFromCode(mappedCode, language);

  return rawCountry;
};
