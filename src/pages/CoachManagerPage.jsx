import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../hooks/useStore';
import GerenteTreinador from '../components/GerenteTreinador';
import LoginOverlay from '../components/LoginOverlay';
import { Link } from 'react-router-dom';
import { ClipboardList, ChevronLeft, Trophy, ChevronDown, CalendarX, Shield } from 'lucide-react';
import bgHero from '../assets/Kuri.JPEG';

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
      ...ev,
      id: ev.id,
      nome: ev.name || ev.nome || '',
      date: ev.date || ev.eventDate,
      registrationOpen: ev.registrationOpen,
      batches: Array.isArray(ev.batches) ? ev.batches : [],
      taxaBase: ev.feeOver15 ? parseFloat(ev.feeOver15) : (ev.price ? parseFloat(ev.price) : 140.00),
      taxaAbsoluto: ev.feeAbsolute ? parseFloat(ev.feeAbsolute) : 30.00,
    };
  }, [activeEvents, selectedEventId]);

  // Atletas vinculados à academia (perfis com nome válido + role que não seja coach)
  const academyAthletes = useMemo(() => {
    if (!academyId) return [];
    return memberProfiles.filter(p => {
      // Deve pertencer à academia
      if (p.academyId !== academyId) return false;
      // Não pode ser coach, professor ou admin
      const r = (p.role || '').toLowerCase();
      if (r === 'coach' || r === 'professor' || r === 'admin') return false;
      // Deve ter um nome válido (não pode ser placeholder vazio ou "Faixa —")
      const nome = p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || p.name || '';
      if (!nome || nome.length < 2) return false;
      return true;
    });
  }, [memberProfiles, academyId]);

  const selectedAcademy = academies.find(a => a.id === academyId);

  return (
    <div style={{ width: '100%', margin: 0, padding: 0 }}>
      {/* Header */}
      <section className="profile-header" style={{ 
        paddingBottom: '24px', paddingTop: '24px', paddingLeft: 'clamp(1.5rem, 4vw, 4rem)', paddingRight: 'clamp(1.5rem, 4vw, 4rem)', 
        position: 'relative', overflow: 'hidden',
        width: '100%',
        margin: 0,
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        {/* Jiu-jitsu background image - full cover */}
        <img
          src={bgHero}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 25%',
            opacity: 0.48,
            pointerEvents: 'none',
            zIndex: 0,
            filter: 'contrast(115%) brightness(0.95)'
          }}
        />
        {/* Gradient overlay so text stays readable */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(10,10,14,0.92) 0%, rgba(10,10,14,0.55) 45%, rgba(10,10,14,0.2) 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative', zIndex: 2 }}>
          <div>
            <div style={{ 
              fontSize: '0.78rem', fontWeight: '700', letterSpacing: '0.12em', 
              textTransform: 'uppercase', color: '#94a3b8', marginBottom: '4px' 
            }}>
              Gestão de Inscrições
            </div>
            <h1 className="profile-title" style={{ marginTop: '0', fontSize: '2.1rem', fontWeight: '800', color: '#ffffff', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
              Gerente de Inscrições
            </h1>
            <div style={{ 
              display: 'inline-flex', alignItems: 'center',
              background: 'rgba(3, 56, 110, 0.35)', border: '1px solid rgba(3, 56, 110, 0.65)', 
              padding: '4px 14px', borderRadius: '20px', 
              color: '#93c5fd', fontSize: '0.82rem', fontWeight: '600', 
              marginTop: '8px', backdropFilter: 'blur(4px)'
            }}>
              {selectedAcademy ? selectedAcademy.name : 'Gerenciamento de Equipe'}
            </div>
          </div>
        </div>
        <div className="profile-settings-toolbar" style={{ position: 'relative', zIndex: 2 }}>
          <Link to="/minha-conta" className="btn btn-secondary profile-settings-toolbar__btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ChevronLeft size={15} /> Minha Conta
          </Link>
        </div>
      </section>

      <div style={{ marginTop: '2rem', marginBottom: '5rem', paddingLeft: 'clamp(1.5rem, 4vw, 4rem)', paddingRight: 'clamp(1.5rem, 4vw, 4rem)' }}>
        {/* Seletor de Campeonato */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: 'linear-gradient(135deg, rgba(3, 56, 110, 0.15), rgba(18, 20, 26, 0.7))',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(3, 56, 110, 0.35)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            borderRadius: '20px',
            padding: '24px 28px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            flexWrap: 'wrap',
            position: 'relative'
          }}
        >
          <div style={{ flex: '1', minWidth: '250px', position: 'relative', zIndex: 1 }}>
            <label style={{
              display: 'block', marginBottom: '10px',
              color: '#94a3b8',
              fontWeight: '700', fontSize: '12px',
              textTransform: 'uppercase', letterSpacing: '0.08em'
            }}>
              Selecione o Campeonato Alvo
            </label>

            {activeEvents.length === 0 ? (
              <div style={{
                padding: '24px', borderRadius: '14px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px dashed rgba(255,255,255,0.1)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                textAlign: 'center'
              }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  <CalendarX size={20} />
                </div>
                <div>
                  <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '4px' }}>Nenhum campeonato disponível</h3>
                  <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>Aguarde a abertura oficial de novas inscrições pelos organizadores.</p>
                </div>
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
                    background: '#111318',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.12)',
                    fontSize: '15px',
                    fontWeight: '600',
                    outline: 'none',
                    cursor: 'pointer',
                    appearance: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: 'none'
                  }}
                  onFocus={e => { e.target.style.borderColor = '#ffffff'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                >
                  {activeEvents.map(ev => (
                    <option key={ev.id} value={ev.id} style={{ background: '#111318' }}>{ev.name}</option>
                  ))}
                </select>
                <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#888' }}>
                  <ChevronDown size={18} />
                </div>
              </div>
            )}
          </div>
        </motion.div>

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
