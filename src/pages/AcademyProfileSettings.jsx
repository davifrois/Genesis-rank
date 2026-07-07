import React, { useState, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { useI18n } from '../hooks/useI18n';
import { compressImage } from '../utils/imageUtils';
import { Building2, Save, Upload, MapPin, Info, Users, ShieldAlert } from 'lucide-react';

const AcademyProfileSettings = () => {
  const { isEnglish } = useI18n();
  const { academies, memberProfiles, currentUser, updateAcademy } = useStore();
  
  const normalizeLookup = (str) => (str || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  
  const currentUsername = normalizeLookup(currentUser?.username || '');
  const currentName = normalizeLookup(currentUser?.name || '');
  const currentUserRole = (currentUser?.role || '').toString().toLowerCase().trim();
  const isAdmin = currentUserRole === 'admin';
  const isCoach = currentUserRole === 'coach' || currentUserRole === 'professor' || isAdmin;
  
  const userAcademies = React.useMemo(() => {
      if (!isCoach) return [];
      
      const profileAcademyIds = new Set(
          memberProfiles
            .filter((profile) => normalizeLookup(profile.createdByUsername || '') === currentUsername)
            .map((profile) => (profile.academyId || '').toString().trim())
            .filter(Boolean)
      );

      return academies.filter(a => {
          const ownerUsername = normalizeLookup(a.ownerUsername || '');
          const ownerName = normalizeLookup(a.ownerName || '');
          const academyId = (a.id || '').toString().trim();
          
          const byOwnerUsername = Boolean(ownerUsername && ownerUsername === currentUsername);
          const byOwnerName = Boolean(ownerName && ownerName === currentName);
          const byProfileLink = Boolean(academyId && profileAcademyIds.has(academyId));
          
          return byOwnerUsername || byOwnerName || byProfileLink;
      });
  }, [academies, memberProfiles, currentUsername, currentName, isAdmin, isCoach]);

  const [selectedAcademyId, setSelectedAcademyId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    logoUrl: '',
    city: '',
    state: '',
    country: ''
  });
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // When selected academy changes, populate form
  useEffect(() => {
    if (userAcademies.length > 0 && !selectedAcademyId) {
        setSelectedAcademyId(userAcademies[0].id);
    }
  }, [userAcademies, selectedAcademyId]);

  useEffect(() => {
    if (selectedAcademyId) {
        const academy = academies.find(a => a.id === selectedAcademyId);
        if (academy) {
            setFormData({
                name: academy.name || '',
                bio: academy.bio || '',
                logoUrl: academy.logoUrl || '',
                city: academy.city || '',
                state: academy.state || '',
                country: academy.country || 'Brasil'
            });
        }
    }
  }, [selectedAcademyId, academies]);

  
  const fileToDataUrl = (file) => compressImage(file, 800, 800, 0.7);

  const handleImageFile = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const imageData = await fileToDataUrl(file);
        setFormData((prev) => ({ ...prev, logoUrl: imageData }));
        setErrorMsg('');
      } catch {
        setErrorMsg(isEnglish ? 'Could not read the selected image.' : 'Não foi possível ler a imagem selecionada.');
      } finally {
        event.target.value = '';
      }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    
    if (!selectedAcademyId) {
        setErrorMsg(isEnglish ? 'No academy selected' : 'Nenhuma academia selecionada');
        return;
    }
    
    if (!formData.name.trim()) {
        setErrorMsg(isEnglish ? 'Academy name is required' : 'Nome da academia é obrigatório');
        return;
    }

    updateAcademy(selectedAcademyId, {
        name: formData.name,
        bio: formData.bio,
        logoUrl: formData.logoUrl,
        city: formData.city,
        state: formData.state,
        country: formData.country
    });
    
    setSuccessMsg(isEnglish ? 'Academy profile updated successfully!' : 'Perfil da academia atualizado com sucesso!');
    
    setTimeout(() => {
        setSuccessMsg('');
    }, 3000);
  };

  if (!currentUser) {
      return (
          <div className="public-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
              <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                  <ShieldAlert size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                  <h2>{isEnglish ? 'Authentication required' : 'Autenticação necessária'}</h2>
                  <p>{isEnglish ? 'Please log in to manage your academy.' : 'Faça login para gerenciar sua academia.'}</p>
              </div>
          </div>
      );
  }

  if (userAcademies.length === 0) {
      return (
          <div className="public-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
              <div style={{ textAlign: 'center', color: '#94a3b8', maxWidth: '400px' }}>
                  <Building2 size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                  <h2>{isEnglish ? 'No Academies Found' : 'Nenhuma Academia Encontrada'}</h2>
                  <p style={{ marginTop: '12px', lineHeight: '1.5' }}>
                      {isEnglish 
                          ? 'You are not linked as the manager of any academy. If you are a coach, register your academy in the Membership section.' 
                          : 'Você não está vinculado como responsável por nenhuma academia. Se você é um professor, registre sua academia na seção de Filiação.'}
                  </p>
              </div>
          </div>
      );
  }

  return (
    <div className="public-page my-account-page" style={{ paddingBottom: '80px' }}>
      <section className="profile-header" style={{ marginBottom: '40px', padding: '40px 20px', background: 'linear-gradient(to right, rgba(0, 194, 203, 0.1), rgba(0,0,0,0))', borderBottom: '1px solid rgba(0, 194, 203, 0.2)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <span className="section-kicker" style={{ color: '#00c2cb', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '13px' }}>
            {isEnglish ? 'Academy Management' : 'Gestão da Academia'}
          </span>
          <h1 className="profile-title" style={{ fontSize: '2.5rem', fontWeight: 800, margin: '8px 0', color: '#fff' }}>
            {isEnglish ? 'Academy Profile' : 'Perfil da Academia'}
          </h1>
          <p className="profile-subtitle" style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
            {isEnglish ? "Manage your team's public information, logo, and description." : 'Gerencie as informações públicas, logotipo e descrição da sua equipe.'}
          </p>
        </div>
      </section>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>
        
        {userAcademies.length > 1 && (
            <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
                    {isEnglish ? 'Select Academy to Edit' : 'Selecione a Academia para Editar'}
                </label>
                <select 
                    className="input" 
                    style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', padding: '12px', borderRadius: '8px', color: '#fff', width: '100%' }}
                    value={selectedAcademyId} 
                    onChange={(e) => setSelectedAcademyId(e.target.value)}
                >
                    {userAcademies.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                </select>
            </div>
        )}

        <div style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '16px', overflow: 'hidden' }}>
            
            {/* Form Header */}
            <div style={{ padding: '24px 30px', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Building2 size={20} color="#00c2cb" />
                <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '1.2rem', fontWeight: 600 }}>
                    {isEnglish ? 'General Information' : 'Informações Gerais'}
                </h3>
            </div>

            <form onSubmit={handleSave} style={{ padding: '30px' }}>
                
                {successMsg && (
                    <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Info size={18} /> {successMsg}
                    </div>
                )}

                {errorMsg && (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ShieldAlert size={18} /> {errorMsg}
                    </div>
                )}

                {/* Logo Section */}
                <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', alignItems: 'flex-start' }}>
                    <div style={{ 
                        width: '100px', height: '100px', borderRadius: '12px', 
                        backgroundColor: '#27272a', border: '1px dashed #3f3f46',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
                        flexShrink: 0
                    }}>
                        {formData.logoUrl ? (
                            <img src={formData.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <Building2 size={32} color="#52525b" />
                        )}
                    </div>
                    <div style={{ flexGrow: 1 }}>
                        <label style={{ display: 'block', color: '#a1a1aa', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>
                            {isEnglish ? 'Academy Logo' : 'Logotipo da Academia'}
                        </label>
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleImageFile}
                            className="input"
                            style={{ backgroundColor: '#0f0f11', border: '1px solid #27272a', padding: '12px 16px', borderRadius: '8px', color: '#fff', width: '100%' }}
                        />
                        <p style={{ color: '#71717a', fontSize: '0.8rem', marginTop: '8px' }}>
                            {isEnglish ? 'Select an image file (PNG or JPG) from your device.' : 'Selecione uma imagem (PNG ou JPG) do seu computador ou celular.'}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                    {/* Name */}
                    <div>
                        <label style={{ display: 'block', color: '#a1a1aa', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>
                            {isEnglish ? 'Academy Name *' : 'Nome da Academia *'}
                        </label>
                        <input 
                            type="text" 
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="input"
                            required
                            style={{ backgroundColor: '#0f0f11', border: '1px solid #27272a', padding: '12px 16px', borderRadius: '8px', color: '#fff', width: '100%' }}
                        />
                    </div>

                    {/* Bio */}
                    <div>
                        <label style={{ display: 'block', color: '#a1a1aa', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>
                            {isEnglish ? 'Biography / Description' : 'Biografia / Descrição'}
                        </label>
                        <textarea 
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            className="input"
                            rows={4}
                            placeholder={isEnglish ? 'Tell us about your team, history, and values...' : 'Conte sobre a sua equipe, história e valores...'}
                            style={{ backgroundColor: '#0f0f11', border: '1px solid #27272a', padding: '12px 16px', borderRadius: '8px', color: '#fff', width: '100%', resize: 'vertical' }}
                        />
                    </div>

                    {/* Location */}
                    <div>
                        <h4 style={{ color: '#e2e8f0', fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                            <MapPin size={18} color="#00c2cb" /> {isEnglish ? 'Location' : 'Localização'}
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', color: '#a1a1aa', marginBottom: '8px', fontSize: '0.85rem' }}>{isEnglish ? 'Country' : 'País'}</label>
                                <input type="text" name="country" value={formData.country} onChange={handleChange} className="input" style={{ backgroundColor: '#0f0f11', border: '1px solid #27272a', padding: '10px 14px', borderRadius: '8px', color: '#fff', width: '100%' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', color: '#a1a1aa', marginBottom: '8px', fontSize: '0.85rem' }}>{isEnglish ? 'State' : 'Estado'}</label>
                                <input type="text" name="state" value={formData.state} onChange={handleChange} className="input" style={{ backgroundColor: '#0f0f11', border: '1px solid #27272a', padding: '10px 14px', borderRadius: '8px', color: '#fff', width: '100%' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', color: '#a1a1aa', marginBottom: '8px', fontSize: '0.85rem' }}>{isEnglish ? 'City' : 'Cidade'}</label>
                                <input type="text" name="city" value={formData.city} onChange={handleChange} className="input" style={{ backgroundColor: '#0f0f11', border: '1px solid #27272a', padding: '10px 14px', borderRadius: '8px', color: '#fff', width: '100%' }} />
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #27272a', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '1rem' }}>
                        <Save size={18} />
                        {isEnglish ? 'Save Changes' : 'Salvar Alterações'}
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default AcademyProfileSettings;
