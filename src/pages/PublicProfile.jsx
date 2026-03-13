import React, { useMemo } from 'react';
import { Calendar, ExternalLink, MapPin, Medal, ShieldCheck, Trophy, UserRound } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import {
  buildProfileShareCode,
  buildPublicProfileSnapshot,
  decodePublicProfileSnapshot
} from '../utils/profileShare';

const formatEventDate = (value) => {
  if (!value) return 'Data a confirmar';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const getInitials = (value) => {
  const parts = (value || '').toString().trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'AT';
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('');
};

const getEventDateTime = (value) => {
  if (!value) return -1;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : -1;
};

const sanitizeSharedRows = (rows = []) => {
  const grouped = (Array.isArray(rows) ? rows : []).reduce((acc, rawRow) => {
    const eventId = (rawRow?.eventId || '').toString().trim();
    const eventName = (rawRow?.eventName || '').toString().trim();
    if (!eventId || !eventName || eventName.toLowerCase() === 'evento não informado') {
      return acc;
    }

    const existing = acc.get(eventId);
    const category = (rawRow?.category || '').toString().trim();
    const belt = (rawRow?.belt || '').toString().trim();
    const weight = (rawRow?.weight || '').toString().trim();
    const modality = (rawRow?.modality || '').toString().trim();
    const podiumPlace = Number(rawRow?.podiumPlace || 0);

    if (!existing) {
      acc.set(eventId, {
        ...rawRow,
        eventId,
        eventName,
        categorySet: new Set(category ? [category] : []),
        beltSet: new Set(belt ? [belt] : []),
        weightSet: new Set(weight ? [weight] : []),
        modalitySet: new Set(modality ? [modality] : []),
        podiumPlace: podiumPlace > 0 ? podiumPlace : 0
      });
      return acc;
    }

    if (category) existing.categorySet.add(category);
    if (belt) existing.beltSet.add(belt);
    if (weight) existing.weightSet.add(weight);
    if (modality) existing.modalitySet.add(modality);
    if (podiumPlace > 0) {
      existing.podiumPlace = existing.podiumPlace > 0
        ? Math.min(existing.podiumPlace, podiumPlace)
        : podiumPlace;
    }
    existing.isAbsolute = existing.isAbsolute || rawRow?.isAbsolute === true;
    return acc;
  }, new Map());

  return [...grouped.values()]
    .map((row) => ({
      ...row,
      category: [...row.categorySet].join(' / '),
      belt: [...row.beltSet].join(' / '),
      weight: [...row.weightSet].join(' / '),
      modality: [...row.modalitySet].join(' + ')
    }))
    .sort((a, b) => {
      const aTime = getEventDateTime(a?.eventDate);
      const bTime = getEventDateTime(b?.eventDate);
      if (aTime !== bTime) return bTime - aTime;
      return (a?.eventName || '').localeCompare(b?.eventName || '', 'pt-BR');
    });
};

const resolveResultMeta = (position) => {
  if (position === 1) {
    return { label: 'Campeão - 1º lugar', shortLabel: '1º', className: 'is-gold' };
  }
  if (position === 2) {
    return { label: 'Vice-campeão - 2º lugar', shortLabel: '2º', className: 'is-silver' };
  }
  if (position === 3) {
    return { label: '3º lugar no pódio', shortLabel: '3º', className: 'is-bronze' };
  }
  return { label: 'Participou do campeonato', shortLabel: '-', className: 'is-participant' };
};

const PublicProfile = () => {
  const { memberProfiles, athletes, events } = useStore();
  const [searchParams] = useSearchParams();
  const codeFromUrl = (searchParams.get('codigo') || '').toString().trim();
  const encodedPayload = (searchParams.get('dados') || '').toString().trim();

  const decodedSnapshot = useMemo(
    () => decodePublicProfileSnapshot(encodedPayload),
    [encodedPayload]
  );

  const fallbackProfileByCode = useMemo(() => {
    if (!codeFromUrl) return null;
    return (Array.isArray(memberProfiles) ? memberProfiles : []).find((profile) => (
      buildProfileShareCode({
        profileId: profile?.id || '',
        fullName: profile?.fullName || '',
        academyName: profile?.academyName || '',
        birthDate: profile?.birthDate || ''
      }) === codeFromUrl
    )) || null;
  }, [codeFromUrl, memberProfiles]);

  const fallbackSnapshot = useMemo(() => {
    if (!fallbackProfileByCode) return null;
    return buildPublicProfileSnapshot({
      profile: fallbackProfileByCode,
      shareCode: codeFromUrl,
      athletes,
      events
    });
  }, [athletes, codeFromUrl, events, fallbackProfileByCode]);

  const snapshot = useMemo(() => {
    const hasDecoded = Boolean(decodedSnapshot?.profile?.fullName);
    const hasFallback = Boolean(fallbackSnapshot?.profile?.fullName);

    if (hasDecoded && hasFallback) {
      return {
        ...decodedSnapshot,
        ...fallbackSnapshot,
        profile: {
          ...decodedSnapshot.profile,
          ...fallbackSnapshot.profile,
          photoUrl: decodedSnapshot.profile?.photoUrl || fallbackSnapshot.profile?.photoUrl || '',
          coverUrl: decodedSnapshot.profile?.coverUrl || fallbackSnapshot.profile?.coverUrl || ''
        },
        // Prefer fallback summary/rows from live local data to avoid stale/invalid rows in old shared links.
        summary: fallbackSnapshot.summary || decodedSnapshot.summary,
        rows: Array.isArray(fallbackSnapshot.rows) ? fallbackSnapshot.rows : (decodedSnapshot.rows || [])
      };
    }

    if (hasDecoded) return decodedSnapshot;
    if (hasFallback) return fallbackSnapshot;
    return null;
  }, [decodedSnapshot, fallbackSnapshot]);

  const rows = useMemo(
    () => sanitizeSharedRows(snapshot?.rows || []),
    [snapshot?.rows]
  );
  const profile = snapshot?.profile || {};
  const summary = useMemo(() => {
    const podium1 = rows.filter((row) => Number(row?.podiumPlace || 0) === 1).length;
    const podium2 = rows.filter((row) => Number(row?.podiumPlace || 0) === 2).length;
    const podium3 = rows.filter((row) => Number(row?.podiumPlace || 0) === 3).length;
    return {
      eventsFought: rows.length,
      podium1,
      podium2,
      podium3,
      totalPodiums: podium1 + podium2 + podium3
    };
  }, [rows]);

  if (!snapshot) {
    return (
      <div className="public-page shared-profile-page">
        <section className="public-header shared-profile-empty">
          <span className="section-kicker">Perfil público</span>
          <h1>Perfil compartilhado não encontrado</h1>
          <p>
            Este link não possui dados válidos para exibição.
            Peça ao atleta para compartilhar novamente o perfil público.
          </p>
          <Link className="btn btn-primary" to="/atletas">
            Ir para atletas
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="public-page shared-profile-page">
      <section className="shared-profile-hero">
        <div
          className="shared-profile-cover"
          style={profile.coverUrl ? { backgroundImage: `url(${profile.coverUrl})` } : undefined}
        >
          <div className="shared-profile-cover__overlay" />
        </div>
        <div className="shared-profile-headline">
          <div className="shared-profile-avatar">
            {profile.photoUrl ? (
              <img src={profile.photoUrl} alt={profile.fullName || 'Atleta'} />
            ) : (
              <span>{getInitials(profile.fullName)}</span>
            )}
          </div>
          <div className="shared-profile-title-block">
            <span className="section-kicker">Perfil de atleta</span>
            <h1>{profile.fullName || 'Atleta Genesis'}</h1>
            <div className="shared-profile-meta">
              <span><ShieldCheck size={14} /> {profile.academyName || 'Sem academia'}</span>
              <span><UserRound size={14} /> {profile.belt || 'Faixa não informada'}</span>
              <span>{profile.weight || 'Peso/divisão não informado'}</span>
              <span>{profile.country || 'Brasil'}</span>
              {profile.age !== '' && profile.age !== undefined && profile.age !== null && (
                <span>{profile.age} anos</span>
              )}
            </div>
            <div className="shared-profile-code">
              Código público: <strong>{snapshot.shareCode || codeFromUrl || '-'}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="public-section shared-profile-summary">
        <article className="shared-stat-card">
          <span>Campeonatos disputados</span>
          <strong>{summary.eventsFought || 0}</strong>
        </article>
        <article className="shared-stat-card">
          <span>Títulos (1º lugar)</span>
          <strong>{summary.podium1 || 0}</strong>
        </article>
        <article className="shared-stat-card">
          <span>Pódios totais</span>
          <strong>{summary.totalPodiums || 0}</strong>
        </article>
        <article className="shared-stat-card">
          <span>Pódio 2º / 3º</span>
          <strong>{summary.podium2 || 0} / {summary.podium3 || 0}</strong>
        </article>
      </section>

      <section className="public-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Histórico oficial</span>
            <h2>Campeonatos disputados na plataforma Genesis</h2>
          </div>
          <Link className="btn btn-secondary" to="/eventos">
            Ver campeonatos <ExternalLink size={14} />
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="empty-state">
            Nenhum campeonato encontrado para este atleta dentro da plataforma.
          </div>
        ) : (
          <div className="shared-event-grid">
            {rows.map((row, index) => {
              const resultMeta = resolveResultMeta(Number(row.podiumPlace || 0));
              const isLatestEvent = index === 0;
              return (
                <article
                  className={`shared-event-card ${isLatestEvent ? 'shared-event-card--latest' : ''}`}
                  key={row.id}
                >
                  <div className="shared-event-card__top">
                    <div>
                      {isLatestEvent ? (
                        <span className="shared-latest-badge">Mais recente</span>
                      ) : null}
                      <h3>{row.eventName || 'Campeonato'}</h3>
                      <div className="shared-event-card__date">
                        <Calendar size={14} />
                        {formatEventDate(row.eventDate)}
                      </div>
                      <div className="shared-event-card__location">
                        <MapPin size={14} />
                        {row.eventLocation || 'Local não informado'}
                      </div>
                    </div>
                    <span className={`shared-result-badge ${resultMeta.className}`}>
                      <Trophy size={14} />
                      {resultMeta.shortLabel}
                    </span>
                  </div>

                  <div className="shared-event-tags">
                    <span className="tag">{row.modality || 'GI'}</span>
                    {row.isAbsolute ? <span className="tag">Absoluto</span> : null}
                    {row.category ? <span className="tag">{row.category}</span> : null}
                    {row.weight ? <span className="tag">{row.weight}</span> : null}
                  </div>

                  <div className="shared-event-result">
                    <Medal size={15} />
                    <strong>{resultMeta.label}</strong>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default PublicProfile;
