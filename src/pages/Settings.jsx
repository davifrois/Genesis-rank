import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Image, Lock, Save, ShieldCheck, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import LoginOverlay from '../components/LoginOverlay';
import AcademySelect from '../components/AcademySelect';
import { useStore } from '../hooks/useStore';
import { useI18n } from '../hooks/useI18n';
import { authService } from '../services/authService';
import { formatBrazilPhone } from '../utils/phone';
import { evaluatePasswordStrength } from '../utils/passwordStrength';
import {
  buildProfileShareCode,
  buildPublicProfileSnapshot,
  encodePublicProfileSnapshot
} from '../utils/profileShare';
import { compressImage } from '../utils/imageUtils';

const BELT_OPTIONS = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];

const createForm = () => ({
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phone: '',
  birthDate: '',
  gender: '',
  belt: '',
  weight: '',
  academyId: '',
  country: 'Brasil',
  nationality: 'Brasileira',
  city: '',
  state: '',
  address: '',
  postalCode: '',
  languagePreference: 'pt-BR',
  publicProfile: true,
  photoUrl: '',
  coverUrl: '',
  coverPositionY: 50,
  beltHistory: ''
});

const fileToDataUrl = (file) => compressImage(file, 800, 800, 0.7);

const copyTextToClipboard = async (value) => {
  const text = (value || '').toString();
  if (!text.trim()) return false;

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }

  if (typeof document === 'undefined') return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
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

const normalizeLookup = (value) => (
  (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
);

const compactLookup = (value) => normalizeLookup(value).replace(/\s+/g, '');

const emailLocalPart = (value) => {
  const text = (value || '').toString().trim();
  if (!text) return '';
  const local = text.includes('@') ? text.split('@')[0] : text;
  return normalizeLookup(local);
};

const splitFullName = (fullName) => {
  const parts = (fullName || '').toString().trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: '', middleName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], middleName: '', lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], middleName: '', lastName: parts[1] };
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1]
  };
};

const buildFullName = (firstName, middleName, lastName) => (
  [firstName, middleName, lastName]
    .map((item) => (item || '').toString().trim())
    .filter(Boolean)
    .join(' ')
);

