import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { MapPin, Users, ChevronLeft, Shield, Globe, Mail, Phone, Info, Trophy, Star, Zap } from 'lucide-react';

const BELT_COLORS = {
  preta: '#111827', marrom: '#92400e', roxa: '#7c3aed',
  azul: '#1d4ed8', verde: '#15803d', laranja: '#c2410c',
  amarela: '#b45309', cinza: '#6b7280', branca: '#d1d5db',
};
const getBeltColor = (belt = '') => {
  const b = belt.toLowerCase();
  for (const [k, v] of Object.entries(BELT_COLORS)) if (b.includes(k)) return v;
  return '#d1d5db';
};

const getInitials = (name) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'EQ';
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('');
};

// Extrai cor dominante de uma imagem via canvas
function useDominantColor(imageUrl, fallback = '#00c2cb') {
  const [color, setColor] = useState(fallback);
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 40;
        canvas.height = 40;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 40, 40);
        const data = ctx.getImageData(0, 0, 40, 40).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha < 128) continue; // ignora transparente
          // ignora pixels muito escuros ou muito brancos
          const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
          if (brightness < 30 || brightness > 220) continue;
          r += data[i]; g += data[i+1]; b += data[i+2];
          count++;
        }
        if (count > 0) {
          const hex = '#' + [Math.round(r/count), Math.round(g/count), Math.round(b/count)]
            .map(v => v.toString(16).padStart(2, '0')).join('');
          setColor(hex);
        }
      } catch {
        // canvas blocked by CORS - keep fallback
      }
    };
    img.onerror = () => {};
    img.src = imageUrl;
  }, [imageUrl]);
  return color;
}

