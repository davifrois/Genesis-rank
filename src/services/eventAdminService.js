import { authService } from './authService';
import { resolveBatchFee } from '../utils/eventPricing';

const resolveApiBaseUrl = () => {
  const envUrl = (import.meta.env?.VITE_API_BASE_URL || '').trim();
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost && envUrl.includes('localhost')) {
      return '';
    }
  }
  return envUrl.replace(/\/$/, '');
};

const buildApiUrl = (path) => {
  const base = resolveApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};

const parseErrorMessage = async (response, fallbackMessage) => {
  try {
    const text = await response.text();
    if (!text || !text.trim()) return `${fallbackMessage} (Status: ${response.status})`;

    try {
      const payload = JSON.parse(text);
      if (payload?.message) return payload.message;
      if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error.trim();
    } catch {
      // Not JSON, return raw text
      return text.trim();
    }
  } catch {
    // Ignore text reading errors
  }
  return `${fallbackMessage} (Status: ${response.status})`;
};

const buildAuthHeaders = async () => {
  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
  };
  
  if (authService?.ensureApiAdminToken) {
    try {
      await authService.ensureApiAdminToken();
    } catch (_) {}
  }
  
  const token = (authService?.getApiToken ? authService.getApiToken() : '').toString().trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return { headers, token };
};

const normalizeApiUrlField = (value) => {
  const text = (value || '').toString().trim();
  if (!text) return null;
  // Backend expects URL text (small varchar). Keep base64/blob only on frontend storage.
  if (/^(data:|blob:)/i.test(text)) return null;
  // Prevent oversized URL payloads from causing backend persistence failures.
  if (text.length > 580) return null;
  return text;
};

const normalizePayload = (payload = {}) => ({
  name: (payload.name || '').toString().trim(),
  date: (payload.date || '').toString().trim() || null,
  endDate: (payload.endDate || '').toString().trim() || null,
  registrationCloseDate: (payload.registrationCloseDate || '').toString().trim() || null,
  checkinEndDate: (payload.checkinEndDate || '').toString().trim() || null,
  location: (payload.location || '').toString().trim() || null,
  isPremium: payload.isPremium === true,
  eventDescription: (payload.eventDescription || '').toString().trim() || null,
  eventSocialWebsite: (payload.eventSocialWebsite || '').toString().trim() || null,
  eventSocialWhatsapp: (payload.eventSocialWhatsapp || '').toString().trim() || null,
  eventSocialInstagram: (payload.eventSocialInstagram || '').toString().trim() || null,
  accommodationEnabled: payload.accommodationEnabled === true,
  accommodationTitle: (payload.accommodationTitle || '').toString().trim() || null,
  accommodationDescription: (payload.accommodationDescription || '').toString().trim() || null,
  accommodationSearchLocation: (payload.accommodationSearchLocation || '').toString().trim() || null,
  posterUrl: normalizeApiUrlField(payload.posterUrl),
  registrationUrl: normalizeApiUrlField(payload.registrationUrl),
  pixKey: (payload.pixKey || '').toString().trim() || null,
  feeUnder15: payload.feeUnder15,
  feeOver15: payload.feeOver15,
  feeCombo: payload.feeCombo,
  feeAbsolute: payload.feeAbsolute,
  beltRegistrationEnabled: payload.beltRegistrationEnabled === true,
  beltRegistrationTitle: (payload.beltRegistrationTitle || '').toString().trim() || null,
  beltRegistrationPrice: payload.beltRegistrationPrice,
  beltRegistrationDescription: (payload.beltRegistrationDescription || '').toString().trim() || null,
  beltRegistrationPhone: (payload.beltRegistrationPhone || '').toString().trim() || null,
  maxAthletes: payload.maxAthletes ? parseInt(payload.maxAthletes, 10) : 0,
  closeOnCapacity: payload.closeOnCapacity === true,
  batches: Array.isArray(payload.batches)
    ? payload.batches.map((batch, index) => {
        const feeUnder15 = resolveBatchFee(batch, 'under15', payload.feeUnder15 || 0);
        const feeOver15 = resolveBatchFee(batch, 'over15', payload.feeOver15 || feeUnder15);
        return {
          id: (batch.id || `batch-${index + 1}`).toString(),
          name: (batch.name || `Lote ${index + 1}`).toString().trim(),
          startDate: (batch.startDate || '').toString().trim() || null,
          endDate: (batch.endDate || '').toString().trim() || null,
          feeUnder15,
          feeOver15,
          feeCombo: resolveBatchFee(batch, 'combo', payload.feeCombo || 0),
          feeAbsolute: resolveBatchFee(batch, 'absolute', payload.feeAbsolute || 0),
          price: feeOver15,
          active: batch.active === true
        };
      })
    : [],
  superFights: Array.isArray(payload.superFights) ? payload.superFights : [],
  superFightsPublished: payload.superFightsPublished === true,
  registrationOpen: payload.registrationOpen !== false,
  internalRegistration: payload.internalRegistration !== false,
  eventPhase: (payload.eventPhase || '').toString().trim() || null,
  publicPublished: payload.publicPublished !== false,
  publishedAt: (payload.publishedAt || '').toString().trim() || null
});

