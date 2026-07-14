import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import './Scoreboard.css'; // Reuse the same CSS for the display side

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const ScoreboardDisplay = () => {
  const [state, setState] = useState({
    matchInfo: {
      matchNumber: '0',
      category: 'CATEGORIA',
      phase: 'FASE',
      athleteA: { name: 'LUTADOR A', academy: 'ACADEMIA A' },
      athleteB: { name: 'LUTADOR B', academy: 'ACADEMIA B' }
    },
    scoreA: { points: 0, advantages: 0, penalties: 0 },
    scoreB: { points: 0, advantages: 0, penalties: 0 },
    mainTimer: 300,
    stallingTimerA: null,
    stallingTimerB: null,
    winner: null,
    winReason: '',
    swapped: false
  });

  useEffect(() => {
    const bc = new BroadcastChannel('genesis_scoreboard');
    bc.onmessage = (event) => {
      if (event.data && event.data.type !== 'REQUEST_STATE') {
        setState(event.data);
      }
    };
    bc.postMessage({ type: 'REQUEST_STATE' });
    return () => {
      bc.close();
    };
  }, []);

  const { matchInfo, scoreA, scoreB, mainTimer, stallingTimerA, stallingTimerB, winner, winReason, swapped } = state;

  const renderAthleteRow = (athleteId, isTop) => {
    const ath = athleteId === 'A' ? matchInfo.athleteA : matchInfo.athleteB;
    const score = athleteId === 'A' ? scoreA : scoreB;
    const timer = athleteId === 'A' ? stallingTimerA : stallingTimerB;
    
    return (
      <div className={`sb-row ${isTop ? 'sb-row--top' : 'sb-row--bottom'}`}>
        <div className="sb-info">
          <div className="sb-name">{ath.name}</div>
          <div className="sb-academy">{ath.academy}</div>
        </div>
        
        <div className="sb-middle">
          {timer !== null && (
            <div className="sb-stalling-box">
              <span className="time">00:{timer.toString().padStart(2, '0')}</span>
              <span className="label">AMARRAÇÃO</span>
            </div>
          )}
          <div className="sb-adv-pen">
            <div className={`sb-stat-box ${score.advantages > 0 ? 'has-adv' : ''}`}>
              <span className="stat-label">VANTAGEM</span>
              <div className="stat-val">{score.advantages}</div>
            </div>
            <div className={`sb-stat-box ${score.penalties > 0 ? 'has-pen' : ''}`}>
              <span className="stat-label">PUNIÇÃO</span>
              <div className="stat-val">{score.penalties}</div>
            </div>
          </div>
        </div>
        
        <div className="sb-score-huge">
          {score.points}
        </div>
      </div>
    );
  };

  return (
    <div className="scoreboard-container">
      <div className="scoreboard-main">
        {swapped ? (
          <>
            {renderAthleteRow('B', true)}
            {renderAthleteRow('A', false)}
          </>
        ) : (
          <>
            {renderAthleteRow('A', true)}
            {renderAthleteRow('B', false)}
          </>
        )}
      </div>

      <div className="sb-footer">
        <div className="sb-footer-left">
          <div className="sb-footer-info-row">
            <div className="sb-match-num">{matchInfo.matchNumber}-{matchInfo.matchNumber}</div>
            <div className="sb-match-details">
              <div className="cat">PLACAR / {matchInfo.category}</div>
              <div className="phase">{matchInfo.phase}</div>
            </div>
          </div>
        </div>
        
        <div className="sb-timer-section">
          <div className="sb-timer-huge" style={{ cursor: 'default' }}>
             {formatTime(mainTimer)}
          </div>
        </div>
      </div>

      {winner && (
        <div className="winner-overlay">
           <div className="winner-card">
              <Trophy size={80} className="winner-icon" />
              <div className="winner-label">{winReason}</div>
              <div className="winner-name">{winner.name}</div>
              <div className="winner-academy">{winner.academy}</div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ScoreboardDisplay;
