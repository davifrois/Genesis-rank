import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useStore } from '../hooks/useStore';
import {
    Activity,
    AlertCircle,
    BarChart3,
    CheckCircle2,
    ClipboardList,
    Clock,
    Calendar,
    Download,
    GripVertical,
    LayoutDashboard,
    LayoutGrid,
    List,
    LogOut,
    Menu,
    Monitor,
    Newspaper,
    Pencil,
    RotateCcw,
    Search,
    ShieldCheck,
    Sparkles,
    Trophy,
    Trash2,
    Upload,
    UserPlus,
    Users,
    DollarSign,
    TrendingUp,
    Zap,
    Send,
    Swords,
    Plus,
    X,
    Eye,
    EyeOff
} from 'lucide-react';
import { generateBracketsPDF, generateRankingPDF, generateSchedulePDF } from '../services/pdfService';
import { extractTextFromPdfFile, parseAthletesFromText } from '../services/pdfImportService';
import { buildBracketMatches } from '../services/bracketService';
import { authService } from '../services/authService';
import { publicRegistrationService } from '../services/publicRegistrationService';
import { socialMediaService } from '../services/socialMediaService';
import { motion, AnimatePresence } from 'framer-motion';
import LoginOverlay from '../components/LoginOverlay';
import { useI18n } from '../hooks/useI18n';
import { DEFAULT_EVENT_FEES, DEFAULT_EVENT_PIX_KEY } from '../utils/eventPricing';
import { buildFileSafeName, downloadCsv } from '../services/exportService';
import { translateBelt, translateCategory, translateCompositeLabel, translateWeight } from '../utils/localeLabels';
import { REGISTRATION_STATUS, normalizeRegistrationStatus } from '../utils/registrationStatus';
import { extractWeightOptionsFromFile, extractWeightOptionsFromUrl } from '../services/weightTableOcrService';
import { evaluatePasswordStrength } from '../utils/passwordStrength';
import { savePublishedEventSchedule } from '../utils/eventSchedule';

const ATHLETE_PAGE_SIZE_OPTIONS = [20, 40, 80];
const MAX_NEWS_IMAGE_UPLOAD_BYTES = 8_000_000;
const TARGET_NEWS_IMAGE_STORED_BYTES = 320_000;
const MAX_NEWS_IMAGE_STORED_BYTES = 850_000;
const NEWS_IMAGE_MAX_WIDTH = 1600;
const NEWS_IMAGE_MAX_HEIGHT = 900;
const NEWS_IMAGE_MIN_DIMENSION = 420;
const MAX_EVENT_POSTER_UPLOAD_BYTES = 8_000_000;
const TARGET_EVENT_POSTER_STORED_BYTES = 420_000;
const MAX_EVENT_POSTER_STORED_BYTES = 1_000_000;
const EVENT_POSTER_MAX_WIDTH = 1400;
const EVENT_POSTER_MAX_HEIGHT = 1800;
const EVENT_POSTER_MIN_DIMENSION = 360;
const NEWS_IMAGE_INITIAL_QUALITY = 0.86;
const NEWS_IMAGE_MIN_QUALITY = 0.5;
const NEWS_IMAGE_MAX_ATTEMPTS = 8;

const createEventEditFormState = () => ({
    // ========================================== //
    //  GESTÃO DE CAMPEONATOS E EVENTOS (ADMIN)   //
    // ========================================== //
    // Estado inicial para o formulário de criação/edição de eventos pelo Organizador.
    id: '',
    name: '',
    date: '',
    endDate: '',
    location: '',
    eventDescription: '',
    posterUrl: '',
    registrationUrl: '',
    weightTableGiUrl: '',
    weightTableNoGiUrl: '',
    circularUrl: '',
    weightTableGiOptions: '',
    weightTableNoGiOptions: '',
    pixKey: DEFAULT_EVENT_PIX_KEY,
    feeUnder15: DEFAULT_EVENT_FEES.under15,
    feeOver15: DEFAULT_EVENT_FEES.over15,
    feeCombo: DEFAULT_EVENT_FEES.combo,
    feeAbsolute: DEFAULT_EVENT_FEES.absolute,
    beltRegistrationEnabled: false,
    beltRegistrationTitle: '',
    beltRegistrationPrice: 0,
    beltRegistrationDescription: '',
    beltRegistrationPhone: '',
    maxAthletes: '',
    prizesDescription: '',
    liabilityWaiver: '',
    mapIframeUrl: '',
    closeOnCapacity: false,
    accommodationEnabled: false,
    accommodationTitle: '',
    accommodationDescription: '',
    accommodationSearchLocation: '',
    batches: [],
    superFights: [],
    superFightsPublished: false,
    registrationOpen: true,
    internalRegistration: true
});

const createNewsFormState = () => ({
    title: '',
    summary: '',
    imageUrl: '',
    publishedAt: ''
});

const normalizeAdminPath = (pathname) => {
    const rawPath = (pathname || '').toString().trim();
    if (!rawPath) return '/admin';
    const normalized = rawPath.replace(/\/+$/, '');
    return normalized || '/admin';
};

// ========================================== //
//  SISTEMA DE NAVEGAÇÃO DO PAINEL ADMIN      //
// ========================================== //
// Define as rotas internas para Gestão de Inscrições, Financeiro, Chaveamento, etc.
const ADMIN_SECTION_ROUTES = {
    overview: '/admin/visao-geral',
    events: '/admin/eventos',
    news: '/admin/noticias',
    registrations: '/admin/inscricoes',
    brackets: '/admin/chaveamento',
    schedule: '/admin/cronograma',
    athletes: '/admin/atletas',
    automation: '/admin/automacoes',
    activity: '/admin/atividade',
    superfights: '/admin/lutas-casadas'
};

const ADMIN_ROUTE_TO_SECTION = {
    '/admin': 'overview',
    ...Object.entries(ADMIN_SECTION_ROUTES).reduce((acc, [section, path]) => {
        acc[normalizeAdminPath(path)] = section;
        return acc;
    }, {})
};

const resolveAdminSectionFromPath = (pathname, canManagePanel) => {
    const normalizedPath = normalizeAdminPath(pathname);
    const section = ADMIN_ROUTE_TO_SECTION[normalizedPath];
    if (!section) {
        return canManagePanel ? 'overview' : 'brackets';
    }
    if (!canManagePanel && section !== 'brackets' && section !== 'schedule' && section !== 'activity') {
        return 'brackets';
    }
    return section;
};

const resolveAdminRouteFromSection = (section, canManagePanel) => {
    const normalizedSection = !canManagePanel && section !== 'brackets' && section !== 'schedule' && section !== 'activity'
        ? 'brackets'
        : section;
    return ADMIN_SECTION_ROUTES[normalizedSection] || (canManagePanel ? ADMIN_SECTION_ROUTES.overview : ADMIN_SECTION_ROUTES.brackets);
};

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Falha ao ler arquivo.'));
    reader.readAsDataURL(file);
});

const isDataImageUrl = (value) => /^data:image\//i.test((value || '').toString().trim());

const estimateDataUrlBytes = (dataUrl) => {
    const value = (dataUrl || '').toString();
    const separatorIndex = value.indexOf(',');
    if (separatorIndex < 0) return value.length;
    const base64 = value.slice(separatorIndex + 1);
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
};

const formatBytes = (bytes) => {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) return '0 KB';
    if (value < 1024) return `${value} B`;
    const kb = value / 1024;
    if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
};

const loadImageFromDataUrl = (dataUrl) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Falha ao processar imagem.'));
    image.src = dataUrl;
});

const compressImageFileWithConstraints = async (file, options = {}) => {
    const {
        maxWidth = NEWS_IMAGE_MAX_WIDTH,
        maxHeight = NEWS_IMAGE_MAX_HEIGHT,
        minDimension = NEWS_IMAGE_MIN_DIMENSION,
        targetBytes = TARGET_NEWS_IMAGE_STORED_BYTES
    } = options;
    const originalDataUrl = await readFileAsDataUrl(file);
    const image = await loadImageFromDataUrl(originalDataUrl);
    const naturalWidth = Math.max(1, image.naturalWidth || image.width || minDimension);
    const naturalHeight = Math.max(1, image.naturalHeight || image.height || minDimension);
    const fitRatio = Math.min(
        1,
        maxWidth / naturalWidth,
        maxHeight / naturalHeight
    );

    let width = Math.max(1, Math.floor(naturalWidth * fitRatio));
    let height = Math.max(1, Math.floor(naturalHeight * fitRatio));
    let quality = NEWS_IMAGE_INITIAL_QUALITY;
    let bestDataUrl = '';
    let bestBytes = Number.POSITIVE_INFINITY;

    for (let attempt = 0; attempt < NEWS_IMAGE_MAX_ATTEMPTS; attempt += 1) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Falha ao comprimir imagem.');
        }

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.clearRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const bytes = estimateDataUrlBytes(dataUrl);
        if (bytes < bestBytes) {
            bestDataUrl = dataUrl;
            bestBytes = bytes;
        }
        if (bytes <= targetBytes) {
            return { dataUrl, bytes };
        }

        if (quality > NEWS_IMAGE_MIN_QUALITY) {
            quality = Math.max(NEWS_IMAGE_MIN_QUALITY, quality - 0.1);
            continue;
        }

        const nextWidth = Math.max(minDimension, Math.floor(width * 0.86));
        const nextHeight = Math.max(minDimension, Math.floor(height * 0.86));
        if (nextWidth === width && nextHeight === height) {
            break;
        }
        width = nextWidth;
        height = nextHeight;
        quality = NEWS_IMAGE_INITIAL_QUALITY;
    }

    if (!bestDataUrl) {
        throw new Error('Falha ao comprimir imagem.');
    }
    return {
        dataUrl: bestDataUrl,
        bytes: bestBytes
    };
};

const compressNewsImageFile = async (file) => compressImageFileWithConstraints(file, {
    maxWidth: NEWS_IMAGE_MAX_WIDTH,
    maxHeight: NEWS_IMAGE_MAX_HEIGHT,
    minDimension: NEWS_IMAGE_MIN_DIMENSION,
    targetBytes: TARGET_NEWS_IMAGE_STORED_BYTES
});

const compressEventPosterFile = async (file) => compressImageFileWithConstraints(file, {
    maxWidth: EVENT_POSTER_MAX_WIDTH,
    maxHeight: EVENT_POSTER_MAX_HEIGHT,
    minDimension: EVENT_POSTER_MIN_DIMENSION,
    targetBytes: TARGET_EVENT_POSTER_STORED_BYTES
});

const buildImportDebug = (rawText) => {
    const lines = (rawText || '')
        .split(/\r?\n/)
        .map((line) => line.trimEnd())
        .filter((line) => line.trim().length > 0);
    return lines.slice(0, 60).join('\n');
};

const normalizeLookup = (value) => (
    (value || '')
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
);

const buildAthleteLookupKey = (name, academy) => (
    `${normalizeLookup(name)}|${normalizeLookup(academy)}`
);

const buildObjectUrlFromDataUrl = (value) => {
    const dataUrl = (value || '').toString().trim();
    if (!/^data:/i.test(dataUrl)) return '';
    const separatorIndex = dataUrl.indexOf(',');
    if (separatorIndex <= 5) return '';

    const meta = dataUrl.slice(5, separatorIndex);
    const payload = dataUrl.slice(separatorIndex + 1);
    const mimeType = (meta.split(';')[0] || 'application/octet-stream').trim() || 'application/octet-stream';
    const isBase64 = /;base64/i.test(meta);

    try {
        let blob;
        if (isBase64) {
            const binary = atob(payload);
            const bytes = new Uint8Array(binary.length);
            for (let index = 0; index < binary.length; index += 1) {
                bytes[index] = binary.charCodeAt(index);
            }
            blob = new Blob([bytes], { type: mimeType });
        } else {
            const decoded = decodeURIComponent(payload);
            blob = new Blob([decoded], { type: mimeType });
        }
        return URL.createObjectURL(blob);
    } catch {
        return '';
    }
};

const openProofInNewTab = ({ fileUrl, fileName }) => {
    const source = (fileUrl || '').toString().trim();
    if (!source || typeof window === 'undefined') return false;

    let targetUrl = source;
    let objectUrlToRevoke = '';
    if (/^data:/i.test(source)) {
        objectUrlToRevoke = buildObjectUrlFromDataUrl(source);
        if (objectUrlToRevoke) {
            targetUrl = objectUrlToRevoke;
        }
    }

    const popup = window.open(targetUrl, '_blank', 'noopener,noreferrer');
    if (!popup) {
        const anchor = document.createElement('a');
        anchor.href = targetUrl;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        if (fileName) {
            anchor.download = fileName;
        }
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    }

    if (objectUrlToRevoke) {
        window.setTimeout(() => {
            URL.revokeObjectURL(objectUrlToRevoke);
        }, 60_000);
    }

    return true;
};

const parseRegistrationNotes = (value) => {
    if (!value || typeof value !== 'string') return null;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
};

const parseRegistrationRecord = (item, eventMap, copy) => {
    const source = (item && typeof item === 'object') ? item : {};
    const notes = parseRegistrationNotes(source.notes);
    const totalValue = Number(notes?.totalValue ?? source.price ?? 0);
    const proofName = notes?.comprovanteNome || '';
    const proofFileUrl = notes?.comprovanteArquivoDataUrl || '';
    const proofMimeType = notes?.comprovanteMimeType || '';
    const proofSizeBytes = Number(notes?.comprovanteTamanhoBytes || 0);
    const notesText = notes?.observacoes || '';
    const athletePhotoUrl = notes?.athletePhotoUrl || '';
    const statusNormalized = normalizeRegistrationStatus(source.status);
    const isPendingSync = statusNormalized === REGISTRATION_STATUS.PENDING_SYNC;
    const isPaymentConfirmed = statusNormalized === REGISTRATION_STATUS.PAYMENT_CONFIRMED;
    const isPaymentError = statusNormalized === REGISTRATION_STATUS.PAYMENT_ERROR;
    const isImageProof = /^data:image\//i.test(proofFileUrl) || /^image\//i.test(proofMimeType);
    const isPdfProof = /^data:application\/pdf/i.test(proofFileUrl) || /pdf/i.test(proofMimeType);
    const statusLabel = isPendingSync
        ? copy.registrationsPanel.statusPendingSync
        : isPaymentConfirmed
            ? copy.registrationsPanel.statusPaymentConfirmed
            : isPaymentError
                ? copy.registrationsPanel.statusPaymentError
                : copy.registrationsPanel.statusDefault;

    return {
        ...source,
        notes,
        totalValue,
        proofName,
        proofFileUrl,
        proofMimeType,
        proofSizeBytes,
        isImageProof,
        isPdfProof,
        notesText,
        athletePhotoUrl,
        statusNormalized,
        isPendingSync,
        isPaymentConfirmed,
        isPaymentError,
        isPendingPaymentReview: !isPendingSync && !isPaymentConfirmed && !isPaymentError,
        statusLabel,
        syncError: source.lastError || '',
        syncTraceId: source.lastTraceId || '',
        eventName: source.eventName || eventMap[source.eventId]?.name || copy.common.noEvent,
        eventDate: source.eventDate || eventMap[source.eventId]?.date || '',
        eventLocation: source.eventLocation || eventMap[source.eventId]?.location || '',
        paymentReviewNotes: source.paymentReviewNotes || '',
        paymentReviewedBy: source.paymentReviewedBy || '',
        paymentReviewedAt: source.paymentReviewedAt || ''
    };
};

const fieldsEqualIfPresent = (left, right) => {
    const normalizedLeft = normalizeLookup(left || '');
    const normalizedRight = normalizeLookup(right || '');
    if (!normalizedLeft || !normalizedRight) return true;
    return normalizedLeft === normalizedRight;
};

const athleteMatchesRegistrationRecord = (athlete, registration) => {
    if (!athlete || !registration) return false;
    const registrationAthleteId = normalizeLookup(registration.athleteId || '');
    const athleteId = normalizeLookup(athlete.id || '');
    if (registrationAthleteId && athleteId && registrationAthleteId === athleteId) {
        return true;
    }

    if ((athlete.eventId || '') !== (registration.eventId || '')) return false;

    const nameMatch = normalizeLookup(athlete.nome || '') === normalizeLookup(registration.nome || '');
    const academyMatch = normalizeLookup(athlete.academia || '') === normalizeLookup(registration.academia || '');
    if (!nameMatch || !academyMatch) return false;

    if (!fieldsEqualIfPresent(athlete.categoria, registration.categoria)) return false;
    if (!fieldsEqualIfPresent(athlete.faixa, registration.faixa)) return false;
    if (!fieldsEqualIfPresent(athlete.peso, registration.peso)) return false;
    return true;
};

const buildRegistrationIdentityKey = (registration) => {
    if (!registration) return '';
    return [
        normalizeLookup(registration.eventId || ''),
        normalizeLookup(registration.nome || ''),
        normalizeLookup(registration.academia || ''),
        normalizeLookup(registration.categoria || ''),
        normalizeLookup(registration.faixa || ''),
        normalizeLookup(registration.peso || '')
    ].join('|');
};

const buildAthleteRegistrationIdentityKey = (athlete) => (
    buildRegistrationIdentityKey({
        eventId: athlete?.eventId || '',
        nome: athlete?.nome || '',
        academia: athlete?.academia || '',
        categoria: athlete?.categoria || '',
        faixa: athlete?.faixa || '',
        peso: athlete?.peso || ''
    })
);

const reorderIds = (ids, sourceId, targetId) => {
    const source = (sourceId || '').toString().trim();
    const target = (targetId || '').toString().trim();
    if (!source || !target || source === target) return ids;

    const base = Array.isArray(ids) ? [...ids] : [];
    const fromIndex = base.indexOf(source);
    const toIndex = base.indexOf(target);
    if (fromIndex < 0 || toIndex < 0) return base;

    const [moved] = base.splice(fromIndex, 1);
    base.splice(toIndex, 0, moved);
    return base;
};

const parseClockToMinutes = (value) => {
    const [rawHour = '0', rawMinute = '0'] = (value || '').toString().split(':');
    const hour = Number(rawHour);
    const minute = Number(rawMinute);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 9 * 60;
    const safeHour = Math.min(23, Math.max(0, Math.floor(hour)));
    const safeMinute = Math.min(59, Math.max(0, Math.floor(minute)));
    return (safeHour * 60) + safeMinute;
};

const formatMinutesToClock = (totalMinutes) => {
    const safeTotal = Number.isFinite(totalMinutes) ? Math.max(0, Math.floor(totalMinutes)) : 0;
    const wrapped = safeTotal % (24 * 60);
    const hours = Math.floor(wrapped / 60).toString().padStart(2, '0');
    const minutes = (wrapped % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

const formatDurationLabel = (minutes, isEnglish) => {
    const safeTotal = Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
    const hours = Math.floor(safeTotal / 60);
    const remainingMinutes = safeTotal % 60;
    if (hours <= 0) {
        return isEnglish ? `${remainingMinutes} min` : `${remainingMinutes} min`;
    }
    if (remainingMinutes <= 0) {
        return isEnglish ? `${hours} h` : `${hours} h`;
    }
    return isEnglish
        ? `${hours} h ${remainingMinutes} min`
        : `${hours} h ${remainingMinutes} min`;
};

const REGISTRATION_SUPPRESSED_STORAGE_KEY = 'genesis_dashboard_suppressed_registration_keys_v1';
const INSTAGRAM_LAST_REFRESH_STORAGE_KEY = 'genesis_dashboard_instagram_last_refresh_v1';
const INSTAGRAM_FEED_STATUS_STORAGE_KEY = 'genesis_dashboard_instagram_feed_status_v1';
const MANUAL_SCHEDULE_STORAGE_KEY = 'genesis_manual_schedule_v1';

const loadSuppressedRegistrationKeys = () => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(REGISTRATION_SUPPRESSED_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return [...new Set(
            parsed
                .map((item) => (typeof item === 'string' ? item.trim() : ''))
                .filter(Boolean)
        )];
    } catch {
        return [];
    }
};

const saveSuppressedRegistrationKeys = (keys) => {
    if (typeof window === 'undefined') return;
    try {
        if (!keys?.length) {
            window.localStorage.removeItem(REGISTRATION_SUPPRESSED_STORAGE_KEY);
            return;
        }
        window.localStorage.setItem(REGISTRATION_SUPPRESSED_STORAGE_KEY, JSON.stringify(keys));
    } catch {
        // Ignore localStorage write failures.
    }
};

const loadInstagramLastRefresh = () => {
    if (typeof window === 'undefined') return '';
    try {
        const value = window.localStorage.getItem(INSTAGRAM_LAST_REFRESH_STORAGE_KEY);
        return typeof value === 'string' ? value.trim() : '';
    } catch {
        return '';
    }
};

const saveInstagramLastRefresh = (value) => {
    if (typeof window === 'undefined') return;
    const normalized = (value || '').toString().trim();
    try {
        if (!normalized) {
            window.localStorage.removeItem(INSTAGRAM_LAST_REFRESH_STORAGE_KEY);
            return;
        }
        window.localStorage.setItem(INSTAGRAM_LAST_REFRESH_STORAGE_KEY, normalized);
    } catch {
        // Ignore localStorage write failures.
    }
};

const loadInstagramFeedStatus = () => {
    if (typeof window === 'undefined') return '';
    try {
        return (window.localStorage.getItem(INSTAGRAM_FEED_STATUS_STORAGE_KEY) || '').toString().trim().toUpperCase();
    } catch {
        return '';
    }
};

const createScheduleDraftState = () => ({
    title: '',
    type: 'FIGHT',
    area: 'Area 1',
    start: '09:00',
    end: '09:10',
    notes: ''
});

const normalizeScheduleType = (value) => {
    const normalized = (value || '').toString().trim().toUpperCase();
    if (['FIGHT', 'BREAK', 'CEREMONY', 'OTHER'].includes(normalized)) return normalized;
    return 'FIGHT';
};

const normalizeManualScheduleEntry = (entry = {}, index = 0) => {
    const id = (entry?.id || '').toString().trim() || `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const title = (entry?.title || '').toString().trim();
    const area = (entry?.area || '').toString().trim();
    const notes = (entry?.notes || '').toString().trim();
    const type = normalizeScheduleType(entry?.type);
    const start = formatMinutesToClock(parseClockToMinutes(entry?.start || '09:00'));
    let end = formatMinutesToClock(parseClockToMinutes(entry?.end || start));
    if (parseClockToMinutes(end) < parseClockToMinutes(start)) {
        end = formatMinutesToClock(parseClockToMinutes(start) + 10);
    }
    const order = Number.isFinite(Number(entry?.order)) ? Number(entry.order) : (index + 1);

    return {
        id,
        order,
        title,
        type,
        area: area || '',
        start,
        end,
        notes
    };
};

const loadManualScheduleByEvent = () => {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem(MANUAL_SCHEDULE_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        return Object.entries(parsed).reduce((acc, [eventId, rows]) => {
            const normalizedEventId = (eventId || '').toString().trim();
            if (!normalizedEventId) return acc;
            const normalizedRows = (Array.isArray(rows) ? rows : [])
                .map((row, index) => normalizeManualScheduleEntry(row, index))
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((row, index) => ({ ...row, order: index + 1 }));
            if (normalizedRows.length > 0) {
                acc[normalizedEventId] = normalizedRows;
            }
            return acc;
        }, {});
    } catch {
        return {};
    }
};

const saveManualScheduleByEvent = (payload) => {
    if (typeof window === 'undefined') return;
    try {
        if (!payload || typeof payload !== 'object') {
            window.localStorage.removeItem(MANUAL_SCHEDULE_STORAGE_KEY);
            return;
        }
        const hasAny = Object.values(payload).some((rows) => Array.isArray(rows) && rows.length > 0);
        if (!hasAny) {
            window.localStorage.removeItem(MANUAL_SCHEDULE_STORAGE_KEY);
            return;
        }
        window.localStorage.setItem(MANUAL_SCHEDULE_STORAGE_KEY, JSON.stringify(payload));
    } catch {
        // Ignore localStorage write failures.
    }
};

const saveInstagramFeedStatus = (value) => {
    if (typeof window === 'undefined') return;
    const normalized = (value || '').toString().trim().toUpperCase();
    try {
        if (!normalized) {
            window.localStorage.removeItem(INSTAGRAM_FEED_STATUS_STORAGE_KEY);
            return;
        }
        window.localStorage.setItem(INSTAGRAM_FEED_STATUS_STORAGE_KEY, normalized);
    } catch {
        // Ignore localStorage write failures.
    }
};

const getRegistrationDecisionTimestamp = (registration) => (
    new Date(registration?.paymentReviewedAt || registration?.createdAt || 0).getTime()
);

const toAthleteFromRegistration = (registration) => {
    const notes = registration?.notes && typeof registration.notes === 'object' ? registration.notes : {};
    const absolutoGi = (notes?.absolutoGi || '').toString().trim().toUpperCase();
    const modalidade = (registration?.modalidade || '').toString().trim().toUpperCase();

    return {
        id: registration?.athleteId || undefined,
        nome: registration?.nome || '',
        academia: registration?.academia || '',
        faixa: registration?.faixa || '',
        peso: registration?.peso || '',
        categoria: registration?.categoria || '',
        genero: registration?.genero || '',
        isNoGi: modalidade === 'NO-GI',
        isAbsolute: absolutoGi === 'SIM',
        eventId: registration?.eventId || '',
        pontos: 0,
        historico: []
    };
};

const toMemberProfileFromRegistration = (registration, currentUser) => {
    const notes = registration?.notes && typeof registration.notes === 'object' ? registration.notes : {};
    const birthYear = (notes?.anoNascimento || '').toString().trim();
    const hasValidBirthYear = /^\d{4}$/.test(birthYear);
    const parsedAge = Number(notes?.idade || '');

    return {
        fullName: registration?.nome || '',
        firstName: registration?.nome || '',
        lastName: '',
        gender: registration?.genero || '',
        email: registration?.email || '',
        phone: registration?.phone || '',
        birthDate: hasValidBirthYear ? `${birthYear}-01-01` : '',
        age: Number.isFinite(parsedAge) && parsedAge >= 0 ? Math.floor(parsedAge) : '',
        country: 'Brasil',
        city: '',
        belt: registration?.faixa || '',
        weight: registration?.peso || '',
        academyId: notes?.academyId || '',
        academyName: registration?.academia || notes?.academyName || '',
        photoUrl: notes?.athletePhotoUrl || '',
        createdByUsername: currentUser?.username || '',
        createdByName: currentUser?.name || '',
        createdAt: registration?.createdAt || new Date().toISOString()
    };
};

const Dashboard = () => {
    const {
        athletes,
        addAthlete,
        updateAthletePoints,
        setManualPoints,
        resetAthletePoints,
        clearAthletes,
        importAthletes,
        brackets,
        generateBrackets,
        setBracketPodium,
        setBracketSeedOrder,
        applyBracketPodium,
        events,
        news,
        memberProfiles,
        addMemberProfile,
        activeEventId,
        openEventModal,
        updateEvent,
        deleteEvent,
        addNews,
        deleteNews,
        setActiveEvent,
        assignAthletesToEvent,
        removeAthlete,
        addLog,
        currentUser,
        logout,
        clearEventResults,
        logs
    } = useStore();
    const location = useLocation();
    const navigate = useNavigate();
    const { uiLanguage, uiVariant } = useI18n();
    const languageVariant = ['pt', 'en', 'es', 'fr'].includes(uiVariant) ? uiVariant : 'pt';
    const isEnglish = languageVariant !== 'pt';
    const copy = useMemo(() => (
        isEnglish
            ? {
                feedback: {
                    activateEventForReport: 'Activate an event to export the report.',
                    noAthletesOnActiveEvent: 'No athlete linked to the active event.',
                    reportGenerated: (name) => `Report generated for ${name || 'active event'}.`,
                    reportFail: 'Failed to export report.',
                    eventUpdated: (name) => `Event updated: ${name || 'event'}.`,
                    eventUpdateFail: 'Failed to update event.',
                    eventClosed: (name) => `Registration closed: ${name || 'event'}. Moved to past events.`,
                    eventReopened: (name) => `Registration reopened: ${name || 'event'}.`,
                    removeEventConfirm: (name) => `Delete ${name}? This action cannot be undone.`,
                    eventRemoved: 'Event removed successfully.',
                    eventRemoveFail: 'Failed to remove event.',
                    eventPosterTypeInvalid: 'Select a valid image file for the poster.',
                    eventPosterUploadTooLarge: 'Poster file too large. Maximum upload size is 8 MB.',
                    eventPosterTooLargeAfterCompression: 'Poster is still too large after compression. Choose a lighter file.',
                    eventPosterReadFail: 'Failed to process selected poster image.',
                    clearAthletesConfirm: 'This will clear all athletes from the athlete base panel. Continue?',
                    allAthletesRemoved: 'All athletes were removed.',
                    noTextPdf: 'PDF has no text. Generate searchable PDF (OCR) and try again.',
                    noTextImport: 'PDF has no text to import.',
                    noAthleteInFile: 'No athlete found. Check if PDF is searchable text.',
                    noValidAthleteImport: 'No valid athlete to import.',
                    importReadFail: 'Failed to read file.',
                    invalidManualPoints: 'Enter a valid points value.',
                    manualPointsUpdated: 'Points updated manually.',
                    manualPointsFail: 'Could not update points.',
                    beltSummaryUpdated: 'Belt summary updated.',
                    selectEventForBracket: 'Select an event to generate brackets.',
                    existingBracketsConfirm: 'Brackets already exist for this event. Generate again?',
                    bracketsGenerated: (count) => `${count} brackets generated.`,
                    noBracketCategory: 'No category found to generate brackets.',
                    bracketGenerateFail: 'Failed to generate brackets.',
                    noBracketForPdf: 'No bracket available for PDF export.',
                    bracketPdfSaved: 'Brackets PDF saved successfully.',
                    bracketPdfFail: 'Failed to save brackets PDF.',
                    noScheduleForPdf: 'No schedule available for PDF export.',
                    schedulePdfSaved: 'Schedule PDF saved successfully.',
                    schedulePdfFail: 'Failed to save schedule PDF.',
                    podiumApplied: 'Podium applied successfully.',
                    podiumApplyFail: 'Could not apply podium.',
                    resetOnlyLocal: 'Password reset is available only in local mode.',
                    registerOnlyLocal: 'User creation is available only in local mode.',
                    selectUser: 'Select a user.',
                    mismatchPassword: 'Passwords do not match.',
                    passwordUpdated: 'Password updated successfully.',
                    passwordResetFor: (username) => `Password reset for ${username}.`,
                    passwordResetFail: 'Failed to reset password.',
                    userCreated: (username) => `User created: ${username}.`,
                    userCreateFail: 'Failed to create user.',
                    accessDeniedAdmin: 'This action is restricted to administrators.',
                    minName: 'Name must have at least 3 characters.',
                    academyRequired: 'Please provide athlete academy.',
                    athleteRegistered: (name) => `Athlete ${name} registered.`,
                    athletesAssigned: 'Athletes linked to event.',
                    athleteAssignFail: 'Failed to link athletes.',
                    pointsClearedFor: (name) => `Points cleared for ${name}.`,
                    removeAthleteConfirm: (name) => `Remove athlete ${name}? This action cannot be undone.`,
                    athleteRemoved: (name) => `Athlete removed: ${name}.`,
                    athleteRemoveFail: 'Could not remove athlete.',
                    goldFor: (name) => `Gold for ${name}`,
                    silverFor: (name) => `Silver for ${name}`,
                    bronzeFor: (name) => `Bronze for ${name}`,
                    newsTitleRequired: 'News title is required.',
                    newsSummaryRequired: 'News summary is required.',
                    newsCreated: (title) => `News published: ${title}.`,
                    newsCreateFail: 'Failed to publish news.',
                    newsDeleteConfirm: (title) => `Remove news "${title}"?`,
                    newsDeleted: 'News removed.',
                    newsDeleteFail: 'Failed to remove news.',
                    newsImageTypeInvalid: 'Select a valid image file (JPG, PNG, WEBP or GIF).',
                    newsImageTooLarge: 'Image too large. Maximum upload size is 8 MB.',
                    newsImageReadFail: 'Failed to process selected image.',
                    newsImageStillLarge: 'Image is still too large after compression. Choose a lighter file.',
                    instagramRefreshDone: (count) => `Instagram feed refreshed (${count} posts).`,
                    instagramRefreshFail: 'Failed to refresh Instagram feed.',
                    registrationLoadFail: 'Failed to load public registrations.',
                    registrationSyncDone: (synced, pending) => `Sync finished: ${synced} sent, ${pending} pending.`,
                    registrationSyncFail: 'Failed to sync pending registrations.',
                    registrationStatusUpdated: 'Payment status updated.',
                    registrationStatusFail: 'Failed to update payment status.',
                    registrationStatusAuthRequired: 'Admin session expired. Please log in again to approve payments.',
                    registrationStatusForbidden: 'Only administrators can approve or reject payments.',
                    proofOpenFail: 'Failed to open payment proof.',
                    registrationExportDone: (count) => `${count} registrations exported to spreadsheet.`,
                    registrationExportNoData: 'No registration available to export.',
                    registrationListingExportDone: (label) => `PDF report generated: ${label}.`,
                    registrationListingExportFail: 'Failed to generate registration report.',
                    registrationListingNoData: 'No registration available for this event/report.',
                    eventResourceMissing: 'This event does not have this file configured yet.',
                    clearReimportLocksConfirm: (count) => `Clear ${count} registration reimport locks?`,
                    reimportLocksCleared: (count) => `${count} reimport locks removed.`,
                    reimportLocksNone: 'No reimport lock to clear.'
                },
                nav: {
                    overview: 'Overview',
                    events: 'Events',
                    news: 'News',
                    registrations: 'Registrations',
                    brackets: 'Brackets',
                    schedule: 'Schedule',
                    athletes: 'Athletes',
                    automation: 'Automation',
                    activity: 'Activity',
                    superfights: 'Super Fights'
                },
                common: {
                    close: 'Close',
                    cancel: 'Cancel',
                    save: 'Save',
                    search: 'Search',
                    active: 'Active',
                    inactive: 'Inactive',
                    noEvent: 'No event',
                    allEvents: 'All events',
                    points: 'Points',
                    selected: 'selected',
                    noneFound: 'None found',
                    update: 'Update'
                },
                sidebar: {
                    title: 'Quick menu',
                    activeAthletes: 'Active athletes',
                    totalPoints: 'Total points',
                    registeredEvents: 'Registered events',
                    newRegister: 'New registration'
                },
                hero: {
                    activeEvent: 'Active event',
                    noActiveEvent: 'No active event',
                    title: 'Control Panel',
                    subtitle: 'Track registrations, adjustments and ranking results with real-time metrics and admin shortcuts.',
                    updatedAt: 'Updated at',
                    secureSessionFor: 'Secure session for',
                    average: 'Average',
                    newAthlete: 'New athlete',
                    logs: 'Logs',
                    menu: 'Menu',
                    rankingUpdated: 'Ranking updated',
                    athletes: 'athletes',
                    noLeader: 'No leader'
                },
                stats: {
                    enrolled: 'Registered',
                    activeTrend: 'active',
                    totalPoints: 'Total points',
                    average: 'Average',
                    registeredEvents: 'Registered events',
                    centralizedControl: 'Centralized control',
                    records: 'Records',
                    continuousMonitoring: 'Continuous monitoring'
                },
                eventsPanel: {
                    title: 'Events',
                    subtitle: 'Create events and organize athletes by stage.',
                    createEvent: 'Create event',
                    noEvents: 'No event registered.',
                    openSection: 'Open registrations',
                    openSectionSubtitle: 'Events currently accepting registrations.',
                    noOpenEvents: 'No event with open registration.',
                    closedSection: 'Past / closed registrations',
                    closedSectionSubtitle: 'Closed events appear only in this section.',
                    noClosedEvents: 'No closed event yet.',
                    date: 'Date',
                    undefinedDate: 'Date undefined',
                    athletes: 'Athletes',
                    activeEvent: 'Active event',
                    activate: 'Activate',
                    manageAthletes: 'Manage athletes',
                    edit: 'Edit',
                    registration: 'Registration',
                    closeRegistration: 'Close registrations',
                    closeRegistrationConfirmTitle: 'Confirm close registrations',
                    closeRegistrationConfirmDescription: (name) => `Are you sure you want to close registrations for ${name || 'this event'}? Athletes will no longer be able to register until you reopen it.`,
                    closeRegistrationConfirmAction: 'Yes, close registrations',
                    reopenRegistration: 'Reopen registrations',
                    closedRegistration: 'Registrations closed',
                    noPoster: 'No poster',
                    open: 'Open',
                    closed: 'Closed'
                },
                newsPanel: {
                    title: 'News',
                    subtitle: 'Create official announcements and publish directly to public news page.',
                    openNewsPage: 'Open news page',
                    refreshSocial: 'Refresh Instagram feed',
                    lastInstagramRefresh: 'Instagram updated at',
                    instagramNeverUpdated: 'Not synchronized yet',
                    feedStatusCache: 'Cache',
                    feedStatusUpdatedNow: 'Updated now',
                    titleLabel: 'Title',
                    titlePlaceholder: 'Ex: Registration for Stage 2 is now open',
                    summaryLabel: 'Summary',
                    summaryPlaceholder: 'Write a short summary that will appear on home and news page.',
                    imageLabel: 'Cover image URL (optional)',
                    imagePlaceholder: 'https://.../news.jpg',
                    imageUploadHint: 'Or upload from your computer',
                    imageUploadAction: 'Choose image',
                    imageClearAction: 'Remove image',
                    imageSelectedFile: 'Selected file',
                    imagePreviewLabel: 'Preview',
                    imageCompressionHint: 'Uploaded image is automatically compressed to save storage.',
                    imageCompressedSize: 'Compressed size',
                    dateLabel: 'Publish date',
                    publish: 'Publish news',
                    noNews: 'No published news yet.',
                    remove: 'Remove'
                },
                registrationsPanel: {
                    title: 'Public registrations',
                    subtitle: 'All event registrations received through public form in one place.',
                    refresh: 'Refresh',
                    syncNow: 'Sync now',
                    pendingLabel: 'Pending sync',
                    filterPending: 'Only pending',
                    filterAll: 'Show all',
                    searchPlaceholder: 'Search by athlete, academy, phone, email or notes',
                    searchAria: 'Search registration',
                    eventFilter: 'Event filter',
                    allEvents: 'All events',
                    tablePhoto: 'Photo',
                    tableAthlete: 'Athlete',
                    tableEvent: 'Event',
                    tableCategory: 'Category',
                    tableContact: 'Contact',
                    tablePayment: 'Payment',
                    tableNotes: 'Notes',
                    tablePipeline: 'Pipeline',
                    tableStatus: 'Status',
                    pipelineRegistered: 'Registered',
                    pipelineApproved: 'Approved',
                    pipelineCategory: 'In category',
                    pipelineBracket: 'In bracket',
                    flowStatusDone: 'Approved and sent to category and bracket.',
                    flowStatusCategory: 'Approved and sent to category. Awaiting bracket.',
                    flowStatusApproved: 'Payment approved. Waiting category/bracket sync.',
                    flowStatusPaymentError: 'Payment error. Not sent to category/bracket.',
                    flowStatusPending: 'Waiting payment review.',
                    totalValue: 'Total',
                    pixKey: 'Pix key',
                    receipt: 'Receipt',
                    noReceipt: 'No receipt',
                    noData: 'No public registration found.',
                    noNotes: 'No notes',
                    noPhoto: 'No photo',
                    statusPendingSync: 'Pending sync',
                    statusDefault: 'Pending',
                    statusPaymentConfirmed: 'Payment confirmed - Athlete active',
                    statusPaymentError: 'Payment error',
                    confirmPayment: 'Confirm payment',
                    markPaymentError: 'Mark payment error',
                    exportSpreadsheet: 'Export spreadsheet',
                    updatedAt: 'Updated at',
                    totalRegistrations: 'registrations',
                    reportAthletesByAcademyGi: 'Athletes by academy (GI)',
                    reportAthletesByCategoryGi: 'Athletes by category (GI)',
                    reportAthletesByAcademyNoGi: 'Athletes by academy (NO-GI)',
                    reportAthletesByCategoryNoGi: 'Athletes by category (NO-GI)',
                    reportWeightTableGi: 'Weight table GI',
                    reportWeightTableNoGi: 'Weight table NO-GI',
                    reportCircular: 'Event circular',
                    filterThisEvent: 'Show this event in table',
                    confirmReviewPrompt: 'Optional payment review note:',
                    errorReviewPrompt: 'Describe the payment issue (optional):',
                    reviewedBy: 'Reviewed by',
                    reviewedAt: 'Reviewed at',
                    reviewNotes: 'Review notes',
                    proofPreviewTitle: 'Receipt preview',
                    proofPreviewPdf: 'PDF preview',
                    openReceipt: 'Open receipt',
                    lastError: 'Sync error',
                    traceId: 'Trace',
                    syncMonitorLastFailure: (at) => `Last sync failure: ${at}`
                },
                bracketsPanel: {
                    title: 'Brackets',
                    subtitle: 'Generate brackets by category and apply podium automatically.',
                    workspaceTitle: 'Bracket workspace',
                    workspaceSubtitle: 'Approved registrations are synchronized to athlete base and ready for categories and brackets.',
                    quickFilter: 'Quick academy filter',
                    allAcademies: 'All academies',
                    exportApprovedCsv: 'Export approved CSV',
                    selectEvent: 'Select event',
                    selectEventAria: 'Select event for brackets',
                    selectCategoryAria: 'Select bracket category',
                    allCategories: 'All categories',
                    generate: 'Generate brackets',
                    savePdf: 'Save brackets PDF',
                    exportSchedulePdfTable: 'PDF Table',
                    exportSchedulePdfTv: 'PDF TV Mode',
                    searchPlaceholder: 'Search bracket by number or category',
                    searchAria: 'Search bracket',
                    brackets: 'brackets',
                    bracket: 'Bracket',
                    applied: 'Applied',
                    event: 'Event',
                    athletes: 'Athletes',
                    round1: 'Round 1',
                    athlete: 'Athlete',
                    noAthleteBracket: 'No athletes in this bracket.',
                    podium: 'Podium',
                    firstPlace: '1st place',
                    secondPlace: '2nd place',
                    thirdPlace: '3rd place',
                    selectAthlete: 'Select athlete',
                    apply: 'Apply podium',
                    reapply: 'Reapply podium',
                    noBracketFound: 'No bracket found.',
                    approvedAthletesTitle: 'Approved athletes',
                    approvedAthletesSubtitle: 'Athletes approved for this event and already linked to the admin flow.',
                    approvedAthletesEmpty: 'No approved registrations for this event.',
                    academySummaryTitle: 'Athletes by academy',
                    academySummarySubtitle: 'Distribution of approved athletes by academy in this event.',
                    academySummaryEmpty: 'No academy with approved athletes yet.',
                    statusApproved: 'Approved',
                    statusInCategory: 'In category',
                    statusInBracket: 'In bracket',
                    statusPendingLink: 'Pending link',
                    statsApproved: 'Approved',
                    statsInCategory: 'In category',
                    statsInBracket: 'In bracket',
                    statsAcademies: 'Academies',
                    academyCount: (count) => `${count} athlete${count === 1 ? '' : 's'}`,
                    filteredLabel: (count, total) => `${count} of ${total}`,
                    scheduleTitle: 'Brackets & Schedule',
                    scheduleSubtitle: 'Automatic bracket generation, drag-and-drop organization and real-time estimation.',
                    scheduleAuto: 'Automatic bracket generation',
                    scheduleDrag: 'Drag and drop to configure brackets',
                    scheduleRealtime: 'Real-time estimate',
                    scheduleTv: 'TV mode for schedule',
                    scheduleStart: 'Start time',
                    scheduleFightDuration: 'Fight duration (min)',
                    scheduleTransition: 'Transition (min)',
                    scheduleAreas: 'Areas',
                    scheduleTotalFights: 'Estimated fights',
                    scheduleTotalDuration: 'Estimated total',
                    scheduleEstimatedEnd: 'Estimated end',
                    scheduleNoBrackets: 'Generate brackets to view schedule.',
                    scheduleDragHint: 'Drag cards to reorder schedule.',
                    scheduleRowRound: (count) => `${count} fight${count === 1 ? '' : 's'}`,
                    tvModeOpen: 'TV mode',
                    tvModeClose: 'Close TV mode',
                    tvModeTitle: 'Live schedule',
                    tvModeNow: 'Current time',
                    seedEditorTitle: 'Arrange bracket (drag athletes)',
                    seedEditorHint: 'Drag athletes to define first-round order.'
                },
                schedulePanel: {
                    title: 'Schedule',
                    subtitle: 'Manage timeline manually, including pauses and ceremonies.',
                    selectEvent: 'Select event',
                    selectEventAria: 'Select event for schedule',
                    exportSchedulePdfTable: 'PDF Table',
                    exportSchedulePdfTv: 'PDF TV Mode',
                    tvModeOpen: 'TV mode',
                    tvModeClose: 'Close TV mode',
                    tvModeTitle: 'Live schedule',
                    tvModeNow: 'Current time',
                    addItemTitle: 'New timeline item',
                    itemTitle: 'Title',
                    itemType: 'Type',
                    itemArea: 'Area',
                    itemStart: 'Start',
                    itemEnd: 'End',
                    itemNotes: 'Notes (optional)',
                    addItemAction: 'Add item',
                    noItems: 'No schedule item for this event yet.',
                    totalItems: 'Items',
                    totalFights: 'Fights',
                    totalDuration: 'Estimated total',
                    estimatedEnd: 'Estimated end',
                    moveUp: 'Up',
                    moveDown: 'Down',
                    remove: 'Remove',
                    typeFight: 'Fight',
                    typeBreak: 'Break',
                    typeCeremony: 'Ceremony',
                    typeOther: 'Other'
                },
                beltSummary: {
                    title: 'Belt summary',
                    subtitle: 'Point distribution by graduation',
                    updateTitle: 'Updated at'
                },
                athletesPanel: {
                    title: 'Athlete database',
                    subtitle: 'Manage registrations and adjust points quickly',
                    searchPlaceholder: 'Search by name or academy',
                    searchAria: 'Search athlete',
                    filterEventAria: 'Filter by event',
                    noEvent: 'No event',
                    listView: 'List view',
                    cardView: 'Card view',
                    athlete: 'Athlete',
                    academy: 'Academy',
                    event: 'Event',
                    contact: 'Contact',
                    profile: 'Profile',
                    noProfile: 'No membership profile',
                    noPhoto: 'No photo',
                    actions: 'Actions',
                    pointsPlaceholder: 'Points',
                    clearPointsAria: 'Clear points',
                    registerGoldAria: 'Register gold',
                    registerSilverAria: 'Register silver',
                    registerBronzeAria: 'Register bronze',
                    removeAthleteAria: 'Remove athlete',
                    clearBase: 'Clear athlete base',
                    clearReimportLocks: 'Clear reimport locks',
                    paginationPrev: 'Prev',
                    paginationNext: 'Next',
                    paginationPerPage: 'Per page',
                    paginationPage: 'Page',
                    paginationShowing: (from, to, total) => `Showing ${from}-${to} of ${total}`,
                    belt: 'Belt',
                    weight: 'Weight',
                    category: 'Category',
                    noAthleteFound: 'No athlete found.'
                },
                automation: {
                    title: 'Automation and shortcuts',
                    subtitle: 'Organized tools to speed up work',
                    fast: 'Fast',
                    importFromPdf: 'Import list from PDF',
                    importDescription: 'Read PDF and split name, belt, category and academy.',
                    importPdf: 'Import PDF',
                    debugPreview: 'Debug preview (first lines)',
                    importFile: 'Import file',
                    importFileDesc: 'Open PDF/TXT selector to update ranking.',
                    select: 'Select',
                    exportReport: 'Export report',
                    exportReportDesc: 'Generate official PDF for active event.',
                    generatePdf: 'Generate PDF',
                    immediateControl: 'Immediate control',
                    immediateControlDesc: 'Clear temporary results and reset panel.',
                    clear: 'Clear',
                    safe: 'Safe',
                    clearAthletes: 'Clear athletes',
                    clearAthletesDesc: 'Remove all registered athletes from system.',
                    clearAll: 'Clear all',
                    caution: 'Caution',
                    keyboardTitle: 'Keyboard shortcuts',
                    keyboardSubtitle: 'Direct access for frequent tasks',
                    shortcutNewAthlete: 'Ctrl + N new athlete',
                    shortcutImport: 'Ctrl + I import ranking',
                    shortcutExport: 'Ctrl + E export PDF',
                    shortcutLogs: 'Ctrl + L logs'
                },
                activity: {
                    title: 'System activity',
                    subtitle: 'Real-time audit with recent logs',
                    viewAll: 'View all',
                    noRecent: 'No recent record.',
                    secureSession: 'Secure session',
                    secureSessionSubtitle: 'Access control with visual confirmation',
                    endSession: 'End session',
                    localUsers: 'Panel users',
                    localUsersDesc: 'Manage panel accounts and permissions.',
                    noUser: 'No registered user.',
                    resetPassword: 'Reset password',
                    createUser: 'Create user',
                    roleAdmin: 'Admin',
                    roleMesario: 'Table staff',
                    roleCoach: 'Professor',
                    roleAthlete: 'Athlete',
                    local: 'Local',
                    api: 'API'
                },
                modalLogs: {
                    title: 'System logs'
                },
                modalEventEdit: {
                    title: 'Edit event',
                    eventName: 'Event name',
                    eventNamePlaceholder: 'Ex: Stage 1 - Regional',
                    date: 'Date',
                    location: 'Location',
                    locationPlaceholder: 'Ex: Main Arena',
                    posterUrl: 'Poster image URL',
                    posterUrlPlaceholder: 'https://.../poster.jpg',
                    posterFile: 'Or upload poster image',
                    posterCompressionHint: 'Uploaded poster is automatically compressed.',
                    posterCompressedSize: 'Compressed size',
                    registrationUrl: 'Registration URL',
                    registrationUrlPlaceholder: 'https://...',
                    weightTableGiUrl: 'GI weight table URL (image or PDF)',
                    weightTableGiUrlPlaceholder: 'https://.../tabela-gi.jpg',
                    weightTableNoGiUrl: 'NO-GI weight table URL (image or PDF)',
                    weightTableNoGiUrlPlaceholder: 'https://.../tabela-no-gi.jpg',
                    circularUrl: 'Event circular URL (optional)',
                    circularUrlPlaceholder: 'https://.../circular.pdf',
                    weightTableGiOptions: 'GI weight options (one per line)',
                    weightTableGiOptionsPlaceholder: 'Ex: Light up to 76,00',
                    weightTableNoGiOptions: 'NO-GI weight options (one per line)',
                    weightTableNoGiOptionsPlaceholder: 'Ex: Medium up to 82,30',
                    weightTableOcrFromUrl: 'Extract by OCR from URL',
                    weightTableOcrFromFile: 'Upload file and extract',
                    weightTableOcrRunning: 'Running OCR...',
                    weightTableOcrProgress: (value) => `OCR progress: ${value}%`,
                    weightTableOcrSourceMissing: 'Enter the table URL or upload the file.',
                    weightTableOcrNoOptions: 'OCR did not detect valid weight options.',
                    weightTableOcrSuccess: (count) => `OCR completed: ${count} options extracted.`,
                    pixKey: 'Pix key (event owner)',
                    pixKeyPlaceholder: 'CPF / CNPJ / email / phone / random key',
                    feeUnder15: 'Fee up to 15 years (GI/NO-GI)',
                    feeOver15: 'Fee over 15 years (GI/NO-GI)',
                    feeCombo: 'Fee Combo GI + NO-GI',
                    feeAbsolute: 'Fee Absolute GI / NO-GI',
                    registrationOpen: 'Open registrations now',
                    internalRegistration: 'Registration on our platform',
                    deleteEvent: 'Delete event',
                    saveChanges: 'Save changes'
                },
                modalAthlete: {
                    title: 'New athlete',
                    fullName: 'Full name',
                    fullNamePlaceholder: 'Ex: Rodrigo Cavaca',
                    gender: 'Gender',
                    genderMale: 'Male',
                    genderFemale: 'Female',
                    event: 'Event',
                    noEvent: 'No event',
                    graduation: 'Graduation',
                    age: 'Age',
                    agePlaceholder: 'Ex: 25',
                    weight: 'Weight',
                    absoluteWeightPlaceholder: 'Absolute',
                    weightPlaceholder: 'Ex: Feather',
                    selectWeight: 'Select...',
                    category: 'Category',
                    categoryPlaceholder: 'Ex: Adult',
                    categoryType: 'Category type',
                    typeWeight: 'Weight',
                    typeAbsolute: 'Absolute',
                    modality: 'Modality',
                    modalityGi: 'GI (with gi)',
                    modalityNoGi: 'NO-GI (without gi)',
                    teamAcademy: 'Team / Academy',
                    teamAcademyPlaceholder: 'Ex: Zenith JJ',
                    country: 'Country',
                    countryPlaceholder: 'Ex: Brazil',
                    photoUrl: 'Photo URL (optional)',
                    saveRegister: 'Save record'
                },
                modalAssign: {
                    title: 'Manage athletes',
                    eventPrefix: 'Event',
                    subtitle: 'Selecting moves athlete to this event.',
                    searchPlaceholder: 'Search athlete',
                    searchAria: 'Search athlete',
                    selected: 'selected',
                    noAcademy: 'No academy',
                    current: 'Current',
                    otherEvent: 'Other event',
                    noAthleteFound: 'No athlete found.',
                    saveLink: 'Save link'
                },
                modalReset: {
                    title: 'Reset password',
                    noUser: 'No user available.',
                    user: 'User',
                    newPassword: 'New password',
                    confirmPassword: 'Confirm password',
                    updatePassword: 'Update password'
                },
                modalUserCreate: {
                    title: 'Create panel user',
                    name: 'Name',
                    username: 'Username',
                    role: 'Role',
                    password: 'Password',
                    confirmPassword: 'Confirm password',
                    createUser: 'Create user'
                }
            }
            : {
                feedback: {
                    activateEventForReport: 'Ative um evento para gerar o relatório.',
                    noAthletesOnActiveEvent: 'Nenhum atleta vinculado ao evento ativo.',
                    reportGenerated: (name) => `Relatório gerado para ${name || 'evento ativo'}.`,
                    reportFail: 'Falha ao gerar o relatório.',
                    eventUpdated: (name) => `Evento atualizado: ${name || 'evento'}.`,
                    eventUpdateFail: 'Falha ao atualizar evento.',
                    eventClosed: (name) => `Inscrições encerradas: ${name || 'evento'}. Evento movido para passados.`,
                    eventReopened: (name) => `Inscrições reabertas: ${name || 'evento'}.`,
                    removeEventConfirm: (name) => `Deseja excluir o evento ${name}? Esta ação não pode ser desfeita.`,
                    eventRemoved: 'Evento removido com sucesso.',
                    eventRemoveFail: 'Falha ao remover evento.',
                    eventPosterTypeInvalid: 'Selecione um arquivo de imagem válido para o cartaz.',
                    eventPosterUploadTooLarge: 'Arquivo do cartaz muito grande. Tamanho máximo de envio: 8 MB.',
                    eventPosterTooLargeAfterCompression: 'O cartaz ainda ficou grande após a compressão. Escolha um arquivo menor.',
                    eventPosterReadFail: 'Falha ao processar a imagem do cartaz.',
                    clearAthletesConfirm: 'Isso limpará todos os atletas do painel da base. Deseja continuar?',
                    allAthletesRemoved: 'Todos os atletas foram removidos.',
                    noTextPdf: 'PDF sem texto. Gere um PDF pesquisavel (OCR) e tente novamente.',
                    noTextImport: 'PDF sem texto para importar.',
                    noAthleteInFile: 'Nenhum atleta encontrado. Verifique se o PDF tem texto.',
                    noValidAthleteImport: 'Nenhum atleta válido para importação.',
                    importReadFail: 'Falha ao ler o arquivo.',
                    invalidManualPoints: 'Informe um valor válido para pontos.',
                    manualPointsUpdated: 'Pontos atualizados manualmente.',
                    manualPointsFail: 'Não foi possível atualizar os pontos.',
                    beltSummaryUpdated: 'Resumo por faixa atualizado.',
                    selectEventForBracket: 'Selecione um evento para gerar as chaves.',
                    existingBracketsConfirm: 'Já existem chaves para este evento. Deseja gerar novamente?',
                    bracketsGenerated: (count) => `${count} chaves geradas.`,
                    noBracketCategory: 'Nenhuma categoria encontrada para gerar chaves.',
                    bracketGenerateFail: 'Falha ao gerar chaves.',
                    noBracketForPdf: 'Nenhuma chave disponível para exportação em PDF.',
                    bracketPdfSaved: 'PDF das chaves salvo com sucesso.',
                    bracketPdfFail: 'Falha ao salvar PDF das chaves.',
                    noScheduleForPdf: 'Nenhum cronograma disponível para exportação em PDF.',
                    schedulePdfSaved: 'PDF do cronograma salvo com sucesso.',
                    schedulePdfFail: 'Falha ao salvar PDF do cronograma.',
                    podiumApplied: 'Pódio aplicado com sucesso.',
                    podiumApplyFail: 'Não foi possível aplicar o pódio.',
                    resetOnlyLocal: 'Redefinição de senha disponível apenas no modo local.',
                    registerOnlyLocal: 'Cadastro de usuários disponível apenas no modo local.',
                    selectUser: 'Selecione um usuário.',
                    mismatchPassword: 'As senhas não conferem.',
                    passwordUpdated: 'Senha atualizada com sucesso.',
                    passwordResetFor: (username) => `Senha redefinida para ${username}.`,
                    passwordResetFail: 'Falha ao redefinir senha.',
                    userCreated: (username) => `Usuário criado: ${username}.`,
                    userCreateFail: 'Falha ao criar usuário.',
                    accessDeniedAdmin: 'Esta ação é restrita a administradores.',
                    minName: 'Nome precisa ter pelo menos 3 caracteres.',
                    academyRequired: 'Informe a academia do atleta.',
                    athleteRegistered: (name) => `Atleta ${name} cadastrado.`,
                    athletesAssigned: 'Atletas vinculados ao evento.',
                    athleteAssignFail: 'Falha ao vincular atletas.',
                    pointsClearedFor: (name) => `Pontos limpos para ${name}`,
                    removeAthleteConfirm: (name) => `Excluir o atleta ${name}? Esta ação não pode ser desfeita.`,
                    athleteRemoved: (name) => `Atleta removido: ${name}.`,
                    athleteRemoveFail: 'Não foi possível remover o atleta.',
                    goldFor: (name) => `Ouro para ${name}`,
                    silverFor: (name) => `Prata para ${name}`,
                    bronzeFor: (name) => `Bronze para ${name}`,
                    newsTitleRequired: 'Informe o título da notícia.',
                    newsSummaryRequired: 'Informe o resumo da notícia.',
                    newsCreated: (title) => `Notícia publicada: ${title}.`,
                    newsCreateFail: 'Falha ao publicar notícia.',
                    newsDeleteConfirm: (title) => `Remover notícia "${title}"?`,
                    newsDeleted: 'Notícia removida.',
                    newsDeleteFail: 'Falha ao remover notícia.',
                    newsImageTypeInvalid: 'Selecione um arquivo de imagem válido (JPG, PNG, WEBP ou GIF).',
                    newsImageTooLarge: 'Imagem muito grande. Tamanho máximo de envio: 8 MB.',
                    newsImageReadFail: 'Falha ao processar a imagem selecionada.',
                    newsImageStillLarge: 'A imagem ainda ficou grande após a compressão. Escolha um arquivo menor.',
                    instagramRefreshDone: (count) => `Feed do Instagram atualizado (${count} posts).`,
                    instagramRefreshFail: 'Falha ao atualizar feed do Instagram.',
                    registrationLoadFail: 'Falha ao carregar inscrições públicas.',
                    registrationSyncDone: (synced, pending) => `Sincronização concluída: ${synced} enviadas, ${pending} pendentes.`,
                    registrationSyncFail: 'Falha ao sincronizar inscrições pendentes.',
                    registrationStatusUpdated: 'Status de pagamento atualizado.',
                    registrationStatusFail: 'Falha ao atualizar status de pagamento.',
                    registrationStatusAuthRequired: 'Sessão administrativa expirada. Faça login novamente para aprovar pagamentos.',
                    registrationStatusForbidden: 'Somente administradores podem aprovar ou reprovar pagamentos.',
                    proofOpenFail: 'Falha ao abrir o comprovante de pagamento.',
                    registrationExportDone: (count) => `${count} inscrições exportadas para planilha.`,
                    registrationExportNoData: 'Nenhuma inscrição disponível para exportar.',
                    registrationListingExportDone: (label) => `Relatório em PDF gerado: ${label}.`,
                    registrationListingExportFail: 'Falha ao gerar relatório de inscrições.',
                    registrationListingNoData: 'Nenhuma inscrição disponível para este evento/relatório.',
                    eventResourceMissing: 'Este evento ainda não possui este arquivo configurado.',
                    clearReimportLocksConfirm: (count) => `Limpar ${count} bloqueios de reimportação de inscrição?`,
                    reimportLocksCleared: (count) => `${count} bloqueios de reimportação removidos.`,
                    reimportLocksNone: 'Nenhum bloqueio de reimportação para limpar.'
                },
                nav: {
                    overview: 'Visão geral',
                    events: 'Eventos',
                    news: 'Notícias',
                    registrations: 'Inscrições',
                    brackets: 'Chaveamento',
                    schedule: 'Cronograma',
                    athletes: 'Atletas',
                    automation: 'Automações',
                    activity: 'Atividade',
                    superfights: 'Luta Casada'
                },
                common: {
                    close: 'Fechar',
                    cancel: 'Cancelar',
                    save: 'Salvar',
                    search: 'Pesquisar',
                    active: 'Ativo',
                    inactive: 'Inativo',
                    noEvent: 'Sem evento',
                    allEvents: 'Todos os eventos',
                    points: 'Pontos',
                    selected: 'selecionados',
                    noneFound: 'Nenhum encontrado',
                    update: 'Atualizar'
                },
                sidebar: {
                    title: 'Menu rápido',
                    activeAthletes: 'Atletas ativos',
                    totalPoints: 'Pontos totais',
                    registeredEvents: 'Eventos cadastrados',
                    newRegister: 'Novo cadastro'
                },
                hero: {
                    activeEvent: 'Evento ativo',
                    noActiveEvent: 'Sem evento ativo',
                    title: 'Painel de Controle',
                    subtitle: 'Acompanhe registros, ajustes e resultados do ranking com indicadores em tempo real e atalhos inteligentes para as rotinas administrativas.',
                    updatedAt: 'Atualizado às',
                    secureSessionFor: 'Sessão segura para',
                    average: 'Média',
                    newAthlete: 'Novo atleta',
                    logs: 'Logs',
                    menu: 'Menu',
                    rankingUpdated: 'Ranking atualizado',
                    athletes: 'atletas',
                    noLeader: 'Sem líder'
                },
                stats: {
                    enrolled: 'Inscritos',
                    activeTrend: 'ativos',
                    totalPoints: 'Pontos totais',
                    average: 'Média',
                    registeredEvents: 'Eventos cadastrados',
                    centralizedControl: 'Controle centralizado',
                    records: 'Registros',
                    continuousMonitoring: 'Monitoramento contínuo'
                },
                eventsPanel: {
                    title: 'Eventos',
                    subtitle: 'Crie eventos e organize atletas por etapa.',
                    createEvent: 'Criar evento',
                    noEvents: 'Nenhum evento cadastrado.',
                    openSection: 'Inscrições abertas',
                    openSectionSubtitle: 'Eventos que ainda aceitam inscrições.',
                    noOpenEvents: 'Nenhum evento com inscrição aberta.',
                    closedSection: 'Eventos passados / inscrições encerradas',
                    closedSectionSubtitle: 'Eventos fechados aparecem somente nesta seção.',
                    noClosedEvents: 'Nenhum evento encerrado ainda.',
                    date: 'Data',
                    undefinedDate: 'Data indefinida',
                    athletes: 'Atletas',
                    activeEvent: 'Evento ativo',
                    activate: 'Ativar',
                    manageAthletes: 'Gerenciar atletas',
                    edit: 'Editar',
                    registration: 'Inscrição',
                    closeRegistration: 'Encerrar inscrições',
                    closeRegistrationConfirmTitle: 'Confirmar encerramento de inscricoes',
                    closeRegistrationConfirmDescription: (name) => `Tem certeza que deseja encerrar as inscricoes de ${name || 'este evento'}? Os atletas nao poderao se inscrever ate voce reabrir.`,
                    closeRegistrationConfirmAction: 'Sim, encerrar inscricoes',
                    reopenRegistration: 'Reabrir inscrições',
                    closedRegistration: 'Inscrições encerradas',
                    noPoster: 'Sem cartaz',
                    open: 'Aberto',
                    closed: 'Fechado'
                },
                newsPanel: {
                    title: 'Notícias',
                    subtitle: 'Crie comunicados oficiais e publique direto na página de notícias.',
                    openNewsPage: 'Abrir página de notícias',
                    refreshSocial: 'Atualizar feed do Instagram',
                    lastInstagramRefresh: 'Instagram atualizado em',
                    instagramNeverUpdated: 'Ainda não sincronizado',
                    feedStatusCache: 'Cache',
                    feedStatusUpdatedNow: 'Atualizado agora',
                    titleLabel: 'Título',
                    titlePlaceholder: 'Ex: Inscrições da Etapa 2 abertas',
                    summaryLabel: 'Resumo',
                    summaryPlaceholder: 'Escreva um resumo curto para aparecer na página inicial e em notícias.',
                    imageLabel: 'URL da imagem de capa (opcional)',
                    imagePlaceholder: 'https://.../noticia-capa.jpg',
                    imageUploadHint: 'Ou envie uma imagem do computador',
                    imageUploadAction: 'Escolher imagem',
                    imageClearAction: 'Remover imagem',
                    imageSelectedFile: 'Arquivo selecionado',
                    imagePreviewLabel: 'Pré-visualização',
                    imageCompressionHint: 'A imagem enviada é comprimida automaticamente para economizar armazenamento.',
                    imageCompressedSize: 'Tamanho comprimido',
                    dateLabel: 'Data de publicação',
                    publish: 'Publicar notícia',
                    noNews: 'Nenhuma notícia publicada ainda.',
                    remove: 'Remover'
                },
                registrationsPanel: {
                    title: 'Inscrições públicas',
                    subtitle: 'Todas as inscrições recebidas pelo formulário público em um único painel.',
                    refresh: 'Atualizar',
                    syncNow: 'Sincronizar agora',
                    pendingLabel: 'Pendentes de sincronização',
                    filterPending: 'Mostrar apenas pendentes',
                    filterAll: 'Mostrar todos',
                    searchPlaceholder: 'Buscar por atleta, academia, telefone, e-mail ou anotações',
                    searchAria: 'Buscar inscrição',
                    eventFilter: 'Filtro de evento',
                    allEvents: 'Todos os eventos',
                    tablePhoto: 'Foto',
                    tableAthlete: 'Atleta',
                    tableEvent: 'Evento',
                    tableCategory: 'Categoria',
                    tableContact: 'Contato',
                    tablePayment: 'Pagamento',
                    tableNotes: 'Observações',
                    tablePipeline: 'Pipeline',
                    tableStatus: 'Status',
                    pipelineRegistered: 'Inscrito',
                    pipelineApproved: 'Aprovado',
                    pipelineCategory: 'Em categoria',
                    pipelineBracket: 'Em chave',
                    flowStatusDone: 'Aprovado e enviado para categoria e chaveamento.',
                    flowStatusCategory: 'Aprovado e enviado para categoria. Aguardando chaveamento.',
                    flowStatusApproved: 'Pagamento aprovado. Aguardando sincronização para categoria/chaveamento.',
                    flowStatusPaymentError: 'Pagamento com erro. Não enviado para categoria/chaveamento.',
                    flowStatusPending: 'Aguardando conferência de pagamento.',
                    totalValue: 'Total',
                    pixKey: 'Chave Pix',
                    receipt: 'Comprovante',
                    noReceipt: 'Sem comprovante',
                    noData: 'Nenhuma inscrição pública encontrada.',
                    noNotes: 'Sem observações',
                    noPhoto: 'Sem foto',
                    statusPendingSync: 'Pendente de sincronização',
                    statusDefault: 'Pendente',
                    statusPaymentConfirmed: 'Pagamento confirmado - Atleta ativo',
                    statusPaymentError: 'Erro no pagamento',
                    confirmPayment: 'Confirmar pagamento',
                    markPaymentError: 'Marcar erro no pagamento',
                    exportSpreadsheet: 'Exportar planilha',
                    updatedAt: 'Atualizado em',
                    totalRegistrations: 'inscrições',
                    reportAthletesByAcademyGi: 'Atletas por academia (GI)',
                    reportAthletesByCategoryGi: 'Atletas por categoria (GI)',
                    reportAthletesByAcademyNoGi: 'Atletas por academia (NO-GI)',
                    reportAthletesByCategoryNoGi: 'Atletas por categoria (NO-GI)',
                    reportWeightTableGi: 'Tabela de peso GI',
                    reportWeightTableNoGi: 'Tabela de peso NO-GI',
                    reportCircular: 'Circular do evento',
                    filterThisEvent: 'Mostrar este evento na tabela',
                    confirmReviewPrompt: 'Observação da conferência (opcional):',
                    errorReviewPrompt: 'Descreva o erro de pagamento (opcional):',
                    reviewedBy: 'Conferido por',
                    reviewedAt: 'Conferido em',
                    reviewNotes: 'Observação da conferência',
                    proofPreviewTitle: 'Prévia do comprovante',
                    proofPreviewPdf: 'Prévia PDF',
                    openReceipt: 'Abrir comprovante',
                    lastError: 'Erro de sincronização',
                    traceId: 'Trace',
                    syncMonitorLastFailure: (at) => `Última falha de sincronização: ${at}`
                },
                bracketsPanel: {
                    title: 'Chaveamento',
                    subtitle: 'Gere chaves por categoria e aplique o pódio automaticamente.',
                    workspaceTitle: 'Área do chaveamento',
                    workspaceSubtitle: 'Inscrições aprovadas são sincronizadas na base de atletas e ficam prontas para categoria e chave.',
                    quickFilter: 'Filtro rapido por academia',
                    allAcademies: 'Todas as academias',
                    exportApprovedCsv: 'Exportar CSV aprovados',
                    selectEvent: 'Selecionar evento',
                    selectEventAria: 'Selecionar evento para chaveamento',
                    selectCategoryAria: 'Selecionar categoria de chaveamento',
                    allCategories: 'Todas as categorias',
                    generate: 'Gerar chaves',
                    savePdf: 'Salvar PDF das chaves',
                    exportSchedulePdfTable: 'PDF Tabela',
                    exportSchedulePdfTv: 'PDF Modo TV',
                    searchPlaceholder: 'Buscar chave por número ou categoria',
                    searchAria: 'Buscar chave',
                    brackets: 'chaves',
                    bracket: 'Chave',
                    applied: 'Aplicado',
                    event: 'Evento',
                    athletes: 'Atletas',
                    round1: 'Rodada 1',
                    athlete: 'Atleta',
                    noAthleteBracket: 'Sem atletas nesta chave.',
                    podium: 'Pódio',
                    firstPlace: '1º lugar',
                    secondPlace: '2º lugar',
                    thirdPlace: '3º lugar',
                    selectAthlete: 'Selecionar atleta',
                    apply: 'Aplicar pódio',
                    reapply: 'Reaplicar pódio',
                    noBracketFound: 'Nenhuma chave encontrada.',
                    approvedAthletesTitle: 'Atletas aprovados',
                    approvedAthletesSubtitle: 'Atletas aprovados neste evento e vinculados ao fluxo administrativo.',
                    approvedAthletesEmpty: 'Nenhuma inscrição aprovada para este evento.',
                    academySummaryTitle: 'Atletas por academia',
                    academySummarySubtitle: 'Distribuição dos atletas aprovados por academia neste evento.',
                    academySummaryEmpty: 'Nenhuma academia com atletas aprovados ainda.',
                    statusApproved: 'Aprovado',
                    statusInCategory: 'Em categoria',
                    statusInBracket: 'Em chave',
                    statusPendingLink: 'Aguardando vínculo',
                    statsApproved: 'Aprovados',
                    statsInCategory: 'Em categoria',
                    statsInBracket: 'Em chave',
                    statsAcademies: 'Academias',
                    academyCount: (count) => `${count} atleta${count === 1 ? '' : 's'}`,
                    filteredLabel: (count, total) => `${count} de ${total}`,
                    scheduleTitle: 'Chaves & Cronograma',
                    scheduleSubtitle: 'Geracao automatica de chaves, organizacao por arrastar e soltar e estimativa em tempo real.',
                    scheduleAuto: 'Geracao automatica de chaves',
                    scheduleDrag: 'Arraste e solte para configurar suas chaves',
                    scheduleRealtime: 'Estimativa em tempo real',
                    scheduleTv: 'Modo TV para o cronograma',
                    scheduleStart: 'Hora inicial',
                    scheduleFightDuration: 'Duracao da luta (min)',
                    scheduleTransition: 'Intervalo (min)',
                    scheduleAreas: 'Areas',
                    scheduleTotalFights: 'Lutas estimadas',
                    scheduleTotalDuration: 'Duracao estimada',
                    scheduleEstimatedEnd: 'Termino previsto',
                    scheduleNoBrackets: 'Gere chaves para visualizar o cronograma.',
                    scheduleDragHint: 'Arraste os cards para reordenar o cronograma.',
                    scheduleRowRound: (count) => `${count} luta${count === 1 ? '' : 's'}`,
                    tvModeOpen: 'Modo TV',
                    tvModeClose: 'Fechar modo TV',
                    tvModeTitle: 'Cronograma ao vivo',
                    tvModeNow: 'Horario atual',
                    seedEditorTitle: 'Configurar chave (arraste atletas)',
                    seedEditorHint: 'Arraste os atletas para definir a ordem da rodada inicial.'
                },
                schedulePanel: {
                    title: 'Cronograma',
                    subtitle: 'Monte o cronograma manualmente, incluindo pausas e cerimonias.',
                    selectEvent: 'Selecionar evento',
                    selectEventAria: 'Selecionar evento para cronograma',
                    exportSchedulePdfTable: 'PDF Tabela',
                    exportSchedulePdfTv: 'PDF Modo TV',
                    tvModeOpen: 'Modo TV',
                    tvModeClose: 'Fechar modo TV',
                    tvModeTitle: 'Cronograma ao vivo',
                    tvModeNow: 'Horario atual',
                    addItemTitle: 'Novo item da linha do tempo',
                    itemTitle: 'Titulo',
                    itemType: 'Tipo',
                    itemArea: 'Area',
                    itemStart: 'Inicio',
                    itemEnd: 'Fim',
                    itemNotes: 'Observacoes (opcional)',
                    addItemAction: 'Adicionar item',
                    noItems: 'Nenhum item de cronograma para este evento.',
                    totalItems: 'Itens',
                    totalFights: 'Lutas',
                    totalDuration: 'Duracao estimada',
                    estimatedEnd: 'Termino previsto',
                    moveUp: 'Subir',
                    moveDown: 'Descer',
                    remove: 'Remover',
                    typeFight: 'Luta',
                    typeBreak: 'Pausa',
                    typeCeremony: 'Cerimonia',
                    typeOther: 'Outro'
                },
                beltSummary: {
                    title: 'Resumo por faixa',
                    subtitle: 'Distribuição de pontos por graduação',
                    updateTitle: 'Atualizado às'
                },
                athletesPanel: {
                    title: 'Base de atletas',
                    subtitle: 'Gerencie registros e ajuste pontuações rapidamente',
                    searchPlaceholder: 'Pesquisar por nome ou academia',
                    searchAria: 'Pesquisar atleta',
                    filterEventAria: 'Filtrar por evento',
                    noEvent: 'Sem evento',
                    listView: 'Visualização em lista',
                    cardView: 'Visualização em cards',
                    athlete: 'Atleta',
                    academy: 'Academia',
                    event: 'Evento',
                    contact: 'Contato',
                    profile: 'Perfil',
                    noProfile: 'Sem perfil de filiação',
                    noPhoto: 'Sem foto',
                    actions: 'Ações',
                    pointsPlaceholder: 'Pontos',
                    clearPointsAria: 'Limpar pontos',
                    registerGoldAria: 'Registrar ouro',
                    registerSilverAria: 'Registrar prata',
                    registerBronzeAria: 'Registrar bronze',
                    removeAthleteAria: 'Remover atleta',
                    clearBase: 'Limpar base de atletas',
                    clearReimportLocks: 'Limpar bloqueios de reimportação',
                    paginationPrev: 'Anterior',
                    paginationNext: 'Próxima',
                    paginationPerPage: 'Por página',
                    paginationPage: 'Página',
                    paginationShowing: (from, to, total) => `Mostrando ${from}-${to} de ${total}`,
                    belt: 'Faixa',
                    weight: 'Peso',
                    category: 'Categoria',
                    noAthleteFound: 'Nenhum atleta encontrado.'
                },
                automation: {
                    title: 'Automações e atalhos',
                    subtitle: 'Ferramentas organizadas para agilizar o trabalho',
                    fast: 'Rápido',
                    importFromPdf: 'Importar relação por PDF',
                    importDescription: 'Lê o PDF e separa nome, faixa, categoria e academia.',
                    importPdf: 'Importar PDF',
                    debugPreview: 'Debug preview (primeiras linhas)',
                    importFile: 'Importar arquivo',
                    importFileDesc: 'Abra o seletor de PDF/TXT para atualizar o ranking.',
                    select: 'Selecionar',
                    exportReport: 'Exportar relatório',
                    exportReportDesc: 'Gere o PDF oficial do evento ativo.',
                    generatePdf: 'Gerar PDF',
                    immediateControl: 'Controle imediato',
                    immediateControlDesc: 'Limpe resultados temporários e reinicie o painel.',
                    clear: 'Limpar',
                    safe: 'Seguro',
                    clearAthletes: 'Limpar atletas',
                    clearAthletesDesc: 'Remove todos os atletas cadastrados do sistema.',
                    clearAll: 'Limpar tudo',
                    caution: 'Cuidado',
                    keyboardTitle: 'Atalhos de teclado',
                    keyboardSubtitle: 'Acesso direto para tarefas frequentes',
                    shortcutNewAthlete: 'Ctrl + N novo atleta',
                    shortcutImport: 'Ctrl + I importar ranking',
                    shortcutExport: 'Ctrl + E exportar PDF',
                    shortcutLogs: 'Ctrl + L logs'
                },
                activity: {
                    title: 'Atividade do sistema',
                    subtitle: 'Auditoria em tempo real com logs recentes',
                    viewAll: 'Ver todos',
                    noRecent: 'Nenhum registro recente.',
                    secureSession: 'Sessão segura',
                    secureSessionSubtitle: 'Controle de acesso com confirmação visual',
                    endSession: 'Encerrar sessão',
                    localUsers: 'Usuários do painel',
                    localUsersDesc: 'Gerencie contas e permissões de acesso ao painel.',
                    noUser: 'Nenhum usuário cadastrado.',
                    resetPassword: 'Redefinir senha',
                    createUser: 'Criar usuário',
                    roleAdmin: 'ADM',
                    roleMesario: 'Mesário',
                    roleCoach: 'Professor',
                    roleAthlete: 'Atleta',
                    local: 'Local',
                    api: 'API'
                },
                modalLogs: {
                    title: 'Logs do sistema'
                },
                modalEventEdit: {
                    title: 'Editar evento',
                    eventName: 'Nome do evento',
                    eventNamePlaceholder: 'Ex: Etapa 1 - Regional',
                    date: 'Data',
                    location: 'Local',
                    locationPlaceholder: 'Ex: Arena Central',
                    posterUrl: 'URL da imagem do cartaz',
                    posterUrlPlaceholder: 'https://.../cartaz.jpg',
                    posterFile: 'Ou envie a imagem do cartaz',
                    posterCompressionHint: 'O cartaz enviado e comprimido automaticamente.',
                    posterCompressedSize: 'Tamanho comprimido',
                    registrationUrl: 'URL de inscrição',
                    registrationUrlPlaceholder: 'https://...',
                    weightTableGiUrl: 'URL da tabela de peso GI (imagem ou PDF)',
                    weightTableGiUrlPlaceholder: 'https://.../tabela-gi.jpg',
                    weightTableNoGiUrl: 'URL da tabela de peso NO-GI (imagem ou PDF)',
                    weightTableNoGiUrlPlaceholder: 'https://.../tabela-no-gi.jpg',
                    circularUrl: 'URL da circular do evento (opcional)',
                    circularUrlPlaceholder: 'https://.../circular.pdf',
                    weightTableGiOptions: 'Opções de peso GI (uma por linha)',
                    weightTableGiOptionsPlaceholder: 'Ex: Leve até 76,00',
                    weightTableNoGiOptions: 'Opções de peso NO-GI (uma por linha)',
                    weightTableNoGiOptionsPlaceholder: 'Ex: Médio até 82,30',
                    weightTableOcrFromUrl: 'Extrair com OCR pela URL',
                    weightTableOcrFromFile: 'Enviar arquivo e extrair',
                    weightTableOcrRunning: 'Executando OCR...',
                    weightTableOcrProgress: (value) => `Progresso do OCR: ${value}%`,
                    weightTableOcrSourceMissing: 'Informe a URL da tabela ou envie o arquivo.',
                    weightTableOcrNoOptions: 'OCR não detectou opções de peso válidas.',
                    weightTableOcrSuccess: (count) => `OCR concluído: ${count} opções extraídas.`,
                    pixKey: 'Chave Pix (responsável do campeonato)',
                    pixKeyPlaceholder: 'CPF / CNPJ / email / telefone / chave aleatória',
                    feeUnder15: 'Valor até 15 anos (GI/NO-GI)',
                    feeOver15: 'Valor acima de 15 anos (GI/NO-GI)',
                    feeCombo: 'Valor Combo GI + NO-GI',
                    feeAbsolute: 'Valor Absoluto GI / NO-GI',
                    registrationOpen: 'Inscrições abertas agora',
                    internalRegistration: 'Inscrição na nossa plataforma',
                    deleteEvent: 'Apagar evento',
                    saveChanges: 'Salvar alterações'
                },
                modalAthlete: {
                    title: 'Novo atleta',
                    fullName: 'Nome completo',
                    fullNamePlaceholder: 'Ex: Rodrigo Cavaca',
                    gender: 'Gênero',
                    genderMale: 'Masculino',
                    genderFemale: 'Feminino',
                    event: 'Evento',
                    noEvent: 'Sem evento',
                    graduation: 'Graduação',
                    age: 'Idade',
                    agePlaceholder: 'Ex: 25',
                    weight: 'Peso',
                    absoluteWeightPlaceholder: 'Absoluto',
                    weightPlaceholder: 'Ex: Pena',
                    selectWeight: 'Selecione...',
                    category: 'Categoria',
                    categoryPlaceholder: 'Ex: Adulto',
                    categoryType: 'Tipo de categoria',
                    typeWeight: 'Peso',
                    typeAbsolute: 'Absoluto',
                    modality: 'Modalidade',
                    modalityGi: 'GI (com pano)',
                    modalityNoGi: 'NO-GI (sem pano)',
                    teamAcademy: 'Equipe / Academia',
                    teamAcademyPlaceholder: 'Ex: Zenith JJ',
                    country: 'País',
                    countryPlaceholder: 'Ex: Brasil',
                    photoUrl: 'URL da foto (opcional)',
                    saveRegister: 'Salvar registro'
                },
                modalAssign: {
                    title: 'Gerenciar atletas',
                    eventPrefix: 'Evento',
                    subtitle: 'Selecionar move o atleta para este evento.',
                    searchPlaceholder: 'Pesquisar atleta',
                    searchAria: 'Pesquisar atleta',
                    selected: 'selecionados',
                    noAcademy: 'Sem academia',
                    current: 'Atual',
                    otherEvent: 'Outro evento',
                    noAthleteFound: 'Nenhum atleta encontrado.',
                    saveLink: 'Salvar vínculo'
                },
                modalReset: {
                    title: 'Redefinir senha',
                    noUser: 'Nenhum usuário disponível.',
                    user: 'Usuário',
                    newPassword: 'Nova senha',
                    confirmPassword: 'Confirmar senha',
                    updatePassword: 'Atualizar senha'
                },
                modalUserCreate: {
                    title: 'Criar usuário do painel',
                    name: 'Nome',
                    username: 'Usuário',
                    role: 'Papel',
                    password: 'Senha',
                    confirmPassword: 'Confirmar senha',
                    createUser: 'Criar usuário'
                }
            }
    ), [isEnglish]);
    const locale = useMemo(() => {
        if (languageVariant === 'pt') return 'pt-BR';
        if (languageVariant === 'es') return 'es-ES';
        if (languageVariant === 'fr') return 'fr-FR';
        return 'en-US';
    }, [languageVariant]);
    const currentUserRole = (currentUser?.role || '').toString().trim().toLowerCase();
    const isAdminUser = currentUserRole === 'admin';
    const canManagePanel = isAdminUser;
    const localizeBelt = useCallback(
        (value, fallback = copy.athletesPanel.belt) => translateBelt(value || fallback, uiLanguage),
        [copy.athletesPanel.belt, uiLanguage]
    );
    const localizeWeight = useCallback(
        (value, fallback = copy.athletesPanel.weight) => translateWeight(value || fallback, uiLanguage),
        [copy.athletesPanel.weight, uiLanguage]
    );
    const localizeCategory = useCallback(
        (value, fallback = copy.athletesPanel.category) => translateCategory(value || fallback, uiLanguage),
        [copy.athletesPanel.category, uiLanguage]
    );
    const localizeComposite = useCallback(
        (label) => translateCompositeLabel(label, uiLanguage),
        [uiLanguage]
    );
    const normalizePanelRole = useCallback((roleValue) => {
        const normalized = (roleValue || '').toString().trim().toLowerCase();
        if (normalized === 'admin' || normalized === 'adm') return 'admin';
        if (normalized === 'coach' || normalized === 'professor') return 'coach';
        if (normalized === 'mesario' || normalized === 'mesário') return 'mesario';
        return 'mesario';
    }, []);
    const localizeUserRole = useCallback((role) => {
        const normalized = (role || '').toString().trim().toLowerCase();
        if (normalized === 'admin' || normalized === 'adm') return copy.activity.roleAdmin;
        if (normalized === 'mesario' || normalized === 'mesário') return copy.activity.roleMesario;
        if (normalized === 'coach' || normalized === 'professor') return copy.activity.roleCoach;
        return copy.activity.roleAthlete;
    }, [copy.activity.roleAdmin, copy.activity.roleMesario, copy.activity.roleCoach, copy.activity.roleAthlete]);

    const translateLogAction = useCallback((action) => {
        if (!isEnglish) return action;
        const map = {
            LOGIN: 'Login',
            LOGOUT: 'Logout',
            LOGIN_SUCCESS: 'Login success',
            LOGIN_FAILURE: 'Login failure',
            REGISTER: 'Register',
            REGISTER_FAILURE: 'Register failure',
            RESET_PASSWORD: 'Password reset',
            RESET_PASSWORD_ADMIN: 'Admin password reset',
            RESET_PASSWORD_FAILURE: 'Password reset failure',
            ADD_EVENT: 'Add event',
            UPDATE_EVENT: 'Update event',
            DELETE_EVENT: 'Delete event',
            SET_ACTIVE_EVENT: 'Set active event',
            ASSIGN_EVENT: 'Assign event',
            ADD_ATHLETE: 'Add athlete',
            UPDATE_POINTS: 'Update points',
            SET_POINTS: 'Set points',
            RESET_POINTS: 'Reset points',
            GENERATE_BRACKETS: 'Generate brackets',
            APPLY_BRACKET: 'Apply bracket',
            CLEAR_ATHLETES: 'Clear athletes',
            BATCH: 'Batch import'
        };
        return map[action] || action;
    }, [isEnglish]);

    const translateLogDetails = useCallback((details) => {
        if (!isEnglish || !details) return details;
        const replacements = [
            [/Usuário/gi, 'User'],
            [/Usuário/gi, 'User'],
            [/Usuário/gi, 'User'],
            [/acessou o sistema/gi, 'accessed the system'],
            [/saiu/gi, 'logged out'],
            [/Evento criado/gi, 'Event created'],
            [/Evento atualizado/gi, 'Event updated'],
            [/Evento removido/gi, 'Event removed'],
            [/Evento ativo/gi, 'Active event'],
            [/Atletas vinculados ao evento/gi, 'Athletes linked to event'],
            [/Novo atleta/gi, 'New athlete'],
            [/Pontos limpos/gi, 'Points cleared'],
            [/Pontuação alterada/gi, 'Points updated'],
            [/Pontuacao alterada/gi, 'Points updated'],
            [/Pontos definidos manualmente/gi, 'Points manually set'],
            [/Importacao/gi, 'Import'],
            [/Importação/gi, 'Import'],
            [/inválidos/gi, 'invalid'],
            [/invalidos/gi, 'invalid'],
            [/duplicados/gi, 'duplicate'],
            [/Chaves geradas/gi, 'Brackets generated'],
            [/Pódio aplicado/gi, 'Podium applied'],
            [/Falha/gi, 'Failure'],
            [/Não encontrado/gi, 'Not found'],
            [/não encontrado/gi, 'Not found']
        ];
        return replacements.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), details);
    }, [isEnglish]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showLogs, setShowLogs] = useState(false);
    const [toast, setToast] = useState(null);
    const [navOpen, setNavOpen] = useState(false);
    const activeSection = useMemo(
        () => resolveAdminSectionFromPath(location.pathname, canManagePanel),
        [location.pathname, canManagePanel]
    );
    const [viewMode, setViewMode] = useState('table');
    const [athletesPage, setAthletesPage] = useState(1);
    const [athletesPageSize, setAthletesPageSize] = useState(ATHLETE_PAGE_SIZE_OPTIONS[0]);
    const [now, setNow] = useState(new Date());
    const importInputRef = useRef(null);
    const newsImageInputRef = useRef(null);
    const weightTableGiOcrFileRef = useRef(null);
    const weightTableNoGiOcrFileRef = useRef(null);
    const [importMode, setImportMode] = useState('GI');
    const [importStatus, setImportStatus] = useState('');
    const [importError, setImportError] = useState('');
    const [importDebug, setImportDebug] = useState('');
    const [manualInputs, setManualInputs] = useState({});
    const [eventFilter, setEventFilter] = useState(activeEventId || 'all');
    const [importEventId, setImportEventId] = useState(activeEventId || '');
    const [bracketEventId, setBracketEventId] = useState(activeEventId || '');
    const [bracketMode, setBracketMode] = useState('ALL');
    const [bracketSearch, setBracketSearch] = useState('');
    const [bracketAcademyFilter, setBracketAcademyFilter] = useState('all');
    const [bracketOrderByEvent, setBracketOrderByEvent] = useState({});
    const [draggingBracketId, setDraggingBracketId] = useState('');
    const [dragSeedContext, setDragSeedContext] = useState({ bracketId: '', athleteId: '' });
    const [scheduleEventId, setScheduleEventId] = useState(activeEventId || '');
    const [manualScheduleByEvent, setManualScheduleByEvent] = useState(loadManualScheduleByEvent);
    const [scheduleDraft, setScheduleDraft] = useState(createScheduleDraftState);
    const [showScheduleTvMode, setShowScheduleTvMode] = useState(false);
    const [showEventEditModal, setShowEventEditModal] = useState(false);
    const [eventModalTab, setEventModalTab] = useState('info');
    const [eventEditForm, setEventEditForm] = useState(createEventEditFormState);
    const [eventEditError, setEventEditError] = useState('');
    const [registrationCloseConfirmEvent, setRegistrationCloseConfirmEvent] = useState(null);
    const [eventPosterStoredSizeBytes, setEventPosterStoredSizeBytes] = useState(0);
    const [eventWeightOcrMode, setEventWeightOcrMode] = useState('');
    const [eventWeightOcrProgress, setEventWeightOcrProgress] = useState(0);
    const [newsForm, setNewsForm] = useState(createNewsFormState);
    const [newsImageName, setNewsImageName] = useState('');
    const [newsImageStoredSizeBytes, setNewsImageStoredSizeBytes] = useState(0);
    const [newsError, setNewsError] = useState('');
    const [instagramRefreshing, setInstagramRefreshing] = useState(false);
    const [instagramLastUpdatedAt, setInstagramLastUpdatedAt] = useState(loadInstagramLastRefresh);
    const [instagramFeedStatus, setInstagramFeedStatus] = useState(loadInstagramFeedStatus);
    const [newAthlete, setNewAthlete] = useState({
        nome: '',
        genero: 'Masculino',
        faixa: 'Branca',
        idade: '',
        peso: '',
        categoria: 'Adulto',
        academia: '',
        pais: 'Brasil',
        photoUrl: '',
        isNoGi: false,
        isAbsolute: false,
        eventId: activeEventId || ''
    });
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignEvent, setAssignEvent] = useState(null);
    const [assignSelection, setAssignSelection] = useState({});
    const [assignSearch, setAssignSearch] = useState('');
    const [showUserResetModal, setShowUserResetModal] = useState(false);
    const [userResetList, setUserResetList] = useState([]);
    const [userResetUsername, setUserResetUsername] = useState('');
    const [userResetPassword, setUserResetPassword] = useState('');
    const [userResetConfirm, setUserResetConfirm] = useState('');
    const [userResetError, setUserResetError] = useState('');
    const [userResetSuccess, setUserResetSuccess] = useState('');
    const [userResetLoading, setUserResetLoading] = useState(false);
    const [showUserCreateModal, setShowUserCreateModal] = useState(false);
    const [userCreateName, setUserCreateName] = useState('');
    const [userCreateUsername, setUserCreateUsername] = useState('');
    const [userCreatePassword, setUserCreatePassword] = useState('');
    const [userCreateConfirm, setUserCreateConfirm] = useState('');
    const [userCreateRole, setUserCreateRole] = useState('coach');
    const [userCreateError, setUserCreateError] = useState('');
    const [userCreateSuccess, setUserCreateSuccess] = useState('');
    const [userCreateLoading, setUserCreateLoading] = useState(false);
    const [showUserEditModal, setShowUserEditModal] = useState(false);
    const [userEditId, setUserEditId] = useState('');
    const [userEditName, setUserEditName] = useState('');
    const [userEditUsername, setUserEditUsername] = useState('');
    const [userEditRole, setUserEditRole] = useState('coach');
    const [userEditError, setUserEditError] = useState('');
    const [userEditSuccess, setUserEditSuccess] = useState('');
    const [userEditLoading, setUserEditLoading] = useState(false);
    const [userEditPassword, setUserEditPassword] = useState('');
    const [superfightForm, setSuperfightForm] = useState(null);
    const [userDeleteLoadingId, setUserDeleteLoadingId] = useState('');
    const [panelUsers, setPanelUsers] = useState([]);
    const [panelUsersLoading, setPanelUsersLoading] = useState(false);
    const [publicRegistrations, setPublicRegistrations] = useState([]);
    const [registrationSearch, setRegistrationSearch] = useState('');
    const [registrationEventFilter, setRegistrationEventFilter] = useState('all');
    const [registrationPendingOnly, setRegistrationPendingOnly] = useState(false);
    const [registrationPendingFilterTouched, setRegistrationPendingFilterTouched] = useState(false);
    const [registrationsLoading, setRegistrationsLoading] = useState(false);
    const [registrationsSyncing, setRegistrationsSyncing] = useState(false);
    const [registrationsError, setRegistrationsError] = useState('');
    const [registrationStatusUpdatingId, setRegistrationStatusUpdatingId] = useState('');
    const [syncDiagnostics, setSyncDiagnostics] = useState(() => publicRegistrationService.getSyncDiagnostics());
    const [suppressedRegistrationKeys, setSuppressedRegistrationKeys] = useState(loadSuppressedRegistrationKeys);
    const deferredSearchTerm = useDeferredValue(searchTerm);
    const deferredRegistrationSearch = useDeferredValue(registrationSearch);
    const userResetPasswordStrength = useMemo(
        () => evaluatePasswordStrength(userResetPassword, locale),
        [userResetPassword, locale]
    );
    const userCreatePasswordStrength = useMemo(
        () => evaluatePasswordStrength(userCreatePassword, locale),
        [userCreatePassword, locale]
    );
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        description: '',
        confirmLabel: '',
        cancelLabel: '',
        variant: 'danger'
    });
    const confirmResolverRef = useRef(null);

    const closeConfirmDialog = useCallback((confirmed = false) => {
        const resolver = confirmResolverRef.current;
        confirmResolverRef.current = null;
        if (typeof resolver === 'function') {
            resolver(Boolean(confirmed));
        }
        setConfirmDialog({
            isOpen: false,
            title: '',
            description: '',
            confirmLabel: '',
            cancelLabel: '',
            variant: 'danger'
        });
    }, []);

    const requestConfirmDialog = useCallback((options = {}) => (
        new Promise((resolve) => {
            confirmResolverRef.current = resolve;
            setConfirmDialog({
                isOpen: true,
                title: options.title || (isEnglish ? 'Confirm action' : 'Confirmar acao'),
                description: options.description || '',
                confirmLabel: options.confirmLabel || (isEnglish ? 'Confirm' : 'Confirmar'),
                cancelLabel: options.cancelLabel || copy.common.cancel,
                variant: options.variant || 'danger'
            });
        })
    ), [isEnglish, copy.common.cancel]);

    const showFeedback = useCallback((type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const refreshSyncDiagnostics = useCallback(() => {
        setSyncDiagnostics(publicRegistrationService.getSyncDiagnostics());
    }, []);

    const loadPanelUsers = useCallback(async () => {
        if (!canManagePanel) {
            setPanelUsers([]);
            return [];
        }

        setPanelUsersLoading(true);
        try {
            const users = authService.listAdminUsers
                ? await authService.listAdminUsers()
                : (authService.listUsers ? authService.listUsers() : []);
            const filteredUsers = (Array.isArray(users) ? users : []).filter((user) => {
                const role = (user?.role || '').toString().trim().toLowerCase();
                return role === 'admin' || role === 'adm' || role === 'mesario' || role === 'mesário' || role === 'coach' || role === 'professor';
            });
            setPanelUsers(filteredUsers);
            return filteredUsers;
        } catch (err) {
            const message = err?.message || (isEnglish ? 'Failed to load panel users.' : 'Falha ao carregar usuários do painel.');
            showFeedback('error', message);
            setPanelUsers([]);
            return [];
        } finally {
            setPanelUsersLoading(false);
        }
    }, [canManagePanel, showFeedback, isEnglish]);

    useEffect(() => {
        if (!canManagePanel) {
            setPanelUsers([]);
            return;
        }
        loadPanelUsers();
    }, [canManagePanel, loadPanelUsers]);

    useEffect(() => {
        saveSuppressedRegistrationKeys(suppressedRegistrationKeys);
    }, [suppressedRegistrationKeys]);

    useEffect(() => {
        saveInstagramLastRefresh(instagramLastUpdatedAt);
    }, [instagramLastUpdatedAt]);

    useEffect(() => {
        saveInstagramFeedStatus(instagramFeedStatus);
    }, [instagramFeedStatus]);

    useEffect(() => {
        saveManualScheduleByEvent(manualScheduleByEvent);
    }, [manualScheduleByEvent]);

    useEffect(() => {
        if (instagramLastUpdatedAt) return undefined;
        let cancelled = false;

        const loadInstagramMeta = async () => {
            try {
                const result = await socialMediaService.fetchInstagramFeed(1);
                const lastUpdated = (result?.lastUpdatedAt || '').toString().trim();
                const status = (result?.status || '').toString().trim().toUpperCase();
                if (!cancelled && lastUpdated) {
                    setInstagramLastUpdatedAt(lastUpdated);
                }
                if (!cancelled && status) {
                    setInstagramFeedStatus(status);
                }
            } catch {
                // Ignore metadata bootstrap failures.
            }
        };

        loadInstagramMeta();
        return () => {
            cancelled = true;
        };
    }, [instagramLastUpdatedAt]);

    const addSuppressedRegistrationKeys = useCallback((keys) => {
        const normalized = (Array.isArray(keys) ? keys : [keys])
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean);
        if (!normalized.length) return;

        setSuppressedRegistrationKeys((prev) => {
            const next = new Set(prev);
            normalized.forEach((key) => next.add(key));
            if (next.size === prev.length) return prev;
            return [...next];
        });
    }, []);

    const removeSuppressedRegistrationKey = useCallback((key) => {
        const normalized = typeof key === 'string' ? key.trim() : '';
        if (!normalized) return;
        setSuppressedRegistrationKeys((prev) => (
            prev.includes(normalized)
                ? prev.filter((item) => item !== normalized)
                : prev
        ));
    }, []);

    const handleFinalizeEvent = useCallback(async () => {
        if (!activeEventId) {
            showFeedback('error', copy.feedback.activateEventForReport);
            return;
        }

        const eventMeta = events.find((event) => event.id === activeEventId);
        const eventAthletes = athletes.filter((athlete) => athlete.eventId === activeEventId);

        if (!eventAthletes.length) {
            showFeedback('error', copy.feedback.noAthletesOnActiveEvent);
            return;
        }

        try {
            await generateRankingPDF(eventAthletes, {
                eventName: eventMeta?.name || copy.bracketsPanel.event,
                eventDate: eventMeta?.date || '',
                eventLocation: eventMeta?.location || ''
            });
            showFeedback('success', copy.feedback.reportGenerated(eventMeta?.name));
            clearEventResults();
        } catch (err) {
            const message = err?.message || copy.feedback.reportFail;
            console.error('PDF export error:', err);
            showFeedback('error', message);
        }
    }, [activeEventId, athletes, clearEventResults, events, showFeedback, copy.feedback, copy.bracketsPanel.event]);

    const handleOpenEditEvent = useCallback((eventItem) => {
        if (!eventItem) return;
        setEventEditError('');
        setEventWeightOcrMode('');
        setEventWeightOcrProgress(0);
        const posterUrl = eventItem.posterUrl || '';
        setEventEditForm({
            ...createEventEditFormState(),
            ...eventItem,
            posterUrl,
            pixKey: eventItem.pixKey || DEFAULT_EVENT_PIX_KEY,
            feeUnder15: eventItem.feeUnder15 ?? DEFAULT_EVENT_FEES.under15,
            feeOver15: eventItem.feeOver15 ?? DEFAULT_EVENT_FEES.over15,
            feeCombo: eventItem.feeCombo ?? DEFAULT_EVENT_FEES.combo,
            feeAbsolute: eventItem.feeAbsolute ?? DEFAULT_EVENT_FEES.absolute,
            registrationOpen: eventItem.registrationOpen !== false,
            internalRegistration: eventItem.internalRegistration !== false
        });
        setEventPosterStoredSizeBytes(isDataImageUrl(posterUrl) ? estimateDataUrlBytes(posterUrl) : 0);
        setShowEventEditModal(true);
    }, []);

    const handleCloseEditEvent = useCallback(() => {
        setShowEventEditModal(false);
        setEventEditError('');
        setEventWeightOcrMode('');
        setEventWeightOcrProgress(0);
        setEventPosterStoredSizeBytes(0);
        setEventEditForm(createEventEditFormState());
        setEventModalTab('info');
    }, []);

    const closeRegistrationConfirmModal = useCallback(() => {
        setRegistrationCloseConfirmEvent(null);
    }, []);

    const handleUpdateEvent = useCallback(async (event) => {
        event.preventDefault();
        setEventEditError('');
        try {
            const updated = await updateEvent(eventEditForm.id, {
                name: eventEditForm.name,
                date: eventEditForm.date,
                endDate: eventEditForm.endDate,
                location: eventEditForm.location,
                eventDescription: eventEditForm.eventDescription,
                posterUrl: eventEditForm.posterUrl,
                registrationUrl: eventEditForm.registrationUrl,
                weightTableGiUrl: eventEditForm.weightTableGiUrl,
                weightTableNoGiUrl: eventEditForm.weightTableNoGiUrl,
                circularUrl: eventEditForm.circularUrl,
                weightTableGiOptions: eventEditForm.weightTableGiOptions,
                weightTableNoGiOptions: eventEditForm.weightTableNoGiOptions,
                pixKey: eventEditForm.pixKey,
                feeUnder15: eventEditForm.feeUnder15,
                feeOver15: eventEditForm.feeOver15,
                feeCombo: eventEditForm.feeCombo,
                feeAbsolute: eventEditForm.feeAbsolute,
                beltRegistrationEnabled: eventEditForm.beltRegistrationEnabled,
                beltRegistrationTitle: eventEditForm.beltRegistrationTitle,
                beltRegistrationPrice: eventEditForm.beltRegistrationPrice,
                beltRegistrationDescription: eventEditForm.beltRegistrationDescription,
                beltRegistrationPhone: eventEditForm.beltRegistrationPhone,
                maxAthletes: eventEditForm.maxAthletes,
                prizesDescription: eventEditForm.prizesDescription,
                liabilityWaiver: eventEditForm.liabilityWaiver,
                mapIframeUrl: eventEditForm.mapIframeUrl,
                closeOnCapacity: eventEditForm.closeOnCapacity,
                accommodationEnabled: eventEditForm.accommodationEnabled,
                accommodationTitle: eventEditForm.accommodationTitle,
                accommodationDescription: eventEditForm.accommodationDescription,
                accommodationSearchLocation: eventEditForm.accommodationSearchLocation,
                batches: eventEditForm.batches,
                superFights: eventEditForm.superFights,
                superFightsPublished: eventEditForm.superFightsPublished,
                registrationOpen: eventEditForm.registrationOpen,
                internalRegistration: eventEditForm.internalRegistration
            });
            showFeedback('success', copy.feedback.eventUpdated(updated?.name));
            handleCloseEditEvent();
        } catch (err) {
            const message = err?.message || copy.feedback.eventUpdateFail;
            setEventEditError(message);
            showFeedback('error', message);
        }
    }, [eventEditForm, updateEvent, showFeedback, handleCloseEditEvent, copy.feedback]);

    const handleToggleEventRegistration = useCallback((eventItem) => {
        if (!eventItem?.id) return;
        const isCurrentlyOpen = eventItem.registrationOpen !== false;
        if (isCurrentlyOpen) {
            setRegistrationCloseConfirmEvent(eventItem);
            return;
        }
        const nextRegistrationOpen = true;
        try {
            const updated = updateEvent(eventItem.id, {
                registrationOpen: nextRegistrationOpen
            });
            showFeedback(
                'success',
                nextRegistrationOpen
                    ? copy.feedback.eventReopened(updated?.name || eventItem?.name)
                    : copy.feedback.eventClosed(updated?.name || eventItem?.name)
            );
        } catch (err) {
            const message = err?.message || copy.feedback.eventUpdateFail;
            showFeedback('error', message);
        }
    }, [updateEvent, showFeedback, copy.feedback]);

    const handleConfirmCloseEventRegistration = useCallback(() => {
        const eventItem = registrationCloseConfirmEvent;
        if (!eventItem?.id) {
            setRegistrationCloseConfirmEvent(null);
            return;
        }
        try {
            const updated = updateEvent(eventItem.id, {
                registrationOpen: false
            });
            showFeedback('success', copy.feedback.eventClosed(updated?.name || eventItem?.name));
        } catch (err) {
            const message = err?.message || copy.feedback.eventUpdateFail;
            showFeedback('error', message);
        } finally {
            setRegistrationCloseConfirmEvent(null);
        }
    }, [registrationCloseConfirmEvent, updateEvent, showFeedback, copy.feedback]);

    const handleEventEditPosterUrlChange = useCallback((event) => {
        const value = event.target.value;
        setEventEditForm((prev) => ({ ...prev, posterUrl: value }));
        setEventPosterStoredSizeBytes(isDataImageUrl(value) ? estimateDataUrlBytes(value) : 0);
    }, []);

    const handleAddBatchEdit = useCallback(() => {
        setEventEditForm((prev) => ({
            ...prev,
            batches: [
                ...(prev.batches || []),
                {
                    id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
                    name: `Lote ${(prev.batches?.length || 0) + 1}`,
                    startDate: '',
                    endDate: '',
                    feeUnder15: prev.feeUnder15 || 0,
                    feeOver15: prev.feeOver15 || 0,
                    feeCombo: prev.feeCombo || 0,
                    feeAbsolute: prev.feeAbsolute || 0,
                }
            ]
        }));
    }, []);

    const handleRemoveBatchEdit = useCallback((indexToRemove) => {
        setEventEditForm((prev) => ({
            ...prev,
            batches: (prev.batches || []).filter((_, idx) => idx !== indexToRemove)
        }));
    }, []);

    const handleBatchChangeEdit = useCallback((index, field, value) => {
        setEventEditForm((prev) => {
            const newBatches = [...(prev.batches || [])];
            newBatches[index] = { ...newBatches[index], [field]: value };
            return { ...prev, batches: newBatches };
        });
    }, []);

    const handleEventEditPosterFile = useCallback(async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!/^image\//i.test(file.type || '')) {
            const message = copy.feedback.eventPosterTypeInvalid;
            setEventEditError(message);
            showFeedback('error', message);
            event.target.value = '';
            return;
        }

        if (file.size > MAX_EVENT_POSTER_UPLOAD_BYTES) {
            const message = copy.feedback.eventPosterUploadTooLarge;
            setEventEditError(message);
            showFeedback('error', message);
            event.target.value = '';
            return;
        }

        try {
            const compressed = await compressEventPosterFile(file);
            if (!compressed?.dataUrl || compressed.bytes > MAX_EVENT_POSTER_STORED_BYTES) {
                const message = copy.feedback.eventPosterTooLargeAfterCompression;
                setEventEditError(message);
                showFeedback('error', message);
                return;
            }
            setEventEditForm((prev) => ({ ...prev, posterUrl: compressed.dataUrl }));
            setEventPosterStoredSizeBytes(compressed.bytes || 0);
            setEventEditError('');
        } catch {
            const message = copy.feedback.eventPosterReadFail;
            setEventEditError(message);
            showFeedback('error', message);
        } finally {
            event.target.value = '';
        }
    }, [copy.feedback, showFeedback]);

    const handleRunWeightTableOcr = useCallback(async (mode, file = null) => {
        const normalizedMode = mode === 'NO-GI' ? 'NO-GI' : 'GI';
        const targetUrl = normalizedMode === 'GI'
            ? (eventEditForm.weightTableGiUrl || '')
            : (eventEditForm.weightTableNoGiUrl || '');
        const optionField = normalizedMode === 'GI' ? 'weightTableGiOptions' : 'weightTableNoGiOptions';

        if (!file && !targetUrl.trim()) {
            const message = copy.modalEventEdit.weightTableOcrSourceMissing;
            setEventEditError(message);
            showFeedback('error', message);
            return;
        }

        setEventEditError('');
        setEventWeightOcrMode(normalizedMode);
        setEventWeightOcrProgress(0);

        const handleProgress = (state) => {
            const value = Math.round(Number(state?.progress || 0));
            if (!Number.isFinite(value)) return;
            setEventWeightOcrProgress(Math.max(0, Math.min(100, value)));
        };

        try {
            const result = file
                ? await extractWeightOptionsFromFile(file, { onProgress: handleProgress })
                : await extractWeightOptionsFromUrl(targetUrl, { onProgress: handleProgress });
            const options = Array.isArray(result?.options) ? result.options.filter(Boolean) : [];
            if (!options.length) {
                const message = copy.modalEventEdit.weightTableOcrNoOptions;
                setEventEditError(message);
                showFeedback('error', message);
                return;
            }

            setEventEditForm((prev) => ({
                ...prev,
                [optionField]: options.join('\n')
            }));
            setEventWeightOcrProgress(100);
            showFeedback('success', copy.modalEventEdit.weightTableOcrSuccess(options.length));
        } catch (err) {
            const message = err?.message || copy.modalEventEdit.weightTableOcrNoOptions;
            setEventEditError(message);
            showFeedback('error', message);
        } finally {
            setTimeout(() => {
                setEventWeightOcrMode('');
                setEventWeightOcrProgress(0);
            }, 600);
        }
    }, [
        eventEditForm.weightTableGiUrl,
        eventEditForm.weightTableNoGiUrl,
        copy.modalEventEdit,
        showFeedback
    ]);

    const handleWeightTableOcrFileChange = useCallback((mode, event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        handleRunWeightTableOcr(mode, file);
    }, [handleRunWeightTableOcr]);

    const handleDeleteEvent = useCallback(async () => {
        if (!eventEditForm.id) return;
        const name = eventEditForm.name || (isEnglish ? 'selected event' : 'evento selecionado');
        const confirmed = await requestConfirmDialog({
            title: isEnglish ? 'Delete event' : 'Excluir evento',
            description: copy.feedback.removeEventConfirm(name),
            confirmLabel: isEnglish ? 'Delete' : 'Excluir',
            variant: 'danger'
        });
        if (!confirmed) return;
        try {
            deleteEvent(eventEditForm.id);
            showFeedback('success', copy.feedback.eventRemoved);
            handleCloseEditEvent();
        } catch (err) {
            const message = err?.message || copy.feedback.eventRemoveFail;
            setEventEditError(message);
            showFeedback('error', message);
        }
    }, [eventEditForm.id, eventEditForm.name, deleteEvent, showFeedback, handleCloseEditEvent, copy.feedback, isEnglish, requestConfirmDialog]);

    const handleImportRanking = useCallback(() => {
        importInputRef.current?.click();
    }, []);

    const handleClearAthletes = useCallback(async () => {
        const confirmed = await requestConfirmDialog({
            title: isEnglish ? 'Clear athletes' : 'Limpar atletas',
            description: copy.feedback.clearAthletesConfirm,
            confirmLabel: isEnglish ? 'Clear' : 'Limpar',
            variant: 'danger'
        });
        if (confirmed) {
            const keysToSuppress = athletes
                .map((athlete) => buildAthleteRegistrationIdentityKey(athlete))
                .filter(Boolean);
            addSuppressedRegistrationKeys(keysToSuppress);
            clearAthletes();
            showFeedback('success', copy.feedback.allAthletesRemoved);
        }
    }, [athletes, addSuppressedRegistrationKeys, clearAthletes, showFeedback, copy.feedback, requestConfirmDialog, isEnglish]);

    const handleClearReimportLocks = useCallback(async () => {
        if (!suppressedRegistrationKeys.length) {
            showFeedback('success', copy.feedback.reimportLocksNone);
            return;
        }
        const confirmed = await requestConfirmDialog({
            title: isEnglish ? 'Clear reimport locks' : 'Limpar bloqueios de reimportacao',
            description: copy.feedback.clearReimportLocksConfirm(suppressedRegistrationKeys.length),
            confirmLabel: isEnglish ? 'Clear' : 'Limpar',
            variant: 'danger'
        });
        if (!confirmed) return;
        setSuppressedRegistrationKeys([]);
        showFeedback('success', copy.feedback.reimportLocksCleared(suppressedRegistrationKeys.length));
    }, [suppressedRegistrationKeys, showFeedback, copy.feedback, requestConfirmDialog, isEnglish]);

    const handleRemoveAthlete = useCallback(async (athlete) => {
        if (!athlete?.id) return;
        const athleteName = athlete.nome || (isEnglish ? 'selected athlete' : 'atleta selecionado');
        const confirmed = await requestConfirmDialog({
            title: isEnglish ? 'Remove athlete' : 'Remover atleta',
            description: copy.feedback.removeAthleteConfirm(athleteName),
            confirmLabel: isEnglish ? 'Remove' : 'Remover',
            variant: 'danger'
        });
        if (!confirmed) return;

        try {
            const identityKey = buildAthleteRegistrationIdentityKey(athlete);
            if (identityKey) addSuppressedRegistrationKeys([identityKey]);
            removeAthlete(athlete.id);
            setManualInputs((prev) => {
                const next = { ...prev };
                delete next[athlete.id];
                return next;
            });
            showFeedback('success', copy.feedback.athleteRemoved(athleteName));
        } catch (err) {
            showFeedback('error', err?.message || copy.feedback.athleteRemoveFail);
        }
    }, [addSuppressedRegistrationKeys, removeAthlete, showFeedback, copy.feedback, isEnglish, requestConfirmDialog]);

    const handleImportFile = useCallback(async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImportError('');
        setImportStatus('Lendo arquivo...');
        setImportDebug('');

        try {
            const isText = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');
            const text = isText ? await file.text() : await extractTextFromPdfFile(file);
            const cleanedText = text.replace(/\s+/g, '').trim();

            if (!cleanedText) {
                setImportError(copy.feedback.noTextPdf);
                setImportStatus('');
                showFeedback('error', copy.feedback.noTextImport);
                return;
            }

            const parsed = parseAthletesFromText(text, importMode);

            if (!parsed.length) {
                setImportError(copy.feedback.noAthleteInFile);
                setImportDebug(buildImportDebug(text));
                console.log('PDF import debug preview:\n', buildImportDebug(text));
                setImportStatus('');
                showFeedback('error', copy.feedback.noValidAthleteImport);
                return;
            }

            const result = importAthletes(parsed, { eventId: importEventId || activeEventId || '' });
            const importedCount = result?.imported ?? parsed.length;
            setImportStatus(`${importedCount} atletas importados.`);
            showFeedback('success', `${importedCount} atletas importados.`);
        } catch (err) {
            setImportError(err?.message || copy.feedback.importReadFail);
            setImportStatus('');
            showFeedback('error', copy.feedback.importReadFail);
        } finally {
            event.target.value = '';
            setTimeout(() => {
                setImportStatus('');
                setImportError('');
            }, 4000);
        }
    }, [importAthletes, importMode, importEventId, activeEventId, showFeedback, copy.feedback]);

    const handleManualInputChange = useCallback((id, value) => {
        setManualInputs((prev) => ({ ...prev, [id]: value }));
    }, []);

    const handleManualPoints = useCallback((id) => {
        const rawValue = manualInputs[id];
        const parsed = Number(rawValue);
        if (!Number.isFinite(parsed) || parsed < 0) {
            showFeedback('error', copy.feedback.invalidManualPoints);
            return;
        }
        const ok = setManualPoints(id, parsed);
        if (ok) {
            showFeedback('success', copy.feedback.manualPointsUpdated);
            setManualInputs((prev) => ({ ...prev, [id]: '' }));
        } else {
            showFeedback('error', copy.feedback.manualPointsFail);
        }
    }, [manualInputs, setManualPoints, showFeedback, copy.feedback]);

    const handleRefreshBeltSummary = useCallback(() => {
        setNow(new Date());
        showFeedback('success', copy.feedback.beltSummaryUpdated);
    }, [showFeedback, copy.feedback]);

    const eventMap = useMemo(() => (
        events.reduce((acc, event) => {
            acc[event.id] = event;
            return acc;
        }, {})
    ), [events]);

    const athleteMap = useMemo(() => (
        new Map(athletes.map((athlete) => [athlete.id, athlete]))
    ), [athletes]);

    const parsedPublicRegistrations = useMemo(() => (
        publicRegistrations
            .map((item) => parseRegistrationRecord(item, eventMap, copy))
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    ), [publicRegistrations, eventMap, copy]);

    const latestRegistrationDecisions = useMemo(() => {
        const decisionMap = new Map();
        parsedPublicRegistrations.forEach((item) => {
            const key = buildRegistrationIdentityKey(item);
            if (!key) return;
            const current = decisionMap.get(key);
            if (!current) {
                decisionMap.set(key, item);
                return;
            }
            const currentIsDecisive = current.isPaymentConfirmed || current.isPaymentError;
            const nextIsDecisive = item.isPaymentConfirmed || item.isPaymentError;

            // Never let a new pending row override an already reviewed decision.
            if (currentIsDecisive && !nextIsDecisive) return;
            if (!currentIsDecisive && nextIsDecisive) {
                decisionMap.set(key, item);
                return;
            }

            const currentTime = currentIsDecisive
                ? getRegistrationDecisionTimestamp(current)
                : new Date(current.createdAt || 0).getTime();
            const nextTime = nextIsDecisive
                ? getRegistrationDecisionTimestamp(item)
                : new Date(item.createdAt || 0).getTime();

            if (nextTime >= currentTime) decisionMap.set(key, item);
        });
        return [...decisionMap.values()];
    }, [parsedPublicRegistrations]);

    const filteredBrackets = useMemo(() => {
        const term = bracketSearch.trim().toLowerCase();
        const numberTerm = Number(term);
        const hasNumber = term.length > 0 && Number.isFinite(numberTerm);
        return brackets
            .filter((bracket) => (
                !bracketEventId
                || bracket.eventId === bracketEventId
            ))
            .filter((bracket) => (
                bracketMode === 'ALL' || bracket.mode === bracketMode
            ))
            .filter((bracket) => {
                if (!term) return true;
                const labelMatch = (bracket.label || '').toLowerCase().includes(term);
                const numberMatch = hasNumber ? bracket.number === numberTerm : false;
                return labelMatch || numberMatch;
            })
            .sort((a, b) => (a.number || 0) - (b.number || 0));
    }, [brackets, bracketEventId, bracketMode, bracketSearch]);

    const orderedFilteredBrackets = useMemo(() => {
        if (!filteredBrackets.length) return [];
        if (!bracketEventId) return filteredBrackets;

        const orderForEvent = Array.isArray(bracketOrderByEvent[bracketEventId])
            ? bracketOrderByEvent[bracketEventId]
            : [];
        const visibleMap = new Map(filteredBrackets.map((bracket) => [bracket.id, bracket]));
        const ordered = [];

        orderForEvent.forEach((bracketId) => {
            if (!visibleMap.has(bracketId)) return;
            ordered.push(visibleMap.get(bracketId));
            visibleMap.delete(bracketId);
        });

        const remaining = [...visibleMap.values()].sort((a, b) => (a.number || 0) - (b.number || 0));
        return [...ordered, ...remaining];
    }, [filteredBrackets, bracketEventId, bracketOrderByEvent]);

    const scheduleTypeLabel = useCallback((type) => {
        const normalized = normalizeScheduleType(type);
        if (normalized === 'BREAK') return copy.schedulePanel.typeBreak;
        if (normalized === 'CEREMONY') return copy.schedulePanel.typeCeremony;
        if (normalized === 'OTHER') return copy.schedulePanel.typeOther;
        return copy.schedulePanel.typeFight;
    }, [
        copy.schedulePanel.typeBreak,
        copy.schedulePanel.typeCeremony,
        copy.schedulePanel.typeOther,
        copy.schedulePanel.typeFight
    ]);

    const manualScheduleRows = useMemo(() => {
        if (!scheduleEventId) return [];
        const rows = Array.isArray(manualScheduleByEvent[scheduleEventId])
            ? manualScheduleByEvent[scheduleEventId]
            : [];
        return rows
            .map((row, index) => normalizeManualScheduleEntry(row, index))
            .sort((left, right) => (left.order || 0) - (right.order || 0))
            .map((row, index) => ({ ...row, order: index + 1 }));
    }, [manualScheduleByEvent, scheduleEventId]);

    const manualScheduleData = useMemo(() => {
        const rows = manualScheduleRows.map((row, index) => {
            const startMinute = parseClockToMinutes(row.start || '09:00');
            let endMinute = parseClockToMinutes(row.end || row.start || '09:00');
            if (endMinute < startMinute) endMinute = startMinute + 10;
            const durationMinutes = Math.max(0, endMinute - startMinute);
            const type = normalizeScheduleType(row.type);
            const title = (row.title || '').trim() || scheduleTypeLabel(type);
            return {
                ...row,
                id: row.id || `manual-row-${index + 1}`,
                order: index + 1,
                type,
                typeLabel: scheduleTypeLabel(type),
                title,
                area: row.area || '',
                startMinute,
                endMinute,
                startLabel: formatMinutesToClock(startMinute),
                endLabel: formatMinutesToClock(endMinute),
                durationMinutes
            };
        });

        if (!rows.length) {
            return {
                rows: [],
                totalItems: 0,
                totalFights: 0,
                totalDurationMinutes: 0,
                estimatedEndMinute: null,
                estimatedEndLabel: '--:--',
                startLabel: '--:--',
                areaCount: 0,
                averageFightDurationMinutes: 0
            };
        }

        const totalItems = rows.length;
        const totalFights = rows.filter((row) => row.type === 'FIGHT').length;
        const totalDurationMinutes = rows.reduce((sum, row) => sum + row.durationMinutes, 0);
        const earliestStart = rows.reduce((min, row) => Math.min(min, row.startMinute), Number.POSITIVE_INFINITY);
        const latestEnd = rows.reduce((max, row) => Math.max(max, row.endMinute), Number.NEGATIVE_INFINITY);
        const areaCount = new Set(
            rows
                .map((row) => (row.area || '').toString().trim())
                .filter(Boolean)
        ).size;
        const fightDurations = rows
            .filter((row) => row.type === 'FIGHT' && row.durationMinutes > 0)
            .map((row) => row.durationMinutes);
        const averageFightDurationMinutes = fightDurations.length
            ? Math.max(1, Math.round(fightDurations.reduce((sum, value) => sum + value, 0) / fightDurations.length))
            : 5;

        return {
            rows,
            totalItems,
            totalFights,
            totalDurationMinutes,
            estimatedEndMinute: latestEnd,
            estimatedEndLabel: Number.isFinite(latestEnd) ? formatMinutesToClock(latestEnd) : '--:--',
            startLabel: Number.isFinite(earliestStart) ? formatMinutesToClock(earliestStart) : '--:--',
            areaCount,
            averageFightDurationMinutes
        };
    }, [manualScheduleRows, scheduleTypeLabel]);

    const bracketWorkspaceData = useMemo(() => {
        if (!bracketEventId) {
            return {
                approvedRows: [],
                academyRows: [],
                totals: {
                    approved: 0,
                    inCategory: 0,
                    inBracket: 0,
                    academies: 0
                }
            };
        }

        const eventSeedSet = new Set();
        brackets
            .filter((bracket) => bracket.eventId === bracketEventId)
            .forEach((bracket) => {
                (Array.isArray(bracket.seedIds) ? bracket.seedIds : []).forEach((seedId) => {
                    if (seedId) eventSeedSet.add(seedId);
                });
            });

        const approvedRegistrations = latestRegistrationDecisions
            .filter((registration) => (
                registration.isPaymentConfirmed
                && registration.eventId === bracketEventId
            ))
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

        const academySummaryMap = new Map();
        let inCategoryCount = 0;
        let inBracketCount = 0;

        const approvedRows = approvedRegistrations.map((registration) => {
            let linkedAthlete = null;
            const linkedAthleteId = (registration?.athleteId || '').toString().trim();
            if (linkedAthleteId) {
                linkedAthlete = athleteMap.get(linkedAthleteId) || null;
            }
            if (!linkedAthlete) {
                linkedAthlete = athletes.find((athlete) => athleteMatchesRegistrationRecord(athlete, registration)) || null;
            }

            const inCategory = Boolean(linkedAthlete && linkedAthlete.eventId === bracketEventId);
            const inBracket = Boolean(inCategory && linkedAthlete?.id && eventSeedSet.has(linkedAthlete.id));
            if (inCategory) inCategoryCount += 1;
            if (inBracket) inBracketCount += 1;

            const academyName = (linkedAthlete?.academia || registration.academia || (isEnglish ? 'No academy' : 'Sem academia')).trim();
            const academyCurrent = academySummaryMap.get(academyName) || {
                academy: academyName,
                total: 0,
                inCategory: 0,
                inBracket: 0
            };
            academyCurrent.total += 1;
            if (inCategory) academyCurrent.inCategory += 1;
            if (inBracket) academyCurrent.inBracket += 1;
            academySummaryMap.set(academyName, academyCurrent);

            const statusKey = !linkedAthlete
                ? 'pending'
                : inBracket
                    ? 'bracket'
                    : inCategory
                        ? 'category'
                        : 'approved';
            const statusLabel = statusKey === 'pending'
                ? copy.bracketsPanel.statusPendingLink
                : statusKey === 'bracket'
                    ? copy.bracketsPanel.statusInBracket
                    : statusKey === 'category'
                        ? copy.bracketsPanel.statusInCategory
                        : copy.bracketsPanel.statusApproved;

            const summaryParts = [
                linkedAthlete?.categoria || registration.categoria,
                linkedAthlete?.faixa || registration.faixa,
                linkedAthlete?.peso || registration.peso
            ].filter(Boolean);

            return {
                registrationId: registration.id,
                athleteId: linkedAthlete?.id || '',
                name: linkedAthlete?.nome || registration.nome || '-',
                academy: academyName,
                summary: summaryParts.join(' / '),
                statusKey,
                statusLabel
            };
        });

        const academyRows = [...academySummaryMap.values()].sort((a, b) => {
            if (b.total !== a.total) return b.total - a.total;
            return a.academy.localeCompare(b.academy, locale);
        });

        return {
            approvedRows,
            academyRows,
            totals: {
                approved: approvedRows.length,
                inCategory: inCategoryCount,
                inBracket: inBracketCount,
                academies: academyRows.length
            }
        };
    }, [
        bracketEventId,
        brackets,
        latestRegistrationDecisions,
        athleteMap,
        athletes,
        isEnglish,
        copy.bracketsPanel,
        locale
    ]);

    const bracketWorkspaceFilteredRows = useMemo(() => {
        if (bracketAcademyFilter === 'all') return bracketWorkspaceData.approvedRows;
        return bracketWorkspaceData.approvedRows.filter((row) => row.academy === bracketAcademyFilter);
    }, [bracketWorkspaceData.approvedRows, bracketAcademyFilter]);

    useEffect(() => {
        if (bracketAcademyFilter === 'all') return;
        const hasAcademy = bracketWorkspaceData.academyRows.some((academy) => academy.academy === bracketAcademyFilter);
        if (!hasAcademy) setBracketAcademyFilter('all');
    }, [bracketWorkspaceData.academyRows, bracketAcademyFilter]);

    useEffect(() => {
        if (!bracketEventId) {
            setDraggingBracketId('');
            setDragSeedContext({ bracketId: '', athleteId: '' });
        }
    }, [bracketEventId]);

    useEffect(() => {
        if (!scheduleEventId) {
            setShowScheduleTvMode(false);
        }
    }, [scheduleEventId]);

    const reorderBracketCards = useCallback((sourceBracketId, targetBracketId) => {
        const sourceId = (sourceBracketId || '').toString().trim();
        const targetId = (targetBracketId || '').toString().trim();
        if (!bracketEventId || !sourceId || !targetId || sourceId === targetId) return;

        setBracketOrderByEvent((prev) => {
            const eventOrder = Array.isArray(prev[bracketEventId]) ? prev[bracketEventId] : [];
            const visibleIds = orderedFilteredBrackets.map((bracket) => bracket.id);
            const merged = [
                ...eventOrder.filter((id) => visibleIds.includes(id)),
                ...visibleIds.filter((id) => !eventOrder.includes(id))
            ];
            const nextOrder = reorderIds(merged, sourceId, targetId);
            return {
                ...prev,
                [bracketEventId]: nextOrder
            };
        });
    }, [bracketEventId, orderedFilteredBrackets]);

    const handleBracketCardDragStart = useCallback((event, bracketId) => {
        const normalizedId = (bracketId || '').toString().trim();
        setDraggingBracketId(normalizedId);
        try {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', normalizedId);
        } catch {
            // Ignore drag data errors.
        }
    }, []);

    const handleBracketCardDrop = useCallback((event, targetBracketId) => {
        event.preventDefault();
        const draggedByState = (draggingBracketId || '').toString().trim();
        let draggedByTransfer = '';
        try {
            draggedByTransfer = (event.dataTransfer?.getData('text/plain') || '').toString().trim();
        } catch {
            draggedByTransfer = '';
        }
        const sourceBracketId = draggedByTransfer || draggedByState;
        reorderBracketCards(sourceBracketId, targetBracketId);
        setDraggingBracketId('');
    }, [draggingBracketId, reorderBracketCards]);

    const handleBracketCardDragEnd = useCallback(() => {
        setDraggingBracketId('');
    }, []);

    const handleSeedDragStart = useCallback((event, bracketId, athleteId) => {
        const normalizedBracketId = (bracketId || '').toString().trim();
        const normalizedAthleteId = (athleteId || '').toString().trim();
        setDragSeedContext({
            bracketId: normalizedBracketId,
            athleteId: normalizedAthleteId
        });
        try {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', normalizedAthleteId);
        } catch {
            // Ignore drag data errors.
        }
    }, []);

    const handleSeedDragEnd = useCallback(() => {
        setDragSeedContext({ bracketId: '', athleteId: '' });
    }, []);

    const handleSeedDrop = useCallback((event, bracket, targetAthleteId) => {
        event.preventDefault();
        if (!bracket?.id) return;

        const bracketId = (bracket.id || '').toString().trim();
        const targetId = (targetAthleteId || '').toString().trim();
        if (!targetId) return;
        if (dragSeedContext.bracketId !== bracketId) return;

        const sourceId = (dragSeedContext.athleteId || '').toString().trim();
        if (!sourceId || sourceId === targetId) return;

        const ordered = (Array.isArray(bracket.seedIds) ? bracket.seedIds : []).filter(Boolean);
        const fromIndex = ordered.indexOf(sourceId);
        const toIndex = ordered.indexOf(targetId);
        if (fromIndex < 0 || toIndex < 0) return;

        const nextOrder = [...ordered];
        const [moved] = nextOrder.splice(fromIndex, 1);
        nextOrder.splice(toIndex, 0, moved);
        setBracketSeedOrder(bracketId, nextOrder);
        setDragSeedContext({ bracketId: '', athleteId: '' });
    }, [dragSeedContext, setBracketSeedOrder]);

    const updateManualScheduleRows = useCallback((eventId, updater) => {
        const normalizedEventId = (eventId || '').toString().trim();
        if (!normalizedEventId || typeof updater !== 'function') return;

        setManualScheduleByEvent((prev) => {
            const currentRows = Array.isArray(prev[normalizedEventId]) ? prev[normalizedEventId] : [];
            const nextRowsRaw = updater(currentRows);
            const nextRows = (Array.isArray(nextRowsRaw) ? nextRowsRaw : [])
                .map((row, index) => normalizeManualScheduleEntry(row, index))
                .sort((left, right) => (left.order || 0) - (right.order || 0))
                .map((row, index) => ({ ...row, order: index + 1 }));

            if (!nextRows.length) {
                if (!prev[normalizedEventId]) return prev;
                const next = { ...prev };
                delete next[normalizedEventId];
                return next;
            }

            return {
                ...prev,
                [normalizedEventId]: nextRows
            };
        });
    }, []);

    const handleScheduleDraftField = useCallback((field, value) => {
        setScheduleDraft((prev) => ({ ...prev, [field]: value }));
    }, []);

    const handleAddManualScheduleItem = useCallback(() => {
        if (!scheduleEventId) {
            showFeedback('error', isEnglish ? 'Select an event first.' : 'Selecione um evento primeiro.');
            return;
        }

        const type = normalizeScheduleType(scheduleDraft.type);
        const title = (scheduleDraft.title || '').toString().trim() || scheduleTypeLabel(type);
        const area = (scheduleDraft.area || '').toString().trim();
        const start = formatMinutesToClock(parseClockToMinutes(scheduleDraft.start || '09:00'));
        const endMinute = Math.max(
            parseClockToMinutes(scheduleDraft.end || start),
            parseClockToMinutes(start)
        );
        const end = formatMinutesToClock(endMinute);
        const notes = (scheduleDraft.notes || '').toString().trim();

        updateManualScheduleRows(scheduleEventId, (rows) => {
            const nextOrder = rows.length + 1;
            return [
                ...rows,
                normalizeManualScheduleEntry({
                    title,
                    type,
                    area,
                    start,
                    end,
                    notes,
                    order: nextOrder
                }, nextOrder - 1)
            ];
        });

        const nextStart = end;
        const nextEnd = formatMinutesToClock(parseClockToMinutes(nextStart) + 10);
        setScheduleDraft((prev) => ({
            ...createScheduleDraftState(),
            area: prev.area || 'Area 1',
            start: nextStart,
            end: nextEnd
        }));
        showFeedback('success', isEnglish ? 'Schedule item added.' : 'Item do cronograma adicionado.');
    }, [
        scheduleEventId,
        scheduleDraft,
        scheduleTypeLabel,
        updateManualScheduleRows,
        showFeedback,
        isEnglish
    ]);

    const handleUpdateManualScheduleRow = useCallback((rowId, field, value) => {
        const normalizedRowId = (rowId || '').toString().trim();
        if (!scheduleEventId || !normalizedRowId) return;

        updateManualScheduleRows(scheduleEventId, (rows) => (
            rows.map((row, index) => {
                if ((row.id || '').toString().trim() !== normalizedRowId) return row;
                const next = normalizeManualScheduleEntry({
                    ...row,
                    [field]: field === 'type' ? normalizeScheduleType(value) : value,
                    order: index + 1
                }, index);
                return next;
            })
        ));
    }, [scheduleEventId, updateManualScheduleRows]);

    const handleMoveManualScheduleRow = useCallback((rowId, direction) => {
        const normalizedRowId = (rowId || '').toString().trim();
        if (!scheduleEventId || !normalizedRowId) return;

        updateManualScheduleRows(scheduleEventId, (rows) => {
            const list = [...rows];
            const fromIndex = list.findIndex((row) => (row.id || '').toString().trim() === normalizedRowId);
            if (fromIndex < 0) return list;
            const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
            if (toIndex < 0 || toIndex >= list.length) return list;
            const [moved] = list.splice(fromIndex, 1);
            list.splice(toIndex, 0, moved);
            return list;
        });
    }, [scheduleEventId, updateManualScheduleRows]);

    const handleRemoveManualScheduleRow = useCallback((rowId) => {
        const normalizedRowId = (rowId || '').toString().trim();
        if (!scheduleEventId || !normalizedRowId) return;

        updateManualScheduleRows(scheduleEventId, (rows) => (
            rows.filter((row) => (row.id || '').toString().trim() !== normalizedRowId)
        ));
    }, [scheduleEventId, updateManualScheduleRows]);

    const handleGenerateBrackets = useCallback(async () => {
        if (!canManagePanel) {
            showFeedback('error', copy.feedback.accessDeniedAdmin);
            return;
        }
        if (!bracketEventId) {
            showFeedback('error', copy.feedback.selectEventForBracket);
            return;
        }

        const hasExisting = brackets.some((bracket) => (
            bracket.eventId === bracketEventId
            && (bracketMode === 'ALL' || bracket.mode === bracketMode)
        ));

        if (hasExisting) {
            const confirmed = window.confirm(copy.feedback.existingBracketsConfirm);
            if (!confirmed) return;
        }

        try {
            const result = generateBrackets({
                eventId: bracketEventId,
                mode: bracketMode,
                replaceExisting: hasExisting
            });
            if (result.created > 0) {
                showFeedback('success', copy.feedback.bracketsGenerated(result.created));
                setBracketOrderByEvent((prev) => ({
                    ...prev,
                    [bracketEventId]: (result.brackets || [])
                        .slice()
                        .sort((left, right) => (left.number || 0) - (right.number || 0))
                        .map((bracket) => bracket.id)
                }));
                const eventMeta = events.find((event) => event.id === bracketEventId);
                const modeLabelMap = {
                    ALL: isEnglish ? 'Overall' : 'Geral',
                    GI: isEnglish ? 'GI (weight)' : 'GI (peso)',
                    'NO-GI': isEnglish ? 'NO-GI (weight)' : 'NO-GI (peso)',
                    'ABS-GI': 'ABS GI',
                    'ABS-NO-GI': 'ABS NO-GI'
                };

                addNews({
                    title: `Chaveamento liberado: ${eventMeta?.name || 'Campeonato'}`,
                    summary: `As chaves da modalidade ${modeLabelMap[bracketMode] || bracketMode} foram geradas e estão disponíveis. Confira seus confrontos!`,
                    body: `Atletas, o sistema acaba de processar os chaveamentos da modalidade **${modeLabelMap[bracketMode] || bracketMode}** para o evento **${eventMeta?.name || 'Campeonato'}**.\n\nAcessem a aba do campeonato para verificar a estrutura das lutas e confirmar o seu primeiro adversário. Boa sorte no tatame!`,
                    category: 'eventos',
                    tags: ['chaveamento', 'eventos'],
                    imageUrl: eventMeta?.flyerUrl || eventMeta?.coverUrl || '',
                    status: 'published',
                    publishedAt: new Date().toISOString()
                });

                await generateBracketsPDF(result.brackets || [], athletes, {
                    eventName: eventMeta?.name || copy.bracketsPanel.event,
                    eventDate: eventMeta?.date || '',
                    eventLocation: eventMeta?.location || '',
                    modeLabel: modeLabelMap[bracketMode] || bracketMode
                });
            } else {
                showFeedback('error', copy.feedback.noBracketCategory);
            }
        } catch (err) {
            showFeedback('error', err?.message || copy.feedback.bracketGenerateFail);
        }
    }, [canManagePanel, bracketEventId, bracketMode, brackets, events, generateBrackets, athletes, showFeedback, copy.feedback, copy.bracketsPanel.event, isEnglish, setBracketOrderByEvent, addNews]);

    const handleExportBracketsPdf = useCallback(async () => {
        if (!orderedFilteredBrackets.length) {
            showFeedback('error', copy.feedback.noBracketForPdf);
            return;
        }

        const eventMeta = events.find((event) => event.id === bracketEventId);
        const modeLabelMap = {
            ALL: isEnglish ? 'Overall' : 'Geral',
            GI: isEnglish ? 'GI (weight)' : 'GI (peso)',
            'NO-GI': isEnglish ? 'NO-GI (weight)' : 'NO-GI (peso)',
            'ABS-GI': 'ABS GI',
            'ABS-NO-GI': 'ABS NO-GI'
        };

        try {
            await generateBracketsPDF(orderedFilteredBrackets, athletes, {
                eventName: eventMeta?.name || copy.bracketsPanel.event,
                eventDate: eventMeta?.date || '',
                eventLocation: eventMeta?.location || '',
                modeLabel: modeLabelMap[bracketMode] || bracketMode
            });
            showFeedback('success', copy.feedback.bracketPdfSaved);
        } catch (err) {
            showFeedback('error', err?.message || copy.feedback.bracketPdfFail);
        }
    }, [
        orderedFilteredBrackets,
        events,
        bracketEventId,
        bracketMode,
        athletes,
        showFeedback,
        copy.feedback,
        copy.bracketsPanel.event,
        isEnglish
    ]);

    const handleExportSchedulePdf = useCallback(async (layoutMode = 'table') => {
        if (!manualScheduleData.rows.length) {
            showFeedback('error', copy.feedback.noScheduleForPdf);
            return;
        }

        const eventMeta = events.find((event) => event.id === scheduleEventId);

        const scheduleRows = manualScheduleData.rows.map((row, index) => {
            const titleStr = (row.title || '').toString();
            const lowerTitle = titleStr.toLowerCase();
            let belt = '-';
            let gender = '-';

            if (lowerTitle.includes('branca/cinza') || lowerTitle.includes('branca / cinza')) belt = 'Branca/Cinza';
            else if (lowerTitle.includes('branca')) belt = 'Branca';
            else if (lowerTitle.includes('cinza')) belt = 'Cinza';
            else if (lowerTitle.includes('amarela')) belt = 'Amarela';
            else if (lowerTitle.includes('laranja')) belt = 'Laranja';
            else if (lowerTitle.includes('verde')) belt = 'Verde';
            else if (lowerTitle.includes('azul')) belt = 'Azul';
            else if (lowerTitle.includes('roxa')) belt = 'Roxa';
            else if (lowerTitle.includes('marrom')) belt = 'Marrom';
            else if (lowerTitle.includes('preta')) belt = 'Preta';

            if (lowerTitle.includes('masculino')) gender = 'Masculino';
            else if (lowerTitle.includes('feminino')) gender = 'Feminino';

            return {
                order: index + 1,
                bracketNumber: row.area || '-',
                label: row.notes ? `${row.title} - ${row.notes}` : row.title,
                mode: row.typeLabel,
                participants: row.type === 'FIGHT' ? 2 : 0,
                fightCount: row.type === 'FIGHT' ? 1 : 0,
                startLabel: row.startLabel,
                endLabel: row.endLabel,
                durationLabel: formatDurationLabel(row.durationMinutes, isEnglish),
                category: titleStr,
                belt,
                gender
            };
        });

        try {
            const normalizedLayout = (layoutMode || '').toString().trim().toLowerCase();
            const useTvLayout = normalizedLayout === 'tv';
            await generateSchedulePDF(scheduleRows, {
                eventName: eventMeta?.name || copy.bracketsPanel.event,
                eventDate: eventMeta?.date || '',
                eventLocation: eventMeta?.location || '',
                modeLabel: isEnglish ? 'Manual schedule' : 'Cronograma manual',
                layout: useTvLayout ? 'tv' : 'table',
                tvMode: useTvLayout,
                startTime: manualScheduleData.startLabel,
                fightDurationMinutes: manualScheduleData.averageFightDurationMinutes || 5,
                transitionMinutes: 0,
                areaCount: Math.max(1, manualScheduleData.areaCount || 1),
                totalFights: manualScheduleData.totalFights,
                totalDurationLabel: formatDurationLabel(manualScheduleData.totalDurationMinutes, isEnglish),
                estimatedEnd: manualScheduleData.estimatedEndLabel,
                posterUrl: eventMeta?.posterUrl || eventMeta?.imageUrl || eventMeta?.flyerUrl || undefined,
                logoUrl: eventMeta?.logoUrl || undefined
            });

            showFeedback('success', copy.feedback.schedulePdfSaved);
        } catch (err) {
            showFeedback('error', err?.message || copy.feedback.schedulePdfFail);
        }
    }, [
        manualScheduleData,
        events,
        scheduleEventId,
        isEnglish,
        showFeedback,
        copy.feedback,
        copy.bracketsPanel.event
    ]);

    const handlePublishSchedule = useCallback(() => {
        if (!scheduleEventId) {
            showFeedback('error', isEnglish ? 'Select an event first.' : 'Selecione um evento primeiro.');
            return;
        }

        if (!manualScheduleData.rows || manualScheduleData.rows.length === 0) {
            showFeedback('error', copy.feedback.noScheduleForPdf);
            return;
        }

        const eventMeta = events.find((event) => event.id === scheduleEventId);

        try {
            savePublishedEventSchedule(scheduleEventId, {
                eventName: eventMeta?.name || copy.bracketsPanel.event,
                eventDate: eventMeta?.date || '',
                eventLocation: eventMeta?.location || '',
                rows: manualScheduleData.rows
            });

            addNews({
                title: `Cronograma oficial: ${eventMeta?.name || 'Campeonato'}`,
                summary: `O cronograma oficial de lutas foi publicado! Veja os horários das suas disputas.`,
                body: `O cronograma com os horários de lutas e chamadas para o evento **${eventMeta?.name || 'Campeonato'}** acaba de ser gerado pelo organizador.\n\nPedimos que todos os atletas fiquem atentos à área de concentração pelo menos 30 minutos antes do horário previsto para a sua categoria. O evento fluirá de acordo com essa previsão.`,
                category: 'eventos',
                tags: ['cronograma', 'eventos'],
                imageUrl: eventMeta?.posterUrl || eventMeta?.imageUrl || eventMeta?.flyerUrl || '',
                status: 'published',
                publishedAt: new Date().toISOString()
            });

            showFeedback('success', isEnglish ? 'Schedule published successfully!' : 'Cronograma publicado com sucesso!');
        } catch (err) {
            showFeedback('error', err?.message || (isEnglish ? 'Failed to publish schedule.' : 'Falha ao publicar cronograma.'));
        }
    }, [
        manualScheduleData,
        events,
        scheduleEventId,
        isEnglish,
        showFeedback,
        copy.feedback,
        copy.bracketsPanel.event
    ]);

    const handleExportApprovedAthletesCsv = useCallback(() => {
        if (!bracketEventId) {
            showFeedback('error', isEnglish ? 'Select an event first.' : 'Selecione um evento primeiro.');
            return;
        }
        if (!bracketWorkspaceData.approvedRows.length) {
            showFeedback('error', isEnglish ? 'No approved athletes for export.' : 'Nao ha atletas aprovados para exportar.');
            return;
        }

        const rowsToExport = bracketWorkspaceFilteredRows;
        if (!rowsToExport.length) {
            showFeedback('error', isEnglish ? 'No athletes in selected academy filter.' : 'Nao ha atletas no filtro de academia selecionado.');
            return;
        }

        const headers = isEnglish
            ? ['Event', 'Athlete', 'Academy', 'Summary', 'Status']
            : ['Evento', 'Atleta', 'Academia', 'Resumo', 'Status'];
        const csvRows = rowsToExport.map((row) => ([
            eventMap[bracketEventId]?.name || copy.common.noEvent,
            row.name || '-',
            row.academy || '-',
            row.summary || '-',
            row.statusLabel || '-'
        ]));

        const eventName = eventMap[bracketEventId]?.name || (isEnglish ? 'event' : 'evento');
        const academySuffix = bracketAcademyFilter === 'all'
            ? (isEnglish ? 'all_academies' : 'todas_academias')
            : buildFileSafeName(bracketAcademyFilter);
        const filename = `${isEnglish ? 'approved_athletes' : 'atletas_aprovados'}_${buildFileSafeName(eventName)}_${academySuffix}_${new Date().toISOString().slice(0, 10)}`;

        downloadCsv(filename, headers, csvRows);
        showFeedback(
            'success',
            isEnglish
                ? `CSV exported (${csvRows.length} approved athletes).`
                : `CSV exportado (${csvRows.length} atletas aprovados).`
        );
    }, [
        bracketEventId,
        bracketWorkspaceData.approvedRows,
        bracketWorkspaceFilteredRows,
        eventMap,
        copy.common.noEvent,
        bracketAcademyFilter,
        isEnglish,
        showFeedback
    ]);

    const handleApplyBracketPodium = useCallback((bracketId) => {
        const result = applyBracketPodium(bracketId);
        if (result.ok) {
            showFeedback('success', copy.feedback.podiumApplied);
        } else {
            showFeedback('error', result.message || copy.feedback.podiumApplyFail);
        }
    }, [applyBracketPodium, showFeedback, copy.feedback]);

    const openUserResetModal = useCallback(async () => {
        if (authService.supportsPasswordReset && !authService.supportsPasswordReset()) {
            showFeedback('error', copy.feedback.resetOnlyLocal);
            return;
        }
        const users = await loadPanelUsers();
        setUserResetList(users);
        setUserResetUsername(users[0]?.username || '');
        setUserResetPassword('');
        setUserResetConfirm('');
        setUserResetError('');
        setUserResetSuccess('');
        setShowUserResetModal(true);
    }, [showFeedback, copy.feedback, loadPanelUsers]);

    const closeUserResetModal = useCallback(() => {
        setShowUserResetModal(false);
        setUserResetPassword('');
        setUserResetConfirm('');
        setUserResetError('');
        setUserResetSuccess('');
    }, []);

    const openUserCreateModal = useCallback(() => {
        if (!canManagePanel) {
            showFeedback('error', copy.feedback.accessDeniedAdmin);
            return;
        }
        setUserCreateName('');
        setUserCreateUsername('');
        setUserCreatePassword('');
        setUserCreateConfirm('');
        setUserCreateRole('coach');
        setUserCreateError('');
        setUserCreateSuccess('');
        setShowUserCreateModal(true);
    }, [canManagePanel, showFeedback, copy.feedback]);

    const closeUserCreateModal = useCallback(() => {
        setShowUserCreateModal(false);
        setUserCreateName('');
        setUserCreateUsername('');
        setUserCreatePassword('');
        setUserCreateConfirm('');
        setUserCreateRole('coach');
        setUserCreateError('');
        setUserCreateSuccess('');
    }, []);

    const openUserEditModal = useCallback((user) => {
        if (!canManagePanel) {
            showFeedback('error', copy.feedback.accessDeniedAdmin);
            return;
        }
        const normalizedRole = normalizePanelRole(user?.role);
        setUserEditId((user?.id || user?.username || '').toString().trim());
        setUserEditName((user?.name || '').toString());
        setUserEditUsername((user?.username || '').toString().toLowerCase());
        setUserEditRole(normalizedRole);
        setUserEditError('');
        setUserEditSuccess('');
        setUserEditPassword('');
        setShowUserEditModal(true);
    }, [canManagePanel, copy.feedback.accessDeniedAdmin, showFeedback, normalizePanelRole]);

    const closeUserEditModal = useCallback(() => {
        setShowUserEditModal(false);
        setUserEditId('');
        setUserEditName('');
        setUserEditUsername('');
        setUserEditRole('coach');
        setUserEditError('');
        setUserEditSuccess('');
        setUserEditPassword('');
    }, []);

    const handleUserEditSubmit = useCallback(async (event) => {
        event.preventDefault();
        setUserEditError('');
        setUserEditSuccess('');

        if (!canManagePanel) {
            setUserEditError(copy.feedback.accessDeniedAdmin);
            return;
        }

        const normalizedName = (userEditName || '').toString().trim();
        const normalizedUsername = (userEditUsername || '').toString().trim().toLowerCase();
        const normalizedRole = normalizePanelRole(userEditRole);

        if (!normalizedName || normalizedName.length < 3) {
            setUserEditError(copy.feedback.minName);
            return;
        }
        if (!normalizedUsername) {
            setUserEditError(isEnglish ? 'Please provide username.' : 'Informe o usuario.');
            return;
        }
        if (userEditPassword && userEditPassword.length < 6) {
            setUserEditError(isEnglish ? 'Password must be at least 6 characters.' : 'A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setUserEditLoading(true);
        try {
            if (userEditPassword && authService.supportsPasswordReset && authService.supportsPasswordReset()) {
                await authService.resetPassword(normalizedUsername, userEditPassword);
            }

            const updated = authService.updateAdminUser
                ? await authService.updateAdminUser({
                    id: userEditId || normalizedUsername,
                    username: normalizedUsername,
                    name: normalizedName,
                    role: normalizedRole
                })
                : null;

            const targetUsername = updated?.username || normalizedUsername;
            const successMessage = isEnglish
                ? `User updated: ${targetUsername}.`
                : `Usuario atualizado: ${targetUsername}.`;
            setUserEditSuccess(successMessage);
            showFeedback('success', successMessage);
            addLog({
                type: 'AUTH',
                action: 'UPDATE_USER',
                details: `Usuario ${targetUsername} atualizado para perfil ${normalizedRole}.`
            });
            await loadPanelUsers();
        } catch (err) {
            const message = err?.message || (isEnglish ? 'Failed to update user.' : 'Falha ao atualizar usuario.');
            setUserEditError(message);
            showFeedback('error', message);
            addLog({
                type: 'AUTH',
                action: 'UPDATE_USER_FAILURE',
                details: `Falha ao atualizar usuario ${userEditUsername}: ${message}`
            });
        } finally {
            setUserEditLoading(false);
        }
    }, [
        canManagePanel,
        userEditName,
        userEditUsername,
        userEditRole,
        userEditId,
        isEnglish,
        copy.feedback.accessDeniedAdmin,
        copy.feedback.minName,
        showFeedback,
        addLog,
        loadPanelUsers,
        normalizePanelRole
    ]);

    const handleDeletePanelUser = useCallback(async (user) => {
        if (!canManagePanel) {
            showFeedback('error', copy.feedback.accessDeniedAdmin);
            return;
        }

        const username = (user?.username || '').toString().trim().toLowerCase();
        const currentUsername = (currentUser?.username || '').toString().trim().toLowerCase();
        if (username && currentUsername && username === currentUsername) {
            showFeedback('error', isEnglish ? 'You cannot remove your own logged user.' : 'Voce nao pode remover o usuario logado.');
            return;
        }

        const confirmMessage = isEnglish
            ? `Remove user ${user?.name || user?.username}? This action cannot be undone.`
            : `Excluir o usuario ${user?.name || user?.username}? Esta acao nao pode ser desfeita.`;
        const confirmed = await requestConfirmDialog({
            title: isEnglish ? 'Delete panel user' : 'Excluir usuario do painel',
            description: confirmMessage,
            confirmLabel: isEnglish ? 'Delete user' : 'Excluir usuario',
            variant: 'danger'
        });
        if (!confirmed) return;

        const targetId = (user?.id || user?.username || '').toString().trim();
        setUserDeleteLoadingId(targetId);
        try {
            if (authService.deleteAdminUser) {
                await authService.deleteAdminUser({ id: targetId, username: user?.username });
            }
            const successMessage = isEnglish
                ? `User removed: ${user?.username || ''}.`
                : `Usuario removido: ${user?.username || ''}.`;
            showFeedback('success', successMessage);
            addLog({
                type: 'AUTH',
                action: 'DELETE_USER',
                details: `Usuario ${user?.username || ''} removido do painel.`
            });
            await loadPanelUsers();
            setUserResetList((prev) => prev.filter((item) => item.username !== user?.username));
            if (showUserEditModal && userEditId && targetId === userEditId) {
                closeUserEditModal();
            }
        } catch (err) {
            const message = err?.message || (isEnglish ? 'Failed to remove user.' : 'Falha ao remover usuario.');
            showFeedback('error', message);
            addLog({
                type: 'AUTH',
                action: 'DELETE_USER_FAILURE',
                details: `Falha ao remover usuario ${user?.username || ''}: ${message}`
            });
        } finally {
            setUserDeleteLoadingId('');
        }
    }, [
        canManagePanel,
        copy.feedback.accessDeniedAdmin,
        currentUser,
        isEnglish,
        showFeedback,
        addLog,
        loadPanelUsers,
        showUserEditModal,
        userEditId,
        closeUserEditModal,
        requestConfirmDialog
    ]);

    const handleUserResetSubmit = useCallback(async (event) => {
        event.preventDefault();
        setUserResetError('');
        setUserResetSuccess('');

        if (!userResetUsername) {
            setUserResetError(copy.feedback.selectUser);
            return;
        }

        if (userResetPassword !== userResetConfirm) {
            setUserResetError(copy.feedback.mismatchPassword);
            return;
        }
        if (!userResetPasswordStrength.isStrong) {
            setUserResetError(userResetPasswordStrength.message);
            return;
        }

        setUserResetLoading(true);
        try {
            await authService.resetPassword(userResetUsername, userResetPassword);
            setUserResetSuccess(copy.feedback.passwordUpdated);
            showFeedback('success', copy.feedback.passwordResetFor(userResetUsername));
            addLog({
                type: 'AUTH',
                action: 'RESET_PASSWORD_ADMIN',
                details: copy.feedback.passwordResetFor(userResetUsername)
            });
            setUserResetPassword('');
            setUserResetConfirm('');
        } catch (err) {
            const message = err?.message || copy.feedback.passwordResetFail;
            setUserResetError(message);
            showFeedback('error', message);
            addLog({
                type: 'AUTH',
                action: 'RESET_PASSWORD_FAILURE',
                details: `Falha: ${userResetUsername} - ${message}`
            });
        } finally {
            setUserResetLoading(false);
        }
    }, [userResetUsername, userResetPassword, userResetConfirm, userResetPasswordStrength, showFeedback, addLog, copy.feedback]);

    const handleUserCreateSubmit = useCallback(async (event) => {
        event.preventDefault();
        setUserCreateError('');
        setUserCreateSuccess('');

        if (!canManagePanel) {
            setUserCreateError(copy.feedback.accessDeniedAdmin);
            return;
        }

        if (userCreatePassword !== userCreateConfirm) {
            setUserCreateError(copy.feedback.mismatchPassword);
            return;
        }
        if (!userCreatePasswordStrength.isStrong) {
            setUserCreateError(userCreatePasswordStrength.message);
            return;
        }

        const normalizedUsername = (userCreateUsername || '').toString().trim().toLowerCase();
        const normalizedName = (userCreateName || '').toString().trim();
        if (!normalizedUsername) {
            setUserCreateError(isEnglish ? 'Please provide username.' : 'Informe o usuário.');
            return;
        }

        const normalizedRole = normalizePanelRole(userCreateRole);
        setUserCreateLoading(true);
        try {
            const created = authService.createAdminUser
                ? await authService.createAdminUser({
                    name: normalizedName || normalizedUsername,
                    username: normalizedUsername,
                    password: userCreatePassword,
                    role: normalizedRole
                })
                : await authService.register({
                name: normalizedName || normalizedUsername,
                username: normalizedUsername,
                password: userCreatePassword,
                role: normalizedRole
            });
            const createdUsername = created?.username || userCreateUsername;
            setUserCreateSuccess(copy.feedback.userCreated(createdUsername));
            showFeedback('success', copy.feedback.userCreated(createdUsername));
            addLog({
                type: 'AUTH',
                action: 'REGISTER',
                details: `Usuário ${createdUsername} cadastrado com perfil ${normalizedRole}.`
            });

            const users = await loadPanelUsers();
            setUserResetList(users);
            setUserCreateName('');
            setUserCreateUsername('');
            setUserCreatePassword('');
            setUserCreateConfirm('');
            setUserCreateRole('coach');
        } catch (err) {
            const message = err?.message || copy.feedback.userCreateFail;
            setUserCreateError(message);
            showFeedback('error', message);
            addLog({
                type: 'AUTH',
                action: 'REGISTER_FAILURE',
                details: `Falha: ${userCreateUsername} - ${message}`
            });
        } finally {
            setUserCreateLoading(false);
        }
    }, [
        canManagePanel,
        userCreatePassword,
        userCreatePasswordStrength,
        userCreateConfirm,
        userCreateRole,
        userCreateName,
        userCreateUsername,
        loadPanelUsers,
        showFeedback,
        addLog,
        copy.feedback,
        isEnglish,
        normalizePanelRole
    ]);

    const loadPublicRegistrations = useCallback(async () => {
        setRegistrationsLoading(true);
        setRegistrationsError('');
        try {
            const payload = await publicRegistrationService.listRegistrations();
            setPublicRegistrations(Array.isArray(payload) ? payload : []);
        } catch (err) {
            const message = err?.message || copy.feedback.registrationLoadFail;
            setRegistrationsError(message);
            showFeedback('error', message);
        } finally {
            refreshSyncDiagnostics();
            setRegistrationsLoading(false);
        }
    }, [showFeedback, refreshSyncDiagnostics, copy.feedback.registrationLoadFail]);

    const handleSyncPendingRegistrations = useCallback(async () => {
        setRegistrationsSyncing(true);
        setRegistrationsError('');
        try {
            const syncResult = await publicRegistrationService.syncPendingRegistrations();
            const payload = await publicRegistrationService.listRegistrations();
            setPublicRegistrations(Array.isArray(payload) ? payload : []);
            showFeedback(
                'success',
                copy.feedback.registrationSyncDone(syncResult?.synced || 0, syncResult?.pending || 0)
            );
        } catch (err) {
            const message = err?.message || copy.feedback.registrationSyncFail;
            setRegistrationsError(message);
            showFeedback('error', message);
        } finally {
            refreshSyncDiagnostics();
            setRegistrationsSyncing(false);
        }
    }, [showFeedback, refreshSyncDiagnostics, copy.feedback]);

    const handleUpdateRegistrationPaymentStatus = useCallback(async (registration, nextStatus) => {
        if (!registration?.id || !nextStatus) return;
        const promptMessage = nextStatus === REGISTRATION_STATUS.PAYMENT_ERROR
            ? copy.registrationsPanel.errorReviewPrompt
            : copy.registrationsPanel.confirmReviewPrompt;
        const reviewNotes = window.prompt(promptMessage, registration.paymentReviewNotes || '');
        if (reviewNotes === null) return;

        setRegistrationStatusUpdatingId(registration.id);
        setRegistrationsError('');
        try {
            const updated = await publicRegistrationService.updatePaymentStatus(registration.id, {
                status: nextStatus,
                reviewNotes,
                reviewedBy: currentUser?.name || currentUser?.username || 'ADMIN'
            });
            setPublicRegistrations((prev) => prev.map((item) => (
                item.id === registration.id ? updated : item
            )));

            const eventMapForUpdate = events.reduce((acc, event) => {
                if (event?.id) acc[event.id] = event;
                return acc;
            }, {});
            const normalizedUpdated = parseRegistrationRecord(updated, eventMapForUpdate, copy);
            const updatedIdentityKey = buildRegistrationIdentityKey(normalizedUpdated);

            if (normalizedUpdated.isPaymentConfirmed && updatedIdentityKey) {
                removeSuppressedRegistrationKey(updatedIdentityKey);
            }

            if (normalizedUpdated.isPaymentError && updatedIdentityKey) {
                addSuppressedRegistrationKeys([updatedIdentityKey]);
            }

            if (normalizedUpdated.isPaymentConfirmed) {
                if (normalizedUpdated.eventId) {
                    setActiveEvent(normalizedUpdated.eventId);
                    setBracketEventId(normalizedUpdated.eventId);
                }

                // Add the approved athlete to the global store so they appear in brackets
                if (typeof addAthlete === 'function') {
                    addAthlete({
                        id: normalizedUpdated.athleteId || `from-reg-${normalizedUpdated.id}`,
                        nome: normalizedUpdated.nome || normalizedUpdated.name || '',
                        faixa: normalizedUpdated.faixa || normalizedUpdated.belt || 'Branca',
                        peso: normalizedUpdated.peso || normalizedUpdated.weight || '',
                        categoria: normalizedUpdated.categoria || normalizedUpdated.category || '',
                        genero: normalizedUpdated.genero || normalizedUpdated.gender || 'M',
                        modalidade: normalizedUpdated.modalidade || normalizedUpdated.mode || 'GI',
                        academiaId: normalizedUpdated.academiaId || '',
                        academia: normalizedUpdated.academia || normalizedUpdated.academy || 'Sem academia',
                        eventId: normalizedUpdated.eventId || '',
                        registrationId: normalizedUpdated.id
                    });
                }

                navigate(resolveAdminRouteFromSection('brackets', canManagePanel));
            }

            showFeedback('success', copy.feedback.registrationStatusUpdated);
        } catch (err) {
            const isAuthRequired = err?.code === 'AUTH_REQUIRED';
            const isForbidden = err?.code === 'FORBIDDEN';
            const fallbackMessage = isAuthRequired
                ? copy.feedback.registrationStatusAuthRequired
                : isForbidden
                    ? copy.feedback.registrationStatusForbidden
                    : copy.feedback.registrationStatusFail;
            const message = err?.message || fallbackMessage;
            setRegistrationsError(message);
            showFeedback('error', message);
        } finally {
            setRegistrationStatusUpdatingId('');
        }
    }, [
        currentUser,
        events,
        setActiveEvent,
        navigate,
        canManagePanel,
        addSuppressedRegistrationKeys,
        removeSuppressedRegistrationKey,
        showFeedback,
        copy
    ]);

    const handleExportRegistrationsSpreadsheet = useCallback(() => {
        const eventMapForExport = events.reduce((acc, event) => {
            if (event?.id) acc[event.id] = event;
            return acc;
        }, {});

        const rows = publicRegistrations
            .map((item) => parseRegistrationRecord(item, eventMapForExport, copy))
            .filter((item) => (
                registrationEventFilter === 'all'
                || item.eventId === registrationEventFilter
            ));
        if (!rows.length) {
            showFeedback('error', copy.feedback.registrationExportNoData);
            return;
        }

        const headers = isEnglish
            ? [
                'Registration ID',
                'Event ID',
                'Event',
                'Event date',
                'Event location',
                'Athlete',
                'Academy',
                'Email',
                'Phone',
                'Gender',
                'Category',
                'Belt',
                'Weight',
                'Mode',
                'Birth year',
                'Age',
                'Registration type',
                'GI weight',
                'NO-GI weight',
                'Absolute GI',
                'Estimated total',
                'Pix key',
                'Receipt file',
                'Receipt type',
                'Receipt size (bytes)',
                'Receipt attached',
                'Athlete notes',
                'Payment status',
                'Payment review notes',
                'Reviewed by',
                'Reviewed at',
                'Created at'
            ]
            : [
                'ID inscrição',
                'ID evento',
                'Evento',
                'Data evento',
                'Local evento',
                'Atleta',
                'Academia',
                'Email',
                'Telefone',
                'Gênero',
                'Categoria',
                'Faixa',
                'Peso',
                'Modalidade',
                'Ano nascimento',
                'Idade',
                'Tipo de inscrição',
                'Peso GI',
                'Peso NO-GI',
                'Absoluto GI',
                'Valor total',
                'Chave Pix',
                'Arquivo comprovante',
                'Tipo comprovante',
                'Tamanho comprovante (bytes)',
                'Comprovante anexado',
                'Observações atleta',
                'Status pagamento',
                'Observação da conferência',
                'Conferido por',
                'Conferido em',
                'Criado em'
            ];

        const data = rows.map((item) => [
            item.id || '',
            item.eventId || '',
            item.eventName || '',
            item.eventDate || '',
            item.eventLocation || '',
            item.nome || '',
            item.academia || '',
            item.email || '',
            item.phone || '',
            item.genero || '',
            item.categoria || '',
            item.faixa || '',
            item.peso || '',
            item.modalidade || '',
            item.notes?.anoNascimento || '',
            item.notes?.idade || '',
            item.notes?.['tipoInscrição'] || item.notes?.tipoInscricao || '',
            item.notes?.pesoGiSelecionado || '',
            item.notes?.pesoNoGiSelecionado || '',
            item.notes?.absolutoGi || '',
            item.totalValue || 0,
            item.notes?.pixKey || '',
            item.proofName || '',
            item.proofMimeType || '',
            item.proofSizeBytes || '',
            item.proofFileUrl ? (isEnglish ? 'YES' : 'SIM') : (isEnglish ? 'NO' : 'NAO'),
            item.notesText || '',
            item.statusLabel || '',
            item.paymentReviewNotes || '',
            item.paymentReviewedBy || '',
            item.paymentReviewedAt || '',
            item.createdAt || ''
        ]);

        const eventLabel = registrationEventFilter === 'all'
            ? (isEnglish ? 'all-events' : 'todos-eventos')
            : (events.find((event) => event.id === registrationEventFilter)?.name || registrationEventFilter);
        const filename = `${isEnglish ? 'registrations' : 'inscricoes'}_${buildFileSafeName(eventLabel)}_${new Date().toISOString().slice(0, 10)}`;
        downloadCsv(filename, headers, data);
        showFeedback('success', copy.feedback.registrationExportDone(data.length));
    }, [
        publicRegistrations,
        copy,
        showFeedback,
        isEnglish,
        registrationEventFilter,
        events
    ]);

    const handleOpenProofFile = useCallback((registration) => {
        const opened = openProofInNewTab({
            fileUrl: registration?.proofFileUrl || '',
            fileName: registration?.proofName || ''
        });
        if (!opened) {
            showFeedback('error', copy.feedback.proofOpenFail);
        }
    }, [copy.feedback.proofOpenFail, showFeedback]);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 15000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const normalizedPath = normalizeAdminPath(location.pathname);
        const safeSection = resolveAdminSectionFromPath(normalizedPath, canManagePanel);
        const expectedPath = resolveAdminRouteFromSection(safeSection, canManagePanel);
        if (normalizedPath !== expectedPath) {
            navigate(expectedPath, { replace: true });
        }
    }, [location.pathname, canManagePanel, navigate]);

    useEffect(() => {
        const handler = (event) => {
            if (!canManagePanel) {
                return;
            }
            if (event.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
                return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
                event.preventDefault();
                setShowAddModal(true);
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'i') {
                event.preventDefault();
                handleImportRanking();
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
                event.preventDefault();
                handleFinalizeEvent();
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
                event.preventDefault();
                setShowLogs(true);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [canManagePanel, handleImportRanking, handleFinalizeEvent]);

    useEffect(() => {
        loadPublicRegistrations();
    }, [loadPublicRegistrations]);

    useEffect(() => {
        const isValidActiveEvent = activeEventId && events.some(e => e.id === activeEventId);
        if (!isValidActiveEvent) return;

        if (!newAthlete.eventId) {
            setNewAthlete((prev) => ({ ...prev, eventId: activeEventId }));
        }
        if (!importEventId) {
            setImportEventId(activeEventId);
        }
        if (!bracketEventId) {
            setBracketEventId(activeEventId);
        }
        if (!scheduleEventId) {
            setScheduleEventId(activeEventId);
        }
    }, [activeEventId, newAthlete.eventId, importEventId, bracketEventId, scheduleEventId, events]);

    useEffect(() => {
        const eventIds = new Set(events.map((event) => event.id));
        if (eventFilter !== 'all' && eventFilter !== 'none' && !eventIds.has(eventFilter)) {
            setEventFilter('all');
        }
        if (importEventId && !eventIds.has(importEventId)) {
            setImportEventId('');
        }
        if (bracketEventId && !eventIds.has(bracketEventId)) {
            setBracketEventId('');
        }
        if (scheduleEventId && !eventIds.has(scheduleEventId)) {
            setScheduleEventId('');
        }
        if (registrationEventFilter !== 'all' && !eventIds.has(registrationEventFilter)) {
            setRegistrationEventFilter('all');
        }
    }, [events, eventFilter, importEventId, bracketEventId, scheduleEventId, registrationEventFilter]);

    const activeEvent = useMemo(() => (
        events.find((event) => event.id === activeEventId)
    ), [events, activeEventId]);

    const profileByAthleteKey = useMemo(() => {
        const sortedProfiles = [...memberProfiles]
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        const map = new Map();
        sortedProfiles.forEach((profile) => {
            const key = buildAthleteLookupKey(profile.fullName, profile.academyName);
            if (!key || map.has(key)) return;
            map.set(key, profile);
        });
        return map;
    }, [memberProfiles]);

    const isLocalAuth = authService.isLocalAuth ? authService.isLocalAuth() : true;

    const filteredAthletes = useMemo(() => {
        const normalizedSearchTerm = deferredSearchTerm.trim().toLowerCase();
        return athletes.filter((athlete) => {
            const profileKey = buildAthleteLookupKey(athlete.nome, athlete.academia);
            const profile = profileByAthleteKey.get(profileKey);
            const searchable = [
                athlete.nome,
                athlete.academia,
                athlete.faixa,
                athlete.peso,
                athlete.categoria,
                athlete.pais,
                profile?.email,
                profile?.phone,
                profile?.city,
                profile?.country
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            const matchesSearch = searchable.includes(normalizedSearchTerm);
            const matchesEvent = eventFilter === 'all'
                ? true
                : eventFilter === 'none'
                    ? !athlete.eventId
                    : athlete.eventId === eventFilter;
            return matchesSearch && matchesEvent;
        });
    }, [athletes, deferredSearchTerm, eventFilter, profileByAthleteKey]);

    const athleteRows = useMemo(() => (
        [...filteredAthletes]
            .map((athlete) => {
                const profileKey = buildAthleteLookupKey(athlete.nome, athlete.academia);
                const profile = profileByAthleteKey.get(profileKey) || null;
                return {
                    athlete,
                    profile,
                    eventLabel: eventMap[athlete.eventId]?.name || copy.common.noEvent,
                    photoUrl: athlete.photoUrl || profile?.photoUrl || ''
                };
            })
            .sort((a, b) => (a.athlete?.nome || '').localeCompare(b.athlete?.nome || ''))
    ), [filteredAthletes, profileByAthleteKey, eventMap, copy.common.noEvent]);

    const athletesPageCount = useMemo(
        () => Math.max(1, Math.ceil(athleteRows.length / athletesPageSize)),
        [athleteRows.length, athletesPageSize]
    );

    useEffect(() => {
        setAthletesPage((prev) => Math.min(prev, athletesPageCount));
    }, [athletesPageCount]);

    const pagedAthleteRows = useMemo(() => {
        const start = (athletesPage - 1) * athletesPageSize;
        return athleteRows.slice(start, start + athletesPageSize);
    }, [athleteRows, athletesPage, athletesPageSize]);

    const athletePageRange = useMemo(() => {
        const total = athleteRows.length;
        if (!total) return { from: 0, to: 0, total: 0 };
        const from = (athletesPage - 1) * athletesPageSize + 1;
        const to = Math.min(athletesPage * athletesPageSize, total);
        return { from, to, total };
    }, [athleteRows.length, athletesPage, athletesPageSize]);

    const currencyFormatter = useMemo(() => (
        new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: 'BRL'
        })
    ), [locale]);

    const registrationReconcilePlan = useMemo(() => {
        const confirmed = latestRegistrationDecisions.filter((item) => (
            item.isPaymentConfirmed
            && item.eventId
        ));

        const paymentError = latestRegistrationDecisions.filter((item) => (
            item.isPaymentError && item.eventId
        ));

        const toImportAthletes = [];
        const requiredByEvent = new Map();
        confirmed.forEach((registration) => {
            const matchedAthlete = athletes.find((athlete) => (
                athleteMatchesRegistrationRecord(athlete, registration)
            ));
            if (matchedAthlete?.id) {
                const requiredSet = requiredByEvent.get(registration.eventId) || new Set();
                requiredSet.add(matchedAthlete.id);
                requiredByEvent.set(registration.eventId, requiredSet);
                return;
            }
            toImportAthletes.push(toAthleteFromRegistration(registration));
        });

        const blockedByEvent = new Map();
        paymentError.forEach((registration) => {
            const blockedIds = athletes
                .filter((athlete) => athleteMatchesRegistrationRecord(athlete, registration))
                .map((athlete) => athlete.id);
            if (!blockedIds.length) return;
            const blockedSet = blockedByEvent.get(registration.eventId) || new Set();
            blockedIds.forEach((id) => blockedSet.add(id));
            blockedByEvent.set(registration.eventId, blockedSet);
        });

        const eventAssignments = [];
        const eventIds = new Set([
            ...requiredByEvent.keys(),
            ...blockedByEvent.keys()
        ]);
        eventIds.forEach((eventId) => {
            const currentIds = athletes
                .filter((athlete) => athlete.eventId === eventId)
                .map((athlete) => athlete.id);
            const keepSet = new Set(currentIds);
            const blockedSet = blockedByEvent.get(eventId) || new Set();
            blockedSet.forEach((id) => keepSet.delete(id));
            const requiredSet = requiredByEvent.get(eventId) || new Set();
            requiredSet.forEach((id) => keepSet.add(id));
            const keepIds = [...keepSet];
            const isSameSelection = (
                currentIds.length === keepIds.length
                && currentIds.every((id) => keepIds.includes(id))
            );
            if (isSameSelection) return;
            eventAssignments.push({ eventId, keepIds });
        });

        return {
            toImportAthletes,
            eventAssignments
        };
    }, [latestRegistrationDecisions, athletes]);

    useEffect(() => {
        const { toImportAthletes, eventAssignments } = registrationReconcilePlan;
        if (toImportAthletes.length) {
            importAthletes(toImportAthletes);
        }
        if (eventAssignments.length) {
            eventAssignments.forEach((assignment) => {
                assignAthletesToEvent(assignment.eventId, assignment.keepIds);
            });
        }
    }, [registrationReconcilePlan, importAthletes, assignAthletesToEvent]);

    useEffect(() => {
        const confirmed = latestRegistrationDecisions.filter((item) => (
            item.isPaymentConfirmed
            && item.eventId
        ));
        if (!confirmed.length) return;

        const existingProfileKeys = new Set(
            memberProfiles.map((profile) => (
                `${normalizeLookup(profile?.fullName || '')}|${normalizeLookup(profile?.academyName || '')}`
            ))
        );

        const toCreate = confirmed
            .filter((registration) => {
                const academyName = registration?.academia || registration?.notes?.academyName || '';
                const key = `${normalizeLookup(registration?.nome || '')}|${normalizeLookup(academyName)}`;
                if (!key || existingProfileKeys.has(key)) return false;
                existingProfileKeys.add(key);
                return true;
            })
            .map((registration) => toMemberProfileFromRegistration(registration, currentUser));

        if (!toCreate.length) return;
        toCreate.forEach((profile) => {
            try {
                addMemberProfile(profile);
            } catch {
                // Keep dashboard stable even if one registration has incomplete profile data.
            }
        });
    }, [latestRegistrationDecisions, memberProfiles, addMemberProfile, currentUser]);

    const registrationRows = useMemo(() => {
        const term = deferredRegistrationSearch.trim().toLowerCase();
        return parsedPublicRegistrations
            .filter((item) => (
                registrationEventFilter === 'all'
                || item.eventId === registrationEventFilter
            ))
            .filter((item) => (
                !registrationPendingOnly || item.isPendingSync || item.isPendingPaymentReview
            ))
            .filter((item) => {
                if (!term) return true;
                const searchable = [
                    item.nome,
                    item.academia,
                    item.email,
                    item.phone,
                    item.eventName,
                    item.notesText,
                    item.proofName,
                    item.paymentReviewNotes
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                return searchable.includes(term);
            });
    }, [
        parsedPublicRegistrations,
        deferredRegistrationSearch,
        registrationEventFilter,
        registrationPendingOnly
    ]);

    const registrationGroups = useMemo(() => {
        const groupsMap = new Map();

        registrationRows.forEach((item) => {
            const eventId = (item.eventId || '').toString().trim() || '__sem_evento__';
            const eventMeta = eventMap[item.eventId] || null;
            const current = groupsMap.get(eventId) || {
                eventId,
                eventName: item.eventName || eventMeta?.name || copy.common.noEvent,
                eventDate: item.eventDate || eventMeta?.date || '',
                eventLocation: item.eventLocation || eventMeta?.location || '',
                eventMeta,
                rows: [],
                updatedAt: ''
            };

            current.rows.push(item);
            if (!current.updatedAt) {
                current.updatedAt = item.createdAt || '';
            } else if ((item.createdAt || '') > current.updatedAt) {
                current.updatedAt = item.createdAt || current.updatedAt;
            }

            groupsMap.set(eventId, current);
        });

        const toSortDate = (value) => {
            const parsed = new Date(value || '');
            const time = parsed.getTime();
            return Number.isFinite(time) ? time : 0;
        };

        return [...groupsMap.values()]
            .map((group) => ({
                ...group,
                rows: group.rows.slice().sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            }))
            .sort((a, b) => {
                const dateDiff = toSortDate(b.eventDate || b.updatedAt) - toSortDate(a.eventDate || a.updatedAt);
                if (dateDiff !== 0) return dateDiff;
                return (a.eventName || '').localeCompare(b.eventName || '');
            });
    }, [registrationRows, eventMap, copy.common.noEvent]);

    const registrationPipelineById = useMemo(() => {
        const athleteById = new Map(
            athletes
                .filter((athlete) => athlete?.id)
                .map((athlete) => [athlete.id, athlete])
        );

        const bracketSeedSetByEvent = new Map();
        brackets.forEach((bracket) => {
            const eventId = (bracket?.eventId || '').toString().trim();
            if (!eventId) return;
            const seedSet = bracketSeedSetByEvent.get(eventId) || new Set();
            (Array.isArray(bracket.seedIds) ? bracket.seedIds : []).forEach((seedId) => {
                if (seedId) seedSet.add(seedId);
            });
            bracketSeedSetByEvent.set(eventId, seedSet);
        });

        const pipelineMap = new Map();
        registrationRows.forEach((registration) => {
            let linkedAthlete = null;
            const linkedAthleteId = (registration?.athleteId || '').toString().trim();
            if (linkedAthleteId) {
                linkedAthlete = athleteById.get(linkedAthleteId) || null;
            }
            if (!linkedAthlete) {
                linkedAthlete = athletes.find((athlete) => athleteMatchesRegistrationRecord(athlete, registration)) || null;
            }

            const inCategory = Boolean(
                registration?.isPaymentConfirmed
                && linkedAthlete
                && linkedAthlete.eventId === registration.eventId
            );

            const eventSeedSet = bracketSeedSetByEvent.get(registration?.eventId || '');
            const inBracket = Boolean(
                inCategory
                && linkedAthlete?.id
                && eventSeedSet?.has(linkedAthlete.id)
            );

            const doneSteps = [
                true,
                Boolean(registration?.isPaymentConfirmed),
                inCategory,
                inBracket
            ];

            let currentStepIndex = 0;
            doneSteps.forEach((isDone, index) => {
                if (isDone) currentStepIndex = index;
            });

            pipelineMap.set(registration.id, {
                doneSteps,
                currentStepIndex
            });
        });

        return pipelineMap;
    }, [registrationRows, athletes, brackets]);

    const pendingSyncCount = useMemo(() => (
        parsedPublicRegistrations.filter((item) => item.isPendingSync).length
    ), [parsedPublicRegistrations]);

    useEffect(() => {
        if (registrationPendingFilterTouched) return;
        setRegistrationPendingOnly(pendingSyncCount > 0);
    }, [pendingSyncCount, registrationPendingFilterTouched]);

    useEffect(() => {
        setAthletesPage(1);
    }, [searchTerm, eventFilter, athletesPageSize]);

    const assignCandidates = useMemo(() => {
        const term = assignSearch.trim().toLowerCase();
        const sorted = [...athletes].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        if (!term) return sorted;
        return sorted.filter((athlete) => (
            (athlete.nome || '').toLowerCase().includes(term)
            || (athlete.academia || '').toLowerCase().includes(term)
        ));
    }, [athletes, assignSearch]);

    const totals = useMemo(() => {
        const totalPoints = athletes.reduce((acc, athlete) => acc + (Number(athlete?.pontos) || 0), 0);
        // "Ativo" no painel = atleta vinculado a algum campeonato/evento.
        const activeAthletes = athletes.filter((athlete) => Boolean((athlete.eventId || '').toString().trim())).length;
        const averagePoints = athletes.length ? Math.round(totalPoints / athletes.length) : 0;

        let valorArrecadado = 0;
        athletes.forEach(athlete => {
            if (athlete.eventId) {
                const event = events.find(e => e.id === athlete.eventId);
                if (event) {
                    valorArrecadado += Number(event.feeOver15 || 0);
                }
            }
        });

        const academyMap = athletes.reduce((acc, athlete) => {
            const key = athlete.academia || copy.modalAssign.noAcademy;
            if (!acc[key]) acc[key] = { count: 0, points: 0 };
            acc[key].count += 1;
            acc[key].points += Number(athlete?.pontos) || 0;
            return acc;
        }, {});

        const topAcademy = Object.entries(academyMap).sort((a, b) => b[1].points - a[1].points)[0];

        return {
            totalPoints,
            averagePoints,
            activeAthletes,
            topAcademy,
            valorArrecadado
        };
    }, [athletes, events, copy.modalAssign.noAcademy]);

    const eventStats = useMemo(() => (
        events.map((event) => {
            const parsedDate = event?.date ? new Date(event.date) : null;
            const eventTime = parsedDate && !Number.isNaN(parsedDate.getTime())
                ? parsedDate.getTime()
                : null;
            const isPastByDate = eventTime !== null ? eventTime < Date.now() : false;
            const isRegistrationOpen = event.registrationOpen !== false;
            const isPastOrClosed = isPastByDate || !isRegistrationOpen;
            return {
                ...event,
                athleteCount: athletes.filter((athlete) => athlete.eventId === event.id).length,
                isRegistrationOpen,
                isPastByDate,
                isPastOrClosed,
                eventTime
            };
        })
    ), [events, athletes]);

    const openEventStats = useMemo(() => (
        eventStats
            .filter((event) => !event.isPastOrClosed)
            .sort((a, b) => {
                const aTime = Number.isFinite(a.eventTime) ? a.eventTime : Number.MAX_SAFE_INTEGER;
                const bTime = Number.isFinite(b.eventTime) ? b.eventTime : Number.MAX_SAFE_INTEGER;
                return aTime - bTime;
            })
    ), [eventStats]);

    const closedEventStats = useMemo(() => (
        eventStats
            .filter((event) => event.isPastOrClosed)
            .sort((a, b) => {
                const aTime = Number.isFinite(a.eventTime) ? a.eventTime : 0;
                const bTime = Number.isFinite(b.eventTime) ? b.eventTime : 0;
                return bTime - aTime;
            })
    ), [eventStats]);

    const beltStats = useMemo(() => {
        const beltMap = athletes.reduce((acc, athlete) => {
            const key = athlete.faixa || 'Branca';
            if (!acc[key]) acc[key] = { count: 0, points: 0 };
            acc[key].count += 1;
            acc[key].points += athlete.pontos;
            return acc;
        }, {});

        return Object.entries(beltMap)
            .map(([label, data]) => ({ label, ...data }))
            .sort((a, b) => b.points - a.points)
            .slice(0, 5);
    }, [athletes]);

    const maxBeltPoints = Math.max(1, ...beltStats.map((belt) => belt.points));

    const recentLogs = logs.slice(0, 6);

    const navItems = useMemo(() => {
        if (!canManagePanel) {
            return [
                { id: 'brackets', label: copy.nav.brackets, icon: ClipboardList },
                { id: 'schedule', label: copy.nav.schedule, icon: Clock },
                { id: 'activity', label: copy.nav.activity, icon: Activity }
            ];
        }
        return [
            { id: 'overview', label: copy.nav.overview, icon: LayoutDashboard },
            { id: 'events', label: copy.nav.events, icon: Calendar, meta: events.length },
            { id: 'news', label: copy.nav.news, icon: Newspaper, meta: news.length },
            { id: 'registrations', label: copy.nav.registrations, icon: ClipboardList, meta: publicRegistrations.length },
            { id: 'brackets', label: copy.nav.brackets, icon: ClipboardList },
            { id: 'schedule', label: copy.nav.schedule, icon: Clock },
            { id: 'superfights', label: copy.nav.superfights, icon: Swords },
            { id: 'athletes', label: copy.nav.athletes, icon: Users, meta: athletes.length },
            { id: 'automation', label: copy.nav.automation, icon: Zap },
            { id: 'activity', label: copy.nav.activity, icon: Activity }
        ];
    }, [canManagePanel, copy.nav, events.length, news.length, publicRegistrations.length, athletes.length]);

    const orderedNews = useMemo(() => (
        [...news].sort((a, b) => {
            const aTime = new Date(a.publishedAt || a.createdAt || 0).getTime();
            const bTime = new Date(b.publishedAt || b.createdAt || 0).getTime();
            return bTime - aTime;
        })
    ), [news]);

    const handleNavClick = useCallback((id) => {
        navigate(resolveAdminRouteFromSection(id, canManagePanel));
        setNavOpen(false);
    }, [navigate, canManagePanel]);

    const handleOpenAssignModal = useCallback((eventItem) => {
        const selection = {};
        athletes.forEach((athlete) => {
            selection[athlete.id] = athlete.eventId === eventItem.id;
        });
        setAssignEvent(eventItem);
        setAssignSelection(selection);
        setAssignSearch('');
        setShowAssignModal(true);
    }, [athletes]);

    const renderAdminEventCard = useCallback((event) => {
        const isActive = event.id === activeEventId;
        const dateLabel = formatEventDate(event.date);
        const isRegistrationOpen = event.registrationOpen !== false;
        const metaParts = [
            dateLabel ? `${copy.eventsPanel.date} ${dateLabel}` : copy.eventsPanel.undefinedDate,
            event.location
        ].filter(Boolean);

        return (
            <div key={event.id} className="event-card">
                <div className="event-card__poster">
                    {event.posterUrl ? (
                        <img src={event.posterUrl} alt={event.name || copy.eventsPanel.noPoster} loading="lazy" />
                    ) : (
                        <div className="event-card__poster-placeholder">{copy.eventsPanel.noPoster}</div>
                    )}
                </div>
                <div className="event-card__header">
                    <div>
                        <div className="event-name">{event.name}</div>
                        <div className="table-meta">{metaParts.join(' - ')}</div>
                    </div>
                    <span className={`tag ${isRegistrationOpen ? 'tag--open' : ''}`}>
                        {isRegistrationOpen ? copy.eventsPanel.open : copy.eventsPanel.closed}
                    </span>
                </div>
                <div className="event-card__stats">
                    <div className="event-stat">
                        <span>{copy.eventsPanel.athletes}</span>
                        <strong>{event.athleteCount}</strong>
                    </div>
                    <div className="event-stat">
                        <span>{copy.eventsPanel.activeEvent}</span>
                        <strong>{isActive ? copy.common.active : copy.common.inactive}</strong>
                    </div>
                </div>
                <div className="event-card__footer">
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setActiveEvent(event.id)}
                        disabled={isActive}
                    >
                        {isActive ? copy.eventsPanel.activeEvent : copy.eventsPanel.activate}
                    </button>
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => handleOpenAssignModal(event)}
                    >
                        {copy.eventsPanel.manageAthletes}
                    </button>
                    <button
                        type="button"
                        className={`btn ${isRegistrationOpen ? 'btn-danger' : 'btn-secondary'}`}
                        onClick={() => handleToggleEventRegistration(event)}
                    >
                        {isRegistrationOpen ? copy.eventsPanel.closeRegistration : copy.eventsPanel.reopenRegistration}
                    </button>
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => handleOpenEditEvent(event)}
                    >
                        <Pencil size={14} />
                        {copy.eventsPanel.edit}
                    </button>
                    {event.internalRegistration ? (
                        <Link
                            className={`btn ${isRegistrationOpen ? 'btn-event btn-event--small' : 'btn-secondary btn-event--small'}`}
                            to={`/eventos/${event.id}`}
                            onClick={(clickEvent) => {
                                if (!isRegistrationOpen) {
                                    clickEvent.preventDefault();
                                }
                            }}
                            aria-disabled={!isRegistrationOpen}
                        >
                            {isRegistrationOpen ? copy.eventsPanel.registration : copy.eventsPanel.closedRegistration}
                        </Link>
                    ) : (
                        <a
                            className={`btn ${isRegistrationOpen ? 'btn-event btn-event--small' : 'btn-secondary btn-event--small'}`}
                            href={event.registrationUrl || '#'}
                            target={event.registrationUrl ? '_blank' : undefined}
                            rel={event.registrationUrl ? 'noreferrer' : undefined}
                            onClick={(clickEvent) => {
                                if (!isRegistrationOpen || !event.registrationUrl) {
                                    clickEvent.preventDefault();
                                }
                            }}
                            aria-disabled={!isRegistrationOpen || !event.registrationUrl}
                        >
                            {isRegistrationOpen ? copy.eventsPanel.registration : copy.eventsPanel.closedRegistration}
                        </a>
                    )}
                </div>
            </div>
        );
    }, [
        activeEventId,
        copy,
        handleOpenAssignModal,
        handleOpenEditEvent,
        handleToggleEventRegistration,
        setActiveEvent
    ]);

    const handleRefreshInstagramFeed = useCallback(async () => {
        setInstagramRefreshing(true);
        try {
            const result = await socialMediaService.syncInstagramFeedAdmin(10);
            const posts = Array.isArray(result?.posts) ? result.posts : [];
            const count = posts.length;
            const lastUpdated = (result?.lastUpdatedAt || new Date().toISOString()).toString().trim();
            const status = (result?.status || '').toString().trim().toUpperCase();
            if (lastUpdated) {
                setInstagramLastUpdatedAt(lastUpdated);
            }
            if (status) {
                setInstagramFeedStatus(status);
            }
            showFeedback('success', copy.feedback.instagramRefreshDone(count));
        } catch (err) {
            if (err?.code === 'AUTH_REQUIRED') {
                showFeedback('error', err?.message || copy.feedback.instagramRefreshFail);
                return;
            }
            showFeedback('error', err?.message || copy.feedback.instagramRefreshFail);
        } finally {
            setInstagramRefreshing(false);
        }
    }, [showFeedback, copy.feedback]);

    const handlePublishNews = useCallback((event) => {
        event.preventDefault();
        setNewsError('');

        const title = newsForm.title.trim();
        const summary = newsForm.summary.trim();
        if (!title) {
            const message = copy.feedback.newsTitleRequired;
            setNewsError(message);
            showFeedback('error', message);
            return;
        }
        if (!summary) {
            const message = copy.feedback.newsSummaryRequired;
            setNewsError(message);
            showFeedback('error', message);
            return;
        }

        try {
            const created = addNews({
                title,
                summary,
                imageUrl: newsForm.imageUrl,
                publishedAt: newsForm.publishedAt
            });
            setNewsForm(createNewsFormState());
            setNewsImageName('');
            setNewsImageStoredSizeBytes(0);
            if (newsImageInputRef.current) {
                newsImageInputRef.current.value = '';
            }
            showFeedback('success', copy.feedback.newsCreated(created.title));
        } catch (err) {
            const message = err?.message || copy.feedback.newsCreateFail;
            setNewsError(message);
            showFeedback('error', message);
        }
    }, [newsForm, addNews, showFeedback, copy.feedback]);

    const handleNewsImageUrlChange = useCallback((event) => {
        const value = event.target.value;
        setNewsForm((prev) => ({ ...prev, imageUrl: value }));
        if (isDataImageUrl(value)) {
            setNewsImageStoredSizeBytes(estimateDataUrlBytes(value));
            return;
        }
        setNewsImageName('');
        setNewsImageStoredSizeBytes(0);
    }, []);

    const handleSelectNewsImageFromComputer = useCallback(() => {
        newsImageInputRef.current?.click();
    }, []);

    const handleClearNewsImage = useCallback(() => {
        setNewsForm((prev) => ({ ...prev, imageUrl: '' }));
        setNewsImageName('');
        setNewsImageStoredSizeBytes(0);
        if (newsImageInputRef.current) {
            newsImageInputRef.current.value = '';
        }
    }, []);

    const handleNewsImageFileChange = useCallback(async (eventFile) => {
        const file = eventFile.target.files?.[0];
        if (!file) return;

        if (!/^image\//i.test(file.type || '')) {
            const message = copy.feedback.newsImageTypeInvalid;
            setNewsError(message);
            showFeedback('error', message);
            eventFile.target.value = '';
            return;
        }

        if (file.size > MAX_NEWS_IMAGE_UPLOAD_BYTES) {
            const message = copy.feedback.newsImageTooLarge;
            setNewsError(message);
            showFeedback('error', message);
            eventFile.target.value = '';
            return;
        }

        try {
            const compressed = await compressNewsImageFile(file);
            if (!compressed?.dataUrl || compressed.bytes > MAX_NEWS_IMAGE_STORED_BYTES) {
                const message = copy.feedback.newsImageStillLarge;
                setNewsError(message);
                showFeedback('error', message);
                return;
            }
            setNewsForm((prev) => ({ ...prev, imageUrl: compressed.dataUrl }));
            setNewsImageName(file.name || '');
            setNewsImageStoredSizeBytes(compressed.bytes || 0);
            setNewsError('');
        } catch {
            const message = copy.feedback.newsImageReadFail;
            setNewsError(message);
            showFeedback('error', message);
        } finally {
            eventFile.target.value = '';
        }
    }, [copy.feedback, showFeedback]);

    const handleDeleteNews = useCallback(async (item) => {
        const confirmed = await requestConfirmDialog({
            title: isEnglish ? 'Remove news' : 'Remover noticia',
            description: copy.feedback.newsDeleteConfirm(item.title),
            confirmLabel: isEnglish ? 'Remove' : 'Remover',
            variant: 'danger'
        });
        if (!confirmed) return;
        try {
            deleteNews(item.id);
            showFeedback('success', copy.feedback.newsDeleted);
        } catch (err) {
            const message = err?.message || copy.feedback.newsDeleteFail;
            showFeedback('error', message);
        }
    }, [deleteNews, showFeedback, copy.feedback, requestConfirmDialog, isEnglish]);

    const handleAddAthlete = (event) => {
        event.preventDefault();

        if (newAthlete.nome.length < 3) {
            showFeedback('error', copy.feedback.minName);
            return;
        }
        if (!newAthlete.academia) {
            showFeedback('error', copy.feedback.academyRequired);
            return;
        }

        try {
            addAthlete(newAthlete);
            showFeedback('success', copy.feedback.athleteRegistered(newAthlete.nome));
            setShowAddModal(false);
            setNewAthlete({
                nome: '',
                faixa: 'Branca',
                peso: '',
                categoria: 'Adulto',
                academia: '',
                pais: 'Brasil',
                photoUrl: '',
                isNoGi: false,
                isAbsolute: false,
                eventId: activeEventId || ''
            });
        } catch (err) {
            showFeedback('error', err.message);
        }
    };

    const formatEventDate = (dateString) => {
        if (!dateString) return '';
        const parsed = new Date(dateString);
        if (Number.isNaN(parsed.getTime())) return dateString;
        return parsed.toLocaleDateString(locale);
    };

    const formatEventDateTime = (dateString) => {
        if (!dateString) return '';
        const parsed = new Date(dateString);
        if (Number.isNaN(parsed.getTime())) return dateString;
        return parsed.toLocaleString(locale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const instagramFeedStatusLabel = instagramFeedStatus === 'UPDATED_NOW'
        ? copy.newsPanel.feedStatusUpdatedNow
        : instagramFeedStatus === 'CACHE'
            ? copy.newsPanel.feedStatusCache
            : '';

    const handleToggleAssign = (athleteId) => {
        setAssignSelection((prev) => ({ ...prev, [athleteId]: !prev[athleteId] }));
    };

    const handleCloseAssignModal = () => {
        setShowAssignModal(false);
        setAssignEvent(null);
        setAssignSelection({});
        setAssignSearch('');
    };

    const handleSaveAssign = () => {
        if (!assignEvent) return;
        const selectedIds = Object.keys(assignSelection).filter((id) => assignSelection[id]);
        try {
            assignAthletesToEvent(assignEvent.id, selectedIds);
            showFeedback('success', copy.feedback.athletesAssigned);
            handleCloseAssignModal();
        } catch (err) {
            showFeedback('error', err?.message || copy.feedback.athleteAssignFail);
        }
    };

    const selectedAssignCount = Object.values(assignSelection).filter(Boolean).length;

    if (!currentUser) {
        return <LoginOverlay />;
    }

    return (
        <div className="admin-shell">
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`toast ${toast.type === 'error' ? 'is-error' : ''}`}
                    >
                        {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        <span>{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {navOpen && (
                    <motion.div
                        className="sidebar-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setNavOpen(false)}
                    />
                )}
            </AnimatePresence>

            <aside className={`admin-sidebar ${navOpen ? 'is-open' : ''}`}>
                <div className="admin-sidebar__header">
                    <span className="admin-sidebar__title">{copy.sidebar.title}</span>
                    <button type="button" className="btn btn-ghost" onClick={() => setNavOpen(false)}>
                        {copy.common.close}
                    </button>
                </div>
                <nav className="admin-sidebar__nav">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                className={`sidebar-link ${activeSection === item.id ? 'is-active' : ''}`}
                                onClick={() => handleNavClick(item.id)}
                            >
                                <span className="sidebar-link__label">
                                    <Icon size={16} />
                                    {item.label}
                                </span>
                                {item.meta !== undefined && <span className="sidebar-link__meta">{item.meta}</span>}
                            </button>
                        );
                    })}
                </nav>

                <div className="admin-sidebar__card">
                    <div className="sidebar-stat">
                        <span>{copy.sidebar.activeAthletes}</span>
                        <strong>{totals.activeAthletes}</strong>
                    </div>
                    <div className="sidebar-stat">
                        <span>{copy.sidebar.totalPoints}</span>
                        <strong>{totals.totalPoints}</strong>
                    </div>
                    <div className="sidebar-stat">
                        <span>{copy.sidebar.registeredEvents}</span>
                        <strong>{events.length}</strong>
                    </div>
                </div>

                {canManagePanel && (
                    <button type="button" className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                        {copy.sidebar.newRegister}
                    </button>
                )}
            </aside>
            <div className="admin-main">
                {canManagePanel && activeSection === 'overview' && (
                <section className="admin-hero" id="overview">
                    <div>
                        <div className="meta-pill">
                            <Sparkles size={14} />
                            {copy.hero.activeEvent}: {activeEvent ? activeEvent.name : copy.hero.noActiveEvent}
                        </div>
                        <h2 className="hero-title">{copy.hero.title}</h2>
                        <p className="hero-subtitle">{copy.hero.subtitle}</p>
                        <div className="hero-meta">
                            <span className="meta-pill">
                                <Clock size={14} />
                                {copy.hero.updatedAt} {now.toLocaleTimeString(locale)}
                            </span>
                            <span className="meta-pill">
                                <ShieldCheck size={14} />
                                {copy.hero.secureSessionFor} {currentUser.name}
                            </span>
                            <span className="meta-pill">
                                <BarChart3 size={14} />
                                {copy.hero.average}: {totals.averagePoints} pts
                            </span>
                        </div>
                    </div>

                    <div className="hero-actions">
                        <div className="hero-actions__buttons">
                            <button type="button" className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                                <UserPlus size={14} />
                                {copy.hero.newAthlete}
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={() => setShowLogs(true)}>
                                <ClipboardList size={14} />
                                {copy.hero.logs}
                            </button>
                            <button type="button" className="btn btn-ghost mobile-only" onClick={() => setNavOpen(true)}>
                                <Menu size={14} />
                                {copy.hero.menu}
                            </button>
                        </div>
                        <div className="hero-info-card">
                            <span>{copy.hero.rankingUpdated}</span>
                            <strong>{athletes.length} {copy.hero.athletes}</strong>
                            <div className="hero-info-meta">
                                <div>
                                    <Trophy size={16} />
                                    {totals.topAcademy ? totals.topAcademy[0] : copy.hero.noLeader}
                                </div>
                                <div>
                                    <Zap size={16} />
                                    {totals.totalPoints} pts
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                )}

                {canManagePanel && activeSection === 'overview' && (
                <div style={{ position: 'relative', minHeight: '800px' }}>
                    {/* Background Orbs Effect */}
                    <div style={{ position: 'absolute', top: '-5%', left: '-5%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(56,189,248,0.1) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(60px)', zIndex: 0, borderRadius: '50%' }}></div>
                    <div style={{ position: 'absolute', bottom: '-5%', right: '-5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(60px)', zIndex: 0, borderRadius: '50%' }}></div>
                    
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                    {/* Inscritos */}
                    <div style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.1) 0%, rgba(14,165,233,0.05) 100%)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '16px', padding: '24px', position: 'relative', overflow: 'hidden', backdropFilter: 'blur(12px)', transition: 'transform 0.2s', cursor: 'default' }}>
                        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '100px', height: '100px', background: 'rgba(56,189,248,0.1)', borderRadius: '50%', filter: 'blur(30px)' }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                                <Users size={20} />
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{copy.stats.enrolled}</div>
                        </div>
                        <div style={{ fontSize: '36px', fontWeight: 800, color: '#f8fafc', marginBottom: '8px', lineHeight: 1 }}>{athletes.length}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontSize: '13px', fontWeight: 500 }}>
                            <TrendingUp size={14} />
                            <span>{totals.activeAthletes} {copy.stats.activeTrend}</span>
                        </div>
                    </div>

                    {/* Valor Arrecadado */}
                    <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(5,150,105,0.05) 100%)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '16px', padding: '24px', position: 'relative', overflow: 'hidden', backdropFilter: 'blur(12px)', transition: 'transform 0.2s', cursor: 'default' }}>
                        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '100px', height: '100px', background: 'rgba(16,185,129,0.1)', borderRadius: '50%', filter: 'blur(30px)' }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                                <DollarSign size={20} />
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor Arrecadado</div>
                        </div>
                        <div style={{ fontSize: '32px', fontWeight: 800, color: '#10b981', marginBottom: '8px', lineHeight: 1 }}>
                            R$ {(totals.valorArrecadado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '13px', fontWeight: 500 }}>
                            <Activity size={14} />
                            <span>Baseado nas inscrições</span>
                        </div>
                    </div>

                    {/* Eventos */}
                    <div style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(147,51,234,0.05) 100%)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '16px', padding: '24px', position: 'relative', overflow: 'hidden', backdropFilter: 'blur(12px)', transition: 'transform 0.2s', cursor: 'default' }}>
                        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '100px', height: '100px', background: 'rgba(168,85,247,0.1)', borderRadius: '50%', filter: 'blur(30px)' }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(168,85,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}>
                                <Zap size={20} />
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{copy.stats.registeredEvents}</div>
                        </div>
                        <div style={{ fontSize: '36px', fontWeight: 800, color: '#f8fafc', marginBottom: '8px', lineHeight: 1 }}>{events.length}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a855f7', fontSize: '13px', fontWeight: 500 }}>
                            <Monitor size={14} />
                            <span>{copy.stats.centralizedControl}</span>
                        </div>
                    </div>

                    {/* Pontos Totais */}
                    <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(217,119,6,0.05) 100%)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '16px', padding: '24px', position: 'relative', overflow: 'hidden', backdropFilter: 'blur(12px)', transition: 'transform 0.2s', cursor: 'default' }}>
                        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '100px', height: '100px', background: 'rgba(245,158,11,0.1)', borderRadius: '50%', filter: 'blur(30px)' }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                                <Trophy size={20} />
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{copy.stats.totalPoints}</div>
                        </div>
                        <div style={{ fontSize: '36px', fontWeight: 800, color: '#f8fafc', marginBottom: '8px', lineHeight: 1 }}>{totals.totalPoints}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '13px', fontWeight: 500 }}>
                            <TrendingUp size={14} />
                            <span>{copy.stats.average} {totals.averagePoints} pts</span>
                        </div>
                    </div>
                </section>
                {/* INÍCIO NOVOS WIDGETS TECNOLÓGICOS */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', marginBottom: '32px' }}>
                    
                    {/* COLUNA ESQUERDA: Gráfico e Anel */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Neon Chart */}
                        <div style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.9) 100%)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '24px', position: 'relative', overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
                            <div style={{ position: 'absolute', top: 0, left: '20%', width: '60%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.5), transparent)' }}></div>
                            <h3 style={{ margin: '0 0 24px 0', fontSize: '16px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Activity size={18} color="#38bdf8" />
                                Crescimento do Sistema
                            </h3>
                            <div style={{ width: '100%', height: '220px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={[
                                        { name: 'Seg', atletas: Math.floor(athletes.length * 0.4) },
                                        { name: 'Ter', atletas: Math.floor(athletes.length * 0.5) },
                                        { name: 'Qua', atletas: Math.floor(athletes.length * 0.6) },
                                        { name: 'Qui', atletas: Math.floor(athletes.length * 0.75) },
                                        { name: 'Sex', atletas: Math.floor(athletes.length * 0.9) },
                                        { name: 'Sab', atletas: athletes.length }
                                    ]}>
                                        <defs>
                                            <linearGradient id="colorNeon" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            contentStyle={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '8px', color: '#f8fafc' }}
                                            itemStyle={{ color: '#38bdf8' }}
                                        />
                                        <Area type="monotone" dataKey="atletas" stroke="#38bdf8" strokeWidth={3} fillOpacity={1} fill="url(#colorNeon)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Anel de Progresso */}
                        <div style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.9) 100%)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(12px)' }}>
                            <div>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>Meta de Inscritos</h3>
                                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Faltam {Math.max(0, 100 - athletes.length)} para a meta do mês.</p>
                            </div>
                            <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="80" height="80" viewBox="0 0 80 80">
                                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                                    <circle cx="40" cy="40" r="34" fill="none" stroke="#10b981" strokeWidth="6" strokeDasharray="213" strokeDashoffset={213 - (213 * Math.min(100, athletes.length) / 100)} strokeLinecap="round" style={{ transformOrigin: 'center', transform: 'rotate(-90deg)', transition: 'stroke-dashoffset 1s ease-out' }} />
                                </svg>
                                <div style={{ position: 'absolute', fontSize: '18px', fontWeight: 800, color: '#10b981' }}>{Math.min(100, athletes.length)}%</div>
                            </div>
                        </div>
                    </div>

                    {/* COLUNA DIREITA: Feed e Insights */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* IA Insights */}
                        <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(79,70,229,0.05) 100%)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '16px', padding: '20px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#6366f1' }}></div>
                            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Sparkles size={16} />
                                System Insight
                            </h3>
                            <p style={{ margin: 0, fontSize: '13px', color: '#e0e7ff', lineHeight: 1.5 }}>
                                A academia <strong style={{ color: '#fff' }}>{totals.topAcademy ? totals.topAcademy[0] : 'Indefinida'}</strong> lidera as inscrições no momento com <strong style={{ color: '#fff' }}>{totals.topAcademy ? totals.topAcademy[1].count : 0}</strong> atletas!
                            </p>
                        </div>

                        {/* Live Feed Tracker */}
                        <div style={{ flex: 1, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', backdropFilter: 'blur(12px)' }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', animation: 'pulse 2s infinite' }}></div>
                                Live Activity
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '250px', paddingRight: '4px' }} className="custom-scrollbar">
                                {logs.slice(0, 5).map(log => (
                                    <div key={log.id} style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                                        <div style={{ color: '#64748b', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div style={{ color: '#cbd5e1', lineHeight: 1.4 }}>
                                            {log.action}
                                        </div>
                                    </div>
                                ))}
                                {logs.length === 0 && (
                                    <div style={{ color: '#64748b', fontSize: '12px', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>Sem atividades recentes</div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
                {/* FIM NOVOS WIDGETS TECNOLÓGICOS */}
                    </div>
                </div>
                )}
                {canManagePanel && activeSection === 'events' && (
                <section className="panel" id="events">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">{copy.eventsPanel.title}</div>
                            <div className="panel-subtitle">{copy.eventsPanel.subtitle}</div>
                        </div>
                        <div className="panel-actions">
                            <button type="button" className="btn btn-primary" onClick={openEventModal}>
                                <Calendar size={14} />
                                {copy.eventsPanel.createEvent}
                            </button>
                        </div>
                    </div>
                    {events.length === 0 ? (
                        <div className="panel-subtitle">{copy.eventsPanel.noEvents}</div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1.4rem' }}>
                            <div>
                                <div className="panel-title" style={{ marginBottom: '0.3rem' }}>{copy.eventsPanel.openSection}</div>
                                <div className="panel-subtitle" style={{ marginBottom: '0.85rem' }}>{copy.eventsPanel.openSectionSubtitle}</div>
                                <div className="event-grid">
                                    {openEventStats.length
                                        ? openEventStats.map((event) => renderAdminEventCard(event))
                                        : <div className="panel-subtitle">{copy.eventsPanel.noOpenEvents}</div>}
                                </div>
                            </div>
                            <div>
                                <div className="panel-title" style={{ marginBottom: '0.3rem' }}>{copy.eventsPanel.closedSection}</div>
                                <div className="panel-subtitle" style={{ marginBottom: '0.85rem' }}>{copy.eventsPanel.closedSectionSubtitle}</div>
                                <div className="event-grid">
                                    {closedEventStats.length
                                        ? closedEventStats.map((event) => renderAdminEventCard(event))
                                        : <div className="panel-subtitle">{copy.eventsPanel.noClosedEvents}</div>}
                                </div>
                            </div>
                        </div>
                    )}
                </section>
                )}
                {canManagePanel && activeSection === 'news' && (
                <section className="panel" id="news">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">{copy.newsPanel.title}</div>
                            <div className="panel-subtitle">{copy.newsPanel.subtitle}</div>
                        </div>
                        <div className="panel-actions">
                            <Link className="btn btn-secondary" to="/noticias" target="_blank" rel="noreferrer">
                                {copy.newsPanel.openNewsPage}
                            </Link>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleRefreshInstagramFeed}
                                disabled={instagramRefreshing}
                            >
                                {instagramRefreshing
                                    ? `${copy.newsPanel.refreshSocial}...`
                                    : copy.newsPanel.refreshSocial}
                            </button>
                        </div>
                    </div>

                    <div className="table-meta table-meta--tight">
                        {copy.newsPanel.lastInstagramRefresh}: {' '}
                        {instagramLastUpdatedAt
                            ? formatEventDateTime(instagramLastUpdatedAt)
                            : copy.newsPanel.instagramNeverUpdated}
                        {instagramFeedStatusLabel && (
                            <>
                                {' '}
                            <span className={`tag ${instagramFeedStatus === 'UPDATED_NOW' ? 'tag--open' : 'tag--warning'}`}>
                                {instagramFeedStatusLabel}
                            </span>
                            </>
                        )}
                    </div>

                    {newsError && (
                        <div className="login-error" role="alert">
                            <AlertCircle size={18} />
                            <p>{newsError}</p>
                        </div>
                    )}

                    <div className="news-admin-grid">
                        <form className="news-admin-form" onSubmit={handlePublishNews}>
                            <div className="form-grid">
                                <div>
                                    <label className="table-meta">{copy.newsPanel.titleLabel}</label>
                                    <input
                                        className="input"
                                        type="text"
                                        value={newsForm.title}
                                        onChange={(event) => setNewsForm({ ...newsForm, title: event.target.value })}
                                        placeholder={copy.newsPanel.titlePlaceholder}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="table-meta">{copy.newsPanel.dateLabel}</label>
                                    <input
                                        className="input"
                                        type="date"
                                        value={newsForm.publishedAt}
                                        onChange={(event) => setNewsForm({ ...newsForm, publishedAt: event.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="table-meta">{copy.newsPanel.imageLabel}</label>
                                <input
                                    className="input"
                                    type="text"
                                    value={newsForm.imageUrl}
                                    onChange={handleNewsImageUrlChange}
                                    placeholder={copy.newsPanel.imagePlaceholder}
                                />
                                <div className="table-meta table-meta--tight">{copy.newsPanel.imageUploadHint}</div>
                                <div className="table-meta table-meta--tight">{copy.newsPanel.imageCompressionHint}</div>
                                <div className="news-admin-form__image-actions">
                                    <button type="button" className="btn btn-secondary" onClick={handleSelectNewsImageFromComputer}>
                                        <Upload size={14} />
                                        {copy.newsPanel.imageUploadAction}
                                    </button>
                                    {newsForm.imageUrl && (
                                        <button type="button" className="btn btn-ghost" onClick={handleClearNewsImage}>
                                            {copy.newsPanel.imageClearAction}
                                        </button>
                                    )}
                                </div>
                                <input
                                    ref={newsImageInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,image/gif"
                                    className="news-admin-file-input"
                                    onChange={handleNewsImageFileChange}
                                />
                                {newsImageName && (
                                    <div className="table-meta table-meta--tight news-admin-form__image-file">
                                        {copy.newsPanel.imageSelectedFile}: {newsImageName}
                                    </div>
                                )}
                                {newsImageStoredSizeBytes > 0 && (
                                    <div className="table-meta table-meta--tight news-admin-form__image-file">
                                        {copy.newsPanel.imageCompressedSize}: {formatBytes(newsImageStoredSizeBytes)}
                                    </div>
                                )}
                                {newsForm.imageUrl && (
                                    <div className="news-admin-form__image-preview">
                                        <div className="table-meta table-meta--tight">{copy.newsPanel.imagePreviewLabel}</div>
                                        <div className="news-admin-form__image-preview-frame">
                                            <img src={newsForm.imageUrl} alt={copy.newsPanel.imageLabel} loading="lazy" />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="table-meta">{copy.newsPanel.summaryLabel}</label>
                                <textarea
                                    className="input"
                                    value={newsForm.summary}
                                    onChange={(event) => setNewsForm({ ...newsForm, summary: event.target.value })}
                                    placeholder={copy.newsPanel.summaryPlaceholder}
                                    rows={5}
                                    required
                                />
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary">
                                    {copy.newsPanel.publish}
                                </button>
                            </div>
                        </form>

                        <div className="news-admin-list">
                            {orderedNews.length ? (
                                orderedNews.map((item) => (
                                    <article className="news-admin-card" key={item.id}>
                                        {item.imageUrl && (
                                            <div className="news-admin-card__cover">
                                                <img src={item.imageUrl} alt={item.title} loading="lazy" />
                                            </div>
                                        )}
                                        <div className="news-card__meta">
                                            {formatEventDate(item.publishedAt || item.createdAt)}
                                        </div>
                                        <h3>{item.title}</h3>
                                        <p>{item.summary}</p>
                                        <div className="news-admin-card__footer">
                                            <button
                                                type="button"
                                                className="btn btn-danger"
                                                onClick={() => handleDeleteNews(item)}
                                            >
                                                <Trash2 size={14} />
                                                {copy.newsPanel.remove}
                                            </button>
                                        </div>
                                    </article>
                                ))
                            ) : (
                                <div className="panel-subtitle">{copy.newsPanel.noNews}</div>
                            )}
                        </div>
                    </div>
                </section>
                )}
                {canManagePanel && activeSection === 'registrations' && (
                <section className="panel" id="registrations">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">{copy.registrationsPanel.title}</div>
                            <div className="panel-subtitle">{copy.registrationsPanel.subtitle}</div>
                        </div>
                        <div className="panel-actions">
                            {pendingSyncCount > 0 && (
                                <span className="tag tag--warning">
                                    {copy.registrationsPanel.pendingLabel}: {pendingSyncCount}
                                </span>
                            )}
                            <button
                                type="button"
                                className={`btn ${registrationPendingOnly ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => {
                                    setRegistrationPendingFilterTouched(true);
                                    setRegistrationPendingOnly((prev) => !prev);
                                }}
                                disabled={!publicRegistrations.length}
                            >
                                {registrationPendingOnly
                                    ? copy.registrationsPanel.filterAll
                                    : copy.registrationsPanel.filterPending}
                            </button>
                            <div className="search-input">
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder={copy.registrationsPanel.searchPlaceholder}
                                    value={registrationSearch}
                                    onChange={(event) => setRegistrationSearch(event.target.value)}
                                    aria-label={copy.registrationsPanel.searchAria}
                                />
                            </div>
                            <select
                                className="input select-compact"
                                value={registrationEventFilter}
                                onChange={(event) => setRegistrationEventFilter(event.target.value)}
                                aria-label={copy.registrationsPanel.eventFilter}
                            >
                                <option value="all">{copy.registrationsPanel.allEvents}</option>
                                {events.map((event) => (
                                    <option key={event.id} value={event.id}>{event.name}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleExportRegistrationsSpreadsheet}
                                disabled={registrationsLoading || registrationsSyncing || !publicRegistrations.length}
                            >
                                <Download size={14} />
                                {copy.registrationsPanel.exportSpreadsheet}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleSyncPendingRegistrations}
                                disabled={registrationsSyncing || registrationsLoading || pendingSyncCount === 0}
                            >
                                <RotateCcw size={14} />
                                {registrationsSyncing ? `${copy.registrationsPanel.syncNow}...` : copy.registrationsPanel.syncNow}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={loadPublicRegistrations}
                                disabled={registrationsLoading || registrationsSyncing}
                            >
                                <RotateCcw size={14} />
                                {copy.registrationsPanel.refresh}
                            </button>
                        </div>
                    </div>
                    {syncDiagnostics?.lastFailureAt && (
                        <div className="table-meta table-meta--tight registration-sync-monitor">
                            {copy.registrationsPanel.syncMonitorLastFailure(formatEventDate(syncDiagnostics.lastFailureAt))}
                            {syncDiagnostics?.lastTraceId
                                ? ` - ${copy.registrationsPanel.traceId}: ${syncDiagnostics.lastTraceId}`
                                : ''}
                        </div>
                    )}
                    {registrationsError && (
                        <div className="login-error" role="alert">
                            <AlertCircle size={18} />
                            <p>{registrationsError}</p>
                        </div>
                    )}
                    {registrationGroups.length > 0 && !registrationsLoading && (
                        <div className="registration-event-groups">
                            {registrationGroups.map((group) => {
                                const eventNameForReport = group.eventName || copy.common.noEvent;
                                const eventDateForReport = group.eventDate || '';
                                const eventLocationForReport = group.eventLocation || '';
                                const updatedLabel = group.updatedAt
                                    ? formatEventDateTime(group.updatedAt)
                                    : formatEventDateTime(new Date().toISOString());

                                return (
                                    <article key={group.eventId} className="registration-event-group">
                                        <div className="registration-event-group__head">
                                            <div>
                                                <div className="table-name">{eventNameForReport}</div>
                                                <div className="table-meta table-meta--tight">
                                                    {formatEventDate(eventDateForReport) || copy.eventsPanel.undefinedDate}
                                                    {eventLocationForReport ? ` - ${eventLocationForReport}` : ''}
                                                </div>
                                                <div className="table-meta table-meta--tight">
                                                    {copy.registrationsPanel.updatedAt}: {updatedLabel}
                                                </div>
                                            </div>
                                            <span className="tag">{group.rows.length} {copy.registrationsPanel.totalRegistrations}</span>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                    {registrationsLoading ? (
                        <div className="panel-subtitle">{copy.registrationsPanel.refresh}...</div>
                    ) : registrationRows.length ? (
                        <div className="registration-card-list">
                                {registrationRows.map((item) => {
                                    const pipelineState = registrationPipelineById.get(item.id) || {
                                        doneSteps: [true, false, false, false],
                                        currentStepIndex: 0
                                    };
                                    const pipelineSteps = [
                                        copy.registrationsPanel.pipelineRegistered,
                                        copy.registrationsPanel.pipelineApproved,
                                        copy.registrationsPanel.pipelineCategory,
                                        copy.registrationsPanel.pipelineBracket
                                    ];
                                    const hasCategory = Boolean(pipelineState.doneSteps?.[2]);
                                    const hasBracket = Boolean(pipelineState.doneSteps?.[3]);
                                    const flowIndicator = item.isPaymentError
                                        ? { label: copy.registrationsPanel.flowStatusPaymentError, tone: 'danger' }
                                        : item.isPaymentConfirmed
                                            ? hasCategory && hasBracket
                                                ? { label: copy.registrationsPanel.flowStatusDone, tone: 'success' }
                                                : hasCategory
                                                    ? { label: copy.registrationsPanel.flowStatusCategory, tone: 'info' }
                                                    : { label: copy.registrationsPanel.flowStatusApproved, tone: 'pending' }
                                            : { label: copy.registrationsPanel.flowStatusPending, tone: 'pending' };
                                            
                                    const isError = item.isPaymentError;
                                    const isPending = item.isPendingSync || (!item.isPaymentConfirmed && !item.isPaymentError);
                                    const isSuccess = item.isPaymentConfirmed;
                                    const statusClass = isError ? 'status-error' : isPending ? 'status-pending' : 'status-success';

                                    return (
                                    <div key={item.id} className={`registration-card ${statusClass}`}>
                                        <div className="registration-card__header">
                                            <div className="registration-card__avatar">
                                                {item.athletePhotoUrl ? (
                                                    <img src={item.athletePhotoUrl} alt={item.nome || copy.registrationsPanel.tableAthlete} loading="lazy" />
                                                ) : (
                                                    <span>{copy.registrationsPanel.noPhoto}</span>
                                                )}
                                            </div>
                                            <div className="registration-card__profile">
                                                <div className="registration-card__name">{item.nome}</div>
                                                <div className="registration-card__academy">{item.academia || copy.modalAssign.noAcademy}</div>
                                                
                                                <div className="registration-card__pipeline" role="list" aria-label={copy.registrationsPanel.tablePipeline}>
                                                    {pipelineSteps.map((label, stepIndex) => (
                                                        <span
                                                            key={`${item.id}-pipeline-${stepIndex}`}
                                                            className={`registration-card__pipeline-step ${pipelineState.doneSteps[stepIndex] ? 'is-done' : ''} ${pipelineState.currentStepIndex === stepIndex ? 'is-current' : ''}`}
                                                            role="listitem"
                                                            data-label={label}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="registration-card__body">
                                            <div className="registration-card__info-row">
                                                <AlertCircle className="registration-card__info-icon" size={14} />
                                                <div>
                                                    <div className="registration-card__info-label">{copy.registrationsPanel.tableEvent}</div>
                                                    <div className="registration-card__info-text">
                                                        <strong>{item.eventName}</strong><br />
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--muted-strong)' }}>{formatEventDate(item.eventDate)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="registration-card__info-row">
                                                <CheckCircle2 className="registration-card__info-icon" size={14} />
                                                <div>
                                                    <div className="registration-card__info-label">{copy.registrationsPanel.tableCategory}</div>
                                                    <div className="registration-card__info-text">
                                                        {item.modalidade || '-'} <br/>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--muted-strong)' }}>{item.categoria || '-'} / {item.faixa || '-'} / {item.peso || '-'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="registration-card__info-row">
                                                <RotateCcw className="registration-card__info-icon" size={14} />
                                                <div style={{ flex: 1 }}>
                                                    <div className="registration-card__info-label">{copy.registrationsPanel.tableStatus}</div>
                                                    <div className={`points-pill ${item.isPendingSync ? 'points-pill--warning' : item.isPaymentError ? 'points-pill--danger' : ''}`} style={{ display: 'inline-flex', marginBottom: '0.3rem' }}>
                                                        {item.statusLabel}
                                                    </div>
                                                    <div className={`registration-flow-indicator registration-flow-indicator--${flowIndicator.tone}`} style={{ marginTop: 0 }}>
                                                        {flowIndicator.tone === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                                        <span>{flowIndicator.label}</span>
                                                    </div>
                                                    {item.syncError && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.3rem' }}>
                                                            {copy.registrationsPanel.lastError}: {item.syncError}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="registration-card__payment">
                                            <div className="registration-card__payment-header">
                                                <span>{copy.registrationsPanel.tablePayment}</span>
                                                <span className="registration-card__payment-total">{currencyFormatter.format(item.totalValue || 0)}</span>
                                            </div>
                                            
                                            {item.notes?.pixKey && (
                                              <div style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>
                                                  <span style={{ color: 'var(--muted-strong)' }}>{copy.registrationsPanel.pixKey}:</span> {item.notes.pixKey}
                                              </div>
                                            )}

                                            {item.proofFileUrl && (
                                                <div className="registration-card__receipt-preview">
                                                    {item.isImageProof ? (
                                                        <img
                                                            className="registration-card__receipt-thumb"
                                                            src={item.proofFileUrl}
                                                            alt={item.proofName || copy.registrationsPanel.proofPreviewTitle}
                                                            loading="lazy"
                                                        />
                                                    ) : item.isPdfProof ? (
                                                        <embed
                                                            className="registration-card__receipt-thumb registration-card__receipt-thumb--pdf"
                                                            src={`${item.proofFileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                                            type="application/pdf"
                                                        />
                                                    ) : (
                                                        <div className="registration-card__receipt-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>
                                                            PDF
                                                        </div>
                                                    )}
                                                    <div className="registration-card__receipt-info">
                                                        <div className="registration-card__receipt-name">{item.proofName || 'Comprovante'}</div>
                                                        <button type="button" className="text-link" onClick={() => handleOpenProofFile(item)} style={{ fontSize: '0.75rem' }}>
                                                            {copy.registrationsPanel.openReceipt}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {!item.isPendingSync && canManagePanel && (
                                                <div className="registration-card__actions">
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary"
                                                        onClick={() => handleUpdateRegistrationPaymentStatus(item, REGISTRATION_STATUS.PAYMENT_CONFIRMED)}
                                                        disabled={registrationStatusUpdatingId === item.id || item.isPaymentConfirmed}
                                                    >
                                                        <CheckCircle2 size={14} /> Confirmar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary"
                                                        onClick={() => handleUpdateRegistrationPaymentStatus(item, REGISTRATION_STATUS.PAYMENT_ERROR)}
                                                        disabled={registrationStatusUpdatingId === item.id || item.isPaymentError}
                                                    >
                                                        <AlertCircle size={14} /> Erro
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                    ) : (
                        <div className="panel-subtitle">{copy.registrationsPanel.noData}</div>
                    )}
                </section>
                )}
                {activeSection === 'brackets' && (
                <section className="panel" id="brackets">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">{copy.bracketsPanel.title}</div>
                            <div className="panel-subtitle">{copy.bracketsPanel.subtitle}</div>
                        </div>
                        <div className="panel-actions">
                            {events.length > 0 && (
                                <select
                                    className="input select-compact"
                                    value={bracketEventId}
                                    onChange={(event) => setBracketEventId(event.target.value)}
                                    aria-label={copy.bracketsPanel.selectEventAria}
                                >
                                    <option value="">{copy.bracketsPanel.selectEvent}</option>
                                    {events.map((event) => (
                                        <option key={event.id} value={event.id}>{event.name}</option>
                                    ))}
                                </select>
                            )}
                            <select
                                className="input select-compact"
                                value={bracketMode}
                                onChange={(event) => setBracketMode(event.target.value)}
                                aria-label={copy.bracketsPanel.selectCategoryAria}
                            >
                                <option value="ALL">{copy.bracketsPanel.allCategories}</option>
                                <option value="GI">{isEnglish ? 'GI (weight)' : 'GI (peso)'}</option>
                                <option value="NO-GI">{isEnglish ? 'NO-GI (weight)' : 'NO-GI (peso)'}</option>
                                <option value="ABS-GI">ABS GI</option>
                                <option value="ABS-NO-GI">ABS NO-GI</option>
                            </select>
                            {canManagePanel && (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleGenerateBrackets}
                                    disabled={!events.length}
                                >
                                    <ClipboardList size={14} />
                                    {copy.bracketsPanel.generate}
                                </button>
                            )}
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleExportBracketsPdf}
                                disabled={!orderedFilteredBrackets.length}
                            >
                                <Download size={14} />
                                {copy.bracketsPanel.savePdf}
                            </button>
                        </div>
                    </div>
                    {bracketEventId && (
                        <div className="bracket-workspace">
                            <div className="bracket-workspace__header">
                                <div className="bracket-workspace__title">{copy.bracketsPanel.workspaceTitle}</div>
                                <div className="panel-subtitle">{copy.bracketsPanel.workspaceSubtitle}</div>
                                <div className="table-meta">
                                    {copy.bracketsPanel.event}: {eventMap[bracketEventId]?.name || copy.common.noEvent}
                                </div>
                            </div>
                            <div className="bracket-workspace__stats">
                                <span className="tag">
                                    {copy.bracketsPanel.statsApproved}: {bracketWorkspaceData.totals.approved}
                                </span>
                                <span className="tag">
                                    {copy.bracketsPanel.statsInCategory}: {bracketWorkspaceData.totals.inCategory}
                                </span>
                                <span className="tag bracket-tag--applied">
                                    {copy.bracketsPanel.statsInBracket}: {bracketWorkspaceData.totals.inBracket}
                                </span>
                                <span className="tag">
                                    {copy.bracketsPanel.statsAcademies}: {bracketWorkspaceData.totals.academies}
                                </span>
                            </div>
                            <div className="bracket-workspace__controls">
                                <div className="bracket-workspace__filter-group">
                                    <span className="bracket-section-title">{copy.bracketsPanel.quickFilter}</span>
                                    <div className="bracket-workspace__filter-pills">
                                        <button
                                            type="button"
                                            className={`btn btn-ghost bracket-filter-pill ${bracketAcademyFilter === 'all' ? 'is-active' : ''}`}
                                            onClick={() => setBracketAcademyFilter('all')}
                                        >
                                            {copy.bracketsPanel.allAcademies}
                                        </button>
                                        {bracketWorkspaceData.academyRows.map((academy) => (
                                            <button
                                                key={`workspace-filter-${academy.academy}`}
                                                type="button"
                                                className={`btn btn-ghost bracket-filter-pill ${bracketAcademyFilter === academy.academy ? 'is-active' : ''}`}
                                                onClick={() => setBracketAcademyFilter(academy.academy)}
                                            >
                                                {academy.academy}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleExportApprovedAthletesCsv}
                                    disabled={bracketWorkspaceData.totals.approved === 0}
                                >
                                    <Download size={14} />
                                    {copy.bracketsPanel.exportApprovedCsv}
                                </button>
                            </div>
                            <div className="bracket-workspace__grid">
                                <article className="bracket-workspace__panel">
                                    <div className="bracket-workspace__panel-header">
                                        <div className="bracket-section-title">{copy.bracketsPanel.approvedAthletesTitle}</div>
                                        <span className="tag">
                                            {copy.bracketsPanel.filteredLabel(bracketWorkspaceFilteredRows.length, bracketWorkspaceData.totals.approved)}
                                        </span>
                                    </div>
                                    <div className="panel-subtitle">{copy.bracketsPanel.approvedAthletesSubtitle}</div>
                                    {bracketWorkspaceFilteredRows.length > 0 ? (
                                        <div className="bracket-workspace__list">
                                            {bracketWorkspaceFilteredRows.map((item, index) => (
                                                <div
                                                    key={item.registrationId || `${item.name}-${item.athleteId || index}`}
                                                    className="bracket-workspace__item"
                                                >
                                                    <div className="bracket-workspace__item-main">
                                                        <strong>{item.name}</strong>
                                                        <span>{item.academy}</span>
                                                        {item.summary && (
                                                            <span className="bracket-workspace__item-meta">{item.summary}</span>
                                                        )}
                                                    </div>
                                                    <span className={`tag bracket-status bracket-status--${item.statusKey}`}>
                                                        {item.statusLabel}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="panel-subtitle">{copy.bracketsPanel.approvedAthletesEmpty}</div>
                                    )}
                                </article>
                                <article className="bracket-workspace__panel">
                                    <div className="bracket-workspace__panel-header">
                                        <div className="bracket-section-title">{copy.bracketsPanel.academySummaryTitle}</div>
                                        <span className="tag">{bracketWorkspaceData.totals.academies}</span>
                                    </div>
                                    <div className="panel-subtitle">{copy.bracketsPanel.academySummarySubtitle}</div>
                                    {bracketWorkspaceData.academyRows.length > 0 ? (
                                        <div className="bracket-workspace__academy-list">
                                            {bracketWorkspaceData.academyRows.map((academy) => (
                                                <div key={academy.academy} className="bracket-workspace__academy-row">
                                                    <div className="bracket-workspace__academy-name">{academy.academy}</div>
                                                    <div className="bracket-workspace__academy-stats">
                                                        <span className="tag">{copy.bracketsPanel.academyCount(academy.total)}</span>
                                                        {academy.inCategory > 0 && (
                                                            <span className="tag">{copy.bracketsPanel.statusInCategory}: {academy.inCategory}</span>
                                                        )}
                                                        {academy.inBracket > 0 && (
                                                            <span className="tag bracket-tag--applied">{copy.bracketsPanel.statusInBracket}: {academy.inBracket}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="panel-subtitle">{copy.bracketsPanel.academySummaryEmpty}</div>
                                    )}
                                </article>
                            </div>
                        </div>
                    )}
                    <div className="bracket-toolbar">
                        <div className="search-input">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder={copy.bracketsPanel.searchPlaceholder}
                                value={bracketSearch}
                                onChange={(event) => setBracketSearch(event.target.value)}
                                aria-label={copy.bracketsPanel.searchAria}
                            />
                        </div>
                        <span className="tag">{orderedFilteredBrackets.length} {copy.bracketsPanel.brackets}</span>
                    </div>
                    <div className="bracket-list">
                        {orderedFilteredBrackets.map((bracket) => {
                            const bracketAthletes = (bracket.seedIds || [])
                                .map((id) => athleteMap.get(id))
                                .filter(Boolean);
                            const matches = bracketAthletes.length
                                ? buildBracketMatches(bracket.seedIds || [], bracket.size || 0)
                                : [];
                            const eventLabel = eventMap[bracket.eventId]?.name || copy.common.noEvent;
                            const applied = Boolean(bracket.appliedAt);

                            return (
                                <div
                                    key={bracket.id}
                                    className={`bracket-card ${draggingBracketId === bracket.id ? 'is-dragging' : ''}`}
                                    draggable
                                    onDragStart={(event) => handleBracketCardDragStart(event, bracket.id)}
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={(event) => handleBracketCardDrop(event, bracket.id)}
                                    onDragEnd={handleBracketCardDragEnd}
                                >
                                    <div className="bracket-card__header">
                                        <div>
                                            <div className="bracket-number">{copy.bracketsPanel.bracket} {bracket.number || '-'}</div>
                                            <div className="table-meta">{localizeComposite(bracket.label)}</div>
                                        </div>
                                        <div className="bracket-tags">
                                            <span className="tag">{bracket.mode || 'GI'}</span>
                                            {applied && <span className="tag bracket-tag--applied">{copy.bracketsPanel.applied}</span>}
                                        </div>
                                    </div>
                                    <div className="bracket-card__meta">
                                        {copy.bracketsPanel.event}: {eventLabel} · {copy.bracketsPanel.athletes}: {bracketAthletes.length}
                                    </div>
                                    <div className="bracket-grid">
                                        <div className="bracket-matches">
                                            <div className="bracket-section-title">{copy.bracketsPanel.round1}</div>
                                            {matches.map((match, index) => {
                                                const athleteA = match.slotA ? athleteMap.get(match.slotA) : null;
                                                const athleteB = match.slotB ? athleteMap.get(match.slotB) : null;
                                                return (
                                                    <div key={match.id} className="bracket-match">
                                                        <span className="bracket-seed">
                                                            <span className="bracket-seed__name">{athleteA?.nome || 'BYE'}</span>
                                                            {athleteA?.academia && (
                                                                <span className="bracket-seed__academy">{athleteA.academia}</span>
                                                            )}
                                                        </span>
                                                        <span className="bracket-vs">vs</span>
                                                        <span className="bracket-seed">
                                                            <span className="bracket-seed__name">{athleteB?.nome || 'BYE'}</span>
                                                            {athleteB?.academia && (
                                                                <span className="bracket-seed__academy">{athleteB.academia}</span>
                                                            )}
                                                        </span>
                                                        <span className="bracket-match__index">#{index + 1}</span>
                                                    </div>
                                                );
                                            })}
                                            {matches.length === 0 && (
                                                <div className="panel-subtitle">{copy.bracketsPanel.noAthleteBracket}</div>
                                            )}
                                            {bracketAthletes.length > 1 && (
                                                <div className="bracket-seed-editor">
                                                    <div className="bracket-section-title">{copy.bracketsPanel.seedEditorTitle}</div>
                                                    <div className="table-meta">{copy.bracketsPanel.seedEditorHint}</div>
                                                    <div className="bracket-seed-editor__list">
                                                        {bracketAthletes.map((athlete, athleteIndex) => (
                                                            <div
                                                                key={`${bracket.id}-seed-editor-${athlete.id}`}
                                                                className={`bracket-seed-editor__item ${dragSeedContext.bracketId === bracket.id && dragSeedContext.athleteId === athlete.id ? 'is-dragging' : ''}`}
                                                                draggable
                                                                onDragStart={(event) => handleSeedDragStart(event, bracket.id, athlete.id)}
                                                                onDragOver={(event) => event.preventDefault()}
                                                                onDrop={(event) => handleSeedDrop(event, bracket, athlete.id)}
                                                                onDragEnd={handleSeedDragEnd}
                                                            >
                                                                <GripVertical size={14} />
                                                                <span className="bracket-seed-editor__index">#{athleteIndex + 1}</span>
                                                                <span className="bracket-seed-editor__name">{athlete.nome}</span>
                                                                <span className="bracket-seed-editor__academy">{athlete.academia || '-'}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="bracket-podium">
                                            <div className="bracket-section-title">{copy.bracketsPanel.podium}</div>
                                            <label className="bracket-field">
                                                <span>{copy.bracketsPanel.firstPlace}</span>
                                                <select
                                                    className="input bracket-select"
                                                    value={bracket.podium?.goldId || ''}
                                                    onChange={(event) => setBracketPodium(bracket.id, { goldId: event.target.value })}
                                                    disabled={bracketAthletes.length === 0}
                                                >
                                                    <option value="">{copy.bracketsPanel.selectAthlete}</option>
                                                    {bracketAthletes.map((athlete) => (
                                                        <option key={athlete.id} value={athlete.id}>
                                                            {athlete.academia ? `${athlete.nome} - ${athlete.academia}` : athlete.nome}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                            <label className="bracket-field">
                                                <span>{copy.bracketsPanel.secondPlace}</span>
                                                <select
                                                    className="input bracket-select"
                                                    value={bracket.podium?.silverId || ''}
                                                    onChange={(event) => setBracketPodium(bracket.id, { silverId: event.target.value })}
                                                    disabled={bracketAthletes.length < 2}
                                                >
                                                    <option value="">{copy.bracketsPanel.selectAthlete}</option>
                                                    {bracketAthletes.map((athlete) => (
                                                        <option key={athlete.id} value={athlete.id}>
                                                            {athlete.academia ? `${athlete.nome} - ${athlete.academia}` : athlete.nome}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                            <label className="bracket-field">
                                                <span>{copy.bracketsPanel.thirdPlace}</span>
                                                <select
                                                    className="input bracket-select"
                                                    value={bracket.podium?.bronzeId || ''}
                                                    onChange={(event) => setBracketPodium(bracket.id, { bronzeId: event.target.value })}
                                                    disabled={bracketAthletes.length < 3}
                                                >
                                                    <option value="">{copy.bracketsPanel.selectAthlete}</option>
                                                    {bracketAthletes.map((athlete) => (
                                                        <option key={athlete.id} value={athlete.id}>
                                                            {athlete.academia ? `${athlete.nome} - ${athlete.academia}` : athlete.nome}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                            <button
                                                type="button"
                                                className="btn btn-primary bracket-apply"
                                                onClick={() => handleApplyBracketPodium(bracket.id)}
                                                disabled={bracketAthletes.length === 0}
                                            >
                                                {applied ? copy.bracketsPanel.reapply : copy.bracketsPanel.apply}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {orderedFilteredBrackets.length === 0 && (
                            <div className="panel-subtitle">{copy.bracketsPanel.noBracketFound}</div>
                        )}
                    </div>
                </section>
                )}
                {activeSection === 'schedule' && (
                <section className="panel" id="schedule">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">{copy.schedulePanel.title}</div>
                            <div className="panel-subtitle">{copy.schedulePanel.subtitle}</div>
                        </div>
                        <div className="panel-actions">
                            {events.length > 0 && (
                                <select
                                    className="input select-compact"
                                    value={scheduleEventId}
                                    onChange={(event) => setScheduleEventId(event.target.value)}
                                    aria-label={copy.schedulePanel.selectEventAria}
                                >
                                    <option value="">{copy.schedulePanel.selectEvent}</option>
                                    {events.map((event) => (
                                        <option key={`schedule-event-${event.id}`} value={event.id}>{event.name}</option>
                                    ))}
                                </select>
                            )}
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handlePublishSchedule}
                                disabled={!manualScheduleData.rows.length}
                                style={{ background: '#00c2cb', borderColor: '#00c2cb' }}
                            >
                                <Send size={14} />
                                {isEnglish ? 'Publish' : 'Publicar'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => handleExportSchedulePdf('table')}
                                disabled={!manualScheduleData.rows.length}
                            >
                                <Download size={14} />
                                {copy.schedulePanel.exportSchedulePdfTable}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => handleExportSchedulePdf('tv')}
                                disabled={!manualScheduleData.rows.length}
                            >
                                <Monitor size={14} />
                                {copy.schedulePanel.exportSchedulePdfTv}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowScheduleTvMode(true)}
                                disabled={!manualScheduleData.rows.length}
                            >
                                <Monitor size={14} />
                                {copy.schedulePanel.tvModeOpen}
                            </button>
                        </div>
                    </div>
                    {!scheduleEventId && (
                        <div className="panel-subtitle">{copy.schedulePanel.selectEvent}</div>
                    )}
                    {scheduleEventId && (
                        <div className="bracket-schedule">
                            <div className="bracket-schedule__controls schedule-manual-form">
                                <label className="bracket-field">
                                    <span>{copy.schedulePanel.itemTitle}</span>
                                    <input
                                        className="input bracket-schedule-input"
                                        value={scheduleDraft.title}
                                        onChange={(event) => handleScheduleDraftField('title', event.target.value)}
                                        placeholder={copy.schedulePanel.addItemTitle}
                                    />
                                </label>
                                <label className="bracket-field">
                                    <span>{copy.schedulePanel.itemType}</span>
                                    <select
                                        className="input bracket-schedule-input"
                                        value={scheduleDraft.type}
                                        onChange={(event) => handleScheduleDraftField('type', event.target.value)}
                                    >
                                        <option value="FIGHT">{copy.schedulePanel.typeFight}</option>
                                        <option value="BREAK">{copy.schedulePanel.typeBreak}</option>
                                        <option value="CEREMONY">{copy.schedulePanel.typeCeremony}</option>
                                        <option value="OTHER">{copy.schedulePanel.typeOther}</option>
                                    </select>
                                </label>
                                <label className="bracket-field">
                                    <span>{copy.schedulePanel.itemArea}</span>
                                    <input
                                        className="input bracket-schedule-input"
                                        value={scheduleDraft.area}
                                        onChange={(event) => handleScheduleDraftField('area', event.target.value)}
                                        placeholder="Area 1"
                                    />
                                </label>
                                <label className="bracket-field">
                                    <span>{copy.schedulePanel.itemStart}</span>
                                    <input
                                        className="input bracket-schedule-input"
                                        type="time"
                                        value={scheduleDraft.start}
                                        onChange={(event) => handleScheduleDraftField('start', event.target.value)}
                                    />
                                </label>
                                <label className="bracket-field">
                                    <span>{copy.schedulePanel.itemEnd}</span>
                                    <input
                                        className="input bracket-schedule-input"
                                        type="time"
                                        value={scheduleDraft.end}
                                        onChange={(event) => handleScheduleDraftField('end', event.target.value)}
                                    />
                                </label>
                                <label className="bracket-field">
                                    <span>{copy.schedulePanel.itemNotes}</span>
                                    <input
                                        className="input bracket-schedule-input"
                                        value={scheduleDraft.notes}
                                        onChange={(event) => handleScheduleDraftField('notes', event.target.value)}
                                    />
                                </label>
                            </div>
                            <div className="bracket-schedule__header-actions">
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleAddManualScheduleItem}
                                >
                                    {copy.schedulePanel.addItemAction}
                                </button>
                            </div>
                            <div className="bracket-schedule__stats">
                                <span className="tag">{copy.schedulePanel.totalItems}: {manualScheduleData.totalItems}</span>
                                <span className="tag">{copy.schedulePanel.totalFights}: {manualScheduleData.totalFights}</span>
                                <span className="tag">{copy.schedulePanel.totalDuration}: {formatDurationLabel(manualScheduleData.totalDurationMinutes, isEnglish)}</span>
                                <span className="tag bracket-tag--applied">{copy.schedulePanel.estimatedEnd}: {manualScheduleData.estimatedEndLabel}</span>
                            </div>
                            {manualScheduleData.rows.length > 0 ? (
                                <div className="schedule-manual-list">
                                    {manualScheduleData.rows.map((row, index) => (
                                        <article key={`manual-schedule-${row.id}`} className="schedule-manual-item">
                                            <div className="schedule-manual-item__header">
                                                <span className="tag">#{index + 1}</span>
                                                <span className="tag">{row.typeLabel}</span>
                                                {row.area && <span className="tag">{row.area}</span>}
                                                <span className="tag bracket-tag--applied">{row.startLabel} - {row.endLabel}</span>
                                            </div>
                                            <div className="schedule-manual-item__grid">
                                                <input
                                                    className="input"
                                                    value={row.title}
                                                    onChange={(event) => handleUpdateManualScheduleRow(row.id, 'title', event.target.value)}
                                                    placeholder={copy.schedulePanel.itemTitle}
                                                />
                                                <select
                                                    className="input"
                                                    value={row.type}
                                                    onChange={(event) => handleUpdateManualScheduleRow(row.id, 'type', event.target.value)}
                                                >
                                                    <option value="FIGHT">{copy.schedulePanel.typeFight}</option>
                                                    <option value="BREAK">{copy.schedulePanel.typeBreak}</option>
                                                    <option value="CEREMONY">{copy.schedulePanel.typeCeremony}</option>
                                                    <option value="OTHER">{copy.schedulePanel.typeOther}</option>
                                                </select>
                                                <input
                                                    className="input"
                                                    value={row.area}
                                                    onChange={(event) => handleUpdateManualScheduleRow(row.id, 'area', event.target.value)}
                                                    placeholder={copy.schedulePanel.itemArea}
                                                />
                                                <input
                                                    className="input"
                                                    type="time"
                                                    value={row.startLabel}
                                                    onChange={(event) => handleUpdateManualScheduleRow(row.id, 'start', event.target.value)}
                                                />
                                                <input
                                                    className="input"
                                                    type="time"
                                                    value={row.endLabel}
                                                    onChange={(event) => handleUpdateManualScheduleRow(row.id, 'end', event.target.value)}
                                                />
                                                <input
                                                    className="input"
                                                    value={row.notes}
                                                    onChange={(event) => handleUpdateManualScheduleRow(row.id, 'notes', event.target.value)}
                                                    placeholder={copy.schedulePanel.itemNotes}
                                                />
                                            </div>
                                            <div className="schedule-manual-item__footer">
                                                <div className="table-meta">{formatDurationLabel(row.durationMinutes, isEnglish)}</div>
                                                <div className="schedule-manual-item__actions">
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost"
                                                        onClick={() => handleMoveManualScheduleRow(row.id, 'up')}
                                                        disabled={index === 0}
                                                    >
                                                        {copy.schedulePanel.moveUp}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost"
                                                        onClick={() => handleMoveManualScheduleRow(row.id, 'down')}
                                                        disabled={index === manualScheduleData.rows.length - 1}
                                                    >
                                                        {copy.schedulePanel.moveDown}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost"
                                                        onClick={() => handleRemoveManualScheduleRow(row.id)}
                                                    >
                                                        <Trash2 size={14} />
                                                        {copy.schedulePanel.remove}
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <div className="panel-subtitle">{copy.schedulePanel.noItems}</div>
                            )}
                        </div>
                    )}
                </section>
                )}
                {canManagePanel && activeSection === 'overview' && (
                <section className="panel">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">{copy.beltSummary.title}</div>
                            <div className="panel-subtitle">{copy.beltSummary.subtitle}</div>
                        </div>
                        <button
                            type="button"
                            className="tag tag-button"
                            onClick={handleRefreshBeltSummary}
                            title={`${copy.beltSummary.updateTitle} ${now.toLocaleTimeString(locale)}`}
                        >
                            {copy.common.update}
                        </button>
                    </div>
                    <div className="mini-chart">
                        {beltStats.map((belt) => (
                            <div key={belt.label}>
                                <div
                                    className="mini-chart__bar"
                                    style={{ height: `${Math.max(12, (belt.points / maxBeltPoints) * 120)}px` }}
                                >
                                    {belt.points}
                                </div>
                                <div className="mini-chart__label">{localizeBelt(belt.label, belt.label)}</div>
                            </div>
                        ))}
                    </div>
                </section>
                )}
                {canManagePanel && activeSection === 'athletes' && (
                <section className="panel" id="athletes">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">{copy.athletesPanel.title}</div>
                            <div className="panel-subtitle">{copy.athletesPanel.subtitle}</div>
                        </div>
                        <div className="panel-actions">
                            <div className="search-input">
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder={copy.athletesPanel.searchPlaceholder}
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    aria-label={copy.athletesPanel.searchAria}
                                />
                            </div>
                            {events.length > 0 && (
                                <select
                                    className="input select-compact"
                                    value={eventFilter}
                                    onChange={(event) => setEventFilter(event.target.value)}
                                    aria-label={copy.athletesPanel.filterEventAria}
                                >
                                    <option value="all">{copy.common.allEvents}</option>
                                    <option value="none">{copy.athletesPanel.noEvent}</option>
                                    {events.map((event) => (
                                        <option key={event.id} value={event.id}>{event.name}</option>
                                    ))}
                                </select>
                            )}
                            <div className="view-toggle">
                                <button
                                    type="button"
                                    className={`toggle-btn ${viewMode === 'table' ? 'is-active' : ''}`}
                                    onClick={() => setViewMode('table')}
                                    aria-label={copy.athletesPanel.listView}
                                >
                                    <List size={14} />
                                </button>
                                <button
                                    type="button"
                                    className={`toggle-btn ${viewMode === 'cards' ? 'is-active' : ''}`}
                                    onClick={() => setViewMode('cards')}
                                    aria-label={copy.athletesPanel.cardView}
                                >
                                    <LayoutGrid size={14} />
                                </button>
                            </div>
                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={handleClearAthletes}
                                disabled={!athletes.length}
                            >
                                <AlertCircle size={14} />
                                {copy.athletesPanel.clearBase}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleClearReimportLocks}
                                disabled={!suppressedRegistrationKeys.length}
                            >
                                <RotateCcw size={14} />
                                {copy.athletesPanel.clearReimportLocks}
                                {suppressedRegistrationKeys.length ? ` (${suppressedRegistrationKeys.length})` : ''}
                            </button>
                        </div>
                    </div>

                    {viewMode === 'table' ? (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>{copy.athletesPanel.profile}</th>
                                    <th>{copy.athletesPanel.athlete}</th>
                                    <th>{copy.athletesPanel.academy}</th>
                                    <th>{copy.athletesPanel.event}</th>
                                    <th>{copy.athletesPanel.contact}</th>
                                    <th className="points-col">{copy.common.points}</th>
                                    <th style={{ textAlign: 'right' }}>{copy.athletesPanel.actions}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagedAthleteRows.map(({ athlete, profile, eventLabel, photoUrl }) => {
                                    const profileMeta = [profile?.city, profile?.country].filter(Boolean).join(' - ');
                                    return (
                                    <tr key={athlete.id}>
                                        <td className="athlete-photo-cell">
                                            {photoUrl ? (
                                                <img className="athlete-photo" src={photoUrl} alt={athlete.nome} loading="lazy" />
                                            ) : (
                                                <span className="athlete-photo-empty">{copy.athletesPanel.noPhoto}</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="table-name">{athlete.nome}</div>
                                            <div className="table-meta">
                                                {localizeBelt(athlete.faixa)} / {localizeWeight(athlete.peso)} / {localizeCategory(athlete.categoria)} / {athlete.isNoGi ? 'NO-GI' : 'GI'} / {eventLabel}
                                            </div>
                                        </td>
                                        <td>{athlete.academia}</td>
                                        <td>{eventLabel}</td>
                                        <td>
                                            {profile ? (
                                                <div>
                                                    <div className="table-meta table-meta--tight">{profile.email || '-'}</div>
                                                    <div className="table-meta table-meta--tight">{profile.phone || '-'}</div>
                                                    {profileMeta ? <div className="table-meta table-meta--tight">{profileMeta}</div> : null}
                                                </div>
                                            ) : (
                                                <span className="table-meta table-meta--tight">{copy.athletesPanel.noProfile}</span>
                                            )}
                                        </td>
                                        <td className="points-col">
                                            <span className="points-pill">{athlete.pontos} pts</span>
                                        </td>
                                        <td>
                                            <div className="row-actions">
                                                <div className="points-editor">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder={copy.athletesPanel.pointsPlaceholder}
                                                        value={manualInputs[athlete.id] ?? ''}
                                                        onChange={(event) => handleManualInputChange(athlete.id, event.target.value)}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="action-btn action-btn--set"
                                                        onClick={() => handleManualPoints(athlete.id)}
                                                    >
                                                        OK
                                                    </button>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="action-btn action-btn--reset"
                                                    onClick={() => {
                                                        resetAthletePoints(athlete.id);
                                                        setManualInputs((prev) => ({ ...prev, [athlete.id]: '' }));
                                                        showFeedback('success', copy.feedback.pointsClearedFor(athlete.nome));
                                                    }}
                                                    aria-label={copy.athletesPanel.clearPointsAria}
                                                >
                                                    <RotateCcw size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="action-btn action-btn--podium"
                                                    onClick={() => {
                                                        updateAthletePoints(athlete.id, { type: 'podium', position: 1 });
                                                        showFeedback('success', copy.feedback.goldFor(athlete.nome));
                                                    }}
                                                    aria-label={copy.athletesPanel.registerGoldAria}
                                                >
                                                    <Trophy size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="action-btn action-btn--podium-silver"
                                                    onClick={() => {
                                                        updateAthletePoints(athlete.id, { type: 'podium', position: 2 });
                                                        showFeedback('success', copy.feedback.silverFor(athlete.nome));
                                                    }}
                                                    aria-label={copy.athletesPanel.registerSilverAria}
                                                >
                                                    2
                                                </button>
                                                <button
                                                    type="button"
                                                    className="action-btn action-btn--podium-bronze"
                                                    onClick={() => {
                                                        updateAthletePoints(athlete.id, { type: 'podium', position: 3 });
                                                        showFeedback('success', copy.feedback.bronzeFor(athlete.nome));
                                                    }}
                                                    aria-label={copy.athletesPanel.registerBronzeAria}
                                                >
                                                    3
                                                </button>
                                                <button
                                                    type="button"
                                                    className="action-btn action-btn--danger"
                                                    onClick={() => handleRemoveAthlete(athlete)}
                                                    aria-label={copy.athletesPanel.removeAthleteAria}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="card-grid">
                            {pagedAthleteRows.map(({ athlete, profile, eventLabel, photoUrl }) => {
                                const profileMeta = [profile?.city, profile?.country].filter(Boolean).join(' - ');
                                return (
                                <div key={athlete.id} className="athlete-card">
                                    <div className="athlete-card__header">
                                        <div className="athlete-card__identity">
                                            {photoUrl ? (
                                                <img className="athlete-photo athlete-photo--card" src={photoUrl} alt={athlete.nome} loading="lazy" />
                                            ) : (
                                                <span className="athlete-photo-empty athlete-photo-empty--card">{copy.athletesPanel.noPhoto}</span>
                                            )}
                                            <div>
                                            <div className="table-name">{athlete.nome}</div>
                                            <div className="table-meta">{athlete.academia}</div>
                                            </div>
                                        </div>
                                        <span className="points-pill">{athlete.pontos} pts</span>
                                    </div>
                                    <div className="table-meta">
                                        {localizeBelt(athlete.faixa)} / {localizeWeight(athlete.peso)} / {localizeCategory(athlete.categoria)} / {athlete.isNoGi ? 'NO-GI' : 'GI'} / {eventLabel}
                                    </div>
                                    {profile ? (
                                        <div className="table-meta">
                                            {(profile.email || '-')} / {(profile.phone || '-')}
                                            {profileMeta ? ` / ${profileMeta}` : ''}
                                        </div>
                                    ) : (
                                        <div className="table-meta">{copy.athletesPanel.noProfile}</div>
                                    )}
                                    <div className="athlete-card__actions">
                                        <div className="points-editor">
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder={copy.athletesPanel.pointsPlaceholder}
                                                value={manualInputs[athlete.id] ?? ''}
                                                onChange={(event) => handleManualInputChange(athlete.id, event.target.value)}
                                            />
                                            <button
                                                type="button"
                                                className="action-btn action-btn--set"
                                                onClick={() => handleManualPoints(athlete.id)}
                                            >
                                                OK
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            className="action-btn action-btn--reset"
                                            onClick={() => {
                                                resetAthletePoints(athlete.id);
                                                setManualInputs((prev) => ({ ...prev, [athlete.id]: '' }));
                                                showFeedback('success', copy.feedback.pointsClearedFor(athlete.nome));
                                            }}
                                            aria-label={copy.athletesPanel.clearPointsAria}
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            className="action-btn action-btn--podium"
                                            onClick={() => {
                                                updateAthletePoints(athlete.id, { type: 'podium', position: 1 });
                                                showFeedback('success', copy.feedback.goldFor(athlete.nome));
                                            }}
                                            aria-label={copy.athletesPanel.registerGoldAria}
                                        >
                                            <Trophy size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            className="action-btn action-btn--podium-silver"
                                            onClick={() => {
                                                updateAthletePoints(athlete.id, { type: 'podium', position: 2 });
                                                showFeedback('success', copy.feedback.silverFor(athlete.nome));
                                            }}
                                            aria-label={copy.athletesPanel.registerSilverAria}
                                        >
                                            2
                                        </button>
                                        <button
                                            type="button"
                                            className="action-btn action-btn--podium-bronze"
                                            onClick={() => {
                                                updateAthletePoints(athlete.id, { type: 'podium', position: 3 });
                                                showFeedback('success', copy.feedback.bronzeFor(athlete.nome));
                                            }}
                                            aria-label={copy.athletesPanel.registerBronzeAria}
                                        >
                                            3
                                        </button>
                                        <button
                                            type="button"
                                            className="action-btn action-btn--danger"
                                            onClick={() => handleRemoveAthlete(athlete)}
                                            aria-label={copy.athletesPanel.removeAthleteAria}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                    {athleteRows.length > 0 && (
                        <div className="athletes-pagination">
                            <div className="table-meta">
                                {copy.athletesPanel.paginationShowing(
                                    athletePageRange.from,
                                    athletePageRange.to,
                                    athletePageRange.total
                                )}
                            </div>
                            <div className="athletes-pagination__controls">
                                <label className="athletes-pagination__label">
                                    <span>{copy.athletesPanel.paginationPerPage}</span>
                                    <select
                                        className="input select-compact"
                                        value={athletesPageSize}
                                        onChange={(event) => setAthletesPageSize(Number(event.target.value) || ATHLETE_PAGE_SIZE_OPTIONS[0])}
                                    >
                                        {ATHLETE_PAGE_SIZE_OPTIONS.map((size) => (
                                            <option key={size} value={size}>{size}</option>
                                        ))}
                                    </select>
                                </label>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-event btn-event--small"
                                    onClick={() => setAthletesPage((prev) => Math.max(1, prev - 1))}
                                    disabled={athletesPage <= 1}
                                >
                                    {copy.athletesPanel.paginationPrev}
                                </button>
                                <span className="tag">
                                    {copy.athletesPanel.paginationPage} {athletesPage}/{athletesPageCount}
                                </span>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-event btn-event--small"
                                    onClick={() => setAthletesPage((prev) => Math.min(athletesPageCount, prev + 1))}
                                    disabled={athletesPage >= athletesPageCount}
                                >
                                    {copy.athletesPanel.paginationNext}
                                </button>
                            </div>
                        </div>
                    )}
                    {athleteRows.length === 0 && (
                        <div className="panel-subtitle">{copy.athletesPanel.noAthleteFound}</div>
                    )}
                </section>
                )}
                {canManagePanel && activeSection === 'automation' && (
                <section className="panel" id="automation">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">{copy.automation.title}</div>
                            <div className="panel-subtitle">{copy.automation.subtitle}</div>
                        </div>
                        <span className="tag">{copy.automation.fast}</span>
                    </div>
                    <div className="import-panel import-panel--admin">
                        <div>
                            <strong>{copy.automation.importFromPdf}</strong>
                            <span>{copy.automation.importDescription}</span>
                        </div>
                        <div className="import-actions">
                            {events.length > 0 && (
                                <select value={importEventId} onChange={(event) => setImportEventId(event.target.value)}>
                                    <option value="">{copy.common.noEvent}</option>
                                    {events.map((event) => (
                                        <option key={event.id} value={event.id}>{event.name}</option>
                                    ))}
                                </select>
                            )}
                            <select value={importMode} onChange={(event) => setImportMode(event.target.value)}>
                                <option value="GI">GI</option>
                                <option value="NO-GI">NO-GI</option>
                            </select>
                            <label className="import-button">
                                <Upload size={14} />
                                {copy.automation.importPdf}
                                <input
                                    ref={importInputRef}
                                    type="file"
                                    accept=".pdf,.txt"
                                    onChange={handleImportFile}
                                />
                            </label>
                        </div>
                        {(importStatus || importError) && (
                            <div className={`import-status ${importError ? 'is-error' : ''}`}>
                                {importError || importStatus}
                            </div>
                        )}
                        {importDebug && (
                            <div className="import-debug">
                                <div className="import-debug__title">{copy.automation.debugPreview}</div>
                                <pre>{importDebug}</pre>
                            </div>
                        )}
                    </div>
                    <div className="action-grid">
                        <div className="action-card">
                            <strong>{copy.automation.importFile}</strong>
                            <span>{copy.automation.importFileDesc}</span>
                            <div className="action-card__footer">
                                <button type="button" className="btn btn-ghost" onClick={handleImportRanking}>
                                    <Upload size={14} />
                                    {copy.automation.select}
                                </button>
                                <span className="tag">Ctrl + I</span>
                            </div>
                        </div>
                        <div className="action-card">
                            <strong>{copy.automation.exportReport}</strong>
                            <span>{copy.automation.exportReportDesc}</span>
                            <div className="action-card__footer">
                                <button type="button" className="btn btn-ghost" onClick={handleFinalizeEvent}>
                                    <Download size={14} />
                                    {copy.automation.generatePdf}
                                </button>
                                <span className="tag">Ctrl + E</span>
                            </div>
                        </div>
                        <div className="action-card">
                            <strong>{copy.automation.immediateControl}</strong>
                            <span>{copy.automation.immediateControlDesc}</span>
                            <div className="action-card__footer">
                                <button type="button" className="btn btn-ghost" onClick={clearEventResults}>
                                    <Zap size={14} />
                                    {copy.automation.clear}
                                </button>
                                <span className="tag">{copy.automation.safe}</span>
                            </div>
                        </div>
                        <div className="action-card">
                            <strong>{copy.automation.clearAthletes}</strong>
                            <span>{copy.automation.clearAthletesDesc}</span>
                            <div className="action-card__footer">
                                <button type="button" className="btn btn-danger" onClick={handleClearAthletes}>
                                    <AlertCircle size={14} />
                                    {copy.automation.clearAll}
                                </button>
                                <span className="tag">{copy.automation.caution}</span>
                            </div>
                        </div>
                    </div>

                    <div className="panel-header" style={{ marginTop: '1.8rem' }}>
                        <div>
                            <div className="panel-title">{copy.automation.keyboardTitle}</div>
                            <div className="panel-subtitle">{copy.automation.keyboardSubtitle}</div>
                        </div>
                    </div>
                    <div className="shortcut-list">
                        <span className="shortcut-pill">{copy.automation.shortcutNewAthlete}</span>
                        <span className="shortcut-pill">{copy.automation.shortcutImport}</span>
                        <span className="shortcut-pill">{copy.automation.shortcutExport}</span>
                        <span className="shortcut-pill">{copy.automation.shortcutLogs}</span>
                    </div>
                </section>
                )}
                {/* ── LUTAS CASADAS (SUPERFIGHTS) ─────── */}
                {canManagePanel && activeSection === 'superfights' && (() => {
                    const activeEvent = events.find(e => e.id === activeEventId);
                    if (!activeEvent) {
                        return (
                            <div style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f8fafc', margin: 0 }}>
                                        <Swords size={24} style={{ color: '#ef4444', marginRight: '8px' }} />
                                        Gestão de Lutas Casadas
                                    </h2>
                                    <select 
                                        className="input" 
                                        value={activeEventId || ''} 
                                        onChange={(e) => setActiveEvent(e.target.value)}
                                        style={{ minWidth: '300px', background: '#0f172a', border: '1px solid #334155' }}
                                    >
                                        <option value="">Selecione o Campeonato</option>
                                        {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                                    </select>
                                </div>
                                <div className="empty-state" style={{ padding: '48px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', marginTop: '24px' }}>
                                    <AlertCircle size={48} style={{ color: '#94a3b8', margin: '0 auto 16px' }} />
                                    <h3 style={{ margin: '0 0 8px 0', color: '#f8fafc' }}>Nenhum Campeonato Selecionado</h3>
                                    <p style={{ color: '#94a3b8', margin: '0 0 24px 0' }}>Selecione um campeonato na lista acima para gerenciar as lutas casadas.</p>
                                </div>
                            </div>
                        );
                    }
                    if (!activeEvent.superFightsPublished) {
                        return (
                            <div className="empty-state">
                                <div className="empty-state__icon">
                                    <AlertCircle size={48} />
                                </div>
                                
                                <h3>Lutas Casadas Desativadas</h3>
                                <p>Este evento não possui a funcionalidade de lutas casadas ativa. Ative em 'Eventos' &gt; Editar Evento &gt; Inscrições e Valores.</p>
                                <button 
                                    className="btn btn-primary" 
                                    style={{ marginTop: '16px' }}
                                    onClick={() => {
                                        updateEvent(activeEvent.id, {
                                            ...activeEvent,
                                            superFightsPublished: true
                                        }).then(() => showFeedback('success', 'Lutas Casadas ativadas com sucesso!'));
                                    }}
                                >
                                    Ativar Lutas Casadas Agora
                                </button>

                            </div>
                        );
                    }

                    const fights = activeEvent.superFights || [];

                    return (
                        <div className="superfights-container" style={{ padding: '24px', animation: 'fadeIn 0.4s ease' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                                    <div>
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Swords size={24} style={{ color: '#ef4444' }} />
                                            Gestão de Lutas Casadas
                                        </h2>
                                    </div>
                                    <select 
                                        className="input" 
                                        value={activeEventId || ''} 
                                        onChange={(e) => setActiveEvent(e.target.value)}
                                        style={{ minWidth: '300px', background: '#0f172a', border: '1px solid #334155' }}
                                    >
                                        <option value="">Selecione o Campeonato</option>
                                        {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                                    </select>
                                </div>
                                <button className="btn btn-primary" onClick={() => {
                                    setSuperfightForm({
                                        id: '',
                                        scheduledTime: '',
                                        fighter1: { name: '', academy: '', belt: 'Branca', photo: '' },
                                        fighter2: { name: '', academy: '', belt: 'Branca', photo: '' },
                                        status: 'pending',
                                        published: false
                                    });
                                }}>
                                    <Plus size={18} /> Nova Luta
                                </button>
                            </div>

                            {fights.length === 0 ? (
                                <div className="empty-state" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                                    <div className="empty-state__icon">
                                        <Swords size={48} />
                                    </div>
                                    <h3>Nenhuma Luta Casada</h3>
                                    <p>Clique no botão acima para adicionar a primeira luta.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                                    {fights.map((fight, i) => (
                                        <div key={fight.id || i} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '16px' }}>
                                            
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <span style={{ fontSize: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>LUTA PRINCIPAL</span>
                                                    {!fight.published && <span style={{ fontSize: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>RASCUNHO</span>}
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button onClick={() => {
                                                        const updatedEvent = { ...activeEvent };
                                                        const fightIndex = updatedEvent.superFights.findIndex(f => f.id === fight.id);
                                                        if (fightIndex >= 0) {
                                                            updatedEvent.superFights[fightIndex] = { ...fight, published: !fight.published };
                                                            updateEvent(activeEvent.id, updatedEvent);
                                                        }
                                                    }} style={{ background: fight.published ? 'rgba(34, 197, 94, 0.1)' : 'rgba(56, 189, 248, 0.1)', border: fight.published ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(56, 189, 248, 0.2)', color: fight.published ? '#22c55e' : '#38bdf8', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }} title={fight.published ? "Despublicar luta" : "Publicar luta"}>
                                                        {fight.published ? <Eye size={14} /> : <EyeOff size={14} />}
                                                        {fight.published ? 'Publicado' : 'Publicar'}
                                                    </button>
                                                    <button onClick={() => setSuperfightForm(fight)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><Pencil size={16} /></button>
                                                    <button onClick={() => {
                                                        if (window.confirm('Excluir luta casada?')) {
                                                            const updatedEvent = { ...activeEvent };
                                                            updatedEvent.superFights = updatedEvent.superFights.filter(f => f.id !== fight.id);
                                                            updateEvent(activeEvent.id, updatedEvent);
                                                        }
                                                    }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                            
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                {/* Atleta 1 */}
                                                <div style={{ textAlign: 'center', flex: 1 }}>
                                                    <img src={fight.fighter1?.photo} alt={fight.fighter1?.name} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #334155', marginBottom: '8px' }} onError={(e) => e.target.src = 'https://via.placeholder.com/80?text=FOTO'} />
                                                    <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '14px' }}>{fight.fighter1?.name}</div>
                                                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{fight.fighter1?.academy}</div>
                                                    <div style={{ fontSize: '12px', color: '#38bdf8', marginTop: '4px' }}>{fight.fighter1?.belt}</div>
                                                </div>
                                                
                                                <div style={{ fontWeight: 'bold', fontSize: '24px', color: '#64748b', fontStyle: 'italic', padding: '0 16px' }}>VS</div>
                                                
                                                {/* Atleta 2 */}
                                                <div style={{ textAlign: 'center', flex: 1 }}>
                                                    <img src={fight.fighter2?.photo} alt={fight.fighter2?.name} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #334155', marginBottom: '8px' }} onError={(e) => e.target.src = 'https://via.placeholder.com/80?text=FOTO'} />
                                                    <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '14px' }}>{fight.fighter2?.name}</div>
                                                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{fight.fighter2?.academy}</div>
                                                    <div style={{ fontSize: '12px', color: '#38bdf8', marginTop: '4px' }}>{fight.fighter2?.belt}</div>
                                                </div>
                                            </div>

                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })()}

                {canManagePanel && activeSection === 'automation' && (
                <section className="panel" id="automation">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">{copy.automation.title}</div>
                            <div className="panel-subtitle">{copy.automation.subtitle}</div>
                        </div>
                        <span className="tag">{copy.automation.fast}</span>
                    </div>
                    <div className="import-panel import-panel--admin">
                        <div>
                            <strong>{copy.automation.importFromPdf}</strong>
                            <span>{copy.automation.importDescription}</span>
                        </div>
                        <div className="import-actions">
                            {events.length > 0 && (
                                <select value={importEventId} onChange={(event) => setImportEventId(event.target.value)}>
                                    <option value="">{copy.common.noEvent}</option>
                                    {events.map((event) => (
                                        <option key={event.id} value={event.id}>{event.name}</option>
                                    ))}
                                </select>
                            )}
                            <select value={importMode} onChange={(event) => setImportMode(event.target.value)}>
                                <option value="GI">GI</option>
                                <option value="NO-GI">NO-GI</option>
                            </select>
                            <label className="import-button">
                                <Upload size={14} />
                                {copy.automation.importPdf}
                                <input
                                    ref={importInputRef}
                                    type="file"
                                    accept=".pdf,.txt"
                                    onChange={handleImportFile}
                                />
                            </label>
                        </div>
                        {(importStatus || importError) && (
                            <div className={`import-status ${importError ? 'is-error' : ''}`}>
                                {importError || importStatus}
                            </div>
                        )}
                        {importDebug && (
                            <div className="import-debug">
                                <div className="import-debug__title">{copy.automation.debugPreview}</div>
                                <pre>{importDebug}</pre>
                            </div>
                        )}
                    </div>
                    <div className="action-grid cyber-action-grid">
                        <div className="action-card cyber-card">
                            <strong>Roleta Neon (Sorteio)</strong>
                            <span>Sorteie ganhadores interagindo com a plateia em modo tela cheia.</span>
                            <div className="action-card__footer">
                                <button type="button" className="btn btn-primary" onClick={() => setShowRouletteModal(true)}>
                                    <Zap size={14} />
                                    Abrir Roleta
                                </button>
                                <span className="tag cyber-tag">NOVO</span>
                            </div>
                        </div>
                        <div className="action-card cyber-card">
                            <strong>Backup Inteligente</strong>
                            <span>Faça o download de todos os atletas, eventos e chaves.</span>
                            <div className="action-card__footer">
                                <button type="button" className="btn btn-ghost" onClick={handleBackupData}>
                                    <Download size={14} />
                                    Exportar JSON
                                </button>
                                <span className="tag cyber-tag">SEGURO</span>
                            </div>
                        </div>
                        <div className="action-card cyber-card">
                            <strong>Modo Telão</strong>
                            <span>Esconde distrações para transmitir as chaves na TV.</span>
                            <div className="action-card__footer">
                                <button type="button" className="btn btn-ghost" onClick={handleToggleFullscreen}>
                                    <Monitor size={14} />
                                    Fullscreen
                                </button>
                                <span className="tag">F11</span>
                            </div>
                        </div>
                        <div className="action-card cyber-card">
                            <strong>{copy.automation.clearAthletes}</strong>
                            <span>{copy.automation.clearAthletesDesc}</span>
                            <div className="action-card__footer">
                                <button type="button" className="btn btn-danger" onClick={handleClearAthletes}>
                                    <AlertCircle size={14} />
                                    {copy.automation.clearAll}
                                </button>
                                <span className="tag danger-tag">{copy.automation.caution}</span>
                            </div>
                        </div>
                    </div>

                    <div className="panel-header" style={{ marginTop: '1.8rem' }}>
                        <div>
                            <div className="panel-title">{copy.automation.keyboardTitle}</div>
                            <div className="panel-subtitle">{copy.automation.keyboardSubtitle}</div>
                        </div>
                    </div>
                    <div className="shortcut-list">
                        <span className="shortcut-pill">{copy.automation.shortcutNewAthlete}</span>
                        <span className="shortcut-pill">{copy.automation.shortcutImport}</span>
                        <span className="shortcut-pill">{copy.automation.shortcutExport}</span>
                        <span className="shortcut-pill">{copy.automation.shortcutLogs}</span>
                    </div>
                </section>
                )}
                {activeSection === 'activity' && (
                <section className="panel" id="activity">
                    {canManagePanel && (
                        <>
                            <div className="panel-header">
                                <div>
                                    <div className="panel-title">{copy.activity.title}</div>
                                    <div className="panel-subtitle">{copy.activity.subtitle}</div>
                                </div>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowLogs(true)}>
                                    <ClipboardList size={14} />
                                    {copy.activity.viewAll}
                                </button>
                            </div>
                            <div className="activity-list">
                                {recentLogs.map((log) => (
                                    <div key={log.id} className="activity-item">
                                        <span className="activity-time">{new Date(log.timestamp).toLocaleTimeString(locale)}</span>
                                        <span
                                            className={`activity-tag ${log.type === 'ERROR' ? 'is-error' : log.type === 'AUTH' ? 'is-auth' : ''}`}
                                        >
                                            {log.type}
                                        </span>
                                        <div>
                                            <strong>{translateLogAction(log.action)}</strong>
                                            <div className="table-meta">{translateLogDetails(log.details)}</div>
                                        </div>
                                    </div>
                                ))}
                                {recentLogs.length === 0 && (
                                    <div className="activity-item">{copy.activity.noRecent}</div>
                                )}
                            </div>
                        </>
                    )}

                    <div className="panel-header" style={{ marginTop: canManagePanel ? '1.6rem' : 0 }}>
                        <div>
                            <div className="panel-title">{copy.activity.secureSession}</div>
                            <div className="panel-subtitle">{copy.activity.secureSessionSubtitle}</div>
                        </div>
                        <button type="button" className="btn btn-primary" onClick={logout}>
                            <LogOut size={14} />
                            {copy.activity.endSession}
                        </button>
                    </div>
                    {canManagePanel && (
                        <div
                            className="action-grid"
                            style={{ marginTop: '1.2rem', gridTemplateColumns: 'minmax(0, 1fr)' }}
                        >
                            <div className="action-card">
                                <strong>{copy.activity.localUsers}</strong>
                                <span>{copy.activity.localUsersDesc}</span>
                                {panelUsersLoading ? (
                                    <div className="panel-subtitle">{isEnglish ? 'Loading users...' : 'Carregando usuários...'}</div>
                                ) : panelUsers.length > 0 ? (
                                    <div className="panel-users-list">
                                        {panelUsers.map((user) => (
                                            <div key={user.id || user.username} className="panel-user-item">
                                                <div className="panel-user-item__meta">
                                                    <strong>{user.name || user.username}</strong>
                                                    <span>{localizeUserRole(user.role)}</span>
                                                </div>
                                                <div className="panel-user-item__actions">
                                                    <button
                                                        type="button"
                                                        className="btn-icon"
                                                        title={isEnglish ? 'Edit user' : 'Editar usuario'}
                                                        onClick={() => openUserEditModal(user)}
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-icon btn-icon--danger"
                                                        title={isEnglish ? 'Delete user' : 'Excluir usuario'}
                                                        onClick={() => handleDeletePanelUser(user)}
                                                        disabled={userDeleteLoadingId === (user.id || user.username)}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="panel-subtitle">{copy.activity.noUser}</div>
                                )}
                                <div className="action-card__footer">
                                    {isLocalAuth && (
                                        <button type="button" className="btn btn-ghost" onClick={openUserResetModal}>
                                            <ShieldCheck size={14} />
                                            {copy.activity.resetPassword}
                                        </button>
                                    )}
                                    <button type="button" className="btn btn-ghost" onClick={openUserCreateModal}>
                                        <UserPlus size={14} />
                                        {copy.activity.createUser}
                                    </button>
                                    <span className="tag">{isLocalAuth ? copy.activity.local : copy.activity.api}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
                )}
            </div>
            <nav className="mobile-quickbar mobile-only" aria-label={copy.sidebar.title}>
                {canManagePanel ? (
                    <>
                        <button
                            type="button"
                            className="mobile-quickbar__btn"
                            onClick={() => handleNavClick('overview')}
                        >
                            <LayoutDashboard size={15} />
                            <span>{copy.nav.overview}</span>
                        </button>
                        <button
                            type="button"
                            className="mobile-quickbar__btn"
                            onClick={() => handleNavClick('registrations')}
                        >
                            <ClipboardList size={15} />
                            <span>{copy.nav.registrations}</span>
                        </button>
                        <button
                            type="button"
                            className="mobile-quickbar__btn"
                            onClick={() => handleNavClick('athletes')}
                        >
                            <Users size={15} />
                            <span>{copy.nav.athletes}</span>
                        </button>
                        <button type="button" className="mobile-quickbar__btn mobile-quickbar__btn--primary" onClick={() => setShowAddModal(true)}>
                            <UserPlus size={15} />
                            <span>{copy.hero.newAthlete}</span>
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            type="button"
                            className="mobile-quickbar__btn"
                            onClick={() => handleNavClick('brackets')}
                        >
                            <ClipboardList size={15} />
                            <span>{copy.nav.brackets}</span>
                        </button>
                        <button
                            type="button"
                            className="mobile-quickbar__btn"
                            onClick={() => handleNavClick('schedule')}
                        >
                            <Clock size={15} />
                            <span>{copy.nav.schedule}</span>
                        </button>
                        <button
                            type="button"
                            className="mobile-quickbar__btn"
                            onClick={() => handleNavClick('activity')}
                        >
                            <Activity size={15} />
                            <span>{copy.nav.activity}</span>
                        </button>
                        <button type="button" className="mobile-quickbar__btn mobile-quickbar__btn--primary" onClick={logout}>
                            <LogOut size={15} />
                            <span>{copy.activity.endSession}</span>
                        </button>
                    </>
                )}
            </nav>
            <AnimatePresence>
                {showScheduleTvMode && (
                    <>
                        <motion.div
                            className="modal-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowScheduleTvMode(false)}
                        />
                        <motion.div
                            className="modal-card"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                        >
                            <div className="modal-panel modal-panel--wide bracket-tv-mode">
                                <div className="modal-header">
                                    <div>
                                        <div className="modal-title">{copy.schedulePanel.tvModeTitle}</div>
                                        <div className="panel-subtitle">
                                            {eventMap[scheduleEventId]?.name || copy.common.noEvent} · {copy.schedulePanel.tvModeNow}: {now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowScheduleTvMode(false)}>
                                        {copy.schedulePanel.tvModeClose}
                                    </button>
                                </div>
                                <div className="bracket-tv-mode__stats">
                                    <span className="tag">{copy.schedulePanel.totalFights}: {manualScheduleData.totalFights}</span>
                                    <span className="tag">{copy.schedulePanel.totalDuration}: {formatDurationLabel(manualScheduleData.totalDurationMinutes, isEnglish)}</span>
                                    <span className="tag bracket-tag--applied">{copy.schedulePanel.estimatedEnd}: {manualScheduleData.estimatedEndLabel}</span>
                                </div>
                                <div className="bracket-tv-mode__list">
                                    {manualScheduleData.rows.map((row) => {
                                        const currentMinute = (now.getHours() * 60) + now.getMinutes();
                                        const isLive = Number.isFinite(row.startMinute) && Number.isFinite(row.endMinute)
                                            && currentMinute >= row.startMinute && currentMinute < row.endMinute;
                                        const isNext = Number.isFinite(row.startMinute) && currentMinute < row.startMinute;
                                        return (
                                            <div
                                                key={`tv-row-${row.id}`}
                                                className={`bracket-tv-mode__row ${isLive ? 'is-live' : isNext ? 'is-next' : ''}`}
                                            >
                                                <div className="bracket-tv-mode__time">{row.startLabel} - {row.endLabel}</div>
                                                <div className="bracket-tv-mode__content">
                                                    <strong>{row.title}</strong>
                                                    <span>{row.typeLabel} · {row.area || '-'}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {manualScheduleData.rows.length === 0 && (
                                        <div className="panel-subtitle">{copy.schedulePanel.noItems}</div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showLogs && (
                    <>
                        <motion.div
                            className="modal-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowLogs(false)}
                        />
                        <motion.div
                            className="modal-card"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                        >
                            <div className="modal-panel modal-panel--wide">
                                <div className="modal-header">
                                    <div className="modal-title">{copy.modalLogs.title}</div>
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowLogs(false)}>
                                        {copy.common.close}
                                    </button>
                                </div>
                                <div className="activity-list" style={{ overflowY: 'auto' }}>
                                    {logs.map((log) => (
                                        <div key={log.id} className="activity-item">
                                            <span className="activity-time">{new Date(log.timestamp).toLocaleTimeString(locale)}</span>
                                            <span
                                                className={`activity-tag ${log.type === 'ERROR' ? 'is-error' : log.type === 'AUTH' ? 'is-auth' : ''}`}
                                            >
                                                {log.type}
                                            </span>
                                            <div>
                                                <strong>{translateLogAction(log.action)}</strong>
                                                <div className="table-meta">{translateLogDetails(log.details)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showEventEditModal && (
                    <>
                        <motion.div
                            className="modal-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCloseEditEvent}
                        />
                        <motion.div
                            className="modal-card"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                            style={{ padding: 0 }}
                        >
                            <div className="modal-panel" style={{ padding: 0, overflow: 'hidden', width: '100vw', height: '100vh', maxWidth: '100vw', maxHeight: '100vh', borderRadius: 0 }}>
                                {/* ── Header ─────────────────────────────────── */}
                                <div style={{
                                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                                    padding: '32px 40px 0 40px',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--brand-primary,#00c2cb)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                                Genesis Sports · Painel Admin
                                            </div>
                                            <div className="modal-title" style={{ fontSize: '28px', margin: 0 }}>
                                                {copy.modalEventEdit.title}
                                            </div>
                                            {eventEditForm.name && (
                                                <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                                                    {eventEditForm.name}
                                                </div>
                                            )}
                                        </div>
                                        <button type="button" className="btn btn-ghost" onClick={handleCloseEditEvent} style={{ alignSelf: 'flex-start' }}>
                                            {copy.common.close}
                                        </button>
                                    </div>

                                    {/* Tab bar */}
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        {[
                                            { id: 'info', label: '📋 Informações Básicas' },
                                            { id: 'registration', label: '💰 Inscrições e Valores' },
                                            { id: 'documents', label: '⚖️ Tabelas e Documentos' },
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setEventModalTab(tab.id)}
                                                style={{
                                                    padding: '12px 24px',
                                                    fontSize: '15px',
                                                    fontWeight: eventModalTab === tab.id ? 700 : 500,
                                                    color: eventModalTab === tab.id ? 'var(--brand-primary,#00c2cb)' : '#64748b',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    borderBottom: eventModalTab === tab.id ? '3px solid var(--brand-primary,#00c2cb)' : '3px solid transparent',
                                                    borderRadius: '0',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* ── Body ─────────────────────────────────── */}
                                {eventEditError && (
                                    <div className="login-error" role="alert" style={{ margin: '16px 32px 0 32px', borderRadius: '10px' }}>
                                        <AlertCircle size={18} />
                                        <p>{eventEditError}</p>
                                    </div>
                                )}

                                <form onSubmit={handleUpdateEvent}>
                                    <div style={{ padding: '32px 40px', minHeight: '520px', maxHeight: '65vh', overflowY: 'auto' }}>

                                        {/* ── TAB 1: Informações Básicas ──────── */}
                                        {eventModalTab === 'info' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                <div>
                                                    <label className="table-meta" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', display: 'block', color: '#94a3b8' }}>
                                                        NOME DO EVENTO *
                                                    </label>
                                                    <input
                                                        className="input"
                                                        type="text"
                                                        value={eventEditForm.name}
                                                        onChange={(event) => setEventEditForm({ ...eventEditForm, name: event.target.value })}
                                                        placeholder={copy.modalEventEdit.eventNamePlaceholder}
                                                        required
                                                        style={{ fontSize: '16px', padding: '14px 16px', fontWeight: 600 }}
                                                    />
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                    <div>
                                                        <label className="table-meta" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', display: 'block', color: '#94a3b8' }}>
                                                            DATA DO EVENTO
                                                        </label>
                                                        <input
                                                            className="input"
                                                            type="date"
                                                            value={eventEditForm.date}
                                                            onChange={(event) => setEventEditForm({ ...eventEditForm, date: event.target.value })}
                                                            style={{ fontSize: '15px' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="table-meta" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', display: 'block', color: '#94a3b8' }}>
                                                            LOCAL / ARENA
                                                        </label>
                                                        <input
                                                            className="input"
                                                            type="text"
                                                            value={eventEditForm.location}
                                                            onChange={(event) => setEventEditForm({ ...eventEditForm, location: event.target.value })}
                                                            placeholder={copy.modalEventEdit.locationPlaceholder}
                                                            style={{ fontSize: '15px' }}
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="table-meta" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', display: 'block', color: '#94a3b8' }}>
                                                        DESCRIÇÃO DO EVENTO (Informações Gerais)
                                                    </label>
                                                    <textarea
                                                        className="input"
                                                        rows="4"
                                                        value={eventEditForm.eventDescription || ''}
                                                        onChange={(event) => setEventEditForm({ ...eventEditForm, eventDescription: event.target.value })}
                                                        placeholder="Ex: Regras da IBJJF, premiações especiais em dinheiro, etc..."
                                                        style={{ fontSize: '15px', resize: 'vertical' }}
                                                    ></textarea>
                                                </div>

                                                <div>
                                                    <label className="table-meta" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', display: 'block', color: '#94a3b8' }}>
                                                        LOCAL NO MAPA (URL Iframe do Google Maps - opcional)
                                                    </label>
                                                    <input
                                                        className="input"
                                                        type="text"
                                                        value={eventEditForm.mapIframeUrl || ''}
                                                        onChange={(event) => setEventEditForm({ ...eventEditForm, mapIframeUrl: event.target.value })}
                                                        placeholder="Ex: https://www.google.com/maps/embed?pb=..."
                                                    />
                                                </div>

                                                <div>
                                                    <label className="table-meta" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', display: 'block', color: '#94a3b8' }}>
                                                        URL DA IMAGEM DO CARTAZ (opcional)
                                                    </label>
                                                    <input
                                                        className="input"
                                                        type="text"
                                                        value={eventEditForm.posterUrl}
                                                        onChange={handleEventEditPosterUrlChange}
                                                        placeholder={copy.modalEventEdit.posterUrlPlaceholder}
                                                    />
                                                </div>

                                                <div>
                                                    <label className="table-meta" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', display: 'block', color: '#94a3b8' }}>
                                                        ENVIAR ARQUIVO DO CARTAZ
                                                    </label>
                                                    <input
                                                        className="input"
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleEventEditPosterFile}
                                                    />
                                                    <div className="table-meta table-meta--tight">{copy.modalEventEdit.posterCompressionHint}</div>
                                                    {eventPosterStoredSizeBytes > 0 && (
                                                        <div className="table-meta table-meta--tight">
                                                            {copy.modalEventEdit.posterCompressedSize}: {formatBytes(eventPosterStoredSizeBytes)}
                                                        </div>
                                                    )}
                                                </div>

                                                {eventEditForm.posterUrl && (
                                                    <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '280px' }}>
                                                        <img
                                                            src={eventEditForm.posterUrl}
                                                            alt={eventEditForm.name || 'Poster preview'}
                                                            style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', display: 'block' }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* ── TAB 2: Inscrições e Valores ─────── */}
                                        {eventModalTab === 'registration' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                                                {/* Toggle switches */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                    {[
                                                        {
                                                            label: 'Lutas Casadas',
                                                            desc: 'Ativa o painel de Lutas Casadas para este evento.',
                                                            key: 'superFightsPublished',
                                                            icon: '🗡️',
                                                            activeColor: '#ef4444',
                                                        },
                                                        {
                                                            label: 'Inscrições Abertas',
                                                            desc: 'Permite que atletas se inscrevam neste campeonato.',
                                                            key: 'registrationOpen',
                                                            icon: '🟢',
                                                            activeColor: '#22c55e',
                                                        },
                                                        {
                                                            label: 'Inscrição pelo Sistema Genesis',
                                                            desc: 'Usa o fluxo de pagamento interno (desabilite para redirecionar para URL externa).',
                                                            key: 'internalRegistration',
                                                            icon: '🔗',
                                                            activeColor: 'var(--brand-primary,#00c2cb)',
                                                        }
                                                    ].map(toggle => (
                                                        <div key={toggle.key} style={{
                                                            background: 'rgba(255,255,255,0.03)',
                                                            border: `1px solid ${eventEditForm[toggle.key] ? toggle.activeColor + '44' : 'rgba(255,255,255,0.06)'}`,
                                                            borderRadius: '12px',
                                                            padding: '20px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                        }} onClick={() => setEventEditForm(f => ({ ...f, [toggle.key]: !f[toggle.key] }))}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                                                <div>
                                                                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
                                                                        {toggle.icon} {toggle.label}
                                                                    </div>
                                                                    <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                                                                        {toggle.desc}
                                                                    </div>
                                                                </div>
                                                                {/* Toggle visual */}
                                                                <div style={{
                                                                    flexShrink: 0,
                                                                    width: '46px', height: '26px',
                                                                    borderRadius: '13px',
                                                                    background: eventEditForm[toggle.key] ? toggle.activeColor : '#334155',
                                                                    position: 'relative',
                                                                    transition: 'background 0.2s',
                                                                }}>
                                                                    <div style={{
                                                                        position: 'absolute',
                                                                        top: '3px',
                                                                        left: eventEditForm[toggle.key] ? '23px' : '3px',
                                                                        width: '20px', height: '20px',
                                                                        borderRadius: '50%',
                                                                        background: '#fff',
                                                                        transition: 'left 0.2s',
                                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                                                    }} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* External registration URL (only when not internal) */}
                                                {!eventEditForm.internalRegistration && (
                                                    <div>
                                                        <label className="table-meta" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', display: 'block', color: '#94a3b8' }}>
                                                            URL DE INSCRIÇÃO EXTERNA (obrigatório se modo externo)
                                                        </label>
                                                        <input
                                                            className="input"
                                                            type="text"
                                                            value={eventEditForm.registrationUrl}
                                                            onChange={(event) => setEventEditForm({ ...eventEditForm, registrationUrl: event.target.value })}
                                                            placeholder={copy.modalEventEdit.registrationUrlPlaceholder}
                                                        />
                                                    </div>
                                                )}

                                                {/* PIX Key */}
                                                <div>
                                                    <label className="table-meta" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', display: 'block', color: '#94a3b8' }}>
                                                        CHAVE PIX (responsável pelo campeonato) *
                                                    </label>
                                                    <input
                                                        className="input"
                                                        type="text"
                                                        value={eventEditForm.pixKey}
                                                        onChange={(event) => setEventEditForm({ ...eventEditForm, pixKey: event.target.value })}
                                                        placeholder={copy.modalEventEdit.pixKeyPlaceholder}
                                                        required
                                                        style={{ fontSize: '15px' }}
                                                    />
                                                </div>

                                                {/* Price cards */}
                                                <div>
                                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '14px', letterSpacing: '0.08em' }}>
                                                        TABELA DE TAXAS DE INSCRIÇÃO (R$)
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                                                        {[
                                                            { label: 'Sub-15 (até 14 anos)', key: 'feeUnder15', emoji: '🧒', color: '#3b82f6' },
                                                            { label: 'Adulto (15+ anos)', key: 'feeOver15', emoji: '🥋', color: '#00c2cb' },
                                                            { label: 'Combo (Gi + No-Gi)', key: 'feeCombo', emoji: '🎯', color: '#f59e0b' },
                                                            { label: 'Absoluto (+valor base)', key: 'feeAbsolute', emoji: '🏆', color: '#a78bfa' },
                                                        ].map(fee => (
                                                            <div key={fee.key} style={{
                                                                background: `${fee.color}11`,
                                                                border: `1px solid ${fee.color}33`,
                                                                borderRadius: '12px',
                                                                padding: '16px',
                                                            }}>
                                                                <div style={{ fontSize: '20px', marginBottom: '8px' }}>{fee.emoji}</div>
                                                                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '10px', lineHeight: 1.4, fontWeight: 600 }}>
                                                                    {fee.label}
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 700 }}>R$</span>
                                                                    <input
                                                                        className="input"
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.01"
                                                                        value={eventEditForm[fee.key]}
                                                                        onChange={(event) => setEventEditForm({ ...eventEditForm, [fee.key]: event.target.value })}
                                                                        required
                                                                        style={{
                                                                            fontSize: '20px',
                                                                            fontWeight: 800,
                                                                            color: fee.color,
                                                                            background: 'transparent',
                                                                            border: 'none',
                                                                            borderBottom: `2px solid ${fee.color}55`,
                                                                            borderRadius: '0',
                                                                            padding: '4px 0',
                                                                            width: '100%',
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Batches (Lotes) */}
                                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>Lotes de Inscrição</div>
                                                        <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddBatchEdit}>+ Adicionar Lote</button>
                                                    </div>
                                                    
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                                        {(eventEditForm.batches || []).map((batch, index) => (
                                                            <div key={batch.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--brand-primary,#00c2cb)' }}>Lote {index + 1}</div>
                                                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleRemoveBatchEdit(index)} style={{ color: '#ef4444' }}>Remover</button>
                                                                </div>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                                                                    <div>
                                                                        <label className="table-meta" style={{ fontSize: '11px', marginBottom: '6px', display: 'block' }}>Nome do Lote</label>
                                                                        <input className="input" type="text" value={batch.name} onChange={e => handleBatchChangeEdit(index, 'name', e.target.value)} required />
                                                                    </div>
                                                                    <div>
                                                                        <label className="table-meta" style={{ fontSize: '11px', marginBottom: '6px', display: 'block' }}>Início (opcional)</label>
                                                                        <input className="input" type="datetime-local" value={batch.startDate || ''} onChange={e => handleBatchChangeEdit(index, 'startDate', e.target.value)} />
                                                                    </div>
                                                                    <div>
                                                                        <label className="table-meta" style={{ fontSize: '11px', marginBottom: '6px', display: 'block' }}>Fim (opcional)</label>
                                                                        <input className="input" type="datetime-local" value={batch.endDate || ''} onChange={e => handleBatchChangeEdit(index, 'endDate', e.target.value)} />
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                                                                    {[
                                                                        { label: 'Sub-15', key: 'feeUnder15', color: '#3b82f6' },
                                                                        { label: 'Adulto', key: 'feeOver15', color: '#00c2cb' },
                                                                        { label: 'Combo', key: 'feeCombo', color: '#f59e0b' },
                                                                        { label: 'Absoluto', key: 'feeAbsolute', color: '#a78bfa' },
                                                                    ].map(fee => (
                                                                        <div key={fee.key} style={{ background: `${fee.color}11`, border: `1px solid ${fee.color}33`, borderRadius: '8px', padding: '12px' }}>
                                                                            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>{fee.label}</div>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 700 }}>R$</span>
                                                                                <input className="input" type="number" min="0" step="0.01" value={batch[fee.key]} onChange={e => handleBatchChangeEdit(index, fee.key, e.target.value)} required style={{ fontSize: '16px', fontWeight: 700, color: fee.color, background: 'transparent', border: 'none', borderBottom: `2px solid ${fee.color}55`, borderRadius: 0, padding: '2px 0', width: '100%' }} />
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* ── TAB 3: Tabelas e Documentos ─────── */}
                                        {eventModalTab === 'documents' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                                                {/* Weight tables */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                                    {/* GI */}
                                                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
                                                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', marginBottom: '16px' }}>
                                                            🥋 Tabela de Peso — GI (com kimono)
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                            <div>
                                                                <label className="table-meta" style={{ fontSize: '11px', marginBottom: '6px', display: 'block' }}>URL da Tabela (imagem/PDF)</label>
                                                                <input
                                                                    className="input"
                                                                    type="text"
                                                                    value={eventEditForm.weightTableGiUrl}
                                                                    onChange={(event) => setEventEditForm({ ...eventEditForm, weightTableGiUrl: event.target.value })}
                                                                    placeholder={copy.modalEventEdit.weightTableGiUrlPlaceholder}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="table-meta" style={{ fontSize: '11px', marginBottom: '6px', display: 'block' }}>
                                                                    {copy.modalEventEdit.weightTableGiOptions}
                                                                </label>
                                                                <div className="event-ocr-actions" style={{ marginBottom: '8px' }}>
                                                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleRunWeightTableOcr('GI')} disabled={Boolean(eventWeightOcrMode)}>
                                                                        {eventWeightOcrMode === 'GI' ? copy.modalEventEdit.weightTableOcrRunning : copy.modalEventEdit.weightTableOcrFromUrl}
                                                                    </button>
                                                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => weightTableGiOcrFileRef.current?.click()} disabled={Boolean(eventWeightOcrMode)}>
                                                                        {copy.modalEventEdit.weightTableOcrFromFile}
                                                                    </button>
                                                                    <input ref={weightTableGiOcrFileRef} type="file" accept=".pdf,image/*" style={{ display: 'none' }} onChange={(event) => handleWeightTableOcrFileChange('GI', event)} />
                                                                </div>
                                                                {eventWeightOcrMode === 'GI' && <div className="table-meta table-meta--tight">{copy.modalEventEdit.weightTableOcrProgress(eventWeightOcrProgress)}</div>}
                                                                <textarea
                                                                    className="input"
                                                                    value={eventEditForm.weightTableGiOptions}
                                                                    onChange={(event) => setEventEditForm({ ...eventEditForm, weightTableGiOptions: event.target.value })}
                                                                    placeholder={copy.modalEventEdit.weightTableGiOptionsPlaceholder}
                                                                    rows={5}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* NO-GI */}
                                                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
                                                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', marginBottom: '16px' }}>
                                                            🩳 Tabela de Peso — NO-GI (sem kimono)
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                            <div>
                                                                <label className="table-meta" style={{ fontSize: '11px', marginBottom: '6px', display: 'block' }}>URL da Tabela (imagem/PDF)</label>
                                                                <input
                                                                    className="input"
                                                                    type="text"
                                                                    value={eventEditForm.weightTableNoGiUrl}
                                                                    onChange={(event) => setEventEditForm({ ...eventEditForm, weightTableNoGiUrl: event.target.value })}
                                                                    placeholder={copy.modalEventEdit.weightTableNoGiUrlPlaceholder}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="table-meta" style={{ fontSize: '11px', marginBottom: '6px', display: 'block' }}>
                                                                    {copy.modalEventEdit.weightTableNoGiOptions}
                                                                </label>
                                                                <div className="event-ocr-actions" style={{ marginBottom: '8px' }}>
                                                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleRunWeightTableOcr('NO-GI')} disabled={Boolean(eventWeightOcrMode)}>
                                                                        {eventWeightOcrMode === 'NO-GI' ? copy.modalEventEdit.weightTableOcrRunning : copy.modalEventEdit.weightTableOcrFromUrl}
                                                                    </button>
                                                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => weightTableNoGiOcrFileRef.current?.click()} disabled={Boolean(eventWeightOcrMode)}>
                                                                        {copy.modalEventEdit.weightTableOcrFromFile}
                                                                    </button>
                                                                    <input ref={weightTableNoGiOcrFileRef} type="file" accept=".pdf,image/*" style={{ display: 'none' }} onChange={(event) => handleWeightTableOcrFileChange('NO-GI', event)} />
                                                                </div>
                                                                {eventWeightOcrMode === 'NO-GI' && <div className="table-meta table-meta--tight">{copy.modalEventEdit.weightTableOcrProgress(eventWeightOcrProgress)}</div>}
                                                                <textarea
                                                                    className="input"
                                                                    value={eventEditForm.weightTableNoGiOptions}
                                                                    onChange={(event) => setEventEditForm({ ...eventEditForm, weightTableNoGiOptions: event.target.value })}
                                                                    placeholder={copy.modalEventEdit.weightTableNoGiOptionsPlaceholder}
                                                                    rows={5}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Circular */}
                                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
                                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', marginBottom: '16px' }}>
                                                        📄 Circular / Regulamento do Evento
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                        <div>
                                                            <label className="table-meta" style={{ fontSize: '11px', marginBottom: '6px', display: 'block' }}>URL da Circular (PDF opcional)</label>
                                                            <input
                                                                className="input"
                                                                type="text"
                                                                value={eventEditForm.circularUrl}
                                                                onChange={(event) => setEventEditForm({ ...eventEditForm, circularUrl: event.target.value })}
                                                                placeholder={copy.modalEventEdit.circularUrlPlaceholder}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="table-meta" style={{ fontSize: '11px', marginBottom: '6px', display: 'block' }}>Link de Inscrição Externa (se aplicável)</label>
                                                            <input
                                                                className="input"
                                                                type="text"
                                                                value={eventEditForm.registrationUrl}
                                                                onChange={(event) => setEventEditForm({ ...eventEditForm, registrationUrl: event.target.value })}
                                                                placeholder={copy.modalEventEdit.registrationUrlPlaceholder}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                    </div>

                                    {/* ── Footer / Actions ───────────────────── */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '20px 32px',
                                        borderTop: '1px solid rgba(255,255,255,0.06)',
                                        background: 'rgba(0,0,0,0.2)',
                                    }}>
                                        <button type="button" className="btn btn-danger" onClick={handleDeleteEvent}>
                                            <Trash2 size={14} />
                                            {copy.modalEventEdit.deleteEvent}
                                        </button>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            {eventModalTab !== 'info' && (
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost"
                                                    onClick={() => setEventModalTab(eventModalTab === 'documents' ? 'registration' : 'info')}
                                                >
                                                    ← Anterior
                                                </button>
                                            )}
                                            {eventModalTab !== 'documents' ? (
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary"
                                                    onClick={() => setEventModalTab(eventModalTab === 'info' ? 'registration' : 'documents')}
                                                >
                                                    Próxima Aba →
                                                </button>
                                            ) : null}
                                            <button type="submit" className="btn btn-primary" style={{ minWidth: '140px' }}>
                                                {copy.modalEventEdit.saveChanges}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>


            <AnimatePresence>
                {showAddModal && (
                    <>
                        <motion.div
                            className="modal-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAddModal(false)}
                        />
                        <motion.div
                            className="modal-card"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                        >
                            <div className="modal-panel">
                                <div className="modal-header">
                                    <div className="modal-title">{copy.modalAthlete.title}</div>
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                                        {copy.common.cancel}
                                    </button>
                                </div>
                                <form onSubmit={handleAddAthlete}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '0.5rem' }}>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255, 255, 255, 0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-color)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Users size={18} style={{ color: 'var(--primary-color)' }} /> 
                                                {isEnglish ? 'Personal Information' : 'Dados Pessoais'}
                                            </h4>
                                            
                                            <div className="form-grid">
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <label className="table-meta">{copy.modalAthlete.fullName}</label>
                                                    <input
                                                        className="input"
                                                        required
                                                        type="text"
                                                        placeholder={copy.modalAthlete.fullNamePlaceholder}
                                                        value={newAthlete.nome}
                                                        onChange={(event) => setNewAthlete({ ...newAthlete, nome: event.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="table-meta">{copy.modalAthlete.gender}</label>
                                                    <select
                                                        className="input"
                                                        value={newAthlete.genero || 'Masculino'}
                                                        onChange={(event) => setNewAthlete({ ...newAthlete, genero: event.target.value })}
                                                    >
                                                        <option value="Masculino">{copy.modalAthlete.genderMale}</option>
                                                        <option value="Feminino">{copy.modalAthlete.genderFemale}</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="table-meta">{copy.modalAthlete.country}</label>
                                                    <input
                                                        className="input"
                                                        type="text"
                                                        placeholder={copy.modalAthlete.countryPlaceholder}
                                                        value={newAthlete.pais || ''}
                                                        onChange={(event) => setNewAthlete({ ...newAthlete, pais: event.target.value })}
                                                    />
                                                </div>
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <label className="table-meta">{copy.modalAthlete.photoUrl}</label>
                                                    <input
                                                        className="input"
                                                        type="url"
                                                        placeholder="https://..."
                                                        value={newAthlete.photoUrl || ''}
                                                        onChange={(event) => setNewAthlete({ ...newAthlete, photoUrl: event.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255, 255, 255, 0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-color)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Trophy size={18} style={{ color: 'var(--primary-color)' }} /> 
                                                {isEnglish ? 'Registration Data' : 'Dados da Inscrição'}
                                            </h4>
                                            
                                            <div className="form-grid">
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <label className="table-meta">{copy.modalAthlete.event}</label>
                                                    <select
                                                        className="input"
                                                        value={newAthlete.eventId}
                                                        onChange={(event) => setNewAthlete({ ...newAthlete, eventId: event.target.value })}
                                                    >
                                                        <option value="">{copy.modalAthlete.noEvent}</option>
                                                        {events.map((event) => (
                                                            <option key={event.id} value={event.id}>{event.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <label className="table-meta">{copy.modalAthlete.teamAcademy}</label>
                                                    <input
                                                        className="input"
                                                        required
                                                        type="text"
                                                        placeholder={copy.modalAthlete.teamAcademyPlaceholder}
                                                        value={newAthlete.academia}
                                                        onChange={(event) => setNewAthlete({ ...newAthlete, academia: event.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="table-meta">{copy.modalAthlete.graduation}</label>
                                                    <select
                                                        className="input"
                                                        value={newAthlete.faixa}
                                                        onChange={(event) => setNewAthlete({ ...newAthlete, faixa: event.target.value })}
                                                    >
                                                        {['Branca', 'Cinza', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta', 'Branca/Cinza'].map((faixa) => (
                                                            <option key={faixa} value={faixa}>{localizeBelt(faixa, faixa)}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="table-meta">{copy.modalAthlete.modality}</label>
                                                    <select
                                                        className="input"
                                                        value={newAthlete.isNoGi ? 'NO-GI' : 'GI'}
                                                        onChange={(event) => setNewAthlete({
                                                            ...newAthlete,
                                                            isNoGi: event.target.value === 'NO-GI'
                                                        })}
                                                    >
                                                        <option value="GI">{copy.modalAthlete.modalityGi}</option>
                                                        <option value="NO-GI">{copy.modalAthlete.modalityNoGi}</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="table-meta">{copy.modalAthlete.categoryType}</label>
                                                    <select
                                                        className="input"
                                                        value={newAthlete.isAbsolute ? 'ABS' : 'PESO'}
                                                        onChange={(event) => {
                                                            const isAbsolute = event.target.value === 'ABS';
                                                            setNewAthlete((prev) => ({
                                                                ...prev,
                                                                isAbsolute,
                                                                peso: isAbsolute
                                                                    ? (prev.peso || copy.modalAthlete.absoluteWeightPlaceholder)
                                                                    : (prev.peso === copy.modalAthlete.absoluteWeightPlaceholder ? '' : prev.peso)
                                                            }));
                                                        }}
                                                    >
                                                        <option value="PESO">{copy.modalAthlete.typeWeight}</option>
                                                        <option value="ABS">{copy.modalAthlete.typeAbsolute}</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="table-meta">{copy.modalAthlete.age}</label>
                                                    <input
                                                        className="input"
                                                        type="number"
                                                        min="0"
                                                        placeholder={copy.modalAthlete.agePlaceholder}
                                                        value={newAthlete.idade}
                                                        onChange={(event) => setNewAthlete({ ...newAthlete, idade: event.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="table-meta">{copy.modalAthlete.weight}</label>
                                                    <select
                                                        className="input"
                                                        value={newAthlete.isAbsolute ? 'Absoluto' : newAthlete.peso}
                                                        disabled={newAthlete.isAbsolute}
                                                        onChange={(event) => setNewAthlete({ ...newAthlete, peso: event.target.value })}
                                                    >
                                                        <option value="">{copy.modalAthlete.selectWeight}</option>
                                                        {newAthlete.isAbsolute && <option value="Absoluto">{copy.modalAthlete.absoluteWeightPlaceholder}</option>}
                                                        {['Galo', 'Pluma', 'Pena', 'Leve', 'Médio', 'Meio-Pesado', 'Pesado', 'Super-Pesado', 'Pesadíssimo'].map((pesoOp) => (
                                                            <option key={pesoOp} value={pesoOp}>{pesoOp}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="table-meta">{copy.modalAthlete.category}</label>
                                                    <input
                                                        className="input"
                                                        type="text"
                                                        placeholder={copy.modalAthlete.categoryPlaceholder}
                                                        value={newAthlete.categoria}
                                                        onChange={(event) => setNewAthlete({ ...newAthlete, categoria: event.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-actions">
                                        <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                                            {copy.common.cancel}
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            {copy.modalAthlete.saveRegister}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showAssignModal && assignEvent && (
                    <>
                        <motion.div
                            className="modal-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCloseAssignModal}
                        />
                        <motion.div
                            className="modal-card"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                        >
                            <div className="modal-panel modal-panel--wide">
                                <div className="modal-header">
                                    <div className="modal-title">{copy.modalAssign.title}</div>
                                    <button type="button" className="btn btn-ghost" onClick={handleCloseAssignModal}>
                                        {copy.common.close}
                                    </button>
                                </div>
                                <div className="panel-subtitle">
                                    {copy.modalAssign.eventPrefix}: {assignEvent.name}. {copy.modalAssign.subtitle}
                                </div>
                                <div className="event-assign-toolbar">
                                    <div className="search-input">
                                        <Search size={16} />
                                        <input
                                            type="text"
                                            placeholder={copy.modalAssign.searchPlaceholder}
                                            value={assignSearch}
                                            onChange={(event) => setAssignSearch(event.target.value)}
                                            aria-label={copy.modalAssign.searchAria}
                                        />
                                    </div>
                                    <span className="tag">{selectedAssignCount} {copy.modalAssign.selected}</span>
                                </div>
                                <div className="event-assign-list">
                                    {assignCandidates.map((athlete) => {
                                        const currentEvent = eventMap[athlete.eventId]?.name;
                                        const metaBase = `${athlete.academia || copy.modalAssign.noAcademy} - ${localizeBelt(athlete.faixa)} / ${localizeWeight(athlete.peso)} / ${localizeCategory(athlete.categoria)}`;
                                        const eventNote = athlete.eventId && athlete.eventId !== assignEvent.id
                                            ? ` - ${copy.modalAssign.current}: ${currentEvent || copy.modalAssign.otherEvent}`
                                            : '';

                                        return (
                                            <label key={athlete.id} className="event-assign-item">
                                                <input
                                                    type="checkbox"
                                                    checked={!!assignSelection[athlete.id]}
                                                    onChange={() => handleToggleAssign(athlete.id)}
                                                />
                                                <div>
                                                    <div className="event-assign-name">{athlete.nome}</div>
                                                    <div className="table-meta">{metaBase}{eventNote}</div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                    {assignCandidates.length === 0 && (
                                        <div className="panel-subtitle">{copy.modalAssign.noAthleteFound}</div>
                                    )}
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="btn btn-ghost" onClick={handleCloseAssignModal}>
                                        {copy.common.cancel}
                                    </button>
                                    <button type="button" className="btn btn-primary" onClick={handleSaveAssign}>
                                        {copy.modalAssign.saveLink}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showUserResetModal && (
                    <>
                        <motion.div
                            className="modal-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeUserResetModal}
                        />
                        <motion.div
                            className="modal-card"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                        >
                            <div className="modal-panel">
                                <div className="modal-header">
                                    <div className="modal-title">{copy.modalReset.title}</div>
                                    <button type="button" className="btn btn-ghost" onClick={closeUserResetModal}>
                                        {copy.common.close}
                                    </button>
                                </div>
                                {userResetList.length === 0 ? (
                                    <div className="panel-subtitle">{copy.modalReset.noUser}</div>
                                ) : (
                                    <form onSubmit={handleUserResetSubmit}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {userResetError && (
                                                <div className="login-error" role="alert">
                                                    <AlertCircle size={18} />
                                                    <p>{userResetError}</p>
                                                </div>
                                            )}
                                            {userResetSuccess && (
                                                <div className="login-success" role="status">
                                                    <CheckCircle2 size={18} />
                                                    <p>{userResetSuccess}</p>
                                                </div>
                                            )}
                                            <div>
                                                <label className="table-meta">{copy.modalReset.user}</label>
                                                <select
                                                    className="input"
                                                    value={userResetUsername}
                                                    onChange={(event) => setUserResetUsername(event.target.value)}
                                                >
                                                    {userResetList.map((user) => (
                                                        <option key={user.username} value={user.username}>
                                                            {user.name ? `${user.name} (${user.username})` : user.username}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="table-meta">{copy.modalReset.newPassword}</label>
                                                <input
                                                    className="input"
                                                    type="password"
                                                    minLength={8}
                                                    value={userResetPassword}
                                                    onChange={(event) => setUserResetPassword(event.target.value)}
                                                />
                                                {userResetPassword && (
                                                    <small className={`password-strength password-strength--${userResetPasswordStrength.level}`}>
                                                        {userResetPasswordStrength.message}
                                                    </small>
                                                )}
                                            </div>
                                            <div>
                                                <label className="table-meta">{copy.modalReset.confirmPassword}</label>
                                                <input
                                                    className="input"
                                                    type="password"
                                                    minLength={8}
                                                    value={userResetConfirm}
                                                    onChange={(event) => setUserResetConfirm(event.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="form-actions">
                                            <button type="button" className="btn btn-ghost" onClick={closeUserResetModal}>
                                                {copy.common.cancel}
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                disabled={userResetLoading || !userResetPasswordStrength.isStrong}
                                            >
                                                {copy.modalReset.updatePassword}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showUserCreateModal && (
                    <>
                        <motion.div
                            className="modal-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeUserCreateModal}
                        />
                        <motion.div
                            className="modal-card"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                        >
                            <div className="modal-panel">
                                <div className="modal-header">
                                    <div className="modal-title">{copy.modalUserCreate.title}</div>
                                    <button type="button" className="btn btn-ghost" onClick={closeUserCreateModal}>
                                        {copy.common.close}
                                    </button>
                                </div>
                                <form onSubmit={handleUserCreateSubmit}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {userCreateError && (
                                            <div className="login-error" role="alert">
                                                <AlertCircle size={18} />
                                                <p>{userCreateError}</p>
                                            </div>
                                        )}
                                        {userCreateSuccess && (
                                            <div className="login-success" role="status">
                                                <CheckCircle2 size={18} />
                                                <p>{userCreateSuccess}</p>
                                            </div>
                                        )}
                                        <div>
                                            <label className="table-meta">{copy.modalUserCreate.name}</label>
                                            <input
                                                className="input"
                                                type="text"
                                                minLength={3}
                                                required
                                                value={userCreateName}
                                                onChange={(event) => setUserCreateName(event.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="table-meta">{copy.modalUserCreate.username}</label>
                                            <input
                                                className="input"
                                                type="text"
                                                minLength={3}
                                                required
                                                value={userCreateUsername}
                                                onChange={(event) => setUserCreateUsername(event.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="table-meta">{copy.modalUserCreate.role}</label>
                                            <select
                                                className="input"
                                                value={userCreateRole}
                                                onChange={(event) => setUserCreateRole(event.target.value)}
                                            >
                                                <option value="coach">{copy.activity.roleCoach}</option>
                                                <option value="admin">{copy.activity.roleAdmin}</option>
                                                <option value="mesario">{copy.activity.roleMesario}</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="table-meta">{copy.modalUserCreate.password}</label>
                                            <input
                                                className="input"
                                                type="password"
                                                minLength={8}
                                                required
                                                value={userCreatePassword}
                                                onChange={(event) => setUserCreatePassword(event.target.value)}
                                            />
                                            {userCreatePassword && (
                                                <small className={`password-strength password-strength--${userCreatePasswordStrength.level}`}>
                                                    {userCreatePasswordStrength.message}
                                                </small>
                                            )}
                                        </div>
                                        <div>
                                            <label className="table-meta">{copy.modalUserCreate.confirmPassword}</label>
                                            <input
                                                className="input"
                                                type="password"
                                                minLength={8}
                                                required
                                                value={userCreateConfirm}
                                                onChange={(event) => setUserCreateConfirm(event.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-actions">
                                        <button type="button" className="btn btn-ghost" onClick={closeUserCreateModal}>
                                            {copy.common.cancel}
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={userCreateLoading || !userCreatePasswordStrength.isStrong}
                                        >
                                            {copy.modalUserCreate.createUser}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showUserEditModal && (
                    <>
                        <motion.div
                            className="modal-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeUserEditModal}
                        />
                        <motion.div
                            className="modal-card"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                        >
                            <div className="modal-panel">
                                <div className="modal-header">
                                    <div className="modal-title">{isEnglish ? 'Edit panel user' : 'Editar usuario do painel'}</div>
                                    <button type="button" className="btn btn-ghost" onClick={closeUserEditModal}>
                                        {copy.common.close}
                                    </button>
                                </div>
                                <form onSubmit={handleUserEditSubmit}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {userEditError && (
                                            <div className="login-error" role="alert">
                                                <AlertCircle size={18} />
                                                <p>{userEditError}</p>
                                            </div>
                                        )}
                                        {userEditSuccess && (
                                            <div className="login-success" role="status">
                                                <CheckCircle2 size={18} />
                                                <p>{userEditSuccess}</p>
                                            </div>
                                        )}
                                        <div>
                                            <label className="table-meta">{isEnglish ? 'Name' : 'Nome'}</label>
                                            <input
                                                className="input"
                                                type="text"
                                                minLength={3}
                                                required
                                                value={userEditName}
                                                onChange={(event) => setUserEditName(event.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="table-meta">{isEnglish ? 'Username' : 'Usuario'}</label>
                                            <input
                                                className="input"
                                                type="text"
                                                minLength={3}
                                                required
                                                value={userEditUsername}
                                                onChange={(event) => setUserEditUsername(event.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="table-meta">{isEnglish ? 'Role' : 'Papel'}</label>
                                            <select
                                                className="input"
                                                value={userEditRole}
                                                onChange={(event) => setUserEditRole(event.target.value)}
                                            >
                                                <option value="coach">{copy.activity.roleCoach}</option>
                                                <option value="admin">{copy.activity.roleAdmin}</option>
                                                <option value="mesario">{copy.activity.roleMesario}</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="table-meta">{isEnglish ? 'New Password (Optional)' : 'Nova Senha (Opcional)'}</label>
                                            <input
                                                className="input"
                                                type="password"
                                                minLength={6}
                                                placeholder={isEnglish ? 'Leave blank to keep current' : 'Deixe em branco para manter a atual'}
                                                value={userEditPassword}
                                                onChange={(event) => setUserEditPassword(event.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-actions" style={{ justifyContent: 'space-between' }}>
                                        <button
                                            type="button"
                                            className="btn btn-danger"
                                            onClick={() => handleDeletePanelUser({ id: userEditId, username: userEditUsername, name: userEditName })}
                                        >
                                            {isEnglish ? 'Delete User' : 'Excluir usuário'}
                                        </button>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button type="button" className="btn btn-ghost" onClick={closeUserEditModal}>
                                                {copy.common.cancel}
                                            </button>
                                            <button type="submit" className="btn btn-primary" disabled={userEditLoading}>
                                                {isEnglish ? 'Save changes' : 'Salvar alteracoes'}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {confirmDialog.isOpen && (
                    <>
                        <motion.div
                            className="modal-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => closeConfirmDialog(false)}
                        />
                        <motion.div
                            className="modal-card"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                        >
                            <div className="modal-panel">
                                <div className="modal-header">
                                    <div className="modal-title">{confirmDialog.title}</div>
                                    <button type="button" className="btn btn-ghost" onClick={() => closeConfirmDialog(false)}>
                                        {copy.common.close}
                                    </button>
                                </div>
                                {confirmDialog.description && (
                                    <p className="panel-subtitle">{confirmDialog.description}</p>
                                )}
                                <div className="form-actions">
                                    <button type="button" className="btn btn-ghost" onClick={() => closeConfirmDialog(false)}>
                                        {confirmDialog.cancelLabel || copy.common.cancel}
                                    </button>
                                    <button
                                        type="button"
                                        className={confirmDialog.variant === 'danger' ? 'btn btn-danger' : 'btn btn-primary'}
                                        onClick={() => closeConfirmDialog(true)}
                                    >
                                        {confirmDialog.confirmLabel || (isEnglish ? 'Confirm' : 'Confirmar')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {registrationCloseConfirmEvent && (
                    <>
                        <motion.div
                            className="modal-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeRegistrationConfirmModal}
                        />
                        <motion.div
                            className="modal-card"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                        >
                            <div className="modal-panel">
                                <div className="modal-header">
                                    <div className="modal-title">{copy.eventsPanel.closeRegistrationConfirmTitle}</div>
                                    <button type="button" className="btn btn-ghost" onClick={closeRegistrationConfirmModal}>
                                        {copy.common.close}
                                    </button>
                                </div>
                                <p className="panel-subtitle">
                                    {copy.eventsPanel.closeRegistrationConfirmDescription(
                                        registrationCloseConfirmEvent?.name
                                    )}
                                </p>
                                <div className="form-actions">
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        onClick={closeRegistrationConfirmModal}
                                    >
                                        {copy.common.cancel}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-danger"
                                        onClick={handleConfirmCloseEventRegistration}
                                    >
                                        {copy.eventsPanel.closeRegistrationConfirmAction}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            {/* SUPERFIGHT MODAL */}
            <AnimatePresence>
                {superfightForm && (
                    <>
                        <motion.div
                            className="modal-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSuperfightForm(null)}
                        />
                        <motion.div
                            className="modal-card modal-card--lg"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{ maxWidth: '1000px', width: '95%' }}
                        >
                            <div className="modal-panel" style={{ padding: '0', overflow: 'hidden', width: '100%', maxWidth: 'none' }}>
                                {/* Beautiful Gradient Header */}
                                <div style={{ background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)', padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <Swords size={24} style={{ color: '#ef4444' }} />
                                            {superfightForm.id ? 'Editar Luta Casada' : 'Nova Luta Casada'}
                                        </div>
                                        <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>Configure os atletas do evento principal</div>
                                    </div>
                                    <button type="button" className="btn btn-icon" onClick={() => setSuperfightForm(null)} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '50%', width: '40px', height: '40px' }}>
                                        <X size={20} />
                                    </button>
                                </div>
                                <form style={{ padding: '40px 32px' }} onSubmit={(e) => {
                                    e.preventDefault();
                                    const event = events.find(ev => ev.id === activeEventId);
                                    if(!event) return;
                                    const sf = [...(event.superFights || [])];
                                    if(superfightForm.id) {
                                        const idx = sf.findIndex(f => f.id === superfightForm.id);
                                        if(idx >= 0) sf[idx] = superfightForm;
                                    } else {
                                        sf.push({ ...superfightForm, id: Date.now().toString() });
                                    }
                                    updateEvent(event.id, { ...event, superFights: sf }).then(() => {
                                        showFeedback('success', 'Luta casada salva com sucesso!');
                                        setSuperfightForm(null);
                                    }).catch(err => {
                                        showFeedback('error', 'Falha ao salvar luta casada.');
                                    });
                                }}>
                                    {/* HORÁRIO DA LUTA */}
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px 24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Clock size={18} style={{ color: '#22c55e' }} />
                                                Horário Agendado:
                                            </div>
                                            <input 
                                                type="time" 
                                                className="input" 
                                                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 12px', fontSize: '1.1rem', color: '#f8fafc', fontWeight: 700, borderRadius: '8px' }}
                                                value={superfightForm.scheduledTime || ''}
                                                onChange={e => setSuperfightForm(f => ({...f, scheduledTime: e.target.value}))}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'row', gap: '32px', marginBottom: '32px', position: 'relative' }}>
                                        {/* VS Badge in the center */}
                                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, background: '#0f172a', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.2rem', color: '#f8fafc', boxShadow: '0 8px 16px rgba(0,0,0,0.5)' }}>
                                            VS
                                        </div>

                                        {/* Lutador 1 (Vermelho) */}
                                        <div style={{ flex: 1, minWidth: '0', background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.05) 0%, rgba(255,255,255,0.01) 100%)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', position: 'relative', overflow: 'hidden' }}>
                                            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#ef4444' }}></div>
                                            <h4 style={{ margin: '0 0 24px 0', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                                                <div style={{ background: '#ef4444', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800 }}>CANTO VERMELHO</div>
                                            </h4>
                                            
                                            {/* Photo Upload Area */}
                                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                                                <label style={{ cursor: 'pointer', position: 'relative', display: 'block', width: '140px', height: '140px', borderRadius: '50%', border: '3px solid #ef4444', overflow: 'hidden', background: '#0f172a', boxShadow: '0 8px 16px rgba(239, 68, 68, 0.2)' }}>
                                                    {superfightForm.fighter1.photo ? (
                                                        <img src={superfightForm.fighter1.photo} alt="Fighter 1" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                                            <Upload size={24} style={{ marginBottom: '4px', color: '#ef4444' }} />
                                                            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>Subir Foto</span>
                                                        </div>
                                                    )}
                                                    <input 
                                                        type="file" 
                                                        accept="image/*" 
                                                        style={{ display: 'none' }} 
                                                        onChange={async (e) => {
                                                            if (e.target.files && e.target.files[0]) {
                                                                try {
                                                                    const compressed = await compressImageFileWithConstraints(e.target.files[0], { maxWidth: 600, maxHeight: 600 });
                                                                    setSuperfightForm(f => ({...f, fighter1: {...f.fighter1, photo: compressed.dataUrl}}));
                                                                } catch (err) {
                                                                    showFeedback('error', 'Falha ao processar imagem.');
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>

                                            <div style={{ marginBottom: '16px' }}>
                                                <label className="table-meta">Nome do Atleta *</label>
                                                <input className="input" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px 16px', fontSize: '15px' }} required value={superfightForm.fighter1.name} onChange={e => setSuperfightForm(f => ({...f, fighter1: {...f.fighter1, name: e.target.value}}))} placeholder="Ex: João Silva" />
                                            </div>
                                            <div style={{ marginBottom: '16px' }}>
                                                <label className="table-meta">Academia / Equipe *</label>
                                                <input className="input" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px 16px', fontSize: '15px' }} required value={superfightForm.fighter1.academy} onChange={e => setSuperfightForm(f => ({...f, fighter1: {...f.fighter1, academy: e.target.value}}))} placeholder="Ex: Gracie Barra" />
                                            </div>
                                            <div>
                                                <label className="table-meta">Faixa *</label>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                                    {['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'].map(belt => (
                                                        <button 
                                                            key={belt}
                                                            type="button"
                                                            onClick={() => setSuperfightForm(f => ({...f, fighter1: {...f.fighter1, belt}}))}
                                                            style={{
                                                                padding: '6px 12px',
                                                                borderRadius: '8px',
                                                                fontSize: '12px',
                                                                fontWeight: 600,
                                                                border: superfightForm.fighter1.belt === belt ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                                                                background: superfightForm.fighter1.belt === belt ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0,0,0,0.3)',
                                                                color: superfightForm.fighter1.belt === belt ? '#f8fafc' : '#94a3b8',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            {belt}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Lutador 2 (Azul) */}
                                        <div style={{ flex: 1, minWidth: '0', background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.05) 0%, rgba(255,255,255,0.01) 100%)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(56, 189, 248, 0.2)', position: 'relative', overflow: 'hidden' }}>
                                            <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', background: '#38bdf8' }}></div>
                                            <h4 style={{ margin: '0 0 24px 0', color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', fontSize: '1.1rem' }}>
                                                <div style={{ background: '#38bdf8', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800 }}>CANTO AZUL</div>
                                            </h4>
                                            
                                            {/* Photo Upload Area */}
                                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                                                <label style={{ cursor: 'pointer', position: 'relative', display: 'block', width: '140px', height: '140px', borderRadius: '50%', border: '3px solid #38bdf8', overflow: 'hidden', background: '#0f172a', boxShadow: '0 8px 16px rgba(56, 189, 248, 0.2)' }}>
                                                    {superfightForm.fighter2.photo ? (
                                                        <img src={superfightForm.fighter2.photo} alt="Fighter 2" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                                            <Upload size={24} style={{ marginBottom: '4px', color: '#38bdf8' }} />
                                                            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>Subir Foto</span>
                                                        </div>
                                                    )}
                                                    <input 
                                                        type="file" 
                                                        accept="image/*" 
                                                        style={{ display: 'none' }} 
                                                        onChange={async (e) => {
                                                            if (e.target.files && e.target.files[0]) {
                                                                try {
                                                                    const compressed = await compressImageFileWithConstraints(e.target.files[0], { maxWidth: 600, maxHeight: 600 });
                                                                    setSuperfightForm(f => ({...f, fighter2: {...f.fighter2, photo: compressed.dataUrl}}));
                                                                } catch (err) {
                                                                    showFeedback('error', 'Falha ao processar imagem.');
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>

                                            <div style={{ marginBottom: '16px' }}>
                                                <label className="table-meta">Nome do Atleta *</label>
                                                <input className="input" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px 16px', fontSize: '15px' }} required value={superfightForm.fighter2.name} onChange={e => setSuperfightForm(f => ({...f, fighter2: {...f.fighter2, name: e.target.value}}))} placeholder="Ex: Carlos Santos" />
                                            </div>
                                            <div style={{ marginBottom: '16px' }}>
                                                <label className="table-meta">Academia / Equipe *</label>
                                                <input className="input" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px 16px', fontSize: '15px' }} required value={superfightForm.fighter2.academy} onChange={e => setSuperfightForm(f => ({...f, fighter2: {...f.fighter2, academy: e.target.value}}))} placeholder="Ex: Nova União" />
                                            </div>
                                            <div>
                                                <label className="table-meta">Faixa *</label>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                                    {['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'].map(belt => (
                                                        <button 
                                                            key={belt}
                                                            type="button"
                                                            onClick={() => setSuperfightForm(f => ({...f, fighter2: {...f.fighter2, belt}}))}
                                                            style={{
                                                                padding: '6px 12px',
                                                                borderRadius: '8px',
                                                                fontSize: '12px',
                                                                fontWeight: 600,
                                                                border: superfightForm.fighter2.belt === belt ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                                                                background: superfightForm.fighter2.belt === belt ? 'rgba(56, 189, 248, 0.2)' : 'rgba(0,0,0,0.3)',
                                                                color: superfightForm.fighter2.belt === belt ? '#f8fafc' : '#94a3b8',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            {belt}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
                                        <button type="button" className="btn btn-ghost" onClick={() => setSuperfightForm(null)}>Cancelar</button>
                                        <button type="submit" className="btn btn-primary" style={{ padding: '0 32px' }}>
                                            <CheckCircle2 size={18} /> Salvar Luta Casada
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;







