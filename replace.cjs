const fs = require('fs');
let c = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

// Replace known bad encodings globally in the file
c = c.replace(/Ã /g, 'à');
c = c.replace(/Ã /g, 'Á'); // "Ã rea" -> "Área"
c = c.replace(/Ã-/g, '-');
c = c.replace(/Ã—/g, '-');
c = c.replace(/Ãš/g, 'Ú');
c = c.replace(/Ã§/g, 'ç');
c = c.replace(/Ã£/g, 'ã');
c = c.replace(/Ã©/g, 'é');

fs.writeFileSync('src/pages/Dashboard.jsx', c);
console.log('Replacements done.');
