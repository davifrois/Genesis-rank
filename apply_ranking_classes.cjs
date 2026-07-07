const fs = require('fs');
const path = require('path');

const rankingPath = path.join(__dirname, 'src', 'pages', 'Ranking.jsx');
let content = fs.readFileSync(rankingPath, 'utf8');

const renderTopListOld = `    const renderTopList = (items, type) => {
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
    };`;

const renderTopListNew = `    const renderTopList = (items, type) => {
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
                        <div className="empty-col-state">Nenhum atleta encontrado.</div>
                    ) : (
                        items.map((item, index) => {
                            const athlete = item.athlete;
                            const countryCode = countryCodeFromAthlete(athlete);
                            const photoUrl = resolvePhotoUrl(athlete);
                            
                            let tags = null;
                            if (type === 'gold') {
                                tags = (
                                    <div className="athlete-row-pills">
                                        <span className="stat-pill"><span className="stat-pill-highlight">{item.totalGold || 0}</span><span className="stat-pill-text">golds</span></span>
                                        <span className="stat-pill"><span className="stat-pill-text">{item.wins || 0} wins / {item.losses || 0} losses</span></span>
                                    </div>
                                );
                            } else if (type === 'winrate') {
                                tags = (
                                    <div className="athlete-row-pills">
                                        <span className="stat-pill"><span className="stat-pill-highlight blue">+{item.winDiff || 0}</span><span className="stat-pill-text">{item.wins || 0} wins / {item.losses || 0} losses</span></span>
                                    </div>
                                );
                            } else {
                                tags = (
                                    <div className="athlete-row-pills">
                                        <span className="stat-pill"><span className="stat-pill-text" style={{backgroundColor: '#52525b', padding: '2px 6px'}}>{item.fights || 0} matches</span></span>
                                        <span className="stat-pill"><span className="stat-pill-text">{item.wins || 0} wins / {item.losses || 0} losses</span></span>
                                    </div>
                                );
                            }

                            return (
                                <Link
                                    key={athlete.id}
                                    className="athlete-row-item"
                                    to={\`/perfil-publico/\${athlete.id}\`}
                                >
                                    <div className="athlete-row-avatar">
                                        {photoUrl ? <img src={photoUrl} alt={athlete.nome} loading="lazy" /> : <User size={24} color="#aaa" />}
                                    </div>
                                    <div className="athlete-row-info">
                                        <div className="athlete-row-name-line">
                                            <span className="athlete-row-name" style={{marginRight: '8px', fontSize: '0.9rem'}}>{index + 1}.</span>
                                            <span className="athlete-row-name">{athlete.nome}</span>
                                            <span style={{ fontSize: '0.8rem' }}>{flagFromCountryCode(countryCode)}</span>
                                        </div>
                                        {tags}
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>
            </article>
        );
    };`;

if (content.includes("className=\"athlete-col-item\"")) {
    const startIndex = content.indexOf("const renderTopList = (items, type) => {");
    const endIndex = content.indexOf("    }, [eventFilteredAthletes]);", startIndex); // wait no, renderTopList is at the end of useMemo?
    // Let's use simple string replace if it matches exactly.
    // If not, we use regex or substring.
    if (content.includes(renderTopListOld)) {
        content = content.replace(renderTopListOld, renderTopListNew);
    } else {
        // Find by start of function
        const fnStart = "    const renderTopList = (items, type) => {";
        const fnEnd = "    };";
        const sIdx = content.indexOf(fnStart);
        if (sIdx !== -1) {
             const eIdx = content.indexOf(fnEnd, sIdx) + fnEnd.length;
             content = content.substring(0, sIdx) + renderTopListNew + content.substring(eIdx);
        } else {
             console.error("renderTopList function not found!");
             process.exit(1);
        }
    }
    fs.writeFileSync(rankingPath, content, 'utf8');
    console.log("Ranking.jsx renderTopList fixed successfully.");
} else {
    console.log("Looks like it's already fixed?");
}
