import { Link } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Database,
  GitBranch,
  Map,
  MonitorSmartphone,
  ShieldCheck,
  Trophy,
  Zap
} from 'lucide-react';
import './About.css';
import aboutHeroImage from '../../img/organizers-command-center.png';
import filmmakerVenue from '../../img/filmmaker-venue.jpg';
import placarImage from '../../img/placar.png';

const highlights = [
  { value: '2017', label: 'Fundada em Belo Horizonte' },
  { value: 'CNPJ', label: '27.835.080/0001-51' },
  { value: '360', label: 'Operacao esportiva de ponta a ponta' }
];

const techPillars = [
  {
    title: 'Sistema proprio',
    text: 'Inscricoes, atletas, eventos, ranking e resultados conectados em uma mesma plataforma.',
    icon: Database
  },
  {
    title: 'Operacao ao vivo',
    text: 'Mesa, placar, chaves e cronograma preparados para reduzir ruido no dia do campeonato.',
    icon: Activity
  },
  {
    title: 'Dados para decisao',
    text: 'Relatorios, historico e visao de performance para organizar melhor cada proxima etapa.',
    icon: BarChart3
  },
  {
    title: 'Experiencia publica',
    text: 'Pagina de campeonato com informacoes claras para atletas, professores e equipes.',
    icon: MonitorSmartphone
  }
];

const operationSteps = [
  {
    title: 'Planejamento',
    text: 'Mapeamos formato, categorias, lotes, regulamento, comunicacao e estrutura do evento.',
    icon: Map
  },
  {
    title: 'Publicacao',
    text: 'Transformamos o campeonato em uma pagina clara, com inscricao e informacoes centralizadas.',
    icon: Database
  },
  {
    title: 'Competicao',
    text: 'A mesa acompanha chamadas, chaves, placar, horarios e resultados em ritmo de arena.',
    icon: GitBranch
  },
  {
    title: 'Legado',
    text: 'O evento termina com ranking, podium, historico e material para fortalecer a marca.',
    icon: Trophy
  }
];

const values = [
  'Credibilidade tecnica em cada entrega.',
  'Transparencia na operacao e nos dados.',
  'Agilidade sem abrir mao de qualidade.',
  'Parceria real com organizadores, academias e atletas.',
  'Foco em resultado mensuravel e melhoria continua.',
  'Experiencia profissional antes, durante e depois do evento.'
];

const About = () => (
  <main className="public-page about-tech-page">
    <section className="about-tech-hero">
      <img className="about-tech-hero__image" src={aboutHeroImage} alt="" aria-hidden="true" />
      <div className="about-tech-hero__shade" aria-hidden="true" />
      <div className="about-tech-hero__content">
        <span className="about-tech-kicker">Sobre a Genesis</span>
        <h1>Tecnologia, operacao e credibilidade para campeonatos de Jiu-Jitsu.</h1>
        <p>
          A Genesis Esportes une gestao esportiva, sistema digital e execucao presencial para
          transformar campeonatos em experiencias mais organizadas, profissionais e mensuraveis.
        </p>
        <div className="about-tech-hero__actions">
          <Link className="about-tech-button about-tech-button--primary" to="/organizadores">
            <Zap size={18} />
            Organizar campeonato
          </Link>
          <Link className="about-tech-button about-tech-button--secondary" to="/eventos">
            Ver eventos
          </Link>
        </div>
      </div>
      <div className="about-tech-hero__panel" aria-label="Resumo institucional">
        {highlights.map((item) => (
          <article key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </article>
        ))}
      </div>
    </section>

    <section className="about-tech-section about-tech-intro">
      <div className="about-tech-copy">
        <span className="about-tech-kicker">Quem somos</span>
        <h2>Uma empresa de gestao esportiva criada para dar estrutura real aos eventos.</h2>
        <p>
          Desde 2017, atuamos com planejamento, suporte tecnico, controle de atletas, montagem
          operacional e entrega de resultados. Nosso trabalho conecta o tatame, a mesa e o publico em
          um fluxo unico, reduzindo improviso e elevando o padrao do campeonato.
        </p>
      </div>
      <div className="about-tech-command-card">
        <img src={placarImage} alt="Painel tecnologico de competicao" loading="lazy" />
        <div>
          <ShieldCheck size={20} />
          <strong>Operacao auditavel</strong>
          <span>Dados, processos e comunicacao organizados para dar mais confianca ao evento.</span>
        </div>
      </div>
    </section>

    <section className="about-tech-section">
      <header className="about-tech-section__head">
        <span className="about-tech-kicker">Base tecnologica</span>
        <h2>O digital trabalha junto com a equipe no local.</h2>
      </header>
      <div className="about-tech-pillars">
        {techPillars.map(({ title, text, icon: Icon }) => (
          <article key={title}>
            <span><Icon size={22} /></span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="about-tech-split">
      <div className="about-tech-split__media">
        <img src={filmmakerVenue} alt="Evento de jiu-jitsu organizado pela Genesis" loading="lazy" />
      </div>
      <div className="about-tech-split__content">
        <span className="about-tech-kicker">Nossa missao</span>
        <h2>Entregar campeonatos mais previsiveis, transparentes e bem apresentados.</h2>
        <p>
          Prestamos servicos de alto padrao para organizadores, federacoes, academias e atletas,
          assegurando planejamento confiavel, execucao eficiente e gestao clara em cada etapa.
        </p>
        <ul>
          {values.map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      </div>
    </section>

    <section className="about-tech-section about-tech-flow-section">
      <header className="about-tech-section__head about-tech-section__head--center">
        <span className="about-tech-kicker">Como atuamos</span>
        <h2>Da ideia ao pos-evento, o processo precisa continuar organizado.</h2>
      </header>
      <div className="about-tech-flow">
        {operationSteps.map(({ title, text, icon: Icon }, index) => (
          <article key={title}>
            <span className="about-tech-flow__number">{String(index + 1).padStart(2, '0')}</span>
            <Icon size={24} />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="about-tech-cta">
      <span className="about-tech-kicker">Genesis Esportes</span>
      <h2>O proximo passo e transformar estrutura em experiencia.</h2>
      <p>
        Organizadores ganham controle, atletas encontram informacao clara e o campeonato sai com uma
        entrega mais forte para ranking, resultados e divulgacao.
      </p>
      <Link className="about-tech-button about-tech-button--primary" to="/organizadores">
        Conhecer estrutura para organizadores
      </Link>
    </section>
  </main>
);

export default About;
