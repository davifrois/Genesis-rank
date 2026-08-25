import React, { useEffect, useMemo, useState } from 'react';
import { 
  User, Mail, Phone, MapPin, Building2, Medal, 
  Calendar, Info, AlertTriangle, CheckCircle, 
  Settings as SettingsIcon, LogOut, Camera, Share2, Copy, Trash2, Lock, Image, Save, UserRound, ScanLine, Trophy, ShieldCheck, PlusCircle
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import AthleteDigitalCard from '../components/AthleteDigitalCard';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import LoginOverlay from '../components/LoginOverlay';
import AcademySelect from '../components/AcademySelect';
import { useStore } from '../hooks/useStore';
import { useI18n } from '../hooks/useI18n';
import { authService } from '../services/authService';
import { formatBrazilPhone } from '../utils/phone';
import { evaluatePasswordStrength } from '../utils/passwordStrength';
import { getAvailableBeltsForAge, isValidBeltForAge } from '../utils/beltRules';
import { getAvailableWeightsForProfile } from '../utils/weightRules';
import {
  buildProfileShareCode,
  buildPublicProfileSnapshot,
  encodePublicProfileSnapshot
} from '../utils/profileShare';
import { compressImage } from '../utils/imageUtils';
import { BRAZIL_CITIES } from '../utils/brazilCities';
import { formatCep, fetchAddressByCep } from '../utils/cep';

const BRAZIL_STATES = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' }
];

const BELT_OPTIONS = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];

const WEIGHT_OPTIONS = [
  'Galo',
  'Pluma',
  'Pena',
  'Leve',
  'Médio',
  'Meio-Pesado',
  'Pesado',
  'Super Pesado',
  'Pesadíssimo'
];

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

const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'Informe o primeiro nome.'),
  lastName: z.string().trim().min(1, 'Informe o sobrenome.'),
  email: z.union([
    z.string().trim().email('Informe um e-mail válido.'),
    z.string().trim().max(0)
  ]).optional(),
  gender: z.string().optional(),
  academyId: z.string().optional()
});

const fileToDataUrl = (file) => compressImage(file, 800, 800, 0.7);

