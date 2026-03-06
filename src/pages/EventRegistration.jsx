import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { publicRegistrationService } from '../services/publicRegistrationService';
import { formatBrlCurrency, normalizeEventFees, resolveEventPixKey } from '../utils/eventPricing';
import LoginOverlay from '../components/LoginOverlay';

const CURRENT_YEAR = new Date().getFullYear();
const YOUTH_CATEGORIES = ['Juvenil', 'Infantil', 'Infantojuvenil'];
const GI_MALE_WEIGHTS = ['Galo', 'Pluma', 'Pena', 'Leve', 'Médio', 'Meio Pesado', 'Pesado', 'Super Pesado', 'Pesadíssimo'];
const GI_FEMALE_WEIGHTS = ['Galo', 'Pluma', 'Pena', 'Leve', 'Médio', 'Meio Pesado', 'Pesado', 'Super Pesado', 'Pesadíssimo'];
const JUVENILE_WEIGHTS = ['Galo', 'Pluma', 'Pena', 'Leve', 'Médio', 'Meio Pesado', 'Pesado', 'Super Pesado', 'Pesadíssimo'];
const INFANTIL_WEIGHTS = ['Galo', 'Pluma', 'Pena', 'Leve', 'Médio', 'Meio Pesado', 'Pesado', 'Super Pesado', 'Pesadíssimo'];
const INFANTOJUVENIL_WEIGHTS = ['Galo', 'Pluma', 'Pena', 'Leve', 'Médio', 'Meio Pesado', 'Pesado', 'Super Pesado', 'Pesadíssimo'];
const NOGI_MALE_WEIGHTS = ['Galo', 'Pluma', 'Pena', 'Leve', 'Médio', 'Meio Pesado', 'Pesado', 'Super Pesado', 'Pesadíssimo'];
const NOGI_FEMALE_WEIGHTS = ['Galo', 'Pluma', 'Pena', 'Leve', 'Médio', 'Meio Pesado', 'Pesado', 'Super Pesado', 'Pesadíssimo'];
const MAX_PROOF_FILE_BYTES = 1_200_000;

const createInitialForm = () => ({
  genero: '',
  nome: '',
  academyId: '',
  equipe: '',
  athletePhotoUrl: '',
  anoNascimento: '',
  categoriaConfirmada: '',
  tipoInscricao: '',
  faixa: '',
  giMascPeso: '',
  giFemPeso: '',
  juvenilPeso: '',
  absolutoGi: '',
  noGiJuvenilMasc: '',
  noGiJuvenilFem: '',
  noGiMasc: '',
  noGiFem: '',
  telefone: '',
  email: '',
  termosAceitos: false,
  comprovanteNome: '',
  comprovanteArquivoDataUrl: '',
  comprovanteMimeType: '',
  comprovanteTamanhoBytes: 0,
  observacoes: ''
});

const normalizeLookup = (value) => (
  (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
);

const compactLookup = (value) => normalizeLookup(value).replace(/\s+/g, '');
const emailLocalPart = (value) => {
  const text = (value || '').toString().trim();
  if (!text) return '';
  const local = text.includes('@') ? text.split('@')[0] : text;
  return normalizeLookup(local);
};

const computeAge = (year) => {
  const parsed = Number(year);
  if (!Number.isFinite(parsed) || parsed <= 1900) return '';
  return String(CURRENT_YEAR - parsed);
};

const normalizeGenderLabel = (value) => {
  const raw = (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (raw === 'f') return 'Feminino';
  if (raw === 'm') return 'Masculino';
  if (raw.startsWith('fem')) return 'Feminino';
  if (raw.startsWith('mas')) return 'Masculino';
  return '';
};

const resolveCategoryByAge = (ageValue) => {
  const age = Number(ageValue);
  if (!Number.isFinite(age) || age < 0) return '';
  if (age >= 30) return 'Master';
  if (age >= 18) return 'Adulto';
  if (age >= 16) return 'Juvenil';
  if (age >= 12) return 'Infantojuvenil';
  return 'Infantil';
};

const resolveBirthYear = (profile) => {
  const yearFromBirthDate = Number((profile?.birthDate || '').toString().slice(0, 4));
  if (Number.isFinite(yearFromBirthDate) && yearFromBirthDate > 1900) {
    return String(yearFromBirthDate);
  }
  const ageFromProfile = Number(profile?.age || profile?.idade || '');
  if (Number.isFinite(ageFromProfile) && ageFromProfile >= 0) {
    return String(CURRENT_YEAR - Math.floor(ageFromProfile));
  }
  return '';
};

const getModeLabel = (value) => {
  if (value === 'GI') return 'GI';
  if (value === 'NO-GI') return 'NO-GI';
  return '-';
};

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
  reader.onerror = () => reject(new Error('Falha ao processar o arquivo.'));
  reader.readAsDataURL(file);
});

