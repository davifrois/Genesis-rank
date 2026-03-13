import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Newspaper } from 'lucide-react';
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

const resolveDaysOffset = (value) => {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfEvent = new Date(date);
  startOfEvent.setHours(0, 0, 0, 0);
  return Math.round((startOfEvent.getTime() - startOfToday.getTime()) / 86_400_000);
};

const resolveCountdownLabel = (offset, copy) => {
  if (offset === null || offset === undefined) return '';
  if (offset === 0) return copy.todayLabel;
  if (offset < 0) return copy.finishedLabel;
  if (offset === 1) return `1 ${copy.dayLeftSingular}`;
  return `${offset} ${copy.dayLeftPlural}`;
};

const Home = () => {
  const { athletes, events, news } = useStore();
  const { locale, uiLanguage, uiVariant } = useI18n();
  const copyByLanguage = {
    pt: {
      heroKicker: 'Ranking ao vivo',
      heroTitle: 'Campeonatos e ranking em um unico ambiente oficial.',
      heroDescription:
        'Acompanhe todos os campeonatos em um unico lugar, com inscricao direta, atualizacao transparente e visao completa do ranking oficial.',
      heroPrimary: 'Acessar campeonato',
      heroSecondary: 'Ver todos campeonatos',
      heroEventsHeadline: 'Campeonatos em destaque',
      heroEventFallbackTitle: 'Campeonato oficial',
      breakingBadge: 'Inscricoes abertas',
      prevEvent: 'Campeonato anterior',
      nextEvent: 'Proximo campeonato',
      heroLocationPrefix: 'Local',
      tagA: 'Multi-campeonatos',
      tagB: 'Pontuacao transparente',
      tagC: 'Atualizacao rapida',
      seasonSummary: 'Resumo da temporada',
      activeAthletes: 'Atletas ativos',
      eventsInSystem: 'Eventos no sistema',
      distributedPoints: 'Pontos distribuidos',
      refresh: 'Atualizacao',
      realTime: 'Em tempo real',
      lastOfficial: 'Ultima atualizacao oficial',
      followEvolution: 'Acompanhe a evolucao',
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
      dayLeftSingular: 'dia restante',
      dayLeftPlural: 'dias restantes',
      todayLabel: 'hoje',
      finishedLabel: 'encerrado',
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
        'Um formulario rapido para ingressar na base oficial. Seu perfil passa a gerar historico e pontuacao a cada evento.',
      membershipButton: 'Fazer cadastro',
      fallbackDate: 'Data a confirmar'
    },
    en: {
      heroKicker: 'Live ranking',
      heroTitle: 'Championships and ranking in a single official environment.',
      heroDescription:
        'Follow all tournaments in one place, with direct registration, transparent updates and complete visibility of the official ranking.',
      heroPrimary: 'Access championship',
      heroSecondary: 'View all championships',
      heroEventsHeadline: 'Featured championships',
      heroEventFallbackTitle: 'Official championship',
      breakingBadge: 'Registration open',
      prevEvent: 'Previous championship',
      nextEvent: 'Next championship',
      heroLocationPrefix: 'Location',
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
      dayLeftSingular: 'day left',
      dayLeftPlural: 'days left',
      todayLabel: 'today',
      finishedLabel: 'finished',
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
    },
    es: {
      heroKicker: 'Ranking en vivo',
      heroTitle: 'Campeonatos y ranking en un unico entorno oficial.',
      heroDescription:
        'Siga todos los campeonatos en un solo lugar, con inscripcion directa, actualizacion transparente y vision completa del ranking oficial.',
      heroPrimary: 'Acceder al campeonato',
      heroSecondary: 'Ver todos los campeonatos',
      heroEventsHeadline: 'Campeonatos destacados',
      heroEventFallbackTitle: 'Campeonato oficial',
      breakingBadge: 'Inscripciones abiertas',
      prevEvent: 'Campeonato anterior',
      nextEvent: 'Siguiente campeonato',
      heroLocationPrefix: 'Lugar',
      tagA: 'Multi-campeonatos',
      tagB: 'Puntuacion transparente',
      tagC: 'Actualizacion rapida',
      seasonSummary: 'Resumen de la temporada',
      activeAthletes: 'Atletas activos',
      eventsInSystem: 'Eventos en el sistema',
      distributedPoints: 'Puntos distribuidos',
      refresh: 'Actualizacion',
      realTime: 'En tiempo real',
      lastOfficial: 'Ultima actualizacion oficial',
      followEvolution: 'Siga la evolucion',
      exploreRanking: 'Explorar ranking',
      topKicker: 'Top 10',
      topTitle: 'Los atletas mas consistentes de la temporada.',
      fullRanking: 'Ver ranking completo',
      athleteFallback: 'Atleta',
      academyFallback: 'Sin academia',
      pointsSuffix: 'pts',
      emptyAthletes: 'Todavia no hay atletas registrados. El ranking aparecera aqui automaticamente.',
      eventsKicker: 'Eventos',
      eventsTitle: 'Proximos eventos con inscripcion directa.',
      fullCalendar: 'Ver calendario completo',
      dayLeftSingular: 'dia restante',
      dayLeftPlural: 'dias restantes',
      todayLabel: 'hoy',
      finishedLabel: 'finalizado',
      newsKicker: 'Noticias',
      newsTitle: 'Ultimas actualizaciones',
      newsCta: 'Abrir pagina de noticias',
      newsEmpty: 'Todavia no hay noticias publicadas.',
      eventFallback: 'Evento oficial',
      locationFallback: 'Lugar por definir',
      soon: 'Inscripciones abiertas',
      accessEvent: 'Acceder al evento',
      closedEvent: 'Inscripciones cerradas',
      emptyEvents: 'Registre un evento para mostrarlo aqui y alimentar el ranking.',
      membershipKicker: 'Filiacion',
      membershipTitle: 'Registro simple para atletas y academias.',
      membershipDescription:
        'Un formulario rapido para entrar en la base oficial. Su perfil comienza a generar historial y puntuacion en cada evento.',
      membershipButton: 'Registrarse',
      fallbackDate: 'Fecha por confirmar'
    },
    fr: {
      heroKicker: 'Classement en direct',
      heroTitle: 'Championnats et classement dans un environnement officiel unique.',
      heroDescription:
        'Suivez tous les championnats dans un seul endroit, avec inscription directe, mise a jour transparente et vision complete du classement officiel.',
      heroPrimary: 'Acceder au championnat',
      heroSecondary: 'Voir tous les championnats',
      heroEventsHeadline: 'Championnats en vedette',
      heroEventFallbackTitle: 'Championnat officiel',
      breakingBadge: 'Inscriptions ouvertes',
      prevEvent: 'Championnat precedent',
      nextEvent: 'Prochain championnat',
      heroLocationPrefix: 'Lieu',
      tagA: 'Multi-championnats',
      tagB: 'Score transparent',
      tagC: 'Mise a jour rapide',
      seasonSummary: 'Resume de la saison',
      activeAthletes: 'Athletes actifs',
      eventsInSystem: 'Evenements dans le systeme',
      distributedPoints: 'Points distribues',
      refresh: 'Actualisation',
      realTime: 'En temps reel',
      lastOfficial: 'Derniere mise a jour officielle',
      followEvolution: 'Suivre l evolution',
      exploreRanking: 'Explorer le classement',
      topKicker: 'Top 10',
      topTitle: 'Les athletes les plus reguliers de la saison.',
      fullRanking: 'Voir le classement complet',
      athleteFallback: 'Athlete',
      academyFallback: 'Sans academie',
      pointsSuffix: 'pts',
      emptyAthletes: 'Aucun athlete enregistre pour le moment. Le classement apparaitra ici automatiquement.',
      eventsKicker: 'Evenements',
      eventsTitle: 'Prochains evenements avec inscription directe.',
      fullCalendar: 'Voir le calendrier complet',
      dayLeftSingular: 'jour restant',
      dayLeftPlural: 'jours restants',
      todayLabel: "aujourd'hui",
      finishedLabel: 'termine',
      newsKicker: 'Actualites',
      newsTitle: 'Dernieres mises a jour',
      newsCta: 'Ouvrir la page des actualites',
      newsEmpty: 'Aucune actualite publiee pour le moment.',
      eventFallback: 'Evenement officiel',
      locationFallback: 'Lieu a definir',
      soon: 'Inscriptions ouvertes',
      accessEvent: 'Acceder a l evenement',
      closedEvent: 'Inscriptions fermees',
      emptyEvents: 'Creez un evenement pour l afficher ici et alimenter le classement.',
      membershipKicker: 'Affiliation',
      membershipTitle: 'Inscription simple pour athletes et academies.',
      membershipDescription:
        'Un formulaire rapide pour rejoindre la base officielle. Votre profil commence a generer historique et points a chaque evenement.',
      membershipButton: "S inscrire",
      fallbackDate: 'Date a confirmer'
    }
  };
  const copy = copyByLanguage[uiVariant] || copyByLanguage.pt;

  const topAthletes = useMemo(() => {
    if (!athletes.length) return [];
    return rankAthletes(athletes).slice(0, 8);
  }, [athletes]);

  const featuredEvents = useMemo(() => {
    if (!events.length) return [];
    const now = new Date().getTime();
    return [...events]
      .map((event) => ({
        ...event,
        parsedDate: parseDate(event.date)
      }))
      .sort((a, b) => {
        const aTime = a.parsedDate ? a.parsedDate.getTime() : 0;
        const bTime = b.parsedDate ? b.parsedDate.getTime() : 0;
        const aIsUpcoming = aTime > 0 && aTime >= now;
        const bIsUpcoming = bTime > 0 && bTime >= now;
        if (aIsUpcoming !== bIsUpcoming) return aIsUpcoming ? -1 : 1;
        if (aIsUpcoming && bIsUpcoming) return aTime - bTime;
        if (!aIsUpcoming && !bIsUpcoming) return bTime - aTime;
        return a.name.localeCompare(b.name);
      });
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
      <section className="public-section championships-main">
        <div className="section-heading championships-main__header championships-main__header--minimal">
          <h1 className="championships-main__minimal-title">{copy.eventsKicker}</h1>
          <Link className="text-link" to="/eventos">{copy.fullCalendar}</Link>
        </div>
        <div className="championships-main__grid">
          {featuredEvents.length ? (
            featuredEvents.map((event) => {
              const isRegistrationOpen = event.registrationOpen !== false;
              const eventDate = formatDate(event.parsedDate || event.date, locale, copy.fallbackDate);
              const eventLocation = event.location || copy.locationFallback;
              const daysOffset = resolveDaysOffset(event.parsedDate || event.date);
              const countdown = resolveCountdownLabel(daysOffset, copy);

              return (
                <article className="championship-main-card" key={event.id}>
                  <div className="championship-main-card__poster">
                    {event.posterUrl ? (
                      <img src={event.posterUrl} alt={event.name || copy.eventFallback} loading="lazy" />
                    ) : (
                      <div className="championship-main-card__fallback">
                        <span>{event.name || copy.eventFallback}</span>
                      </div>
                    )}
                  </div>
                  <div className="championship-main-card__body">
                    <div className="championship-main-card__badges">
                      <span className={`championship-main-card__status ${isRegistrationOpen ? 'is-open' : 'is-closed'}`}>
                        {isRegistrationOpen ? copy.soon : copy.closedEvent}
                      </span>
                    </div>
                    <h3 className="championship-main-card__title">{event.name || copy.eventFallback}</h3>
                    <span className="championship-main-card__location">
                      <MapPin size={14} />
                      {eventLocation}
                    </span>
                    <div className="championship-main-card__meta">
                      <span>
                        <Calendar size={14} />
                        {eventDate}
                      </span>
                      {countdown && <span className="championship-main-card__meta-countdown">{countdown}</span>}
                    </div>
                    {event.internalRegistration ? (
                      <Link
                        className={`btn ${isRegistrationOpen ? 'btn-event' : 'btn-secondary btn-event--small'}`}
                        to={`/eventos/${event.id}`}
                        onClick={(clickEvent) => {
                          if (!isRegistrationOpen) {
                            clickEvent.preventDefault();
                          }
                        }}
                        aria-disabled={!isRegistrationOpen}
                      >
                        {isRegistrationOpen ? copy.accessEvent : copy.closedEvent}
                      </Link>
                    ) : (
                      <a
                        className={`btn ${isRegistrationOpen ? 'btn-event' : 'btn-secondary btn-event--small'}`}
                        href={event.registrationUrl || '#'}
                        target={event.registrationUrl ? '_blank' : undefined}
                        rel={event.registrationUrl ? 'noreferrer' : undefined}
                        onClick={(clickEvent) => {
                          if (!isRegistrationOpen || !event.registrationUrl) {
                            clickEvent.preventDefault();
                          }
                        }}
                        aria-disabled={!isRegistrationOpen || !event.registrationUrl}
                      >
                        {isRegistrationOpen ? copy.accessEvent : copy.closedEvent}
                      </a>
                    )}
                  </div>
                </article>
              );
            })
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
                <div className={`news-card__cover ${item.imageUrl ? '' : 'news-card__cover--fallback'}`.trim()}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} loading="lazy" />
                  ) : (
                    <div className="news-card__cover-fallback" aria-hidden="true">
                      <Newspaper className="news-card__cover-fallback-icon" />
                      <span>{copy.newsKicker}</span>
                    </div>
                  )}
                </div>
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
                uiLanguage
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





