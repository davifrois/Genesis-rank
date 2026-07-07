const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'hooks', 'useStore.js');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `        const seededProfiles = hasDaviProfile
            ? merged.memberProfiles
            : [daviSeedProfile, ...merged.memberProfiles];

        return {
            ...merged,
            academies: seededAcademies,
            memberProfiles: seededProfiles,`;

const replacement = `        const seededProfiles = hasDaviProfile
            ? merged.memberProfiles
            : [daviSeedProfile, ...merged.memberProfiles];

        const cleanedProfiles = seededProfiles.filter(p => {
            if (!p || !p.fullName) return false;
            const lowerName = p.fullName.toLowerCase().trim();
            // Keep only the real athletes you mentioned wanting
            if (lowerName === 'davi frois') return true;
            if (lowerName === 'davi oliveira frois') return true;
            if (lowerName === 'julia machado') return true;
            return false;
        });

        return {
            ...merged,
            academies: seededAcademies,
            memberProfiles: cleanedProfiles,`;

content = content.replace(targetStr, replacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('useStore.js updated perfectly!');
