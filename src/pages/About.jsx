import React from 'react';
import { useI18n } from '../hooks/useI18n';

const About = () => {
  const { language } = useI18n();
  const isEnglish = language === 'en-US';

  const copy = isEnglish
    ? {
        kicker: 'About',
        title: 'Genesis Esportes',
        subtitle: 'Company profile, mission and values.',
        companyTitle: 'The company',
        companyText:
          'Genesis Esportes is a company specialized in organizing and running Jiu-Jitsu events. Founded in 2017, based in Belo Horizonte and registered under CNPJ 27.835.080/0001-51, we support major events in Minas Gerais. We have the full material and professional structure needed to support clients in every event stage. We are specialists in every area involved in Jiu-Jitsu events and we provide tools that simplify creation and execution of competitive events.',
        missionTitle: 'Our mission',
        missionText:
          'Our mission is to provide a high excellence service that helps clients organize and run events with maximum quality for all athletes.',
        valuesTitle: 'Our values',
        values: [
          'Market credibility.',
          'Commitment and partnership.',
          'Speed in delivery.',
          'Responsibility and transparency.',
          'Ethics and results delivery.',
          'Competence and excellence in service.'
        ],
        whyTitle: 'Why hire Genesis Esportes?',
        whyItems: [
          'We are specialists in organizing any format of Jiu-Jitsu event.',
          'We use modern digital tools that accelerate and improve each event model.',
          'We build your event from project planning to execution.',
          'Event promotion in our platforms.',
          'We handle brackets, schedule and registration management.',
          'We set up and remove the complete physical event structure.',
          '24/7 online customer support.',
          'Specialized and experienced professional team.',
          'We deliver your event from start to finish.'
        ],
        benefitsTitle: 'Advantages when hiring us',
        benefits: [
          'Reduces your operational workload.',
          'Specialized and experienced team.',
          'Higher assertiveness in handling critical issues.',
          'Better event organization.',
          'Avoids operational errors.',
          'Better control across planning and execution.'
        ]
      }
    : {
        kicker: 'Sobre',
        title: 'Genesis Esportes',
        subtitle: 'Perfil da empresa, missão e valores.',
        companyTitle: 'A EMPRESA',
        companyText:
          'A Genesis Esportes é uma empresa especializada na organização e realização de eventos de Jiu-Jitsu. Fundada em 2017, com sede em Belo Horizonte e registrada sob o CNPJ 27.835.080/0001-51, atende aos principais eventos realizados em Minas Gerais. Contamos com estrutura material e equipe profissional para oferecer o suporte necessário em todas as etapas do evento. Somos especialistas nas áreas que envolvem competições de Jiu-Jitsu e dispomos de ferramentas que facilitam a criação e a execução de eventos competitivos.',
        missionTitle: 'NOSSA MISSÃO',
        missionText:
          'A missão da Genesis Esportes é prestar um serviço de alta excelência, auxiliando o cliente na organização e realização de eventos com qualidade máxima para todos os atletas.',
        valuesTitle: 'NOSSOS VALORES',
        values: [
          'Credibilidade no mercado.',
          'Comprometimento e parceria.',
          'Rapidez na entrega.',
          'Responsabilidade e transparência.',
          'Ética e entrega de resultados.',
          'Competência e excelência no atendimento.'
        ],
        whyTitle: 'POR QUE CONTRATAR A GENESIS ESPORTES?',
        whyItems: [
          'Somos especialistas em realizar e organizar qualquer formato de evento de Jiu-Jitsu.',
          'Possuímos ferramentas digitais modernas que agilizam e oferecem a melhor solução para cada modelo de evento.',
          'Desenvolvemos seu evento desde a elaboração do projeto.',
          'Realizamos a divulgação do seu evento em nossas plataformas.',
          'Executamos o chaveamento, o cronograma e o recebimento de inscrições.',
          'Montamos e desmontamos toda a estrutura física do seu evento.',
          'Suporte ao cliente disponível on-line 24h.',
          'Equipe de profissionais especializada e experiente.',
          'Realizamos seu evento do início ao fim.'
        ],
        benefitsTitle: 'QUAIS SÃO AS VANTAGENS AO NOS CONTRATAR?',
        benefits: [
          'Reduz a sua sobrecarga de trabalho com o evento.',
          'Equipe especializada e com experiência.',
          'Maior assertividade no tratamento das questões.',
          'Organiza melhor o evento.',
          'Evita erros operacionais.',
          'Melhor controle na organização.'
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
        <div className="content-grid about-grid">
          <article className="content-card about-card">
            <h3>{copy.companyTitle}</h3>
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
