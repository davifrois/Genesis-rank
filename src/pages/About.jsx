import React from 'react';
import { useI18n } from '../hooks/useI18n';

const About = () => {
  const { uiVariant } = useI18n();

  const copyByLanguage = {
    pt: {
      kicker: 'Sobre a Genesis',
      title: 'Genesis Esportes',
      subtitle:
        'Perfil institucional, missao, valores e atuacao completa na organizacao de campeonatos de Jiu-Jitsu.',
      highlights: [
        { value: '2017', label: 'Fundada em Belo Horizonte' },
        { value: '27.835.080/0001-51', label: 'CNPJ regularizado' },
        { value: 'Ponta a ponta', label: 'Operacao completa de eventos' }
      ],
      companyTitle: 'Quem somos',
      companyLead:
        'A Genesis Esportes e uma empresa especializada em gestao esportiva, com foco em campeonatos de Jiu-Jitsu e operacoes de ranking.',
      companyText:
        'Desde 2017, entregamos suporte profissional do planejamento estrategico ate a execucao final, unindo operacao presencial e digital. Nossa equipe atua com rigor tecnico, experiencia pratica e ferramentas especializadas para garantir organizacao, previsibilidade e qualidade em todas as etapas do evento.',
      missionTitle: 'Nossa missao',
      missionText:
        'Prestar servicos de alto padrao para organizadores, federacoes, academias e atletas, assegurando planejamento confiavel, execucao eficiente e gestao transparente em cada campeonato.',
      valuesTitle: 'Nossos valores institucionais',
      values: [
        'Credibilidade e consistencia tecnica em cada entrega.',
        'Comprometimento com parceria estrategica junto ao cliente.',
        'Responsabilidade, transparencia e conduta etica.',
        'Agilidade operacional sem perder padrao de qualidade.',
        'Foco em resultados mensuraveis e melhoria continua.',
        'Excelencia profissional no atendimento em todos os canais.'
      ],
      whyTitle: 'Por que escolher a Genesis Esportes?',
      whyItems: [
        'Planejamento especializado para diferentes formatos e portes de evento.',
        'Sistemas digitais modernos para inscricoes, ranking e chaveamento.',
        'Controle operacional de cronograma, categorias e fluxo de atletas.',
        'Comunicacao e divulgacao qualificada em nossos canais.',
        'Montagem e desmontagem da estrutura fisica com supervisao tecnica.',
        'Equipe experiente preparada para momentos criticos de competicao.',
        'Acompanhamento dedicado antes, durante e apos o campeonato.',
        'Um unico parceiro capaz de entregar execucao completa de ponta a ponta.'
      ],
      benefitsTitle: 'Beneficios estrategicos para o seu evento',
      benefits: [
        'Reducao da sobrecarga operacional para organizadores e coordenacao.',
        'Maior controle dos processos com previsibilidade e governanca.',
        'Menos falhas operacionais por meio de procedimentos padronizados.',
        'Decisoes mais rapidas com base em dados qualificados do evento.',
        'Melhor experiencia para atletas, equipes e parceiros envolvidos.',
        'Fortalecimento da reputacao e da credibilidade institucional do campeonato.'
      ]
    },
    en: {
      kicker: 'About Genesis',
      title: 'Genesis Esportes',
      subtitle:
        'Institutional profile, mission, values and complete operational expertise for Jiu-Jitsu championships.',
      highlights: [
        { value: '2017', label: 'Founded in Belo Horizonte' },
        { value: '27.835.080/0001-51', label: 'Registered CNPJ' },
        { value: 'End to End', label: 'Complete event operation' }
      ],
      companyTitle: 'Who we are',
      companyLead:
        'Genesis Esportes is a specialized sports management company focused on Jiu-Jitsu competitions and ranking operations.',
      companyText:
        'Since 2017, we provide professional support from strategic planning to final delivery, combining on-site execution and digital systems. Our team works with technical rigor, practical experience and specialized tools to ensure organization, predictability and quality across every event stage.',
      missionTitle: 'Our mission',
      missionText:
        'Deliver high-standard service for organizers, federations, academies and athletes, ensuring reliable planning, efficient execution and transparent management in every championship.',
      valuesTitle: 'Our institutional values',
      values: [
        'Credibility and technical consistency in every delivery.',
        'Commitment to strategic partnership with each client.',
        'Responsibility, transparency and ethical conduct.',
        'Operational agility without compromising quality standards.',
        'Focus on measurable results and continuous improvement.',
        'Professional service excellence across all channels.'
      ],
      whyTitle: 'Why choose Genesis Esportes?',
      whyItems: [
        'Specialized planning for different event formats and audience sizes.',
        'Modern digital systems for registrations, ranking and brackets.',
        'Operational control of schedules, categories and athlete flow.',
        'Qualified communication and promotion in our channels.',
        'On-site structure setup and takedown with technical supervision.',
        'Experienced team prepared for critical competition moments.',
        'Dedicated support before, during and after the event.',
        'Single partner capable of delivering complete end-to-end execution.'
      ],
      benefitsTitle: 'Strategic benefits for your event',
      benefits: [
        'Lower operational overload for organizers and coordination teams.',
        'Higher process control with more predictability and governance.',
        'Fewer operational failures through standardized procedures.',
        'Faster decisions based on qualified event data.',
        'Better experience for athletes, teams and partners.',
        'Stronger event reputation and institutional credibility.'
      ]
    },
    es: {
      kicker: 'Sobre Genesis',
      title: 'Genesis Esportes',
      subtitle:
        'Perfil institucional, mision, valores y operacion completa en campeonatos de Jiu-Jitsu.',
      highlights: [
        { value: '2017', label: 'Fundada en Belo Horizonte' },
        { value: '27.835.080/0001-51', label: 'CNPJ registrado' },
        { value: 'Integral', label: 'Operacion completa de eventos' }
      ],
      companyTitle: 'Quienes somos',
      companyLead:
        'Genesis Esportes es una empresa especializada en gestion deportiva, enfocada en campeonatos de Jiu-Jitsu y operaciones de ranking.',
      companyText:
        'Desde 2017 ofrecemos soporte profesional desde la planificacion estrategica hasta la entrega final, combinando operacion presencial y sistemas digitales. Nuestro equipo trabaja con rigor tecnico y experiencia practica para garantizar organizacion, previsibilidad y calidad en todas las etapas del evento.',
      missionTitle: 'Nuestra mision',
      missionText:
        'Ofrecer servicios de alto nivel para organizadores, federaciones, academias y atletas, asegurando planificacion confiable, ejecucion eficiente y gestion transparente en cada campeonato.',
      valuesTitle: 'Nuestros valores institucionales',
      values: [
        'Credibilidad y consistencia tecnica en cada entrega.',
        'Compromiso con alianza estrategica junto a cada cliente.',
        'Responsabilidad, transparencia y conducta etica.',
        'Agilidad operativa sin perder estandar de calidad.',
        'Enfoque en resultados medibles y mejora continua.',
        'Excelencia profesional en la atencion de todos los canales.'
      ],
      whyTitle: 'Por que elegir Genesis Esportes?',
      whyItems: [
        'Planificacion especializada para diferentes formatos y tamanos de evento.',
        'Sistemas digitales modernos para inscripciones, ranking y llaves.',
        'Control operativo de cronograma, categorias y flujo de atletas.',
        'Comunicacion y promocion calificada en nuestros canales.',
        'Montaje y desmontaje de estructura fisica con supervision tecnica.',
        'Equipo experimentado para momentos criticos de competencia.',
        'Acompanamiento dedicado antes, durante y despues del evento.',
        'Un solo socio capaz de entregar ejecucion completa de punta a punta.'
      ],
      benefitsTitle: 'Beneficios estrategicos para su evento',
      benefits: [
        'Menor sobrecarga operativa para organizadores y coordinacion.',
        'Mayor control de procesos con mas previsibilidad y gobernanza.',
        'Menos fallas operativas con procedimientos estandarizados.',
        'Decisiones mas rapidas basadas en datos calificados del evento.',
        'Mejor experiencia para atletas, equipos y socios.',
        'Mayor reputacion y credibilidad institucional del campeonato.'
      ]
    },
    fr: {
      kicker: 'A propos de Genesis',
      title: 'Genesis Esportes',
      subtitle:
        'Profil institutionnel, mission, valeurs et operation complete pour les championnats de Jiu-Jitsu.',
      highlights: [
        { value: '2017', label: 'Fondee a Belo Horizonte' },
        { value: '27.835.080/0001-51', label: 'CNPJ enregistre' },
        { value: 'De bout en bout', label: 'Operation complete des evenements' }
      ],
      companyTitle: 'Qui sommes-nous',
      companyLead:
        'Genesis Esportes est une entreprise specialisee en gestion sportive, axee sur les championnats de Jiu-Jitsu et les operations de classement.',
      companyText:
        'Depuis 2017, nous assurons un support professionnel de la planification strategique a la livraison finale, en combinant operation sur site et systemes numeriques. Notre equipe agit avec rigueur technique et experience pratique pour garantir organisation, previsibilite et qualite a chaque etape.',
      missionTitle: 'Notre mission',
      missionText:
        'Fournir un service de haut niveau aux organisateurs, federations, academies et athletes, avec une planification fiable, une execution efficace et une gestion transparente a chaque championnat.',
      valuesTitle: 'Nos valeurs institutionnelles',
      values: [
        'Credibilite et constance technique a chaque livraison.',
        'Engagement dans un partenariat strategique avec chaque client.',
        'Responsabilite, transparence et conduite ethique.',
        'Agilite operationnelle sans compromettre la qualite.',
        'Orientation vers des resultats mesurables et l amelioration continue.',
        'Excellence professionnelle du service sur tous les canaux.'
      ],
      whyTitle: 'Pourquoi choisir Genesis Esportes?',
      whyItems: [
        'Planification specialisee pour differents formats et tailles d evenement.',
        'Systemes numeriques modernes pour inscriptions, classement et tableaux.',
        'Controle operationnel du calendrier, des categories et du flux des athletes.',
        'Communication et promotion qualifiees sur nos canaux.',
        'Montage et demontage de la structure physique avec supervision technique.',
        'Equipe experimentee pour les moments critiques de competition.',
        'Accompagnement dedie avant, pendant et apres le championnat.',
        'Un partenaire unique capable de livrer une execution complete de bout en bout.'
      ],
      benefitsTitle: 'Benefices strategiques pour votre evenement',
      benefits: [
        'Moins de surcharge operationnelle pour les organisateurs et la coordination.',
        'Meilleur controle des processus avec plus de previsibilite et de gouvernance.',
        'Moins d erreurs operationnelles grace a des procedures standardisees.',
        'Decisions plus rapides basees sur des donnees qualifiees.',
        'Meilleure experience pour athletes, equipes et partenaires.',
        'Renforcement de la reputation et de la credibilite institutionnelle du championnat.'
      ]
    }
  };

  const copy = copyByLanguage[uiVariant] || copyByLanguage.pt;

  return (
    <div className="public-page">
      <section className="public-header">
        <div>
          <span className="section-kicker">{copy.kicker}</span>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
      </section>

      <section className="public-section">
        <div className="about-highlights">
          {copy.highlights.map((item) => (
            <article className="about-highlight-card" key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="public-section">
        <div className="content-grid about-grid">
          <article className="content-card about-card">
            <h3>{copy.companyTitle}</h3>
            <p className="about-card__lead">{copy.companyLead}</p>
            <p>{copy.companyText}</p>
          </article>
          <article className="content-card about-card">
            <h3>{copy.missionTitle}</h3>
            <p>{copy.missionText}</p>
          </article>
        </div>
      </section>

      <section className="public-section">
        <div className="content-grid about-grid">
          <article className="content-card about-card">
            <h3>{copy.valuesTitle}</h3>
            <ul className="text-list">
              {copy.values.map((value, index) => (
                <li key={`${value}-${index}`}>{value}</li>
              ))}
            </ul>
          </article>
          <article className="content-card about-card">
            <h3>{copy.whyTitle}</h3>
            <ul className="text-list">
              {copy.whyItems.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="public-section">
        <article className="content-card about-card">
          <h3>{copy.benefitsTitle}</h3>
          <ul className="text-list">
            {copy.benefits.map((benefit, index) => (
              <li key={`${benefit}-${index}`}>{benefit}</li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
};

export default About;
