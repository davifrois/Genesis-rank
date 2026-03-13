import { authService } from './authService';

const ENV_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE_URL = ENV_API_BASE_URL ? ENV_API_BASE_URL.replace(/\/$/, '') : '';

const buildApiUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const parseErrorMessage = async (response, fallbackMessage) => {
  try {
    const payload = await response.json();
    if (payload?.message) return payload.message;
    if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error.trim();
  } catch {
    // Ignore parse errors and try text fallback.
  }
  try {
    const text = await response.text();
    if (text?.trim()) return text.trim();
  } catch {
    // Ignore text parsing errors.
  }
  return fallbackMessage;
};

const buildAuthHeaders = () => {
  const headers = {
    'Content-Type': 'application/json'
  };
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
  location: (payload.location || '').toString().trim() || null,
  posterUrl: normalizeApiUrlField(payload.posterUrl),
  registrationUrl: normalizeApiUrlField(payload.registrationUrl),
  pixKey: (payload.pixKey || '').toString().trim() || null,
  feeUnder15: payload.feeUnder15,
  feeOver15: payload.feeOver15,
  feeCombo: payload.feeCombo,
  feeAbsolute: payload.feeAbsolute,
  registrationOpen: payload.registrationOpen !== false,
  internalRegistration: payload.internalRegistration !== false
});

export const eventAdminService = {
  createEvent: async (payload) => {
    const { headers, token } = buildAuthHeaders();
    if (!token) {
      return { skipped: true, reason: 'NO_TOKEN' };
    }

    const response = await fetch(buildApiUrl('/api/events'), {
      method: 'POST',
      headers,
      body: JSON.stringify(normalizePayload(payload))
    });

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
  }
};
