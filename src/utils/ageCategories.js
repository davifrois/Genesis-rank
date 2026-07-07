export const getAgeRangeFromCategory = (categoryName) => {
    const name = (categoryName || '').toLowerCase();
    
    if (name.includes('infantil') || name.includes('mirim') || name.includes('pré-mirim') || name.includes('pre-mirim') || name.includes('infanto')) return '4 a 15';
    if (name.includes('juvenil')) return '16 a 17';
    if (name.includes('adulto')) return '18 a 29';
    if (name.includes('master 1')) return '30 a 35';
    if (name.includes('master 2')) return '36 a 40';
    if (name.includes('master 3')) return '41 a 45';
    if (name.includes('master 4')) return '46 a 50';
    if (name.includes('master 5')) return '51 a 55';
    if (name.includes('master 6')) return '56+';
    if (name.includes('master')) return '30+';
    
    return '';
};

export const formatCategoryWithAge = (categoryLabel) => {
    if (!categoryLabel) return '';
    const ageRange = getAgeRangeFromCategory(categoryLabel);
    if (ageRange) {
        return `${categoryLabel} idades entre ${ageRange}`;
    }
    return categoryLabel;
};
