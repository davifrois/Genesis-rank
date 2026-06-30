import React, { useEffect, useMemo, useState } from 'react';
import { Image, Plus, Trash2, UserRound } from 'lucide-react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useI18n } from '../hooks/useI18n';
import { useStore } from '../hooks/useStore';
import LoginOverlay from '../components/LoginOverlay';
import { coachNotificationService } from '../services/coachNotificationService';
import { authService } from '../services/authService';
import { formatBrazilPhone } from '../utils/phone';
import { evaluatePasswordStrength } from '../utils/passwordStrength';
import { compressImage } from '../utils/imageUtils';

const createAcademyForm = () => ({
  name: '',
  country: 'Brasil',
  city: '',
  state: '',
  ownerName: '',
  ownerUsername: '',
  contactPhone: '',
  contactEmail: '',
  logoUrl: '',
  coachName: '',
  coachUsername: '',
  coachPassword: '',
  coachPasswordConfirm: '',
  coachEmail: ''
});

const createAthleteForm = () => ({
  fullName: '',
  lastName: '',
  gender: '',
  email: '',
  phone: '',
  birthDate: '',
  country: 'Brasil',
  city: '',
  belt: '',
  weight: '',
  academyId: '',
  photoUrl: ''
});

const createCoachSignupForm = () => ({
  coachName: '',
  coachUsername: '',
  coachPassword: '',
  coachPasswordConfirm: '',
  academyName: '',
  country: 'Brasil',
  city: '',
  state: '',
  contactPhone: '',
  contactEmail: '',
  logoUrl: ''
});

const BELT_OPTIONS = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];

const BELT_GUIDE = {
  Branca: {
    ptTitle: 'FAIXA BRANCA',
    ptText:
      'Destinada a iniciantes de todas as idades. Nesta graduação há maiores restrições de aplicação de golpes, e nenhum competidor deve permanecer por mais de dois anos nessa faixa.',
    enTitle: 'WHITE BELT',
    enText:
      'For beginners of all ages. This belt has more restrictions in official matches and usually has a maximum stay period before promotion.'
  },
  Cinza: {
    ptTitle: 'FAIXA CINZA - 4 A 6 ANOS | CATEGORIA INFANTIL',
    ptText:
      'Faixa opcional para crianças que se encontram tecnicamente entre as faixas branca e amarela.',
    enTitle: 'GRAY BELT - 4 TO 6 YEARS',
    enText:
      'Optional youth belt for children who are technically between white and yellow levels.'
  },
  Amarela: {
    ptTitle: 'FAIXA AMARELA - 7 A 15 ANOS | CATEGORIA INFANTIL',
    ptText:
      'Esta graduação pode ser concedida no ano em que o aluno completa sete anos ou mais.',
    enTitle: 'YELLOW BELT - 7 TO 15 YEARS',
    enText:
      'Can be awarded in the year the athlete turns 7 years old or older.'
  },
  Laranja: {
    ptTitle: 'FAIXA LARANJA - 9 A 15 ANOS | CATEGORIA INFANTIL',
    ptText:
      'Pode ser concedida quando o aluno completa nove anos ou mais.',
    enTitle: 'ORANGE BELT - 9 TO 15 YEARS',
    enText:
      'Can be awarded when the athlete reaches 9 years old or older.'
  },
  Verde: {
    ptTitle: 'FAIXA VERDE - 11 A 15 ANOS | CATEGORIA INFANTIL',
    ptText:
      'Pode ser concedida no ano em que o aluno completa onze anos ou mais.',
    enTitle: 'GREEN BELT - 11 TO 15 YEARS',
    enText:
      'Can be awarded in the year the athlete turns 11 years old or older.'
  },
  Azul: {
    ptTitle: 'FAIXA AZUL - A PARTIR DOS 16 ANOS | JUVENIL OU ADULTO',
    ptText:
      'Pode ser utilizada a partir dos 16 anos. O aluno que estiver na faixa verde recebe automaticamente a graduação azul ao completar essa idade.',
    enTitle: 'BLUE BELT - FROM 16 YEARS',
    enText:
      'Usually used from 16 years old. Green belt athletes are promoted to blue when turning 16.'
  },
  Roxa: {
    ptTitle: 'FAIXA ROXA - A PARTIR DOS 17 ANOS | JUVENIL OU ADULTO',
    ptText:
      'Pode ser utilizada a partir dos 17 anos. Em competição oficial, a disputa nessa faixa ocorre, em regra, a partir da categoria adulto.',
    enTitle: 'PURPLE BELT - FROM 17 YEARS',
    enText:
      'Can be used from 17 years old; official competition at this belt is commonly in adult divisions.'
  },
  Marrom: {
    ptTitle: 'FAIXA MARROM - A PARTIR DOS 18 ANOS | ADULTO',
    ptText:
      'Graduação de alta responsabilidade técnica, permitida a partir dos 18 anos (ano em que completa).',
    enTitle: 'BROWN BELT - FROM 18 YEARS',
    enText:
      'Important senior belt, usually from 18 years old onward.'
  },
  Preta: {
    ptTitle: 'FAIXA PRETA - A PARTIR DOS 19 ANOS | ADULTO',
    ptText:
      'Graduação máxima esportiva, permitida a partir dos 19 anos.',
    enTitle: 'BLACK BELT - FROM 19 YEARS',
    enText:
      'Highest sport belt level, usually from 19 years old onward.'
  }
};

const resolveBeltGuideByLanguage = (guide, variant) => {
  if (!guide) return { title: '', text: '' };
  if (variant === 'es') {
    return {
      title: guide.esTitle || guide.enTitle || guide.ptTitle || '',
      text: guide.esText || guide.enText || guide.ptText || ''
    };
  }
  if (variant === 'fr') {
    return {
      title: guide.frTitle || guide.enTitle || guide.ptTitle || '',
      text: guide.frText || guide.enText || guide.ptText || ''
    };
  }
  if (variant === 'en') {
    return {
      title: guide.enTitle || guide.ptTitle || '',
      text: guide.enText || guide.ptText || ''
    };
  }
  return {
    title: guide.ptTitle || guide.enTitle || '',
    text: guide.ptText || guide.enText || ''
  };
};

const fileToDataUrl = (file) => compressImage(file, 800, 800, 0.7);

const formatDate = (value, locale) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
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

const resolveMembershipView = (value) => {
  const raw = (value || '').toString().trim().toLowerCase();
  if (['member', 'membro', 'athlete', 'atleta'].includes(raw)) return 'athlete';
  return 'academy';
};

