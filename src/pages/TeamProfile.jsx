import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { MapPin, Users, ChevronLeft, Shield, Globe, Mail, Phone, Info } from 'lucide-react';
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

const TeamProfile = () => {
  const { academyId } = useParams();
  const { academies, memberProfiles } = useStore();

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

  // Exclude professor from the main students list if found
  const filteredStudents = useMemo(() => {
    if (!professorProfile) return students;
    return students.filter(s => s.id !== professorProfile.id);
  }, [students, professorProfile]);

  if (!academy) {
    return (
      <div className="team-profile-page">
        <div className="container">
          <div className="teams-empty">
            <Shield size={48} className="teams-empty-icon" />
            <h2>Equipe não encontrada</h2>
            <p>A equipe que você está procurando não existe ou foi removida.</p>
            <Link to="/equipes" className="btn btn-primary" style={{ marginTop: '1rem' }}>Voltar para Equipes</Link>
          </div>
        </div>
      </div>
    );
  }

  const getInitials = (name) => {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'EQ';
    return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  };

  const coverStyle = academy.coverUrl 
    ? { backgroundImage: `linear-gradient(to bottom, rgba(17, 17, 17, 0.4), #111), url(${academy.coverUrl})` }
    : { background: 'linear-gradient(135deg, #1ba2e9, #0d1117)' };

  return (
    <div className="team-profile-page">
      {/* ── HERO DA EQUIPE ──────────────────────────────────────── */}
      <section className="tp-hero" style={coverStyle}>
        <div className="tp-hero__inner container">
          <Link to="/equipes" className="pp-back-btn tp-back-btn">
            <ChevronLeft size={16} /> Voltar para Equipes
          </Link>

          <div className="tp-hero__main">
            <div className="tp-hero__logo-wrapper">
              {academy.logoUrl ? (
                <img src={academy.logoUrl} alt={academy.name} className="tp-hero__logo" />
              ) : (
                <div className="tp-hero__logo-placeholder">
                  {getInitials(academy.name)}
                </div>
              )}
            </div>
            
            <div className="tp-hero__info">
              <h1 className="tp-hero__name">{academy.name}</h1>
              <div className="tp-hero__meta">
                <div className="tp-hero__meta-item">
                  <MapPin size={16} />
                  <span>{academy.city ? `${academy.city}, ${academy.state}` : academy.country || 'Brasil'}</span>
                </div>
                <div className="tp-hero__meta-item">
                  <Users size={16} />
                  <span>{students.length} Alunos registrados</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTEÚDO PRINCIPAL ──────────────────────────────────────── */}
      <main className="tp-content container">
        <div className="tp-grid">
          
          {/* ── COLUNA DA ESQUERDA (SOBRE E PROFESSOR) ──────────────── */}
          <div className="tp-sidebar">
            <div className="tp-card">
              <div className="tp-card__header">
                <h2><Info size={18} /> Sobre a Equipe</h2>
              </div>
              <div className="tp-card__body">
                {academy.about ? (
                  <p className="tp-about-text">{academy.about}</p>
                ) : (
                  <p className="tp-empty-text">A equipe não forneceu uma descrição.</p>
                )}
                
                <div className="tp-contact-info">
                  {academy.website && (
                    <div className="tp-contact-item">
                      <Globe size={16} /> <a href={academy.website.startsWith('http') ? academy.website : `https://${academy.website}`} target="_blank" rel="noreferrer">{academy.website}</a>
                    </div>
                  )}
                  {academy.contactEmail && (
                    <div className="tp-contact-item">
                      <Mail size={16} /> <a href={`mailto:${academy.contactEmail}`}>{academy.contactEmail}</a>
                    </div>
                  )}
                  {academy.contactPhone && (
                    <div className="tp-contact-item">
                      <Phone size={16} /> <span>{academy.contactPhone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="tp-card">
              <div className="tp-card__header">
                <h2>Professor / Mestre</h2>
              </div>
              <div className="tp-card__body">
                {professorProfile ? (
                  <Link to={`/perfil-publico?codigo=${btoa(JSON.stringify({ athleteId: professorProfile.id }))}`} className="tp-student-card tp-student-card--prof">
                    <div className="tp-student-card__photo">
                      {professorProfile.photoUrl ? (
                        <img src={professorProfile.photoUrl} alt={professorProfile.fullName} />
                      ) : (
                        <div className="tp-student-card__initials" style={{ background: getBeltColor(professorProfile.belt) }}>
                          {getInitials(professorProfile.fullName)}
                        </div>
                      )}
                    </div>
                    <div className="tp-student-card__info">
                      <strong className="tp-student-card__name">{professorProfile.fullName}</strong>
                      <div className="tp-student-card__meta">
                        <span className="tp-student-card__belt" style={{ color: getBeltColor(professorProfile.belt) }}>
                          {professorProfile.belt || 'Sem faixa'}
                        </span>
                        {professorProfile.age && <span className="tp-student-card__age">• {professorProfile.age} anos</span>}
                      </div>
                    </div>
                  </Link>
                ) : (
                  academy.coachName || academy.ownerName ? (
                    <div className="tp-student-card tp-student-card--prof">
                      <div className="tp-student-card__photo">
                        <div className="tp-student-card__initials" style={{ background: '#374151' }}>
                          {getInitials(academy.coachName || academy.ownerName)}
                        </div>
                      </div>
                      <div className="tp-student-card__info">
                        <strong className="tp-student-card__name">{academy.coachName || academy.ownerName}</strong>
                        <div className="tp-student-card__meta">
                          <span className="tp-student-card__belt" style={{ color: '#9ca3af' }}>
                            Professor
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="tp-empty-text">Sem professor vinculado.</p>
                  )
                )}
              </div>
            </div>
          </div>

          {/* ── COLUNA DA DIREITA (ALUNOS) ──────────────────────────── */}
          <div className="tp-main-col">
            <div className="tp-card">
              <div className="tp-card__header">
                <h2>Alunos Inscritos ({filteredStudents.length})</h2>
              </div>
              <div className="tp-card__body">
                {filteredStudents.length > 0 ? (
                  <div className="tp-students-grid">
                    {filteredStudents.map(student => (
                      <Link key={student.id} to={`/perfil-publico?codigo=${btoa(JSON.stringify({ athleteId: student.id }))}`} className="tp-student-card">
                        <div className="tp-student-card__photo">
                          {student.photoUrl ? (
                            <img src={student.photoUrl} alt={student.fullName} />
                          ) : (
                            <div className="tp-student-card__initials" style={{ background: getBeltColor(student.belt) }}>
                              {getInitials(student.fullName)}
                            </div>
                          )}
                        </div>
                        <div className="tp-student-card__info">
                          <strong className="tp-student-card__name" title={student.fullName}>{student.fullName}</strong>
                          <div className="tp-student-card__meta">
                            <span className="tp-student-card__belt" style={{ color: getBeltColor(student.belt) }}>
                              {student.belt || 'Sem faixa'}
                            </span>
                            {student.age && <span className="tp-student-card__age">• {student.age} anos</span>}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="tp-empty-students">
                    <Users size={48} className="tp-empty-icon" />
                    <h3>Nenhum aluno registrado</h3>
                    <p>Ainda não há atletas vinculados a esta equipe.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default TeamProfile;
