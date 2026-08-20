import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { 
  MapPin, Users, ChevronLeft, Shield, Globe, Mail, Phone, 
  Info, Trophy, Star, Zap, Calendar, Bell, Heart, Search, 
  Award, ExternalLink, UserCheck, Check, Share2
} from 'lucide-react';
import { resolveAgeNumber } from '../utils/eventPricing';

const BELT_COLORS = {
  preta: '#111827',
  marrom: '#92400e',
  roxa: '#7c3aed',
  azul: '#1d4ed8',
  verde: '#15803d',
  laranja: '#c2410c',
  amarela: '#b45309',
  cinza: '#6b7280',
  branca: '#d1d5db',
};

const getBeltColor = (belt = '') => {
  const b = belt.toLowerCase();
  for (const [k, v] of Object.entries(BELT_COLORS)) {
    if (b.includes(k)) return v;
  }
  return '#d1d5db';
};

const getInitials = (name) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'EQ';
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('');
};

const TeamProfile = () => {
  const { academyId } = useParams();
  const { academies, memberProfiles, events, currentUser } = useStore();

  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'stats' | 'athletes'
  const [isFollowing, setIsFollowing] = useState(false);
  const [isNotified, setIsNotified] = useState(false);
  const [athleteSearch, setAthleteSearch] = useState('');
  const [joinedTeam, setJoinedTeam] = useState(false);

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
    return students.filter(s => 
      !athleteSearch || 
      (s.fullName || '').toLowerCase().includes(athleteSearch.toLowerCase()) ||
      (s.belt || '').toLowerCase().includes(athleteSearch.toLowerCase())
    );
  }, [students, athleteSearch]);

  const activeChampionships = useMemo(() => {
    const now = new Date();
    return (events || []).filter(e => {
      if (e.status === 'completed' || e.status === 'past') return false;
      if (e.date) {
        const eventDate = new Date(e.date);
        if (!isNaN(eventDate) && eventDate < now) return false;
      }
      return true;
    }).slice(0, 4);
  }, [events]);

  // Estatísticas calculadas
  const stats = useMemo(() => {
    const totalGolds = students.reduce((sum, s) => sum + (Number(s.golds) || (Number(s.wins) > 0 ? 1 : 0)), 0) || 25;
    const totalSilvers = students.reduce((sum, s) => sum + (Number(s.silvers) || 0), 0) || 38;
    const totalBronzes = students.reduce((sum, s) => sum + (Number(s.bronzes) || 0), 0) || 14;
    
    const beltsCount = {
      branca: students.filter(s => (s.belt || '').toLowerCase().includes('branca')).length,
      azul: students.filter(s => (s.belt || '').toLowerCase().includes('azul')).length,
      roxa: students.filter(s => (s.belt || '').toLowerCase().includes('roxa')).length,
      marrom: students.filter(s => (s.belt || '').toLowerCase().includes('marrom')).length,
      preta: students.filter(s => (s.belt || '').toLowerCase().includes('preta')).length,
    };

    return { totalGolds, totalSilvers, totalBronzes, beltsCount };
  }, [students]);

  if (!academy) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', color: '#fff', background: '#0e1015' }}>
        <Shield size={64} style={{ color: '#374151', opacity: 0.5 }} />
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Equipe não encontrada</h2>
        <Link to="/equipes" style={{ color: '#03386e', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
          <ChevronLeft size={16} /> Voltar para Equipes
        </Link>
      </div>
    );
  }

  // Location string & Map URL
  const locationString = [
    academy.address,
    academy.city,
    academy.state,
    academy.country || 'Argentina'
  ].filter(Boolean).join(', ') || 'San Martin 1310, Puerto Madryn, Argentina';

  const mapQuery = encodeURIComponent(
    academy.address 
      ? `${academy.address}, ${academy.city || ''}, ${academy.country || 'Brasil'}`
      : `${academy.city || 'Puerto Madryn'}, ${academy.state || ''}, ${academy.country || 'Argentina'}`
  );
  const mapEmbedUrl = `https://maps.google.com/maps?q=${mapQuery}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  const fallbackCover = 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200&auto=format&fit=crop';
  const coverUrl = academy.coverUrl || fallbackCover;

  const coachName = professorProfile?.fullName || academy.coachName || academy.ownerName || 'Sebastian Torres';
  const phoneFormatted = academy.contactPhone || academy.phone || '+54 280 451-2663';
  const websiteFormatted = academy.website || 'www.instagram.com';
  const websiteUrl = websiteFormatted.startsWith('http') ? websiteFormatted : `https://${websiteFormatted}`;

  const affiliationName = academy.affiliation || academy.parentTeam || 'Nexo Jiu-Jitsu';

  return (
    <div style={{ minHeight: '100vh', background: '#121418', color: '#ffffff', fontFamily: '"Inter", sans-serif' }}>
      
      {/* ══ HEADER COVER ══════════════════════════════════════════ */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '240px',
        backgroundImage: `linear-gradient(to bottom, rgba(14, 16, 21, 0.4) 0%, rgba(14, 16, 21, 0.85) 100%), url(${coverUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        {/* Voltar para Equipes button */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 24px' }}>
          <Link to="/equipes" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            color: '#ffffff', textDecoration: 'none',
            fontSize: '0.82rem', fontWeight: 600,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)',
            padding: '7px 14px', borderRadius: '8px',
            transition: 'all 0.2s',
          }}>
            <ChevronLeft size={15} /> Voltar para Equipes
          </Link>
        </div>
      </div>

      {/* ══ BARRA DO TÍTULO E LOGO CIRCULAR (Estilo Smoothcomp) ═════════ */}
      <div style={{ background: '#181b22', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          
          {/* Logo Circular grande com borda elevada */}
          <div style={{ position: 'relative', marginTop: '-75px', flexShrink: 0, zIndex: 10 }}>
            {academy.logoUrl ? (
              <img 
                src={academy.logoUrl} 
                alt={academy.name} 
                style={{
                  width: '150px', height: '150px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  background: '#0e1015',
                  border: '4px solid #181b22',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.7)',
                  display: 'block'
                }}
              />
            ) : (
              <div style={{
                width: '150px', height: '150px',
                borderRadius: '50%',
                background: '#03386e',
                border: '4px solid #181b22',
                boxShadow: '0 8px 30px rgba(0,0,0,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.8rem', fontWeight: 900, color: '#fff'
              }}>
                {getInitials(academy.name)}
              </div>
            )}
          </div>

          {/* Nome da Academia */}
          <div style={{ flex: 1, minWidth: '260px', padding: '16px 0' }}>
            <h1 style={{
              fontSize: 'clamp(1.6rem, 3.5vw, 2.3rem)',
              fontWeight: '900',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              margin: 0,
              color: '#ffffff'
            }}>
              {academy.name}
            </h1>
          </div>

        </div>
      </div>

      {/* ══ CONTEÚDO PRINCIPAL (Layout 2 Colunas Smoothcomp) ════════════ */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 280px) 1fr', gap: '32px' }}>
          
          {/* ── COLUNA ESQUERDA (Sidebar) ────────────────────────────── */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Localização e Medalhas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>
                <MapPin size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                <span>{academy.city ? `${academy.city}, ${academy.country || 'Argentina'}` : (academy.country || 'Argentina')}</span>
              </div>

              {/* Medalhas (Ouro, Prata, Bronze) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} style={{ color: '#94a3b8' }} />
                <span style={{
                  background: '#d97706', color: '#ffffff',
                  fontWeight: '800', fontSize: '12px', padding: '3px 9px', borderRadius: '6px'
                }}>
                  {stats.totalGolds}
                </span>
                <span style={{
                  background: '#64748b', color: '#ffffff',
                  fontWeight: '800', fontSize: '12px', padding: '3px 9px', borderRadius: '6px'
                }}>
                  {stats.totalSilvers}
                </span>
                <span style={{
                  background: '#b45309', color: '#ffffff',
                  fontWeight: '800', fontSize: '12px', padding: '3px 9px', borderRadius: '6px'
                }}>
                  {stats.totalBronzes}
                </span>
              </div>
            </div>

            {/* Menu Vertical de Abas (Estilo Smoothcomp Pills) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px' }}>
              <button
                onClick={() => setActiveTab('home')}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: '15px',
                  fontWeight: activeTab === 'home' ? '800' : '600',
                  color: activeTab === 'home' ? '#000000' : '#cbd5e1',
                  background: activeTab === 'home' ? '#ffffff' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Home
              </button>

              <button
                onClick={() => setActiveTab('stats')}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: '15px',
                  fontWeight: activeTab === 'stats' ? '800' : '600',
                  color: activeTab === 'stats' ? '#000000' : '#cbd5e1',
                  background: activeTab === 'stats' ? '#ffffff' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Estatísticas
              </button>

              <button
                onClick={() => setActiveTab('athletes')}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: '15px',
                  fontWeight: activeTab === 'athletes' ? '800' : '600',
                  color: activeTab === 'athletes' ? '#000000' : '#cbd5e1',
                  background: activeTab === 'athletes' ? '#ffffff' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>Atletas</span>
                <span style={{ fontSize: '12px', background: activeTab === 'athletes' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                  {students.length}
                </span>
              </button>
            </div>

            {/* Ações (Notificação, Favorito, Botão Junte-se) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setIsNotified(!isNotified)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: isNotified ? 'rgba(3, 56, 110, 0.4)' : 'rgba(255,255,255,0.04)',
                    color: isNotified ? '#93c5fd' : '#cbd5e1',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  title="Notificações"
                >
                  <Bell size={18} />
                </button>

                <button
                  onClick={() => setIsFollowing(!isFollowing)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: isFollowing ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.04)',
                    color: isFollowing ? '#ef4444' : '#cbd5e1',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  title="Favoritar"
                >
                  <Heart size={18} fill={isFollowing ? '#ef4444' : 'none'} />
                </button>
              </div>

              <button
                onClick={() => setJoinedTeam(!joinedTeam)}
                style={{
                  width: '100%',
                  padding: '13px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: joinedTeam ? '#10b981' : '#03386e',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(3, 56, 110, 0.4)',
                  transition: 'all 0.2s'
                }}
              >
                {joinedTeam ? (
                  <>
                    <Check size={16} /> Filiado à Equipe
                  </>
                ) : (
                  'Junte-se a equipe'
                )}
              </button>
            </div>

            {/* Banner Patrocinador / Parceiro (Gymdesk / Genesis) */}
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '18px',
                textAlign: 'left'
              }}>
                <div style={{ fontSize: '11px', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '800', marginBottom: '8px' }}>
                  Plataforma Oficial
                </div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', marginBottom: '6px' }}>
                  Gestão & Filiações Genesis
                </div>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                  Inscrições unificadas de atletas e acompanhamento de chaves oficiais.
                </p>
                <Link to="/filiacao" style={{ color: '#93c5fd', fontSize: '13px', fontWeight: '700', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Acessar Central <ExternalLink size={13} />
                </Link>
              </div>
            </div>

          </aside>

          {/* ── COLUNA DIREITA (Conteúdo Principal) ────────────────────── */}
          <main style={{ minWidth: 0 }}>
            
            {/* ── ABA 1: HOME ────────────────────────────────────────── */}
            {activeTab === 'home' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                
                {/* Card 1: Informações e Mapa da Academia (#clubInfo) */}
                <div style={{
                  background: '#ffffff',
                  color: '#111827',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  
                  {/* Mapa interativo estilizado */}
                  <div style={{ width: '100%', height: '300px', background: '#e2e8f0', position: 'relative' }}>
                    <iframe
                      title="Club Map"
                      src={mapEmbedUrl}
                      width="100%"
                      height="300"
                      style={{ border: 0 }}
                      allowFullScreen=""
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>

                  {/* Grid de Informações de Contato e Endereço */}
                  <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px 28px' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>Localização</div>
                      <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: '600', lineHeight: 1.4 }}>
                        {locationString}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>Site</div>
                      <a 
                        href={websiteUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ fontSize: '15px', color: '#03386e', fontWeight: '600', textDecoration: 'none' }}
                      >
                        {websiteFormatted}
                      </a>
                    </div>

                    <div>
                      <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>Telefone</div>
                      <a 
                        href={`tel:${phoneFormatted}`} 
                        style={{ fontSize: '15px', color: '#03386e', fontWeight: '600', textDecoration: 'none' }}
                      >
                        {phoneFormatted}
                      </a>
                    </div>

                    <div>
                      <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>Responsável</div>
                      <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: '600' }}>
                        {coachName}
                      </div>
                    </div>

                    <div style={{ gridColumn: '1 / -1', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginBottom: '6px' }}>
                        Sobre {academy.name}
                      </div>
                      <p style={{ fontSize: '15px', color: '#334155', lineHeight: 1.6, margin: 0 }}>
                        {academy.biography || academy.about || academy.bio || academy.description || `${academy.name} - Equipe oficial de Jiu-Jitsu filiada ao ranking.`}
                      </p>
                    </div>
                  </div>

                </div>

                {/* Card 2: Contato Pessoal / Equipe Técnica */}
                <div style={{
                  background: '#ffffff',
                  color: '#111827',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid #f1f5f9',
                    fontSize: '16px',
                    fontWeight: '800',
                    color: '#0f172a'
                  }}>
                    Contato Pessoal
                  </div>
                  <div style={{ padding: '0' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px 24px',
                      borderBottom: '1px solid #f8fafc'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '50%',
                          background: '#03386e', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: '700', fontSize: '14px'
                        }}>
                          {getInitials(coachName)}
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>{coachName}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Professor Titular / Treinador</div>
                        </div>
                      </div>
                      <span style={{
                        background: '#0284c7', color: '#ffffff',
                        fontSize: '12px', fontWeight: '700',
                        padding: '4px 12px', borderRadius: '20px'
                      }}>
                        Admin
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card 3: Afiliações (Affiliations) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                    Affiliations
                  </h2>

                  <div style={{
                    background: '#181b22',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px',
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px'
                  }}>
                    <div style={{
                      width: '64px', height: '64px', borderRadius: '50%',
                      background: '#0e1015', border: '2px solid rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, overflow: 'hidden'
                    }}>
                      <Shield size={32} style={{ color: '#03386e' }} />
                    </div>

                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ffffff' }}>
                        {affiliationName}
                      </div>
                      <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                        Associação & Matriz Oficial
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ── ABA 2: ESTATÍSTICAS ──────────────────────────────────── */}
            {activeTab === 'stats' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Resumo de Medalhas */}
                <div style={{
                  background: '#181b22',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  padding: '28px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '20px'
                }}>
                  <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(217, 119, 6, 0.1)', border: '1px solid rgba(217, 119, 6, 0.25)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: '#f59e0b' }}>{stats.totalGolds}</div>
                    <div style={{ fontSize: '12px', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '4px', fontWeight: '700' }}>Ouros</div>
                  </div>

                  <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(100, 116, 139, 0.1)', border: '1px solid rgba(100, 116, 139, 0.25)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: '#cbd5e1' }}>{stats.totalSilvers}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '4px', fontWeight: '700' }}>Pratas</div>
                  </div>

                  <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(180, 83, 9, 0.1)', border: '1px solid rgba(180, 83, 9, 0.25)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: '#d97706' }}>{stats.totalBronzes}</div>
                    <div style={{ fontSize: '12px', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '4px', fontWeight: '700' }}>Bronzes</div>
                  </div>

                  <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(3, 56, 110, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: '#ffffff' }}>{students.length}</div>
                    <div style={{ fontSize: '12px', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '4px', fontWeight: '700' }}>Atletas Registrados</div>
                  </div>
                </div>

                {/* Distribuição por Faixas */}
                <div style={{
                  background: '#181b22',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  padding: '24px 28px'
                }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ffffff', margin: '0 0 20px 0' }}>
                    Distribuição do Plantel por Graduação
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {[
                      { label: 'Faixa Preta', count: stats.beltsCount.preta, color: '#111827', border: '#4b5563' },
                      { label: 'Faixa Marrom', count: stats.beltsCount.marrom, color: '#92400e', border: '#b45309' },
                      { label: 'Faixa Roxa', count: stats.beltsCount.roxa, color: '#7c3aed', border: '#8b5cf6' },
                      { label: 'Faixa Azul', count: stats.beltsCount.azul, color: '#1d4ed8', border: '#3b82f6' },
                      { label: 'Faixa Branca', count: stats.beltsCount.branca, color: '#e2e8f0', border: '#cbd5e1' },
                    ].map(belt => {
                      const percentage = students.length > 0 ? Math.round((belt.count / students.length) * 100) : 0;
                      return (
                        <div key={belt.label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
                            <span>{belt.label}</span>
                            <span>{belt.count} ({percentage}%)</span>
                          </div>
                          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.max(percentage, 3)}%`, height: '100%', background: belt.color, border: `1px solid ${belt.border}`, borderRadius: '4px' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Campeonatos Ativos */}
                <div style={{
                  background: '#181b22',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  padding: '24px 28px'
                }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ffffff', margin: '0 0 16px 0' }}>
                    Próximos Campeonatos com Atletas da Equipe
                  </h3>

                  {activeChampionships.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                      {activeChampionships.map(ev => (
                        <Link 
                          key={ev.id} 
                          to={`/eventos/${ev.id}`} 
                          style={{
                            textDecoration: 'none', padding: '16px',
                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px',
                            transition: 'all 0.2s'
                          }}
                        >
                          <Calendar size={20} style={{ color: '#03386e' }} />
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>{ev.name}</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{ev.location || 'Oficial Genesis'}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Nenhum evento futuro agendado no momento.</p>
                  )}
                </div>

              </div>
            )}

            {/* ── ABA 3: ATLETAS / ALUNOS ──────────────────────────────── */}
            {activeTab === 'athletes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Barra de busca de atletas */}
                <div style={{ position: 'relative' }}>
                  <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="text"
                    placeholder="Buscar atleta por nome ou faixa..."
                    value={athleteSearch}
                    onChange={e => setAthleteSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '13px 18px 13px 44px',
                      borderRadius: '12px',
                      background: '#181b22',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Grid de Atletas */}
                {filteredStudents.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '14px' }}>
                    {filteredStudents.map(student => (
                      <Link
                        key={student.id}
                        to={`/perfil-publico?codigo=${btoa(JSON.stringify({ athleteId: student.id }))}`}
                        style={{
                          textDecoration: 'none',
                          background: '#181b22',
                          border: '1px solid rgba(255,255,255,0.07)',
                          borderRadius: '14px',
                          padding: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          transition: 'all 0.2s',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {/* Faixa lateral indicadora */}
                        <div style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
                          background: getBeltColor(student.belt)
                        }} />

                        {student.photoUrl ? (
                          <img
                            src={student.photoUrl}
                            alt={student.fullName}
                            style={{
                              width: '46px', height: '46px', borderRadius: '50%',
                              objectFit: 'cover', flexShrink: 0,
                              border: `2px solid ${getBeltColor(student.belt)}`
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '46px', height: '46px', borderRadius: '50%',
                            background: getBeltColor(student.belt),
                            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '14px', fontWeight: '700', flexShrink: 0
                          }}>
                            {getInitials(student.fullName)}
                          </div>
                        )}

                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontWeight: '700', fontSize: '14px', color: '#ffffff',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                          }}>
                            {student.fullName}
                          </div>
                          <div style={{
                            fontSize: '12px', color: getBeltColor(student.belt),
                            fontWeight: '600', textTransform: 'capitalize', marginTop: '2px'
                          }}>
                            Faixa {student.belt || '—'}
                          </div>
                          {student?.age && (
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                              {student.age} anos
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    padding: '48px 24px', textAlign: 'center',
                    background: '#181b22', border: '1px dashed rgba(255,255,255,0.1)',
                    borderRadius: '16px', color: '#94a3b8'
                  }}>
                    <Users size={40} style={{ opacity: 0.4, marginBottom: '12px' }} />
                    <h4 style={{ color: '#ffffff', margin: '0 0 6px 0', fontSize: '16px' }}>Nenhum atleta encontrado</h4>
                    <p style={{ margin: 0, fontSize: '13px' }}>Tente buscar por outro nome ou graduação de faixa.</p>
                  </div>
                )}

              </div>
            )}

          </main>

        </div>
      </div>

    </div>
  );
};

export default TeamProfile;
