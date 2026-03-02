import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Calendar, MapPin, Trophy, Users } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { useI18n } from '../hooks/useI18n';
import { rankAthletes } from '../services/scoringService';
import { buildCategoryDescriptor } from '../services/categoryService';
import { translateCompositeLabel } from '../utils/localeLabels';

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

const Home = () => {
  const { athletes, events, news } = useStore();
  const { language, locale } = useI18n();
  const isEnglish = language === 'en-US';
  const copy = isEnglish
    ? {
        heroKicker: 'Live ranking',
        heroTitle: 'The ranking that connects events, athletes and academies in one place.',
        heroDescription:
          'Constant updates, transparent history and a full view of who is on top right now. Everything feeds the ranking.',
        heroPrimary: 'View full ranking',
        heroSecondary: 'Events calendar',
        tagA: 'Multi-tournament',
        tagB: 'Transparent scoring',
        tagC: 'Fast updates',
        seasonSummary: 'Season summary',
        activeAthletes: 'Active athletes',
        eventsInSystem: 'Events in the system',
        distributedPoints: 'Distributed points',
        refresh: 'Refresh',
        realTime: 'Real-time',
        lastOfficial: 'Last official update',
        followEvolution: 'Track ranking movement',
        exploreRanking: 'Explore ranking',
        topKicker: 'Top 10',
        topTitle: 'Most consistent athletes this season.',
        fullRanking: 'View full ranking',
        athleteFallback: 'Athlete',
        academyFallback: 'No academy',
        pointsSuffix: 'pts',
        emptyAthletes: 'No athletes registered yet. Ranking appears here automatically.',
        eventsKicker: 'Events',
        eventsTitle: 'Upcoming events with direct registration.',
        fullCalendar: 'View full calendar',
        newsKicker: 'News',
        newsTitle: 'Latest updates',
        newsCta: 'Open news page',
        newsEmpty: 'No news published yet.',
        eventFallback: 'Official event',
        locationFallback: 'Location TBD',
        soon: 'Open',
        accessEvent: 'Access event',
        closedEvent: 'Registration closed',
        emptyEvents: 'Create an event and it will automatically appear here.',
        membershipKicker: 'Membership',
        membershipTitle: 'Simple registration for athletes and academies.',
        membershipDescription:
          'A quick form to join the official base. Your profile starts building history and points on each event.',
        membershipButton: 'Register now',
        fallbackDate: 'Date TBD'
      }
    : {
        heroKicker: 'Ranking ao vivo',
        heroTitle: 'O ranking que conecta eventos, atletas e academias em um unico lugar.',
        heroDescription:
          'Atualizacoes constantes, historico transparente e uma visao completa de quem esta no topo agora. Tudo gira em torno do ranking.',
        heroPrimary: 'Ver ranking completo',
        heroSecondary: 'Calendario de eventos',
        tagA: 'Multi-campeonatos',
        tagB: 'Pontuacao transparente',
        tagC: 'Atualizacao rapida',
        seasonSummary: 'Resumo da temporada',
        activeAthletes: 'Atletas ativos',
        eventsInSystem: 'Eventos no sistema',
        distributedPoints: 'Pontos distribuídos',
        refresh: 'Atualizacao',
        realTime: 'Em tempo real',
        lastOfficial: 'Ultima atualizacao oficial',
        followEvolution: 'Acompanhe as evolucoes',
        exploreRanking: 'Explorar ranking',
        topKicker: 'Top 10',
        topTitle: 'Os atletas mais consistentes da temporada.',
        fullRanking: 'Ver ranking completo',
        athleteFallback: 'Atleta',
        academyFallback: 'Sem academia',
        pointsSuffix: 'pts',
        emptyAthletes: 'Nenhum atleta cadastrado ainda. O ranking aparece aqui automaticamente.',
        eventsKicker: 'Eventos',
        eventsTitle: 'Proximos eventos com inscricao direta.',
        fullCalendar: 'Ver calendario completo',
        newsKicker: 'Noticias',
        newsTitle: 'Ultimas atualizacoes',
        newsCta: 'Abrir pagina de noticias',
        newsEmpty: 'Nenhuma noticia publicada ainda.',
        eventFallback: 'Evento oficial',
        locationFallback: 'Local a definir',
        soon: 'Inscricoes abertas',
        accessEvent: 'Acessar evento',
        closedEvent: 'Inscricoes fechadas',
        emptyEvents: 'Cadastre um evento para ele aparecer aqui e alimentar o ranking.',
        membershipKicker: 'Filiacao',
        membershipTitle: 'Cadastro simples para atletas e academias.',
        membershipDescription:
          'Um formulario rapido para entrar na base oficial. Seu perfil passa a gerar historico e pontuacao a cada evento.',
        membershipButton: 'Fazer cadastro',
        fallbackDate: 'Data a confirmar'
      };

  const stats = useMemo(() => {
    const totalPoints = athletes.reduce((total, athlete) => total + (Number(athlete.pontos) || 0), 0);
    const validDates = events
      .map((event) => parseDate(event.date))
      .filter(Boolean)
      .map((date) => date.getTime());
    const latestTimestamp = validDates.length ? Math.max(...validDates) : null;
    const lastUpdate = latestTimestamp ? new Date(latestTimestamp) : null;

    return {
      totalAthletes: athletes.length,
      totalEvents: events.length,
      totalPoints,
      lastUpdate
    };
  }, [athletes, events]);

  const topAthletes = useMemo(() => {
    if (!athletes.length) return [];
    return rankAthletes(athletes).slice(0, 8);
  }, [athletes]);

  const upcomingEvents = useMemo(() => {
    if (!events.length) return [];
    const now = new Date().getTime();
    return [...events]
      .map((event) => ({
        ...event,
        parsedDate: parseDate(event.date)
      }))
      .filter((event) => event.parsedDate && event.parsedDate.getTime() >= now)
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
      .slice(0, 3);
  }, [events]);

  const latestNews = useMemo(() => (
    [...news]
      .sort((a, b) => {
        const aTime = parseDate(a.publishedAt || a.createdAt)?.getTime() || 0;
        const bTime = parseDate(b.publishedAt || b.createdAt)?.getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, 3)
  ), [news]);

  return (
    <div className="public-page">
      <section className="public-hero">
        <div className="public-hero__content">
          <span className="section-kicker">{copy.heroKicker}</span>
          <h1>{copy.heroTitle}</h1>
          <p>
            {copy.heroDescription}
          </p>
          <div className="public-hero__actions">
            <Link className="btn btn-primary" to="/ranking">
              {copy.heroPrimary}
            </Link>
            <Link className="btn btn-secondary" to="/eventos">
              {copy.heroSecondary}
            </Link>
          </div>
          <div className="public-hero__meta">
            <span className="tag">{copy.tagA}</span>
            <span className="tag">{copy.tagB}</span>
            <span className="tag">{copy.tagC}</span>
          </div>
        </div>

        <div className="public-hero__panel">
          <div className="hero-panel__header">
            <span className="hero-panel__title">{copy.seasonSummary}</span>
            <span className="tag">2026</span>
          </div>
          <div className="hero-panel__stats">
            <div className="hero-stat">
              <div className="hero-stat__icon"><Users size={16} /></div>
              <div>
                <span>{copy.activeAthletes}</span>
                <strong>{stats.totalAthletes}</strong>
              </div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat__icon"><Calendar size={16} /></div>
              <div>
                <span>{copy.eventsInSystem}</span>
                <strong>{stats.totalEvents}</strong>
              </div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat__icon"><Trophy size={16} /></div>
              <div>
                <span>{copy.distributedPoints}</span>
                <strong>{stats.totalPoints}</strong>
              </div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat__icon"><Activity size={16} /></div>
              <div>
                <span>{copy.refresh}</span>
                <strong>{stats.lastUpdate ? formatDate(stats.lastUpdate, locale, copy.fallbackDate) : copy.realTime}</strong>
              </div>
            </div>
          </div>
          <div className="hero-panel__footer">
            <span>{stats.lastUpdate ? copy.lastOfficial : copy.followEvolution}</span>
            <Link className="text-link" to="/ranking">{copy.exploreRanking}</Link>
          </div>
        </div>
      </section>

      <section className="public-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{copy.eventsKicker}</span>
            <h2>{copy.eventsTitle}</h2>
          </div>
          <Link className="text-link" to="/eventos">{copy.fullCalendar}</Link>
        </div>
        <div className="event-showcase-grid">
          {upcomingEvents.length ? (
            upcomingEvents.map((event) => (
              <article className="event-showcase-card" key={event.id}>
                <div className="event-showcase-card__poster">
                  {event.posterUrl ? (
                    <img src={event.posterUrl} alt={event.name || copy.eventFallback} loading="lazy" />
                  ) : (
                    <div className="event-showcase-card__fallback">
                      <span>{event.name || copy.eventFallback}</span>
                    </div>
                  )}
                </div>
                <div className="event-showcase-card__body">
                  <h3 className="event-showcase-card__title">{event.name || copy.eventFallback}</h3>
                  <div className="event-showcase-card__meta">
                    <span>
                      <Calendar size={14} />
                      {formatDate(event.parsedDate, locale, copy.fallbackDate)}
                    </span>
                    <span>
                      <MapPin size={14} />
                      {event.location || copy.locationFallback}
                    </span>
                  </div>
                  <span className="tag">{copy.soon}</span>
                  <a
                    className={`btn ${event.registrationOpen !== false ? 'btn-event' : 'btn-secondary btn-event--small'}`}
                    href={event.internalRegistration ? `/eventos/${event.id}` : (event.registrationUrl || '#')}
                    target={!event.internalRegistration && event.registrationUrl ? '_blank' : undefined}
                    rel={!event.internalRegistration && event.registrationUrl ? 'noreferrer' : undefined}
                    onClick={(clickEvent) => {
                      if (event.registrationOpen === false || (!event.internalRegistration && !event.registrationUrl)) {
                        clickEvent.preventDefault();
                      }
                    }}
                    aria-disabled={event.registrationOpen === false || (!event.internalRegistration && !event.registrationUrl)}
                  >
                    {event.registrationOpen === false ? copy.closedEvent : copy.accessEvent}
                  </a>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">{copy.emptyEvents}</div>
          )}
        </div>
      </section>

      <section className="public-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{copy.newsKicker}</span>
            <h2>{copy.newsTitle}</h2>
          </div>
          <Link className="text-link" to="/noticias">{copy.newsCta}</Link>
        </div>
        <div className="news-grid">
          {latestNews.length ? (
            latestNews.map((item) => (
              <article className="news-card" key={item.id}>
                {item.imageUrl && (
                  <div className="news-card__cover">
                    <img src={item.imageUrl} alt={item.title} loading="lazy" />
                  </div>
                )}
                <div className="news-card__meta">{formatDate(item.publishedAt || item.createdAt, locale, copy.fallbackDate)}</div>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
              </article>
            ))
          ) : (
            <div className="empty-state">{copy.newsEmpty}</div>
          )}
        </div>
      </section>

      <section className="public-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{copy.topKicker}</span>
            <h2>{copy.topTitle}</h2>
          </div>
          <Link className="text-link" to="/ranking">{copy.fullRanking}</Link>
        </div>
        <div className="list-card">
          {topAthletes.length ? (
            topAthletes.map((athlete, index) => {
              const descriptor = buildCategoryDescriptor(athlete);
              const categoryLabel = translateCompositeLabel(
                descriptor?.label || [athlete.faixa, athlete.peso].filter(Boolean).join(' • '),
                language
              );
              return (
                <div className="list-row" key={athlete.id}>
                  <div className="list-rank">{index + 1}</div>
                  <div>
                    <div className="list-name">{athlete.nome || copy.athleteFallback}</div>
                    <div className="list-meta">{athlete.academia || copy.academyFallback}{categoryLabel ? ` • ${categoryLabel}` : ''}</div>
                  </div>
                  <div className="list-score">{athlete.pontos} {copy.pointsSuffix}</div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">{copy.emptyAthletes}</div>
          )}
        </div>
      </section>

      <section className="public-section">
        <div className="cta-card">
          <div>
            <span className="section-kicker">{copy.membershipKicker}</span>
            <h2>{copy.membershipTitle}</h2>
            <p>
              {copy.membershipDescription}
            </p>
          </div>
          <Link className="btn btn-primary" to="/filiacao">
            {copy.membershipButton}
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
