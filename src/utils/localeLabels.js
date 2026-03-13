const normalize = (value) => (
  (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
);

const resolveLocaleKey = (language) => {
  const normalized = (language || '').toString().toLowerCase();
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('es')) return 'es';
  if (normalized.startsWith('fr')) return 'fr';
  return 'pt';
};

const beltMap = new Map([
  ['branca', { en: 'White', es: 'Blanca', fr: 'Blanche' }],
  ['branca/cinza', { en: 'White/Grey', es: 'Blanca/Gris', fr: 'Blanche/Grise' }],
  ['cinza', { en: 'Grey', es: 'Gris', fr: 'Grise' }],
  ['laranja', { en: 'Orange', es: 'Naranja', fr: 'Orange' }],
  ['verde', { en: 'Green', es: 'Verde', fr: 'Verte' }],
  ['azul', { en: 'Blue', es: 'Azul', fr: 'Bleue' }],
  ['roxa', { en: 'Purple', es: 'Morada', fr: 'Violette' }],
  ['marrom', { en: 'Brown', es: 'Marron', fr: 'Marron' }],
  ['preta', { en: 'Black', es: 'Negra', fr: 'Noire' }],
  ['faixa', { en: 'Belt', es: 'Cinturon', fr: 'Ceinture' }]
]);

const weightMap = new Map([
  ['galo', { en: 'Rooster', es: 'Gallo', fr: 'Coq' }],
  ['pluma', { en: 'Light Feather', es: 'Pluma', fr: 'Plume' }],
  ['pena', { en: 'Feather', es: 'Pluma', fr: 'Plume' }],
  ['leve', { en: 'Light', es: 'Ligero', fr: 'Leger' }],
  ['medio', { en: 'Middle', es: 'Medio', fr: 'Moyen' }],
  ['medio pesado', { en: 'Medium Heavy', es: 'Medio Pesado', fr: 'Mi-Lourd' }],
  ['meio-pesado', { en: 'Medium Heavy', es: 'Medio Pesado', fr: 'Mi-Lourd' }],
  ['pesado', { en: 'Heavy', es: 'Pesado', fr: 'Lourd' }],
  ['super pesado', { en: 'Super Heavy', es: 'Super Pesado', fr: 'Super Lourd' }],
  ['super-pesado', { en: 'Super Heavy', es: 'Super Pesado', fr: 'Super Lourd' }],
  ['pesadissimo', { en: 'Ultra Heavy', es: 'Pesadisimo', fr: 'Ultra Lourd' }],
  ['absoluto', { en: 'Absolute', es: 'Absoluto', fr: 'Absolu' }],
  ['peso', { en: 'Weight', es: 'Peso', fr: 'Poids' }]
]);

const categoryMap = new Map([
  ['pre-mirim', { en: 'Pre-Kids', es: 'Pre-Infantil', fr: 'Pre-Jeunes' }],
  ['pre mirim', { en: 'Pre-Kids', es: 'Pre-Infantil', fr: 'Pre-Jeunes' }],
  ['mirim', { en: 'Kids', es: 'Infantil', fr: 'Jeunes' }],
  ['mirim a', { en: 'Kids A', es: 'Infantil A', fr: 'Jeunes A' }],
  ['mirim b', { en: 'Kids B', es: 'Infantil B', fr: 'Jeunes B' }],
  ['mirim c', { en: 'Kids C', es: 'Infantil C', fr: 'Jeunes C' }],
  ['infantil', { en: 'Junior', es: 'Infantil', fr: 'Junior' }],
  ['infanto juvenil', { en: 'Youth', es: 'Juvenil', fr: 'Jeunesse' }],
  ['infantojuvenil', { en: 'Youth', es: 'Juvenil', fr: 'Jeunesse' }],
  ['infanto-juvenil', { en: 'Youth', es: 'Juvenil', fr: 'Jeunesse' }],
  ['juvenil', { en: 'Juvenile', es: 'Juvenil', fr: 'Juvenile' }],
  ['adulto', { en: 'Adult', es: 'Adulto', fr: 'Adulte' }],
  ['master', { en: 'Master', es: 'Master', fr: 'Master' }],
  ['categoria', { en: 'Category', es: 'Categoria', fr: 'Categorie' }]
]);

const genderMap = new Map([
  ['masculino', { en: 'Male', es: 'Masculino', fr: 'Masculin' }],
  ['feminino', { en: 'Female', es: 'Femenino', fr: 'Feminin' }]
]);

const mapLookup = (value, map) => {
  const key = normalize(value).replace(/\s+/g, ' ');
  return map.get(key) || null;
};

const translateMapValue = (value, language, map) => {
  const localeKey = resolveLocaleKey(language);
  if (localeKey === 'pt') return value;
  const translated = mapLookup(value, map);
  if (!translated) return value;
  return translated[localeKey] || value;
};

export const translateBelt = (value, language) => translateMapValue(value, language, beltMap);

export const translateWeight = (value, language) => translateMapValue(value, language, weightMap);

export const translateCategory = (value, language) => translateMapValue(value, language, categoryMap);

export const translateGender = (value, language) => translateMapValue(value, language, genderMap);

export const translateSegment = (value, language) => {
  const localeKey = resolveLocaleKey(language);
  if (localeKey === 'pt') return value;
  if (!value) return value;
  if (value.toUpperCase() === 'ABS') return 'ABS';
  return (
    mapLookup(value, beltMap)?.[localeKey]
    || mapLookup(value, weightMap)?.[localeKey]
    || mapLookup(value, categoryMap)?.[localeKey]
    || mapLookup(value, genderMap)?.[localeKey]
    || value
  );
};

export const translateCompositeLabel = (label, language) => {
  const localeKey = resolveLocaleKey(language);
  if (localeKey === 'pt' || !label) return label;
  return label
    .split(' - ')
    .map((segment) => translateSegment(segment, language))
    .join(' - ');
};
