const fs = require('fs');
const path = require('path');

const rankingPath = path.join(__dirname, 'src', 'pages', 'Ranking.jsx');
let content = fs.readFileSync(rankingPath, 'utf8');

const returnStart = "    return (";
const returnEnd = "export default Ranking;";

const startIndex = content.lastIndexOf(returnStart);
const endIndex = content.lastIndexOf(returnEnd);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find replacement anchors");
    process.exit(1);
}

const replacement = `    return (
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
                    <button className="ajp-gender-btn active">
                        <User size={16} />
                        MEN'S
                    </button>
                    <button className="ajp-gender-btn">
                        <User size={16} />
                        WOMEN'S
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
                                                to={\`/perfil-publico/\${athlete.id}\`}
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
`;

content = content.substring(0, startIndex) + replacement;
fs.writeFileSync(rankingPath, content, 'utf8');
console.log("Ranking.jsx return block replaced successfully.");
