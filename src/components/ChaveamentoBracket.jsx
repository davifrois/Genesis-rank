import React, { useState } from 'react';
import './ChaveamentoBracket.css';

import { Bell, Heart, BookOpen, Users, GitMerge, LayoutGrid, Clock, Trophy, PlayCircle } from 'lucide-react';
import MatchDetailsModal from './MatchDetailsModal';

import BracketTree from './BracketTree';

export default function ChaveamentoBracket({ bracket, athleteMap, liveMatches, divisionMeta, event }) {
  const eventTitle = event?.name || "Campeonato";
  
  const numParticipants = bracket?.seedIds?.filter(id => id && !id.startsWith('placeholder-') && id.toUpperCase() !== 'BYE').length || 0;
  
  let dynamicBracketType = "Eliminação Simples";
  if (numParticipants <= 1) dynamicBracketType = "W.O.";
  else if (numParticipants === 2) dynamicBracketType = "Final Direta";
  else if (numParticipants === 3) dynamicBracketType = "3 Atletas";

  const meta = divisionMeta || {
    title: bracket?.label || "CHAVE",
    day: bracket?.scheduleTime || "A definir",
    mat: bracket?.scheduleArea || "A definir",
    bracketType: dynamicBracketType,
    participants: numParticipants,
    matchesCount: liveMatches?.length || 0,
    timePerMatch: "5:00"
  };

  const isCategoryFinished = liveMatches?.some(m => m.status === 'FINISHED' || m.status === 'DONE') || false;
  const [selectedMatchDetails, setSelectedMatchDetails] = useState(null);

  return (
    <div className="genesis-bracket-container">
      {/* 1. TÍTULO DA DIVISÃO */}
      <h1 className="bracket-division-title">{meta.title}</h1>

      {/* 2. BARRA DE METADADOS */}
      <div className="bracket-metadata-bar">
        <div className="meta-item">
          <span>Horário</span>
          <span className="meta-pill">{meta.day}</span>
        </div>
        <div className="meta-item">
          <span>Área</span>
          <span className="meta-pill">{meta.mat}</span>
        </div>
        <div className="meta-item">
          <span>Tipo de chave</span>
          <span className="meta-pill pill-highlight">{meta.bracketType}</span>
        </div>
        <div className="meta-item">
          <span>Atletas</span>
          <span className="meta-pill">{meta.participants}</span>
        </div>
      </div>

      {/* 3. ÁREA VISUAL DO CHAVEAMENTO (ROUNDS) */}
      <div style={{ width: '100%', overflowX: 'auto', padding: '20px 0' }}>
        <BracketTree 
          bracket={bracket} 
          athleteMap={athleteMap} 
          liveMatches={liveMatches}
        />
      </div>

    </div>
  );
}
