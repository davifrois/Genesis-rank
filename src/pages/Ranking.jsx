import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search, Trophy, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { useI18n } from '../hooks/useI18n';
import { buildScoreBreakdown, rankAthletes } from '../services/scoringService';
import { buildCategoryDescriptor } from '../services/categoryService';
import { generateFilteredRankingPDF } from '../services/pdfService';
import { buildFileSafeName, downloadCsv } from '../services/exportService';
import { translateBelt, translateCompositeLabel, translateWeight } from '../utils/localeLabels';
import { countryCodeFromAthlete, countryLabelFromAthlete, flagFromCountryCode } from '../utils/countryFlags';

const DEFAULT_GROUP_LIMIT = 8;
const GROUP_PAGE_SIZE = 10;
const WINNERS_PAGE_SIZE = 40;
const TAB_OPTIONS = ['GI', 'NO-GI', 'ABS-GI', 'ABS-NO-GI', 'GERAL'];

const normalizeSearchTerm = (value) => {
    if (!value) return '';
    return value
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
};

const normalizeNameKey = (value) => (
    normalizeSearchTerm(value)
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
    const leftValue = normalizeSearchTerm(left);
    const rightValue = normalizeSearchTerm(right);
    if (!leftValue || !rightValue) return false;
    if (leftValue === rightValue) return true;
    return leftValue.includes(rightValue) || rightValue.includes(leftValue);
};

const resolveTab = (value) => (TAB_OPTIONS.includes(value) ? value : 'GI');

const normalizeQueryParam = (value) => (value ? value.toString().trim() : '');

const photoUrlFromAthlete = (athlete) => (
    athlete?.photoUrl
    || athlete?.fotoUrl
    || athlete?.avatarUrl
    || athlete?.foto
    || ''
);

const buildTeamRanking = (athletes) => {
    const teams = new Map();

    (Array.isArray(athletes) ? athletes : []).forEach((athlete) => {
        const academy = (athlete?.academia || 'Sem academia').toString().trim() || 'Sem academia';
        const key = normalizeSearchTerm(academy);
        const current = teams.get(key) || {
            key,
            academy,
            points: 0,
            wins: 0,
            podiums: 0,
            athletes: 0
        };

        const history = Array.isArray(athlete?.historico) ? athlete.historico : [];
        const breakdown = buildScoreBreakdown(history);
        current.points += Number(athlete?.pontos) || 0;
        current.wins += Number(breakdown?.wins || 0);
        current.podiums += Number(breakdown?.podium1 || 0) + Number(breakdown?.podium2 || 0) + Number(breakdown?.podium3 || 0);
        current.athletes += 1;

        teams.set(key, current);
    });

    return [...teams.values()]
        .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.wins !== a.wins) return b.wins - a.wins;
            if (b.podiums !== a.podiums) return b.podiums - a.podiums;
            if (b.athletes !== a.athletes) return b.athletes - a.athletes;
            return a.academy.localeCompare(b.academy);
        })
        .map((team, index) => ({ ...team, rank: index + 1 }));
};

