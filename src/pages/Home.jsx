import React, { useMemo, useEffect, useRef, useState } from 'react';
import './Home.css';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Newspaper, Trophy, Users, Star, Zap, Shield, TrendingUp, X } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { useI18n } from '../hooks/useI18n';
import { rankAthletes, groupAthletesByName } from '../services/scoringService';
import { buildCategoryDescriptor } from '../services/categoryService';
import { translateCompositeLabel } from '../utils/localeLabels';
import { resolveAthleteEventPrice } from '../utils/eventPricing';
import FilmmakerShowcase from '../components/FilmmakerShowcase';

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

// Animated counter hook
function useCountUp(target, duration = 1500, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start || target === 0) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

// Medal emoji by rank
const getMedal = (index) => {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return null;
};

// Initials avatar
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Avatar gradient by index
const avatarGradients = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #fda085, #f6d365)',
  'linear-gradient(135deg, #84fab0, #8fd3f4)',
];

const Home = () => {
  const { athletes, events, news, academies } = useStore();
  const { locale, uiLanguage, uiVariant } = useI18n();
  const statsRef = useRef(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);

  // Intersection observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('home-visible');
            if (entry.target === statsRef.current) {
              setStatsVisible(true);
            }
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll('.home-animate').forEach((el) => observer.observe(el));
    if (statsRef.current) observer.observe(statsRef.current);

    return () => observer.disconnect();
  }, []);

  const copyByLanguage = {
    pt: {
      heroKicker: 'Ranking ao vivo',
      heroTitle: 'Impulsionamos a performance dos maiores atletas e a infraestrutura dos eventos que movem o mundo.',
      heroDescription: 'Campeonatos e ranking em um único ambiente oficial.',
      heroPrimary: 'Procurar evento',
      heroSecondary: 'Criar evento',
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
      topKicker: 'TOP 5',
      topTitle: 'Os atletas mais consistentes da temporada.',
      topAcademiesTitle: 'Top Equipes da Temporada',
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
      fallbackDate: 'Data a confirmar',
      whyTitle: 'Por que a Genesis?',
      whyKicker: 'Plataforma',
      feature1Title: 'Ranking Transparente',
      feature1Desc: 'Cada ponto é calculado de forma automática e auditável. Sem surpresas, sem favoritismos.',
      feature2Title: 'Inscrição Direta',
      feature2Desc: 'Inscreva-se nos eventos em poucos cliques, diretamente pela plataforma oficial.',
      feature3Title: 'Histórico Completo',
      feature3Desc: 'Acompanhe a evolução do seu desempenho ao longo de toda a temporada em um único lugar.',
      statsAthletes: 'Atletas cadastrados',
      statsEvents: 'Eventos registrados',
      statsPoints: 'Pontos distribuídos',
      statsAcademies: 'Academias filiadas',
    },
    en: {
      heroKicker: 'Live ranking',
      heroTitle: 'We boost the performance of top athletes and the infrastructure of events that move the world.',
      heroDescription: 'Championships and rankings in a single official environment.',
      heroPrimary: 'Search event',
      heroSecondary: 'Create event',
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
      topKicker: 'TOP 5',
      topTitle: 'Most consistent athletes this season.',
      topAcademiesTitle: 'Top Teams this Season',
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
      fallbackDate: 'Date TBD',
      whyTitle: 'Why Genesis?',
      whyKicker: 'Platform',
      feature1Title: 'Transparent Ranking',
      feature1Desc: 'Every point is calculated automatically and auditably. No surprises, no favoritism.',
      feature2Title: 'Direct Registration',
      feature2Desc: 'Sign up for events in a few clicks, directly on the official platform.',
      feature3Title: 'Full History',
      feature3Desc: 'Track your performance evolution throughout the entire season in one place.',
      statsAthletes: 'Registered athletes',
      statsEvents: 'Registered events',
      statsPoints: 'Points distributed',
      statsAcademies: 'Affiliated academies',
    },
    es: {
      heroKicker: 'Ranking en vivo',
      heroTitle: 'Impulsamos el rendimiento de los mejores atletas y la infraestructura de los eventos que mueven al mundo.',
      heroDescription: 'Campeonatos y ranking en un único entorno oficial.',
      heroPrimary: 'Buscar evento',
      heroSecondary: 'Crear evento',
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
      topKicker: 'TOP 5',
      topTitle: 'Los atletas mas consistentes de la temporada.',
      topAcademiesTitle: 'Mejores Equipos de la Temporada',
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
      fallbackDate: 'Fecha por confirmar',
      whyTitle: '¿Por qué Genesis?',
      whyKicker: 'Plataforma',
      feature1Title: 'Ranking Transparente',
      feature1Desc: 'Cada punto se calcula de forma automática y auditable. Sin sorpresas.',
      feature2Title: 'Inscrição Directa',
      feature2Desc: 'Inscríbete en eventos con pocos clics directamente en la plataforma oficial.',
      feature3Title: 'Historial Completo',
      feature3Desc: 'Sigue la evolución de tu rendimiento a lo largo de toda la temporada.',
      statsAthletes: 'Atletas registrados',
      statsEvents: 'Eventos registrados',
      statsPoints: 'Puntos distribuidos',
      statsAcademies: 'Academias afiliadas',
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
      topKicker: 'TOP 5',
      topTitle: 'Les athletes les plus reguliers de la saison.',
      topAcademiesTitle: 'Meilleures Équipes de la Saison',
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
      fallbackDate: 'Date a confirmer',
      whyTitle: 'Pourquoi Genesis?',
      whyKicker: 'Plateforme',
      feature1Title: 'Classement transparent',
      feature1Desc: 'Chaque point est calculé automatiquement et de façon auditable.',
      feature2Title: 'Inscription directe',
      feature2Desc: 'Inscrivez-vous aux événements en quelques clics sur la plateforme officielle.',
      feature3Title: 'Historique complet',
      feature3Desc: 'Suivez l\'évolution de vos performances tout au long de la saison.',
      statsAthletes: 'Athlètes inscrits',
      statsEvents: 'Événements enregistrés',
      statsPoints: 'Points distribués',
      statsAcademies: 'Académies affiliées',
    }
  };
  const copy = copyByLanguage[uiVariant] || copyByLanguage.pt;

  const topAthletes = useMemo(() => {
    if (!athletes.length) return [];
    return rankAthletes(groupAthletesByName(athletes)).slice(0, 5);
  }, [athletes]);

  const topAcademies = useMemo(() => {
    if (!athletes.length) return [];
    const academyMap = {};
    athletes.forEach(a => {
      const name = a.academia || copy.academyFallback || 'Independente';
      academyMap[name] = (academyMap[name] || 0) + (a.pontos || 0);
    });
    return Object.entries(academyMap)
      .map(([name, pontos]) => {
        const academyData = (academies || []).find(ac => ac.name === name);
        return { name, pontos, logoUrl: academyData?.logoUrl };
      })
      .sort((a, b) => b.pontos - a.pontos)
      .slice(0, 5);
  }, [athletes, academies, copy.academyFallback]);

  const featuredEvents = useMemo(() => {
    if (!events.length) return [];
    const now = new Date().getTime();
    return [...events]
      .map((event) => ({
        ...event,
        parsedDate: parseDate(event.date)
      }))
      .filter((event) => {
        const time = event.parsedDate ? event.parsedDate.getTime() : 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return time === 0 || time >= today.getTime();
      })
      .sort((a, b) => {
        const aTime = a.parsedDate ? a.parsedDate.getTime() : 0;
        const bTime = b.parsedDate ? b.parsedDate.getTime() : 0;
        if (aTime && bTime) return aTime - bTime;
        if (aTime) return -1;
        if (bTime) return 1;
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

  // Stats calculation
  const totalPoints = useMemo(() => athletes.reduce((sum, a) => sum + (a.pontos || 0), 0), [athletes]);
  const academiesCount = useMemo(() => new Set(athletes.map(a => a.academia).filter(Boolean)).size, [athletes]);

  // Max points for progress bar
  const maxPoints = useMemo(() => topAthletes[0]?.pontos || 1, [topAthletes]);

  // Animated counters
  const animatedAthletes = useCountUp(athletes.length, 1500, statsVisible);
  const animatedEvents = useCountUp(events.length, 1500, statsVisible);
  const animatedPoints = useCountUp(totalPoints, 2000, statsVisible);
  const animatedAcademies = useCountUp(academiesCount, 1500, statsVisible);

  return (
    <div className="public-page home-improved">
      {/* ─── HERO ─── */}
      <section className="home-hero">
        <div className="home-hero__overlay" />
        {/* Animated scan lines */}
        <div className="home-hero__scanlines" aria-hidden="true" />
        
        <div className="home-hero__content">
          <div className="home-hero__badge home-animate">
            <span className="home-hero__badge-dot" />
            {copy.heroKicker}
          </div>
          <h1 className="home-hero__title home-animate">
            {copy.heroTitle}
          </h1>
          <p className="home-hero__subtitle home-animate">
            {copy.heroDescription}
          </p>
          <div className="home-hero__actions home-animate">
            <Link to="/eventos" className="home-btn home-btn--primary">
              {copy.heroPrimary}
            </Link>
            <a href="https://wa.me/553193383014?text=Ol%C3%A1%2C%20tudo%20bem%3F%20Estou%20planejando%20criar%20um%20campeonato%20utilizando%20a%20plataforma%20de%20voc%C3%AAs%20e%20gostaria%20de%20tirar%20algumas%20d%C3%BAvidas.%20Poderiam%20me%20fornecer%20mais%20informa%C3%A7%C3%B5es%20sobre%20as%20ferramentas%20dispon%C3%ADveis%20para%20gerenciamento%20de%20chaves%2C%20inscri%C3%A7%C3%B5es%20e%20suporte%20ao%20evento%3F" target="_blank" rel="noopener noreferrer" className="home-btn home-btn--ghost">
              {copy.heroSecondary}
            </a>
          </div>
        </div>
      </section>


      {/* ─── EVENTS ─── */}
      <section className="home-section home-animate">
        <div className="home-section__header">
          <div>
            <span className="home-kicker">{copy.eventsKicker}</span>
            <h2 className="home-section__title">{copy.eventsTitle}</h2>
          </div>
          <Link className="home-text-link" to="/eventos">{copy.fullCalendar}</Link>
        </div>

        <div className="home-events-grid">
          {featuredEvents.length ? (
            featuredEvents.map((event) => {
              const eventLocation = event.location || copy.locationFallback;
              const daysOffset = resolveDaysOffset(event.parsedDate || event.date);
              const countdown = resolveCountdownLabel(daysOffset, copy);
              
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              
              const isPastDate = event.parsedDate && event.parsedDate.getTime() < today.getTime();
              
              let isRegistrationClosedByDate = false;
              if (event.registrationCloseDate) {
                const closeDate = new Date(event.registrationCloseDate);
                if (!isNaN(closeDate.getTime())) {
                  closeDate.setHours(23, 59, 59, 999);
                  if (new Date() > closeDate) {
                    isRegistrationClosedByDate = true;
                  }
                }
              }
              
              const isOpen = event.registrationOpen !== false && !isPastDate && !isRegistrationClosedByDate;

              return (
                <article className="home-event-card" key={event.id}>
                  {/* Poster */}
                  <div className="home-event-card__poster">
                    {event.posterUrl ? (
                      <img src={event.posterUrl} alt={event.name || copy.eventFallback} loading="lazy" />
                    ) : (
                      <div className="home-event-card__poster-fallback">
                        <Trophy size={40} />
                      </div>
                    )}
                    <div className="home-event-card__poster-overlay">
                      <div className="home-event-card__date-badge">
                        <span className="home-event-card__date-month">
                          {event.parsedDate ? new Date(event.parsedDate).toLocaleDateString(locale, { month: 'short' }).replace('.', '').toUpperCase() : '—'}
                        </span>
                        <span className="home-event-card__date-day">
                          {event.parsedDate ? new Date(event.parsedDate).getDate() : '—'}
                        </span>
                      </div>
                      {(() => {
                        const priceData = resolveAthleteEventPrice({ event });
                        const displayPrice = priceData.base > 0 ? priceData.base : (event.feeOver15 || 0);
                        if (!displayPrice) return null;
                        return (
                          <div className="home-event-card__price-badge">
                            <span>{priceData.batchName || 'Lote atual'}</span>
                            <strong>R$ {parseFloat(displayPrice).toFixed(2).replace('.', ',')}</strong>
                          </div>
                        );
                      })()}
                    </div>
                    {isOpen ? (
                      <div className="home-event-card__status-badge">{copy.breakingBadge || 'Inscrições abertas'}</div>
                    ) : (
                      <div className="home-event-card__status-badge" style={{ background: '#e74c3c', color: '#fff', boxShadow: 'none' }}>Inscrições encerradas</div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="home-event-card__body">
                    <h3 className="home-event-card__title">{event.name || copy.eventFallback}</h3>
                    <div className="home-event-card__location">
                      <MapPin size={13} />
                      <span>{eventLocation}</span>
                    </div>
                    <div className="home-event-card__footer">
                      <span className="home-event-card__date-text">
                        <Calendar size={12} />
                        {event.parsedDate ? new Date(event.parsedDate).toLocaleDateString(locale, { day: 'numeric', month: 'long' }) : copy.fallbackDate}
                      </span>
                      <span className={`home-event-card__countdown ${daysOffset !== null && daysOffset <= 7 && daysOffset >= 0 ? 'home-event-card__countdown--urgent' : ''}`}>
                        {countdown}
                      </span>
                    </div>
                  </div>

                  {/* Link overlay */}
                  {event.internalRegistration ? (
                    <Link to={`/eventos/${event.id}`} className="home-event-card__link" aria-label={copy.accessEvent} />
                  ) : (
                    <a href={event.registrationUrl || '#'} target={event.registrationUrl ? '_blank' : undefined} rel={event.registrationUrl ? 'noreferrer' : undefined} className="home-event-card__link" aria-label={copy.accessEvent} />
                  )}
                </article>
              );
            })
          ) : (
            <div className="home-empty">{copy.emptyEvents}</div>
          )}
        </div>
      </section>

      {/* ─── NEWS ─── */}
      <section className="home-section home-animate">
        <div className="home-section__header">
          <div>
            <span className="home-kicker">{copy.newsKicker}</span>
            <h2 className="home-section__title">{copy.newsTitle}</h2>
          </div>
          <Link className="home-text-link" to="/noticias">{copy.newsCta}</Link>
        </div>

        {latestNews.length ? (
          <div className="home-news-grid">
            {/* Featured first news */}
            {latestNews[0] && (
              <article className="home-news-featured" onClick={() => setSelectedNews(latestNews[0])} style={{ cursor: 'pointer' }}>
                <div className="home-news-featured__cover">
                  {latestNews[0].imageUrl ? (
                    <img src={latestNews[0].imageUrl} alt={latestNews[0].title} loading="lazy" />
                  ) : (
                    <div className="home-news-featured__cover-fallback">
                      <Newspaper size={48} />
                    </div>
                  )}
                  <div className="home-news-featured__cover-overlay" />
                  <span className="home-news-featured__kicker">{copy.newsKicker}</span>
                </div>
                <div className="home-news-featured__body">
                  <span className="home-news-featured__date">
                    {formatDate(latestNews[0].publishedAt || latestNews[0].createdAt, locale, copy.fallbackDate)}
                  </span>
                  <h3 className="home-news-featured__title">{latestNews[0].title}</h3>
                  <p className="home-news-featured__summary">{latestNews[0].summary}</p>
                </div>
              </article>
            )}

            {/* Smaller 2 and 3 */}
            <div className="home-news-side">
              {latestNews.slice(1).map((item) => (
                <article className="home-news-side-card" key={item.id} onClick={() => setSelectedNews(item)} style={{ cursor: 'pointer' }}>
                  <div className="home-news-side-card__cover">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} loading="lazy" />
                    ) : (
                      <div className="home-news-side-card__cover-fallback">
                        <Newspaper size={24} />
                      </div>
                    )}
                  </div>
                  <div className="home-news-side-card__body">
                    <span className="home-news-side-card__date">
                      {formatDate(item.publishedAt || item.createdAt, locale, copy.fallbackDate)}
                    </span>
                    <h4 className="home-news-side-card__title">{item.title}</h4>
                    <p className="home-news-side-card__summary">{item.summary}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="home-empty">{copy.newsEmpty}</div>
        )}
      </section>

      {/* ─── RANKINGS (ATHLETES + ACADEMIES) ─── */}
      <section className="home-section home-animate">
        <div className="home-ranking-grid">
          
          {/* COLUMN 1: TOP ATHLETES */}
          <div className="home-ranking-col">
            <div className="home-section__header">
              <div>
                <span className="home-kicker">{copy.topKicker}</span>
                <h2 className="home-section__title">{copy.topTitle}</h2>
              </div>
              <Link className="home-text-link" to="/ranking">{copy.fullRanking}</Link>
            </div>

            <div className="home-ranking-list">
              {topAthletes.length ? (
                topAthletes.map((athlete, index) => {
                  const descriptor = buildCategoryDescriptor(athlete);
                  const categoryLabel = translateCompositeLabel(
                    descriptor?.label || [athlete.faixa, athlete.peso].filter(Boolean).join(' • '),
                    uiLanguage
                  );
                  const medal = getMedal(index);
                  const progressPct = Math.round((athlete.pontos / maxPoints) * 100);

                  return (
                    <div className={`home-rank-row ${index < 3 ? 'home-rank-row--podium' : ''}`} key={athlete.id || index}>
                      <div className="home-rank-pos">
                        {medal ? (
                          <span className="home-rank-medal">{medal}</span>
                        ) : (
                          <span className="home-rank-number">{index + 1}</span>
                        )}
                      </div>

                      <div
                        className="home-rank-avatar"
                        style={{ background: avatarGradients[index % avatarGradients.length] }}
                      >
                        {athlete.photoUrl ? (
                          <img src={athlete.photoUrl} alt={athlete.nome} />
                        ) : (
                          <span>{getInitials(athlete.nome)}</span>
                        )}
                      </div>

                      <div className="home-rank-info">
                        <div className="home-rank-name">{athlete.nome || copy.athleteFallback}</div>
                        <div className="home-rank-meta">{athlete.academia || copy.academyFallback}{categoryLabel ? ` • ${categoryLabel}` : ''}</div>
                        <div className="home-rank-progress">
                          <div className="home-rank-progress-bar" style={{ width: `${progressPct}%` }} />
                        </div>
                      </div>

                      <div className="home-rank-score">
                        <span className="home-rank-pts">{athlete.pontos}</span>
                        <span className="home-rank-pts-label">{copy.pointsSuffix}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="home-empty">{copy.emptyAthletes}</div>
              )}
            </div>
          </div>

          {/* COLUMN 2: TOP ACADEMIES */}
          <div className="home-ranking-col">
            <div className="home-section__header">
              <div>
                <span className="home-kicker">TOP 5</span>
                <h2 className="home-section__title">{copy.topAcademiesTitle}</h2>
              </div>
            </div>

            <div className="home-ranking-list">
              {topAcademies.length ? (
                topAcademies.map((academy, index) => {
                  const medal = getMedal(index);
                  const maxAcademyPoints = topAcademies[0]?.pontos || 1;
                  const progressPct = Math.round((academy.pontos / maxAcademyPoints) * 100);

                  return (
                    <div className={`home-rank-row home-academy-row ${index < 3 ? 'home-rank-row--podium' : ''}`} key={academy.name || index}>
                      <div className="home-rank-pos">
                        {medal ? (
                          <span className="home-rank-medal">{medal}</span>
                        ) : (
                          <span className="home-rank-number">{index + 1}</span>
                        )}
                      </div>

                      <div
                        className="home-rank-avatar home-academy-avatar"
                      >
                        {academy.logoUrl ? (
                          <img src={academy.logoUrl} alt={academy.name} />
                        ) : (
                          <Shield size={24} color="#fff" />
                        )}
                      </div>

                      <div className="home-rank-info">
                        <div className="home-rank-name">{academy.name}</div>
                        <div className="home-rank-meta">Academia / Equipe</div>
                        <div className="home-rank-progress">
                          <div className="home-rank-progress-bar" style={{ width: `${progressPct}%` }} />
                        </div>
                      </div>

                      <div className="home-rank-score">
                        <span className="home-rank-pts">{academy.pontos}</span>
                        <span className="home-rank-pts-label">{copy.pointsSuffix}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="home-empty">Sem dados de equipes</div>
              )}
            </div>
          </div>

        </div>
      </section>

      <FilmmakerShowcase />

      {/* News Modal */}
      {selectedNews && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setSelectedNews(null)}>
          <div style={{ backgroundColor: '#09090b', borderRadius: '16px', width: '100%', maxWidth: '700px', border: '1px solid #27272a', boxShadow: '0 0 40px rgba(59, 130, 246, 0.1), 0 0 0 1px rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ position: 'relative' }}>
              {selectedNews.imageUrl ? (
                <img src={selectedNews.imageUrl} alt={selectedNews.title} style={{ width: '100%', height: '300px', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ width: '100%', height: '200px', backgroundColor: '#18181b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3f3f46' }}>
                  <Newspaper size={64} />
                </div>
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(9,9,11,0) 50%, rgba(9,9,11,1) 100%)' }} />
              <button onClick={() => setSelectedNews(null)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', zIndex: 10 }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '32px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ backgroundColor: '#2563eb', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Notícias
                </span>
                <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>
                  {formatDate(selectedNews.publishedAt || selectedNews.createdAt, locale, copy.fallbackDate)}
                </span>
              </div>
              <h2 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '24px', letterSpacing: '-0.02em' }}>
                {selectedNews.title}
              </h2>
              <div style={{ color: '#d4d4d8', fontSize: '1.05rem', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {selectedNews.body || selectedNews.summary || 'Conteúdo da notícia indisponível.'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
