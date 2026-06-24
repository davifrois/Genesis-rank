import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Edit2, ShieldCheck, UserRound } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import LoginOverlay from '../components/LoginOverlay';

const ManageProfiles = () => {
  const { currentUser, memberProfiles, deleteMemberProfile } = useStore();

  const userProfiles = useMemo(() => {
    if (!currentUser || !memberProfiles) return [];
    const username = (currentUser.username || '').toLowerCase();
    
    return memberProfiles.filter((profile) => {
      const accUser = (profile.accountUsername || profile.loginUsername || profile.username || '').toLowerCase();
      const createdBy = (profile.createdByUsername || '').toLowerCase();
      const email = (profile.email || '').toLowerCase();
      return accUser === username || createdBy === username || email === username;
    });
  }, [currentUser, memberProfiles]);

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este perfil? Esta ação não pode ser desfeita.')) {
      try {
        deleteMemberProfile(id);
      } catch (err) {
        alert(err.message || 'Erro ao excluir perfil.');
      }
    }
  };

  if (!currentUser) {
    return <LoginOverlay redirectTo="/gerenciar-perfis" />;
  }

  return (
    <div className="public-page profile-page profile-settings-page">
      <section className="profile-header">
        <div>
          <span className="section-kicker">Perfis</span>
          <h1 className="profile-title">Gerenciar Perfis</h1>
          <p className="profile-subtitle">
            Gerencie os perfis de atleta vinculados à sua conta.
          </p>
        </div>
        <div className="profile-settings-toolbar">
          <Link to="/minha-conta" className="btn btn-primary profile-settings-toolbar__btn">
            <Plus size={16} /> Adicionar Perfil
          </Link>
        </div>
      </section>

      <section className="profile-settings-layout" style={{ display: 'block' }}>
        <article className="profile-card profile-card--dark" style={{ width: '100%' }}>
          <div className="profile-card__header profile-card__header--dark">
            <h2>Seus perfis de atleta</h2>
          </div>
          <div className="profile-card__body">
            {userProfiles.length === 0 ? (
              <p className="profile-note profile-note--dark">Você ainda não tem nenhum perfil de atleta vinculado.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {userProfiles.map(profile => (
                  <div key={profile.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {profile.photoUrl ? <img src={profile.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserRound size={24} color="#9ca3af" />}
                      </div>
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', color: '#f3f4f6', fontSize: '16px' }}>{profile.fullName}</h3>
                        <p style={{ margin: 0, color: '#9ca3af', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ShieldCheck size={12} /> {profile.academyName || 'Sem academia'} • Faixa {profile.belt || 'Não definida'}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Link to={`/perfil/${profile.id}`} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '13px' }}>
                        Ver perfil
                      </Link>
                      <button onClick={() => handleDelete(profile.id)} className="btn btn-secondary" style={{ padding: '8px', color: '#ef4444', borderColor: '#ef4444' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
};

export default ManageProfiles;
