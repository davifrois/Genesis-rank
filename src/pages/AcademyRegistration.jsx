import React, { useState, useMemo, useRef } from 'react';
import { ChevronDown, X, Building2, MapPin, UploadCloud, Image as ImageIcon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { authService } from '../services/authService';
import './AcademyRegistration.css';

const normalizeLookup = (value = '') => (
  value.toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
);

const AcademyRegistration = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { academies, addAcademy, addMemberProfile, currentUser, login, memberProfiles } = useStore();
  const currentProfile = useMemo(() => memberProfiles.find(p => p.accountUsername === currentUser?.username), [memberProfiles, currentUser]);

  const [step, setStep] = useState('NAME_INPUT');
  const [similarAcademies, setSimilarAcademies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedAcademy, setSelectedAcademy] = useState(null);
  const [error, setError] = useState('');
  
  // New Academy Form State
  const [academyName, setAcademyName] = useState(location.state?.initialName || '');
  const [formData, setFormData] = useState({
    country: '',
    city: '',
    address: '',
    ownerName: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    about: '',
    logoUrl: '',
    coverUrl: '',
    autoApproveMembers: false,
    affiliation: ''
  });

  const fileInputRefLogo = useRef(null);
  const fileInputRefCover = useRef(null);

  const handleFileUpload = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, [field]: objectUrl }));
    }
  };

  const filteredAcademies = useMemo(() => {
    if (!searchTerm.trim()) return academies;
    const term = normalizeLookup(searchTerm);
    return academies.filter(a => normalizeLookup(a.name).includes(term));
  }, [searchTerm, academies]);

  const handleJoinSubmit = async () => {
    if (!selectedAcademy) return;
    
    try {
      const joinStatus = selectedAcademy.memberApprovalRequired ? 'pending' : 'approved';
      const profileName = currentUser?.name || '';
      
      addMemberProfile({
        id: currentProfile?.id || undefined,
        createdAt: currentProfile?.createdAt || new Date().toISOString(),
        fullName: profileName,
        firstName: currentProfile?.firstName || profileName.split(' ')[0] || '',
        lastName: currentProfile?.lastName || profileName.split(' ').slice(1).join(' ') || '',
        email: currentProfile?.email || currentUser?.email || '',
        phone: currentProfile?.phone || '',
        academyId: selectedAcademy.id,
        academyName: selectedAcademy.name,
        joinStatus: joinStatus,
        role: 'athlete',
        userRole: 'athlete',
        accountUsername: (currentUser?.username || '').toLowerCase()
      });

      if (typeof login === 'function') {
        login({
          ...currentUser,
          academyId: selectedAcademy.id,
          academyName: selectedAcademy.name
        });
      }

      navigate('/minha-conta/configuracoes');
    } catch (err) {
      setError(err?.message || 'Erro ao se filiar à academia.');
    }
  };

  const handleCreateSubmit = async () => {
    try {
      const savedAcademy = addAcademy({
        name: academyName,
        country: formData.country,
        city: formData.city,
        address: formData.address,
        ownerName: formData.ownerName,
        ownerUsername: currentUser?.username,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        website: formData.website,
        about: formData.about,
        logoUrl: formData.logoUrl,
        coverUrl: formData.coverUrl,
        memberApprovalRequired: !formData.autoApproveMembers
      });

      const profileName = currentUser?.name || '';

      addMemberProfile({
        id: currentProfile?.id || undefined,
        createdAt: currentProfile?.createdAt || new Date().toISOString(),
        firstName: currentProfile?.firstName || profileName.split(' ')[0] || '',
        lastName: currentProfile?.lastName || profileName.split(' ').slice(1).join(' ') || '',
        fullName: profileName,
        email: currentProfile?.email || formData.contactEmail,
        phone: currentProfile?.phone || formData.contactPhone,
        academyId: savedAcademy.id,
        academyName: savedAcademy.name,
        role: 'coach',
        userRole: 'coach',
        joinStatus: 'approved',
        accountUsername: (currentUser?.username || '').toLowerCase()
      });

      let promotedUser = { ...currentUser, role: 'coach' };
      try {
        promotedUser = await authService.updateAdminUser({
          id: currentUser.username,
          username: currentUser.username,
          name: currentUser.name || profileName,
          role: 'coach'
        });
      } catch {
        promotedUser = { ...currentUser, role: 'coach' };
      }
      login({ ...promotedUser, role: 'coach', academyId: savedAcademy.id, academyName: savedAcademy.name });

      navigate('/minha-conta/configuracoes');
    } catch (err) {
      setError(err?.message || 'Nao foi possivel salvar a academia.');
    }
  };

  const renderJoinStep = () => (
    <div className="academy-modal-content join-step">
      <div className="academy-modal-header" style={{ padding: '24px 32px', background: '#f4f7f9', borderBottom: '1px solid #e2e8f0' }}>
        <h2 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: '800', margin: 0, textTransform: 'none' }}>Junte-se a equipe</h2>
      </div>
      <div className="academy-modal-body">
        {error && <div className="error-message">{error}</div>}
        <label className="input-label" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>ACADEMIA</label>
        <div className="combo-box" style={{ marginTop: '8px' }}>
          <div className="combo-input-wrapper" onClick={() => setIsDropdownOpen(true)} style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #c7d2fe', borderRadius: '4px', padding: '10px 14px', cursor: 'pointer' }}>
            <input
              type="text"
              placeholder="Pesquisar..."
              value={isDropdownOpen ? searchTerm : (selectedAcademy ? selectedAcademy.name : searchTerm)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsDropdownOpen(true);
                setSelectedAcademy(null);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', color: '#333' }}
            />
            {selectedAcademy && <X size={16} color="#94a3b8" style={{ marginRight: '8px', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setSelectedAcademy(null); setSearchTerm(''); }} />}
            <ChevronDown className="combo-icon" size={16} color="#64748b" />
          </div>
          {isDropdownOpen && (
            <div className="combo-dropdown" style={{ position: 'absolute', width: 'calc(100% - 64px)', background: '#222', border: '1px solid #333', borderRadius: '4px', marginTop: '4px', zIndex: 100, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
              <div className="combo-dropdown-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {filteredAcademies.length === 0 ? (
                  <div className="combo-item combo-item-empty" style={{ padding: '12px 16px', color: '#fff' }}>A lista está vazia</div>
                ) : (
                  filteredAcademies.map(acc => (
                    <div 
                      key={acc.id} 
                      className="combo-item"
                      onClick={() => {
                        setSelectedAcademy(acc);
                        setSearchTerm(acc.name);
                        setIsDropdownOpen(false);
                      }}
                      style={{ padding: '12px 16px', color: '#fff', cursor: 'pointer', borderBottom: '1px solid #333' }}
                    >
                      {acc.name}
                    </div>
                  ))
                )}
              </div>
              <div className="combo-dropdown-actions" style={{ background: '#1a1a1a', padding: '16px', borderTop: '1px solid #333', textAlign: 'center' }}>
                <div className="combo-dropdown-footer">
                  <span style={{ color: '#fff', fontSize: '0.85rem', display: 'block', marginBottom: '12px' }}>Não consegue encontrar a sua Academia?</span>
                  <button 
                    type="button" 
                    className="btn-register-new" 
                    onClick={() => setStep('NAME_INPUT')}
                    style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', width: '100%', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Inscreva-se novo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
      <div className="academy-modal-footer" style={{ padding: '24px 32px', background: '#f4f7f9', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
        <button 
          className="btn-success" 
          disabled={!selectedAcademy} 
          onClick={handleJoinSubmit}
          style={{ flex: 2, background: selectedAcademy ? '#8bc34a' : '#cbd5e1', cursor: selectedAcademy ? 'pointer' : 'not-allowed' }}
        >
          Junte-se a equipe
        </button>
        <button className="btn-back" onClick={() => navigate(-1)} style={{ flex: 1 }}>Cancelar</button>
      </div>
    </div>
  );

  const handleNameContinue = () => {
    const term = normalizeLookup(academyName);
    const similar = academies.filter(a => normalizeLookup(a.name).includes(term));
    if (similar.length > 0) {
      setSimilarAcademies(similar);
      setStep('SIMILAR_ACADEMIES');
    } else {
      setStep('FULL_FORM');
    }
  };

  const renderCreateStep1 = () => (
    <div className="academy-modal-content create-step-1">
      <button className="btn-close-abs" onClick={() => navigate(-1)}><X size={20}/></button>
      <div className="academy-modal-body centered-body">
        <div className="icon-wrapper">
          <Building2 size={48} strokeWidth={1} />
        </div>
        <h2>CRIAR NOVA ACADEMIA</h2>
        <p className="advice-text">Recomendamos que você peça ao gerente/professor da sua academia para realizar o cadastro.</p>
        
        <input 
          type="text" 
          className="text-input" 
          placeholder="Nome da academia" 
          value={academyName}
          onChange={e => setAcademyName(e.target.value)}
        />
        
        <button 
          className="btn-success" 
          style={{ marginTop: '1.5rem', alignSelf: 'center', minWidth: '120px' }}
          disabled={!academyName.trim()}
          onClick={handleNameContinue}
        >
          Continuar
        </button>
      </div>
    </div>
  );

  const renderAlreadyHere = () => (
    <div className="academy-modal-content already-here-step">
      <div className="academy-modal-body centered-body">
        <div className="icon-wrapper">
          <Building2 size={48} strokeWidth={1} />
        </div>
        <h2>JÁ ESTAMOS AQUI?</h2>
        <p className="advice-text" style={{ color: '#d97706', fontWeight: '500' }}>Tem certeza que não é uma destas academias?</p>
        
        <div className="similar-academies-list">
          {similarAcademies.map(acc => (
            <div 
              key={acc.id} 
              className="similar-academy-item"
              onClick={() => {
                setSelectedAcademy(acc);
                setSearchTerm(acc.name);
                setStep('JOIN_ACADEMY');
              }}
            >
              <span className="similar-academy-name">{acc.name}</span>
              {acc.country && <span className="similar-academy-country">{acc.country}</span>}
            </div>
          ))}
        </div>
        
        <button 
          className="btn-success full-width" 
          style={{ marginTop: '1rem' }}
          onClick={() => setStep('FULL_FORM')}
        >
          Quero criar uma nova academia
        </button>
        <button 
          className="btn-back full-width" 
          style={{ marginTop: '0.5rem', backgroundColor: '#9ca3af', color: 'white', border: 'none' }}
          onClick={() => setStep('NAME_INPUT')}
        >
          Voltar
        </button>
      </div>
    </div>
  );

  const renderCreateStep2 = () => (
    <div className="academy-modal-content create-step-2">
      <div className="academy-modal-header centered">
        <div className="icon-wrapper small">
          <Building2 size={24} strokeWidth={1.5} />
        </div>
      </div>
      <div className="academy-modal-body form-scroll-body">
        {error && <div className="error-message">{error}</div>}
        <div className="form-group">
          <label>Nome da academia</label>
          <input type="text" className="text-input" value={academyName} readOnly />
        </div>

        <div className="form-group">
          <label>País</label>
          <select 
            className="text-input" 
            value={formData.country} 
            onChange={e => setFormData({...formData, country: e.target.value})}
          >
            <option value="">Selecione o país</option>
            <option value="Brasil">Brasil</option>
            <option value="USA">Estados Unidos</option>
            <option value="Portugal">Portugal</option>
          </select>
        </div>

        <div className="form-group">
          <label>Cidade</label>
          <input 
            type="text" 
            className="text-input" 
            value={formData.city} 
            onChange={e => setFormData({...formData, city: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label>Endereço</label>
          <textarea 
            className="text-input textarea" 
            value={formData.address} 
            onChange={e => setFormData({...formData, address: e.target.value})}
          />
        </div>

        <div className="map-placeholder">
          <button className="btn-find-location">Encontrar Localização</button>
          <div className="map-image-mock">
            <div className="map-overlay-text">Google Maps Integration</div>
            <MapPin size={32} className="map-pin" />
          </div>
        </div>

        <div className="form-group">
          <label>Responsável</label>
          <input 
            type="text" 
            className="text-input" 
            value={formData.ownerName} 
            onChange={e => setFormData({...formData, ownerName: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label>E-mail comercial</label>
          <input 
            type="email" 
            className="text-input" 
            value={formData.contactEmail} 
            onChange={e => setFormData({...formData, contactEmail: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label>Telefone</label>
          <input 
            type="text" 
            className="text-input" 
            placeholder="Seu número de celular/WhatsApp"
            value={formData.contactPhone} 
            onChange={e => setFormData({...formData, contactPhone: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label>Website</label>
          <input 
            type="text" 
            className="text-input" 
            value={formData.website} 
            onChange={e => setFormData({...formData, website: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label>Sobre a academia</label>
          <textarea 
            className="text-input textarea large" 
            value={formData.about} 
            onChange={e => setFormData({...formData, about: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label>Logotipo da Equipe/Academia</label>
          <div className="upload-box" style={{ cursor: 'pointer' }} onClick={() => fileInputRefLogo.current?.click()}>
            <div className="upload-header">
              <span>Fazer Upload do Logotipo</span>
              <button 
                type="button" 
                className="btn-find-location" 
                style={{ position: 'static', padding: '6px 12px', boxShadow: 'none', border: '1px solid #d1d5db' }}
                onClick={(e) => { e.stopPropagation(); fileInputRefLogo.current?.click(); }}
              >
                Selecionar Imagem
              </button>
            </div>
            <div className="upload-preview">
              {formData.logoUrl ? <img src={formData.logoUrl} alt="Logo"/> : <UploadCloud size={48} className="placeholder-icon"/>}
            </div>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRefLogo} 
              style={{ display: 'none' }} 
              onChange={(e) => handleFileUpload(e, 'logoUrl')} 
            />
          </div>
        </div>

        <div className="form-group">
          <label>Foto de Capa</label>
          <div className="upload-box" style={{ cursor: 'pointer' }} onClick={() => fileInputRefCover.current?.click()}>
            <div className="upload-header">
              <span>Fazer Upload da Capa</span>
              <button 
                type="button" 
                className="btn-find-location" 
                style={{ position: 'static', padding: '6px 12px', boxShadow: 'none', border: '1px solid #d1d5db' }}
                onClick={(e) => { e.stopPropagation(); fileInputRefCover.current?.click(); }}
              >
                Selecionar Imagem
              </button>
            </div>
            <div className="upload-preview cover">
              {formData.coverUrl ? <img src={formData.coverUrl} alt="Cover"/> : <ImageIcon size={48} className="placeholder-icon"/>}
            </div>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRefCover} 
              style={{ display: 'none' }} 
              onChange={(e) => handleFileUpload(e, 'coverUrl')} 
            />
          </div>
        </div>

        <div className="toggle-group" style={{marginTop: '1rem'}}>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={formData.autoApproveMembers}
              onChange={e => setFormData({...formData, autoApproveMembers: e.target.checked})}
            />
            <span className="slider round"></span>
          </label>
          <div className="toggle-labels">
            <strong>Aprovação de membros</strong>
            <span>Novos usuários são aprovados automaticamente (NÃO RECOMENDADO)</span>
          </div>
        </div>

        <div className="form-group row-align" style={{marginTop: '1.5rem'}}>
          <label style={{margin: 0, minWidth: '140px'}}>Adicionar afiliação/equipe maior</label>
          <select 
            className="text-input" 
            value={formData.affiliation}
            onChange={e => setFormData({...formData, affiliation: e.target.value})}
          >
            <option value="">Nenhuma (Independente)</option>
            <option value="Alliance">Alliance</option>
            <option value="Gracie Barra">Gracie Barra</option>
            <option value="Checkmat">Checkmat</option>
            <option value="Atos">Atos</option>
            <option value="Nova União">Nova União</option>
          </select>
        </div>

      </div>
      <div className="academy-modal-footer create-footer">
        <button className="btn-success full-width" onClick={handleCreateSubmit}>Concluir Cadastro da Academia</button>
        <button className="btn-back" onClick={() => setStep('NAME_INPUT')}>Voltar</button>
      </div>
    </div>
  );

  return (
    <div
      className="academy-registration-page"
      style={{
        backgroundImage: `url('/academy-bg.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className={`academy-modal-container ${step === 'FULL_FORM' ? 'large' : ''}`}>
        {step === 'NAME_INPUT' && renderCreateStep1()}
        {step === 'SIMILAR_ACADEMIES' && renderAlreadyHere()}
        {step === 'FULL_FORM' && renderCreateStep2()}
        {step === 'JOIN_ACADEMY' && renderJoinStep()}
      </div>
    </div>
  );
};

export default AcademyRegistration;
