import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../hooks/useStore';
import { buildScoreBreakdown } from '../services/scoringService';

const normalizeGroupPart = (value) => (
  (value || '').toString().trim().toLowerCase().replace(/\s+/g, ' ')
);

const TeamRanking = () => {
  const { athletes, events, activeEventId } = useStore();
  const [selectedEventId, setSelectedEventId] = useState(activeEventId || 'all');

  useEffect(() => {
    const hasSelectedEvent = events.some((event) => event.id === selectedEventId);
    if (selectedEventId !== 'all' && selectedEventId !== 'none' && !hasSelectedEvent) {
      setSelectedEventId(activeEventId || 'all');
    }
  }, [activeEventId, events, selectedEventId]);

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

  const topTeams = teamRanking.slice(0, 3);

  return (
    <div className="ranking-minimal">
      <div className="rank-controls">
        <div>
          <div className="rank-controls__label">Evento</div>
          <div className="rank-controls__value">
            {selectedEvent?.name || (selectedEventId === 'none' ? 'Sem evento' : 'Todos os eventos')}
          </div>
        </div>
        <select
          className="input select-compact"
          value={selectedEventId}
          onChange={(event) => setSelectedEventId(event.target.value)}
          aria-label="Selecionar evento"
        >
          <option value="all">Todos os eventos</option>
          <option value="none">Sem evento</option>
          {events.map((eventItem) => (
            <option key={eventItem.id} value={eventItem.id}>{eventItem.name}</option>
          ))}
        </select>
      </div>

      <div className="rank-team">
        <div className="rank-team__header">
          <div>
            <div className="rank-team__title">Classificacao por equipe</div>
            <div className="rank-team__subtitle">Soma de pontos e medalhas por academia.</div>
          </div>
          <span className="tag">Top 3</span>
        </div>

        {topTeams.length > 0 ? (
          <div className="podium-grid">
            {topTeams.map((team, index) => (
              <div
                key={team.key}
                className={`podium-card podium-card--${index === 0 ? 'ouro' : index === 1 ? 'prata' : 'bronze'}`}
              >
                <div className="podium-card__info">
                  <span>{index + 1} lugar</span>
                  <strong>{team.academy}</strong>
                  <p>
                    {team.campeao} ouro / {team.vice} prata / {team.terceiro} bronze
                  </p>
                </div>
                <div className="podium-card__score">
                  <div>{team.pontos}</div>
                  <span>Pontos</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rank-empty">Nenhuma equipe encontrada.</div>
        )}

        {teamRanking.length > 0 && (
          <table className="data-table team-table">
            <thead>
              <tr>
                <th>Equipe</th>
                <th>Campeao</th>
                <th>Vice</th>
                <th>Terceiro</th>
                <th>Pontos</th>
                <th>Colocacao</th>
              </tr>
            </thead>
            <tbody>
              {teamRanking.map((team) => (
                <tr key={team.key} className={`team-row ${team.rank <= 3 ? 'is-top' : ''}`}>
                  <td>
                    <div className="table-name">{team.academy}</div>
                    <div className="table-meta">{team.atletas} atletas</div>
                  </td>
                  <td>{team.campeao}</td>
                  <td>{team.vice}</td>
                  <td>{team.terceiro}</td>
                  <td>
                    <span className="points-pill">{team.pontos}</span>
                  </td>
                  <td>{team.rank}o lugar</td>
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
