import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { useI18n } from '../hooks/useI18n';
import { rankAthletes } from '../services/scoringService';
import { translateBelt, translateCategory, translateWeight } from '../utils/localeLabels';

const normalizeSearchTerm = (value) => {
  if (!value) return '';
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const sortOptions = (values) => values.filter(Boolean).sort((a, b) => a.localeCompare(b));

const Athletes = () => {
  const { athletes } = useStore();
  const { language } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [beltFilter, setBeltFilter] = useState('all');
  const [weightFilter, setWeightFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const isEnglish = language === 'en-US';
  const copy = isEnglish
    ? {
        kicker: 'Athletes',
        title: 'Individual profiles with history and points.',
        description:
          'Search athletes by belt, weight or category. Each profile accumulates points and ranking automatically.',
        searchPlaceholder: 'Search athlete, academy or category',
        allBelts: 'All belts',
        allWeights: 'All weights',
        allCategories: 'All categories',
        activeRanking: 'Active ranking',
        foundAthletes: 'athletes found',
        athleteFallback: 'Athlete',
        academyFallback: 'No academy',
        pointsSuffix: 'pts',
        beltFallback: 'Belt',
        weightFallback: 'Weight',
        categoryFallback: 'Category',
        emptyState: 'No athlete found with this filter combination.'
      }
    : {
        kicker: 'Atletas',
        title: 'Perfis individuais com histórico e pontuação.',
        description:
          'Pesquise atletas por faixa, peso ou categoria. Cada perfil acumula pontos e classificação automaticamente.',
        searchPlaceholder: 'Buscar por atleta, academia ou categoria',
        allBelts: 'Todas as faixas',
        allWeights: 'Todos os pesos',
        allCategories: 'Todas as categorias',
        activeRanking: 'Ranking ativo',
        foundAthletes: 'atletas encontrados',
        athleteFallback: 'Atleta',
        academyFallback: 'Sem academia',
        pointsSuffix: 'pts',
        beltFallback: 'Faixa',
        weightFallback: 'Peso',
        categoryFallback: 'Categoria',
        emptyState: 'Nenhum atleta encontrado com essa combinação de filtros.'
      };

  const filterOptions = useMemo(() => {
    const belts = new Set();
    const weights = new Set();
    const categories = new Set();

    athletes.forEach((athlete) => {
      if (athlete.faixa) belts.add(athlete.faixa);
      if (athlete.peso) weights.add(athlete.peso);
      if (athlete.categoria) categories.add(athlete.categoria);
    });

    return {
      belts: sortOptions([...belts]),
      weights: sortOptions([...weights]),
      categories: sortOptions([...categories])
    };
  }, [athletes]);

  const filteredAthletes = useMemo(() => {
    const normalizedSearch = normalizeSearchTerm(searchTerm);
    const filtered = athletes.filter((athlete) => {
      if (beltFilter !== 'all' && athlete.faixa !== beltFilter) return false;
      if (weightFilter !== 'all' && athlete.peso !== weightFilter) return false;
      if (categoryFilter !== 'all' && athlete.categoria !== categoryFilter) return false;

      if (!normalizedSearch) return true;
      const haystack = normalizeSearchTerm([
        athlete.nome,
        athlete.academia,
        athlete.faixa,
        athlete.peso,
        athlete.categoria
      ].filter(Boolean).join(' '));
      return haystack.includes(normalizedSearch);
    });

    return rankAthletes(filtered);
  }, [athletes, beltFilter, weightFilter, categoryFilter, searchTerm]);

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
        <div className="filter-bar">
          <div className="search-input">
            <Search size={16} />
            <input
              type="search"
              placeholder={copy.searchPlaceholder}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <select className="input" value={beltFilter} onChange={(event) => setBeltFilter(event.target.value)}>
            <option value="all">{copy.allBelts}</option>
            {filterOptions.belts.map((belt) => (
              <option key={belt} value={belt}>{translateBelt(belt, language)}</option>
            ))}
          </select>
          <select className="input" value={weightFilter} onChange={(event) => setWeightFilter(event.target.value)}>
            <option value="all">{copy.allWeights}</option>
            {filterOptions.weights.map((weight) => (
              <option key={weight} value={weight}>{translateWeight(weight, language)}</option>
            ))}
          </select>
          <select className="input" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">{copy.allCategories}</option>
            {filterOptions.categories.map((category) => (
              <option key={category} value={category}>{translateCategory(category, language)}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="public-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{copy.activeRanking}</span>
            <h2>{filteredAthletes.length} {copy.foundAthletes}</h2>
          </div>
        </div>
        <div className="card-grid">
          {filteredAthletes.length ? (
            filteredAthletes.map((athlete, index) => (
              <div className="athlete-card public-athlete-card" key={athlete.id}>
                <div className="athlete-card__header">
                  <div>
                    <span className="table-meta">#{index + 1}</span>
                    <div className="table-name">{athlete.nome || copy.athleteFallback}</div>
                    <div className="table-meta">{athlete.academia || copy.academyFallback}</div>
                  </div>
                  <span className="points-pill">{athlete.pontos} {copy.pointsSuffix}</span>
                </div>
                <div className="public-athlete-meta">
                  <span className="tag">{translateBelt(athlete.faixa || copy.beltFallback, language)}</span>
                  <span className="tag">{translateWeight(athlete.peso || copy.weightFallback, language)}</span>
                  <span className="tag">{translateCategory(athlete.categoria || copy.categoryFallback, language)}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">{copy.emptyState}</div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Athletes;
