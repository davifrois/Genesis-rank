import { buildScoreBreakdown } from './scoringService';
import { countryCodeFromAthlete } from '../utils/countryFlags';

const normalizeGroupPart = (value) => (
  (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
);

const pickMostFrequentCode = (hits) => {
  const entries = Object.entries(hits || {});
  if (!entries.length) return 'BR';
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0] || 'BR';
};

export const buildTeamRanking = (athletes = []) => {
  const teams = new Map();

  (Array.isArray(athletes) ? athletes : []).forEach((athlete) => {
    const academy = (athlete?.academia || 'Sem academia').toString().trim() || 'Sem academia';
    const key = normalizeGroupPart(academy);
    const stats = teams.get(key) || {
      key,
      academy,
      name: academy,
      points: 0,
      pontos: 0,
      wins: 0,
      podiums: 0,
      campeao: 0,
      vice: 0,
      terceiro: 0,
      athletes: 0,
      atletas: 0,
      countryHits: {}
    };

    const history = Array.isArray(athlete?.historico) ? athlete.historico : [];
    const breakdown = buildScoreBreakdown(history);
    const points = Number(athlete?.pontos) || 0;

    stats.points += points;
    stats.pontos += points;
    stats.wins += Number(breakdown?.wins || 0);
    stats.campeao += Number(breakdown?.podium1 || 0);
    stats.vice += Number(breakdown?.podium2 || 0);
    stats.terceiro += Number(breakdown?.podium3 || 0);
    stats.podiums = stats.campeao + stats.vice + stats.terceiro;
    stats.athletes += 1;
    stats.atletas += 1;

    const countryCode = countryCodeFromAthlete(athlete);
    stats.countryHits[countryCode] = (stats.countryHits[countryCode] || 0) + 1;

    teams.set(key, stats);
  });

  return [...teams.values()]
    .map((team) => ({
      ...team,
      podiums: team.campeao + team.vice + team.terceiro,
      countryCode: pickMostFrequentCode(team.countryHits)
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.campeao !== a.campeao) return b.campeao - a.campeao;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.athletes !== a.athletes) return b.athletes - a.athletes;
      return a.academy.localeCompare(b.academy);
    })
    .map((team, index) => ({
      ...team,
      rank: index + 1
    }));
};
