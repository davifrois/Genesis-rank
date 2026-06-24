import { authService } from './authService';

const env = import.meta.env || {};
const ENV_API_BASE_URL = (env.VITE_API_BASE_URL || '').trim();
const API_BASE_URL = ENV_API_BASE_URL ? ENV_API_BASE_URL.replace(/\/$/, '') : '';
const ENV_WS_BASE_URL = (env.VITE_WS_BASE_URL || '').trim();

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
    // Ignore parse errors and fallback to text.
  }
  try {
    const text = await response.text();
    if (text?.trim()) return text.trim();
  } catch {
    // Ignore text parsing errors.
  }
  return fallbackMessage;
};

const parseJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const buildAuthHeaders = () => {
  const token = (authService?.getApiToken ? authService.getApiToken() : '').toString().trim();
  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return { headers, token };
};

const normalizeIdList = (value) => (
  Array.isArray(value)
    ? value.map((item) => (item || '').toString().trim()).filter(Boolean)
    : []
);

const normalizeLiveMatches = (value) => (
  Array.isArray(value)
    ? value
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        id: (item.id || '').toString().trim(),
        slotAId: (item.slotAId || item.slotA || '').toString().trim() || null,
        slotBId: (item.slotBId || item.slotB || '').toString().trim() || null,
        winnerId: (item.winnerId || '').toString().trim() || null,
        status: (item.status || '').toString().trim() || null,
        area: (item.area || '').toString().trim() || null,
        fightNumber: Number.isFinite(Number(item.fightNumber)) ? Number(item.fightNumber) : null,
        scheduledAt: (item.scheduledAt || '').toString().trim() || null,
        scoreA: Number.isFinite(Number(item.scoreA)) ? Number(item.scoreA) : null,
        scoreB: Number.isFinite(Number(item.scoreB)) ? Number(item.scoreB) : null
      }))
      .filter((item) => item.id)
    : []
);

export const toBracketRequestPayload = (bracket = {}) => ({
  id: (bracket.id || '').toString().trim() || undefined,
  number: Number.isFinite(Number(bracket.number)) ? Number(bracket.number) : null,
  eventId: (bracket.eventId || '').toString().trim() || null,
  categoryKey: (bracket.categoryKey || '').toString().trim() || null,
  label: (bracket.label || '').toString().trim() || null,
  mode: (bracket.mode || '').toString().trim() || null,
  format: (bracket.format || '').toString().trim() || null,
  size: Number.isFinite(Number(bracket.size)) ? Number(bracket.size) : null,
  isPublished: bracket.isPublished === true,
  seedIds: normalizeIdList(bracket.seedIds),
  walkovers: normalizeIdList(bracket.walkovers),
  liveMatches: normalizeLiveMatches(bracket.liveMatches),
  podium: bracket.podium || { goldId: null, silverId: null, bronzeId: null },
  appliedAt: (bracket.appliedAt || '').toString().trim() || null
});

