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
    const athleteAcademy = normalizeLookup(athlete?.academia || '');
    if (!athleteAcademy || athleteAcademy === normalizeLookup('Sem academia')) return true;
    return (
      athleteAcademy === targetAcademy
      || athleteAcademy.includes(targetAcademy)
      || targetAcademy.includes(athleteAcademy)
    );
  });
};

const resolvePodiumPlace = (athlete) => {
  const history = Array.isArray(athlete?.historico) ? athlete.historico : [];
  const podiumPositions = history
    .filter((item) => item?.type === 'podium' && [1, 2, 3].includes(Number(item?.position)))
    .map((item) => Number(item.position));
  if (!podiumPositions.length) return 0;
  return Math.min(...podiumPositions);
};

export const buildPublicProfileSnapshot = ({
  profile = {},
  shareCode = '',
  athletes = [],
  events = []
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

      const podiumPlace = resolvePodiumPlace(athlete);
      const existing = acc.get(eventId);
      const modality = athlete?.isNoGi ? 'NO-GI' : 'GI';
      const category = (athlete?.categoria || '').toString().trim();
      const belt = (athlete?.faixa || '').toString().trim();
      const weight = (athlete?.peso || '').toString().trim();

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
          points: Number(athlete?.pontos || 0),
          podiumPlace: podiumPlace || 0,
          status: athlete?.status || 'PAYMENT_CONFIRMED'
        });
        return acc;
      }

      if (category) existing.categorySet.add(category);
      if (belt) existing.beltSet.add(belt);
      if (weight) existing.weightSet.add(weight);
      if (modality) existing.modalitySet.add(modality);
      existing.isAbsolute = existing.isAbsolute || athlete?.isAbsolute === true;
      existing.points = Math.max(existing.points, Number(athlete?.pontos || 0));
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
        status: row.status
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
