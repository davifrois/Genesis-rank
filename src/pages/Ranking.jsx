import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search, Trophy, User, X } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { useI18n } from '../hooks/useI18n';
import { buildScoreBreakdown, rankAthletes } from '../services/scoringService';
import { buildTeamRanking } from '../services/teamRankingService';
import { buildCategoryDescriptor } from '../services/categoryService';
import { generateFilteredRankingPDF } from '../services/pdfService';
import { buildFileSafeName, downloadCsv } from '../services/exportService';
import { translateBelt, translateCompositeLabel, translateWeight } from '../utils/localeLabels';
import { countryCodeFromAthlete, countryLabelFromAthlete, countryLabelFromCode, flagFromCountryCode } from '../utils/countryFlags';
import './RankingV2.css';
import './RankingAjp.css';

const DEFAULT_GROUP_LIMIT = 8;
const GROUP_PAGE_SIZE = 10;
const WINNERS_PAGE_SIZE = 40;
const TAB_OPTIONS = ['GI', 'NO-GI', 'ABS-GI', 'ABS-NO-GI', 'GERAL', 'EQUIPE'];

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
    const [showFullList, setShowFullList] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState(() => new Set());
    const [groupLimit, setGroupLimit] = useState(GROUP_PAGE_SIZE);
    const [winnersLimit, setWinnersLimit] = useState(WINNERS_PAGE_SIZE);
    const [globalGender, setGlobalGender] = useState('MASCULINO');
    const [selectOpen, setSelectOpen] = useState(false);
    const copy = isEnglish
        ? {
            tabs: {
                GI: 'GI',
                'NO-GI': 'NO-GI',
                'ABS-GI': 'ABS GI',
                'ABS-NO-GI': 'ABS NO-GI',
                GERAL: 'OVERALL',
                EQUIPE: 'TEAM'
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
            eventLabel: 'Championship',
            selectEventAria: 'Select event',
            searchPlaceholder: 'Search athlete by name',
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
                    GI: 'GI',
                    'NO-GI': 'NO-GI',
                    'ABS-GI': 'ABS GI',
                    'ABS-NO-GI': 'ABS NO-GI',
                    GERAL: 'GENERAL',
                    EQUIPE: 'EQUIPO'
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
                eventLabel: 'Campeonato',
                selectEventAria: 'Seleccionar evento',
                searchPlaceholder: 'Buscar atleta por nombre',
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
                        GI: 'GI',
                        'NO-GI': 'NO-GI',
                        'ABS-GI': 'ABS GI',
                        'ABS-NO-GI': 'ABS NO-GI',
                        GERAL: 'GENERAL',
                        EQUIPE: 'EQUIPE'
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
                    eventLabel: 'Championnat',
                    selectEventAria: "Selectionner l'evenement",
                    searchPlaceholder: 'Rechercher athlete par nom',
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
                        GI: 'GI',
                        'NO-GI': 'NO-GI',
                        'ABS-GI': 'ABS GI',
                        'ABS-NO-GI': 'ABS NO-GI',
                        GERAL: 'GERAL',
                        EQUIPE: 'EQUIPE'
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
                    eventLabel: 'Campeonato',
                    selectEventAria: 'Selecionar evento',
                    searchPlaceholder: 'Pesquisar atleta pelo nome',
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

        if (changed) {
            setSearchParams(params, { replace: true });
        }
    }, [activeTab, selectedEventId, searchTerm, compactView, competitionMode, searchParams, setSearchParams]);

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
        { id: 'GERAL', label: copy.tabs.GERAL },
        { id: 'EQUIPE', label: copy.tabs.EQUIPE }
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
            if (activeTab === 'EQUIPE') return false;
            return true;
        }).filter(athlete => {
            const gen = (athlete.genero || athlete.sexo || '').toLowerCase().trim();
            const isFemale = gen === 'feminino' || gen === 'f' || gen === 'female' || gen === 'mulher';
            
            if (globalGender === 'FEMININO') {
                return isFemale;
            }
            if (globalGender === 'MASCULINO') {
                return !isFemale;
            }
            return true;
        });
    }, [activeTab, eventFilteredAthletes, globalGender]);

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
        
        const tabFiltered = eventFilteredAthletes.filter((athlete) => {
            if (activeTab === 'GI') return !athlete.isNoGi && !athlete.isAbsolute;
            if (activeTab === 'NO-GI') return athlete.isNoGi && !athlete.isAbsolute;
            if (activeTab === 'ABS-GI') return !athlete.isNoGi && athlete.isAbsolute;
            if (activeTab === 'ABS-NO-GI') return athlete.isNoGi && athlete.isAbsolute;
            if (activeTab === 'EQUIPE') return false;
            return true;
        });

        tabFiltered.forEach((athlete) => {
            const categoria = athlete.categoria || 'Categoria';
            const faixa = athlete.faixa || 'Faixa';
            const peso = athlete.peso || (athlete.isAbsolute ? 'Absoluto' : 'Peso');
            
            const normalizeGroupPart = (value) => ((value || '').toString().trim().toLowerCase().replace(/\s+/g, ' '));
            const agnosticKeyParts = [categoria, faixa, peso, athlete.isAbsolute ? 'ABS' : 'STD', athlete.isNoGi ? 'NO-GI' : 'GI'];
            const agnosticKey = agnosticKeyParts.map(normalizeGroupPart).join('::');
            
            if (!groups.has(agnosticKey)) {
                const displayGender = globalGender === 'FEMININO' ? (isEnglish ? "Women's" : "Feminino") : (isEnglish ? "Men's" : "Masculino");
                const labelParts = athlete.isAbsolute ? ['ABS', categoria, faixa, peso, displayGender] : [categoria, faixa, peso, displayGender];
                
                groups.set(agnosticKey, { 
                    key: agnosticKey + '::' + globalGender.toLowerCase(),
                    label: labelParts.join(' - '),
                    entries: [] 
                });
            }
        });

        filteredAthletes.forEach((athlete) => {
            const categoria = athlete.categoria || 'Categoria';
            const faixa = athlete.faixa || 'Faixa';
            const peso = athlete.peso || (athlete.isAbsolute ? 'Absoluto' : 'Peso');
            
            const normalizeGroupPart = (value) => ((value || '').toString().trim().toLowerCase().replace(/\s+/g, ' '));
            const agnosticKeyParts = [categoria, faixa, peso, athlete.isAbsolute ? 'ABS' : 'STD', athlete.isNoGi ? 'NO-GI' : 'GI'];
            const agnosticKey = agnosticKeyParts.map(normalizeGroupPart).join('::');
            
            if (groups.has(agnosticKey)) {
                groups.get(agnosticKey).entries.push(athlete);
            }
        });

        const grouped = [...groups.values()]
            .map((group) => ({
                key: group.key,
                label: group.label,
                entries: rankAthletes(group.entries)
            }))
            .sort((a, b) => a.label.localeCompare(b.label));

        return grouped;
    }, [filteredAthletes, eventFilteredAthletes, activeTab, globalGender, isEnglish]);

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

    const groupRankIndex = useMemo(() => {
        const map = new Map();
        groupedAthletes.forEach((group) => {
            group.entries.forEach((athlete, index) => {
                map.set(`${group.key || group.label}:${athlete.id}`, index + 1);
            });
        });
        return map;
    }, [groupedAthletes]);

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

    const activeTeamRanking = useMemo(() => {
        if (activeTab !== 'EQUIPE') return [];
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
        return buildTeamRanking(filteredBySearch);
    }, [activeTab, eventFilteredAthletes, normalizedSearch]);

    const hasBoardData = (boardAthletePanels.length > 0 || boardTeamPanels.length > 0) && activeTab !== 'EQUIPE';

    const handleExportCsv = () => {
        if (activeTab === 'EQUIPE') {
            const headers = isEnglish
                ? ['POS', 'TEAM', 'COUNTRY', 'POINTS', 'WINS', 'GOLD', 'SILVER', 'BRONZE', 'ATHLETES']
                : isSpanish
                    ? ['POS', 'EQUIPO', 'PAIS', 'PUNTOS', 'VICTORIAS', 'ORO', 'PLATA', 'BRONCE', 'ATLETAS']
                    : isFrench
                        ? ['POS', 'EQUIPE', 'PAYS', 'POINTS', 'VICTOIRES', 'OR', 'ARGENT', 'BRONZE', 'ATHLETES']
                        : ['POS', 'EQUIPE', 'PAIS', 'PONTOS', 'VITORIAS', 'OURO', 'PRATA', 'BRONZE', 'ATLETAS'];
            const rows = activeTeamRanking.map((team) => ([
                team.rank,
                team.academy,
                countryLabelFromCode(team.countryCode, uiLanguage) || team.countryCode,
                team.pontos,
                team.wins,
                team.campeao,
                team.vice,
                team.terceiro,
                team.athletes
            ]));
            const fileName = `ranking_equipes_${buildFileSafeName(eventLabel)}`;
            downloadCsv(fileName, headers, rows);
            return;
        }

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
        <div className="ajp-page-container">
            {/* HEADER */}
            <div className="ajp-header-section">
                <div className="ajp-header-top">
                    <h1 className="ajp-header-title">RANKINGS</h1>
                    <div style={{ position: 'relative' }}>
                        <button
                            className="ajp-event-dropdown"
                            onClick={() => setSelectOpen(!selectOpen)}
                            onBlur={() => setTimeout(() => setSelectOpen(false), 200)}
                        >
                            {selectedEventId === 'all' ? copy.allEvents : (events.find(e => e.id === selectedEventId)?.name || copy.allEvents)}
                            <ChevronDown size={14} />
                        </button>
                        {selectOpen && (
                            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: '0', background: '#333', border: '1px solid #444', borderRadius: '4px', zIndex: 10, minWidth: '100%', maxHeight: '400px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
                                <div
                                    style={{ padding: '10px 16px', cursor: 'pointer', color: selectedEventId === 'all' ? '#0ea5e9' : '#fff' }}
                                    onMouseDown={() => setSelectedEventId('all')}
                                >
                                    {copy.allEvents}
                                </div>
                                {events.map(ev => (
                                    <div
                                        key={ev.id}
                                        style={{ padding: '10px 16px', cursor: 'pointer', color: selectedEventId === ev.id ? '#0ea5e9' : '#fff', borderTop: '1px solid #444' }}
                                        onMouseDown={() => setSelectedEventId(ev.id)}
                                    >
                                        {ev.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* BREADCRUMB */}
                <div className="ajp-breadcrumb">
                    <span>Rankings</span>
                    <span>/</span>
                    <span className="bc-current">
                        {selectedEventId === 'all' ? copy.allEvents : (events.find(e => e.id === selectedEventId)?.name || copy.allEvents)}
                    </span>
                    {selectedEventId !== 'all' && (
                        <>
                            <span>/</span>
                            <span>GENESIS ESPORTES RANKING OFICIAL</span>
                        </>
                    )}
                </div>

                {/* GENDER TOGGLES */}
                <div className="ajp-gender-toggles">
                    <button 
                        className={`ajp-gender-btn ${globalGender === 'MASCULINO' ? 'active' : ''}`}
                        onClick={() => setGlobalGender('MASCULINO')}
                    >
                        <User size={16} />
                        {isEnglish ? "MEN'S" : "MASCULINO"}
                    </button>
                    <button 
                        className={`ajp-gender-btn ${globalGender === 'FEMININO' ? 'active' : ''}`}
                        onClick={() => setGlobalGender('FEMININO')}
                    >
                        <User size={16} />
                        {isEnglish ? "WOMEN'S" : "FEMININO"}
                    </button>
                </div>
            </div>

            {/* CATEGORY GRID */}
            <div className="ajp-category-grid" style={{ padding: '0 40px 40px', maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', gap: '32px' }}>
                {groupedAthletes.map(group => {
                    const top5 = group.entries.slice(0, 5);
                    return (
                        <div key={group.key} className="ajp-category-card">
                            <div className="ajp-category-header">
                                <h3 className="ajp-category-title">{group.label}</h3>
                                <p className="ajp-category-subtitle">Last calculated just now</p>
                            </div>
                            <div className="ajp-category-body">
                                {top5.length === 0 ? (
                                    <div className="ajp-empty-state">Nenhum atleta na categoria.</div>
                                ) : (
                                    top5.map((athlete, index) => {
                                        const countryCode = countryCodeFromAthlete(athlete);
                                        const photoUrl = resolvePhotoUrl(athlete);
                                        const metrics = athleteMetrics.get(athlete.id) || { wins: 0, podiumTotal: 0, podium1: 0, podium2: 0, podium3: 0 };
                                        
                                        // Re-calculate losses manually for display
                                        const history = Array.isArray(athlete.historico) ? athlete.historico : [];
                                        let losses = 0;
                                        history.forEach(item => {
                                            if ((item?.type || '').toString().toLowerCase().trim() === 'loss') losses += 1;
                                        });

                                        return (
                                            <Link
                                                key={athlete.id}
                                                to={`/perfil-publico/${athlete.id}`}
                                                className="ajp-category-row"
                                            >
                                                <div className="ajp-category-rank">{index + 1}.</div>
                                                <div className="ajp-category-avatar">
                                                    {photoUrl ? <img src={photoUrl} alt={athlete.nome} loading="lazy" /> : <User size={24} color="#aaa" />}
                                                </div>
                                                <div className="ajp-category-info">
                                                    <div className="ajp-category-name">{athlete.nome}</div>
                                                    <div className="ajp-category-country">
                                                        <span>{flagFromCountryCode(countryCode)}</span>
                                                        <span>{countryLabelFromAthlete(athlete, uiLanguage)}</span>
                                                    </div>
                                                </div>
                                                <div className="ajp-category-stats">
                                                    <div className="ajp-stat-col">
                                                        <span className="ajp-stat-val blue">{athlete.pontos || 0}</span>
                                                        <span className="ajp-stat-label">Points</span>
                                                    </div>
                                                    <div className="ajp-stat-col">
                                                        <span className="ajp-stat-val green">{metrics.wins || 0}</span>
                                                        <span className="ajp-stat-label">Wins</span>
                                                    </div>
                                                    <div className="ajp-stat-col">
                                                        <span className="ajp-stat-val red">{losses || 0}</span>
                                                        <span className="ajp-stat-label">Losses</span>
                                                    </div>
                                                    <div className="ajp-stat-col">
                                                        <span className="ajp-stat-val gold">{metrics.podium1 || 0}</span>
                                                        <span className="ajp-stat-label" style={{fontSize: '10px', marginTop: '2px'}}>🥇</span>
                                                    </div>
                                                    <div className="ajp-stat-col">
                                                        <span className="ajp-stat-val silver">{metrics.podium2 || 0}</span>
                                                        <span className="ajp-stat-label" style={{fontSize: '10px', marginTop: '2px'}}>🥈</span>
                                                    </div>
                                                    <div className="ajp-stat-col">
                                                        <span className="ajp-stat-val bronze">{metrics.podium3 || 0}</span>
                                                        <span className="ajp-stat-label" style={{fontSize: '10px', marginTop: '2px'}}>🥉</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })
                                )}
                            </div>
                            {group.entries.length > 5 && (
                                <div className="ajp-category-footer">
                                    See all
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Ranking;
