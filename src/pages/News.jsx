import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ExternalLink, ImageOff, Newspaper, PlayCircle, RefreshCcw } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';
import { useStore } from '../hooks/useStore';
import { socialMediaService } from '../services/socialMediaService';
import { buildProfileShareCode } from '../utils/profileShare';
import './News.css';
import bgHero from '../assets/jiu_jitsu_community_bg.png';
import defaultNewsCover from '../../img/filmmaker-venue.jpg';

const INSTAGRAM_FEED_CACHE_KEY = 'genesis_public_instagram_feed_v1';
const INSTAGRAM_FEED_CACHE_LIMIT = 10;
const SOCIAL_MEDIA_RETRY_TIMEOUT_MS = 5000;

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

const truncateText = (value, maxLength = 180) => {
  const text = (value || '').toString().trim();
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
};

const normalizeText = (value) => (value || '').toString().trim().toLowerCase();

const getNewsTag = (item, index = 0) => {
  const source = normalizeText(`${item?.category || ''} ${item?.title || ''} ${item?.summary || ''}`);
  if (source.includes('ranking') || source.includes('pontua')) {
    return { label: 'RANKING', className: 'tag-rank' };
  }
  if (source.includes('inscri') || source.includes('temporada') || source.includes('comunicado') || source.includes('regra')) {
    return { label: 'COMUNICADO', className: 'tag-info' };
  }
  if (index === 0 || source.includes('cobertura') || source.includes('campeonato') || source.includes('luta')) {
    return { label: 'COBERTURA', className: 'tag-live' };
  }
  return { label: 'NOTICIA', className: 'tag-info' };
};

const getReadMinutes = (item) => {
  const words = `${item?.title || ''} ${item?.summary || ''} ${item?.body || ''}`.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.ceil(words / 180));
};

const normalizeInstagramPosts = (value, limit = INSTAGRAM_FEED_CACHE_LIMIT) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === 'object')
    .slice(0, limit);
};

