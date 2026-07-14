const fs = require('fs');

const path = 'src/pages/Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `                <section className="stats-grid">
                    <div className="stat-card stat-card--focus">
                        <div className="stat-card__icon">
                            <Users size={18} />
                        </div>
                        <div className="stat-card__value">{athletes.length}</div>
                        <div className="stat-card__label">{copy.stats.enrolled}</div>
                        <div className="stat-card__trend">{totals.activeAthletes} {copy.stats.activeTrend}</div>
                    </div>
                    <div className="stat-card stat-card--focus">
                        <div className="stat-card__icon">
                            <Trophy size={18} />
                        </div>
                        <div className="stat-card__value">{totals.totalPoints}</div>
                        <div className="stat-card__label">{copy.stats.totalPoints}</div>
                        <div className="stat-card__trend">{copy.stats.average} {totals.averagePoints} pts</div>
                    </div>
                    <div className="stat-card stat-card--focus">
                        <div className="stat-card__icon">
                            <Zap size={18} />
                        </div>
                        <div className="stat-card__value">{events.length}</div>
                        <div className="stat-card__label">{copy.stats.registeredEvents}</div>
                        <div className="stat-card__trend">{copy.stats.centralizedControl}</div>
                    </div>
                    <div className="stat-card stat-card--secondary">
                        <div className="stat-card__icon">
                            <Activity size={18} />
                        </div>
                        <div className="stat-card__value">{logs.length}</div>
                        <div className="stat-card__label">{copy.stats.records}</div>
                        <div className="stat-card__trend">{copy.stats.continuousMonitoring}</div>
                    </div>
                </section>`;

const replacementStr = `                <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
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
                </section>`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Stats grid replaced successfully.");
} else {
    console.error("Target string not found. Please check exact match.");
}
