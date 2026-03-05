import React, { useMemo } from 'react';
import { Calendar, MapPin } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { useI18n } from '../hooks/useI18n';

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const formatDate = (value, locale, fallback) => {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return fallback;
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const Events = () => {
  const { events } = useStore();
  const { language, locale } = useI18n();
  const isEnglish = language === 'en-US';
  const copy = isEnglish
    ? {
        fallbackDate: 'Date TBD',
        eventFallback: 'Official event',
        locationFallback: 'Location TBD',
        autoUpdate: 'This event updates the ranking automatically.',
        accessEvent: 'Access event',
        openRegistration: 'Open registration',
        closedRegistration: 'Registration closed',
        registrationSection: 'Registrations',
        registrationTitle: 'Open registrations',
        noOpen: 'No event with open registration yet.',
        kicker: 'Events',
        title: 'Each event generates points and moves the ranking.',
        description:
          'Upcoming, past and planned events. All cards keep the same size to improve visualization.',
        agenda: 'Schedule',
        upcomingTitle: 'Upcoming events',
        upcomingStatus: 'Upcoming',
        noUpcoming: 'No future event registered.',
        history: 'History',
        pastTitle: 'Past events',
        pastStatus: 'Finished',
        noPast: 'Past events appear here automatically.',
        planning: 'Planning',
        noDateTitle: 'Events without date',
        noDateStatus: 'Planned'
      }
    : {
        fallbackDate: 'Data a confirmar',
        eventFallback: 'Evento oficial',
        locationFallback: 'Local a definir',
        autoUpdate: 'Este evento atualiza o ranking automaticamente.',
        accessEvent: 'Acessar evento',
        openRegistration: 'Inscrições abertas',
        closedRegistration: 'Inscrições fechadas',
        registrationSection: 'Inscrições',
        registrationTitle: 'Inscrições abertas',
        noOpen: 'Nenhum evento com inscrição aberta no momento.',
        kicker: 'Eventos',
        title: 'Cada evento gera pontos e movimenta o ranking.',
        description:
          'Eventos próximos, encerrados e em planejamento. Todos os cards seguem o mesmo padrão para facilitar a visualização.',
        agenda: 'Agenda',
        upcomingTitle: 'Próximos eventos',
        upcomingStatus: 'Em breve',
        noUpcoming: 'Nenhum evento futuro cadastrado.',
        history: 'Histórico',
        pastTitle: 'Eventos passados',
        pastStatus: 'Encerrado',
        noPast: 'Os eventos passados aparecem aqui automaticamente.',
        planning: 'Planejamento',
        noDateTitle: 'Eventos sem data definida',
        noDateStatus: 'Planejado'
      };

  const { openEvents, upcomingEvents, pastEvents, undatedEvents } = useMemo(() => {
    const now = new Date().getTime();
    const open = [];
    const upcoming = [];
    const past = [];
    const undated = [];

    events.forEach((event) => {
      const parsedDate = parseDate(event.date);
      const prepared = { ...event, parsedDate };

      if (event.registrationOpen) {
        open.push(prepared);
      }

      if (!parsedDate) {
        undated.push(prepared);
        return;
      }

      if (parsedDate.getTime() >= now) {
        upcoming.push(prepared);
      } else {
        past.push(prepared);
      }
    });

    const byDateAsc = (a, b) => {
      const aTime = a.parsedDate ? a.parsedDate.getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.parsedDate ? b.parsedDate.getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    };
    const byDateDesc = (a, b) => {
      const aTime = a.parsedDate ? a.parsedDate.getTime() : 0;
      const bTime = b.parsedDate ? b.parsedDate.getTime() : 0;
      return bTime - aTime;
    };

    open.sort(byDateAsc);
    upcoming.sort(byDateAsc);
    past.sort(byDateDesc);
    undated.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return {
      openEvents: open,
      upcomingEvents: upcoming,
      pastEvents: past,
      undatedEvents: undated
    };
  }, [events]);

  const renderEventCard = (event, statusLabel) => (
    <article className="public-event-card public-event-card--uniform" key={event.id}>
      <div className="public-event-card__poster">
        {event.posterUrl ? (
          <img src={event.posterUrl} alt={event.name || copy.eventFallback} loading="lazy" />
        ) : (
          <div className="public-event-card__poster-fallback">
            <span>{event.name || copy.eventFallback}</span>
          </div>
        )}
      </div>
      <div className="public-event-card__header">
        <div>
          <div className="event-name">{event.name || copy.eventFallback}</div>
          <div className="list-meta">
            <MapPin size={14} />
            {event.location || copy.locationFallback}
          </div>
        </div>
        <span className="tag">{statusLabel}</span>
      </div>
      <div className="public-event-card__date">
        <Calendar size={16} />
        {formatDate(event.parsedDate || event.date, locale, copy.fallbackDate)}
      </div>
      <div className="public-event-card__footer">
        <span>{copy.autoUpdate}</span>
        <a
          className={`btn ${event.registrationOpen ? 'btn-event' : 'btn-secondary btn-event--small'}`}
          href={event.internalRegistration ? `/eventos/${event.id}` : (event.registrationUrl || '#')}
          target={!event.internalRegistration && event.registrationUrl ? '_blank' : undefined}
          rel={!event.internalRegistration && event.registrationUrl ? 'noreferrer' : undefined}
          onClick={(clickEvent) => {
            if (!event.registrationOpen || (!event.internalRegistration && !event.registrationUrl)) {
              clickEvent.preventDefault();
            }
          }}
          aria-disabled={!event.registrationOpen || (!event.internalRegistration && !event.registrationUrl)}
        >
          {event.registrationOpen ? copy.accessEvent : copy.closedRegistration}
        </a>
      </div>
    </article>
  );

  return (
    <div className="public-page">
      <section className="public-header">
        <div>
          <span className="section-kicker">{copy.kicker}</span>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
      </section>

      <section className="public-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{copy.registrationSection}</span>
            <h2>{copy.registrationTitle}</h2>
          </div>
        </div>
        <div className="events-uniform-grid">
          {openEvents.length ? (
            openEvents.map((event) => renderEventCard(event, copy.openRegistration))
          ) : (
            <div className="empty-state">{copy.noOpen}</div>
          )}
        </div>
      </section>

      <section className="public-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{copy.agenda}</span>
            <h2>{copy.upcomingTitle}</h2>
          </div>
        </div>
        <div className="events-uniform-grid">
          {upcomingEvents.length ? (
            upcomingEvents.map((event) => renderEventCard(event, copy.upcomingStatus))
          ) : (
            <div className="empty-state">{copy.noUpcoming}</div>
          )}
        </div>
      </section>

      <section className="public-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{copy.history}</span>
            <h2>{copy.pastTitle}</h2>
          </div>
        </div>
        <div className="events-uniform-grid">
          {pastEvents.length ? (
            pastEvents.map((event) => renderEventCard(event, copy.pastStatus))
          ) : (
            <div className="empty-state">{copy.noPast}</div>
          )}
        </div>
      </section>

      {undatedEvents.length > 0 && (
        <section className="public-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">{copy.planning}</span>
              <h2>{copy.noDateTitle}</h2>
            </div>
          </div>
          <div className="events-uniform-grid">
            {undatedEvents.map((event) => renderEventCard(event, copy.noDateStatus))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Events;
