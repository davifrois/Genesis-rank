import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    LayoutDashboard,
    LayoutGrid,
    List,
    LogOut,
    Menu,
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
    Zap
} from 'lucide-react';
import { generateBracketsPDF, generateRankingPDF } from '../services/pdfService';
import { extractTextFromPdfFile, parseAthletesFromText } from '../services/pdfImportService';
import { buildBracketMatches } from '../services/bracketService';
import { authService } from '../services/authService';
import { motion, AnimatePresence } from 'framer-motion';
import LoginOverlay from '../components/LoginOverlay';

const buildImportDebug = (rawText) => {
    const lines = (rawText || '')
        .split(/\r?\n/)
        .map((line) => line.trimEnd())
        .filter((line) => line.trim().length > 0);
    return lines.slice(0, 60).join('\n');
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
        applyBracketPodium,
        events,
        activeEventId,
        openEventModal,
        updateEvent,
        deleteEvent,
        setActiveEvent,
        assignAthletesToEvent,
        addLog,
        currentUser,
        logout,
        clearEventResults,
        logs
    } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showLogs, setShowLogs] = useState(false);
    const [toast, setToast] = useState(null);
    const [navOpen, setNavOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('overview');
    const [viewMode, setViewMode] = useState('table');
    const [now, setNow] = useState(new Date());
    const importInputRef = useRef(null);
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
    const [showEventEditModal, setShowEventEditModal] = useState(false);
    const [eventEditForm, setEventEditForm] = useState({ id: '', name: '', date: '', location: '' });
    const [eventEditError, setEventEditError] = useState('');
    const [newAthlete, setNewAthlete] = useState({
        nome: '',
        faixa: 'Branca',
        peso: '',
        categoria: 'Adulto',
        academia: '',
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

    const showFeedback = useCallback((type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const handleFinalizeEvent = useCallback(() => {
        if (!activeEventId) {
            showFeedback('error', 'Ative um evento para gerar o relatorio.');
            return;
        }

        const eventMeta = events.find((event) => event.id === activeEventId);
        const eventAthletes = athletes.filter((athlete) => athlete.eventId === activeEventId);

        if (!eventAthletes.length) {
            showFeedback('error', 'Nenhum atleta vinculado ao evento ativo.');
            return;
        }

        try {
            generateRankingPDF(eventAthletes, {
                eventName: eventMeta?.name || 'Evento',
                eventDate: eventMeta?.date || '',
                eventLocation: eventMeta?.location || ''
            });
            showFeedback('success', `Relatorio gerado para ${eventMeta?.name || 'evento ativo'}.`);
            clearEventResults();
        } catch (err) {
            const message = err?.message || 'Falha ao gerar o relatorio.';
            console.error('PDF export error:', err);
            showFeedback('error', message);
        }
    }, [activeEventId, athletes, clearEventResults, events, showFeedback]);

    const handleOpenEditEvent = useCallback((eventItem) => {
        if (!eventItem) return;
        setEventEditError('');
        setEventEditForm({
            id: eventItem.id,
            name: eventItem.name || '',
            date: eventItem.date || '',
            location: eventItem.location || ''
        });
        setShowEventEditModal(true);
    }, []);

    const handleCloseEditEvent = useCallback(() => {
        setShowEventEditModal(false);
        setEventEditError('');
        setEventEditForm({ id: '', name: '', date: '', location: '' });
    }, []);

    const handleUpdateEvent = useCallback((event) => {
        event.preventDefault();
        setEventEditError('');
        try {
            const updated = updateEvent(eventEditForm.id, {
                name: eventEditForm.name,
                date: eventEditForm.date,
                location: eventEditForm.location
            });
            showFeedback('success', `Evento atualizado: ${updated?.name || 'evento'}.`);
            handleCloseEditEvent();
        } catch (err) {
            const message = err?.message || 'Falha ao atualizar evento.';
            setEventEditError(message);
            showFeedback('error', message);
        }
    }, [eventEditForm, updateEvent, showFeedback, handleCloseEditEvent]);

    const handleDeleteEvent = useCallback(() => {
        if (!eventEditForm.id) return;
        const name = eventEditForm.name || 'evento selecionado';
        const confirmed = window.confirm(`Deseja apagar o ${name}? Esta acao nao pode ser desfeita.`);
        if (!confirmed) return;
        try {
            deleteEvent(eventEditForm.id);
            showFeedback('success', 'Evento removido com sucesso.');
            handleCloseEditEvent();
        } catch (err) {
            const message = err?.message || 'Falha ao remover evento.';
            setEventEditError(message);
            showFeedback('error', message);
        }
    }, [eventEditForm.id, eventEditForm.name, deleteEvent, showFeedback, handleCloseEditEvent]);

    const handleImportRanking = useCallback(() => {
        importInputRef.current?.click();
    }, []);

    const handleClearAthletes = useCallback(() => {
        const confirmed = window.confirm('Deseja limpar todos os atletas? Esta acao nao pode ser desfeita.');
        if (confirmed) {
            clearAthletes();
            showFeedback('success', 'Todos os atletas foram removidos.');
        }
    }, [clearAthletes, showFeedback]);

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
                setImportError('PDF sem texto. Gere um PDF pesquisavel (OCR) e tente novamente.');
                setImportStatus('');
                showFeedback('error', 'PDF sem texto para importar.');
                return;
            }

            const parsed = parseAthletesFromText(text, importMode);

            if (!parsed.length) {
                setImportError('Nenhum atleta encontrado. Verifique se o PDF tem texto.');
                setImportDebug(buildImportDebug(text));
                console.log('PDF import debug preview:\n', buildImportDebug(text));
                setImportStatus('');
                showFeedback('error', 'Nenhum atleta valido para importar.');
                return;
            }

            const result = importAthletes(parsed, { eventId: importEventId || activeEventId || '' });
            const importedCount = result?.imported ?? parsed.length;
            setImportStatus(`${importedCount} atletas importados.`);
            showFeedback('success', `${importedCount} atletas importados.`);
        } catch (err) {
            setImportError(err?.message || 'Falha ao ler o arquivo. Tente outro PDF.');
            setImportStatus('');
            showFeedback('error', 'Falha ao ler o arquivo.');
        } finally {
            event.target.value = '';
            setTimeout(() => {
                setImportStatus('');
                setImportError('');
            }, 4000);
        }
    }, [importAthletes, importMode, importEventId, activeEventId, showFeedback]);

    const handleManualInputChange = useCallback((id, value) => {
        setManualInputs((prev) => ({ ...prev, [id]: value }));
    }, []);

    const handleManualPoints = useCallback((id) => {
        const rawValue = manualInputs[id];
        const parsed = Number(rawValue);
        if (!Number.isFinite(parsed) || parsed < 0) {
            showFeedback('error', 'Informe um valor valido para pontos.');
            return;
        }
        const ok = setManualPoints(id, parsed);
        if (ok) {
            showFeedback('success', 'Pontos atualizados manualmente.');
            setManualInputs((prev) => ({ ...prev, [id]: '' }));
        } else {
            showFeedback('error', 'Nao foi possivel atualizar os pontos.');
        }
    }, [manualInputs, setManualPoints, showFeedback]);

    const handleRefreshBeltSummary = useCallback(() => {
        setNow(new Date());
        showFeedback('success', 'Resumo por faixa atualizado.');
    }, [showFeedback]);

    const handleGenerateBrackets = useCallback(async () => {
        if (!bracketEventId) {
            showFeedback('error', 'Selecione um evento para gerar as chaves.');
            return;
        }

        const hasExisting = brackets.some((bracket) => (
            bracket.eventId === bracketEventId
            && (bracketMode === 'ALL' || bracket.mode === bracketMode)
        ));

        if (hasExisting) {
            const confirmed = window.confirm('Ja existem chaves para este evento. Deseja gerar novamente?');
            if (!confirmed) return;
        }

        try {
            const result = generateBrackets({
                eventId: bracketEventId,
                mode: bracketMode,
                replaceExisting: hasExisting
            });
            if (result.created > 0) {
                showFeedback('success', `${result.created} chaves geradas.`);
                const eventMeta = events.find((event) => event.id === bracketEventId);
                const modeLabelMap = {
                    ALL: 'Geral',
                    GI: 'GI (peso)',
                    'NO-GI': 'NO-GI (peso)',
                    'ABS-GI': 'ABS GI',
                    'ABS-NO-GI': 'ABS NO-GI'
                };
                await generateBracketsPDF(result.brackets || [], athletes, {
                    eventName: eventMeta?.name || 'Evento',
                    eventDate: eventMeta?.date || '',
                    eventLocation: eventMeta?.location || '',
                    modeLabel: modeLabelMap[bracketMode] || bracketMode
                });
            } else {
                showFeedback('error', 'Nenhuma categoria encontrada para gerar chaves.');
            }
        } catch (err) {
            showFeedback('error', err?.message || 'Falha ao gerar chaves.');
        }
    }, [bracketEventId, bracketMode, brackets, events, generateBrackets, athletes, showFeedback]);

    const handleApplyBracketPodium = useCallback((bracketId) => {
        const result = applyBracketPodium(bracketId);
        if (result.ok) {
            showFeedback('success', 'Podio aplicado com sucesso.');
        } else {
            showFeedback('error', result.message || 'Nao foi possivel aplicar o podio.');
        }
    }, [applyBracketPodium, showFeedback]);

    const openUserResetModal = useCallback(() => {
        if (authService.isLocalAuth && !authService.isLocalAuth()) {
            showFeedback('error', 'Redefinicao de senha disponivel apenas no modo local.');
            return;
        }
        const users = authService.listUsers ? authService.listUsers() : [];
        setUserResetList(users);
        setUserResetUsername(users[0]?.username || '');
        setUserResetPassword('');
        setUserResetConfirm('');
        setUserResetError('');
        setUserResetSuccess('');
        setShowUserResetModal(true);
    }, [showFeedback]);

    const closeUserResetModal = useCallback(() => {
        setShowUserResetModal(false);
        setUserResetPassword('');
        setUserResetConfirm('');
        setUserResetError('');
        setUserResetSuccess('');
    }, []);

    const handleUserResetSubmit = useCallback(async (event) => {
        event.preventDefault();
        setUserResetError('');
        setUserResetSuccess('');

        if (!userResetUsername) {
            setUserResetError('Selecione um usuario.');
            return;
        }

        if (userResetPassword !== userResetConfirm) {
            setUserResetError('As senhas nao conferem.');
            return;
        }

        setUserResetLoading(true);
        try {
            await authService.resetPassword(userResetUsername, userResetPassword);
            setUserResetSuccess('Senha atualizada com sucesso.');
            showFeedback('success', `Senha redefinida para ${userResetUsername}.`);
            addLog({
                type: 'AUTH',
                action: 'RESET_PASSWORD_ADMIN',
                details: `Senha redefinida para ${userResetUsername}.`
            });
            setUserResetPassword('');
            setUserResetConfirm('');
        } catch (err) {
            const message = err?.message || 'Falha ao redefinir senha.';
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
    }, [userResetUsername, userResetPassword, userResetConfirm, showFeedback, addLog]);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 15000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const handler = (event) => {
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
    }, [handleImportRanking, handleFinalizeEvent]);

    useEffect(() => {
        if (activeEventId && !newAthlete.eventId) {
            setNewAthlete((prev) => ({ ...prev, eventId: activeEventId }));
        }
        if (activeEventId && !importEventId) {
            setImportEventId(activeEventId);
        }
        if (activeEventId && !bracketEventId) {
            setBracketEventId(activeEventId);
        }
    }, [activeEventId, newAthlete.eventId, importEventId, bracketEventId]);

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
    }, [events, eventFilter, importEventId, bracketEventId]);

    const eventMap = useMemo(() => (
        events.reduce((acc, event) => {
            acc[event.id] = event;
            return acc;
        }, {})
    ), [events]);

    const activeEvent = useMemo(() => (
        events.find((event) => event.id === activeEventId)
    ), [events, activeEventId]);

    const athleteMap = useMemo(() => (
        new Map(athletes.map((athlete) => [athlete.id, athlete]))
    ), [athletes]);

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

    const isLocalAuth = authService.isLocalAuth ? authService.isLocalAuth() : true;
    const localUsers = isLocalAuth && authService.listUsers ? authService.listUsers() : [];

    const filteredAthletes = useMemo(() => (
        athletes.filter((athlete) => {
            const nameMatch = athlete.nome.toLowerCase().includes(searchTerm.toLowerCase());
            const academyMatch = (athlete.academia || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesSearch = nameMatch || academyMatch;
            const matchesEvent = eventFilter === 'all'
                ? true
                : eventFilter === 'none'
                    ? !athlete.eventId
                    : athlete.eventId === eventFilter;
            return matchesSearch && matchesEvent;
        })
    ), [athletes, searchTerm, eventFilter]);

    const assignCandidates = useMemo(() => {
        const term = assignSearch.trim().toLowerCase();
        const sorted = [...athletes].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        if (!term) return sorted;
        return sorted.filter((athlete) => (
            athlete.nome.toLowerCase().includes(term)
            || (athlete.academia || '').toLowerCase().includes(term)
        ));
    }, [athletes, assignSearch]);

    const totals = useMemo(() => {
        const totalPoints = athletes.reduce((acc, athlete) => acc + athlete.pontos, 0);
        const activeAthletes = athletes.filter((athlete) => athlete.historico.length > 0).length;
        const averagePoints = athletes.length ? Math.round(totalPoints / athletes.length) : 0;

        const academyMap = athletes.reduce((acc, athlete) => {
            const key = athlete.academia || 'Sem academia';
            if (!acc[key]) acc[key] = { count: 0, points: 0 };
            acc[key].count += 1;
            acc[key].points += athlete.pontos;
            return acc;
        }, {});

        const topAcademy = Object.entries(academyMap).sort((a, b) => b[1].points - a[1].points)[0];

        return {
            totalPoints,
            averagePoints,
            activeAthletes,
            topAcademy
        };
    }, [athletes]);

    const eventStats = useMemo(() => (
        events.map((event) => ({
            ...event,
            athleteCount: athletes.filter((athlete) => athlete.eventId === event.id).length
        }))
    ), [events, athletes]);

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

    const navItems = [
        { id: 'overview', label: 'Visao geral', icon: LayoutDashboard },
        { id: 'events', label: 'Eventos', icon: Calendar, meta: events.length },
        { id: 'brackets', label: 'Chaveamento', icon: ClipboardList },
        { id: 'athletes', label: 'Atletas', icon: Users, meta: athletes.length },
        { id: 'automation', label: 'Automacoes', icon: Zap },
        { id: 'activity', label: 'Atividade', icon: Activity }
    ];

    const handleNavClick = (id) => {
        setActiveSection(id);
        setNavOpen(false);
        const section = document.getElementById(id);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleAddAthlete = (event) => {
        event.preventDefault();

        if (newAthlete.nome.length < 3) {
            showFeedback('error', 'Nome precisa ter pelo menos 3 caracteres.');
            return;
        }
        if (!newAthlete.academia) {
            showFeedback('error', 'Informe a academia do atleta.');
            return;
        }

        try {
            addAthlete(newAthlete);
            showFeedback('success', `Atleta ${newAthlete.nome} cadastrado.`);
            setShowAddModal(false);
            setNewAthlete({
                nome: '',
                faixa: 'Branca',
                peso: '',
                categoria: 'Adulto',
                academia: '',
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
        return parsed.toLocaleDateString('pt-BR');
    };

    const handleOpenAssignModal = (eventItem) => {
        const selection = {};
        athletes.forEach((athlete) => {
            selection[athlete.id] = athlete.eventId === eventItem.id;
        });
        setAssignEvent(eventItem);
        setAssignSelection(selection);
        setAssignSearch('');
        setShowAssignModal(true);
    };

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
            showFeedback('success', 'Atletas vinculados ao evento.');
            handleCloseAssignModal();
        } catch (err) {
            showFeedback('error', err?.message || 'Falha ao vincular atletas.');
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
                    <span className="admin-sidebar__title">Menu rapido</span>
                    <button type="button" className="btn btn-ghost" onClick={() => setNavOpen(false)}>
                        Fechar
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
                        <span>Atletas ativos</span>
                        <strong>{totals.activeAthletes}</strong>
                    </div>
                    <div className="sidebar-stat">
                        <span>Pontos totais</span>
                        <strong>{totals.totalPoints}</strong>
                    </div>
                    <div className="sidebar-stat">
                        <span>Eventos cadastrados</span>
                        <strong>{events.length}</strong>
                    </div>
                </div>

                <button type="button" className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    Novo cadastro
                </button>
            </aside>
            <div className="admin-main">
                <section className="admin-hero" id="overview">
                    <div>
                        <div className="meta-pill">
                            <Sparkles size={14} />
                            Evento ativo: {activeEvent ? activeEvent.name : 'Sem evento ativo'}
                        </div>
                        <h2 className="hero-title">Painel de Controle</h2>
                        <p className="hero-subtitle">
                            Acompanhe registros, ajustes e resultados do ranking com indicadores em tempo real e
                            atalhos inteligentes para as rotinas administrativas.
                        </p>
                        <div className="hero-meta">
                            <span className="meta-pill">
                                <Clock size={14} />
                                Atualizado as {now.toLocaleTimeString('pt-BR')}
                            </span>
                            <span className="meta-pill">
                                <ShieldCheck size={14} />
                                Sessao segura para {currentUser.name}
                            </span>
                            <span className="meta-pill">
                                <BarChart3 size={14} />
                                Media: {totals.averagePoints} pts
                            </span>
                        </div>
                    </div>

                    <div className="hero-actions">
                        <div className="hero-actions__buttons">
                            <button type="button" className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                                <UserPlus size={14} />
                                Novo atleta
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={() => setShowLogs(true)}>
                                <ClipboardList size={14} />
                                Logs
                            </button>
                            <button type="button" className="btn btn-ghost mobile-only" onClick={() => setNavOpen(true)}>
                                <Menu size={14} />
                                Menu
                            </button>
                        </div>
                        <div className="hero-info-card">
                            <span>Ranking atualizado</span>
                            <strong>{athletes.length} atletas</strong>
                            <div className="hero-info-meta">
                                <div>
                                    <Trophy size={16} />
                                    {totals.topAcademy ? totals.topAcademy[0] : 'Sem lider'}
                                </div>
                                <div>
                                    <Zap size={16} />
                                    {totals.totalPoints} pts
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-card__icon">
                            <Users size={18} />
                        </div>
                        <div className="stat-card__value">{athletes.length}</div>
                        <div className="stat-card__label">Inscritos</div>
                        <div className="stat-card__trend">+{totals.activeAthletes} ativos</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card__icon">
                            <Trophy size={18} />
                        </div>
                        <div className="stat-card__value">{totals.totalPoints}</div>
                        <div className="stat-card__label">Pontos totais</div>
                        <div className="stat-card__trend">Media {totals.averagePoints} pts</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card__icon">
                            <Zap size={18} />
                        </div>
                        <div className="stat-card__value">{events.length}</div>
                        <div className="stat-card__label">Eventos cadastrados</div>
                        <div className="stat-card__trend">Controle centralizado</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card__icon">
                            <Activity size={18} />
                        </div>
                        <div className="stat-card__value">{logs.length}</div>
                        <div className="stat-card__label">Registros</div>
                        <div className="stat-card__trend">Monitoramento continuo</div>
                    </div>
                </section>
                <section className="panel" id="events">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">Eventos</div>
                            <div className="panel-subtitle">Crie eventos e organize atletas por etapa.</div>
                        </div>
                        <div className="panel-actions">
                            <button type="button" className="btn btn-primary" onClick={openEventModal}>
                                <Calendar size={14} />
                                Criar evento
                            </button>
                        </div>
                    </div>
                    {events.length === 0 ? (
                        <div className="panel-subtitle">Nenhum evento cadastrado.</div>
                    ) : (
                        <div className="event-grid">
                            {eventStats.map((event) => {
                                const isActive = event.id === activeEventId;
                                const dateLabel = formatEventDate(event.date);
                                const metaParts = [
                                    dateLabel ? `Data ${dateLabel}` : 'Data indefinida',
                                    event.location
                                ].filter(Boolean);

                                return (
                                    <div key={event.id} className="event-card">
                                        <div className="event-card__header">
                                            <div>
                                                <div className="event-name">{event.name}</div>
                                                <div className="table-meta">{metaParts.join(' - ')}</div>
                                            </div>
                                            <span className="tag">{isActive ? 'Ativo' : 'Inativo'}</span>
                                        </div>
                                        <div className="event-card__stats">
                                            <div className="event-stat">
                                                <span>Atletas</span>
                                                <strong>{event.athleteCount}</strong>
                                            </div>
                                        </div>
                                        <div className="event-card__footer">
                                            <button
                                                type="button"
                                                className="btn btn-ghost"
                                                onClick={() => setActiveEvent(event.id)}
                                                disabled={isActive}
                                            >
                                                {isActive ? 'Evento ativo' : 'Ativar'}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-ghost"
                                                onClick={() => handleOpenAssignModal(event)}
                                            >
                                                Gerenciar atletas
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-ghost"
                                                onClick={() => handleOpenEditEvent(event)}
                                            >
                                                <Pencil size={14} />
                                                Editar
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
                <section className="panel" id="brackets">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">Chaveamento</div>
                            <div className="panel-subtitle">Gere chaves por categoria e aplique o podio automaticamente.</div>
                        </div>
                        <div className="panel-actions">
                            {events.length > 0 && (
                                <select
                                    className="input select-compact"
                                    value={bracketEventId}
                                    onChange={(event) => setBracketEventId(event.target.value)}
                                    aria-label="Selecionar evento para chaveamento"
                                >
                                    <option value="">Selecionar evento</option>
                                    {events.map((event) => (
                                        <option key={event.id} value={event.id}>{event.name}</option>
                                    ))}
                                </select>
                            )}
                            <select
                                className="input select-compact"
                                value={bracketMode}
                                onChange={(event) => setBracketMode(event.target.value)}
                                aria-label="Selecionar categoria de chaveamento"
                            >
                                <option value="ALL">Todas as categorias</option>
                                <option value="GI">GI (peso)</option>
                                <option value="NO-GI">NO-GI (peso)</option>
                                <option value="ABS-GI">ABS GI</option>
                                <option value="ABS-NO-GI">ABS NO-GI</option>
                            </select>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleGenerateBrackets}
                                disabled={!events.length}
                            >
                                <ClipboardList size={14} />
                                Gerar chaves
                            </button>
                        </div>
                    </div>
                    <div className="bracket-toolbar">
                        <div className="search-input">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Buscar chave por numero ou categoria"
                                value={bracketSearch}
                                onChange={(event) => setBracketSearch(event.target.value)}
                                aria-label="Buscar chave"
                            />
                        </div>
                        <span className="tag">{filteredBrackets.length} chaves</span>
                    </div>
                    <div className="bracket-list">
                        {filteredBrackets.map((bracket) => {
                            const bracketAthletes = (bracket.seedIds || [])
                                .map((id) => athleteMap.get(id))
                                .filter(Boolean);
                            const matches = bracketAthletes.length
                                ? buildBracketMatches(bracket.seedIds || [], bracket.size || 0)
                                : [];
                            const eventLabel = eventMap[bracket.eventId]?.name || 'Sem evento';
                            const applied = Boolean(bracket.appliedAt);

                            return (
                                <div key={bracket.id} className="bracket-card">
                                    <div className="bracket-card__header">
                                        <div>
                                            <div className="bracket-number">Chave {bracket.number || '-'}</div>
                                            <div className="table-meta">{bracket.label}</div>
                                        </div>
                                        <div className="bracket-tags">
                                            <span className="tag">{bracket.mode || 'GI'}</span>
                                            {applied && <span className="tag bracket-tag--applied">Aplicado</span>}
                                        </div>
                                    </div>
                                    <div className="bracket-card__meta">
                                        Evento: {eventLabel} · Atletas: {bracketAthletes.length}
                                    </div>
                                    <div className="bracket-grid">
                                        <div className="bracket-matches">
                                            <div className="bracket-section-title">Rodada 1</div>
                                            {matches.map((match, index) => {
                                                const nameA = match.slotA ? athleteMap.get(match.slotA)?.nome : 'BYE';
                                                const nameB = match.slotB ? athleteMap.get(match.slotB)?.nome : 'BYE';
                                                return (
                                                    <div key={match.id} className="bracket-match">
                                                        <span className="bracket-seed">{nameA || 'Atleta'}</span>
                                                        <span className="bracket-vs">vs</span>
                                                        <span className="bracket-seed">{nameB || 'Atleta'}</span>
                                                        <span className="bracket-match__index">#{index + 1}</span>
                                                    </div>
                                                );
                                            })}
                                            {matches.length === 0 && (
                                                <div className="panel-subtitle">Sem atletas nesta chave.</div>
                                            )}
                                        </div>
                                        <div className="bracket-podium">
                                            <div className="bracket-section-title">Podio</div>
                                            <label className="bracket-field">
                                                <span>1º lugar</span>
                                                <select
                                                    className="input bracket-select"
                                                    value={bracket.podium?.goldId || ''}
                                                    onChange={(event) => setBracketPodium(bracket.id, { goldId: event.target.value })}
                                                    disabled={bracketAthletes.length === 0}
                                                >
                                                    <option value="">Selecionar atleta</option>
                                                    {bracketAthletes.map((athlete) => (
                                                        <option key={athlete.id} value={athlete.id}>{athlete.nome}</option>
                                                    ))}
                                                </select>
                                            </label>
                                            <label className="bracket-field">
                                                <span>2º lugar</span>
                                                <select
                                                    className="input bracket-select"
                                                    value={bracket.podium?.silverId || ''}
                                                    onChange={(event) => setBracketPodium(bracket.id, { silverId: event.target.value })}
                                                    disabled={bracketAthletes.length < 2}
                                                >
                                                    <option value="">Selecionar atleta</option>
                                                    {bracketAthletes.map((athlete) => (
                                                        <option key={athlete.id} value={athlete.id}>{athlete.nome}</option>
                                                    ))}
                                                </select>
                                            </label>
                                            <label className="bracket-field">
                                                <span>3º lugar</span>
                                                <select
                                                    className="input bracket-select"
                                                    value={bracket.podium?.bronzeId || ''}
                                                    onChange={(event) => setBracketPodium(bracket.id, { bronzeId: event.target.value })}
                                                    disabled={bracketAthletes.length < 3}
                                                >
                                                    <option value="">Selecionar atleta</option>
                                                    {bracketAthletes.map((athlete) => (
                                                        <option key={athlete.id} value={athlete.id}>{athlete.nome}</option>
                                                    ))}
                                                </select>
                                            </label>
                                            <button
                                                type="button"
                                                className="btn btn-primary bracket-apply"
                                                onClick={() => handleApplyBracketPodium(bracket.id)}
                                                disabled={bracketAthletes.length === 0}
                                            >
                                                {applied ? 'Reaplicar podio' : 'Aplicar podio'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredBrackets.length === 0 && (
                            <div className="panel-subtitle">Nenhuma chave encontrada.</div>
                        )}
                    </div>
                </section>
                <section className="panel">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">Resumo por faixa</div>
                            <div className="panel-subtitle">Distribuicao de pontos por graduacao</div>
                        </div>
                        <button
                            type="button"
                            className="tag tag-button"
                            onClick={handleRefreshBeltSummary}
                            title={`Atualizado as ${now.toLocaleTimeString('pt-BR')}`}
                        >
                            Atualizar
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
                                <div className="mini-chart__label">{belt.label}</div>
                            </div>
                        ))}
                    </div>
                </section>
                <section className="panel" id="athletes">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">Base de atletas</div>
                            <div className="panel-subtitle">Gerencie registros e ajuste pontuacoes rapidamente</div>
                        </div>
                        <div className="panel-actions">
                            <div className="search-input">
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder="Pesquisar por nome ou academia"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    aria-label="Pesquisar atleta"
                                />
                            </div>
                            {events.length > 0 && (
                                <select
                                    className="input select-compact"
                                    value={eventFilter}
                                    onChange={(event) => setEventFilter(event.target.value)}
                                    aria-label="Filtrar por evento"
                                >
                                    <option value="all">Todos os eventos</option>
                                    <option value="none">Sem evento</option>
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
                                    aria-label="Visualizacao em lista"
                                >
                                    <List size={14} />
                                </button>
                                <button
                                    type="button"
                                    className={`toggle-btn ${viewMode === 'cards' ? 'is-active' : ''}`}
                                    onClick={() => setViewMode('cards')}
                                    aria-label="Visualizacao em cards"
                                >
                                    <LayoutGrid size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {viewMode === 'table' ? (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Atleta</th>
                                    <th>Academia</th>
                                    <th className="points-col">Pontos</th>
                                    <th style={{ textAlign: 'right' }}>Acoes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAthletes.map((athlete) => {
                                    const eventLabel = eventMap[athlete.eventId]?.name || 'Sem evento';
                                    return (
                                    <tr key={athlete.id}>
                                        <td>
                                            <div className="table-name">{athlete.nome}</div>
                                            <div className="table-meta">
                                                {athlete.faixa || 'Faixa'} / {athlete.peso || 'Peso'} / {athlete.categoria || 'Categoria'} / {athlete.isNoGi ? 'NO-GI' : 'GI'} / {eventLabel}
                                            </div>
                                        </td>
                                        <td>{athlete.academia}</td>
                                        <td className="points-col">
                                            <span className="points-pill">{athlete.pontos} pts</span>
                                        </td>
                                        <td>
                                            <div className="row-actions">
                                                <div className="points-editor">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder="Pontos"
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
                                                        showFeedback('success', `Pontos limpos para ${athlete.nome}`);
                                                    }}
                                                    aria-label="Limpar pontos"
                                                >
                                                    <RotateCcw size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="action-btn action-btn--podium"
                                                    onClick={() => {
                                                        updateAthletePoints(athlete.id, { type: 'podium', position: 1 });
                                                        showFeedback('success', `Ouro para ${athlete.nome}`);
                                                    }}
                                                    aria-label="Registrar ouro"
                                                >
                                                    <Trophy size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="action-btn action-btn--podium-silver"
                                                    onClick={() => {
                                                        updateAthletePoints(athlete.id, { type: 'podium', position: 2 });
                                                        showFeedback('success', `Prata para ${athlete.nome}`);
                                                    }}
                                                    aria-label="Registrar prata"
                                                >
                                                    2
                                                </button>
                                                <button
                                                    type="button"
                                                    className="action-btn action-btn--podium-bronze"
                                                    onClick={() => {
                                                        updateAthletePoints(athlete.id, { type: 'podium', position: 3 });
                                                        showFeedback('success', `Bronze para ${athlete.nome}`);
                                                    }}
                                                    aria-label="Registrar bronze"
                                                >
                                                    3
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
                            {filteredAthletes.map((athlete) => {
                                const eventLabel = eventMap[athlete.eventId]?.name || 'Sem evento';
                                return (
                                <div key={athlete.id} className="athlete-card">
                                    <div className="athlete-card__header">
                                        <div>
                                            <div className="table-name">{athlete.nome}</div>
                                            <div className="table-meta">{athlete.academia}</div>
                                        </div>
                                        <span className="points-pill">{athlete.pontos} pts</span>
                                    </div>
                                    <div className="table-meta">
                                        {athlete.faixa || 'Faixa'} / {athlete.peso || 'Peso'} / {athlete.categoria || 'Categoria'} / {athlete.isNoGi ? 'NO-GI' : 'GI'} / {eventLabel}
                                    </div>
                                    <div className="athlete-card__actions">
                                        <div className="points-editor">
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="Pontos"
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
                                                showFeedback('success', `Pontos limpos para ${athlete.nome}`);
                                            }}
                                            aria-label="Limpar pontos"
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            className="action-btn action-btn--podium"
                                            onClick={() => {
                                                updateAthletePoints(athlete.id, { type: 'podium', position: 1 });
                                                showFeedback('success', `Ouro para ${athlete.nome}`);
                                            }}
                                            aria-label="Registrar ouro"
                                        >
                                            <Trophy size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            className="action-btn action-btn--podium-silver"
                                            onClick={() => {
                                                updateAthletePoints(athlete.id, { type: 'podium', position: 2 });
                                                showFeedback('success', `Prata para ${athlete.nome}`);
                                            }}
                                            aria-label="Registrar prata"
                                        >
                                            2
                                        </button>
                                        <button
                                            type="button"
                                            className="action-btn action-btn--podium-bronze"
                                            onClick={() => {
                                                updateAthletePoints(athlete.id, { type: 'podium', position: 3 });
                                                showFeedback('success', `Bronze para ${athlete.nome}`);
                                            }}
                                            aria-label="Registrar bronze"
                                        >
                                            3
                                        </button>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                    {filteredAthletes.length === 0 && (
                        <div className="panel-subtitle">Nenhum atleta encontrado.</div>
                    )}
                </section>
                <section className="panel" id="automation">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">Automacoes e atalhos</div>
                            <div className="panel-subtitle">Ferramentas organizadas para agilizar o trabalho</div>
                        </div>
                        <span className="tag">Rapido</span>
                    </div>
                    <div className="import-panel import-panel--admin">
                        <div>
                            <strong>Importar relacao por PDF</strong>
                            <span>Le o PDF e separa nome, faixa, categoria e academia.</span>
                        </div>
                        <div className="import-actions">
                            {events.length > 0 && (
                                <select value={importEventId} onChange={(event) => setImportEventId(event.target.value)}>
                                    <option value="">Sem evento</option>
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
                                Importar PDF
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
                                <div className="import-debug__title">Debug preview (primeiras linhas)</div>
                                <pre>{importDebug}</pre>
                            </div>
                        )}
                    </div>
                    <div className="action-grid">
                        <div className="action-card">
                            <strong>Importar arquivo</strong>
                            <span>Abra o seletor de PDF/TXT para atualizar o ranking.</span>
                            <div className="action-card__footer">
                                <button type="button" className="btn btn-ghost" onClick={handleImportRanking}>
                                    <Upload size={14} />
                                    Selecionar
                                </button>
                                <span className="tag">Ctrl + I</span>
                            </div>
                        </div>
                        <div className="action-card">
                            <strong>Exportar relatorio</strong>
                            <span>Gere o PDF oficial do evento ativo.</span>
                            <div className="action-card__footer">
                                <button type="button" className="btn btn-ghost" onClick={handleFinalizeEvent}>
                                    <Download size={14} />
                                    Gerar PDF
                                </button>
                                <span className="tag">Ctrl + E</span>
                            </div>
                        </div>
                        <div className="action-card">
                            <strong>Controle imediato</strong>
                            <span>Limpe resultados temporarios e reinicie o painel.</span>
                            <div className="action-card__footer">
                                <button type="button" className="btn btn-ghost" onClick={clearEventResults}>
                                    <Zap size={14} />
                                    Limpar
                                </button>
                                <span className="tag">Seguro</span>
                            </div>
                        </div>
                        <div className="action-card">
                            <strong>Limpar atletas</strong>
                            <span>Remove todos os atletas cadastrados do sistema.</span>
                            <div className="action-card__footer">
                                <button type="button" className="btn btn-danger" onClick={handleClearAthletes}>
                                    <AlertCircle size={14} />
                                    Limpar tudo
                                </button>
                                <span className="tag">Cuidado</span>
                            </div>
                        </div>
                    </div>

                    <div className="panel-header" style={{ marginTop: '1.8rem' }}>
                        <div>
                            <div className="panel-title">Atalhos de teclado</div>
                            <div className="panel-subtitle">Acesso direto para tarefas frequentes</div>
                        </div>
                    </div>
                    <div className="shortcut-list">
                        <span className="shortcut-pill">Ctrl + N novo atleta</span>
                        <span className="shortcut-pill">Ctrl + I importar ranking</span>
                        <span className="shortcut-pill">Ctrl + E exportar PDF</span>
                        <span className="shortcut-pill">Ctrl + L logs</span>
                    </div>
                </section>
                <section className="panel" id="activity">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">Atividade do sistema</div>
                            <div className="panel-subtitle">Auditoria em tempo real com logs recentes</div>
                        </div>
                        <button type="button" className="btn btn-ghost" onClick={() => setShowLogs(true)}>
                            <ClipboardList size={14} />
                            Ver todos
                        </button>
                    </div>
                    <div className="activity-list">
                        {recentLogs.map((log) => (
                            <div key={log.id} className="activity-item">
                                <span className="activity-time">{new Date(log.timestamp).toLocaleTimeString('pt-BR')}</span>
                                <span
                                    className={`activity-tag ${log.type === 'ERROR' ? 'is-error' : log.type === 'AUTH' ? 'is-auth' : ''}`}
                                >
                                    {log.type}
                                </span>
                                <div>
                                    <strong>{log.action}</strong>
                                    <div className="table-meta">{log.details}</div>
                                </div>
                            </div>
                        ))}
                        {recentLogs.length === 0 && (
                            <div className="activity-item">Nenhum registro recente.</div>
                        )}
                    </div>

                    <div className="panel-header" style={{ marginTop: '1.6rem' }}>
                        <div>
                            <div className="panel-title">Sessao segura</div>
                            <div className="panel-subtitle">Controle de acesso com confirmacao visual</div>
                        </div>
                        <button type="button" className="btn btn-primary" onClick={logout}>
                            <LogOut size={14} />
                            Encerrar sessao
                        </button>
                    </div>
                    {isLocalAuth && (
                        <div
                            className="action-grid"
                            style={{ marginTop: '1.2rem', gridTemplateColumns: 'minmax(0, 1fr)' }}
                        >
                            <div className="action-card">
                                <strong>Usuarios locais</strong>
                                <span>Gerencie senhas das contas do painel.</span>
                                {localUsers.length > 0 ? (
                                    <div className="shortcut-list">
                                        {localUsers.map((user) => (
                                            <span key={user.username} className="shortcut-pill">
                                                {user.name || user.username}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="panel-subtitle">Nenhum usuario cadastrado.</div>
                                )}
                                <div className="action-card__footer">
                                    <button type="button" className="btn btn-ghost" onClick={openUserResetModal}>
                                        <ShieldCheck size={14} />
                                        Redefinir senha
                                    </button>
                                    <span className="tag">Local</span>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </div>
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
                                    <div className="modal-title">Logs do sistema</div>
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowLogs(false)}>
                                        Fechar
                                    </button>
                                </div>
                                <div className="activity-list" style={{ overflowY: 'auto' }}>
                                    {logs.map((log) => (
                                        <div key={log.id} className="activity-item">
                                            <span className="activity-time">{new Date(log.timestamp).toLocaleTimeString('pt-BR')}</span>
                                            <span
                                                className={`activity-tag ${log.type === 'ERROR' ? 'is-error' : log.type === 'AUTH' ? 'is-auth' : ''}`}
                                            >
                                                {log.type}
                                            </span>
                                            <div>
                                                <strong>{log.action}</strong>
                                                <div className="table-meta">{log.details}</div>
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
                        >
                            <div className="modal-panel">
                                <div className="modal-header">
                                    <div className="modal-title">Editar evento</div>
                                    <button type="button" className="btn btn-ghost" onClick={handleCloseEditEvent}>
                                        Fechar
                                    </button>
                                </div>
                                {eventEditError && (
                                    <div className="login-error" role="alert">
                                        <AlertCircle size={18} />
                                        <p>{eventEditError}</p>
                                    </div>
                                )}
                                <form onSubmit={handleUpdateEvent}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div>
                                            <label className="table-meta">Nome do evento</label>
                                            <input
                                                className="input"
                                                type="text"
                                                value={eventEditForm.name}
                                                onChange={(event) => setEventEditForm({ ...eventEditForm, name: event.target.value })}
                                                placeholder="Ex: Etapa 1 - Regional"
                                                required
                                            />
                                        </div>
                                        <div className="form-grid">
                                            <div>
                                                <label className="table-meta">Data</label>
                                                <input
                                                    className="input"
                                                    type="date"
                                                    value={eventEditForm.date}
                                                    onChange={(event) => setEventEditForm({ ...eventEditForm, date: event.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="table-meta">Local</label>
                                                <input
                                                    className="input"
                                                    type="text"
                                                    value={eventEditForm.location}
                                                    onChange={(event) => setEventEditForm({ ...eventEditForm, location: event.target.value })}
                                                    placeholder="Ex: Arena Central"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-actions">
                                        <button type="button" className="btn btn-ghost" onClick={handleCloseEditEvent}>
                                            Cancelar
                                        </button>
                                        <button type="button" className="btn btn-danger" onClick={handleDeleteEvent}>
                                            <Trash2 size={14} />
                                            Apagar evento
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            Salvar alteracoes
                                        </button>
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
                                    <div className="modal-title">Novo atleta</div>
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                                        Cancelar
                                    </button>
                                </div>
                                <form onSubmit={handleAddAthlete}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div>
                                            <label className="table-meta">Nome completo</label>
                                            <input
                                                className="input"
                                                required
                                                type="text"
                                                placeholder="Ex: Rodrigo Cavaca"
                                                value={newAthlete.nome}
                                                onChange={(event) => setNewAthlete({ ...newAthlete, nome: event.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="table-meta">Evento</label>
                                            <select
                                                className="input"
                                                value={newAthlete.eventId}
                                                onChange={(event) => setNewAthlete({ ...newAthlete, eventId: event.target.value })}
                                            >
                                                <option value="">Sem evento</option>
                                                {events.map((event) => (
                                                    <option key={event.id} value={event.id}>{event.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-grid">
                                            <div>
                                                <label className="table-meta">Graduacao</label>
                                                <select
                                                    className="input"
                                                    value={newAthlete.faixa}
                                                    onChange={(event) => setNewAthlete({ ...newAthlete, faixa: event.target.value })}
                                                >
                                                    {['Branca', 'Branca/Cinza', 'Azul', 'Roxa', 'Marrom', 'Preta'].map((faixa) => (
                                                        <option key={faixa} value={faixa}>{faixa}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="table-meta">Peso</label>
                                                <input
                                                    className="input"
                                                    type="text"
                                                    placeholder={newAthlete.isAbsolute ? 'Absoluto' : 'Ex: Pena'}
                                                    value={newAthlete.peso}
                                                    disabled={newAthlete.isAbsolute}
                                                    onChange={(event) => setNewAthlete({ ...newAthlete, peso: event.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="table-meta">Categoria</label>
                                                <input
                                                    className="input"
                                                    type="text"
                                                    placeholder="Ex: Adulto"
                                                    value={newAthlete.categoria}
                                                    onChange={(event) => setNewAthlete({ ...newAthlete, categoria: event.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="table-meta">Tipo de categoria</label>
                                                <select
                                                    className="input"
                                                    value={newAthlete.isAbsolute ? 'ABS' : 'PESO'}
                                                    onChange={(event) => {
                                                        const isAbsolute = event.target.value === 'ABS';
                                                        setNewAthlete((prev) => ({
                                                            ...prev,
                                                            isAbsolute,
                                                            peso: isAbsolute
                                                                ? (prev.peso || 'Absoluto')
                                                                : (prev.peso === 'Absoluto' ? '' : prev.peso)
                                                        }));
                                                    }}
                                                >
                                                    <option value="PESO">Peso</option>
                                                    <option value="ABS">Absoluto</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="table-meta">Modalidade</label>
                                                <select
                                                    className="input"
                                                    value={newAthlete.isNoGi ? 'NO-GI' : 'GI'}
                                                    onChange={(event) => setNewAthlete({
                                                        ...newAthlete,
                                                        isNoGi: event.target.value === 'NO-GI'
                                                    })}
                                                >
                                                    <option value="GI">GI (com pano)</option>
                                                    <option value="NO-GI">NO-GI (sem pano)</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="table-meta">Equipe / Academia</label>
                                            <input
                                                className="input"
                                                required
                                                type="text"
                                                placeholder="Ex: Zenith JJ"
                                                value={newAthlete.academia}
                                                onChange={(event) => setNewAthlete({ ...newAthlete, academia: event.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-actions">
                                        <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                                            Cancelar
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            Salvar registro
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
                                    <div className="modal-title">Gerenciar atletas</div>
                                    <button type="button" className="btn btn-ghost" onClick={handleCloseAssignModal}>
                                        Fechar
                                    </button>
                                </div>
                                <div className="panel-subtitle">
                                    Evento: {assignEvent.name}. Selecionar move o atleta para este evento.
                                </div>
                                <div className="event-assign-toolbar">
                                    <div className="search-input">
                                        <Search size={16} />
                                        <input
                                            type="text"
                                            placeholder="Pesquisar atleta"
                                            value={assignSearch}
                                            onChange={(event) => setAssignSearch(event.target.value)}
                                            aria-label="Pesquisar atleta"
                                        />
                                    </div>
                                    <span className="tag">{selectedAssignCount} selecionados</span>
                                </div>
                                <div className="event-assign-list">
                                    {assignCandidates.map((athlete) => {
                                        const currentEvent = eventMap[athlete.eventId]?.name;
                                        const metaBase = `${athlete.academia || 'Sem academia'} - ${athlete.faixa || 'Faixa'} / ${athlete.peso || 'Peso'} / ${athlete.categoria || 'Categoria'}`;
                                        const eventNote = athlete.eventId && athlete.eventId !== assignEvent.id
                                            ? ` - Atual: ${currentEvent || 'Outro evento'}`
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
                                        <div className="panel-subtitle">Nenhum atleta encontrado.</div>
                                    )}
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="btn btn-ghost" onClick={handleCloseAssignModal}>
                                        Cancelar
                                    </button>
                                    <button type="button" className="btn btn-primary" onClick={handleSaveAssign}>
                                        Salvar vinculo
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
                                    <div className="modal-title">Redefinir senha</div>
                                    <button type="button" className="btn btn-ghost" onClick={closeUserResetModal}>
                                        Fechar
                                    </button>
                                </div>
                                {userResetList.length === 0 ? (
                                    <div className="panel-subtitle">Nenhum usuario disponivel.</div>
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
                                                <label className="table-meta">Usuario</label>
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
                                                <label className="table-meta">Nova senha</label>
                                                <input
                                                    className="input"
                                                    type="password"
                                                    minLength={6}
                                                    value={userResetPassword}
                                                    onChange={(event) => setUserResetPassword(event.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="table-meta">Confirmar senha</label>
                                                <input
                                                    className="input"
                                                    type="password"
                                                    minLength={6}
                                                    value={userResetConfirm}
                                                    onChange={(event) => setUserResetConfirm(event.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="form-actions">
                                            <button type="button" className="btn btn-ghost" onClick={closeUserResetModal}>
                                                Cancelar
                                            </button>
                                            <button type="submit" className="btn btn-primary" disabled={userResetLoading}>
                                                Atualizar senha
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;
