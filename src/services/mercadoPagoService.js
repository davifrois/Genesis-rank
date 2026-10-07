/**
 * mercadoPagoService.js
 * Serviço frontend para integração com Mercado Pago via backend Genesis.
 * SEGURANÇA: Nenhuma chave secreta é exposta aqui — tudo vai pelo backend (server.js).
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');

// ─── Helpers ────────────────────────────────────────────────────────────────

const post = async (endpoint, body) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || errData?.message || `Erro HTTP ${res.status}`);
    }
    return res.json();
};

const get = async (endpoint, params = {}) => {
    const url = new URL(`${API_BASE}${endpoint}`);
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) url.searchParams.set(k, v); });
    const res = await fetch(url.toString());
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || errData?.message || `Erro HTTP ${res.status}`);
    }
    return res.json();
};

// ═══════════════════════════════════════════════════════════════════════════
//  OAuth — Conexão da conta MP do Organizador
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Abre o fluxo OAuth do Mercado Pago para o organizador conectar sua conta.
 * Redireciona o browser para a tela de autorização do MP.
 *
 * @param {string} eventId - ID do evento ao qual o organizador será vinculado
 */
export const connectOrganizerAccount = (eventId) => {
    if (!eventId) throw new Error('eventId é obrigatório para conectar conta MP.');
    window.location.href = `${API_BASE}/api/auth/mercadopago/connect?eventId=${encodeURIComponent(eventId)}`;
};

/**
 * Consulta se o organizador do evento já conectou a conta MP.
 *
 * @param {string} eventId
 * @returns {Promise<{ connected: boolean, mpUserId?: string, connectedAt?: string }>}
 */
export const getOrganizerTokenStatus = (eventId) =>
    get('/api/organizer-token-status', { eventId });

/**
 * Desconecta a conta MP do evento.
 *
 * @param {string} eventId
 * @returns {Promise<{ success: boolean }>}
 */
export const disconnectOrganizerAccount = async (eventId) => {
    const url = new URL(`${API_BASE}/api/organizer-token`);
    url.searchParams.set('eventId', eventId);
    const res = await fetch(url.toString(), { method: 'DELETE' });
    return res.json();
};

// ═══════════════════════════════════════════════════════════════════════════
//  PIX — Geração de Pagamento Transparente
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gera um pagamento PIX via Checkout Transparente.
 * Se o evento tiver organizador com conta MP conectada, o split é aplicado automaticamente.
 *
 * @param {Object} options
 * @param {string} options.registrationIds - IDs das inscrições separados por vírgula
 * @param {string} options.eventId - ID do evento
 * @param {string} options.athleteName - Nome completo do atleta
 * @param {string} options.email - Email do pagador
 * @param {string} [options.cpf] - CPF do pagador (recomendado para evitar rejeição)
 * @param {number} options.amount - Valor total em reais (ex: 150.00)
 * @param {number} [options.applicationFee] - Taxa da plataforma (opcional, usa MP_PLATFORM_FEE do server se omitido)
 * @param {string} [options.dateOfExpiration] - ISO string de expiração (padrão: 24h)
 *
 * @returns {Promise<{
 *   paymentId: number,
 *   status: string,
 *   qrCode: string,
 *   qrCodeBase64: string,
 *   ticketUrl: string,
 *   expiresAt: string,
 *   transactionAmount: number,
 *   applicationFee: number
 * }>}
 */
export const generatePix = (options) => {
    const { registrationIds, eventId, athleteName, email, cpf, amount, applicationFee, dateOfExpiration } = options;

    if (!registrationIds) throw new Error('registrationIds é obrigatório.');
    if (!amount || Number(amount) <= 0) throw new Error('Valor inválido para geração de PIX.');
    if (!email) throw new Error('Email do pagador é obrigatório.');

    return post('/api/webhooks/payment/pix', {
        registrationIds: String(registrationIds),
        eventId,
        athleteName,
        email,
        cpf,
        amount: Number(amount),
        applicationFee,
        dateOfExpiration
    });
};

// ═══════════════════════════════════════════════════════════════════════════
//  Checkout Padrão MP (redirect)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gera preferência de pagamento no Checkout MP (abre a página do MP).
 *
 * @param {Object} options
 * @param {string} options.registrationIds
 * @param {string} options.eventId
 * @param {string} options.athleteName
 * @param {string} options.athleteEmail
 * @param {number} options.amount
 * @param {number} [options.applicationFee]
 *
 * @returns {Promise<{ url: string, id: string }>}
 */
export const generateCheckoutUrl = (options) =>
    post('/api/webhooks/payment/checkout', options);

// ═══════════════════════════════════════════════════════════════════════════
//  Consulta de Status (Polling)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Consulta o status atual de um pagamento no Mercado Pago.
 * Atualiza automaticamente o DB se aprovado.
 *
 * @param {string|number} paymentId
 * @param {string} [eventId] - usado para selecionar o token do organizador certo
 * @returns {Promise<{ paymentId, status, approved: boolean, externalReference, transactionAmount }>}
 */
export const checkPaymentStatus = (paymentId, eventId) =>
    get(`/api/webhooks/payment/status/${paymentId}`, { eventId });

/**
 * Polling automático de status: verifica a cada intervalMs até aprovado ou timeout.
 *
 * @param {Object} options
 * @param {string|number} options.paymentId
 * @param {string} [options.eventId]
 * @param {Function} options.onStatusChange - chamado a cada mudança de status
 * @param {number} [options.intervalMs=5000] - intervalo entre verificações (default: 5s)
 * @param {number} [options.timeoutMs=600000] - timeout total (default: 10min)
 *
 * @returns {{ stop: () => void }} - objeto com função para parar o polling
 */
export const startPaymentPolling = ({ paymentId, eventId, onStatusChange, intervalMs = 5000, timeoutMs = 600_000 }) => {
    let stopped = false;
    const startTime = Date.now();

    const poll = async () => {
        if (stopped) return;
        if (Date.now() - startTime > timeoutMs) {
            onStatusChange({ status: 'timeout', approved: false, timedOut: true });
            return;
        }

        try {
            const result = await checkPaymentStatus(paymentId, eventId);
            onStatusChange(result);

            if (result.approved || result.status === 'rejected' || result.status === 'cancelled') {
                stopped = true;
                return;
            }
        } catch (e) {
            console.warn('[PIX Polling] Erro ao verificar status:', e.message);
            onStatusChange({ status: 'unknown', approved: false, error: true });
        }

        if (!stopped) setTimeout(poll, intervalMs);
    };

    setTimeout(poll, intervalMs);

    return { stop: () => { stopped = true; } };
};

// ═══════════════════════════════════════════════════════════════════════════
//  Cancelamento Manual de Pendentes Expirados (Admin)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cancela inscrições PENDING de eventos expirados.
 * Pode ser chamado pelo admin para forçar o cancelamento imediato.
 * O cron do backend executa isso automaticamente a cada hora.
 *
 * @param {string} [eventId] - se fornecido, cancela apenas do evento especificado
 * @returns {Promise<{ success: boolean, cancelled: number, cancelledIds: string[] }>}
 */
export const expirePendingRegistrations = (eventId) =>
    post('/api/admin/registrations/expire-pending', eventId ? { eventId } : {});

export default {
    connectOrganizerAccount,
    getOrganizerTokenStatus,
    disconnectOrganizerAccount,
    generatePix,
    generateCheckoutUrl,
    checkPaymentStatus,
    startPaymentPolling,
    expirePendingRegistrations
};
