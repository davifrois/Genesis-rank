import { REGISTRATION_STATUS, normalizeRegistrationStatus } from '../utils/registrationStatus';
import { authService } from './authService';

const ENV_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE_URL = ENV_API_BASE_URL ? ENV_API_BASE_URL.replace(/\/$/, '') : '';
const LOCAL_PENDING_REGISTRATIONS_KEY = 'genesis_public_registration_pending_v1';
const LOCAL_SYNC_DIAGNOSTICS_KEY = 'genesis_public_registration_sync_diag_v1';
const MAX_PENDING_RECORDS = 20;
const MAX_PENDING_STORAGE_CHARS = 3_500_000;
const TRACE_ID_HEADER = 'X-Trace-Id';
const DEFAULT_NETWORK_ERROR_MESSAGE = (
  'Servidor de inscrição indisponível no momento. '
  + 'Inicie o backend na porta 8080 ou configure VITE_API_BASE_URL.'
);
const UNAVAILABLE_HTTP_STATUSES = new Set([500, 502, 503, 504]);

const generateClientRequestId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `reg-${crypto.randomUUID()}`;
    }
  } catch {
    // Ignore crypto errors and fallback to timestamp/random.
  }
  return `reg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const ensurePayloadWithClientRequestId = (payload) => {
  const base = payload && typeof payload === 'object' ? { ...payload } : {};
  const current = (base.clientRequestId || '').toString().trim();
  if (current) {
    base.clientRequestId = current;
    return base;
  }
  base.clientRequestId = generateClientRequestId();
  return base;
};

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

const safeReadSyncDiagnostics = () => {
  try {
    const raw = localStorage.getItem(LOCAL_SYNC_DIAGNOSTICS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeSyncDiagnostics = (diag) => {
  try {
    localStorage.setItem(LOCAL_SYNC_DIAGNOSTICS_KEY, JSON.stringify(diag));
  } catch {
    // Ignore diagnostics storage errors.
  }
};

const updateSyncDiagnostics = (type, details = {}) => {
  const nowIso = new Date().toISOString();
  const current = safeReadSyncDiagnostics() || {};
  const base = {
    successCount: Number(current.successCount || 0),
    failureCount: Number(current.failureCount || 0),
    lastSuccessAt: current.lastSuccessAt || '',
    lastFailureAt: current.lastFailureAt || '',
    lastFailureMessage: current.lastFailureMessage || '',
    lastTraceId: current.lastTraceId || '',
    updatedAt: nowIso
  };

  if (type === 'success') {
    base.successCount += 1;
    base.lastSuccessAt = nowIso;
  }
  if (type === 'failure') {
    base.failureCount += 1;
    base.lastFailureAt = nowIso;
    base.lastFailureMessage = (details.message || '').toString().trim();
    base.lastTraceId = (details.traceId || '').toString().trim();
  }

  base.updatedAt = nowIso;
  writeSyncDiagnostics(base);
  return base;
};

const parseJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const resolveErrorTraceId = (payload, response) => {
  const payloadTrace = (payload?.traceId || '').toString().trim();
  if (payloadTrace) return payloadTrace;
  try {
    const headerTrace = (response?.headers?.get(TRACE_ID_HEADER) || '').toString().trim();
    return headerTrace;
  } catch {
    return '';
  }
};

const appendTraceToMessage = (message, traceId) => {
  const base = (message || '').toString().trim();
  const trace = (traceId || '').toString().trim();
  if (!trace) return base;
  if (base.toLowerCase().includes('trace:')) return base;
  return `${base} (trace: ${trace})`;
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
    (message || 'Sessão de administrador expirada. Faça login novamente para confirmar o pagamento.')
      .toString()
  );
  error.code = 'AUTH_REQUIRED';
  return error;
};

const buildForbiddenError = (message) => {
  const error = new Error(
    (message || 'Apenas administradores podem confirmar ou reprovar pagamentos.')
      .toString()
  );
  error.code = 'FORBIDDEN';
  return error;
};

const parseErrorMessage = async (response, fallback = 'Falha ao enviar inscrição.') => {
  const payload = await parseJsonSafe(response);
  const traceId = resolveErrorTraceId(payload, response);
  if (payload?.message) return {
    message: appendTraceToMessage(payload.message, traceId),
    code: payload?.code || '',
    traceId
  };
  if (typeof payload?.error === 'string' && payload.error.trim()) {
    return {
      message: appendTraceToMessage(payload.error.trim(), traceId),
      code: payload?.code || '',
      traceId
    };
  }
  try {
    const text = await response.text();
    if (text?.trim()) {
      return {
        message: appendTraceToMessage(text.trim(), traceId),
        code: payload?.code || '',
        traceId
      };
    }
  } catch {
    // ignore parse errors
  }
  return {
    message: appendTraceToMessage(fallback, traceId),
    code: payload?.code || '',
    traceId
  };
};

const buildHttpError = async (response, fallbackMessage) => {
  const parsed = await parseErrorMessage(response, fallbackMessage);
  const message = parsed?.message || fallbackMessage;
  const error = new Error(message);
  error.code = parsed?.code || '';
  error.traceId = parsed?.traceId || '';
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

const buildPendingRegistration = (payload, lastError = '', lastTraceId = '') => ({
  id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  createdAt: new Date().toISOString(),
  payload,
  lastError,
  lastTraceId
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

const appendPendingRegistration = (payload, lastError = '', lastTraceId = '') => {
  const clientRequestId = (payload?.clientRequestId || '').toString().trim();
  const pending = readPendingRegistrations().filter((item) => {
    if (!clientRequestId) return true;
    const existingClientRequestId = (item?.payload?.clientRequestId || '').toString().trim();
    return existingClientRequestId !== clientRequestId;
  });
  const fullRecord = buildPendingRegistration(payload, lastError, lastTraceId);
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
    clientRequestId: payload.clientRequestId || '',
    notes: payload.notes || '',
    status: REGISTRATION_STATUS.PENDING_SYNC,
    createdAt: safeRecord.createdAt || new Date().toISOString(),
    athleteId: '',
    lastError: safeRecord.lastError || '',
    lastTraceId: safeRecord.lastTraceId || ''
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
    throw await buildHttpError(response, 'Falha ao enviar inscrição.');
  }

  return response.json();
};

const buildRegistrationIdentityKey = (row) => (
  (row?.clientRequestId || row?.id || '')
    .toString()
    .trim()
);

const mergeRowsWithoutDuplicates = (pendingRows, remoteRows) => {
  const remote = Array.isArray(remoteRows) ? remoteRows : [];
  const pending = Array.isArray(pendingRows) ? pendingRows : [];
  const remoteKeys = new Set(remote.map(buildRegistrationIdentityKey).filter(Boolean));
  const pendingOnly = pending.filter((row) => {
    const key = buildRegistrationIdentityKey(row);
    return !key || !remoteKeys.has(key);
  });
  return [...pendingOnly, ...remote];
};

const flushPendingRegistrations = async () => {
  const pending = readPendingRegistrations();
  if (!pending.length) return { synced: 0, pending: [] };

  const remaining = [];
  let synced = 0;
  let lastFailureMessage = '';
  let lastFailureTraceId = '';

  for (const item of pending) {
    try {
      await postRegistration(item.payload);
      synced += 1;
    } catch (err) {
      if (isNetworkError(err) || isUnavailableHttpError(err)) {
        const errorMessage = err?.message || DEFAULT_NETWORK_ERROR_MESSAGE;
        const traceId = err?.traceId || '';
        remaining.push({
          ...item,
          lastError: errorMessage,
          lastTraceId: traceId
        });
        lastFailureMessage = errorMessage;
        lastFailureTraceId = traceId;
        break;
      }
      // Keep invalid payload visible in admin panel until fixed manually.
      const errorMessage = err?.message || 'Falha de validação ao sincronizar.';
      const traceId = err?.traceId || '';
      remaining.push({
        ...item,
        lastError: errorMessage,
        lastTraceId: traceId
      });
      lastFailureMessage = errorMessage;
      lastFailureTraceId = traceId;
    }
  }

  const remainingIds = new Set(remaining.map((item) => item.id));
  const pendingAfterLoop = pending.filter((item) => remainingIds.has(item.id));
  writePendingRegistrations(pendingAfterLoop);

  if (synced > 0) {
    updateSyncDiagnostics('success');
  }
  if (lastFailureMessage) {
    updateSyncDiagnostics('failure', {
      message: lastFailureMessage,
      traceId: lastFailureTraceId
    });
  }

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
    const payloadWithClientRequestId = ensurePayloadWithClientRequestId(payload);
    try {
      const response = await postRegistration(payloadWithClientRequestId);
      await flushPendingRegistrations();
      updateSyncDiagnostics('success');
      return response;
    } catch (error) {
      if (!isNetworkError(error) && !isUnavailableHttpError(error)) {
        throw error;
      }
      updateSyncDiagnostics('failure', {
        message: error?.message || DEFAULT_NETWORK_ERROR_MESSAGE,
        traceId: error?.traceId || ''
      });

      const pendingRecord = appendPendingRegistration(
        payloadWithClientRequestId,
        error?.message || DEFAULT_NETWORK_ERROR_MESSAGE,
        error?.traceId || ''
      );
      let offlineMessage = (
        'Backend indisponível. Inscrição salva apenas neste navegador e ainda NÃO '
        + 'enviada ao sistema/admin. Quando o backend voltar, reenvie para confirmar.'
      );
      try {
        const notes = JSON.parse(pendingRecord?.payload?.notes || '{}');
        if (notes?.comprovanteOfflineRemovido) {
          offlineMessage = (
            'Backend indisponível. Inscrição salva apenas neste navegador e sem o comprovante '
            + '(limite de armazenamento). Ela NÃO foi enviada ao sistema/admin.'
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
        updateSyncDiagnostics('failure', {
          message: error?.message || DEFAULT_NETWORK_ERROR_MESSAGE,
          traceId: error?.traceId || ''
        });
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
      return mergeRowsWithoutDuplicates(pendingRows, remoteRows);
    } catch (error) {
      if (isNetworkError(error) || isUnavailableHttpError(error)) {
        updateSyncDiagnostics('failure', {
          message: error?.message || DEFAULT_NETWORK_ERROR_MESSAGE,
          traceId: error?.traceId || ''
        });
        const pendingRows = listPendingRows(eventId);
        if (pendingRows.length) return pendingRows;
        throw new Error(DEFAULT_NETWORK_ERROR_MESSAGE);
      }
      throw error;
    }
  },

  syncPendingRegistrations: async () => {
    const result = await flushPendingRegistrations();
    const diagnostics = safeReadSyncDiagnostics() || {};
    return {
      synced: result.synced || 0,
      pending: Array.isArray(result.pending) ? result.pending.length : 0,
      diagnostics
    };
  },

  updatePaymentStatus: async (registrationId, { status, reviewNotes = '', reviewedBy = '' }) => {
    const normalizedId = (registrationId || '').toString().trim();
    if (!normalizedId) {
      throw new Error('Inscrição inválida.');
    }

    const normalizedStatus = normalizeRegistrationStatus(status);
    if (normalizedStatus === REGISTRATION_STATUS.PENDING_SYNC) {
      throw new Error('Status de pagamento inválido.');
    }

    let token = normalizeAuthToken();
    if (!token && authService?.ensureApiAdminToken) {
      try {
        token = await authService.ensureApiAdminToken();
      } catch {
        token = '';
      }
    }
    if (!token) {
      throw buildAuthRequiredError(
        'Faça login como administrador para confirmar o pagamento da inscrição.'
      );
    }

    try {
      const response = await fetch(buildApiUrl(`/api/admin/registrations/${encodeURIComponent(normalizedId)}/payment`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: normalizedStatus, reviewNotes, reviewedBy })
      });

      if (response.status === 401) {
        if (authService?.clearApiToken) {
          authService.clearApiToken();
        }
        const parsed = await parseErrorMessage(
          response,
          'Sessão de administrador expirada. Faça login novamente para confirmar o pagamento.'
        );
        throw buildAuthRequiredError(parsed?.message);
      }

      if (response.status === 403) {
        const parsed = await parseErrorMessage(
          response,
          'Apenas administradores podem confirmar ou reprovar pagamentos.'
        );
        throw buildForbiddenError(parsed?.message);
      }

      if (!response.ok) {
        throw await buildHttpError(response, 'Falha ao atualizar pagamento.');
      }

      return response.json();
    } catch (error) {
      if (error?.code === 'AUTH_REQUIRED' || error?.code === 'FORBIDDEN') {
        throw error;
      }
      if (isNetworkError(error) || isUnavailableHttpError(error)) {
        updateSyncDiagnostics('failure', {
          message: error?.message || DEFAULT_NETWORK_ERROR_MESSAGE,
          traceId: error?.traceId || ''
        });
        throw new Error(DEFAULT_NETWORK_ERROR_MESSAGE);
      }
      throw error;
    }
  },
  getSyncDiagnostics: () => (safeReadSyncDiagnostics() || {
    successCount: 0,
    failureCount: 0,
    lastSuccessAt: '',
    lastFailureAt: '',
    lastFailureMessage: '',
    lastTraceId: '',
    updatedAt: ''
  })
};

