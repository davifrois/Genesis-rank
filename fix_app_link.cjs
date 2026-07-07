const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
    '<Link to={`/minha-conta?profileId=${profile.id}`} key={profile.id} className="linked-profile"',
    '<Link to={`/perfil-publico/${profile.id}`} key={profile.id} className="linked-profile"'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('App.jsx updated Perfis Ligados link!');
