const fs = require('fs');
const path = require('path');

const athletesPath = path.join(__dirname, 'src', 'pages', 'Athletes.jsx');
let content = fs.readFileSync(athletesPath, 'utf8');

const targetStr = `const [countryFilter, setCountryFilter] = useState('all');`;

const replacement = `const [countryFilter, setCountryFilter] = useState('all');

    // -- INJECTED TOP LISTS COMPUTATION --
    const { topGolds, topWinRate, mostActive } = useMemo(() => {
        if (!athletes || !Array.isArray(athletes)) {
            return { topGolds: [], topWinRate: [], mostActive: [] };
        }

        const validAthletes = athletes.filter(a => a && a.id && a.nome);

        // Map data
        const mapped = validAthletes.map(a => {
            const hist = Array.isArray(a.historico) ? a.historico : [];
            let wins = 0;
            let totalMatches = 0;
            let golds = 0;
            
            hist.forEach(h => {
                if (h) totalMatches++;
                if (h && (h.type || '').toString().toLowerCase().trim() === 'win') wins++;
                if (h && (h.position === 1 || h.medal === 'gold')) golds++;
            });

            return {
                ...a,
                golds,
                wins,
                totalMatches,
                winRate: totalMatches > 0 ? wins / totalMatches : 0
            };
        });

        const topGoldsList = [...mapped].sort((a, b) => b.golds - a.golds || b.wins - a.wins).filter(a => a.golds > 0);
        const topWinRateList = [...mapped].filter(a => a.totalMatches >= 3).sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);
        const mostActiveList = [...mapped].sort((a, b) => b.totalMatches - a.totalMatches).filter(a => a.totalMatches > 0);

        return {
            topGolds: topGoldsList,
            topWinRate: topWinRateList,
            mostActive: mostActiveList
        };
    }, [athletes]);
    // ------------------------------------
`;

if (!content.includes('topGolds: topGoldsList')) {
    content = content.replace(targetStr, replacement);
    fs.writeFileSync(athletesPath, content, 'utf8');
    console.log("Athletes.jsx top lists injected.");
} else {
    console.log("Already injected.");
}
