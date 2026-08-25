export const normalizeGroupPart = (value) => (
    (value || '').toString().trim().toLowerCase().replace(/\s+/g, ' ')
);

export const resolveGenderLabel = (athlete) => (
    athlete.genero || athlete.sexo || 'Masculino'
);

const getWeightLimitString = (peso, categoria, genero, idade) => {
    if (!peso) return 'Peso';
    const pesoStr = String(peso).trim();
    if (
        pesoStr.toLowerCase().includes('até') ||
        pesoStr.toLowerCase().includes('ate') ||
        pesoStr.toLowerCase().includes('acima') ||
        pesoStr.toLowerCase().includes('sem limite') ||
        pesoStr.toLowerCase().includes('absoluto') ||
        pesoStr.toLowerCase().includes('kg')
    ) {
        return pesoStr;
    }

    const isFemale = (genero || '').toUpperCase() === 'FEMININO';
    const catUpper = (categoria || '').toUpperCase();

    let age = parseInt(idade, 10) || 0;
    const currentYear = new Date().getFullYear();
    if (age > 1900) age = currentYear - age;

    if (!age || age <= 0) {
        if (catUpper.includes('4')) age = 4;
        else if (catUpper.includes('5')) age = 5;
        else if (catUpper.includes('6')) age = 6;
        else if (catUpper.includes('7')) age = 7;
        else if (catUpper.includes('8')) age = 8;
        else if (catUpper.includes('9')) age = 9;
        else if (catUpper.includes('10')) age = 10;
        else if (catUpper.includes('11')) age = 11;
        else if (catUpper.includes('12')) age = 12;
        else if (catUpper.includes('13')) age = 13;
        else if (catUpper.includes('14')) age = 14;
        else if (catUpper.includes('15')) age = 15;
        else if (catUpper.includes('16')) age = 16;
        else if (catUpper.includes('17')) age = 17;
        else if (catUpper.includes('MIRIM')) age = 8;
        else if (catUpper.includes('INFANTIL')) age = 11;
        else if (catUpper.includes('INFANTO')) age = 14;
        else if (catUpper.includes('JUVENIL')) age = 16;
        else age = 20; // Default Adulto
    }

    const pName = pesoStr.toUpperCase();

    if (pName.includes('GALO')) {
        if (age === 10) return `${pesoStr} (até 27,000 kg)`;
        if (age === 11) return `${pesoStr} (até 30,200 kg)`;
        if (age === 12) return `${pesoStr} (até 32,200 kg)`;
        if (age === 13) return `${pesoStr} (até 36,200 kg)`;
        if (age === 14) return `${pesoStr} (até 40,300 kg)`;
        if (age === 15) return `${pesoStr} (até 44,300 kg)`;
        if (age === 16 && !isFemale) return `${pesoStr} (até 48,500 kg)`;
        if (age === 17 && !isFemale) return `${pesoStr} (até 53,500 kg)`;
        if ((age === 16 || age === 17) && isFemale) return `${pesoStr} (até 44,300 kg)`;
        if (isFemale) return `${pesoStr} (até 48,500 kg)`;
        return `${pesoStr} (até 57,500 kg)`;
    }

    if (pName.includes('PLUMA')) {
        if (age === 4) return `${pesoStr} (até 14,700 kg)`;
        if (age === 5) return `${pesoStr} (até 17,900 kg)`;
        if (age === 6) return `${pesoStr} (até 18,900 kg)`;
        if (age === 7) return `${pesoStr} (até 21,000 kg)`;
        if (age === 8) return `${pesoStr} (até 24,000 kg)`;
        if (age === 9) return `${pesoStr} (até 27,000 kg)`;
        if (age === 10) return `${pesoStr} (até 30,200 kg)`;
        if (age === 11) return `${pesoStr} (até 33,200 kg)`;
        if (age === 12) return `${pesoStr} (até 36,200 kg)`;
        if (age === 13) return `${pesoStr} (até 40,300 kg)`;
        if (age === 14) return `${pesoStr} (até 44,300 kg)`;
        if (age === 15) return `${pesoStr} (até 48,300 kg)`;
        if (age === 16 && !isFemale) return `${pesoStr} (até 53,500 kg)`;
        if (age === 17 && !isFemale) return `${pesoStr} (até 58,500 kg)`;
        if ((age === 16 || age === 17) && isFemale) return `${pesoStr} (até 48,300 kg)`;
        if (isFemale) return `${pesoStr} (até 53,500 kg)`;
        return `${pesoStr} (até 64,000 kg)`;
    }

    if (pName.includes('PENA')) {
        if (age === 4) return `${pesoStr} (até 18,000 kg)`;
        if (age === 5) return `${pesoStr} (até 20,000 kg)`;
        if (age === 6) return `${pesoStr} (até 22,000 kg)`;
        if (age === 7) return `${pesoStr} (até 24,000 kg)`;
        if (age === 8) return `${pesoStr} (até 27,000 kg)`;
        if (age === 9) return `${pesoStr} (até 30,200 kg)`;
        if (age === 10) return `${pesoStr} (até 33,200 kg)`;
        if (age === 11) return `${pesoStr} (até 36,200 kg)`;
        if (age === 12) return `${pesoStr} (até 40,300 kg)`;
        if (age === 13) return `${pesoStr} (até 44,300 kg)`;
        if (age === 14) return `${pesoStr} (até 48,300 kg)`;
        if (age === 15) return `${pesoStr} (até 52,500 kg)`;
        if (age === 16 && !isFemale) return `${pesoStr} (até 58,500 kg)`;
        if (age === 17 && !isFemale) return `${pesoStr} (até 64,000 kg)`;
        if ((age === 16 || age === 17) && isFemale) return `${pesoStr} (até 52,500 kg)`;
        if (isFemale) return `${pesoStr} (até 58,500 kg)`;
        return `${pesoStr} (até 70,000 kg)`;
    }

    if (pName.includes('LEVE')) {
        if (age === 4) return `${pesoStr} (até 21,000 kg)`;
        if (age === 5) return `${pesoStr} (até 24,000 kg)`;
        if (age === 6) return `${pesoStr} (até 25,000 kg)`;
        if (age === 7) return `${pesoStr} (até 27,000 kg)`;
        if (age === 8) return `${pesoStr} (até 30,200 kg)`;
        if (age === 9) return `${pesoStr} (até 33,200 kg)`;
        if (age === 10) return `${pesoStr} (até 36,200 kg)`;
        if (age === 11) return `${pesoStr} (até 39,300 kg)`;
        if (age === 12) return `${pesoStr} (até 44,300 kg)`;
        if (age === 13) return `${pesoStr} (até 48,300 kg)`;
        if (age === 14) return `${pesoStr} (até 52,500 kg)`;
        if (age === 15) return `${pesoStr} (até 56,500 kg)`;
        if (age === 16 && !isFemale) return `${pesoStr} (até 64,000 kg)`;
        if (age === 17 && !isFemale) return `${pesoStr} (até 69,000 kg)`;
        if ((age === 16 || age === 17) && isFemale) return `${pesoStr} (até 56,500 kg)`;
        if (isFemale) return `${pesoStr} (até 64,000 kg)`;
        return `${pesoStr} (até 76,000 kg)`;
    }

    if (pName.includes('MÉDIO') || pName.includes('MEDIO')) {
        if (age === 4) return `${pesoStr} (até 24,000 kg)`;
        if (age === 5) return `${pesoStr} (até 26,000 kg)`;
        if (age === 6) return `${pesoStr} (até 28,000 kg)`;
        if (age === 7) return `${pesoStr} (até 30,200 kg)`;
        if (age === 8) return `${pesoStr} (até 33,200 kg)`;
        if (age === 9) return `${pesoStr} (até 36,200 kg)`;
        if (age === 10) return `${pesoStr} (até 39,300 kg)`;
        if (age === 11) return `${pesoStr} (até 42,300 kg)`;
        if (age === 12) return `${pesoStr} (até 48,300 kg)`;
        if (age === 13) return `${pesoStr} (até 52,500 kg)`;
        if (age === 14) return `${pesoStr} (até 56,500 kg)`;
        if (age === 15) return `${pesoStr} (até 60,500 kg)`;
        if (age === 16 && !isFemale) return `${pesoStr} (até 69,000 kg)`;
        if (age === 17 && !isFemale) return `${pesoStr} (até 74,000 kg)`;
        if ((age === 16 || age === 17) && isFemale) return `${pesoStr} (até 60,500 kg)`;
        if (isFemale) return `${pesoStr} (até 69,000 kg)`;
        return `${pesoStr} (até 82,300 kg)`;
    }

    if (pName.includes('MEIO PESADO') || pName.includes('MEIO-PESADO')) {
        if (age === 4) return `${pesoStr} (até 27,000 kg)`;
        if (age === 5) return `${pesoStr} (até 29,000 kg)`;
        if (age === 6) return `${pesoStr} (até 31,200 kg)`;
        if (age === 7) return `${pesoStr} (até 33,200 kg)`;
        if (age === 8) return `${pesoStr} (até 36,200 kg)`;
        if (age === 9) return `${pesoStr} (até 39,300 kg)`;
        if (age === 10) return `${pesoStr} (até 42,300 kg)`;
        if (age === 11) return `${pesoStr} (até 45,300 kg)`;
        if (age === 12) return `${pesoStr} (até 52,500 kg)`;
        if (age === 13) return `${pesoStr} (até 56,500 kg)`;
        if (age === 14) return `${pesoStr} (até 60,500 kg)`;
        if (age === 15) return `${pesoStr} (até 65,000 kg)`;
        if (age === 16 && !isFemale) return `${pesoStr} (até 74,000 kg)`;
        if (age === 17 && !isFemale) return `${pesoStr} (até 79,300 kg)`;
        if ((age === 16 || age === 17) && isFemale) return `${pesoStr} (até 65,000 kg)`;
        if (isFemale) return `${pesoStr} (até 74,000 kg)`;
        return `${pesoStr} (até 88,300 kg)`;
    }

    if (pName.includes('SUPER PESADO') || pName.includes('SUPER-PESADO')) {
        if (age === 4) return `${pesoStr} (até 33,000 kg)`;
        if (age === 5) return `${pesoStr} (até 35,000 kg)`;
        if (age === 6) return `${pesoStr} (até 37,200 kg)`;
        if (age === 7) return `${pesoStr} (até 39,300 kg)`;
        if (age === 8) return `${pesoStr} (até 42,300 kg)`;
        if (age === 9) return `${pesoStr} (até 45,300 kg)`;
        if (age === 10) return `${pesoStr} (até 48,300 kg)`;
        if (age === 11) return `${pesoStr} (até 51,500 kg)`;
        if (age === 12) return `${pesoStr} (até 60,500 kg)`;
        if (age === 13) return `${pesoStr} (até 65,000 kg)`;
        if (age === 14) return `${pesoStr} (até 69,000 kg)`;
        if (age === 15) return `${pesoStr} (até 73,000 kg)`;
        if (age === 16 && !isFemale) return `${pesoStr} (até 84,300 kg)`;
        if (age === 17 && !isFemale) return `${pesoStr} (até 89,300 kg)`;
        if ((age === 16 || age === 17) && isFemale) return `${pesoStr} (até 73,000 kg)`;
        if (isFemale) return `${pesoStr} (até 84,300 kg)`;
        return `${pesoStr} (até 100,500 kg)`;
    }

    if (pName.includes('PESADO')) {
        if (age === 4) return `${pesoStr} (até 30,000 kg)`;
        if (age === 5) return `${pesoStr} (até 32,000 kg)`;
        if (age === 6) return `${pesoStr} (até 34,200 kg)`;
        if (age === 7) return `${pesoStr} (até 36,200 kg)`;
        if (age === 8) return `${pesoStr} (até 39,300 kg)`;
        if (age === 9) return `${pesoStr} (até 42,300 kg)`;
        if (age === 10) return `${pesoStr} (até 45,300 kg)`;
        if (age === 11) return `${pesoStr} (até 48,300 kg)`;
        if (age === 12) return `${pesoStr} (até 56,500 kg)`;
        if (age === 13) return `${pesoStr} (até 60,500 kg)`;
        if (age === 14) return `${pesoStr} (até 65,000 kg)`;
        if (age === 15) return `${pesoStr} (até 69,000 kg)`;
        if (age === 16 && !isFemale) return `${pesoStr} (até 79,300 kg)`;
        if (age === 17 && !isFemale) return `${pesoStr} (até 84,300 kg)`;
        if ((age === 16 || age === 17) && isFemale) return `${pesoStr} (até 69,000 kg)`;
        if (isFemale) return `${pesoStr} (até 79,300 kg)`;
        return `${pesoStr} (até 94,300 kg)`;
    }

    return pesoStr;
};

