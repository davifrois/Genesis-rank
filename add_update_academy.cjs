const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'hooks', 'useStore.js');
let content = fs.readFileSync(filePath, 'utf8');

// Add bio to normalizeAcademy
content = content.replace(
    "logoUrl: normalizeOptionalUrl(academy.logoUrl || academy.fotoUrl || academy.imageUrl || ''),",
    "logoUrl: normalizeOptionalUrl(academy.logoUrl || academy.fotoUrl || academy.imageUrl || ''),\n        bio: normalizeTextTrimmed(academy.bio || academy.description || ''),"
);

// Add updateAcademy function
const updateAcademyCode = `
    const updateAcademy = (id, payload = {}) => {
        const currentRole = normalizeTextTrimmed(data.currentUser?.role || '').toLowerCase();
        const isAdmin = currentRole === 'admin';
        
        const existingIndex = data.academies.findIndex((a) => a.id === id);
        if (existingIndex === -1) {
            console.error('[useStore] updateAcademy: Academy not found:', id);
            return null;
        }
        
        const existing = data.academies[existingIndex];
        const updated = normalizeAcademy({
            ...existing,
            ...payload,
            id: existing.id // ensure ID doesn't change
        });
        
        const newAcademies = [...data.academies];
        newAcademies[existingIndex] = updated;
        
        setData((prev) => ({
            ...prev,
            academies: newAcademies
        }));
        
        addLog({ type: 'INFO', action: 'UPDATE_ACADEMY', details: \`Academia atualizada: \${updated.name}\` });
        return updated;
    };
`;

if (!content.includes('updateAcademy')) {
    content = content.replace('const addAcademy =', updateAcademyCode + '\n    const addAcademy =');
    content = content.replace('addAcademy,', 'addAcademy,\n        updateAcademy,');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("useStore.js updated successfully.");
} else {
    console.log("updateAcademy already exists.");
}
