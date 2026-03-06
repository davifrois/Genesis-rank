import React from 'react';
import { useI18n } from '../hooks/useI18n';

const About = () => {
  const { language } = useI18n();
  const isEnglish = language === 'en-US';

  const copy = isEnglish
    ? {
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
      }
    : {
        kicker: 'Sobre a Genesis',
        title: 'Genesis Esportes',
        subtitle:
          'Perfil institucional, missão, valores e atuação completa na organização de campeonatos de Jiu-Jitsu.',
        highlights: [
          { value: '2017', label: 'Fundada em Belo Horizonte' },
          { value: '27.835.080/0001-51', label: 'CNPJ regularizado' },
          { value: 'Ponta a ponta', label: 'Operação completa de eventos' }
        ],
        companyTitle: 'Quem somos',
        companyLead:
          'A Genesis Esportes é uma empresa especializada em gestão esportiva, com foco em campeonatos de Jiu-Jitsu e operações de ranking.',
        companyText:
          'Desde 2017, entregamos suporte profissional desde o planejamento estratégico até a execução final, unindo operação presencial e digital. Nossa equipe atua com rigor técnico, experiência prática e ferramentas especializadas para garantir organização, previsibilidade e qualidade em todas as etapas do evento.',
        missionTitle: 'Nossa missão',
        missionText:
          'Prestar serviços de alto padrão para organizadores, federações, academias e atletas, assegurando planejamento confiável, execução eficiente e gestão transparente em cada campeonato.',
        valuesTitle: 'Nossos valores institucionais',
        values: [
          'Credibilidade e consistência técnica em cada entrega.',
          'Comprometimento com parceria estratégica junto ao cliente.',
          'Responsabilidade, transparência e conduta ética.',
          'Agilidade operacional sem perder padrão de qualidade.',
          'Foco em resultados mensuráveis e melhoria contínua.',
          'Excelência profissional no atendimento em todos os canais.'
        ],
        whyTitle: 'Por que escolher a Genesis Esportes?',
        whyItems: [
          'Planejamento especializado para diferentes formatos e portes de evento.',
          'Sistemas digitais modernos para inscrições, ranking e chaveamento.',
          'Controle operacional de cronograma, categorias e fluxo de atletas.',
          'Comunicação e divulgação qualificada em nossos canais.',
          'Montagem e desmontagem da estrutura física com supervisão técnica.',
          'Equipe experiente preparada para momentos críticos de competição.',
          'Acompanhamento dedicado antes, durante e após o campeonato.',
          'Um único parceiro capaz de entregar execução completa de ponta a ponta.'
        ],
        benefitsTitle: 'Benefícios estratégicos para o seu evento',
        benefits: [
          'Redução da sobrecarga operacional para organizadores e coordenação.',
          'Maior controle dos processos com previsibilidade e governança.',
          'Menos falhas operacionais por meio de procedimentos padronizados.',
          'Decisões mais rápidas com base em dados qualificados do evento.',
          'Melhor experiência para atletas, equipes e parceiros envolvidos.',
          'Fortalecimento da reputação e da credibilidade institucional do campeonato.'
        ]
      };

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
