import { authService } from './authService';

const ENV_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE_URL = ENV_API_BASE_URL ? ENV_API_BASE_URL.replace(/\/$/, '') : '';

const buildApiUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const clampLimit = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 10;
  return Math.max(1, Math.min(20, Math.floor(parsed)));
};

const buildInstagramQuery = (limit, options = {}) => {
  const normalizedLimit = clampLimit(limit);
  const shouldRefresh = options?.refresh === true;
  return shouldRefresh
    ? `limit=${encodeURIComponent(normalizedLimit)}&refresh=true`
    : `limit=${encodeURIComponent(normalizedLimit)}`;
};

const parseInstagramLastUpdatedHeader = (response) => {
  try {
    return (response?.headers?.get('X-Instagram-Feed-Updated-At') || '').toString().trim();
  } catch {
    return '';
  }
};

const parseInstagramStatusHeader = (response) => {
  try {
    return (response?.headers?.get('X-Instagram-Feed-Status') || '').toString().trim().toUpperCase();
  } catch {
    return '';
  }
};

const canProxyInstagramMediaHost = (rawUrl) => {
  if (!rawUrl) return false;
  try {
    const parsed = new URL(rawUrl);
    if (!/^https?:$/i.test(parsed.protocol)) return false;
    const host = (parsed.hostname || '').toLowerCase();
    return host === 'cdninstagram.com'
      || host.endsWith('.cdninstagram.com')
      || host === 'fbcdn.net'
      || host.endsWith('.fbcdn.net')
      || host === 'instagram.com'
      || host.endsWith('.instagram.com');
  } catch {
    return false;
  }
};

const buildErrorMessage = async (response, fallbackMessage) => {
  if (!response) return fallbackMessage;
  try {
    const payload = await response.clone().json();
    if (payload?.message) return payload.message;
    if (payload?.error) return payload.error;
  } catch {
    // ignore parse errors and fallback to generic message
  }
  return fallbackMessage;
};

const normalizeAuthToken = () => {
  try {
    const token = authService?.getApiToken ? authService.getApiToken() : '';
    return (token || '').toString().trim();
  } catch {
    return '';
  }
};

const buildAuthRequiredError = (message) => {
  const error = new Error(
    (message || 'Sessão de administrador expirada. Faça login novamente para atualizar o feed do Instagram.')
      .toString()
  );
  error.code = 'AUTH_REQUIRED';
  return error;
};
const buildForbiddenError = (message) => {
  const error = new Error(
    (message || 'Somente administradores podem atualizar o feed do Instagram.')
      .toString()
  );
  error.code = 'FORBIDDEN';
  return error;
};
export const socialMediaService = {
  fetchInstagramFeed: async (limit = 10, options = {}) => {
    const query = buildInstagramQuery(limit, options);
    const response = await fetch(
      buildApiUrl(`/api/public/social/instagram?${query}`)
    );

    if (!response.ok) {
      throw new Error('Falha ao carregar posts do Instagram.');
    }

    const payload = await response.json();
    return {
      posts: Array.isArray(payload) ? payload : [],
      lastUpdatedAt: parseInstagramLastUpdatedHeader(response),
      status: parseInstagramStatusHeader(response)
    };
  },

  listInstagramPosts: async (limit = 10, options = {}) => {
    const result = await socialMediaService.fetchInstagramFeed(limit, options);
    return Array.isArray(result?.posts) ? result.posts : [];
  },

  resolveInstagramMediaUrl: (rawUrl) => {
    const value = (rawUrl || '').toString().trim();
    if (!value) return '';
    if (!canProxyInstagramMediaHost(value)) return value;
    return buildApiUrl(`/api/public/social/media?url=${encodeURIComponent(value)}`);
  },

  resolveInstagramMediaPublicProxyUrl: (rawUrl) => {
    const value = (rawUrl || '').toString().trim();
    if (!value) return '';
    if (!canProxyInstagramMediaHost(value)) return '';
    return `https://images.weserv.nl/?url=${encodeURIComponent(value)}&w=640&output=jpg`;
  },

  syncInstagramFeedAdmin: async (limit = 10) => {
    const normalizedLimit = clampLimit(limit);
    const token = normalizeAuthToken();
    if (!token) {
      throw buildAuthRequiredError();
    }

    const response = await fetch(
      buildApiUrl(`/api/admin/social/instagram/sync?limit=${encodeURIComponent(normalizedLimit)}`),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (response.status === 401) {
      if (authService?.clearApiToken) {
        authService.clearApiToken();
      }
      const message = await buildErrorMessage(
        response,
        'Sessão de administrador expirada. Faça login novamente para atualizar o feed do Instagram.'
      );
      throw buildAuthRequiredError(message);
    }

    if (response.status === 403) {
      const message = await buildErrorMessage(
        response,
        'Somente administradores podem atualizar o feed do Instagram.'
      );
      throw buildForbiddenError(message);
    }

    if (!response.ok) {
      const message = await buildErrorMessage(response, 'Falha ao sincronizar feed do Instagram.');
      throw new Error(message);
    }

    const payload = await response.json();
    return {
      posts: Array.isArray(payload) ? payload : [],
      lastUpdatedAt: parseInstagramLastUpdatedHeader(response),
      status: parseInstagramStatusHeader(response),
      usedFallback: false
    };
  }
};

