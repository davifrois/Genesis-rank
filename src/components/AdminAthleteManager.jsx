import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { useI18n } from '../hooks/useI18n';
import {
    Search, QrCode, AlertCircle, CheckCircle2, XCircle,
    Save, Users, Edit3, X, ChevronDown, StickyNote,
    RotateCcw, Trash2, Filter, Settings
} from 'lucide-react';
import AthleteCheckinModal from './AthleteCheckinModal';
import './AdminAthleteManager.css';

// ─── Toast interno ────────────────────────────────────────────────
let _setToast = null;
const toast = (msg, type = 'success') => {
    if (_setToast) _setToast({ msg, type, id: Date.now() });
};

function InternalToast() {
    const [item, setItem] = useState(null);
    _setToast = setItem;
    useEffect(() => {
        if (!item) return;
        const t = setTimeout(() => setItem(null), 3500);
        return () => clearTimeout(t);
    }, [item]);
    if (!item) return null;
    return (
        <div className={`aam-toast aam-toast--${item.type}`}>
            {item.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{item.msg}</span>
        </div>
    );
}

// ─── Célula editável inline ────────────────────────────────────────
function InlineCell({ value, onSave, type = 'text', options = [], placeholder = '' }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value || '');
    const inputRef = useRef(null);

    useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

    const commit = () => {
        if (draft !== value) onSave(draft);
        setEditing(false);
    };
    const cancel = () => { setDraft(value || ''); setEditing(false); };

    const handleKey = (e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') cancel();
    };

    if (!editing) {
        return (
            <span
                className="aam-cell-display"
                onClick={() => { setDraft(value || ''); setEditing(true); }}
                title="Clique para editar"
            >
                {value || <em className="aam-cell-empty">—</em>}
                <Edit3 size={11} className="aam-cell-edit-icon" />
            </span>
        );
    }

    if (type === 'select') {
        return (
            <div className="aam-cell-edit">
                <select
                    ref={inputRef}
                    className="aam-input"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                >
                    <option value="">Selecione...</option>
                    {options.map(o => (
                        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
                    ))}
                </select>
                <button className="aam-btn-icon ok" onClick={commit}><Save size={13} /></button>
                <button className="aam-btn-icon cancel" onClick={cancel}><X size={13} /></button>
            </div>
        );
    }

    return (
        <div className="aam-cell-edit">
            <input
                ref={inputRef}
                className="aam-input"
                type={type}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={handleKey}
                placeholder={placeholder}
                list={type === 'text' && options.length ? `datalist-${placeholder}` : undefined}
            />
            {type === 'text' && options.length > 0 && (
                <datalist id={`datalist-${placeholder}`}>
                    {options.map(o => <option key={o} value={o} />)}
                </datalist>
            )}
            <button className="aam-btn-icon ok" onClick={commit}><Save size={13} /></button>
            <button className="aam-btn-icon cancel" onClick={cancel}><X size={13} /></button>
        </div>
    );
}

