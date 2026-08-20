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

  if (
    normalized === 'PENDENTE'
    || normalized === 'PENDING'
    || normalized === 'PENDING_REVIEW'
    || normalized === 'PENDING_SYNC'
    || normalized === REGISTRATION_STATUS.PENDING
    || normalized === REGISTRATION_STATUS.PENDING_SYNC
  ) {
    return REGISTRATION_STATUS.PENDING;
  }

  if (
    normalized === 'PAGO'
    || normalized === 'CONFIRMADO'
    || normalized === 'APPROVED'
    || normalized === 'PAGAMENTO_CONFIRMADO'
    || normalized === REGISTRATION_STATUS.PAYMENT_CONFIRMED
  ) {
    return REGISTRATION_STATUS.PAYMENT_CONFIRMED;
  }

  if (
    normalized === 'ERRO'
    || normalized === 'RECUSADO'
    || normalized === 'REJEITADO'
    || normalized === 'PAGAMENTO_ERRO'
    || normalized === REGISTRATION_STATUS.PAYMENT_ERROR
  ) {
    return REGISTRATION_STATUS.PAYMENT_ERROR;
  }

  return REGISTRATION_STATUS.PENDING;
};
