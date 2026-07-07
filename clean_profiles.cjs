const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'hooks', 'useStore.js');
let content = fs.readFileSync(filePath, 'utf8');

const filterLogic = `
        const seededProfiles = hasDaviProfile
            ? merged.memberProfiles
            : [daviSeedProfile, ...merged.memberProfiles];

        // --- TEMPORARY CLEANUP SCRIPT TO REMOVE JUNK PROFILES ---
        const cleanedProfiles = seededProfiles.filter(p => {
            if (!p || !p.fullName) return false;
            const lowerName = p.fullName.toLowerCase().trim();
            // Keep only the real athletes you mentioned wanting
            if (lowerName === 'davi frois') return true;
            if (lowerName === 'davi oliveira frois') return true;
            if (lowerName === 'julia machado') return true;
            return false;
        });
`;

content = content.replace(
    "const seededProfiles = hasDaviProfile\n            ? merged.memberProfiles\n            : [daviSeedProfile, ...merged.memberProfiles];",
    filterLogic
);

content = content.replace(
    "memberProfiles: seededProfiles,",
    "memberProfiles: cleanedProfiles,"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('useStore.js updated with profile cleanup!');