const copyTextToClipboard = async (text) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // Fallback
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
  } catch (e) {
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
  const [isSaving, setIsSaving] = useState(false);
  const [showDigitalCard, setShowDigitalCard] = useState(false);
  const [brStates] = useState(BRAZIL_STATES);
  const [brCities] = useState(BRAZIL_CITIES);

  const currentProfile = useMemo(() => {
    if (!currentUser) return null;

    const normalizedUserRole = normalizeLookup(currentUser.role || '');
    const normalizedUserName = normalizeLookup(currentUser.name || '');
    const normalizedUsername = normalizeLookup(currentUser.username || '');
    const normalizedUsernameLocal = emailLocalPart(currentUser.username || '');
    const compactUserName = compactLookup(currentUser.name || '');
    const compactUsername = compactLookup(currentUser.username || '');

    const scoredMatches = (memberProfiles || []).map((profile) => {
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
    const match = (academies || []).find((academy) => (
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

  const recommendedEvents = useMemo(() => {
    const now = new Date();
    return (events || []).filter(e => {
      if (e.status === 'completed' || e.status === 'past' || e.status === 'draft') return false;
      if (e.registrationOpen === false) return false;
      if (e.date) {
        const eventDate = new Date(e.date);
        if (!isNaN(eventDate) && eventDate < now) return false;
      }
      return true;
    }).slice(0, 2);
  }, [events]);

  useEffect(() => {
    if (form.belt && age !== '') {
      if (!isValidBeltForAge(form.belt, age)) {
        setForm(prev => ({ ...prev, belt: '' }));
      }
    }
  }, [age, form.belt]);

  const availableBelts = useMemo(() => {
    return age === '' ? BELT_OPTIONS : getAvailableBeltsForAge(age);
  }, [age]);

  const accountPasswordStrength = useMemo(
    () => evaluatePasswordStrength(accountPassword, locale),
    [accountPassword, locale]
  );

  const selectedAcademy = useMemo(
    () => (academies || []).find((academy) => academy.id === form.academyId) || null,
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

  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [cepSuccess, setCepSuccess] = useState('');

  const triggerCepLookup = async (cepValue) => {
    const digits = (cepValue || '').toString().replace(/\D/g, '');
    if (digits.length === 8) {
      setIsFetchingCep(true);
      setCepSuccess('');
      try {
        const result = await fetchAddressByCep(digits);
        if (result) {
          const stateCode = result.state?.toUpperCase() || '';
          const stateCities = BRAZIL_CITIES[stateCode] || [];
          
          // Match city name case-insensitively with BRAZIL_CITIES
          const matchedCity = stateCities.find(
            (c) => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 
                   result.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          ) || result.city;

          setForm((prev) => ({
            ...prev,
            postalCode: result.cep || formatCep(digits),
            address: result.address || prev.address,
            state: stateCode || prev.state,
            city: matchedCity || prev.city,
            country: 'Brasil'
          }));
          setCepSuccess(`${matchedCity} - ${stateCode}`);
        }
      } catch (err) {
        console.warn('Erro ao consultar CEP:', err);
      } finally {
        setIsFetchingCep(false);
      }
    }
  };

  const handleCepChange = async (event) => {
    const formatted = formatCep(event.target.value);
    setForm((prev) => ({ ...prev, postalCode: formatted }));
    const digits = formatted.replace(/\D/g, '');
    if (digits.length === 8) {
      await triggerCepLookup(digits);
    }
  };


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

  // ========================================== //
  //  LÓGICA DE SALVAMENTO DE PERFIL (ATLETA)   //
  // ========================================== //
  // Esta função lida com a submissão do formulário de Configurações,
  // validando e enviando os dados do Atleta para o servidor.
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSaving) return;
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      profileSchema.parse(form);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setIsSaving(false);
        const msg = err.errors[0].message;
        setError(msg);
        setTimeout(() => {
          document.querySelector('.login-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
        return;
      }
      setIsSaving(false);
      setError('Erro ao validar os dados do formulário.');
      return;
    }

    const firstName = (form.firstName || '').trim();
    const lastName = (form.lastName || '').trim();
    const fullName = buildFullName(firstName, form.middleName, lastName);

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

      if (typeof updateUser === 'function') {
        updateUser({ name: fullName });
      }

      setSuccess('✅ Perfil atualizado com sucesso!');
      setTimeout(() => {
        document.querySelector('.profile-success')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      setTimeout(() => setSuccess(''), 5000);
    } catch (submitError) {
      setError(submitError?.message || 'Nao foi possivel atualizar seu perfil.');
      setTimeout(() => {
        document.querySelector('.login-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    } finally {
      setIsSaving(false);
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
          <h1 className="profile-title">Configurações de Perfil</h1>
          <div className="profile-settings-notice">
            <Info className="profile-settings-notice__icon" size={20} />
            <p className="profile-subtitle">
              <strong className="profile-subtitle__highlight">Atenção:</strong> É necessário preencher e manter os dados do atleta atualizados para validar sua inscrição nos campeonatos e ranqueamento.
            </p>
          </div>
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
        {/* ========================================== */}
        {/*  FORMULÁRIO DE CRIAÇÃO / EDIÇÃO DE PERFIL  */}
        {/* ========================================== */}
        {/* Onde o atleta preenche seus dados (faixa, peso, academia) */}
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
                        Clique e arraste a imagem para cima ou para baixo para ajustar a posi&#231;&#227;o.
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
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>CEP</span>
                    {isFetchingCep && <span style={{ fontSize: '11px', color: '#00c2cb', fontWeight: 600 }}>Buscando CEP...</span>}
                    {!isFetchingCep && cepSuccess && <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600 }}>✓ {cepSuccess}</span>}
                  </label>
                  <input 
                    className="profile-input profile-input--dark" 
                    placeholder="00000-000"
                    maxLength={9}
                    value={form.postalCode || ''} 
                    onChange={handleCepChange}
                    onBlur={() => triggerCepLookup(form.postalCode)}
                  />
                </div>
                <div className="profile-field profile-field--full">
                  <label>Endereco</label>
                  <input 
                    className="profile-input profile-input--dark" 
                    placeholder="Rua / Avenida, Bairro, Número"
                    value={form.address || ''} 
                    onChange={(event) => setForm((previous) => ({ ...previous, address: event.target.value }))} 
                  />
                </div>
                <div className="profile-field">
                  <label>Estado / provincia</label>
                  {form.country?.toLowerCase() === 'brasil' ? (
                    <select 
                      className="profile-input profile-input--dark"
                      value={form.state || ''}
                      onChange={e => setForm(prev => ({ ...prev, state: e.target.value, city: '' }))}
                    >
                      <option value="">Selecione o estado</option>
                      {BRAZIL_STATES.map(st => <option key={st.sigla} value={st.sigla}>{st.nome} ({st.sigla})</option>)}
                    </select>
                  ) : (
                    <input 
                      className="profile-input profile-input--dark" 
                      value={form.state || ''} 
                      onChange={e => setForm(prev => ({ ...prev, state: e.target.value, city: '' }))} 
                    />
                  )}
                </div>
                <div className="profile-field">
                  <label>Cidade</label>
                  {form.country?.toLowerCase() === 'brasil' ? (
                    <select 
                      className="profile-input profile-input--dark"
                      value={form.city || ''}
                      onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))}
                      disabled={!form.state}
                    >
                      <option value="">Selecione a cidade</option>
                      {form.city && (!BRAZIL_CITIES[form.state] || !BRAZIL_CITIES[form.state].some(c => c.toLowerCase() === form.city.toLowerCase())) && (
                        <option value={form.city}>{form.city}</option>
                      )}
                      {form.state && BRAZIL_CITIES[form.state] && BRAZIL_CITIES[form.state].map(cityName => (
                        <option key={cityName} value={cityName}>{cityName}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      className="profile-input profile-input--dark" 
                      value={form.city || ''} 
                      onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))} 
                    />
                  )}
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
            <div className="profile-card__header profile-card__header--dark"><h2>Faixa e historico tecnico</h2></div>
            <div className="profile-card__body">
              <div className="profile-fields">
                <div className="profile-field">
                  <label>Faixa atual</label>
                  <select className="profile-input profile-input--dark" value={form.belt} onChange={(event) => setForm((previous) => ({ ...previous, belt: event.target.value }))}>
                    <option value="">Selecione a faixa</option>
                    {getAvailableBeltsForAge(age).map((belt) => (
                      <option key={belt} value={belt}>{belt}</option>
                    ))}
                  </select>
                </div>
                <div className="profile-field">
                  <label>Peso / divisao</label>
                  <select className="profile-input profile-input--dark" value={form.weight} onChange={(event) => setForm((previous) => ({ ...previous, weight: event.target.value }))}>
                    <option value="">Selecione o peso</option>
                    {getAvailableWeightsForProfile(age, form.gender).map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="profile-field profile-field--full">
                  <label>Historico de faixa</label>
                  <textarea className="profile-input profile-input--dark profile-textarea" value={form.beltHistory} onChange={(event) => setForm((previous) => ({ ...previous, beltHistory: event.target.value }))} placeholder="Ex: Azul (2023), Roxa (2025)." rows={3} />
                </div>
              </div>
            </div>
          </article>

          <article className="profile-card profile-card--dark">
            <div className="profile-card__header profile-card__header--dark" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2>Academia e Equipe</h2>
              <button
                type="button"
                onClick={() => navigate('/registro-academia')}
                style={{
                  background: 'rgba(0, 194, 203, 0.12)',
                  border: '1px solid rgba(0, 194, 203, 0.35)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  color: '#00c2cb',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <PlusCircle size={15} />
                Cadastrar Nova Academia
              </button>
            </div>
            <div className="profile-card__body">
              <div className="profile-fields">
                <div className="profile-field profile-field--full">
                  <label>Academia</label>
                  <AcademySelect 
                    academies={academies} 
                    value={form.academyId} 
                    onChange={(value) => setForm((previous) => ({ ...previous, academyId: value }))} 
                    onRegisterNew={(typedName) => navigate('/registro-academia', { state: { initialName: typedName || '' } })} 
                    theme="light"
                  />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Não encontrou sua equipe na lista?
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/registro-academia')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#00c2cb',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      + Cadastrar Nova Academia
                    </button>
                  </div>
                </div>
                <div className="profile-field profile-field--full" style={{ marginTop: '10px' }}>
                  <label>Afiliação/Equipe Selecionada</label>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 500, margin: 0 }}>
                    {selectedAcademy ? selectedAcademy.name : 'Sem equipe/afiliação'}
                  </p>
                </div>
              </div>
            </div>
          </article>

          {error && <div className="login-error" style={{ marginTop: '12px' }}><p>{error}</p></div>}
          {success && (
            <div className="profile-success" style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 9999,
              padding: '14px 22px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '15px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
              animation: 'fadeInUp 0.3s ease',
              minWidth: '260px',
              textAlign: 'center'
            }}>
              {success}
            </div>
          )}

          <div className="profile-actions-row">
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              <Save size={18} />
              {isSaving ? 'Salvando...' : 'Salvar alteracoes'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleReset}>
              <UserRound size={18} />
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
              <div className="profile-actions-row" style={{ marginTop: '20px' }}>
                <button type="button" className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)', border: '1px solid #475569', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }} onClick={() => setShowDigitalCard(true)}>
                  <ScanLine size={16} />
                  Gerar Carteirinha Digital
                </button>
              </div>
            </div>
          </article>

          {recommendedEvents.length > 0 && (
            <article className="profile-card profile-card--dark" style={{ border: '1px solid rgba(0, 194, 203, 0.3)', background: 'rgba(0, 194, 203, 0.03)' }}>
              <div className="profile-card__header profile-card__header--dark" style={{ borderBottom: '1px solid rgba(0, 194, 203, 0.1)' }}>
                <h2 style={{ color: '#00c2cb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Trophy size={16} /> Recomendado para Você
                </h2>
              </div>
              <div className="profile-card__body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {recommendedEvents.map(event => (
                    <div key={event.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                        {event.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                        <MapPin size={12} /> {event.location || event.city || 'Local a definir'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '16px', lineHeight: 1.4 }}>
                        As inscrições para o <strong>{event.name}</strong> estão abertas para a sua categoria 
                        <span style={{ color: '#00c2cb', fontWeight: 600 }}> ({form.belt || 'Branca'} / {form.weight || 'Absoluto'})</span>.
                      </div>
                      <Link to={`/inscricao/${event.id}`} className="btn btn-primary" style={{ width: '100%', padding: '8px', fontSize: '0.9rem' }}>
                        Inscrever-se Agora
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          )}

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

      <AnimatePresence>
        {showDigitalCard && (
          <AthleteDigitalCard 
            profile={{ ...currentProfile, ...form, fullName: buildFullName(form.firstName, form.middleName, form.lastName) }} 
            academyName={selectedAcademy?.name} 
            profileUrl={currentProfile?.id ? `${window.location.origin}/perfil-publico?codigo=${btoa(JSON.stringify({ athleteId: currentProfile.id }))}` : window.location.origin} 
            onClose={() => setShowDigitalCard(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