// Faixas conhecidas que podem vir erroneamente concatenadas no campo peso
const KNOWN_BELTS = ['BRANCA', 'CINZA', 'AMARELA', 'LARANJA', 'VERDE', 'AZUL', 'ROXA', 'MARROM', 'PRETA', 'VERMELHA', 'CORAL'];

/**
 * Remove a faixa que veio concatenada no campo peso.
 * Ex: "AZUL / PESADISSIMO ACIMA DE 100,50" → "PESADISSIMO ACIMA DE 100,50"
 */
const sanitizePesoField = (rawPeso) => {
    if (!rawPeso) return rawPeso;
    const parts = String(rawPeso).split('/').map(p => p.trim());
    // Se a primeira parte for uma faixa conhecida, descartá-la
    if (parts.length >= 2 && KNOWN_BELTS.some(b => parts[0].toUpperCase() === b)) {
        return parts.slice(1).join(' / ');
    }
    return rawPeso;
};

const AGE_DIVISIONS = [
    'PRÉ-MIRIM', 'PRE-MIRIM', 'MIRIM', 'INFANTIL', 'INFANTO-JUVENIL', 'INFANTO JUVENIL',
    'JUVENIL', 'ADULTO', 'MASTER 1', 'MASTER 2', 'MASTER 3', 'MASTER 4', 'MASTER 5', 'MASTER 6', 'MASTER 7'
];

