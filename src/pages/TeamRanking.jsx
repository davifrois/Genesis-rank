import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Medal, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { useI18n } from '../hooks/useI18n';
import { buildScoreBreakdown } from '../services/scoringService';
import { buildFileSafeName, downloadCsv } from '../services/exportService';

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

const TeamRanking = () => {
  const { athletes, events, activeEventId } = useStore();
  const { language } = useI18n();
  const isEnglish = language === 'en-US';
  const copy = isEnglish
    ? {
        noEvent: 'No event',
        allEvents: 'All events',
        event: 'Event',
        selectEvent: 'Select event',
        searchTeam: 'Search team',
        show: 'Show',
        top25: 'Top 25',
        top50: 'Top 50',
        top100: 'Top 100',
        all: 'All',
        exportCsv: 'Export CSV',
        teams: 'Teams',
        athletes: 'Athletes',
        results: 'Results',
        teamTitle: 'Team ranking',
        teamSubtitle: 'Points and medal totals by academy.',
        top3: 'Top 3',
        firstPlace: '1st place',
        secondPlace: '2nd place',
        thirdPlace: '3rd place',
        emptyTeams: 'No team found.',
        champion: 'Champion',
        vice: 'Runner-up',
        third: 'Third',
        points: 'Points',
        placement: 'Placement',
        athletesLabel: 'athletes',
        gold: 'gold',
        silver: 'silver',
        bronze: 'bronze',
        placeSuffix: 'place'
      }
    : {
        noEvent: 'Sem evento',
        allEvents: 'Todos os eventos',
        event: 'Evento',
        selectEvent: 'Selecionar evento',
        searchTeam: 'Buscar equipe',
        show: 'Mostrar',
        top25: 'Top 25',
        top50: 'Top 50',
        top100: 'Top 100',
        all: 'Todos',
        exportCsv: 'Exportar CSV',
        teams: 'Equipes',
        athletes: 'Atletas',
        results: 'Resultados',
        teamTitle: 'Classificacao por equipe',
        teamSubtitle: 'Soma de pontos e medalhas por academia.',
        top3: 'Top 3',
        firstPlace: '1o lugar',
        secondPlace: '2o lugar',
        thirdPlace: '3o lugar',
        emptyTeams: 'Nenhuma equipe encontrada.',
        champion: 'Campeao',
        vice: 'Vice',
        third: 'Terceiro',
        points: 'Pontos',
        placement: 'Colocacao',
        athletesLabel: 'atletas',
        gold: 'ouro',
        silver: 'prata',
        bronze: 'bronze',
        placeSuffix: 'lugar'
      };
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedEventId, setSelectedEventId] = useState(() => (
    searchParams.get('event') || activeEventId || 'all'
  ));
  const [searchTerm, setSearchTerm] = useState(() => normalizeQueryParam(searchParams.get('q')));
  const deferredSearch = useDeferredValue(searchTerm);
  const [tableLimit, setTableLimit] = useState(() => parseLimitParam(searchParams.get('limit'), 50));

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

    if (paramEvent && paramEvent !== selectedEventId) {
      setSelectedEventId(paramEvent);
    }
    if (paramQuery !== searchTerm) {
      setSearchTerm(paramQuery);
    }
    if (paramLimit !== tableLimit) {
      setTableLimit(paramLimit);
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

    if (changed) {
      setSearchParams(params, { replace: true });
    }
  }, [selectedEventId, searchTerm, tableLimit, searchParams, setSearchParams]);

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

  const teamRanking = useMemo(() => {
    const teams = new Map();

    eventFilteredAthletes.forEach((athlete) => {
      const academy = (athlete.academia || 'Sem academia').toString().trim() || 'Sem academia';
      const key = normalizeGroupPart(academy);
      const stats = teams.get(key) || {
        key,
        academy,
        campeao: 0,
        vice: 0,
        terceiro: 0,
        pontos: 0,
        atletas: 0
      };

      const history = Array.isArray(athlete.historico) ? athlete.historico : [];
      const breakdown = buildScoreBreakdown(history);
      stats.campeao += breakdown.podium1;
      stats.vice += breakdown.podium2;
      stats.terceiro += breakdown.podium3;
      stats.pontos += Number(athlete.pontos) || 0;
      stats.atletas += 1;

      teams.set(key, stats);
    });

    return Array.from(teams.values())
      .sort((a, b) => {
        if (b.pontos !== a.pontos) return b.pontos - a.pontos;
        if (b.campeao !== a.campeao) return b.campeao - a.campeao;
        if (b.vice !== a.vice) return b.vice - a.vice;
        if (b.terceiro !== a.terceiro) return b.terceiro - a.terceiro;
        return a.academy.localeCompare(b.academy);
      })
      .map((team, index) => ({ ...team, rank: index + 1 }));
  }, [eventFilteredAthletes]);

  const normalizedSearch = useMemo(() => normalizeSearchTerm(deferredSearch), [deferredSearch]);

  const teamSearchIndex = useMemo(() => {
    const map = new Map();
    teamRanking.forEach((team) => {
      map.set(team.key, normalizeSearchTerm(team.academy));
    });
    return map;
  }, [teamRanking]);

  const filteredTeams = useMemo(() => {
    if (!normalizedSearch) return teamRanking;
    return teamRanking.filter((team) => (
      (teamSearchIndex.get(team.key) || '').includes(normalizedSearch)
    ));
  }, [teamRanking, normalizedSearch, teamSearchIndex]);

  const isSearching = normalizedSearch.length > 0;

  const visibleTeams = useMemo(() => {
    if (!tableLimit || tableLimit <= 0) return filteredTeams;
    return filteredTeams.slice(0, tableLimit);
  }, [filteredTeams, tableLimit]);

  const topTeams = isSearching ? [] : teamRanking.slice(0, 3);
  const totalTeams = teamRanking.length;
  const totalAthletes = eventFilteredAthletes.length;
  const eventLabel = selectedEvent?.name || (selectedEventId === 'none' ? copy.noEvent : copy.allEvents);

  const handleExportCsv = () => {
    const headers = isEnglish
      ? ['POS', 'TEAM', 'POINTS', 'CHAMPION', 'RUNNER_UP', 'THIRD', 'ATHLETES']
      : ['POS', 'EQUIPE', 'PONTOS', 'CAMPEAO', 'VICE', 'TERCEIRO', 'ATLETAS'];
    const rows = filteredTeams.map((team) => ([
      team.rank,
      team.academy,
      team.pontos,
      team.campeao,
      team.vice,
      team.terceiro,
      team.atletas
    ]));
    const fileName = `ranking_equipes_${buildFileSafeName(eventLabel)}`;
    downloadCsv(fileName, headers, rows);
  };

  const formatPlace = (rank) => {
    if (!isEnglish) return `${rank} ${copy.placeSuffix}`;
    const mod10 = rank % 10;
    const mod100 = rank % 100;
    if (mod10 === 1 && mod100 !== 11) return `${rank}st ${copy.placeSuffix}`;
    if (mod10 === 2 && mod100 !== 12) return `${rank}nd ${copy.placeSuffix}`;
    if (mod10 === 3 && mod100 !== 13) return `${rank}rd ${copy.placeSuffix}`;
    return `${rank}th ${copy.placeSuffix}`;
  };
  const renderPodiumLabel = (index) => {
    if (index === 0) return copy.firstPlace;
    if (index === 1) return copy.secondPlace;
    return copy.thirdPlace;
  };

  const renderMedal = (index) => {
    const medalClass = index === 0
      ? 'team-medal--gold'
      : index === 1
        ? 'team-medal--silver'
        : 'team-medal--bronze';
    return <Medal className={`team-medal__icon ${medalClass}`} size={16} />;
  };

  return (
    <div className="ranking-minimal">
      <div className="rank-controls">
        <div>
          <div className="rank-controls__label">{copy.event}</div>
          <div className="rank-controls__value">
            {selectedEvent?.name || (selectedEventId === 'none' ? copy.noEvent : copy.allEvents)}
          </div>
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
          <span>{copy.results}</span>
          <strong>{filteredTeams.length}</strong>
        </div>
      </div>

      <div className="rank-team">
        <div className="rank-team__header">
          <div>
            <div className="rank-team__title">{copy.teamTitle}</div>
            <div className="rank-team__subtitle">{copy.teamSubtitle}</div>
          </div>
          {!isSearching && <span className="tag">{copy.top3}</span>}
        </div>

        {topTeams.length > 0 ? (
          <div className="podium-grid">
            {topTeams.map((team, index) => (
              <div
                key={team.key}
                className={`podium-card podium-card--${index === 0 ? 'ouro' : index === 1 ? 'prata' : 'bronze'}`}
              >
                <div className="podium-card__info">
                  <span className="podium-place">
                    {renderMedal(index)}
                    {renderPodiumLabel(index)}
                  </span>
                  <strong>{team.academy}</strong>
                  <p>
                    {team.campeao} {copy.gold} / {team.vice} {copy.silver} / {team.terceiro} {copy.bronze}
                  </p>
                </div>
                <div className="podium-card__score">
                  <div>{team.pontos}</div>
                  <span>{copy.points}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rank-empty">{copy.emptyTeams}</div>
        )}

        {filteredTeams.length > 0 && (
          <table className="data-table team-table">
            <thead>
              <tr>
                <th>{copy.teams}</th>
                <th>
                  <span className="team-medal team-medal--gold">
                    <Medal size={14} />
                    {copy.champion}
                  </span>
                </th>
                <th>
                  <span className="team-medal team-medal--silver">
                    <Medal size={14} />
                    {copy.vice}
                  </span>
                </th>
                <th>
                  <span className="team-medal team-medal--bronze">
                    <Medal size={14} />
                    {copy.third}
                  </span>
                </th>
                <th>{copy.points}</th>
                <th>{copy.placement}</th>
              </tr>
            </thead>
            <tbody>
              {visibleTeams.map((team) => (
                <tr key={team.key} className={`team-row ${team.rank <= 3 ? 'is-top' : ''}`}>
                  <td>
                    <div className="table-name">{team.academy}</div>
                    <div className="table-meta">{team.atletas} {copy.athletesLabel}</div>
                  </td>
                  <td>{team.campeao}</td>
                  <td>{team.vice}</td>
                  <td>{team.terceiro}</td>
                  <td>
                    <span className="points-pill">{team.pontos}</span>
                  </td>
                  <td>{formatPlace(team.rank)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TeamRanking;
