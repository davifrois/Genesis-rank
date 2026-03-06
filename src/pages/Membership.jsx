import React, { useMemo, useState } from 'react';
import { Image, Plus, Trash2, UserRound } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../hooks/useI18n';
import { useStore } from '../hooks/useStore';

const createAcademyForm = () => ({
  name: '',
  country: 'Brasil',
  city: '',
  state: '',
  ownerName: '',
  contactPhone: '',
  contactEmail: '',
  logoUrl: ''
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

const fileToDataUrl = (file) => (
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem.'));
    reader.readAsDataURL(file);
  })
);

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

const Membership = () => {
  const { language, locale } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const isEnglish = language === 'en-US';
  const {
    academies,
    memberProfiles,
    addAcademy,
    deleteAcademy,
    addMemberProfile,
    deleteMemberProfile,
    currentUser
  } = useStore();
  const currentUserRole = (currentUser?.role || '').toString().trim().toLowerCase();
  const isAdmin = currentUserRole === 'admin';
  const copy = isEnglish
    ? {
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
        adminOnlyRecords: 'Registered lists are shown only in the control panel.',
        academySaved: 'Academy saved successfully.',
        athleteSaved: 'Athlete saved successfully.',
        academyFail: 'Could not save academy.',
        athleteFail: 'Could not save athlete.',
        academyDeleteConfirm: (name) => `Remove academy "${name}"?`,
        athleteDeleteConfirm: (name) => `Remove athlete "${name}"?`,
        dbNote: 'Data is stored in system database and used across pages.'
      }
    : {
        kicker: 'Filiação',
        title: 'Cadastro de filiação e academias',
        subtitle:
          'Cadastre academia e atleta uma única vez. Isso organiza a base e permite reaproveitar a foto do atleta no ranking.',
        academyBlockKicker: 'Academias',
        academyBlockTitle: 'Gestão de academias',
        academyBlockSubtitle: 'Cadastre e mantenha os dados das equipes em uma área específica.',
        athleteBlockKicker: 'Atletas',
        athleteBlockTitle: 'Gestão de atletas',
        athleteBlockSubtitle: 'Cadastre perfis com foto, faixa e dados de categoria em área específica.',
        academySection: 'Cadastro de academia',
        academyHint: 'Cadastre a equipe com foto/logo e dados do responsável.',
        athleteSection: 'Cadastro de atleta',
        athleteHint: 'Vincule o atleta a uma academia e salve a foto para aparecer no ranking.',
        saveAcademy: 'Salvar academia',
        saveAthlete: 'Salvar atleta',
        clear: 'Limpar',
        academyName: 'Nome da academia *',
        academyCountry: 'País',
        academyCity: 'Cidade',
        academyState: 'Estado',
        academyOwner: 'Responsável',
        academyPhone: 'Telefone',
        academyEmail: 'E-mail',
        academyLogo: 'Foto/logo da academia',
        academyLogoUrl: 'URL da foto (opcional)',
        athleteName: 'Nome do atleta *',
        athleteLastName: 'Sobrenome',
        athleteEmail: 'E-mail',
        athletePhone: 'Telefone',
        athleteBirthDate: 'Data de nascimento',
        athleteGender: 'Gênero',
        athleteGenderSelect: 'Selecione o gênero',
        athleteGenderMale: 'Masculino',
        athleteGenderFemale: 'Feminino',
        athleteAge: 'Idade',
        athleteCountry: 'País',
        athleteCity: 'Cidade',
        athleteBelt: 'Faixa',
        athleteBeltSelect: 'Selecione a faixa',
        athleteWeight: 'Peso / divisão',
        athleteAcademy: 'Academia *',
        athletePhoto: 'Foto do atleta',
        athletePhotoUrl: 'URL da foto (opcional)',
        chooseAcademy: 'Selecione a academia',
        athleteNameRequired: 'Informe o nome do atleta.',
        athleteGenderRequired: 'Selecione o gênero do atleta.',
        athleteBeltGuide: 'Regras da faixa e idade permitida',
        academiesTitle: 'Academias cadastradas',
        athletesTitle: 'Atletas cadastrados',
        remove: 'Remover',
        createdAt: 'Criado em',
        noAcademy: 'Nenhuma academia cadastrada ainda.',
        noAthlete: 'Nenhum atleta cadastrado ainda.',
        noBeltData: 'Sem faixa ou peso informado',
        yearsOld: 'anos',
        adminOnlyRecords: 'As listas de cadastros aparecem somente no painel de controle.',
        academySaved: 'Academia cadastrada com sucesso.',
        athleteSaved: 'Atleta cadastrado com sucesso.',
        academyFail: 'Não foi possível salvar a academia.',
        athleteFail: 'Não foi possível salvar o atleta.',
        academyDeleteConfirm: (name) => `Remover a academia "${name}"?`,
        athleteDeleteConfirm: (name) => `Remover o atleta "${name}"?`,
        dbNote: 'Dados salvos no banco do sistema e reaproveitados nas outras telas.'
      };

  const [academyForm, setAcademyForm] = useState(createAcademyForm);
  const [athleteForm, setAthleteForm] = useState(createAthleteForm);
  const [academyFeedback, setAcademyFeedback] = useState('');
  const [athleteFeedback, setAthleteFeedback] = useState('');
  const [academyError, setAcademyError] = useState('');
  const [athleteError, setAthleteError] = useState('');
  const membershipView = useMemo(
    () => resolveMembershipView(searchParams.get('tab')),
    [searchParams]
  );

  const academyMap = useMemo(() => (
    new Map(academies.map((academy) => [academy.id, academy]))
  ), [academies]);
  const athleteAge = useMemo(() => (
    calculateAgeFromBirthDate(athleteForm.birthDate)
  ), [athleteForm.birthDate]);

  const selectedBeltGuide = useMemo(() => (
    BELT_GUIDE[athleteForm.belt] || null
  ), [athleteForm.belt]);

  const handleMembershipViewChange = (nextView) => {
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

  const handleSaveAcademy = (event) => {
    event.preventDefault();
    setAcademyFeedback('');
    setAcademyError('');

    try {
      addAcademy(academyForm);
      setAcademyForm(createAcademyForm());
      setAcademyFeedback(copy.academySaved);
    } catch (err) {
      setAcademyError(err?.message || copy.academyFail);
    }
  };

  const handleSaveAthlete = (event) => {
    event.preventDefault();
    setAthleteFeedback('');
    setAthleteError('');

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
      addMemberProfile({
        ...athleteForm,
        fullName,
        firstName: athleteForm.fullName.trim(),
        lastName: athleteForm.lastName.trim(),
        gender: athleteForm.gender,
        accountUsername: currentUserRole === 'athlete' ? (currentUser?.username || '') : '',
        createdByUsername: currentUser?.username || '',
        createdByName: currentUser?.name || '',
        age: athleteAge || '',
        academyId: academy.id,
        academyName: academy.name
      });
      setAthleteForm(createAthleteForm());
      setAthleteFeedback(copy.athleteSaved);
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

  return (
    <div className="public-page profile-page">
      <section className="profile-header">
        <div>
          <span className="section-kicker">{copy.kicker}</span>
          <h1 className="profile-title">{copy.title}</h1>
          <p className="profile-subtitle">{copy.subtitle}</p>
        </div>
      </section>

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
        </div>
      </section>

      <section className="profile-grid profile-grid--membership is-single">
        {membershipView === 'academy' && (
        <form className="profile-card profile-card--dark" onSubmit={handleSaveAcademy}>
          <div className="profile-card__header profile-card__header--dark">
            <h2>{copy.academySection}</h2>
          </div>
          <div className="profile-card__body">
            <p className="profile-note profile-note--dark">{copy.academyHint}</p>
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
                  value={academyForm.contactPhone}
                  onChange={(event) => setAcademyForm((prev) => ({ ...prev, contactPhone: event.target.value }))}
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
            {academyError && <div className="login-error"><p>{academyError}</p></div>}
            {academyFeedback && <div className="profile-success">{academyFeedback}</div>}
            <div className="profile-actions-row">
              <button type="submit" className="btn btn-primary">
                <Plus size={14} />
                {copy.saveAcademy}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setAcademyForm(createAcademyForm());
                  setAcademyError('');
                  setAcademyFeedback('');
                }}
              >
                {copy.clear}
              </button>
            </div>
          </div>
        </form>
        )}

        {membershipView === 'athlete' && (
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
                  {academies.map((academy) => (
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
                  placeholder={isEnglish ? 'Ex: Light / 76kg' : 'Ex: Leve / 76kg'}
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
                  value={athleteForm.phone}
                  onChange={(event) => setAthleteForm((prev) => ({ ...prev, phone: event.target.value }))}
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
                  placeholder={isEnglish ? 'Auto' : 'Automática'}
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
                    <strong>{isEnglish ? selectedBeltGuide.enTitle : selectedBeltGuide.ptTitle}</strong>
                    <p>{copy.athleteBeltGuide}</p>
                    <p>{isEnglish ? selectedBeltGuide.enText : selectedBeltGuide.ptText}</p>
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
                  setAthleteForm(createAthleteForm());
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

      {!isAdmin && membershipView === 'athlete' && (
      <section className="membership-block">
        <p className="profile-note profile-note--dark">{copy.adminOnlyRecords}</p>
      </section>
      )}

      {isAdmin && (
      <section className="profile-grid profile-grid--membership-lists is-single">
        {membershipView === 'academy' && (
        <div className="profile-card profile-card--dark">
          <div className="profile-card__header profile-card__header--dark">
            <h2>{copy.academiesTitle}</h2>
          </div>
          <div className="profile-card__body">
            <p className="profile-note profile-note--dark">{copy.dbNote}</p>
            <div className="membership-list">
              {academies.length ? academies.map((academy) => (
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
                    <button type="button" className="btn btn-danger" onClick={() => handleDeleteAcademy(academy)}>
                      <Trash2 size={14} />
                      {copy.remove}
                    </button>
                  </div>
                </article>
              )) : (
                <div className="empty-state">{copy.noAcademy}</div>
              )}
            </div>
          </div>
        </div>
        )}

        {membershipView === 'athlete' && (
        <div className="profile-card profile-card--dark">
          <div className="profile-card__header profile-card__header--dark">
            <h2>{copy.athletesTitle}</h2>
          </div>
          <div className="profile-card__body">
            <div className="membership-list">
              {memberProfiles.length ? memberProfiles.map((profile) => (
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
