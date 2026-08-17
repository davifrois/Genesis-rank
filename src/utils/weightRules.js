export const ALL_WEIGHT_NAMES = [
  'Galo',
  'Pluma',
  'Pena',
  'Leve',
  'Médio',
  'Meio-Pesado',
  'Pesado',
  'Super-Pesado',
  'Pesadíssimo'
];

/**
 * Normaliza o valor da idade como número
 */

/**
 * Retorna as opções de peso disponíveis dinamicamente com base na idade e no gênero.
 * Suporta regras da IBJJF / CBJJ para Pré-Mirim, Mirim, Infantil, Infanto-Juvenil, Juvenil e Adulto/Master.
 */
export const getAvailableWeightsForProfile = (ageInput, genderInput, isNoGi = false, customOptionsStr = '') => {
  if (customOptionsStr && typeof customOptionsStr === 'string' && customOptionsStr.trim()) {
    const lines = customOptionsStr.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      return lines.map(line => {
        const val = line.split('(')[0].trim() || line;
        return { value: val, label: line };
      });
    }
  }

  const gender = (genderInput || '').toString().toLowerCase();
  const isFemale = gender.includes('femi') || gender.includes('mulher') || gender.includes('f');

  const currentYear = new Date().getFullYear();
  let age = parseInt(ageInput, 10) || 0;
  if (age > 1900) age = currentYear - age;
  if (age <= 0) age = 20; // Default Adulto se não definido

  // Pré-Mirim 4
  if (age <= 4) {
    return [
      { value: 'Pluma', label: 'Pluma (até 14,700 kg)' },
      { value: 'Pena', label: 'Pena (até 18,000 kg)' },
      { value: 'Leve', label: 'Leve (até 21,000 kg)' },
      { value: 'Médio', label: 'Médio (até 24,000 kg)' },
      { value: 'Meio-Pesado', label: 'Meio-Pesado (até 27,000 kg)' },
      { value: 'Pesado', label: 'Pesado (até 30,000 kg)' },
      { value: 'Super-Pesado', label: 'Super-Pesado (até 33,000 kg)' },
      { value: 'Pesadíssimo', label: 'Pesadíssimo (Acima de 33,000 kg)' }
    ];
  }
  // Pré-Mirim 5
  if (age === 5) {
    return [
      { value: 'Pluma', label: 'Pluma (até 17,900 kg)' },
      { value: 'Pena', label: 'Pena (até 20,000 kg)' },
      { value: 'Leve', label: 'Leve (até 24,000 kg)' },
      { value: 'Médio', label: 'Médio (até 26,000 kg)' },
      { value: 'Meio-Pesado', label: 'Meio-Pesado (até 29,000 kg)' },
      { value: 'Pesado', label: 'Pesado (até 32,000 kg)' },
      { value: 'Super-Pesado', label: 'Super-Pesado (até 35,000 kg)' },
      { value: 'Pesadíssimo', label: 'Pesadíssimo (Acima de 35,000 kg)' }
    ];
  }
  // Pré-Mirim 6
  if (age === 6) {
    return [
      { value: 'Pluma', label: 'Pluma (até 18,900 kg)' },
      { value: 'Pena', label: 'Pena (até 22,000 kg)' },
      { value: 'Leve', label: 'Leve (até 25,000 kg)' },
      { value: 'Médio', label: 'Médio (até 28,000 kg)' },
      { value: 'Meio-Pesado', label: 'Meio-Pesado (até 31,200 kg)' },
      { value: 'Pesado', label: 'Pesado (até 34,200 kg)' },
      { value: 'Super-Pesado', label: 'Super-Pesado (até 37,200 kg)' },
      { value: 'Pesadíssimo', label: 'Pesadíssimo (Acima de 37,200 kg)' }
    ];
  }
  // Mirim 7
  if (age === 7) {
    return [
      { value: 'Pluma', label: 'Pluma (até 21,000 kg)' },
      { value: 'Pena', label: 'Pena (até 24,000 kg)' },
      { value: 'Leve', label: 'Leve (até 27,000 kg)' },
      { value: 'Médio', label: 'Médio (até 30,200 kg)' },
      { value: 'Meio-Pesado', label: 'Meio-Pesado (até 33,200 kg)' },
      { value: 'Pesado', label: 'Pesado (até 36,200 kg)' },
      { value: 'Super-Pesado', label: 'Super-Pesado (até 39,300 kg)' },
      { value: 'Pesadíssimo', label: 'Pesadíssimo (Acima de 39,300 kg)' }
    ];
  }
  // Mirim 8
  if (age === 8) {
    return [
      { value: 'Pluma', label: 'Pluma (até 24,000 kg)' },
      { value: 'Pena', label: 'Pena (até 27,000 kg)' },
      { value: 'Leve', label: 'Leve (até 30,200 kg)' },
      { value: 'Médio', label: 'Médio (até 33,200 kg)' },
      { value: 'Meio-Pesado', label: 'Meio-Pesado (até 36,200 kg)' },
      { value: 'Pesado', label: 'Pesado (até 39,300 kg)' },
      { value: 'Super-Pesado', label: 'Super-Pesado (até 42,300 kg)' },
      { value: 'Pesadíssimo', label: 'Pesadíssimo (Acima de 42,300 kg)' }
    ];
  }
  // Mirim 9
  if (age === 9) {
    return [
      { value: 'Pluma', label: 'Pluma (até 27,000 kg)' },
      { value: 'Pena', label: 'Pena (até 30,200 kg)' },
      { value: 'Leve', label: 'Leve (até 33,200 kg)' },
      { value: 'Médio', label: 'Médio (até 36,200 kg)' },
      { value: 'Meio-Pesado', label: 'Meio-Pesado (até 39,300 kg)' },
      { value: 'Pesado', label: 'Pesado (até 42,300 kg)' },
      { value: 'Super-Pesado', label: 'Super-Pesado (até 45,300 kg)' },
      { value: 'Pesadíssimo', label: 'Pesadíssimo (Acima de 45,300 kg)' }
    ];
  }
  // Infantil 10
  if (age === 10) {
    return [
      { value: 'Galo', label: 'Galo (até 27,000 kg)' },
      { value: 'Pluma', label: 'Pluma (até 30,200 kg)' },
      { value: 'Pena', label: 'Pena (até 33,200 kg)' },
      { value: 'Leve', label: 'Leve (até 36,200 kg)' },
      { value: 'Médio', label: 'Médio (até 39,300 kg)' },
      { value: 'Meio-Pesado', label: 'Meio-Pesado (até 42,300 kg)' },
      { value: 'Pesado', label: 'Pesado (até 45,300 kg)' },
      { value: 'Super-Pesado', label: 'Super-Pesado (até 48,300 kg)' },
      { value: 'Pesadíssimo', label: 'Pesadíssimo (Acima de 48,300 kg)' }
    ];
  }
  // Infantil 11
  if (age === 11) {
    return [
      { value: 'Galo', label: 'Galo (até 30,200 kg)' },
      { value: 'Pluma', label: 'Pluma (até 33,200 kg)' },
      { value: 'Pena', label: 'Pena (até 36,200 kg)' },
      { value: 'Leve', label: 'Leve (até 39,300 kg)' },
      { value: 'Médio', label: 'Médio (até 42,300 kg)' },
      { value: 'Meio-Pesado', label: 'Meio-Pesado (até 45,300 kg)' },
      { value: 'Pesado', label: 'Pesado (até 48,300 kg)' },
      { value: 'Super-Pesado', label: 'Super-Pesado (até 51,500 kg)' },
      { value: 'Pesadíssimo', label: 'Pesadíssimo (Acima de 51,500 kg)' }
    ];
  }
  // Infantil 12
  if (age === 12) {
    return [
      { value: 'Galo', label: 'Galo (até 32,200 kg)' },
      { value: 'Pluma', label: 'Pluma (até 36,200 kg)' },
      { value: 'Pena', label: 'Pena (até 40,300 kg)' },
      { value: 'Leve', label: 'Leve (até 44,300 kg)' },
      { value: 'Médio', label: 'Médio (até 48,300 kg)' },
      { value: 'Meio-Pesado', label: 'Meio-Pesado (até 52,500 kg)' },
      { value: 'Pesado', label: 'Pesado (até 56,500 kg)' },
      { value: 'Super-Pesado', label: 'Super-Pesado (até 60,500 kg)' },
      { value: 'Pesadíssimo', label: 'Pesadíssimo (Acima de 60,500 kg)' }
    ];
  }
  // Infanto-Juvenil 13
  if (age === 13) {
    return [
      { value: 'Galo', label: 'Galo (até 36,200 kg)' },
      { value: 'Pluma', label: 'Pluma (até 40,300 kg)' },
      { value: 'Pena', label: 'Pena (até 44,300 kg)' },
      { value: 'Leve', label: 'Leve (até 48,300 kg)' },
      { value: 'Médio', label: 'Médio (até 52,500 kg)' },
      { value: 'Meio-Pesado', label: 'Meio-Pesado (até 56,500 kg)' },
      { value: 'Pesado', label: 'Pesado (até 60,500 kg)' },
      { value: 'Super-Pesado', label: 'Super-Pesado (até 65,000 kg)' },
      { value: 'Pesadíssimo', label: 'Pesadíssimo (Acima de 65,000 kg)' }
    ];
  }
  // Infanto-Juvenil 14
  if (age === 14) {
    return [
      { value: 'Galo', label: 'Galo (até 40,300 kg)' },
      { value: 'Pluma', label: 'Pluma (até 44,300 kg)' },
      { value: 'Pena', label: 'Pena (até 48,300 kg)' },
      { value: 'Leve', label: 'Leve (até 52,500 kg)' },
      { value: 'Médio', label: 'Médio (até 56,500 kg)' },
      { value: 'Meio-Pesado', label: 'Meio-Pesado (até 60,500 kg)' },
      { value: 'Pesado', label: 'Pesado (até 65,000 kg)' },
      { value: 'Super-Pesado', label: 'Super-Pesado (até 69,000 kg)' },
      { value: 'Pesadíssimo', label: 'Pesadíssimo (Acima de 69,000 kg)' }
    ];
  }
  // Infanto-Juvenil 15
  if (age === 15) {
    return [
      { value: 'Galo', label: 'Galo (até 44,300 kg)' },
      { value: 'Pluma', label: 'Pluma (até 48,300 kg)' },
      { value: 'Pena', label: 'Pena (até 52,500 kg)' },
      { value: 'Leve', label: 'Leve (até 56,500 kg)' },
      { value: 'Médio', label: 'Médio (até 60,500 kg)' },
      { value: 'Meio-Pesado', label: 'Meio-Pesado (até 65,000 kg)' },
      { value: 'Pesado', label: 'Pesado (até 69,000 kg)' },
      { value: 'Super-Pesado', label: 'Super-Pesado (até 73,000 kg)' },
      { value: 'Pesadíssimo', label: 'Pesadíssimo (Acima de 73,000 kg)' }
    ];
  }

  // Juvenil (16-17)
  if (age === 16 || age === 17) {
    if (isFemale) {
      return [
        { value: 'Galo', label: 'Galo (até 44,300 kg)' },
        { value: 'Pluma', label: 'Pluma (até 48,300 kg)' },
        { value: 'Pena', label: 'Pena (até 52,500 kg)' },
        { value: 'Leve', label: 'Leve (até 56,500 kg)' },
        { value: 'Médio', label: 'Médio (até 60,500 kg)' },
        { value: 'Meio-Pesado', label: 'Meio-Pesado (até 65,000 kg)' },
        { value: 'Pesado', label: 'Pesado (até 69,000 kg)' },
        { value: 'Super-Pesado', label: 'Super-Pesado (até 73,000 kg)' },
        { value: 'Pesadíssimo', label: 'Pesadíssimo (Acima de 73,000 kg)' }
      ];
    }
    if (age === 16) {
      return [
        { value: 'Galo', label: 'Galo (até 48,500 kg)' },
        { value: 'Pluma', label: 'Pluma (até 53,500 kg)' },
        { value: 'Pena', label: 'Pena (até 58,500 kg)' },
        { value: 'Leve', label: 'Leve (até 64,000 kg)' },
        { value: 'Médio', label: 'Médio (até 69,000 kg)' },
        { value: 'Meio-Pesado', label: 'Meio-Pesado (até 74,000 kg)' },
        { value: 'Pesado', label: 'Pesado (até 79,300 kg)' },
        { value: 'Super-Pesado', label: 'Super-Pesado (até 84,300 kg)' },
        { value: 'Pesadíssimo', label: 'Pesadíssimo (Acima de 84,300 kg)' }
      ];
    }
    return [
      { value: 'Galo', label: 'Galo (até 53,500 kg)' },
      { value: 'Pluma', label: 'Pluma (até 58,500 kg)' },
      { value: 'Pena', label: 'Pena (até 64,000 kg)' },
      { value: 'Leve', label: 'Leve (até 69,000 kg)' },
      { value: 'Médio', label: 'Médio (até 74,000 kg)' },
      { value: 'Meio-Pesado', label: 'Meio-Pesado (até 79,300 kg)' },
      { value: 'Pesado', label: 'Pesado (até 84,300 kg)' },
      { value: 'Super-Pesado', label: 'Super-Pesado (até 89,300 kg)' },
      { value: 'Pesadíssimo', label: 'Pesadíssimo (Acima de 89,300 kg)' }
    ];
  }

  // Adulto / Master (18+)
  if (isFemale) {
    return [
      { value: 'Galo', label: 'Galo (até 48,500 kg)' },
      { value: 'Pluma', label: 'Pluma (até 53,500 kg)' },
      { value: 'Pena', label: 'Pena (até 58,500 kg)' },
      { value: 'Leve', label: 'Leve (até 64,000 kg)' },
      { value: 'Médio', label: 'Médio (até 69,000 kg)' },
      { value: 'Meio-Pesado', label: 'Meio-Pesado (até 74,000 kg)' },
      { value: 'Pesado', label: 'Pesado (até 79,300 kg)' },
      { value: 'Super-Pesado', label: 'Super-Pesado (até 84,300 kg)' },
      { value: 'Pesadíssimo', label: 'Pesadíssimo (Acima de 84,300 kg)' }
    ];
  }

  return [
    { value: 'Galo', label: 'Galo (até 57,500 kg)' },
    { value: 'Pluma', label: 'Pluma (até 64,000 kg)' },
    { value: 'Pena', label: 'Pena (até 70,000 kg)' },
    { value: 'Leve', label: 'Leve (até 76,000 kg)' },
    { value: 'Médio', label: 'Médio (até 82,300 kg)' },
    { value: 'Meio-Pesado', label: 'Meio-Pesado (até 88,300 kg)' },
    { value: 'Pesado', label: 'Pesado (até 94,300 kg)' },
    { value: 'Super-Pesado', label: 'Super-Pesado (até 100,500 kg)' },
    { value: 'Pesadíssimo', label: 'Pesadíssimo (Acima de 100,500 kg)' }
  ];
};
