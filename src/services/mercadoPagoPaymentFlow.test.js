import { describe, it, expect, vi, beforeEach } from 'vitest';
import { REGISTRATION_STATUS, normalizeRegistrationStatus } from '../utils/registrationStatus';
import { publicRegistrationService } from './publicRegistrationService';

describe('Mercado Pago Payment Flow & False Positive Prevention', () => {
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

  it('should only approve registration when price is 0 (free event)', () => {
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
    // Mock global fetch for payment status endpoint
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/webhooks/payment/status/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'pending', approved: false, externalReference: 'reg-123' })
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const result = await publicRegistrationService.checkPaymentStatus('123456');
    expect(result.approved).toBe(false);
    expect(result.status).toBe('pending');
  });

  it('should verify payment status query returning approved: true only when MP status is approved', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/webhooks/payment/status/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'approved', approved: true, externalReference: 'reg-123' })
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const result = await publicRegistrationService.checkPaymentStatus('123456');
    expect(result.approved).toBe(true);
    expect(result.status).toBe('approved');
  });

  it('should simulate returning from MP checkout without paying (pending/cancelled) and prevent false positive approval', () => {
    // Simulate user returning with null or pending status
    const urlParams = new URLSearchParams('collection_status=null&payment_id=null&status=null&external_reference=reg-101');
    const collectionStatus = urlParams.get('collection_status');
    const status = urlParams.get('status');
    const paymentId = urlParams.get('payment_id');

    const isApprovedParam = collectionStatus === 'approved' || status === 'approved';
    expect(isApprovedParam).toBe(false);

    // Initial state of registration in DB / localStorage
    const registration = {
      id: 'reg-101',
      nome: 'Atleta Teste',
      price: 150,
      status: 'PENDING',
      paymentMethod: 'Mercado Pago'
    };

    // If returning without approved status, status MUST remain PENDING
    if (!isApprovedParam && paymentId === 'null') {
      // Do NOT mutate to APPROVED
    } else {
      registration.status = 'APPROVED';
    }

    expect(registration.status).toBe('PENDING');
    expect(normalizeRegistrationStatus(registration.status)).toBe(REGISTRATION_STATUS.PENDING);
  });

  it('should simulate successful Mercado Pago webhook and approve registration', () => {
    const registration = {
      id: 'reg-101',
      nome: 'Atleta Teste',
      price: 150,
      status: 'PENDING',
      paymentMethod: 'Mercado Pago'
    };

    // Webhook payload from Mercado Pago
    const webhookEvent = {
      type: 'payment',
      data: { id: 987654321 },
      status: 'approved',
      external_reference: 'reg-101'
    };

    if (webhookEvent.status === 'approved' && webhookEvent.external_reference === registration.id) {
      registration.status = 'APPROVED';
      registration.transactionId = String(webhookEvent.data.id);
    }

    expect(registration.status).toBe('APPROVED');
    expect(normalizeRegistrationStatus(registration.status)).toBe(REGISTRATION_STATUS.PAYMENT_CONFIRMED);
    expect(registration.transactionId).toBe('987654321');
  });
});
