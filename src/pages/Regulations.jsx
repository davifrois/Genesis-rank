import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  ChevronRight,
  Medal,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  Trophy,
  Users
} from 'lucide-react';
import { useI18n } from '../hooks/useI18n';
import './Regulations.css';

const normalizeSearch = (value = '') =>
  value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const youthRows = [
  { id: 'galo', division: 'Galo', values: ['15 kg', '19 kg', '24 kg', '30 kg', '35 kg', '44 kg'] },
  { id: 'pluma', division: 'Pluma', values: ['18 kg', '21 kg', '27 kg', '33 kg', '39 kg', '48 kg'] },
  { id: 'pena', division: 'Pena', values: ['21 kg', '24 kg', '30 kg', '36 kg', '43 kg', '52 kg'] },
  { id: 'leve', division: 'Leve', values: ['24 kg', '27 kg', '33 kg', '39 kg', '47 kg', '56 kg'] },
  { id: 'medio', division: 'Medio', values: ['26 kg', '30 kg', '36 kg', '42 kg', '52 kg', '60 kg'] },
  { id: 'meio-pesado', division: 'Meio pesado', values: ['29 kg', '33 kg', '39 kg', '45 kg', '56 kg', '65 kg'] },
  { id: 'pesado', division: 'Pesado', values: ['32 kg', '36 kg', '42 kg', '48 kg', '60 kg', '69 kg'] },
  { id: 'super-pesado', division: 'Super pesado', values: ['35 kg', '39 kg', '45 kg', '51 kg', '64 kg', '73 kg'] },
  { id: 'pesadissimo', division: 'Pesadissimo', values: ['Sem limite', 'Sem limite', 'Sem limite', 'Sem limite', 'Sem limite', 'Sem limite'] }
];

const mainRows = [
  { id: 'galo', division: 'Galo', juvenilMasculino: '53.5 kg', juvenilFeminino: '44.3 kg', adultoMasculino: '57.5 kg', adultoFeminino: '48.5 kg' },
  { id: 'pluma', division: 'Pluma', juvenilMasculino: '58.5 kg', juvenilFeminino: '48.3 kg', adultoMasculino: '64 kg', adultoFeminino: '53.5 kg' },
  { id: 'pena', division: 'Pena', juvenilMasculino: '64 kg', juvenilFeminino: '52.3 kg', adultoMasculino: '70 kg', adultoFeminino: '58.5 kg' },
  { id: 'leve', division: 'Leve', juvenilMasculino: '69 kg', juvenilFeminino: '56.5 kg', adultoMasculino: '76 kg', adultoFeminino: '64 kg' },
  { id: 'medio', division: 'Medio', juvenilMasculino: '74 kg', juvenilFeminino: '60.5 kg', adultoMasculino: '82.3 kg', adultoFeminino: '69 kg' },
  { id: 'meio-pesado', division: 'Meio pesado', juvenilMasculino: '79.3 kg', juvenilFeminino: '65 kg', adultoMasculino: '88.3 kg', adultoFeminino: '74 kg' },
  { id: 'pesado', division: 'Pesado', juvenilMasculino: '84.3 kg', juvenilFeminino: '69 kg', adultoMasculino: '94.3 kg', adultoFeminino: '79.3 kg' },
  { id: 'super-pesado', division: 'Super pesado', juvenilMasculino: '89.3 kg', juvenilFeminino: '74 kg', adultoMasculino: '100.5 kg', adultoFeminino: '84.3 kg' },
  {
    id: 'pesadissimo',
    division: 'Pesadissimo',
    juvenilMasculino: 'Sem limite',
    juvenilFeminino: 'Sem limite',
    adultoMasculino: 'Sem limite',
    adultoFeminino: 'Sem limite'
  }
];

const scoreRows = [
  { action: 'Queda, raspagem ou joelho na barriga', points: '2 pontos', note: 'Controle estabilizado por tempo suficiente para validar a posicao.' },
  { action: 'Passagem de guarda', points: '3 pontos', note: 'Atleta supera a guarda e consolida controle lateral ou equivalente.' },
  { action: 'Montada e pegada pelas costas', points: '4 pontos', note: 'Posicoes dominantes com controle claro do adversario.' },
  { action: 'Vantagem', points: 'Criterio tecnico', note: 'Aplicada quando ha progressao real sem consolidar a pontuacao completa.' }
];

