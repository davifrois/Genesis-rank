const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Athletes.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import if not present
if (!content.includes('import bgImage from')) {
    content = content.replace("import './AthletesAjp.css';", "import './AthletesAjp.css';\nimport bgImage from '../assets/jiu_jitsu_community_bg.png';");
}

// 2. Add inline style
const oldDiv = '<div className="athletes-ajp-header-section">';
const newDiv = '<div className="athletes-ajp-header-section" style={{ backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.8)), url(${bgImage})` }}>';

content = content.replace(oldDiv, newDiv);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Athletes.jsx safely updated with background image!');
