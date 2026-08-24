import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import EventsMapView from '../components/EventsMapView';
import './Events.css';
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
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'

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
    if (maxAthletes > 0) {
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
      ? (copy.pastLabel || 'Evento finalizado')
      : remainingDays === null
      ? copy.fallbackDate
      : remainingDays === 0
          ? (copy.todayLabel || 'Hoje')
          : `${remainingDays} ${remainingDays === 1 ? (copy.daysLeftSingle || 'dia restante') : (copy.daysLeftPlural || 'dias restantes')}`;
    const isExternal = event.internalRegistration === false && Boolean(event.registrationUrl);
    const CardTag = isExternal ? 'a' : Link;
    const linkProps = isExternal
      ? { href: event.registrationUrl, target: '_blank', rel: 'noreferrer' }
      : { to: `/eventos/${event.id}` };

    return (
      <CardTag
        key={event.id}
        className="sc-event-card-item"
        {...linkProps}
      >
        <div className="sc-event-card-poster">
          <img 
            src={event.posterUrl || '/header-bg-championship.jpg'} 
            alt={event.name} 
            style={{ 
              objectPosition: `center ${event.posterPositionY ?? 50}%` 
            }} 
          />
        </div>
        <div className="sc-event-card-body">
          <h3 className="sc-event-card-title">
            {event.name || copy.eventFallback}
          </h3>
          <div className="sc-event-card-location">
            <span aria-hidden="true">{flagFromCountryCode(event.countryCode)}</span>
            <span>{resolveEventLocation(event, copy.locationFallback)}</span>
          </div>
          <div className="sc-event-card-footer">
            <span className="sc-event-card-date">
              {formatDate(event.parsedDate || event.date, locale, copy.fallbackDate)}
            </span>
            <span className="sc-event-card-countdown">
              {remainingLabel}
            </span>
          </div>
        </div>
      </CardTag>
    );
  };

  return (
    <div className="sc-events-page">

      {/* Top Navigation Tabs & Filters — Smoothcomp Mobile Standard (Image 3) */}
      <div className="sc-events-header-wrap">
        <img
          src="/eventos-banner.jpeg"
          alt=""
          aria-hidden="true"
          className="sc-events-header-bg"
        />

        <div className="sc-events-header-inner">
          {/* 1. Pill Navigation (Próximos eventos / Eventos passados / Meus eventos) */}
          <div className="sc-events-pills">
            {[
              { id: 'upcoming', label: copy.upcoming || 'Próximos eventos' },
              { id: 'past', label: copy.past || 'Eventos passados' },
              { id: 'personal', label: copy.personal || 'Meus eventos' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`sc-events-pill-btn ${statusTab === tab.id ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 2. Top Action Buttons (Image 3) */}
          <div className="sc-events-action-bar">
            <Link to="/admin/events/new" className="sc-events-btn-cyan">
              Criar evento
            </Link>
            <button className="sc-events-btn-outline">
              <MapPin size={14} /> Buscador de academia
            </button>
            <button
              className="sc-events-btn-cyan"
              onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
            >
              <MapPin size={14} />
              {viewMode === 'map' ? 'Ver lista' : 'Ver mapa'}
            </button>
          </div>

          {/* 3. Search & Filter Inputs (Image 3) */}
          <div className="sc-events-filters-form">
            <input 
              type="text" 
              value={query} 
              onChange={e => setQuery(e.target.value)} 
              placeholder="Procurar evento..." 
              className="sc-events-input sc-events-input-search" 
            />
            
            <select 
              value={modeFilter} 
              onChange={e => setModeFilter(e.target.value)} 
              className="sc-events-select sc-events-select-cat"
            >
              <option value="all">Type of game</option>
              <option value="gi">{copy.gi || 'Com Kimono (Gi)'}</option>
              <option value="nogi">{copy.noGi || 'Sem Kimono (No-Gi)'}</option>
            </select>
            
            <div className="sc-events-date-row">
              <input 
                type="date" 
                value={dateFrom} 
                onChange={e => setDateFrom(e.target.value)} 
                placeholder="Start date" 
                className="sc-events-input sc-events-date-from" 
              />
              <input 
                type="date" 
                value={dateTo} 
                onChange={e => setDateTo(e.target.value)} 
                placeholder="End date" 
                className="sc-events-input sc-events-date-to" 
              />
            </div>

            <select 
              value={countryFilter} 
              onChange={e => setCountryFilter(e.target.value)} 
              className="sc-events-select sc-events-select-country"
            >
              <option value="all">Countries</option>
              {countryOptions.map(code => (
                <option value={code} key={code}>
                  {countryLabelFromCode(code, uiLanguage)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Events Content */}
      <div className="sc-events-main-content">
        {/* Map View */}
        {viewMode === 'map' && (
          <EventsMapView events={filteredEvents} copy={copy} />
        )}

        {/* List View — 2-Column Grid on Mobile (Image 4) */}
        {viewMode === 'list' && (
          <>
            <div className="sc-events-title-bar">
              <h2 className="sc-events-section-title">
                EVENTOS PRÓXIMOS A MIM
              </h2>
              <select className="sc-events-sort-select">
                <option>Ordenar por data</option>
                <option>Ordenar por distância</option>
              </select>
            </div>

            {isLoading ? (
              <div className="sc-events-grid">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} style={{ aspectRatio: '4/5', background: '#1e222d', borderRadius: '8px' }} />
                ))}
              </div>
            ) : (
              filteredEvents.length > 0 ? (
                <div className="sc-events-grid">
                  {filteredEvents.map(event => renderEventCard(event))}
                </div>
              ) : (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: '#a1a1aa', fontSize: '1rem' }}>
                  {copy.noEvents}
                </div>
              )
            )}
          </>
        )}
      </div>

    </div>
  );
};

export default Events;
