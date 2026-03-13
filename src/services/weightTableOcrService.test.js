import { describe, expect, it } from 'vitest';
import { extractWeightOptionsFromText } from './weightTableOcrService';

describe('weightTableOcrService', () => {
  it('extracts options from simple weight table text', () => {
    const text = `
      TABELA DE PESO GI
      GALO ATE 57,50
      PLUMA ATE 64,00
      PENA ATE 70,00
      LEVE ATE 76,00
      MEDIO ATE 82,30
    `;

    expect(extractWeightOptionsFromText(text)).toEqual([
      'Galo ate 57,50',
      'Pluma ate 64,00',
      'Pena ate 70,00',
      'Leve ate 76,00',
      'Medio ate 82,30',
    ]);
  });

  it('keeps only weight segment when line has academy/category prefixes', () => {
    const text = `
      MASCULINO / BRANCA / ADULTO / LEVE ATE 76,00
      FEMININO / AZUL / ADULTO / MEDIO ATE 69,00
    `;

    expect(extractWeightOptionsFromText(text)).toEqual([
      'Leve ate 76,00',
      'Medio ate 69,00',
    ]);
  });

  it('deduplicates repeated OCR lines', () => {
    const text = `
      LEVE ATE 76,00
      LEVE ATE 76,00
      LEVE ATE 76,00
    `;

    expect(extractWeightOptionsFromText(text)).toEqual(['Leve ate 76,00']);
  });
});