const resolveWebSocketBase = () => {
  if (ENV_WS_BASE_URL) {
    return ENV_WS_BASE_URL.replace(/\/$/, '');
  }
  if (API_BASE_URL) {
    if (/^https:\/\//i.test(API_BASE_URL)) {
      return API_BASE_URL.replace(/^https/i, 'wss');
    }
    if (/^http:\/\//i.test(API_BASE_URL)) {
      return API_BASE_URL.replace(/^http/i, 'ws');
    }
  }
  if (typeof window !== 'undefined') {
    const { protocol, host } = window.location;
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${host}`;
  }
  return '';
};

const parseBracketLiveMessage = (message) => {
  try {
    const payload = JSON.parse(message?.data || '{}');
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
};

export const bracketRealtimeService = {
  listPublicLiveBrackets: async (eventId = '') => {
    const query = new URLSearchParams();
    const normalizedEventId = (eventId || '').toString().trim();
    if (normalizedEventId) query.set('eventId', normalizedEventId);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    const response = await fetch(buildApiUrl(`/api/public/brackets/live${suffix}`), {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    });
    if (!response.ok) {
      throw new Error(await parseErrorMessage(response, 'Falha ao listar chaves ao vivo.'));
    }
    const payload = await parseJsonSafe(response);
    return Array.isArray(payload) ? payload : [];
  },

  getPublicLiveBracket: async (bracketId) => {
    const normalizedId = (bracketId || '').toString().trim();
    if (!normalizedId) {
      throw new Error('Chave inválida.');
    }
    const response = await fetch(buildApiUrl(`/api/public/brackets/${encodeURIComponent(normalizedId)}/live`), {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    });
    if (!response.ok) {
      throw new Error(await parseErrorMessage(response, 'Falha ao carregar chave ao vivo.'));
    }
    const payload = await parseJsonSafe(response);
    if (!payload || typeof payload !== 'object') {
      throw new Error('Resposta invalida do servidor ao carregar chave.');
    }
    return payload;
  },

  getPublicMatchDetails: async (bracketId = '', matchId = '') => {
    const normalizedBracketId = (bracketId || '').toString().trim();
    const normalizedMatchId = (matchId || '').toString().trim();
    if (!normalizedMatchId) {
      throw new Error('Luta invalida.');
    }

    const headers = { 'ngrok-skip-browser-warning': 'true' };
    const urls = normalizedBracketId
      ? [
          buildApiUrl(`/api/public/brackets/${encodeURIComponent(normalizedBracketId)}/matches/${encodeURIComponent(normalizedMatchId)}`),
          buildApiUrl(`/api/public/matches/${encodeURIComponent(normalizedMatchId)}`)
        ]
      : [buildApiUrl(`/api/public/matches/${encodeURIComponent(normalizedMatchId)}`)];

    let lastError = null;
    for (const url of urls) {
      try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
          lastError = new Error(await parseErrorMessage(response, 'Falha ao carregar detalhes da luta.'));
          continue;
        }
        const payload = await parseJsonSafe(response);
        if (!payload || typeof payload !== 'object') {
          throw new Error('Resposta invalida do servidor ao carregar luta.');
        }
        return payload;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Falha ao carregar detalhes da luta.');
  },

  getPublicEventBrackets: async (eventId = '', athlete = '') => {
    const normalizedEventId = (eventId || '').toString().trim();
    if (!normalizedEventId) {
      throw new Error('Evento invalido.');
    }
    const query = new URLSearchParams();
    const normalizedAthlete = (athlete || '').toString().trim();
    if (normalizedAthlete) query.set('athlete', normalizedAthlete);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    const response = await fetch(
      buildApiUrl(`/api/public/events/${encodeURIComponent(normalizedEventId)}/brackets${suffix}`),
      { headers: { 'ngrok-skip-browser-warning': 'true' } }
    );
    if (!response.ok) {
      throw new Error(await parseErrorMessage(response, 'Falha ao carregar chaves publicas do evento.'));
    }
    const payload = await parseJsonSafe(response);
    if (!payload || typeof payload !== 'object') {
      throw new Error('Resposta invalida do servidor ao carregar chaves do evento.');
    }
    return payload;
  },

  getPublicChampionshipBrackets: async (championshipName = '', athlete = '') => {
    const normalizedName = (championshipName || '').toString().trim();
    if (!normalizedName) {
      throw new Error('Campeonato invalido.');
    }
    const query = new URLSearchParams();
    const normalizedAthlete = (athlete || '').toString().trim();
    if (normalizedAthlete) query.set('athlete', normalizedAthlete);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    const response = await fetch(
      buildApiUrl(`/api/public/campeonato/${encodeURIComponent(normalizedName)}/brackets${suffix}`),
      { headers: { 'ngrok-skip-browser-warning': 'true' } }
    );
    if (!response.ok) {
      throw new Error(await parseErrorMessage(response, 'Falha ao carregar chaves do campeonato.'));
    }
    const payload = await parseJsonSafe(response);
    if (!payload || typeof payload !== 'object') {
      throw new Error('Resposta invalida do servidor ao carregar chaves do campeonato.');
    }
    return payload;
  },

  saveBracket: async (bracket) => {
    const payload = toBracketRequestPayload(bracket);
    const { headers, token } = buildAuthHeaders();
    if (!token) {
      return { skipped: true, reason: 'NO_TOKEN' };
    }
    const normalizedId = (payload.id || '').toString().trim();
    if (!normalizedId) {
      const createResponse = await fetch(buildApiUrl('/api/brackets'), {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!createResponse.ok) {
        throw new Error(await parseErrorMessage(createResponse, 'Falha ao salvar chave no backend.'));
      }
      return { skipped: false, data: await createResponse.json() };
    }

    const updateResponse = await fetch(buildApiUrl(`/api/brackets/${encodeURIComponent(normalizedId)}`), {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload)
    });

    if (updateResponse.ok) {
      return { skipped: false, data: await updateResponse.json() };
    }

    if (updateResponse.status === 404) {
      const createResponse = await fetch(buildApiUrl('/api/brackets'), {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!createResponse.ok) {
        throw new Error(await parseErrorMessage(createResponse, 'Falha ao criar chave no backend.'));
      }
      return { skipped: false, data: await createResponse.json() };
    }

    throw new Error(await parseErrorMessage(updateResponse, 'Falha ao atualizar chave no backend.'));
  },

  updateBracketLiveState: async (bracketId, payload = {}) => {
    const normalizedId = (bracketId || '').toString().trim();
    if (!normalizedId) {
      throw new Error('Chave inválida.');
    }
    const { headers, token } = buildAuthHeaders();
    if (!token) {
      return { skipped: true, reason: 'NO_TOKEN' };
    }
    const response = await fetch(buildApiUrl(`/api/brackets/${encodeURIComponent(normalizedId)}/live`), {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        liveMatches: normalizeLiveMatches(payload.liveMatches),
        walkovers: normalizeIdList(payload.walkovers)
      })
    });
    if (!response.ok) {
      throw new Error(await parseErrorMessage(response, 'Falha ao atualizar estado ao vivo da chave.'));
    }
    return { skipped: false, data: await response.json() };
  },

  publishEventBrackets: async (eventId, isPublished = true) => {
    const normalizedId = (eventId || '').toString().trim();
    if (!normalizedId) {
      throw new Error('Evento invalido.');
    }
    const { headers, token } = buildAuthHeaders();
    if (!token) {
      return { skipped: true, reason: 'NO_TOKEN' };
    }
    const query = new URLSearchParams();
    query.set('published', isPublished ? 'true' : 'false');
    const response = await fetch(
      buildApiUrl(`/api/events/${encodeURIComponent(normalizedId)}/publish-brackets?${query.toString()}`),
      {
        method: 'POST',
        headers
      }
    );
    if (!response.ok) {
      throw new Error(await parseErrorMessage(response, 'Falha ao publicar chaves do evento.'));
    }
    const payload = await parseJsonSafe(response);
    return { skipped: false, data: payload || {} };
  },

  connectBracketLiveSocket: ({ bracketId, onMessage, onOpen, onClose, onError } = {}) => {
    const normalizedId = (bracketId || '').toString().trim();
    const wsBase = resolveWebSocketBase();
    if (!normalizedId || !wsBase || typeof WebSocket === 'undefined') {
      return () => {};
    }

    const url = `${wsBase}/ws/brackets/${encodeURIComponent(normalizedId)}`;
    let socket;
    try {
      socket = new WebSocket(url);
    } catch (error) {
      if (typeof onError === 'function') onError(error);
      return () => {};
    }

    socket.onopen = () => {
      if (typeof onOpen === 'function') onOpen();
    };
    socket.onclose = (event) => {
      if (typeof onClose === 'function') onClose(event);
    };
    socket.onerror = (event) => {
      if (typeof onError === 'function') onError(event);
    };
    socket.onmessage = (event) => {
      const payload = parseBracketLiveMessage(event);
      if (payload && typeof onMessage === 'function') {
        onMessage(payload);
      }
    };

    return () => {
      try {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      } catch {
        // Ignore close errors.
      }
    };
  },

  connectEventLiveSocket: ({ eventId, onMessage, onOpen, onClose, onError } = {}) => {
    const normalizedId = (eventId || '').toString().trim();
    const wsBase = resolveWebSocketBase();
    if (!normalizedId || !wsBase || typeof WebSocket === 'undefined') {
      return () => {};
    }

    const url = `${wsBase}/ws/brackets/event/${encodeURIComponent(normalizedId)}`;
    let socket;
    try {
      socket = new WebSocket(url);
    } catch (error) {
      if (typeof onError === 'function') onError(error);
      return () => {};
    }

    socket.onopen = () => {
      if (typeof onOpen === 'function') onOpen();
    };
    socket.onclose = (event) => {
      if (typeof onClose === 'function') onClose(event);
    };
    socket.onerror = (event) => {
      if (typeof onError === 'function') onError(event);
    };
    socket.onmessage = (event) => {
      const payload = parseBracketLiveMessage(event);
      if (payload && typeof onMessage === 'function') {
        onMessage(payload);
      }
    };

    return () => {
      try {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      } catch {
        // Ignore close errors.
      }
    };
  }
};