const TeamProfile = () => {
  const { academyId } = useParams();
  const { academies, memberProfiles, events } = useStore();

  const academy = useMemo(() => {
    return (academies || []).find(a => a.id === academyId);
  }, [academies, academyId]);

  const students = useMemo(() => {
    if (!academyId) return [];
    return (memberProfiles || []).filter(p => p.academyId === academyId);
  }, [memberProfiles, academyId]);

  const professorProfile = useMemo(() => {
    if (!academy) return null;
    const coachUsername = (academy.coachUsername || academy.ownerUsername || '').toLowerCase();
    if (!coachUsername) return null;
    return students.find(s => (s.accountUsername || '').toLowerCase() === coachUsername);
  }, [academy, students]);

  const filteredStudents = useMemo(() => {
    if (!professorProfile) return students;
    return students.filter(s => s.id !== professorProfile.id);
  }, [students, professorProfile]);

  const activeChampionships = useMemo(() => {
    const now = new Date();
    return (events || []).filter(e => {
      if (e.status === 'completed' || e.status === 'past') return false;
      if (e.date) {
        const eventDate = new Date(e.date);
        if (!isNaN(eventDate) && eventDate < now) return false;
      }
      return true;
    }).slice(0, 4); // Mostra os top 4 eventos
  }, [events]);

  const accentColor = useDominantColor(academy?.logoUrl);
  const accentRgb = useMemo(() => {
    const hex = accentColor.replace('#', '');
    return [
      parseInt(hex.substring(0,2), 16),
      parseInt(hex.substring(2,4), 16),
      parseInt(hex.substring(4,6), 16)
    ].join(',');
  }, [accentColor]);

  if (!academy) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', color: '#fff' }}>
        <Shield size={64} style={{ color: '#374151', opacity: 0.5 }} />
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Equipe não encontrada</h2>
        <Link to="/equipes" style={{ color: '#00c2cb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ChevronLeft size={16} /> Voltar para Equipes
        </Link>
      </div>
    );
  }

  // Hero background
  const heroBg = academy.coverUrl
    ? `linear-gradient(to bottom, rgba(5,5,10,0.2) 0%, rgba(5,5,10,0.7) 60%, rgba(5,5,10,1) 100%), url(${academy.coverUrl})`
    : `linear-gradient(135deg, rgba(${accentRgb},0.18) 0%, rgba(5,5,10,1) 70%)`;

  return (
    <div style={{ minHeight: '100vh', background: 'rgba(5,5,10,1)', color: '#fff', fontFamily: '"Inter", sans-serif' }}>

      {/* ══ HERO FULLSCREEN ══════════════════════════════════════════ */}
      <section style={{
        position: 'relative',
        width: '100%',
        minHeight: '360px',
        background: heroBg,
        backgroundSize: 'cover',
        backgroundPosition: 'center 30%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        overflow: 'hidden',
      }}>
        {/* Top neon accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: `linear-gradient(90deg, transparent, ${accentColor}, rgba(${accentRgb},0.4), transparent)`,
          boxShadow: `0 0 20px ${accentColor}`,
        }} />

        {/* Radial glow from accent color */}
        <div style={{
          position: 'absolute', top: '-80px', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '400px',
          background: `radial-gradient(ellipse, rgba(${accentRgb},0.15) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        {/* Back button */}
        <Link to="/equipes" style={{
          position: 'absolute', top: '28px', left: '2.5rem',
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          color: 'rgba(255,255,255,0.7)', textDecoration: 'none',
          fontSize: '0.82rem', fontWeight: 600,
          background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '8px 14px', borderRadius: '40px',
          transition: 'all 0.2s',
        }}>
          <ChevronLeft size={14} /> Voltar para Equipes
        </Link>

        {/* Hero content */}
        <div style={{ padding: '0 2.5rem 2.5rem', display: 'flex', alignItems: 'flex-end', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Logo with glow ring */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              position: 'absolute', inset: '-6px',
              borderRadius: '22px',
              background: `linear-gradient(135deg, ${accentColor}, rgba(${accentRgb},0.2))`,
              filter: 'blur(8px)', opacity: 0.7,
            }} />
            {academy.logoUrl ? (
              <img src={academy.logoUrl} alt={academy.name} style={{
                position: 'relative',
                width: '120px', height: '120px',
                objectFit: 'contain',
                background: 'rgba(15,15,20,0.85)',
                borderRadius: '18px',
                padding: '10px',
                border: `2px solid rgba(${accentRgb},0.5)`,
                boxShadow: `0 0 30px rgba(${accentRgb},0.3)`,
              }} />
            ) : (
              <div style={{
                position: 'relative',
                width: '120px', height: '120px',
                background: `linear-gradient(135deg, rgba(${accentRgb},0.3), rgba(5,5,10,0.9))`,
                borderRadius: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.5rem', fontWeight: 900, color: '#fff',
                border: `2px solid rgba(${accentRgb},0.5)`,
                boxShadow: `0 0 30px rgba(${accentRgb},0.3)`,
              }}>
                {getInitials(academy.name)}
              </div>
            )}
          </div>

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: `rgba(${accentRgb},0.12)`,
              border: `1px solid rgba(${accentRgb},0.35)`,
              color: accentColor, fontSize: '0.7rem', fontWeight: 700,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              padding: '4px 12px', borderRadius: '40px', marginBottom: '12px'
            }}>
              <Zap size={11} />
              Academia Oficial
            </div>
            <h1 style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, margin: '0 0 14px 0',
              lineHeight: 1.1,
              textShadow: `0 0 40px rgba(${accentRgb},0.4), 0 2px 4px rgba(0,0,0,0.8)`,
              letterSpacing: '-0.02em'
            }}>
              {academy.name}
            </h1>
            <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {(academy.city || academy.country) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)' }}>
                  <MapPin size={14} style={{ color: accentColor }} />
                  {academy.city ? `${academy.city}, ${academy.state}` : academy.country}
                </div>
              )}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem',
                background: `rgba(${accentRgb},0.12)`,
                border: `1px solid rgba(${accentRgb},0.2)`,
                color: '#fff', padding: '5px 14px', borderRadius: '40px'
              }}>
                <Users size={13} style={{ color: accentColor }} />
                {students.length} alunos registrados
              </div>
            </div>
          </div>

          {/* Stats chips */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {[
              { icon: <Trophy size={18} />, label: 'Campeões', value: filteredStudents.filter(s => (s.wins || 0) > 0).length },
              { icon: <Star size={18} />, label: 'Faixas Pretas', value: filteredStudents.filter(s => (s.belt || '').toLowerCase().includes('preta')).length },
            ].map((stat, i) => (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)',
                border: `1px solid rgba(${accentRgb},0.2)`,
                borderRadius: '16px', padding: '14px 22px', gap: '4px', minWidth: '90px'
              }}>
                <div style={{ color: accentColor }}>{stat.icon}</div>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{stat.value}</span>
                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ BODY ══════════════════════════════════════════════════════ */}
      <div style={{ padding: '2.5rem', display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>

        {/* ── SIDEBAR ─────────────────────────────────────────────── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Sobre card */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid rgba(${accentRgb},0.15)`,
            borderRadius: '20px', overflow: 'hidden',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: `1px solid rgba(${accentRgb},0.1)`,
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '0.82rem', fontWeight: 700, color: accentColor,
              textTransform: 'uppercase', letterSpacing: '0.1em'
            }}>
              <Info size={14} /> Sobre a Equipe
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <p style={{ 
                color: 'rgba(255,255,255,0.95)', 
                fontSize: '1rem', 
                lineHeight: 1.8, 
                margin: 0,
                fontFamily: '"Outfit", "Inter", sans-serif',
                fontWeight: 300,
                letterSpacing: '0.02em',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
              }}>
                {academy.about || 'A equipe não forneceu uma descrição.'}
              </p>
              {(academy.website || academy.contactEmail || academy.contactPhone) && (
                <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {academy.website && (
                    <a href={academy.website.startsWith('http') ? academy.website : `https://${academy.website}`} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', color: accentColor, fontSize: '0.85rem', textDecoration: 'none' }}>
                      <Globe size={14} /> {academy.website}
                    </a>
                  )}
                  {academy.contactEmail && (
                    <a href={`mailto:${academy.contactEmail}`}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', textDecoration: 'none' }}>
                      <Mail size={14} /> {academy.contactEmail}
                    </a>
                  )}
                  {academy.contactPhone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                      <Phone size={14} /> {academy.contactPhone}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Professor card */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid rgba(${accentRgb},0.15)`,
            borderRadius: '20px', overflow: 'hidden',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: `1px solid rgba(${accentRgb},0.1)`,
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '0.82rem', fontWeight: 700, color: accentColor,
              textTransform: 'uppercase', letterSpacing: '0.1em'
            }}>
              <Shield size={14} /> Professor / Mestre
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              {(professorProfile || academy.coachName || academy.ownerName) ? (
                <Link
                  to={professorProfile ? `/perfil-publico?codigo=${btoa(JSON.stringify({ athleteId: professorProfile.id }))}` : '#'}
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '14px', cursor: professorProfile ? 'pointer' : 'default' }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {professorProfile?.photoUrl ? (
                      <img src={professorProfile.photoUrl} alt={professorProfile.fullName}
                        style={{ width: '54px', height: '54px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${getBeltColor(professorProfile.belt || 'preta')}` }}
                      />
                    ) : (
                      <div style={{
                        width: '54px', height: '54px', borderRadius: '50%', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700, color: '#fff',
                        background: getBeltColor(professorProfile?.belt || 'preta'),
                        border: `2px solid ${getBeltColor(professorProfile?.belt || 'preta')}`,
                      }}>
                        {getInitials(professorProfile?.fullName || academy.coachName || academy.ownerName)}
                      </div>
                    )}
                    <div style={{
                      position: 'absolute', bottom: 0, right: 0,
                      width: '14px', height: '14px', borderRadius: '50%',
                      background: '#10b981', border: '2px solid rgba(5,5,10,1)',
                    }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: '3px' }}>
                      {professorProfile?.fullName || academy.coachName || academy.ownerName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: getBeltColor(professorProfile?.belt || 'preta'), fontWeight: 600, textTransform: 'capitalize' }}>
                      Faixa {professorProfile?.belt || 'Preta'}
                    </div>
                    {professorProfile.age && <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{professorProfile.age} anos</div>}
                  </div>
                </Link>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.88rem', margin: 0, fontStyle: 'italic' }}>Sem professor vinculado.</p>
              )}
            </div>
          </div>

          {/* Campeonatos Ativos */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid rgba(${accentRgb},0.15)`,
            borderRadius: '20px', overflow: 'hidden',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: `1px solid rgba(${accentRgb},0.1)`,
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '0.82rem', fontWeight: 700, color: accentColor,
              textTransform: 'uppercase', letterSpacing: '0.1em'
            }}>
              <Trophy size={14} /> Campeonatos Ativos
            </div>
            <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeChampionships.length > 0 ? (
                activeChampionships.map(event => (
                  <Link key={event.id} to={`/eventos?id=${event.id}`} style={{
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    transition: 'all 0.2s',
                  }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = `rgba(${accentRgb},0.3)`;
                      e.currentTarget.style.background = `rgba(${accentRgb},0.08)`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    }}
                  >
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '8px',
                      background: `rgba(${accentRgb},0.15)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: accentColor, flexShrink: 0
                    }}>
                      <Calendar size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                        {event.name || 'Campeonato Oficial'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={10} /> {event.location || event.city || 'Local a confirmar'}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.88rem', margin: 0, fontStyle: 'italic' }}>
                  Nenhum campeonato ativo no momento.
                </p>
              )}
            </div>
          </div>
        </aside>

        {/* ── MAIN COL (Alunos) ───────────────────────────────────── */}
        <main>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid rgba(${accentRgb},0.15)`,
            borderRadius: '20px', overflow: 'hidden',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{
              padding: '1.1rem 1.5rem',
              borderBottom: `1px solid rgba(${accentRgb},0.1)`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                <Users size={14} /> Alunos Inscritos
              </div>
              <div style={{
                background: `rgba(${accentRgb},0.15)`, color: accentColor,
                fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: '40px',
                border: `1px solid rgba(${accentRgb},0.25)`,
              }}>
                {filteredStudents.length} atletas
              </div>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {filteredStudents.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                  {filteredStudents.map(student => (
                    <Link
                      key={student.id}
                      to={`/perfil-publico?codigo=${btoa(JSON.stringify({ athleteId: student.id }))}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <div style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid rgba(255,255,255,0.07)`,
                        borderRadius: '16px', padding: '16px',
                        display: 'flex', alignItems: 'center', gap: '12px',
                        cursor: 'pointer', transition: 'all 0.2s',
                        position: 'relative', overflow: 'hidden',
                      }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = `rgba(${accentRgb},0.3)`;
                          e.currentTarget.style.background = `rgba(${accentRgb},0.06)`;
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {/* Belt color indicator */}
                        <div style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
                          background: getBeltColor(student.belt),
                          borderRadius: '3px 0 0 3px',
                        }} />

                        {student.photoUrl ? (
                          <img src={student.photoUrl} alt={student.fullName}
                            style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${getBeltColor(student.belt)}` }}
                          />
                        ) : (
                          <div style={{
                            width: '44px', height: '44px', borderRadius: '50%',
                            background: getBeltColor(student.belt),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.9rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                          }}>
                            {getInitials(student.fullName)}
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {student.fullName}
                          </div>
                          <div style={{ fontSize: '0.73rem', color: getBeltColor(student.belt), fontWeight: 600, textTransform: 'capitalize', marginTop: '2px' }}>
                            Faixa {student.belt || '—'}
                          </div>
                          {student.age && <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>{student.age} anos</div>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                  <Users size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                  <h3 style={{ margin: '0 0 0.5rem', color: 'rgba(255,255,255,0.5)' }}>Nenhum aluno registrado</h3>
                  <p style={{ margin: 0, fontSize: '0.88rem' }}>Ainda não há atletas vinculados a esta equipe.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TeamProfile;
