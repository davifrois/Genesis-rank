const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Ranking.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Change globalGender default to 'MASCULINO'
content = content.replace(
    "const [globalGender, setGlobalGender] = useState('ALL');",
    "const [globalGender, setGlobalGender] = useState('MASCULINO');"
);

// 2. Add gender filter to filteredAthletes
const filteredAthletesOriginal = `    const filteredAthletes = useMemo(() => {
        return eventFilteredAthletes.filter((athlete) => {
            if (activeTab === 'GI') return !athlete.isNoGi && !athlete.isAbsolute;
            if (activeTab === 'NO-GI') return athlete.isNoGi && !athlete.isAbsolute;
            if (activeTab === 'ABS-GI') return !athlete.isNoGi && athlete.isAbsolute;
            if (activeTab === 'ABS-NO-GI') return athlete.isNoGi && athlete.isAbsolute;
            if (activeTab === 'EQUIPE') return false;
            return true;
        });
    }, [activeTab, eventFilteredAthletes]);`;

const filteredAthletesReplacement = `    const filteredAthletes = useMemo(() => {
        return eventFilteredAthletes.filter((athlete) => {
            if (activeTab === 'GI') return !athlete.isNoGi && !athlete.isAbsolute;
            if (activeTab === 'NO-GI') return athlete.isNoGi && !athlete.isAbsolute;
            if (activeTab === 'ABS-GI') return !athlete.isNoGi && athlete.isAbsolute;
            if (activeTab === 'ABS-NO-GI') return athlete.isNoGi && athlete.isAbsolute;
            if (activeTab === 'EQUIPE') return false;
            return true;
        }).filter(athlete => {
            if (globalGender === 'ALL') return true;
            const gen = (athlete.genero || athlete.sexo || '').toLowerCase();
            if (globalGender === 'MASCULINO') return gen === 'masculino' || gen === 'm';
            if (globalGender === 'FEMININO') return gen === 'feminino' || gen === 'f';
            return true;
        });
    }, [activeTab, eventFilteredAthletes, globalGender]);`;

content = content.replace(filteredAthletesOriginal, filteredAthletesReplacement);

// 3. Make buttons interactive
const buttonsOriginal = `                <div className="ajp-gender-toggles">
                    <button className="ajp-gender-btn active">
                        <User size={16} />
                        {isEnglish ? "MEN'S" : "MASCULINO"}
                    </button>
                    <button className="ajp-gender-btn">
                        <User size={16} />
                        {isEnglish ? "WOMEN'S" : "FEMININO"}
                    </button>
                </div>`;

const buttonsReplacement = `                <div className="ajp-gender-toggles">
                    <button 
                        className={\`ajp-gender-btn \${globalGender === 'MASCULINO' ? 'active' : ''}\`}
                        onClick={() => setGlobalGender('MASCULINO')}
                    >
                        <User size={16} />
                        {isEnglish ? "MEN'S" : "MASCULINO"}
                    </button>
                    <button 
                        className={\`ajp-gender-btn \${globalGender === 'FEMININO' ? 'active' : ''}\`}
                        onClick={() => setGlobalGender('FEMININO')}
                    >
                        <User size={16} />
                        {isEnglish ? "WOMEN'S" : "FEMININO"}
                    </button>
                </div>`;

content = content.replace(buttonsOriginal, buttonsReplacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Ranking.jsx gender filter updated!');
