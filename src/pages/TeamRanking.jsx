import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Medal, Search, Trophy } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { useI18n } from '../hooks/useI18n';
import { buildScoreBreakdown } from '../services/scoringService';
import { buildFileSafeName, downloadCsv } from '../services/exportService';
import { countryCodeFromAthlete, countryLabelFromCode, flagFromCountryCode } from '../utils/countryFlags';

const SEGMENT_IDS = ['kids', 'adults', 'academies', 'masters'];

const normalizeGroupPart = (value) => (
  (value || '').toString().trim().toLowerCase().replace(/\s+/g, ' ')
);

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

const pickMostFrequentCode = (hits) => {
  const entries = Object.entries(hits || {});
  if (!entries.length) return 'BR';
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0] || 'BR';
};

const buildTeamRanking = (athletes) => {
  const teams = new Map();

  athletes.forEach((athlete) => {
    const academy = (athlete?.academia || 'Sem academia').toString().trim() || 'Sem academia';
    const key = normalizeGroupPart(academy);
    const stats = teams.get(key) || {
      key,
      academy,
      campeao: 0,
      vice: 0,
      terceiro: 0,
      wins: 0,
      pontos: 0,
      atletas: 0,
      countryHits: {}
    };

    const history = Array.isArray(athlete?.historico) ? athlete.historico : [];
    const breakdown = buildScoreBreakdown(history);

    stats.campeao += breakdown.podium1;
    stats.vice += breakdown.podium2;
    stats.terceiro += breakdown.podium3;
    stats.wins += breakdown.wins;
    stats.pontos += Number(athlete?.pontos) || 0;
    stats.atletas += 1;

    const countryCode = countryCodeFromAthlete(athlete);
    stats.countryHits[countryCode] = (stats.countryHits[countryCode] || 0) + 1;

    teams.set(key, stats);
  });

  return Array.from(teams.values())
    .sort((a, b) => {
      if (b.pontos !== a.pontos) return b.pontos - a.pontos;
      if (b.campeao !== a.campeao) return b.campeao - a.campeao;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.atletas !== a.atletas) return b.atletas - a.atletas;
      return a.academy.localeCompare(b.academy);
    })
    .map((team, index) => ({
      ...team,
      rank: index + 1,
      countryCode: pickMostFrequentCode(team.countryHits)
    }));
};

const TeamRanking = () => {
  const { athletes, events, activeEventId } = useStore();
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
    <div className="ranking-minimal team-ranking-premium">
      <div className="rank-controls">
        <div>
          <div className="rank-controls__label">{copy.event}</div>
          <div className="rank-controls__value">{eventLabel}</div>
        </div>
        <select
          className="input select-compact"
          value={selectedEventId}
          onChange={(event) => setSelectedEventId(event.target.value)}
          aria-label={copy.selectEvent}
        >
          <option value="all">{copy.allEvents}</option>
          <option value="none">{copy.noEvent}</option>
          {events.map((eventItem) => (
            <option key={eventItem.id} value={eventItem.id}>{eventItem.name}</option>
          ))}
        </select>
      </div>

      <div className="rank-toolbar">
        <div className="rank-search rank-search--inline">
          <Search size={16} />
          <input
            type="text"
            placeholder={copy.searchTeam}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            aria-label={copy.searchTeam}
          />
        </div>
        <div className="rank-toolbar__actions">
          <label className="rank-limit">
            <span>{copy.show}</span>
            <select
              value={tableLimit}
              onChange={(event) => setTableLimit(Number(event.target.value))}
            >
              <option value={25}>{copy.top25}</option>
              <option value={50}>{copy.top50}</option>
              <option value={100}>{copy.top100}</option>
              <option value={0}>{copy.all}</option>
            </select>
          </label>
          <button type="button" className="btn btn-ghost" onClick={handleExportCsv}>
            {copy.exportCsv}
          </button>
        </div>
      </div>

      <div className="rank-stats-bar">
        <div className="rank-stat">
          <span>{copy.teams}</span>
          <strong>{totalTeams}</strong>
        </div>
        <div className="rank-stat">
          <span>{copy.athletes}</span>
          <strong>{totalAthletes}</strong>
        </div>
        <div className="rank-stat">
          <span>{copy.panels}</span>
          <strong>{panelTemplates.length}</strong>
        </div>
      </div>

      <div className="team-ranking-segments">
        {SEGMENT_IDS.map((segmentId) => (
          <button
            key={segmentId}
            type="button"
            className={`team-ranking-segment ${segmentId === segment ? 'is-active' : ''}`}
            onClick={() => setSegment(segmentId)}
          >
            {copy.segments[segmentId]}
          </button>
        ))}
      </div>

      <div className="team-ranking-panels">
        {panelData.map((panel) => {
          const expanded = expandedPanels.has(panel.key);
          const hasMore = panel.teams.length > 3;
          const visibleTeams = expanded ? panel.teams : panel.teams.slice(0, 3);
          return (
            <section key={panel.key} className="team-ranking-panel">
              <header className="team-ranking-panel__header">
                <div>
                  <h3>{panel.title}</h3>
                  <p>{copy.updatedNow}</p>
                </div>
                <span className="team-ranking-panel__season">{seasonLabel}</span>
              </header>

              <div className="team-ranking-panel__body">
                {visibleTeams.length === 0 ? (
                  <div className="rank-empty">{copy.noData}</div>
                ) : (
                  visibleTeams.map((team) => {
                    const countryLabel = countryLabelFromCode(team.countryCode, uiLanguage) || team.countryCode;
                    return (
                      <article key={`${panel.key}-${team.key}`} className="team-ranking-row">
                        <div className="team-ranking-row__left">
                          <div className="team-ranking-row__rank">{team.rank}</div>
                          <div className="team-ranking-row__identity">
                            <strong>{team.academy}</strong>
                            <span>
                              <span className="team-ranking-row__flag" aria-hidden="true">{flagFromCountryCode(team.countryCode)}</span>
                              {countryLabel}
                            </span>
                          </div>
                        </div>

                        <div className="team-ranking-row__metrics">
                          <div className="team-ranking-metric is-points">
                            <strong>{team.pontos}</strong>
                            <span>{copy.points}</span>
                          </div>
                          <div className="team-ranking-metric is-wins">
                            <strong>{team.wins}</strong>
                            <span>{copy.wins}</span>
                          </div>
                          <div className="team-ranking-metric is-medals">
                            <strong>{team.campeao + team.vice + team.terceiro}</strong>
                            <span>{copy.gold + '/' + copy.silver + '/' + copy.bronze}</span>
                          </div>
                          <div className="team-ranking-medals">
                            <span><Medal size={12} /> {team.campeao}</span>
                            <span><Medal size={12} /> {team.vice}</span>
                            <span><Medal size={12} /> {team.terceiro}</span>
                            <span><Trophy size={12} /> {team.atletas} {copy.athletesLabel}</span>
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>

              {hasMore && (
                <button
                  type="button"
                  className="team-ranking-panel__toggle"
                  onClick={() => togglePanel(panel.key)}
                >
                  {expanded ? copy.collapse : copy.seeAll}
                </button>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default TeamRanking;


