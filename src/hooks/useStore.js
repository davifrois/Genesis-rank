import React, { createContext, useContext, useEffect, useState } from 'react';
import { calculateTotalPoints, rankAthletes } from '../services/scoringService';
import { authService } from '../services/authService';
import { buildCategoryDescriptor, matchesBracketMode } from '../services/categoryService';
import { nextPowerOfTwo, shuffleList } from '../services/bracketService';
import { normalizeEventFees, resolveEventPixKey } from '../utils/eventPricing';

const STORAGE_KEY = 'genesis_ranking_data';
const STORAGE_BACKUP_KEY = 'genesis_ranking_data_backup_v1';
const LEGACY_STORAGE_KEYS = [
    'genesis_ranking_data_v2',
    'genesis_ranking_store',
    'genesis_ranking_state'
];
const PENDING_REGISTRATION_STORAGE_KEY = 'genesis_public_registration_pending_v1';
const STORAGE_VERSION = 3;
const MAX_HISTORY_ENTRIES = 12;
const MAX_NOTIFICATIONS = 20;
const StoreContext = createContext(null);
const DEFAULT_NEWS_ITEMS = [
    {
        id: 'news-1',
        title: 'Temporada aberta com novos campeonatos',
        summary: 'Novas etapas regionais e estaduais foram adicionadas e já alimentam o ranking oficial.',
        imageUrl: '',
        publishedAt: '2026-02-12',
        createdAt: '2026-02-12T12:00:00.000Z'
    },
    {
        id: 'news-2',
        title: 'Ranking atualizado em tempo real',
        summary: 'Agora, cada resultado processado atualiza pontos e posição do atleta automaticamente.',
        imageUrl: '',
        publishedAt: '2026-02-05',
        createdAt: '2026-02-05T12:00:00.000Z'
    },
    {
        id: 'news-3',
        title: 'Regras de pontuação revisadas',
        summary: 'A tabela de eventos por estrelas segue válida para manter transparência no sistema.',
        imageUrl: '',
        publishedAt: '2026-01-25',
        createdAt: '2026-01-25T12:00:00.000Z'
    }
];
const DEFAULT_ACADEMIES = [
    {
        id: 'academy-1',
        name: 'Templum Fight',
        country: 'Brasil',
        city: 'Belo Horizonte',
        state: 'MG',
        logoUrl: '',
        createdAt: '2026-01-10T12:00:00.000Z'
    },
    {
        id: 'academy-2',
        name: 'Genesis Team',
        country: 'Brasil',
        city: 'Contagem',
        state: 'MG',
        logoUrl: '',
        createdAt: '2026-01-15T12:00:00.000Z'
    }
];

const hasEncodingArtifacts = (value) => (
    typeof value === 'string' && /Ã|Â|�/.test(value)
);

const utf8Decoder = typeof TextDecoder !== 'undefined'
    ? new TextDecoder('utf-8', { fatal: false })
    : null;

const fixMojibake = (value) => {
    if (!hasEncodingArtifacts(value) || !utf8Decoder) return value;
    try {
        const bytes = Uint8Array.from([...value].map((char) => char.charCodeAt(0)));
        const decoded = utf8Decoder.decode(bytes);
        if (!hasEncodingArtifacts(decoded) && decoded !== value) {
            return decoded;
        }
    } catch {
        return value;
    }
    return value;
};

const normalizeText = (value) => {
    if (value === null || value === undefined) return '';
    const text = typeof value === 'string' ? value : String(value);
    return fixMojibake(text);
};

const normalizeTextTrimmed = (value) => normalizeText(value).trim();

const normalizeOptionalUrl = (value) => {
    const text = normalizeTextTrimmed(value || '');
    if (!text) return '';
    if (/^(https?:|data:|blob:|\/|\.\/|\.\.\/)/i.test(text)) return text;
    return `https://${text}`;
};

const normalizeBoolean = (value, fallback = false) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
        const parsed = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'sim', 'open', 'aberto', 'active', 'ativo'].includes(parsed)) return true;
        if (['false', '0', 'no', 'nao', 'não', 'closed', 'fechado', 'inactive', 'inativo'].includes(parsed)) return false;
    }
    return fallback;
};

const normalizeId = (value) => {
    if (value === null || value === undefined) return '';
    const text = typeof value === 'string' ? value : String(value);
    return normalizeTextTrimmed(text);
};

const normalizeArray = (value) => (Array.isArray(value) ? value : []);

const safeReadStorage = (key) => {
    if (!key) return null;
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};

const parseStoredJson = (rawValue) => {
    if (typeof rawValue !== 'string' || !rawValue.trim()) return null;
    try {
        return JSON.parse(rawValue);
    } catch {
        return null;
    }
};

const parseStoredObject = (rawValue) => {
    const parsed = parseStoredJson(rawValue);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed;
};

const loadStoredPayload = () => {
    const storageKeys = [STORAGE_KEY, STORAGE_BACKUP_KEY, ...LEGACY_STORAGE_KEYS];
    for (const key of storageKeys) {
        const parsed = parseStoredObject(safeReadStorage(key));
        if (parsed) return parsed;
    }
    return null;
};

const normalizeUser = (user) => {
    if (!user || typeof user !== 'object') return null;
    return {
        ...user,
        username: normalizeTextTrimmed(user.username || ''),
        name: normalizeTextTrimmed(user.name || ''),
        role: user.role
    };
};

const initialData = {
    schemaVersion: STORAGE_VERSION,
    athletes: [
        { id: '1', nome: 'JOÃO MIGUEL SANTOS VIEIRA', faixa: 'Branca/Cinza', peso: 'Pena', categoria: 'Pré-Mirim', academia: 'GRACIE BARRA COIMBRA', pontos: 36, historico: [] },
        { id: '2', nome: 'Samir Daniel Silva Fraga', faixa: 'Branca/Cinza', peso: 'Pena', categoria: 'Pré-Mirim', academia: 'GRACIE BARRA COIMBRA', pontos: 12, historico: [] },
        { id: '3', nome: 'João Pedro da Rocha Barbosa', faixa: 'Branca/Cinza', peso: 'Médio', categoria: 'Pré-Mirim', academia: 'GRACIE BARRA COIMBRA', pontos: 36, historico: [] },
        { id: '4', nome: 'PEDRO BARROS MARTINO', faixa: 'Branca/Cinza', peso: 'Médio', categoria: 'Pré-Mirim', academia: 'GRACIE BARRA COIMBRA', pontos: 12, historico: [] },
        { id: '5', nome: 'EMANUELLY DA SILVA ANDRADE', faixa: 'Branca/Cinza', peso: 'Galo', categoria: 'Mirim A', academia: 'TRINDADE BRAZILIAN JJ', pontos: 36, historico: [] },
        { id: '6', nome: 'OLÍVIA MORAES SANTANA', faixa: 'Branca/Cinza', peso: 'Galo', categoria: 'Mirim A', academia: 'GRACIE BARRA COIMBRA', pontos: 12, historico: [] },
    ],
    events: [],
    news: DEFAULT_NEWS_ITEMS,
    academies: DEFAULT_ACADEMIES,
    memberProfiles: [],
    activeEventId: null,
    logs: [],
    notifications: [],
    rankHistory: {},
    brackets: [],
    nextBracketNumber: 1,
    currentUser: null,
};

const sanitizeHistoryItem = (item) => {
    if (!item || typeof item.type !== 'string') return null;
    const type = item.type.trim().toLowerCase();
    const appendTimestamp = (record) => {
        if (typeof item.timestamp === 'string' && item.timestamp.trim()) {
            record.timestamp = item.timestamp.trim();
        }
        return record;
    };

    if (type === 'win') return appendTimestamp({ type: 'win' });
    if (type === 'seed' && Number.isFinite(Number(item.points))) {
        return appendTimestamp({ type: 'seed', points: Number(item.points) });
    }
    if (type === 'podium') {
        const position = Number(item.position);
        if (![1, 2, 3].includes(position)) return null;
        const record = { type: 'podium', position };
        if (typeof item.source === 'string' && item.source.trim()) {
            record.source = normalizeTextTrimmed(item.source);
        }
        if (typeof item.bracketId === 'string' && item.bracketId.trim()) {
            record.bracketId = normalizeTextTrimmed(item.bracketId);
        }
        return appendTimestamp(record);
    }
    return null;
};

