// Points configuration
export const SCORE_RULES = {
  WIN: 0,
  PODIUM_1ST: 3,
  PODIUM_2ND: 2,
  PODIUM_3RD: 1,
};

/**
 * Calculates total points for an athlete based on their history
 * @param {Array} history - List of results for the athlete
 * @returns {number} Total points
 */
export const calculateTotalPoints = (history) => {
  return history.reduce((total, record) => {
    let points = 0;
    if (record.type === 'win') points += SCORE_RULES.WIN;
    if (record.type === 'seed' && Number.isFinite(record.points)) points += record.points;
    if (record.type === 'podium') {
      if (record.position === 1) points += SCORE_RULES.PODIUM_1ST;
      if (record.position === 2) points += SCORE_RULES.PODIUM_2ND;
      if (record.position === 3) points += SCORE_RULES.PODIUM_3RD;
    }
    return total + points;
  }, 0);
};

/**
 * Builds a transparent breakdown of how the total score was composed
 * @param {Array} history
 * @returns {{ total: number, wins: number, podium1: number, podium2: number, podium3: number, seedPoints: number }}
 */
export const buildScoreBreakdown = (history) => {
  const breakdown = {
    total: 0,
    wins: 0,
    podium1: 0,
    podium2: 0,
    podium3: 0,
    seedPoints: 0,
  };

  history.forEach((record) => {
    if (record.type === 'win') breakdown.wins += 1;
    if (record.type === 'seed' && Number.isFinite(record.points)) breakdown.seedPoints += record.points;
    if (record.type === 'podium') {
      if (record.position === 1) breakdown.podium1 += 1;
      if (record.position === 2) breakdown.podium2 += 1;
      if (record.position === 3) breakdown.podium3 += 1;
    }
  });

  breakdown.total = calculateTotalPoints(history);
  return breakdown;
};

const normalizeName = (value) => (
  (value || '').toString().trim().toLowerCase()
);

const buildRankMeta = (athlete) => {
  const history = Array.isArray(athlete?.historico) ? athlete.historico : [];
  const breakdown = buildScoreBreakdown(history);

  return {
    pontos: Number(athlete?.pontos) || 0,
    podium1: breakdown.podium1,
    wins: breakdown.wins,
    name: normalizeName(athlete?.nome),
  };
};

const compareRankMeta = (a, b) => {
  if (a.pontos !== b.pontos) return b.pontos - a.pontos;
  if (a.podium1 !== b.podium1) return b.podium1 - a.podium1;
  if (a.wins !== b.wins) return b.wins - a.wins;
  return a.name.localeCompare(b.name);
};

/**
 * Ranks athletes by total points
 * @param {Array} athletes 
 * @returns {Array} Sorted athletes
 */
export const rankAthletes = (athletes) => {
  const metaCache = new Map();
  const getMeta = (athlete) => {
    if (!metaCache.has(athlete)) {
      metaCache.set(athlete, buildRankMeta(athlete));
    }
    return metaCache.get(athlete);
  };

  return [...athletes].sort((a, b) => compareRankMeta(getMeta(a), getMeta(b)));
};
