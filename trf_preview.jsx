import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Users,
  Settings,
  CreditCard,
  Plus,
  Check,
  ChevronRight,
  AlertCircle,
  QrCode,
  Copy,
  Info,
  Camera,
  ArrowLeft,
  ShieldCheck,
  Minus,
  Lock,
  Globe,
  Calendar,
  Phone
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { useI18n } from '../hooks/useI18n';
import LoginOverlay from './LoginOverlay';
import {
  formatBrlCurrency,
  normalizeEventBeltRegistration,
  normalizeEventFees,
  resolveAthleteEventPrice,
  resolveEventPixKey
} from '../utils/eventPricing';
import { publicRegistrationService } from '../services/publicRegistrationService';
import { generatePixPayload } from '../utils/pix';
import QRCode from 'qrcode';

const normalizeLookup = (value = '') => value
  .toString()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const compactLookup = (value = '') => normalizeLookup(value).replace(/[^a-z0-9]/g, '');

const emailLocalPart = (value = '') => normalizeLookup(value).split('@')[0] || '';

const normalizeWhatsappPhone = (value = '') => {
  const digits = (value || '').toString().replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
};

// Determina automaticamente a categoria etria CBJJ pelo perfil
const resolveCategoryByProfile = (profile) => {
  const age = Number(profile.age) || 0;
  const gender = (profile.gender || profile.genero || '').toLowerCase();
  const isFemale = gender.includes('femi') || gender.includes('mulher');
  const genderLabel = isFemale ? 'Feminino' : 'Masculino';

  let ageCategory, ageCategoryLabel, ageCategoryColor;

  if      (age >= 4  && age <= 7)  { ageCategory = 'Infantil';        ageCategoryLabel = 'Infantil (47 anos)';        ageCategoryColor = '#22c55e'; }
  else if (age >= 8  && age <= 9)  { ageCategory = 'Infantil A';      ageCategoryLabel = 'Infantil A (89 anos)';      ageCategoryColor = '#22c55e'; }
  else if (age >= 10 && age <= 11) { ageCategory = 'Infantil B';      ageCategoryLabel = 'Infantil B (1011 anos)';    ageCategoryColor = '#22c55e'; }
  else if (age >= 12 && age <= 13) { ageCategory = 'Infanto-Juvenil'; ageCategoryLabel = 'Infanto-Juvenil (1213 anos)'; ageCategoryColor = '#f59e0b'; }
  else if (age >= 14 && age <= 15) { ageCategory = 'Juvenil';         ageCategoryLabel = 'Juvenil (1415 anos)';       ageCategoryColor = '#f59e0b'; }
  else if (age >= 16 && age <= 29) { ageCategory = 'Adulto';          ageCategoryLabel = 'Adulto (1629 anos)';        ageCategoryColor = '#3b82f6'; }
  else if (age >= 30 && age <= 35) { ageCategory = 'Master 1';        ageCategoryLabel = 'Master 1 (3035 anos)';      ageCategoryColor = '#8b5cf6'; }
  else if (age >= 36 && age <= 40) { ageCategory = 'Master 2';        ageCategoryLabel = 'Master 2 (3640 anos)';      ageCategoryColor = '#8b5cf6'; }
  else if (age >= 41 && age <= 45) { ageCategory = 'Master 3';        ageCategoryLabel = 'Master 3 (4145 anos)';      ageCategoryColor = '#8b5cf6'; }
  else if (age >= 46 && age <= 50) { ageCategory = 'Master 4';        ageCategoryLabel = 'Master 4 (4650 anos)';      ageCategoryColor = '#8b5cf6'; }
  else if (age >= 51 && age <= 55) { ageCategory = 'Master 5';        ageCategoryLabel = 'Master 5 (5155 anos)';      ageCategoryColor = '#8b5cf6'; }
  else if (age >= 56)              { ageCategory = 'Master 6';        ageCategoryLabel = 'Master 6 (56+ anos)';        ageCategoryColor = '#8b5cf6'; }
  else                             { ageCategory = 'Adulto';          ageCategoryLabel = 'Adulto';                     ageCategoryColor = '#3b82f6'; }

  return { ageCategory, ageCategoryLabel, ageCategoryColor, genderLabel, isFemale, age };
};

