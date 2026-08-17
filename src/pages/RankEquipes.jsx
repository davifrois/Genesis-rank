import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Medal, Search, Trophy, Shield } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { useI18n } from '../hooks/useI18n';
import { buildTeamRanking } from '../services/teamRankingService';
import { buildFileSafeName, downloadCsv } from '../services/exportService';
import { countryLabelFromCode, flagFromCountryCode } from '../utils/countryFlags';

const SEGMENT_IDS = ['kids', 'adults', 'academies', 'masters'];

const normalizeSearchTerm = (value) => {
  if (!value) return '';
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const normalizeQueryParam = (value) => (value ? value.toString().trim() : '');

const parseLimitParam = (value, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) return fallback;
  return parsed;
};

const parseSegmentParam = (value) => {
  const normalized = (value || '').toString().trim().toLowerCase();
  return SEGMENT_IDS.includes(normalized) ? normalized : 'academies';
};

const detectDivision = (athlete) => {
  const category = normalizeSearchTerm(athlete?.categoria || '');
  if (!category) return 'adults';
  if (/(master|senior|seni[oô]r|veteran|veterano)/.test(category)) return 'masters';
  if (/(kids|infantil|juvenil|mirim|pre mirim|pré mirim)/.test(category)) return 'kids';
  return 'adults';
};

const detectMode = (athlete) => (
  athlete?.isNoGi ? 'NO-GI' : 'GI'
);

