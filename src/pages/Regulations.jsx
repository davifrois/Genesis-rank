import React from 'react';
import { useI18n } from '../hooks/useI18n';

const POINT_RULES = [
  { placement: '1º lugar', points: 3 },
  { placement: '2º lugar', points: 2 },
  { placement: '3º lugar', points: 1 }
];

const Regulations = () => {
  const { language } = useI18n();
  const isEnglish = language === 'en-US';
  const copy = isEnglish
    ? {
        kicker: 'Regulations',
        title: 'Clear scoring to keep ranking transparent.',
        description:
          'Simple and public rules. Each event has a defined weight and ranking updates automatically.',
        values: 'Values',
        tableTitle: 'Points table',
        placement: 'Placement',
        points: 'Points',
        pointsCountTitle: 'How points count',
        pointsCountA: '1st place awards 3 points.',
        pointsCountB: '2nd place awards 2 points.',
        pointsCountC: '3rd place awards 1 point.',
        weightTables: 'Weight tables',
        weightTablesTitle: 'Official weight tables by age and category',
        weightTablesDesc: 'Use the image table below to validate each athlete weight class before check-in.',
        youthWeightTitle: 'Infantil table (4 to 15 years)',
        youthWeightDesc: 'Weight division by age group for base categories.',
        mainWeightTitle: 'Infantojuvenil, Juvenil, Adulto e Master',
        mainWeightDesc: 'Reference table for GI / NO-GI registration in youth and adult categories.',
        transparencyTitle: 'Total transparency',
        transparencyText:
          'All rules are public for athletes and academies. The goal is clarity and trust.',
        updateTitle: 'Update',
        updateText:
          'Each finished event updates the ranking in minutes. The athlete sees the profile impact immediately.'
      }
    : {
        kicker: 'Regulamento',
        title: 'Pontuação clara para manter o ranking transparente.',
        description:
          'Regras simples e públicas. Cada evento possui um peso definido e o ranking é atualizado automaticamente.',
        values: 'Valores',
        tableTitle: 'Tabela de pontos',
        placement: 'Colocação',
        points: 'Pontos',
        pointsCountTitle: 'Como os pontos contam',
        pointsCountA: '1º lugar soma 3 pontos.',
        pointsCountB: '2º lugar soma 2 pontos.',
        pointsCountC: '3º lugar soma 1 ponto.',
        weightTables: 'Tabelas de peso',
        weightTablesTitle: 'Tabelas oficiais de peso por idade e categoria',
        weightTablesDesc: 'Use as imagens abaixo para validar a divisão de peso de cada atleta antes da checagem.',
        youthWeightTitle: 'Tabela Infantil (4 a 15 anos)',
        youthWeightDesc: 'Divisão de peso por faixa etária para categorias de base.',
        mainWeightTitle: 'Infantojuvenil, Juvenil, Adulto e Master',
        mainWeightDesc: 'Tabela de referência para inscrição GI / NO-GI nas categorias juvenis e adultas.',
        transparencyTitle: 'Transparência total',
        transparencyText:
          'Todas as regras ficam públicas para atletas e academias. O objetivo é manter clareza e confiança.',
        updateTitle: 'Atualização',
        updateText:
          'Cada evento encerrado atualiza o ranking em minutos. O atleta visualiza o impacto no perfil.'
      };

  return (
    <div className="public-page">
      <section className="public-header">
        <div>
          <span className="section-kicker">{copy.kicker}</span>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
      </section>

      <section className="public-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{copy.values}</span>
            <h2>{copy.tableTitle}</h2>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>{copy.placement}</th>
              <th className="points-col">{copy.points}</th>
            </tr>
          </thead>
          <tbody>
            {POINT_RULES.map((rule) => (
              <tr key={rule.placement}>
                <td>
                  <div className="table-name">{rule.placement}</div>
                </td>
                <td className="points-col">
                  <span className="points-pill">{rule.points}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="public-section" id="tabela-peso">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{copy.weightTables}</span>
            <h2>{copy.weightTablesTitle}</h2>
            <p>{copy.weightTablesDesc}</p>
          </div>
        </div>
        <div className="weight-table-grid">
          <article className="weight-table-card" id="tabela-peso-infantil">
            <h3>{copy.youthWeightTitle}</h3>
            <p>{copy.youthWeightDesc}</p>
            <img
              className="weight-table-image"
              src="/weight-table-infantil.jpg"
              alt={copy.youthWeightTitle}
              loading="lazy"
            />
          </article>
          <article className="weight-table-card" id="tabela-peso-juvenil-adulto">
            <h3>{copy.mainWeightTitle}</h3>
            <p>{copy.mainWeightDesc}</p>
            <img
              className="weight-table-image"
              src="/weight-table-juvenil-adulto.jpg"
              alt={copy.mainWeightTitle}
              loading="lazy"
            />
          </article>
        </div>
      </section>

      <section className="public-section">
        <div className="content-grid">
          <div className="content-card">
            <h3>{copy.pointsCountTitle}</h3>
            <ul className="text-list">
              <li>{copy.pointsCountA}</li>
              <li>{copy.pointsCountB}</li>
              <li>{copy.pointsCountC}</li>
            </ul>
          </div>
          <div className="content-card">
            <h3>{copy.transparencyTitle}</h3>
            <p>{copy.transparencyText}</p>
          </div>
          <div className="content-card">
            <h3>{copy.updateTitle}</h3>
            <p>{copy.updateText}</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Regulations;
