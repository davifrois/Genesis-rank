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

  // Atletas vinculados à academia (perfis + role que não seja coach)
  const academyAthletes = useMemo(() => {
    if (!academyId) return [];
    return memberProfiles.filter(
      p => p.academyId === academyId && p.role !== 'coach' && p.role !== 'professor'
    );
  }, [memberProfiles, academyId]);

  const selectedAcademy = academies.find(a => a.id === academyId);

  return (
    <div className="public-page profile-page" style={{ padding: 0 }}>
      {/* Header */}
      <section className="profile-header" style={{ 
        paddingBottom: '24px', paddingTop: '28px', paddingLeft: 'clamp(1.5rem, 4vw, 4rem)', paddingRight: 'clamp(1.5rem, 4vw, 4rem)', 
        position: 'relative', overflow: 'hidden',
        width: '100vw', marginLeft: 'calc(-50vw + 50%)',
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
            <h1 className="profile-title" style={{ marginTop: '2px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
              Gerente de Inscrições
            </h1>
            <div style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '6px', 
              background: 'rgba(0,194,203,0.1)', border: '1px solid rgba(0,194,203,0.3)', 
              padding: '6px 14px', borderRadius: '30px', 
              color: '#00c2cb', fontSize: '0.85rem', fontWeight: '600', 
              marginTop: '10px', backdropFilter: 'blur(4px)'
            }}>
              <Shield size={14} />
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
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(0, 194, 203, 0.15)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 40px rgba(0, 194, 203, 0.05)',
            borderRadius: '24px',
            padding: '32px',
            marginBottom: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            flexWrap: 'wrap',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Decorative glowing orb in background */}
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'rgba(0,194,203,0.1)', filter: 'blur(60px)', borderRadius: '50%', pointerEvents: 'none' }} />
          
          <div style={{ flex: '1', minWidth: '250px', position: 'relative', zIndex: 1 }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px',
              color: '#00c2cb',
              fontWeight: '700', fontSize: '13px',
              textTransform: 'uppercase', letterSpacing: '0.12em',
              textShadow: '0 0 10px rgba(0,194,203,0.3)'
            }}>
              <Trophy size={16} /> Selecione o Campeonato Alvo
            </label>

            {activeEvents.length === 0 ? (
              <div style={{
                padding: '30px', borderRadius: '16px',
                background: 'rgba(15, 23, 42, 0.4)',
                border: '1px dashed rgba(255,255,255,0.1)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                textAlign: 'center'
              }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(36, 120, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2478ff' }}>
                  <CalendarX size={24} />
                </div>
                <div>
                  <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '4px' }}>Nenhum campeonato disponível</h3>
                  <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>Aguarde a abertura oficial de novas inscrições pelos organizadores.</p>
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <motion.select
                  whileFocus={{ scale: 1.01 }}
                  whileHover={{ backgroundColor: 'rgba(0,0,0,0.4)', borderColor: 'rgba(0,194,203,0.4)' }}
                  value={selectedEventId}
                  onChange={e => setSelectedEventId(e.target.value)}
                  style={{
                    width: '100%', maxWidth: '600px',
                    padding: '16px 24px',
                    borderRadius: '16px',
                    background: 'rgba(0,0,0,0.25)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontSize: '16px',
                    fontWeight: '600',
                    outline: 'none',
                    cursor: 'pointer',
                    appearance: 'none',
                    transition: 'all 0.3s ease',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#00c2cb'; e.target.style.boxShadow = '0 0 0 4px rgba(0,194,203,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)'; }}
                >
                  {activeEvents.map(ev => (
                    <option key={ev.id} value={ev.id} style={{ background: '#0f172a' }}>{ev.name}</option>
                  ))}
                </motion.select>
                <div style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#00c2cb' }}>
                  <ChevronDown size={20} />
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
