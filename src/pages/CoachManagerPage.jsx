import React, { useState, useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import GerenteTreinador from '../components/GerenteTreinador';
import LoginOverlay from '../components/LoginOverlay';
import { Link } from 'react-router-dom';
import { ClipboardList, ChevronLeft, Trophy, ChevronDown } from 'lucide-react';

const CoachManagerPage = () => {
  const { currentUser, memberProfiles, events, academies, addAthlete } = useStore();

  const activeEvents = useMemo(
    () => events.filter(e => {
      const ro = e.registrationOpen;
      if (ro === false || ro === 'false' || ro === 'fechado' || ro === 'closed' || ro === '0' || ro === 'nao' || ro === 'não') {
        return false;
      }
      const rawDate = e.date || e.eventDate;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!Number.isNaN(d.getTime()) && d.getTime() < Date.now()) {
          return false;
        }
      }
      return true;
    }),
    [events]
  );
  const [selectedEventId, setSelectedEventId] = useState(activeEvents[0]?.id || '');

  if (!currentUser) {
    return <LoginOverlay redirectTo="/gerente-treinador" />;
  }

  const role = (currentUser.role || '').toLowerCase();
  const isCoachOrAdmin = role === 'coach' || role === 'professor' || role === 'admin';

  if (!isCoachOrAdmin) {
    return (
      <div className="public-page profile-page">
        <section className="profile-header">
          <h1 className="profile-title">Acesso Negado</h1>
          <p className="profile-subtitle">Esta área é exclusiva para professores e administradores.</p>
        </section>
      </div>
    );
  }

  // Encontrar academia vinculada ao usuário
  const coachProfile = memberProfiles.find(
    p => (p.accountUsername || '').toLowerCase() === (currentUser.username || '').toLowerCase()
  );

  // Para admins, pegar a primeira academia ou a do perfil vinculado
  let academyId = currentUser.academyId || coachProfile?.academyId;

  // Se for admin e não tiver academia no perfil, tenta pelo ownerUsername nas academias
  if (!academyId && role === 'admin') {
    const owned = academies.find(
      a => (a.ownerUsername || '').toLowerCase() === (currentUser.username || '').toLowerCase()
        || (a.coachUsername || '').toLowerCase() === (currentUser.username || '').toLowerCase()
    );
    if (owned) academyId = owned.id;
  }

  const usuarioLogado = {
    isProfessor: role === 'coach' || role === 'professor',
    isAdmin: role === 'admin',
    academiaId: academyId,
  };

  const campeonatoAtivo = useMemo(() => {
    const ev = activeEvents.find(e => e.id === selectedEventId) || activeEvents[0];
    if (!ev) return null;
    return {
      id: ev.id,
      nome: ev.name,
      date: ev.date || ev.eventDate,
      registrationOpen: ev.registrationOpen,
      temCinturaoAtivo: false,
      taxaBase: ev.feeOver15 ? parseFloat(ev.feeOver15) : 140.00,
      taxaAbsoluto: ev.feeAbsolute ? parseFloat(ev.feeAbsolute) : 40.00,
    };
  }, [activeEvents, selectedEventId]);

  // Atletas vinculados à academia (perfis + role que não seja coach)
  const academyAthletes = useMemo(() => {
    if (!academyId) return [];
    return memberProfiles.filter(
      p => p.academyId === academyId && p.role !== 'coach' && p.role !== 'professor'
    );
  }, [memberProfiles, academyId]);

  const selectedAcademy = academies.find(a => a.id === academyId);

  return (
    <div className="public-page profile-page">
      {/* Header */}
      <section className="profile-header" style={{ paddingBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--brand-primary,#00c2cb), #009ba3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <ClipboardList size={24} color="#000" />
          </div>
          <div>
            <span className="section-kicker">Gestão de Inscrições</span>
            <h1 className="profile-title" style={{ marginTop: '2px' }}>
              Gerente de Inscrições
            </h1>
            <p className="profile-subtitle" style={{ marginTop: '4px' }}>
              {selectedAcademy
                ? `Academia: ${selectedAcademy.name}`
                : 'Gerencie inscrições em lote dos seus alunos nos campeonatos.'}
            </p>
          </div>
        </div>
        <div className="profile-settings-toolbar">
          <Link to="/minha-conta" className="btn btn-secondary profile-settings-toolbar__btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ChevronLeft size={15} /> Minha Conta
          </Link>
        </div>
      </section>

      <div style={{ marginTop: '2rem', marginBottom: '5rem' }}>
        {/* Seletor de Campeonato */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(30,30,35,0.8), rgba(20,20,24,0.9))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          borderRadius: '20px',
          padding: '24px 30px',
          marginBottom: '36px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: '1', minWidth: '250px' }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px',
              color: 'var(--brand-primary, #00c2cb)',
              fontWeight: '700', fontSize: '12px',
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              <Trophy size={14} /> Selecione o Campeonato Alvo
            </label>

            {activeEvents.length === 0 ? (
              <div style={{
                padding: '16px', borderRadius: '12px',
                background: 'rgba(243,156,18,0.1)',
                border: '1px solid rgba(243,156,18,0.2)',
                color: '#f39c12', fontSize: '14px', fontWeight: '500'
              }}>
                ⚠️ Nenhum campeonato com inscrições abertas no momento.
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedEventId}
                  onChange={e => setSelectedEventId(e.target.value)}
                  style={{
                    width: '100%', maxWidth: '600px',
                    padding: '14px 20px',
                    borderRadius: '12px',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontSize: '16px',
                    fontWeight: '600',
                    outline: 'none',
                    cursor: 'pointer',
                    appearance: 'none',
                    transition: 'all 0.3s ease',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                >
                  {activeEvents.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
                <ChevronDown size={18} style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', color: '#888', pointerEvents: 'none' }} />
              </div>
            )}
          </div>
        </div>

        {/* Componente de gerenciamento */}
        {campeonatoAtivo ? (
          <GerenteTreinador
            usuarioLogado={usuarioLogado}
            campeonatoAtivo={campeonatoAtivo}
            academyAthletes={academyAthletes}
            addAthlete={addAthlete}
            academyName={selectedAcademy?.name || 'Sua Academia'}
          />
        ) : (
          <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
            Selecione um campeonato para gerenciar as inscrições.
          </p>
        )}
      </div>
    </div>
  );
};

export default CoachManagerPage;
