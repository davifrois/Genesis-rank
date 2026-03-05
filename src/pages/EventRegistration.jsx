import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { publicRegistrationService } from '../services/publicRegistrationService';
import { formatBrlCurrency, normalizeEventFees, resolveEventPixKey } from '../utils/eventPricing';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 70 }, (_, index) => CURRENT_YEAR - index);

const BELT_OPTIONS = ['Branca', 'Cinza', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];
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

const computeAge = (year) => {
  const parsed = Number(year);
  if (!Number.isFinite(parsed) || parsed <= 1900) return '';
  return String(CURRENT_YEAR - parsed);
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
  if (value === 'COMBO') return 'Combo GI + NO-GI';
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
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const academyOptions = useMemo(() => (
    [...academies].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  ), [academies]);
  const selectedAcademy = useMemo(() => (
    academies.find((academy) => academy.id === form.academyId) || null
  ), [academies, form.academyId]);

  const memberOptions = useMemo(() => (
    [...memberProfiles]
      .filter((profile) => profile?.id && profile?.fullName)
      .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''))
  ), [memberProfiles]);

  const resolveAcademyIdForProfile = (profile) => {
    if (!profile) return '';
    if (profile.academyId) return profile.academyId;
    if (!profile.academyName) return '';
    const academyByName = academyOptions.find((academy) => (
      normalizeLookup(academy.name) === normalizeLookup(profile.academyName)
    ));
    return academyByName?.id || '';
  };

  const currentUserProfile = useMemo(() => {
    if (!currentUser) return null;

    const normalizedUserName = normalizeLookup(currentUser.name || '');
    const normalizedUsername = normalizeLookup(currentUser.username || '');
    const compactUserName = compactLookup(currentUser.name || '');
    const compactUsername = compactLookup(currentUser.username || '');

    return memberOptions.find((profile) => {
      const profileFullName = normalizeLookup(profile.fullName || '');
      const profileCompactName = compactLookup(profile.fullName || '');
      const profileEmail = normalizeLookup(profile.email || '');
      const profileCreatedByUser = normalizeLookup(profile.createdByUsername || '');

      if (normalizedUsername && profileCreatedByUser === normalizedUsername) return true;
      if (normalizedUsername && profileEmail === normalizedUsername) return true;
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
  }, [currentUser, memberOptions]);

  const age = computeAge(form.anoNascimento);
  const isYouthCategory = YOUTH_CATEGORIES.includes(form.categoriaConfirmada);
  const requiresGi = form.tipoInscricao === 'GI' || form.tipoInscricao === 'COMBO';
  const requiresNoGi = form.tipoInscricao === 'NO-GI' || form.tipoInscricao === 'COMBO';

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

  const eventFees = useMemo(() => normalizeEventFees(event || {}), [event]);
  const eventPixKey = useMemo(() => resolveEventPixKey(event || {}), [event]);
  const basePrice = age && Number(age) <= 15 ? eventFees.under15 : eventFees.over15;
  const isCombo = form.tipoInscricao === 'COMBO';
  const includesAbsolute = form.absolutoGi === 'SIM';
  const totalValue = (form.tipoInscricao ? (isCombo ? eventFees.combo : basePrice) : 0)
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

  const handleSelectMember = (memberId) => {
    setSelectedMemberId(memberId);
    if (!memberId) return;

    const profile = memberOptions.find((item) => item.id === memberId);
    if (!profile) return;

    const resolvedAcademyId = resolveAcademyIdForProfile(profile);

    setForm((prev) => ({
      ...prev,
      nome: profile.fullName || prev.nome,
      academyId: resolvedAcademyId,
      equipe: profile.academyName || prev.equipe,
      athletePhotoUrl: profile.photoUrl || prev.athletePhotoUrl,
      anoNascimento: resolveBirthYear(profile) || prev.anoNascimento,
      faixa: profile.belt || prev.faixa,
      telefone: profile.phone || prev.telefone,
      email: profile.email || prev.email
    }));
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
    if (!currentUserProfile || selectedMemberId) return;
    const resolvedAcademyId = resolveAcademyIdForProfile(currentUserProfile);
    setSelectedMemberId(currentUserProfile.id);
    setForm((prev) => ({
      ...prev,
      nome: currentUserProfile.fullName || prev.nome,
      academyId: resolvedAcademyId || prev.academyId,
      equipe: currentUserProfile.academyName || prev.equipe,
      athletePhotoUrl: currentUserProfile.photoUrl || prev.athletePhotoUrl,
      anoNascimento: resolveBirthYear(currentUserProfile) || prev.anoNascimento,
      faixa: currentUserProfile.belt || prev.faixa,
      telefone: currentUserProfile.phone || prev.telefone,
      email: currentUserProfile.email || prev.email
    }));
  }, [currentUserProfile, selectedMemberId, academyOptions]);

  const handleGenderChange = (value) => {
    setForm((prev) => {
      const next = { ...prev, genero: value };
      if (value === 'Masculino') {
        next.giFemPeso = '';
        next.noGiFem = '';
        next.noGiJuvenilFem = '';
      }
      if (value === 'Feminino') {
        next.giMascPeso = '';
        next.noGiMasc = '';
        next.noGiJuvenilMasc = '';
      }
      return next;
    });
  };

  const handleCategoryChange = (value) => {
    setForm((prev) => {
      const next = { ...prev, categoriaConfirmada: value };
      if (YOUTH_CATEGORIES.includes(value)) {
        next.giMascPeso = '';
        next.giFemPeso = '';
        next.noGiMasc = '';
        next.noGiFem = '';
      } else {
        next.juvenilPeso = '';
        next.noGiJuvenilMasc = '';
        next.noGiJuvenilFem = '';
      }
      return next;
    });
  };

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
        next.absolutoGi = '';
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

  const handleAthletePhotoFile = (eventFile) => {
    const file = eventFile.target.files?.[0];
    if (!file) {
      updateField('athletePhotoUrl', '');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateField('athletePhotoUrl', typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => {
      setError('Falha ao ler a foto do atleta.');
    };
    reader.readAsDataURL(file);
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
    if (!form.genero) {
      setError('Selecione o gênero do atleta.');
      return;
    }
    if (academyOptions.length > 0 && !form.academyId) {
      setError('Selecione a academia cadastrada.');
      return;
    }
    if (!form.equipe.trim()) {
      setError('Informe a equipe do atleta.');
      return;
    }
    if (!form.categoriaConfirmada || !form.tipoInscricao || !form.faixa) {
      setError('Preencha categoria, tipo de inscrição e faixa.');
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
      const notesPayload = {
        academyId: form.academyId,
        academyName: form.equipe,
        athletePhotoUrl: form.athletePhotoUrl.startsWith('data:') ? '' : form.athletePhotoUrl,
        equipe: form.equipe,
        anoNascimento: form.anoNascimento,
        idade: age,
        categoriaConfirmada: form.categoriaConfirmada,
        tipoInscricao: form.tipoInscricao,
        faixa: form.faixa,
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
        categoria: form.categoriaConfirmada,
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
          email: form.email,
          phone: form.telefone,
          birthDate: form.anoNascimento ? `${form.anoNascimento}-01-01` : '',
          age,
          belt: form.faixa,
          weight: resolvedWeight,
          photoUrl: form.athletePhotoUrl
        });
      } catch {
        // Keep registration flow successful even if member profile already exists.
      }

      setSuccess('Inscrição enviada com sucesso e salva no banco de dados.');
      setForm(createInitialForm());
      setSelectedMemberId('');
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
                <label className="registration-label">Cadastro na filiação</label>
                <div className="registration-member-row">
                  <select
                    value={selectedMemberId}
                    onChange={(eventInput) => handleSelectMember(eventInput.target.value)}
                  >
                    <option value="">Selecionar atleta cadastrado</option>
                    {memberOptions.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.fullName}{profile.academyName ? ` - ${profile.academyName}` : ''}
                      </option>
                    ))}
                  </select>
                  <Link className="btn btn-ghost" to="/filiacao?tab=member">
                    Cadastrar novo atleta
                  </Link>
                </div>
                <small className="registration-helper">
                  Selecione um atleta da filiação para preencher os dados automaticamente.
                </small>
              </div>

              <div className="registration-fieldset">
                <label className="registration-label">Gênero *</label>
                <div className="registration-radio-row">
                  <label>
                    <input
                      type="radio"
                      name="genero"
                      value="Masculino"
                      checked={form.genero === 'Masculino'}
                      onChange={(eventInput) => handleGenderChange(eventInput.target.value)}
                    />
                    Masculino
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="genero"
                      value="Feminino"
                      checked={form.genero === 'Feminino'}
                      onChange={(eventInput) => handleGenderChange(eventInput.target.value)}
                    />
                    Feminino
                  </label>
                </div>
              </div>

              <div className="registration-grid">
                <div className="registration-field">
                  <label>Nome completo *</label>
                  <input
                    required
                    value={form.nome}
                    onChange={(eventInput) => updateField('nome', eventInput.target.value)}
                    placeholder="Nome do atleta completo"
                  />
                </div>

                <div className="registration-field">
                  <label>Academia / Equipe *</label>
                  {academyOptions.length ? (
                    <select
                      required
                      value={form.academyId}
                      onChange={(eventInput) => {
                        const nextAcademyId = eventInput.target.value;
                        const nextAcademy = academyOptions.find((academy) => academy.id === nextAcademyId);
                        setForm((prev) => ({
                          ...prev,
                          academyId: nextAcademyId,
                          equipe: nextAcademy ? nextAcademy.name : ''
                        }));
                      }}
                    >
                      <option value="">Selecione a academia</option>
                      {academyOptions.map((academy) => (
                        <option key={academy.id} value={academy.id}>{academy.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      required
                      value={form.equipe}
                      onChange={(eventInput) => updateField('equipe', eventInput.target.value)}
                      placeholder="Nome da equipe"
                    />
                  )}
                </div>

                <div className="registration-field">
                  <label>Ano de nascimento *</label>
                  <select
                    required
                    value={form.anoNascimento}
                    onChange={(eventInput) => updateField('anoNascimento', eventInput.target.value)}
                  >
                    <option value="">Selecione o ano</option>
                    {YEARS.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div className="registration-field">
                  <label>Idade</label>
                  <input value={age} readOnly placeholder="-" />
                </div>

                <div className="registration-field registration-field--full">
                  <label>Foto do atleta (opcional)</label>
                  <input
                    value={form.athletePhotoUrl}
                    onChange={(eventInput) => updateField('athletePhotoUrl', eventInput.target.value)}
                    placeholder="https://..."
                  />
                  <div className="registration-upload-row">
                    <input type="file" accept="image/*" onChange={handleAthletePhotoFile} />
                    {form.athletePhotoUrl && (
                      <div className="registration-photo-preview">
                        <img src={form.athletePhotoUrl} alt={form.nome || 'Atleta'} />
                      </div>
                    )}
                  </div>
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
                  <select
                    required
                    value={form.categoriaConfirmada}
                    onChange={(eventInput) => handleCategoryChange(eventInput.target.value)}
                  >
                    <option value="">Confirme a categoria</option>
                    <option value="Adulto">Adulto</option>
                    <option value="Master">Master</option>
                    <option value="Juvenil">Juvenil</option>
                    <option value="Infantil">Infantil</option>
                    <option value="Infantojuvenil">Infantojuvenil</option>
                  </select>
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
                    <option value="COMBO">Combo GI + NO-GI</option>
                  </select>
                </div>

                <div className="registration-field registration-field--full">
                  <label>Faixa *</label>
                  <select
                    required
                    value={form.faixa}
                    onChange={(eventInput) => updateField('faixa', eventInput.target.value)}
                  >
                    <option value="">Informe a faixa</option>
                    {BELT_OPTIONS.map((belt) => (
                      <option key={belt} value={belt}>{belt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {requiresGi && (
                <div className="registration-mode-card">
                  <h4>Modalidade GI</h4>
                  <div className="registration-grid">
                    <div className="registration-field">
                      <label>
                        {isYouthCategory
                          ? 'Categoria de peso para categorias de base (GI) *'
                          : `Categoria de peso ${form.genero || 'Adulto/Master'} (GI) *`}
                      </label>
                      <select
                        required={requiresGi}
                        value={giWeightValue}
                        disabled={!canPickWeights}
                        onChange={(eventInput) => updateField(activeGiField, eventInput.target.value)}
                      >
                        <option value="">
                          {canPickWeights ? 'Selecione a categoria de peso GI' : 'Primeiro selecione gênero e categoria'}
                        </option>
                        {giWeightOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    <div className="registration-field">
                      <label>Absoluto GI</label>
                      <select
                        value={form.absolutoGi}
                        onChange={(eventInput) => updateField('absolutoGi', eventInput.target.value)}
                      >
                        <option value="">Não participar</option>
                        <option value="NAO">Não</option>
                        <option value="SIM">Sim</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {requiresNoGi && (
                <div className="registration-mode-card">
                  <h4>Modalidade NO-GI</h4>
                  <div className="registration-grid">
                    <div className="registration-field registration-field--full">
                      <label>
                        {isYouthCategory
                          ? `Categoria de peso para categorias de base ${form.genero || ''} (NO-GI) *`
                          : `Categoria de peso ${form.genero || 'Adulto/Master'} (NO-GI) *`}
                      </label>
                      <select
                        required={requiresNoGi}
                        value={noGiWeightValue}
                        disabled={!canPickWeights}
                        onChange={(eventInput) => updateField(activeNoGiField, eventInput.target.value)}
                      >
                        <option value="">
                          {canPickWeights ? 'Selecione a categoria de peso NO-GI' : 'Primeiro selecione gênero e categoria'}
                        </option>
                        {noGiWeightOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

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
                    onChange={(eventInput) => updateField('telefone', eventInput.target.value)}
                    placeholder="(31) 99999-9999"
                  />
                </div>

                <div className="registration-field">
                  <label>E-mail *</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(eventInput) => updateField('email', eventInput.target.value)}
                    placeholder="voce@exemplo.com"
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
