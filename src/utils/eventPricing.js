export const DEFAULT_EVENT_PIX_KEY = '594.343.682-00 (LEAN AUGUSTO CHAVES PEREIRA)';

export const DEFAULT_EVENT_FEES = {
  under15: 120,
  over15: 140,
  combo: 240,
  absolute: 30
};

export const DEFAULT_BELT_REGISTRATION_TITLE = 'Cinturao';

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

const toBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'sim', 'ativo', 'active', 'open', 'aberto'].includes(normalized)) return true;
    if (['false', '0', 'no', 'nao', 'não', 'inativo', 'inactive', 'closed', 'fechado'].includes(normalized)) return false;
  }
  return fallback;
};

export const normalizeEventBeltRegistration = (event = {}) => ({
  enabled: toBoolean(
    event.beltRegistrationEnabled
      ?? event.beltRegistration
      ?? event.cinturaoEnabled
      ?? event.cinturaoAtivo,
    false
  ),
  title: (
    event.beltRegistrationTitle
      || event.beltRegistrationName
      || event.cinturaoTitle
      || event.cinturaoNome
      || DEFAULT_BELT_REGISTRATION_TITLE
  ).toString().trim(),
  price: toMoneyNumber(
    event.beltRegistrationPrice
      ?? event.beltPrice
      ?? event.cinturaoPrice
      ?? event.cinturaoValor,
    0
  ),
  description: (
    event.beltRegistrationDescription
      || event.cinturaoDescription
      || event.cinturaoDescricao
      || ''
  ).toString().trim()
});

export const resolveBatchFee = (batch = {}, feeKey = 'over15', fallback = 0) => {
  const fieldsByKey = {
    under15: [
      batch?.feeUnder15,
      batch?.priceUnder15,
      batch?.under15Price,
      batch?.kidsPrice
    ],
    over15: [
      batch?.feeOver15,
      batch?.priceOver15,
      batch?.over15Price,
      batch?.adultPrice,
      batch?.price,
      batch?.value
    ],
    combo: [
      batch?.feeCombo,
      batch?.priceCombo,
      batch?.comboPrice
    ],
    absolute: [
      batch?.feeAbsolute,
      batch?.priceAbsolute,
      batch?.absolutePrice
    ]
  };

  const candidates = fieldsByKey[feeKey] || fieldsByKey.over15;
  for (const candidate of candidates) {
    const parsed = toMoneyNumber(candidate, null);
    if (parsed !== null) return parsed;
  }
  const fallbackValue = toMoneyNumber(fallback, null);
  if (fallbackValue !== null && fallbackValue > 0) return fallbackValue;
  if (feeKey === 'under15') {
    for (const candidate of [batch?.price, batch?.value]) {
      const parsed = toMoneyNumber(candidate, null);
      if (parsed !== null) return parsed;
    }
  }
  return toMoneyNumber(fallback, 0);
};

export const resolveCurrentEventBatch = (event = {}, now = new Date()) => {
  const batches = Array.isArray(event?.batches) ? event.batches.filter(Boolean) : [];
  if (!batches.length) return null;

  const nowTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const datedBatch = batches.find((batch) => {
    if (!batch) return false;
    const startTime = batch.startDate ? new Date(batch.startDate).getTime() : Number.NEGATIVE_INFINITY;
    const endTime = batch.endDate ? new Date(batch.endDate).getTime() : Number.POSITIVE_INFINITY;
    const startsOk = Number.isFinite(startTime) ? nowTime >= startTime : true;
    const endsOk = Number.isFinite(endTime) ? nowTime <= endTime : true;
    return startsOk && endsOk;
  });

  return datedBatch || batches.find((batch) => batch?.active === true) || batches[0] || null;
};

const resolveAgeNumber = (athlete = {}, referenceDate = new Date()) => {
  const directAge = Number(athlete.age ?? athlete.idade ?? '');
  if (Number.isFinite(directAge) && directAge >= 0) return Math.floor(directAge);

  const birthDate = (athlete.birthDate || athlete.dataNascimento || '').toString().trim();
  if (!birthDate) return null;
  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) return null;
  const reference = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const safeReference = Number.isNaN(reference.getTime()) ? new Date() : reference;
  let age = safeReference.getUTCFullYear() - parsed.getUTCFullYear();
  const birthdayThisYear = new Date(Date.UTC(
    safeReference.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate()
  ));
  if (safeReference.getTime() < birthdayThisYear.getTime()) age -= 1;
  return Math.max(0, age);
};

export const resolveAthleteEventPrice = ({
  event = {},
  athlete = {},
  modalitiesCount = 1,
  absolute = false,
  now = new Date()
} = {}) => {
  const eventFees = normalizeEventFees(event);
  const activeBatch = resolveCurrentEventBatch(event, now);
  const eventDate = event?.date ? new Date(event.date) : null;
  const ageReferenceDate = eventDate && !Number.isNaN(eventDate.getTime()) ? eventDate : now;
  const age = resolveAgeNumber(athlete, ageReferenceDate);
  const isUnder15 = age !== null && age <= 15;
  const baseSinglePrice = isUnder15
    ? resolveBatchFee(activeBatch, 'under15', eventFees.under15)
    : resolveBatchFee(activeBatch, 'over15', eventFees.over15);
  const comboPrice = resolveBatchFee(activeBatch, 'combo', eventFees.combo);
  const absolutePrice = resolveBatchFee(activeBatch, 'absolute', eventFees.absolute);
  const safeModalitiesCount = Math.max(1, Number(modalitiesCount) || 1);
  const base = safeModalitiesCount >= 2
    ? comboPrice
    : baseSinglePrice * safeModalitiesCount;
  const total = base + (absolute ? absolutePrice : 0);

  return {
    total: toMoneyNumber(total, 0),
    base: toMoneyNumber(baseSinglePrice, 0),
    combo: toMoneyNumber(comboPrice, 0),
    absoluteFee: toMoneyNumber(absolutePrice, 0),
    age,
    ageGroup: isUnder15 ? 'Kids' : 'Adulto',
    batch: activeBatch,
    batchName: activeBatch?.name || activeBatch?.label || 'Lote atual'
  };
};

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