const copyByLanguage = {
  pt: {
    kicker: 'Regulamento oficial',
    title: 'Regras e Normas Oficiais Genesis',
    description:
      'Transparencia total para atletas, professores e organizadores. O padrao de excelencia em artes marciais.',
    searchPlaceholder: "Busque por 'Peso Leve', 'Penalidades', etc.",
    searchHint: 'Busque categorias, regras de conduta e criterios de pontuacao em segundos.',
    searchEmpty: 'Nenhum resultado encontrado para esta busca.',
    summaryTitle: 'Sumario',
    summaryItems: [
      { href: '#regulamento-hero', label: 'Visao geral' },
      { href: '#pontuacao', label: 'Pontuacao' },
      { href: '#tabela-peso', label: 'Tabela de pesos' },
      { href: '#regras', label: 'Regras e conduta' }
    ],
    pointsKicker: 'Ranking',
    pointsTitle: 'Pontuacao clara para manter o ranking transparente',
    pointsDescription:
      'A leitura da pagina foi reorganizada para que atleta, professor e organizador entendam o regulamento sem ruído.',
    category: 'Categoria',
    points: 'Pontos',
    podiumCards: [
      { place: '1o Lugar', points: '3 pontos', tone: 'gold', icon: Trophy, detail: 'Maior impacto no ranking oficial.' },
      { place: '2o Lugar', points: '2 pontos', tone: 'silver', icon: Medal, detail: 'Mantem regularidade competitiva.' },
      { place: '3o Lugar', points: '1 ponto', tone: 'bronze', icon: Award, detail: 'Valoriza cada podium conquistado.' }
    ],
    featureCards: [
      {
        title: 'Transparencia total',
        text: 'As regras ficam publicas, padronizadas e acessiveis para consulta antes do evento.',
        icon: ShieldCheck
      },
      {
        title: 'Atualizacao em tempo real',
        text: 'Resultados encerrados refletem no ranking com leitura mais clara para atletas e academias.',
        icon: RefreshCw
      }
    ],
    weightsKicker: 'Tabelas oficiais',
    weightsTitle: 'Tabelas de peso em formato dinamico',
    weightsDescription:
      'Sem imagem borrada, sem zoom improvisado. Agora cada categoria de peso responde ao tamanho da tela e fica legivel no celular.',
    tabLabels: {
      infantil: 'Infantil',
      juvenil: 'Juvenil',
      adulto: 'Adulto',
      master: 'Master'
    },
    tabs: {
      infantil: {
        title: 'Infantil e base',
        description: 'Tabela oficial para atletas de 4 a 15 anos, separada por faixa etaria.'
      },
      juvenil: {
        title: 'Juvenil',
        description: 'Consulta rapida para categorias juvenil masculino e juvenil feminino.'
      },
      adulto: {
        title: 'Adulto',
        description: 'Referencia oficial para categorias adulto masculino e adulto feminino.'
      },
      master: {
        title: 'Master',
        description: 'Genesis utiliza a mesma referencia oficial de peso para categorias master.'
      }
    },
    maxWeight: 'Peso maximo',
    noLimit: 'Sem limite',
    rulesKicker: 'Aplicacao oficial',
    rulesTitle: 'Regras essenciais e leitura rapida',
    rulesDescription:
      'Os pontos principais do regulamento agora ficam organizados em blocos objetivos para consulta durante inscricoes, check-in e evento.',
    rules: [
      {
        title: 'Penalidades e conduta',
        text: 'Atitudes antidesportivas, desrespeito a arbitragem e descumprimento das orientacoes podem gerar penalidades e desclassificacao.',
        icon: AlertTriangle
      },
      {
        title: 'Check-in e peso',
        text: 'Todo atleta deve validar documentos e categoria de peso antes da chamada oficial da chave.',
        icon: Scale
      },
      {
        title: 'Atletas, professores e organizadores',
        text: 'A mesma leitura de regras atende inscricao, operacao do evento e consulta rapida no dia da competicao.',
        icon: Users
      }
    ],
    resultsLabel: 'Resultados da busca'
  },
  en: null,
  es: null,
  fr: null
};

copyByLanguage.en = copyByLanguage.pt;
copyByLanguage.es = copyByLanguage.pt;
copyByLanguage.fr = copyByLanguage.pt;

