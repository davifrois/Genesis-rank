const normalizeLookup = (value) => (
  (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
);

const compactLookup = (value) => normalizeLookup(value).replace(/\s+/g, '');

const toBase64Url = (rawValue) => {
  const value = (rawValue || '').toString();
  if (!value) return '';

  try {
    const utf8 = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, hex) => (
      String.fromCharCode(parseInt(hex, 16))
    ));
    const base64 = btoa(utf8);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  } catch {
    return '';
  }
};

const fromBase64Url = (token) => {
  const value = (token || '').toString().trim();
  if (!value) return '';

  try {
    const padded = value
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(value.length / 4) * 4, '=');
    const binary = atob(padded);
    const percentEncoded = Array.from(binary)
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join('');
    return decodeURIComponent(percentEncoded);
  } catch {
    return '';
  }
};

const normalizeShareImageUrl = (value) => {
  const url = (value || '').toString().trim();
  if (!url) return '';
  if (/^(https?:|\/)/i.test(url)) return url;
  return '';
};

export const buildProfileShareCode = ({ profileId = '', fullName = '', academyName = '', birthDate = '' } = {}) => {
  const source = (profileId || `${fullName}-${academyName}-${birthDate}`).toString();
  const compact = source.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `GEN-${(compact || 'ATLETA').slice(-10)}`;
};

export const resolveProfileAthleteRows = ({
  athletes = [],
  profileName = '',
  academyName = '',
  profileId = '',
  athleteRecordId = ''
} = {}) => {
  const targetName = normalizeLookup(profileName);
  const targetNameCompact = compactLookup(profileName);
  const targetAcademy = normalizeLookup(academyName);
  const profileIds = new Set([profileId, athleteRecordId]
    .map((value) => (value || '').toString().trim())
    .filter(Boolean));

  return (Array.isArray(athletes) ? athletes : []).filter((athlete) => {
    const athleteIds = [
      athlete?.id,
      athlete?.profileId,
      athlete?.memberProfileId,
      athlete?.sourceAthleteId,
      athlete?.linkedSourceAthleteId
    ]
      .map((value) => (value || '').toString().trim())
      .filter(Boolean);
    if (profileIds.size > 0 && athleteIds.some((id) => profileIds.has(id))) return true;

    const athleteName = normalizeLookup(athlete?.nome || '');
    if (!athleteName) return false;

    const athleteNameCompact = compactLookup(athlete?.nome || '');
    const namesMatch = (
      (targetName && athleteName === targetName)
      || (targetNameCompact && athleteNameCompact === targetNameCompact)
      || (targetNameCompact && athleteNameCompact.includes(targetNameCompact))
      || (targetNameCompact && targetNameCompact.includes(athleteNameCompact))
    );
    if (!namesMatch) return false;

    if (!targetAcademy) return true;
    const athleteAcademy = normalizeLookup(athlete?.academia || athlete?.equipe || '');
    if (!athleteAcademy || athleteAcademy === normalizeLookup('Sem academia')) return true;
    return (
      athleteAcademy === targetAcademy
      || athleteAcademy.includes(targetAcademy)
      || targetAcademy.includes(athleteAcademy)
    );
  });
};

const resolvePodiumPlace = (athlete, eventBrackets = [], matchedIds = new Set()) => {
  const history = Array.isArray(athlete?.historico) ? athlete.historico : [];
  const podiumPositions = history
    .filter((item) => item?.type === 'podium' && [1, 2, 3].includes(Number(item?.position)))
    .map((item) => Number(item.position));

  if ([1, 2, 3].includes(Number(athlete?.podium))) {
    podiumPositions.push(Number(athlete.podium));
  }
  if ([1, 2, 3].includes(Number(athlete?.colocacao))) {
    podiumPositions.push(Number(athlete.colocacao));
  }
  if ([1, 2, 3].includes(Number(athlete?.posicao))) {
    podiumPositions.push(Number(athlete.posicao));
  }

  const athId = String(athlete?.id || '');
  eventBrackets.forEach((b) => {
    const pod = b?.podium || {};
    const gold = String(pod.goldId || '');
    const silver = String(pod.silverId || '');
    const bronze = String(pod.bronzeId || '');

    if (gold && (gold === athId || matchedIds.has(gold))) podiumPositions.push(1);
    if (silver && (silver === athId || matchedIds.has(silver))) podiumPositions.push(2);
    if (bronze && (bronze === athId || matchedIds.has(bronze))) podiumPositions.push(3);
  });

  if (!podiumPositions.length) return 0;
  return Math.min(...podiumPositions);
};

