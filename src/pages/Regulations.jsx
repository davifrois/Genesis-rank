import React from 'react';
import { useI18n } from '../hooks/useI18n';

const Regulations = () => {
  const { uiVariant } = useI18n();

  const copyByLanguage = {
    pt: {
      kicker: 'Regulamento',
      title: 'Pontuacao clara para manter o ranking transparente.',
      description:
        'Regras simples e publicas. Cada evento possui peso definido e o ranking e atualizado automaticamente.',
      values: 'Valores',
      tableTitle: 'Tabela de pontos',
      placement: 'Colocacao',
      points: 'Pontos',
      pointRules: [
        { placement: '1 lugar', points: 3 },
        { placement: '2 lugar', points: 2 },
        { placement: '3 lugar', points: 1 }
      ],
      pointsCountTitle: 'Como os pontos contam',
      pointsCountA: '1 lugar soma 3 pontos.',
      pointsCountB: '2 lugar soma 2 pontos.',
      pointsCountC: '3 lugar soma 1 ponto.',
      weightTables: 'Tabelas de peso',
      weightTablesTitle: 'Tabelas oficiais de peso por idade e categoria',
      weightTablesDesc: 'Use as imagens abaixo para validar a divisao de peso de cada atleta antes da checagem.',
      youthWeightTitle: 'Tabela Infantil (4 a 15 anos)',
      youthWeightDesc: 'Divisao de peso por faixa etaria para categorias de base.',
      mainWeightTitle: 'Infantojuvenil, Juvenil, Adulto e Master',
      mainWeightDesc: 'Tabela de referencia para inscricao GI / NO-GI nas categorias juvenis e adultas.',
      transparencyTitle: 'Transparencia total',
      transparencyText:
        'Todas as regras ficam publicas para atletas e academias. O objetivo e manter clareza e confianca.',
      updateTitle: 'Atualizacao',
      updateText:
        'Cada evento encerrado atualiza o ranking em minutos. O atleta visualiza o impacto no perfil.'
    },
    en: {
      kicker: 'Regulations',
      title: 'Clear scoring to keep ranking transparent.',
      description:
        'Simple and public rules. Each event has a defined weight and ranking updates automatically.',
      values: 'Values',
      tableTitle: 'Points table',
      placement: 'Placement',
      points: 'Points',
      pointRules: [
        { placement: '1st place', points: 3 },
        { placement: '2nd place', points: 2 },
        { placement: '3rd place', points: 1 }
      ],
      pointsCountTitle: 'How points count',
      pointsCountA: '1st place awards 3 points.',
      pointsCountB: '2nd place awards 2 points.',
      pointsCountC: '3rd place awards 1 point.',
      weightTables: 'Weight tables',
      weightTablesTitle: 'Official weight tables by age and category',
      weightTablesDesc: 'Use the image tables below to validate each athlete weight class before check-in.',
      youthWeightTitle: 'Youth table (4 to 15 years)',
      youthWeightDesc: 'Weight division by age group for base categories.',
      mainWeightTitle: 'Infantojuvenil, Juvenil, Adulto e Master',
      mainWeightDesc: 'Reference table for GI / NO-GI registration in youth and adult categories.',
      transparencyTitle: 'Total transparency',
      transparencyText:
        'All rules are public for athletes and academies. The goal is clarity and trust.',
      updateTitle: 'Update',
      updateText:
        'Each finished event updates the ranking in minutes. The athlete sees the profile impact immediately.'
    },
    es: {
      kicker: 'Reglamento',
      title: 'Puntuacion clara para mantener el ranking transparente.',
      description:
        'Reglas simples y publicas. Cada evento tiene peso definido y el ranking se actualiza automaticamente.',
      values: 'Valores',
      tableTitle: 'Tabla de puntos',
      placement: 'Posicion',
      points: 'Puntos',
      pointRules: [
        { placement: '1 lugar', points: 3 },
        { placement: '2 lugar', points: 2 },
        { placement: '3 lugar', points: 1 }
      ],
      pointsCountTitle: 'Como cuentan los puntos',
      pointsCountA: '1 lugar suma 3 puntos.',
      pointsCountB: '2 lugar suma 2 puntos.',
      pointsCountC: '3 lugar suma 1 punto.',
      weightTables: 'Tablas de peso',
      weightTablesTitle: 'Tablas oficiales de peso por edad y categoria',
      weightTablesDesc: 'Use las imagenes para validar la division de peso de cada atleta antes del check-in.',
      youthWeightTitle: 'Tabla Infantil (4 a 15 anos)',
      youthWeightDesc: 'Division de peso por grupo de edad para categorias de base.',
      mainWeightTitle: 'Infantojuvenil, Juvenil, Adulto y Master',
      mainWeightDesc: 'Tabla de referencia para inscripcion GI / NO-GI en categorias juveniles y adultas.',
      transparencyTitle: 'Transparencia total',
      transparencyText:
        'Todas las reglas son publicas para atletas y academias. El objetivo es mantener claridad y confianza.',
      updateTitle: 'Actualizacion',
      updateText:
        'Cada evento finalizado actualiza el ranking en minutos. El atleta ve el impacto de inmediato.'
    },
    fr: {
      kicker: 'Reglement',
      title: 'Un score clair pour un classement transparent.',
      description:
        'Regles simples et publiques. Chaque evenement a un poids defini et le classement se met a jour automatiquement.',
      values: 'Valeurs',
      tableTitle: 'Table des points',
      placement: 'Classement',
      points: 'Points',
      pointRules: [
        { placement: '1 place', points: 3 },
        { placement: '2 place', points: 2 },
        { placement: '3 place', points: 1 }
      ],
      pointsCountTitle: 'Comment les points sont comptes',
      pointsCountA: 'La 1re place rapporte 3 points.',
      pointsCountB: 'La 2e place rapporte 2 points.',
      pointsCountC: 'La 3e place rapporte 1 point.',
      weightTables: 'Tables de poids',
      weightTablesTitle: 'Tables officielles de poids par age et categorie',
      weightTablesDesc: 'Utilisez les tableaux ci-dessous pour valider la categorie de poids de chaque athlete avant le check-in.',
      youthWeightTitle: 'Table Enfant (4 a 15 ans)',
      youthWeightDesc: 'Division de poids par tranche d age pour les categories de base.',
      mainWeightTitle: 'Infantojuvenil, Juvenil, Adulto et Master',
      mainWeightDesc: 'Table de reference pour inscription GI / NO-GI dans les categories jeunes et adultes.',
      transparencyTitle: 'Transparence totale',
      transparencyText:
        'Toutes les regles sont publiques pour les athletes et les academies. L objectif est la clarte et la confiance.',
      updateTitle: 'Mise a jour',
      updateText:
        'Chaque evenement termine met a jour le classement en quelques minutes. L athlete voit l impact immediatement.'
    }
  };

  const copy = copyByLanguage[uiVariant] || copyByLanguage.pt;

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
            {copy.pointRules.map((rule) => (
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
