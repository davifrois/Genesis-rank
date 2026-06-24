import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Image, Lock, Save, ShieldCheck, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import LoginOverlay from '../components/LoginOverlay';
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
import PublicProfile from './PublicProfile';

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

const MyAccount = () => {
  const { locale } = useI18n();
  const {
    currentUser,
    academies,
    athletes,
    events,
    memberProfiles,
    addMemberProfile,
    deleteMemberProfile
  } = useStore();

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

  const previewProfile = currentProfile || {
    id: currentUser?.id || `temp-${Date.now()}`,
    fullName: buildFullName(form.firstName, form.middleName, form.lastName) || currentUser?.name || 'Atleta Genesis',
    academyName: selectedAcademy?.name || 'Sem academia',
    belt: form.belt || '',
    weight: form.weight || '',
    country: form.country || 'Brasil',
    city: form.city || '',
    age: age === '' ? '' : age,
    photoUrl: form.photoUrl || '',
    coverUrl: form.coverUrl || '',
    modality: 'Jiu-Jitsu (BJJ)',
  };

  return (
    <div className="public-page profile-page profile-page--account profile-settings-page">
      <section className="profile-header">
        <div>
          <span className="section-kicker">Conta</span>
          <h1 className="profile-title">Meu Perfil</h1>
          <p className="profile-subtitle">
            Visualize os dados do seu perfil publico que os outros verao.
          </p>
        </div>
        <div className="profile-settings-toolbar">
          <button type="button" className="btn btn-primary profile-settings-toolbar__btn is-active">
            Meu perfil
          </button>
          <button type="button" className="btn btn-secondary profile-settings-toolbar__btn" onClick={handleShareProfile}>
            Compartilhar dados do usuario
          </button>
          <Link to="/configuracoes" className="btn btn-secondary profile-settings-toolbar__btn">
            Editar configurações
          </Link>
          {(currentUser?.role === 'coach' || currentUser?.role === 'professor') && (
            <Link to="/gerente-treinador" className="btn btn-secondary profile-settings-toolbar__btn" style={{ borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}>
              Gerente de treinador
            </Link>
          )}
        </div>
        {shareError && <div className="login-error profile-share-feedback"><p>{shareError}</p></div>}
        {shareSuccess && <div className="profile-success profile-share-feedback">{shareSuccess}</div>}
      </section>

      <div className="profile-preview-wrapper" style={{ marginBottom: '40px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1f2937' }}>
        <PublicProfile profileOverride={previewProfile} isPreview={true} />
      </div>


    </div>
  );
};

export default MyAccount;
