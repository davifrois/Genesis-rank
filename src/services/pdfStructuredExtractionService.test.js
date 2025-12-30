import { describe, it, expect } from 'vitest';
import {
  parseAthleteRecordsFromText,
  buildValidationReport,
} from './pdfStructuredExtractionService';

describe('pdfStructuredExtractionService', () => {
  it('extracts labeled fields and classifies age', () => {
    const text = `
      Nome: Davi  Frois
      Sexo: Masculino
      Faixa: Azul
      Idade: 25 anos
      Academia: Gracie Barra
    `;

    const [record] = parseAthleteRecordsFromText(text);

    expect(record).toMatchObject({
      nome: 'davi frois',
      sexo: 'masculino',
      faixa: 'azul',
      idade: 25,
      categoriaIdade: 'adulto',
      academia: 'Gracie Barra',
    });
  });

  it('normalizes variations and cleans the name', () => {
    const text = `
      Nome: Davi###  Frois 123
      Sexo: FEM.
      Faixas: AZUIS
      Idade: 17
      Academia: Team Alpha
    `;

    const [record] = parseAthleteRecordsFromText(text);

    expect(record).toMatchObject({
      nome: 'davi frois',
      sexo: 'feminino',
      faixa: 'azul',
      idade: 17,
      categoriaIdade: 'juvenil',
      academia: 'Team Alpha',
    });
  });

  it('parses table layouts with headers', () => {
    const text = `
      Nome | Sexo | Faixa | Idade | Academia
      Davi Frois | Masculino | Azul | 25 | Gracie Barra
    `;

    const [record] = parseAthleteRecordsFromText(text);

    expect(record).toMatchObject({
      nome: 'davi frois',
      sexo: 'masculino',
      faixa: 'azul',
      idade: 25,
      categoriaIdade: 'adulto',
      academia: 'Gracie Barra',
    });
  });

  it('handles multiple fields in the same line', () => {
    const text = 'Nome: Ana Silva | Sexo: Feminino | Faixa: Cinza | Idade: 16 | Academia: Alpha';
    const [record] = parseAthleteRecordsFromText(text);

    expect(record).toMatchObject({
      nome: 'ana silva',
      sexo: 'feminino',
      faixa: 'cinza',
      idade: 16,
      categoriaIdade: 'juvenil',
      academia: 'Alpha',
    });
  });

  it('builds a validation report for missing fields', () => {
    const text = 'Nome: Davi Frois';
    const records = parseAthleteRecordsFromText(text);
    const report = buildValidationReport(records);

    expect(report.totalRecords).toBe(1);
    expect(report.validRecords).toBe(0);
    expect(report.invalidRecords).toBe(1);
    expect(report.errors.some((error) => error.field === 'sexo')).toBe(true);
    expect(report.errors.some((error) => error.field === 'faixa')).toBe(true);
    expect(report.errors.some((error) => error.field === 'idade')).toBe(true);
    expect(report.errors.some((error) => error.field === 'academia')).toBe(true);
  });
});