const EventRegistration = () => {
  const { eventId } = useParams();
  const {
    events,
    academies,
    memberProfiles,
    addMemberProfile,
    currentUser
  } = useStore();
  const event = useMemo(() => events.find((item) => item.id === eventId), [events, eventId]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(createInitialForm);
  const academyOptions = useMemo(() => (
    [...academies].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  ), [academies]);
  const selectedAcademy = useMemo(() => (
    academies.find((academy) => academy.id === form.academyId) || null
  ), [academies, form.academyId]);

  const resolveAcademyIdForProfile = useCallback((profile) => {
    if (!profile) return '';
    if (profile.academyId) return profile.academyId;
    if (!profile.academyName) return '';
    const academyByName = academyOptions.find((academy) => (
      normalizeLookup(academy.name) === normalizeLookup(profile.academyName)
    ));
    return academyByName?.id || '';
  }, [academyOptions]);

  const currentUserProfile = useMemo(() => {
    if (!currentUser) return null;

    const normalizedUserName = normalizeLookup(currentUser.name || '');
    const normalizedUsername = normalizeLookup(currentUser.username || '');
    const normalizedUsernameLocal = emailLocalPart(currentUser.username || '');
    const compactUserName = compactLookup(currentUser.name || '');
    const compactUsername = compactLookup(currentUser.username || '');

    return memberProfiles.find((profile) => {
      const profileFullName = normalizeLookup(profile.fullName || '');
      const profileCompactName = compactLookup(profile.fullName || '');
      const profileEmail = normalizeLookup(profile.email || '');
      const profileEmailLocal = emailLocalPart(profile.email || '');
      const profileCreatedByUser = normalizeLookup(profile.createdByUsername || '');
      const profileAccountUsername = normalizeLookup(
        profile.accountUsername || profile.loginUsername || profile.username || ''
      );

      if (normalizedUsername && profileAccountUsername === normalizedUsername) return true;
      if (normalizedUsername && profileCreatedByUser === normalizedUsername) return true;
      if (normalizedUsername && profileEmail === normalizedUsername) return true;
      if (normalizedUsernameLocal && profileEmailLocal === normalizedUsernameLocal) return true;
      if (normalizedUserName && profileFullName === normalizedUserName) return true;
      if (normalizedUsername && profileFullName === normalizedUsername) return true;
      if (compactUserName && profileCompactName && (
        profileCompactName === compactUserName
        || profileCompactName.includes(compactUserName)
        || compactUserName.includes(profileCompactName)
      )) return true;
      if (compactUsername && profileCompactName && (
        profileCompactName === compactUsername
        || profileCompactName.includes(compactUsername)
        || compactUsername.includes(profileCompactName)
      )) return true;

      return false;
    }) || null;
  }, [currentUser, memberProfiles]);

  const age = computeAge(form.anoNascimento);
  const autoCategory = resolveCategoryByAge(age);
  const isYouthCategory = YOUTH_CATEGORIES.includes(form.categoriaConfirmada);
  const requiresGi = form.tipoInscricao === 'GI';
  const requiresNoGi = form.tipoInscricao === 'NO-GI';

  const activeGiField = useMemo(() => {
    if (isYouthCategory) return 'juvenilPeso';
    return form.genero === 'Feminino' ? 'giFemPeso' : 'giMascPeso';
  }, [form.genero, isYouthCategory]);

  const activeNoGiField = useMemo(() => {
    if (isYouthCategory) return form.genero === 'Feminino' ? 'noGiJuvenilFem' : 'noGiJuvenilMasc';
    return form.genero === 'Feminino' ? 'noGiFem' : 'noGiMasc';
  }, [form.genero, isYouthCategory]);

  const giWeightOptions = useMemo(() => {
    if (form.categoriaConfirmada === 'Infantil') return INFANTIL_WEIGHTS;
    if (form.categoriaConfirmada === 'Infantojuvenil') return INFANTOJUVENIL_WEIGHTS;
    if (form.categoriaConfirmada === 'Juvenil') return JUVENILE_WEIGHTS;
    return form.genero === 'Feminino' ? GI_FEMALE_WEIGHTS : GI_MALE_WEIGHTS;
  }, [form.genero, form.categoriaConfirmada]);

  const noGiWeightOptions = useMemo(() => {
    if (form.categoriaConfirmada === 'Infantil') return INFANTIL_WEIGHTS;
    if (form.categoriaConfirmada === 'Infantojuvenil') return INFANTOJUVENIL_WEIGHTS;
    if (form.categoriaConfirmada === 'Juvenil') return JUVENILE_WEIGHTS;
    return form.genero === 'Feminino' ? NOGI_FEMALE_WEIGHTS : NOGI_MALE_WEIGHTS;
  }, [form.genero, form.categoriaConfirmada]);

  const giWeightValue = form[activeGiField] || '';
  const noGiWeightValue = form[activeNoGiField] || '';
  const resolvedWeight = giWeightValue || noGiWeightValue || '';
  const selectedWeightOptions = form.tipoInscricao === 'NO-GI' ? noGiWeightOptions : giWeightOptions;
  const selectedWeightValue = form.tipoInscricao === 'NO-GI' ? noGiWeightValue : giWeightValue;

  const eventFees = useMemo(() => normalizeEventFees(event || {}), [event]);
  const eventPixKey = useMemo(() => resolveEventPixKey(event || {}), [event]);
  const basePrice = age && Number(age) <= 15 ? eventFees.under15 : eventFees.over15;
  const includesAbsolute = form.absolutoGi === 'SIM';
  const totalValue = (form.tipoInscricao ? basePrice : 0)
    + (includesAbsolute ? eventFees.absolute : 0);

  const canPickWeights = Boolean(form.genero) && Boolean(form.categoriaConfirmada);

  const completionChecks = [
    Boolean(form.genero),
    Boolean(form.nome.trim()),
    Boolean(form.equipe.trim()),
    Boolean(form.anoNascimento),
    Boolean(form.categoriaConfirmada),
    Boolean(form.tipoInscricao),
    Boolean(form.faixa),
    !requiresGi || Boolean(giWeightValue),
    !requiresNoGi || Boolean(noGiWeightValue),
    Boolean(form.telefone.trim()),
    Boolean(form.email.trim()),
    Boolean(form.comprovanteArquivoDataUrl),
    Boolean(form.termosAceitos)
  ];

  const completionValue = Math.round(
    (completionChecks.filter(Boolean).length / completionChecks.length) * 100
  );

  const eventMeta = `${event?.date || 'Data a confirmar'} - ${event?.location || 'Local a definir'}`;

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleWeightChange = (value) => {
    setForm((prev) => {
      const next = { ...prev };
      if (prev.tipoInscricao === 'NO-GI') {
        next[activeNoGiField] = value;
        next[activeGiField] = '';
      } else {
        next[activeGiField] = value;
        next[activeNoGiField] = '';
      }
      return next;
    });
  };

  useEffect(() => {
    if (!currentUser) return;

    const loginEmail = (currentUser.username || '').includes('@')
      ? (currentUser.username || '').trim()
      : '';

    setForm((prev) => {
      const next = { ...prev };
      let changed = false;

      if (!next.nome && currentUser.name) {
        next.nome = currentUser.name;
        changed = true;
      }
      if (!next.email && loginEmail) {
        next.email = loginEmail;
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [currentUser]);

  useEffect(() => {
    if (!currentUserProfile) return;
    const resolvedAcademyId = resolveAcademyIdForProfile(currentUserProfile);
    const birthYear = resolveBirthYear(currentUserProfile);
    const profileAge = birthYear ? computeAge(birthYear) : `${currentUserProfile.age || ''}`;
    const inferredCategory = resolveCategoryByAge(profileAge);
    const inferredGender = normalizeGenderLabel(
      currentUserProfile.gender || currentUserProfile.genero || currentUserProfile.sexo || ''
    );

    setForm((prev) => ({
      ...prev,
      nome: currentUserProfile.fullName || prev.nome,
      academyId: resolvedAcademyId || prev.academyId,
      equipe: currentUserProfile.academyName || prev.equipe,
      athletePhotoUrl: currentUserProfile.photoUrl || prev.athletePhotoUrl,
      anoNascimento: birthYear || prev.anoNascimento,
      genero: inferredGender || prev.genero,
      categoriaConfirmada: inferredCategory || prev.categoriaConfirmada,
      faixa: currentUserProfile.belt || prev.faixa,
      telefone: currentUserProfile.phone || prev.telefone,
      email: currentUserProfile.email || prev.email
    }));
  }, [currentUserProfile, resolveAcademyIdForProfile]);

  useEffect(() => {
    if (!autoCategory) return;
    if (form.categoriaConfirmada === autoCategory) return;
    setForm((prev) => ({ ...prev, categoriaConfirmada: autoCategory }));
  }, [autoCategory, form.categoriaConfirmada]);

  const handleTypeChange = (value) => {
    setForm((prev) => {
      const next = { ...prev, tipoInscricao: value };
      if (value === 'GI') {
        next.noGiJuvenilMasc = '';
        next.noGiJuvenilFem = '';
        next.noGiMasc = '';
        next.noGiFem = '';
      }
      if (value === 'NO-GI') {
        next.giMascPeso = '';
        next.giFemPeso = '';
        next.juvenilPeso = '';
      }
      return next;
    });
  };

  const handleProofFile = async (eventFile) => {
    const file = eventFile.target.files?.[0];
    if (!file) {
      setForm((prev) => ({
        ...prev,
        comprovanteNome: '',
        comprovanteArquivoDataUrl: '',
        comprovanteMimeType: '',
        comprovanteTamanhoBytes: 0
      }));
      return;
    }

    if (file.size > MAX_PROOF_FILE_BYTES) {
      setError('Comprovante maior que 1.2 MB. Envie um arquivo menor.');
      eventFile.target.value = '';
      setForm((prev) => ({
        ...prev,
        comprovanteNome: '',
        comprovanteArquivoDataUrl: '',
        comprovanteMimeType: '',
        comprovanteTamanhoBytes: 0
      }));
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setError('');
      setForm((prev) => ({
        ...prev,
        comprovanteNome: file.name,
        comprovanteArquivoDataUrl: dataUrl,
        comprovanteMimeType: file.type || '',
        comprovanteTamanhoBytes: file.size || 0
      }));
    } catch {
      setError('Falha ao ler o comprovante. Tente novamente.');
      setForm((prev) => ({
        ...prev,
        comprovanteNome: '',
        comprovanteArquivoDataUrl: '',
        comprovanteMimeType: '',
        comprovanteTamanhoBytes: 0
      }));
    }
  };

  useEffect(() => {
    if (!selectedAcademy) return;
    setForm((prev) => (
      prev.equipe === selectedAcademy.name
        ? prev
        : { ...prev, equipe: selectedAcademy.name }
    ));
  }, [selectedAcademy]);

  useEffect(() => {
    if (form.athletePhotoUrl) return;
    if (!form.nome || !form.academyId) return;

    const profile = memberProfiles.find((item) => (
      normalizeLookup(item.fullName) === normalizeLookup(form.nome)
      && (
        (item.academyId && item.academyId === form.academyId)
        || normalizeLookup(item.academyName || '') === normalizeLookup(selectedAcademy?.name || '')
      )
      && item.photoUrl
    ));

    if (!profile) return;
    setForm((prev) => ({ ...prev, athletePhotoUrl: profile.photoUrl }));
  }, [form.nome, form.academyId, form.athletePhotoUrl, memberProfiles, selectedAcademy?.name]);

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    setError('');
    setSuccess('');

    if (!event) {
      setError('Evento não encontrado.');
      return;
    }
    if (!currentUserProfile) {
      setError('Complete seus dados em Minha conta para continuar.');
      return;
    }
    if (!form.genero) {
      setError('Gênero não identificado. Atualize seus dados em Minha conta.');
      return;
    }
    if (academyOptions.length > 0 && !form.academyId) {
      setError('Academia não identificada. Atualize seus dados em Minha conta.');
      return;
    }
    if (!form.equipe.trim() || !form.nome.trim()) {
      setError('Dados do atleta incompletos. Atualize seus dados em Minha conta.');
      return;
    }
    if (!form.categoriaConfirmada || !form.faixa) {
      setError('Categoria ou faixa ausente. Atualize seus dados em Minha conta.');
      return;
    }
    if (!form.tipoInscricao) {
      setError('Selecione se deseja competir em GI ou NO-GI.');
      return;
    }
    if (requiresGi && !giWeightValue) {
      setError('Informe a categoria de peso GI para continuar.');
      return;
    }
    if (requiresNoGi && !noGiWeightValue) {
      setError('Informe a categoria de peso NO-GI para continuar.');
      return;
    }
    if (!form.termosAceitos) {
      setError('Você precisa aceitar o termo de responsabilidade.');
      return;
    }
    if (!form.comprovanteNome || !form.comprovanteArquivoDataUrl) {
      setError('Anexe o comprovante de pagamento antes de enviar.');
      return;
    }

    setSubmitting(true);
    try {
      const categoriaFinal = includesAbsolute
        ? `${form.categoriaConfirmada} Absoluto`
        : form.categoriaConfirmada;

      const notesPayload = {
        academyId: form.academyId,
        academyName: form.equipe,
        athletePhotoUrl: form.athletePhotoUrl.startsWith('data:') ? '' : form.athletePhotoUrl,
        equipe: form.equipe,
        anoNascimento: form.anoNascimento,
        idade: age,
        categoriaConfirmada: form.categoriaConfirmada,
        categoriaFinal,
        tipoInscricao: form.tipoInscricao,
        faixa: form.faixa,
        genero: form.genero,
        giMascPeso: form.giMascPeso,
        giFemPeso: form.giFemPeso,
        juvenilPeso: form.juvenilPeso,
        noGiJuvenilMasc: form.noGiJuvenilMasc,
        noGiJuvenilFem: form.noGiJuvenilFem,
        noGiMasc: form.noGiMasc,
        noGiFem: form.noGiFem,
        pesoGiSelecionado: giWeightValue,
        pesoNoGiSelecionado: noGiWeightValue,
        absolutoGi: form.absolutoGi,
        comprovanteNome: form.comprovanteNome,
        comprovanteArquivoDataUrl: form.comprovanteArquivoDataUrl,
        comprovanteMimeType: form.comprovanteMimeType,
        comprovanteTamanhoBytes: form.comprovanteTamanhoBytes,
        termosAceitos: form.termosAceitos,
        pixKey: eventPixKey,
        feeUnder15: eventFees.under15,
        feeOver15: eventFees.over15,
        feeCombo: eventFees.combo,
        feeAbsolute: eventFees.absolute,
        totalValue,
        absoluto: includesAbsolute,
        observacoes: form.observacoes
      };

      const registrationResult = await publicRegistrationService.register({
        eventId: event.id,
        eventName: event.name,
        eventDate: event.date,
        eventLocation: event.location,
        nome: form.nome,
        email: form.email,
        phone: form.telefone,
        academia: form.equipe,
        faixa: form.faixa,
        peso: resolvedWeight,
        categoria: categoriaFinal,
        genero: form.genero,
        modalidade: form.tipoInscricao === 'NO-GI' ? 'NO-GI' : 'GI',
        notes: JSON.stringify(notesPayload)
      });

      if (registrationResult?.queued) {
        setError(
          registrationResult.message
          || 'Backend indisponível. A inscrição não foi enviada ao sistema administrativo.'
        );
        return;
      }

      try {
        addMemberProfile({
          fullName: form.nome,
          academyId: form.academyId,
          academyName: form.equipe,
          accountUsername: currentUser?.username || '',
          email: form.email,
          phone: form.telefone,
          birthDate: form.anoNascimento ? `${form.anoNascimento}-01-01` : '',
          age,
          gender: form.genero,
          belt: form.faixa,
          weight: resolvedWeight,
          photoUrl: form.athletePhotoUrl
        });
      } catch {
        // Keep registration flow successful even if member profile already exists.
      }

      setSuccess('Inscrição enviada com sucesso e salva no banco de dados.');
      setForm(createInitialForm());
    } catch (err) {
      setError(err?.message || 'Falha ao enviar inscrição.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!event) {
    return (
      <div className="registration-page">
        <div className="registration-shell">
          <h2>Evento não encontrado</h2>
          <Link className="text-link" to="/eventos">Voltar para eventos</Link>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginOverlay redirectTo={`/eventos/${event.id}/inscricao`} />;
  }

  if (!currentUserProfile) {
    return (
      <div className="registration-page">
        <div className="registration-shell">
          <h2>Complete seu cadastro antes de se inscrever</h2>
          <p className="table-meta">
            Não localizamos seu perfil de atleta. Complete seus dados para liberar a inscrição.
          </p>
          <Link className="btn btn-primary" to="/minha-conta">Ir para Minha conta</Link>
        </div>
      </div>
    );
  }

  const missingAccountData = !form.nome
    || !form.equipe
    || !form.anoNascimento
    || !form.genero
    || !form.categoriaConfirmada
    || !form.faixa
    || !form.email
    || !form.telefone;

  if (missingAccountData) {
    return (
      <div className="registration-page">
        <div className="registration-shell">
          <h2>Dados incompletos na sua conta</h2>
          <p className="table-meta">
            Atualize sua conta com nome, academia, nascimento, gênero, faixa, telefone e e-mail.
          </p>
          <Link className="btn btn-primary" to="/minha-conta">Atualizar cadastro</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="registration-page">
      <form className="registration-shell" onSubmit={handleSubmit}>
        <div className="registration-top">
          <div>
            <span className="section-kicker">Inscrição oficial</span>
            <h2>{event.name}</h2>
            <div className="table-meta">{eventMeta}</div>
          </div>
          <Link className="text-link" to={`/eventos/${event.id}`}>Voltar para a página do evento</Link>
        </div>

        <div className="registration-layout">
          <div className="registration-main">
            <section className="registration-section">
              <div className="registration-section__head">
                <h3>Dados do atleta</h3>
                <p>Preencha os dados principais para identificação no sistema.</p>
              </div>

              <div className="registration-fieldset">
                <label className="registration-label">Dados vinculados à sua conta</label>
                <small className="registration-helper">
                  Nome, faixa, idade, categoria e gênero são carregados automaticamente da sua conta.
                </small>
              </div>

              <div className="registration-grid">
                <div className="registration-field">
                  <label>Nome completo *</label>
                  <input
                    required
                    value={form.nome}
                    readOnly
                    placeholder="-"
                  />
                </div>

                <div className="registration-field">
                  <label>Academia / Equipe *</label>
                  <input
                    required
                    value={form.equipe}
                    readOnly
                    placeholder="-"
                  />
                </div>

                <div className="registration-field">
                  <label>Ano de nascimento *</label>
                  <input value={form.anoNascimento} readOnly placeholder="-" />
                </div>

                <div className="registration-field">
                  <label>Idade</label>
                  <input value={age} readOnly placeholder="-" />
                </div>

                <div className="registration-field">
                  <label>Gênero</label>
                  <input value={form.genero} readOnly placeholder="-" />
                </div>

                <div className="registration-field">
                  <label>Categoria</label>
                  <input value={form.categoriaConfirmada} readOnly placeholder="-" />
                </div>

                <div className="registration-field">
                  <label>Faixa</label>
                  <input value={form.faixa} readOnly placeholder="-" />
                </div>

                <div className="registration-field">
                  <label>E-mail</label>
                  <input value={form.email} readOnly placeholder="-" />
                </div>

                <div className="registration-field">
                  <label>Telefone</label>
                  <input value={form.telefone} readOnly placeholder="-" />
                </div>

                <div className="registration-field registration-field--full">
                  <label>Foto do atleta</label>
                  <input
                    value={form.athletePhotoUrl}
                    readOnly
                    placeholder="-"
                  />
                  {form.athletePhotoUrl && (
                    <div className="registration-photo-preview">
                      <img src={form.athletePhotoUrl} alt={form.nome || 'Atleta'} />
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="registration-section">
              <div className="registration-section__head">
                <h3>Categoria e inscrição</h3>
                <p>A tela apresenta apenas os campos necessários para o tipo de inscrição escolhido.</p>
              </div>

              <div className="registration-grid">
                <div className="registration-field">
                  <label>Categoria *</label>
                  <input value={form.categoriaConfirmada} readOnly placeholder="-" />
                </div>

                <div className="registration-field">
                  <label>Tipo de inscrição *</label>
                  <select
                    required
                    value={form.tipoInscricao}
                    onChange={(eventInput) => handleTypeChange(eventInput.target.value)}
                  >
                    <option value="">Informe o tipo de inscrição</option>
                    <option value="GI">GI</option>
                    <option value="NO-GI">NO-GI</option>
                  </select>
                </div>

                <div className="registration-field">
                  <label>Faixa *</label>
                  <input value={form.faixa} readOnly placeholder="-" />
                </div>

                <div className="registration-field">
                  <label>Categoria de peso *</label>
                  <select
                    required={Boolean(form.tipoInscricao)}
                    value={selectedWeightValue}
                    disabled={!form.tipoInscricao || !canPickWeights}
                    onChange={(eventInput) => handleWeightChange(eventInput.target.value)}
                  >
                    <option value="">
                      {form.tipoInscricao ? 'Selecione a categoria de peso' : 'Primeiro selecione GI ou NO-GI'}
                    </option>
                    {selectedWeightOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div className="registration-field registration-field--full">
                  <label className="checkbox-inline">
                    <input
                      type="checkbox"
                      checked={form.absolutoGi === 'SIM'}
                      onChange={(eventInput) => updateField('absolutoGi', eventInput.target.checked ? 'SIM' : 'NAO')}
                    />
                    <span>Participar do absoluto</span>
                  </label>
                </div>
              </div>

              {!form.tipoInscricao && (
                <p className="registration-helper">Escolha o tipo de inscrição para liberar os campos de peso.</p>
              )}
            </section>

            <section className="registration-section">
              <div className="registration-section__head">
                <h3>Contato e pagamento</h3>
                <p>Use o mesmo e-mail e telefone que serão utilizados para o recebimento da confirmação.</p>
              </div>

              <div className="registration-grid">
                <div className="registration-field">
                  <label>Telefone *</label>
                  <input
                    required
                    value={form.telefone}
                    readOnly
                    placeholder="-"
                  />
                </div>

                <div className="registration-field">
                  <label>E-mail *</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    readOnly
                    placeholder="-"
                  />
                </div>

                <div className="registration-field">
                  <label>Valor total da inscrição</label>
                  <input value={formatBrlCurrency(totalValue)} readOnly />
                </div>

                <div className="registration-field">
                  <label>Chave Pix</label>
                  <input value={eventPixKey} readOnly />
                </div>

                <div className="registration-field registration-field--full">
                  <label>Anexo do comprovante *</label>
                  <input type="file" accept=".pdf,image/*" onChange={handleProofFile} />
                  <small>
                    {form.comprovanteNome
                      ? `${form.comprovanteNome} (${Math.round((form.comprovanteTamanhoBytes || 0) / 1024)} KB)`
                      : 'Nenhum arquivo selecionado (máximo de 1,2 MB)'}
                  </small>
                </div>

                <div className="registration-field registration-field--full">
                  <label>Observações</label>
                  <textarea
                    value={form.observacoes}
                    onChange={(eventInput) => updateField('observacoes', eventInput.target.value)}
                    placeholder="Exemplo: observações sobre check-in, categoria ou equipe."
                  />
                </div>
              </div>
            </section>

            <section className="registration-section registration-section--terms">
              <div className="registration-section__head">
                <h3>Termo de responsabilidade</h3>
                <p>Leia com atenção antes de concluir a inscrição.</p>
              </div>

              <div className="registration-terms">
                <p>Declaro estar apto para a prática esportiva e ciente das regras do evento.</p>
                <p>Autorizo o uso de imagem e confirmo que as informações enviadas são verdadeiras.</p>
                <p>O competidor é responsável pelos dados informados no ato da inscrição e pela apresentação de documento oficial na checagem.</p>
                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={form.termosAceitos}
                    onChange={(eventInput) => updateField('termosAceitos', eventInput.target.checked)}
                  />
                  <span>Li e aceito o termo de responsabilidade.</span>
                </label>
              </div>
            </section>

            {error && <div className="login-error"><p>{error}</p></div>}
            {success && <div className="profile-success">{success}</div>}

            <div className="registration-actions">
              <button type="submit" className="btn btn-event registration-submit" disabled={submitting}>
                {submitting ? 'Enviando...' : 'Enviar inscrição'}
              </button>
            </div>
          </div>

          <aside className="registration-side">
            <div className="registration-summary">
              <h3>Resumo rápido</h3>

              <div className="registration-progress">
                <div className="registration-progress__head">
                  <span>Preenchimento</span>
                  <strong>{completionValue}%</strong>
                </div>
                <div className="registration-progress__track">
                  <span style={{ width: `${completionValue}%` }} />
                </div>
              </div>

              {event.posterUrl && (
                <div className="registration-summary__poster">
                  <img src={event.posterUrl} alt={event.name} />
                </div>
              )}

              <dl className="registration-summary__list">
                <div>
                  <dt>Evento</dt>
                  <dd>{event.name}</dd>
                </div>
                <div>
                  <dt>Academia</dt>
                  <dd>{form.equipe || '-'}</dd>
                </div>
                <div>
                  <dt>Categoria</dt>
                  <dd>{form.categoriaConfirmada || '-'}</dd>
                </div>
                <div>
                  <dt>Modalidade</dt>
                  <dd>{getModeLabel(form.tipoInscricao)}</dd>
                </div>
                <div>
                  <dt>Faixa</dt>
                  <dd>{form.faixa || '-'}</dd>
                </div>
                {requiresGi && (
                  <div>
                    <dt>Peso GI</dt>
                    <dd>{giWeightValue || '-'}</dd>
                  </div>
                )}
                {requiresNoGi && (
                  <div>
                    <dt>Peso NO-GI</dt>
                    <dd>{noGiWeightValue || '-'}</dd>
                  </div>
                )}
                <div>
                  <dt>Idade</dt>
                  <dd>{age || '-'}</dd>
                </div>
              </dl>

              <div className="registration-summary__total">
                <span>Total estimado</span>
                <strong>{formatBrlCurrency(totalValue)}</strong>
              </div>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
};

export default EventRegistration;


