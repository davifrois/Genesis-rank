import React, { createContext, useContext, useEffect, useState } from 'react';
import { calculateTotalPoints, rankAthletes } from '../services/scoringService';

const STORAGE_KEY = 'genesis_ranking_data';
const MAX_HISTORY_ENTRIES = 12;
const MAX_NOTIFICATIONS = 20;
const StoreContext = createContext(null);

const initialData = {
    athletes: [
        { id: '1', nome: 'JOÃO MIGUEL SANTOS VIEIRA', faixa: 'Branca/Cinza', peso: 'Pena', categoria: 'Pré-Mirim', academia: 'GRACIE BARRA COIMBRA', pontos: 36, historico: [] },
        { id: '2', nome: 'Samir Daniel Silva Fraga', faixa: 'Branca/Cinza', peso: 'Pena', categoria: 'Pré-Mirim', academia: 'GRACIE BARRA COIMBRA', pontos: 12, historico: [] },
        { id: '3', nome: 'João Pedro da Rocha Barbosa', faixa: 'Branca/Cinza', peso: 'Médio', categoria: 'Pré-Mirim', academia: 'GRACIE BARRA COIMBRA', pontos: 36, historico: [] },
        { id: '4', nome: 'PEDRO BARROS MARTINO', faixa: 'Branca/Cinza', peso: 'Médio', categoria: 'Pré-Mirim', academia: 'GRACIE BARRA COIMBRA', pontos: 12, historico: [] },
        { id: '5', nome: 'EMANUELLY DA SILVA ANDRADE', faixa: 'Branca/Cinza', peso: 'Galo', categoria: 'Mirim A', academia: 'TRINDADE BRAZILIAN JJ', pontos: 36, historico: [] },
        { id: '6', nome: 'OLÍVIA MORAES SANTANA', faixa: 'Branca/Cinza', peso: 'Galo', categoria: 'Mirim A', academia: 'GRACIE BARRA COIMBRA', pontos: 12, historico: [] },
    ],
    events: [],
    activeEventId: null,
    logs: [],
    notifications: [],
    rankHistory: {},
    currentUser: null,
};

const sanitizeHistoryItem = (item) => {
    if (!item || typeof item.type !== 'string') return null;
    if (item.type === 'win') return { type: 'win' };
    if (item.type === 'seed' && Number.isFinite(item.points)) {
        return { type: 'seed', points: Number(item.points) };
    }
    if (item.type === 'podium' && [1, 2, 3].includes(item.position)) {
        return { type: 'podium', position: item.position };
    }
    return null;
};

const resolveIsNoGi = (athlete) => (
    athlete?.isNoGi === true
    || (typeof athlete?.modalidade === 'string' && athlete.modalidade.toUpperCase() === 'NO-GI')
);

const normalizeKeyPart = (value) => (
    (value || '').toString().trim().toLowerCase().replace(/\s+/g, ' ')
);

const resolveGender = (athlete) => athlete?.genero || athlete?.sexo || '';
const resolveEventId = (athlete) => athlete?.eventId || athlete?.eventoId || '';

const normalizeAthlete = (athlete) => {
    let history = Array.isArray(athlete.historico)
        ? athlete.historico.map(sanitizeHistoryItem).filter(Boolean)
        : [];
    const basePoints = Number(athlete.pontos || 0);
    if (history.length === 0 && basePoints > 0) {
        history = [{ type: 'seed', points: basePoints }];
    }
    const calculatedPoints = calculateTotalPoints(history);
    const pontos = history.length ? calculatedPoints : basePoints;
    const isNoGi = resolveIsNoGi(athlete);
    const eventId = resolveEventId(athlete);

    return {
        ...athlete,
        historico: history,
        pontos,
        isNoGi,
        eventId
    };
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

const useStoreState = () => {
    const [data, setData] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        let parsed = initialData;
        if (saved) {
            try {
                parsed = JSON.parse(saved);
            } catch (err) {
                parsed = initialData;
            }
        }
        const athletes = (parsed.athletes || initialData.athletes).map(normalizeAthlete);
        const events = Array.isArray(parsed.events) ? parsed.events : [];
        const eventIds = new Set(events.map((event) => event.id));
        const activeEventId = eventIds.has(parsed.activeEventId) ? parsed.activeEventId : null;
        const merged = {
            ...initialData,
            ...parsed,
            athletes,
            events,
            activeEventId,
            notifications: parsed.notifications || [],
            rankHistory: parsed.rankHistory || {}
        };

        return {
            ...merged,
            rankHistory: ensureRankHistory(athletes, merged.rankHistory)
        };
    });

    const [eventResults, setEventResults] = useState([]);
    const [uiState, setUiState] = useState({ eventModalOpen: false });

    useEffect(() => {
        const timeout = setTimeout(() => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }, 250);

        return () => clearTimeout(timeout);
    }, [data]);

    const addLog = (log) => {
        const newLog = { ...log, id: Date.now(), timestamp: new Date().toISOString() };
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
        addLog({ type: 'AUTH', action: 'LOGOUT', details: `Usuário ${data.currentUser?.name} saiu.` });
        setData(prev => ({ ...prev, currentUser: null }));
    };

    const openEventModal = () => {
        setUiState((prev) => ({ ...prev, eventModalOpen: true }));
    };

    const closeEventModal = () => {
        setUiState((prev) => ({ ...prev, eventModalOpen: false }));
    };

    const addEvent = (event) => {
        const name = (event?.name || '').toString().trim();
        if (!name) {
            addLog({ type: 'ERROR', action: 'ADD_EVENT', details: 'Nome do evento nao informado.' });
            throw new Error('Informe o nome do evento.');
        }
        const exists = data.events.find((item) => normalizeKeyPart(item.name) === normalizeKeyPart(name));
        if (exists) {
            addLog({ type: 'ERROR', action: 'ADD_EVENT', details: `Evento duplicado: ${name}` });
            throw new Error('Ja existe um evento com este nome.');
        }

        const newEvent = {
            id: Date.now().toString(),
            name,
            date: event?.date || '',
            location: event?.location || '',
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
            addLog({ type: 'ERROR', action: 'ASSIGN_EVENT', details: 'Evento invalido para vinculo.' });
            throw new Error('Evento invalido.');
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

    const updateAthletePoints = (id, historyItem) => {
        const sanitized = sanitizeHistoryItem(historyItem);
        if (!sanitized) {
            addLog({ type: 'ERROR', action: 'UPDATE_POINTS', details: `Registro invalido para ID ${id}` });
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
            addLog({ type: 'ERROR', action: 'SET_POINTS', details: `Valor invalido para ID ${id}` });
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
        const validAthletes = newList.filter((athlete) => athlete.nome);
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
            details: `Importação: ${prepared.length} ok, ${invalidCount} invalidos, ${duplicateCount} duplicados.`
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
        activeEventId: data.activeEventId,
        logs: data.logs,
        notifications: data.notifications,
        rankHistory: data.rankHistory,
        currentUser: data.currentUser,
        eventResults,
        eventModalOpen: uiState.eventModalOpen,
        login,
        logout,
        openEventModal,
        closeEventModal,
        addEvent,
        setActiveEvent,
        assignAthletesToEvent,
        addAthlete,
        updateAthletePoints,
        setManualPoints,
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