const loadCachedInstagramPosts = () => {
  try {
    const raw = window.localStorage.getItem(INSTAGRAM_FEED_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return normalizeInstagramPosts(parsed, INSTAGRAM_FEED_CACHE_LIMIT);
  } catch {
    return [];
  }
};

const saveCachedInstagramPosts = (posts) => {
  try {
    const normalized = normalizeInstagramPosts(posts, INSTAGRAM_FEED_CACHE_LIMIT);
    window.localStorage.setItem(INSTAGRAM_FEED_CACHE_KEY, JSON.stringify(normalized));
  } catch {
    // Ignora falha de storage para não quebrar a renderização.
  }
};

const removeByKey = (value, key) => {
  if (!value || typeof value !== 'object') return value;
  if (!Object.prototype.hasOwnProperty.call(value, key)) return value;
  const next = { ...value };
  delete next[key];
  return next;
};

const News = () => {
  const { locale, uiVariant } = useI18n();
  const {
    news,
    athletes = [],
    memberProfiles = [],
    events = []
  } = useStore();
  const [instagramPosts, setInstagramPosts] = useState(() => loadCachedInstagramPosts());
  const [socialLoading, setSocialLoading] = useState(true);
  const [socialError, setSocialError] = useState('');
  const [mediaRenderModeByPostKey, setMediaRenderModeByPostKey] = useState({});
  const [mediaRetryTickByPostKey, setMediaRetryTickByPostKey] = useState({});
  const [mediaRetryingByPostKey, setMediaRetryingByPostKey] = useState({});
  const [mediaRetryTimedOutByPostKey, setMediaRetryTimedOutByPostKey] = useState({});
  const [canScrollSocialPrev, setCanScrollSocialPrev] = useState(false);
  const [canScrollSocialNext, setCanScrollSocialNext] = useState(false);
  const [isSocialCarouselHovered, setIsSocialCarouselHovered] = useState(false);
  const [isSocialDragging, setIsSocialDragging] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [isMobileNewsOpenMode, setIsMobileNewsOpenMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 980px), (pointer: coarse)').matches;
  });
  const socialFeedRef = React.useRef(null);
  const mediaRetryTimeoutRef = React.useRef({});
  const socialDragRef = React.useRef({
    active: false,
    moved: false,
    startX: 0,
    startScrollLeft: 0
  });
  const copyByLanguage = {
    pt: {
      kicker: 'Notícias',
      title: 'Atualizações e comunicados oficiais.',
      description:
        'Conteúdo institucional para atletas, academias e organizadores. Informações oficiais sobre ranking, eventos e sistema.',
      fallbackDate: 'Data a confirmar',
      emptyNews: 'Nenhuma notícia publicada até o momento. Publique uma no painel administrativo.',
      socialKicker: 'Mídias sociais',
      socialTitle: 'Últimas publicações do Instagram da Genesis Esporte',
      socialOpenProfile: 'Abrir perfil no Instagram',
      socialOpenPost: 'Abrir post',
      socialSource: 'Instagram',
      socialCaptionFallback: 'Atualização da Genesis Esporte',
      socialImageUnavailable: 'Imagem indisponível',
      socialRetryMedia: 'Tentar novamente',
      socialRetryingMedia: 'Tentando...',
      socialRetryTimeout: 'Não foi possível carregar a imagem.',
      socialLoading: 'Carregando as últimas publicações do Instagram...',
      socialEmpty: 'Nenhuma publicação do Instagram disponível no momento.',
      socialError: 'Feed do Instagram indisponível no momento.',
      socialPrev: 'Posts anteriores',
      socialNext: 'Próximos posts',
      openFullNewsHint: 'Clique duas vezes para ler a notícia completa',
      openFullNewsHintMobile: 'Toque para ler a notícia completa',
      openFullNews: 'Abrir notícia completa',
      closeModal: 'Fechar'
    },
    en: {
      kicker: 'News',
      title: 'Updates and official announcements.',
      description:
        'Institutional content for athletes, academies and organizers. Keep everyone informed about ranking and events.',
      fallbackDate: 'Date TBD',
      emptyNews: 'No news published yet. Create one in admin panel.',
      socialKicker: 'Social media',
      socialTitle: 'Latest posts from Genesis Instagram',
      socialOpenProfile: 'Open Instagram profile',
      socialOpenPost: 'Open post',
      socialSource: 'Instagram',
      socialCaptionFallback: 'Genesis Esportes update',
      socialImageUnavailable: 'Unable to load image',
      socialRetryMedia: 'Retry',
      socialRetryingMedia: 'Retrying...',
      socialRetryTimeout: 'Could not load image.',
      socialLoading: 'Loading latest Instagram posts...',
      socialEmpty: 'No Instagram posts available yet.',
      socialError: 'Instagram feed unavailable right now.',
      socialPrev: 'Previous posts',
      socialNext: 'Next posts',
      openFullNewsHint: 'Double-click to read full news',
      openFullNewsHintMobile: 'Tap to read full news',
      openFullNews: 'Open full news',
      closeModal: 'Close'
    },
    es: {
      kicker: 'Noticias',
      title: 'Actualizaciones y comunicados oficiales.',
      description:
        'Contenido institucional para atletas, academias y organizadores. Informacion oficial sobre ranking, eventos y sistema.',
      fallbackDate: 'Fecha por confirmar',
      emptyNews: 'Todavia no hay noticias publicadas. Cree una en el panel administrativo.',
      socialKicker: 'Redes sociales',
      socialTitle: 'Ultimas publicaciones de Instagram de Genesis Esporte',
      socialOpenProfile: 'Abrir perfil en Instagram',
      socialOpenPost: 'Abrir publicacion',
      socialSource: 'Instagram',
      socialCaptionFallback: 'Actualizacion de Genesis Esporte',
      socialImageUnavailable: 'Imagen no disponible',
      socialRetryMedia: 'Reintentar',
      socialRetryingMedia: 'Reintentando...',
      socialRetryTimeout: 'No se pudo cargar la imagen.',
      socialLoading: 'Cargando las ultimas publicaciones de Instagram...',
      socialEmpty: 'No hay publicaciones de Instagram disponibles por ahora.',
      socialError: 'El feed de Instagram no esta disponible en este momento.',
      socialPrev: 'Publicaciones anteriores',
      socialNext: 'Siguientes publicaciones',
      openFullNewsHint: 'Doble clic para abrir la noticia completa',
      openFullNewsHintMobile: 'Toque para abrir la noticia completa',
      openFullNews: 'Abrir noticia completa',
      closeModal: 'Cerrar'
    },
    fr: {
      kicker: 'Actualites',
      title: 'Mises a jour et annonces officielles.',
      description:
        'Contenu institutionnel pour athletes, academies et organisateurs. Informations officielles sur le classement, les evenements et le systeme.',
      fallbackDate: 'Date a confirmer',
      emptyNews: 'Aucune actualite publiee pour le moment. Publiez-en une dans le panneau admin.',
      socialKicker: 'Reseaux sociaux',
      socialTitle: 'Dernieres publications Instagram de Genesis Esporte',
      socialOpenProfile: 'Ouvrir le profil Instagram',
      socialOpenPost: 'Ouvrir la publication',
      socialSource: 'Instagram',
      socialCaptionFallback: 'Mise a jour Genesis Esporte',
      socialImageUnavailable: 'Image indisponible',
      socialRetryMedia: 'Reessayer',
      socialRetryingMedia: 'Nouvelle tentative...',
      socialRetryTimeout: 'Impossible de charger l image.',
      socialLoading: 'Chargement des dernieres publications Instagram...',
      socialEmpty: 'Aucune publication Instagram disponible pour le moment.',
      socialError: 'Le flux Instagram est indisponible pour le moment.',
      socialPrev: 'Publications precedentes',
      socialNext: 'Publications suivantes',
      openFullNewsHint: 'Double-cliquez pour lire l actualite complete',
      openFullNewsHintMobile: 'Touchez pour lire l actualite complete',
      openFullNews: 'Ouvrir l actualite complete',
      closeModal: 'Fermer'
    }
  };
  const copy = copyByLanguage[uiVariant] || copyByLanguage.pt;

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const media = window.matchMedia('(max-width: 980px), (pointer: coarse)');
    const updateMode = () => setIsMobileNewsOpenMode(media.matches);
    updateMode();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', updateMode);
      return () => media.removeEventListener('change', updateMode);
    }
    media.addListener(updateMode);
    return () => media.removeListener(updateMode);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    let retryTimer = null;
    const scheduleRetry = () => {
      if (cancelled) return;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
      retryTimer = window.setTimeout(() => {
        if (!cancelled) {
          loadInstagramPosts();
        }
      }, 15000);
    };

    const loadInstagramPosts = async () => {
      setSocialLoading(true);
      setSocialError('');

      try {
        const payload = await socialMediaService.listInstagramPosts(10, { refresh: true });
        if (cancelled) return;
        const normalized = normalizeInstagramPosts(payload, INSTAGRAM_FEED_CACHE_LIMIT);
        setInstagramPosts(normalized);
        if (normalized.length > 0) {
          saveCachedInstagramPosts(normalized);
        } else {
          scheduleRetry();
        }
      } catch {
        if (cancelled) return;
        const cached = loadCachedInstagramPosts();
        setInstagramPosts(cached);
        if (!cached.length) {
          setSocialError(copy.socialError);
          scheduleRetry();
        }
      } finally {
        if (!cancelled) {
          setSocialLoading(false);
        }
      }
    };

    loadInstagramPosts();
    return () => {
      cancelled = true;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [copy.socialError]);

  const items = useMemo(() => (
    [...news]
      .sort((a, b) => {
        const aTime = parseDate(a.publishedAt || a.createdAt)?.getTime() || 0;
        const bTime = parseDate(b.publishedAt || b.createdAt)?.getTime() || 0;
        return bTime - aTime;
      })
  ), [news]);

  const socialItems = useMemo(() => (
    [...instagramPosts]
      .sort((a, b) => {
        const aTime = parseDate(a.publishedAt)?.getTime() || 0;
        const bTime = parseDate(b.publishedAt)?.getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, 10)
  ), [instagramPosts]);

  const athleteMentionTargets = useMemo(() => {
    const map = new Map();

    memberProfiles.forEach((profile) => {
      const name = (profile?.fullName || profile?.name || '').toString().trim();
      if (!name || name.length < 5) return;
      const code = buildProfileShareCode({
        profileId: profile.id,
        fullName: profile.fullName,
        academyName: profile.academyName,
        birthDate: profile.birthDate
      });
      map.set(normalizeText(name), {
        name,
        to: `/perfil-publico?codigo=${encodeURIComponent(code)}`
      });
    });

    athletes.forEach((athlete) => {
      const name = (athlete?.nome || athlete?.name || athlete?.fullName || '').toString().trim();
      const id = athlete?.id || athlete?.profileId;
      if (!name || name.length < 5 || !id || map.has(normalizeText(name))) return;
      map.set(normalizeText(name), {
        name,
        to: `/perfil/${encodeURIComponent(id)}`
      });
    });

    return [...map.values()].sort((left, right) => right.name.length - left.name.length);
  }, [athletes, memberProfiles]);

  const getMentionedFutureEvent = React.useCallback((item) => {
    const text = normalizeText(`${item?.title || ''} ${item?.summary || ''} ${item?.body || ''}`);
    if (!text) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events.find((event) => {
      const eventName = normalizeText(event?.name || event?.title || '');
      if (!eventName || !text.includes(eventName)) return false;
      const date = parseDate(event?.date || event?.startDate);
      return !date || date >= today;
    }) || null;
  }, [events]);

  const renderSmartNewsText = React.useCallback((value) => {
    const text = (value || '').toString();
    if (!text || !athleteMentionTargets.length) return text;

    const parts = [];
    let cursor = 0;
    const lowerText = normalizeText(text);

    while (cursor < text.length) {
      let nextMatch = null;
      athleteMentionTargets.forEach((target) => {
        const index = lowerText.indexOf(normalizeText(target.name), cursor);
        if (index === -1) return;
        if (!nextMatch || index < nextMatch.index || (index === nextMatch.index && target.name.length > nextMatch.target.name.length)) {
          nextMatch = { index, target };
        }
      });

      if (!nextMatch) {
        parts.push(text.slice(cursor));
        break;
      }

      if (nextMatch.index > cursor) {
        parts.push(text.slice(cursor, nextMatch.index));
      }

      const matchedText = text.slice(nextMatch.index, nextMatch.index + nextMatch.target.name.length);
      parts.push(
        <Link className="news-smart-link" to={nextMatch.target.to} key={`${nextMatch.target.to}-${nextMatch.index}`}>
          {matchedText}
        </Link>
      );
      cursor = nextMatch.index + nextMatch.target.name.length;
    }

    return parts;
  }, [athleteMentionTargets]);

  const openFullNews = React.useCallback((item) => {
    if (!item || typeof item !== 'object') return;
    setSelectedNews(item);
  }, []);

  const closeFullNews = React.useCallback(() => {
    setSelectedNews(null);
  }, []);

  React.useEffect(() => {
    if (!selectedNews) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeFullNews();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNews, closeFullNews]);

  React.useEffect(() => {
    Object.values(mediaRetryTimeoutRef.current).forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    mediaRetryTimeoutRef.current = {};
    setMediaRenderModeByPostKey({});
    setMediaRetryTickByPostKey({});
    setMediaRetryingByPostKey({});
    setMediaRetryTimedOutByPostKey({});
  }, [socialItems]);

  const clearMediaRetryTimeout = React.useCallback((postKey) => {
    const key = (postKey || '').toString();
    if (!key) return;
    const timerId = mediaRetryTimeoutRef.current[key];
    if (!timerId) return;
    window.clearTimeout(timerId);
    delete mediaRetryTimeoutRef.current[key];
  }, []);

  const clearMediaRetryFlags = React.useCallback((postKey) => {
    const key = (postKey || '').toString();
    if (!key) return;
    clearMediaRetryTimeout(key);
    setMediaRetryingByPostKey((prev) => removeByKey(prev, key));
    setMediaRetryTimedOutByPostKey((prev) => removeByKey(prev, key));
  }, [clearMediaRetryTimeout]);

  React.useEffect(() => () => {
    Object.values(mediaRetryTimeoutRef.current).forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    mediaRetryTimeoutRef.current = {};
  }, []);

  const retrySocialMediaCover = React.useCallback((postKey) => {
    const key = (postKey || '').toString();
    if (!key) return;
    clearMediaRetryTimeout(key);
    setMediaRetryTimedOutByPostKey((prev) => removeByKey(prev, key));
    setMediaRenderModeByPostKey((prev) => ({ ...prev, [key]: 'direct' }));
    setMediaRetryTickByPostKey((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
    setMediaRetryingByPostKey((prev) => ({ ...prev, [key]: true }));
    mediaRetryTimeoutRef.current[key] = window.setTimeout(() => {
      clearMediaRetryTimeout(key);
      setMediaRenderModeByPostKey((prev) => ({ ...prev, [key]: 'failed' }));
      setMediaRetryingByPostKey((prev) => removeByKey(prev, key));
      setMediaRetryTimedOutByPostKey((prev) => ({ ...prev, [key]: true }));
    }, SOCIAL_MEDIA_RETRY_TIMEOUT_MS);
  }, [clearMediaRetryTimeout]);

  const updateSocialScrollState = React.useCallback(() => {
    const feed = socialFeedRef.current;
    if (!feed) {
      setCanScrollSocialPrev(false);
      setCanScrollSocialNext(false);
      return;
    }
    const hasOverflow = (feed.scrollWidth - feed.clientWidth) > 8;
    if (!hasOverflow) {
      setCanScrollSocialPrev(false);
      setCanScrollSocialNext(false);
      return;
    }
    setCanScrollSocialPrev(feed.scrollLeft > 6);
    setCanScrollSocialNext((feed.scrollLeft + feed.clientWidth) < (feed.scrollWidth - 6));
  }, []);

  const scrollSocialFeed = React.useCallback((direction) => {
    const feed = socialFeedRef.current;
    if (!feed) return;
    const step = Math.max(280, Math.floor(feed.clientWidth * 0.78));
    feed.scrollBy({
      left: direction === 'next' ? step : -step,
      behavior: 'smooth'
    });
  }, []);

  const endSocialDrag = React.useCallback(() => {
    if (!socialDragRef.current.active) return;
    socialDragRef.current.active = false;
    setIsSocialDragging(false);
    window.setTimeout(() => {
      socialDragRef.current.moved = false;
    }, 0);
  }, []);

  const handleSocialMouseDown = React.useCallback((event) => {
    if (event.button !== 0) return;
    if (typeof window === 'undefined' || window.innerWidth < 1024) return;
    const feed = socialFeedRef.current;
    if (!feed) return;
    if ((feed.scrollWidth - feed.clientWidth) <= 8) return;

    socialDragRef.current.active = true;
    socialDragRef.current.moved = false;
    socialDragRef.current.startX = event.clientX;
    socialDragRef.current.startScrollLeft = feed.scrollLeft;
    setIsSocialDragging(true);
    event.preventDefault();
  }, []);

  const handleSocialMouseMove = React.useCallback((event) => {
    const feed = socialFeedRef.current;
    if (!feed || !socialDragRef.current.active) return;

    const delta = event.clientX - socialDragRef.current.startX;
    if (Math.abs(delta) > 3) {
      socialDragRef.current.moved = true;
    }
    feed.scrollLeft = socialDragRef.current.startScrollLeft - delta;
    updateSocialScrollState();

    if (socialDragRef.current.moved) {
      event.preventDefault();
    }
  }, [updateSocialScrollState]);

  const handleSocialClickCapture = React.useCallback((event) => {
    if (!socialDragRef.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  React.useEffect(() => {
    const feed = socialFeedRef.current;
    if (!feed) return undefined;
    updateSocialScrollState();

    const onScroll = () => updateSocialScrollState();
    const onResize = () => updateSocialScrollState();
    feed.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const raf = window.requestAnimationFrame(updateSocialScrollState);

    return () => {
      window.cancelAnimationFrame(raf);
      feed.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [socialItems.length, socialLoading, updateSocialScrollState]);

  React.useEffect(() => {
    if (!isSocialCarouselHovered) return undefined;

    const handleKeyDown = (event) => {
      const key = event?.key;
      if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;

      const target = event?.target;
      const tagName = (target?.tagName || '').toString().toLowerCase();
      const isTypingField = Boolean(
        target?.isContentEditable
        || tagName === 'input'
        || tagName === 'textarea'
        || tagName === 'select'
      );
      if (isTypingField) return;

      event.preventDefault();
      scrollSocialFeed(key === 'ArrowRight' ? 'next' : 'prev');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSocialCarouselHovered, scrollSocialFeed]);

  React.useEffect(() => {
    if (!isSocialDragging) return undefined;

    const onMouseUp = () => endSocialDrag();
    const onWindowBlur = () => endSocialDrag();
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('blur', onWindowBlur);
    return () => {
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [isSocialDragging, endSocialDrag]);

  const featuredNews = items[0] || null;
  const secondaryNews = items.slice(1);
  const selectedMentionedEvent = selectedNews ? getMentionedFutureEvent(selectedNews) : null;

  return (
    <div className="public-page news-page" style={{ padding: 0 }}>
      <section className="news-portal-container" style={{ paddingLeft: 'clamp(1.5rem, 4vw, 4rem)', paddingRight: 'clamp(1.5rem, 4vw, 4rem)' }}>
        <div className="news-header" style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)', paddingLeft: 'clamp(1.5rem, 4vw, 4rem)', paddingRight: 'clamp(1.5rem, 4vw, 4rem)' }}>
          <img
            src={bgHero}
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 30%',
              opacity: 0.25,
              pointerEvents: 'none',
              zIndex: 0,
              filter: 'grayscale(30%)'
            }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(5,7,11,0.95) 0%, rgba(5,7,11,0.7) 50%, rgba(5,7,11,0.3) 100%)',
            pointerEvents: 'none',
            zIndex: 1,
          }} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <span className="section-kicker" style={{ color: '#00c2cb' }}>{copy.kicker}</span>
            <h2>Genesis Newsroom</h2>
            <p>{copy.description}</p>
          </div>
        </div>

        {items.length ? (
          <div className="news-main-grid">
            {featuredNews && (() => {
              const tag = getNewsTag(featuredNews, 0);
              return (
                <article
                  className="news-card news-card--interactive featured-news"
                  key={featuredNews.id}
                  role="button"
                  tabIndex={0}
                  aria-label={copy.openFullNews}
                  onClick={() => openFullNews(featuredNews)}
                  onDoubleClick={() => openFullNews(featuredNews)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openFullNews(featuredNews);
                    }
                  }}
                >
                  <div className="news-image-wrapper">
                    <img src={featuredNews.imageUrl || defaultNewsCover} alt={featuredNews.title} loading="lazy" />
                  </div>
                  <div className="news-content-overlay">
                    <span className={`news-tag ${tag.className}`}>{tag.label}</span>
                    <h3>{featuredNews.title}</h3>
                    <p>{featuredNews.summary}</p>
                    <div className="news-meta">
                      {formatDate(featuredNews.publishedAt || featuredNews.createdAt, locale, copy.fallbackDate)}
                      {' '}• {getReadMinutes(featuredNews)} min de leitura
                    </div>
                  </div>
                </article>
              );
            })()}

            {secondaryNews.map((item, index) => {
              const tag = getNewsTag(item, index + 1);
              return (
                <article
                  className="news-card news-card--interactive standard-news"
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-label={copy.openFullNews}
                  onClick={() => openFullNews(item)}
                  onDoubleClick={() => openFullNews(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openFullNews(item);
                    }
                  }}
                >
                  <div className="news-image-wrapper">
                    <img src={item.imageUrl || defaultNewsCover} alt={item.title} loading="lazy" />
                  </div>
                  <div className="news-content">
                    <span className={`news-tag ${tag.className}`}>{tag.label}</span>
                    <h4>{item.title}</h4>
                    <p>{truncateText(item.summary, 132)}</p>
                    <div className="news-meta">
                      {formatDate(item.publishedAt || item.createdAt, locale, copy.fallbackDate)}
                      {' '}• {getReadMinutes(item)} min de leitura
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">{copy.emptyNews}</div>
        )}
      </section>

      {selectedNews && (
        <>
          <div className="modal-backdrop" onClick={closeFullNews} />
          <div className="modal-card" role="dialog" aria-modal="true" aria-label={selectedNews.title || copy.openFullNews}>
            <article className="modal-panel modal-panel--wide news-read-modal">
              <div className="modal-header">
                <div className="modal-title">{selectedNews.title}</div>
                <button type="button" className="btn btn-ghost" onClick={closeFullNews}>
                  {copy.closeModal}
                </button>
              </div>
              {selectedNews.imageUrl && (
                <div className="news-read-modal__cover">
                  <img src={selectedNews.imageUrl} alt={selectedNews.title || copy.openFullNews} loading="lazy" />
                </div>
              )}
              <div className="news-card__meta">
                {formatDate(selectedNews.publishedAt || selectedNews.createdAt, locale, copy.fallbackDate)}
              </div>
              <div className={`news-read-modal__body ${selectedMentionedEvent ? 'has-event-widget' : ''}`}>
                <p className="news-read-modal__summary">
                  {renderSmartNewsText(selectedNews.body || selectedNews.summary || '')}
                </p>
                {selectedMentionedEvent && (
                  <aside className="news-event-widget">
                    <span>Inscricoes abertas</span>
                    <strong>{selectedMentionedEvent.name || selectedMentionedEvent.title}</strong>
                    <p>{formatDate(selectedMentionedEvent.date || selectedMentionedEvent.startDate, locale, copy.fallbackDate)}</p>
                    <Link className="btn btn-primary" to={`/eventos/${selectedMentionedEvent.id}/inscricao`}>
                      Garantir vaga
                    </Link>
                  </aside>
                )}
              </div>
            </article>
          </div>
        </>
      )}

      <section className="public-section" id="midias-sociais">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{copy.socialKicker}</span>
            <h2>{copy.socialTitle}</h2>
          </div>
          <a
            className="text-link"
            href="https://www.instagram.com/genesis_esportes/"
            target="_blank"
            rel="noreferrer"
          >
            {copy.socialOpenProfile}
          </a>
        </div>

        <div
          className={`social-feed-carousel ${isSocialDragging ? 'is-dragging' : ''}`}
          onMouseEnter={() => setIsSocialCarouselHovered(true)}
          onMouseLeave={() => {
            setIsSocialCarouselHovered(false);
            endSocialDrag();
          }}
        >
          {!socialLoading && socialItems.length > 0 && (
            <>
              <button
                type="button"
                className="social-feed-arrow social-feed-arrow--prev"
                onClick={() => scrollSocialFeed('prev')}
                disabled={!canScrollSocialPrev}
                aria-label={copy.socialPrev}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="social-feed-arrow social-feed-arrow--next"
                onClick={() => scrollSocialFeed('next')}
                disabled={!canScrollSocialNext}
                aria-label={copy.socialNext}
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}

          <div
            className={`social-media-grid ${isSocialDragging ? 'is-dragging' : ''}`}
            ref={socialFeedRef}
            onMouseDown={handleSocialMouseDown}
            onMouseMove={handleSocialMouseMove}
            onMouseUp={endSocialDrag}
            onClickCapture={handleSocialClickCapture}
          >
            {socialLoading && (
              <div className="skeleton-row" aria-label={copy.socialLoading}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div className="skeleton-card" key={`social-skeleton-${index}`}>
                    <div className="skeleton-card__media" />
                    <div className="skeleton-line skeleton-line--meta" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line skeleton-line--short" />
                  </div>
                ))}
              </div>
            )}

            {!socialLoading && socialItems.length > 0 && (
              socialItems.map((item) => {
                const mediaType = (item.mediaType || '').toString().toUpperCase();
                const isVideo = mediaType.includes('VIDEO') || mediaType.includes('REEL');
                const rawCoverUrl = (item.thumbnailUrl || item.mediaUrl || '').toString().trim();
                const proxiedCoverUrl = socialMediaService.resolveInstagramMediaUrl(rawCoverUrl);
                const publicProxyCoverUrl = socialMediaService.resolveInstagramMediaPublicProxyUrl(rawCoverUrl);
                const permalink = item.permalink || 'https://www.instagram.com/genesis_esportes/';
                const postKey = item.id || permalink;
                const mode = mediaRenderModeByPostKey[postKey] || 'direct';
                const canFallbackToProxy = Boolean(rawCoverUrl) && Boolean(proxiedCoverUrl) && rawCoverUrl !== proxiedCoverUrl;
                const canFallbackToPublic = Boolean(publicProxyCoverUrl)
                  && publicProxyCoverUrl !== rawCoverUrl
                  && publicProxyCoverUrl !== proxiedCoverUrl;
                const baseCoverUrl = mode === 'proxy'
                  ? proxiedCoverUrl
                  : mode === 'public'
                    ? publicProxyCoverUrl
                    : rawCoverUrl;
                const retryTick = mediaRetryTickByPostKey[postKey] || 0;
                const isRetryingMedia = Boolean(mediaRetryingByPostKey[postKey]);
                const isRetryTimedOut = Boolean(mediaRetryTimedOutByPostKey[postKey]);
                const resolveNextMode = (currentMode) => {
                  const normalizedMode = (currentMode || 'direct').toString();
                  if (normalizedMode === 'direct') {
                    if (canFallbackToProxy) return 'proxy';
                    if (canFallbackToPublic) return 'public';
                    return 'failed';
                  }
                  if (normalizedMode === 'proxy') {
                    if (canFallbackToPublic) return 'public';
                    return 'failed';
                  }
                  return 'failed';
                };
                const coverUrl = retryTick > 0 && baseCoverUrl
                  ? `${baseCoverUrl}${baseCoverUrl.includes('?') ? '&' : '?'}retry=${retryTick}`
                  : baseCoverUrl;
                const hasUsableCover = Boolean(baseCoverUrl) && mode !== 'failed';
                const caption = truncateText(item.caption, 180) || copy.socialCaptionFallback;
                return (
                  <a href={permalink} target="_blank" rel="noreferrer" className="social-card" key={postKey} aria-label={copy.socialOpenPost}>
                    {hasUsableCover ? (
                      <img
                        src={coverUrl}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onLoad={() => clearMediaRetryFlags(postKey)}
                        onError={() => {
                          const nextMode = resolveNextMode(mode);
                          setMediaRenderModeByPostKey((prev) => {
                            const currentMode = prev[postKey] || 'direct';
                            const computedNextMode = resolveNextMode(currentMode);
                            if (currentMode === computedNextMode) return prev;
                            return { ...prev, [postKey]: computedNextMode };
                          });
                          if (nextMode === 'failed') clearMediaRetryFlags(postKey);
                        }}
                      />
                    ) : (
                      <div className="social-card-fallback">
                        <Newspaper size={48} />
                        <span>{isRetryTimedOut ? copy.socialRetryTimeout : copy.socialImageUnavailable}</span>
                      </div>
                    )}
                    
                    <div className="social-card__icon">
                      {isVideo ? <PlayCircle size={24} /> : <ExternalLink size={24} />}
                    </div>

                    <div className="social-card__overlay">
                      <p className="social-card__caption">{caption}</p>
                      <div className="news-meta" style={{ marginTop: '12px' }}>
                        {formatDate(item.publishedAt, locale, copy.fallbackDate)}
                      </div>
                    </div>
                  </a>
                );
              })
            )}

            {!socialLoading && !socialItems.length && (
              <div className="empty-state">{socialError || copy.socialEmpty}</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default News;