const resolveWeightOptions = (profile, isNoGi, eventOptions) => {
  if (eventOptions && typeof eventOptions === 'string' && eventOptions.trim()) {
    return eventOptions.split('\n').map(o => o.trim()).filter(Boolean).map(o => ({ value: o, label: o }));
  }

  const age = Number(profile.age) || 30;
  const gender = (profile.gender || profile.genero || '').toLowerCase();
  const isFemale = gender.includes('femi') || gender.includes('mulher');

  if (age <= 15) {
    const categoryInfo = resolveCategoryByProfile(profile);
    const suffix = `${categoryInfo.ageCategory} - ${categoryInfo.genderLabel}`;
    return [
      { value: 'Galo', label: `Galo (${suffix})` },
      { value: 'Pluma', label: `Pluma (${suffix})` },
      { value: 'Pena', label: `Pena (${suffix})` },
      { value: 'Leve', label: `Leve (${suffix})` },
      { value: 'Mdio', label: `Mdio (${suffix})` },
      { value: 'Meio-Pesado', label: `Meio-Pesado (${suffix})` },
      { value: 'Pesado', label: `Pesado (${suffix})` },
      { value: 'Super-Pesado', label: `Super-Pesado (${suffix})` },
      { value: 'Pesadssimo', label: `Pesadssimo (${suffix})` }
    ];
  }

  if (isFemale) {
    if (isNoGi) {
      return [
        { value: 'Galo', label: 'Galo (at 46.5kg)' },
        { value: 'Pluma', label: 'Pluma (at 51.5kg)' },
        { value: 'Pena', label: 'Pena (at 56.5kg)' },
        { value: 'Leve', label: 'Leve (at 61.5kg)' },
        { value: 'Mdio', label: 'Mdio (at 66.5kg)' },
        { value: 'Meio-Pesado', label: 'Meio-Pesado (at 71.5kg)' },
        { value: 'Pesado', label: 'Pesado (at 76.5kg)' },
        { value: 'Super-Pesado', label: 'Super-Pesado (acima de 76.5kg)' }
      ];
    }
    return [
      { value: 'Galo', label: 'Galo (at 47.5kg)' },
      { value: 'Pluma', label: 'Pluma (at 53.5kg)' },
      { value: 'Pena', label: 'Pena (at 58.5kg)' },
      { value: 'Leve', label: 'Leve (at 64kg)' },
      { value: 'Mdio', label: 'Mdio (at 69kg)' },
      { value: 'Meio-Pesado', label: 'Meio-Pesado (at 74kg)' },
      { value: 'Pesado', label: 'Pesado (at 79.3kg)' },
      { value: 'Super-Pesado', label: 'Super-Pesado (acima de 79.3kg)' }
    ];
  }

  if (isNoGi) {
    return [
      { value: 'Galo', label: 'Galo (at 55.5kg)' },
      { value: 'Pluma', label: 'Pluma (at 61.5kg)' },
      { value: 'Pena', label: 'Pena (at 67.5kg)' },
      { value: 'Leve', label: 'Leve (at 73.5kg)' },
      { value: 'Mdio', label: 'Mdio (at 79.5kg)' },
      { value: 'Meio-Pesado', label: 'Meio-Pesado (at 85.5kg)' },
      { value: 'Pesado', label: 'Pesado (at 91.5kg)' },
      { value: 'Super-Pesado', label: 'Super-Pesado (at 97.5kg)' },
      { value: 'Pesadssimo', label: 'Pesadssimo (acima de 97.5kg)' }
    ];
  }

  return [
    { value: 'Galo', label: 'Galo (at 57.5kg)' },
    { value: 'Pluma', label: 'Pluma (at 64kg)' },
    { value: 'Pena', label: 'Pena (at 70kg)' },
    { value: 'Leve', label: 'Leve (at 76kg)' },
    { value: 'Mdio', label: 'Mdio (at 82.3kg)' },
    { value: 'Meio-Pesado', label: 'Meio-Pesado (at 88.3kg)' },
    { value: 'Pesado', label: 'Pesado (at 94.3kg)' },
    { value: 'Super-Pesado', label: 'Super-Pesado (at 100.5kg)' },
    { value: 'Pesadssimo', label: 'Pesadssimo (acima de 100.5kg)' }
  ];
};

// Function moved up


