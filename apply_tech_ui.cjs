const fs = require('fs');

const path = 'src/pages/Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

const anchorStr = `<span>{copy.stats.average} {totals.averagePoints} pts</span>
                        </div>
                    </div>
                </section>`;

if (content.includes(anchorStr)) {
    const newWidgets = `
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
                {/* FIM NOVOS WIDGETS TECNOLÓGICOS */}`;

    content = content.replace(anchorStr, anchorStr + newWidgets);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Tech UI appended successfully.");
} else {
    console.error("Anchor string not found!");
}