const normalizeLookup = (value) => (
  (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
);

const isValidEmail = (value) => {
  const email = (value || '').toString().trim();
  return /^\S+@\S+\.\S+$/.test(email);
};

const normalizeUsername = (value) => (
  (value || '').toString().trim().toLowerCase()
);

const emailLocalPart = (value) => {
  const text = (value || '').toString().trim();
  if (!text) return '';
  const local = text.includes('@') ? text.split('@')[0] : text;
  return normalizeLookup(local);
};

const Membership = () => {
  const { locale, uiVariant } = useI18n();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const languageVariant = ['pt', 'en', 'es', 'fr'].includes(uiVariant) ? uiVariant : 'pt';
  const {
    academies,
    memberProfiles,
    addAcademy,
    deleteAcademy,
    addMemberProfile,
    deleteMemberProfile,
    login,
    currentUser
  } = useStore();
  const currentUserRole = (currentUser?.role || '').toString().trim().toLowerCase();
  const isAdmin = currentUserRole === 'admin';
  const isCoach = currentUserRole === 'coach' || currentUserRole === 'professor' || currentUserRole === 'admin';
  const isAthlete = currentUserRole === 'athlete' || currentUserRole === 'atleta';
  const canManageMembership = isAdmin || isCoach || isAthlete;
  const normalizedCurrentUsername = normalizeLookup(currentUser?.username || '');
  const normalizedCurrentName = normalizeLookup(currentUser?.name || '');
  const copyByLanguage = {
    pt: {
      kicker: 'Filiacao',
      title: 'Cadastro de filiacao e academias',
      subtitle:
        'Cadastre academia e atleta uma unica vez. Isso organiza a base e permite reaproveitar a foto do atleta no ranking.',
      academyBlockKicker: 'Academias',
      academyBlockTitle: 'Gestao de academias',
      academyBlockSubtitle: 'Cadastre e mantenha os dados das equipes em uma area especifica.',
      athleteBlockKicker: 'Atletas',
      athleteBlockTitle: 'Gestao de atletas',
      athleteBlockSubtitle: 'Cadastre perfis com foto, faixa e dados de categoria em area especifica.',
      academySection: 'Cadastro de academia',
      academyHint: 'Cadastre a equipe com foto/logo e dados do responsavel.',
      athleteSection: 'Cadastro de atleta',
      athleteHint: 'Vincule o atleta a uma academia e salve a foto para aparecer no ranking.',
      saveAcademy: 'Salvar academia',
      saveAthlete: 'Salvar atleta',
      clear: 'Limpar',
      academyName: 'Nome da academia *',
      academyCountry: 'Pais',
      academyCity: 'Cidade',
      academyState: 'Estado',
      academyOwner: 'Responsavel',
      academyPhone: 'Telefone',
      academyEmail: 'E-mail',
      academyLogo: 'Foto/logo da academia',
      academyLogoUrl: 'URL da foto (opcional)',
      athleteName: 'Nome do atleta *',
      athleteLastName: 'Sobrenome',
      athleteEmail: 'E-mail',
      athletePhone: 'Telefone',
      athleteBirthDate: 'Data de nascimento',
      athleteGender: 'Genero',
      athleteGenderSelect: 'Selecione o genero',
      athleteGenderMale: 'Masculino',
      athleteGenderFemale: 'Feminino',
      athleteAge: 'Idade',
      athleteCountry: 'Pais',
      athleteCity: 'Cidade',
      athleteBelt: 'Faixa',
      athleteBeltSelect: 'Selecione a faixa',
      athleteWeight: 'Peso / divisao',
      athleteAcademy: 'Academia *',
      athletePhoto: 'Foto do atleta',
      athletePhotoUrl: 'URL da foto (opcional)',
      chooseAcademy: 'Selecione a academia',
      athleteNameRequired: 'Informe o nome do atleta.',
      athleteGenderRequired: 'Selecione o genero do atleta.',
      athleteBeltGuide: 'Regras da faixa e idade permitida',
      academiesTitle: 'Academias cadastradas',
      athletesTitle: 'Atletas cadastrados',
      remove: 'Remover',
      createdAt: 'Criado em',
      noAcademy: 'Nenhuma academia cadastrada ainda.',
      noAthlete: 'Nenhum atleta cadastrado ainda.',
      noBeltData: 'Sem faixa ou peso informado',
      yearsOld: 'anos',
      academySaved: 'Academia cadastrada com sucesso.',
      athleteSaved: 'Atleta cadastrado com sucesso.',
      athleteUpdated: 'Filiacao do atleta atualizada com sucesso.',
      academyFail: 'Nao foi possivel salvar a academia.',
      athleteFail: 'Nao foi possivel salvar o atleta.',
      academyDeleteConfirm: (name) => `Remover a academia "${name}"?`,
      athleteDeleteConfirm: (name) => `Remover o atleta "${name}"?`,
      dbNote: 'Dados salvos no banco do sistema e reaproveitados nas outras telas.',
      restrictedTitle: 'Acesso restrito para professor e administrador',
      restrictedSubtitle: 'Esta area e destinada a filiacao de academia e gestao dos alunos.',
      coachScopeNote: 'Acesso de professor: voce gerencia apenas sua academia e seus alunos vinculados.',
      academyUpdated: 'Academia atualizada com sucesso.',
      athleteSavedAndNotified: 'Aluno salvo e e-mail de notificacao enviado ao professor.',
      weightExamplePlaceholder: 'Ex: Leve / 76kg',
      ageAutoPlaceholder: 'Automatica',
      coachSignupKicker: 'Professor',
      coachSignupTitle: 'Cadastro de professor e academia',
      coachSignupSubtitle: 'Crie o login do professor junto com a afiliacao da academia.',
      coachSignupName: 'Nome do professor *',
      coachSignupUsername: 'Usuario de login *',
      coachSignupPassword: 'Senha *',
      coachSignupPasswordConfirm: 'Confirmar senha *',
      coachSignupAcademyName: 'Nome da academia *',
      coachSignupCreate: 'Criar login e afiliar academia',
      coachSignupAlreadyHasLogin: 'Ja tenho login',
      coachSignupSuccess: 'Cadastro concluido. Login de professor criado com sucesso.',
      coachSignupError: 'Nao foi possivel concluir o cadastro.',
      coachSignupNameRequired: 'Informe o nome do professor.',
      coachSignupAcademyNameRequired: 'Informe o nome da academia para continuar.',
      coachSignupUsernameRequired: 'Informe um usuario de login para o professor.',
      coachSignupPasswordMin: 'Use no minimo 8 caracteres com letra maiuscula, minuscula, numero e simbolo.',
      coachSignupPasswordMismatch: 'As senhas informadas nao conferem.',
      coachSignupLocalOnly: 'Cadastro automatico de professor disponivel apenas no modo local neste momento.',
      coachSignupStepOneLabel: 'Etapa 1',
      coachSignupStepOneTitle: 'Dados da academia',
      coachSignupStepOneHint: 'Informe os dados da academia para iniciar a filiacao.',
      coachSignupStepTwoLabel: 'Etapa 2',
      coachSignupStepTwoTitle: 'Credenciais do professor',
      coachSignupStepTwoHint: 'Agora informe os dados de acesso do professor para concluir o cadastro.',
      coachSignupContinue: 'Continuar',
      coachSignupBack: 'Voltar',
      coachCredentialsTitle: 'Credenciais do professor',
      coachCredentialsHint: 'Etapa obrigatoria: crie o acesso do professor para concluir o cadastro da academia.',
      coachCredentialsCreated: 'Academia salva e login de professor criado com sucesso.',
      coachCredentialsLinked: 'Academia salva e professor vinculado com sucesso.',
      coachCredentialsPasswordRequired: 'Informe uma senha forte para o professor (8 caracteres, maiuscula, minuscula, numero e simbolo).',
      coachCredentialsExistingInvalid: 'O usuario do professor ja existe. Informe a senha correta para vincular a academia.',
      coachCredentialsMustBeDifferent: 'Use um usuario diferente do seu login atual para criar o professor.',
      coachCredentialsUsernameTaken: 'Este usuario de professor ja existe. Crie um novo login para outra pessoa.',
      coachAcademyPanelKicker: 'Professor',
      coachAcademyPanelTitle: 'Painel do Professor - Alunos da Academia',
      coachAcademyPanelSubtitle: 'Gerencie os dados da academia, visualize os alunos vinculados e cadastre novos atletas da sua equipe.'
    },
    en: {
      kicker: 'Membership',
      title: 'Membership and academy registration',
      subtitle:
        'Register academy and athlete once. This keeps the base organized and allows athlete photo to be reused in ranking.',
      academyBlockKicker: 'Academies',
      academyBlockTitle: 'Academy management',
      academyBlockSubtitle: 'Register, edit and keep all academy data in one section.',
      athleteBlockKicker: 'Athletes',
      athleteBlockTitle: 'Athlete management',
      athleteBlockSubtitle: 'Register athlete profiles with photo, belt and category data.',
      academySection: 'Academy registration',
      academyHint: 'Create academy with team logo and responsible contact.',
      athleteSection: 'Athlete registration',
      athleteHint: 'Link athlete to an academy and save profile photo for ranking.',
      saveAcademy: 'Save academy',
      saveAthlete: 'Save athlete',
      clear: 'Clear',
      academyName: 'Academy name *',
      academyCountry: 'Country',
      academyCity: 'City',
      academyState: 'State',
      academyOwner: 'Responsible',
      academyPhone: 'Phone',
      academyEmail: 'Email',
      academyLogo: 'Academy logo',
      academyLogoUrl: 'Logo URL (optional)',
      athleteName: 'Athlete name *',
      athleteLastName: 'Surname',
      athleteEmail: 'Email',
      athletePhone: 'Phone',
      athleteBirthDate: 'Birth date',
      athleteGender: 'Gender',
      athleteGenderSelect: 'Select gender',
      athleteGenderMale: 'Male',
      athleteGenderFemale: 'Female',
      athleteAge: 'Age',
      athleteCountry: 'Country',
      athleteCity: 'City',
      athleteBelt: 'Belt',
      athleteBeltSelect: 'Select belt',
      athleteWeight: 'Weight / division',
      athleteAcademy: 'Academy *',
      athletePhoto: 'Athlete photo',
      athletePhotoUrl: 'Photo URL (optional)',
      chooseAcademy: 'Select academy',
      athleteNameRequired: 'Enter athlete name.',
      athleteGenderRequired: 'Select athlete gender.',
      athleteBeltGuide: 'Belt rules and age range',
      academiesTitle: 'Registered academies',
      athletesTitle: 'Registered athletes',
      remove: 'Remove',
      createdAt: 'Created',
      noAcademy: 'No academy registered yet.',
      noAthlete: 'No athlete registered yet.',
      noBeltData: 'No belt/weight informed',
      yearsOld: 'years',
      academySaved: 'Academy saved successfully.',
      athleteSaved: 'Athlete saved successfully.',
      athleteUpdated: 'Athlete affiliation updated successfully.',
      academyFail: 'Could not save academy.',
      athleteFail: 'Could not save athlete.',
      academyDeleteConfirm: (name) => `Remove academy "${name}"?`,
      athleteDeleteConfirm: (name) => `Remove athlete "${name}"?`,
      dbNote: 'Data is stored in system database and used across pages.',
      restrictedTitle: 'Access restricted to professor and admin',
      restrictedSubtitle: 'This area is only for academy affiliation and student management.',
      coachScopeNote: 'Professor access: you manage only your academy and linked students.',
      academyUpdated: 'Academy updated successfully.',
      athleteSavedAndNotified: 'Student saved and notification email sent to professor.',
      weightExamplePlaceholder: 'Ex: Light / 76kg',
      ageAutoPlaceholder: 'Auto',
      coachSignupKicker: 'Coach',
      coachSignupTitle: 'Coach and academy signup',
      coachSignupSubtitle: 'Create coach login and academy affiliation in a single step.',
      coachSignupName: 'Coach name *',
      coachSignupUsername: 'Login username *',
      coachSignupPassword: 'Password *',
      coachSignupPasswordConfirm: 'Confirm password *',
      coachSignupAcademyName: 'Academy name *',
      coachSignupCreate: 'Create login and affiliate academy',
      coachSignupAlreadyHasLogin: 'I already have login',
      coachSignupSuccess: 'Signup completed. Coach login created successfully.',
      coachSignupError: 'Could not complete signup.',
      coachSignupNameRequired: 'Enter coach name.',
      coachSignupAcademyNameRequired: 'Provide academy name to continue.',
      coachSignupUsernameRequired: 'Enter a valid login username.',
      coachSignupPasswordMin: 'Use at least 8 characters with uppercase, lowercase, number, and symbol.',
      coachSignupPasswordMismatch: 'Passwords do not match.',
      coachSignupLocalOnly: 'Automatic coach signup is available only in local mode right now.',
      coachSignupStepOneLabel: 'Step 1',
      coachSignupStepOneTitle: 'Academy details',
      coachSignupStepOneHint: 'Provide academy data to start affiliation.',
      coachSignupStepTwoLabel: 'Step 2',
      coachSignupStepTwoTitle: 'Coach credentials',
      coachSignupStepTwoHint: 'Now provide coach access data to complete signup.',
      coachSignupContinue: 'Continue',
      coachSignupBack: 'Back',
      coachCredentialsTitle: 'Coach credentials',
      coachCredentialsHint: 'Required step: create coach access to finish academy registration.',
      coachCredentialsCreated: 'Academy saved and coach login created successfully.',
      coachCredentialsLinked: 'Academy saved and coach linked successfully.',
      coachCredentialsPasswordRequired: 'Enter a strong coach password (8 characters, uppercase, lowercase, number, and symbol).',
      coachCredentialsExistingInvalid: 'Coach username already exists. Enter the correct password to link this academy.',
      coachCredentialsMustBeDifferent: 'Use a different username than your current login to create the coach account.',
      coachCredentialsUsernameTaken: 'This coach username already exists. Create a new login for a different person.',
      coachAcademyPanelKicker: 'Coach',
      coachAcademyPanelTitle: 'Coach Panel - Academy Students',
      coachAcademyPanelSubtitle: 'Manage academy data, view linked students and register new athletes from your team.'
    },
    es: {
      kicker: 'Filiacion',
      title: 'Registro de filiacion y academias',
      subtitle:
        'Registre academia y atleta una sola vez. Esto organiza la base y permite reutilizar la foto del atleta en el ranking.',
      academyBlockKicker: 'Academias',
      academyBlockTitle: 'Gestion de academias',
      academyBlockSubtitle: 'Registre y mantenga los datos de los equipos en una sola area.',
      athleteBlockKicker: 'Atletas',
      athleteBlockTitle: 'Gestion de atletas',
      athleteBlockSubtitle: 'Registre perfiles con foto, cinturon y categoria en una sola area.',
      academySection: 'Registro de academia',
      academyHint: 'Registre el equipo con logo y datos del responsable.',
      athleteSection: 'Registro de atleta',
      athleteHint: 'Vincule el atleta a una academia y guarde la foto para el ranking.',
      saveAcademy: 'Guardar academia',
      saveAthlete: 'Guardar atleta',
      clear: 'Limpiar',
      academyName: 'Nombre de la academia *',
      academyCountry: 'Pais',
      academyCity: 'Ciudad',
      academyState: 'Estado',
      academyOwner: 'Responsable',
      academyPhone: 'Telefono',
      academyEmail: 'Correo',
      academyLogo: 'Logo de la academia',
      academyLogoUrl: 'URL del logo (opcional)',
      athleteName: 'Nombre del atleta *',
      athleteLastName: 'Apellido',
      athleteEmail: 'Correo',
      athletePhone: 'Telefono',
      athleteBirthDate: 'Fecha de nacimiento',
      athleteGender: 'Genero',
      athleteGenderSelect: 'Seleccione genero',
      athleteGenderMale: 'Masculino',
      athleteGenderFemale: 'Femenino',
      athleteAge: 'Edad',
      athleteCountry: 'Pais',
      athleteCity: 'Ciudad',
      athleteBelt: 'Cinturon',
      athleteBeltSelect: 'Seleccione cinturon',
      athleteWeight: 'Peso / division',
      athleteAcademy: 'Academia *',
      athletePhoto: 'Foto del atleta',
      athletePhotoUrl: 'URL de la foto (opcional)',
      chooseAcademy: 'Seleccione academia',
      athleteNameRequired: 'Ingrese el nombre del atleta.',
      athleteGenderRequired: 'Seleccione el genero del atleta.',
      athleteBeltGuide: 'Reglas del cinturon y edad permitida',
      academiesTitle: 'Academias registradas',
      athletesTitle: 'Atletas registrados',
      remove: 'Eliminar',
      createdAt: 'Creado en',
      noAcademy: 'Todavia no hay academias registradas.',
      noAthlete: 'Todavia no hay atletas registrados.',
      noBeltData: 'Sin cinturon o peso informado',
      yearsOld: 'anos',
      academySaved: 'Academia guardada con exito.',
      athleteSaved: 'Atleta guardado con exito.',
      athleteUpdated: 'Afiliacion del atleta actualizada con exito.',
      academyFail: 'No se pudo guardar la academia.',
      athleteFail: 'No se pudo guardar el atleta.',
      academyDeleteConfirm: (name) => `Eliminar la academia "${name}"?`,
      athleteDeleteConfirm: (name) => `Eliminar el atleta "${name}"?`,
      dbNote: 'Los datos se guardan en la base del sistema y se reutilizan en otras pantallas.',
      restrictedTitle: 'Acceso restringido para profesor y administrador',
      restrictedSubtitle: 'Esta area es solo para filiacion de academia y gestion de alumnos.',
      coachScopeNote: 'Acceso de profesor: solo administra su academia y alumnos vinculados.',
      academyUpdated: 'Academia actualizada con exito.',
      athleteSavedAndNotified: 'Alumno guardado y correo de notificacion enviado al profesor.',
      weightExamplePlaceholder: 'Ej: Leve / 76kg',
      ageAutoPlaceholder: 'Automatica',
      coachSignupKicker: 'Profesor',
      coachSignupTitle: 'Registro de profesor y academia',
      coachSignupSubtitle: 'Cree el login del profesor junto con la afiliacion de la academia.',
      coachSignupName: 'Nombre del profesor *',
      coachSignupUsername: 'Usuario de acceso *',
      coachSignupPassword: 'Contrasena *',
      coachSignupPasswordConfirm: 'Confirmar contrasena *',
      coachSignupAcademyName: 'Nombre de la academia *',
      coachSignupCreate: 'Crear login y afiliar academia',
      coachSignupAlreadyHasLogin: 'Ya tengo login',
      coachSignupSuccess: 'Registro completado. Login de profesor creado con exito.',
      coachSignupError: 'No se pudo completar el registro.',
      coachSignupNameRequired: 'Ingrese el nombre del profesor.',
      coachSignupAcademyNameRequired: 'Ingrese el nombre de la academia para continuar.',
      coachSignupUsernameRequired: 'Ingrese un usuario valido.',
      coachSignupPasswordMin: 'Use al menos 8 caracteres con mayuscula, minuscula, numero y simbolo.',
      coachSignupPasswordMismatch: 'Las contrasenas no coinciden.',
      coachSignupLocalOnly: 'El registro automatico de profesor solo esta disponible en modo local por ahora.',
      coachSignupStepOneLabel: 'Paso 1',
      coachSignupStepOneTitle: 'Datos de la academia',
      coachSignupStepOneHint: 'Informe los datos de la academia para iniciar la afiliacion.',
      coachSignupStepTwoLabel: 'Paso 2',
      coachSignupStepTwoTitle: 'Credenciales del profesor',
      coachSignupStepTwoHint: 'Ahora informe los datos de acceso del profesor para completar el registro.',
      coachSignupContinue: 'Continuar',
      coachSignupBack: 'Volver',
      coachCredentialsTitle: 'Credenciales del profesor',
      coachCredentialsHint: 'Paso obligatorio: cree el acceso del profesor para completar el registro de la academia.',
      coachCredentialsCreated: 'Academia guardada y login del profesor creado con exito.',
      coachCredentialsLinked: 'Academia guardada y profesor vinculado con exito.',
      coachCredentialsPasswordRequired: 'Ingrese una contrasena fuerte para el profesor (8 caracteres, mayuscula, minuscula, numero y simbolo).',
      coachCredentialsExistingInvalid: 'El usuario del profesor ya existe. Ingrese la contrasena correcta para vincular la academia.',
      coachCredentialsMustBeDifferent: 'Use un usuario diferente de su login actual para crear el profesor.',
      coachCredentialsUsernameTaken: 'Este usuario de profesor ya existe. Cree un nuevo login para otra persona.',
      coachAcademyPanelKicker: 'Profesor',
      coachAcademyPanelTitle: 'Panel del Profesor - Alumnos de la Academia',
      coachAcademyPanelSubtitle: 'Gestione los datos de la academia, vea los alumnos vinculados y registre nuevos atletas de su equipo.'
    },
    fr: {
      kicker: 'Affiliation',
      title: 'Affiliation et enregistrement des academies',
      subtitle:
        'Enregistrez academy et athlete une seule fois. Cela organise la base et permet de reutiliser la photo de l athlete dans le classement.',
      academyBlockKicker: 'Academies',
      academyBlockTitle: 'Gestion des academies',
      academyBlockSubtitle: 'Enregistrez et maintenez les donnees des equipes dans une section unique.',
      athleteBlockKicker: 'Athletes',
      athleteBlockTitle: 'Gestion des athletes',
      athleteBlockSubtitle: 'Enregistrez des profils avec photo, ceinture et categorie dans une section unique.',
      academySection: 'Enregistrement de l academie',
      academyHint: 'Enregistrez l equipe avec logo et contact responsable.',
      athleteSection: 'Enregistrement de l athlete',
      athleteHint: 'Associez l athlete a une academie et enregistrez la photo pour le classement.',
      saveAcademy: 'Enregistrer l academie',
      saveAthlete: 'Enregistrer l athlete',
      clear: 'Effacer',
      academyName: 'Nom de l academie *',
      academyCountry: 'Pays',
      academyCity: 'Ville',
      academyState: 'Etat',
      academyOwner: 'Responsable',
      academyPhone: 'Telephone',
      academyEmail: 'E-mail',
      academyLogo: 'Logo de l academie',
      academyLogoUrl: 'URL du logo (optionnel)',
      athleteName: 'Nom de l athlete *',
      athleteLastName: 'Nom de famille',
      athleteEmail: 'E-mail',
      athletePhone: 'Telephone',
      athleteBirthDate: 'Date de naissance',
      athleteGender: 'Genre',
      athleteGenderSelect: 'Selectionnez le genre',
      athleteGenderMale: 'Masculin',
      athleteGenderFemale: 'Feminin',
      athleteAge: 'Age',
      athleteCountry: 'Pays',
      athleteCity: 'Ville',
      athleteBelt: 'Ceinture',
      athleteBeltSelect: 'Selectionnez la ceinture',
      athleteWeight: 'Poids / division',
      athleteAcademy: 'Academie *',
      athletePhoto: 'Photo de l athlete',
      athletePhotoUrl: 'URL de la photo (optionnel)',
      chooseAcademy: 'Selectionnez l academie',
      athleteNameRequired: 'Saisissez le nom de l athlete.',
      athleteGenderRequired: 'Selectionnez le genre de l athlete.',
      athleteBeltGuide: 'Regles de ceinture et age autorise',
      academiesTitle: 'Academies enregistrees',
      athletesTitle: 'Athletes enregistres',
      remove: 'Supprimer',
      createdAt: 'Cree le',
      noAcademy: 'Aucune academie enregistree pour le moment.',
      noAthlete: 'Aucun athlete enregistre pour le moment.',
      noBeltData: 'Sans ceinture ou poids',
      yearsOld: 'ans',
      academySaved: 'Academie enregistree avec succes.',
      athleteSaved: 'Athlete enregistre avec succes.',
      athleteUpdated: 'Affiliation de l athlete mise a jour avec succes.',
      academyFail: 'Impossible d enregistrer l academie.',
      athleteFail: 'Impossible d enregistrer l athlete.',
      academyDeleteConfirm: (name) => `Supprimer l academie "${name}" ?`,
      athleteDeleteConfirm: (name) => `Supprimer l athlete "${name}" ?`,
      dbNote: 'Les donnees sont enregistrees dans la base du systeme et reutilisees sur les autres pages.',
      restrictedTitle: 'Acces reserve au professeur et a l administrateur',
      restrictedSubtitle: 'Cette zone est reservee a l affiliation des academies et a la gestion des eleves.',
      coachScopeNote: 'Acces professeur: vous gerez seulement votre academie et vos eleves lies.',
      academyUpdated: 'Academie mise a jour avec succes.',
      athleteSavedAndNotified: 'Eleve enregistre et e-mail de notification envoye au professeur.',
      weightExamplePlaceholder: 'Ex: Leve / 76kg',
      ageAutoPlaceholder: 'Automatique',
      coachSignupKicker: 'Professeur',
      coachSignupTitle: 'Inscription professeur et academie',
      coachSignupSubtitle: 'Creez le login du professeur avec l affiliation de l academie.',
      coachSignupName: 'Nom du professeur *',
      coachSignupUsername: 'Utilisateur de connexion *',
      coachSignupPassword: 'Mot de passe *',
      coachSignupPasswordConfirm: 'Confirmer le mot de passe *',
      coachSignupAcademyName: 'Nom de l academie *',
      coachSignupCreate: 'Creer login et affilier academie',
      coachSignupAlreadyHasLogin: 'J ai deja un login',
      coachSignupSuccess: 'Inscription terminee. Login professeur cree avec succes.',
      coachSignupError: 'Impossible de terminer l inscription.',
      coachSignupNameRequired: 'Renseignez le nom du professeur.',
      coachSignupAcademyNameRequired: 'Renseignez le nom de l academie pour continuer.',
      coachSignupUsernameRequired: 'Saisissez un nom d utilisateur valide.',
      coachSignupPasswordMin: 'Utilisez au moins 8 caracteres avec majuscule, minuscule, chiffre et symbole.',
      coachSignupPasswordMismatch: 'Les mots de passe ne correspondent pas.',
      coachSignupLocalOnly: 'L inscription automatique professeur est disponible uniquement en mode local pour le moment.',
      coachSignupStepOneLabel: 'Etape 1',
      coachSignupStepOneTitle: 'Donnees de l academie',
      coachSignupStepOneHint: 'Renseignez les donnees de l academie pour demarrer l affiliation.',
      coachSignupStepTwoLabel: 'Etape 2',
      coachSignupStepTwoTitle: 'Identifiants du professeur',
      coachSignupStepTwoHint: 'Renseignez maintenant les acces du professeur pour finaliser le compte.',
      coachSignupContinue: 'Continuer',
      coachSignupBack: 'Retour',
      coachCredentialsTitle: 'Identifiants professeur',
      coachCredentialsHint: 'Etape obligatoire: creez l acces du professeur pour finaliser l inscription de l academie.',
      coachCredentialsCreated: 'Academie enregistree et login professeur cree avec succes.',
      coachCredentialsLinked: 'Academie enregistree et professeur lie avec succes.',
      coachCredentialsPasswordRequired: 'Saisissez un mot de passe professeur fort (8 caracteres, majuscule, minuscule, chiffre et symbole).',
      coachCredentialsExistingInvalid: 'Cet utilisateur professeur existe deja. Saisissez le bon mot de passe pour lier l academie.',
      coachCredentialsMustBeDifferent: 'Utilisez un identifiant different de votre login actuel pour creer le professeur.',
      coachCredentialsUsernameTaken: 'Cet identifiant professeur existe deja. Creez un nouveau login pour une autre personne.',
      coachAcademyPanelKicker: 'Professeur',
      coachAcademyPanelTitle: 'Panneau du Professeur - Eleves de l Academie',
      coachAcademyPanelSubtitle: 'Gerez les donnees de l academie, consultez les eleves lies et enregistrez de nouveaux athletes de votre equipe.'
    }
  };
  const copy = copyByLanguage[languageVariant] || copyByLanguage.pt;

  const [academyForm, setAcademyForm] = useState(createAcademyForm);
  const [athleteForm, setAthleteForm] = useState(createAthleteForm);
  const [academyFeedback, setAcademyFeedback] = useState('');
  const [athleteFeedback, setAthleteFeedback] = useState('');
  const [academyError, setAcademyError] = useState('');
  const [athleteError, setAthleteError] = useState('');
  const [academySignupStep, setAcademySignupStep] = useState(1);
  const [editingAcademyId, setEditingAcademyId] = useState('');
  const [coachSignupForm, setCoachSignupForm] = useState(createCoachSignupForm);
  const [coachSignupError, setCoachSignupError] = useState('');
  const [coachSignupFeedback, setCoachSignupFeedback] = useState('');
  const [coachSignupStep, setCoachSignupStep] = useState(1);
  const [showCoachLoginOverlay, setShowCoachLoginOverlay] = useState(false);
  const coachSignupPasswordStrength = useMemo(
    () => evaluatePasswordStrength(coachSignupForm.coachPassword, locale),
    [coachSignupForm.coachPassword, locale]
  );
  const academyCoachPasswordStrength = useMemo(
    () => evaluatePasswordStrength(academyForm.coachPassword, locale),
    [academyForm.coachPassword, locale]
  );
  const isDedicatedAcademyArea = location.pathname === '/academia';
  const isFiliationArea = location.pathname === '/filiacao';
  const membershipView = useMemo(() => {
    const requestedView = resolveMembershipView(searchParams.get('tab'));
    if (isAthlete) return 'athlete';
    if (isDedicatedAcademyArea) return 'academy';
    if (isFiliationArea) return requestedView;
    return requestedView;
  }, [isAthlete, isDedicatedAcademyArea, isFiliationArea, searchParams]);
  const isCoachSignupSubmitDisabled = coachSignupStep === 2 && (
    !coachSignupPasswordStrength.isStrong
    || coachSignupForm.coachPassword !== coachSignupForm.coachPasswordConfirm
    || !normalizeUsername(coachSignupForm.coachUsername || '')
    || !(coachSignupForm.coachName || '').toString().trim()
  );
  const isAdminAcademySubmitDisabled = isAdmin && academySignupStep === 2 && (
    !academyCoachPasswordStrength.isStrong
    || academyForm.coachPassword !== academyForm.coachPasswordConfirm
    || !normalizeUsername(academyForm.coachUsername || '')
    || !(academyForm.coachName || '').toString().trim()
  );

  const coachOwnedAcademies = useMemo(() => {
    if (!isCoach) return [];
    const profileAcademyIds = new Set(
      memberProfiles
        .filter((profile) => normalizeLookup(profile.createdByUsername || '') === normalizedCurrentUsername)
        .map((profile) => (profile.academyId || '').toString().trim())
        .filter(Boolean)
    );

    return academies
      .filter((academy) => {
        const ownerUsername = normalizeLookup(academy.ownerUsername || '');
        const ownerName = normalizeLookup(academy.ownerName || '');
        const academyId = (academy.id || '').toString().trim();
        const byOwnerUsername = Boolean(ownerUsername && ownerUsername === normalizedCurrentUsername);
        const byOwnerName = Boolean(ownerName && ownerName === normalizedCurrentName);
        const byProfileLink = Boolean(academyId && profileAcademyIds.has(academyId));
        return byOwnerUsername || byOwnerName || byProfileLink;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [academies, isCoach, memberProfiles, normalizedCurrentName, normalizedCurrentUsername]);

  const academyOptions = useMemo(() => (
    (isAdmin || isAthlete ? academies : coachOwnedAcademies)
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  ), [academies, coachOwnedAcademies, isAdmin, isAthlete]);

  const academyMap = useMemo(() => (
    new Map(academyOptions.map((academy) => [academy.id, academy]))
  ), [academyOptions]);

  const coachVisibleProfiles = useMemo(() => {
    if (!isCoach) return [];
    const academyIdSet = new Set(academyOptions.map((academy) => academy.id).filter(Boolean));
    return memberProfiles.filter((profile) => {
      const role = normalizeLookup(profile.role || profile.userRole || '');
      if (role === 'coach' || role === 'professor') return false;
      if (profile.academyId && academyIdSet.has(profile.academyId)) return true;
      return normalizeLookup(profile.createdByUsername || '') === normalizedCurrentUsername;
    });
  }, [academyOptions, isCoach, memberProfiles, normalizedCurrentUsername]);

  const athleteVisibleProfiles = useMemo(() => {
    if (!isAthlete) return [];
    const username = normalizeLookup(currentUser?.username || '');
    const usernameLocal = emailLocalPart(currentUser?.username || '');
    const displayName = normalizeLookup(currentUser?.name || '');
    return memberProfiles.filter((profile) => {
      const accountUsername = normalizeLookup(profile.accountUsername || profile.loginUsername || profile.username || '');
      const createdByUsername = normalizeLookup(profile.createdByUsername || '');
      const profileEmail = normalizeLookup(profile.email || '');
      const profileEmailLocal = emailLocalPart(profile.email || '');
      const profileName = normalizeLookup(profile.fullName || '');

      if (username && (
        accountUsername === username
        || createdByUsername === username
        || profileEmail === username
      )) {
        return true;
      }

      if (usernameLocal && profileEmailLocal === usernameLocal) return true;
      if (displayName && profileName && profileName === displayName) return true;
      return false;
    });
  }, [currentUser?.name, currentUser?.username, isAthlete, memberProfiles]);

  const athleteOwnedProfile = useMemo(
    () => athleteVisibleProfiles[0] || null,
    [athleteVisibleProfiles]
  );

  const athleteAge = useMemo(() => (
    calculateAgeFromBirthDate(athleteForm.birthDate)
  ), [athleteForm.birthDate]);

  const selectedBeltGuide = useMemo(() => (
    BELT_GUIDE[athleteForm.belt] || null
  ), [athleteForm.belt]);

  useEffect(() => {
    if (!isCoach || membershipView !== 'academy') return;
    const primaryAcademy = coachOwnedAcademies[0] || null;
    const coachUsername = (currentUser?.username || '').toString().trim().toLowerCase();
    const coachEmail = isValidEmail(currentUser?.username || '') ? currentUser.username : '';

    if (!primaryAcademy) {
      setEditingAcademyId('');
      setAcademyForm((prev) => ({
        ...createAcademyForm(),
        ...prev,
        ownerName: currentUser?.name || prev.ownerName || '',
        ownerUsername: coachUsername || prev.ownerUsername || '',
        contactEmail: prev.contactEmail || coachEmail
      }));
      return;
    }

    setEditingAcademyId(primaryAcademy.id);
    setAcademyForm({
      ...createAcademyForm(),
      name: primaryAcademy.name || '',
      country: primaryAcademy.country || 'Brasil',
      city: primaryAcademy.city || '',
      state: primaryAcademy.state || '',
      ownerName: primaryAcademy.ownerName || currentUser?.name || '',
      ownerUsername: primaryAcademy.ownerUsername || coachUsername,
      contactPhone: primaryAcademy.contactPhone || '',
      contactEmail: primaryAcademy.contactEmail || coachEmail,
      logoUrl: primaryAcademy.logoUrl || ''
    });
  }, [coachOwnedAcademies, currentUser?.name, currentUser?.username, isCoach, membershipView]);

  useEffect(() => {
    if (!isCoach) return;
    if (athleteForm.academyId && academyMap.has(athleteForm.academyId)) return;
    const fallbackAcademy = academyOptions[0];
    if (!fallbackAcademy?.id) return;
    setAthleteForm((prev) => ({ ...prev, academyId: fallbackAcademy.id }));
  }, [academyMap, academyOptions, athleteForm.academyId, isCoach]);

  useEffect(() => {
    if (!isAthlete) return;
    if (athleteOwnedProfile) {
      setAthleteForm({
        ...createAthleteForm(),
        fullName: athleteOwnedProfile.firstName || athleteOwnedProfile.fullName || '',
        lastName: athleteOwnedProfile.lastName || '',
        gender: athleteOwnedProfile.gender || '',
        email: athleteOwnedProfile.email || '',
        phone: athleteOwnedProfile.phone || '',
        birthDate: athleteOwnedProfile.birthDate || '',
        country: athleteOwnedProfile.country || 'Brasil',
        city: athleteOwnedProfile.city || '',
        belt: athleteOwnedProfile.belt || '',
        weight: athleteOwnedProfile.weight || '',
        academyId: athleteOwnedProfile.academyId || '',
        photoUrl: athleteOwnedProfile.photoUrl || ''
      });
      return;
    }

    const fallbackAcademyId = academyOptions[0]?.id || '';
    setAthleteForm((prev) => ({
      ...createAthleteForm(),
      fullName: prev.fullName || currentUser?.name || '',
      email: prev.email || (isValidEmail(currentUser?.username || '') ? currentUser.username : ''),
      academyId: prev.academyId || fallbackAcademyId
    }));
  }, [academyOptions, athleteOwnedProfile, currentUser?.name, currentUser?.username, isAthlete]);

  useEffect(() => {
    if (!isAdmin || membershipView !== 'academy') {
      setAcademySignupStep(1);
    }
  }, [isAdmin, membershipView]);

  const handleMembershipViewChange = (nextView) => {
    if (isAthlete) return;
    const params = new URLSearchParams(searchParams);
    params.set('tab', nextView === 'athlete' ? 'member' : 'academy');
    setSearchParams(params, { replace: true });
  };

  const handleAcademyFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imageData = await fileToDataUrl(file);
      setAcademyForm((prev) => ({ ...prev, logoUrl: imageData }));
    } catch (err) {
      setAcademyError(err?.message || copy.academyFail);
    }
  };

  const handleAthleteFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imageData = await fileToDataUrl(file);
      setAthleteForm((prev) => ({ ...prev, photoUrl: imageData }));
    } catch (err) {
      setAthleteError(err?.message || copy.athleteFail);
    }
  };

  const handleCoachSignupLogoFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imageData = await fileToDataUrl(file);
      setCoachSignupForm((prev) => ({ ...prev, logoUrl: imageData }));
    } catch (err) {
      setCoachSignupError(err?.message || copy.coachSignupError);
    }
  };

  const validateCoachSignupAcademyStep = () => {
    const academyName = (coachSignupForm.academyName || '').toString().trim();

    if (!academyName) {
      setCoachSignupError(copy.coachSignupAcademyNameRequired || copy.coachSignupError);
      return false;
    }

    return true;
  };

  const validateCoachSignupCoachStep = () => {
    const coachName = (coachSignupForm.coachName || '').toString().trim();
    const coachUsername = normalizeUsername(coachSignupForm.coachUsername || '');
    const coachPassword = (coachSignupForm.coachPassword || '').toString();
    const coachPasswordConfirm = (coachSignupForm.coachPasswordConfirm || '').toString();

    if (!coachName) {
      setCoachSignupError(copy.coachSignupError);
      return false;
    }
    if (!coachUsername) {
      setCoachSignupError(copy.coachSignupUsernameRequired);
      return false;
    }
    if (!coachSignupPasswordStrength.isStrong) {
      setCoachSignupError(coachSignupPasswordStrength.message || copy.coachSignupPasswordMin);
      return false;
    }
    if (coachPassword !== coachPasswordConfirm) {
      setCoachSignupError(copy.coachSignupPasswordMismatch);
      return false;
    }

    return true;
  };

  const handleCoachSignupContinue = () => {
    setCoachSignupFeedback('');
    setCoachSignupError('');

    if (!validateCoachSignupAcademyStep()) return;
    setCoachSignupStep(2);
  };

  const handleCoachSignup = async (event) => {
    event.preventDefault();
    setCoachSignupFeedback('');
    setCoachSignupError('');

    if (coachSignupStep === 1) {
      handleCoachSignupContinue();
      return;
    }

    if (!authService.isLocalAuth()) {
      setCoachSignupError(copy.coachSignupLocalOnly);
      return;
    }

    const coachName = (coachSignupForm.coachName || '').toString().trim();
    const coachUsername = normalizeUsername(coachSignupForm.coachUsername || '');
    const academyName = (coachSignupForm.academyName || '').toString().trim();
    const coachPassword = (coachSignupForm.coachPassword || '').toString();
    const coachPasswordConfirm = (coachSignupForm.coachPasswordConfirm || '').toString();

    if (!validateCoachSignupAcademyStep()) return;
    if (!validateCoachSignupCoachStep()) return;

    try {
      const fallbackCoachEmail = isValidEmail(coachUsername) ? coachUsername : '';
      const coachUser = await authService.register({
        username: coachUsername,
        password: coachPassword,
        name: coachName,
        role: 'coach'
      });

      const savedAcademy = addAcademy({
        name: academyName,
        country: coachSignupForm.country || 'Brasil',
        city: coachSignupForm.city || '',
        state: coachSignupForm.state || '',
        ownerName: coachName,
        ownerUsername: normalizeUsername(coachUser?.username || coachUsername),
        contactPhone: coachSignupForm.contactPhone || '',
        contactEmail: coachSignupForm.contactEmail || fallbackCoachEmail,
        logoUrl: coachSignupForm.logoUrl || ''
      });

      try {
        addMemberProfile({
          fullName: coachName,
          accountUsername: normalizeUsername(coachUser?.username || coachUsername),
          createdByUsername: normalizeUsername(coachUser?.username || coachUsername),
          createdByName: coachName,
          email: coachSignupForm.contactEmail || fallbackCoachEmail,
          academyId: savedAcademy?.id || '',
          academyName: savedAcademy?.name || academyName,
          role: 'coach',
          userRole: 'coach'
        });
      } catch {
        // Keep signup successful even if coach profile already exists.
      }

      const loggedUser = await authService.login(coachUsername, coachPassword);
      login({
        ...loggedUser,
        role: 'coach',
        academyId: savedAcademy?.id || '',
        academyName: savedAcademy?.name || academyName
      });

      setEditingAcademyId(savedAcademy?.id || '');
      setAcademyForm({
        ...createAcademyForm(),
        name: savedAcademy?.name || academyName,
        country: savedAcademy?.country || coachSignupForm.country || 'Brasil',
        city: savedAcademy?.city || coachSignupForm.city || '',
        state: savedAcademy?.state || coachSignupForm.state || '',
        ownerName: savedAcademy?.ownerName || coachName,
        ownerUsername: savedAcademy?.ownerUsername || normalizeUsername(coachUser?.username || coachUsername),
        contactPhone: savedAcademy?.contactPhone || coachSignupForm.contactPhone || '',
        contactEmail: savedAcademy?.contactEmail || coachSignupForm.contactEmail || fallbackCoachEmail,
        logoUrl: savedAcademy?.logoUrl || coachSignupForm.logoUrl || ''
      });
      setAthleteForm((prev) => ({
        ...prev,
        academyId: savedAcademy?.id || prev.academyId || ''
      }));

      setAcademyFeedback(copy.coachSignupSuccess);
      setCoachSignupFeedback(copy.coachSignupSuccess);
      setCoachSignupForm(createCoachSignupForm());
      setCoachSignupStep(1);
      setShowCoachLoginOverlay(false);

      const params = new URLSearchParams(searchParams);
      params.set('tab', 'academy');
      setSearchParams(params, { replace: true });
    } catch (err) {
      setCoachSignupError(err?.message || copy.coachSignupError);
    }
  };

  const validateAdminAcademyStepOne = () => {
    const academyName = (academyForm.name || '').toString().trim();
    if (!academyName) {
      setAcademyError(copy.coachSignupAcademyNameRequired || copy.academyFail);
      return false;
    }
    return true;
  };

  const validateAdminAcademyCoachStep = () => {
    const currentUsername = normalizeUsername(currentUser?.username || '');
    const coachName = (academyForm.coachName || '').toString().trim();
    const coachUsername = normalizeUsername(academyForm.coachUsername || '');
    const coachPassword = (academyForm.coachPassword || '').toString();
    const coachPasswordConfirm = (academyForm.coachPasswordConfirm || '').toString();

    if (!coachName) {
      setAcademyError(copy.coachSignupNameRequired || copy.coachSignupError);
      return false;
    }
    if (!coachUsername) {
      setAcademyError(copy.coachSignupUsernameRequired || copy.coachSignupError);
      return false;
    }
    if (currentUsername && coachUsername === currentUsername) {
      setAcademyError(copy.coachCredentialsMustBeDifferent || copy.coachSignupError);
      return false;
    }
    if (!academyCoachPasswordStrength.isStrong) {
      setAcademyError(academyCoachPasswordStrength.message || copy.coachCredentialsPasswordRequired || copy.coachSignupPasswordMin);
      return false;
    }
    if (coachPassword !== coachPasswordConfirm) {
      setAcademyError(copy.coachSignupPasswordMismatch || copy.coachSignupError);
      return false;
    }

    return true;
  };

  const handleAdminAcademyContinue = () => {
    setAcademyFeedback('');
    setAcademyError('');
    if (!validateAdminAcademyStepOne()) return;
    setAcademySignupStep(2);
  };

  const handleSaveAcademy = async (event) => {
    event.preventDefault();
    setAcademyFeedback('');
    setAcademyError('');

    if (isAdmin && academySignupStep === 1) {
      handleAdminAcademyContinue();
      return;
    }

    if (isAdmin) {
      if (!validateAdminAcademyStepOne()) {
        setAcademySignupStep(1);
        return;
      }
      if (!validateAdminAcademyCoachStep()) {
        setAcademySignupStep(2);
        return;
      }
    }

    try {
      const currentUsername = (currentUser?.username || '').toString().trim().toLowerCase();
      const currentName = (currentUser?.name || '').toString().trim();
      const fallbackCoachEmail = isValidEmail(currentUser?.username || '') ? currentUser.username : '';

      const academyPayload = {
        name: academyForm.name,
        country: academyForm.country || 'Brasil',
        city: academyForm.city || '',
        state: academyForm.state || '',
        contactPhone: academyForm.contactPhone || '',
        logoUrl: academyForm.logoUrl || ''
      };

      let ownerName = (academyForm.ownerName || '').toString().trim();
      let ownerUsername = normalizeUsername(academyForm.ownerUsername || '');
      let contactEmail = (academyForm.contactEmail || '').toString().trim();
      let coachCreated = false;

      if (isCoach) {
        ownerName = ownerName || currentName || '';
        ownerUsername = currentUsername;
        contactEmail = contactEmail || fallbackCoachEmail;
      } else if (isAdmin) {
        const coachUsername = normalizeUsername(academyForm.coachUsername || '');
        const coachName = (academyForm.coachName || '').toString().trim();
        const coachPassword = (academyForm.coachPassword || '').toString();
        const coachEmail = (academyForm.coachEmail || '').toString().trim();

        if (currentUsername && coachUsername === currentUsername) {
          throw new Error(copy.coachCredentialsMustBeDifferent || copy.coachSignupError);
        }

        try {
          const createdCoach = await authService.createAdminUser({
            username: coachUsername,
            password: coachPassword,
            name: coachName || coachUsername,
            role: 'coach'
          });
          ownerUsername = normalizeUsername(createdCoach?.username || coachUsername);
          ownerName = (createdCoach?.name || coachName || ownerName || '').toString().trim();
          coachCreated = true;
        } catch (error) {
          const errorMessage = (error?.message || '').toString();
          const normalizedError = normalizeLookup(errorMessage);
          const alreadyExists = normalizedError.includes('ja cadastrado')
            || normalizedError.includes('ja existe')
            || normalizedError.includes('already exists')
            || normalizedError.includes('already registered');

          if (alreadyExists) {
            throw new Error(copy.coachCredentialsUsernameTaken || copy.coachCredentialsExistingInvalid || copy.coachSignupError);
          }
          throw error;
        }

        if (coachEmail) {
          contactEmail = coachEmail;
        } else if (!contactEmail && isValidEmail(coachUsername)) {
          contactEmail = coachUsername;
        }
      }

      const savedAcademy = addAcademy({
        ...academyPayload,
        id: isCoach ? (editingAcademyId || undefined) : undefined,
        ownerName,
        ownerUsername,
        contactEmail
      });

      if (isCoach) {
        setEditingAcademyId(savedAcademy?.id || '');
        setAcademyForm({
          ...createAcademyForm(),
          name: savedAcademy?.name || academyForm.name || '',
          country: savedAcademy?.country || academyForm.country || 'Brasil',
          city: savedAcademy?.city || academyForm.city || '',
          state: savedAcademy?.state || academyForm.state || '',
          ownerName: savedAcademy?.ownerName || academyForm.ownerName || currentName || '',
          ownerUsername: savedAcademy?.ownerUsername || currentUsername,
          contactPhone: savedAcademy?.contactPhone || academyForm.contactPhone || '',
          contactEmail: savedAcademy?.contactEmail || academyForm.contactEmail || fallbackCoachEmail,
          logoUrl: savedAcademy?.logoUrl || academyForm.logoUrl || ''
        });
        setAthleteForm((prev) => ({
          ...prev,
          academyId: savedAcademy?.id || prev.academyId || ''
        }));

        try {
          addMemberProfile({
            fullName: currentName || academyForm.ownerName || 'Professor',
            accountUsername: currentUsername,
            createdByUsername: currentUsername,
            createdByName: currentName || academyForm.ownerName || '',
            email: fallbackCoachEmail || academyForm.contactEmail || '',
            academyId: savedAcademy?.id || '',
            academyName: savedAcademy?.name || academyForm.name || '',
            role: 'coach',
            userRole: 'coach'
          });
        } catch {
          // Keep academy save successful even if coach profile already exists.
        }

        setAcademyFeedback(editingAcademyId ? copy.academyUpdated : copy.academySaved);
        return;
      }

      if (isAdmin && ownerUsername) {
        try {
          addMemberProfile({
            fullName: ownerName || academyForm.coachName || 'Professor',
            accountUsername: ownerUsername,
            createdByUsername: currentUsername,
            createdByName: currentName || '',
            email: contactEmail || '',
            academyId: savedAcademy?.id || '',
            academyName: savedAcademy?.name || academyForm.name || '',
            role: 'coach',
            userRole: 'coach'
          });
        } catch {
          // Keep academy save successful even if coach profile already exists.
        }
      }

      setAcademyForm(createAcademyForm());
      setAcademySignupStep(1);
      if (coachCreated) {
        setAcademyFeedback(copy.coachCredentialsCreated || copy.academySaved);
      } else {
        setAcademyFeedback(copy.academySaved);
      }
    } catch (err) {
      setAcademyError(err?.message || copy.academyFail);
    }
  };

  const handleSaveAthlete = async (event) => {
    event.preventDefault();
    setAthleteFeedback('');
    setAthleteError('');
    const isAthleteSelfUpdate = isAthlete && Boolean(athleteOwnedProfile?.id);

    const fullName = [athleteForm.fullName.trim(), athleteForm.lastName.trim()]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (!fullName) {
      setAthleteError(copy.athleteNameRequired);
      return;
    }
    if (!athleteForm.gender) {
      setAthleteError(copy.athleteGenderRequired);
      return;
    }

    const academy = academyMap.get(athleteForm.academyId);
    if (!academy) {
      setAthleteError(copy.chooseAcademy);
      return;
    }

    try {
      const normalizedCreator = (currentUser?.username || '').toString().trim().toLowerCase();
      const savedProfile = addMemberProfile({
        id: isAthlete && athleteOwnedProfile?.id ? athleteOwnedProfile.id : undefined,
        ...athleteForm,
        fullName,
        firstName: athleteForm.fullName.trim(),
        lastName: athleteForm.lastName.trim(),
        gender: athleteForm.gender,
        accountUsername: isAthlete ? (currentUser?.username || '') : '',
        createdByUsername: normalizedCreator,
        createdByName: currentUser?.name || '',
        age: athleteAge || '',
        academyId: academy.id,
        academyName: academy.name
      });

      setAthleteForm(() => ({
        ...createAthleteForm(),
        academyId: (isCoach || isAthlete) ? (academy.id || '') : ''
      }));

      if (isAthleteSelfUpdate) {
        setAthleteFeedback(copy.athleteUpdated || copy.athleteSaved);
        return;
      }

      let notifyResult = { skipped: true };
      try {
        const coachEmail = isCoach
          ? (
            isValidEmail(currentUser?.username || '')
              ? (currentUser?.username || '').toString().trim()
              : (academy.contactEmail || academyForm.contactEmail || '').toString().trim()
          )
          : (academy.contactEmail || academyForm.contactEmail || '').toString().trim();

        if (coachEmail || isCoach) {
          notifyResult = await coachNotificationService.notifyAthleteLinked({
            coachEmail,
            coachName: isCoach
              ? (currentUser?.name || academy.ownerName || '')
              : (academy.ownerName || academyForm.ownerName || ''),
            academyName: academy.name || '',
            athleteName: fullName,
            athleteEmail: athleteForm.email || savedProfile?.email || ''
          });
        }
      } catch {
        notifyResult = { skipped: true };
      }

      setAthleteFeedback(
        notifyResult?.skipped
          ? copy.athleteSaved
          : copy.athleteSavedAndNotified
      );
    } catch (err) {
      setAthleteError(err?.message || copy.athleteFail);
    }
  };

  const handleDeleteAcademy = (academy) => {
    if (!window.confirm(copy.academyDeleteConfirm(academy.name))) return;
    try {
      deleteAcademy(academy.id);
    } catch (err) {
      setAcademyError(err?.message || copy.academyFail);
    }
  };

  const handleDeleteAthlete = (profile) => {
    if (!window.confirm(copy.athleteDeleteConfirm(profile.fullName))) return;
    try {
      deleteMemberProfile(profile.id);
    } catch (err) {
      setAthleteError(err?.message || copy.athleteFail);
    }
  };

  const handleClearAcademyForm = () => {
    if (isCoach && coachOwnedAcademies[0]) {
      const academy = coachOwnedAcademies[0];
      setAcademyForm({
        ...createAcademyForm(),
        name: academy.name || '',
        country: academy.country || 'Brasil',
        city: academy.city || '',
        state: academy.state || '',
        ownerName: academy.ownerName || currentUser?.name || '',
        ownerUsername: academy.ownerUsername || (currentUser?.username || '').toString().trim().toLowerCase(),
        contactPhone: academy.contactPhone || '',
        contactEmail: academy.contactEmail || '',
        logoUrl: academy.logoUrl || ''
      });
    } else {
      setAcademyForm(createAcademyForm());
    }
    setAcademySignupStep(1);
    setAcademyError('');
    setAcademyFeedback('');
  };

  if (!currentUser && membershipView === 'athlete') {
    return (
      <div className="public-page profile-page membership-page membership-page--dense-cards">
        <section className="profile-header">
          <div>
            <span className="section-kicker">{copy.kicker}</span>
            <h1 className="profile-title">{copy.athleteBlockTitle}</h1>
            <p className="profile-subtitle">{copy.athleteBlockSubtitle}</p>
          </div>
        </section>
        <LoginOverlay redirectTo="/filiacao?tab=member" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="public-page profile-page membership-page membership-page--dense-cards">
        <section className="profile-header">
          <div>
            <span className="section-kicker">{copy.coachSignupKicker}</span>
            <h1 className="profile-title">{copy.coachSignupTitle}</h1>
            <p className="profile-subtitle">{copy.coachSignupSubtitle}</p>
          </div>
        </section>

        <section className="profile-grid is-single">
          <form className="profile-card profile-card--dark" onSubmit={handleCoachSignup}>
            <div className="profile-card__header profile-card__header--dark">
              <h2>{copy.coachSignupTitle}</h2>
            </div>
            <div className="profile-card__body">
              <div className="onboarding-steps">
                <button
                  type="button"
                  className={`onboarding-step ${coachSignupStep === 1 ? 'is-active' : ''}`}
                  onClick={() => setCoachSignupStep(1)}
                >
                  <span className="onboarding-step__index">1</span>
                  <span>
                    <strong>{copy.coachSignupStepOneLabel}</strong>
                    <small>{copy.coachSignupStepOneTitle}</small>
                  </span>
                </button>
                <button
                  type="button"
                  className={`onboarding-step ${coachSignupStep === 2 ? 'is-active' : ''}`}
                  onClick={() => {
                    if (coachSignupStep === 2) return;
                    handleCoachSignupContinue();
                  }}
                >
                  <span className="onboarding-step__index">2</span>
                  <span>
                    <strong>{copy.coachSignupStepTwoLabel}</strong>
                    <small>{copy.coachSignupStepTwoTitle}</small>
                  </span>
                </button>
              </div>

              <p className="profile-note profile-note--dark">
                {coachSignupStep === 1 ? copy.coachSignupStepOneHint : copy.coachSignupStepTwoHint}
              </p>

              {coachSignupStep === 1 && (
                <>
                  <div className="profile-fields">
                    <div className="profile-field">
                      <label>{copy.coachSignupAcademyName}</label>
                      <input
                        className="profile-input profile-input--dark"
                        value={coachSignupForm.academyName}
                        onChange={(event) => setCoachSignupForm((prev) => ({ ...prev, academyName: event.target.value }))}
                        required
                      />
                    </div>
                    <div className="profile-field">
                      <label>{copy.academyCountry}</label>
                      <input
                        className="profile-input profile-input--dark"
                        value={coachSignupForm.country}
                        onChange={(event) => setCoachSignupForm((prev) => ({ ...prev, country: event.target.value }))}
                      />
                    </div>
                    <div className="profile-field">
                      <label>{copy.academyCity}</label>
                      <input
                        className="profile-input profile-input--dark"
                        value={coachSignupForm.city}
                        onChange={(event) => setCoachSignupForm((prev) => ({ ...prev, city: event.target.value }))}
                      />
                    </div>
                    <div className="profile-field">
                      <label>{copy.academyState}</label>
                      <input
                        className="profile-input profile-input--dark"
                        value={coachSignupForm.state}
                        onChange={(event) => setCoachSignupForm((prev) => ({ ...prev, state: event.target.value }))}
                      />
                    </div>
                    <div className="profile-field">
                      <label>{copy.academyPhone}</label>
                    <input
                      className="profile-input profile-input--dark"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={coachSignupForm.contactPhone}
                      onChange={(event) => setCoachSignupForm((prev) => ({ ...prev, contactPhone: formatBrazilPhone(event.target.value) }))}
                    />
                    </div>
                    <div className="profile-field">
                      <label>{copy.academyEmail}</label>
                      <input
                        type="email"
                        className="profile-input profile-input--dark"
                        value={coachSignupForm.contactEmail}
                        onChange={(event) => setCoachSignupForm((prev) => ({ ...prev, contactEmail: event.target.value }))}
                      />
                    </div>
                    <div className="profile-field profile-field--full">
                      <label>{copy.academyLogoUrl}</label>
                      <input
                        className="profile-input profile-input--dark"
                        value={coachSignupForm.logoUrl}
                        onChange={(event) => setCoachSignupForm((prev) => ({ ...prev, logoUrl: event.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="profile-upload-row">
                    <label className="profile-file-btn">
                      <Image size={14} />
                      {copy.academyLogo}
                      <input type="file" accept="image/*" onChange={handleCoachSignupLogoFile} />
                    </label>
                    {coachSignupForm.logoUrl && (
                      <div className="profile-image-preview">
                        <img src={coachSignupForm.logoUrl} alt={coachSignupForm.academyName || copy.noAcademy} />
                      </div>
                    )}
                  </div>
                </>
              )}

              {coachSignupStep === 2 && (
                <div className="profile-fields">
                  <div className="profile-field">
                    <label>{copy.coachSignupName}</label>
                    <input
                      className="profile-input profile-input--dark"
                      value={coachSignupForm.coachName}
                      onChange={(event) => setCoachSignupForm((prev) => ({ ...prev, coachName: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="profile-field">
                    <label>{copy.coachSignupUsername}</label>
                    <input
                      className="profile-input profile-input--dark"
                      value={coachSignupForm.coachUsername}
                      onChange={(event) => setCoachSignupForm((prev) => ({ ...prev, coachUsername: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="profile-field">
                    <label>{copy.coachSignupPassword}</label>
                    <input
                      type="password"
                      className="profile-input profile-input--dark"
                      minLength={8}
                      value={coachSignupForm.coachPassword}
                      onChange={(event) => setCoachSignupForm((prev) => ({ ...prev, coachPassword: event.target.value }))}
                      required
                    />
                    {coachSignupForm.coachPassword ? (
                      <small className={`password-strength password-strength--${coachSignupPasswordStrength.level}`}>
                        {coachSignupPasswordStrength.message}
                      </small>
                    ) : null}
                  </div>
                  <div className="profile-field">
                    <label>{copy.coachSignupPasswordConfirm}</label>
                    <input
                      type="password"
                      className="profile-input profile-input--dark"
                      minLength={8}
                      value={coachSignupForm.coachPasswordConfirm}
                      onChange={(event) => setCoachSignupForm((prev) => ({ ...prev, coachPasswordConfirm: event.target.value }))}
                      required
                    />
                  </div>
                </div>
              )}

              {coachSignupError && <div className="login-error"><p>{coachSignupError}</p></div>}
              {coachSignupFeedback && <div className="profile-success">{coachSignupFeedback}</div>}

              <div className="profile-actions-row">
                {coachSignupStep === 1 ? (
                  <button type="button" className="btn btn-primary" onClick={handleCoachSignupContinue}>
                    {copy.coachSignupContinue}
                  </button>
                ) : (
                  <>
                    <button type="button" className="btn btn-secondary" onClick={() => setCoachSignupStep(1)}>
                      {copy.coachSignupBack}
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={isCoachSignupSubmitDisabled}>
                      <UserRound size={14} />
                      {copy.coachSignupCreate}
                    </button>
                  </>
                )}
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCoachLoginOverlay(true)}>
                  {copy.coachSignupAlreadyHasLogin}
                </button>
              </div>
            </div>
          </form>
        </section>

        {showCoachLoginOverlay && (
          <LoginOverlay
            redirectTo="/filiacao"
            onClose={() => setShowCoachLoginOverlay(false)}
            onSuccess={() => setShowCoachLoginOverlay(false)}
          />
        )}
      </div>
    );
  }

  if (!canManageMembership) {
    return (
      <div className="public-page profile-page membership-page membership-page--dense-cards">
        <section className="profile-header">
          <div>
            <span className="section-kicker">{copy.kicker}</span>
            <h1 className="profile-title">{copy.restrictedTitle}</h1>
            <p className="profile-subtitle">{copy.restrictedSubtitle}</p>
          </div>
        </section>
      </div>
    );
  }

  const visibleAcademyList = isAdmin ? academies : coachOwnedAcademies;
  const visibleAthleteList = isAdmin
    ? memberProfiles
    : (isCoach ? coachVisibleProfiles : athleteVisibleProfiles);
  const showCoachAthleteManagementInsideAcademy = isCoach && membershipView === 'academy';
  const showAcademyListSection = membershipView === 'academy' && !isFiliationArea;
  const showAthleteListSection = membershipView === 'athlete' || showCoachAthleteManagementInsideAcademy;
  const headerTitle = isDedicatedAcademyArea
    ? (copy.coachAcademyPanelTitle || copy.title)
    : (isFiliationArea
      ? (membershipView === 'academy' ? copy.coachSignupTitle : copy.athleteBlockTitle)
      : copy.title);
  const headerSubtitle = isDedicatedAcademyArea
    ? (copy.coachAcademyPanelSubtitle || copy.subtitle)
    : (isFiliationArea
      ? (membershipView === 'academy' ? copy.coachSignupSubtitle : copy.athleteBlockSubtitle)
      : copy.subtitle);
  const headerKicker = isDedicatedAcademyArea
    ? (copy.coachAcademyPanelKicker || copy.kicker)
    : copy.kicker;

  return (
    <div className="public-page profile-page membership-page membership-page--dense-cards">
      <section className="profile-header">
        <div>
          <span className="section-kicker">{headerKicker}</span>
          <h1 className="profile-title">{headerTitle}</h1>
          <p className="profile-subtitle">{headerSubtitle}</p>
        </div>
      </section>

      {isAthlete && athleteFeedback && (
        <section className="profile-grid is-single">
          <div className="profile-success" role="status">
            {athleteFeedback}
          </div>
        </section>
      )}

      {!isAthlete && !isDedicatedAcademyArea && (
        <section className="membership-mode">
          <button
            type="button"
            className={`btn ${membershipView === 'academy' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleMembershipViewChange('academy')}
          >
            {copy.academyBlockTitle}
          </button>
          <button
            type="button"
            className={`btn ${membershipView === 'athlete' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleMembershipViewChange('athlete')}
          >
            {copy.athleteBlockTitle}
          </button>
        </section>
      )}

      <section className="membership-block">
        <div className="membership-block__header">
          <span className="section-kicker">
            {membershipView === 'academy' ? copy.academyBlockKicker : copy.athleteBlockKicker}
          </span>
          <h2 className="membership-block__title">
            {membershipView === 'academy' ? copy.academyBlockTitle : copy.athleteBlockTitle}
          </h2>
          <p className="profile-subtitle">
            {membershipView === 'academy' ? copy.academyBlockSubtitle : copy.athleteBlockSubtitle}
          </p>
          {isCoach && (
            <p className="profile-note profile-note--dark" style={{ marginTop: '0.4rem' }}>
              {copy.coachScopeNote}
            </p>
          )}
          {isCoach && membershipView === 'academy' && (
            <p className="profile-note profile-note--dark" style={{ marginTop: '0.4rem' }}>
              Area do professor: visualize os alunos da sua academia, cadastre novos alunos e mantenha os dados da equipe.
            </p>
          )}
        </div>
      </section>

      <section className="profile-grid profile-grid--membership is-single">
        {membershipView === 'academy' && (
        <form className="profile-card profile-card--dark" onSubmit={handleSaveAcademy}>
          <div className="profile-card__header profile-card__header--dark">
            <h2>{copy.academySection}</h2>
          </div>
          <div className="profile-card__body">
            {!isAdmin && <p className="profile-note profile-note--dark">{copy.academyHint}</p>}

            {isAdmin && (
              <>
                <div className="onboarding-steps">
                  <button
                    type="button"
                    className={`onboarding-step ${academySignupStep === 1 ? 'is-active' : ''}`}
                    onClick={() => setAcademySignupStep(1)}
                  >
                    <span className="onboarding-step__index">1</span>
                    <span>
                      <strong>{copy.coachSignupStepOneLabel}</strong>
                      <small>{copy.coachSignupStepOneTitle}</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`onboarding-step ${academySignupStep === 2 ? 'is-active' : ''}`}
                    onClick={() => {
                      if (academySignupStep === 2) return;
                      handleAdminAcademyContinue();
                    }}
                  >
                    <span className="onboarding-step__index">2</span>
                    <span>
                      <strong>{copy.coachSignupStepTwoLabel}</strong>
                      <small>{copy.coachSignupStepTwoTitle}</small>
                    </span>
                  </button>
                </div>

                <p className="profile-note profile-note--dark">
                  {academySignupStep === 1 ? copy.coachSignupStepOneHint : copy.coachCredentialsHint}
                </p>
              </>
            )}

            {(!isAdmin || academySignupStep === 1) && (
              <>
                <div className="profile-fields">
                  <div className="profile-field">
                    <label>{copy.academyName}</label>
                    <input
                      className="profile-input profile-input--dark"
                      value={academyForm.name}
                      onChange={(event) => setAcademyForm((prev) => ({ ...prev, name: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="profile-field">
                    <label>{copy.academyCountry}</label>
                    <input
                      className="profile-input profile-input--dark"
                      value={academyForm.country}
                      onChange={(event) => setAcademyForm((prev) => ({ ...prev, country: event.target.value }))}
                    />
                  </div>
                  <div className="profile-field">
                    <label>{copy.academyCity}</label>
                    <input
                      className="profile-input profile-input--dark"
                      value={academyForm.city}
                      onChange={(event) => setAcademyForm((prev) => ({ ...prev, city: event.target.value }))}
                    />
                  </div>
                  <div className="profile-field">
                    <label>{copy.academyState}</label>
                    <input
                      className="profile-input profile-input--dark"
                      value={academyForm.state}
                      onChange={(event) => setAcademyForm((prev) => ({ ...prev, state: event.target.value }))}
                    />
                  </div>
                  <div className="profile-field">
                    <label>{copy.academyOwner}</label>
                    <input
                      className="profile-input profile-input--dark"
                      value={academyForm.ownerName}
                      onChange={(event) => setAcademyForm((prev) => ({ ...prev, ownerName: event.target.value }))}
                    />
                  </div>
                  <div className="profile-field">
                    <label>{copy.academyPhone}</label>
                    <input
                      className="profile-input profile-input--dark"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={academyForm.contactPhone}
                      onChange={(event) => setAcademyForm((prev) => ({ ...prev, contactPhone: formatBrazilPhone(event.target.value) }))}
                    />
                  </div>
                  <div className="profile-field profile-field--full">
                    <label>{copy.academyEmail}</label>
                    <input
                      className="profile-input profile-input--dark"
                      type="email"
                      value={academyForm.contactEmail}
                      onChange={(event) => setAcademyForm((prev) => ({ ...prev, contactEmail: event.target.value }))}
                    />
                  </div>
                  <div className="profile-field profile-field--full">
                    <label>{copy.academyLogoUrl}</label>
                    <input
                      className="profile-input profile-input--dark"
                      type="url"
                      value={academyForm.logoUrl}
                      onChange={(event) => setAcademyForm((prev) => ({ ...prev, logoUrl: event.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="profile-upload-row">
                  <label className="profile-file-btn">
                    <Image size={14} />
                    {copy.academyLogo}
                    <input type="file" accept="image/*" onChange={handleAcademyFile} />
                  </label>
                  {academyForm.logoUrl && (
                    <div className="profile-image-preview">
                      <img src={academyForm.logoUrl} alt={academyForm.name || 'Academia'} />
                    </div>
                  )}
                </div>
              </>
            )}

            {isAdmin && academySignupStep === 2 && (
              <div className="profile-fields">
                <div className="profile-field">
                  <label>{copy.coachSignupUsername}</label>
                  <input
                    className="profile-input profile-input--dark"
                    value={academyForm.coachUsername}
                    onChange={(event) => setAcademyForm((prev) => ({ ...prev, coachUsername: event.target.value }))}
                    required
                  />
                </div>
                <div className="profile-field">
                  <label>{copy.coachSignupName}</label>
                  <input
                    className="profile-input profile-input--dark"
                    value={academyForm.coachName}
                    onChange={(event) => setAcademyForm((prev) => ({ ...prev, coachName: event.target.value }))}
                    required
                  />
                </div>
                <div className="profile-field profile-field--full">
                  <label>{copy.academyEmail}</label>
                  <input
                    className="profile-input profile-input--dark"
                    type="email"
                    value={academyForm.coachEmail}
                    onChange={(event) => setAcademyForm((prev) => ({ ...prev, coachEmail: event.target.value }))}
                  />
                </div>
                <div className="profile-field">
                  <label>{copy.coachSignupPassword}</label>
                  <input
                    className="profile-input profile-input--dark"
                    type="password"
                    minLength={8}
                    value={academyForm.coachPassword}
                    onChange={(event) => setAcademyForm((prev) => ({ ...prev, coachPassword: event.target.value }))}
                    required
                  />
                  {academyForm.coachPassword ? (
                    <small className={`password-strength password-strength--${academyCoachPasswordStrength.level}`}>
                      {academyCoachPasswordStrength.message}
                    </small>
                  ) : null}
                </div>
                <div className="profile-field">
                  <label>{copy.coachSignupPasswordConfirm}</label>
                  <input
                    className="profile-input profile-input--dark"
                    type="password"
                    minLength={8}
                    value={academyForm.coachPasswordConfirm}
                    onChange={(event) => setAcademyForm((prev) => ({ ...prev, coachPasswordConfirm: event.target.value }))}
                    required
                  />
                </div>
              </div>
            )}
            {academyError && <div className="login-error"><p>{academyError}</p></div>}
            {academyFeedback && <div className="profile-success">{academyFeedback}</div>}
            <div className="profile-actions-row">
              {isAdmin ? (
                <>
                  {academySignupStep === 1 ? (
                    <button type="submit" className="btn btn-primary">
                      {copy.coachSignupContinue}
                    </button>
                  ) : (
                    <>
                      <button type="button" className="btn btn-secondary" onClick={() => setAcademySignupStep(1)}>
                        {copy.coachSignupBack}
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={isAdminAcademySubmitDisabled}>
                        <Plus size={14} />
                        {copy.saveAcademy}
                      </button>
                    </>
                  )}
                  <button type="button" className="btn btn-secondary" onClick={handleClearAcademyForm}>
                    {copy.clear}
                  </button>
                </>
              ) : (
                <>
                  <button type="submit" className="btn btn-primary">
                    <Plus size={14} />
                    {copy.saveAcademy}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={handleClearAcademyForm}>
                    {copy.clear}
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
        )}

        {(membershipView === 'athlete' || showCoachAthleteManagementInsideAcademy) && (
        <form className="profile-card profile-card--dark" onSubmit={handleSaveAthlete}>
          <div className="profile-card__header profile-card__header--dark">
            <h2>{copy.athleteSection}</h2>
          </div>
          <div className="profile-card__body">
            <p className="profile-note profile-note--dark">{copy.athleteHint}</p>
            <div className="profile-fields">
              <div className="profile-field">
                <label>{copy.athleteName}</label>
                <input
                  className="profile-input profile-input--dark"
                  value={athleteForm.fullName}
                  onChange={(event) => setAthleteForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  required
                />
              </div>
              <div className="profile-field">
                <label>{copy.athleteLastName}</label>
                <input
                  className="profile-input profile-input--dark"
                  value={athleteForm.lastName}
                  onChange={(event) => setAthleteForm((prev) => ({ ...prev, lastName: event.target.value }))}
                />
              </div>
              <div className="profile-field">
                <label>{copy.athleteAcademy}</label>
                <select
                  className="profile-input profile-input--dark"
                  value={athleteForm.academyId}
                  onChange={(event) => setAthleteForm((prev) => ({ ...prev, academyId: event.target.value }))}
                  required
                >
                  <option value="">{copy.chooseAcademy}</option>
                  {academyOptions.map((academy) => (
                    <option value={academy.id} key={academy.id}>{academy.name}</option>
                  ))}
                </select>
              </div>
              <div className="profile-field">
                <label>{copy.athleteWeight}</label>
                <input
                  className="profile-input profile-input--dark"
                  value={athleteForm.weight}
                  onChange={(event) => setAthleteForm((prev) => ({ ...prev, weight: event.target.value }))}
                  placeholder={copy.weightExamplePlaceholder}
                />
              </div>
              <div className="profile-field">
                <label>{copy.athleteEmail}</label>
                <input
                  className="profile-input profile-input--dark"
                  type="email"
                  value={athleteForm.email}
                  onChange={(event) => setAthleteForm((prev) => ({ ...prev, email: event.target.value }))}
                />
              </div>
              <div className="profile-field">
                <label>{copy.athletePhone}</label>
                <input
                  className="profile-input profile-input--dark"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={athleteForm.phone}
                  onChange={(event) => setAthleteForm((prev) => ({ ...prev, phone: formatBrazilPhone(event.target.value) }))}
                />
              </div>
              <div className="profile-field">
                <label>{copy.athleteBirthDate}</label>
                <input
                  className="profile-input profile-input--dark"
                  type="date"
                  value={athleteForm.birthDate}
                  onChange={(event) => setAthleteForm((prev) => ({ ...prev, birthDate: event.target.value }))}
                />
              </div>
              <div className="profile-field">
                <label>{copy.athleteGender}</label>
                <select
                  className="profile-input profile-input--dark"
                  value={athleteForm.gender}
                  onChange={(event) => setAthleteForm((prev) => ({ ...prev, gender: event.target.value }))}
                  required
                >
                  <option value="">{copy.athleteGenderSelect}</option>
                  <option value="Masculino">{copy.athleteGenderMale}</option>
                  <option value="Feminino">{copy.athleteGenderFemale}</option>
                </select>
              </div>
              <div className="profile-field">
                <label>{copy.athleteAge}</label>
                <input
                  className="profile-input profile-input--dark"
                  type="text"
                  value={athleteAge === '' ? '' : `${athleteAge}`}
                  readOnly
                  placeholder={copy.ageAutoPlaceholder}
                />
              </div>
              <div className="profile-field">
                <label>{copy.athleteCountry}</label>
                <input
                  className="profile-input profile-input--dark"
                  value={athleteForm.country}
                  onChange={(event) => setAthleteForm((prev) => ({ ...prev, country: event.target.value }))}
                />
              </div>
              <div className="profile-field">
                <label>{copy.athleteCity}</label>
                <input
                  className="profile-input profile-input--dark"
                  value={athleteForm.city}
                  onChange={(event) => setAthleteForm((prev) => ({ ...prev, city: event.target.value }))}
                />
              </div>
              <div className="profile-field">
                <label>{copy.athleteBelt}</label>
                <select
                  className="profile-input profile-input--dark"
                  value={athleteForm.belt}
                  onChange={(event) => setAthleteForm((prev) => ({ ...prev, belt: event.target.value }))}
                >
                  <option value="">{copy.athleteBeltSelect}</option>
                  {BELT_OPTIONS.map((belt) => (
                    <option key={belt} value={belt}>{belt}</option>
                  ))}
                </select>
              </div>
              {selectedBeltGuide && (
                <div className="profile-field profile-field--full">
                  <div className="profile-belt-guide">
                    <strong>{resolveBeltGuideByLanguage(selectedBeltGuide, languageVariant).title}</strong>
                    <p>{copy.athleteBeltGuide}</p>
                    <p>{resolveBeltGuideByLanguage(selectedBeltGuide, languageVariant).text}</p>
                  </div>
                </div>
              )}
              <div className="profile-field profile-field--full">
                <label>{copy.athletePhotoUrl}</label>
                <input
                  className="profile-input profile-input--dark"
                  type="url"
                  value={athleteForm.photoUrl}
                  onChange={(event) => setAthleteForm((prev) => ({ ...prev, photoUrl: event.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="profile-upload-row">
              <label className="profile-file-btn">
                <UserRound size={14} />
                {copy.athletePhoto}
                <input type="file" accept="image/*" onChange={handleAthleteFile} />
              </label>
              {athleteForm.photoUrl && (
                <div className="profile-image-preview profile-image-preview--athlete">
                  <img
                    src={athleteForm.photoUrl}
                    alt={[athleteForm.fullName, athleteForm.lastName].filter(Boolean).join(' ') || 'Atleta'}
                  />
                </div>
              )}
            </div>
            {athleteError && <div className="login-error"><p>{athleteError}</p></div>}
            {athleteFeedback && <div className="profile-success">{athleteFeedback}</div>}
            <div className="profile-actions-row">
              <button type="submit" className="btn btn-primary">
                <Plus size={14} />
                {copy.saveAthlete}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setAthleteForm(() => ({
                    ...createAthleteForm(),
                    academyId: isCoach ? (academyOptions[0]?.id || '') : ''
                  }));
                  setAthleteError('');
                  setAthleteFeedback('');
                }}
              >
                {copy.clear}
              </button>
            </div>
          </div>
        </form>
        )}
      </section>

      {(showAcademyListSection || showAthleteListSection) && (
      <section className="profile-grid profile-grid--membership-lists is-single">
        {showAcademyListSection && (
        <div className="profile-card profile-card--dark">
          <div className="profile-card__header profile-card__header--dark">
            <h2>{copy.academiesTitle}</h2>
          </div>
          <div className="profile-card__body">
            <p className="profile-note profile-note--dark">{copy.dbNote}</p>
            <div className="membership-list">
              {visibleAcademyList.length ? visibleAcademyList.map((academy) => (
                <article className="membership-item" key={academy.id}>
                  <div className="membership-item__head">
                    {academy.logoUrl ? (
                      <img src={academy.logoUrl} alt={academy.name} className="membership-item__logo" loading="lazy" />
                    ) : (
                      <div className="membership-item__logo membership-item__logo--empty">Logo</div>
                    )}
                    <div>
                      <strong>{academy.name}</strong>
                      <span>{[academy.city, academy.state, academy.country].filter(Boolean).join(' - ') || academy.country}</span>
                    </div>
                  </div>
                  <div className="membership-item__meta">
                    <span>{copy.createdAt}: {formatDate(academy.createdAt, locale)}</span>
                    {isAdmin && (
                      <button type="button" className="btn btn-danger" onClick={() => handleDeleteAcademy(academy)}>
                        <Trash2 size={14} />
                        {copy.remove}
                      </button>
                    )}
                  </div>
                </article>
              )) : (
                <div className="empty-state">{copy.noAcademy}</div>
              )}
            </div>
          </div>
        </div>
        )}

        {showAthleteListSection && (
        <div className="profile-card profile-card--dark">
          <div className="profile-card__header profile-card__header--dark">
            <h2>{copy.athletesTitle}</h2>
          </div>
          <div className="profile-card__body">
            <div className="membership-list">
              {visibleAthleteList.length ? visibleAthleteList.map((profile) => (
                <article className="membership-item" key={profile.id}>
                  <div className="membership-item__head">
                    {profile.photoUrl ? (
                      <img src={profile.photoUrl} alt={profile.fullName} className="membership-item__avatar" loading="lazy" />
                    ) : (
                      <div className="membership-item__avatar membership-item__avatar--empty">Sem foto</div>
                    )}
                    <div>
                      <strong>{profile.fullName}</strong>
                      <span>{profile.academyName || copy.noAcademy}</span>
                      <div className="membership-item__details">
                        {profile.gender || profile.belt || profile.weight || profile.age
                          ? [
                            profile.gender || '',
                            profile.belt || '-',
                            profile.weight || '',
                            profile.age ? `${profile.age} ${copy.yearsOld}` : ''
                          ].filter(Boolean).join(' - ')
                          : copy.noBeltData}
                      </div>
                    </div>
                  </div>
                  <div className="membership-item__meta">
                    <span>{copy.createdAt}: {formatDate(profile.createdAt, locale)}</span>
                    <button type="button" className="btn btn-danger" onClick={() => handleDeleteAthlete(profile)}>
                      <Trash2 size={14} />
                      {copy.remove}
                    </button>
                  </div>
                </article>
              )) : (
                <div className="empty-state">{copy.noAthlete}</div>
              )}
            </div>
          </div>
        </div>
        )}
      </section>
      )}
    </div>
  );
};

export default Membership;
