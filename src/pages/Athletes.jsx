import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Calendar, Medal, Search, ShieldCheck, Trophy, UserPlus, Users } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { useI18n } from '../hooks/useI18n';
import './AthletesAjp.css';
import bgImage from '../assets/jiu_jitsu_community_bg.png';
import { resolveEventLifecycle } from '../utils/eventLifecycle';
import { buildProfileShareCode, resolveProfileAthleteRows } from '../utils/profileShare';
import { coachNotificationService } from '../services/coachNotificationService';
import { compressImage } from '../utils/imageUtils';

const BELT_OPTIONS = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];
const SEASON_OPTIONS = ['2026', '2025', '2024'];

const normalizeLookup = (value) => (
  (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
);

const getInitials = (value) => {
  const parts = (value || '').toString().trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'AT';
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('');
};

const formatDate = (value, locale = 'pt-BR') => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const isWithinLastDays = (value, days = 100) => {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  const limit = Date.now() - (days * 24 * 60 * 60 * 1000);
  return parsed.getTime() >= limit;
};

const calculateAgeFromBirthDate = (value) => {
  if (!value) return '';
  const text = (value || '').toString().trim();
  if (!text) return '';

  let birthYear = Number(text.slice(0, 4));
  if (!Number.isFinite(birthYear) || birthYear <= 1900) {
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return '';
    birthYear = parsed.getUTCFullYear();
  }

  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  return age >= 0 ? age : '';
};

const flagFromCountry = (value = '') => {
  const country = normalizeLookup(value);
  if (country.includes('brasil') || country === 'br' || country.includes('brazil')) return '🇧🇷';
  if (country.includes('usa') || country.includes('united states') || country.includes('estados unidos')) return '🇺🇸';
  if (country.includes('portugal') || country === 'pt') return '🇵🇹';
  if (country.includes('argentina') || country === 'ar') return '🇦🇷';
  if (country.includes('chile') || country === 'cl') return '🇨🇱';
  if (country.includes('uruguai') || country.includes('uruguay') || country === 'uy') return '🇺🇾';
  return '🏳️';
};

const getYearFromDate = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return String(parsed.getFullYear());
};

const fileToDataUrl = (file) => compressImage(file, 800, 800, 0.7);

const createAthleteProfileForm = () => ({
  fullName: '',
  birthDate: '',
  gender: '',
  country: 'Brasil',
  city: '',
  belt: '',
  academyId: '',
  photoUrl: ''
});

const resolveProfileMetrics = ({ profile, athletes, eventsById }) => {
  const rows = resolveProfileAthleteRows({
    athletes,
    profileName: profile.fullName,
    academyName: profile.academyName
  });

  const eventIds = new Set();
  let wins = 0;
  let losses = 0;
  let totalGold = 0;
  let recentGold = 0;
  let podiums = 0;
  let totalMatches = 0;
  let totalPoints = 0;

  rows.forEach((athlete) => {
    if (athlete.eventId) eventIds.add(athlete.eventId);
    totalPoints += Number(athlete.pontos) || 0;
    const history = Array.isArray(athlete.historico) ? athlete.historico : [];
    history.forEach((item) => {
      const type = normalizeLookup(item?.type || '');
      if (type === 'win') wins += 1;
      if (type === 'loss') losses += 1;
      if (type === 'podium') {
        const position = Number(item?.position || 0);
        if ([1, 2, 3].includes(position)) {
          podiums += 1;
        }
        if (position === 1) {
          totalGold += 1;
          if (isWithinLastDays(item?.timestamp, 100)) {
            recentGold += 1;
          }
        }
      }
    });
    totalMatches += Math.max(history.filter((item) => ['win', 'loss'].includes(normalizeLookup(item?.type || ''))).length, 1);
  });

  const fights = wins + losses > 0 ? wins + losses : totalMatches;
  const winRate = fights > 0 ? Math.round((wins / fights) * 100) : 0;
  const activeScore = (rows.length * 3) + eventIds.size;

  const upcomingEvents = [...eventIds]
    .map((eventId) => eventsById.get(eventId))
    .filter(Boolean)
    .filter((event) => resolveEventLifecycle(event).isUpcoming)
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
    .slice(0, 3);

  return {
    profile,
    rows,
    wins,
    losses,
    fights,
    winRate,
    totalPoints,
    totalGold,
    recentGold,
    podiums,
    eventsCount: eventIds.size,
    activeScore,
    upcomingEvents
  };
};

