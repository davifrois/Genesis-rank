const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Athletes.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldHeaderStart = `<div className="athletes-ajp-header-section" style={{ backgroundImage: \`linear-gradient(to bottom, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.8)), url(\${bgImage})\` }}>`;
const newHeaderStart = `${oldHeaderStart}\n        <div className="athletes-ajp-header-inner">`;

const oldHeaderEnd = `          </div>\n      </div>\n\n      <div className="athletes-ajp-content">`;
const newHeaderEnd = `          </div>\n        </div>\n      </div>\n\n      <div className="athletes-ajp-content">`;

if (content.includes(oldHeaderStart) && !content.includes('className="athletes-ajp-header-inner"')) {
    content = content.replace(oldHeaderStart, newHeaderStart);
    // Since the end of the header section has `</div>` followed by `<div className="athletes-ajp-content">`
    // Let's replace the first occurrence of the old end.
    content = content.replace(oldHeaderEnd, newHeaderEnd);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Athletes.jsx header successfully wrapped with inner container!');
} else {
    console.log('Could not find header or already wrapped.');
}
