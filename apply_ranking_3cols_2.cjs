const fs = require('fs');
const path = require('path');

const rankingPath = path.join(__dirname, 'src', 'pages', 'Ranking.jsx');
let content = fs.readFileSync(rankingPath, 'utf8');

const renderStartStr = '            {/* GENDER TOGGLES */}';
const renderEndStr = 'export default Ranking;';

const startIndex = content.indexOf(renderStartStr);
const endIndex = content.lastIndexOf(renderEndStr);

if (startIndex !== -1 && endIndex !== -1) {
    // We need to also keep the final closing braces before export default Ranking;
    const renderReplacement = `
            {/* 3 COLUMNS SECTION */}
            <div className="athletes-community-main" style={{ padding: '0 40px 40px' }}>
                <div className="athlete-columns-grid">
                    {renderTopList(topGold, 'gold')}
                    {renderTopList(topWinrate, 'winrate')}
                    {renderTopList(topActive, 'active')}
                </div>
            </div>
        </div>
    );
};

export default Ranking;
`;
    content = content.substring(0, startIndex) + renderReplacement;
    fs.writeFileSync(rankingPath, content, 'utf8');
    console.log("Ranking.jsx updated successfully.");
} else {
    console.error("Could not replace render block. Start:", startIndex, "End:", endIndex);
    process.exit(1);
}
