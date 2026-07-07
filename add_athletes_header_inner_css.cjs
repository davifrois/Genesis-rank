const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'AthletesAjp.css');
let content = fs.readFileSync(filePath, 'utf8');

const innerCss = `
.athletes-ajp-header-inner {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
}
`;

if (!content.includes('athletes-ajp-header-inner')) {
    content += innerCss;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('AthletesAjp.css updated with inner container styles!');
}
