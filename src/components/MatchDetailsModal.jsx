import React from 'react';
import './MatchDetailsModal.css';
import { X } from 'lucide-react';

export default function MatchDetailsModal({ isOpen, onClose, match, divisionTitle }) {
  if (!isOpen || !match) return null;

  // Mock additional data if missing
  const topAthlete = {
    ...match.topAthlete,
    firstName: match.topAthlete.name.split(' ')[0],
    lastName: match.topAthlete.name.split(' ').slice(1).join(' ') || '',
    score: match.details?.score?.split('-')[0] || 0,
    age: 28,
    country: 'Argentina',
    affiliation: 'Cobra Team',
    club: match.topAthlete.team
  };

  const bottomAthlete = {
    ...match.bottomAthlete,
    firstName: match.bottomAthlete.name.split(' ')[0],
    lastName: match.bottomAthlete.name.split(' ').slice(1).join(' ') || '',
    score: match.details?.score?.split('-')[1] || 2,
    age: 26,
    country: 'Argentina',
    affiliation: 'Alliance',
    club: match.bottomAthlete.team
  };

  return (
    <div className="match-details-overlay" onClick={onClose}>
      <div className="match-details-modal" onClick={e => e.stopPropagation()}>
        <button className="match-details-close" onClick={onClose}>
          <X size={20} />
        </button>

        <h2 className="match-details-division">{divisionTitle}</h2>

        <div className="match-details-round">
          <span>ROUND</span>
          <strong>{match.label || 'Match'}</strong>
        </div>

        <div className="match-details-hero">
          {/* Top Athlete */}
          <div className="match-hero-athlete">
            <div className="match-hero-avatar-wrapper">
              <img src={topAthlete.avatar} alt={topAthlete.name} className="match-hero-avatar" />
            </div>
            <div className="match-hero-name">
              <span className="first-name">{topAthlete.firstName}</span>
              <span className="last-name">{topAthlete.lastName}</span>
            </div>
            {topAthlete.winner && (
              <div className="match-hero-winner">
                Won by<br />{match.details?.method || 'Points'}
              </div>
            )}
          </div>

          <div className="match-hero-time">
            {match.details?.time || '00:00'}
          </div>

          {/* Bottom Athlete */}
          <div className="match-hero-athlete">
            <div className="match-hero-avatar-wrapper">
              <img src={bottomAthlete.avatar} alt={bottomAthlete.name} className="match-hero-avatar" />
            </div>
            <div className="match-hero-name">
              <span className="first-name">{bottomAthlete.firstName}</span>
              <span className="last-name">{bottomAthlete.lastName}</span>
            </div>
            {bottomAthlete.winner && (
              <div className="match-hero-winner">
                Won by<br />{match.details?.method || 'Points'}
              </div>
            )}
          </div>
        </div>

        <div className="match-details-stats">
          {/* Top Stats */}
          <div className="stats-column athlete-stats">
            <div className="stat-row score-row">{topAthlete.score}</div>
            <div className="stat-row">{topAthlete.age}</div>
            <div className="stat-row">🇦🇷 {topAthlete.country}</div>
            <div className="stat-row">{topAthlete.affiliation}</div>
            <div className="stat-row">{topAthlete.club}</div>
          </div>

          {/* Labels */}
          <div className="stats-column labels-column">
            <div className="stat-row label-row">SCORE</div>
            <div className="stat-row label-row">AGE</div>
            <div className="stat-row label-row">COUNTRY</div>
            <div className="stat-row label-row">AFFILIATION</div>
            <div className="stat-row label-row">CLUB</div>
          </div>

          {/* Bottom Stats */}
          <div className="stats-column athlete-stats">
            <div className="stat-row score-row">{bottomAthlete.score}</div>
            <div className="stat-row">{bottomAthlete.age}</div>
            <div className="stat-row">🇦🇷 {bottomAthlete.country}</div>
            <div className="stat-row">{bottomAthlete.affiliation}</div>
            <div className="stat-row">{bottomAthlete.club}</div>
          </div>
        </div>

      </div>
    </div>
  );
}
