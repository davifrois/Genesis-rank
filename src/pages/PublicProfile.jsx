import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Trophy, ShieldCheck, Medal, Target, MapPin, Calendar,
  Star, TrendingUp, Award, ChevronLeft, Swords, Users, Info, CreditCard
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { countryCodeFromValue, flagFromCountryCode } from '../utils/countryFlags';
import {
  buildProfileShareCode,
  buildPublicProfileSnapshot,
  decodePublicProfileSnapshot
} from '../utils/profileShare';
import { normalizeRegistrationStatus, REGISTRATION_STATUS } from '../utils/registrationStatus';
import AthleteCheckinModal from '../components/AthleteCheckinModal';
import { publicRegistrationService } from '../services/publicRegistrationService';
import { resolveAgeNumber } from '../utils/eventPricing';
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
  // Faixas adulto BJJ - cores reais
  preta:   '#1a1a1a',  // Preta
  marrom:  '#5c3317',  // Marrom real
  roxa:    '#4a1a7a',  // Roxa real (violeta escuro)
  azul:    '#1a3a8f',  // Azul real (azul royal escuro)
  branca:  '#e8e8e8',  // Branca
  // Faixas infanto-juvenil
  amarela: '#d4a017',  // Amarela
  laranja: '#c85a00',  // Laranja
  verde:   '#1a6b2a',  // Verde
  cinza:   '#6b7280',  // Cinza
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
    memberProfiles = [], athletes = [], events = [], academies = [], brackets = [], currentUser, generateBrackets, updateAthlete
  } = useStore() || {};

  const [realtimeRegistrations, setRealtimeRegistrations] = useState([]);

  useEffect(() => {
    // Busca as inscrições reais da base de dados publicRegistrations
    // para sobrepor/curar os status dos atletas se tiver algo travado no cache
    const fetchRegistrations = async () => {
      try {
        const regs = await publicRegistrationService.listRegistrations();
        setRealtimeRegistrations(regs);
      } catch (err) {
        console.warn('Silent fail fetching public registrations in profile', err);
      }
    };
    fetchRegistrations();
  }, []);

  // Auto-heal local athletes when realtimeRegistrations load
  useEffect(() => {
    if (!realtimeRegistrations.length || !athletes.length || typeof updateAthlete !== 'function') return;

    const approvedRegs = realtimeRegistrations.filter(r => normalizeRegistrationStatus(r.status) === REGISTRATION_STATUS.PAYMENT_CONFIRMED);
    if (!approvedRegs.length) return;

    let healedCount = 0;
    athletes.forEach(a => {
        const currentStatus = normalizeRegistrationStatus(a.status);
        if (currentStatus === REGISTRATION_STATUS.PENDING || currentStatus === REGISTRATION_STATUS.PENDING_SYNC) {
            
            const isApproved = approvedRegs.some(r => {
                const rName = normalizeProfileLookup(r.nome || r.name || '');
                const aName = normalizeProfileLookup(a.nome || a.name || '');
                return rName === aName && String(r.eventId || '') === String(a.eventId || '');
            });

            if (isApproved) {
                updateAthlete(a.id, { status: REGISTRATION_STATUS.PAYMENT_CONFIRMED });
                healedCount++;
            }
        }
    });

    if (healedCount > 0) {
        console.info(`[PublicProfile] Auto-healed ${healedCount} stuck athlete(s) to PAYMENT_CONFIRMED.`);
    }
  }, [realtimeRegistrations, athletes, updateAthlete]);

  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [selectedAthleteForCheckin, setSelectedAthleteForCheckin] = useState(null);
  const [isBeltModalOpen, setIsBeltModalOpen] = useState(false);

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

  const topCheckinAthlete = useMemo(() => {
    if (!matchedProfileAthletes || matchedProfileAthletes.length === 0) return null;
    const openAthletes = matchedProfileAthletes.filter(athlete => {
      const eventObj = events.find(e => e.id === athlete.eventId);
      if (!eventObj) return true;
      if (eventObj.checkinEndDate) {
        return new Date() <= new Date(eventObj.checkinEndDate);
      }
      const batches = eventObj.batches || [];
      let lastDate = eventObj.date;
      if (batches.length > 0 && batches[batches.length - 1].endDate) {
        lastDate = batches[batches.length - 1].endDate;
      }
      if (lastDate) {
        const lastDateObj = new Date(lastDate);
        lastDateObj.setHours(23, 59, 59, 999);
        return new Date() <= lastDateObj;
      }
      return true;
    });
    return openAthletes.length > 0 ? openAthletes[0] : null;
  }, [matchedProfileAthletes, events]);

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

  /* 3 – wins / losses from athletes store and brackets */
  const { totalWins, totalLosses, totalRegisteredEvents } = useMemo(() => {
    if (!profile) return { totalWins: 0, totalLosses: 0, totalRegisteredEvents: 0 };
    
    let w = 0;
    let l = 0;
    
    // Contar vitórias/derrotas das chaves (brackets) geradas
    const fightsFromBrackets = [...fightHistoryByEvent.values()].flat();
    w += fightsFromBrackets.filter((fight) => fight.result === 'WIN').length;
    l += fightsFromBrackets.filter((fight) => fight.result === 'LOSS').length;

    // Contar vitórias/derrotas inseridas manualmente no histórico
    const needle = (profile.fullName || '').toLowerCase().trim();
    matchedProfileAthletes
      .filter((a) => {
        const n = (a.nome || '').toLowerCase().trim();
        return n && (n === needle || n.includes(needle) || needle.includes(n));
      })
      .forEach((a) => (a.historico || []).forEach((h) => {
        if (h.type === 'win') w++;
        if (h.type === 'loss') l++;
      }));

    // Contar em quantos eventos diferentes o atleta está inscrito
    const uniqueEvents = new Set(
      matchedProfileAthletes
        .map(a => String(a.eventId || ''))
        .filter(id => id && id !== 'undefined')
    );

    return { totalWins: w, totalLosses: l, totalRegisteredEvents: uniqueEvents.size };
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

  /* 6 – per-event performance for bar chart */
  const perEventStats = useMemo(() => {
    const snapshotRows = (snapshot?.rows || []).map((row) => ({
      ...row,
      fights: fightHistoryByEvent.get(row.eventId) || []
    }));
    const map = {};
    fightHistoryByEvent.forEach((fights, eventId) => {
      const ev = (Array.isArray(events) ? events : []).find(e => String(e.id) === String(eventId));
      const evName = ev?.name || snapshotRows.find(r => r.eventId === eventId)?.eventName || 'Evento';
      const wins = fights.filter(f => f.result === 'WIN').length;
      const losses = fights.filter(f => f.result === 'LOSS').length;
      map[eventId] = { name: evName, wins, losses, total: wins + losses };
    });
    return Object.values(map).filter(e => e.total > 0).slice(0, 6);
  }, [fightHistoryByEvent, events, snapshot]);

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
  const countryCode = countryCodeFromValue(profile.country || 'Brasil', 'BR');
  const countryFlag = flagFromCountryCode(countryCode);
  const totalGold    = summary.podium1   || 0;
  const totalPodiums = summary.totalPodiums || 0;
  const totalEvents  = totalRegisteredEvents > 0 ? totalRegisteredEvents : (summary.eventsFought || rows.length);
  const fights       = totalWins + totalLosses;
  const winRate      = fights > 0 ? Math.round((totalWins / fights) * 100) : 0;
  const allFightRows = rows.flatMap((row) => row.fights || []);
  const submissionWins = allFightRows.filter((fight) => (
    fight.result === 'WIN' && /submission|finaliza|mata|arm|choke|estrang/i.test(fight.method || '')
  )).length;
  const pointsWins = totalWins > 0 ? (totalWins - submissionWins) : 0;
  const subPercent = totalWins > 0 ? (submissionWins / totalWins) * 100 : 0;
  const ptsPercent = totalWins > 0 ? (pointsWins / totalWins) * 100 : 0;
  
  // Circumference of r=48 is 2 * PI * 48 = 301.59
  const circ = 301.59;
  const subDash = (subPercent / 100) * circ;
  const ptsDash = (ptsPercent / 100) * circ;

  const maxFights = Math.max(...perEventStats.map(e => e.total), 1);

  const statsCards = [
    { val: totalEvents,  label: 'Eventos',   color: '#60a5fa', icon: '📅' },
    { val: totalWins,    label: 'Vitórias',  color: '#22c55e', icon: '✅' },
    { val: totalLosses,  label: 'Derrotas',  color: '#ef4444', icon: '❌' },
    { val: totalPodiums, label: 'Pódios',    color: '#fbbf24', icon: '🏅' },
    { val: totalGold,    label: 'Ouros',     color: '#f59e0b', icon: '🥇' },
    { val: fights,       label: 'Lutas',     color: '#a78bfa', icon: '⚔️' },
  ];

  return (
    <div className="pp-page">

      {/* ── HERO ──────────────────────────────────────── */}
      <section 
        className="pp-hero" 
        style={{ '--belt': beltColor }}
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
            </div>

            {/* nome + meta */}
            <h1 className="pp-hero__name">
              {countryCode && (
                <img 
                  src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
                  alt={profile.country || ''}
                  className="pp-flag-img"
                  onError={(e) => { e.target.style.display='none'; }}
                />
              )}
              {profile.fullName}
            </h1>

            <div className="pp-hero__meta-row-new">
              {(profile.country || profile.age || profile.birthDate) && (
                <span className="pp-meta-inline">
                  {profile.country && (
                    <>
                      <span className="pp-meta-label">NACIONALIDADE</span>
                      <span className="pp-meta-value">{profile.country.toUpperCase()}</span>
                    </>
                  )}
                  {(resolveAgeNumber(profile) !== null) && (
                    <>
                      <span className="pp-meta-sep">|</span>
                      <span className="pp-meta-label">IDADE</span>
                      <span className="pp-meta-value">{resolveAgeNumber(profile)}</span>
                    </>
                  )}
                </span>
              )}
              {/* Optional actions for owner */}
              {isOwner && !isPreview && (
                <Link to="/minha-conta" className="pp-owner-btn" style={{ marginLeft: '16px' }}>
                  <span style={{ fontSize: '11px' }}>⚙</span> CONFIGURAÇÕES
                </Link>
              )}
              {isOwner && (
                topCheckinAthlete ? (
                  <button 
                    onClick={() => {
                      setSelectedAthleteForCheckin(topCheckinAthlete);
                      setIsCheckinModalOpen(true);
                    }}
                    className="pp-owner-btn pp-owner-btn--primary"
                    style={{ marginLeft: '8px' }}
                  >
                    <Target size={12} /> CHECK-IN
                  </button>
                ) : (
                  <button 
                    className="pp-owner-btn pp-owner-btn--primary"
                    style={{ marginLeft: '8px', opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#3f3f46', borderColor: '#3f3f46', color: '#a1a1aa' }}
                    disabled
                  >
                    <Target size={12} /> CHECK-IN ENCERRADO
                  </button>
                )
              )}
            </div>

            {/* belt card novo estilo */}
            {profile.belt && (
              <div className="pp-belt-card">
                <div className="pp-belt-card__left">
                  {/* Faixa real BJJ: corpo colorido + ponta preta + barra vermelha */}
                  <div className="pp-belt-graphic" style={{ '--belt-bg': beltColor }}>
                    <div className="pp-belt-graphic__body" />
                    <div className="pp-belt-graphic__tip" />
                  </div>
                  <div className="pp-belt-card__info">
                    <span className="pp-belt-card__title">
                      {profile.belt.charAt(0).toUpperCase() + profile.belt.slice(1)} belt in {profile.modality || 'Jiu-Jitsu (BJJ)'}
                    </span>
                    <span className="pp-belt-card__subtitle">
                      <ShieldCheck size={12} /> COMPETED ON GENESIS
                    </span>
                  </div>
                </div>
                <div className="pp-belt-card__right">
                  <button
                    className="pp-belt-info-btn"
                    title="Ver trajetória"
                    onClick={() => setIsBeltModalOpen(true)}
                    aria-label="Ver trajetória na plataforma"
                  >
                    <Info size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── BODY ──────────────────────────────────────── */}
      <div className="pp-body container">

        {/* ══════════════════════════════════════════════ */}
        {/* STATISTICS SECTION                           */}
        {/* ══════════════════════════════════════════════ */}
        <div className="pp-stats-section">
          <div className="pp-stats-section__header">
            <TrendingUp size={20} />
            <span>Estatísticas do Atleta</span>
          </div>

          {/* ROW 1: Gauge + Donut + Stat Cards */}
          <div className="pp-stats-row">

            {/* Win Rate Gauge */}
            <div className="pp-stat-gauge-card">
              <div className="pp-stat-gauge-label">Win Rate</div>
              <div className="pp-stat-gauge-wrap">
                <svg viewBox="0 0 120 80" className="pp-stat-gauge-svg">
                  {/* Background arc (semicircle) */}
                  <path
                    d="M 12 68 A 48 48 0 0 1 108 68"
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                  {/* Filled arc */}
                  <path
                    d="M 12 68 A 48 48 0 0 1 108 68"
                    fill="none"
                    stroke={winRate >= 70 ? '#22c55e' : winRate >= 40 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(winRate / 100) * 150.8} 150.8`}
                    style={{ filter: `drop-shadow(0 0 6px ${winRate >= 70 ? '#22c55e' : winRate >= 40 ? '#f59e0b' : '#ef4444'})` }}
                  />
                  {/* Value */}
                  <text x="60" y="62" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="900">{winRate}%</text>
                  <text x="60" y="76" textAnchor="middle" fill="#9ca3af" fontSize="7" fontWeight="700" letterSpacing="1">WIN RATE</text>
                  {/* Min/Max labels */}
                  <text x="12" y="78" textAnchor="middle" fill="#6b7280" fontSize="7">0%</text>
                  <text x="108" y="78" textAnchor="middle" fill="#6b7280" fontSize="7">100%</text>
                </svg>
              </div>
              <div className="pp-stat-gauge-sub">
                <span className="pp-sg-wins">{totalWins}W</span>
                <span className="pp-sg-sep"> / </span>
                <span className="pp-sg-losses">{totalLosses}L</span>
              </div>
            </div>

            {/* Wins Donut */}
            <div className="pp-stat-donut-card">
              <div className="pp-stat-donut-title">Vitórias por Método</div>
              <div className="pp-stat-donut-wrap">
                <svg viewBox="0 0 120 120" className="pp-wins-chart">
                  <circle cx="60" cy="60" r="48" className="pp-wins-chart__bg" />
                  {totalWins > 0 ? (
                    <>
                      <circle
                        cx="60" cy="60" r="48"
                        className="pp-wins-chart__pts"
                        strokeDasharray={`${ptsDash} ${circ - ptsDash}`}
                        strokeDashoffset="0"
                        transform="rotate(-90 60 60)"
                      />
                      <circle
                        cx="60" cy="60" r="48"
                        className="pp-wins-chart__sub"
                        strokeDasharray={`${subDash} ${circ - subDash}`}
                        strokeDashoffset={`-${ptsDash}`}
                        transform="rotate(-90 60 60)"
                      />
                    </>
                  ) : (
                    <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                  )}
                </svg>
                <div className="pp-wins-chart__center">
                  <strong>{totalWins}</strong>
                  <span>WINS</span>
                </div>
              </div>
              <div className="pp-stat-donut-legend">
                <div className="pp-sdl-item">
                  <span className="pp-sdl-dot" style={{ background: '#84cc16' }} />
                  <span className="pp-sdl-num">{submissionWins}</span>
                  <span className="pp-sdl-lbl">Finalização</span>
                </div>
                <div className="pp-sdl-item">
                  <span className="pp-sdl-dot" style={{ background: '#0ea5e9' }} />
                  <span className="pp-sdl-num">{pointsWins}</span>
                  <span className="pp-sdl-lbl">Pontos</span>
                </div>
              </div>
            </div>

            {/* Stat Cards Grid */}
            <div className="pp-stat-cards-grid">
              {statsCards.map((card) => (
                <div className="pp-stat-mini-card" key={card.label} style={{ '--card-color': card.color }}>
                  <span className="pp-smc-icon">{card.icon}</span>
                  <strong className="pp-smc-val" style={{ color: card.color }}>{card.val}</strong>
                  <span className="pp-smc-lbl">{card.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ROW 2: Per-Event Bar Chart */}
          {perEventStats.length > 0 && (
            <div className="pp-stat-bar-card">
              <div className="pp-stat-bar-title">
                <Award size={16} /> Performance por Evento
              </div>
              <div className="pp-stat-bar-chart">
                {perEventStats.map((ev, idx) => (
                  <div className="pp-bar-row" key={idx}>
                    <div className="pp-bar-label" title={ev.name}>
                      {ev.name.length > 22 ? ev.name.slice(0, 20) + '…' : ev.name}
                    </div>
                    <div className="pp-bar-track">
                      <div
                        className="pp-bar-fill pp-bar-fill--win"
                        style={{ width: `${(ev.wins / maxFights) * 100}%` }}
                      >
                        {ev.wins > 0 && <span>{ev.wins}W</span>}
                      </div>
                      <div
                        className="pp-bar-fill pp-bar-fill--loss"
                        style={{ width: `${(ev.losses / maxFights) * 100}%` }}
                      >
                        {ev.losses > 0 && <span>{ev.losses}L</span>}
                      </div>
                    </div>
                    <div className="pp-bar-total">{ev.total} luta{ev.total !== 1 ? 's' : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ROW 3: Submission % Progress Bar */}
          <div className="pp-stat-method-card">
            <div className="pp-stat-bar-title"><Star size={16} /> Taxa de Finalização</div>
            <div className="pp-stat-method-bars">
              <div className="pp-method-row">
                <span className="pp-method-lbl">Finalização</span>
                <div className="pp-method-track">
                  <div
                    className="pp-method-fill"
                    style={{
                      width: `${subPercent}%`,
                      background: 'linear-gradient(90deg, #84cc16, #22c55e)',
                      boxShadow: '0 0 8px rgba(132,204,22,0.5)'
                    }}
                  />
                </div>
                <span className="pp-method-pct">{subPercent.toFixed(0)}%</span>
              </div>
              <div className="pp-method-row">
                <span className="pp-method-lbl">Pontos/Dec.</span>
                <div className="pp-method-track">
                  <div
                    className="pp-method-fill"
                    style={{
                      width: `${ptsPercent}%`,
                      background: 'linear-gradient(90deg, #0ea5e9, #6366f1)',
                      boxShadow: '0 0 8px rgba(14,165,233,0.5)'
                    }}
                  />
                </div>
                <span className="pp-method-pct">{ptsPercent.toFixed(0)}%</span>
              </div>
            </div>
          </div>

        </div>

        {/* ACADEMIAS */}
        {profile.academyName && (
          <div className="pp-section-block">
            <div className="pp-section-block__header">Academias</div>
            <div className="pp-section-block__body">
              <div className="pp-academy-item">
                <div className="pp-academy-item__logo">
                  {academy?.logoUrl
                    ? <img src={academy.logoUrl} alt={profile.academyName} />
                    : <span style={{ fontSize: '32px', color: '#fff' }}>S</span>}
                </div>
                <div className="pp-academy-item__name">
                  {profile.academyName}<br/>
                  {academy?.city && <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 'normal' }}>{academy.city}</span>}
                </div>
              </div>
            </div>
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

                  {/* header: Event Name and Date */}
                  <div className="pp-champ__header">
                    <div className="pp-champ__name">{row.eventName}</div>
                    <div className="pp-champ__date">{fmt(row.eventDate)}</div>
                  </div>

                  <div className="pp-champ__flex">
                    {/* main content (left) */}
                    <div className="pp-champ__body">
                      
                      <div className="pp-champ__category-title">
                        {[row.modality, profile.belt, row.category, row.weight, row.isAbsolute ? 'Absolute' : ''].filter(Boolean).join(' / ')}
                      </div>

                      {/* Tags/Check-in action if owner */}
                      <div className="pp-champ__owner-actions">
                        {isOwner && (
                          <div style={{ marginTop: '14px', marginBottom: '14px' }}>
                            {(() => {
                              const eventObj = events.find(e => e.id === row.eventId);
                              let isRegistrationClosed = false;
                              if (eventObj) {
                                if (eventObj.checkinEndDate) {
                                  const checkinEndObj = new Date(eventObj.checkinEndDate);
                                  if (new Date() > checkinEndObj) {
                                    isRegistrationClosed = true;
                                  }
                                } else {
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
                              }

                              const athleteRecord = matchedProfileAthletes.find(a => String(a.eventId) === String(row.eventId)) || row;
                              const regStatus = normalizeRegistrationStatus(athleteRecord?.status || row?.status);
                              const isPaid = regStatus === REGISTRATION_STATUS.PAYMENT_CONFIRMED;

                              if (isRegistrationClosed) {
                                return (
                                  <button 
                                    className="btn btn-primary"
                                    style={{ padding: '8px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#3f3f46', borderColor: '#3f3f46', color: '#a1a1aa' }}
                                    disabled
                                  >
                                    <Target size={14} /> Edição Encerrada (Data Limite)
                                  </button>
                                );
                              }

                              if (!isPaid) {
                                return (
                                  <button 
                                    className="btn"
                                    style={{ 
                                      padding: '8px 16px', 
                                      fontSize: '13px', 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      gap: '8px', 
                                      fontWeight: 'bold',
                                      backgroundColor: '#f59e0b',
                                      borderColor: '#f59e0b',
                                      color: '#09090b',
                                      cursor: 'pointer',
                                      borderRadius: '6px'
                                    }}
                                    onClick={async () => {
                                      try {
                                        const checkoutRes = await publicRegistrationService.createCheckoutSession({
                                          registrationIds: athleteRecord.id || row.id,
                                          athleteName: profile.fullName || athleteRecord.nome || 'Atleta',
                                          athleteEmail: profile.email || '',
                                          amount: Number(athleteRecord.price || row.price || 0)
                                        });
                                        if (checkoutRes && checkoutRes.url) {
                                          window.location.href = checkoutRes.url;
                                        } else {
                                          alert('Não foi possível iniciar o checkout. Tente novamente.');
                                        }
                                      } catch (err) {
                                        alert(`Erro ao conectar com Mercado Pago: ${err.message}`);
                                      }
                                    }}
                                  >
                                    <CreditCard size={14} /> Pagar Inscrição (Mercado Pago)
                                  </button>
                                );
                              }

                              return (
                                <button 
                                  className="btn btn-primary"
                                  style={{ padding: '8px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
                                  onClick={() => {
                                    const athleteRecordToUse = matchedProfileAthletes.find(a => String(a.eventId) === String(row.eventId)) || { id: row.id, eventId: row.eventId, nome: profile.fullName, academia: profile.academyName };
                                    setSelectedAthleteForCheckin(athleteRecordToUse);
                                    setIsCheckinModalOpen(true);
                                  }}
                                >
                                  <Target size={14} /> Fazer Check-in da Inscrição
                                </button>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Matches */}
                      {row.fights?.length > 0 && (
                        <div className="pp-fight-results">
                          {row.fights.map((fight) => (
                            <div className="pp-fight-result" key={fight.id}>
                              <span className={`pp-fight-result__tag is-${fight.result.toLowerCase()}`}>
                                {fight.result}
                              </span>
                              <div className="pp-fight-result__text">
                                <strong>{fight.opponentName}</strong> 
                                <span>
                                  {fight.result === 'WIN' ? 'Won by' : fight.result === 'LOSS' ? 'Lost by' : ''} {fight.method || 'Decision'}
                                  {fight.score ? ` (${fight.score})` : ''}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Medal */}
                      {pod && (
                        <div className={`pp-podium-badge ${pod.cls}`}>
                          {podiumPublicLabel(row.podiumPlace)}
                        </div>
                      )}

                      {/* Points */}
                      <div className="pp-champ__pts-line">
                        Earned <span className="pp-champ__pts-val">{(row.points || 0).toFixed(2)} pts</span> to ranking {[row.modality, profile.belt, row.category].filter(Boolean).join(' / ')} – {new Date(row.eventDate).getFullYear()}
                      </div>
                    </div>

                    {/* poster (right) */}
                    <div className="pp-champ__poster-wrap">
                      {ev?.posterUrl
                        ? <img src={ev.posterUrl} alt={row.eventName} className="pp-champ__poster" />
                        : (
                          <div className="pp-champ__poster pp-champ__poster--placeholder">
                            <Trophy size={48} />
                          </div>
                        )}
                    </div>
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

      {/* ── MODAL TRAJETÓRIA DE FAIXA ─────────────────── */}
      {isBeltModalOpen && (
        <div className="pp-belt-modal-overlay" onClick={() => setIsBeltModalOpen(false)}>
          <div className="pp-belt-modal-wrap" onClick={(e) => e.stopPropagation()}>

            {/* Card: faixa vertical + conteúdo */}
            <div className="pp-belt-modal">
              {/* Faixa vertical */}
              <div className="pp-belt-modal__vert-belt" style={{ '--belt-bg': beltColor }}>
                <div className="pp-belt-modal__vert-body" />
                <div className="pp-belt-modal__vert-tip" />
              </div>

              {/* Conteúdo */}
              <div className="pp-belt-modal__content">
                <h2 className="pp-belt-modal__title">
                  {profile.belt?.charAt(0).toUpperCase() + profile.belt?.slice(1)} belt
                </h2>
                <p className="pp-belt-modal__sub">
                  <ShieldCheck size={13} />
                  COMPETIU COMO {(profile.belt || '').toUpperCase()} BELT NA GENESIS
                </p>

                <div className="pp-belt-modal__events">
                  {rows.length === 0 && (
                    <p className="pp-belt-modal__empty">Nenhuma competição registrada ainda.</p>
                  )}
                  {rows.slice(0, 5).map((row, idx) => {
                    const ev = events.find(e => String(e.id) === String(row.eventId));
                    const dateStr = ev?.date || ev?.startDate || row.eventDate || '';
                    return (
                      <div key={row.eventId || idx} className="pp-belt-modal__event-row">
                        {dateStr && <span className="pp-belt-modal__date">{dateStr}</span>}
                        <span className="pp-belt-modal__sep">–</span>
                        <span className="pp-belt-modal__event-name">{ev?.name || row.eventName || `Evento ${idx + 1}`}</span>
                      </div>
                    );
                  })}
                  {rows.length > 5 && (
                    <p className="pp-belt-modal__more">e mais {rows.length - 5}...</p>
                  )}
                </div>
              </div>
            </div>

            {/* Botão fechar FORA do card */}
            <button className="pp-belt-modal__close" onClick={() => setIsBeltModalOpen(false)}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicProfile;