const Ranking = () => {
    const { athletes, events, activeEventId, memberProfiles, currentUser } = useStore();
    const { uiLanguage } = useI18n();
    const isEnglish = uiLanguage === 'en-US';
    const isSpanish = uiLanguage === 'es-ES';
    const isFrench = uiLanguage === 'fr-FR';
    const isAdmin = currentUser?.role === 'admin';
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(() => resolveTab(searchParams.get('tab')));
    const [selectedEventId, setSelectedEventId] = useState(() => (
        searchParams.get('event') || activeEventId || 'all'
    ));
    const [searchTerm, setSearchTerm] = useState(() => normalizeQueryParam(searchParams.get('q')));
    const deferredSearch = useDeferredValue(searchTerm);
    const [compactView, setCompactView] = useState(() => searchParams.get('compact') !== '0');
    const [competitionMode, setCompetitionMode] = useState(() => searchParams.get('comp') === '1');
    const [showFullList, setShowFullList] = useState(() => searchParams.get('list') === '1');
    const [expandedGroups, setExpandedGroups] = useState(() => new Set());
    const [groupLimit, setGroupLimit] = useState(GROUP_PAGE_SIZE);
    const [winnersLimit, setWinnersLimit] = useState(WINNERS_PAGE_SIZE);
    const copy = isEnglish
        ? {
            tabs: {
                GI: 'GI Weight Category',
                'NO-GI': 'NO-GI Weight Category',
                'ABS-GI': 'GI Absolute',
                'ABS-NO-GI': 'NO-GI Absolute',
                GERAL: 'OVERALL'
            },
            noDate: 'Date TBD',
            rankingTitle: 'Official ranking',
            rankingDescription: 'Track event standings in real time with clear categories, visible points and fast filtering.',
            correction: 'Request correction',
            allEvents: 'All events',
            noEvent: 'No event',
            noTournament: 'No tournament registered yet.',
            eventRanking: 'Event ranking',
            eventFallback: 'Event',
            exportPdf: 'Export PDF',
            exportCsv: 'Export CSV',
            eventLabel: 'Event',
            selectEventAria: 'Select event',
            searchPlaceholder: 'Search athlete, academy or category',
            searchAria: 'Search athlete',
            clearSearch: 'Clear search',
            competitionMode: 'Competition mode',
            showAll: 'Show all',
            compactMode: 'Compact mode',
            athletes: 'Athletes',
            categories: 'Categories',
            results: 'Results',
            overallRanking: 'Overall ranking',
            updatedNow: 'Updated now',
            points: 'Points',
            wins: 'Wins',
            podiums: 'Podiums',
            victories: 'Victories',
            beltFallback: 'Belt',
            weightFallback: 'Weight',
            hiddenAthletes: 'hidden athletes',
            seeAll: 'See all',
            collapse: 'Collapse',
            showMoreResults: 'Show more results',
            showMoreCategories: 'Show more categories',
            showFullList: 'Show full list',
            hideFullList: 'Hide full list',
            noAthleteInEvent: 'No athlete linked to this event.',
            noAthleteInCategory: 'No athlete found in this category.',
            noWinner: 'No winner found.',
            podiumHighlight: 'Podium highlight',
            placeFirst: '1st',
            placeSecond: '2nd',
            placeThird: '3rd',
            flagLabel: 'Flag',
            boardsSectionTitle: 'Ranking boards',
            boardsSectionSubtitle: 'Top athletes by category/belt and top teams in one visual block.',
            boardsAthleteTitle: 'Athletes by category and belt',
            boardsTeamsTitle: 'Teams',
            boardsTeamsOverallTitle: 'Teams - Overall ranking',
            boardsTopLabel: 'Top 3',
            boardsNoData: 'No data available in this board.',
            boardsAthletesSuffix: 'athletes'
        }
        : isSpanish
            ? {
                tabs: {
                    GI: 'Categoria de peso GI (con kimono)',
                    'NO-GI': 'Categoria de peso NO-GI (sin kimono)',
                    'ABS-GI': 'Absoluto GI (con kimono)',
                    'ABS-NO-GI': 'Absoluto NO-GI (sin kimono)',
                    GERAL: 'GENERAL'
                },
                noDate: 'Fecha por confirmar',
                rankingTitle: 'Ranking oficial',
                rankingDescription: 'Sigue los resultados por evento en tiempo real, con categorias claras, puntos visibles y filtros rapidos.',
                correction: 'Solicitar correccion',
                allEvents: 'Todos los eventos',
                noEvent: 'Sin evento',
                noTournament: 'Aun no hay campeonatos registrados.',
                eventRanking: 'Ranking del evento',
                eventFallback: 'Evento',
                exportPdf: 'Exportar PDF',
                exportCsv: 'Exportar CSV',
                eventLabel: 'Evento',
                selectEventAria: 'Seleccionar evento',
                searchPlaceholder: 'Buscar atleta, academia o categoria',
                searchAria: 'Buscar atleta',
                clearSearch: 'Limpiar busqueda',
                competitionMode: 'Modo competicion',
                showAll: 'Mostrar todo',
                compactMode: 'Modo compacto',
                athletes: 'Atletas',
                categories: 'Categorias',
                results: 'Resultados',
                overallRanking: 'Ranking general',
                updatedNow: 'Actualizado ahora',
                points: 'Puntos',
                wins: 'Victorias',
                podiums: 'Podios',
                victories: 'Victorias',
                beltFallback: 'Cinturon',
                weightFallback: 'Peso',
                hiddenAthletes: 'atletas ocultos',
                seeAll: 'Ver todo',
                collapse: 'Ocultar',
                showMoreResults: 'Mostrar mas resultados',
                showMoreCategories: 'Mostrar mas categorias',
                showFullList: 'Mostrar lista completa',
                hideFullList: 'Ocultar lista completa',
                noAthleteInEvent: 'No hay atletas vinculados a este evento.',
                noAthleteInCategory: 'No se encontraron atletas en esta categoria.',
                noWinner: 'No se encontro ganador.',
                podiumHighlight: 'Podio destacado',
                placeFirst: '1ro',
                placeSecond: '2do',
                placeThird: '3ro',
                flagLabel: 'Bandera',
                boardsSectionTitle: 'Paneles de ranking',
                boardsSectionSubtitle: 'Top de atletas por categoria/cinturon y top de equipos en un solo bloque.',
                boardsAthleteTitle: 'Atletas por categoria y cinturon',
                boardsTeamsTitle: 'Equipos',
                boardsTeamsOverallTitle: 'Equipos - Clasificacion general',
                boardsTopLabel: 'Top 3',
                boardsNoData: 'No hay datos en este panel.',
                boardsAthletesSuffix: 'atletas'
            }
            : isFrench
                ? {
                    tabs: {
                        GI: 'Categorie de poids GI (avec kimono)',
                        'NO-GI': 'Categorie de poids NO-GI (sans kimono)',
                        'ABS-GI': 'Absolu GI (avec kimono)',
                        'ABS-NO-GI': 'Absolu NO-GI (sans kimono)',
                        GERAL: 'GENERAL'
                    },
                    noDate: 'Date a confirmer',
                    rankingTitle: 'Classement officiel',
                    rankingDescription: 'Suivez les resultats par evenement en temps reel, avec des categories claires, des points visibles et des filtres rapides.',
                    correction: 'Demander une correction',
                    allEvents: 'Tous les evenements',
                    noEvent: 'Sans evenement',
                    noTournament: 'Aucun championnat enregistre pour le moment.',
                    eventRanking: "Classement de l'evenement",
                    eventFallback: 'Evenement',
                    exportPdf: 'Exporter PDF',
                    exportCsv: 'Exporter CSV',
                    eventLabel: 'Evenement',
                    selectEventAria: "Selectionner l'evenement",
                    searchPlaceholder: 'Rechercher athlete, academie ou categorie',
                    searchAria: 'Rechercher athlete',
                    clearSearch: 'Effacer la recherche',
                    competitionMode: 'Mode competition',
                    showAll: 'Tout afficher',
                    compactMode: 'Mode compact',
                    athletes: 'Athletes',
                    categories: 'Categories',
                    results: 'Resultats',
                    overallRanking: 'Classement general',
                    updatedNow: 'Mis a jour maintenant',
                    points: 'Points',
                    wins: 'Victoires',
                    podiums: 'Podiums',
                    victories: 'Victoires',
                    beltFallback: 'Ceinture',
                    weightFallback: 'Poids',
                    hiddenAthletes: 'athletes masques',
                    seeAll: 'Voir tout',
                    collapse: 'Reduire',
                    showMoreResults: 'Afficher plus de resultats',
                    showMoreCategories: 'Afficher plus de categories',
                    showFullList: 'Afficher la liste complete',
                    hideFullList: 'Masquer la liste complete',
                    noAthleteInEvent: "Aucun athlete lie a cet evenement.",
                    noAthleteInCategory: 'Aucun athlete trouve dans cette categorie.',
                    noWinner: 'Aucun gagnant trouve.',
                    podiumHighlight: 'Podium en vedette',
                    placeFirst: '1er',
                    placeSecond: '2e',
                    placeThird: '3e',
                    flagLabel: 'Drapeau',
                    boardsSectionTitle: 'Panneaux de classement',
                    boardsSectionSubtitle: 'Top athletes par categorie/ceinture et top equipes dans un seul bloc.',
                    boardsAthleteTitle: 'Athletes par categorie et ceinture',
                    boardsTeamsTitle: 'Equipes',
                    boardsTeamsOverallTitle: 'Equipes - Classement general',
                    boardsTopLabel: 'Top 3',
                    boardsNoData: 'Aucune donnee dans ce panneau.',
                    boardsAthletesSuffix: 'athletes'
                }
                : {
                    tabs: {
                        GI: 'Categoria de Peso GI (COM Pano)',
                        'NO-GI': 'Categoria de Peso NO-GI (SEM Pano)',
                        'ABS-GI': 'Absoluto GI (COM Pano)',
                        'ABS-NO-GI': 'Absoluto NO-GI (SEM Pano)',
                        GERAL: 'GERAL'
                    },
                    noDate: 'Data a confirmar',
                    rankingTitle: 'Ranking oficial',
                    rankingDescription: 'Acompanhe os resultados por evento em tempo real, com categorias claras, pontuacao visivel e filtros rapidos.',
                    correction: 'Solicitar correcao',
                    allEvents: 'Todos os eventos',
                    noEvent: 'Sem evento',
                    noTournament: 'Nenhum campeonato cadastrado ainda.',
                    eventRanking: 'Ranking do evento',
                    eventFallback: 'Evento',
                    exportPdf: 'Exportar PDF',
                    exportCsv: 'Exportar CSV',
                    eventLabel: 'Evento',
                    selectEventAria: 'Selecionar evento',
                    searchPlaceholder: 'Buscar atleta, academia ou categoria',
                    searchAria: 'Buscar atleta',
                    clearSearch: 'Limpar busca',
                    competitionMode: 'Modo competicao',
                    showAll: 'Mostrar tudo',
                    compactMode: 'Modo compacto',
                    athletes: 'Atletas',
                    categories: 'Categorias',
                    results: 'Resultados',
                    overallRanking: 'Ranking geral',
                    updatedNow: 'Atualizado agora',
                    points: 'Pontos',
                    wins: 'Vitorias',
                    podiums: 'Podios',
                    victories: 'Vitorias',
                    beltFallback: 'Faixa',
                    weightFallback: 'Peso',
                    hiddenAthletes: 'atletas ocultos',
                    seeAll: 'Ver todos',
                    collapse: 'Recolher',
                    showMoreResults: 'Mostrar mais resultados',
                    showMoreCategories: 'Mostrar mais categorias',
                    showFullList: 'Mostrar lista completa',
                    hideFullList: 'Ocultar lista completa',
                    noAthleteInEvent: 'Nenhum atleta vinculado a este evento.',
                    noAthleteInCategory: 'Nenhum atleta encontrado nesta categoria.',
                    noWinner: 'Nenhum vencedor encontrado.',
                    podiumHighlight: 'Podio em destaque',
                    placeFirst: '1o',
                    placeSecond: '2o',
                    placeThird: '3o',
                    flagLabel: 'Bandeira',
                    boardsSectionTitle: 'Quadros de ranking',
                    boardsSectionSubtitle: 'Top atletas por categoria/faixa e top equipes em um bloco visual unico.',
                    boardsAthleteTitle: 'Atletas por categoria e faixa',
                    boardsTeamsTitle: 'Equipes',
                    boardsTeamsOverallTitle: 'Equipes - Classificacao Geral',
                    boardsTopLabel: 'Top 3',
                    boardsNoData: 'Sem dados para este quadro.',
                    boardsAthletesSuffix: 'atletas'
                };

    const isEventMode = selectedEventId !== 'all' && selectedEventId !== 'none';

    useEffect(() => {
        const hasSelectedEvent = events.some((event) => event.id === selectedEventId);
        if (selectedEventId !== 'all' && selectedEventId !== 'none' && !hasSelectedEvent) {
            setSelectedEventId(activeEventId || 'all');
        }
    }, [activeEventId, events, selectedEventId]);

    const searchParamsKey = searchParams.toString();

    useEffect(() => {
        const paramTab = resolveTab(searchParams.get('tab'));
        const paramEvent = searchParams.get('event');
        const paramQuery = normalizeQueryParam(searchParams.get('q'));
        const paramCompact = searchParams.get('compact');
        const paramCompetition = searchParams.get('comp');
        const paramList = searchParams.get('list');

        if (paramTab && paramTab !== activeTab) {
            setActiveTab(paramTab);
        }
        if (paramEvent && paramEvent !== selectedEventId) {
            setSelectedEventId(paramEvent);
        }
        if (paramQuery !== searchTerm) {
            setSearchTerm(paramQuery);
        }
        if (paramCompact !== null) {
            const nextCompact = paramCompact !== '0';
            if (nextCompact !== compactView) {
                setCompactView(nextCompact);
            }
        }
        if (paramCompetition !== null) {
            const nextCompetitionMode = paramCompetition === '1';
            if (nextCompetitionMode !== competitionMode) {
                setCompetitionMode(nextCompetitionMode);
            }
        }
        const nextShowFullList = paramList === '1';
        if (nextShowFullList !== showFullList) {
            setShowFullList(nextShowFullList);
        }
    }, [searchParamsKey]);

    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        let changed = false;

        if (params.get('tab') !== activeTab) {
            params.set('tab', activeTab);
            changed = true;
        }

        if (selectedEventId && selectedEventId !== 'all') {
            if (params.get('event') !== selectedEventId) {
                params.set('event', selectedEventId);
                changed = true;
            }
        } else if (params.has('event')) {
            params.delete('event');
            changed = true;
        }

        const trimmedQuery = searchTerm.trim();
        if (trimmedQuery) {
            if (params.get('q') !== trimmedQuery) {
                params.set('q', trimmedQuery);
                changed = true;
            }
        } else if (params.has('q')) {
            params.delete('q');
            changed = true;
        }

        if (!compactView) {
            if (params.get('compact') !== '0') {
                params.set('compact', '0');
                changed = true;
            }
        } else if (params.has('compact')) {
            params.delete('compact');
            changed = true;
        }

        if (competitionMode) {
            if (params.get('comp') !== '1') {
                params.set('comp', '1');
                changed = true;
            }
        } else if (params.has('comp')) {
            params.delete('comp');
            changed = true;
        }

        if (showFullList) {
            if (params.get('list') !== '1') {
                params.set('list', '1');
                changed = true;
            }
        } else if (params.has('list')) {
            params.delete('list');
            changed = true;
        }

        if (changed) {
            setSearchParams(params, { replace: true });
        }
    }, [activeTab, selectedEventId, searchTerm, compactView, competitionMode, showFullList, searchParams, setSearchParams]);

    const selectedEvent = useMemo(() => (
        events.find((event) => event.id === selectedEventId)
    ), [events, selectedEventId]);

    const memberPhotoData = useMemo(() => {
        const profiles = [...memberProfiles]
            .filter((profile) => profile?.photoUrl && profile?.fullName)
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        const exactMap = new Map();
        profiles.forEach((profile) => {
            const academy = profile.academyName || '';
            const key = normalizeSearchTerm(`${profile.fullName}|${academy}`);
            if (key && !exactMap.has(key)) {
                exactMap.set(key, profile.photoUrl);
            }
        });
        return { profiles, exactMap };
    }, [memberProfiles]);

    const resolvePhotoUrl = (athlete) => {
        const fromAthlete = photoUrlFromAthlete(athlete);
        if (fromAthlete) return fromAthlete;

        const exactKey = normalizeSearchTerm(`${athlete?.nome || ''}|${athlete?.academia || ''}`);
        const exactProfilePhoto = memberPhotoData.exactMap.get(exactKey);
        if (exactProfilePhoto) return exactProfilePhoto;

        const fuzzyProfile = memberPhotoData.profiles.find((profile) => (
            namesLikelySame(athlete?.nome, profile.fullName)
            && academyLikelySame(athlete?.academia || '', profile.academyName || '')
        ));
        if (fuzzyProfile?.photoUrl) return fuzzyProfile.photoUrl;

        const byName = memberPhotoData.profiles.filter((profile) => (
            namesLikelySame(athlete?.nome, profile.fullName)
        ));
        if (byName.length === 1) return byName[0].photoUrl || '';

        return '';
    };

    const tabs = useMemo(() => ([
        { id: 'GI', label: copy.tabs.GI },
        { id: 'NO-GI', label: copy.tabs['NO-GI'] },
        { id: 'ABS-GI', label: copy.tabs['ABS-GI'] },
        { id: 'ABS-NO-GI', label: copy.tabs['ABS-NO-GI'] },
        { id: 'GERAL', label: copy.tabs.GERAL }
    ]), [copy.tabs]);

    const eventFilteredAthletes = useMemo(() => {
        return athletes.filter((athlete) => {
            if (selectedEventId === 'none') return !athlete.eventId;
            if (selectedEventId === 'all') return true;
            return athlete.eventId === selectedEventId;
        });
    }, [athletes, selectedEventId]);

    const filteredAthletes = useMemo(() => {
        return eventFilteredAthletes.filter((athlete) => {
            if (activeTab === 'GI') return !athlete.isNoGi && !athlete.isAbsolute;
            if (activeTab === 'NO-GI') return athlete.isNoGi && !athlete.isAbsolute;
            if (activeTab === 'ABS-GI') return !athlete.isNoGi && athlete.isAbsolute;
            if (activeTab === 'ABS-NO-GI') return athlete.isNoGi && athlete.isAbsolute;
            return true;
        });
    }, [activeTab, eventFilteredAthletes]);

    const normalizedSearch = useMemo(() => normalizeSearchTerm(deferredSearch), [deferredSearch]);

    const athleteMetrics = useMemo(() => {
        const map = new Map();
        filteredAthletes.forEach((athlete) => {
            const history = Array.isArray(athlete.historico) ? athlete.historico : [];
            const breakdown = buildScoreBreakdown(history);
            map.set(athlete.id, {
                wins: breakdown.wins,
                podium1: breakdown.podium1,
                podium2: breakdown.podium2,
                podium3: breakdown.podium3,
                podiumTotal: breakdown.podium1 + breakdown.podium2 + breakdown.podium3
            });
        });
        return map;
    }, [filteredAthletes]);

    const athleteSearchIndex = useMemo(() => {
        const map = new Map();
        filteredAthletes.forEach((athlete) => {
            const parts = [
                athlete.nome,
                athlete.academia,
                athlete.faixa,
                athlete.peso,
                athlete.categoria,
                athlete.genero
            ].filter(Boolean);
            map.set(athlete.id, normalizeSearchTerm(parts.join(' ')));
        });
        return map;
    }, [filteredAthletes]);

    useEffect(() => {
        setExpandedGroups(new Set());
        setGroupLimit(isEventMode ? 999 : GROUP_PAGE_SIZE);
        setWinnersLimit(WINNERS_PAGE_SIZE);
    }, [activeTab, selectedEventId, normalizedSearch, isEventMode]);

    const baseGroups = useMemo(() => {
        const groups = new Map();
        filteredAthletes.forEach((athlete) => {
            const { key, label } = buildCategoryDescriptor(athlete);
            if (!groups.has(key)) groups.set(key, { key, label, entries: [] });
            groups.get(key).entries.push(athlete);
        });

        const grouped = [...groups.values()]
            .map((group) => ({
                key: group.key,
                label: group.label,
                entries: rankAthletes(group.entries)
            }))
            .sort((a, b) => a.label.localeCompare(b.label));

        return grouped;
    }, [filteredAthletes]);

    const { groupedAthletes, overallWinners } = useMemo(() => {
        if (activeTab !== 'GERAL' || isEventMode) {
            return { groupedAthletes: baseGroups, overallWinners: [] };
        }

        const winners = baseGroups
            .filter((group) => group.entries.length > 0)
            .map((group) => ({
                label: group.label,
                athlete: group.entries[0]
            }));
        const sorted = rankAthletes(winners.map((item) => item.athlete));
        const winnersById = new Map(winners.map((item) => [item.athlete.id, item]));

        return {
            groupedAthletes: baseGroups,
            overallWinners: sorted.map((athlete) => winnersById.get(athlete.id)).filter(Boolean)
        };
    }, [activeTab, baseGroups, isEventMode]);

    const searchedGroups = useMemo(() => {
        if (!normalizedSearch) return groupedAthletes;
        return groupedAthletes
            .map((group) => {
                const labelMatch = normalizeSearchTerm(group.label).includes(normalizedSearch);
                if (labelMatch) return group;
                const entries = group.entries.filter((athlete) => (
                    (athleteSearchIndex.get(athlete.id) || '').includes(normalizedSearch)
                ));
                return { ...group, entries };
            })
            .filter((group) => group.entries.length > 0);
    }, [groupedAthletes, normalizedSearch, athleteSearchIndex]);

    const filteredWinners = useMemo(() => {
        if (!normalizedSearch) return overallWinners;
        return overallWinners.filter((item) => (
            (athleteSearchIndex.get(item.athlete.id) || '').includes(normalizedSearch)
        ));
    }, [overallWinners, normalizedSearch, athleteSearchIndex]);

    const visibleGroups = useMemo(() => {
        const allowCompact = compactView && !normalizedSearch && !isEventMode;
        return searchedGroups.map((group) => {
            const totalCount = group.entries.length;
            const isExpanded = !allowCompact || expandedGroups.has(group.key);
            const entries = isExpanded
                ? group.entries
                : group.entries.slice(0, DEFAULT_GROUP_LIMIT);
            return {
                ...group,
                totalCount,
                entries,
                hiddenCount: totalCount - entries.length
            };
        });
    }, [searchedGroups, compactView, expandedGroups, normalizedSearch, isEventMode]);

    const totalAthletes = filteredAthletes.length;
    const totalGroups = groupedAthletes.length;
    const visibleAthletes = useMemo(() => (
        searchedGroups.reduce((sum, group) => sum + group.entries.length, 0)
    ), [searchedGroups]);

    const pagedGroups = useMemo(() => (
        visibleGroups.slice(0, groupLimit)
    ), [visibleGroups, groupLimit]);

    const pagedWinners = useMemo(() => (
        filteredWinners.slice(0, winnersLimit)
    ), [filteredWinners, winnersLimit]);

    const eventLabel = selectedEvent?.name || (selectedEventId === 'none' ? copy.noEvent : copy.allEvents);
    const modeLabel = tabs.find((tab) => tab.id === activeTab)?.label || activeTab;
    const hasSearch = searchTerm.trim().length > 0;
    const showGeneralWinners = activeTab === 'GERAL' && !isEventMode;
    const podiumOverallEntries = useMemo(() => (
        filteredWinners.slice(0, 3)
    ), [filteredWinners]);

    const podiumPlaceLabel = (index) => {
        if (index === 0) return copy.placeFirst;
        if (index === 1) return copy.placeSecond;
        return copy.placeThird;
    };

    const buildModeTag = (athlete) => {
        if (!athlete) return '';
        if (athlete.isAbsolute) {
            return athlete.isNoGi ? 'ABS NO-GI' : 'ABS GI';
        }
        return athlete.isNoGi ? 'NO-GI' : 'GI';
    };

    const translateGroupLabel = (label) => translateCompositeLabel(label, uiLanguage);
    const translateAthleteBelt = (belt) => translateBelt(belt || copy.beltFallback, uiLanguage);
    const translateAthleteWeight = (weight) => translateWeight(weight || copy.weightFallback, uiLanguage);
    const boardFallbackTitles = useMemo(() => ([
        copy.tabs.GI,
        copy.tabs['NO-GI'],
        copy.tabs['ABS-GI'],
        copy.tabs['ABS-NO-GI']
    ]), [copy.tabs]);

    const isGeneralCategoryBoards = activeTab === 'GERAL';
    const boardAthleteTopLimit = isGeneralCategoryBoards ? 5 : 3;
    const boardAthleteTopLabel = `Top ${boardAthleteTopLimit}`;

    const boardAthletePanels = useMemo(() => {
        const sorted = [...searchedGroups].sort((a, b) => {
            if (isGeneralCategoryBoards) {
                return a.label.localeCompare(b.label);
            }
            if (b.entries.length !== a.entries.length) return b.entries.length - a.entries.length;
            return a.label.localeCompare(b.label);
        });
        const panelLimit = isGeneralCategoryBoards ? sorted.length : 4;
        const panels = sorted.slice(0, panelLimit).map((group) => ({
            key: `ath-${group.key || group.label}`,
            title: translateGroupLabel(group.label),
            subtitle: `${group.entries.length} ${copy.boardsAthletesSuffix}`,
            entries: group.entries.slice(0, boardAthleteTopLimit)
        }));

        if (!isGeneralCategoryBoards) {
            const usedTitles = new Set(panels.map((panel) => normalizeSearchTerm(panel.title)));
            boardFallbackTitles.forEach((title, index) => {
                if (panels.length >= 4) return;
                const normalizedTitle = normalizeSearchTerm(title);
                if (usedTitles.has(normalizedTitle)) return;
                panels.push({
                    key: `ath-fallback-${index}`,
                    title,
                    subtitle: `0 ${copy.boardsAthletesSuffix}`,
                    entries: []
                });
                usedTitles.add(normalizedTitle);
            });
        }

        return panels;
    }, [
        searchedGroups,
        copy.boardsAthletesSuffix,
        boardFallbackTitles,
        translateGroupLabel,
        boardAthleteTopLimit,
        isGeneralCategoryBoards
    ]);

    const boardTeamTopLimit = isGeneralCategoryBoards ? 5 : 3;
    const boardTeamTopLabel = `Top ${boardTeamTopLimit}`;

    const boardTeamPanels = useMemo(() => {
        const baseAthletes = [...eventFilteredAthletes];
        const filteredBySearch = normalizedSearch
            ? baseAthletes.filter((athlete) => (
                normalizeSearchTerm([
                    athlete?.nome,
                    athlete?.academia,
                    athlete?.faixa,
                    athlete?.peso,
                    athlete?.categoria,
                    athlete?.genero
                ].filter(Boolean).join(' ')).includes(normalizedSearch)
            ))
            : baseAthletes;
        const overallTeams = buildTeamRanking(filteredBySearch).slice(0, boardTeamTopLimit);

        return [
            { key: 'team-overall', title: copy.boardsTeamsOverallTitle || `${copy.boardsTeamsTitle} (GI + NO-GI)`, entries: overallTeams }
        ];
    }, [eventFilteredAthletes, normalizedSearch, copy.boardsTeamsTitle, copy.boardsTeamsOverallTitle, boardTeamTopLimit]);

    const hasBoardData = boardAthletePanels.length > 0 || boardTeamPanels.length > 0;

    const handleExportCsv = () => {
        if (activeTab === 'GERAL' && !isEventMode) {
            const headers = isEnglish
                ? ['POS', 'ATHLETE', 'CATEGORY', 'ACADEMY', 'MODE', 'PTS']
                : isSpanish
                    ? ['POS', 'ATLETA', 'CATEGORIA', 'ACADEMIA', 'MODALIDAD', 'PTS']
                    : isFrench
                        ? ['POS', 'ATHLETE', 'CATEGORIE', 'ACADEMIE', 'MODE', 'PTS']
                        : ['POS', 'ATLETA', 'CATEGORIA', 'ACADEMIA', 'MODALIDADE', 'PTS'];
            const rows = filteredWinners.map((item, index) => ([
                index + 1,
                item.athlete?.nome || '',
                translateGroupLabel(item.label || ''),
                item.athlete?.academia || '',
                buildModeTag(item.athlete),
                item.athlete?.pontos ?? ''
            ]));
            const fileName = `ranking_geral_${buildFileSafeName(eventLabel)}`;
            downloadCsv(fileName, headers, rows);
            return;
        }

        const headers = isEnglish
            ? ['CATEGORY', 'POS', 'ATHLETE', 'ACADEMY', 'BELT', 'WEIGHT', 'MODE', 'PTS']
            : isSpanish
                ? ['CATEGORIA', 'POS', 'ATLETA', 'ACADEMIA', 'CINTURON', 'PESO', 'MODALIDAD', 'PTS']
                : isFrench
                    ? ['CATEGORIE', 'POS', 'ATHLETE', 'ACADEMIE', 'CEINTURE', 'POIDS', 'MODE', 'PTS']
                    : ['CATEGORIA', 'POS', 'ATLETA', 'ACADEMIA', 'FAIXA', 'PESO', 'MODALIDADE', 'PTS'];
        const rows = searchedGroups.flatMap((group) => (
            group.entries.map((athlete, index) => ([
                translateGroupLabel(group.label),
                index + 1,
                athlete.nome,
                athlete.academia,
                translateAthleteBelt(athlete.faixa),
                translateAthleteWeight(athlete.peso),
                buildModeTag(athlete),
                athlete.pontos
            ]))
        ));
        const fileName = `ranking_${buildFileSafeName(activeTab)}_${buildFileSafeName(eventLabel)}`;
        downloadCsv(fileName, headers, rows);
    };

    const handleExportPdf = async () => {
        try {
            await generateFilteredRankingPDF({
                groups: searchedGroups,
                winners: filteredWinners,
                options: {
                    eventName: selectedEvent?.name || '',
                    eventDate: selectedEvent?.date || '',
                    eventLocation: selectedEvent?.location || '',
                    modeLabel: modeLabel,
                    searchTerm: normalizedSearch ? searchTerm.trim() : ''
                }
            });
        } catch (error) {
            console.error('PDF export failed:', error);
        }
    };

    const toggleGroup = (key) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    return (
        <div className={`ranking-minimal ranking-ajp ranking-clean ranking-reference-v2 ${isEventMode ? 'ranking-event-mode' : ''}`}>
            <div className="rank-page-head">
                <div>
                    <span className="rank-page-head__kicker">{copy.overallRanking}</span>
                    <h1>{copy.rankingTitle}</h1>
                    <p>{copy.rankingDescription}</p>
                </div>
            </div>

            <div className="rank-event-picker rank-v2-event-picker">
                <label htmlFor="ranking-event-select">{copy.eventLabel}</label>
                <div className="rank-event-picker__control">
                    <span className="rank-event-picker__icon" aria-hidden="true">
                        <Trophy size={14} />
                    </span>
                    <select
                        id="ranking-event-select"
                        className="input select-compact"
                        value={selectedEventId}
                        onChange={(event) => setSelectedEventId(event.target.value)}
                        aria-label={copy.selectEventAria}
                    >
                        <option value="all">{copy.allEvents}</option>
                        <option value="none">{copy.noEvent}</option>
                        {events.map((eventItem) => (
                            <option key={eventItem.id} value={eventItem.id}>{eventItem.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="rank-toolbar rank-v2-toolbar">
                <div className="rank-search rank-search--inline">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder={copy.searchPlaceholder}
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        aria-label={copy.searchAria}
                    />
                    {hasSearch && (
                        <button
                            type="button"
                            className="rank-search-clear"
                            onClick={() => setSearchTerm('')}
                            aria-label={copy.clearSearch}
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
                <div className="rank-toolbar__actions">
                    <button
                        type="button"
                        className={`btn btn-secondary ${competitionMode ? 'is-active' : ''}`}
                        onClick={() => setCompetitionMode((prev) => !prev)}
                    >
                        {copy.competitionMode}
                    </button>
                    {!isEventMode && (
                        <button
                            type="button"
                            className={`btn btn-secondary ${compactView ? '' : 'is-active'}`}
                            onClick={() => setCompactView((prev) => !prev)}
                        >
                            {compactView ? copy.showAll : copy.compactMode}
                        </button>
                    )}
                    {isAdmin && (
                        <>
                            <button type="button" className="btn btn-ghost" onClick={handleExportCsv}>
                                {copy.exportCsv}
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={handleExportPdf}>
                                {copy.exportPdf}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="rank-stats-bar rank-v2-stats">
                <div className="rank-stat">
                    <span>{copy.athletes}</span>
                    <strong>{totalAthletes}</strong>
                </div>
                <div className="rank-stat">
                    <span>{copy.categories}</span>
                    <strong>{totalGroups}</strong>
                </div>
                <div className="rank-stat">
                    <span>{copy.results}</span>
                    <strong>{showGeneralWinners ? filteredWinners.length : visibleAthletes}</strong>
                </div>
            </div>

            <div className="tab-container minimal-tabs rank-v2-tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {hasBoardData && (
                <section className="rank-boards-wrap">
                    <header className="rank-boards-head">
                        <div className="rank-boards-head__title">{copy.boardsSectionTitle}</div>
                        <div className="rank-boards-head__subtitle">{copy.boardsSectionSubtitle}</div>
                    </header>
                    <div className="rank-boards">
                        {boardAthletePanels.map((panel) => (
                            <article key={panel.key} className="rank-board">
                                <div className="rank-board__header">
                                    <div>
                                        <h3>{panel.title}</h3>
                                        <p>{panel.subtitle}</p>
                                    </div>
                                    <span>{boardAthleteTopLabel}</span>
                                </div>
                                <div className="rank-board__list">
                                    {panel.entries.length === 0 ? (
                                        <div className="rank-empty">{copy.boardsNoData}</div>
                                    ) : (
                                        panel.entries.map((athlete, index) => {
                                            const metrics = athleteMetrics.get(athlete.id) || {
                                                wins: 0,
                                                podiumTotal: 0
                                            };
                                            return (
                                                <div key={`${panel.key}-${athlete.id}`} className="rank-board__row">
                                                    <div className="rank-board__rank">{index + 1}</div>
                                                    <div className="rank-board__identity">
                                                        <strong>{athlete.nome}</strong>
                                                        <span>{athlete.academia || '-'}</span>
                                                    </div>
                                                    <div className="rank-board__metrics">
                                                        <span>{athlete.pontos} {copy.points}</span>
                                                        <span>{metrics.wins} {copy.wins}</span>
                                                        <span>{translateAthleteBelt(athlete.faixa)} / {translateAthleteWeight(athlete.peso)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </article>
                        ))}

                        {boardTeamPanels.map((panel) => (
                            <article key={panel.key} className="rank-board rank-board--team">
                                <div className="rank-board__header">
                                    <div>
                                        <h3>{panel.title}</h3>
                                        <p>{eventLabel}</p>
                                    </div>
                                    <span>{boardTeamTopLabel}</span>
                                </div>
                                <div className="rank-board__list">
                                    {panel.entries.length === 0 ? (
                                        <div className="rank-empty">{copy.boardsNoData}</div>
                                    ) : (
                                        panel.entries.map((team) => (
                                            <div key={`${panel.key}-${team.key}`} className="rank-board__row">
                                                <div className="rank-board__rank">{team.rank}</div>
                                                <div className="rank-board__identity">
                                                    <strong>{team.academy}</strong>
                                                    <span>{team.athletes} {copy.boardsAthletesSuffix}</span>
                                                </div>
                                                <div className="rank-board__metrics">
                                                    <span>{team.points} {copy.points}</span>
                                                    <span>{team.wins} {copy.wins}</span>
                                                    <span>{team.podiums} {copy.podiums}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            <div className="rank-list-toggle">
                <button
                    type="button"
                    className={`btn btn-secondary ${showFullList ? 'is-active' : ''}`}
                    onClick={() => setShowFullList((prev) => !prev)}
                >
                    {showFullList ? copy.hideFullList : copy.showFullList}
                </button>
            </div>

            <div className={`ajp-grid ${showFullList ? '' : 'is-hidden'}`}>
                {showGeneralWinners ? (
                    <section className="ajp-card ajp-card--full">
                        <div className="ajp-card__header">
                            <div>
                                <div className="ajp-card__title">{copy.overallRanking}</div>
                                <div className="ajp-card__meta">{eventLabel}</div>
                            </div>
                            <span className="ajp-card__status">{copy.updatedNow}</span>
                        </div>
                        {competitionMode && podiumOverallEntries.length > 0 && (
                            <div className="ajp-podium">
                                <div className="ajp-podium__title">{copy.podiumHighlight}</div>
                                <div className="ajp-podium__grid">
                                    {podiumOverallEntries.map((item, index) => (
                                        <article key={`overall-podium-${item.athlete.id}`} className={`ajp-podium__item is-place-${index + 1}`}>
                                            <span className="ajp-podium__place">{podiumPlaceLabel(index)}</span>
                                            <strong className="ajp-podium__name">{item.athlete.nome}</strong>
                                            <span className="ajp-podium__meta">{item.athlete.academia || '-'}</span>
                                            <span className="ajp-podium__score">{item.athlete.pontos} {copy.points}</span>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="ajp-list">
                            {pagedWinners.map((item, index) => {
                                const athlete = item.athlete;
                                const photoUrl = resolvePhotoUrl(athlete);
                                const countryCode = countryCodeFromAthlete(athlete);
                                const countryLabel = countryLabelFromAthlete(athlete, uiLanguage);
                                const podiumClass = competitionMode && index < 3 ? ` is-podium is-podium-${index + 1}` : '';
                                const metrics = athleteMetrics.get(athlete.id) || {
                                    wins: 0,
                                    podium1: 0,
                                    podium2: 0,
                                    podium3: 0,
                                    podiumTotal: 0
                                };
                                return (
                                    <div key={`${athlete.id}-${item.label}`} className={`ajp-row${podiumClass}`}>
                                        <div className={`ajp-rank ${index < 3 ? 'is-top' : ''}`}>
                                            {index + 1}
                                            {competitionMode && index < 3 && (
                                                <span className="ajp-rank-pill">P{index + 1}</span>
                                            )}
                                        </div>
                                        <div className={`ajp-avatar ${photoUrl ? '' : 'ajp-avatar--empty'}`}>
                                            {photoUrl ? (
                                                <img src={photoUrl} alt={athlete.nome || copy.eventFallback} className="ajp-avatar__img" loading="lazy" />
                                            ) : null}
                                        </div>
                                        <div className="ajp-info">
                                            <div className="ajp-name">{athlete.nome}</div>
                                            <div className="ajp-sub">
                                                <span className="ajp-country">
                                                    <span className="ajp-flag" aria-label={`${copy.flagLabel} ${countryLabel}`}>{flagFromCountryCode(countryCode)}</span>
                                                    {countryLabel}
                                                </span>
                                                <span>{athlete.academia}</span>
                                                <span className={`rank-mode ${athlete.isNoGi ? 'is-nogi' : 'is-gi'}`}>
                                                    {buildModeTag(athlete)}
                                                </span>
                                                <span>{translateGroupLabel(item.label)}</span>
                                            </div>
                                        </div>
                                            <div className="ajp-metrics">
                                                <div className="ajp-metric">
                                                    <strong>{athlete.pontos}</strong>
                                                    <span>{copy.points}</span>
                                                </div>
                                                <div className="ajp-metric ajp-metric--win">
                                                    <strong>{metrics.wins}</strong>
                                                    <span>{copy.wins}</span>
                                                </div>
                                                <div className="ajp-metric ajp-metric--podium">
                                                    <strong>{metrics.podiumTotal}</strong>
                                                    <span>{copy.podiums}</span>
                                                </div>
                                            </div>
                                        </div>
                                );
                            })}
                        </div>
                    </section>
                ) : (
                    pagedGroups.length === 0 ? (
                        <div className="rank-empty">
                            {isEventMode ? copy.noAthleteInEvent : copy.noAthleteInCategory}
                        </div>
                    ) : (
                        pagedGroups.map((group) => (
                            <section key={group.key || group.label} className="ajp-card">
                                <div className="ajp-card__header">
                                    <div>
                                        <div className="ajp-card__title">{translateGroupLabel(group.label)}</div>
                                        <div className="ajp-card__meta">{group.totalCount} {copy.athletes.toLowerCase()}</div>
                                    </div>
                                    <span className="ajp-card__status">{copy.updatedNow}</span>
                                </div>
                                {competitionMode && group.entries.length > 0 && (
                                    <div className="ajp-podium">
                                        <div className="ajp-podium__title">{copy.podiumHighlight}</div>
                                        <div className="ajp-podium__grid">
                                            {group.entries.slice(0, 3).map((athlete, index) => (
                                                <article key={`group-podium-${group.key}-${athlete.id}`} className={`ajp-podium__item is-place-${index + 1}`}>
                                                    <span className="ajp-podium__place">{podiumPlaceLabel(index)}</span>
                                                    <strong className="ajp-podium__name">{athlete.nome}</strong>
                                                    <span className="ajp-podium__meta">{athlete.academia || '-'}</span>
                                                    <span className="ajp-podium__score">{athlete.pontos} {copy.points}</span>
                                                </article>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="ajp-list">
                                    {group.entries.map((athlete, index) => {
                                        const photoUrl = resolvePhotoUrl(athlete);
                                        const countryCode = countryCodeFromAthlete(athlete);
                                        const countryLabel = countryLabelFromAthlete(athlete, uiLanguage);
                                        const podiumClass = competitionMode && index < 3 ? ` is-podium is-podium-${index + 1}` : '';
                                        const metrics = athleteMetrics.get(athlete.id) || {
                                            wins: 0,
                                            podium1: 0,
                                            podium2: 0,
                                            podium3: 0,
                                            podiumTotal: 0
                                        };
                                        return (
                                            <div key={athlete.id} className={`ajp-row${podiumClass}`}>
                                                <div className={`ajp-rank ${index < 3 ? 'is-top' : ''}`}>
                                                    {index + 1}
                                                    {competitionMode && index < 3 && (
                                                        <span className="ajp-rank-pill">P{index + 1}</span>
                                                    )}
                                                </div>
                                                <div className={`ajp-avatar ${photoUrl ? '' : 'ajp-avatar--empty'}`}>
                                                    {photoUrl ? (
                                                        <img src={photoUrl} alt={athlete.nome || copy.eventFallback} className="ajp-avatar__img" loading="lazy" />
                                                    ) : null}
                                                </div>
                                                <div className="ajp-info">
                                                    <div className="ajp-name">{athlete.nome}</div>
                                                    <div className="ajp-sub">
                                                        <span className="ajp-country">
                                                            <span className="ajp-flag" aria-label={`${copy.flagLabel} ${countryLabel}`}>{flagFromCountryCode(countryCode)}</span>
                                                            {countryLabel}
                                                        </span>
                                                        <span>{athlete.academia}</span>
                                                        <span className={`rank-mode ${athlete.isNoGi ? 'is-nogi' : 'is-gi'}`}>
                                                            {buildModeTag(athlete)}
                                                        </span>
                                                        <span>{translateAthleteBelt(athlete.faixa)} / {translateAthleteWeight(athlete.peso)}</span>
                                                    </div>
                                                </div>
                                                <div className="ajp-metrics">
                                                    <div className="ajp-metric">
                                                        <strong>{athlete.pontos}</strong>
                                                        <span>{copy.points}</span>
                                                    </div>
                                                    <div className="ajp-metric ajp-metric--win">
                                                        <strong>{metrics.wins}</strong>
                                                        <span>{copy.wins}</span>
                                                    </div>
                                                    <div className="ajp-metric ajp-metric--podium">
                                                        <strong>{metrics.podiumTotal}</strong>
                                                        <span>{copy.podiums}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {group.hiddenCount > 0 && (
                                    <div className="ajp-card__footer">
                                        <span>+{group.hiddenCount} {copy.hiddenAthletes}</span>
                                        <button
                                            type="button"
                                            className="btn btn-ghost rank-group-button"
                                            onClick={() => toggleGroup(group.key)}
                                        >
                                            {copy.seeAll}
                                            <ChevronDown size={14} />
                                        </button>
                                    </div>
                                )}
                                {group.hiddenCount <= 0 && compactView && expandedGroups.has(group.key) && !normalizedSearch && (
                                    <div className="ajp-card__footer">
                                        <button
                                            type="button"
                                            className="btn btn-ghost rank-group-button"
                                            onClick={() => toggleGroup(group.key)}
                                        >
                                            {copy.collapse}
                                            <ChevronUp size={14} />
                                        </button>
                                    </div>
                                )}
                            </section>
                        ))
                    )
                )}
            </div>

            {showFullList && activeTab === 'GERAL' && filteredWinners.length > winnersLimit && (
                <div className="rank-more">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setWinnersLimit((prev) => prev + WINNERS_PAGE_SIZE)}
                    >
                        {copy.showMoreResults}
                    </button>
                </div>
            )}

            {showFullList && activeTab !== 'GERAL' && visibleGroups.length > groupLimit && !isEventMode && (
                <div className="rank-more">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setGroupLimit((prev) => prev + GROUP_PAGE_SIZE)}
                    >
                        {copy.showMoreCategories}
                    </button>
                </div>
            )}

            {showFullList && (showGeneralWinners
                ? filteredWinners.length === 0 && <div className="rank-empty">{copy.noWinner}</div>
                : !isEventMode && searchedGroups.length === 0 && (
                    <div className="rank-empty">{copy.noAthleteInCategory}</div>
                ))}
        </div>
    );
};

export default Ranking;


