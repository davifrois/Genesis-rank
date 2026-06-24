export const PUBLISHED_EVENT_SCHEDULE_STORAGE_KEY = 'genesis_published_event_schedule_v1';
export const PUBLISHED_EVENT_SCHEDULE_CHANGED = 'genesis:published-schedule-changed';

export const parseScheduleClockToMinutes = (value) => {
  const [rawHour = '0', rawMinute = '0'] = (value || '').toString().split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 9 * 60;
  const safeHour = Math.min(23, Math.max(0, Math.floor(hour)));
  const safeMinute = Math.min(59, Math.max(0, Math.floor(minute)));
  return (safeHour * 60) + safeMinute;
};

export const formatScheduleMinutesToClock = (totalMinutes) => {
  const safeTotal = Number.isFinite(totalMinutes) ? Math.max(0, Math.floor(totalMinutes)) : 0;
  const wrapped = safeTotal % (24 * 60);
  const hours = Math.floor(wrapped / 60).toString().padStart(2, '0');
  const minutes = (wrapped % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const formatScheduleDurationLabel = (minutes) => {
  const safeTotal = Number.isFinite(Number(minutes)) ? Math.max(0, Math.floor(Number(minutes))) : 0;
  const hours = Math.floor(safeTotal / 60);
  const remainingMinutes = safeTotal % 60;
  if (hours <= 0) return `${remainingMinutes} min`;
  if (remainingMinutes <= 0) return `${hours} h`;
  return `${hours} h ${remainingMinutes} min`;
};

export const normalizePublishedScheduleType = (value) => {
  const normalized = (value || '').toString().trim().toUpperCase();
  if (['FIGHT', 'BREAK', 'CEREMONY', 'OTHER'].includes(normalized)) return normalized;
  return 'FIGHT';
};

const normalizeText = (value) => (value || '').toString().trim();

export const normalizePublishedScheduleRow = (row = {}, index = 0) => {
  const start = row.startLabel || row.start || '09:00';
  const end = row.endLabel || row.end || start;
  const startMinute = parseScheduleClockToMinutes(start);
  let endMinute = parseScheduleClockToMinutes(end);
  if (endMinute < startMinute) endMinute = startMinute;
  const durationMinutes = Number.isFinite(Number(row.durationMinutes))
    ? Math.max(0, Math.floor(Number(row.durationMinutes)))
    : Math.max(0, endMinute - startMinute);

  return {
    id: normalizeText(row.id) || `published-schedule-${index + 1}`,
    order: Number.isFinite(Number(row.order)) ? Number(row.order) : index + 1,
    title: normalizeText(row.title) || normalizeText(row.label) || 'Categoria',
    type: normalizePublishedScheduleType(row.type),
    area: normalizeText(row.area),
    startLabel: formatScheduleMinutesToClock(startMinute),
    endLabel: formatScheduleMinutesToClock(endMinute),
    startMinute,
    endMinute,
    durationMinutes,
    notes: normalizeText(row.notes),
    categoria: normalizeText(row.categoria || row.category),
    faixa: normalizeText(row.faixa || row.belt),
    peso: normalizeText(row.peso || row.weight),
    genero: normalizeText(row.genero || row.gender),
    participants: Number.isFinite(Number(row.participants)) ? Number(row.participants) : 0,
    fightCount: Number.isFinite(Number(row.fightCount)) ? Number(row.fightCount) : 0,
    fightDurationMinutes: Number.isFinite(Number(row.fightDurationMinutes)) ? Number(row.fightDurationMinutes) : 0
  };
};

export const normalizePublishedEventSchedule = (eventId, payload = {}) => {
  const normalizedEventId = normalizeText(eventId || payload.eventId);
  if (!normalizedEventId) return null;
  const rows = (Array.isArray(payload.rows) ? payload.rows : [])
    .map((row, index) => normalizePublishedScheduleRow(row, index))
    .sort((left, right) => {
      const orderDiff = (left.order || 0) - (right.order || 0);
      if (orderDiff !== 0) return orderDiff;
      return (left.startMinute || 0) - (right.startMinute || 0);
    })
    .map((row, index) => ({ ...row, order: index + 1 }));

  return {
    version: 1,
    eventId: normalizedEventId,
    eventName: normalizeText(payload.eventName),
    eventDate: normalizeText(payload.eventDate),
    eventLocation: normalizeText(payload.eventLocation),
    settings: payload.settings && typeof payload.settings === 'object' ? payload.settings : {},
    publishedAt: normalizeText(payload.publishedAt) || new Date().toISOString(),
    rows
  };
};

export const loadPublishedEventSchedules = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PUBLISHED_EVENT_SCHEDULE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.entries(parsed).reduce((acc, [eventId, payload]) => {
      const normalized = normalizePublishedEventSchedule(eventId, payload);
      if (normalized && normalized.rows.length > 0) {
        acc[normalized.eventId] = normalized;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
};

export const getPublishedEventSchedule = (eventId) => {
  const normalizedEventId = normalizeText(eventId);
  if (!normalizedEventId) return null;
  return loadPublishedEventSchedules()[normalizedEventId] || null;
};

export const parsePublishedEventSchedule = (eventId, value) => {
  if (!value) return null;
  try {
    const payload = typeof value === 'string' ? JSON.parse(value) : value;
    return normalizePublishedEventSchedule(eventId, payload);
  } catch {
    return null;
  }
};

export const savePublishedEventSchedule = (eventId, payload = {}) => {
  if (typeof window === 'undefined') return null;
  const normalized = normalizePublishedEventSchedule(eventId, payload);
  if (!normalized || normalized.rows.length === 0) return null;

  try {
    const current = loadPublishedEventSchedules();
    const next = {
      ...current,
      [normalized.eventId]: normalized
    };
    window.localStorage.setItem(PUBLISHED_EVENT_SCHEDULE_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(PUBLISHED_EVENT_SCHEDULE_CHANGED, {
      detail: { eventId: normalized.eventId }
    }));
    return normalized;
  } catch {
    return null;
  }
};