const Athletes = () => {
  const { uiVariant, locale } = useI18n();
  const {
    athletes,
    memberProfiles,
    academies,
    events,
    currentUser,
    addMemberProfile
  } = useStore();
  const isEnglish = uiVariant === 'en';

  const [searchTerm, setSearchTerm] = useState('');
  const [showAllGold, setShowAllGold] = useState(false);
  const [showAllWinRate, setShowAllWinRate] = useState(false);
  const [showAllActive, setShowAllActive] = useState(false);
  const [seasonFilter, setSeasonFilter] = useState('2026');
  const [genderFilter, setGenderFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [beltFilter, setBeltFilter] = useState('all');
  const [academyFilter, setAcademyFilter] = useState('all');
  const [form, setForm] = useState(() => ({
    ...createAthleteProfileForm(),
    fullName: currentUser?.name || ''
  }));
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const eventsById = useMemo(
    () => new Map((Array.isArray(events) ? events : []).map((event) => [event.id, event])),
    [events]
  );

  const athleteCommunityRows = useMemo(() => {
    const profiles = (Array.isArray(memberProfiles) ? memberProfiles : [])
      .filter((profile) => (profile.fullName || '').toString().trim().length > 0);
    return profiles
      .map((profile) => resolveProfileMetrics({ profile, athletes, eventsById }))
      .sort((left, right) => {
        if (right.recentGold !== left.recentGold) return right.recentGold - left.recentGold;
        if (right.winRate !== left.winRate) return right.winRate - left.winRate;
        return right.activeScore - left.activeScore;
      });
  }, [athletes, eventsById, memberProfiles]);

  const countryOptions = useMemo(() => {
    const set = new Set();
    athleteCommunityRows.forEach((item) => {
      const country = (item.profile.country || '').toString().trim();
      if (country) set.add(country);
    });
    return [...set].sort((left, right) => left.localeCompare(right, locale));
  }, [athleteCommunityRows, locale]);

  const academyOptions = useMemo(() => {
    const set = new Set();
    athleteCommunityRows.forEach((item) => {
      const academyName = (item.profile.academyName || '').toString().trim();
      if (academyName) set.add(academyName);
    });
    return [...set].sort((left, right) => left.localeCompare(right, locale));
  }, [athleteCommunityRows, locale]);

  const rankedCommunityRows = useMemo(() => {
    const filtered = athleteCommunityRows.filter((item) => {
      const profile = item.profile || {};
      if (countryFilter !== 'all' && profile.country !== countryFilter) return false;
      if (beltFilter !== 'all' && profile.belt !== beltFilter) return false;
      if (academyFilter !== 'all' && profile.academyName !== academyFilter) return false;
      if (genderFilter !== 'all' && normalizeLookup(profile.gender) !== normalizeLookup(genderFilter)) return false;

      if (seasonFilter !== 'all') {
        const hasSeasonRow = item.rows.some((athlete) => {
          const eventYear = getYearFromDate(eventsById.get(athlete.eventId)?.date || athlete.createdAt || athlete.updatedAt);
          const historyYear = (Array.isArray(athlete.historico) ? athlete.historico : [])
            .some((historyItem) => getYearFromDate(historyItem?.timestamp || historyItem?.date) === seasonFilter);
          return eventYear === seasonFilter || historyYear;
        });
        if (!hasSeasonRow) return false;
      }

      return true;
    });

    return filtered
      .slice()
      .sort((left, right) => {
        if (right.totalPoints !== left.totalPoints) return right.totalPoints - left.totalPoints;
        if (right.recentGold !== left.recentGold) return right.recentGold - left.recentGold;
        if (right.winRate !== left.winRate) return right.winRate - left.winRate;
        return (left.profile.fullName || '').localeCompare(right.profile.fullName || '', locale);
      })
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }, [academyFilter, athleteCommunityRows, beltFilter, countryFilter, eventsById, genderFilter, locale, seasonFilter]);

  const rankingTableRows = useMemo(() => {
    const normalizedSearch = normalizeLookup(searchTerm);
    if (!normalizedSearch) return rankedCommunityRows.slice(0, 100);

    return rankedCommunityRows.filter((item) => {
      const profile = item.profile || {};
      const haystack = normalizeLookup([
        profile.fullName,
        profile.academyName,
        profile.country,
        profile.city,
        profile.belt,
        profile.gender
      ].filter(Boolean).join(' '));
      return haystack.includes(normalizedSearch);
    });
  }, [rankedCommunityRows, searchTerm]);

  const columnSourceRows = useMemo(() => (
    searchTerm.trim() ? rankingTableRows : rankedCommunityRows
  ), [rankedCommunityRows, rankingTableRows, searchTerm]);

  const filteredAthletes = useMemo(() => {
    const normalizedSearch = normalizeLookup(searchTerm);
    return athleteCommunityRows.filter((item) => {
      const profile = item.profile || {};
      if (countryFilter !== 'all' && profile.country !== countryFilter) return false;
      if (beltFilter !== 'all' && profile.belt !== beltFilter) return false;
      if (academyFilter !== 'all' && profile.academyName !== academyFilter) return false;

      if (!normalizedSearch) return true;
      const haystack = normalizeLookup([
        profile.fullName,
        profile.academyName,
        profile.country,
        profile.city,
        profile.belt
      ].filter(Boolean).join(' '));
      return haystack.includes(normalizedSearch);
    });
  }, [academyFilter, athleteCommunityRows, beltFilter, countryFilter, searchTerm]);

  const topGold = useMemo(() => (
    columnSourceRows
      .slice()
      .sort((left, right) => {
        if (right.recentGold !== left.recentGold) return right.recentGold - left.recentGold;
        if (right.totalGold !== left.totalGold) return right.totalGold - left.totalGold;
        return right.totalPoints - left.totalPoints;
      })
  ), [columnSourceRows]);

  const topWinRate = useMemo(() => (
    columnSourceRows
      .slice()
      .sort((left, right) => {
        if (right.winRate !== left.winRate) return right.winRate - left.winRate;
        if (right.fights !== left.fights) return right.fights - left.fights;
        return right.totalPoints - left.totalPoints;
      })
  ), [columnSourceRows]);

  const topActive = useMemo(() => (
    columnSourceRows
      .slice()
      .sort((left, right) => {
        if (right.activeScore !== left.activeScore) return right.activeScore - left.activeScore;
        if (right.eventsCount !== left.eventsCount) return right.eventsCount - left.eventsCount;
        return right.totalPoints - left.totalPoints;
      })
  ), [columnSourceRows]);

  const availableAcademies = useMemo(() => (
    [...(Array.isArray(academies) ? academies : [])]
      .sort((left, right) => (left.name || '').localeCompare(right.name || '', locale))
  ), [academies, locale]);

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((previous) => ({ ...previous, photoUrl: dataUrl }));
      setFormError('');
    } catch (error) {
      setFormError(error?.message || 'Falha ao processar a imagem.');
    } finally {
      event.target.value = '';
    }
  };

  const handleCreateProfile = (submitEvent) => {
    submitEvent.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!currentUser) {
      setFormError(isEnglish ? 'Login required to create athlete profile.' : 'Faca login para criar o perfil de atleta.');
      return;
    }

    const fullName = (form.fullName || '').toString().trim();
    const birthDate = (form.birthDate || '').toString().trim();
    if (!fullName) {
      setFormError(isEnglish ? 'Enter athlete full name.' : 'Informe o nome completo do atleta.');
      return;
    }
    if (!form.academyId) {
      setFormError(isEnglish ? 'Select academy.' : 'Selecione a academia.');
      return;
    }
    if (!form.gender) {
      setFormError(isEnglish ? 'Select gender.' : 'Selecione o gênero.');
      return;
    }

    const selectedAcademy = availableAcademies.find((academy) => academy.id === form.academyId);
    if (!selectedAcademy) {
      setFormError(isEnglish ? 'Invalid academy.' : 'Academia inválida.');
      return;
    }

    try {
      const saved = addMemberProfile({
        fullName,
        birthDate,
        age: calculateAgeFromBirthDate(birthDate),
        gender: form.gender,
        country: form.country || 'Brasil',
        city: form.city || '',
        belt: form.belt || '',
        academyId: selectedAcademy.id,
        academyName: selectedAcademy.name,
        photoUrl: form.photoUrl || '',
        accountUsername: (currentUser?.username || '').toString().trim().toLowerCase(),
        createdByUsername: (currentUser?.username || '').toString().trim().toLowerCase(),
        createdByName: currentUser?.name || ''
      });

      const status = normalizeLookup(saved?.joinStatus || 'approved');
      if (status === 'pending') {
        coachNotificationService.notifyAthleteLinked({
          athleteName: fullName,
          athleteEmail: '',
          athletePhone: '',
          academyId: selectedAcademy.id,
          academyName: selectedAcademy.name
        }).catch(() => {
          // Keep profile creation successful even if notification fails.
        });
      }

      if (status === 'pending') {
        setFormSuccess(isEnglish
          ? 'Profile created. Waiting professor approval.'
          : 'Perfil criado. Aguarde a aprovação do professor da academia.');
      } else {
        setFormSuccess(isEnglish
          ? 'Athlete profile created successfully.'
          : 'Perfil de atleta criado com sucesso.');
      }

      setForm((previous) => ({
        ...createAthleteProfileForm(),
        fullName: previous.fullName,
        country: previous.country
      }));
    } catch (error) {
      setFormError(error?.message || (isEnglish ? 'Failed to create athlete profile.' : 'Falha ao criar perfil de atleta.'));
    }
  };

  const renderTopList = (items, type, isExpanded, onToggle) => {
    const displayedItems = isExpanded ? items : items.slice(0, 5);
    const title = type === 'gold'
      ? (isEnglish ? 'Most Gold Medals' : 'Mais Medalhas de Ouro')
      : type === 'winrate'
        ? (isEnglish ? 'Best Win/Loss Difference' : 'Melhor Aproveitamento')
        : (isEnglish ? 'Most Active Athlete' : 'Atletas Mais Ativos');

    const emptyText = isEnglish
      ? 'No athlete data yet.'
      : 'Sem dados de atletas ainda.';

    return (
      <article className="athlete-community-column">
        <header className="athlete-community-column__head">
          <h3>{title}</h3>
        </header>
        <div className="athlete-community-column__body">
          {displayedItems.length === 0 ? (
            <div className="empty-state">{emptyText}</div>
          ) : (
            displayedItems.map((item, index) => {
              const profile = item.profile || {};
              const shareCode = buildProfileShareCode({
                profileId: profile.id,
                fullName: profile.fullName,
                academyName: profile.academyName,
                birthDate: profile.birthDate
              });
              const metricLabel = type === 'gold'
                ? `${item.recentGold} ouro`
                : type === 'winrate'
                  ? `${item.winRate}%`
                  : `${item.eventsCount} eventos`;

              return (
                <Link
                  key={`${type}-${profile.id || index}`}
                  className="athlete-community-rank-item"
                  to={`/perfil-publico?codigo=${encodeURIComponent(shareCode)}`}
                >
                  <span className="athlete-community-rank-item__position">#{index + 1}</span>
                  <span className="athlete-community-rank-item__avatar">
                    {profile.photoUrl ? <img src={profile.photoUrl} alt={profile.fullName || 'Atleta'} loading="lazy" /> : getInitials(profile.fullName)}
                  </span>
                  <span className="athlete-community-rank-item__content">
                    <strong>{profile.fullName || 'Atleta'}</strong>
                    <small>{profile.academyName || (isEnglish ? 'No academy' : 'Sem academia')}</small>
                  </span>
                  <span className="athlete-community-rank-item__metric">{metricLabel}</span>
                </Link>
              );
            })
          )}
          {items.length > 5 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '15px' }}>
              <button 
                  onClick={onToggle}
                  style={{ 
                      backgroundColor: 'transparent', 
                      border: '1px solid #444', 
                      color: '#fff', 
                      padding: '6px 20px', 
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      transition: 'all 0.2s',
                      width: '100%'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                  onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                  {isExpanded ? (isEnglish ? 'Show Less' : 'Mostrar Menos') : (isEnglish ? 'Show More' : 'Mostrar Mais')}
              </button>
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="public-page athlete-community-page" style={{ padding: 0 }}>
      {/* HEADER SECTION */}
      <div className="athletes-ajp-header-section" style={{ 
          backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.8)), url(${bgImage})`,
          width: '100vw',
          marginLeft: 'calc(-50vw + 50%)'
        }}>
        <div className="athletes-ajp-header-inner">
        <h1 className="athletes-ajp-title">
          {isEnglish ? 'ATHLETES COMMUNITY' : 'COMUNIDADE DE ATLETAS'}
        </h1>
        
        <div className="athletes-ajp-filters-row">
          <input
            type="search"
            className="athletes-ajp-input"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={isEnglish ? 'Search...' : 'Pesquisar...'}
          />
          <select className="athletes-ajp-select" value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)}>
            <option value="all">{isEnglish ? 'Select country' : 'Selecione o país'}</option>
            {Array.from(new Set(memberProfiles.map(p => p.country).filter(Boolean))).sort().map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select className="athletes-ajp-select" value={beltFilter} onChange={(event) => setBeltFilter(event.target.value)}>
            <option value="all">{isEnglish ? '- Continent -' : '- Continente -'}</option>
          </select>
          <select className="athletes-ajp-select" value={academyFilter} onChange={(event) => setAcademyFilter(event.target.value)}>
            <option value="all">{isEnglish ? 'Academy' : 'Academia'}</option>
            {availableAcademies.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <select className="athletes-ajp-select" value={genderFilter} onChange={(event) => setGenderFilter(event.target.value)}>
            <option value="all">{isEnglish ? '- Gender -' : '- Gênero -'}</option>
            <option value="Masculino">{isEnglish ? "Men's" : "Masculino"}</option>
            <option value="Feminino">{isEnglish ? "Women's" : "Feminino"}</option>
          </select>
          
          <button className="athletes-ajp-btn-filter" onClick={() => {}}>
            {isEnglish ? 'FILTER' : 'FILTRAR'}
          </button>
          <button className="athletes-ajp-btn-share" onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert(isEnglish ? 'Link copied!' : 'Link copiado!');
          }}>
            {isEnglish ? 'SHARE TOPLIST' : 'COMPARTILHAR'}
          </button>
        </div>
        </div>
      </div>

      {/* TOP ATHLETES SECTION */}
      <section className="athletes-ajp-top-section">
        <h2 className="athletes-ajp-top-title">
          {isEnglish ? 'TOP ATHLETES' : 'PRINCIPAIS ATLETAS'} <span className="muted">{isEnglish ? 'LAST 100 DAYS' : 'ÚLTIMOS 100 DIAS'}</span>
        </h2>
        
        <div className="athlete-community-columns">
          {renderTopList(topGold, 'gold', showAllGold, () => setShowAllGold(!showAllGold))}
          {renderTopList(topWinRate, 'winrate', showAllWinRate, () => setShowAllWinRate(!showAllWinRate))}
          {renderTopList(topActive, 'active', showAllActive, () => setShowAllActive(!showAllActive))}
        </div>
      </section>

          </div>
  );
};

export default Athletes;