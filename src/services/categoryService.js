export const normalizeGroupPart = (value) => (
    (value || '').toString().trim().toLowerCase().replace(/\s+/g, ' ')
);

export const resolveGenderLabel = (athlete) => (
    athlete.genero || athlete.sexo || 'Masculino'
);

export const resolvePesoLabel = (athlete) => (
    athlete.peso || (athlete.isAbsolute ? 'Absoluto' : 'Peso')
);

export const buildCategoryDescriptor = (athlete) => {
    const categoria = athlete.categoria || 'Categoria';
    const faixa = athlete.faixa || 'Faixa';
    const peso = resolvePesoLabel(athlete);
    const genero = resolveGenderLabel(athlete);
    const baseParts = [categoria, faixa, peso, genero];
    const labelParts = athlete.isAbsolute ? ['ABS', ...baseParts] : baseParts;
    const keyParts = [
        ...baseParts,
        athlete.isAbsolute ? 'ABS' : 'STD',
        athlete.isNoGi ? 'NO-GI' : 'GI'
    ];

    return {
        key: keyParts.map(normalizeGroupPart).join('::'),
        label: labelParts.join(' - ')
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
