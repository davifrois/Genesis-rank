const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Athletes.jsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replaceAll(
    'to={`/perfil-publico?codigo=${encodeURIComponent(shareCode)}`}',
    'to={`/perfil-publico/${profile.id}`}'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Athletes.jsx updated!');
