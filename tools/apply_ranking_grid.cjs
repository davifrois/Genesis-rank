const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/Ranking.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add imports
if (!content.includes('import RankingCard from')) {
    content = content.replace(
        "import { ChevronDown, ChevronUp, Search, Trophy, X } from 'lucide-react';",
        "import { ChevronDown, ChevronUp, Search, Trophy, X } from 'lucide-react';\nimport RankingCard from '../components/RankingCard';\nimport './Ranking.css';"
    );
}

// Add globalGender state
if (!content.includes('globalGender')) {
    content = content.replace(
        "const [activeTab, setActiveTab] = useState(() => resolveTab(searchParams.get('tab')));",
        "const [activeTab, setActiveTab] = useState(() => resolveTab(searchParams.get('tab')));\n    const [globalGender, setGlobalGender] = useState('ALL');"
    );
}

// Add Gender Toggle UI
const genderToggleUI = `
            <div className="ranking-gender-toggle" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
                <button 
                    className={\`btn \${globalGender === 'MASCULINO' ? 'btn-primary' : 'btn-secondary'}\`}
                    onClick={() => setGlobalGender(globalGender === 'MASCULINO' ? 'ALL' : 'MASCULINO')}
                >
                    👨 Masculino
                </button>
                <button 
                    className={\`btn \${globalGender === 'FEMININO' ? 'btn-primary' : 'btn-secondary'}\`}
                    onClick={() => setGlobalGender(globalGender === 'FEMININO' ? 'ALL' : 'FEMININO')}
                >
                    👩 Feminino
                </button>
            </div>
`;

if (!content.includes('ranking-gender-toggle')) {
    content = content.replace(
        '<div className="tab-container minimal-tabs rank-v2-tabs">',
        genderToggleUI + '\n            <div className="tab-container minimal-tabs rank-v2-tabs">'
    );
}

// Now replace the ajp-list blocks.
// We will replace the inner content of <div className="ajp-list"> with <div className="ranking-grid"> and the mapped RankingCard.

// 1. pagedWinners
const pagedWinnersRegex = /<div className="ajp-list">[\s\S]*?pagedWinners\.map\(\(item, index\) => \{[\s\S]*?return \([\s\S]*?<div key=\{`\$\{athlete\.id\}-\$\{item\.label\}`\} className=\{`ajp-row\$\{podiumClass\}`\}>[\s\S]*?<\/div>\s*\);\s*\}\)\}\s*<\/div>/g;

const pagedWinnersReplacement = `<div className="ranking-grid">
                            {pagedWinners.filter(item => globalGender === 'ALL' || (item.athlete.genero || '').toUpperCase() === globalGender).map((item, index) => {
                                const athlete = item.athlete;
                                const photoUrl = resolvePhotoUrl(athlete);
                                const countryCode = countryCodeFromAthlete(athlete);
                                const countryLabel = countryLabelFromAthlete(athlete, uiLanguage);
                                const metrics = athleteMetrics.get(athlete.id) || { wins: 0, podium1: 0, podium2: 0, podium3: 0, podiumTotal: 0 };
                                return (
                                    <RankingCard
                                        key={\`\$\{athlete.id\}-\$\{item.label\}\`}
                                        athlete={athlete}
                                        rank={index + 1}
                                        photoUrl={photoUrl}
                                        flagIcon={<img src={\`https://flagcdn.com/24x18/\$\{countryCode\}.png\`} alt={countryLabel} />}
                                        pointsLabel={copy.points}
                                        winsLabel={copy.wins}
                                        lossesLabel="D"
                                        wins={metrics.wins}
                                        losses={0}
                                    />
                                );
                            })}
                        </div>`;

content = content.replace(pagedWinnersRegex, pagedWinnersReplacement);

// 2. group.entries
const groupEntriesRegex = /<div className="ajp-list">[\s\S]*?group\.entries\.map\(\(athlete, index\) => \{[\s\S]*?return \([\s\S]*?<div key=\{athlete\.id\} className=\{`ajp-row\$\{podiumClass\}`\}>[\s\S]*?<\/div>\s*\);\s*\}\)\}\s*<\/div>/g;

const groupEntriesReplacement = `<div className="ranking-grid">
                                    {group.entries.filter(athlete => globalGender === 'ALL' || (athlete.genero || '').toUpperCase() === globalGender).map((athlete, index) => {
                                        const photoUrl = resolvePhotoUrl(athlete);
                                        const countryCode = countryCodeFromAthlete(athlete);
                                        const countryLabel = countryLabelFromAthlete(athlete, uiLanguage);
                                        const metrics = athleteMetrics.get(athlete.id) || { wins: 0, podium1: 0, podium2: 0, podium3: 0, podiumTotal: 0 };
                                        return (
                                            <RankingCard
                                                key={athlete.id}
                                                athlete={athlete}
                                                rank={index + 1}
                                                photoUrl={photoUrl}
                                                flagIcon={<img src={\`https://flagcdn.com/24x18/\$\{countryCode\}.png\`} alt={countryLabel} />}
                                                pointsLabel={copy.points}
                                                winsLabel={copy.wins}
                                                lossesLabel="D"
                                                wins={metrics.wins}
                                                losses={0}
                                            />
                                        );
                                    })}
                                </div>`;

content = content.replace(groupEntriesRegex, groupEntriesReplacement);

fs.writeFileSync(filePath, content);
console.log('Successfully updated Ranking.jsx');
