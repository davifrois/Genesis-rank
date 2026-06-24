const fs = require('fs');

// 1. Update index.css
let css = fs.readFileSync('src/index.css', 'utf8');
css = css.replace(/grid-template-columns: repeat\(auto-fill, minmax\(320px, 1fr\)\);/, 'grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));');
fs.writeFileSync('src/index.css', css);
console.log('Updated index.css grid size');

// 2. Update Dashboard.jsx
let jsx = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

// Ensure User is imported
if (!jsx.includes('User,')) {
    jsx = jsx.replace('Users,', 'User,\n    Users,');
}

// Replace photo logic
const newPhotoLogic = `{item.athletePhotoUrl ? (
                                            <img className="registration-card__photo" src={item.athletePhotoUrl} alt={item.nome || copy.registrationsPanel.tableAthlete} loading="lazy" />
                                        ) : (
                                            <div className="registration-card__photo" title={copy.registrationsPanel.noPhoto}>
                                                <User size={28} color="currentColor" style={{ opacity: 0.5 }} />
                                            </div>
                                        )}`;

const regex = /\{item\.athletePhotoUrl \? \([\s\S]*?<div className="registration-card__photo">\{copy\.registrationsPanel\.noPhoto\}<\/div>\s*\)\}/;
if (regex.test(jsx)) {
    jsx = jsx.replace(regex, newPhotoLogic);
    fs.writeFileSync('src/pages/Dashboard.jsx', jsx);
    console.log('Updated Dashboard.jsx photo logic');
} else {
    console.log('Could not find photo logic block');
}