// Página de Ranking de Equipes
// Este componente exibe o ranking focado em academias/equipes.
const RankEquipes = () => {
  const { athletes, events, activeEventId, academies = [] } = useStore();
  const { uiLanguage } = useI18n();
  const isEnglish = uiLanguage === 'en-US';
  const isSpanish = uiLanguage === 'es-ES';
  const isFrench = uiLanguage === 'fr-FR';

  const copy = isEnglish
    ? {
        noEvent: 'No event',
        allEvents: 'All events',
        event: 'Event',
        selectEvent: 'Select event',
        searchTeam: 'Search academy',
        show: 'Show',
        top25: 'Top 25',
        top50: 'Top 50',
        top100: 'Top 100',
        all: 'All',
        exportCsv: 'Export CSV',
        teams: 'Teams',
        athletes: 'Athletes',
        panels: 'Panels',
        season: 'Season',
        updatedNow: 'Updated now',
        noData: 'No ranking data for this selection.',
        seeAll: 'See all',
        collapse: 'Collapse',
        points: 'Points',
        wins: 'Wins',
        gold: 'Gold',
        silver: 'Silver',
        bronze: 'Bronze',
        athletesLabel: 'athletes',
        segments: {
          kids: 'Kids Ranking',
          adults: 'Adults Ranking',
          academies: 'Academies Ranking',
          masters: 'Masters Ranking'
        },
        cards: {
          kids: 'Best Academy Kids',
          adults: 'Best Academy Adults',
          masters: 'Best Academy Masters',
          gi: 'GI',
          nogi: 'NO-GI'
        }
      }
    : isSpanish
      ? {
          noEvent: 'Sin evento',
          allEvents: 'Todos los eventos',
          event: 'Evento',
          selectEvent: 'Seleccionar evento',
          searchTeam: 'Buscar academia',
          show: 'Mostrar',
          top25: 'Top 25',
          top50: 'Top 50',
          top100: 'Top 100',
          all: 'Todos',
          exportCsv: 'Exportar CSV',
          teams: 'Equipos',
          athletes: 'Atletas',
          panels: 'Paneles',
          season: 'Temporada',
          updatedNow: 'Actualizado ahora',
          noData: 'No hay datos de ranking para este filtro.',
          seeAll: 'Ver todo',
          collapse: 'Ocultar',
          points: 'Puntos',
          wins: 'Victorias',
          gold: 'Oro',
          silver: 'Plata',
          bronze: 'Bronce',
          athletesLabel: 'atletas',
          segments: {
            kids: 'Ranking Kids',
            adults: 'Ranking Adulto',
            academies: 'Ranking de Academias',
            masters: 'Ranking Master'
          },
          cards: {
            kids: 'Mejor Academia Kids',
            adults: 'Mejor Academia Adulto',
            masters: 'Mejor Academia Master',
            gi: 'GI',
            nogi: 'NO-GI'
          }
        }
      : isFrench
        ? {
            noEvent: 'Sans evenement',
            allEvents: 'Tous les evenements',
            event: 'Evenement',
            selectEvent: "Selectionner l'evenement",
            searchTeam: 'Rechercher academie',
            show: 'Afficher',
            top25: 'Top 25',
            top50: 'Top 50',
            top100: 'Top 100',
            all: 'Tous',
            exportCsv: 'Exporter CSV',
            teams: 'Equipes',
            athletes: 'Athletes',
            panels: 'Panneaux',
            season: 'Saison',
            updatedNow: 'Mis a jour maintenant',
            noData: 'Aucune donnee de classement pour ce filtre.',
            seeAll: 'Voir tout',
            collapse: 'Reduire',
            points: 'Points',
            wins: 'Victoires',
            gold: 'Or',
            silver: 'Argent',
            bronze: 'Bronze',
            athletesLabel: 'athletes',
            segments: {
              kids: 'Classement Kids',
              adults: 'Classement Adulte',
              academies: 'Classement Academies',
              masters: 'Classement Masters'
            },
            cards: {
              kids: 'Meilleure Academie Kids',
              adults: 'Meilleure Academie Adulte',
              masters: 'Meilleure Academie Master',
              gi: 'GI',
              nogi: 'NO-GI'
            }
          }
        : {
            noEvent: 'Sem evento',
            allEvents: 'Todos os eventos',
            event: 'Evento',
            selectEvent: 'Selecionar evento',
            searchTeam: 'Buscar academia',
            show: 'Mostrar',
            top25: 'Top 25',
            top50: 'Top 50',
            top100: 'Top 100',
            all: 'Todos',
            exportCsv: 'Exportar CSV',
            teams: 'Equipes',
            athletes: 'Atletas',
            panels: 'Paineis',
            season: 'Temporada',
            updatedNow: 'Atualizado agora',
            noData: 'Nenhum dado de ranking para este filtro.',
            seeAll: 'Ver todos',
            collapse: 'Recolher',
            points: 'Pontos',
            wins: 'Vitorias',
            gold: 'Ouro',
            silver: 'Prata',
            bronze: 'Bronze',
            athletesLabel: 'atletas',
            segments: {
              kids: 'Ranking Kids',
              adults: 'Ranking Adulto',
              academies: 'Ranking Academias',
              masters: 'Ranking Masters'
            },
            cards: {
              kids: 'Melhor Academia Kids',
              adults: 'Melhor Academia Adulto',
              masters: 'Melhor Academia Master',
              gi: 'GI',
              nogi: 'NO-GI'
            }
          };

  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedEventId, setSelectedEventId] = useState(() => (
    searchParams.get('event') || activeEventId || 'all'
  ));
  const [searchTerm, setSearchTerm] = useState(() => normalizeQueryParam(searchParams.get('q')));
  const [tableLimit, setTableLimit] = useState(() => parseLimitParam(searchParams.get('limit'), 50));
  const [segment, setSegment] = useState(() => parseSegmentParam(searchParams.get('segment')));
  const [expandedPanels, setExpandedPanels] = useState(() => new Set());
  const deferredSearch = useDeferredValue(searchTerm);

  useEffect(() => {
    const hasSelectedEvent = events.some((event) => event.id === selectedEventId);
    if (selectedEventId !== 'all' && selectedEventId !== 'none' && !hasSelectedEvent) {
      setSelectedEventId(activeEventId || 'all');
    }
  }, [activeEventId, events, selectedEventId]);

  const searchParamsKey = searchParams.toString();

  useEffect(() => {
    const paramEvent = searchParams.get('event');
    const paramQuery = normalizeQueryParam(searchParams.get('q'));
    const paramLimit = parseLimitParam(searchParams.get('limit'), tableLimit);
    const paramSegment = parseSegmentParam(searchParams.get('segment'));

    if (paramEvent && paramEvent !== selectedEventId) {
      setSelectedEventId(paramEvent);
    }
    if (paramQuery !== searchTerm) {
      setSearchTerm(paramQuery);
    }
    if (paramLimit !== tableLimit) {
      setTableLimit(paramLimit);
    }
    if (paramSegment !== segment) {
      setSegment(paramSegment);
    }
  }, [searchParamsKey]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    let changed = false;

    if (selectedEventId && selectedEventId !== 'all') {
      if (params.get('event') !== selectedEventId) {
        params.set('event', selectedEventId);
        changed = true;
      }
    } else if (params.has('event')) {
      params.delete('event');
      changed = true;
    }

    const trimmedQuery = searchTerm.trim();
    if (trimmedQuery) {
      if (params.get('q') !== trimmedQuery) {
        params.set('q', trimmedQuery);
        changed = true;
      }
    } else if (params.has('q')) {
      params.delete('q');
      changed = true;
    }

    if (tableLimit !== 50) {
      if (params.get('limit') !== String(tableLimit)) {
        params.set('limit', String(tableLimit));
        changed = true;
      }
    } else if (params.has('limit')) {
      params.delete('limit');
      changed = true;
    }

    if (segment !== 'academies') {
      if (params.get('segment') !== segment) {
        params.set('segment', segment);
        changed = true;
      }
    } else if (params.has('segment')) {
      params.delete('segment');
      changed = true;
    }

    if (changed) {
      setSearchParams(params, { replace: true });
    }
  }, [selectedEventId, searchTerm, tableLimit, segment, searchParams, setSearchParams]);

  const selectedEvent = useMemo(() => (
    events.find((event) => event.id === selectedEventId)
  ), [events, selectedEventId]);

  const eventFilteredAthletes = useMemo(() => (
    athletes.filter((athlete) => {
      if (selectedEventId === 'none') return !athlete.eventId;
      if (selectedEventId === 'all') return true;
      return athlete.eventId === selectedEventId;
    })
  ), [athletes, selectedEventId]);

  const normalizedSearch = useMemo(() => normalizeSearchTerm(deferredSearch), [deferredSearch]);

  const panelTemplates = useMemo(() => {
    if (segment === 'kids') {
      return [
        { key: 'kids-gi', division: 'kids', mode: 'GI' },
        { key: 'kids-nogi', division: 'kids', mode: 'NO-GI' }
      ];
    }
    if (segment === 'adults') {
      return [
        { key: 'adults-gi', division: 'adults', mode: 'GI' },
        { key: 'adults-nogi', division: 'adults', mode: 'NO-GI' }
      ];
    }
    if (segment === 'masters') {
      return [
        { key: 'masters-gi', division: 'masters', mode: 'GI' },
        { key: 'masters-nogi', division: 'masters', mode: 'NO-GI' }
      ];
    }
    return [
      { key: 'kids-gi', division: 'kids', mode: 'GI' },
      { key: 'kids-nogi', division: 'kids', mode: 'NO-GI' },
      { key: 'adults-gi', division: 'adults', mode: 'GI' },
      { key: 'adults-nogi', division: 'adults', mode: 'NO-GI' }
    ];
  }, [segment]);

  const panelData = useMemo(() => (
    panelTemplates.map((template) => {
      const scopedAthletes = eventFilteredAthletes.filter((athlete) => (
        detectDivision(athlete) === template.division
        && detectMode(athlete) === template.mode
      ));
      const rankedTeams = buildTeamRanking(scopedAthletes);
      const searchedTeams = normalizedSearch
        ? rankedTeams.filter((team) => normalizeSearchTerm(team.academy).includes(normalizedSearch))
        : rankedTeams;
      const limitedTeams = tableLimit > 0 ? searchedTeams.slice(0, tableLimit) : searchedTeams;

      const cardBaseTitle = copy.cards[template.division] || copy.cards.adults;
      const modeLabel = template.mode === 'GI' ? copy.cards.gi : copy.cards.nogi;
      return {
        ...template,
        title: `${cardBaseTitle} ${modeLabel}`,
        teams: limitedTeams
      };
    })
  ), [panelTemplates, eventFilteredAthletes, normalizedSearch, tableLimit, copy.cards]);

  const totalTeams = useMemo(() => (
    buildTeamRanking(eventFilteredAthletes).length
  ), [eventFilteredAthletes]);
  const totalAthletes = eventFilteredAthletes.length;
  const eventLabel = selectedEvent?.name || (selectedEventId === 'none' ? copy.noEvent : copy.allEvents);
  const seasonLabel = `${copy.season} ${new Date().getFullYear()}`;

  useEffect(() => {
    setExpandedPanels(new Set());
  }, [segment, selectedEventId, normalizedSearch]);

  const togglePanel = (panelKey) => {
    setExpandedPanels((prev) => {
      const next = new Set(prev);
      if (next.has(panelKey)) {
        next.delete(panelKey);
      } else {
        next.add(panelKey);
      }
      return next;
    });
  };

  const handleExportCsv = () => {
    const headers = isEnglish
      ? ['PANEL', 'POS', 'TEAM', 'COUNTRY', 'POINTS', 'WINS', 'GOLD', 'SILVER', 'BRONZE', 'ATHLETES']
      : isSpanish
        ? ['PANEL', 'POS', 'EQUIPO', 'PAIS', 'PUNTOS', 'VICTORIAS', 'ORO', 'PLATA', 'BRONCE', 'ATLETAS']
        : isFrench
          ? ['PANNEAU', 'POS', 'EQUIPE', 'PAYS', 'POINTS', 'VICTOIRES', 'OR', 'ARGENT', 'BRONZE', 'ATHLETES']
          : ['PAINEL', 'POS', 'EQUIPE', 'PAIS', 'PONTOS', 'VITORIAS', 'OURO', 'PRATA', 'BRONZE', 'ATLETAS'];

    const rows = panelData.flatMap((panel) => (
      panel.teams.map((team) => ([
        panel.title,
        team.rank,
        team.academy,
        countryLabelFromCode(team.countryCode, uiLanguage) || team.countryCode,
        team.pontos,
        team.wins,
        team.campeao,
        team.vice,
        team.terceiro,
        team.atletas
      ]))
    ));

    const fileName = `ranking_equipes_${buildFileSafeName(segment)}_${buildFileSafeName(eventLabel)}`;
    downloadCsv(fileName, headers, rows);
  };

  return (
    <div className="ajp-page-container">
      <div className="ajp-header-section" style={{
        backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 35%, rgba(0,0,0,0.45) 65%, rgba(0,0,0,0.85) 100%), url('/rankequipe.jpeg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center 28%',
      }}>
        <div className="ajp-header-top">
          <h1 className="ajp-header-title">RANKING EQUIPES</h1>
          <div style={{ position: 'relative' }}>
            <select
              className="ajp-event-dropdown"
              style={{ appearance: 'none', WebkitAppearance: 'none', background: 'transparent', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', paddingRight: '20px' }}
              value={selectedEventId}
              onChange={(event) => setSelectedEventId(event.target.value)}
              aria-label={copy.selectEvent}
            >
              <option value="all">{copy.allEvents}</option>
              <option value="none">{copy.noEvent}</option>
              {events.map((eventItem) => (
                <option key={eventItem.id} value={eventItem.id} style={{ color: '#000' }}>{eventItem.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="ajp-breadcrumb">
          <span>Rankings</span>
          <span>/</span>
          <span className="bc-current">{eventLabel}</span>
          <span>/</span>
          <span>EQUIPES</span>
        </div>

        <div className="ajp-gender-toggles" style={{ justifyContent: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
          {SEGMENT_IDS.map((segmentId) => (
            <button
              key={segmentId}
              type="button"
              className={`ajp-gender-btn ${segmentId === segment ? 'active' : ''}`}
              onClick={() => setSegment(segmentId)}
            >
              <Trophy size={16} />
              {copy.segments[segmentId]}
            </button>
          ))}
        </div>

        <div 
          className="ajp-header-search" 
          style={{ 
            marginTop: '24px', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'rgba(255, 255, 255, 0.05)', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            borderRadius: '4px', 
            padding: '8px 16px',
            width: '100%',
            maxWidth: '300px'
          }}
        >
          <Search size={16} color="#aaa" />
          <input
            type="text"
            placeholder={copy.searchTeam}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            aria-label={copy.searchTeam}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              width: '100%'
            }}
          />
        </div>
      </div>

      <div className="ajp-category-grid" style={{ padding: '0 40px 40px', maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', gap: '32px' }}>
        {panelData.map((panel) => {
          const expanded = expandedPanels.has(panel.key);
          const hasMore = panel.teams.length > 5;
          const visibleTeams = expanded ? panel.teams : panel.teams.slice(0, 5);
          return (
            <div key={panel.key} className="ajp-category-card">
              <div className="ajp-category-header">
                <h3 className="ajp-category-title">{panel.title}</h3>
                <p className="ajp-category-subtitle">Last calculated just now</p>
              </div>

              <div className="ajp-category-body">
                {visibleTeams.length === 0 ? (
                  <div className="ajp-empty-state">{copy.noData}</div>
                ) : (
                  visibleTeams.map((team, index) => {
                    const countryLabel = countryLabelFromCode(team.countryCode, uiLanguage) || team.countryCode;
                    
                    const academyDetails = (academies || []).find(a => 
                        a.name && team.academy && a.name.toLowerCase() === team.academy.toLowerCase()
                    );
                    const logoUrl = academyDetails?.logoUrl;
                    
                    return (
                      <div key={`${panel.key}-${team.key}`} className="ajp-category-row" style={{ cursor: 'default' }}>
                        <div className="ajp-category-rank">{team.rank}.</div>
                        <div className="ajp-category-avatar" style={{ background: 'transparent' }}>
                          {logoUrl ? (
                            <img src={logoUrl} alt={team.academy} loading="lazy" />
                          ) : (
                            <Shield size={24} color="#aaa" />
                          )}
                        </div>
                        <div className="ajp-category-info">
                          <div className="ajp-category-name">{team.academy}</div>
                          <div className="ajp-category-country">
                            <span>{flagFromCountryCode(team.countryCode)}</span>
                            <span>{countryLabel}</span>
                          </div>
                        </div>

                        <div className="ajp-category-stats">
                          <div className="ajp-stat-col">
                            <span className="ajp-stat-val blue">{team.pontos || 0}</span>
                            <span className="ajp-stat-label">Points</span>
                          </div>
                          <div className="ajp-stat-col">
                            <span className="ajp-stat-val green">{team.wins || 0}</span>
                            <span className="ajp-stat-label">Wins</span>
                          </div>
                          <div className="ajp-stat-col">
                            <span className="ajp-stat-val red">0</span>
                            <span className="ajp-stat-label">Losses</span>
                          </div>
                          <div className="ajp-stat-col">
                            <span className="ajp-stat-val gold">{team.campeao || 0}</span>
                            <span className="ajp-stat-label" style={{fontSize: '10px', marginTop: '2px'}}>🥇</span>
                          </div>
                          <div className="ajp-stat-col">
                            <span className="ajp-stat-val silver">{team.vice || 0}</span>
                            <span className="ajp-stat-label" style={{fontSize: '10px', marginTop: '2px'}}>🥈</span>
                          </div>
                          <div className="ajp-stat-col">
                            <span className="ajp-stat-val bronze">{team.terceiro || 0}</span>
                            <span className="ajp-stat-label" style={{fontSize: '10px', marginTop: '2px'}}>🥉</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {hasMore && (
                <div 
                  className="ajp-category-footer"
                  onClick={() => togglePanel(panel.key)}
                  style={{ cursor: 'pointer' }}
                >
                  {expanded ? (copy.collapse || 'Collapse') : (copy.seeAll || 'See all')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RankEquipes;