// ─── Componente principal ──────────────────────────────────────────
export default function AdminAthleteManager() {
    const {
        athletes,
        events,
        updateAthlete,
        removeAthlete,
        generateBrackets,
        activeEventId,
        currentUser,
        logs
    } = useStore();
    const { uiLanguage } = useI18n();

    // Busca
    const [searchTerm, setSearchTerm] = useState('');
    const searchRef = useRef(null);

    // Filtros
    const [filterMode, setFilterMode] = useState('all'); // 'all' | 'alerts' | 'evento'
    const [filterEventId, setFilterEventId] = useState(activeEventId || 'all');

    // Seleção em massa
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [showMassPanel, setShowMassPanel] = useState(false);
    const [massCategory, setMassCategory] = useState('');
    const [massEventId, setMassEventId] = useState('');

    // Observações internas
    const [showNoteFor, setShowNoteFor] = useState(null);
    const [noteDraft, setNoteDraft] = useState('');

    // Pesagem rápida
    const [weightSuggest, setWeightSuggest] = useState(null); // { athleteId, categories }

    // Emergência
    const [emergencyTarget, setEmergencyTarget] = useState(null);
    const [emergencyAction, setEmergencyAction] = useState('credit'); // 'credit' | 'refund'
    const [emergencyReason, setEmergencyReason] = useState('');

    useEffect(() => { searchRef.current?.focus(); }, []);

    // Check-in modal
    const [checkinTarget, setCheckinTarget] = useState(null);

    // ─── Dados derivados ─────────────────────────────────────────
    const academies = useMemo(() => {
        const set = new Set();
        athletes.forEach(a => { if (a.academia) set.add(a.academia); });
        return Array.from(set).sort();
    }, [athletes]);

    const categories = useMemo(() => {
        const set = new Set();
        athletes.forEach(a => { if (a.categoria) set.add(a.categoria); });
        events.forEach(ev => {
            (ev.categories || []).forEach(c => set.add(c));
        });
        return Array.from(set).sort();
    }, [athletes, events]);

    const weights = useMemo(() => {
        const set = new Set();
        athletes.forEach(a => { if (a.peso) set.add(a.peso); });
        return Array.from(set).sort();
    }, [athletes]);

    const alertCount = useMemo(() =>
        athletes.filter(a => !a.categoria || !a.peso || !a.academia).length,
        [athletes]
    );

    const filtered = useMemo(() => {
        let list = athletes;

        // Filtro de evento
        if (filterEventId !== 'all') {
            list = list.filter(a => a.eventId === filterEventId);
        }

        // Filtro de alerta
        if (filterMode === 'alerts') {
            list = list.filter(a => !a.categoria || !a.peso || !a.academia);
        }

        // Busca
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim();
            list = list.filter(a =>
                (a.nome || '').toLowerCase().includes(term) ||
                (a.academia || '').toLowerCase().includes(term) ||
                (a.id || '').toLowerCase() === term
            );
        }

        return list;
    }, [athletes, filterMode, filterEventId, searchTerm]);

    // Efeito de "Pulo" quando o QR Code é escaneado (ID exato)
    const exactMatchId = useMemo(() => {
        if (searchTerm.length > 5) {
            const found = filtered.find(a => a.id.toLowerCase() === searchTerm.toLowerCase().trim());
            return found ? found.id : null;
        }
        return null;
    }, [filtered, searchTerm]);

    // ─── Edição inline ────────────────────────────────────────────
    const saveField = useCallback((id, field, value) => {
        const athlete = athletes.find(a => a.id === id);
        if (!athlete) return;
        const ok = updateAthlete(id, { [field]: value }, { actor: currentUser?.name || 'ADM' });
        if (ok) {
            toast(`"${athlete.nome}" → ${field}: "${value}"`, 'success');
            // Se mudou categoria, recalcular chaves do evento
            if (field === 'categoria' && athlete.eventId) {
                try { generateBrackets({ eventId: athlete.eventId, replaceExisting: true }); } catch {}
                toast('Chaves recalculadas!', 'success');
            }
        }
    }, [athletes, updateAthlete, currentUser, generateBrackets]);

    // ─── Seleção ─────────────────────────────────────────────────
    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const s = new Set(prev);
            s.has(id) ? s.delete(id) : s.add(id);
            return s;
        });
    };
    const selectAll = () => setSelectedIds(new Set(filtered.map(a => a.id)));
    const clearSelection = () => { setSelectedIds(new Set()); setShowMassPanel(false); };

    // ─── Ações em Massa ───────────────────────────────────────────
    const applyMassEdit = () => {
        if (selectedIds.size === 0) return;
        let changed = 0;
        selectedIds.forEach(id => {
            const updates = {};
            if (massCategory) updates.categoria = massCategory;
            if (massEventId) updates.eventId = massEventId;
            if (Object.keys(updates).length) {
                const ok = updateAthlete(id, updates, { actor: currentUser?.name || 'ADM' });
                if (ok) changed++;
            }
        });
        if (massCategory && changed > 0) {
            // Recalcular todas as chaves afetadas
            const eventIds = new Set(
                athletes.filter(a => selectedIds.has(a.id)).map(a => massEventId || a.eventId).filter(Boolean)
            );
            eventIds.forEach(evId => {
                try { generateBrackets({ eventId: evId, replaceExisting: true }); } catch {}
            });
        }
        toast(`${changed} atleta(s) atualizados com sucesso!`, 'success');
        setMassCategory('');
        setMassEventId('');
        setShowMassPanel(false);
        setSelectedIds(new Set());
    };

    // ─── Pesagem ─────────────────────────────────────────────────
    const handleWeighOk = (id) => {
        saveField(id, 'pesoOk', true);
        toast('PESO OK ✓', 'success');
        setWeightSuggest(null);
    };

    const handleWeighFail = (athlete) => {
        saveField(athlete.id, 'pesoOk', false);
        // Sugerir categorias de peso acima
        const suggest = categories.filter(c => c !== athlete.categoria).slice(0, 3);
        setWeightSuggest({ athleteId: athlete.id, suggestions: suggest, athleteName: athlete.nome });
        toast(`Falha de peso para ${athlete.nome}. Sugestões de remanejamento abaixo.`, 'error');
    };

    const applyWeightSuggest = (athleteId, newCat) => {
        saveField(athleteId, 'categoria', newCat);
        setWeightSuggest(null);
    };

    // ─── Observações ─────────────────────────────────────────────
    const openNote = (athlete) => {
        setShowNoteFor(athlete.id);
        setNoteDraft(athlete._adminNotes || '');
    };
    const saveNote = (id) => {
        updateAthlete(id, { _adminNotes: noteDraft }, { actor: currentUser?.name || 'ADM' });
        setShowNoteFor(null);
        toast('Observação salva.', 'success');
    };

    // ─── Cancelamento Emergencial ─────────────────────────────────
    const triggerEmergency = (athlete) => {
        setEmergencyTarget(athlete);
        setEmergencyAction('credit');
        setEmergencyReason('');
    };

    const confirmEmergency = () => {
        if (!emergencyTarget) return;
        const msg = emergencyAction === 'credit' 
            ? `Inscrição de ${emergencyTarget.nome} cancelada. Crédito gerado para o próximo evento.`
            : `Inscrição de ${emergencyTarget.nome} cancelada. Estorno PIX solicitado.`;
        
        updateAthlete(emergencyTarget.id, { 
            status: emergencyAction === 'credit' ? 'cancelado' : 'estornado',
            _adminNotes: `${emergencyTarget._adminNotes || ''}\n[EMERGENCIA ${new Date().toLocaleDateString()}]: ${emergencyAction.toUpperCase()} - Motivo: ${emergencyReason}`
        });

        toast(msg, 'error');
        setEmergencyTarget(null);
    };

    // ─── Remove ───────────────────────────────────────────────────
    const handleRemove = (athlete) => {
        if (!window.confirm(`Remover "${athlete.nome}" permanentemente? Isso apagará todos os dados.`)) return;
        removeAthlete(athlete.id);
        toast(`${athlete.nome} removido.`, 'error');
    };

    // ─── Render ───────────────────────────────────────────────────
    return (
        <div className="aam-shell">
            <InternalToast />

            {/* ── Topbar ── */}
            <div className="aam-topbar">
                <div className="aam-search-wrap">
                    <QrCode size={18} className="aam-search-icon" />
                    <input
                        ref={searchRef}
                        className="aam-search"
                        type="text"
                        placeholder="Buscar por nome, academia ou ID do QR Code..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button className="aam-search-clear" onClick={() => setSearchTerm('')}>
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="aam-topbar-filters">
                    <select
                        className="aam-select"
                        value={filterEventId}
                        onChange={e => setFilterEventId(e.target.value)}
                    >
                        <option value="all">Todos os eventos</option>
                        {events.map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.name}</option>
                        ))}
                    </select>

                    <button
                        className={`aam-btn-filter ${filterMode === 'alerts' ? 'active' : ''}`}
                        onClick={() => setFilterMode(m => m === 'alerts' ? 'all' : 'alerts')}
                    >
                        <AlertCircle size={15} />
                        Alertas {alertCount > 0 && <span className="aam-badge">{alertCount}</span>}
                    </button>

                    {selectedIds.size > 0 ? (
                        <button className="aam-btn-mass" onClick={() => setShowMassPanel(p => !p)}>
                            <Users size={15} />
                            Ações em Massa ({selectedIds.size})
                        </button>
                    ) : (
                        <button className="aam-btn-mass disabled" onClick={selectAll}>
                            <Users size={15} />
                            Selecionar todos ({filtered.length})
                        </button>
                    )}

                    <div className="aam-topbar-divider" />

                    <button className="aam-btn-secondary" onClick={() => window.print()} title="Imprimir lista filtrada">
                        <Save size={15} /> Relatório
                    </button>
                </div>
            </div>

            {/* ── Painel de Ações em Massa ── */}
            {showMassPanel && selectedIds.size > 0 && (
                <div className="aam-mass-panel">
                    <span className="aam-mass-label">
                        <Users size={15} /> {selectedIds.size} atleta(s) selecionados
                    </span>
                    <select
                        className="aam-select"
                        value={massCategory}
                        onChange={e => setMassCategory(e.target.value)}
                    >
                        <option value="">Mudar categoria para...</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select
                        className="aam-select"
                        value={massEventId}
                        onChange={e => setMassEventId(e.target.value)}
                    >
                        <option value="">Mover para evento...</option>
                        {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                    </select>
                    <button className="aam-btn-apply" onClick={applyMassEdit}>
                        <Save size={14} /> Aplicar e Recalcular Chaves
                    </button>
                    <button className="aam-btn-cancel-mass" onClick={clearSelection}>
                        <X size={14} /> Cancelar
                    </button>
                </div>
            )}

            {/* ── Sugestão de Remanejamento por Peso ── */}
            {weightSuggest && (
                <div className="aam-weight-suggest">
                    <AlertCircle size={16} />
                    <strong>{weightSuggest.athleteName}</strong> falhou na pesagem.
                    <span>Sugestões de categoria:</span>
                    {weightSuggest.suggestions.map(c => (
                        <button
                            key={c}
                            className="aam-btn-suggest"
                            onClick={() => applyWeightSuggest(weightSuggest.athleteId, c)}
                        >
                            {c}
                        </button>
                    ))}
                    <button className="aam-btn-icon cancel" onClick={() => setWeightSuggest(null)}>
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* ── Cabeçalho da tabela ── */}
            <div className="aam-table-header">
                <span className="aam-col-check">
                    <input
                        type="checkbox"
                        checked={filtered.length > 0 && selectedIds.size === filtered.length}
                        onChange={e => e.target.checked ? selectAll() : clearSelection()}
                    />
                </span>
                <span className="aam-col-name">Atleta</span>
                <span className="aam-col-academy">Academia</span>
                <span className="aam-col-cat">Categoria</span>
                <span className="aam-col-weight">Peso</span>
                <span className="aam-col-abs" title="Inscrição no Absoluto">Abs</span>
                <span className="aam-col-belt">Faixa</span>
                <span className="aam-col-status">Status</span>
                <span className="aam-col-weighin">Pesagem</span>
                <span className="aam-col-actions">Ações</span>
            </div>

            {/* ── Lista de atletas ── */}
            <div className="aam-list">
                {filtered.length === 0 && (
                    <div className="aam-empty">
                        <Search size={32} />
                        <p>Nenhum atleta encontrado.</p>
                    </div>
                )}

                {filtered.map(athlete => {
                    const isSelected = selectedIds.has(athlete.id);
                    const isExactMatch = athlete.id === exactMatchId;
                    const hasAlert = !athlete.categoria || !athlete.peso || !athlete.academia;
                    const eventLabel = events.find(e => e.id === athlete.eventId)?.name || '—';

                    return (
                        <div
                            key={athlete.id}
                            id={`athlete-${athlete.id}`}
                            className={`aam-row ${isSelected ? 'selected' : ''} ${isExactMatch ? 'highlight' : ''} ${hasAlert ? 'alert' : ''} ${athlete.pesoOk === true ? 'peso-ok' : ''} ${athlete.pesoOk === false ? 'peso-fail' : ''}`}
                        >
                            {/* Check */}
                            <span className="aam-col-check">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelect(athlete.id)}
                                />
                            </span>

                            {/* Nome */}
                            <span className="aam-col-name">
                                {hasAlert && <AlertCircle size={12} className="aam-row-alert-icon" />}
                                <InlineCell
                                    value={athlete.nome}
                                    onSave={v => saveField(athlete.id, 'nome', v)}
                                    placeholder="Nome"
                                />
                                <span className="aam-row-event">{eventLabel}</span>
                            </span>

                            {/* Academia */}
                            <span className="aam-col-academy">
                                <InlineCell
                                    value={athlete.academia}
                                    onSave={v => saveField(athlete.id, 'academia', v)}
                                    placeholder="Academia"
                                    options={academies}
                                />
                            </span>

                            {/* Categoria */}
                            <span className="aam-col-cat">
                                <InlineCell
                                    value={athlete.categoria}
                                    onSave={v => saveField(athlete.id, 'categoria', v)}
                                    placeholder="Categoria"
                                    options={categories}
                                />
                            </span>

                            {/* Peso */}
                            <span className="aam-col-weight">
                                <InlineCell
                                    value={athlete.peso}
                                    onSave={v => saveField(athlete.id, 'peso', v)}
                                    placeholder="Peso"
                                    options={weights}
                                />
                            </span>

                            {/* Absoluto */}
                            <span className="aam-col-abs">
                                <input 
                                    type="checkbox" 
                                    checked={athlete.isAbsolute || false} 
                                    onChange={e => saveField(athlete.id, 'isAbsolute', e.target.checked)}
                                />
                            </span>

                            {/* Faixa */}
                            <span className="aam-col-belt">
                                <InlineCell
                                    value={athlete.faixa}
                                    type="select"
                                    options={['Branca','Cinza','Amarela','Laranja','Verde','Azul','Roxa','Marrom','Preta']}
                                    onSave={v => saveField(athlete.id, 'faixa', v)}
                                />
                            </span>

                            {/* Status inscrição */}
                            <span className="aam-col-status">
                                <InlineCell
                                    value={athlete.status || 'confirmado'}
                                    type="select"
                                    options={[
                                        { value: 'confirmado', label: '✅ Confirmado' },
                                        { value: 'pendente', label: '⏳ Pendente' },
                                        { value: 'cancelado', label: '❌ Cancelado' },
                                        { value: 'estornado', label: '↩ Estornado' },
                                    ]}
                                    onSave={v => saveField(athlete.id, 'status', v)}
                                />
                            </span>

                            {/* Pesagem */}
                            <span className="aam-col-weighin">
                                {athlete.pesoOk === true ? (
                                    <button
                                        className="aam-btn-weighin ok"
                                        onClick={() => saveField(athlete.id, 'pesoOk', null)}
                                        title="Clique para desfazer"
                                    >
                                        <CheckCircle2 size={14} /> OK
                                    </button>
                                ) : athlete.pesoOk === false ? (
                                    <button
                                        className="aam-btn-weighin fail"
                                        onClick={() => handleWeighFail(athlete)}
                                        title="Clique para ver sugestões"
                                    >
                                        <XCircle size={14} /> FALHA
                                    </button>
                                ) : (
                                    <div className="aam-weighin-btns">
                                        <button
                                            className="aam-btn-weighin ok"
                                            onClick={() => handleWeighOk(athlete.id)}
                                        >
                                            <CheckCircle2 size={13} /> PESO OK
                                        </button>
                                        <button
                                            className="aam-btn-weighin fail"
                                            onClick={() => handleWeighFail(athlete)}
                                        >
                                            <XCircle size={13} /> FALHA
                                        </button>
                                    </div>
                                )}
                            </span>

                            {/* Ações */}
                            <span className="aam-col-actions">
                                <button
                                    className="aam-btn-icon"
                                    style={{ color: 'var(--primary-color)' }}
                                    onClick={() => setCheckinTarget(athlete)}
                                    title="Check-in / Editar Inscrição"
                                >
                                    <Settings size={14} />
                                </button>
                                <button
                                    className={`aam-btn-icon note ${athlete._adminNotes ? 'has-note' : ''}`}
                                    onClick={() => openNote(athlete)}
                                    title={athlete._adminNotes ? `Nota: ${athlete._adminNotes}` : 'Adicionar observação interna'}
                                >
                                    <StickyNote size={14} />
                                </button>
                                <button
                                    className="aam-btn-icon emergency"
                                    onClick={() => triggerEmergency(athlete)}
                                    title="Cancelamento Emergencial (Estorno/Crédito)"
                                >
                                    <XCircle size={14} />
                                </button>
                                <button
                                    className="aam-btn-icon danger"
                                    onClick={() => handleRemove(athlete)}
                                    title="Remover permanentemente"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* ── Modal de Cancelamento Emergencial ── */}
            {emergencyTarget && (
                <div className="aam-modal-backdrop" onClick={() => setEmergencyTarget(null)}>
                    <div className="aam-modal aam-modal--emergency" onClick={e => e.stopPropagation()}>
                        <div className="aam-modal-header">
                            <XCircle size={18} color="#ff4d4d" />
                            <strong>Cancelamento Crítico — {emergencyTarget.nome}</strong>
                            <button className="aam-btn-icon cancel" onClick={() => setEmergencyTarget(null)}>
                                <X size={16} />
                            </button>
                        </div>
                        
                        <div className="aam-emergency-body">
                            <p className="aam-modal-hint">Como deseja processar o cancelamento deste atleta?</p>
                            
                            <div className="aam-emergency-options">
                                <label className={`aam-emergency-opt ${emergencyAction === 'credit' ? 'active' : ''}`}>
                                    <input type="radio" name="e-action" value="credit" checked={emergencyAction === 'credit'} onChange={() => setEmergencyAction('credit')} />
                                    <div className="aam-emergency-opt-content">
                                        <strong>Gerar Crédito</strong>
                                        <span>O atleta poderá usar o valor em um evento futuro da Genesis.</span>
                                    </div>
                                </label>
                                
                                <label className={`aam-emergency-opt ${emergencyAction === 'refund' ? 'active' : ''}`}>
                                    <input type="radio" name="e-action" value="refund" checked={emergencyAction === 'refund'} onChange={() => setEmergencyAction('refund')} />
                                    <div className="aam-emergency-opt-content">
                                        <strong>Estorno via PIX</strong>
                                        <span>Solicita a devolução do dinheiro para a conta de origem.</span>
                                    </div>
                                </label>
                            </div>

                            <label className="table-meta">Motivo do cancelamento (Obrigatório)</label>
                            <textarea 
                                className="aam-textarea" 
                                placeholder="Ex: Lesão comprovada, erro de categoria não resolvido..."
                                value={emergencyReason}
                                onChange={e => setEmergencyReason(e.target.value)}
                                rows={3}
                            />
                        </div>

                        <div className="aam-modal-footer">
                            <button className="aam-btn-ghost" onClick={() => setEmergencyTarget(null)}>Manter Inscrição</button>
                            <button 
                                className="aam-btn-primary danger" 
                                disabled={!emergencyReason.trim()}
                                onClick={confirmEmergency}
                            >
                                Confirmar Cancelamento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal de Observação Interna ── */}
            {showNoteFor && (() => {
                const ath = athletes.find(a => a.id === showNoteFor);
                if (!ath) return null;
                return (
                    <div className="aam-modal-backdrop" onClick={() => setShowNoteFor(null)}>
                        <div className="aam-modal" onClick={e => e.stopPropagation()}>
                            <div className="aam-modal-header">
                                <StickyNote size={16} />
                                <strong>Observação Interna — {ath.nome}</strong>
                                <button className="aam-btn-icon cancel" onClick={() => setShowNoteFor(null)}>
                                    <X size={16} />
                                </button>
                            </div>
                            <textarea
                                className="aam-textarea"
                                value={noteDraft}
                                onChange={e => setNoteDraft(e.target.value)}
                                placeholder='Ex: "Atleta pagou no Pix na hora" ou "Troca autorizada por erro no sistema"'
                                rows={4}
                                autoFocus
                            />
                            <div className="aam-modal-footer">
                                <button className="aam-btn-primary" onClick={() => saveNote(showNoteFor)}>
                                    <Save size={14} /> Salvar Observação
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── Rodapé ── */}
            <div className="aam-footer">
                <span>{filtered.length} atleta(s) exibidos de {athletes.length} total</span>
                <span>
                    ✅ {athletes.filter(a => a.pesoOk === true).length} OK &nbsp;|&nbsp;
                    ❌ {athletes.filter(a => a.pesoOk === false).length} Falha &nbsp;|&nbsp;
                    ⚠️ {alertCount} Alertas
                </span>
            </div>
            {/* ── Modal de Check-in ── */}
            <AthleteCheckinModal
                isOpen={!!checkinTarget}
                onClose={() => setCheckinTarget(null)}
                athlete={checkinTarget}
                onSave={(data) => {
                    if (data.categoria !== checkinTarget?.categoria && checkinTarget?.eventId) {
                        try { generateBrackets({ eventId: checkinTarget.eventId, replaceExisting: true }); } catch {}
                        toast('Atleta atualizado e chaves recalibradas.', 'success');
                    } else {
                        toast('Atleta atualizado com sucesso.', 'success');
                    }
                }}
            />
        </div>
    );
}
