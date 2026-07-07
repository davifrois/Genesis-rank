const fs = require('fs');
const path = require('path');

const rankingPath = path.join(__dirname, 'src', 'pages', 'Ranking.jsx');
let content = fs.readFileSync(rankingPath, 'utf8');

const searchAnchor = "const normalizedSearch = useMemo(() => normalizeSearchTerm(deferredSearch), [deferredSearch]);";

const newMetricsLogic = `
    const athleteCommunityRows = useMemo(() => {
        return eventFilteredAthletes.map(athlete => {
            const history = Array.isArray(athlete.historico) ? athlete.historico : [];
            let wins = 0;
            let losses = 0;
            let totalGold = 0;
            let podiums = 0;
            let totalMatches = 0;
            let totalPoints = Number(athlete.pontos) || 0;
            
            history.forEach(item => {
                const type = (item?.type || '').toString().toLowerCase().trim();
                if (type === 'win') wins += 1;
                if (type === 'loss') losses += 1;
                if (type === 'podium') {
                    const position = Number(item?.position || 0);
                    if ([1, 2, 3].includes(position)) podiums += 1;
                    if (position === 1) totalGold += 1;
                }
            });
            totalMatches = Math.max(history.filter(item => ['win', 'loss'].includes((item?.type || '').toString().toLowerCase().trim())).length, 1);
            
            const fights = wins + losses > 0 ? wins + losses : totalMatches;
            const winRate = fights > 0 ? Math.round((wins / fights) * 100) : 0;
            const winDiff = wins - losses;
            
            return {
                athlete,
                wins,
                losses,
                fights,
                winRate,
                totalPoints,
                totalGold,
                podiums,
                winDiff
            };
        });
    }, [eventFilteredAthletes]);

    const topGold = useMemo(() => {
        return [...athleteCommunityRows]
            .sort((a, b) => {
                if (b.totalGold !== a.totalGold) return b.totalGold - a.totalGold;
                return b.totalPoints - a.totalPoints;
            })
            .slice(0, 100);
    }, [athleteCommunityRows]);

    const topWinrate = useMemo(() => {
        return [...athleteCommunityRows]
            .sort((a, b) => {
                if (b.winDiff !== a.winDiff) return b.winDiff - a.winDiff;
                return b.totalPoints - a.totalPoints;
            })
            .slice(0, 100);
    }, [athleteCommunityRows]);

    const topActive = useMemo(() => {
        return [...athleteCommunityRows]
            .sort((a, b) => {
                if (b.fights !== a.fights) return b.fights - a.fights;
                return b.totalPoints - a.totalPoints;
            })
            .slice(0, 100);
    }, [athleteCommunityRows]);

    const renderTopList = (items, type) => {
        const title = type === 'gold'
            ? 'MOST GOLD MEDALS'
            : type === 'winrate'
                ? 'BEST WIN/LOSS DIFFERENCE'
                : 'MOST ACTIVE ATHLETE';

        return (
            <article className="athlete-col-card">
                <header className="athlete-col-header">
                    <h3>{title}</h3>
                </header>
                <div className="athlete-col-list">
                    {items.length === 0 ? (
                        <div className="empty-col-state" style={{color: '#a1a1aa', textAlign: 'center', padding: '20px'}}>Nenhum atleta encontrado.</div>
                    ) : (
                        items.map((item, index) => {
                            const athlete = item.athlete;
                            const countryCode = countryCodeFromAthlete(athlete);
                            const photoUrl = resolvePhotoUrl(athlete);
                            
                            let tags = null;
                            if (type === 'gold') {
                                tags = (
                                    <>
                                        <div className="athlete-col-pill is-gold">
                                            <span>[{item.totalGold}] golds</span>
                                        </div>
                                        <div className="athlete-col-pill is-dark">
                                            <span>[{item.wins} wins / {item.losses} losses]</span>
                                        </div>
                                    </>
                                );
                            } else if (type === 'winrate') {
                                tags = (
                                    <>
                                        <div className="athlete-col-pill is-blue">
                                            <span>+{item.winDiff}</span>
                                        </div>
                                        <div className="athlete-col-pill is-dark">
                                            <span>[{item.wins} wins / {item.losses} losses]</span>
                                        </div>
                                    </>
                                );
                            } else if (type === 'active') {
                                tags = (
                                    <>
                                        <div className="athlete-col-pill is-blue">
                                            <span>{item.fights} matches</span>
                                        </div>
                                        <div className="athlete-col-pill is-dark">
                                            <span>[{item.wins} wins / {item.losses} losses]</span>
                                        </div>
                                    </>
                                );
                            }

                            return (
                                <div key={athlete.id} className="athlete-col-item">
                                    <div className="athlete-col-rank">{index + 1}.</div>
                                    <div className="athlete-col-avatar">
                                        {photoUrl ? <img src={photoUrl} alt={athlete.nome} loading="lazy" /> : <User size={24} color="#aaa" />}
                                    </div>
                                    <div className="athlete-col-details">
                                        <Link to={\`/perfil-publico/\${athlete.id}\`} className="athlete-col-name">
                                            {athlete.nome}
                                            <span className="athlete-col-flag">{flagFromCountryCode(countryCode)}</span>
                                        </Link>
                                        <div className="athlete-col-tags">
                                            {tags}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </article>
        );
    };
`;

if (!content.includes("const athleteCommunityRows")) {
    content = content.replace(searchAnchor, searchAnchor + "\n" + newMetricsLogic);
    fs.writeFileSync(rankingPath, content, 'utf8');
    console.log("Ranking.jsx metrics logic injected successfully.");
} else {
    console.log("Logic already present.");
}
