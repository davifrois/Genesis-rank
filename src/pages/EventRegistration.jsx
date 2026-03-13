import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { useI18n } from '../hooks/useI18n';
import { publicRegistrationService } from '../services/publicRegistrationService';
import { formatBrlCurrency, normalizeEventFees, resolveEventPixKey } from '../utils/eventPricing';
import { formatBrazilPhone } from '../utils/phone';
import LoginOverlay from '../components/LoginOverlay';

const CURRENT_YEAR = new Date().getFullYear();
const YOUTH_CATEGORIES = ['Juvenil', 'Infantil', 'Infantojuvenil'];
const GI_MALE_WEIGHTS = ['Galo', 'Pluma', 'Pena', 'Leve', 'Medio', 'Meio Pesado', 'Pesado', 'Super Pesado', 'Pesadissimo'];
const GI_FEMALE_WEIGHTS = ['Galo', 'Pluma', 'Pena', 'Leve', 'Medio', 'Meio Pesado', 'Pesado', 'Super Pesado', 'Pesadissimo'];
const JUVENILE_WEIGHTS = ['Galo', 'Pluma', 'Pena', 'Leve', 'Medio', 'Meio Pesado', 'Pesado', 'Super Pesado', 'Pesadissimo'];
const INFANTIL_WEIGHTS = ['Galo', 'Pluma', 'Pena', 'Leve', 'Medio', 'Meio Pesado', 'Pesado', 'Super Pesado', 'Pesadissimo'];
const INFANTOJUVENIL_WEIGHTS = ['Galo', 'Pluma', 'Pena', 'Leve', 'Medio', 'Meio Pesado', 'Pesado', 'Super Pesado', 'Pesadissimo'];
const NOGI_MALE_WEIGHTS = ['Galo', 'Pluma', 'Pena', 'Leve', 'Medio', 'Meio Pesado', 'Pesado', 'Super Pesado', 'Pesadissimo'];
const NOGI_FEMALE_WEIGHTS = ['Galo', 'Pluma', 'Pena', 'Leve', 'Medio', 'Meio Pesado', 'Pesado', 'Super Pesado', 'Pesadissimo'];
const MAX_PROOF_FILE_BYTES = 1_200_000;

const parseMultilineWeightOptions = (value) => (
  (value || '')
    .toString()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
);

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

const normalizeUserRole = (value) => {
  const raw = normalizeLookup(value || '');
  if (!raw) return '';
  if (raw === 'administrador') return 'admin';
  if (raw === 'staff' || raw === 'mesa') return 'mesario';
  if (raw === 'atleta') return 'athlete';
  if (raw === 'professor' || raw === 'prof' || raw === 'treinador' || raw === 'mestre') return 'coach';
  return raw;
};

const computeAge = (year) => {
  const parsed = Number(year);
  if (!Number.isFinite(parsed) || parsed <= 1900) return '';
  return String(CURRENT_YEAR - parsed);
};

const extractYearFromValue = (value) => {
  const text = (value || '').toString().trim();
  if (!text) return '';
  const matches = text.match(/(19|20)\d{2}/g);
  if (!matches || matches.length === 0) return '';
  return matches[matches.length - 1] || '';
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

const normalizeCategoryLabel = (value) => {
  const raw = normalizeLookup(value || '');
  if (!raw) return '';
  if (raw.startsWith('adult')) return 'Adulto';
  if (raw.startsWith('master')) return 'Master';
  if (raw.startsWith('juven')) return 'Juvenil';
  if (raw.startsWith('infanto')) return 'Infantojuvenil';
  if (raw.startsWith('infant')) return 'Infantil';
  return '';
};

const resolveBirthYear = (profile) => {
  const directYear = extractYearFromValue(profile?.anoNascimento || profile?.birthYear || '');
  if (directYear) {
    return directYear;
  }

  const yearFromBirthDate = extractYearFromValue(profile?.birthDate || profile?.dataNascimento || '');
  if (yearFromBirthDate) {
    return yearFromBirthDate;
  }
  const ageFromProfile = Number(profile?.age || profile?.idade || '');
  if (Number.isFinite(ageFromProfile) && ageFromProfile >= 0) {
    return String(CURRENT_YEAR - Math.floor(ageFromProfile));
  }
  return '';
};

const getModeLabel = (value, fallback = '-') => {
  if (value === 'GI') return 'GI';
  if (value === 'NO-GI') return 'NO-GI';
  return fallback;
};

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
  reader.onerror = () => reject(new Error('Failed to process file.'));
  reader.readAsDataURL(file);
});

