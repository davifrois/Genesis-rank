import React, { useState, useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import GerenteTreinador from '../components/GerenteTreinador';
import LoginOverlay from '../components/LoginOverlay';
import { Link } from 'react-router-dom';

const CoachManagerPage = () => {
  const { currentUser, memberProfiles, events } = useStore();
  
  const activeEvents = useMemo(() => events.filter(e => e.registrationOpen !== false), [events]);
  const [selectedEventId, setSelectedEventId] = useState(activeEvents[0]?.id || '');

  if (!currentUser) {
    return <LoginOverlay redirectTo="/gerente-treinador" />;
  }

  // Find the coach profile
  const coachProfile = memberProfiles.find(p => (p.accountUsername || '').toLowerCase() === (currentUser.username || '').toLowerCase());
  const academyId = currentUser.academyId || coachProfile?.academyId;

  // The pseudo usuarioLogado for GerenteTreinador
  const usuarioLogado = {
    isProfessor: currentUser.role === 'coach' || currentUser.role === 'professor',
    academiaId: academyId
  };

  const campeonatoAtivo = useMemo(() => {
    const ev = events.find(e => e.id === selectedEventId) || activeEvents[0];
    if (!ev) return null;
    return {
      id: ev.id,
      nome: ev.name,
      temCinturaoAtivo: false,
      taxaBase: ev.feeOver15 ? parseFloat(ev.feeOver15) : 140.00,
      taxaAbsoluto: ev.feeAbsolute ? parseFloat(ev.feeAbsolute) : 40.00
    };
  }, [events, selectedEventId, activeEvents]);

  // Find athletes for this academy
  const academyAthletes = useMemo(() => {
    if (!academyId) return [];
    return memberProfiles.filter(p => p.academyId === academyId && p.role !== 'coach' && p.role !== 'professor');
  }, [memberProfiles, academyId]);

  return (
    <div className="public-page profile-page">
      <section className="profile-header">
        <div>
          <span className="section-kicker">Gestão</span>
          <h1 className="profile-title">Gerente de Treinador</h1>
          <p className="profile-subtitle">Gerencie as inscrições em lote dos seus alunos.</p>
        </div>
        <div className="profile-settings-toolbar">
          <Link to="/minha-conta" className="btn btn-secondary profile-settings-toolbar__btn">
            Voltar para Conta
          </Link>
        </div>
      </section>
      
      <div className="container" style={{ marginTop: '2rem', marginBottom: '4rem' }}>
        <div className="form-group" style={{ maxWidth: '400px', marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--brand-primary)', fontWeight: 'bold' }}>Selecione o Campeonato:</label>
          <select 
            className="input" 
            style={{ width: '100%', padding: '10px', borderRadius: '4px', background: 'var(--surface-color, #1a1a1a)', color: '#fff', border: '1px solid var(--border-color, #333)' }}
            value={selectedEventId} 
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            {activeEvents.length === 0 && <option value="">Nenhum campeonato com inscrições abertas</option>}
            {activeEvents.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </div>

        {campeonatoAtivo ? (
          <GerenteTreinador 
            usuarioLogado={usuarioLogado} 
            campeonatoAtivo={campeonatoAtivo}
            academyAthletes={academyAthletes}
          />
        ) : (
          <p style={{ color: '#aaa' }}>Nenhum campeonato disponível para inscrição no momento.</p>
        )}
      </div>
    </div>
  );
};

export default CoachManagerPage;