const Regulations = () => {
  const { uiVariant } = useI18n();
  const copy = copyByLanguage[uiVariant] || copyByLanguage.pt;

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('infantil');
  const [activeRowId, setActiveRowId] = useState('');
  const [openSections, setOpenSections] = useState(['general']);

  useEffect(() => {
    const syncFromHash = () => {
      if (window.location.hash === '#tabela-peso-infantil') {
        setActiveTab('infantil');
      }

      if (window.location.hash === '#tabela-peso-juvenil-adulto') {
        setActiveTab('juvenil');
      }
    };

    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);

    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  const tabs = useMemo(
    () => [
      {
        id: 'infantil',
        label: copy.tabLabels.infantil,
        title: copy.tabs.infantil.title,
        description: copy.tabs.infantil.description,
        columns: ['4 e 5', '6 e 7', '8 e 9', '10 e 11', '12 e 13', '14 e 15'],
        rows: youthRows.map((row) => ({ ...row, values: row.values }))
      },
      {
        id: 'juvenil',
        label: copy.tabLabels.juvenil,
        title: copy.tabs.juvenil.title,
        description: copy.tabs.juvenil.description,
        columns: ['Masculino', 'Feminino'],
        rows: mainRows.map((row) => ({ id: row.id, division: row.division, values: [row.juvenilMasculino, row.juvenilFeminino] }))
      },
      {
        id: 'adulto',
        label: copy.tabLabels.adulto,
        title: copy.tabs.adulto.title,
        description: copy.tabs.adulto.description,
        columns: ['Masculino', 'Feminino'],
        rows: mainRows.map((row) => ({ id: row.id, division: row.division, values: [row.adultoMasculino, row.adultoFeminino] }))
      },
      {
        id: 'master',
        label: copy.tabLabels.master,
        title: copy.tabs.master.title,
        description: copy.tabs.master.description,
        columns: ['Masculino', 'Feminino'],
        rows: mainRows.map((row) => ({ id: row.id, division: row.division, values: [row.adultoMasculino, row.adultoFeminino] }))
      }
    ],
    [copy]
  );

  const normalizedQuery = normalizeSearch(query);

  const filteredTabs = useMemo(() => {
    if (!normalizedQuery) {
      return tabs;
    }

    return tabs.map((tab) => ({
      ...tab,
      rows: tab.rows.filter((row) =>
        normalizeSearch([tab.label, tab.title, tab.description, row.division, ...row.values].join(' ')).includes(normalizedQuery)
      )
    }));
  }, [normalizedQuery, tabs]);

  useEffect(() => {
    if (!normalizedQuery) {
      return;
    }

    const firstMatchTab = filteredTabs.find((tab) => tab.rows.length > 0);
    if (firstMatchTab && firstMatchTab.id !== activeTab) {
      setActiveTab(firstMatchTab.id);
    }
  }, [activeTab, filteredTabs, normalizedQuery]);

  const activeTabData = filteredTabs.find((tab) => tab.id === activeTab) || filteredTabs[0];

  const visibleRuleCards = useMemo(() => {
    if (!normalizedQuery) {
      return copy.rules;
    }

    return copy.rules.filter((rule) =>
      normalizeSearch(`${rule.title} ${rule.text}`).includes(normalizedQuery)
    );
  }, [copy.rules, normalizedQuery]);

  const searchResultCount = useMemo(() => {
    const rowMatches = filteredTabs.reduce((total, tab) => total + tab.rows.length, 0);
    return rowMatches + visibleRuleCards.length;
  }, [filteredTabs, visibleRuleCards.length]);

  const toggleSection = (sectionId) => {
    setOpenSections((current) => (
      current.includes(sectionId)
        ? current.filter((item) => item !== sectionId)
        : [...current, sectionId]
    ));
  };

  const accordionSections = [
    {
      id: 'general',
      number: 'I.',
      title: 'Regras Gerais',
      body: (
        <div className="regulamento-texto">
          <p>
            O regulamento Genesis organiza a competicao para que atletas, professores e organizadores
            tenham uma leitura rapida das regras essenciais antes do evento.
          </p>
          <div className="regulamento-highlight">
            <strong>Padrao oficial:</strong> documentos, inscricao, categoria e chamada devem estar
            alinhados com as informacoes publicadas pela organizacao.
          </div>
          <div className="regulamento-alert">
            <AlertTriangle size={18} />
            <span>Informacoes incorretas podem gerar correcao de categoria ou impedimento de competir.</span>
          </div>
        </div>
      )
    },
    {
      id: 'weighin',
      number: 'II.',
      title: 'Pesagem',
      body: (
        <div className="regulamento-texto">
          <p>
            A pesagem deve respeitar a categoria escolhida no ato da inscricao. Para GI, considere o
            peso com kimono. Para NO-GI, considere o peso sem kimono.
          </p>
          <ul className="regulamento-list">
            <li><strong>Kids e juvenil:</strong> use a idade que o atleta completa no ano da inscricao.</li>
            <li><strong>Adulto e master:</strong> confira peso, faixa e modalidade antes do pagamento.</li>
            <li><strong>Check-in:</strong> documentos e categoria podem ser conferidos pela organizacao.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'points',
      number: 'III.',
      title: 'Pontuacao',
      body: (
        <div className="regulamento-texto">
          <p>
            A pontuacao deve ser clara para atletas e equipes acompanharem o resultado da luta e o
            reflexo no ranking.
          </p>
          <div className="regulamento-table-wrap">
            <table className="regulamento-score-table">
              <thead>
                <tr>
                  <th>Acao</th>
                  <th>Pontuacao</th>
                  <th>Observacao</th>
                </tr>
              </thead>
              <tbody>
                {scoreRows.map((row) => (
                  <tr key={row.action}>
                    <td>{row.action}</td>
                    <td>{row.points}</td>
                    <td>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    },
    {
      id: 'conduct',
      number: 'IV.',
      title: 'Conduta',
      body: (
        <div className="regulamento-texto">
          <p>
            A conduta esportiva protege a seguranca dos atletas e a credibilidade do campeonato.
            Respeito a arbitragem, mesa, adversario e equipe e obrigatorio.
          </p>
          <div className="regulamento-alert regulamento-alert--danger">
            <AlertTriangle size={18} />
            <span>Desrespeito grave, agressao, fraude ou atitude antidesportiva pode gerar desclassificacao.</span>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="public-page regulations-page">
      <div className="regulations-shell">
        <div className="regulations-main">
          <section className="regulamento-hero" id="regulamento-hero">
            <div className="regulamento-hero__content">
              <span className="section-kicker">{copy.kicker}</span>
              <h1>{copy.title}</h1>
              <p>{copy.description}</p>

              <label className="regulations-search" htmlFor="regulations-search">
                <span className="regulations-search__icon" aria-hidden="true">
                  <Search size={18} />
                </span>
                <input
                  id="regulations-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={copy.searchPlaceholder}
                />
              </label>

              <div className="regulations-search__meta">
                <span>{copy.searchHint}</span>
                {normalizedQuery ? (
                  <strong>
                    {copy.resultsLabel}: {searchResultCount}
                  </strong>
                ) : null}
              </div>

              <div className="regulations-hero__chips">
                <span>Padrao Genesis</span>
                <span>Leitura rapida</span>
                <span>Consulta no celular</span>
              </div>

              <div className="regulamento-editor-note">
                <strong>Editor do evento:</strong>
                <span>o texto cadastrado no painel administrativo aparece formatado automaticamente na pagina de informacoes.</span>
              </div>
            </div>
          </section>

          <section className="regulamento-accordion" id="regras">
            {accordionSections.map((section) => {
              const isOpen = openSections.includes(section.id);
              return (
                <article key={section.id} className={`regulamento-section ${isOpen ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    className="regulamento-summary"
                    onClick={() => toggleSection(section.id)}
                    aria-expanded={isOpen}
                  >
                    <span className="regulamento-number">{section.number}</span>
                    <span className="regulamento-titulo">{section.title}</span>
                    <ChevronRight size={20} />
                  </button>
                  <div className="regulamento-panel">
                    <div className="regulamento-panel__inner">
                      {section.body}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="regulamento-weight-section" id="tabela-peso">
            <div id="tabela-peso-infantil" className="regulations-anchor" />
            <div id="tabela-peso-juvenil-adulto" className="regulations-anchor" />

            <div className="section-heading">
              <div>
                <span className="section-kicker">{copy.weightsKicker}</span>
                <h2>{copy.weightsTitle}</h2>
                <p>{copy.weightsDescription}</p>
              </div>
            </div>

            <div className="regulations-tabs" role="tablist" aria-label={copy.weightsTitle}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`regulations-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  aria-pressed={activeTab === tab.id}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <article className="regulations-table-card">
              <div className="regulations-table-card__head">
                <div>
                  <h3>{activeTabData.title}</h3>
                  <p>{activeTabData.description}</p>
                </div>
                <span className="regulations-table-card__tag">{copy.maxWeight}</span>
              </div>

              {activeTabData.rows.length ? (
                <div className="regulations-table-wrap">
                  <table className="regulations-weight-table">
                    <thead>
                      <tr>
                        <th>{copy.category}</th>
                        <th>{copy.maxWeight}</th>
                        {activeTabData.columns.map((column) => (
                          <th key={column}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeTabData.rows.map((row) => {
                        const isHighlighted = activeRowId === `${activeTabData.id}-${row.id}` || normalizeSearch(row.division).includes(normalizedQuery);
                        return (
                          <tr
                            key={`${activeTabData.id}-${row.id}`}
                            className={isHighlighted ? 'is-highlighted' : ''}
                            tabIndex={0}
                            onMouseEnter={() => setActiveRowId(`${activeTabData.id}-${row.id}`)}
                            onFocus={() => setActiveRowId(`${activeTabData.id}-${row.id}`)}
                            onClick={() => setActiveRowId(`${activeTabData.id}-${row.id}`)}
                          >
                            <th scope="row">{row.division}</th>
                            <td>{copy.maxWeight}</td>
                            {row.values.map((value) => (
                              <td key={`${row.id}-${value}`}>{value === 'Sem limite' ? copy.noLimit : value}</td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="regulations-empty-state">{copy.searchEmpty}</div>
              )}
            </article>
          </section>

        </div>
      </div>
    </div>
  );
};

export default Regulations;
