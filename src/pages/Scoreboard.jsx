import React, { useState, useEffect, useRef } from 'react';
import { Maximize, Minimize, Settings, Play, Pause, RefreshCw, Users, Plus, Minus, Trophy } from 'lucide-react';
import './Scoreboard.css';
import { useStore } from '../hooks/useStore';
import { buildBracketMatches } from '../services/bracketService';

const DEFAULT_TIME = 300; // 5 minutes

const Scoreboard = () => {
  const { events, athletes, brackets: storeBrackets, finalizeMatch, applyBracketPodium, setBracketPodium, applyBracketToRanking } = useStore();

  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedBracketId, setSelectedBracketId] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState('');
  
  const [brackets, setBrackets] = useState([]);
  const [matches, setMatches] = useState([]);

  const [matchInfo, setMatchInfo] = useState({
    category: 'CATEGORIA',
    matchNumber: '0',
    phase: 'FASE',
    athleteA: { id: 'A', name: 'LUTADOR A', academy: 'ACADEMIA A' },
    athleteB: { id: 'B', name: 'LUTADOR B', academy: 'ACADEMIA B' }
  });

  const [scoreA, setScoreA] = useState({ points: 0, advantages: 0, penalties: 0 });
  const [scoreB, setScoreB] = useState({ points: 0, advantages: 0, penalties: 0 });
  const [swapped, setSwapped] = useState(false);

  // End Game states
  const [isEndingMatch, setIsEndingMatch] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState({ winnerId: null, reason: null });

  // History for undo feature
  const [history, setHistory] = useState([]); 

  const [configuredTime, setConfiguredTime] = useState(DEFAULT_TIME);
  const [mainTimer, setMainTimer] = useState(DEFAULT_TIME);
  const [isMainTimerRunning, setIsMainTimerRunning] = useState(false);
  
  const [stallingTimerA, setStallingTimerA] = useState(null);
  const [stallingTimerB, setStallingTimerB] = useState(null);

  const [winner, setWinner] = useState(null);
  const [winReason, setWinReason] = useState('');
  
  const [isEditingConfig, setIsEditingConfig] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [flashStates, setFlashStates] = useState({});

  const triggerFlash = (athlete, type) => {
    const key = `${athlete}-${type}`;
    setFlashStates(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setFlashStates(prev => ({ ...prev, [key]: false }));
    }, 500);
  };

  const currentStateRef = useRef({});
  useEffect(() => {
    currentStateRef.current = { matchInfo, scoreA, scoreB, mainTimer, stallingTimerA, stallingTimerB, winner, winReason, swapped };
  }, [matchInfo, scoreA, scoreB, mainTimer, stallingTimerA, stallingTimerB, winner, winReason, swapped]);

  const broadcastRef = useRef(null);
  useEffect(() => {
    const bc = new BroadcastChannel('genesis_scoreboard');
    broadcastRef.current = bc;
    bc.onmessage = (event) => {
      if (event.data && event.data.type === 'REQUEST_STATE') {
        bc.postMessage(currentStateRef.current);
      }
    };
    return () => bc.close();
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      setBrackets([]);
      return;
    }
    const filteredBrackets = storeBrackets.filter(b => b.eventId === selectedEventId);
    setBrackets(filteredBrackets);
  }, [selectedEventId, storeBrackets]);

  useEffect(() => {
    if (!selectedBracketId) {
      setMatches([]);
      return;
    }
    const bracket = brackets.find(b => b.id === selectedBracketId);
    if (bracket) {
      setMatches(buildBracketMatches(bracket.seedIds, bracket.size, bracket.manualSlots, false, bracket.matchResults || {}));
    } else {
      setMatches([]);
    }
  }, [selectedBracketId, brackets]);

  useEffect(() => {
    if (broadcastRef.current) {
      broadcastRef.current.postMessage({
        matchInfo,
        scoreA,
        scoreB,
        mainTimer,
        stallingTimerA,
        stallingTimerB,
        winner,
        winReason,
        swapped
      });
    }
  }, [matchInfo, scoreA, scoreB, mainTimer, stallingTimerA, stallingTimerB, winner, winReason, swapped]);

  const mainTimerRef = useRef(null);
  const stallingIntervalRefA = useRef(null);
  const stallingIntervalRefB = useRef(null);

  const handleMatchSelect = (matchId) => {
    setSelectedMatchId(matchId);
    if (!matchId || !selectedBracketId) return;
    
    const bracket = brackets.find(b => b.id === selectedBracketId);
    if (!bracket) return;
    
    const matchList = buildBracketMatches(bracket.seedIds, bracket.size, bracket.manualSlots, false, bracket.matchResults || {});
    const match = matchList.find(m => m.id === matchId);
    if (!match) return;

    const athA = athletes.find(a => a.id === match.slotA);
    const athB = athletes.find(a => a.id === match.slotB);
    
    const matchIndex = matchList.findIndex(m => m.id === matchId) + 1;
    
    let phaseName = match.stage;
    if (!phaseName) {
       const numMatches = matchList.length;
       if (numMatches <= 1) phaseName = 'FINAL';
       else if (numMatches === 2) phaseName = 'SEMI-FINAL';
       else if (numMatches <= 4) phaseName = 'QUARTAS DE FINAL';
       else if (numMatches <= 8) phaseName = 'OITAVAS DE FINAL';
       else phaseName = 'ELIMINATÓRIAS';
    }

    setMatchInfo({
       category: bracket.label,
       matchNumber: matchIndex.toString(),
       phase: phaseName,
       athleteA: { 
          id: match.slotA,
          name: athA ? athA.nome : (match.slotA && !match.slotA.startsWith('__') ? 'A DEFINIR' : (match.slotA?.startsWith('__winner') ? `Vencedor ${match.slotA.split('_')[2]}` : 'BYE')), 
          academy: athA ? athA.academia : '' 
       },
       athleteB: { 
          id: match.slotB,
          name: athB ? athB.nome : (match.slotB && !match.slotB.startsWith('__') ? 'A DEFINIR' : (match.slotB?.startsWith('__winner') ? `Vencedor ${match.slotB.split('_')[2]}` : 'BYE')), 
          academy: athB ? athB.academia : '' 
       }
    });
    setHistory([]);
    setSwapped(false);
    setScoreA({points:0, advantages:0, penalties:0});
    setScoreB({points:0, advantages:0, penalties:0});
    setMainTimer(configuredTime);
    setIsMainTimerRunning(false);
    setStallingTimerA(null);
    setStallingTimerB(null);
    setWinner(null);
  };

  useEffect(() => {
    if (isMainTimerRunning && mainTimer > 0) {
      mainTimerRef.current = setInterval(() => {
        setMainTimer((prev) => {
          if (prev <= 1) {
            clearInterval(mainTimerRef.current);
            setIsMainTimerRunning(false);
            handleTimeEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(mainTimerRef.current);
    }
    return () => clearInterval(mainTimerRef.current);
  }, [isMainTimerRunning, mainTimer]);

  useEffect(() => {
    if (stallingTimerA !== null && stallingTimerA > 0) {
      stallingIntervalRefA.current = setInterval(() => {
        setStallingTimerA((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(stallingIntervalRefA.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(stallingIntervalRefA.current);
    }
    return () => clearInterval(stallingIntervalRefA.current);
  }, [stallingTimerA !== null && stallingTimerA > 0]);

  useEffect(() => {
    if (stallingTimerA === 0) {
      addScore('A', 'penalties', 1);
      setStallingTimerA(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stallingTimerA]);

  useEffect(() => {
    if (stallingTimerB !== null && stallingTimerB > 0) {
      stallingIntervalRefB.current = setInterval(() => {
        setStallingTimerB((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(stallingIntervalRefB.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(stallingIntervalRefB.current);
    }
    return () => clearInterval(stallingIntervalRefB.current);
  }, [stallingTimerB !== null && stallingTimerB > 0]);

  useEffect(() => {
    if (stallingTimerB === 0) {
      addScore('B', 'penalties', 1);
      setStallingTimerB(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stallingTimerB]);

  const handleTimeEnd = () => {
    let winAthlete = null;
    if (scoreA.points > scoreB.points) winAthlete = 'A';
    else if (scoreB.points > scoreA.points) winAthlete = 'B';
    else {
      if (scoreA.advantages > scoreB.advantages) winAthlete = 'A';
      else if (scoreB.advantages > scoreA.advantages) winAthlete = 'B';
      else {
        if (scoreA.penalties < scoreB.penalties) winAthlete = 'A';
        else if (scoreB.penalties < scoreA.penalties) winAthlete = 'B';
      }
    }
    
    setIsEndingMatch(true);
    
    if (winAthlete) {
       setSelectedOutcome({ 
          winnerId: winAthlete === 'A' ? matchInfo.athleteA.id : matchInfo.athleteB.id, 
          reason: 'POINTS' 
       });
    }
  };

  const handleSaveResult = () => {
    if (!selectedOutcome.winnerId) return;
    
    if (selectedOutcome.winnerId === 'DOUBLE') {
      setWinner({ name: 'RESULTADO DUPLO' });
      setWinReason(`LUTA ENCERRADA POR ${selectedOutcome.reason}`);
      setIsEndingMatch(false);
      return;
    }

    const winnerObj = selectedOutcome.winnerId === matchInfo.athleteA.id ? matchInfo.athleteA : matchInfo.athleteB;
    const loserObj = selectedOutcome.winnerId === matchInfo.athleteA.id ? matchInfo.athleteB : matchInfo.athleteA;
    setWinner(winnerObj);
    setWinReason(`VENCEU POR ${selectedOutcome.reason}`);
    
    if (selectedBracketId && selectedMatchId && winnerObj.id) {
       finalizeMatch(selectedBracketId, selectedMatchId, winnerObj.id, scoreA, scoreB, loserObj.id);
       
       const bracket = brackets.find(b => b.id === selectedBracketId);
       let newPodium = { ...bracket?.podium };

       if (matchInfo.phase === 'FINAL') {
           newPodium.goldId = winnerObj.id;
           newPodium.silverId = loserObj.id;
       } else if (matchInfo.phase === 'DISPUTA 3º LUGAR') {
           newPodium.bronzeId = winnerObj.id;
       } else if (matchInfo.phase === 'SEMI-FINAL 2' && bracket?.seedIds?.filter(Boolean).length === 3) {
           newPodium.bronzeId = loserObj.id;
       }

       if (setBracketPodium) {
           setBracketPodium(selectedBracketId, newPodium);
       }

       const seeds = bracket?.seedIds?.filter(Boolean) || [];
       const isComplete = seeds.length >= 3 
           ? (newPodium.goldId && newPodium.silverId && newPodium.bronzeId)
           : (newPodium.goldId && newPodium.silverId);

       if (isComplete) {
           if (applyBracketPodium) applyBracketPodium(selectedBracketId, newPodium);
           if (applyBracketToRanking) applyBracketToRanking(selectedBracketId, selectedEventId, new Date().getFullYear());
           
           setTimeout(() => {
               window.location.href = `/eventos/${selectedEventId}?tab=resultados`;
           }, 2500);
       }
    }
    setIsEndingMatch(false);
  };

  const addScore = (athlete, type, value) => {
    setHistory(prev => [...prev, { scoreA: { ...scoreA }, scoreB: { ...scoreB } }]);
    if (athlete === 'A') {
      setScoreA(prev => ({ ...prev, [type]: Math.max(0, prev[type] + value) }));
    } else {
      setScoreB(prev => ({ ...prev, [type]: Math.max(0, prev[type] + value) }));
    }
    if (value > 0) {
      triggerFlash(athlete, type);
    }
  };

  const undoLastAction = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setScoreA(last.scoreA);
    setScoreB(last.scoreB);
    setHistory(prev => prev.slice(0, -1));
  };

  const toggleSides = () => {
    setSwapped(!swapped);
  };

  const startStalling = (athlete) => {
    if (athlete === 'A') setStallingTimerA(prev => prev !== null ? null : 20);
    if (athlete === 'B') setStallingTimerB(prev => prev !== null ? null : 20);
  };

  const handleDoubleStalling = () => {
    setHistory(prev => [...prev, { scoreA: { ...scoreA }, scoreB: { ...scoreB } }]);
    setScoreA(prev => ({ ...prev, penalties: prev.penalties + 1 }));
    setScoreB(prev => ({ ...prev, penalties: prev.penalties + 1 }));
    setStallingTimerA(null);
    setStallingTimerB(null);
    triggerFlash('A', 'penalties');
    triggerFlash('B', 'penalties');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSetTime = () => {
    const min = window.prompt("Tempo da luta em minutos (ex: 5):", (configuredTime / 60).toString());
    if (min !== null && !isNaN(min) && min.trim() !== '') {
      const timeInSec = parseInt(min) * 60;
      setConfiguredTime(timeInSec);
      setMainTimer(timeInSec);
      setIsMainTimerRunning(false);
    }
  };

  const renderAthleteRow = (athleteId, isTop) => {
    const ath = athleteId === 'A' ? matchInfo.athleteA : matchInfo.athleteB;
    const score = athleteId === 'A' ? scoreA : scoreB;
    const timer = athleteId === 'A' ? stallingTimerA : stallingTimerB;
    
    return (
      <div className={`sb-row ${isTop ? 'sb-row--top' : 'sb-row--bottom'}`}>
        <div className="sb-info">
          <div className="sb-name">{ath.name}</div>
          <div className="sb-academy">{ath.academy}</div>
          
          {isEndingMatch ? (
             <div className="won-by-overlay">
                <div className="won-by-title">VENCEU POR:</div>
                <div className="won-by-grid">
                   {['PONTOS', 'FINALIZAÇÃO', 'DESCLASSIFICAÇÃO', 'WO', 'NÃO COMPARECEU', 'DECISÃO'].map(reason => {
                      const isActive = selectedOutcome.winnerId === ath.id && selectedOutcome.reason === reason;
                      return (
                        <button 
                          key={reason}
                          className={`won-by-btn ${isActive ? 'active' : ''}`}
                          onClick={() => setSelectedOutcome({ winnerId: ath.id, reason })}
                        >
                          {reason}
                        </button>
                      );
                   })}
                </div>
             </div>
          ) : (
             <div className="sb-points-panel">
               <div className="sb-points-grid">
                 <button className="plus-btn" onClick={() => addScore(athleteId, 'points', 1)}>+1</button>
                 <button className="plus-btn" onClick={() => addScore(athleteId, 'points', 2)}>+2</button>
                 <button className="plus-btn" onClick={() => addScore(athleteId, 'points', 3)}>+3</button>
                 <button className="plus-btn" onClick={() => addScore(athleteId, 'points', 4)}>+4</button>
                 <button className="plus-btn" onClick={() => addScore(athleteId, 'advantages', 1)}>+V</button>
                 <button className="plus-btn" onClick={() => addScore(athleteId, 'penalties', 1)}>+P</button>
                 
                 <button className="minus-btn" onClick={() => addScore(athleteId, 'points', -1)}>-1</button>
                 <button className="minus-btn" onClick={() => addScore(athleteId, 'points', -2)}>-2</button>
                 <button className="minus-btn" onClick={() => addScore(athleteId, 'points', -3)}>-3</button>
                 <button className="minus-btn" onClick={() => addScore(athleteId, 'points', -4)}>-4</button>
                 <button className="minus-btn" onClick={() => addScore(athleteId, 'advantages', -1)}>-V</button>
                 <button className="minus-btn" onClick={() => addScore(athleteId, 'penalties', -1)}>-P</button>
               </div>
             </div>
          )}
        </div>
        
        <div className="sb-middle">
          {timer !== null && (
            <div className="sb-stalling-box" onClick={() => athleteId === 'A' ? setStallingTimerA(null) : setStallingTimerB(null)}>
              <span className="time">00:{timer.toString().padStart(2, '0')}</span>
              <span className="label">AMARRAÇÃO</span>
            </div>
          )}
          <div className="sb-adv-pen">
            <div className={`sb-stat-box ${score.advantages > 0 ? 'has-adv' : ''} ${flashStates[`${athleteId}-advantages`] ? 'adv-flash' : ''}`}>
              <span className="stat-label">VANTAGEM</span>
              <div className="stat-val">{score.advantages}</div>
            </div>
            <div className={`sb-stat-box ${score.penalties > 0 ? 'has-pen' : ''} ${flashStates[`${athleteId}-penalties`] ? 'pen-flash' : ''}`}>
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
      <div className="top-right-controls">
        <button className="top-btn" onClick={() => window.open('/placar/display', '_blank', 'width=1280,height=720')}><Users size={16}/> Telão</button>
        <button className="top-btn" onClick={toggleFullscreen}>{isFullscreen ? <Minimize size={16}/> : <Maximize size={16}/>} Tela Cheia</button>
      </div>

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
        
        {isEndingMatch ? (
          <div className="double-end-options">
             {['EMPATE', 'WO/DQ DUPLO', 'NO SHOW DUPLO'].map(reason => (
                <button 
                  key={reason}
                  className={`end-btn-text ${selectedOutcome.reason === reason ? 'active' : ''}`}
                  onClick={() => setSelectedOutcome({ winnerId: 'DOUBLE', reason })}
                >
                  {reason}
                </button>
             ))}
          </div>
        ) : (
          <button className="btn-double-stalling" onClick={handleDoubleStalling}>
            AMARRAÇÃO DUPLA
          </button>
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
          
          <div className="sb-footer-actions-box">
             {isEndingMatch ? (
               <div className="end-game-controls">
                {selectedOutcome.winnerId && (
                  <button className="btn-save-result" onClick={handleSaveResult}>SALVAR</button>
                )}
                <div className="action-row">
                   <button onClick={() => setIsEndingMatch(false)}>VOLTAR</button>
                   <button>ORDEM DE LUTAS</button>
                   <button onClick={() => setIsEditingConfig(true)}>VOLTAR À CHAVE</button>
                </div>
               </div>
             ) : (
               isEditingConfig ? (
                 <div className="config-inline">
                    <select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}>
                      <option value="">-- EVENTO --</option>
                      {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                    <select value={selectedBracketId} onChange={e => setSelectedBracketId(e.target.value)}>
                      <option value="">-- CHAVE --</option>
                      {brackets.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                    </select>
                    <select value={selectedMatchId} onChange={e => handleMatchSelect(e.target.value)}>
                      <option value="">-- LUTA --</option>
                      {matches.map((m, idx) => {
                        const athA = athletes.find(a => a.id === m.slotA)?.nome || 'A DEFINIR';
                        const athB = athletes.find(a => a.id === m.slotB)?.nome || 'A DEFINIR';
                        return (
                          <option key={m.id} value={m.id}>
                            Luta {idx + 1}: {athA} vs {athB}
                          </option>
                        );
                      })}
                    </select>
                    <button className="close-config-btn" onClick={() => setIsEditingConfig(false)}>OK</button>
                 </div>
               ) : (
                 <>
                   <div className="action-row">
                      <button onClick={undoLastAction} disabled={history.length === 0}>DESFAZER AÇÃO</button>
                      <button onClick={toggleSides}>INVERTER LADOS</button>
                   </div>
                   <div className="action-row">
                      <button onClick={() => setIsEditingConfig(true)}>VOLTAR À CHAVE</button>
                      <button>ORDEM DE LUTAS</button>
                      <button onClick={() => setIsEndingMatch(true)}>FINALIZAR LUTA</button>
                   </div>
                 </>
               )
             )}
          </div>
        </div>
        
        <div className="sb-timer-section">
          <div className="sb-timer-huge" onClick={() => setIsMainTimerRunning(!isMainTimerRunning)}>
             {formatTime(mainTimer)}
          </div>
          <div className="sb-timer-controls">
             <button onClick={() => { setMainTimer(configuredTime); setIsMainTimerRunning(false); }} title="Resetar Tempo">
                <RefreshCw size={24}/>
             </button>
             <button onClick={handleSetTime} title="Configurar Tempo">
                <Settings size={24}/>
             </button>
             <button onClick={() => setIsMainTimerRunning(!isMainTimerRunning)} title="Play / Pause">
                {isMainTimerRunning ? <Pause size={24}/> : <Play size={24}/>}
             </button>
             <button onClick={() => setMainTimer(prev => prev + 60)} title="Adicionar 1 Minuto">
                <Plus size={24}/>
             </button>
             <button onClick={() => setMainTimer(prev => Math.max(0, prev - 10))} title="Remover 10 Segundos">
                <Minus size={24}/>
             </button>
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
            <button className="winner-close-btn" onClick={() => {
               setWinner(null);
               setHistory([]);
               setScoreA({points:0, advantages:0, penalties:0});
               setScoreB({points:0, advantages:0, penalties:0});
               setMainTimer(configuredTime);
               setIsMainTimerRunning(false);
               setStallingTimerA(null);
               setStallingTimerB(null);
               setIsEditingConfig(true);

               if (selectedBracketId) {
                 const bracket = brackets.find(b => b.id === selectedBracketId);
                 if (bracket) {
                   const matchList = buildBracketMatches(bracket.seedIds, bracket.size, bracket.manualSlots, false, bracket.matchResults || {});
                   const nextMatch = matchList.find(m => !bracket.matchResults?.[m.id]);
                   if (nextMatch) {
                     handleMatchSelect(nextMatch.id);
                   }
                 }
               }
            }}>
              NOVA LUTA / RESET
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scoreboard;
