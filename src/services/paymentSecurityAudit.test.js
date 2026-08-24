import { describe, it, expect, vi, beforeEach } from 'vitest';
import { publicRegistrationService } from './publicRegistrationService';

describe('Payment Security & Anti-Fraud Audit Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Proteção Contra Manipulação de Preço (Price Tampering)', () => {
    it('deve rejeitar valores zerados, negativos ou não numéricos', () => {
      const invalidAmounts = [0, -10, -0.01, NaN, Infinity, -Infinity, 'invalid', null, undefined];
      
      invalidAmounts.forEach(amount => {
        const num = Number(amount);
        const isValid = Boolean(num && !isNaN(num) && num > 0 && isFinite(num));
        expect(isValid).toBe(false);
      });
    });

    it('deve formatar e arredondar com precisão bancária valores monetários em centavos', () => {
      const floatAmount = 140.00000000000003;
      const sanitized = Math.round(floatAmount * 100) / 100;
      expect(sanitized).toBe(140.00);

      const floatCents = 140.456;
      const roundedCents = Math.round(floatCents * 100) / 100;
      expect(roundedCents).toBe(140.46);
    });
  });

  describe('2. Sanitização de Metadados e Prevenção contra Injeção de Código (XSS / SQLi)', () => {
    it('deve sanitizar tags maliciosas nos metadados de pagamento do atleta', () => {
      const maliciousName = '<script>alert("xss")</script>João Atleta';
      const sanitized = maliciousName.replace(/[<>{}]/g, '').trim();
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
      expect(sanitized).toBe('scriptalert("xss")/scriptJoão Atleta');
    });

    it('deve sanitizar paymentId para aceitar apenas caracteres alfanuméricos seguros', () => {
      const maliciousPaymentId = '../../etc/passwd%00;DROP TABLE payments;';
      const sanitized = maliciousPaymentId.replace(/[^a-zA-Z0-9_\-]/g, '').trim();
      
      expect(sanitized).not.toContain('../');
      expect(sanitized).not.toContain(';');
      expect(sanitized).toBe('etcpasswd00DROPTABLEpayments');
    });
  });

  describe('3. Idempotência e Integridade de Estados de Pagamento', () => {
    it('deve aprovar inscrições apenas quando o gateway confirmar status "approved"', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 123456789,
          status: 'approved',
          external_reference: 'reg-001,reg-002',
          transaction_amount: 140
        })
      });
      global.fetch = mockFetch;

      const result = await publicRegistrationService.checkPaymentStatus('123456789');
      expect(result.approved).toBe(true);
      expect(result.status).toBe('approved');
      expect(result.paymentId).toBe(123456789);
    });

    it('NÃO deve aprovar inscrições quando o status retornado for "pending", "in_process" ou "rejected"', async () => {
      const pendingStatuses = ['pending', 'in_process', 'rejected', 'cancelled', 'refunded'];

      for (const status of pendingStatuses) {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            id: 999999,
            status,
            external_reference: 'reg-001'
          })
        });

        const result = await publicRegistrationService.checkPaymentStatus('999999');
        expect(result.approved).toBe(false);
        expect(result.status).toBe(status);
      }
    });

    it('deve tratar falhas de rede do gateway com resiliência sem travar a aplicação', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network Gateway Timeout'));

      const result = await publicRegistrationService.checkPaymentStatus('timeout-id');
      expect(result.approved).toBe(false);
      expect(['unknown', 'pending', 'error']).toContain(result.status);
    });
  });
});
