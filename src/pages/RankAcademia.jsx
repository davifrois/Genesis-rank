import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Trophy, Shield, MonitorPlay, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import api from '../services/api';
import './RankAcademia.css';

function RankAcademia() {
    const { events, academies, brackets = [], athletes = [] } = useStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const isTvMode = searchParams.get('display') === 'true';
    const [selectedEventId, setSelectedEventId] = useState('');
    const [ranking, setRanking] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recentWinners, setRecentWinners] = useState(new Set());
    const prevRankingRef = React.useRef([]);


    useEffect(() => {
        if (events && events.length > 0 && !selectedEventId) {
            setSelectedEventId(events[0].id);
        }
    }, [events, selectedEventId]);

    useEffect(() => {
        if (!selectedEventId) return;

        const academyMap = new Map();
        const normalize = (name) => {
            if (!name || typeof name !== 'string') return 'Sem academia';
            const val = name.trim();
            return val || 'Sem academia';
        };

        const eventAthletes = athletes.filter(a => a.eventId === selectedEventId);
        eventAthletes.forEach(athlete => {
            const aca = normalize(athlete.academia);
            if (!academyMap.has(aca)) academyMap.set(aca, { academyName: aca, gold: 0, silver: 0, bronze: 0, totalMedals: 0 });
        });

        const eventBrackets = brackets.filter(b => b.eventId === selectedEventId);
        eventBrackets.forEach(bracket => {
            const addAca = (acaName) => {
                const aca = normalize(acaName);
                if (!academyMap.has(aca)) academyMap.set(aca, { academyName: aca, gold: 0, silver: 0, bronze: 0, totalMedals: 0 });
                return academyMap.get(aca);
            };

            // Adds athletes from seeds (even with 0 medals)
            if (bracket.seedIds && Array.isArray(bracket.seedIds)) {
                bracket.seedIds.forEach(athleteId => {
                    if (athleteId) {
                        const ath = athletes.find(a => a.id === athleteId);
                        if (ath) addAca(ath.academia);
                    }
                });
            }
            
            // Also add athletes from matches if they don't have seeds (just to be safe)
            if (bracket.matches && Array.isArray(bracket.matches)) {
                bracket.matches.forEach(match => {
                    const athA = athletes.find(a => a.id === match.slotA);
                    const athB = athletes.find(a => a.id === match.slotB);
                    if (athA) addAca(athA.academia);
                    if (athB) addAca(athB.academia);
                });
            }

            if (bracket.podium) {
                const { goldId, silverId, bronzeId } = bracket.podium;
                if (goldId) {
                    const ath = athletes.find(a => a.id === goldId);
                    if (ath) { const aca = addAca(ath.academia); aca.gold++; aca.totalMedals++; }
                }
                if (silverId) {
                    const ath = athletes.find(a => a.id === silverId);
                    if (ath) { const aca = addAca(ath.academia); aca.silver++; aca.totalMedals++; }
                }
                if (bronzeId) {
                    const ath = athletes.find(a => a.id === bronzeId);
                    if (ath) { const aca = addAca(ath.academia); aca.bronze++; aca.totalMedals++; }
                }
            }
        });

        let rankingData = Array.from(academyMap.values());
        rankingData.sort((a, b) => {
            if (b.gold !== a.gold) return b.gold - a.gold;
            if (b.silver !== a.silver) return b.silver - a.silver;
            if (b.bronze !== a.bronze) return b.bronze - a.bronze;
            if (b.totalMedals !== a.totalMedals) return b.totalMedals - a.totalMedals;
            return a.academyName.localeCompare(b.academyName);
        });

        rankingData = rankingData.map((item, index) => {
            const newRank = index + 1;
            let trend = 'same';
            const oldItem = prevRankingRef.current.find(p => p.academyName === item.academyName);
            if (oldItem) {
                if (newRank < oldItem.rank) trend = 'up';
                else if (newRank > oldItem.rank) trend = 'down';
                else trend = oldItem.trend || 'same';
            }
            return { ...item, rank: newRank, trend };
        });
        
        // Check for medal increases to trigger flash animation
        const newFlashes = new Set();
        const prev = prevRankingRef.current;
        if (prev.length > 0) {
            rankingData.forEach(item => {
                const oldItem = prev.find(p => p.academyName === item.academyName);
                if (oldItem && item.totalMedals > oldItem.totalMedals) {
                    newFlashes.add(item.academyName);
                }
            });
        }
        
        if (newFlashes.size > 0) {
            setRecentWinners(newFlashes);
        }

        prevRankingRef.current = rankingData;
        setRanking(rankingData);
        setLoading(false);
    }, [selectedEventId, brackets, athletes]);

    // Calculate maximum medals to determine bar widths
    const maxMedals = useMemo(() => {
        if (ranking.length === 0) return 0;
        return Math.max(...ranking.map(r => r.totalMedals));
    }, [ranking]);

    // We only want to show the list if it's not empty, but we also want to gracefully handle loading.
    const showEmptyState = !loading && ranking.length === 0;
    const showContent = !loading && ranking.length > 0;

    const toggleTvMode = () => {
        if (isTvMode) {
            searchParams.delete('display');
        } else {
            searchParams.set('display', 'true');
        }
        setSearchParams(searchParams);
    };

    return (
        <div className={`rank-academia-wrapper ${isTvMode ? 'tv-mode' : ''}`}>
            <div className="ra-bg-glow top-left"></div>
            <div className="ra-bg-glow bottom-right"></div>
            
            <div className="ra-content">
                <button 
                    className="ra-tv-toggle" 
                    onClick={toggleTvMode} 
                    title={isTvMode ? "Sair do Modo Telão" : "Entrar no Modo Telão"}
                    style={{ zIndex: 100 }}
                >
                    {isTvMode ? <X size={24} /> : <MonitorPlay size={24} />}
                </button>

                {!isTvMode && (
                    <header className="ra-hero">
                        <motion.h1 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="ra-title"
                        >
                            Guerra das Academias
                        </motion.h1>
                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="ra-subtitle"
                        >
                            O campo de batalha definitivo. Qual equipe dominará o tatame?
                        </motion.p>

                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="ra-filter-container"
                        >
                            <label>Selecione o Evento</label>
                            <div className="ra-select-wrapper">
                                <select 
                                    value={selectedEventId} 
                                    onChange={(e) => setSelectedEventId(e.target.value)}
                                >
                                    {events.map(ev => (
                                        <option key={ev.id} value={ev.id}>{ev.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="ra-select-icon" size={24} />
                            </div>
                        </motion.div>
                    </header>
                )}

                <AnimatePresence mode="wait">
                    {loading && (
                        <motion.div 
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="ra-empty-state"
                        >
                            <div className="ra-loading-spinner"></div>
                            <h3>Calculando Resultados</h3>
                            <p>Aguarde enquanto somamos as medalhas deste evento...</p>
                        </motion.div>
                    )}
                    
                    {showEmptyState && (
                        <motion.div 
                            key="empty"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="ra-empty-state"
                        >
                            <div className="ra-empty-icon">🥋</div>
                            <h3>Nenhum Combate Registrado</h3>
                            <p>Ainda não há pódios finalizados para este evento. A guerra ainda não começou!</p>
                        </motion.div>
                    )}

                    {showContent && (
                        <motion.div 
                            key="content" 
                            initial={{ opacity: 0, y: 20 }} 
                            animate={{ opacity: 1, y: 0 }}
                            className="ra-chart-section"
                        >
                            <div className="ra-chart-title">
                                <Trophy color="#facc15" size={28} />
                                Top Academias por Medalhas
                            </div>

                            <motion.div className="ra-chart-container" layout>
                                <AnimatePresence>
                                    {ranking.map((item, index) => {
                                        // A small base width (e.g. 2%) so even 0 medals show a tiny bar
                                        const widthPercent = maxMedals > 0 
                                            ? Math.max((item.totalMedals / maxMedals) * 100, 2) 
                                            : 2;

                                        // Try to find the academy's real logo
                                        const academyDetails = (academies || []).find(a => 
                                            a.name && item.academyName && a.name.toLowerCase() === item.academyName.toLowerCase()
                                        );
                                        const logoUrl = academyDetails?.logoUrl;

                                        return (
                                            <motion.div 
                                                layout
                                                initial={{ opacity: 0, x: -50, scale: 1 }}
                                                animate={{ 
                                                    opacity: 1, 
                                                    x: 0, 
                                                    scale: recentWinners.has(item.academyName) ? 1.02 : 1 
                                                }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ 
                                                    layout: { type: "spring", stiffness: 300, damping: 30 },
                                                    opacity: { duration: 0.2 }
                                                }}
                                                key={item.academyName} 
                                                className={`ra-academy-row ${recentWinners.has(item.academyName) ? 'recent-winner' : ''}`}
                                            >
                                                <div className="ra-academy-info">
                                                    <div className="ra-academy-rank">
                                                        <div className="ra-rank-number">{item.rank}º</div>
                                                        <div className="ra-rank-trend">
                                                            {item.trend === 'up' && <TrendingUp size={16} color="#22c55e" strokeWidth={3} />}
                                                            {item.trend === 'down' && <TrendingDown size={16} color="#ef4444" strokeWidth={3} />}
                                                            {item.trend === 'same' && <Minus size={16} color="#64748b" strokeWidth={3} />}
                                                        </div>
                                                    </div>
                                                    <div className="ra-academy-logo">
                                                        {logoUrl ? (
                                                            <img src={logoUrl} alt={item.academyName} className="ra-real-logo" />
                                                        ) : (
                                                            <Shield size={20} color="#3b82f6" />
                                                        )}
                                                    </div>
                                                    <div className="ra-academy-name" title={item.academyName}>
                                                        {item.academyName}
                                                    </div>
                                                </div>

                                                <div className="ra-bar-wrapper">
                                                    <div className="ra-bar-track">
                                                        <motion.div 
                                                            className="ra-bar-fill"
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${widthPercent}%` }}
                                                            transition={{ duration: 1, ease: "easeOut" }}
                                                        />
                                                    </div>
                                                    
                                                    <div className="ra-bar-medals">
                                                        <div className="ra-medal-badge gold">
                                                            🥇 <span>{item.gold}</span>
                                                        </div>
                                                        <div className="ra-medal-badge silver">
                                                            🥈 <span>{item.silver}</span>
                                                        </div>
                                                        <div className="ra-medal-badge bronze">
                                                            🥉 <span>{item.bronze}</span>
                                                        </div>
                                                        <div className="ra-medal-badge total">
                                                            Total: <span>{item.totalMedals}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default RankAcademia;