const Settings = () => {
  const { locale } = useI18n();
  const {
    currentUser,
    logout,
    updateUser,
    academies,
    athletes,
    events,
    memberProfiles,
    addMemberProfile,
    deleteMemberProfile
  } = useStore();
  const navigate = useNavigate();

  const [form, setForm] = useState(createForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [shareError, setShareError] = useState('');
  const [shareSuccess, setShareSuccess] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountPasswordConfirm, setAccountPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const currentProfile = useMemo(() => {
    if (!currentUser) return null;

    const normalizedUserRole = normalizeLookup(currentUser.role || '');
    const normalizedUserName = normalizeLookup(currentUser.name || '');
    const normalizedUsername = normalizeLookup(currentUser.username || '');
    const normalizedUsernameLocal = emailLocalPart(currentUser.username || '');
    const compactUserName = compactLookup(currentUser.name || '');
    const compactUsername = compactLookup(currentUser.username || '');

    const scoredMatches = memberProfiles.map((profile) => {
      const profileFullName = normalizeLookup(profile.fullName || '');
      const profileCompactName = compactLookup(profile.fullName || '');
      const profileEmail = normalizeLookup(profile.email || '');
      const profileEmailLocal = emailLocalPart(profile.email || '');
      const profileAccountUsername = normalizeLookup(
        profile.accountUsername || profile.loginUsername || profile.username || ''
      );

      let score = 0;

      if (normalizedUsername && profileAccountUsername === normalizedUsername) {
        score = Math.max(score, 120);
      }
      if (normalizedUsername && profileEmail === normalizedUsername) {
        score = Math.max(score, 110);
      }
      if (normalizedUsernameLocal && profileEmailLocal === normalizedUsernameLocal) {
        score = Math.max(score, 95);
      }
      if (normalizedUserName && profileFullName === normalizedUserName) {
        score = Math.max(
          score,
          normalizedUserRole === 'athlete' || normalizedUserRole === 'atleta' ? 70 : 40
        );
      }
      if (normalizedUsername && profileFullName === normalizedUsername) {
        score = Math.max(score, 55);
      }
      if (compactUserName && profileCompactName && (
        profileCompactName === compactUserName
        || profileCompactName.includes(compactUserName)
        || compactUserName.includes(profileCompactName)
      )) {
        score = Math.max(
          score,
          normalizedUserRole === 'athlete' || normalizedUserRole === 'atleta' ? 50 : 0
        );
      }
      if (compactUsername && profileCompactName && (
        profileCompactName === compactUsername
        || profileCompactName.includes(compactUsername)
        || compactUsername.includes(profileCompactName)
      )) {
        score = Math.max(
          score,
          normalizedUserRole === 'athlete' || normalizedUserRole === 'atleta' ? 45 : 0
        );
      }

      return { profile, score };
    });

    const bestMatch = scoredMatches
      .filter((item) => item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.profile?.createdAt || 0).getTime() - new Date(a.profile?.createdAt || 0).getTime();
      })[0];

    return bestMatch?.profile || null;
  }, [currentUser, memberProfiles]);

  const resolvedProfileAcademyId = useMemo(() => {
    if (!currentProfile) return '';
    if (currentProfile.academyId) return currentProfile.academyId;
    const match = academies.find((academy) => (
      normalizeLookup(academy.name) === normalizeLookup(currentProfile.academyName || '')
    ));
    return match?.id || '';
  }, [currentProfile, academies]);

  const loadFormFromProfile = (profile, fallbackUser) => {
    const fullName = profile?.fullName || fallbackUser?.name || '';
    const { firstName, middleName, lastName } = splitFullName(fullName);
    return {
      firstName,
      middleName: profile?.middleName || middleName || '',
      lastName: profile?.lastName || lastName || '',
      email: profile?.email || (((fallbackUser?.username || '').includes('@')) ? fallbackUser.username : ''),
      phone: formatBrazilPhone(profile?.phone || ''),
      birthDate: profile?.birthDate || '',
      gender: profile?.gender || '',
      belt: profile?.belt || '',
      weight: profile?.weight || '',
      academyId: profile?.academyId || resolvedProfileAcademyId || '',
      country: profile?.country || 'Brasil',
      nationality: profile?.nationality || 'Brasileira',
      city: profile?.city || '',
      state: profile?.state || '',
      address: profile?.address || '',
      postalCode: profile?.postalCode || '',
      languagePreference: profile?.languagePreference || 'pt-BR',
      publicProfile: profile?.publicProfileVisible !== false,
      photoUrl: profile?.photoUrl || '',
      coverUrl: profile?.coverUrl || '',
      coverPositionY: profile?.coverPositionY ?? 50,
      beltHistory: profile?.beltHistory || ''
    };
  };

  useEffect(() => {
    if (!currentUser) return;
    setForm(loadFormFromProfile(currentProfile, currentUser));
  }, [currentUser, currentProfile, resolvedProfileAcademyId]);

  const age = useMemo(() => calculateAgeFromBirthDate(form.birthDate), [form.birthDate]);
  const accountPasswordStrength = useMemo(
    () => evaluatePasswordStrength(accountPassword, locale),
    [accountPassword, locale]
  );

  const selectedAcademy = useMemo(
    () => academies.find((academy) => academy.id === form.academyId) || null,
    [academies, form.academyId]
  );

  const profileShareName = useMemo(
    () => (
      buildFullName(form.firstName, form.middleName, form.lastName)
      || currentProfile?.fullName
      || currentUser?.name
      || 'Atleta Genesis'
    ),
    [currentProfile?.fullName, currentUser?.name, form.firstName, form.lastName, form.middleName]
  );

  const shareCode = useMemo(() => {
    return buildProfileShareCode({
      profileId: currentProfile?.id || '',
      fullName: profileShareName,
      academyName: selectedAcademy?.name || currentProfile?.academyName || '',
      birthDate: form.birthDate || currentProfile?.birthDate || ''
    });
  }, [
    currentProfile?.academyName,
    currentProfile?.birthDate,
    currentProfile?.id,
    form.birthDate,
    profileShareName,
    selectedAcademy?.name
  ]);

  const shareProfileSnapshot = useMemo(() => {
    const profilePayload = {
      id: currentProfile?.id || '',
      fullName: profileShareName,
      academyName: selectedAcademy?.name || currentProfile?.academyName || '',
      belt: form.belt || currentProfile?.belt || '',
      weight: form.weight || currentProfile?.weight || '',
      country: form.country || currentProfile?.country || 'Brasil',
      city: form.city || currentProfile?.city || '',
      age: age === '' ? (currentProfile?.age || '') : age,
      photoUrl: form.photoUrl || currentProfile?.photoUrl || '',
      coverUrl: form.coverUrl || currentProfile?.coverUrl || ''
    };
    return buildPublicProfileSnapshot({
      profile: profilePayload,
      shareCode,
      athletes,
      events
    });
  }, [
    age,
    athletes,
    currentProfile?.academyName,
    currentProfile?.age,
    currentProfile?.belt,
    currentProfile?.city,
    currentProfile?.country,
    currentProfile?.coverUrl,
    currentProfile?.id,
    currentProfile?.photoUrl,
    currentProfile?.weight,
    events,
    form.belt,
    form.city,
    form.country,
    form.coverUrl,
    form.photoUrl,
    form.weight,
    profileShareName,
    selectedAcademy?.name,
    shareCode
  ]);

  const encodedShareSnapshot = useMemo(() => (
    encodePublicProfileSnapshot(shareProfileSnapshot)
  ), [shareProfileSnapshot]);

  const sharePublicProfileUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const url = new URL('/perfil-publico', window.location.origin);
    if (shareCode) url.searchParams.set('codigo', shareCode);
    if (encodedShareSnapshot) url.searchParams.set('dados', encodedShareSnapshot);
    return url.toString();
  }, [encodedShareSnapshot, shareCode]);

  const shareSummary = useMemo(() => (
    [
      'Perfil publico de atleta - Genesis Esportes',
      `Codigo: ${shareCode}`,
      `Atleta: ${profileShareName}`,
      `Academia: ${selectedAcademy?.name || 'Sem academia'}`,
      `Faixa: ${form.belt || '-'}`,
      `Peso/divisao: ${form.weight || '-'}`,
      `Campeonatos disputados: ${shareProfileSnapshot?.summary?.eventsFought || 0}`,
      `Podios: 1o ${shareProfileSnapshot?.summary?.podium1 || 0} | 2o ${shareProfileSnapshot?.summary?.podium2 || 0} | 3o ${shareProfileSnapshot?.summary?.podium3 || 0}`
    ].join('\n')
  ), [
    form.belt,
    form.weight,
    profileShareName,
    selectedAcademy?.name,
    shareCode,
    shareProfileSnapshot?.summary?.eventsFought,
    shareProfileSnapshot?.summary?.podium1,
    shareProfileSnapshot?.summary?.podium2,
    shareProfileSnapshot?.summary?.podium3
  ]);

  const handleImageFile = (fieldName) => async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imageData = await fileToDataUrl(file);
      setForm((previous) => ({ ...previous, [fieldName]: imageData }));
      setError('');
    } catch {
      setError('Nao foi possivel ler a imagem selecionada.');
    } finally {
      event.target.value = '';
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const firstName = (form.firstName || '').trim();
    const lastName = (form.lastName || '').trim();
    const fullName = buildFullName(firstName, form.middleName, lastName);
    if (!firstName) return setError('Informe o primeiro nome.');
    if (!lastName) return setError('Informe o sobrenome.');
    if (!/\S+@\S+\.\S+/.test((form.email || '').trim())) return setError('Informe um e-mail valido.');
    if (!form.gender) return setError('Selecione o genero.');
    if (!form.academyId) return setError('Selecione a academia.');

    try {
      addMemberProfile({
        id: currentProfile?.id || undefined,
        createdAt: currentProfile?.createdAt || new Date().toISOString(),
        firstName,
        middleName: (form.middleName || '').trim(),
        lastName,
        fullName,
        gender: form.gender,
        email: (form.email || '').trim(),
        phone: form.phone,
        birthDate: form.birthDate,
        age: age || '',
        academyId: form.academyId,
        academyName: selectedAcademy?.name || currentProfile?.academyName || 'Sem academia',
        country: form.country || 'Brasil',
        nationality: form.nationality || '',
        city: form.city || '',
        state: form.state || '',
        address: form.address || '',
        postalCode: form.postalCode || '',
        languagePreference: form.languagePreference || 'pt-BR',
        publicProfileVisible: form.publicProfile === true,
        belt: form.belt || '',
        weight: form.weight || '',
        beltHistory: form.beltHistory || '',
        photoUrl: form.photoUrl || '',
        coverUrl: form.coverUrl || '',
        coverPositionY: form.coverPositionY ?? 50,
        accountUsername: (currentUser?.username || '').toLowerCase(),
        createdByUsername: currentUser?.username || '',
        createdByName: currentUser?.name || ''
      });
      setSuccess('Perfil do atleta atualizado com sucesso.');
    } catch (submitError) {
      setError(submitError?.message || 'Nao foi possivel atualizar seu perfil.');
    }
  };

  const handleShareProfile = async () => {
    setShareError('');
    setShareSuccess('');

    if (!form.publicProfile) {
      setShareError('Ative o perfil publico antes de compartilhar.');
      return;
    }

    if (!sharePublicProfileUrl) {
      setShareError('Nao foi possivel gerar o link publico do perfil.');
      return;
    }

    const sharePayload = {
      title: 'Perfil publico de atleta - Genesis Esportes',
      text: shareSummary,
      url: sharePublicProfileUrl
    };

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(sharePayload);
        setShareSuccess('Perfil compartilhado com sucesso.');
        return;
      } catch (shareException) {
        if (shareException?.name === 'AbortError') return;
      }
    }

    const copied = await copyTextToClipboard(`${shareSummary}\nLink: ${sharePublicProfileUrl}`);
    if (copied) {
      setShareSuccess('Link e dados do atleta copiados para a area de transferencia.');
      return;
    }

    setShareError('Nao foi possivel compartilhar automaticamente neste navegador.');
  };

  const handleUpdatePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!accountPassword) {
      setPasswordError('Informe a nova senha.');
      return;
    }

    if (!accountPasswordStrength.isStrong) {
      setPasswordError(accountPasswordStrength.message);
      return;
    }

    if (accountPassword !== accountPasswordConfirm) {
      setPasswordError('As senhas nao conferem.');
      return;
    }

    if (!currentUser?.username) {
      setPasswordError('Usuario invalido para atualizar senha.');
      return;
    }

    setPasswordLoading(true);
    try {
      await authService.resetPassword(currentUser.username, accountPassword);
      setAccountPassword('');
      setAccountPasswordConfirm('');
      setPasswordSuccess('Senha atualizada com sucesso.');
    } catch (passwordUpdateError) {
      setPasswordError(passwordUpdateError?.message || 'Nao foi possivel atualizar a senha.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleReset = () => {
    setError('');
    setSuccess('');
    setPasswordError('');
    setPasswordSuccess('');
    setAccountPassword('');
    setAccountPasswordConfirm('');
    setForm(loadFormFromProfile(currentProfile, currentUser));
  };

  const handleRemoveProfile = () => {
    if (!currentProfile?.id) return;
    const shouldRemove = window.confirm('Deseja remover seu perfil de atleta? Esta acao nao pode ser desfeita.');
    if (!shouldRemove) return;
    try {
      deleteMemberProfile(currentProfile.id);
      setForm(loadFormFromProfile(null, currentUser));
      setSuccess('Perfil removido com sucesso.');
      setError('');
    } catch (removeError) {
      setError(removeError?.message || 'Nao foi possivel remover o perfil.');
    }
  };

  if (!currentUser) {
    return <LoginOverlay redirectTo="/minha-conta" />;
  }

  return (
    <div className="public-page profile-page profile-page--account profile-settings-page">
      <section className="profile-header">
        <div>
          <span className="section-kicker">Conta</span>
          <h1 className="profile-title">Configuracoes de perfil</h1>
          <p className="profile-subtitle">
            Atualize os dados do atleta para inscricao automatica, categoria correta e comunicacao oficial.
          </p>
        </div>
        <div className="profile-settings-toolbar">
          <Link to="/minha-conta" className="btn btn-secondary profile-settings-toolbar__btn">
            Visualizar meu perfil
          </Link>
          <button type="button" className="btn btn-primary profile-settings-toolbar__btn is-active">
            Configurações
          </button>
        </div>
        {shareError && <div className="login-error profile-share-feedback"><p>{shareError}</p></div>}
        {shareSuccess && <div className="profile-success profile-share-feedback">{shareSuccess}</div>}
      </section>



      <section className="profile-settings-layout">
        <form className="profile-settings-main" onSubmit={handleSubmit}>
          <article className="profile-card profile-card--dark">
            <div className="profile-card__header profile-card__header--dark">
              <h2>Detalhes do atleta</h2>
            </div>
            <div className="profile-card__body">
              <p className="profile-note profile-note--dark">
                Nome, faixa, genero e data de nascimento sao usados automaticamente na inscricao.
              </p>
              <div className="profile-fields">
                <div className="profile-field">
                  <label>Usuario de acesso</label>
                  <input className="profile-input profile-input--dark" value={currentUser.username || ''} readOnly />
                </div>
                <div className="profile-field">
                  <label>Perfil de acesso</label>
                  <input className="profile-input profile-input--dark" value={currentUser.role || ''} readOnly />
                </div>
                <div className="profile-field">
                  <label>Primeiro nome *</label>
                  <input className="profile-input profile-input--dark" value={form.firstName} onChange={(event) => setForm((previous) => ({ ...previous, firstName: event.target.value }))} />
                </div>
                <div className="profile-field">
                  <label>Nome do meio</label>
                  <input className="profile-input profile-input--dark" value={form.middleName} onChange={(event) => setForm((previous) => ({ ...previous, middleName: event.target.value }))} />
                </div>
                <div className="profile-field">
                  <label>Sobrenome *</label>
                  <input className="profile-input profile-input--dark" value={form.lastName} onChange={(event) => setForm((previous) => ({ ...previous, lastName: event.target.value }))} />
                </div>
                <div className="profile-field">
                  <label>E-mail *</label>
                  <input className="profile-input profile-input--dark" type="email" value={form.email} onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))} />
                </div>
                <div className="profile-field">
                  <label>Data de nascimento</label>
                  <input className="profile-input profile-input--dark" type="date" value={form.birthDate} onChange={(event) => setForm((previous) => ({ ...previous, birthDate: event.target.value }))} />
                </div>
                <div className="profile-field">
                  <label>Idade do ano</label>
                  <input className="profile-input profile-input--dark" value={age === '' ? '' : String(age)} readOnly />
                </div>
                <div className="profile-field">
                  <label>Genero *</label>
                  <select className="profile-input profile-input--dark" value={form.gender} onChange={(event) => setForm((previous) => ({ ...previous, gender: event.target.value }))}>
                    <option value="">Selecione o genero</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                </div>
                <div className="profile-field">
                  <label>Idioma preferido</label>
                  <select className="profile-input profile-input--dark" value={form.languagePreference} onChange={(event) => setForm((previous) => ({ ...previous, languagePreference: event.target.value }))}>
                    <option value="pt-BR">Portugues (Brasil)</option>
                    <option value="en-US">English</option>
                    <option value="es-ES">Espanol</option>
                    <option value="fr-FR">Francais</option>
                  </select>
                </div>
              </div>
            </div>
          </article>

          <article className="profile-card profile-card--dark">
            <div className="profile-card__header profile-card__header--dark"><h2>Seguranca da conta</h2></div>
            <div className="profile-card__body">
              <p className="profile-note profile-note--dark">
                Defina uma senha forte com no minimo 8 caracteres, letra maiuscula, minuscula, numero e simbolo.
              </p>
              <div className="profile-fields">
                <div className="profile-field">
                  <label>Nova senha</label>
                  <input
                    className="profile-input profile-input--dark"
                    type="password"
                    minLength={8}
                    value={accountPassword}
                    onChange={(event) => setAccountPassword(event.target.value)}
                    placeholder="********"
                  />
                  {accountPassword && (
                    <small className={`password-strength password-strength--${accountPasswordStrength.level}`}>
                      {accountPasswordStrength.message}
                    </small>
                  )}
                </div>
                <div className="profile-field">
                  <label>Confirmar nova senha</label>
                  <input
                    className="profile-input profile-input--dark"
                    type="password"
                    minLength={8}
                    value={accountPasswordConfirm}
                    onChange={(event) => setAccountPasswordConfirm(event.target.value)}
                    placeholder="********"
                  />
                </div>
              </div>
              {passwordError && <div className="login-error"><p>{passwordError}</p></div>}
              {passwordSuccess && <div className="profile-success"><p>{passwordSuccess}</p></div>}
              <div className="profile-actions-row">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleUpdatePassword}
                  disabled={passwordLoading || !accountPasswordStrength.isStrong || accountPassword !== accountPasswordConfirm}
                >
                  <Lock size={14} />
                  Atualizar senha
                </button>
              </div>
            </div>
          </article>

          <article className="profile-card profile-card--dark">
            <div className="profile-card__header profile-card__header--dark"><h2>Contato e residencia</h2></div>
            <div className="profile-card__body">
              <div className="profile-fields">
                <div className="profile-field">
                  <label>Telefone / WhatsApp</label>
                  <input className="profile-input profile-input--dark" type="tel" inputMode="numeric" autoComplete="tel-national" value={form.phone} onChange={(event) => setForm((previous) => ({ ...previous, phone: formatBrazilPhone(event.target.value) }))} />
                </div>
                <div className="profile-field">
                  <label>CEP</label>
                  <input className="profile-input profile-input--dark" value={form.postalCode} onChange={(event) => setForm((previous) => ({ ...previous, postalCode: event.target.value }))} />
                </div>
                <div className="profile-field profile-field--full">
                  <label>Endereco</label>
                  <input className="profile-input profile-input--dark" value={form.address} onChange={(event) => setForm((previous) => ({ ...previous, address: event.target.value }))} />
                </div>
                <div className="profile-field">
                  <label>Cidade</label>
                  <input className="profile-input profile-input--dark" value={form.city} onChange={(event) => setForm((previous) => ({ ...previous, city: event.target.value }))} />
                </div>
                <div className="profile-field">
                  <label>Estado / provincia</label>
                  <input className="profile-input profile-input--dark" value={form.state} onChange={(event) => setForm((previous) => ({ ...previous, state: event.target.value }))} />
                </div>
                <div className="profile-field">
                  <label>Pais</label>
                  <input className="profile-input profile-input--dark" value={form.country} onChange={(event) => setForm((previous) => ({ ...previous, country: event.target.value }))} />
                </div>
                <div className="profile-field">
                  <label>Nacionalidade</label>
                  <input className="profile-input profile-input--dark" value={form.nationality} onChange={(event) => setForm((previous) => ({ ...previous, nationality: event.target.value }))} />
                </div>
              </div>
            </div>
          </article>


          <article className="profile-card profile-card--dark">
            <div className="profile-card__header profile-card__header--dark"><h2>Perfil publico</h2></div>
            <div className="profile-card__body">
              <label className="profile-switch">
                <input type="checkbox" checked={!form.publicProfile} onChange={(event) => setForm((previous) => ({ ...previous, publicProfile: !event.target.checked }))} />
                <span>{form.publicProfile ? 'Exibir perfil publico' : 'Ocultar perfil publico'}</span>
              </label>
            </div>
          </article>

          <article className="profile-card profile-card--dark">
            <div className="profile-card__header profile-card__header--dark"><h2>Imagem de perfil e capa</h2></div>
            <div className="profile-card__body">
              <div className="profile-upload-grid">
                <div className="profile-upload-panel">
                  <label>URL da foto de perfil</label>
                  <input className="profile-input profile-input--dark" value={form.photoUrl} onChange={(event) => setForm((previous) => ({ ...previous, photoUrl: event.target.value }))} placeholder="https://..." />
                  <div className="profile-upload-row">
                    <label className="profile-file-btn">
                      <Image size={14} />
                      Selecionar foto
                      <input type="file" accept="image/*" onChange={handleImageFile('photoUrl')} />
                    </label>
                    {form.photoUrl && (
                      <div className="profile-image-preview profile-image-preview--athlete">
                        <img src={form.photoUrl} alt={buildFullName(form.firstName, form.middleName, form.lastName) || 'Atleta'} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="profile-upload-panel">
                  <label>URL da imagem de capa</label>
                  <input className="profile-input profile-input--dark" value={form.coverUrl} onChange={(event) => setForm((previous) => ({ ...previous, coverUrl: event.target.value }))} placeholder="https://..." />
                  <div className="profile-upload-row">
                    <label className="profile-file-btn">
                      <Image size={14} />
                      Selecionar capa
                      <input type="file" accept="image/*" onChange={handleImageFile('coverUrl')} />
                    </label>
                  </div>
                  {form.coverUrl && (
                    <>
                      <div className="profile-note profile-note--dark" style={{ marginTop: '10px', fontSize: '11px' }}>
                        Clique e arraste a imagem para cima ou para baixo para ajustar a posição.
                      </div>
                      <div 
                        className="profile-cover-preview"
                        style={{ 
                          height: '150px', 
                          overflow: 'hidden', 
                          cursor: 'ns-resize', 
                          position: 'relative',
                          backgroundImage: `url(${form.coverUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: `center ${form.coverPositionY}%`,
                          borderRadius: '8px',
                          border: '1px solid #1f2937'
                        }}
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId);
                          e.currentTarget.dataset.startY = e.clientY;
                          e.currentTarget.dataset.startPosY = form.coverPositionY;
                        }}
                        onPointerMove={(e) => {
                          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                            const startY = parseFloat(e.currentTarget.dataset.startY);
                            const startPosY = parseFloat(e.currentTarget.dataset.startPosY);
                            const deltaY = e.clientY - startY;
                            let newPos = startPosY - (deltaY * 0.5);
                            newPos = Math.max(0, Math.min(100, newPos));
                            setForm(prev => ({ ...prev, coverPositionY: newPos }));
                          }
                        }}
                        onPointerUp={(e) => {
                          e.currentTarget.releasePointerCapture(e.pointerId);
                        }}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </article>

          <article className="profile-card profile-card--dark">
            <div className="profile-card__header profile-card__header--dark"><h2>Faixa e historico tecnico</h2></div>
            <div className="profile-card__body">
              <div className="profile-fields">
                <div className="profile-field">
                  <label>Faixa atual</label>
                  <select className="profile-input profile-input--dark" value={form.belt} onChange={(event) => setForm((previous) => ({ ...previous, belt: event.target.value }))}>
                    <option value="">Selecione a faixa</option>
                    {BELT_OPTIONS.map((belt) => (
                      <option key={belt} value={belt}>{belt}</option>
                    ))}
                  </select>
                </div>
                <div className="profile-field">
                  <label>Peso / divisao</label>
                  <input className="profile-input profile-input--dark" value={form.weight} onChange={(event) => setForm((previous) => ({ ...previous, weight: event.target.value }))} />
                </div>
                <div className="profile-field profile-field--full">
                  <label>Historico de faixa</label>
                  <textarea className="profile-input profile-input--dark profile-textarea" value={form.beltHistory} onChange={(event) => setForm((previous) => ({ ...previous, beltHistory: event.target.value }))} placeholder="Ex: Azul (2023), Roxa (2025)." rows={3} />
                </div>
              </div>
            </div>
          </article>

          {error && <div className="login-error"><p>{error}</p></div>}
          {success && <div className="profile-success">{success}</div>}

          <div className="profile-actions-row">
            <button type="submit" className="btn btn-primary">
              <Save size={14} />
              Salvar alteracoes
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleReset}>
              <UserRound size={14} />
              Restaurar dados
            </button>
          </div>
        </form>

        <aside className="profile-settings-side">
          <article className="profile-card profile-card--dark">
            <div className="profile-card__header profile-card__header--dark"><h2>Resumo da conta</h2></div>
            <div className="profile-card__body">
              <div className="profile-summary-list">
                <div className="profile-summary-item">
                  <span>Nome completo</span>
                  <strong>{buildFullName(form.firstName, form.middleName, form.lastName) || '-'}</strong>
                </div>
                <div className="profile-summary-item">
                  <span>Academia</span>
                  <strong>{selectedAcademy?.name || 'Sem academia vinculada'}</strong>
                </div>
                <div className="profile-summary-item">
                  <span>Faixa</span>
                  <strong>{form.belt || '-'}</strong>
                </div>
                <div className="profile-summary-item">
                  <span>Visibilidade</span>
                  <strong>{form.publicProfile ? 'Publico' : 'Oculto'}</strong>
                </div>
                <div className="profile-summary-item">
                  <span>E-mail</span>
                  <strong>{form.email || '-'}</strong>
                </div>
              </div>
            </div>
          </article>

          <article className="profile-card profile-card--dark">
            <div className="profile-card__header profile-card__header--dark">
              <h2>Junte-se a equipe</h2>
            </div>
            <div className="profile-card__body">
              <div className="profile-fields">
                <div className="profile-field profile-field--full">
                  <label>Academia</label>
                  <AcademySelect 
                    academies={academies} 
                    value={form.academyId} 
                    onChange={(value) => setForm((previous) => ({ ...previous, academyId: value }))} 
                    onRegisterNew={() => navigate('/registro-academia')} 
                    theme="dark"
                  />
                </div>
                <div className="profile-field profile-field--full" style={{ marginTop: '10px' }}>
                  <label>Afiliação/Equipe</label>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 500, margin: 0 }}>
                    {selectedAcademy ? selectedAcademy.name : 'Sem equipe/afiliação'}
                  </p>
                </div>
              </div>
              <div className="profile-actions-row" style={{ marginTop: '24px' }}>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={(e) => {
                    e.preventDefault();
                    const evt = new Event('submit', { cancelable: true, bubbles: true });
                    document.querySelector('.profile-settings-main').dispatchEvent(evt);
                  }}
                >
                  Junte-se a equipe
                </button>
              </div>
            </div>
          </article>

          <article className="profile-card profile-card--dark">
            <div className="profile-card__header profile-card__header--dark"><h2>Zona de risco</h2></div>
            <div className="profile-card__body">
              <p className="profile-note profile-note--dark">
                Esta acao remove seu perfil de atleta da base de filiacao.
              </p>
              <button type="button" className="btn btn-secondary profile-danger-btn" onClick={handleRemoveProfile} disabled={!currentProfile?.id}>
                <AlertTriangle size={14} />
                Remover perfil de atleta
              </button>
              {!currentProfile?.id && (
                <p className="profile-danger-help">
                  <ShieldCheck size={14} />
                  Nenhum perfil salvo para remover.
                </p>
              )}
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
};

export default Settings;
