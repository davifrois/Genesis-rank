import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { useI18n } from '../hooks/useI18n';
import { formatBrlCurrency, normalizeEventFees } from '../utils/eventPricing';

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
    month: 'long',
    year: 'numeric'
  });
};

const encodeLocation = (value) => encodeURIComponent((value || '').toString().trim());

const EventDetails = () => {
  const { eventId } = useParams();
  const { events } = useStore();
  const { locale, uiVariant } = useI18n();
  const copyByLanguage = {
    pt: {
      fallbackDate: 'Data a confirmar',
      fallbackEvent: 'Evento oficial',
      fallbackLocation: 'Local a definir',
      backEvents: 'Voltar para eventos',
      location: 'Localizacao',
      mapTitle: 'Mapa do local',
      openGoogleMaps: 'Abrir no Google Maps',
      openWaze: 'Abrir no Waze',
      values: 'Valores',
      valuesLineA: 'Ate 15 anos (GI ou NO-GI)',
      valuesLineB: 'Acima de 15 anos (GI ou NO-GI)',
      valuesLineC: 'Combo GI + NO-GI',
      valuesLineD: 'Absoluto GI / NO-GI',
      updatedAt: 'Atualizado em',
      options: {
        academy: 'Academia - GI',
        category: 'Categoria - GI',
        academyNoGi: 'Academia - NO-GI',
        categoryNoGi: 'Categoria - NO-GI',
        table: 'Tabela de peso - GI',
        tableNoGi: 'Tabela de peso NO-GI',
        circular: 'Circular do evento'
      },
      registrationClosed: 'Inscricoes encerradas',
      registrationExternal: 'Este evento utiliza inscricao em link externo.',
      accessExternal: 'Abrir inscricao externa',
      scheduleTitle: 'Datas e prazos',
      scheduleItems: [
        'Check-in de atletas e validacao de documentos.',
        'Check-in por academias com representante.',
        'Divulgacao do cronograma oficial.',
        'Divulgacao das chaves e chamada final.'
      ],
      importantTitle: 'Informacoes importantes',
      importantText:
        'Todos os atletas devem apresentar documentos validos e seguir o regulamento do evento.',
      openForm: 'Preencher inscricao',
      regulations: 'Regulamento'
    },
    en: {
      fallbackDate: 'Date TBD',
      fallbackEvent: 'Official event',
      fallbackLocation: 'Location TBD',
      backEvents: 'Back to events',
      location: 'Location',
      mapTitle: 'Venue map',
      openGoogleMaps: 'Open in Google Maps',
      openWaze: 'Open in Waze',
      values: 'Fees',
      valuesLineA: 'Up to 15 years (GI / NO-GI)',
      valuesLineB: 'Over 15 years (GI / NO-GI)',
      valuesLineC: 'Combo GI + NO-GI',
      valuesLineD: 'Absolute GI / NO-GI',
      updatedAt: 'Updated at',
      options: {
        academy: 'Academy - GI',
        category: 'Category - GI',
        academyNoGi: 'Academy - NO-GI',
        categoryNoGi: 'Category - NO-GI',
        table: 'Weight table - GI',
        tableNoGi: 'Weight table NO-GI',
        circular: 'Event circular'
      },
      registrationClosed: 'Registration closed',
      registrationExternal: 'This event uses external registration.',
      accessExternal: 'Open external registration',
      scheduleTitle: 'Dates and deadlines',
      scheduleItems: [
        'Athlete check-in and document validation.',
        'Academy check-in by team representative.',
        'Official schedule release.',
        'Bracket release and final call.'
      ],
      importantTitle: 'Important information',
      importantText:
        'All athletes must present valid documents and follow event regulations.',
      openForm: 'Fill registration form',
      regulations: 'Regulations'
    },
    es: {
      fallbackDate: 'Fecha por confirmar',
      fallbackEvent: 'Evento oficial',
      fallbackLocation: 'Lugar por definir',
      backEvents: 'Volver a eventos',
      location: 'Ubicacion',
      mapTitle: 'Mapa del lugar',
      openGoogleMaps: 'Abrir en Google Maps',
      openWaze: 'Abrir en Waze',
      values: 'Valores',
      valuesLineA: 'Hasta 15 anos (GI o NO-GI)',
      valuesLineB: 'Mayores de 15 anos (GI o NO-GI)',
      valuesLineC: 'Combo GI + NO-GI',
      valuesLineD: 'Absoluto GI / NO-GI',
      updatedAt: 'Actualizado en',
      options: {
        academy: 'Academia - GI',
        category: 'Categoria - GI',
        academyNoGi: 'Academia - NO-GI',
        categoryNoGi: 'Categoria - NO-GI',
        table: 'Tabla de peso - GI',
        tableNoGi: 'Tabla de peso NO-GI',
        circular: 'Circular del evento'
      },
      registrationClosed: 'Inscripciones cerradas',
      registrationExternal: 'Este evento usa inscripcion externa.',
      accessExternal: 'Abrir inscripcion externa',
      scheduleTitle: 'Fechas y plazos',
      scheduleItems: [
        'Check-in de atletas y validacion de documentos.',
        'Check-in de academias con responsable.',
        'Publicacion del cronograma oficial.',
        'Publicacion de llaves y llamada final.'
      ],
      importantTitle: 'Informacion importante',
      importantText:
        'Todos los atletas deben presentar documentos validos y cumplir el reglamento del evento.',
      openForm: 'Completar inscripcion',
      regulations: 'Reglamento'
    },
    fr: {
      fallbackDate: 'Date a confirmer',
      fallbackEvent: 'Evenement officiel',
      fallbackLocation: 'Lieu a definir',
      backEvents: 'Retour aux evenements',
      location: 'Lieu',
      mapTitle: 'Carte du lieu',
      openGoogleMaps: 'Ouvrir dans Google Maps',
      openWaze: 'Ouvrir dans Waze',
      values: 'Tarifs',
      valuesLineA: 'Jusqu a 15 ans (GI / NO-GI)',
      valuesLineB: 'Plus de 15 ans (GI / NO-GI)',
      valuesLineC: 'Combo GI + NO-GI',
      valuesLineD: 'Absolu GI / NO-GI',
      updatedAt: 'Mis a jour le',
      options: {
        academy: 'Academie - GI',
        category: 'Categorie - GI',
        academyNoGi: 'Academie - NO-GI',
        categoryNoGi: 'Categorie - NO-GI',
        table: 'Table de poids - GI',
        tableNoGi: 'Table de poids NO-GI',
        circular: 'Circulaire de l evenement'
      },
      registrationClosed: 'Inscriptions fermees',
      registrationExternal: 'Cet evenement utilise une inscription externe.',
      accessExternal: 'Ouvrir l inscription externe',
      scheduleTitle: 'Dates et delais',
      scheduleItems: [
        'Check-in des athletes et validation des documents.',
        'Check-in des academies avec responsable.',
        'Publication du programme officiel.',
        'Publication des tableaux et appel final.'
      ],
      importantTitle: 'Informations importantes',
      importantText:
        'Tous les athletes doivent presenter des documents valides et respecter le reglement de l evenement.',
      openForm: 'Remplir l inscription',
      regulations: 'Reglement'
    }
  };
  const copy = copyByLanguage[uiVariant] || copyByLanguage.pt;

  const event = useMemo(() => events.find((item) => item.id === eventId), [events, eventId]);

  const optionLinks = useMemo(() => (
    event
      ? [
          { label: copy.options.academy, href: `/eventos/${event.id}/relatorios?view=academy&mode=GI`, isExternal: false },
          { label: copy.options.category, href: `/eventos/${event.id}/relatorios?view=category&mode=GI`, isExternal: false },
          { label: copy.options.academyNoGi, href: `/eventos/${event.id}/relatorios?view=academy&mode=NO-GI`, isExternal: false },
          { label: copy.options.categoryNoGi, href: `/eventos/${event.id}/relatorios?view=category&mode=NO-GI`, isExternal: false },
          {
            label: copy.options.table,
            href: event.weightTableGiUrl || '/regulamento#tabela-peso-juvenil-adulto',
            isExternal: Boolean(event.weightTableGiUrl)
          },
          {
            label: copy.options.tableNoGi,
            href: event.weightTableNoGiUrl || '/regulamento#tabela-peso-infantil',
            isExternal: Boolean(event.weightTableNoGiUrl)
          },
          {
            label: copy.options.circular,
            href: event.circularUrl || '/regulamento',
            isExternal: Boolean(event.circularUrl)
          }
        ]
      : []
  ), [event, copy.options]);

  const eventFees = useMemo(() => normalizeEventFees(event || {}), [event]);
  const eventLocation = (event?.location || '').toString().trim();
  const hasEventLocation = Boolean(eventLocation);
  const locationQuery = hasEventLocation ? encodeLocation(eventLocation) : '';
  const googleMapsUrl = hasEventLocation
    ? `https://www.google.com/maps/search/?api=1&query=${locationQuery}`
    : '';
  const wazeUrl = hasEventLocation
    ? `https://waze.com/ul?q=${locationQuery}&navigate=yes`
    : '';
  const googleEmbedUrl = hasEventLocation
    ? `https://www.google.com/maps?q=${locationQuery}&output=embed`
    : '';

  if (!event) {
    return (
      <div className="public-page">
        <section className="public-header">
          <h1>{copy.fallbackEvent}</h1>
          <p>{copy.fallbackDate}</p>
          <Link className="text-link" to="/eventos">{copy.backEvents}</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="public-page">
      <section className="event-details-layout">
        <section className="event-details">
          <div className="event-details__poster">
            {event.posterUrl ? (
              <img src={event.posterUrl} alt={event.name || copy.fallbackEvent} />
            ) : (
              <div className="event-details__poster-fallback">{event.name || copy.fallbackEvent}</div>
            )}
          </div>

          <div className="event-details__content">
            <Link className="text-link" to="/eventos">{copy.backEvents}</Link>
            <h1>{event.name || copy.fallbackEvent}</h1>
            <p>{formatDate(event.date, locale, copy.fallbackDate)}</p>

            <div className="event-details__columns">
              <div>
                <h3>{copy.location}</h3>
                <p>{event.location || copy.fallbackLocation}</p>
              </div>
              <div>
                <h3>{copy.values}</h3>
                <p>{copy.valuesLineA}: {formatBrlCurrency(eventFees.under15, locale)}</p>
                <p>{copy.valuesLineB}: {formatBrlCurrency(eventFees.over15, locale)}</p>
                <p>{copy.valuesLineC}: {formatBrlCurrency(eventFees.combo, locale)}</p>
                <p>{copy.valuesLineD}: {formatBrlCurrency(eventFees.absolute, locale)}</p>
              </div>
              <div>
                <h3>{copy.updatedAt}</h3>
                <p>{new Date().toLocaleString(locale)}</p>
                <div className="event-details__options">
                  {optionLinks.map((option) => (
                    option.isExternal ? (
                      <a
                        key={option.label}
                        href={option.href}
                        className="btn btn-secondary"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {option.label}
                      </a>
                    ) : (
                      <Link key={option.label} to={option.href} className="btn btn-secondary">{option.label}</Link>
                    )
                  ))}
                </div>
              </div>
            </div>

            <div className="event-details__actions">
              {event.internalRegistration ? (
                <Link
                  className={`btn ${event.registrationOpen ? 'btn-event' : 'btn-secondary btn-event--small'}`}
                  to={event.registrationOpen ? `/eventos/${event.id}/inscricao` : '#'}
                  onClick={(clickEvent) => {
                    if (!event.registrationOpen) {
                      clickEvent.preventDefault();
                    }
                  }}
                >
                  {event.registrationOpen ? copy.openForm : copy.registrationClosed}
                </Link>
              ) : (
                <a className="btn btn-event" href={event.registrationUrl || '#'} target="_blank" rel="noreferrer">
                  {copy.accessExternal}
                </a>
              )}
              {!event.internalRegistration && (
                <p className="event-details__hint">{copy.registrationExternal}</p>
              )}
            </div>
          </div>
        </section>

        {hasEventLocation && (
          <aside className="event-details__map-side">
            <section className="event-details__map-card">
              <div className="event-details__map-header">
                <h3>{copy.mapTitle}</h3>
                <div className="event-details__map-actions">
                  <a
                    className="btn btn-secondary btn-event--small"
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {copy.openGoogleMaps}
                  </a>
                  <a
                    className="btn btn-secondary btn-event--small"
                    href={wazeUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {copy.openWaze}
                  </a>
                </div>
              </div>
              <div className="event-details__map-frame-wrap">
                <iframe
                  title={`${copy.mapTitle} - ${event.name || copy.fallbackEvent}`}
                  src={googleEmbedUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            </section>
          </aside>
        )}
      </section>

      <section className="public-section">
        <div className="content-card">
          <h3>{copy.scheduleTitle}</h3>
          <ul className="text-list">
            {copy.scheduleItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="public-section">
        <div className="content-card">
          <h3>{copy.importantTitle}</h3>
          <p>{copy.importantText}</p>
          <div className="status-pill">
            <ShieldCheck size={14} />
            <span>{copy.regulations}</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EventDetails;
