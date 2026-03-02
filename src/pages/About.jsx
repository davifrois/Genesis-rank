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
        subtitle: 'Perfil da empresa, missao e valores.',
        companyTitle: 'A EMPRESA',
        companyText:
          'A Genesis Esportes e uma empresa especializada na organizacao e realizacao de eventos de Jiu-Jitsu. Fundada em 2017, com sede em Belo Horizonte, registrada sob o CNPJ 27.835.080/0001-51, atende os principais eventos realizados em Minas Gerais. Temos toda a estrutura material e profissional para dar o suporte que o nosso cliente precisa na hora de realizar o seu evento. Somos especialistas em qualquer area que envolve um evento de Jiu-Jitsu e possuimos ferramentas que facilitam a criacao e a execucao de um evento competitivo.',
        missionTitle: 'NOSSA MISSAO',
        missionText:
          'A missao da Genesis Esportes e fornecer um servico de alta excelencia que auxilie o cliente a organizar e realizar seu evento com a maxima qualidade para todos os atletas.',
        valuesTitle: 'NOSSOS VALORES',
        values: [
          'Credibilidade no mercado.',
          'Comprometimento e parceria.',
          'Rapidez na entrega.',
          'Responsabilidade e transparencia.',
          'Etica e entrega de resultado.',
          'Competencia e excelencia em atendimento.'
        ],
        whyTitle: 'POR QUE CONTRATAR A GENESIS ESPORTES?',
        whyItems: [
          'Somos especialistas em realizar e organizar qualquer formato de evento de Jiu-Jitsu.',
          'Possuimos ferramentas digitais e modernas que agilizam e trazem a melhor solucao para cada modelo de evento.',
          'Desenvolvemos seu evento desde a elaboracao do projeto.',
          'Divulgacao do seu evento em nossas plataformas.',
          'Confeccionamos o chaveamento, cronograma e recebimento de inscricoes.',
          'Montamos e desmontamos toda a estrutura fisica do seu evento.',
          'Suporte ao cliente disponivel online 24h.',
          'Equipe de profissionais especializada e experiente.',
          'Realizamos seu evento do inicio ao fim.'
        ],
        benefitsTitle: 'QUAIS SAO AS VANTAGENS QUANDO NOS CONTRATA?',
        benefits: [
          'Reduz a sua sobrecarga de trabalho com o evento.',
          'Equipe especializada e com experiencia.',
          'Maior assertividade no tratamento das questoes.',
          'Organiza melhor o evento.',
          'Evita erros operacionais.',
          'Melhor controle na organizacao.'
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
