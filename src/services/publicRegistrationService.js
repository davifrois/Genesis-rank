import { REGISTRATION_STATUS, normalizeRegistrationStatus } from '../utils/registrationStatus';

const ENV_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE_URL = ENV_API_BASE_URL ? ENV_API_BASE_URL.replace(/\/$/, '') : '';
const LOCAL_PENDING_REGISTRATIONS_KEY = 'genesis_public_registration_pending_v1';
const MAX_PENDING_RECORDS = 20;
const MAX_PENDING_STORAGE_CHARS = 3_500_000;
const DEFAULT_NETWORK_ERROR_MESSAGE = (
  'Servidor de inscricao indisponivel no momento. '
  + 'Inicie o backend na porta 8080 ou configure VITE_API_BASE_URL.'
);
const UNAVAILABLE_HTTP_STATUSES = new Set([500, 502, 503, 504]);

const buildApiUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const isNetworkError = (error) => {
  const message = (error?.message || '').toString();
  return (
    error instanceof TypeError
    || /failed to fetch/i.test(message)
    || /networkerror/i.test(message)
    || /load failed/i.test(message)
    || /fetch failed/i.test(message)
  );
};

const isUnavailableProxyMessage = (message) => {
  const text = (message || '').toString();
  return (
    /internal server error/i.test(text)
    || /proxy/i.test(text)
    || /ecconnrefused/i.test(text)
    || /gateway/i.test(text)
    || /temporarily unavailable/i.test(text)
  );
};

const isUnavailableHttpError = (error) => (
  Boolean(error?.retryableUnavailable)
  || UNAVAILABLE_HTTP_STATUSES.has(Number(error?.status || 0))
  || isUnavailableProxyMessage(error?.message)
);

const parseJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const parseErrorMessage = async (response, fallback = 'Falha ao enviar inscricao.') => {
  const payload = await parseJsonSafe(response);
  if (payload?.message) return payload.message;
  if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error.trim();
  try {
    const text = await response.text();
    if (text?.trim()) return text.trim();
  } catch {
    // ignore parse errors
  }
  return fallback;
};

const buildHttpError = async (response, fallbackMessage) => {
  const message = await parseErrorMessage(response, fallbackMessage);
  const error = new Error(message);
  error.status = response?.status;
  const status = Number(response?.status || 0);
  error.retryableUnavailable = (
    UNAVAILABLE_HTTP_STATUSES.has(status)
    && (status !== 500 || isUnavailableProxyMessage(message))
  );
  return error;
};

const readPendingRegistrations = () => {
  try {
    const raw = localStorage.getItem(LOCAL_PENDING_REGISTRATIONS_KEY);
    if (!raw) return [];
    if (raw.length > MAX_PENDING_STORAGE_CHARS) {
      localStorage.removeItem(LOCAL_PENDING_REGISTRATIONS_KEY);
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === 'object');
  } catch {
    return [];
  }
};

const writePendingRegistrations = (items) => {
  try {
    const serialized = JSON.stringify(items);
    if (serialized.length > MAX_PENDING_STORAGE_CHARS) {
      return false;
    }
    localStorage.setItem(LOCAL_PENDING_REGISTRATIONS_KEY, serialized);
    return true;
  } catch {
    return false;
  }
};

const buildPendingRegistration = (payload, lastError = '') => ({
  id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  createdAt: new Date().toISOString(),
  payload,
  lastError
});

const sanitizePayloadForOfflineQueue = (payload) => {
  const safePayload = payload && typeof payload === 'object' ? { ...payload } : {};
  if (typeof safePayload.notes !== 'string' || !safePayload.notes.trim()) return safePayload;

  try {
    const parsedNotes = JSON.parse(safePayload.notes);
    if (!parsedNotes || typeof parsedNotes !== 'object') return safePayload;
    if (typeof parsedNotes.comprovanteArquivoDataUrl !== 'string' || !parsedNotes.comprovanteArquivoDataUrl) {
      return safePayload;
    }

    const cleanedNotes = {
      ...parsedNotes,
      comprovanteArquivoDataUrl: '',
      comprovanteOfflineRemovido: true
    };
    safePayload.notes = JSON.stringify(cleanedNotes);
    return safePayload;
  } catch {
    return safePayload;
  }
};

const appendPendingRegistration = (payload, lastError = '') => {
  const pending = readPendingRegistrations();
  const fullRecord = buildPendingRegistration(payload, lastError);
  const nextWithFullPayload = [fullRecord, ...pending].slice(0, MAX_PENDING_RECORDS);

  if (writePendingRegistrations(nextWithFullPayload)) {
    return fullRecord;
  }

  const sanitizedRecord = {
    ...fullRecord,
    payload: sanitizePayloadForOfflineQueue(payload)
  };
  const sanitizedPending = pending.map((item) => ({
    ...item,
    payload: sanitizePayloadForOfflineQueue(item?.payload)
  }));
  let fallback = [sanitizedRecord, ...sanitizedPending].slice(0, MAX_PENDING_RECORDS);

  while (fallback.length > 0) {
    if (writePendingRegistrations(fallback)) {
      return sanitizedRecord;
    }
    fallback = fallback.slice(0, -1);
  }

  return sanitizedRecord;
};

