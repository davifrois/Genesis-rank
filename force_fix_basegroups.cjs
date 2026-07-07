const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Ranking.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const originalBlock = `    const baseGroups = useMemo(() => {
        const groups = new Map();
        filteredAthletes.forEach((athlete) => {
            const { key, label } = buildCategoryDescriptor(athlete);
            if (!groups.has(key)) groups.set(key, { key, label, entries: [] });
            groups.get(key).entries.push(athlete);
        });

        const grouped = [...groups.values()]
            .map((group) => ({
                key: group.key,
                label: group.label,
                entries: rankAthletes(group.entries)
            }))
            .sort((a, b) => a.label.localeCompare(b.label));

        return grouped;
    }, [filteredAthletes]);`;

const newBlock = `    const baseGroups = useMemo(() => {
        const groups = new Map();
        
        const tabFiltered = eventFilteredAthletes.filter((athlete) => {
            if (activeTab === 'GI') return !athlete.isNoGi && !athlete.isAbsolute;
            if (activeTab === 'NO-GI') return athlete.isNoGi && !athlete.isAbsolute;
            if (activeTab === 'ABS-GI') return !athlete.isNoGi && athlete.isAbsolute;
            if (activeTab === 'ABS-NO-GI') return athlete.isNoGi && athlete.isAbsolute;
            if (activeTab === 'EQUIPE') return false;
            return true;
        });

        tabFiltered.forEach((athlete) => {
            const categoria = athlete.categoria || 'Categoria';
            const faixa = athlete.faixa || 'Faixa';
            const peso = athlete.peso || (athlete.isAbsolute ? 'Absoluto' : 'Peso');
            
            const normalizeGroupPart = (value) => ((value || '').toString().trim().toLowerCase().replace(/\\s+/g, ' '));
            const agnosticKeyParts = [categoria, faixa, peso, athlete.isAbsolute ? 'ABS' : 'STD', athlete.isNoGi ? 'NO-GI' : 'GI'];
            const agnosticKey = agnosticKeyParts.map(normalizeGroupPart).join('::');
            
            if (!groups.has(agnosticKey)) {
                const displayGender = globalGender === 'FEMININO' ? (isEnglish ? "Women's" : "Feminino") : (isEnglish ? "Men's" : "Masculino");
                const labelParts = athlete.isAbsolute ? ['ABS', categoria, faixa, peso, displayGender] : [categoria, faixa, peso, displayGender];
                
                groups.set(agnosticKey, { 
                    key: agnosticKey + '::' + globalGender.toLowerCase(),
                    label: labelParts.join(' - '),
                    entries: [] 
                });
            }
        });

        filteredAthletes.forEach((athlete) => {
            const categoria = athlete.categoria || 'Categoria';
            const faixa = athlete.faixa || 'Faixa';
            const peso = athlete.peso || (athlete.isAbsolute ? 'Absoluto' : 'Peso');
            
            const normalizeGroupPart = (value) => ((value || '').toString().trim().toLowerCase().replace(/\\s+/g, ' '));
            const agnosticKeyParts = [categoria, faixa, peso, athlete.isAbsolute ? 'ABS' : 'STD', athlete.isNoGi ? 'NO-GI' : 'GI'];
            const agnosticKey = agnosticKeyParts.map(normalizeGroupPart).join('::');
            
            if (groups.has(agnosticKey)) {
                groups.get(agnosticKey).entries.push(athlete);
            }
        });

        const grouped = [...groups.values()]
            .map((group) => ({
                key: group.key,
                label: group.label,
                entries: rankAthletes(group.entries)
            }))
            .sort((a, b) => a.label.localeCompare(b.label));

        return grouped;
    }, [filteredAthletes, eventFilteredAthletes, activeTab, globalGender, isEnglish]);`;

content = content.replace(originalBlock, newBlock);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed baseGroups!');
