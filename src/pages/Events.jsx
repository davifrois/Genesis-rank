import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  ChevronDown,
  Clock3,
  LocateFixed,
  MapPin,
  Search,
  SlidersHorizontal,
  Ticket
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { useI18n } from '../hooks/useI18n';
import { countryCodeFromValue, countryLabelFromCode, flagFromCountryCode } from '../utils/countryFlags';
import { getStartOfDayTime, parseEventDateValue, resolveEventLifecycle } from '../utils/eventLifecycle';
import { formatBrlCurrency, resolveBatchFee } from '../utils/eventPricing';

const parseDate = (value) => {
  return parseEventDateValue(value);
};

const normalizeLookup = (value) => (
  (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
);

const formatDate = (value, locale, fallback) => {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return fallback;
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const startOfToday = () => {
  return getStartOfDayTime(new Date());
};

const resolveRemainingDays = (value, todayStart) => {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return null;
  const eventStart = new Date(date);
  eventStart.setHours(0, 0, 0, 0);
  return Math.round((eventStart.getTime() - todayStart) / 86_400_000);
};

const splitLocation = (value) => (
  (value || '')
    .toString()
    .split(/[,|-]/)
    .map((piece) => piece.trim())
    .filter(Boolean)
);

const resolveEventCity = (event) => {
  if (event?.city) return event.city;
  const parts = splitLocation(event?.location);
  return parts[0] || '';
};

const resolveEventState = (event) => {
  if (event?.state) return event.state;
  const parts = splitLocation(event?.location);
  return parts.length > 1 ? parts[1] : '';
};

const resolveEventCountry = (event) => (
  event?.country || event?.pais || (/(brasil|brazil|\bbr\b)/i.test(event?.location || '') ? 'Brasil' : 'Brasil')
);

const resolveEventLocation = (event, fallback) => {
  const city = resolveEventCity(event);
  const state = resolveEventState(event);
  const pieces = [city, state].filter(Boolean);
  if (pieces.length) return pieces.join(', ');
  return (event?.location || '').toString().trim() || fallback;
};

const resolveEventModes = (event) => {
  const text = normalizeLookup([
    event?.name,
    event?.mode,
    event?.modality,
    event?.modalidade,
    event?.type,
    event?.weightTableGiOptions,
    event?.weightTableNoGiOptions,
    event?.weightTableGiUrl,
    event?.weightTableNoGiUrl
  ].filter(Boolean).join(' '));

  const hasNoGi = text.includes('no-gi') || text.includes('nogi') || Boolean(event?.weightTableNoGiUrl || event?.weightTableNoGiOptions);
  const hasGi = text.includes(' gi') || text.startsWith('gi') || Boolean(event?.weightTableGiUrl || event?.weightTableGiOptions) || !hasNoGi;

  return {
    gi: hasGi || (!hasGi && !hasNoGi),
    noGi: hasNoGi || (!hasGi && !hasNoGi)
  };
};

const getActiveBatch = (event, eventDate) => {
  const batches = Array.isArray(event?.batches) ? event.batches : [];
  const explicitActive = batches.find((batch) => batch?.active);
  if (explicitActive) return explicitActive;

  const now = new Date();
  const dated = batches.find((batch) => {
    const start = parseDate(batch?.startDate);
    const end = parseDate(batch?.endDate);
    if (start && now < start) return false;
    if (end) {
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);
      if (now > endOfDay) return false;
    }
    return start || end;
  });
  if (dated) return dated;

  if (eventDate && batches.length) {
    return [...batches].sort((left, right) => Number(left?.price || 0) - Number(right?.price || 0))[0];
  }

  return null;
};

const resolveEventFee = (event) => {
  const fee = Number(event?.currentRegistrationPrice || event?.feeOver15 || event?.feeUnder15 || event?.feeCombo || 0);
  return Number.isFinite(fee) && fee > 0 ? fee : 0;
};

const buildProfileMatcher = (currentUser, memberProfiles) => {
  const userName = normalizeLookup(currentUser?.name || '');
  const username = normalizeLookup(currentUser?.username || '');
  const usernameLocal = username.includes('@') ? username.split('@')[0] : username;

  return memberProfiles.find((profile) => {
    const fullName = normalizeLookup(profile?.fullName || '');
    const email = normalizeLookup(profile?.email || '');
    const accountUsername = normalizeLookup(profile?.accountUsername || profile?.username || '');
    return (
      (username && (email === username || accountUsername === username))
      || (usernameLocal && email.split('@')[0] === usernameLocal)
      || (userName && fullName === userName)
    );
  }) || null;
};

const Events = () => {
  const {
    events = [],
    athletes = [],
    currentUser,
    memberProfiles = []
  } = useStore();
  const { locale, uiVariant, uiLanguage } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialView = searchParams.get('view');
  const [statusTab, setStatusTab] = useState(initialView === 'past' ? 'past' : 'upcoming');
  const [query, setQuery] = useState('');
  const [modeFilter, setModeFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 220);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (initialView === 'past') setStatusTab('past');
    if (initialView === 'upcoming') setStatusTab('upcoming');
  }, [initialView]);

  const copyByLanguage = {
    pt: {
      fallbackDate: 'Data a confirmar',
      locationFallback: 'Local a definir',
      eventFallback: 'Evento oficial',
      kicker: 'Eventos Genesis',
      title: 'Eventos',
      description: 'Encontre campeonatos, filtre por modalidade e acesse a inscrição em um clique.',
      upcoming: 'Próximos',
      past: 'Passados',
      personal: 'Meus eventos',
      searchPlaceholder: 'Buscar evento',
      allModes: 'Modalidade',
      gi: 'Gi',
      noGi: 'No-Gi',
      allCountries: 'País',
      dateFrom: 'Data inicial',
      dateTo: 'Data final',
      sortDate: 'Ordenar por data',
      sortDistance: 'Ordenar por distância',
      nearTitle: 'Eventos perto de você',
      moreTitle: 'Mais eventos',
      openRegistration: 'Inscrições abertas',
      closedRegistration: 'Inscrições fechadas',
      todayLabel: 'Hoje',
      daysLeftSingle: 'dia restante',
      daysLeftPlural: 'dias restantes',
      pastLabel: 'Finalizado',
      noEvents: 'Nenhum evento encontrado com estes filtros.',
      noNear: 'Nenhum evento próximo encontrado com os filtros atuais.',
      from: 'a partir de'
    },
    en: {
      fallbackDate: 'Date TBD',
      locationFallback: 'Location TBD',
      eventFallback: 'Official event',
      kicker: 'Genesis events',
      title: 'Events',
      description: 'Find tournaments, filter by game type and open registration in one click.',
      upcoming: 'Upcoming',
      past: 'Past',
      personal: 'Personal',
      searchPlaceholder: 'Search event',
      allModes: 'Type of game',
      gi: 'Gi',
      noGi: 'No-Gi',
      allCountries: 'Country',
      dateFrom: 'Start date',
      dateTo: 'End date',
      sortDate: 'Sort by date',
      sortDistance: 'Sort by distance',
      nearTitle: 'Events Near You',
      moreTitle: 'More Events',
      openRegistration: 'Open registrations',
      closedRegistration: 'Registration closed',
      todayLabel: 'Today',
      daysLeftSingle: 'day left',
      daysLeftPlural: 'days left',
      pastLabel: 'Finished',
      noEvents: 'No events found with these filters.',
      noNear: 'No nearby event matched the current filters.',
      from: 'from'
    }
  };
  const copy = copyByLanguage[uiVariant] || copyByLanguage.pt;

  const todayStart = useMemo(() => startOfToday(), []);
  const now = useMemo(() => new Date(), []);
  const currentProfile = useMemo(
    () => buildProfileMatcher(currentUser, memberProfiles),
    [currentUser, memberProfiles]
  );
  const profileLocation = useMemo(() => ({
    city: normalizeLookup(currentProfile?.city || ''),
    state: normalizeLookup(currentProfile?.state || ''),
    country: normalizeLookup(currentProfile?.country || 'Brasil')
  }), [currentProfile]);

  const personalEventIds = useMemo(() => {
    if (!currentUser && !currentProfile) return new Set();
    const names = [
      currentUser?.name,
      currentProfile?.fullName,
      [currentProfile?.firstName, currentProfile?.lastName].filter(Boolean).join(' ')
    ].map(normalizeLookup).filter(Boolean);
    const profileId = (currentProfile?.id || '').toString();

    return new Set(
      athletes
        .filter((athlete) => (
          (profileId && athlete?.memberProfileId === profileId)
          || names.includes(normalizeLookup(athlete?.nome || athlete?.name || ''))
        ))
        .map((athlete) => athlete?.eventId || athlete?.eventoId)
        .filter(Boolean)
    );
  }, [athletes, currentProfile, currentUser]);

  const eventRegistrationCounts = useMemo(() => {
    const counts = new Map();
    athletes.forEach((athlete) => {
      const eventId = athlete?.eventId || athlete?.eventoId;
      if (!eventId) return;
      const status = normalizeLookup(athlete?.status || athlete?.paymentStatus || athlete?.inscriptionStatus || '');
      if (status.includes('cancel') || status.includes('rejeit') || status.includes('reject')) return;
      counts.set(String(eventId), (counts.get(String(eventId)) || 0) + 1);
    });
    return counts;
  }, [athletes]);

  const isRegistrationAvailable = useCallback((event, parsedDate) => {
    const lifecycle = resolveEventLifecycle(event, now);
    if (lifecycle.isPast) return false;
    if (event?.registrationOpen === false) return false;

    const eventTime = parsedDate?.getTime();
    if (eventTime && eventTime < todayStart) return false;

    const closeDate = parseDate(event?.registrationCloseDate);
    if (closeDate) {
      closeDate.setHours(23, 59, 59, 999);
      if (now > closeDate) return false;
    }

    const maxAthletes = Number(event?.maxAthletes || 0);
    if (event?.closeOnCapacity === true && maxAthletes > 0) {
      const currentCount = eventRegistrationCounts.get(String(event?.id)) || 0;
      if (currentCount >= maxAthletes) return false;
    }

    return true;
  }, [eventRegistrationCounts, now, todayStart]);

  const normalizedEvents = useMemo(() => (
    events.map((event) => {
      const parsedDate = parseDate(event.date);
      const countryCode = countryCodeFromValue(resolveEventCountry(event), 'BR');
      const modes = resolveEventModes(event);
      const locationScore = [
        profileLocation.city && normalizeLookup(resolveEventCity(event)) === profileLocation.city ? 3 : 0,
        profileLocation.state && normalizeLookup(resolveEventState(event)) === profileLocation.state ? 2 : 0,
        profileLocation.country && normalizeLookup(resolveEventCountry(event)) === profileLocation.country ? 1 : 0
      ].reduce((total, value) => total + value, 0);
      const activeBatch = getActiveBatch(event, parsedDate);
      const batchPrice = resolveBatchFee(activeBatch, 'under15', activeBatch?.price || 0);
      const lifecycle = resolveEventLifecycle(event, now);

      return {
        ...event,
        parsedDate,
        countryCode,
        modes,
        locationScore,
        activeBatch,
        lifecycle,
        isPastEvent: lifecycle.isPast,
        displayPrice: Number.isFinite(batchPrice) && batchPrice > 0 ? batchPrice : resolveEventFee(event),
        registrationAvailable: isRegistrationAvailable(event, parsedDate)
      };
    })
  ), [events, isRegistrationAvailable, now, profileLocation]);

  const countryOptions = useMemo(() => {
    const codes = new Set(normalizedEvents.map((event) => event.countryCode).filter(Boolean));
    return [...codes].sort((left, right) => (
      countryLabelFromCode(left, uiLanguage).localeCompare(countryLabelFromCode(right, uiLanguage))
    ));
  }, [normalizedEvents, uiLanguage]);

  const filteredEvents = useMemo(() => {
    const fromDate = parseDate(dateFrom);
    const toDate = parseDate(dateTo);
    if (toDate) toDate.setHours(23, 59, 59, 999);

    return normalizedEvents
      .filter((event) => event.publicPublished !== false)
      .filter((event) => {
        if (statusTab === 'upcoming') return !event.isPastEvent;
        if (statusTab === 'past') return event.isPastEvent;
        return personalEventIds.has(event.id);
      })
      .filter((event) => {
        if (!query.trim()) return true;
        const haystack = normalizeLookup([event.name, event.location, resolveEventCountry(event)].join(' '));
        return haystack.includes(normalizeLookup(query));
      })
      .filter((event) => {
        if (modeFilter === 'all') return true;
        return modeFilter === 'gi' ? event.modes.gi : event.modes.noGi;
      })
      .filter((event) => countryFilter === 'all' || event.countryCode === countryFilter)
      .filter((event) => {
        if (!fromDate && !toDate) return true;
        if (!event.parsedDate) return false;
        if (fromDate && event.parsedDate < fromDate) return false;
        if (toDate && event.parsedDate > toDate) return false;
        return true;
      })
      .sort((left, right) => {
        if (sortBy === 'distance') {
          if (right.locationScore !== left.locationScore) return right.locationScore - left.locationScore;
        }
        return (left.parsedDate?.getTime() || Number.MAX_SAFE_INTEGER)
          - (right.parsedDate?.getTime() || Number.MAX_SAFE_INTEGER);
      });
  }, [
    countryFilter,
    dateFrom,
    dateTo,
    modeFilter,
    normalizedEvents,
    personalEventIds,
    query,
    sortBy,
    statusTab,
    todayStart
  ]);

  const nearEvents = useMemo(() => (
    filteredEvents
      .filter((event) => event.locationScore > 0)
      .slice(0, 4)
  ), [filteredEvents]);

  const moreEvents = useMemo(() => {
    const nearIds = new Set(nearEvents.map((event) => event.id));
    return filteredEvents.filter((event) => !nearIds.has(event.id));
  }, [filteredEvents, nearEvents]);

  const handleTabChange = (nextTab) => {
    setStatusTab(nextTab);
    setSearchParams(nextTab === 'past' ? { view: 'past' } : nextTab === 'upcoming' ? { view: 'upcoming' } : { view: 'personal' });
  };

  const renderSkeletons = (count = 4) => (
    <div className="events-elite-grid">
      {Array.from({ length: count }).map((_, index) => (
        <div className="event-card-elite event-card-elite--skeleton" key={`event-skeleton-${index}`}>
          <div className="event-skeleton-line event-skeleton-line--badge" />
          <div className="event-info-overlay">
            <div className="event-skeleton-line event-skeleton-line--title" />
            <div className="event-skeleton-line" />
            <div className="event-skeleton-line event-skeleton-line--short" />
          </div>
        </div>
      ))}
    </div>
  );

  const renderEventCard = (event, featured = false) => {
    const remainingDays = resolveRemainingDays(event.parsedDate, todayStart);
    const remainingLabel = event.isPastEvent
      ? copy.pastLabel
      : remainingDays === null
      ? copy.fallbackDate
      : remainingDays === 0
          ? copy.todayLabel
          : `${remainingDays} ${remainingDays === 1 ? copy.daysLeftSingle : copy.daysLeftPlural}`;
    const isExternal = event.internalRegistration === false && Boolean(event.registrationUrl);
    const CardTag = isExternal ? 'a' : Link;
    const linkProps = isExternal
      ? { href: event.registrationUrl, target: '_blank', rel: 'noreferrer' }
      : { to: `/eventos/${event.id}` };

    return (
      <CardTag
        key={event.id}
        style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', textDecoration: 'none', color: '#1a1a1a', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', cursor: 'pointer' }}
        onMouseOver={e => {e.currentTarget.style.transform = 'translateY(-4px)';}}
        onMouseOut={e => {e.currentTarget.style.transform = 'translateY(0)';}}
        {...linkProps}
      >
        <div style={{ position: 'relative', width: '100%', height: '140px', background: '#f4f4f5' }}>
          <img src={event.posterUrl || '/header-bg-championship.jpg'} alt={event.name} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#18181b', margin: '0 0 12px 0', lineHeight: 1.4, textTransform: 'uppercase' }}>
            {event.name || copy.eventFallback}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#71717a', marginBottom: '16px' }}>
            <span aria-hidden="true" style={{ fontSize: '1rem' }}>{flagFromCountryCode(event.countryCode)}</span>
            <span style={{ fontWeight: 500 }}>{resolveEventLocation(event, copy.locationFallback)}</span>
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#71717a', fontWeight: 500 }}>
            <span>{formatDate(event.parsedDate || event.date, locale, copy.fallbackDate)}</span>
            <span>{remainingLabel}</span>
          </div>
        </div>
      </CardTag>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', color: '#e4e4e7', fontFamily: '"Inter", sans-serif' }}>
      {/* Top Navigation Tabs & Filters */}
      <div style={{ background: 'transparent', padding: '40px 20px', borderBottom: 'none' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Pill Navigation */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '40px', width: '100%', maxWidth: '600px', padding: '4px' }}>
              {[
                { id: 'upcoming', label: copy.upcoming },
                { id: 'past', label: copy.past },
                { id: 'personal', label: copy.personal }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  style={{ flex: 1, background: statusTab === tab.id ? '#fff' : 'transparent', color: statusTab === tab.id ? '#18181b' : '#e4e4e7', border: 'none', padding: '12px 0', borderRadius: '40px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Link to="/admin/events/new" style={{ background: '#0ea5e9', color: '#fff', textDecoration: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>Criar evento</Link>
            <button style={{ background: '#18181b', color: '#0ea5e9', border: '1px solid #0ea5e9', padding: '8px 16px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> Academy finder</button>
            <button style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>Ver mapa</button>
          </div>

          {/* Search Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Procurar evento..." style={{ gridColumn: 'span 4', background: '#fff', border: 'none', padding: '12px 16px', borderRadius: '4px', fontSize: '0.85rem', color: '#1a1a1a', outline: 'none' }} />
            <select value={modeFilter} onChange={e => setModeFilter(e.target.value)} style={{ gridColumn: 'span 2', background: '#fff', border: 'none', padding: '12px 16px', borderRadius: '4px', fontSize: '0.85rem', color: '#71717a', outline: 'none', appearance: 'none' }}>
              <option value="all">Select category</option>
              <option value="gi">{copy.gi}</option>
              <option value="nogi">{copy.noGi}</option>
            </select>
            
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="Start date" style={{ gridColumn: 'span 1', background: '#fff', border: 'none', padding: '12px 16px', borderRadius: '4px', fontSize: '0.85rem', color: '#71717a', outline: 'none' }} />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="End date" style={{ gridColumn: 'span 1', background: '#fff', border: 'none', padding: '12px 16px', borderRadius: '4px', fontSize: '0.85rem', color: '#71717a', outline: 'none' }} />
            <select style={{ gridColumn: 'span 2', background: '#fff', border: 'none', padding: '12px 16px', borderRadius: '4px', fontSize: '0.85rem', color: '#71717a', outline: 'none', appearance: 'none' }}><option>Type of game</option></select>
            <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)} style={{ gridColumn: 'span 2', background: '#fff', border: 'none', padding: '12px 16px', borderRadius: '4px', fontSize: '0.85rem', color: '#71717a', outline: 'none', appearance: 'none' }}>
              <option value="all">Selecione paises</option>
              {countryOptions.map(code => <option value={code} key={code}>{countryLabelFromCode(code, uiLanguage)}</option>)}
            </select>

            <div style={{ gridColumn: 'span 4' }}></div>
            <select style={{ gridColumn: 'span 2', background: '#fff', border: 'none', padding: '12px 16px', borderRadius: '4px', fontSize: '0.85rem', color: '#71717a', outline: 'none', appearance: 'none' }}><option>Select season</option></select>
          </div>

        </div>
      </div>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, textTransform: 'uppercase', margin: 0, color: '#fff' }}>MAIS EVENTOS</h2>
          <select style={{ background: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', fontSize: '0.8rem', color: '#1a1a1a', outline: 'none', fontWeight: 500, appearance: 'none' }}>
            <option>Ordenar por dist...</option>
          </select>
        </div>

        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            {[1,2,3,4,5,6,7,8].map(i => <div key={i} style={{ height: '240px', background: '#27272a', borderRadius: '8px' }} />)}
          </div>
        ) : (
          filteredEvents.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              {filteredEvents.map(event => renderEventCard(event))}
            </div>
          ) : (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#a1a1aa', fontSize: '1rem' }}>{copy.noEvents}</div>
          )
        )}
      </div>

    </div>
  );
};

export default Events;
