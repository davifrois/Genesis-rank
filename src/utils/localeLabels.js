const normalize = (value) => (
  (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
);

const beltMap = new Map([
  ['branca', 'White'],
  ['branca/cinza', 'White/Grey'],
  ['cinza', 'Grey'],
  ['laranja', 'Orange'],
  ['verde', 'Green'],
  ['azul', 'Blue'],
  ['roxa', 'Purple'],
  ['marrom', 'Brown'],
  ['preta', 'Black'],
  ['faixa', 'Belt']
]);

const weightMap = new Map([
  ['galo', 'Rooster'],
  ['pluma', 'Light Feather'],
  ['pena', 'Feather'],
  ['leve', 'Light'],
  ['medio', 'Middle'],
  ['medio pesado', 'Medium Heavy'],
  ['meio-pesado', 'Medium Heavy'],
  ['pesado', 'Heavy'],
  ['super pesado', 'Super Heavy'],
  ['super-pesado', 'Super Heavy'],
  ['pesadissimo', 'Ultra Heavy'],
  ['absoluto', 'Absolute'],
  ['peso', 'Weight']
]);

const categoryMap = new Map([
  ['pre-mirim', 'Pre-Kids'],
  ['pre mirim', 'Pre-Kids'],
  ['mirim', 'Kids'],
  ['mirim a', 'Kids A'],
  ['mirim b', 'Kids B'],
  ['mirim c', 'Kids C'],
  ['infantil', 'Junior'],
  ['infanto juvenil', 'Youth'],
  ['infantojuvenil', 'Youth'],
  ['infanto-juvenil', 'Youth'],
  ['juvenil', 'Juvenile'],
  ['adulto', 'Adult'],
  ['master', 'Master'],
  ['categoria', 'Category']
]);

const genderMap = new Map([
  ['masculino', 'Male'],
  ['feminino', 'Female']
]);

const mapLookup = (value, map) => {
  const key = normalize(value).replace(/\s+/g, ' ');
  return map.get(key) || null;
};

const translateMapValue = (value, language, map) => {
  if (language !== 'en-US') return value;
  return mapLookup(value, map) || value;
};

export const translateBelt = (value, language) => translateMapValue(value, language, beltMap);

export const translateWeight = (value, language) => translateMapValue(value, language, weightMap);

export const translateCategory = (value, language) => translateMapValue(value, language, categoryMap);

export const translateGender = (value, language) => translateMapValue(value, language, genderMap);

export const translateSegment = (value, language) => {
  if (language !== 'en-US') return value;
  if (!value) return value;
  if (value.toUpperCase() === 'ABS') return 'ABS';
  return (
    mapLookup(value, beltMap)
    || mapLookup(value, weightMap)
    || mapLookup(value, categoryMap)
    || mapLookup(value, genderMap)
    || value
  );
};

export const translateCompositeLabel = (label, language) => {
  if (language !== 'en-US' || !label) return label;
  return label
    .split(' - ')
    .map((segment) => translateSegment(segment, language))
    .join(' - ');
};
