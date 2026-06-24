import { authService } from './authService';

const ENV_API_BASE_URL = ("" || '').trim();
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
    // Ignore parse errors and keep fallback.
  }

  try {
    const text = await response.text();
    if (text?.trim()) return text.trim();
  } catch {
    // Ignore parse errors and keep fallback.
  }

  return fallbackMessage;
};

export const coachNotificationService = {
  notifyAthleteLinked: async (payload = {}) => {
    const token = (authService?.getApiToken ? authService.getApiToken() : '').toString().trim();
    if (!token) {
      return { skipped: true, reason: 'NO_TOKEN' };
    }

    const response = await fetch(buildApiUrl('/api/coach/notifications/athlete-linked'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload || {})
    });

    if (response.status === 401 || response.status === 403) {
      return { skipped: true, reason: 'UNAUTHORIZED' };
    }

    if (!response.ok) {
      const message = await parseErrorMessage(
        response,
        'Falha ao enviar e-mail de vinculo para o professor.'
      );
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return { skipped: false };
  }
};
