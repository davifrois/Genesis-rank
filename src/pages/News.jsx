import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, ImageOff, PlayCircle, RefreshCcw } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';
import { useStore } from '../hooks/useStore';
import { socialMediaService } from '../services/socialMediaService';

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
  const { language, locale } = useI18n();
  const { news } = useStore();
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
  const isEnglish = language === 'en-US';
  const copy = isEnglish
    ? {
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
      }
    : {
        kicker: 'Notícias',
        title: 'Atualizações e comunicados oficiais.',
        description:
          'Conteúdo institucional para atletas, academias e organizadores. Informações oficiais sobre ranking, eventos e sistema.',
        fallbackDate: 'Data a confirmar',
        emptyNews: 'Nenhuma notícia publicada até o momento. Publique uma no painel administrativo.',
        socialKicker: 'Mídias sociais',
        socialTitle: 'Últimas publicações do Instagram da Genesis Esportes',
        socialOpenProfile: 'Abrir perfil no Instagram',
        socialOpenPost: 'Abrir post',
        socialSource: 'Instagram',
        socialCaptionFallback: 'Atualização da Genesis Esportes',
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
      };

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
        <div className="news-grid">
          {items.length ? (
            items.map((item) => (
              <article
                className="news-card news-card--interactive"
                key={item.id}
                role="button"
                tabIndex={0}
                aria-label={copy.openFullNews}
                onClick={() => {
                  if (isMobileNewsOpenMode) {
                    openFullNews(item);
                  }
                }}
                onDoubleClick={() => openFullNews(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openFullNews(item);
                  }
                }}
              >
                <div className={`news-card__cover ${item.imageUrl ? '' : 'news-card__cover--fallback'}`.trim()}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} loading="lazy" />
                  ) : (
                    <span>{copy.kicker}</span>
                  )}
                </div>
                <div className="news-card__meta">
                  {formatDate(item.publishedAt || item.createdAt, locale, copy.fallbackDate)}
                </div>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <span className="news-card__hint">
                  {isMobileNewsOpenMode ? copy.openFullNewsHintMobile : copy.openFullNewsHint}
                </span>
              </article>
            ))
          ) : (
            <div className="empty-state">{copy.emptyNews}</div>
          )}
        </div>
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
              <p className="news-read-modal__summary">{selectedNews.summary || ''}</p>
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
            className={`social-feed-grid ${isSocialDragging ? 'is-dragging' : ''}`}
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
                  <article className="social-post-card" key={postKey}>
                    {hasUsableCover ? (
                      <a
                        className="social-post-card__cover"
                        href={permalink}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={copy.socialOpenPost}
                      >
                        <img
                          src={coverUrl}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onLoad={() => {
                            clearMediaRetryFlags(postKey);
                          }}
                          onError={() => {
                            const nextMode = resolveNextMode(mode);
                            setMediaRenderModeByPostKey((prev) => {
                              const currentMode = prev[postKey] || 'direct';
                              const computedNextMode = resolveNextMode(currentMode);
                              if (currentMode === computedNextMode) return prev;
                              return { ...prev, [postKey]: computedNextMode };
                            });
                            if (nextMode === 'failed') {
                              clearMediaRetryFlags(postKey);
                              return;
                            }
                          }}
                        />
                        {isRetryingMedia && (
                          <span className="social-post-card__retry-overlay" aria-live="polite">
                            <RefreshCcw size={14} className="is-spinning" />
                            <span>{copy.socialRetryingMedia}</span>
                          </span>
                        )}
                        {isVideo && (
                          <span className="social-post-card__video">
                            <PlayCircle size={18} />
                          </span>
                        )}
                      </a>
                    ) : (
                      <div className="social-post-card__cover is-fallback">
                        <div className="social-post-card__placeholder">
                          <ImageOff size={18} />
                          <span className={isRetryTimedOut ? 'social-post-card__placeholder-timeout' : ''}>
                            {isRetryTimedOut ? copy.socialRetryTimeout : copy.socialImageUnavailable}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="social-post-card__retry"
                          onClick={() => retrySocialMediaCover(postKey)}
                          disabled={isRetryingMedia}
                          aria-label={copy.socialRetryMedia}
                        >
                          <RefreshCcw size={14} className={isRetryingMedia ? 'is-spinning' : ''} />
                          <span>{isRetryingMedia ? copy.socialRetryingMedia : copy.socialRetryMedia}</span>
                        </button>
                        {isVideo && (
                          <span className="social-post-card__video">
                            <PlayCircle size={18} />
                          </span>
                        )}
                      </div>
                    )}
                    <div className="news-card__meta">
                      {formatDate(item.publishedAt, locale, copy.fallbackDate)}
                    </div>
                    <h3>{copy.socialSource}</h3>
                    <p>{caption}</p>
                    <a className="text-link" href={permalink} target="_blank" rel="noreferrer">
                      {copy.socialOpenPost} <ExternalLink size={14} />
                    </a>
                  </article>
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
