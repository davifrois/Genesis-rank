export const DEFAULT_EVENT_PIX_KEY = '594.343.682-00 (LEAN AUGUSTO CHAVES PEREIRA)';

export const DEFAULT_EVENT_FEES = {
  under15: 120,
  over15: 140,
  combo: 240,
  absolute: 30
};

const roundMoney = (value) => Math.round(value * 100) / 100;

export const toMoneyNumber = (value, fallback) => {
  if (Number.isFinite(value)) {
    return value >= 0 ? roundMoney(Number(value)) : fallback;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return fallback;

    const hasComma = trimmed.includes(',');
    const normalized = hasComma
      ? trimmed.replace(/\./g, '').replace(',', '.')
      : trimmed.replace(/,/g, '');
    const parsed = Number(normalized);

    if (Number.isFinite(parsed) && parsed >= 0) {
      return roundMoney(parsed);
    }
  }

  return fallback;
};

export const normalizeEventFees = (event = {}) => ({
  under15: toMoneyNumber(event.feeUnder15 ?? event.priceUnder15, DEFAULT_EVENT_FEES.under15),
  over15: toMoneyNumber(event.feeOver15 ?? event.priceOver15, DEFAULT_EVENT_FEES.over15),
  combo: toMoneyNumber(event.feeCombo ?? event.priceCombo, DEFAULT_EVENT_FEES.combo),
  absolute: toMoneyNumber(event.feeAbsolute ?? event.priceAbsolute, DEFAULT_EVENT_FEES.absolute)
});

export const resolveEventPixKey = (event = {}) => {
  const direct = typeof event.pixKey === 'string' ? event.pixKey.trim() : '';
  const alias = typeof event.pix === 'string' ? event.pix.trim() : '';
  return direct || alias || DEFAULT_EVENT_PIX_KEY;
};

export const formatBrlCurrency = (value, locale = 'pt-BR') => (
  Number(value || 0).toLocaleString(locale, {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
);
