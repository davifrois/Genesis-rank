import { REGISTRATION_STATUS, normalizeRegistrationStatus } from '../utils/registrationStatus';
import { authService } from './authService';
import localforage from 'localforage';

const ENV_API_BASE_URL = ("" || '').trim();
const API_BASE_URL = ENV_API_BASE_URL.includes('sua-url-do-ngrok') ? '' : ENV_API_BASE_URL.replace(/\/$/, '');
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
  let text = '';
  try {
    text = await response.text();
  } catch {
    // ignore
  }

  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      // ignore
    }
  }

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
  
  if (text?.trim() && !text.trim().startsWith('<')) {
    return {
      message: appendTraceToMessage(text.trim(), traceId),
      code: payload?.code || '',
      traceId
    };
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

const readPendingRegistrations = async () => {
  try {
    const parsed = await localforage.getItem(LOCAL_PENDING_REGISTRATIONS_KEY);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === 'object');
  } catch {
    return [];
  }
};

const writePendingRegistrations = async (items) => {
  try {
    await localforage.setItem(LOCAL_PENDING_REGISTRATIONS_KEY, items);
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

const appendPendingRegistration = async (payload, lastError = '', lastTraceId = '') => {
  const clientRequestId = (payload?.clientRequestId || '').toString().trim();
  const existing = await readPendingRegistrations();
  const pending = existing.filter((item) => {
    if (!clientRequestId) return true;
    const existingClientRequestId = (item?.payload?.clientRequestId || '').toString().trim();
    return existingClientRequestId !== clientRequestId;
  });
  const fullRecord = buildPendingRegistration(payload, lastError, lastTraceId);
  const nextWithFullPayload = [fullRecord, ...pending].slice(0, 100);

  await writePendingRegistrations(nextWithFullPayload);
  return fullRecord;
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
    profileId: payload.profileId || '',
    sourceAthleteId: payload.athleteId || '',
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
    price: payload.price || 0,
    price: payload.price || 0,
    status: payload.status || REGISTRATION_STATUS.PENDING_SYNC,
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
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
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
  const pending = await readPendingRegistrations();
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
  await await writePendingRegistrations(pendingAfterLoop);

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

const listPendingRows = async (eventId = '') => {
  const pending = await readPendingRegistrations();
  const rows = pending.map(toPendingRegistrationRow);
  if (!eventId) return rows;
  return rows.filter((item) => item.eventId === eventId);
};

export const publicRegistrationService = {
  // ========================================== //
  //  SERVIÇO DE REGISTRO DA INSCRIÇÃO NA API   //
  // ========================================== //
  // Este método faz o envio (POST) oficial da inscrição para o backend.
  // Caso a API falhe, ele entra em modo "Offline/Pending Sync" no Cache.
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

      const pendingRecord = await appendPendingRegistration(
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
      const response = await fetch(buildApiUrl('/api/public/events'), {
        headers: { 'ngrok-skip-browser-warning': 'true', 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' },
        cache: 'no-store'
      });
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

  createCheckoutSession: async ({ registrationIds, athleteName, amount }) => {
    try {
      const response = await fetch(buildApiUrl('/api/public/checkout'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ registrationIds, athleteName, amount })
      });
      
      if (!response.ok) {
        throw await buildHttpError(response, 'Falha ao criar sessão de pagamento.');
      }
      
      return response.json();
    } catch (error) {
      throw error;
    }
  },

  listRegistrations: async (eventId = '') => {
    await flushPendingRegistrations();
    const query = eventId ? `?eventId=${encodeURIComponent(eventId)}` : '';

    try {
      const response = await fetch(buildApiUrl(`/api/public/registrations${query}`), {
        headers: { 'ngrok-skip-browser-warning': 'true', 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' },
        cache: 'no-store'
      });
      if (!response.ok) {
        throw await buildHttpError(response, DEFAULT_NETWORK_ERROR_MESSAGE);
      }
      const payload = await response.json();
      const remoteRows = Array.isArray(payload) ? payload : [];
      const pendingRows = await listPendingRows(eventId);
      return mergeRowsWithoutDuplicates(pendingRows, remoteRows);
    } catch (error) {
      if (isNetworkError(error) || isUnavailableHttpError(error)) {
        updateSyncDiagnostics('failure', {
          message: error?.message || DEFAULT_NETWORK_ERROR_MESSAGE,
          traceId: error?.traceId || ''
        });
        const pendingRows = await listPendingRows(eventId);
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

  // ========================================== //
  //  ATUALIZAÇÃO DE STATUS DO PAGAMENTO        //
  // ========================================== //
  // Rota administrativa que avisa o banco de dados que 
  // o atleta pagou ou teve erro no pagamento.
  updatePaymentStatus: async (registrationId, { status, reviewNotes = '', reviewedBy = '' }) => {
    const normalizedId = (registrationId || '').toString().trim();
    if (!normalizedId) {
      throw new Error('Inscrição inválida.');
    }

    const normalizedStatus = normalizeRegistrationStatus(status);
    if (normalizedStatus === REGISTRATION_STATUS.PENDING_SYNC) {
      throw new Error('Status de pagamento inválido.');
    }

    if (normalizedId.startsWith('pending-')) {
      const pending = await readPendingRegistrations();
      const targetIndex = pending.findIndex(r => r.id === normalizedId);
      if (targetIndex >= 0) {
        const target = pending[targetIndex];
        const updatedPayload = {
          ...target.payload,
          status: normalizedStatus,
          paymentReviewNotes: reviewNotes,
          paymentReviewedBy: reviewedBy,
          paymentReviewedAt: new Date().toISOString()
        };
        const updatedRecord = {
          ...target,
          payload: updatedPayload
        };
        const newPending = [...pending];
        newPending[targetIndex] = updatedRecord;
        if (await writePendingRegistrations(newPending)) {
          return {
            id: updatedRecord.id,
            ...updatedPayload
          };
        }
      }
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
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
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

  updateRegistrationDetails: async (registrationId, details) => {
    const normalizedId = (registrationId || '').toString().trim();
    if (!normalizedId) {
      throw new Error('Inscrição inválida.');
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
        'Faça login como administrador para atualizar a inscrição.'
      );
    }

    try {
      const response = await fetch(buildApiUrl(`/api/admin/registrations/${encodeURIComponent(normalizedId)}/details`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(details)
      });

      if (response.status === 401) {
        if (authService?.clearApiToken) {
          authService.clearApiToken();
        }
        const parsed = await parseErrorMessage(
          response,
          'Sessão de administrador expirada. Faça login novamente para atualizar a inscrição.'
        );
        throw buildAuthRequiredError(parsed?.message);
      }

      if (response.status === 403) {
        const parsed = await parseErrorMessage(
          response,
          'Apenas administradores podem atualizar inscrições.'
        );
        throw buildForbiddenError(parsed?.message);
      }

      if (!response.ok) {
        throw await buildHttpError(response, 'Falha ao atualizar inscrição.');
      }

      return response.json();
    } catch (error) {
      if (error?.code === 'AUTH_REQUIRED' || error?.code === 'FORBIDDEN') {
        throw error;
      }
      if (isNetworkError(error) || isUnavailableHttpError(error)) {
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

// Iniciamos o background sync automaticamente com Exponential Backoff
let syncTimer = null;
let currentDelay = 15000;
const MAX_DELAY = 120000; // Máximo de 2 minutos
const INITIAL_DELAY = 15000;

const scheduleNextSync = (success) => {
  if (typeof window === 'undefined') return;
  if (syncTimer) clearTimeout(syncTimer);

  if (success) {
    currentDelay = INITIAL_DELAY;
  } else {
    currentDelay = Math.min(currentDelay * 2, MAX_DELAY);
  }

  syncTimer = setTimeout(async () => {
    if (navigator.onLine) {
      const pending = await readPendingRegistrations();
      if (pending.length > 0) {
        try {
          const result = await flushPendingRegistrations();
          scheduleNextSync(result.synced > 0 && result.pending.length === 0);
        } catch {
          scheduleNextSync(false);
        }
      } else {
        // Nada pendente, reseta o delay e tenta depois do delay inicial
        scheduleNextSync(true);
      }
    } else {
      scheduleNextSync(false);
    }
  }, currentDelay);
};

const startBackgroundSync = () => {
  if (typeof window === 'undefined') return;
  
  scheduleNextSync(true);

  // Forçar uma tentativa imediata ao voltar a ficar online
  window.addEventListener('online', async () => {
    if (syncTimer) clearTimeout(syncTimer);
    currentDelay = INITIAL_DELAY; // Reseta delay ao voltar online
    const pending = await readPendingRegistrations();
    if (pending.length > 0) {
      try {
        const result = await flushPendingRegistrations();
        scheduleNextSync(result.synced > 0 && result.pending.length === 0);
      } catch {
        scheduleNextSync(false);
      }
    } else {
      scheduleNextSync(true);
    }
  });
};

startBackgroundSync();
