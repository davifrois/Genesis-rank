import React, { useEffect, useMemo, useState } from 'react';
import { Image, Save, UserRound } from 'lucide-react';
import LoginOverlay from '../components/LoginOverlay';
import { useI18n } from '../hooks/useI18n';
import { useStore } from '../hooks/useStore';

const BELT_OPTIONS = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];

const createForm = () => ({
  fullName: '',
  email: '',
  phone: '',
  birthDate: '',
  gender: '',
  belt: '',
  weight: '',
  academyId: '',
  country: 'Brasil',
  city: '',
  photoUrl: ''
});

const fileToDataUrl = (file) => (
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
    reader.readAsDataURL(file);
  })
);

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

const MyAccount = () => {
  const { language } = useI18n();
  const isEnglish = language === 'en-US';
  const {
    currentUser,
    academies,
    memberProfiles,
    addMemberProfile
  } = useStore();

  const copy = isEnglish
    ? {
        kicker: 'Account',
        title: 'My account',
        subtitle: 'Update your personal data used in event registration.',
        accessUser: 'Login user',
        role: 'Access role',
        profileData: 'Personal data',
        profileHint: 'These details are used to pre-fill your registration form.',
        fullName: 'Full name *',
        email: 'Email',
        phone: 'Phone',
        birthDate: 'Birth date',
        age: 'Age',
        gender: 'Gender *',
        genderSelect: 'Select gender',
        male: 'Male',
        female: 'Female',
        belt: 'Belt',
        beltSelect: 'Select belt',
        weight: 'Weight / division',
        academy: 'Academy *',
        academySelect: 'Select academy',
        country: 'Country',
        city: 'City',
        photoUrl: 'Photo URL',
        photoUpload: 'Upload photo',
        save: 'Save my data',
        requiredName: 'Enter your full name.',
        requiredGender: 'Select your gender.',
        requiredAcademy: 'Select your academy.',
        saveSuccess: 'Profile updated successfully.',
        saveError: 'Could not update your profile.'
      }
    : {
        kicker: 'Conta',
        title: 'Minha conta',
        subtitle: 'Atualize seus dados pessoais usados na inscrição dos campeonatos.',
        accessUser: 'Usuário de acesso',
        role: 'Perfil de acesso',
        profileData: 'Dados pessoais',
        profileHint: 'Esses dados são usados para preencher automaticamente sua inscrição.',
        fullName: 'Nome completo *',
        email: 'E-mail',
        phone: 'Telefone',
        birthDate: 'Data de nascimento',
        age: 'Idade',
        gender: 'Gênero *',
        genderSelect: 'Selecione o gênero',
        male: 'Masculino',
        female: 'Feminino',
        belt: 'Faixa',
        beltSelect: 'Selecione a faixa',
        weight: 'Peso / divisão',
        academy: 'Academia *',
        academySelect: 'Selecione a academia',
        country: 'País',
        city: 'Cidade',
        photoUrl: 'URL da foto',
        photoUpload: 'Enviar foto',
        save: 'Salvar meus dados',
        requiredName: 'Informe seu nome completo.',
        requiredGender: 'Selecione seu gênero.',
        requiredAcademy: 'Selecione sua academia.',
        saveSuccess: 'Dados atualizados com sucesso.',
        saveError: 'Não foi possível atualizar seus dados.'
      };

  const [form, setForm] = useState(createForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const currentProfile = useMemo(() => {
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
      )) {
        return true;
      }
      if (compactUsername && profileCompactName && (
        profileCompactName === compactUsername
        || profileCompactName.includes(compactUsername)
        || compactUsername.includes(profileCompactName)
      )) {
        return true;
      }

      return false;
    }) || null;
  }, [currentUser, memberProfiles]);

  const resolvedProfileAcademyId = useMemo(() => {
    if (!currentProfile) return '';
    if (currentProfile.academyId) return currentProfile.academyId;
    const match = academies.find((academy) => (
      normalizeLookup(academy.name) === normalizeLookup(currentProfile.academyName || '')
    ));
    return match?.id || '';
  }, [currentProfile, academies]);

  useEffect(() => {
    if (!currentUser) return;

    if (currentProfile) {
      setForm({
        fullName: currentProfile.fullName || '',
        email: currentProfile.email || '',
        phone: currentProfile.phone || '',
        birthDate: currentProfile.birthDate || '',
        gender: currentProfile.gender || '',
        belt: currentProfile.belt || '',
        weight: currentProfile.weight || '',
        academyId: resolvedProfileAcademyId || '',
        country: currentProfile.country || 'Brasil',
        city: currentProfile.city || '',
        photoUrl: currentProfile.photoUrl || ''
      });
      return;
    }

    setForm((prev) => ({
      ...prev,
      fullName: currentUser.name || '',
      email: (currentUser.username || '').includes('@') ? currentUser.username : prev.email
    }));
  }, [currentUser, currentProfile, resolvedProfileAcademyId]);

  const age = useMemo(() => (
    calculateAgeFromBirthDate(form.birthDate)
  ), [form.birthDate]);

  const handlePhotoFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imageData = await fileToDataUrl(file);
      setForm((prev) => ({ ...prev, photoUrl: imageData }));
    } catch {
      setError(isEnglish ? 'Could not read selected image.' : 'Não foi possível ler a imagem selecionada.');
    } finally {
      event.target.value = '';
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const fullName = (form.fullName || '').trim();
    if (!fullName) {
      setError(copy.requiredName);
      return;
    }
    if (!form.gender) {
      setError(copy.requiredGender);
      return;
    }
    const academy = academies.find((item) => item.id === form.academyId);
    const fallbackAcademyName = (currentProfile?.academyName || '').toString().trim();
    if (!academy && !fallbackAcademyName) {
      setError(copy.requiredAcademy);
      return;
    }

    try {
      addMemberProfile({
        id: currentProfile?.id || undefined,
        createdAt: currentProfile?.createdAt || new Date().toISOString(),
        fullName,
        firstName: fullName,
        lastName: '',
        gender: form.gender,
        email: form.email,
        phone: form.phone,
        birthDate: form.birthDate,
        age: age || '',
        academyId: academy?.id || currentProfile?.academyId || '',
        academyName: academy?.name || fallbackAcademyName || 'Sem academia',
        country: form.country || 'Brasil',
        city: form.city || '',
        belt: form.belt || '',
        weight: form.weight || '',
        photoUrl: form.photoUrl || '',
        accountUsername: (currentUser?.username || '').toLowerCase(),
        createdByUsername: currentUser?.username || '',
        createdByName: currentUser?.name || ''
      });
      setSuccess(copy.saveSuccess);
    } catch (err) {
      setError(err?.message || copy.saveError);
    }
  };

  const handleReset = () => {
    setError('');
    setSuccess('');
    if (currentProfile) {
      setForm({
        fullName: currentProfile.fullName || '',
        email: currentProfile.email || '',
        phone: currentProfile.phone || '',
        birthDate: currentProfile.birthDate || '',
        gender: currentProfile.gender || '',
        belt: currentProfile.belt || '',
        weight: currentProfile.weight || '',
        academyId: resolvedProfileAcademyId || '',
        country: currentProfile.country || 'Brasil',
        city: currentProfile.city || '',
        photoUrl: currentProfile.photoUrl || ''
      });
      return;
    }

    setForm({
      ...createForm(),
      fullName: currentUser?.name || '',
      email: (currentUser?.username || '').includes('@') ? currentUser.username : ''
    });
  };

  if (!currentUser) {
    return <LoginOverlay redirectTo="/minha-conta" />;
  }

  return (
    <div className="public-page profile-page">
      <section className="profile-header">
        <div>
          <span className="section-kicker">{copy.kicker}</span>
          <h1 className="profile-title">{copy.title}</h1>
          <p className="profile-subtitle">{copy.subtitle}</p>
        </div>
      </section>

      <section className="profile-grid is-single">
        <form className="profile-card profile-card--dark" onSubmit={handleSubmit}>
          <div className="profile-card__header profile-card__header--dark">
            <h2>{copy.profileData}</h2>
          </div>
          <div className="profile-card__body">
            <p className="profile-note profile-note--dark">{copy.profileHint}</p>

            <div className="profile-fields">
              <div className="profile-field">
                <label>{copy.accessUser}</label>
                <input className="profile-input profile-input--dark" value={currentUser.username || ''} readOnly />
              </div>
              <div className="profile-field">
                <label>{copy.role}</label>
                <input className="profile-input profile-input--dark" value={currentUser.role || ''} readOnly />
              </div>

              <div className="profile-field">
                <label>{copy.fullName}</label>
                <input
                  className="profile-input profile-input--dark"
                  value={form.fullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  required
                />
              </div>
              <div className="profile-field">
                <label>{copy.academy}</label>
                <select
                  className="profile-input profile-input--dark"
                  value={form.academyId}
                  onChange={(event) => setForm((prev) => ({ ...prev, academyId: event.target.value }))}
                >
                  <option value="">{copy.academySelect}</option>
                  {academies.map((academy) => (
                    <option value={academy.id} key={academy.id}>{academy.name}</option>
                  ))}
                </select>
              </div>

              <div className="profile-field">
                <label>{copy.email}</label>
                <input
                  className="profile-input profile-input--dark"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                />
              </div>
              <div className="profile-field">
                <label>{copy.phone}</label>
                <input
                  className="profile-input profile-input--dark"
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </div>

              <div className="profile-field">
                <label>{copy.birthDate}</label>
                <input
                  className="profile-input profile-input--dark"
                  type="date"
                  value={form.birthDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, birthDate: event.target.value }))}
                />
              </div>
              <div className="profile-field">
                <label>{copy.age}</label>
                <input className="profile-input profile-input--dark" value={age === '' ? '' : `${age}`} readOnly />
              </div>

              <div className="profile-field">
                <label>{copy.gender}</label>
                <select
                  className="profile-input profile-input--dark"
                  value={form.gender}
                  onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))}
                  required
                >
                  <option value="">{copy.genderSelect}</option>
                  <option value="Masculino">{copy.male}</option>
                  <option value="Feminino">{copy.female}</option>
                </select>
              </div>
              <div className="profile-field">
                <label>{copy.belt}</label>
                <select
                  className="profile-input profile-input--dark"
                  value={form.belt}
                  onChange={(event) => setForm((prev) => ({ ...prev, belt: event.target.value }))}
                >
                  <option value="">{copy.beltSelect}</option>
                  {BELT_OPTIONS.map((belt) => (
                    <option key={belt} value={belt}>{belt}</option>
                  ))}
                </select>
              </div>

              <div className="profile-field">
                <label>{copy.weight}</label>
                <input
                  className="profile-input profile-input--dark"
                  value={form.weight}
                  onChange={(event) => setForm((prev) => ({ ...prev, weight: event.target.value }))}
                />
              </div>
              <div className="profile-field">
                <label>{copy.country}</label>
                <input
                  className="profile-input profile-input--dark"
                  value={form.country}
                  onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
                />
              </div>

              <div className="profile-field">
                <label>{copy.city}</label>
                <input
                  className="profile-input profile-input--dark"
                  value={form.city}
                  onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                />
              </div>
              <div className="profile-field profile-field--full">
                <label>{copy.photoUrl}</label>
                <input
                  className="profile-input profile-input--dark"
                  value={form.photoUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, photoUrl: event.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="profile-upload-row">
              <label className="profile-file-btn">
                <Image size={14} />
                {copy.photoUpload}
                <input type="file" accept="image/*" onChange={handlePhotoFile} />
              </label>
              {form.photoUrl && (
                <div className="profile-image-preview profile-image-preview--athlete">
                  <img src={form.photoUrl} alt={form.fullName || 'Atleta'} />
                </div>
              )}
            </div>

            {error && <div className="login-error"><p>{error}</p></div>}
            {success && <div className="profile-success">{success}</div>}

            <div className="profile-actions-row profile-actions-row--single">
              <button type="submit" className="btn btn-primary">
                <Save size={14} />
                {copy.save}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReset}
              >
                <UserRound size={14} />
                {isEnglish ? 'Restore data' : 'Restaurar dados'}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
};

export default MyAccount;
