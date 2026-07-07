export const ALL_BELTS = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];

/**
 * Retorna as faixas permitidas baseadas na idade (regras da CBJJ/IBJJF adaptadas).
 * - Preta/Marrom: 18+ anos
 * - Roxa/Azul: 16+ anos
 * - Verde/Laranja/Amarela/Cinza: Até 15 anos
 * - Branca: Qualquer idade
 */
export const getAvailableBeltsForAge = (age) => {
  if (age === '' || age === null || age === undefined || isNaN(age)) {
    return ALL_BELTS; 
  }
  
  const numAge = Number(age);
  
  return ALL_BELTS.filter(belt => {
    const b = belt.toLowerCase();
    if (b === 'preta' || b === 'marrom') return numAge >= 18;
    if (b === 'roxa' || b === 'azul') return numAge >= 16;
    if (b === 'verde' || b === 'laranja' || b === 'amarela' || b === 'cinza') return numAge <= 15;
    return true; // Branca sempre liberada
  });
};

export const isValidBeltForAge = (belt, age) => {
  if (!belt) return true;
  const available = getAvailableBeltsForAge(age);
  return available.some(b => b.toLowerCase() === belt.toLowerCase());
};
