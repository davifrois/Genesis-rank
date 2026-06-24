import React, { useMemo, useState } from 'react';
import { Shield, MapPin, Search, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../hooks/useStore';

const Teams = () => {
  const { academies, currentUser } = useStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAcademies = useMemo(() => {
    return (academies || []).filter(academy => 
      (academy.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (academy.city || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [academies, searchTerm]);

  return (
    <div className="teams-page">
      <div className="teams-hero">
        <div className="container teams-hero__inner">
          <div className="teams-hero__content">
            <h1>Equipes Filiadas</h1>
            <p>Conheça as academias e equipes oficiais registradas na plataforma.</p>
            
            <div className="teams-search">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Buscar por nome ou cidade..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {currentUser && (
            <div className="teams-hero__actions">
              <Link to="/filiacao" className="btn btn-primary">
                Gerenciar Equipe
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="container teams-grid-container">
        <div className="teams-grid">
          {filteredAcademies.length > 0 ? (
            filteredAcademies.map(academy => (
              <Link key={academy.id} to={`/equipe/${academy.id}`} className="team-card">
                <div className="team-card__header">
                  {academy.logoUrl ? (
                    <img src={academy.logoUrl} alt={academy.name} className="team-card__logo" />
                  ) : (
                    <div className="team-card__logo-placeholder">
                      <Shield size={32} />
                    </div>
                  )}
                </div>
                <div className="team-card__body">
                  <h3 className="team-card__name">{academy.name}</h3>
                  <div className="team-card__location">
                    <MapPin size={14} />
                    <span>{academy.city ? `${academy.city}, ${academy.state}` : academy.country || 'Brasil'}</span>
                  </div>
                  <div className="team-card__footer">
                    <span>Ver equipe</span>
                    <ChevronRight size={16} />
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="teams-empty">
              <Shield size={48} className="teams-empty-icon" />
              <h2>Nenhuma equipe encontrada</h2>
              <p>Não encontramos academias cadastradas com esse termo de busca.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Teams;
