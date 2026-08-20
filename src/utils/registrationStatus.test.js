import { describe, it, expect } from 'vitest';
import { REGISTRATION_STATUS, normalizeRegistrationStatus } from './registrationStatus';

describe('registrationStatus utility', () => {
  it('should correctly normalize pending status variations to REGISTRATION_STATUS.PENDING', () => {
    expect(normalizeRegistrationStatus('PENDING')).toBe(REGISTRATION_STATUS.PENDING);
    expect(normalizeRegistrationStatus('pending')).toBe(REGISTRATION_STATUS.PENDING);
    expect(normalizeRegistrationStatus('PENDENTE')).toBe(REGISTRATION_STATUS.PENDING);
    expect(normalizeRegistrationStatus('pendente')).toBe(REGISTRATION_STATUS.PENDING);
    expect(normalizeRegistrationStatus('PENDING_REVIEW')).toBe(REGISTRATION_STATUS.PENDING);
    expect(normalizeRegistrationStatus('pending_review')).toBe(REGISTRATION_STATUS.PENDING);
    expect(normalizeRegistrationStatus('PENDING_SYNC')).toBe(REGISTRATION_STATUS.PENDING);
    expect(normalizeRegistrationStatus('pending-sync')).toBe(REGISTRATION_STATUS.PENDING);
    expect(normalizeRegistrationStatus(REGISTRATION_STATUS.PENDING)).toBe(REGISTRATION_STATUS.PENDING);
    expect(normalizeRegistrationStatus(REGISTRATION_STATUS.PENDING_SYNC)).toBe(REGISTRATION_STATUS.PENDING);
  });

  it('should correctly normalize approved and paid statuses to REGISTRATION_STATUS.PAYMENT_CONFIRMED', () => {
    expect(normalizeRegistrationStatus('APPROVED')).toBe(REGISTRATION_STATUS.PAYMENT_CONFIRMED);
    expect(normalizeRegistrationStatus('approved')).toBe(REGISTRATION_STATUS.PAYMENT_CONFIRMED);
    expect(normalizeRegistrationStatus('PAGO')).toBe(REGISTRATION_STATUS.PAYMENT_CONFIRMED);
    expect(normalizeRegistrationStatus('pago')).toBe(REGISTRATION_STATUS.PAYMENT_CONFIRMED);
    expect(normalizeRegistrationStatus('CONFIRMADO')).toBe(REGISTRATION_STATUS.PAYMENT_CONFIRMED);
    expect(normalizeRegistrationStatus('confirmado')).toBe(REGISTRATION_STATUS.PAYMENT_CONFIRMED);
    expect(normalizeRegistrationStatus('PAGAMENTO_CONFIRMADO')).toBe(REGISTRATION_STATUS.PAYMENT_CONFIRMED);
    expect(normalizeRegistrationStatus('payment_confirmed')).toBe(REGISTRATION_STATUS.PAYMENT_CONFIRMED);
    expect(normalizeRegistrationStatus(REGISTRATION_STATUS.PAYMENT_CONFIRMED)).toBe(REGISTRATION_STATUS.PAYMENT_CONFIRMED);
  });

  it('should correctly normalize error and rejection statuses to REGISTRATION_STATUS.PAYMENT_ERROR', () => {
    expect(normalizeRegistrationStatus('ERRO')).toBe(REGISTRATION_STATUS.PAYMENT_ERROR);
    expect(normalizeRegistrationStatus('erro')).toBe(REGISTRATION_STATUS.PAYMENT_ERROR);
    expect(normalizeRegistrationStatus('RECUSADO')).toBe(REGISTRATION_STATUS.PAYMENT_ERROR);
    expect(normalizeRegistrationStatus('recusado')).toBe(REGISTRATION_STATUS.PAYMENT_ERROR);
    expect(normalizeRegistrationStatus('REJEITADO')).toBe(REGISTRATION_STATUS.PAYMENT_ERROR);
    expect(normalizeRegistrationStatus('rejeitado')).toBe(REGISTRATION_STATUS.PAYMENT_ERROR);
    expect(normalizeRegistrationStatus('PAGAMENTO_ERRO')).toBe(REGISTRATION_STATUS.PAYMENT_ERROR);
    expect(normalizeRegistrationStatus(REGISTRATION_STATUS.PAYMENT_ERROR)).toBe(REGISTRATION_STATUS.PAYMENT_ERROR);
  });

  it('should default empty or unknown statuses safely to REGISTRATION_STATUS.PENDING (preventing false positive approval)', () => {
    expect(normalizeRegistrationStatus('')).toBe(REGISTRATION_STATUS.PENDING);
    expect(normalizeRegistrationStatus(null)).toBe(REGISTRATION_STATUS.PENDING);
    expect(normalizeRegistrationStatus(undefined)).toBe(REGISTRATION_STATUS.PENDING);
    expect(normalizeRegistrationStatus('unknown_status')).toBe(REGISTRATION_STATUS.PENDING);
  });
});
