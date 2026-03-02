import React, { useMemo } from 'react';
import { useI18n } from '../hooks/useI18n';
import { useStore } from '../hooks/useStore';

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

const News = () => {
  const { language, locale } = useI18n();
  const { news } = useStore();
  const isEnglish = language === 'en-US';
  const copy = isEnglish
    ? {
        kicker: 'News',
        title: 'Updates and official announcements.',
        description:
          'Institutional content for athletes, academies and organizers. Keep everyone informed about ranking and events.',
        fallbackDate: 'Date TBD',
        emptyNews: 'No news published yet. Create one in admin panel.'
      }
    : {
        kicker: 'Noticias',
        title: 'Atualizacoes e comunicados oficiais.',
        description:
          'Conteudo institucional para atletas, academias e organizadores. Tudo sobre ranking, eventos e sistema.',
        fallbackDate: 'Data a confirmar',
        emptyNews: 'Nenhuma noticia publicada ainda. Crie uma no painel admin.'
      };

  const items = useMemo(() => (
    [...news]
      .sort((a, b) => {
        const aTime = parseDate(a.publishedAt || a.createdAt)?.getTime() || 0;
        const bTime = parseDate(b.publishedAt || b.createdAt)?.getTime() || 0;
        return bTime - aTime;
      })
  ), [news]);

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
              <article className="news-card" key={item.id}>
                {item.imageUrl && (
                  <div className="news-card__cover">
                    <img src={item.imageUrl} alt={item.title} loading="lazy" />
                  </div>
                )}
                <div className="news-card__meta">
                  {formatDate(item.publishedAt || item.createdAt, locale, copy.fallbackDate)}
                </div>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
              </article>
            ))
          ) : (
            <div className="empty-state">{copy.emptyNews}</div>
          )}
        </div>
      </section>
    </div>
  );
};

export default News;
