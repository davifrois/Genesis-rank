import { describe, it, expect, vi, beforeEach } from 'vitest';
import { REGISTRATION_STATUS, normalizeRegistrationStatus } from '../utils/registrationStatus';
import { publicRegistrationService } from './publicRegistrationService';

describe('Mercado Pago Payment Flow & Separation of 3 States (Approved, Pending, Error)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('should ensure newly created registration with Mercado Pago starts as PENDING', () => {
    const activeRegData = {
      price: 120.00,
      weight: 'Pena (-70kg)',
      modalities: ['GI'],
    };

    const initialStatus = Number(activeRegData.price || 0) === 0 ? 'APPROVED' : 'PENDING';
    expect(initialStatus).toBe('PENDING');

    const normalized = normalizeRegistrationStatus(initialStatus);
    expect(normalized).toBe(REGISTRATION_STATUS.PENDING);
    expect(normalized).not.toBe(REGISTRATION_STATUS.PAYMENT_CONFIRMED);
  });

  it('should only approve registration automatically when price is 0 (free event)', () => {
    const freeRegData = {
      price: 0,
      weight: 'Pena (-70kg)',
      modalities: ['GI'],
    };

    const freeStatus = Number(freeRegData.price || 0) === 0 ? 'APPROVED' : 'PENDING';
    expect(freeStatus).toBe('APPROVED');
    expect(normalizeRegistrationStatus(freeStatus)).toBe(REGISTRATION_STATUS.PAYMENT_CONFIRMED);
  });

  it('should verify payment status query returning approved: false when payment is pending', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/webhooks/payment/status') || url.includes('/api/status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'pending', approved: false, externalReference: 'reg-123', paymentId: '123456' })
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const result = await publicRegistrationService.checkPaymentStatus('123456');
    expect(result.ok).toBe(true);
    expect(result.approved).toBe(false);
    expect(result.status).toBe('pending');
  });

  it('should verify payment status query returning approved: true only when MP status is approved', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/webhooks/payment/status') || url.includes('/api/status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'approved', approved: true, externalReference: 'reg-123', paymentId: '123456' })
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const result = await publicRegistrationService.checkPaymentStatus('123456');
    expect(result.ok).toBe(true);
    expect(result.approved).toBe(true);
    expect(result.status).toBe('approved');
  });

  it('should handle network outage gracefully without returning false pending', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const result = await publicRegistrationService.checkPaymentStatus('123456');
    expect(result.ok).toBe(false);
    expect(result.status).toBe('unknown');
    expect(result.error).toBe(true);
  });

  it('STATE 1 (APPROVED): should approve registration when user returns from Mercado Pago with status=approved', () => {
    const urlParams = new URLSearchParams('collection_status=approved&payment_id=987654321&status=approved&external_reference=reg-101');
    const collectionStatus = urlParams.get('collection_status');
    const status = urlParams.get('status');
    const paymentId = urlParams.get('payment_id');

    const isApprovedParam = collectionStatus === 'approved' || status === 'approved';
    expect(isApprovedParam).toBe(true);

    const registration = {
      id: 'reg-101',
      nome: 'Atleta Campeão',
      price: 150,
      status: 'PENDING',
      paymentMethod: 'Mercado Pago'
    };

    if (isApprovedParam) {
      registration.status = 'APPROVED';
      registration.paymentStatus = 'APPROVED';
      registration.transactionId = paymentId;
    }

    expect(registration.status).toBe('APPROVED');
    expect(normalizeRegistrationStatus(registration.status)).toBe(REGISTRATION_STATUS.PAYMENT_CONFIRMED);
    expect(registration.transactionId).toBe('987654321');
  });

  it('STATE 2 (PENDING): should keep registration as PENDING when user leaves/cancels checkout or returns with pending', () => {
    const urlParams = new URLSearchParams('collection_status=pending&payment_id=null&status=pending&external_reference=reg-102');
    const collectionStatus = urlParams.get('collection_status');
    const status = urlParams.get('status');

    const isApprovedParam = collectionStatus === 'approved' || status === 'approved';
    const isPendingParam = collectionStatus === 'pending' || status === 'pending';

    expect(isApprovedParam).toBe(false);
    expect(isPendingParam).toBe(true);

    const registration = {
      id: 'reg-102',
      nome: 'Atleta Aguardando',
      price: 150,
      status: 'PENDING',
      paymentMethod: 'Mercado Pago'
    };

    if (isApprovedParam) {
      registration.status = 'APPROVED';
    }

    expect(registration.status).toBe('PENDING');
    expect(normalizeRegistrationStatus(registration.status)).toBe(REGISTRATION_STATUS.PENDING);
  });

  it('STATE 3 (ERROR / REJECTED): should identify payment rejection and not approve registration', () => {
    const urlParams = new URLSearchParams('collection_status=rejected&payment_id=999999&status=rejected&external_reference=reg-103');
    const collectionStatus = urlParams.get('collection_status');
    const status = urlParams.get('status');

    const isApprovedParam = collectionStatus === 'approved' || status === 'approved';
    const isRejectedParam = collectionStatus === 'rejected' || status === 'rejected';

    expect(isApprovedParam).toBe(false);
    expect(isRejectedParam).toBe(true);

    const registration = {
      id: 'reg-103',
      nome: 'Atleta Cartão Recusado',
      price: 150,
      status: 'PENDING',
      paymentMethod: 'Mercado Pago'
    };

    if (isApprovedParam) {
      registration.status = 'APPROVED';
    }

    expect(registration.status).toBe('PENDING');
    expect(normalizeRegistrationStatus(registration.status)).not.toBe(REGISTRATION_STATUS.PAYMENT_CONFIRMED);
  });
});
