import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
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

const encodeLocation = (value) => encodeURIComponent((value || '').toString().trim());

const Events = () => {
  const { events } = useStore();
  const { locale, uiVariant } = useI18n();
  const copyByLanguage = {
    pt: {
      fallbackDate: 'Data a confirmar',
      eventFallback: 'Evento oficial',
      locationFallback: 'Local a definir',
      autoUpdate: 'Este evento atualiza o ranking automaticamente.',
      openMap: 'Abrir no mapa',
      accessEvent: 'Acessar evento',
      openRegistration: 'Inscricoes abertas',
      closedRegistration: 'Inscricoes fechadas',
      registrationSection: 'Inscricoes',
      registrationTitle: 'Inscricoes abertas',
      noOpen: 'Nenhum evento com inscricao aberta no momento.',
      kicker: 'Eventos',
      title: 'Cada evento gera pontos e movimenta o ranking.',
      description:
        'Eventos proximos, encerrados e em planejamento. Todos os cards seguem o mesmo padrao para facilitar a visualizacao.',
      agenda: 'Agenda',
      upcomingTitle: 'Proximos eventos',
      upcomingStatus: 'Em breve',
      noUpcoming: 'Nenhum evento futuro cadastrado.',
      history: 'Historico',
      pastTitle: 'Eventos passados e inscrições encerradas',
      pastStatus: 'Passado / Encerrado',
      noPast: 'Os eventos passados aparecem aqui automaticamente.',
      planning: 'Planejamento',
      noDateTitle: 'Eventos sem data definida',
      noDateStatus: 'Planejado'
    },
    en: {
      fallbackDate: 'Date TBD',
      eventFallback: 'Official event',
      locationFallback: 'Location TBD',
      autoUpdate: 'This event updates the ranking automatically.',
      openMap: 'Open map',
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
      pastTitle: 'Past events and closed registrations',
      pastStatus: 'Past / Closed',
      noPast: 'Past events appear here automatically.',
      planning: 'Planning',
      noDateTitle: 'Events without date',
      noDateStatus: 'Planned'
    },
    es: {
      fallbackDate: 'Fecha por confirmar',
      eventFallback: 'Evento oficial',
      locationFallback: 'Lugar por definir',
      autoUpdate: 'Este evento actualiza el ranking automaticamente.',
      openMap: 'Abrir en mapa',
      accessEvent: 'Acceder al evento',
      openRegistration: 'Inscripciones abiertas',
      closedRegistration: 'Inscripciones cerradas',
      registrationSection: 'Inscripciones',
      registrationTitle: 'Inscripciones abiertas',
      noOpen: 'No hay eventos con inscripcion abierta por ahora.',
      kicker: 'Eventos',
      title: 'Cada evento suma puntos y mueve el ranking.',
      description:
        'Eventos proximos, finalizados y planificados. Todas las tarjetas mantienen el mismo tamano para mejorar la visualizacion.',
      agenda: 'Agenda',
      upcomingTitle: 'Proximos eventos',
      upcomingStatus: 'Proximo',
      noUpcoming: 'No hay eventos futuros registrados.',
      history: 'Historial',
      pastTitle: 'Eventos finalizados e inscripciones cerradas',
      pastStatus: 'Finalizado / Cerrado',
      noPast: 'Los eventos finalizados apareceran aqui automaticamente.',
      planning: 'Planificacion',
      noDateTitle: 'Eventos sin fecha definida',
      noDateStatus: 'Planificado'
    },
    fr: {
      fallbackDate: 'Date a confirmer',
      eventFallback: 'Evenement officiel',
      locationFallback: 'Lieu a definir',
      autoUpdate: 'Cet evenement met a jour le classement automatiquement.',
      openMap: 'Ouvrir sur la carte',
      accessEvent: 'Aceder a l evenement',
      openRegistration: 'Inscriptions ouvertes',
      closedRegistration: 'Inscriptions fermees',
      registrationSection: 'Inscriptions',
      registrationTitle: 'Inscriptions ouvertes',
      noOpen: 'Aucun evenement avec inscription ouverte pour le moment.',
      kicker: 'Evenements',
      title: 'Chaque evenement attribue des points et fait evoluer le classement.',
      description:
        'Evenements a venir, termines et planifies. Toutes les cartes gardent la meme taille pour une meilleure lisibilite.',
      agenda: 'Agenda',
      upcomingTitle: 'Prochains evenements',
      upcomingStatus: 'A venir',
      noUpcoming: 'Aucun evenement futur enregistre.',
      history: 'Historique',
      pastTitle: 'Evenements passes et inscriptions fermees',
      pastStatus: 'Passe / Ferme',
      noPast: 'Les evenements passes apparaissent ici automatiquement.',
      planning: 'Planification',
      noDateTitle: 'Evenements sans date',
      noDateStatus: 'Planifie'
    }
  };
  const copy = copyByLanguage[uiVariant] || copyByLanguage.pt;

  const { openEvents, upcomingEvents, pastEvents, undatedEvents } = useMemo(() => {
    const now = new Date().getTime();
    const open = [];
    const upcoming = [];
    const past = [];
    const undated = [];

    events.forEach((event) => {
      const parsedDate = parseDate(event.date);
      const prepared = { ...event, parsedDate };

      const isRegistrationOpen = event.registrationOpen !== false;
      if (isRegistrationOpen) {
        open.push(prepared);
      }

      if (!isRegistrationOpen) {
        past.push(prepared);
        return;
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

  const renderEventCard = (event, statusLabel) => {
    const locationText = (event.location || '').toString().trim();
    const hasLocation = Boolean(locationText);
    const mapUrl = hasLocation
      ? `https://www.google.com/maps/search/?api=1&query=${encodeLocation(locationText)}`
      : '';

    return (
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
              {locationText || copy.locationFallback}
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
          <div className="public-event-card__actions">
            {hasLocation && (
              <a
                className="btn btn-secondary btn-event--small"
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
              >
                {copy.openMap}
              </a>
            )}
            {event.internalRegistration ? (
              <Link
                className={`btn ${event.registrationOpen ? 'btn-event' : 'btn-secondary btn-event--small'}`}
                to={`/eventos/${event.id}`}
                onClick={(clickEvent) => {
                  if (!event.registrationOpen) {
                    clickEvent.preventDefault();
                  }
                }}
                aria-disabled={!event.registrationOpen}
              >
                {event.registrationOpen ? copy.accessEvent : copy.closedRegistration}
              </Link>
            ) : (
              <a
                className={`btn ${event.registrationOpen ? 'btn-event' : 'btn-secondary btn-event--small'}`}
                href={event.registrationUrl || '#'}
                target={event.registrationUrl ? '_blank' : undefined}
                rel={event.registrationUrl ? 'noreferrer' : undefined}
                onClick={(clickEvent) => {
                  if (!event.registrationOpen || !event.registrationUrl) {
                    clickEvent.preventDefault();
                  }
                }}
                aria-disabled={!event.registrationOpen || !event.registrationUrl}
              >
                {event.registrationOpen ? copy.accessEvent : copy.closedRegistration}
              </a>
            )}
          </div>
        </div>
      </article>
    );
  };

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
