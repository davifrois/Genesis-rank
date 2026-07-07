const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Athletes.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports if missing
if (!content.includes("import './AthletesAjp.css';")) {
    content = content.replace("import { useI18n } from '../hooks/useI18n';", "import { useI18n } from '../hooks/useI18n';\nimport './AthletesAjp.css';\nimport bgImage from '../assets/jiu_jitsu_community_bg.png';");
}

// 2. Add showAllTop state
if (!content.includes('const [showAllTop, setShowAllTop]')) {
    content = content.replace("const [searchTerm, setSearchTerm] = useState('');", "const [searchTerm, setSearchTerm] = useState('');\n  const [showAllTop, setShowAllTop] = useState(false);");
}

// 3. Translate renderTopList titles
content = content.replace("'Most Gold Medals'", "(isEnglish ? 'Most Gold Medals' : 'Mais Medalhas de Ouro')");
content = content.replace("'Best Win/Loss Difference'", "(isEnglish ? 'Best Win/Loss Difference' : 'Melhor Aproveitamento')");
content = content.replace("'Most Active Athlete'", "(isEnglish ? 'Most Active Athlete' : 'Atletas Mais Ativos')");

// 4. Update the renderTopList calls to use slice based on showAllTop
// First, find the return block where renderTopList is called.
content = content.replace("{renderTopList(topGold, 'gold')}", "{renderTopList(showAllTop ? topGold : topGold.slice(0, 5), 'gold')}");
content = content.replace("{renderTopList(topWinRate, 'winrate')}", "{renderTopList(showAllTop ? topWinRate : topWinRate.slice(0, 5), 'winrate')}");
content = content.replace("{renderTopList(topActive, 'active')}", "{renderTopList(showAllTop ? topActive : topActive.slice(0, 5), 'active')}");

// 5. Add "Mostrar mais" button below the columns
const buttonHtml = `
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px' }}>
            <button 
                onClick={() => setShowAllTop(!showAllTop)}
                style={{ 
                    backgroundColor: 'transparent', 
                    border: '1px solid #444', 
                    color: '#fff', 
                    padding: '10px 30px', 
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                }}
            >
                {showAllTop ? (isEnglish ? 'Show Less' : 'Mostrar Menos') : (isEnglish ? 'Show More' : 'Mostrar Mais')}
            </button>
          </div>
        </section>
`;

if (!content.includes('setShowAllTop(!showAllTop)')) {
    content = content.replace("          </div>\n        </section>", buttonHtml);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Athletes.jsx updated with translations and show more!');
