const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Athletes.jsx');
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// The duplicate starts at line 434 (index 433) and ends at line 481 (index 480).
// Let's verify line 433 is `  const renderTopList = (items, type, isExpanded, onToggle) => {`
if (lines[432].includes('const renderTopList = ')) {
    // Delete lines index 433 to 480
    lines.splice(433, 48);
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log('Fixed duplication in renderTopList!');
} else {
    console.log('Line 432 is not renderTopList, skipping.');
}