const resolveIsNoGi = (athlete) => (
    athlete?.isNoGi === true
    || normalizeTextTrimmed(athlete?.modalidade || '').toUpperCase() === 'NO-GI'
);

const normalizeKeyPart = (value) => (
    (normalizeText(value) || '').toString().trim().toLowerCase().replace(/\s+/g, ' ')
);

const normalizeNameKey = (value) => (
    normalizeKeyPart(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
);

const compactNameKey = (value) => normalizeNameKey(value).replace(/\s+/g, '');

const namesLikelySame = (left, right) => {
    const leftName = normalizeNameKey(left);
    const rightName = normalizeNameKey(right);
    if (!leftName || !rightName) return false;
    if (leftName === rightName) return true;

    const leftCompact = compactNameKey(leftName);
    const rightCompact = compactNameKey(rightName);
    if (!leftCompact || !rightCompact) return false;
    if (leftCompact === rightCompact) return true;
    if (leftCompact.includes(rightCompact) || rightCompact.includes(leftCompact)) return true;

    const leftParts = leftName.split(' ').filter(Boolean);
    const rightParts = rightName.split(' ').filter(Boolean);
    const leftLastJoined = leftParts.slice(1).join('');
    const rightLastJoined = rightParts.slice(1).join('');
    const leftInitialLast = `${leftParts[0]?.charAt(0) || ''}${leftLastJoined}`;
    const rightInitialLast = `${rightParts[0]?.charAt(0) || ''}${rightLastJoined}`;

    if (leftInitialLast && rightCompact === leftInitialLast) return true;
    if (rightInitialLast && leftCompact === rightInitialLast) return true;

    const leftLast = leftParts[leftParts.length - 1] || '';
    const rightLast = rightParts[rightParts.length - 1] || '';
    const leftFirstInitial = leftParts[0]?.charAt(0) || '';
    const rightFirstInitial = rightParts[0]?.charAt(0) || '';

    return Boolean(
        leftLast
        && rightLast
        && leftLast === rightLast
        && leftFirstInitial
        && rightFirstInitial
        && leftFirstInitial === rightFirstInitial
    );
};

const academyLikelySame = (left, right) => {
    const leftValue = normalizeKeyPart(left);
    const rightValue = normalizeKeyPart(right);
    if (!leftValue || !rightValue) return false;
    if (leftValue === rightValue) return true;
    return leftValue.includes(rightValue) || rightValue.includes(leftValue);
};

const resolveIsAbsolute = (athlete) => (
    athlete?.isAbsolute === true
    || athlete?.absoluto === true
    || athlete?.isAbsoluto === true
);

const resolveGender = (athlete) => normalizeTextTrimmed(athlete?.genero || athlete?.sexo || '');
const resolveEventId = (athlete) => normalizeId(athlete?.eventId || athlete?.eventoId || '');

const normalizeAthlete = (athlete) => {
    const source = athlete || {};
    let history = Array.isArray(source.historico)
        ? source.historico.map(sanitizeHistoryItem).filter(Boolean)
        : [];
    const basePoints = Number(source.pontos || 0);
    if (history.length === 0 && basePoints > 0) {
        history = [{ type: 'seed', points: basePoints }];
    }
    const calculatedPoints = calculateTotalPoints(history);
    const pontos = history.length ? calculatedPoints : basePoints;
    const isNoGi = resolveIsNoGi(source);
    const isAbsolute = resolveIsAbsolute(source);
    const eventId = resolveEventId(source);
    const nome = normalizeTextTrimmed(source.nome || '');
    const faixa = normalizeTextTrimmed(source.faixa || '');
    const peso = normalizeTextTrimmed(source.peso || '');
    const categoria = normalizeTextTrimmed(source.categoria || '');
    const academia = normalizeTextTrimmed(source.academia || '') || 'Sem academia';
    const genero = resolveGender(source);
    const id = normalizeId(source.id);
    const photoUrl = normalizeOptionalUrl(source.photoUrl || source.fotoUrl || source.avatarUrl || source.foto || '');
    const country = normalizeTextTrimmed(source.country || source.pais || source.nacionalidade || '');
    const countryCode = normalizeTextTrimmed(source.countryCode || source.paisCode || '');

    return {
        ...source,
        id,
        nome,
        faixa,
        peso,
        categoria,
        academia,
        genero,
        photoUrl,
        country,
        countryCode,
        historico: history,
        pontos,
        isNoGi,
        isAbsolute,
        eventId
    };
};

const normalizeBracket = (bracket) => {
    if (!bracket || typeof bracket !== 'object') return null;
    const seedIds = normalizeArray(bracket.seedIds).map(normalizeId).filter(Boolean);
    const size = Number.isFinite(bracket.size) ? bracket.size : nextPowerOfTwo(seedIds.length, 2);
    const podium = bracket.podium && typeof bracket.podium === 'object' ? bracket.podium : {};
    const id = normalizeId(bracket.id) || Math.random().toString(36).substr(2, 9);
    return {
        id,
        number: Number.isFinite(bracket.number) ? bracket.number : 0,
        eventId: normalizeId(bracket.eventId),
        categoryKey: normalizeTextTrimmed(bracket.categoryKey || ''),
        label: normalizeTextTrimmed(bracket.label || '') || 'Categoria',
        mode: normalizeTextTrimmed(bracket.mode || '') || 'GI',
        seedIds,
        size,
        podium: {
            goldId: normalizeId(podium.goldId),
            silverId: normalizeId(podium.silverId),
            bronzeId: normalizeId(podium.bronzeId)
        },
        appliedAt: bracket.appliedAt || '',
        createdAt: bracket.createdAt || new Date().toISOString()
    };
};

const normalizeEvent = (event) => {
    if (!event || typeof event !== 'object') return null;
    const normalizedName = normalizeTextTrimmed(event.name || event.eventName || '');
    const normalizedDate = typeof event.date === 'string'
        ? event.date.trim()
        : typeof event.eventDate === 'string'
            ? event.eventDate.trim()
            : event.date || event.eventDate || '';
    const normalizedLocation = normalizeTextTrimmed(event.location || event.eventLocation || '');
    const fallbackIdSource = normalizeNameKey(
        [normalizedName, normalizedDate, normalizedLocation].filter(Boolean).join(' ')
    ).replace(/\s+/g, '-');
    const id = normalizeId(event.id || event.eventId || fallbackIdSource);
    if (!id && !normalizedName) return null;
    const registrationUrl = normalizeOptionalUrl(event.registrationUrl || event.registrationLink || '');
    const fees = normalizeEventFees(event);
    const pixKey = resolveEventPixKey(event);
    const registrationOpen = normalizeBoolean(
        event.registrationOpen,
        true
    );
    const internalRegistration = normalizeBoolean(
        event.internalRegistration,
        true
    );
    return {
        ...event,
        id,
        name: normalizedName || id,
        date: normalizedDate,
        location: normalizedLocation,
        posterUrl: normalizeOptionalUrl(event.posterUrl || event.imageUrl || ''),
        registrationUrl,
        pixKey,
        feeUnder15: fees.under15,
        feeOver15: fees.over15,
        feeCombo: fees.combo,
        feeAbsolute: fees.absolute,
        registrationOpen,
        internalRegistration
    };
};

const mergeEvents = (baseEvents = [], extraEvents = []) => {
    const map = new Map();
    const pushEvent = (event) => {
        const normalized = normalizeEvent(event);
        if (!normalized) return;
        const idKey = normalizeId(normalized.id);
        const nameKey = normalizeKeyPart(normalized.name);
        const key = idKey || nameKey;
        if (!key) return;
        if (map.has(key)) {
            const previous = map.get(key);
            map.set(key, {
                ...previous,
                ...normalized,
                name: normalized.name || previous.name,
                date: normalized.date || previous.date,
                location: normalized.location || previous.location
            });
            return;
        }
        map.set(key, normalized);
    };

    normalizeArray(baseEvents).forEach(pushEvent);
    normalizeArray(extraEvents).forEach(pushEvent);
    return [...map.values()];
};

const recoverEventsFromPendingRegistrations = () => {
    const parsed = parseStoredJson(safeReadStorage(PENDING_REGISTRATION_STORAGE_KEY));
    if (!Array.isArray(parsed)) return [];
    return parsed
        .map((record) => {
            const payload = record?.payload && typeof record.payload === 'object'
                ? record.payload
                : {};
            return normalizeEvent({
                id: payload.eventId,
                name: payload.eventName,
                date: payload.eventDate,
                location: payload.eventLocation,
                registrationOpen: true,
                internalRegistration: true
            });
        })
        .filter(Boolean);
};

const recoverEventsFromAthletes = (athletes = []) => {
    return normalizeArray(athletes)
        .map((athlete) => {
            const eventId = normalizeId(athlete?.eventId);
            if (!eventId) return null;
            return normalizeEvent({
                id: eventId,
                name: normalizeTextTrimmed(athlete?.eventName || '') || `Evento ${eventId}`,
                registrationOpen: true,
                internalRegistration: true
            });
        })
        .filter(Boolean);
};

const recoverEventsFromLogs = (logs = []) => {
    return normalizeArray(logs)
        .map((item) => normalizeLog(item))
        .filter(Boolean)
        .map((log) => {
            if (normalizeTextTrimmed(log.action).toUpperCase() !== 'ADD_EVENT') return null;
            const match = normalizeText(log.details).match(/evento criado:\s*(.+)$/i);
            const name = normalizeTextTrimmed(match?.[1] || '');
            if (!name) return null;
            const fallbackId = normalizeNameKey(name).replace(/\s+/g, '-');
            return normalizeEvent({
                id: fallbackId,
                name,
                registrationOpen: true,
                internalRegistration: true
            });
        })
        .filter(Boolean);
};

const recoverEventsIfMissing = ({ events = [], athletes = [], logs = [] }) => {
    if (normalizeArray(events).length > 0) return events;
    const recoveredFromAthletes = recoverEventsFromAthletes(athletes);
    const recoveredFromPending = recoverEventsFromPendingRegistrations();
    const recoveredFromLogs = recoverEventsFromLogs(logs);
    return mergeEvents([], [...recoveredFromAthletes, ...recoveredFromPending, ...recoveredFromLogs]);
};

const normalizeLog = (log) => {
    if (!log || typeof log !== 'object') return null;
    return {
        ...log,
        type: normalizeText(log.type),
        action: normalizeText(log.action),
        details: normalizeText(log.details)
    };
};

const normalizeNotification = (notification) => {
    if (!notification || typeof notification !== 'object') return null;
    return {
        ...notification,
        name: normalizeText(notification.name)
    };
};

const normalizeNews = (item) => {
    if (!item || typeof item !== 'object') return null;
    const title = normalizeTextTrimmed(item.title || '');
    if (!title) return null;
    const summary = normalizeTextTrimmed(item.summary || '');
    const createdAtRaw = normalizeTextTrimmed(item.createdAt || '');
    const publishedAtRaw = normalizeTextTrimmed(item.publishedAt || '');
    const createdAt = createdAtRaw || new Date().toISOString();

    return {
        ...item,
        id: normalizeId(item.id) || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        summary,
        imageUrl: normalizeOptionalUrl(item.imageUrl || item.coverUrl || ''),
        author: normalizeTextTrimmed(item.author || ''),
        publishedAt: publishedAtRaw,
        createdAt
    };
};

const normalizeAcademy = (academy) => {
    if (!academy || typeof academy !== 'object') return null;
    const name = normalizeTextTrimmed(academy.name || academy.nome || '');
    if (!name) return null;

    return {
        ...academy,
        id: normalizeId(academy.id) || `academy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        country: normalizeTextTrimmed(academy.country || academy.pais || '') || 'Brasil',
        city: normalizeTextTrimmed(academy.city || academy.cidade || ''),
        state: normalizeTextTrimmed(academy.state || academy.estado || ''),
        ownerName: normalizeTextTrimmed(academy.ownerName || academy.responsavel || ''),
        contactPhone: normalizeTextTrimmed(academy.contactPhone || academy.telefone || ''),
        contactEmail: normalizeTextTrimmed(academy.contactEmail || academy.email || ''),
        logoUrl: normalizeOptionalUrl(academy.logoUrl || academy.fotoUrl || academy.imageUrl || ''),
        createdAt: normalizeTextTrimmed(academy.createdAt || '') || new Date().toISOString()
    };
};

const calculateAgeFromBirthDate = (value) => {
    if (!value) return '';
    const birth = new Date(value);
    if (Number.isNaN(birth.getTime())) return '';

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const hasBirthdayPassed = (
        today.getMonth() > birth.getMonth()
        || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate())
    );
    if (!hasBirthdayPassed) age -= 1;
    return age >= 0 ? age : '';
};

const normalizeMemberProfile = (profile) => {
    if (!profile || typeof profile !== 'object') return null;
    const firstName = normalizeTextTrimmed(profile.firstName || profile.nome || profile.name || '');
    const lastName = normalizeTextTrimmed(profile.lastName || profile.sobrenome || '');
    const fallbackFullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    const fullName = normalizeTextTrimmed(profile.fullName || fallbackFullName);
    const birthDate = normalizeTextTrimmed(profile.birthDate || profile.dataNascimento || '');
    const parsedAge = Number(profile.age || profile.idade || '');
    const calculatedAge = calculateAgeFromBirthDate(birthDate);
    const age = calculatedAge !== ''
        ? calculatedAge
        : (Number.isFinite(parsedAge) && parsedAge >= 0 ? Math.floor(parsedAge) : '');
    if (!fullName) return null;

    return {
        ...profile,
        id: normalizeId(profile.id) || `member-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        firstName,
        lastName,
        fullName,
        birthDate,
        age,
        email: normalizeTextTrimmed(profile.email || ''),
        phone: normalizeTextTrimmed(profile.phone || profile.telefone || ''),
        createdByUsername: normalizeTextTrimmed(profile.createdByUsername || profile.usuario || ''),
        createdByName: normalizeTextTrimmed(profile.createdByName || profile.usuarioNome || ''),
        academyId: normalizeId(profile.academyId || ''),
        academyName: normalizeTextTrimmed(profile.academyName || profile.academia || profile.academy || ''),
        country: normalizeTextTrimmed(profile.country || profile.pais || '') || 'Brasil',
        city: normalizeTextTrimmed(profile.city || profile.cidade || ''),
        belt: normalizeTextTrimmed(profile.belt || profile.faixa || ''),
        weight: normalizeTextTrimmed(profile.weight || profile.peso || ''),
        photoUrl: normalizeOptionalUrl(profile.photoUrl || profile.fotoUrl || profile.avatarUrl || profile.photo || ''),
        createdAt: normalizeTextTrimmed(profile.createdAt || '') || new Date().toISOString()
    };
};

const resolveBracketMode = (athlete) => {
    if (athlete.isAbsolute) {
        return athlete.isNoGi ? 'ABS-NO-GI' : 'ABS-GI';
    }
    return athlete.isNoGi ? 'NO-GI' : 'GI';
};

const buildBracketPayloads = (athletes, eventId, mode, startingNumber) => {
    const groups = new Map();
    athletes.forEach((athlete) => {
        if (athlete.eventId !== eventId) return;
        if (!matchesBracketMode(athlete, mode)) return;
        const descriptor = buildCategoryDescriptor(athlete);
        const current = groups.get(descriptor.key) || {
            key: descriptor.key,
            label: descriptor.label,
            entries: [],
            mode: resolveBracketMode(athlete)
        };
        current.entries.push(athlete);
        groups.set(descriptor.key, current);
    });

    const ordered = [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
    let nextNumber = startingNumber;
    const brackets = ordered.map((group) => {
        const seedIds = shuffleList(group.entries.map((athlete) => athlete.id));
        return {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            number: nextNumber++,
            eventId,
            categoryKey: group.key,
            label: group.label,
            mode: group.mode,
            seedIds,
            size: nextPowerOfTwo(seedIds.length, 2),
            podium: {
                goldId: '',
                silverId: '',
                bronzeId: ''
            },
            appliedAt: '',
            createdAt: new Date().toISOString()
        };
    });

    return { brackets, nextNumber };
};

const buildAthleteKey = (athlete) => {
    const isNoGi = resolveIsNoGi(athlete);
    const isAbsolute = athlete?.isAbsolute === true;
    const parts = [
        normalizeKeyPart(athlete?.nome),
        normalizeKeyPart(athlete?.academia),
        normalizeKeyPart(athlete?.categoria),
        normalizeKeyPart(athlete?.faixa),
        normalizeKeyPart(athlete?.peso),
        normalizeKeyPart(resolveGender(athlete)),
        isNoGi ? 'nogi' : 'gi',
        isAbsolute ? 'abs' : 'std',
        normalizeKeyPart(resolveEventId(athlete))
    ];
    return parts.join('::');
};

const buildRankSnapshot = (athletes) => {
    const ranked = rankAthletes(athletes);
    return ranked.map((athlete, index) => ({
        id: athlete.id,
        nome: athlete.nome,
        pontos: athlete.pontos,
        rank: index + 1
    }));
};

const buildRankMap = (athletes) => (
    buildRankSnapshot(athletes).reduce((acc, entry) => {
        acc[entry.id] = entry.rank;
        return acc;
    }, {})
);

const ensureRankHistory = (athletes, existingHistory) => {
    const snapshot = buildRankSnapshot(athletes);
    const timestamp = new Date().toISOString();
    const nextHistory = { ...existingHistory };

    snapshot.forEach((entry) => {
        const current = Array.isArray(nextHistory[entry.id]) ? [...nextHistory[entry.id]] : [];
        const last = current[current.length - 1];
        if (!last || last.rank !== entry.rank || last.pontos !== entry.pontos) {
            current.push({ timestamp, rank: entry.rank, pontos: entry.pontos });
        }
        nextHistory[entry.id] = current.slice(-MAX_HISTORY_ENTRIES);
    });

    return nextHistory;
};

const buildRankNotifications = (previousRanks, nextRanks, athletes, existingNotifications) => {
    const timestamp = new Date().toISOString();
    const fresh = [];

    athletes.forEach((athlete) => {
        const previousRank = previousRanks[athlete.id];
        const nextRank = nextRanks[athlete.id];
        if (!previousRank || !nextRank) return;
        if (nextRank < previousRank) {
            fresh.push({
                id: `${athlete.id}-${Date.now()}`,
                athleteId: athlete.id,
                name: athlete.nome,
                fromRank: previousRank,
                toRank: nextRank,
                delta: previousRank - nextRank,
                timestamp
            });
        }
    });

    return [...fresh, ...existingNotifications].slice(0, MAX_NOTIFICATIONS);
};

const migrateStoredData = (payload) => {
    if (!payload || typeof payload !== 'object') {
        return { ...initialData };
    }
    const version = Number.isFinite(payload.schemaVersion) ? payload.schemaVersion : 1;
    if (version >= STORAGE_VERSION) {
        return payload;
    }
    return { ...payload, schemaVersion: STORAGE_VERSION };
};

const useStoreState = () => {
    const [data, setData] = useState(() => {
        let parsed = loadStoredPayload() || initialData;
        parsed = migrateStoredData(parsed);

        const athletes = normalizeArray(parsed.athletes || initialData.athletes).map(normalizeAthlete);
        const logs = normalizeArray(parsed.logs).map(normalizeLog).filter(Boolean).slice(0, 100);
        const parsedEvents = normalizeArray(parsed.events).map(normalizeEvent).filter(Boolean);
        const recoveredEvents = recoverEventsIfMissing({
            events: parsedEvents,
            athletes,
            logs
        });
        const events = mergeEvents(parsedEvents, recoveredEvents);
        const eventIds = new Set(events.map((event) => event.id).filter(Boolean));
        const eventBoundAthletes = athletes.map((athlete) => (
            athlete.eventId && eventIds.size > 0 && !eventIds.has(athlete.eventId)
                ? { ...athlete, eventId: '' }
                : athlete
        ));
        const notifications = normalizeArray(parsed.notifications)
            .map(normalizeNotification)
            .filter(Boolean)
            .slice(0, MAX_NOTIFICATIONS);
        const news = normalizeArray(parsed.news || initialData.news)
            .map(normalizeNews)
            .filter(Boolean)
            .sort((a, b) => {
                const aTime = new Date(a.publishedAt || a.createdAt || 0).getTime();
                const bTime = new Date(b.publishedAt || b.createdAt || 0).getTime();
                return bTime - aTime;
            });
        const academies = normalizeArray(parsed.academies || initialData.academies)
            .map(normalizeAcademy)
            .filter(Boolean)
            .sort((a, b) => a.name.localeCompare(b.name));
        const academyByName = new Map(academies.map((academy) => [normalizeKeyPart(academy.name), academy]));
        const memberProfiles = normalizeArray(parsed.memberProfiles)
            .map(normalizeMemberProfile)
            .filter(Boolean)
            .map((profile) => {
                const linkedAcademy = profile.academyId
                    ? academies.find((academy) => academy.id === profile.academyId)
                    : academyByName.get(normalizeKeyPart(profile.academyName || ''));
                if (!linkedAcademy) return profile;
                return {
                    ...profile,
                    academyId: linkedAcademy.id,
                    academyName: linkedAcademy.name
                };
            })
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        const normalizedAthletes = eventBoundAthletes.map((athlete) => {
            if (athlete.photoUrl) return athlete;
            const linkedProfile = memberProfiles.find((profile) => (
                profile?.photoUrl
                && namesLikelySame(athlete.nome, profile.fullName)
                && (
                    academyLikelySame(athlete.academia || '', profile.academyName || '')
                    || !normalizeKeyPart(profile.academyName || '')
                    || !normalizeKeyPart(athlete.academia || '')
                    || normalizeKeyPart(athlete.academia || '') === normalizeKeyPart('Sem academia')
                )
            ));
            if (!linkedProfile) return athlete;
            return normalizeAthlete({
                ...athlete,
                photoUrl: linkedProfile.photoUrl
            });
        });
        const brackets = normalizeArray(parsed.brackets)
            .map(normalizeBracket)
            .filter(Boolean);
        const maxBracketNumber = brackets.reduce((max, bracket) => (
            Math.max(max, Number(bracket.number) || 0)
        ), 0);
        const nextBracketNumber = Math.max(
            Number.isFinite(parsed.nextBracketNumber) ? parsed.nextBracketNumber : initialData.nextBracketNumber,
            maxBracketNumber + 1
        );
        const normalizedActiveEventId = normalizeId(parsed.activeEventId);
        const activeEventId = normalizedActiveEventId && eventIds.has(normalizedActiveEventId)
            ? normalizedActiveEventId
            : null;
        let currentUser = normalizeUser(parsed.currentUser);
        if (currentUser && !currentUser.role) {
            currentUser = {
                ...currentUser,
                role: authService.getRoleForUsername
                    ? authService.getRoleForUsername(currentUser.username)
                    : currentUser.role
            };
        }
        const rankHistory = parsed.rankHistory && typeof parsed.rankHistory === 'object' && !Array.isArray(parsed.rankHistory)
            ? parsed.rankHistory
            : {};
        const merged = {
            ...initialData,
            ...parsed,
            schemaVersion: STORAGE_VERSION,
            athletes: normalizedAthletes,
            events,
            news,
            academies,
            memberProfiles,
            logs,
            notifications,
            rankHistory,
            activeEventId,
            brackets,
            nextBracketNumber,
            currentUser
        };

        return {
            ...merged,
            rankHistory: ensureRankHistory(normalizedAthletes, merged.rankHistory)
        };
    });

    const [eventResults, setEventResults] = useState([]);
    const [uiState, setUiState] = useState({ eventModalOpen: false });

    useEffect(() => {
        const timeout = setTimeout(() => {
            const payload = { ...data, schemaVersion: STORAGE_VERSION };
            const serialized = JSON.stringify(payload);
            try {
                localStorage.setItem(STORAGE_KEY, serialized);
            } catch {
                try {
                    localStorage.setItem(STORAGE_BACKUP_KEY, serialized);
                } catch {
                    // Ignore storage write errors to avoid white screen when quota is exceeded.
                }
                return;
            }

            try {
                localStorage.setItem(STORAGE_BACKUP_KEY, serialized);
            } catch {
                // Backup storage is best effort.
            }
        }, 250);

        return () => clearTimeout(timeout);
    }, [data]);

    useEffect(() => {
        if (data.events.length > 0) return undefined;
        let cancelled = false;

        const bootstrapEventsFromApi = async () => {
            try {
                const response = await fetch('/api/public/events');
                if (!response.ok) return;
                const payload = await response.json();
                const remoteEvents = normalizeArray(payload).map(normalizeEvent).filter(Boolean);
                if (!remoteEvents.length || cancelled) return;

                setData((prev) => {
                    if (prev.events.length > 0) return prev;
                    const mergedEvents = mergeEvents(prev.events, remoteEvents);
                    if (!mergedEvents.length) return prev;
                    const activeEventStillExists = prev.activeEventId
                        && mergedEvents.some((event) => event.id === prev.activeEventId);
                    return {
                        ...prev,
                        events: mergedEvents,
                        activeEventId: activeEventStillExists
                            ? prev.activeEventId
                            : (mergedEvents[0]?.id || null)
                    };
                });
            } catch {
                // Ignore bootstrap failures; local mode still works.
            }
        };

        bootstrapEventsFromApi();
        return () => {
            cancelled = true;
        };
    }, [data.events.length]);

    const addLog = (log) => {
        const newLog = {
            ...log,
            id: Date.now(),
            timestamp: new Date().toISOString()
        };
        newLog.type = normalizeText(newLog.type);
        newLog.action = normalizeText(newLog.action);
        newLog.details = normalizeText(newLog.details);
        setData(prev => ({
            ...prev,
            logs: [newLog, ...prev.logs].slice(0, 100)
        }));
    };

    const login = (user) => {
        setData(prev => ({ ...prev, currentUser: user }));
        addLog({ type: 'AUTH', action: 'LOGIN', details: `Usuário ${user.name} acessou o sistema.` });
    };

    const logout = () => {
        if (authService.clearApiToken) {
            authService.clearApiToken();
        }
        addLog({ type: 'AUTH', action: 'LOGOUT', details: `Usuário ${data.currentUser?.name} saiu.` });
        setData(prev => ({ ...prev, currentUser: null }));
    };

    const openEventModal = () => {
        setUiState((prev) => ({ ...prev, eventModalOpen: true }));
    };

    const closeEventModal = () => {
        setUiState((prev) => ({ ...prev, eventModalOpen: false }));
    };

    const addNews = (payload = {}) => {
        const normalized = normalizeNews({
            ...payload,
            id: payload.id || `${Date.now()}`,
            createdAt: payload.createdAt || new Date().toISOString()
        });

        if (!normalized) {
            addLog({ type: 'ERROR', action: 'ADD_NEWS', details: 'Notícia inválida.' });
            throw new Error('Informe o título da notícia.');
        }

        setData((prev) => ({
            ...prev,
            news: [normalized, ...prev.news]
                .map(normalizeNews)
                .filter(Boolean)
                .sort((a, b) => new Date(b.publishedAt || b.createdAt || 0).getTime() - new Date(a.publishedAt || a.createdAt || 0).getTime())
        }));

        addLog({ type: 'INFO', action: 'ADD_NEWS', details: `Notícia criada: ${normalized.title}` });
        return normalized;
    };

    const addAcademy = (payload = {}) => {
        const normalized = normalizeAcademy({
            ...payload,
            id: payload.id || `academy-${Date.now()}`,
            createdAt: payload.createdAt || new Date().toISOString()
        });

        if (!normalized) {
            addLog({ type: 'ERROR', action: 'ADD_ACADEMY', details: 'Dados inválidos para academia.' });
            throw new Error('Informe o nome da academia.');
        }

        const exists = data.academies.find((academy) => normalizeKeyPart(academy.name) === normalizeKeyPart(normalized.name));
        if (exists) {
            addLog({ type: 'ERROR', action: 'ADD_ACADEMY', details: `Academia duplicada: ${normalized.name}` });
            throw new Error('Já existe uma academia com este nome.');
        }

        setData((prev) => ({
            ...prev,
            academies: [...prev.academies, normalized]
                .map(normalizeAcademy)
                .filter(Boolean)
                .sort((a, b) => a.name.localeCompare(b.name))
        }));

        addLog({ type: 'INFO', action: 'ADD_ACADEMY', details: `Academia cadastrada: ${normalized.name}` });
        return normalized;
    };

    const deleteAcademy = (academyId) => {
        const id = normalizeId(academyId);
        if (!id) {
            addLog({ type: 'ERROR', action: 'DELETE_ACADEMY', details: 'Academia inválida para exclusão.' });
            throw new Error('Academia inválida.');
        }

        const academy = data.academies.find((item) => item.id === id);
        if (!academy) {
            addLog({ type: 'ERROR', action: 'DELETE_ACADEMY', details: `Academia não encontrada: ${id}` });
            throw new Error('Academia não encontrada.');
        }

        setData((prev) => ({
            ...prev,
            academies: prev.academies.filter((item) => item.id !== id),
            memberProfiles: prev.memberProfiles.map((profile) => (
                profile.academyId === id
                    ? { ...profile, academyId: '', academyName: profile.academyName || academy.name }
                    : profile
            ))
        }));

        addLog({ type: 'WARN', action: 'DELETE_ACADEMY', details: `Academia removida: ${academy.name}` });
    };

    const addMemberProfile = (payload = {}) => {
        const normalized = normalizeMemberProfile({
            ...payload,
            id: payload.id || `member-${Date.now()}`,
            createdAt: payload.createdAt || new Date().toISOString()
        });

        if (!normalized) {
            addLog({ type: 'ERROR', action: 'ADD_MEMBER', details: 'Perfil de filiação inválido.' });
            throw new Error('Informe o nome completo do atleta.');
        }

        const academy = normalized.academyId
            ? data.academies.find((item) => item.id === normalized.academyId)
            : data.academies.find((item) => normalizeKeyPart(item.name) === normalizeKeyPart(normalized.academyName || ''));
        const academyId = academy?.id || normalized.academyId || '';
        const academyName = academy?.name || normalized.academyName || 'Sem academia';

        const profileToSave = {
            ...normalized,
            academyId,
            academyName
        };

        const duplicate = data.memberProfiles.find((profile) => (
            normalizeKeyPart(profile.fullName) === normalizeKeyPart(profileToSave.fullName)
            && normalizeKeyPart(profile.academyName || '') === normalizeKeyPart(profileToSave.academyName || '')
        ));

        const targetId = duplicate?.id || profileToSave.id;

        setData((prev) => {
            const nextProfiles = duplicate
                ? prev.memberProfiles.map((profile) => (profile.id === duplicate.id ? { ...profile, ...profileToSave, id: duplicate.id } : profile))
                : [profileToSave, ...prev.memberProfiles];

            const nextAthletes = prev.athletes.map((athlete) => {
                const sameName = namesLikelySame(athlete.nome, profileToSave.fullName);
                const sameAcademy = academyLikelySame(athlete.academia || '', profileToSave.academyName || '');
                const canLinkWithoutAcademy = (
                    !normalizeKeyPart(profileToSave.academyName || '')
                    || !normalizeKeyPart(athlete.academia || '')
                    || normalizeKeyPart(athlete.academia || '') === normalizeKeyPart('Sem academia')
                );
                if (!sameName || (!sameAcademy && !canLinkWithoutAcademy)) return athlete;
                return {
                    ...athlete,
                    photoUrl: profileToSave.photoUrl || athlete.photoUrl || ''
                };
            });

            return {
                ...prev,
                memberProfiles: nextProfiles
                    .map(normalizeMemberProfile)
                    .filter(Boolean)
                    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
                athletes: nextAthletes.map(normalizeAthlete)
            };
        });

        addLog({ type: 'INFO', action: 'ADD_MEMBER', details: `Filiação salva: ${profileToSave.fullName}` });
        return {
            ...profileToSave,
            id: targetId
        };
    };

    const deleteMemberProfile = (profileId) => {
        const id = normalizeId(profileId);
        if (!id) {
            addLog({ type: 'ERROR', action: 'DELETE_MEMBER', details: 'Perfil inválido para exclusão.' });
            throw new Error('Perfil inválido.');
        }

        const existing = data.memberProfiles.find((item) => item.id === id);
        if (!existing) {
            addLog({ type: 'ERROR', action: 'DELETE_MEMBER', details: `Perfil não encontrado: ${id}` });
            throw new Error('Perfil não encontrado.');
        }

        setData((prev) => ({
            ...prev,
            memberProfiles: prev.memberProfiles.filter((item) => item.id !== id)
        }));

        addLog({ type: 'WARN', action: 'DELETE_MEMBER', details: `Perfil removido: ${existing.fullName}` });
    };

    const updateNews = (newsId, updates = {}) => {
        const id = normalizeId(newsId);
        if (!id) {
            addLog({ type: 'ERROR', action: 'UPDATE_NEWS', details: 'Notícia inválida para edição.' });
            throw new Error('Notícia inválida.');
        }

        const current = data.news.find((item) => item.id === id);
        if (!current) {
            addLog({ type: 'ERROR', action: 'UPDATE_NEWS', details: `Notícia não encontrada: ${id}` });
            throw new Error('Notícia não encontrada.');
        }

        const normalized = normalizeNews({
            ...current,
            ...updates,
            id: current.id,
            createdAt: current.createdAt || new Date().toISOString()
        });

        if (!normalized) {
            addLog({ type: 'ERROR', action: 'UPDATE_NEWS', details: 'Conteúdo inválido para notícia.' });
            throw new Error('Conteúdo da notícia inválido.');
        }

        setData((prev) => ({
            ...prev,
            news: prev.news
                .map((item) => (item.id === id ? normalized : item))
                .map(normalizeNews)
                .filter(Boolean)
                .sort((a, b) => new Date(b.publishedAt || b.createdAt || 0).getTime() - new Date(a.publishedAt || a.createdAt || 0).getTime())
        }));

        addLog({ type: 'INFO', action: 'UPDATE_NEWS', details: `Notícia atualizada: ${normalized.title}` });
        return normalized;
    };

    const deleteNews = (newsId) => {
        const id = normalizeId(newsId);
        if (!id) {
            addLog({ type: 'ERROR', action: 'DELETE_NEWS', details: 'Notícia inválida para exclusão.' });
            throw new Error('Notícia inválida.');
        }

        const title = data.news.find((item) => item.id === id)?.title || id;
        setData((prev) => ({
            ...prev,
            news: prev.news.filter((item) => item.id !== id)
        }));
        addLog({ type: 'WARN', action: 'DELETE_NEWS', details: `Notícia removida: ${title}` });
    };

    const addEvent = (event) => {
        const name = normalizeTextTrimmed(event?.name || '');
        if (!name) {
            addLog({ type: 'ERROR', action: 'ADD_EVENT', details: 'Nome do evento não informado.' });
            throw new Error('Informe o nome do evento.');
        }
        const exists = data.events.find((item) => normalizeKeyPart(item.name) === normalizeKeyPart(name));
        if (exists) {
            addLog({ type: 'ERROR', action: 'ADD_EVENT', details: `Evento duplicado: ${name}` });
            throw new Error('Já existe um evento com este nome.');
        }
        const fees = normalizeEventFees(event);
        const pixKey = resolveEventPixKey(event);

        const newEvent = {
            id: Date.now().toString(),
            name,
            date: typeof event?.date === 'string' ? event.date.trim() : event?.date || '',
            location: normalizeTextTrimmed(event?.location || ''),
            posterUrl: normalizeOptionalUrl(event?.posterUrl || event?.imageUrl || ''),
            registrationUrl: normalizeOptionalUrl(event?.registrationUrl || event?.registrationLink || ''),
            pixKey,
            feeUnder15: fees.under15,
            feeOver15: fees.over15,
            feeCombo: fees.combo,
            feeAbsolute: fees.absolute,
            registrationOpen: normalizeBoolean(event?.registrationOpen, true),
            internalRegistration: normalizeBoolean(event?.internalRegistration, true),
            createdAt: new Date().toISOString()
        };

        setData(prev => ({
            ...prev,
            events: [...prev.events, newEvent],
            activeEventId: newEvent.id
        }));
        addLog({ type: 'INFO', action: 'ADD_EVENT', details: `Evento criado: ${name}` });
        return newEvent;
    };

    const updateEvent = (eventId, updates = {}) => {
        if (!eventId) {
            addLog({ type: 'ERROR', action: 'UPDATE_EVENT', details: 'Evento inválido para edição.' });
            throw new Error('Evento inválido.');
        }

        const current = data.events.find((event) => event.id === eventId);
        if (!current) {
            addLog({ type: 'ERROR', action: 'UPDATE_EVENT', details: `Evento não encontrado: ${eventId}` });
            throw new Error('Evento não encontrado.');
        }

        const name = normalizeTextTrimmed(updates?.name ?? current.name);
        if (!name) {
            addLog({ type: 'ERROR', action: 'UPDATE_EVENT', details: 'Nome do evento não informado.' });
            throw new Error('Informe o nome do evento.');
        }

        const duplicate = data.events.find((item) => (
            item.id !== eventId
            && normalizeKeyPart(item.name) === normalizeKeyPart(name)
        ));
        if (duplicate) {
            addLog({ type: 'ERROR', action: 'UPDATE_EVENT', details: `Evento duplicado: ${name}` });
            throw new Error('Já existe um evento com este nome.');
        }
        const fees = normalizeEventFees({
            feeUnder15: updates?.feeUnder15 ?? current.feeUnder15,
            feeOver15: updates?.feeOver15 ?? current.feeOver15,
            feeCombo: updates?.feeCombo ?? current.feeCombo,
            feeAbsolute: updates?.feeAbsolute ?? current.feeAbsolute
        });
        const pixKey = resolveEventPixKey({ pixKey: updates?.pixKey ?? current.pixKey });

        const updatedEvent = {
            ...current,
            name,
            date: typeof updates?.date === 'string'
                ? updates.date.trim()
                : updates?.date ?? current.date ?? '',
            location: normalizeTextTrimmed(updates?.location ?? current.location ?? ''),
            posterUrl: normalizeOptionalUrl(updates?.posterUrl ?? current.posterUrl ?? ''),
            registrationUrl: normalizeOptionalUrl(updates?.registrationUrl ?? current.registrationUrl ?? ''),
            pixKey,
            feeUnder15: fees.under15,
            feeOver15: fees.over15,
            feeCombo: fees.combo,
            feeAbsolute: fees.absolute,
            registrationOpen: normalizeBoolean(
                updates?.registrationOpen,
                current.registrationOpen ?? true
            ),
            internalRegistration: normalizeBoolean(
                updates?.internalRegistration,
                current.internalRegistration ?? true
            )
        };

        setData(prev => ({
            ...prev,
            events: prev.events.map((event) => (event.id === eventId ? updatedEvent : event))
        }));

        addLog({ type: 'INFO', action: 'UPDATE_EVENT', details: `Evento atualizado: ${name}` });
        return updatedEvent;
    };

    const deleteEvent = (eventId) => {
        if (!eventId) {
            addLog({ type: 'ERROR', action: 'DELETE_EVENT', details: 'Evento inválido para exclusão.' });
            throw new Error('Evento inválido.');
        }

        const eventName = data.events.find((event) => event.id === eventId)?.name || eventId;

        setData(prev => {
            const previousRanks = buildRankMap(prev.athletes);
            const updatedAthletes = prev.athletes.map((athlete) => (
                athlete.eventId === eventId
                    ? { ...athlete, eventId: '' }
                    : athlete
            ));
            const nextRanks = buildRankMap(updatedAthletes);

            return {
                ...prev,
                events: prev.events.filter((event) => event.id !== eventId),
                activeEventId: prev.activeEventId === eventId ? null : prev.activeEventId,
                athletes: updatedAthletes,
                brackets: prev.brackets.filter((bracket) => bracket.eventId !== eventId),
                rankHistory: ensureRankHistory(updatedAthletes, prev.rankHistory || {}),
                notifications: buildRankNotifications(previousRanks, nextRanks, updatedAthletes, prev.notifications || [])
            };
        });

        addLog({ type: 'WARN', action: 'DELETE_EVENT', details: `Evento removido: ${eventName}` });
    };

    const setActiveEvent = (eventId) => {
        setData(prev => ({ ...prev, activeEventId: eventId || null }));
        const eventName = data.events.find((event) => event.id === eventId)?.name || 'Evento';
        addLog({
            type: 'INFO',
            action: 'SET_ACTIVE_EVENT',
            details: eventId ? `Evento ativo: ${eventName}` : 'Evento ativo removido.'
        });
    };

    const assignAthletesToEvent = (eventId, athleteIds = []) => {
        if (!eventId) {
            addLog({ type: 'ERROR', action: 'ASSIGN_EVENT', details: 'Evento inválido para vínculo.' });
            throw new Error('Evento inválido.');
        }
        const selected = new Set(athleteIds);
        const eventName = data.events.find((event) => event.id === eventId)?.name || eventId;

        setData(prev => {
            const previousRanks = buildRankMap(prev.athletes);
            const updatedAthletes = prev.athletes.map((athlete) => {
                if (selected.has(athlete.id)) {
                    return { ...athlete, eventId };
                }
                if (athlete.eventId === eventId && !selected.has(athlete.id)) {
                    return { ...athlete, eventId: '' };
                }
                return athlete;
            });
            const nextRanks = buildRankMap(updatedAthletes);

            return {
                ...prev,
                athletes: updatedAthletes,
                rankHistory: ensureRankHistory(updatedAthletes, prev.rankHistory || {}),
                notifications: buildRankNotifications(previousRanks, nextRanks, updatedAthletes, prev.notifications || [])
            };
        });

        addLog({
            type: 'INFO',
            action: 'ASSIGN_EVENT',
            details: `Atletas vinculados ao evento ${eventName}.`
        });
    };

    const addAthlete = (athlete) => {
        // Integrity Check
        const exists = data.athletes.find((a) => buildAthleteKey(a) === buildAthleteKey(athlete));

        if (exists) {
            addLog({ type: 'ERROR', action: 'ADD_ATHLETE', details: `Tentativa de duplicata: ${athlete.nome}` });
            throw new Error('Este atleta já está cadastrado nesta categoria.');
        }

        setData(prev => {
            const previousRanks = buildRankMap(prev.athletes);
            const resolvedEventId = resolveEventId(athlete) || prev.activeEventId || '';
            const prepared = normalizeAthlete({
                ...athlete,
                id: Date.now().toString(),
                eventId: resolvedEventId,
                pontos: 0,
                historico: []
            });
            const nextAthletes = [...prev.athletes, prepared];
            const nextRanks = buildRankMap(nextAthletes);

            return {
                ...prev,
                athletes: nextAthletes,
                rankHistory: ensureRankHistory(nextAthletes, prev.rankHistory || {}),
                notifications: buildRankNotifications(previousRanks, nextRanks, nextAthletes, prev.notifications || [])
            };
        });
        addLog({ type: 'INFO', action: 'ADD_ATHLETE', details: `Novo atleta: ${athlete.nome} (${athlete.academia})` });
    };

    const removeAthlete = (id) => {
        const normalizedId = normalizeId(id);
        if (!normalizedId) {
            addLog({ type: 'ERROR', action: 'REMOVE_ATHLETE', details: 'ID inválido para remoção.' });
            throw new Error('Atleta inválido.');
        }

        const targetAthlete = data.athletes.find((athlete) => athlete.id === normalizedId);
        if (!targetAthlete) {
            addLog({ type: 'ERROR', action: 'REMOVE_ATHLETE', details: `Atleta ${normalizedId} não encontrado.` });
            throw new Error('Atleta não encontrado.');
        }

        setData((prev) => {
            const previousRanks = buildRankMap(prev.athletes);
            const updatedAthletes = prev.athletes.filter((athlete) => athlete.id !== normalizedId);
            const nextRanks = buildRankMap(updatedAthletes);

            const nextBrackets = prev.brackets.map((bracket) => {
                const seedIds = (bracket.seedIds || []).filter((seedId) => seedId !== normalizedId);
                const podium = bracket.podium || {};
                return {
                    ...bracket,
                    seedIds,
                    podium: {
                        ...podium,
                        goldId: podium.goldId === normalizedId ? '' : (podium.goldId || ''),
                        silverId: podium.silverId === normalizedId ? '' : (podium.silverId || ''),
                        bronzeId: podium.bronzeId === normalizedId ? '' : (podium.bronzeId || '')
                    }
                };
            });

            const filteredNotifications = (prev.notifications || []).filter((item) => item.athleteId !== normalizedId);
            const nextRankHistory = { ...(prev.rankHistory || {}) };
            delete nextRankHistory[normalizedId];

            return {
                ...prev,
                athletes: updatedAthletes,
                brackets: nextBrackets,
                rankHistory: ensureRankHistory(updatedAthletes, nextRankHistory),
                notifications: buildRankNotifications(
                    previousRanks,
                    nextRanks,
                    updatedAthletes,
                    filteredNotifications
                )
            };
        });

        addLog({
            type: 'WARN',
            action: 'REMOVE_ATHLETE',
            details: `Atleta removido: ${targetAthlete.nome} (${targetAthlete.academia || 'Sem academia'})`
        });
    };

    const updateAthletePoints = (id, historyItem) => {
        const sanitized = sanitizeHistoryItem(historyItem);
        if (!sanitized) {
            addLog({ type: 'ERROR', action: 'UPDATE_POINTS', details: `Registro inválido para o ID ${id}` });
            return;
        }

        setData(prev => {
            const previousRanks = buildRankMap(prev.athletes);
            const timestamp = new Date().toISOString();
            const updatedAthletes = prev.athletes.map(a => {
                if (a.id === id) {
                    const newHistory = [...a.historico, { ...sanitized, timestamp }];
                    const newPoints = calculateTotalPoints(newHistory);
                    return { ...a, historico: newHistory, pontos: newPoints };
                }
                return a;
            });
            const nextRanks = buildRankMap(updatedAthletes);

            return {
                ...prev,
                athletes: updatedAthletes,
                rankHistory: ensureRankHistory(updatedAthletes, prev.rankHistory || {}),
                notifications: buildRankNotifications(previousRanks, nextRanks, updatedAthletes, prev.notifications || [])
            };
        });
        addLog({ type: 'INFO', action: 'UPDATE_POINTS', details: `Pontuação alterada para ID ${id}` });
    };

    const setManualPoints = (id, points) => {
        const parsed = Number(points);
        if (!Number.isFinite(parsed) || parsed < 0) {
            addLog({ type: 'ERROR', action: 'SET_POINTS', details: `Valor inválido para o ID ${id}` });
            return false;
        }

        setData(prev => {
            const previousRanks = buildRankMap(prev.athletes);
            const updatedAthletes = prev.athletes.map(a => {
                if (a.id === id) {
                    const history = [{ type: 'seed', points: parsed }];
                    return { ...a, historico: history, pontos: parsed };
                }
                return a;
            });
            const nextRanks = buildRankMap(updatedAthletes);

            return {
                ...prev,
                athletes: updatedAthletes,
                rankHistory: ensureRankHistory(updatedAthletes, prev.rankHistory || {}),
                notifications: buildRankNotifications(previousRanks, nextRanks, updatedAthletes, prev.notifications || [])
            };
        });

        addLog({ type: 'INFO', action: 'SET_POINTS', details: `Pontos definidos manualmente para ID ${id}` });
        return true;
    };

    const resetAthletePoints = (id) => {
        setData(prev => {
            const previousRanks = buildRankMap(prev.athletes);
            const updatedAthletes = prev.athletes.map(a => {
                if (a.id === id) {
                    return { ...a, historico: [], pontos: 0 };
                }
                return a;
            });
            const nextRanks = buildRankMap(updatedAthletes);

            return {
                ...prev,
                athletes: updatedAthletes,
                rankHistory: ensureRankHistory(updatedAthletes, prev.rankHistory || {}),
                notifications: buildRankNotifications(previousRanks, nextRanks, updatedAthletes, prev.notifications || [])
            };
        });

        addLog({ type: 'INFO', action: 'RESET_POINTS', details: `Pontos limpos para ID ${id}` });
    };

    const generateBrackets = ({ eventId, mode = 'ALL', replaceExisting = false } = {}) => {
        if (!eventId) {
            addLog({ type: 'ERROR', action: 'GENERATE_BRACKETS', details: 'Evento não informado.' });
            throw new Error('Selecione um evento para gerar as chaves.');
        }

        const payload = buildBracketPayloads(
            data.athletes,
            eventId,
            mode,
            data.nextBracketNumber || 1
        );

        if (payload.brackets.length === 0) {
            return { created: 0 };
        }

        setData(prev => {
            const replaceMode = (bracket) => (
                bracket.eventId === eventId
                && (mode === 'ALL' || bracket.mode === mode)
            );
            const remaining = replaceExisting
                ? prev.brackets.filter((bracket) => !replaceMode(bracket))
                : prev.brackets;

            return {
                ...prev,
                brackets: [...remaining, ...payload.brackets],
                nextBracketNumber: payload.nextNumber
            };
        });

        addLog({
            type: 'INFO',
            action: 'GENERATE_BRACKETS',
            details: `Chaves geradas: ${payload.brackets.length} para evento ${eventId}.`
        });

        return { created: payload.brackets.length, brackets: payload.brackets };
    };

    const setBracketPodium = (bracketId, podium) => {
        setData(prev => ({
            ...prev,
            brackets: prev.brackets.map((bracket) => (
                bracket.id === bracketId
                    ? {
                        ...bracket,
                        podium: {
                            goldId: podium?.goldId ?? bracket.podium?.goldId ?? '',
                            silverId: podium?.silverId ?? bracket.podium?.silverId ?? '',
                            bronzeId: podium?.bronzeId ?? bracket.podium?.bronzeId ?? ''
                        }
                    }
                    : bracket
            ))
        }));
    };

    const applyBracketPodium = (bracketId) => {
        const bracket = data.brackets.find((item) => item.id === bracketId);
        if (!bracket) {
            addLog({ type: 'ERROR', action: 'APPLY_BRACKET', details: `Chave ${bracketId} não encontrada.` });
            return { ok: false, message: 'Chave não encontrada.' };
        }

        const participantIds = new Set(bracket.seedIds || []);
        if (participantIds.size === 0) {
            return { ok: false, message: 'Chave sem atletas cadastrados.' };
        }

        const podium = bracket.podium || {};
        const positions = {
            goldId: podium.goldId || '',
            silverId: podium.silverId || '',
            bronzeId: podium.bronzeId || ''
        };

        const required = participantIds.size >= 3
            ? ['goldId', 'silverId', 'bronzeId']
            : participantIds.size === 2
                ? ['goldId', 'silverId']
                : ['goldId'];

        const missing = required.filter((key) => !positions[key]);
        if (missing.length) {
            return { ok: false, message: 'Selecione o pódio completo para aplicar.' };
        }

        const chosen = Object.values(positions).filter(Boolean);
        const unique = new Set(chosen);
        if (unique.size !== chosen.length) {
            return { ok: false, message: 'Os atletas do pódio devem ser diferentes.' };
        }

        for (const id of chosen) {
            if (!participantIds.has(id)) {
                return { ok: false, message: 'Pódio precisa ser composto por atletas da chave.' };
            }
        }

        setData(prev => {
            const previousRanks = buildRankMap(prev.athletes);
            const timestamp = new Date().toISOString();
            const updatedAthletes = prev.athletes.map((athlete) => {
                if (!participantIds.has(athlete.id)) return athlete;
                const trimmedHistory = (athlete.historico || []).filter((item) => !(
                    item.type === 'podium'
                    && item.source === 'bracket'
                    && item.bracketId === bracketId
                ));
                const additions = [];
                if (athlete.id === positions.goldId) {
                    additions.push({ type: 'podium', position: 1, source: 'bracket', bracketId });
                }
                if (athlete.id === positions.silverId) {
                    additions.push({ type: 'podium', position: 2, source: 'bracket', bracketId });
                }
                if (athlete.id === positions.bronzeId) {
                    additions.push({ type: 'podium', position: 3, source: 'bracket', bracketId });
                }
                const nextHistory = additions.length
                    ? [...trimmedHistory, ...additions.map((item) => ({ ...item, timestamp }))]
                    : trimmedHistory;
                const pontos = calculateTotalPoints(nextHistory);
                return { ...athlete, historico: nextHistory, pontos };
            });
            const nextRanks = buildRankMap(updatedAthletes);
            const updatedBrackets = prev.brackets.map((item) => (
                item.id === bracketId
                    ? { ...item, appliedAt: timestamp }
                    : item
            ));

            return {
                ...prev,
                athletes: updatedAthletes,
                brackets: updatedBrackets,
                rankHistory: ensureRankHistory(updatedAthletes, prev.rankHistory || {}),
                notifications: buildRankNotifications(previousRanks, nextRanks, updatedAthletes, prev.notifications || [])
            };
        });

        addLog({
            type: 'INFO',
            action: 'APPLY_BRACKET',
            details: `Pódio aplicado para a chave ${bracket.number || bracketId}.`
        });

        return { ok: true };
    };

    const clearAthletes = () => {
        setData(prev => ({
            ...prev,
            athletes: [],
            notifications: [],
            rankHistory: {}
        }));
        addLog({ type: 'WARN', action: 'CLEAR_ATHLETES', details: 'Base de atletas limpa manualmente.' });
    };

    const importAthletes = (newList, options = {}) => {
        const fallbackEventId = options.eventId || data.activeEventId || '';
        const validAthletes = newList.filter((athlete) => normalizeTextTrimmed(athlete.nome));
        const invalidCount = newList.length - validAthletes.length;
        const existingKeys = new Set(data.athletes.map(buildAthleteKey));
        const prepared = [];
        let duplicateCount = 0;

        validAthletes.forEach((athlete) => {
            const baseAthlete = {
                ...athlete,
                academia: athlete.academia || 'Sem academia',
                eventId: resolveEventId(athlete) || fallbackEventId
            };
            const key = buildAthleteKey(baseAthlete);
            if (existingKeys.has(key)) {
                duplicateCount += 1;
                return;
            }
            existingKeys.add(key);
            prepared.push(normalizeAthlete({
                ...baseAthlete,
                id: athlete.id || Math.random().toString(36).substr(2, 9),
                pontos: athlete.pontos || 0,
                historico: athlete.historico || []
            }));
        });

        setData(prev => {
            const previousRanks = buildRankMap(prev.athletes);
            const nextAthletes = [...prev.athletes, ...prepared];
            const nextRanks = buildRankMap(nextAthletes);

            return {
                ...prev,
                athletes: nextAthletes,
                rankHistory: ensureRankHistory(nextAthletes, prev.rankHistory || {}),
                notifications: buildRankNotifications(previousRanks, nextRanks, nextAthletes, prev.notifications || [])
            };
        });

        addLog({
            type: 'IMPORT',
            action: 'BATCH',
            details: `Importação: ${prepared.length} ok, ${invalidCount} inválidos, ${duplicateCount} duplicados.`
        });

        return { imported: prepared.length, invalid: invalidCount, duplicate: duplicateCount };
    };

    const clearNotifications = () => {
        setData(prev => ({ ...prev, notifications: [] }));
    };

    const clearEventResults = () => setEventResults([]);

    return {
        athletes: data.athletes,
        events: data.events,
        news: data.news,
        academies: data.academies,
        memberProfiles: data.memberProfiles,
        activeEventId: data.activeEventId,
        logs: data.logs,
        notifications: data.notifications,
        rankHistory: data.rankHistory,
        brackets: data.brackets,
        currentUser: data.currentUser,
        eventResults,
        eventModalOpen: uiState.eventModalOpen,
        login,
        logout,
        openEventModal,
        closeEventModal,
        addNews,
        updateNews,
        deleteNews,
        addAcademy,
        deleteAcademy,
        addMemberProfile,
        deleteMemberProfile,
        addEvent,
        updateEvent,
        deleteEvent,
        setActiveEvent,
        assignAthletesToEvent,
        addAthlete,
        removeAthlete,
        updateAthletePoints,
        setManualPoints,
        resetAthletePoints,
        generateBrackets,
        setBracketPodium,
        applyBracketPodium,
        clearAthletes,
        importAthletes,
        addLog,
        clearNotifications,
        clearEventResults
    };
};

export const StoreProvider = ({ children }) => {
    const store = useStoreState();
    return React.createElement(StoreContext.Provider, { value: store }, children);
};

export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) {
        throw new Error('useStore must be used within StoreProvider');
    }
    return context;
};

