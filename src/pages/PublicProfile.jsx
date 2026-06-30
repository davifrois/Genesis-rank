import React, { useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Trophy, ShieldCheck, Medal, Target, MapPin, Calendar,
  Star, TrendingUp, Award, ChevronLeft, Swords, Users, Info
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { countryCodeFromValue, flagFromCountryCode } from '../utils/countryFlags';
import {
  buildProfileShareCode,
  buildPublicProfileSnapshot,
  decodePublicProfileSnapshot
} from '../utils/profileShare';
import AthleteCheckinModal from '../components/AthleteCheckinModal';
import './PublicProfile.css';

/* ── helpers ─────────────────────────────────────────────── */
const getInitials = (v) => {
  const parts = (v || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'AT';
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('');
};

const fmt = (v) => {
  if (!v) return 'Data a confirmar';
  const d = new Date(v);
  if (isNaN(d)) return v;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const normalizeProfileLookup = (value = '') => value
  .toString()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const calculateAge = (birthDate = '') => {
  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const birthdayPassed = today.getMonth() > parsed.getMonth()
    || (today.getMonth() === parsed.getMonth() && today.getDate() >= parsed.getDate());
  if (!birthdayPassed) age -= 1;
  return age > 0 ? age : '';
};

const resolveAthleteName = (athlete = {}) => (
  athlete?.nome || athlete?.name || athlete?.fullName || athlete?.athleteName || ''
).toString().trim();

const resolveAthleteAcademy = (athlete = {}) => (
  athlete?.academia || athlete?.academyName || athlete?.academy || athlete?.team || ''
).toString().trim();

const buildProfileFromAthlete = (athlete = {}) => ({
  id: (athlete.profileId || athlete.memberProfileId || athlete.id || '').toString(),
  athleteRecordId: (athlete.id || '').toString(),
  fullName: resolveAthleteName(athlete) || 'Atleta Genesis',
  academyName: resolveAthleteAcademy(athlete) || 'Sem academia',
  academyId: athlete.academyId || '',
  belt: athlete.faixa || athlete.belt || '',
  modality: athlete.modalidade || athlete.modality || 'Jiu-Jitsu (BJJ)',
  country: athlete.country || athlete.pais || athlete.nacionalidade || 'Brasil',
  city: athlete.city || athlete.cidade || '',
  age: athlete.idade || athlete.age || calculateAge(athlete.birthDate || athlete.dataNascimento || ''),
  birthDate: athlete.birthDate || athlete.dataNascimento || '',
  photoUrl: athlete.photoUrl || athlete.fotoUrl || athlete.avatarUrl || athlete.foto || '',
  coverUrl: athlete.coverUrl || '',
  team: athlete.team || athlete.equipe || ''
});

const BELT_COLORS = {
  preta: '#111827', marrom: '#92400e', roxa: '#7c3aed',
  azul: '#1d4ed8', verde: '#15803d', laranja: '#c2410c',
  amarela: '#b45309', cinza: '#6b7280', branca: '#d1d5db',
};
const getBeltColor = (belt = '') => {
  const b = belt.toLowerCase();
  for (const [k, v] of Object.entries(BELT_COLORS)) if (b.includes(k)) return v;
  return '#d1d5db';
};

const PODIUM = {
  1: { emoji: '🥇', label: '1º Lugar', cls: 'pp-podium--gold' },
  2: { emoji: '🥈', label: '2º Lugar', cls: 'pp-podium--silver' },
  3: { emoji: '🥉', label: '3º Lugar', cls: 'pp-podium--bronze' },
};

/* ── component ───────────────────────────────────────────── */
const podiumPublicLabel = (place) => {
  if (Number(place) === 1) return 'WON GOLD';
  if (Number(place) === 2) return 'WON SILVER';
  if (Number(place) === 3) return 'WON BRONZE';
  return '';
};

const PublicProfile = ({ profileOverride, isPreview = false }) => {
  const {
    memberProfiles = [], athletes = [], events = [], academies = [], brackets = [], currentUser, generateBrackets
  } = useStore() || {};

  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [selectedAthleteForCheckin, setSelectedAthleteForCheckin] = useState(null);

  const { athleteId } = useParams();
  const [searchParams] = useSearchParams();
  const codigoParam = (searchParams.get('codigo') || '').trim();
  const dadosParam  = (searchParams.get('dados')  || '').trim();

  /* 1 – resolve memberProfile */
  const profile = useMemo(() => {
    if (profileOverride) return profileOverride;
    
    const list = Array.isArray(memberProfiles) ? memberProfiles : [];
    const athleteList = Array.isArray(athletes) ? athletes : [];

    if (athleteId) {
      const directProfile = list.find((p) => String(p.id) === String(athleteId));
      if (directProfile) return directProfile;

      const directAthlete = athleteList.find((athlete) => (
        String(athlete.id || '') === String(athleteId)
        || String(athlete.profileId || '') === String(athleteId)
        || String(athlete.memberProfileId || '') === String(athleteId)
      ));
      if (directAthlete) {
        const realProfileId = directAthlete.memberProfileId || directAthlete.profileId;
        if (realProfileId) {
          const realProfile = list.find((p) => String(p.id) === String(realProfileId));
          if (realProfile) return realProfile;
        }
        
        const nameMatch = list.find((p) => {
          const pName = (p.fullName || '').trim().toLowerCase();
          const aName = (directAthlete.nome || directAthlete.name || directAthlete.fullName || '').trim().toLowerCase();
          return pName && aName && pName === aName;
        });
        if (nameMatch) return nameMatch;

        return buildProfileFromAthlete(directAthlete);
      }
      return null;
    }

    if (codigoParam) {
      return list.find((p) => {
        const code = buildProfileShareCode({
          profileId: p.id, fullName: p.fullName,
          academyName: p.academyName, birthDate: p.birthDate,
        });
        return code === codigoParam;
      }) || null;
    }

    if (dadosParam) {
      const decoded = decodePublicProfileSnapshot(dadosParam);
      return decoded?.profile || null;
    }
    return null;
  }, [athleteId, codigoParam, dadosParam, memberProfiles, athletes]);

  /* 2 – build snapshot (event rows + summary) */
  const snapshot = useMemo(() => {
    if (!profile) return null;
    if (profile.fullName) {
      return buildPublicProfileSnapshot({ profile, athletes, events });
    }
    return null;
  }, [profile, athletes, events]);

  const matchedProfileAthletes = useMemo(() => {
    if (!profile) return [];
    const targetName = normalizeProfileLookup(profile.fullName);
    const targetAcademy = normalizeProfileLookup(profile.academyName);
    const profileIds = new Set([profile.id, profile.athleteRecordId]
      .map((value) => (value || '').toString())
      .filter(Boolean));

    return (Array.isArray(athletes) ? athletes : []).filter((athlete) => {
      const ids = [athlete?.id, athlete?.profileId, athlete?.memberProfileId]
        .map((value) => (value || '').toString())
        .filter(Boolean);
      if (ids.some((id) => profileIds.has(id))) return true;

      const athleteName = normalizeProfileLookup(resolveAthleteName(athlete));
      if (!targetName || !athleteName) return false;
      const namesMatch = athleteName === targetName
        || athleteName.includes(targetName)
        || targetName.includes(athleteName);
      if (!namesMatch) return false;

      const athleteAcademy = normalizeProfileLookup(resolveAthleteAcademy(athlete));
      return !targetAcademy
        || !athleteAcademy
        || athleteAcademy === targetAcademy
        || athleteAcademy.includes(targetAcademy)
        || targetAcademy.includes(athleteAcademy);
    });
  }, [athletes, profile]);

  const fightHistoryByEvent = useMemo(() => {
    if (!profile) return new Map();
    const athleteIds = new Set(
      matchedProfileAthletes
        .flatMap((athlete) => [athlete.id, athlete.profileId, athlete.memberProfileId])
        .map((value) => (value || '').toString().trim())
        .filter(Boolean)
    );
    if (profile.id) athleteIds.add(String(profile.id));
    if (profile.athleteRecordId) athleteIds.add(String(profile.athleteRecordId));

    const athleteName = normalizeProfileLookup(profile.fullName);
    const athleteById = new Map(
      (Array.isArray(athletes) ? athletes : [])
        .filter((athlete) => athlete?.id)
        .map((athlete) => [String(athlete.id), athlete])
    );
    const result = new Map();
    const pushFight = (eventId, fight) => {
      if (!eventId) return;
      if (!result.has(eventId)) result.set(eventId, []);
      result.get(eventId).push(fight);
    };
    const nameFromId = (id) => resolveAthleteName(athleteById.get((id || '').toString())) || (id ? 'Atleta a confirmar' : 'BYE');

    (Array.isArray(brackets) ? brackets : [])
      .filter((bracket) => bracket?.isPublished === true || bracket?.published === true || bracket?.is_published === true)
      .forEach((bracket) => {
        const eventId = (bracket.eventId || '').toString();
        (Array.isArray(bracket.liveMatches) ? bracket.liveMatches : []).forEach((match, index) => {
          const leftId = (match.slotAId || match.slotA || match.athleteAId || match.athleteA || '').toString();
          const rightId = (match.slotBId || match.slotB || match.athleteBId || match.athleteB || '').toString();
          const leftName = normalizeProfileLookup(nameFromId(leftId));
          const rightName = normalizeProfileLookup(nameFromId(rightId));
          const isLeft = athleteIds.has(leftId) || (!!athleteName && leftName === athleteName);
          const isRight = athleteIds.has(rightId) || (!!athleteName && rightName === athleteName);
          if (!isLeft && !isRight) return;

          const winnerId = (match.winnerId || '').toString();
          const hasWinner = Boolean(winnerId);
          const won = hasWinner && ((isLeft && winnerId === leftId) || (isRight && winnerId === rightId));
          const opponentId = isLeft ? rightId : leftId;
          const scoreA = Number.isFinite(Number(match.scoreA)) ? Number(match.scoreA) : null;
          const scoreB = Number.isFinite(Number(match.scoreB)) ? Number(match.scoreB) : null;
          const method = match.method || match.victoryMethod || match.finishType || (
            !opponentId ? 'BYE' : scoreA !== null || scoreB !== null ? 'points' : 'decision'
          );

          pushFight(eventId, {
            id: match.id || `${bracket.id || eventId}-match-${index + 1}`,
            result: won ? 'WIN' : hasWinner ? 'LOSS' : 'PENDING',
            opponentName: opponentId ? nameFromId(opponentId) : 'BYE',
            method,
            score: scoreA !== null && scoreB !== null ? `${scoreA}-${scoreB}` : '',
            bracketLabel: bracket.label || bracket.categoryLabel || bracket.category || ''
          });
        });
      });

    matchedProfileAthletes.forEach((athlete) => {
      const eventId = (athlete.eventId || '').toString();
      (Array.isArray(athlete.historico) ? athlete.historico : []).forEach((item, index) => {
        if (!['win', 'loss'].includes(item?.type)) return;
        pushFight(eventId, {
          id: `${athlete.id || eventId}-history-${index}`,
          result: item.type === 'win' ? 'WIN' : 'LOSS',
          opponentName: item.opponent || item.opponentName || 'Adversario registrado',
          method: item.method || item.description || 'resultado',
          score: item.score || '',
          bracketLabel: athlete.categoria || ''
        });
      });
    });

    return result;
  }, [athletes, brackets, matchedProfileAthletes, profile]);

  /* 3 – wins / losses from athletes store */
  const { totalWins, totalLosses } = useMemo(() => {
    if (!profile) return { totalWins: 0, totalLosses: 0 };
    const fightsFromBrackets = [...fightHistoryByEvent.values()].flat();
    if (fightsFromBrackets.length) {
      return {
        totalWins: fightsFromBrackets.filter((fight) => fight.result === 'WIN').length,
        totalLosses: fightsFromBrackets.filter((fight) => fight.result === 'LOSS').length
      };
    }
    const needle = (profile.fullName || '').toLowerCase().trim();
    let w = 0, l = 0;
    matchedProfileAthletes
      .filter((a) => {
        const n = (a.nome || '').toLowerCase().trim();
        return n && (n === needle || n.includes(needle) || needle.includes(n));
      })
      .forEach((a) => (a.historico || []).forEach((h) => {
        if (h.type === 'win') w++;
        if (h.type === 'loss') l++;
      }));
    return { totalWins: w, totalLosses: l };
  }, [profile, fightHistoryByEvent, matchedProfileAthletes]);

  /* 4 – academy */
  const academy = useMemo(() => {
    if (!profile) return null;
    return (Array.isArray(academies) ? academies : []).find(
      (a) => a.id === profile.academyId
        || (a.name || '').toLowerCase() === (profile.academyName || '').toLowerCase()
    ) || null;
  }, [profile, academies]);

  /* 5 - ownership check */
  const isOwner = useMemo(() => {
    if (!currentUser || !profile) return false;
    if (currentUser.role === 'admin') return true;

    const username = (currentUser.username || '').toLowerCase();
    if (!username) return false;
    
    const accUser = (profile.accountUsername || profile.loginUsername || profile.username || '').toLowerCase();
    const createdBy = (profile.createdByUsername || '').toLowerCase();
    const email = (profile.email || '').toLowerCase();
    
    return accUser === username || createdBy === username || email === username || currentUser.id === profile.id;
  }, [currentUser, profile]);

  /* ── error state ─────────────────────────────────────── */
  if (!profile) {
    return (
      <div className="pp-error">
        <div className="pp-error__card">
          <Trophy size={56} className="pp-error__icon" />
          <h1>Atleta não encontrado</h1>
          <p>O perfil não está disponível ou o link expirou.</p>
          <Link to="/atletas" className="btn btn-primary">← Voltar para Atletas</Link>
        </div>
      </div>
    );
  }

  const rows = (snapshot?.rows || []).map((row) => ({
    ...row,
    fights: fightHistoryByEvent.get(row.eventId) || []
  }));
  const summary  = snapshot?.summary  || {};
  const beltColor    = getBeltColor(profile.belt);
  const countryFlag = flagFromCountryCode(countryCodeFromValue(profile.country || 'Brasil', 'BR'));
  const totalGold    = summary.podium1   || 0;
  const totalPodiums = summary.totalPodiums || 0;
  const totalEvents  = summary.eventsFought || rows.length;
  const fights       = totalWins + totalLosses;
  const winRate      = fights > 0 ? Math.round((totalWins / fights) * 100) : 0;
  const allFightRows = rows.flatMap((row) => row.fights || []);
  const submissionWins = allFightRows.filter((fight) => (
    fight.result === 'WIN' && /submission|finaliza|mata|arm|choke|estrang/i.test(fight.method || '')
  )).length;
  const primaryWinMethodLabel = submissionWins > 0
    ? `${submissionWins} Wins by Submission`
    : `${totalWins} Wins by Points`;

  const stats = [
    { icon: <Calendar size={16}/>, val: totalEvents, label: 'Eventos' },
    { icon: <Trophy   size={16}/>, val: totalGold,   label: 'Ouros', gold: true },
    { icon: <Medal    size={16}/>, val: totalPodiums, label: 'Pódios' },
    { icon: <TrendingUp size={16}/>, val: totalWins, label: 'Vitórias', win: true },
    { icon: <Swords   size={16}/>, val: totalLosses, label: 'Derrotas', loss: true },
    { icon: <Target   size={16}/>, val: `${winRate}%`, label: 'Win Rate' },
  ];

  return (
    <div className="pp-page">

      {/* ── HERO ──────────────────────────────────────── */}
      <section 
        className="pp-hero" 
        style={{ 
          '--belt': beltColor,
          ...(profile.coverUrl ? { 
            backgroundImage: `linear-gradient(to bottom, rgba(17, 17, 17, 0.5), #111), url(${profile.coverUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: `center ${profile.coverPositionY ?? 50}%`
          } : {})
        }}
      >
        <div className="pp-hero__glow" />
        <div className="pp-hero__inner container">
          {!isPreview && (
            <Link to="/atletas" className="pp-back-btn">
              <ChevronLeft size={16} /> Comunidade de Atletas
            </Link>
          )}

          {/* avatar centrado */}
          <div className="pp-hero__center">
            <div className="pp-avatar-wrap">
              {profile.photoUrl
                ? <img src={profile.photoUrl} alt={profile.fullName} className="pp-avatar" />
                : (
                  <div className="pp-avatar pp-avatar--initials" style={{ background: `linear-gradient(135deg, ${beltColor}cc, ${beltColor}44)` }}>
                    {getInitials(profile.fullName)}
                  </div>
                )}
              <span className="pp-belt-ring" style={{ borderColor: beltColor }} />
            </div>

            {/* nome + meta */}
            <h1 className="pp-hero__name">
              <span className="pp-flag-emoji" aria-hidden="true">{countryFlag}</span>
              {profile.fullName}
            </h1>

            <div className="pp-hero__meta-row">
              {profile.country && (
                <>
                  <span className="pp-meta-badge">
                    <span style={{ fontSize: '11px', opacity: 0.7 }}>NATIONALITY</span>
                    <span style={{ fontWeight: 800 }}>{profile.country.toUpperCase()}</span>
                  </span>
                  <span className="pp-meta-divider">·</span>
                </>
              )}
              {profile.age || profile.birthDate ? (
                <>
                  <span className="pp-meta-badge">
                    <span style={{ fontSize: '11px', opacity: 0.7 }}>AGE</span>
                    <span style={{ fontWeight: 800 }}>{profile.age || (profile.birthDate ? new Date().getFullYear() - new Date(profile.birthDate).getFullYear() : '—')}</span>
                  </span>
                  <span className="pp-meta-divider">·</span>
                </>
              ) : null}
              {profile.city && (
                <span className="pp-meta-badge"><MapPin size={10} /> {profile.city}</span>
              )}
              {!profile.city && profile.academyName && (
                <span className="pp-meta-badge"><ShieldCheck size={10} /> {profile.academyName}</span>
              )}
              {isOwner && !isPreview && (
                <Link to="/minha-conta" className="pp-meta-badge pp-meta-badge--action" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #4b5563', backgroundColor: 'transparent', padding: '4px 10px', borderRadius: '4px', color: '#e5e7eb', textDecoration: 'none', marginLeft: '8px' }}>
                  <span style={{ fontSize: '12px' }}>⚙</span> CONFIGURAÇÕES
                </Link>
              )}
              {isOwner && (
                <button 
                  onClick={() => {
                    const firstMatched = matchedProfileAthletes[0] || { id: profile.id, nome: profile.fullName, academia: profile.academyName, faixa: profile.belt };
                    setSelectedAthleteForCheckin(firstMatched);
                    setIsCheckinModalOpen(true);
                  }}
                  className="pp-meta-badge pp-meta-badge--action" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid var(--primary-color)', backgroundColor: 'transparent', padding: '4px 10px', borderRadius: '4px', color: 'var(--primary-color)', cursor: 'pointer', marginLeft: '8px', fontSize: '12px', fontWeight: 'bold' }}
                >
                  <Target size={14} /> CHECK-IN
                </button>
              )}
            </div>

            {/* belt card */}
            {profile.belt && (
              <div className="pp-belt-bar">
                <span className="pp-belt-bar__stripe" style={{ background: `linear-gradient(to bottom, ${beltColor} 50%, #e5e5e5 50%)` }} />
                <span className="pp-belt-bar__text">
                  <Award size={14} />
                  {profile.belt.charAt(0).toUpperCase() + profile.belt.slice(1)} belt in {profile.modality || 'Jiu-Jitsu (BJJ)'}
                </span>
                <span className="pp-belt-bar__info"><Info size={14} /></span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── BODY ──────────────────────────────────────── */}
      <div className="pp-body container">

        {/* STATS */}
        <div className="pp-stats-grid">
          {stats.map((s, i) => (
            <div key={i} className={`pp-stat ${s.gold ? 'pp-stat--gold' : s.win ? 'pp-stat--win' : s.loss ? 'pp-stat--loss' : ''}`}>
              <div className="pp-stat__icon">{s.icon}</div>
              <div className="pp-stat__val">{s.val}</div>
              <div className="pp-stat__label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="pp-performance-card">
          <div className="pp-performance-ring" style={{ '--progress': winRate }}>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle className="pp-performance-ring__track" cx="60" cy="60" r="48" />
              <circle className="pp-performance-ring__value" cx="60" cy="60" r="48" />
            </svg>
            <div className="pp-performance-ring__center">
              <strong>{totalWins}</strong>
              <span>WINS</span>
            </div>
          </div>
          <div className="pp-performance-copy">
            <span>Performance</span>
            <strong>{primaryWinMethodLabel}</strong>
            <p>{fights ? `${winRate}% de aproveitamento em ${fights} luta${fights !== 1 ? 's' : ''} registrada${fights !== 1 ? 's' : ''}.` : 'As vitorias oficiais entram aqui assim que o placar publicar os resultados.'}</p>
          </div>
        </div>

        {/* WIN-RATE BAR */}
        {fights > 0 && (
          <div className="pp-winbar">
            <div className="pp-winbar__labels">
              <span className="pp-winbar__win">{totalWins}V</span>
              <span className="pp-winbar__mid">Taxa de vitória</span>
              <span className="pp-winbar__loss">{totalLosses}D</span>
            </div>
            <div className="pp-winbar__track">
              <div className="pp-winbar__fill" style={{ width: `${winRate}%` }} />
            </div>
          </div>
        )}

        {/* ACADEMY CARD */}
        {profile.academyName && (
          <div className="pp-academy-card">
            <div className="pp-academy-card__logo">
              {academy?.logoUrl
                ? <img src={academy.logoUrl} alt={profile.academyName} />
                : <ShieldCheck size={28} />}
            </div>
            <div>
              <div className="pp-academy-card__name">{profile.academyName}</div>
              {academy?.city && <div className="pp-academy-card__city"><MapPin size={11} /> {academy.city}</div>}
            </div>
            <span className="pp-academy-card__tag">Academia</span>
          </div>
        )}

        {/* CHAMPIONSHIP HISTORY */}
        <div className="pp-section-head">
          <h2><Trophy size={18} /> Campeonatos na Plataforma</h2>
          <span className="pp-count">{rows.length} evento{rows.length !== 1 ? 's' : ''}</span>
        </div>

        {rows.length === 0 ? (
          <div className="pp-empty">
            <Swords size={44} />
            <h3>Nenhum campeonato registrado ainda</h3>
            <p>Quando o atleta participar de eventos na plataforma Genesis, o histórico aparecerá aqui.</p>
          </div>
        ) : (
          <div className="pp-champ-list">
            {rows.map((row) => {
              const ev  = (Array.isArray(events) ? events : []).find((e) => e.id === row.eventId);
              const pod = PODIUM[row.podiumPlace];

              return (
                <div key={row.id} className={`pp-champ ${pod ? pod.cls : ''}`}>

                  {/* poster */}
                  <div className="pp-champ__poster-wrap">
                    {ev?.posterUrl
                      ? <img src={ev.posterUrl} alt={row.eventName} className="pp-champ__poster" />
                      : (
                        <div className="pp-champ__poster pp-champ__poster--placeholder">
                          <Trophy size={28} />
                        </div>
                      )}
                  </div>

                  {/* main */}
                  <div className="pp-champ__body">
                    <div className="pp-champ__top">
                      <div>
                        <div className="pp-champ__name">{row.eventName}</div>
                        <div className="pp-champ__meta">
                          <span><Calendar size={11} /> {fmt(row.eventDate)}</span>
                          {row.eventLocation && <span><MapPin size={11} /> {row.eventLocation}</span>}
                        </div>
                      </div>
                      {pod && (
                        <div className={`pp-podium-tag ${pod.cls}`}>
                          {podiumPublicLabel(row.podiumPlace)}
                        </div>
                      )}
                    </div>

                    <div className="pp-champ__tags">
                      {(!row.status || row.status === 'PAYMENT_CONFIRMED') && <span className="pp-tag" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)', fontWeight: 600 }}>✅ Confirmado</span>}
                      {row.status === 'PAYMENT_ERROR' && <span className="pp-tag" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', fontWeight: 600 }}>⚠️ Pendente</span>}
                      {(row.status === 'PENDING' || row.status === 'PENDING_SYNC') && <span className="pp-tag" style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308', borderColor: 'rgba(234,179,8,0.3)', fontWeight: 600 }}>⏳ Confirmando pagamento</span>}

                      {row.category  && <span className="pp-tag">{row.category}</span>}
                      {row.modality  && <span className="pp-tag pp-tag--mod">{row.modality}</span>}
                      {row.weight    && <span className="pp-tag">{row.weight}</span>}
                      {row.isAbsolute && <span className="pp-tag pp-tag--abs">Absoluto</span>}
                    </div>

                    {isOwner && (
                      <div style={{ marginTop: '14px', marginBottom: '8px' }}>
                        {(() => {
                          const eventObj = events.find(e => e.id === row.eventId);
                          let isRegistrationClosed = false;
                          if (eventObj) {
                            const batches = eventObj.batches || [];
                            let lastDate = eventObj.date;
                            if (batches.length > 0 && batches[batches.length - 1].endDate) {
                              lastDate = batches[batches.length - 1].endDate;
                            }
                            if (lastDate) {
                              const lastDateObj = new Date(lastDate);
                              lastDateObj.setHours(23, 59, 59, 999);
                              if (new Date() > lastDateObj) {
                                isRegistrationClosed = true;
                              }
                            }
                          }

                          if (isRegistrationClosed) {
                            return (
                              <button 
                                className="btn btn-primary"
                                style={{ padding: '10px 20px', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#3f3f46', borderColor: '#3f3f46', color: '#a1a1aa' }}
                                disabled
                              >
                                <Target size={16} /> Edição Encerrada (Data Limite)
                              </button>
                            );
                          }

                          return (
                            <button 
                              className="btn btn-primary"
                              style={{ padding: '10px 20px', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
                              onClick={() => {
                                const athleteRecord = matchedProfileAthletes.find(a => a.eventId === row.eventId) || { id: row.id, eventId: row.eventId, nome: profile.fullName, academia: profile.academyName };
                                setSelectedAthleteForCheckin(athleteRecord);
                                setIsCheckinModalOpen(true);
                              }}
                            >
                              <Target size={16} /> Fazer Check-in da Inscrição
                            </button>
                          );
                        })()}
                      </div>
                    )}

                    {row.points > 0 && (
                      <div className="pp-champ__pts">
                        <Star size={12} /> +{row.points} pts no ranking Genesis
                      </div>
                    )}

                    {row.fights?.length > 0 && (
                      <div className="pp-fight-results">
                        {row.fights.map((fight) => (
                          <div className="pp-fight-result" key={fight.id}>
                            <span className={`pp-fight-result__tag is-${fight.result.toLowerCase()}`}>
                              {fight.result}
                            </span>
                            <div>
                              <strong>{fight.opponentName}</strong>
                              <small>
                                {fight.method || 'resultado'}
                                {fight.score ? ` / ${fight.score}` : ''}
                              </small>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <AthleteCheckinModal
        isOpen={isCheckinModalOpen}
        onClose={() => setIsCheckinModalOpen(false)}
        athlete={selectedAthleteForCheckin}
        athleteAge={profile?.age}
        onSave={(formData) => {
          if (selectedAthleteForCheckin?.eventId) {
            try { 
              generateBrackets({ eventId: selectedAthleteForCheckin.eventId, replaceExisting: true }); 
            } catch (err) {
              console.error('Erro ao gerar chaves:', err);
            }
          }
        }}
      />
    </div>
  );
};

export default PublicProfile;
