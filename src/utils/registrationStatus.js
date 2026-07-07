export const REGISTRATION_STATUS = Object.freeze({
  PENDING_SYNC: 'PENDING_SYNC',
  PENDING: 'PENDING',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  PAYMENT_ERROR: 'PAYMENT_ERROR'
});

const normalizeStatusToken = (value) => (
  (value || '')
    .toString()
    .trim()
    .toUpperCase()
    .replace('-', '_')
    .replace(/\s+/g, '_')
);

export const normalizeRegistrationStatus = (value) => {
  const normalized = normalizeStatusToken(value);

  if (normalized === REGISTRATION_STATUS.PENDING_SYNC) {
    return REGISTRATION_STATUS.PENDING_SYNC;
  }
  if (
    normalized === 'PENDENTE'
    || normalized === 'PENDING_REVIEW'
    || normalized === REGISTRATION_STATUS.PENDING
  ) {
    return REGISTRATION_STATUS.PENDING;
  }
  if (
    normalized === 'PAGO'
    || normalized === 'CONFIRMADO'
    || normalized === 'PAGAMENTO_CONFIRMADO'
    || normalized === 'APPROVED'
    || normalized === 'PAID'
    || normalized === REGISTRATION_STATUS.PAYMENT_CONFIRMED
  ) {
    return REGISTRATION_STATUS.PAYMENT_CONFIRMED;
  }
  if (
    normalized === 'ERRO'
    || normalized === 'RECUSADO'
    || normalized === 'PAGAMENTO_ERRO'
    || normalized === REGISTRATION_STATUS.PAYMENT_ERROR
  ) {
    return REGISTRATION_STATUS.PAYMENT_ERROR;
  }
  return REGISTRATION_STATUS.PENDING;
};