/**
 * Normaliza os componentes da categoria evitando repetições duplicadas
 */
export const normalizeCategoryComponents = (athlete) => {
    const rawCat = (athlete.categoria || athlete.category || '').toUpperCase().trim();
    const rawFaixa = (athlete.faixa || athlete.belt || '').toUpperCase().trim();
    const rawPeso = (athlete.peso || athlete.weight || '').toUpperCase().trim();
    const rawGenero = (athlete.genero || athlete.sexo || athlete.gender || '').toUpperCase().trim();

    const segments = rawCat.split(/[\/\-]/).map(s => s.trim()).filter(Boolean);

    let ageDivision = '';
    let foundGender = '';
    let foundBelt = '';
    let foundWeight = '';

    segments.forEach(seg => {
        if (!ageDivision && AGE_DIVISIONS.some(ad => seg.includes(ad))) {
            ageDivision = seg;
        } else if (!foundGender && (seg === 'MASCULINO' || seg === 'FEMININO' || seg === 'MASC' || seg === 'FEM')) {
            foundGender = seg.startsWith('FEM') ? 'FEMININO' : 'MASCULINO';
        } else if (!foundBelt && KNOWN_BELTS.some(b => seg === b)) {
            foundBelt = seg;
        } else if (!foundWeight && (seg.includes('KG') || seg.includes('PES') || seg.includes('LEVE') || seg.includes('GALO') || seg.includes('PLUMA') || seg.includes('PENA') || seg.includes('MÉDIO') || seg.includes('MEDIO') || seg.includes('ABSOLUTO'))) {
            foundWeight = seg;
        }
    });

    if (!ageDivision) {
        ageDivision = segments[0] || rawCat || 'ADULTO';
    }

    const finalGender = (rawGenero.startsWith('FEM') || foundGender === 'FEMININO') ? 'MASCULINO' : (rawGenero.startsWith('FEM') ? 'FEMININO' : 'MASCULINO');
    const finalBelt = rawFaixa || foundBelt || 'BRANCA';
    const finalWeight = sanitizePesoField(rawPeso) || foundWeight || 'PESO';

    return {
        ageDivision: ageDivision.toUpperCase(),
        gender: finalGender.toUpperCase(),
        belt: finalBelt.toUpperCase(),
        weight: finalWeight.toUpperCase(),
        isAbsolute: athlete.isAbsolute || rawCat.includes('ABSOLUTO') || rawPeso.includes('ABSOLUTO')
    };
};

export const buildCategoryDescriptor = (athlete) => {
    const comp = normalizeCategoryComponents(athlete);

    const parts = [
        comp.ageDivision,
        comp.gender,
        comp.belt,
        comp.weight
    ].filter(Boolean);

    // Remove duplicatas consecutivas ou repetidas
    const uniqueParts = [];
    parts.forEach(p => {
        if (!uniqueParts.includes(p)) {
            uniqueParts.push(p);
        }
    });

    return {
        key: uniqueParts.map(normalizeGroupPart).join('::'),
        label: uniqueParts.join(' / ')
    };
};

export const matchesBracketMode = (athlete, mode) => {
    if (!mode || mode === 'ALL') return true;
    if (mode === 'GI') return !athlete.isNoGi && !athlete.isAbsolute;
    if (mode === 'NO-GI') return athlete.isNoGi && !athlete.isAbsolute;
    if (mode === 'ABS-GI') return !athlete.isNoGi && athlete.isAbsolute;
    if (mode === 'ABS-NO-GI') return athlete.isNoGi && athlete.isAbsolute;
    return true;
};