// ========================================== //
//  SERVIÇO DE ADMINISTRAÇÃO DE EVENTOS       //
// ========================================== //
// Funções para criar e atualizar eventos no backend (apenas para Organizadores).
export const eventAdminService = {
  // Cria um novo evento/campeonato chamando a API
  createEvent: async (payload) => {
    let { headers, token } = await buildAuthHeaders();
    if (!token) {
      return { skipped: true, reason: 'NO_TOKEN' };
    }

    const requestOptions = {
      method: 'POST',
      headers,
      body: JSON.stringify(normalizePayload(payload))
    };

    try {
      let response = await fetch(buildApiUrl('/api/events'), requestOptions);

      if (response.status === 401 || response.status === 403) {
        if (authService?.clearApiToken) authService.clearApiToken();
        const newAuth = await buildAuthHeaders();
        if (!newAuth.token) return { skipped: true, reason: 'NO_TOKEN' };
        requestOptions.headers = newAuth.headers;
        response = await fetch(buildApiUrl('/api/events'), requestOptions);
      }

      if (!response.ok) {
        const message = await parseErrorMessage(
          response,
          'Falha ao criar campeonato no servidor.'
        );
        const error = new Error(message);
        error.status = response.status;
        throw error;
      }

      const data = await response.json();
      return { skipped: false, data };
    } catch (networkError) {
      console.warn('Backend indisponível para criação de evento, prosseguindo localmente:', networkError);
      return { skipped: true, reason: 'NETWORK_ERROR', error: networkError };
    }
  },

  updateEvent: async (eventId, payload) => {
    let { headers, token } = await buildAuthHeaders();
    if (!token) {
      return { skipped: true, reason: 'NO_TOKEN' };
    }

    const requestOptions = {
      method: 'PUT',
      headers,
      body: JSON.stringify(normalizePayload(payload))
    };

    const url = buildApiUrl(`/api/events/${encodeURIComponent(eventId)}`);

    try {
      let response = await fetch(url, requestOptions);

      if (response.status === 401 || response.status === 403) {
        if (authService?.clearApiToken) authService.clearApiToken();
        const newAuth = await buildAuthHeaders();
        if (!newAuth.token) return { skipped: true, reason: 'NO_TOKEN' };
        requestOptions.headers = newAuth.headers;
        response = await fetch(url, requestOptions);
      }

      if (!response.ok) {
        const message = await parseErrorMessage(
          response,
          'Falha ao atualizar campeonato no servidor.'
        );
        const error = new Error(message);
        error.status = response.status;
        throw error;
      }

      const data = await response.json();
      return { skipped: false, data };
    } catch (networkError) {
      console.warn('Backend indisponível para atualização de evento, prosseguindo localmente:', networkError);
      return { skipped: true, reason: 'NETWORK_ERROR', error: networkError };
    }
  }
};