export const buildPublicProfileSnapshot = ({
  profile = {},
  shareCode = '',
  athletes = [],
  events = [],
  brackets = []
} = {}) => {
  const profileName = (profile?.fullName || '').toString().trim();
  const academyName = (profile?.academyName || '').toString().trim();
  const matchedAthletes = resolveProfileAthleteRows({
    athletes,
    profileName,
    academyName,
    profileId: profile?.id || '',
    athleteRecordId: profile?.athleteRecordId || ''
  });

  const matchedAthleteIds = new Set(
    matchedAthletes
      .flatMap(a => [a.id, a.profileId, a.memberProfileId])
      .map(id => (id || '').toString().trim())
      .filter(Boolean)
  );
  if (profile?.id) matchedAthleteIds.add(String(profile.id));
  if (profile?.athleteRecordId) matchedAthleteIds.add(String(profile.athleteRecordId));

  const eventMap = new Map(
    (Array.isArray(events) ? events : [])
      .filter((event) => event?.id)
      .map((event) => [event.id, event])
  );

  // Only keep championships where the athlete is effectively linked to a valid event.
  const groupedByEvent = matchedAthletes
    .filter((athlete) => {
      const eventId = (athlete?.eventId || '').toString().trim();
      if (!eventId) return false;
      return eventMap.has(eventId);
    })
    .reduce((acc, athlete) => {
      const eventId = (athlete?.eventId || '').toString().trim();
      if (!eventId) return acc;
      const event = eventMap.get(eventId);
      if (!event) return acc;

      const eventBrackets = (Array.isArray(brackets) ? brackets : []).filter(
        (b) => String(b?.eventId) === String(eventId)
      );

      const podiumPlace = resolvePodiumPlace(athlete, eventBrackets, matchedAthleteIds);
      const existing = acc.get(eventId);
      const modality = athlete?.isNoGi ? 'NO-GI' : 'GI';
      const category = (athlete?.categoria || '').toString().trim();
      const belt = (athlete?.faixa || '').toString().trim();
      const weight = (athlete?.peso || '').toString().trim();

      let athletePoints = Number(athlete?.pontos || 0);
      if (athletePoints === 0) {
        const histPoints = (athlete?.historico || []).reduce(
          (sum, h) => sum + (Number(h.points || h.pontos) || 0), 0
        );
        if (histPoints > 0) athletePoints = histPoints;
      }
      if (athletePoints === 0 && podiumPlace > 0) {
        if (podiumPlace === 1) athletePoints = 9;
        else if (podiumPlace === 2) athletePoints = 3;
        else if (podiumPlace === 3) athletePoints = 1;
      }

      const isCheckedIn = Boolean(athlete?.checkedIn);

      if (!existing) {
        acc.set(eventId, {
          id: athlete?.id || `${eventId}-${Math.random().toString(36).slice(2, 8)}`,
          eventId,
          eventName: event?.name || `Evento ${eventId}`,
          eventDate: event?.date || '',
          eventLocation: event?.location || '',
          categorySet: new Set(category ? [category] : []),
          beltSet: new Set(belt ? [belt] : []),
          weightSet: new Set(weight ? [weight] : []),
          modalitySet: new Set(modality ? [modality] : []),
          isAbsolute: athlete?.isAbsolute === true,
          points: athletePoints,
          podiumPlace: podiumPlace || 0,
          status: athlete?.status || 'PAYMENT_CONFIRMED',
          checkedIn: isCheckedIn,
          checkedInAt: athlete?.checkedInAt || ''
        });
        return acc;
      }

      if (category) existing.categorySet.add(category);
      if (belt) existing.beltSet.add(belt);
      if (weight) existing.weightSet.add(weight);
      if (modality) existing.modalitySet.add(modality);
      existing.isAbsolute = existing.isAbsolute || athlete?.isAbsolute === true;
      existing.points = Math.max(existing.points, athletePoints);
      if (isCheckedIn) {
        existing.checkedIn = true;
        existing.checkedInAt = athlete?.checkedInAt || existing.checkedInAt || '';
      }
      if (podiumPlace > 0) {
        existing.podiumPlace = existing.podiumPlace > 0
          ? Math.min(existing.podiumPlace, podiumPlace)
          : podiumPlace;
      }
      
      const incomingStatus = athlete?.status || 'PAYMENT_CONFIRMED';
      if (incomingStatus === 'PAYMENT_CONFIRMED' || incomingStatus === 'APPROVED' || incomingStatus === 'PAID' || incomingStatus === 'PAGO') {
        existing.status = 'PAYMENT_CONFIRMED';
      } else if (existing.status !== 'PAYMENT_CONFIRMED') {
        existing.status = incomingStatus;
      }

      return acc;
    }, new Map());

  const rows = [...groupedByEvent.values()]
    .map((row) => {
      const categories = [...row.categorySet];
      const belts = [...row.beltSet];
      const weights = [...row.weightSet];
      const modalities = [...row.modalitySet];
      const modality = modalities.length > 1 ? 'GI + NO-GI' : (modalities[0] || 'GI');
      return {
        id: row.id,
        eventId: row.eventId,
        eventName: row.eventName,
        eventDate: row.eventDate,
        eventLocation: row.eventLocation,
        category: categories.join(' / '),
        belt: belts.join(' / '),
        weight: weights.join(' / '),
        academy: academyName || 'Sem academia',
        modality,
        isAbsolute: row.isAbsolute,
        points: row.points,
        podiumPlace: row.podiumPlace,
        status: row.status,
        checkedIn: Boolean(row.checkedIn),
        checkedInAt: row.checkedInAt || ''
      };
    })
    .sort((a, b) => {
      const aTime = new Date(a.eventDate || 0).getTime();
      const bTime = new Date(b.eventDate || 0).getTime();
      return bTime - aTime;
    });

  const uniqueEventCount = new Set(rows.map((row) => row.eventId || row.eventName)).size;
  const podium1 = rows.filter((row) => row.podiumPlace === 1).length;
  const podium2 = rows.filter((row) => row.podiumPlace === 2).length;
  const podium3 = rows.filter((row) => row.podiumPlace === 3).length;

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    shareCode: shareCode || '',
    profile: {
      id: profile?.id || '',
      fullName: profileName,
      academyName: academyName || 'Sem academia',
      belt: profile?.belt || '',
      weight: profile?.weight || '',
      country: profile?.country || 'Brasil',
      city: profile?.city || '',
      age: profile?.age === '' || profile?.age === null || profile?.age === undefined
        ? ''
        : Number(profile.age),
      photoUrl: normalizeShareImageUrl(profile?.photoUrl || ''),
      coverUrl: normalizeShareImageUrl(profile?.coverUrl || '')
    },
    summary: {
      eventsFought: uniqueEventCount,
      podium1,
      podium2,
      podium3,
      totalPodiums: podium1 + podium2 + podium3
    },
    rows
  };
};

export const encodePublicProfileSnapshot = (snapshot) => {
  try {
    const raw = JSON.stringify(snapshot || {});
    return toBase64Url(raw);
  } catch {
    return '';
  }
};

export const decodePublicProfileSnapshot = (token) => {
  const raw = fromBase64Url(token);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};
