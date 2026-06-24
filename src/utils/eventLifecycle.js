const FINISHED_PHASE_TOKENS = [
  'finalizado',
  'finalizada',
  'finalized',
  'finalised',
  'finished',
  'done',
  'past',
  'encerrado',
  'encerrada',
  'completed',
  'complete',
  'concluido',
  'concluida',
  'closed'
];

const normalizeLifecycleValue = (value = '') => (
  value
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
);

const tokenRegexCache = new Map();

const matchesLifecycleToken = (value, token) => {
  if (!value || !token) return false;
  if (!tokenRegexCache.has(token)) {
    tokenRegexCache.set(token, new RegExp(`(^|[^a-z])${token}([^a-z]|$)`));
  }
  return tokenRegexCache.get(token).test(value);
};

export const parseEventDateValue = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }

  if (typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const trimmed = value.toString().trim();
  if (!trimmed) return null;

  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getStartOfDayTime = (value = new Date()) => {
  const parsed = parseEventDateValue(value);
  if (!parsed) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed.getTime();
};

export const isEventFinalizedByPhase = (event = {}) => {
  if (event?.finalized === true || event?.finished === true || event?.isFinished === true) {
    return true;
  }

  const phaseKey = normalizeLifecycleValue(
    event?.eventPhase
      ?? event?.phase
      ?? event?.status
      ?? event?.eventStatus
      ?? ''
  );

  if (!phaseKey) return false;
  return FINISHED_PHASE_TOKENS.some((token) => matchesLifecycleToken(phaseKey, token));
};

export const isEventPastByDate = (eventOrDate, referenceDate = new Date()) => {
  const eventDateSource = (
    eventOrDate
    && typeof eventOrDate === 'object'
    && !(eventOrDate instanceof Date)
  )
    ? (eventOrDate.date || eventOrDate.eventDate || '')
    : eventOrDate;

  const eventDayTime = getStartOfDayTime(eventDateSource);
  const referenceDayTime = getStartOfDayTime(referenceDate);

  if (!Number.isFinite(eventDayTime) || !Number.isFinite(referenceDayTime)) {
    return false;
  }

  return eventDayTime < referenceDayTime;
};

export const resolveEventLifecycle = (event = {}, referenceDate = new Date()) => {
  const finalizedByPhase = isEventFinalizedByPhase(event);
  const pastByDate = isEventPastByDate(event, referenceDate);
  const isPast = finalizedByPhase || pastByDate;

  return {
    finalizedByPhase,
    pastByDate,
    isPast,
    isUpcoming: !isPast
  };
};
