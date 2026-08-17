import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ExternalLink, ImageOff, Newspaper, PlayCircle, RefreshCcw, Network } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
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

  const navigate = useNavigate();

  const isBracketNews = React.useCallback((item) => {
    if (!item) return false;
    const title = (item.title || '').toLowerCase();
    const summary = (item.summary || '').toLowerCase();
    const body = (item.body || '').toLowerCase();
    const tags = Array.isArray(item.tags) ? item.tags.map(t => String(t).toLowerCase()) : [];
    return (
      tags.includes('chaveamento') ||
      tags.includes('chaveamentos') ||
      title.includes('chaveamento') ||
      title.includes('chaveamentos') ||
      title.includes('chaves') ||
      summary.includes('chaveamento') ||
      body.includes('chaveamento')
    );
  }, []);

  const resolveBracketEventId = React.useCallback((item) => {
    if (!item) return null;
    if (item.eventId) return item.eventId;
    if (item.event_id) return item.event_id;
    const title = (item.title || '').toLowerCase();
    const body = (item.body || '').toLowerCase();
    const summary = (item.summary || '').toLowerCase();
    const found = (events || []).find((e) => {
      if (!e || !e.name) return false;
      const name = e.name.trim().toLowerCase();
      return title.includes(name) || body.includes(name) || summary.includes(name);
    });
    return found ? found.id : null;
  }, [events]);

  const openFullNews = React.useCallback((item) => {
    if (!item || typeof item !== 'object') return;
    setSelectedNews(item);
  }, []);

  const closeFullNews = React.useCallback(() => {
    setSelectedNews(null);
  }, []);

  const handleViewBrackets = React.useCallback(() => {
    const targetId = resolveBracketEventId(selectedNews);
    if (!targetId) return;
    closeFullNews();
    navigate(`/eventos/${targetId}?tab=brackets`);
  }, [selectedNews, resolveBracketEventId, closeFullNews, navigate]);

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

  const selectedMentionedEvent = selectedNews ? getMentionedFutureEvent(selectedNews) : null;

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const currentItems = items.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getPaginationGroup = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages - 1, totalPages);
      } else if (currentPage > totalPages - 4) {
        pages.push(1, 2, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="public-page news-page">
      <section className="news-portal-container">
        <header className="news-header-simple">
          <h1 className="news-title-simple">News</h1>
        </header>

        {items.length ? (
          <>
            <div className="news-main-grid">
              {currentItems.map((item, index) => (
                <article
                  className="news-card-simple"
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
                  <div className="news-card-image">
                    <img src={item.imageUrl || defaultNewsCover} alt={item.title} loading="lazy" />
                  </div>
                  <div className="news-card-content">
                    <h3 className="news-card-headline">{item.title}</h3>
                  </div>
                </article>
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="news-pagination-container">
                <div className="news-pagination">
                  <button 
                    className="page-btn nav-btn" 
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    &lt;
                  </button>
                  
                  {getPaginationGroup().map((page, idx) => (
                    page === '...' ? (
                      <span key={`dots-${idx}`} className="page-btn dots">...</span>
                    ) : (
                      <button
                        key={page}
                        className={`page-btn ${currentPage === page ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    )
                  ))}
                  
                  <button 
                    className="page-btn nav-btn" 
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    &gt;
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">{copy.emptyNews}</div>
        )}
      </section>

      {selectedNews && (
        <div className="news-fullscreen-reader" role="dialog" aria-modal="true">
          <button type="button" className="news-reader-close-btn" onClick={closeFullNews} aria-label={copy.closeModal}>
            ✕
          </button>
          
          <div className="news-reader-header-dark">
            <img src={selectedNews.imageUrl || defaultNewsCover} alt={selectedNews.title || copy.openFullNews} loading="lazy" />
          </div>
          
          <div className="news-reader-content-white">
            <div className="news-reader-content-inner">
              <h1 className="news-reader-title">{selectedNews.title}</h1>
              <div className="news-reader-date">
                {formatDate(selectedNews.publishedAt || selectedNews.createdAt, locale, copy.fallbackDate)}
              </div>
              
              <div className={`news-reader-body ${selectedMentionedEvent ? 'has-event-widget' : ''}`}>
                <p className="news-reader-text">
                  {renderSmartNewsText(selectedNews.body || selectedNews.summary || '')}
                </p>

                {(() => {
                  const isBracket = isBracketNews(selectedNews);
                  const targetId = resolveBracketEventId(selectedNews);
                  if (!targetId) return null;

                  const matchedEvent = (events || []).find(e => e.id === targetId);

                  let label = 'Ver Detalhes do Evento';
                  let targetUrl = `/eventos/${targetId}`;

                  if (isBracket) {
                    label = 'Ver Chaveamentos';
                    targetUrl = `/eventos/${targetId}?tab=brackets`;
                  } else if (matchedEvent) {
                    if (matchedEvent.registrationOpen !== false) {
                      label = 'Garantir Vaga';
                      targetUrl = `/eventos/${targetId}/inscricao`;
                    } else {
                      label = 'Ver Detalhes do Evento';
                      targetUrl = `/eventos/${targetId}`;
                    }
                  }

                  return (
                    <div className="news-bracket-cta">
                      <button
                        type="button"
                        className="news-bracket-cta-btn"
                        onClick={() => {
                          closeFullNews();
                          navigate(targetUrl);
                        }}
                      >
                        {label}
                      </button>
                    </div>
                  );
                })()}
                
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default News;
