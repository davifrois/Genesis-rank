const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Athletes.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace state
content = content.replace(
  "const [showAllTop, setShowAllTop] = useState(false);",
  "const [showAllGold, setShowAllGold] = useState(false);\n  const [showAllWinRate, setShowAllWinRate] = useState(false);\n  const [showAllActive, setShowAllActive] = useState(false);"
);

// 2. Update renderTopList declaration and body
// Find the exact renderTopList start
const oldRenderStart = "const renderTopList = (items, type) => {";
const newRenderStart = "const renderTopList = (items, type, isExpanded, onToggle) => {\n    const displayedItems = isExpanded ? items : items.slice(0, 5);";
content = content.replace(oldRenderStart, newRenderStart);

// Replace items.map and items.length inside renderTopList
// Since we have `items.length === 0` and `items.map`, we can just replace them with `displayedItems`
// but only within the renderTopList block. Let's do string replacement carefully.
// The block has: {items.length === 0 ? (
// and: items.map((item, index) => {
// Let's just replace them exactly.
content = content.replace("{items.length === 0 ? (", "{displayedItems.length === 0 ? (");
content = content.replace("items.map((item, index) => {", "displayedItems.map((item, index) => {");

// Add the button inside the article
const buttonCode = `
          {items.length > 5 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '15px' }}>
              <button 
                  onClick={onToggle}
                  style={{ 
                      backgroundColor: 'transparent', 
                      border: '1px solid #444', 
                      color: '#fff', 
                      padding: '6px 20px', 
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      transition: 'all 0.2s',
                      width: '100%'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                  onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                  {isExpanded ? (isEnglish ? 'Show Less' : 'Mostrar Menos') : (isEnglish ? 'Show More' : 'Mostrar Mais')}
              </button>
            </div>
          )}
        </div>
      </article>`;
      
content = content.replace("        </div>\n      </article>", buttonCode);

// 3. Update calls and remove old global button
const oldColumns = `          <div className="athlete-community-columns">
            {renderTopList(showAllTop ? topGold : topGold.slice(0, 5), 'gold')}
            {renderTopList(showAllTop ? topWinRate : topWinRate.slice(0, 5), 'winrate')}
            {renderTopList(showAllTop ? topActive : topActive.slice(0, 5), 'active')}
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
                    letterSpacing: '1px',
                    transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
                {showAllTop ? (isEnglish ? 'Show Less' : 'Mostrar Menos') : (isEnglish ? 'Show More' : 'Mostrar Mais')}
            </button>
          </div>
        </section>`;
        
const newColumns = `          <div className="athlete-community-columns">
            {renderTopList(topGold, 'gold', showAllGold, () => setShowAllGold(!showAllGold))}
            {renderTopList(topWinRate, 'winrate', showAllWinRate, () => setShowAllWinRate(!showAllWinRate))}
            {renderTopList(topActive, 'active', showAllActive, () => setShowAllActive(!showAllActive))}
          </div>
        </section>`;

if (content.includes("setShowAllTop(!showAllTop)")) {
    content = content.replace(oldColumns, newColumns);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Athletes.jsx updated to use per-column buttons!');
