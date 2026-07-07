const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Ranking.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const filterOriginal = `        }).filter(athlete => {
            if (globalGender === 'ALL') return true;
            const gen = (athlete.genero || athlete.sexo || '').toLowerCase();
            if (globalGender === 'MASCULINO') return gen === 'masculino' || gen === 'm';
            if (globalGender === 'FEMININO') return gen === 'feminino' || gen === 'f';
            return true;
        });`;

const filterReplacement = `        }).filter(athlete => {
            if (globalGender === 'ALL') return true;
            const gen = (athlete.genero || athlete.sexo || '').toLowerCase().trim();
            const isFemale = gen === 'feminino' || gen === 'f' || gen === 'female' || gen === 'mulher';
            
            if (globalGender === 'FEMININO') {
                return isFemale;
            }
            if (globalGender === 'MASCULINO') {
                return !isFemale;
            }
            return true;
        });`;

content = content.replace(filterOriginal, filterReplacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Gender filter improved!');