const buildBeltRegistrationWhatsappUrl = ({ event = {}, profile = {}, beltRegistration = {} } = {}) => {
  const phone = normalizeWhatsappPhone(
    event.beltRegistrationWhatsapp
      || event.eventSocialWhatsapp
      || event.organizerWhatsapp
      || event.whatsapp
      || ''
  );
  if (!phone) return '';
  const athleteName = profile.fullName || profile.nome || profile.name || 'Atleta';
  const beltName = beltRegistration.title || 'Cinturo';
  const priceText = formatBrlCurrency(beltRegistration.price || 0);
  const message = [
    `Ola, quero fazer a inscricao no ${beltName}.`,
    `Evento: ${event.name || ''}`,
    `Atleta: ${athleteName}`,
    `Faixa: ${profile.belt || profile.faixa || ''}`,
    `Valor informado: ${priceText}`
  ].filter(Boolean).join('\n');
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

const resolveProfilesForCurrentUser = (profiles = [], currentUser = null) => {
  const list = Array.isArray(profiles) ? profiles.filter(Boolean) : [];
  if (!currentUser) return list;

  const username = normalizeLookup(currentUser.username || '');
  const usernameLocal = emailLocalPart(currentUser.username || '');
  const userName = normalizeLookup(currentUser.name || '');
  const compactUserName = compactLookup(currentUser.name || '');
  const compactUsername = compactLookup(currentUser.username || '');
  const role = normalizeLookup(currentUser.role || '');

  const matches = list
    .map((profile) => {
      const profileName = normalizeLookup(profile.fullName || profile.nome || profile.name || '');
      const profileCompactName = compactLookup(profile.fullName || profile.nome || profile.name || '');
      const profileEmail = normalizeLookup(profile.email || '');
      const profileEmailLocal = emailLocalPart(profile.email || '');
      const accountUsername = normalizeLookup(profile.accountUsername || profile.loginUsername || profile.username || '');
      const createdBy = normalizeLookup(profile.createdByUsername || '');
      let score = 0;

      if (username && accountUsername === username) score = Math.max(score, 120);
      if (username && profileEmail === username) score = Math.max(score, 110);
      if (username && createdBy === username) score = Math.max(score, 100);
      if (usernameLocal && profileEmailLocal === usernameLocal) score = Math.max(score, 95);
      if (userName && profileName === userName) score = Math.max(score, role.includes('atleta') || role.includes('athlete') ? 80 : 55);
      if (compactUserName && profileCompactName && (
        profileCompactName === compactUserName
        || profileCompactName.includes(compactUserName)
        || compactUserName.includes(profileCompactName)
      )) score = Math.max(score, 60);
      if (compactUsername && profileCompactName && (
        profileCompactName === compactUsername
        || profileCompactName.includes(compactUsername)
        || compactUsername.includes(profileCompactName)
      )) score = Math.max(score, 50);

      return { profile, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.profile);

  const byId = new Map();
  matches.forEach(profile => byId.set(profile.id, profile));

  if (!byId.size) {
    byId.set('__current_user_profile__', {
      id: '__current_user_profile__',
      fullName: currentUser.name || currentUser.username || 'Meu perfil',
      email: currentUser.username || '',
      accountUsername: currentUser.username || '',
      createdByUsername: currentUser.username || '',
      photoUrl: currentUser.photoUrl || currentUser.avatarUrl || '',
      academyName: currentUser.academyName || '',
      gender: currentUser.gender || 'Masculino',
      belt: currentUser.belt || '',
      country: currentUser.country || 'Brasil',
      isTemporaryAccountProfile: true
    });
  }

  return [...byId.values()];
};

// Progress Bar Component
const ProgressBar = ({ currentStep }) => {
  const steps = [
    { id: 'profile', label: 'DETALHES DO USU�RIO', icon: Users },
    { id: 'category', label: 'Entradas', icon: Settings },
    { id: 'payment', label: 'Pagamento', icon: CreditCard }
  ];

  return (
    <div className="registration-progress">
      <div className="registration-progress__line">
        {steps.map((step, index) => {
          const stepIndex = index + 1;
          const isActive = currentStep >= stepIndex;
          const isCompleted = currentStep > stepIndex;

          return (
            <React.Fragment key={step.id}>
              <div className={`registration-progress__step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                <div className="registration-progress__icon">
                  {isCompleted ? <Check size={16} /> : <step.icon size={16} />}
                </div>
                <span className="registration-progress__label">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`registration-progress__connector ${currentStep > stepIndex ? 'active' : ''}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

const TournamentRegistrationFlow = ({ event, onComplete }) => {
  const { currentUser, memberProfiles = [], academies = [], addMemberProfile } = useStore() || {};
  const [step, setStep] = useState(1); // 1: Profile Select, 1.5: Profile Confirm, 2: Category, 3: Payment
  const [showLogin, setShowLogin] = useState(!currentUser);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [registrationData, setRegistrationData] = useState({
    category: '',
    weight: '',
    modality: 'GI',
    absolute: false,
    price: 0
  });

  const selectableProfiles = useMemo(
    () => resolveProfilesForCurrentUser(memberProfiles, currentUser),
    [memberProfiles, currentUser]
  );

  // Load saved progress from local storage
  useEffect(() => {
    if (selectedProfile && event?.id) {
      const safeProfile = { ...selectedProfile };
      if (typeof safeProfile.photoUrl === 'string' && safeProfile.photoUrl.startsWith('data:image')) {
          safeProfile.photoUrl = '';
      }
      if (typeof safeProfile.coverUrl === 'string' && safeProfile.coverUrl.startsWith('data:image')) {
          safeProfile.coverUrl = '';
      }
      
      const state = {
        profileId: selectedProfile.id,
        profileSnapshot: safeProfile,
        data: registrationData,
        step: step
      };
      
      try {
        localStorage.setItem(`registration_progress_${event.id}`, JSON.stringify(state));
      } catch (err) {
        console.warn('Quota exceeded in localStorage', err);
      }
    }
  }, [selectedProfile, registrationData, step, event?.id]);

  const handleLoginSuccess = () => {
    setShowLogin(false);
  };

  const handleProfileSelect = (profile) => {
    setSelectedProfile(profile);
    setStep(1.5);
  };

  const handleProfileUpdate = (updates) => {
    setSelectedProfile((current) => {
      const next = { ...(current || {}), ...(updates || {}) };
      if (!next.fullName && (next.nome || next.name)) {
        next.fullName = next.nome || next.name;
      }

      if (next.id && !next.isTemporaryAccountProfile && typeof addMemberProfile === 'function') {
        try {
          const saved = addMemberProfile({
            ...next,
            accountUsername: next.accountUsername || currentUser?.username || '',
            createdByUsername: next.createdByUsername || currentUser?.username || '',
            createdByName: next.createdByName || currentUser?.name || ''
          });
          return { ...next, ...saved };
        } catch (error) {
          alert(error?.message || 'Nao foi possivel salvar o perfil agora.');
        }
      }

      return next;
    });
  };

  const handleProfileConfirm = () => {
    setStep(2);
  };

  const handleCategoryConfirm = (data) => {
    setRegistrationData(data);
    setStep(3);
  };

  const handleFinish = async () => {
    try {
      const payload = {
        eventId: event.id,
        eventName: event.name,
        athleteId: selectedProfile.isTemporaryAccountProfile ? '' : selectedProfile.id,
        profileId: selectedProfile.isTemporaryAccountProfile ? '' : selectedProfile.id,
        nome: selectedProfile.fullName || selectedProfile.nome,
        email: selectedProfile.email || currentUser.username,
        phone: selectedProfile.phone || '',
        academia: selectedProfile.academyName || '',
        faixa: selectedProfile.belt || selectedProfile.faixa,
        categoria: registrationData.category || 'Adulto',
        peso: registrationData.weight,
        genero: selectedProfile.gender || 'Masculino',
        modalidade: registrationData.modality,
        price: registrationData.price,
        notes: JSON.stringify({
          absolute: registrationData.absolute,
          modalities: registrationData.modalities || [],
          pricingBreakdown: registrationData.pricingBreakdown || null,
          savedLocally: true
        })
      };

      await publicRegistrationService.register(payload);
      localStorage.removeItem(`registration_progress_${event.id}`);
      if (onComplete) onComplete();
      setStep(4);
    } catch (error) {
      alert("Erro ao finalizar inscri��o: " + error.message);
    }
  };

  const handleBack = () => {
    if (step === 1.5) setStep(1);
    else if (step > 1) setStep(Math.floor(step - 1));
  };

  if (showLogin) {
    return <LoginOverlay onSuccess={handleLoginSuccess} onClose={() => window.history.back()} />;
  }

  if (!event) return null;

  return (
    <div className="registration-flow">
      <div className="registration-flow__header">
        <button className="registration-flow__back" onClick={handleBack} disabled={step === 1}>
          <ArrowLeft size={20} />
        </button>
        <div className="registration-flow__title">
          <h1 className="text-uppercase">{step === 1 ? 'SELECIONE O PERFIL' : `REGISTRAR PARA ${event.name.toUpperCase()}`}</h1>
          {step > 1 && <p>Inscrio oficial Genesis �� {event.name}</p>}
        </div>
      </div>

      {step > 1 && <ProgressBar currentStep={Math.floor(step)} />}

      <main className="registration-flow__content">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <ProfileSelectionStep
              key="step1"
              profiles={selectableProfiles}
              onSelect={handleProfileSelect}
            />
          )}
          {step === 1.5 && (
            <ProfileConfirmationStep
              key="step1.5"
              profile={selectedProfile}
              event={event}
              onProfileUpdate={handleProfileUpdate}
              onConfirm={handleProfileConfirm}
              onBack={() => setStep(1)}
            />
          )}
          {step === 2 && (
            <CategorySelectionStep
              key="step2"
              profile={selectedProfile}
              event={event}
              onConfirm={handleCategoryConfirm}
              onBack={() => setStep(1.5)}
            />
          )}
          {step === 3 && (
            <PaymentStep
              key="step3"
              event={event}
              profile={selectedProfile}
              registration={registrationData}
              onComplete={handleFinish}
            />
          )}
          {step === 4 && (
            <SuccessStep
              key="step4"
              event={event}
              profile={selectedProfile}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

// --- Sub-components for Steps ---

const ProfileSelectionStep = ({ profiles, onSelect }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="profile-selection-v2"
    >
      <div className="avatar-grid">
        {profiles.map(profile => (
          <div key={profile.id} className="avatar-item" onClick={() => onSelect(profile)}>
            <div className="avatar-circle">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt={profile.fullName} />
              ) : (
                <User size={48} />
              )}
            </div>
            <span className="avatar-label">{profile.fullName || profile.nome}</span>
          </div>
        ))}

        <div className="avatar-item">
          <div className="avatar-circle add">
            <Plus size={48} />
          </div>
          <span className="avatar-label">Adicionar um novo perfil</span>
        </div>

        <div className="avatar-item">
          <div className="avatar-circle unlink">
            <Minus size={48} />
          </div>
          <span className="avatar-label">Desvincular perfil</span>
        </div>
      </div>
    </motion.div>
  );
};

const ProfileConfirmationStep = ({ profile, event, onProfileUpdate, onConfirm, onBack }) => {
  const [draftProfile, setDraftProfile] = useState(profile || {});
  const [editingField, setEditingField] = useState('');

  useEffect(() => {
    setDraftProfile(profile || {});
    setEditingField('');
  }, [profile]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
      }
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch (e) {
      return dateString;
    }
  };

  const getFieldValue = (field) => {
    if (field === 'country') return draftProfile.country || draftProfile.nationality || draftProfile.pais || 'Brasil';
    if (field === 'birthDate') return draftProfile.birthDate || draftProfile.dataNascimento || '';
    if (field === 'gender') return draftProfile.gender || draftProfile.genero || 'Masculino';
    if (field === 'phone') return draftProfile.phone || draftProfile.telefone || '';
    return draftProfile[field] || '';
  };

  const setFieldValue = (field, value) => {
    setDraftProfile((current) => {
      const next = { ...current };
      if (field === 'country') {
        next.country = value;
        next.nationality = value;
        next.pais = value;
        return next;
      }
      if (field === 'birthDate') {
        next.birthDate = value;
        next.dataNascimento = value;
        return next;
      }
      if (field === 'gender') {
        next.gender = value;
        next.genero = value;
        return next;
      }
      if (field === 'phone') {
        next.phone = value;
        next.telefone = value;
        return next;
      }
      next[field] = value;
      return next;
    });
  };

  const saveField = (field) => {
    if (typeof onProfileUpdate === 'function') {
      onProfileUpdate(draftProfile);
    }
    setEditingField('');
  };

  const cancelField = () => {
    setDraftProfile(profile || {});
    setEditingField('');
  };

  const renderEditableField = (field, label, displayValue, inputType = 'text') => {
    const isEditing = editingField === field;
    return (
      <div className={`table-row ${isEditing ? 'is-editing' : ''}`}>
        <div className="cell label">{label}</div>
        <div className="cell value">
          {isEditing ? (
            field === 'gender' ? (
              <select
                className="registration-inline-input"
                value={getFieldValue(field)}
                onChange={(event) => setFieldValue(field, event.target.value)}
                autoFocus
              >
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
              </select>
            ) : (
              <input
                className="registration-inline-input"
                type={inputType}
                value={getFieldValue(field)}
                onChange={(event) => setFieldValue(field, event.target.value)}
                autoFocus
              />
            )
          ) : (
            displayValue || '-'
          )}
        </div>
        <div className="cell action">
          {isEditing ? (
            <span className="registration-inline-actions">
              <button type="button" onClick={() => saveField(field)}>Salvar</button>
              <button type="button" onClick={cancelField}>Cancelar</button>
            </span>
          ) : (
            <button type="button" onClick={() => setEditingField(field)}>Editar</button>
          )}
          {!requiredProfileOk && (
            <p className="photo-warning">
              <AlertCircle size={14} />
              Complete nacionalidade, nascimento, genero e telefone antes de continuar.
            </p>
          )}
        </div>
      </div>
    );
  };

  const requiredProfileOk = Boolean(
    getFieldValue('country')
    && getFieldValue('birthDate')
    && getFieldValue('gender')
    && getFieldValue('phone')
  );
  const canContinue = Boolean(draftProfile.photoUrl && requiredProfileOk && !editingField);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="registration-details-v2"
    >
      {/* Organizer Info Section */}
      <div className="details-section organizer">
        <div className="section-header">Evento selecionado</div>
        <div className="section-content">
          <h3>{event.name} <Info size={16} /></h3>
          <span className="badge-new">Evento Oficial Genesis</span>
          <div className="stats">
            <div className="stat-item"><div className="dot" /> {event.city || 'Sede Local'}</div>
            <div className="stat-item"><div className="dot" /> {event.modality || 'Jiu-Jitsu'}</div>
          </div>
        </div>
      </div>

      {/* Policy Section */}
      <div className="details-section policy">
        <div className="section-header">Pol�tica de Cancelamento/Reembolso</div>
        <div className="section-content">
          <div className="policy-row">
            <div className="policy-label">�ltimo dia para cancelar</div>
            <div className="policy-value">{formatDate(event.cancelDeadline || event.registrationEnd)}</div>
          </div>
          <div className="policy-row">
            <div className="policy-label">Reembolso: {event.refundPolicy || 'Sujeito a an�lise do organizador'}</div>
            <div className="policy-value" aria-hidden="true" />
          </div>
          <div className="policy-row">
            <div className="policy-label">�ltimo dia para editar</div>
            <div className="policy-value">{formatDate(event.editDeadline || event.checkInDate)}</div>
          </div>
        </div>
      </div>

      <div className="breadcrumb-nav">
        <span className="active">DETALHES DO USU�RIO</span>
        <ChevronRight size={16} />
        <span>ENTRADAS</span>
        <ChevronRight size={16} />
        <span>PAGAMENTO</span>
      </div>

      {/* User Details Table */}
      <div className="details-section user-table">
        <div className="section-header">DETALHES DO USU�RIO</div>
        <div className="section-content table-style">
          <div className="table-row">
            <div className="cell label">Primeiro nome</div>
            <div className="cell value"><Lock size={14} /> {draftProfile.fullName?.split(' ')[0] || draftProfile.nome || '-'}</div>
          </div>
          <div className="table-row">
            <div className="cell label">Sobrenomes</div>
            <div className="cell value"><Lock size={14} /> {draftProfile.fullName?.split(' ').slice(1).join(' ') || draftProfile.sobrenome || '-'}</div>
          </div>
          <div className="table-row">
            <div className="cell label">Email</div>
            <div className="cell value"><Lock size={14} /> {draftProfile.email || '-'}</div>
          </div>
          <div className="table-row">
            <div className="cell label">Nacionalidade</div>
            <div className="cell value">{editingField === 'country' ? <input className="registration-inline-input" value={getFieldValue('country')} onChange={(event) => setFieldValue('country', event.target.value)} autoFocus /> : getFieldValue('country')}</div>
            <div className="cell action">{editingField === 'country' ? <span className="registration-inline-actions"><button type="button" onClick={() => saveField('country')}>Salvar</button><button type="button" onClick={cancelField}>Cancelar</button></span> : <button type="button" onClick={() => setEditingField('country')}>Editar</button>}</div>
          </div>
          <div className="table-row">
            <div className="cell label">Data de nascimento</div>
            <div className="cell value">{editingField === 'birthDate' ? <input className="registration-inline-input" type="date" value={getFieldValue('birthDate')} onChange={(event) => setFieldValue('birthDate', event.target.value)} autoFocus /> : formatDate(getFieldValue('birthDate'))}</div>
            <div className="cell action">{editingField === 'birthDate' ? <span className="registration-inline-actions"><button type="button" onClick={() => saveField('birthDate')}>Salvar</button><button type="button" onClick={cancelField}>Cancelar</button></span> : <button type="button" onClick={() => setEditingField('birthDate')}>Editar</button>}</div>
          </div>
          <div className="table-row">
            <div className="cell label">G�nero</div>
            <div className="cell value">{editingField === 'gender' ? <select className="registration-inline-input" value={getFieldValue('gender')} onChange={(event) => setFieldValue('gender', event.target.value)} autoFocus><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option></select> : getFieldValue('gender')}</div>
            <div className="cell action">{editingField === 'gender' ? <span className="registration-inline-actions"><button type="button" onClick={() => saveField('gender')}>Salvar</button><button type="button" onClick={cancelField}>Cancelar</button></span> : <button type="button" onClick={() => setEditingField('gender')}>Editar</button>}</div>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="details-section contact-table">
        <div className="section-header">Contato e resid�ncia</div>
        <div className="section-content table-style">
          <div className="table-row">
            <div className="cell label">Telefone</div>
            <div className="cell value">{editingField === 'phone' ? <input className="registration-inline-input" type="tel" value={getFieldValue('phone')} onChange={(event) => setFieldValue('phone', event.target.value)} autoFocus /> : (getFieldValue('phone') || '-')}</div>
            <div className="cell action">{editingField === 'phone' ? <span className="registration-inline-actions"><button type="button" onClick={() => saveField('phone')}>Salvar</button><button type="button" onClick={cancelField}>Cancelar</button></span> : <button type="button" onClick={() => setEditingField('phone')}>Editar</button>}</div>
          </div>
        </div>
      </div>

      {/* Profile Image Section */}
      <div className="details-section profile-image">
        <div className="section-header">
          Imagem de perfil
          <Link to={`/minha-conta`} className="btn-edit-small">Alterar no Perfil</Link>
        </div>
        <div className="section-content centered">
          <div className={`profile-image-circle ${!draftProfile.photoUrl ? 'missing-photo' : ''}`}>
            {draftProfile.photoUrl ? (
              <img src={draftProfile.photoUrl} alt="Profile" />
            ) : (
              <div className="photo-alert">
                <Camera size={32} />
                <span>Foto Necess�ria</span>
              </div>
            )}
          </div>
          {!draftProfile.photoUrl && (
            <p className="photo-warning">
              <AlertCircle size={14} />
              Aten��o: � obrigat�rio ter uma foto no perfil para identifica��o no dia do evento.
            </p>
          )}
        </div>
      </div>

      <div className="footer-actions-v2">
        <button
          className="btn-save-continue"
          onClick={() => {
            if (!canContinue) return;
            onProfileUpdate(draftProfile);
            onConfirm();
          }}
          disabled={!canContinue}
          title={!draftProfile.photoUrl ? "Adicione uma foto ao seu perfil primeiro" : ""}
        >
          {draftProfile.photoUrl ? 'Salve e continue' : 'Adicione uma foto para continuar'}
          <ChevronRight size={20} />
        </button>
      </div>
    </motion.div>
  );
};

const CategorySelectionStep = ({ profile, event, onConfirm, onBack }) => {
  const [modalities, setModalities] = useState(['GI']);
  const [weight, setWeight] = useState('');
  const [absolute, setAbsolute] = useState(false);
  const weightOptions = useMemo(() => {
    const isNoGiOnly = modalities.length === 1 && modalities[0] === 'NO-GI';
    const eventCustomOptions = isNoGiOnly ? event?.weightTableNoGiOptions : event?.weightTableGiOptions;
    return resolveWeightOptions(profile, isNoGiOnly, eventCustomOptions);
  }, [profile, modalities, event]);

  const eventFees = useMemo(() => normalizeEventFees(event), [event]);
  const beltRegistration = useMemo(() => normalizeEventBeltRegistration(event), [event]);
  const beltWhatsappUrl = useMemo(() => buildBeltRegistrationWhatsappUrl({
    event,
    profile,
    beltRegistration
  }), [beltRegistration, event, profile]);
  const serverClockPrice = useMemo(() => resolveAthleteEventPrice({
    event,
    athlete: profile,
    modalitiesCount: modalities.length,
    absolute
  }), [absolute, event, modalities.length, profile]);
  const basePrice = serverClockPrice.base || ((profile.age || 0) <= 15 ? eventFees.under15 : eventFees.over15);
  const absoluteFee = serverClockPrice.absoluteFee || eventFees.absolute;
  const comboPrice = serverClockPrice.combo || eventFees.combo;
  const activeBatchName = serverClockPrice.batchName || 'Lote atual';
  const categoryBasePrice = modalities.length === 2 ? comboPrice : basePrice;

  const totalPrice = useMemo(() => {
    const fallbackTotal = categoryBasePrice + (absolute ? absoluteFee : 0);
    return serverClockPrice.total || fallbackTotal;
  }, [absolute, absoluteFee, categoryBasePrice, serverClockPrice.total]);

  const toggleModality = (mod) => {
    setModalities(prev => {
      if (prev.includes(mod)) {
        if (prev.length === 1) return prev;
        return prev.filter(m => m !== mod);
      }
      return [...prev, mod];
    });
  };

  const handleBeltRegistration = () => {
    if (!beltWhatsappUrl) {
      alert('WhatsApp do campeonato nao configurado para inscricao de cinturao.');
      return;
    }
    window.open(beltWhatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!weight) return;
    const pricingBreakdown = resolveAthleteEventPrice({
      event,
      athlete: profile,
      modalitiesCount: modalities.length,
      absolute
    });
    onConfirm({
      modality: modalities.join(' & '),
      modalities,
      weight,
      absolute,
      pricingBreakdown: {
        ...pricingBreakdown,
        categoryBase: categoryBasePrice
      },
      price: pricingBreakdown.total || totalPrice
    });
  };

  const categoryInfo = useMemo(() => resolveCategoryByProfile(profile), [profile]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="registration-step-v2"
    >
      <div className="registration-header-pro">
        <div className="event-tag">Inscrio de Atleta</div>
        <h2>Escolha suas categorias</h2>

        {/* AUTO-DETECTED CATEGORY BADGE */}
        <div className="auto-category-badge" style={{ marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: categoryInfo.ageCategoryColor + '22',
            border: `1.5px solid ${categoryInfo.ageCategoryColor}`,
            color: categoryInfo.ageCategoryColor,
            borderRadius: '20px', padding: '4px 14px', fontWeight: 700,
            fontSize: '13px', letterSpacing: '0.5px'
          }}>
             {categoryInfo.ageCategoryLabel}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: categoryInfo.isFemale ? '#ec489920' : '#3b82f620',
            border: `1.5px solid ${categoryInfo.isFemale ? '#ec4899' : '#3b82f6'}`,
            color: categoryInfo.isFemale ? '#ec4899' : '#3b82f6',
            borderRadius: '20px', padding: '4px 14px', fontWeight: 700,
            fontSize: '13px', letterSpacing: '0.5px'
          }}>
            {categoryInfo.isFemale ? ' Feminino' : ' Masculino'}
          </span>
        </div>

        <div className="athlete-summary-bar">
          <div className="summary-item">
            <span className="label">Atleta:</span>
            <span className="value">{profile.fullName || profile.nome}</span>
          </div>
          <div className="summary-item">
            <span className="label">Faixa:</span>
            <span className="value">{profile.belt || profile.faixa}</span>
          </div>
          {categoryInfo.age > 0 && (
            <div className="summary-item">
              <span className="label">Idade:</span>
              <span className="value">{categoryInfo.age} anos</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="category-selection-form">
        <div className="form-group-pro">
          <label>Modalidades (Selecione o que ir lutar)</label>
          <div className="modality-grid-pro">
            <button
              type="button"
              className={`modality-btn-pro ${modalities.includes('GI') ? 'is-active' : ''}`}
              onClick={() => toggleModality('GI')}
            >
              <div className="modality-btn-pro__check">
                <Check size={14} />
              </div>
              <div className="modality-btn-pro__content">
                <strong>GI</strong>
                <span>KIMONO</span>
              </div>
            </button>
            <button
              type="button"
              className={`modality-btn-pro ${modalities.includes('NO-GI') ? 'is-active' : ''}`}
              onClick={() => toggleModality('NO-GI')}
            >
              <div className="modality-btn-pro__check">
                <Check size={14} />
              </div>
              <div className="modality-btn-pro__content">
                <strong>NO-GI</strong>
                <span>SEM KIMONO</span>
              </div>
            </button>
            {beltRegistration.enabled && (
              <button
                type="button"
                className="modality-btn-pro modality-btn-pro--belt"
                onClick={handleBeltRegistration}
              >
                <div className="modality-btn-pro__check">
                  <ShieldCheck size={14} />
                </div>
                <div className="modality-btn-pro__content">
                  <strong>{beltRegistration.title || 'Cinturo'}</strong>
                  <span>{formatBrlCurrency(beltRegistration.price)}  VIA WHATSAPP</span>
                </div>
              </button>
            )}
          </div>
        </div>

        <div className="form-group-pro">
          <label>Categoria de Peso</label>
          <div className="weight-select-wrapper">
            <select
              className="select-pro"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              required
            >
              <option value="">Selecione seu peso...</option>
              {weightOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="absolute-upsell">
          <div className="absolute-upsell__content">
            <h3>Inscrio no Absoluto?</h3>
            <p>Lute na categoria sem limite de peso da sua faixa.</p>
            <div className="absolute-upsell__price">+{formatBrlCurrency(absoluteFee)}</div>
          </div>
          <label className="pro-switch">
            <input type="checkbox" checked={absolute} onChange={(e) => setAbsolute(e.target.checked)} />
            <span className="pro-slider"></span>
          </label>
        </div>

        <div className="registration-footer-sticky">
          <div className="total-panel">
            <div className="total-label">Total a pagar</div>
            <div className="total-amount">{formatBrlCurrency(totalPrice)}</div>
            <div className="total-breakdown">
              {activeBatchName}  {categoryInfo.ageCategoryLabel}  Base {formatBrlCurrency(categoryBasePrice)}
              {absolute ? ` + Absoluto ${formatBrlCurrency(absoluteFee)}` : ''}
            </div>
          </div>
          <button type="submit" className="btn-confirm-pro" disabled={!weight}>
            AVANAR PARA PAGAMENTO <ChevronRight size={20} />
          </button>
        </div>
      </form>
    </motion.div>
  );
};

const PaymentStep = ({ event, profile, registration, onComplete }) => {
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const pixKey = useMemo(() => resolveEventPixKey(event), [event]);

  // Display key: remove parenthetical name if present (e.g. "594.343.682-00 (LEAN...)") 
  const displayPixKey = useMemo(() => {
    return pixKey.replace(/\s*\(.*?\)\s*/g, '').trim();
  }, [pixKey]);

  const pixPayload = useMemo(() => {
    return generatePixPayload({
      key: pixKey,
      name: event.name?.substring(0, 25).toUpperCase() || 'GENESIS RANK',
      city: event.city?.substring(0, 15).toUpperCase() || 'BRASILIA',
      amount: registration.price,
      reference: `REG${event.id.substring(0, 5)}${profile.id.substring(0, 5)}`.toUpperCase()
    });
  }, [pixKey, event, registration.price, profile.id]);

  useEffect(() => {
    if (pixPayload) {
      QRCode.toDataURL(pixPayload, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error('QR Code error:', err));
    }
  }, [pixPayload]);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(displayPixKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(pixPayload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="registration-step"
    >
      <div className="registration-step__header">
        <h2>Hora da Verdade</h2>
        <p>Confira os dados e realize o pagamento para garantir sua vaga.</p>
      </div>

      <div className="payment-layout">
        <div className="payment-summary">
          <div className="summary-card">
            <h3>Resumo do Pedido</h3>
            <div className="summary-row">
              <span>Campeonato:</span>
              <strong>{event.name}</strong>
            </div>
            <div className="summary-row">
              <span>Atleta:</span>
              <strong>{profile.fullName || profile.nome}</strong>
            </div>
            <div className="summary-row">
              <span>Categoria:</span>
              <strong>{registration.weight} ({registration.modality})</strong>
            </div>
            {registration.absolute && (
              <div className="summary-row highlight">
                <span>Incluso:</span>
                <strong>Absoluto</strong>
              </div>
            )}
            <div className="summary-divider" />
            <div className="summary-row total">
              <span>Total a pagar:</span>
              <strong>{formatBrlCurrency(registration.price, 'pt-BR')}</strong>
            </div>
          </div>

          <div className="batch-alert">
            <AlertCircle size={18} />
            <p>O lote atual encerra em <strong>2 dias</strong>. Pague agora para garantir este valor.</p>
          </div>
        </div>

        <div className="payment-methods">
          <div className="method-selector">
            <button
              className={paymentMethod === 'pix' ? 'active' : ''}
              onClick={() => setPaymentMethod('pix')}
            >
              <QrCode size={20} /> Pix
            </button>
            <button
              className={paymentMethod === 'card' ? 'active' : ''}
              onClick={() => setPaymentMethod('card')}
            >
              <CreditCard size={20} /> Cart�o
            </button>
          </div>

          <div className="method-content">
            {paymentMethod === 'pix' ? (
              <div className="pix-payment">
                <div className="pix-qr">
                  {qrCodeDataUrl ? (
                    <div className="pix-qr__container">
                      <img src={qrCodeDataUrl} alt="Pix QR Code" />
                    </div>
                  ) : (
                    <div className="pix-qr__placeholder">
                      <QrCode size={120} />
                      <span>GERANDO QR CODE...</span>
                    </div>
                  )}
                </div>
                <p>Escaneie o c�digo acima ou copie a chave abaixo:</p>
                <div className="pix-copy-box">
                  <input type="text" readOnly value={pixPayload} />
                  <button onClick={handleCopyPix}>
                    <Copy size={18} /> Copiar
                  </button>
                </div>
              </div>
            ) : (
              <div className="card-payment">
                <div className="card-placeholder">
                  <CreditCard size={48} />
                  <p>Integra��o com Cart�o de Cr�dito em breve.</p>
                  <small>Utilize o Pix para confirma��o imediata.</small>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="payment-footer">
        <button className="btn-finish" onClick={onComplete}>
          J� realizei o pagamento
          <Check size={20} />
        </button>
      </div>
    </motion.div>
  );
};

const SuccessStep = ({ event, profile }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="registration-success-screen"
    >
      <div className="success-icon">
        <Check size={48} />
      </div>
      <h2>Inscrio Realizada!</h2>
      <p>Sua vaga no <strong>{event.name}</strong> est� garantida.</p>
      <div className="success-actions">
        <button
          className="btn-primary"
          onClick={() => {
            const name = profile?.fullName || profile?.nome || '';
            window.location.href = `/eventos/${event.id}?tab=athletes${name ? `&search=${encodeURIComponent(name)}` : ''}`;
          }}
        >
          Ver minha inscri��o
        </button>
        <button className="btn-ghost" onClick={() => window.location.href = '/minha-conta'}>
          Minhas inscri��es
        </button>
      </div>
    </motion.div>
  );
};

export default TournamentRegistrationFlow;




