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

const EventDetails = () => {
  const { eventId } = useParams();
  const { events } = useStore();
  const { language, locale } = useI18n();
  const isEnglish = language === 'en-US';

  const copy = isEnglish
    ? {
        fallbackDate: 'Date TBD',
        fallbackEvent: 'Official event',
        fallbackLocation: 'Location TBD',
        backEvents: 'Back to events',
        location: 'Location',
        values: 'Fees',
        valuesLineA: 'Up to 15 years (GI / NO-GI)',
        valuesLineB: 'Over 15 years (GI / NO-GI)',
        valuesLineC: 'Combo GI + NO-GI',
        valuesLineD: 'Absolute GI / NO-GI',
        updatedAt: 'Updated at',
        options: {
          academy: 'Athletes by academy',
          category: 'Athletes by category',
          academyNoGi: 'Athletes by academy NO-GI',
          categoryNoGi: 'Athletes by category NO-GI',
          table: 'Weight table',
          tableNoGi: 'Weight table NO-GI',
          circular: 'Event circular'
        },
        registerNow: 'Register now',
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
        openForm: 'Fill registration form'
      }
    : {
        fallbackDate: 'Data a confirmar',
        fallbackEvent: 'Evento oficial',
        fallbackLocation: 'Local a definir',
        backEvents: 'Voltar para eventos',
        location: 'Localizacao',
        values: 'Valores',
        valuesLineA: 'Ate 15 anos (GI ou NO GI)',
        valuesLineB: 'Acima de 15 anos (GI ou NO GI)',
        valuesLineC: 'Combo GI + NO GI',
        valuesLineD: 'Absoluto GI / NO GI',
        updatedAt: 'Atualizado em',
        options: {
          academy: 'Atletas por academia',
          category: 'Atletas por categoria',
          academyNoGi: 'Atletas por academia no GI',
          categoryNoGi: 'Atletas por categoria no GI',
          table: 'Tabela de peso',
          tableNoGi: 'Tabela de peso no GI',
          circular: 'Circular'
        },
        registerNow: 'Se inscreva agora',
        registrationClosed: 'Inscricoes fechadas',
        registrationExternal: 'Este evento usa inscricao em link externo.',
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
        openForm: 'Se inscreva agora'
      };

  const event = useMemo(() => events.find((item) => item.id === eventId), [events, eventId]);

  const optionLinks = useMemo(() => (
    event
      ? [
          { label: copy.options.academy, href: `/ranking-equipes?event=${event.id}` },
          { label: copy.options.category, href: `/ranking?event=${event.id}` },
          { label: copy.options.academyNoGi, href: `/ranking-equipes?event=${event.id}&tab=NO-GI` },
          { label: copy.options.categoryNoGi, href: `/ranking?event=${event.id}&tab=NO-GI` },
          { label: copy.options.table, href: '/regulamento#tabela-peso-juvenil-adulto' },
          { label: copy.options.tableNoGi, href: '/regulamento#tabela-peso-infantil' },
          { label: copy.options.circular, href: '/regulamento' }
        ]
      : []
  ), [event, copy.options]);

  const eventFees = useMemo(() => normalizeEventFees(event || {}), [event]);

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
                  <Link key={option.label} to={option.href} className="btn btn-secondary">{option.label}</Link>
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
            <span>Regulamento</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EventDetails;
