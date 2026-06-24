import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Calendar, Medal, Search, ShieldCheck, Trophy, UserPlus, Users } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { useI18n } from '../hooks/useI18n';
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

  const renderTopList = (items, type) => {
    const title = type === 'gold'
      ? 'Most Gold Medals'
      : type === 'winrate'
        ? 'Best Win/Loss Difference'
        : 'Most Active Athlete';

    const emptyText = isEnglish
      ? 'No athlete data yet.'
      : 'Sem dados de atletas ainda.';

    return (
      <article className="athlete-community-column">
        <header className="athlete-community-column__head">
          <h3>{title}</h3>
        </header>
        <div className="athlete-community-column__body">
          {items.length === 0 ? (
            <div className="empty-state">{emptyText}</div>
          ) : (
            items.map((item, index) => {
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
        </div>
      </article>
    );
  };

  return (
    <div className="public-page athlete-community-page">
      <div className="ranking-page-header-new">
        <h1>{isEnglish ? 'Genesis Athlete Community' : 'Comunidade de Atletas Genesis'}</h1>
      </div>

      <section className="public-section athlete-community-filters">
        <div className="filter-bar">
          <div className="ranking-tabs community-ranking-tabs" aria-label="Temporada do ranking">
            <button
              type="button"
              className={`tab-btn ${seasonFilter === '2026' ? 'active' : ''}`}
              onClick={() => setSeasonFilter('2026')}
            >
              Season 2026
            </button>
            <button
              type="button"
              className={`tab-btn ${seasonFilter === 'all' ? 'active' : ''}`}
              onClick={() => setSeasonFilter('all')}
            >
              All Time
            </button>
          </div>
          <div className="search-input">
            <Search size={16} />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={isEnglish ? 'Search athlete...' : 'Pesquisar atleta por nome...'}
            />
          </div>
          <select className="input" value={genderFilter} onChange={(event) => setGenderFilter(event.target.value)}>
            <option value="all">{isEnglish ? 'All genders' : 'Todos os generos'}</option>
            <option value="Masculino">Masculino</option>
            <option value="Feminino">Feminino</option>
          </select>
          <select className="input" value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)}>
            <option value="all">{isEnglish ? 'All countries' : 'Todos os países'}</option>
            {countryOptions.map((country) => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
          <select className="input" value={beltFilter} onChange={(event) => setBeltFilter(event.target.value)}>
            <option value="all">{isEnglish ? 'All belts' : 'Todas as faixas'}</option>
            {BELT_OPTIONS.map((belt) => (
              <option key={belt} value={belt}>{belt}</option>
            ))}
          </select>
          <select className="input" value={academyFilter} onChange={(event) => setAcademyFilter(event.target.value)}>
            <option value="all">{isEnglish ? 'All academies' : 'Todas as academias'}</option>
            {academyOptions.map((academyName) => (
              <option key={academyName} value={academyName}>{academyName}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="public-section community-ranking-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{isEnglish ? 'Official community ranking' : 'Ranking oficial da comunidade'}</span>
            <h2>{searchTerm.trim() ? (isEnglish ? 'Search result with real position' : 'Resultado com posicao real') : 'Top 100 atletas'}</h2>
          </div>
          <span className="community-ranking-count">
            {searchTerm.trim()
              ? `${rankingTableRows.length} ${isEnglish ? 'result(s)' : 'resultado(s)'}`
              : `100 / ${rankedCommunityRows.length}`}
          </span>
        </div>

        <div className="ranking-table-wrapper community-ranking-table-wrapper">
          <table className="ranking-table community-ranking-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Rank</th>
                <th>Athlete</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Points</th>
              </tr>
            </thead>
            <tbody>
              {rankingTableRows.length === 0 ? (
                <tr className="rank-row">
                  <td colSpan={3} className="community-ranking-empty">
                    {isEnglish ? 'No athlete found with current filters.' : 'Nenhum atleta encontrado com os filtros atuais.'}
                  </td>
                </tr>
              ) : (
                rankingTableRows.map((item) => {
                  const profile = item.profile || {};
                  const shareCode = buildProfileShareCode({
                    profileId: profile.id,
                    fullName: profile.fullName,
                    academyName: profile.academyName,
                    birthDate: profile.birthDate
                  });
                  const country = profile.country || 'Brasil';

                  return (
                    <tr className={`rank-row ${searchTerm.trim() ? 'searched-highlight' : ''}`} key={`rank-table-${profile.id}`}>
                      <td className={`rank-number ${item.rank === 1 ? 'font-gold' : ''}`}>{item.rank}</td>
                      <td className="athlete-cell">
                        <Link className="athlete-avatar" to={`/perfil-publico?codigo=${encodeURIComponent(shareCode)}`}>
                          {profile.photoUrl ? <img src={profile.photoUrl} alt={profile.fullName || 'Atleta'} loading="lazy" /> : getInitials(profile.fullName)}
                        </Link>
                        <div className="athlete-info">
                          <Link className="athlete-name" to={`/perfil-publico?codigo=${encodeURIComponent(shareCode)}`}>
                            {profile.fullName || (isEnglish ? 'Athlete' : 'Atleta')}
                          </Link>
                          <span className="athlete-team">
                            {flagFromCountry(country)} {profile.academyName || (isEnglish ? 'No academy' : 'Sem academia')}
                          </span>
                        </div>
                      </td>
                      <td className="rank-points">{item.totalPoints.toLocaleString(locale)} pts</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="public-section athlete-community-highlights">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{isEnglish ? 'Top Athletes - Last 100 Days' : 'Top atletas - últimos 100 dias'}</span>
            <h2>{isEnglish ? 'Community Highlights' : 'Comunidade em destaque'}</h2>
          </div>
        </div>
        <div className="athlete-community-columns">
          {renderTopList(topGold, 'gold')}
          {renderTopList(topWinRate, 'winrate')}
          {renderTopList(topActive, 'active')}
        </div>
      </section>

      <section className="public-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{isEnglish ? 'Public athlete cards' : 'Vitrine pública de atletas'}</span>
            <h2>{filteredAthletes.length} {isEnglish ? 'athletes found' : 'atletas encontrados'}</h2>
          </div>
        </div>

        <div className="athlete-community-grid">
          {filteredAthletes.length === 0 ? (
            <div className="empty-state">
              {isEnglish
                ? 'No athlete found with current filters.'
                : 'Nenhum atleta encontrado com os filtros atuais.'}
            </div>
          ) : (
            filteredAthletes.map((item) => {
              const profile = item.profile || {};
              const shareCode = buildProfileShareCode({
                profileId: profile.id,
                fullName: profile.fullName,
                academyName: profile.academyName,
                birthDate: profile.birthDate
              });

              return (
                <article className="athlete-community-card" key={profile.id}>
                  <div className="athlete-community-card__head">
                    <div className="athlete-community-card__avatar">
                      {profile.photoUrl ? <img src={profile.photoUrl} alt={profile.fullName || 'Atleta'} loading="lazy" /> : getInitials(profile.fullName)}
                    </div>
                    <div>
                      <h3>{profile.fullName || (isEnglish ? 'Athlete' : 'Atleta')}</h3>
                      <p>{profile.academyName || (isEnglish ? 'No academy' : 'Sem academia')}</p>
                    </div>
                    <span className={`athlete-community-status ${
                      normalizeLookup(profile.joinStatus || 'approved') === 'pending'
                        ? 'is-pending'
                        : normalizeLookup(profile.joinStatus || 'approved') === 'rejected'
                          ? 'is-rejected'
                          : 'is-approved'
                    }`}>
                      {normalizeLookup(profile.joinStatus || 'approved') === 'pending'
                        ? (isEnglish ? 'Pending coach approval' : 'Aguardando professor')
                        : normalizeLookup(profile.joinStatus || 'approved') === 'rejected'
                          ? (isEnglish ? 'Rejected' : 'Recusado')
                          : (isEnglish ? 'Approved' : 'Aprovado')}
                    </span>
                  </div>

                  <div className="athlete-community-card__meta">
                    <span><Trophy size={14} /> {item.recentGold} {isEnglish ? 'gold (100d)' : 'ouro (100d)'}</span>
                    <span><Medal size={14} /> {item.podiums} {isEnglish ? 'podiums' : 'pódios'}</span>
                    <span><Activity size={14} /> {item.winRate}% win rate</span>
                    <span><Users size={14} /> {item.eventsCount} {isEnglish ? 'events' : 'eventos'}</span>
                  </div>

                  <div className="athlete-community-card__tags">
                    {profile.belt ? <span className="tag">{profile.belt}</span> : null}
                    {profile.country ? <span className="tag">{profile.country}</span> : null}
                    {profile.city ? <span className="tag">{profile.city}</span> : null}
                    {profile.age !== '' && profile.age !== undefined && profile.age !== null ? (
                      <span className="tag">{profile.age} {isEnglish ? 'years' : 'anos'}</span>
                    ) : null}
                  </div>

                  <div className="athlete-community-card__events">
                    {item.upcomingEvents.length === 0 ? (
                      <small>{isEnglish ? 'No upcoming events linked.' : 'Sem próximos eventos vinculados.'}</small>
                    ) : item.upcomingEvents.map((event) => (
                      <small key={`event-${profile.id}-${event.id}`}>
                        <Calendar size={12} /> {event.name} - {formatDate(event.date, locale)}
                      </small>
                    ))}
                  </div>

                  <Link className="btn btn-secondary" to={`/perfil-publico?codigo=${encodeURIComponent(shareCode)}`}>
                    {isEnglish ? 'Open public profile' : 'Abrir perfil público'}
                  </Link>
                </article>
              );
            })
          )}
        </div>
      </section>

    </div>

  );
};

export default Athletes;
