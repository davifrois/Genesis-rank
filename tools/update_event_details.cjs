const fs = require('fs');

let code = fs.readFileSync('src/pages/EventDetails.jsx', 'utf-8');

// 1. Add state variables
const stateHookTarget = "const { events, athletes, brackets } = useStore();";
const newStates = `const [resultsData, setResultsData] = useState(null);
  const [teamRankingData, setTeamRankingData] = useState(null);
  const [resultsSubTab, setResultsSubTab] = useState('resultados');

  useEffect(() => {
    if (activeTab === 'results') {
      fetch(\`/api/ranking?eventId=\${eventId}\`)
        .then(r => r.json())
        .then(setResultsData)
        .catch(console.error);

      fetch(\`/api/ranking/teams?eventId=\${eventId}\`)
        .then(r => r.json())
        .then(setTeamRankingData)
        .catch(console.error);
    }
  }, [activeTab, eventId]);`;

code = code.replace(stateHookTarget, stateHookTarget + '\n  ' + newStates);


// 2. Replace renderResultsTab
const oldRenderResultsStart = "const renderResultsTab = () => (";
const oldRenderResultsEnd = "</>\n    );";
const regexRenderResults = /const renderResultsTab = \(\) => \([\s\S]*?<\/>\n    \);/;

const newRenderResults = `const renderResultsTab = () => {
    let totalGold = 0;
    let totalSilver = 0;
    let totalBronze = 0;

    if (resultsData && resultsData.categories) {
      resultsData.categories.forEach(cat => {
        cat.entries.forEach(entry => {
          if (entry.rank === 1) totalGold++;
          else if (entry.rank === 2) totalSilver++;
          else if (entry.rank === 3) totalBronze++;
        });
      });
    }

    const renderMedalBox = (entry) => {
      let iconColor = '#808080';
      if (entry.rank === 1) iconColor = '#eab308'; // Gold
      else if (entry.rank === 2) iconColor = '#9ca3af'; // Silver
      else if (entry.rank === 3) iconColor = '#b45309'; // Bronze

      return (
        <div key={entry.id} className="sc-result-athlete">
          <div className="sc-result-rank" style={{ backgroundColor: iconColor }}>{entry.rank}</div>
          <div className="sc-result-info">
            <strong>{entry.nome}</strong>
            <small>{entry.academia}</small>
          </div>
        </div>
      );
    };

    const renderTeamRankingBlock = (title, teams) => (
      <div className="sc-team-ranking-block">
        <div className="sc-team-ranking-header">
          <h3>Best Academy {title}</h3>
          <small>Pontos</small>
        </div>
        <div className="sc-team-ranking-list">
          {teams && teams.length > 0 ? teams.slice(0, 5).map((team, index) => (
            <div key={team.academy} className="sc-team-ranking-item">
              <div className="sc-team-rank-pos">{index + 1}.</div>
              <div className="sc-team-name">{team.academy}</div>
              <div className="sc-team-stats">
                <span className="sc-pts" style={{ color: '#0ea5e9', fontWeight: 'bold' }}>{team.pontos.toFixed(2)} pts</span>
                <span className="sc-stat-col" title="Campeão">🥇 {team.campeao}</span>
                <span className="sc-stat-col" title="Vice">🥈 {team.vice}</span>
                <span className="sc-stat-col" title="Terceiro">🥉 {team.terceiro}</span>
              </div>
            </div>
          )) : <div className="sc-empty-state">Sem resultados</div>}
          <div className="sc-see-all">See all</div>
        </div>
      </div>
    );

    return (
      <>
        <div className="sc-subnav">
          <div className={\`sc-subtab \${resultsSubTab === 'resultados' ? 'active' : ''}\`} onClick={() => setResultsSubTab('resultados')}>Resultados</div>
          <div className={\`sc-subtab \${resultsSubTab === 'toplistas' ? 'active' : ''}\`} onClick={() => setResultsSubTab('toplistas')}>Top listas</div>
        </div>
        <div className="sc-content">
          {resultsSubTab === 'resultados' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 className="sc-section-title" style={{ margin: 0 }}>RESULTADOS</h2>
                <button className="sc-btn-print" onClick={() => window.print()}><Printer size={16} /> Imprimir</button>
              </div>
              <div className="sc-card" style={{ padding: '24px', marginBottom: '24px' }}>
                <div className="sc-results-grid">
                  <input type="text" className="sc-input" placeholder="Nome do atleta" />
                  <input type="text" className="sc-input" placeholder="Academia" />
                  <input type="text" className="sc-input" placeholder="Categoria" />
                  <input type="text" className="sc-input" placeholder="Equipe" />
                  <select className="sc-select"><option>Nacionalidade</option></select>
                  <select className="sc-select"><option>Filtrar modalidade</option></select>
                </div>
                <button className="sc-btn-search">Buscar</button>
              </div>
              
              <div className="sc-medals-panel">
                <div className="sc-medals-title">TOTAL MEDALHAS</div>
                <div className="sc-medals-grid">
                  <div className="sc-medal-box sc-medal-gold">{totalGold} OURO</div>
                  <div className="sc-medal-box sc-medal-silver">{totalSilver} PRATA</div>
                  <div className="sc-medal-box sc-medal-bronze">{totalBronze} BRONZE</div>
                </div>
              </div>

              <div className="sc-brackets-results">
                {resultsData && resultsData.categories && resultsData.categories.map(cat => (
                  <div key={cat.label} className="sc-bracket-result">
                    <div className="sc-bracket-result-header">
                      <h3>{cat.label}</h3>
                      <span className="sc-bracket-badge">Bracket</span>
                    </div>
                    <div className="sc-bracket-result-list">
                      {cat.entries.map(renderMedalBox)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {resultsSubTab === 'toplistas' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 className="sc-section-title" style={{ margin: 0 }}>RANKINGS</h2>
              </div>
              <div className="sc-team-rankings-grid">
                {teamRankingData ? (
                  <>
                    {renderTeamRankingBlock('KIDS', teamRankingData.KIDS)}
                    {renderTeamRankingBlock('JUVENIL', teamRankingData.JUVENIL)}
                    {renderTeamRankingBlock('ADULTO', teamRankingData.ADULTO)}
                    {renderTeamRankingBlock('MASTER', teamRankingData.MASTER)}
                  </>
                ) : (
                  <div>Carregando rankings...</div>
                )}
              </div>
            </>
          )}
        </div>
      </>
    );
  };`;

code = code.replace(regexRenderResults, newRenderResults);

fs.writeFileSync('src/pages/EventDetails.jsx', code);
console.log('Successfully updated EventDetails.jsx');
