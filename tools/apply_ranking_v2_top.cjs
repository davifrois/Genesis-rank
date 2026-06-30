const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/Ranking.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add globalGender state
if (!content.includes('globalGender')) {
    content = content.replace(
        "const [activeTab, setActiveTab] = useState(() => resolveTab(searchParams.get('tab')));",
        "const [activeTab, setActiveTab] = useState(() => resolveTab(searchParams.get('tab')));\n    const [globalGender, setGlobalGender] = useState('ALL');"
    );
}

// 2. Replace the top layout (Header + Breadcrumb + Gender Toggle)
// Currently, the top has a div with "ranking-page-header" and "ranking-page-header-pill"
const topLayoutRegex = /<div className="ranking-page-header">[\s\S]*?<div className="ranking-event-carousel-wrap">/g;

const newTopLayout = `<div className="ranking-v2-header">
                <h2>RANKINGS</h2>
                <div className="ranking-v2-dropdown">
                    <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
                        <option value="all">{copy.allEvents}</option>
                        {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="ranking-v2-breadcrumb">
                Rankings / {selectedEventId === 'all' ? 'Todos os eventos' : (events.find(e => e.id === selectedEventId)?.name || '')} / ABU DHABI GRAND SLAM WORLD TOUR RANK
            </div>

            <div className="ranking-v2-gender-toggle">
                <button 
                    className={\`gender-btn \${globalGender === 'MASCULINO' ? 'active' : ''}\`}
                    onClick={() => setGlobalGender('MASCULINO')}
                >
                    <User size={16} fill="currentColor" /> MASCULINO
                </button>
                <button 
                    className={\`gender-btn \${globalGender === 'FEMININO' ? 'active' : ''}\`}
                    onClick={() => setGlobalGender('FEMININO')}
                >
                    <User size={16} fill="currentColor" /> FEMININO
                </button>
            </div>

            {/* Hidden original carousel to keep logic intact without breaking but hidden from UI */}
            <div className="ranking-event-carousel-wrap" style={{ display: 'none' }}>`;

content = content.replace(topLayoutRegex, newTopLayout);

// Ensure User is imported from lucide-react
if (!content.includes('User, ')) {
    content = content.replace("from 'lucide-react';", "User } from 'lucide-react';").replace("Search, Trophy, X", "Search, Trophy, X, User");
}

fs.writeFileSync(filePath, content);
console.log('Top layout updated');