const toPendingRegistrationRow = (record) => {
  const safeRecord = (record && typeof record === 'object') ? record : {};
  const payload = safeRecord.payload || {};
  return {
    id: safeRecord.id || `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    eventId: payload.eventId || '',
    eventName: payload.eventName || '',
    eventDate: payload.eventDate || '',
    eventLocation: payload.eventLocation || '',
    nome: payload.nome || '',
    email: payload.email || '',
    phone: payload.phone || '',
    academia: payload.academia || '',
    faixa: payload.faixa || '',
    peso: payload.peso || '',
    categoria: payload.categoria || '',
    genero: payload.genero || '',
    modalidade: payload.modalidade || '',
    notes: payload.notes || '',
    status: REGISTRATION_STATUS.PENDING_SYNC,
    createdAt: safeRecord.createdAt || new Date().toISOString(),
    athleteId: '',
    lastError: safeRecord.lastError || ''
  };
};

const postRegistration = async (payload) => {
  const response = await fetch(buildApiUrl('/api/public/registrations'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw await buildHttpError(response, 'Falha ao enviar inscricao.');
  }

  return response.json();
};

const flushPendingRegistrations = async () => {
  const pending = readPendingRegistrations();
  if (!pending.length) return { synced: 0, pending: [] };

  const remaining = [];
  let synced = 0;

  for (const item of pending) {
    try {
      await postRegistration(item.payload);
      synced += 1;
    } catch (err) {
      if (isNetworkError(err) || isUnavailableHttpError(err)) {
        remaining.push({
          ...item,
          lastError: err?.message || DEFAULT_NETWORK_ERROR_MESSAGE
        });
        break;
      }
      // Keep invalid payload visible in admin panel until fixed manually.
      remaining.push({
        ...item,
        lastError: err?.message || 'Falha de validacao ao sincronizar.'
      });
    }
  }

  const remainingIds = new Set(remaining.map((item) => item.id));
  const pendingAfterLoop = pending.filter((item) => remainingIds.has(item.id));
  writePendingRegistrations(pendingAfterLoop);

  return { synced, pending: pendingAfterLoop };
};

const listPendingRows = (eventId = '') => {
  const pending = readPendingRegistrations();
  const rows = pending.map(toPendingRegistrationRow);
  if (!eventId) return rows;
  return rows.filter((item) => item.eventId === eventId);
};

export const publicRegistrationService = {
  register: async (payload) => {
    try {
      const response = await postRegistration(payload);
      await flushPendingRegistrations();
      return response;
    } catch (error) {
      if (!isNetworkError(error) && !isUnavailableHttpError(error)) {
        throw error;
      }

      const pendingRecord = appendPendingRegistration(payload, error?.message || DEFAULT_NETWORK_ERROR_MESSAGE);
      let offlineMessage = (
        'Backend indisponivel. Inscricao salva apenas neste navegador e ainda NAO '
        + 'enviada ao sistema/admin. Quando o backend voltar, reenvie para confirmar.'
      );
      try {
        const notes = JSON.parse(pendingRecord?.payload?.notes || '{}');
        if (notes?.comprovanteOfflineRemovido) {
          offlineMessage = (
            'Backend indisponivel. Inscricao salva apenas neste navegador e sem o comprovante '
            + '(limite de armazenamento). Ela NAO foi enviada ao sistema/admin.'
          );
        }
      } catch {
        // keep default offline message
      }
      return {
        ...toPendingRegistrationRow(pendingRecord),
        queued: true,
        queuedLocalOnly: true,
        message: offlineMessage
      };
    }
  },

  listPublicEvents: async () => {
    try {
      const response = await fetch(buildApiUrl('/api/public/events'));
      if (!response.ok) {
        throw await buildHttpError(response, DEFAULT_NETWORK_ERROR_MESSAGE);
      }
      return response.json();
    } catch (error) {
      if (isNetworkError(error) || isUnavailableHttpError(error)) {
        throw new Error(DEFAULT_NETWORK_ERROR_MESSAGE);
      }
      throw error;
    }
  },

  listRegistrations: async (eventId = '') => {
    await flushPendingRegistrations();
    const query = eventId ? `?eventId=${encodeURIComponent(eventId)}` : '';

    try {
      const response = await fetch(buildApiUrl(`/api/public/registrations${query}`));
      if (!response.ok) {
        throw await buildHttpError(response, DEFAULT_NETWORK_ERROR_MESSAGE);
      }
      const payload = await response.json();
      const remoteRows = Array.isArray(payload) ? payload : [];
      const pendingRows = listPendingRows(eventId);
      return [...pendingRows, ...remoteRows];
    } catch (error) {
      if (isNetworkError(error) || isUnavailableHttpError(error)) {
        const pendingRows = listPendingRows(eventId);
        if (pendingRows.length) return pendingRows;
        throw new Error(DEFAULT_NETWORK_ERROR_MESSAGE);
      }
      throw error;
    }
  },

  syncPendingRegistrations: async () => {
    const result = await flushPendingRegistrations();
    return {
      synced: result.synced || 0,
      pending: Array.isArray(result.pending) ? result.pending.length : 0
    };
  },

  updatePaymentStatus: async (registrationId, { status, reviewNotes = '', reviewedBy = '' }) => {
    const normalizedId = (registrationId || '').toString().trim();
    if (!normalizedId) {
      throw new Error('Inscricao invalida.');
    }

    const normalizedStatus = normalizeRegistrationStatus(status);
    if (normalizedStatus === REGISTRATION_STATUS.PENDING_SYNC) {
      throw new Error('Status de pagamento invalido.');
    }

    try {
      const response = await fetch(buildApiUrl(`/api/public/registrations/${encodeURIComponent(normalizedId)}/payment`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: normalizedStatus, reviewNotes, reviewedBy })
      });

      if (!response.ok) {
        throw await buildHttpError(response, 'Falha ao atualizar pagamento.');
      }

      return response.json();
    } catch (error) {
      if (isNetworkError(error) || isUnavailableHttpError(error)) {
        throw new Error(DEFAULT_NETWORK_ERROR_MESSAGE);
      }
      throw error;
    }
  }
};
