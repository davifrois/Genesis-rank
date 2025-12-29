const CACHE_KEY = 'genesis_ranking_cache_v1';
const CACHE_TTL_MS = 30000;

export const readRankingCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.timestamp || !parsed.data) return null;
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed;
  } catch (err) {
    return null;
  }
};

export const writeRankingCache = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
  } catch (err) {
    // Ignore cache write errors silently
  }
};
