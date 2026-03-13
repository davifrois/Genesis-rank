const BRAZIL_COUNTRY_CODE = '55';
const BRAZIL_MAX_DIGITS = 11;

const toDigits = (value) => (
  (value || '')
    .toString()
    .replace(/\D/g, '')
);

const stripBrazilCountryCode = (digits) => {
  if (!digits) return '';
  if (digits.length <= BRAZIL_MAX_DIGITS) return digits;
  if (digits.startsWith(BRAZIL_COUNTRY_CODE)) {
    return digits.slice(BRAZIL_COUNTRY_CODE.length);
  }
  return digits;
};

export const normalizeBrazilPhoneDigits = (value) => (
  stripBrazilCountryCode(toDigits(value)).slice(0, BRAZIL_MAX_DIGITS)
);

export const formatBrazilPhone = (value) => {
  const digits = normalizeBrazilPhoneDigits(value);
  if (!digits) return '';

  if (digits.length <= 2) {
    return `(${digits}`;
  }

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (rest.length <= 4) {
    return `(${ddd}) ${rest}`;
  }

  if (digits.length <= 10) {
    const firstPart = rest.slice(0, 4);
    const secondPart = rest.slice(4);
    return secondPart ? `(${ddd}) ${firstPart}-${secondPart}` : `(${ddd}) ${firstPart}`;
  }

  const firstPart = rest.slice(0, 5);
  const secondPart = rest.slice(5);
  return secondPart ? `(${ddd}) ${firstPart}-${secondPart}` : `(${ddd}) ${firstPart}`;
};