const safeReadNumberFromStorage = (key) => {
  if (!key) return 0;
  try {
    const raw = localStorage.getItem(key);
    const parsed = Number(raw || 0);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
};

const safeWriteNumberToStorage = (key, value) => {
  if (!key) return;
  try {
    localStorage.setItem(key, String(Math.max(0, Number(value) || 0)));
  } catch {
    // Ignore storage failures.
  }
};

const EventRegistration = () => {
  const { eventId } = useParams();
  const {
    events,
    academies,
    memberProfiles,
    addMemberProfile,
    currentUser
  } = useStore();
  const { uiVariant } = useI18n();
  const languageVariant = ['pt', 'en', 'es', 'fr'].includes(uiVariant) ? uiVariant : 'pt';
  const isEnglish = languageVariant === 'en';
  const copyByLanguage = {
    pt: {
      eventDatePending: 'Data a confirmar',
      eventLocationPending: 'Local a definir',
      notFoundTitle: 'Evento nao encontrado',
      backToEvents: 'Voltar para eventos',
      coachNoAcademyTitle: 'Cadastre sua academia para liberar inscricoes dos alunos',
      coachNoAcademyDesc: 'Vincule sua conta a uma academia na area Academia para acessar os alunos cadastrados.',
      coachNoAcademyCta: 'Ir para area da academia',
      coachNoAthletesTitle: 'Nenhum aluno filiado encontrado',
      coachNoAthletesDesc: 'Cadastre ou vincule alunos na area Academia para enviar inscricoes.',
      coachNoAthletesCta: 'Cadastrar alunos',
      selectAthleteTitle: 'Selecione um aluno para continuar',
      completeAccountTitle: 'Complete seu cadastro antes de se inscrever',
      selectAthleteDesc: 'Escolha um aluno filiado da sua academia para preencher os dados automaticamente.',
      completeAccountDesc: 'Nao localizamos seu perfil de atleta. Complete seus dados para liberar a inscricao.',
      goMembership: 'Ir para area da academia',
      goMyAccount: 'Ir para Minha conta',
      incompleteAthleteProfileTitle: 'Dados incompletos no perfil do aluno',
      incompleteAccountTitle: 'Dados incompletos na sua conta',
      incompleteAthleteProfileDesc: 'Atualize o cadastro do aluno com nome, academia, nascimento, genero, faixa, telefone e e-mail.',
      incompleteAccountDesc: 'Atualize sua conta com nome, academia, nascimento, genero, faixa, telefone e e-mail.',
      updateMembership: 'Atualizar area da academia',
      updateAccount: 'Atualizar cadastro',
      sectionKicker: 'Inscricao oficial',
      backToEventPage: 'Voltar para a pagina do evento',
      athleteSectionTitle: 'Dados do atleta',
      athleteSectionDesc: 'Preencha os dados principais para identificacao no sistema.',
      linkedAthleteLabel: 'Aluno vinculado a sua academia',
      linkedAccountLabel: 'Dados vinculados a sua conta',
      linkedAthleteHelp: 'Selecione o aluno filiado. Os dados serao preenchidos automaticamente.',
      linkedAccountHelp: 'Nome, faixa, idade, categoria e genero sao carregados automaticamente da sua conta.',
      academyAthleteLabel: 'Aluno da academia *',
      academyAthletePlaceholder: 'Selecione um aluno filiado',
      noAcademy: 'Sem academia',
      noBelt: 'Sem faixa',
      coachResponsible: 'Professor responsavel',
      fullName: 'Nome completo *',
      academyTeam: 'Academia / Equipe *',
      birthYear: 'Ano de nascimento *',
      age: 'Idade',
      gender: 'Genero',
      category: 'Categoria',
      belt: 'Faixa',
      email: 'E-mail',
      phone: 'Telefone',
      athletePhoto: 'Foto do atleta',
      athleteAlt: 'Atleta',
      categorySectionTitle: 'Categoria e inscricao',
      categorySectionDesc: 'A tela apresenta apenas os campos necessarios para o tipo de inscricao escolhido.',
      registrationType: 'Tipo de inscricao *',
      registrationTypePlaceholder: 'Informe o tipo de inscricao',
      weightCategory: 'Categoria de peso *',
      weightCategoryPlaceholder: 'Selecione a categoria de peso',
      weightCategorySelectModeFirst: 'Primeiro selecione GI ou NO-GI',
      absoluteLabel: 'Participar do absoluto',
      chooseTypeHint: 'Escolha o tipo de inscricao para liberar os campos de peso.',
      paymentSectionTitle: 'Contato e pagamento',
      paymentSectionDesc: 'Use o mesmo e-mail e telefone que serao utilizados para o recebimento da confirmacao.',
      totalRegistrationValue: 'Valor total da inscricao',
      pixKey: 'Chave Pix',
      proofLabel: 'Anexo do comprovante *',
      proofNoFile: 'Nenhum arquivo selecionado (maximo de 1,2 MB)',
      notesLabel: 'Observacoes',
      notesPlaceholder: 'Exemplo: observacoes sobre check-in, categoria ou equipe.',
      termsTitle: 'Termo de responsabilidade',
      termsDesc: 'Leia com atencao antes de concluir a inscricao.',
      termsLine1: 'Declaro estar apto para a pratica esportiva e ciente das regras do evento.',
      termsLine2: 'Autorizo o uso de imagem e confirmo que as informacoes enviadas sao verdadeiras.',
      termsLine3: 'O competidor e responsavel pelos dados informados no ato da inscricao e pela apresentacao de documento oficial na checagem.',
      termsAccept: 'Li e aceito o termo de responsabilidade.',
      submitSending: 'Enviando...',
      submitReady: 'Enviar inscricao',
      summaryTitle: 'Resumo rapido',
      progressLabel: 'Preenchimento',
      event: 'Evento',
      academy: 'Academia',
      modality: 'Modalidade',
      giWeight: 'Peso GI',
      noGiWeight: 'Peso NO-GI',
      estimatedTotal: 'Total estimado',
      coachTotal: 'Total acumulado do professor',
      modeNone: '-',
      errorProofTooLarge: 'Comprovante maior que 1.2 MB. Envie um arquivo menor.',
      errorProofRead: 'Falha ao ler o comprovante. Tente novamente.',
      errorEventNotFound: 'Evento nao encontrado.',
      errorSelectAthlete: 'Selecione um aluno da sua academia para continuar.',
      errorCompleteAccount: 'Complete seus dados em Minha conta para continuar.',
      errorGenderMissing: 'Genero nao identificado. Atualize seus dados em Minha conta.',
      errorAcademyMissing: 'Academia nao identificada. Atualize seus dados em Minha conta.',
      errorAthleteDataMissing: 'Dados do atleta incompletos. Atualize seus dados em Minha conta.',
      errorCategoryBeltMissing: 'Categoria ou faixa ausente. Atualize seus dados em Minha conta.',
      errorSelectMode: 'Selecione se deseja competir em GI ou NO-GI.',
      errorGiWeightMissing: 'Informe a categoria de peso GI para continuar.',
      errorNoGiWeightMissing: 'Informe a categoria de peso NO-GI para continuar.',
      errorTermsRequired: 'Voce precisa aceitar o termo de responsabilidade.',
      errorProofRequired: 'Anexe o comprovante de pagamento antes de enviar.',
      errorBackendUnavailable: 'Backend indisponivel. A inscricao nao foi enviada ao sistema administrativo.',
      successRegistration: 'Inscricao feita com sucesso. Enviamos um e-mail para o atleta com os detalhes.',
      errorSubmitFallback: 'Falha ao enviar inscricao.'
    },
    en: {
      eventDatePending: 'Date to be confirmed',
      eventLocationPending: 'Location to be defined',
      notFoundTitle: 'Event not found',
      backToEvents: 'Back to events',
      coachNoAcademyTitle: 'Register your academy to unlock student registrations',
      coachNoAcademyDesc: 'Link your account to an academy in Academy area to access registered students.',
      coachNoAcademyCta: 'Go to Academy area',
      coachNoAthletesTitle: 'No affiliated student found',
      coachNoAthletesDesc: 'Register or link students in Academy area before sending registrations.',
      coachNoAthletesCta: 'Register students',
      selectAthleteTitle: 'Select a student to continue',
      completeAccountTitle: 'Complete your profile before registering',
      selectAthleteDesc: 'Choose an affiliated student from your academy to auto-fill the data.',
      completeAccountDesc: 'Athlete profile not found. Complete your data to unlock registration.',
      goMembership: 'Go to Academy area',
      goMyAccount: 'Go to My account',
      incompleteAthleteProfileTitle: 'Student profile has incomplete data',
      incompleteAccountTitle: 'Your account has incomplete data',
      incompleteAthleteProfileDesc: 'Update student profile with name, academy, birth year, gender, belt, phone and email.',
      incompleteAccountDesc: 'Update your account with name, academy, birth year, gender, belt, phone and email.',
      updateMembership: 'Update Academy area',
      updateAccount: 'Update profile',
      sectionKicker: 'Official registration',
      backToEventPage: 'Back to event page',
      athleteSectionTitle: 'Athlete data',
      athleteSectionDesc: 'Fill the main fields used to identify the athlete in the system.',
      linkedAthleteLabel: 'Student linked to your academy',
      linkedAccountLabel: 'Data linked to your account',
      linkedAthleteHelp: 'Select the affiliated student. Data is filled automatically.',
      linkedAccountHelp: 'Name, belt, age, category and gender are automatically loaded from your account.',
      academyAthleteLabel: 'Academy student *',
      academyAthletePlaceholder: 'Select an affiliated student',
      noAcademy: 'No academy',
      noBelt: 'No belt',
      coachResponsible: 'Responsible coach',
      fullName: 'Full name *',
      academyTeam: 'Academy / Team *',
      birthYear: 'Birth year *',
      age: 'Age',
      gender: 'Gender',
      category: 'Category',
      belt: 'Belt',
      email: 'Email',
      phone: 'Phone',
      athletePhoto: 'Athlete photo',
      athleteAlt: 'Athlete',
      categorySectionTitle: 'Category and registration',
      categorySectionDesc: 'Only the fields required by selected registration type are displayed.',
      registrationType: 'Registration type *',
      registrationTypePlaceholder: 'Inform registration type',
      weightCategory: 'Weight category *',
      weightCategoryPlaceholder: 'Select weight category',
      weightCategorySelectModeFirst: 'Select GI or NO-GI first',
      absoluteLabel: 'Compete in absolute division',
      chooseTypeHint: 'Choose registration type to unlock weight fields.',
      paymentSectionTitle: 'Contact and payment',
      paymentSectionDesc: 'Use the same email and phone that will receive confirmation.',
      totalRegistrationValue: 'Total registration value',
      pixKey: 'Pix key',
      proofLabel: 'Payment proof attachment *',
      proofNoFile: 'No file selected (maximum 1.2 MB)',
      notesLabel: 'Notes',
      notesPlaceholder: 'Example: notes about check-in, category or team.',
      termsTitle: 'Liability agreement',
      termsDesc: 'Read carefully before finishing registration.',
      termsLine1: 'I declare I am fit for sports practice and aware of the event rules.',
      termsLine2: 'I authorize image use and confirm all submitted information is true.',
      termsLine3: 'The competitor is responsible for provided data and for presenting official document during check-in.',
      termsAccept: 'I have read and accept the liability agreement.',
      submitSending: 'Sending...',
      submitReady: 'Send registration',
      summaryTitle: 'Quick summary',
      progressLabel: 'Completion',
      event: 'Event',
      academy: 'Academy',
      modality: 'Modality',
      giWeight: 'GI weight',
      noGiWeight: 'NO-GI weight',
      estimatedTotal: 'Estimated total',
      coachTotal: 'Coach accumulated total',
      modeNone: '-',
      errorProofTooLarge: 'Proof file is larger than 1.2 MB. Please upload a smaller file.',
      errorProofRead: 'Failed to read payment proof. Try again.',
      errorEventNotFound: 'Event not found.',
      errorSelectAthlete: 'Select a student from your academy to continue.',
      errorCompleteAccount: 'Complete your data in My account to continue.',
      errorGenderMissing: 'Gender not identified. Update your data in My account.',
      errorAcademyMissing: 'Academy not identified. Update your data in My account.',
      errorAthleteDataMissing: 'Athlete data is incomplete. Update your data in My account.',
      errorCategoryBeltMissing: 'Category or belt is missing. Update your data in My account.',
      errorSelectMode: 'Select GI or NO-GI.',
      errorGiWeightMissing: 'Provide GI weight category to continue.',
      errorNoGiWeightMissing: 'Provide NO-GI weight category to continue.',
      errorTermsRequired: 'You must accept the liability agreement.',
      errorProofRequired: 'Attach payment proof before sending.',
      errorBackendUnavailable: 'Backend unavailable. Registration was not sent to admin system.',
      successRegistration: 'Registration sent successfully and saved in database.',
      errorSubmitFallback: 'Failed to send registration.'
    }
  };
  copyByLanguage.es = { ...copyByLanguage.en };
  copyByLanguage.fr = { ...copyByLanguage.en };
  const copy = copyByLanguage[languageVariant] || copyByLanguage.pt;
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
      const profileCreatedByUser = normalizeLookup(profile.createdByUsername || '');
      const profileAccountUsername = normalizeLookup(
        profile.accountUsername || profile.loginUsername || profile.username || ''
      );
      const profileBirthYear = resolveBirthYear(profile);
      const profileGender = normalizeGenderLabel(profile.gender || profile.genero || profile.sexo || '');
      const profileCategory = normalizeCategoryLabel(profile.category || profile.categoria || profile.divisao || '');
      const profileBelt = (profile.belt || profile.faixa || '').toString().trim();
      const profilePhone = (profile.phone || profile.telefone || '').toString().trim();
      const profileAcademy = (profile.academyName || profile.academia || '').toString().trim();

      let score = 0;
      let completeness = 0;

      if (normalizedUsername && profileAccountUsername === normalizedUsername) {
        score = Math.max(score, 120);
      }
      if (normalizedUsername && profileCreatedByUser === normalizedUsername) {
        score = Math.max(score, 115);
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

      if (profileFullName) completeness += 1;
      if (profileAcademy) completeness += 1;
      if (profileBirthYear) completeness += 1;
      if (profileGender) completeness += 1;
      if (profileCategory) completeness += 1;
      if (profileBelt) completeness += 1;
      if (profilePhone) completeness += 1;
      if (profileEmail) completeness += 1;

      return { profile, score, completeness };
    });

    const bestMatch = scoredMatches
      .filter((item) => item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.completeness !== a.completeness) return b.completeness - a.completeness;
        return new Date(b.profile?.createdAt || 0).getTime() - new Date(a.profile?.createdAt || 0).getTime();
      })[0];

    return bestMatch?.profile || null;
  }, [currentUser, memberProfiles]);

  const currentUserRole = normalizeUserRole(currentUser?.role || '');
  const isCoachUser = currentUserRole === 'coach';
  const normalizedCurrentUsername = normalizeLookup(currentUser?.username || '');
  const normalizedCurrentName = normalizeLookup(currentUser?.name || '');
  const [selectedAthleteProfileId, setSelectedAthleteProfileId] = useState('');
  const coachTotalStorageKey = useMemo(() => {
    if (!isCoachUser || !event?.id || !normalizedCurrentUsername) return '';
    return `genesis_coach_event_total_${event.id}_${normalizedCurrentUsername}`;
  }, [event?.id, isCoachUser, normalizedCurrentUsername]);
  const [coachRegistrationTotal, setCoachRegistrationTotal] = useState(0);

  const coachAcademies = useMemo(() => {
    if (!isCoachUser) return [];
    const byId = new Map();

    academies.forEach((academy) => {
      const ownerUsername = normalizeLookup(academy?.ownerUsername || '');
      const ownerName = normalizeLookup(academy?.ownerName || '');
      if (!academy?.id) return;
      if (ownerUsername && ownerUsername === normalizedCurrentUsername) {
        byId.set(academy.id, academy);
        return;
      }
      if (ownerName && ownerName === normalizedCurrentName) {
        byId.set(academy.id, academy);
      }
    });

    memberProfiles.forEach((profile) => {
      const createdByUsername = normalizeLookup(profile?.createdByUsername || '');
      if (createdByUsername !== normalizedCurrentUsername) return;
      const academyId = resolveAcademyIdForProfile(profile);
      if (!academyId) return;
      const academy = academies.find((item) => item.id === academyId);
      if (!academy) return;
      byId.set(academy.id, academy);
    });

    return [...byId.values()];
  }, [
    academies,
    isCoachUser,
    memberProfiles,
    normalizedCurrentName,
    normalizedCurrentUsername,
    resolveAcademyIdForProfile
  ]);

  const coachAcademyIdSet = useMemo(() => (
    new Set(coachAcademies.map((academy) => academy.id).filter(Boolean))
  ), [coachAcademies]);

  const coachAthleteProfiles = useMemo(() => {
    if (!isCoachUser || coachAcademyIdSet.size === 0) return [];
    return memberProfiles
      .filter((profile) => {
        const academyId = resolveAcademyIdForProfile(profile);
        if (!academyId || !coachAcademyIdSet.has(academyId)) return false;
        const profileAccountUsername = normalizeLookup(profile.accountUsername || '');
        const profileRole = normalizeUserRole(profile.role || profile.userRole || '');
        if (profileRole === 'coach') return false;
        if (profileAccountUsername && profileAccountUsername === normalizedCurrentUsername) return false;
        return true;
      })
      .sort((left, right) => (left.fullName || '').localeCompare(right.fullName || ''));
  }, [
    coachAcademyIdSet,
    isCoachUser,
    memberProfiles,
    normalizedCurrentUsername,
    resolveAcademyIdForProfile
  ]);

  useEffect(() => {
    if (!isCoachUser) {
      setSelectedAthleteProfileId('');
      return;
    }

    setSelectedAthleteProfileId((previous) => {
      if (previous && coachAthleteProfiles.some((profile) => profile.id === previous)) {
        return previous;
      }
      return coachAthleteProfiles[0]?.id || '';
    });
  }, [coachAthleteProfiles, isCoachUser]);

  useEffect(() => {
    if (!isCoachUser || !coachTotalStorageKey) {
      setCoachRegistrationTotal(0);
      return;
    }
    setCoachRegistrationTotal(safeReadNumberFromStorage(coachTotalStorageKey));
  }, [coachTotalStorageKey, isCoachUser]);

  const selectedCoachAthleteProfile = useMemo(() => (
    coachAthleteProfiles.find((profile) => profile.id === selectedAthleteProfileId) || null
  ), [coachAthleteProfiles, selectedAthleteProfileId]);

  const activeRegistrationProfile = isCoachUser
    ? selectedCoachAthleteProfile
    : currentUserProfile;

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

  const eventGiWeightOptions = useMemo(
    () => parseMultilineWeightOptions(event?.weightTableGiOptions),
    [event?.weightTableGiOptions]
  );

  const eventNoGiWeightOptions = useMemo(
    () => parseMultilineWeightOptions(event?.weightTableNoGiOptions),
    [event?.weightTableNoGiOptions]
  );

  const giWeightOptions = useMemo(() => {
    if (eventGiWeightOptions.length > 0) return eventGiWeightOptions;
    if (form.categoriaConfirmada === 'Infantil') return INFANTIL_WEIGHTS;
    if (form.categoriaConfirmada === 'Infantojuvenil') return INFANTOJUVENIL_WEIGHTS;
    if (form.categoriaConfirmada === 'Juvenil') return JUVENILE_WEIGHTS;
    return form.genero === 'Feminino' ? GI_FEMALE_WEIGHTS : GI_MALE_WEIGHTS;
  }, [form.genero, form.categoriaConfirmada, eventGiWeightOptions]);

  const noGiWeightOptions = useMemo(() => {
    if (eventNoGiWeightOptions.length > 0) return eventNoGiWeightOptions;
    if (form.categoriaConfirmada === 'Infantil') return INFANTIL_WEIGHTS;
    if (form.categoriaConfirmada === 'Infantojuvenil') return INFANTOJUVENIL_WEIGHTS;
    if (form.categoriaConfirmada === 'Juvenil') return JUVENILE_WEIGHTS;
    return form.genero === 'Feminino' ? NOGI_FEMALE_WEIGHTS : NOGI_MALE_WEIGHTS;
  }, [form.genero, form.categoriaConfirmada, eventNoGiWeightOptions]);

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
  const selectedWeightTableUrl = form.tipoInscricao === 'NO-GI'
    ? (event?.weightTableNoGiUrl || '')
    : (event?.weightTableGiUrl || '');

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

  const eventMeta = `${event?.date || copy.eventDatePending} - ${event?.location || copy.eventLocationPending}`;

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectedAthleteProfileChange = (profileId) => {
    setSelectedAthleteProfileId((profileId || '').toString().trim());
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
    if (!activeRegistrationProfile) return;
    const resolvedAcademyId = resolveAcademyIdForProfile(activeRegistrationProfile);
    const birthYear = resolveBirthYear(activeRegistrationProfile);
    const profileAge = birthYear ? computeAge(birthYear) : `${activeRegistrationProfile.age || ''}`;
    const inferredCategory = resolveCategoryByAge(profileAge)
      || normalizeCategoryLabel(
        activeRegistrationProfile.category
        || activeRegistrationProfile.categoria
        || activeRegistrationProfile.divisao
        || ''
      );
    const inferredGender = normalizeGenderLabel(
      activeRegistrationProfile.gender
      || activeRegistrationProfile.genero
      || activeRegistrationProfile.sexo
      || ''
    );

    setForm((prev) => ({
      ...prev,
      nome: activeRegistrationProfile.fullName || '',
      academyId: resolvedAcademyId || '',
      equipe: activeRegistrationProfile.academyName || '',
      athletePhotoUrl: activeRegistrationProfile.photoUrl || '',
      anoNascimento: birthYear || '',
      genero: inferredGender || '',
      categoriaConfirmada: inferredCategory || '',
      faixa: activeRegistrationProfile.belt || '',
      telefone: formatBrazilPhone(activeRegistrationProfile.phone || ''),
      email: activeRegistrationProfile.email || (isCoachUser ? '' : prev.email)
    }));
  }, [activeRegistrationProfile, isCoachUser, resolveAcademyIdForProfile]);

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
      setError(copy.errorProofTooLarge);
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
      setError(copy.errorProofRead);
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
      setError(copy.errorEventNotFound);
      return;
    }
    if (!activeRegistrationProfile) {
      setError(
        isCoachUser
          ? copy.errorSelectAthlete
          : copy.errorCompleteAccount
      );
      return;
    }
    if (!form.genero) {
      setError(copy.errorGenderMissing);
      return;
    }
    if (academyOptions.length > 0 && !form.academyId) {
      setError(copy.errorAcademyMissing);
      return;
    }
    if (!form.equipe.trim() || !form.nome.trim()) {
      setError(copy.errorAthleteDataMissing);
      return;
    }
    if (!form.categoriaConfirmada || !form.faixa) {
      setError(copy.errorCategoryBeltMissing);
      return;
    }
    if (!form.tipoInscricao) {
      setError(copy.errorSelectMode);
      return;
    }
    if (requiresGi && !giWeightValue) {
      setError(copy.errorGiWeightMissing);
      return;
    }
    if (requiresNoGi && !noGiWeightValue) {
      setError(copy.errorNoGiWeightMissing);
      return;
    }
    if (!form.termosAceitos) {
      setError(copy.errorTermsRequired);
      return;
    }
    if (!form.comprovanteNome || !form.comprovanteArquivoDataUrl) {
      setError(copy.errorProofRequired);
      return;
    }

    setSubmitting(true);
    try {
      const categoriaFinal = includesAbsolute
        ? `${form.categoriaConfirmada} Absoluto`
        : form.categoriaConfirmada;

      const notesPayload = {
        sourceMemberProfileId: activeRegistrationProfile?.id || '',
        registeredByUsername: (currentUser?.username || '').toString().trim().toLowerCase(),
        registeredByName: currentUser?.name || '',
        registeredByRole: currentUserRole || 'athlete',
        selectedAthleteProfileId: isCoachUser ? selectedAthleteProfileId : '',
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
          || copy.errorBackendUnavailable
        );
        return;
      }

      try {
        addMemberProfile({
          id: activeRegistrationProfile?.id || undefined,
          fullName: form.nome,
          academyId: form.academyId,
          academyName: form.equipe,
          accountUsername: activeRegistrationProfile?.accountUsername || '',
          createdByUsername: (currentUser?.username || '').toString().trim().toLowerCase(),
          createdByName: currentUser?.name || '',
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

      if (isCoachUser && coachTotalStorageKey) {
        setCoachRegistrationTotal((previous) => {
          const nextValue = Math.max(0, Number(previous || 0)) + Math.max(0, Number(totalValue || 0));
          safeWriteNumberToStorage(coachTotalStorageKey, nextValue);
          return nextValue;
        });
      }

      setSuccess(copy.successRegistration);
      setForm((prev) => ({
        ...createInitialForm(),
        nome: prev.nome,
        academyId: prev.academyId,
        equipe: prev.equipe,
        athletePhotoUrl: prev.athletePhotoUrl,
        anoNascimento: prev.anoNascimento,
        categoriaConfirmada: prev.categoriaConfirmada,
        faixa: prev.faixa,
        genero: prev.genero,
        telefone: prev.telefone,
        email: prev.email
      }));
    } catch (err) {
      setError(err?.message || copy.errorSubmitFallback);
    } finally {
      setSubmitting(false);
    }
  };

  if (!event) {
    return (
      <div className="registration-page">
        <div className="registration-shell">
          <h2>{copy.notFoundTitle}</h2>
          <Link className="text-link" to="/eventos">{copy.backToEvents}</Link>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginOverlay redirectTo={`/eventos/${event.id}/inscricao`} />;
  }

  if (isCoachUser && coachAcademies.length === 0) {
    return (
      <div className="registration-page">
        <div className="registration-shell">
          <h2>{copy.coachNoAcademyTitle}</h2>
          <p className="table-meta">{copy.coachNoAcademyDesc}</p>
          <Link className="btn btn-primary" to="/academia">{copy.coachNoAcademyCta}</Link>
        </div>
      </div>
    );
  }

  if (isCoachUser && coachAthleteProfiles.length === 0) {
    return (
      <div className="registration-page">
        <div className="registration-shell">
          <h2>{copy.coachNoAthletesTitle}</h2>
          <p className="table-meta">{copy.coachNoAthletesDesc}</p>
          <Link className="btn btn-primary" to="/academia">{copy.coachNoAthletesCta}</Link>
        </div>
      </div>
    );
  }

  if (!activeRegistrationProfile) {
    return (
      <div className="registration-page">
        <div className="registration-shell">
          <h2>{isCoachUser ? copy.selectAthleteTitle : copy.completeAccountTitle}</h2>
          <p className="table-meta">
            {isCoachUser
              ? copy.selectAthleteDesc
              : copy.completeAccountDesc}
          </p>
          <Link className="btn btn-primary" to={isCoachUser ? '/academia' : '/minha-conta'}>
            {isCoachUser ? copy.goMembership : copy.goMyAccount}
          </Link>
        </div>
      </div>
    );
  }

  const missingAccountData = !form.nome.trim()
    || !form.equipe.trim()
    || !String(form.anoNascimento || '').trim()
    || !String(form.genero || '').trim()
    || !String(form.categoriaConfirmada || '').trim()
    || !String(form.faixa || '').trim()
    || !String(form.email || '').trim()
    || !String(form.telefone || '').trim();

  if (missingAccountData) {
    return (
      <div className="registration-page">
        <div className="registration-shell">
          <h2>{isCoachUser ? copy.incompleteAthleteProfileTitle : copy.incompleteAccountTitle}</h2>
          <p className="table-meta">
            {isCoachUser
              ? copy.incompleteAthleteProfileDesc
              : copy.incompleteAccountDesc}
          </p>
          <Link className="btn btn-primary" to={isCoachUser ? '/academia' : '/minha-conta'}>
            {isCoachUser ? copy.updateMembership : copy.updateAccount}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="registration-page">
      <form className="registration-shell" onSubmit={handleSubmit}>
        <div className="registration-top">
          <div>
            <span className="section-kicker">{copy.sectionKicker}</span>
            <h2>{event.name}</h2>
            <div className="table-meta">{eventMeta}</div>
          </div>
          <Link className="text-link" to={`/eventos/${event.id}`}>{copy.backToEventPage}</Link>
        </div>

        <div className="registration-layout">
          <div className="registration-main">
            <section className="registration-section">
              <div className="registration-section__head">
                <h3>{copy.athleteSectionTitle}</h3>
                <p>{copy.athleteSectionDesc}</p>
              </div>

              <div className="registration-fieldset">
                <label className="registration-label">
                  {isCoachUser ? copy.linkedAthleteLabel : copy.linkedAccountLabel}
                </label>
                <small className="registration-helper">
                  {isCoachUser
                    ? copy.linkedAthleteHelp
                    : copy.linkedAccountHelp}
                </small>
              </div>

              {isCoachUser && (
                <div className="registration-grid">
                  <div className="registration-field registration-field--full">
                    <label>{copy.academyAthleteLabel}</label>
                    <select
                      value={selectedAthleteProfileId}
                      onChange={(eventInput) => handleSelectedAthleteProfileChange(eventInput.target.value)}
                      required
                    >
                      <option value="">{copy.academyAthletePlaceholder}</option>
                      {coachAthleteProfiles.map((profile) => {
                        const academyLabel = profile.academyName || copy.noAcademy;
                        const beltLabel = profile.belt || copy.noBelt;
                        return (
                          <option key={profile.id} value={profile.id}>
                            {`${profile.fullName} - ${academyLabel} - ${beltLabel}`}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              )}

              <div className="registration-grid">
                <div className="registration-field registration-field--full">
                  <label>{copy.coachResponsible}</label>
                  <input value={currentUser?.name || currentUser?.username || copy.modeNone} readOnly />
                </div>
              </div>

              <div className="registration-grid">
                <div className="registration-field">
                  <label>{copy.fullName}</label>
                  <input
                    required
                    value={form.nome}
                    readOnly
                    placeholder={copy.modeNone}
                  />
                </div>

                <div className="registration-field">
                  <label>{copy.academyTeam}</label>
                  <input
                    required
                    value={form.equipe}
                    readOnly
                    placeholder={copy.modeNone}
                  />
                </div>

                <div className="registration-field">
                  <label>{copy.birthYear}</label>
                  <input value={form.anoNascimento} readOnly placeholder={copy.modeNone} />
                </div>

                <div className="registration-field">
                  <label>{copy.age}</label>
                  <input value={age} readOnly placeholder={copy.modeNone} />
                </div>

                <div className="registration-field">
                  <label>{copy.gender}</label>
                  <input value={form.genero} readOnly placeholder={copy.modeNone} />
                </div>

                <div className="registration-field">
                  <label>{copy.category}</label>
                  <input value={form.categoriaConfirmada} readOnly placeholder={copy.modeNone} />
                </div>

                <div className="registration-field">
                  <label>{copy.belt}</label>
                  <input value={form.faixa} readOnly placeholder={copy.modeNone} />
                </div>

                <div className="registration-field">
                  <label>{copy.email}</label>
                  <input value={form.email} readOnly placeholder={copy.modeNone} />
                </div>

                <div className="registration-field">
                  <label>{copy.phone}</label>
                  <input value={formatBrazilPhone(form.telefone)} readOnly placeholder={copy.modeNone} />
                </div>

                <div className="registration-field registration-field--full">
                  <label>{copy.athletePhoto}</label>
                  <input
                    value={form.athletePhotoUrl}
                    readOnly
                    placeholder={copy.modeNone}
                  />
                  {form.athletePhotoUrl && (
                    <div className="registration-photo-preview">
                      <img src={form.athletePhotoUrl} alt={form.nome || copy.athleteAlt} />
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="registration-section">
              <div className="registration-section__head">
                <h3>{copy.categorySectionTitle}</h3>
                <p>{copy.categorySectionDesc}</p>
              </div>

              <div className="registration-grid">
                <div className="registration-field">
                  <label>{copy.category}</label>
                  <input value={form.categoriaConfirmada} readOnly placeholder={copy.modeNone} />
                </div>

                <div className="registration-field">
                  <label>{copy.registrationType}</label>
                  <select
                    required
                    value={form.tipoInscricao}
                    onChange={(eventInput) => handleTypeChange(eventInput.target.value)}
                  >
                    <option value="">{copy.registrationTypePlaceholder}</option>
                    <option value="GI">GI</option>
                    <option value="NO-GI">NO-GI</option>
                  </select>
                </div>

                <div className="registration-field">
                  <label>{copy.belt}</label>
                  <input value={form.faixa} readOnly placeholder={copy.modeNone} />
                </div>

                <div className="registration-field">
                  <label>{copy.weightCategory}</label>
                  <select
                    required={Boolean(form.tipoInscricao)}
                    value={selectedWeightValue}
                    disabled={!form.tipoInscricao || !canPickWeights}
                    onChange={(eventInput) => handleWeightChange(eventInput.target.value)}
                  >
                    <option value="">
                      {form.tipoInscricao ? copy.weightCategoryPlaceholder : copy.weightCategorySelectModeFirst}
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
                    <span>{copy.absoluteLabel}</span>
                  </label>
                </div>
              </div>

              {!form.tipoInscricao && (
                <p className="registration-helper">{copy.chooseTypeHint}</p>
              )}
              {form.tipoInscricao && selectedWeightTableUrl && (
                <a
                  className="text-link"
                  href={selectedWeightTableUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {isEnglish ? 'Open event weight table' : 'Abrir tabela de peso do evento'}
                </a>
              )}
            </section>

            <section className="registration-section">
              <div className="registration-section__head">
                <h3>{copy.paymentSectionTitle}</h3>
                <p>{copy.paymentSectionDesc}</p>
              </div>

              <div className="registration-grid">
                <div className="registration-field">
                  <label>{copy.phone}</label>
                  <input
                    required
                    value={formatBrazilPhone(form.telefone)}
                    readOnly
                    placeholder={copy.modeNone}
                  />
                </div>

                <div className="registration-field">
                  <label>{copy.email}</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    readOnly
                    placeholder={copy.modeNone}
                  />
                </div>

                <div className="registration-field">
                  <label>{copy.totalRegistrationValue}</label>
                  <input value={formatBrlCurrency(totalValue)} readOnly />
                </div>

                <div className="registration-field">
                  <label>{copy.pixKey}</label>
                  <input value={eventPixKey} readOnly />
                </div>

                <div className="registration-field registration-field--full">
                  <label>{copy.proofLabel}</label>
                  <input type="file" accept=".pdf,image/*" onChange={handleProofFile} />
                  <small>
                    {form.comprovanteNome
                      ? `${form.comprovanteNome} (${Math.round((form.comprovanteTamanhoBytes || 0) / 1024)} KB)`
                      : copy.proofNoFile}
                  </small>
                </div>

                <div className="registration-field registration-field--full">
                  <label>{copy.notesLabel}</label>
                  <textarea
                    value={form.observacoes}
                    onChange={(eventInput) => updateField('observacoes', eventInput.target.value)}
                    placeholder={copy.notesPlaceholder}
                  />
                </div>
              </div>
            </section>

            <section className="registration-section registration-section--terms">
              <div className="registration-section__head">
                <h3>{copy.termsTitle}</h3>
                <p>{copy.termsDesc}</p>
              </div>

              <div className="registration-terms">
                <p>{copy.termsLine1}</p>
                <p>{copy.termsLine2}</p>
                <p>{copy.termsLine3}</p>
                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={form.termosAceitos}
                    onChange={(eventInput) => updateField('termosAceitos', eventInput.target.checked)}
                  />
                  <span>{copy.termsAccept}</span>
                </label>
              </div>
            </section>

            {error && <div className="login-error"><p>{error}</p></div>}
            {success && <div className="profile-success">{success}</div>}

            <div className="registration-actions">
              <button type="submit" className="btn btn-event registration-submit" disabled={submitting}>
                {submitting ? copy.submitSending : copy.submitReady}
              </button>
            </div>
          </div>

          <aside className="registration-side">
            <div className="registration-summary">
              <h3>{copy.summaryTitle}</h3>

              <div className="registration-progress">
                <div className="registration-progress__head">
                  <span>{copy.progressLabel}</span>
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
                  <dt>{copy.event}</dt>
                  <dd>{event.name}</dd>
                </div>
                <div>
                  <dt>{copy.academy}</dt>
                  <dd>{form.equipe || copy.modeNone}</dd>
                </div>
                <div>
                  <dt>{copy.category}</dt>
                  <dd>{form.categoriaConfirmada || copy.modeNone}</dd>
                </div>
                <div>
                  <dt>{copy.modality}</dt>
                  <dd>{getModeLabel(form.tipoInscricao, copy.modeNone)}</dd>
                </div>
                <div>
                  <dt>{copy.belt}</dt>
                  <dd>{form.faixa || copy.modeNone}</dd>
                </div>
                {requiresGi && (
                  <div>
                    <dt>{copy.giWeight}</dt>
                    <dd>{giWeightValue || copy.modeNone}</dd>
                  </div>
                )}
                {requiresNoGi && (
                  <div>
                    <dt>{copy.noGiWeight}</dt>
                    <dd>{noGiWeightValue || copy.modeNone}</dd>
                  </div>
                )}
                <div>
                  <dt>{copy.age}</dt>
                  <dd>{age || copy.modeNone}</dd>
                </div>
              </dl>

              <div className="registration-summary__total">
                <span>{copy.estimatedTotal}</span>
                <strong>{formatBrlCurrency(totalValue)}</strong>
              </div>
              {isCoachUser && (
                <div className="registration-summary__total">
                  <span>{copy.coachTotal}</span>
                  <strong>{formatBrlCurrency(coachRegistrationTotal)}</strong>
                </div>
              )}
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
};

export default EventRegistration;




