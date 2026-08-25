import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Tv, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Flame, 
  Clock, 
  Users, 
  AlertCircle, 
  ChevronRight, 
  Bell, 
  RefreshCw,
  Search,
  Sparkles
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { buildBracketMatches } from '../services/bracketService';
import './TatameCallBoard.css';

export default function TatameCallBoard() {
  const { events, athletes, brackets: storeBrackets = [] } = useStore();
  const [selectedEventId, setSelectedEventId] = useState('');
  const [tatamesCount, setTatamesCount] = useState(4);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastCalledAthlete, setLastCalledAthlete] = useState(null);
  const [liveScoreState, setLiveScoreState] = useState(null);

  // Escuta broadcast do placar oficial
  useEffect(() => {
    const bc = new BroadcastChannel('genesis_scoreboard');
    bc.onmessage = (event) => {
      if (event.data) {
        setLiveScoreState(event.data);
      }
    };
    return () => bc.close();
  }, []);

  // Seleciona o primeiro evento por padrão
  useEffect(() => {
    if (events.length && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  // Carrega chaves do evento selecionado
  const eventBrackets = useMemo(() => {
    if (!selectedEventId) return [];
    return storeBrackets.filter(b => b.eventId === selectedEventId);
  }, [selectedEventId, storeBrackets]);

  // Mapeia atletas por ID
  const athletesMap = useMemo(() => {
    const map = {};
    athletes.forEach(a => {
      map[a.id] = a;
    });
    return map;
  }, [athletes]);

  // Gera a fila consolidada de todas as lutas
  const allMatchesQueue = useMemo(() => {
    const queue = [];
    eventBrackets.forEach((bracket, bIdx) => {
      const matches = buildBracketMatches(
        bracket.seedIds || [], 
        bracket.size || 4, 
        bracket.manualSlots || {}, 
        bracket.pairingMode === 'SAME_ACADEMY', 
        bracket.matchResults || {}
      );

      matches.forEach((m, mIdx) => {
        const isDone = Boolean(bracket.matchResults?.[m.id]);
        const athA = athletesMap[m.slotA];
        const athB = athletesMap[m.slotB];

        queue.push({
          id: `${bracket.id}_${m.id}`,
          bracketId: bracket.id,
          bracketLabel: bracket.label || 'Categoria Oficial',
          matchId: m.id,
          round: m.round,
          isDone,
          winnerId: bracket.matchResults?.[m.id]?.winnerId,
          athleteA: {
            id: m.slotA,
            name: athA ? athA.nome : (m.slotA?.startsWith('__winner') ? `Vencedor Luta anterior` : 'A Definir'),
            academy: athA ? (athA.academia || 'Independente') : '',
            photoUrl: athA?.photoUrl || ''
          },
          athleteB: {
            id: m.slotB,
            name: athB ? athB.nome : (m.slotB?.startsWith('__winner') ? `Vencedor Luta anterior` : 'A Definir'),
            academy: athB ? (athB.academia || 'Independente') : '',
            photoUrl: athB?.photoUrl || ''
          }
        });
      });
    });

    return queue;
  }, [eventBrackets, athletesMap]);

  // Distribui as lutas pendentes entre os tatames
  const tatamesData = useMemo(() => {
    const pendingMatches = allMatchesQueue.filter(m => !m.isDone);
    const tatames = [];

    for (let i = 1; i <= tatamesCount; i++) {
      // Divide as lutas pelos tatames
      const tatameMatches = pendingMatches.filter((_, idx) => (idx % tatamesCount) === (i - 1));
      
      tatames.push({
        number: i,
        name: `Tatame ${i}`,
        current: tatameMatches[0] || null,
        next: tatameMatches[1] || null,
        waiting: tatameMatches.slice(2, 5) || []
      });
    }

    return tatames;
  }, [allMatchesQueue, tatamesCount]);

  // Função de voz para chamada de atletas na arena
  const speakCall = (tatameNum, athleteA, athleteB, category) => {
    if (!soundEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const text = `Atenção: Próxima luta no Tatame ${tatameNum}. Categoria ${category}. Atleta ${athleteA} contra Atleta ${athleteB}. Favor se apresentar para aquecimento.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);

    setLastCalledAthlete({
      tatame: tatameNum,
      a: athleteA,
      b: athleteB,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    });
  };

  // Toggle tela cheia
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className={`callboard-container ${isFullscreen ? 'callboard-fullscreen' : ''}`}>
      {/* ── Top Bar / Header ──────────────────────── */}
      <header className="callboard-header">
        <div className="callboard-brand">
          <div className="callboard-live-badge">
            <span className="live-dot" />
            AO VIVO · ARENA
          </div>
          <h1 className="callboard-title">
            Painel de Chamada de Tatames
          </h1>
        </div>

        <div className="callboard-controls">
          {/* Seletor de Evento */}
          <select 
            className="callboard-select"
            value={selectedEventId} 
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>

          {/* Quantidade de Tatames */}
          <div className="callboard-tatame-tabs">
            {[2, 3, 4, 6, 8].map(n => (
              <button 
                key={n}
                type="button" 
                className={`callboard-tab-btn ${tatamesCount === n ? 'active' : ''}`}
                onClick={() => setTatamesCount(n)}
              >
                {n} Tatames
              </button>
            ))}
          </div>

          {/* Som / Voz */}
          <button 
            type="button" 
            className={`callboard-icon-btn ${soundEnabled ? 'active' : ''}`}
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Chamada por voz ativada' : 'Chamada por voz desativada'}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Fullscreen */}
          <button 
            type="button" 
            className="callboard-icon-btn"
            onClick={toggleFullscreen}
            title="Tela Cheia (Modo Telão)"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </header>

      {/* ── Banner de Última Chamada ────────────────── */}
      {lastCalledAthlete && (
        <div className="callboard-alert-banner">
          <Bell className="bell-ring" size={20} />
          <div className="alert-text">
            <strong>ÚLTIMA CHAMADA:</strong> Tatame {lastCalledAthlete.tatame} — <span>{lastCalledAthlete.a}</span> VS <span>{lastCalledAthlete.b}</span> ({lastCalledAthlete.time})
          </div>
        </div>
      )}

      {/* ── Grid dos Tatames ────────────────────────── */}
      <main className="callboard-grid" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${tatamesCount > 3 ? '340px' : '420px'}), 1fr))` }}>
        {tatamesData.map((tatame) => (
          <div key={tatame.number} className="tatame-card">
            {/* Header do Tatame */}
            <div className="tatame-header">
              <div className="tatame-badge">
                <Flame size={16} />
                <span>{tatame.name}</span>
              </div>
              {tatame.next && (
                <button 
                  type="button"
                  className="call-btn"
                  onClick={() => speakCall(
                    tatame.number, 
                    tatame.next.athleteA.name, 
                    tatame.next.athleteB.name, 
                    tatame.next.bracketLabel
                  )}
                  title="Chamar Atletas no Alto-falante"
                >
                  <Volume2 size={14} />
                  Chamar no Som
                </button>
              )}
            </div>

            {/* 🔴 Luta Atual */}
            <div className="fight-section current-fight">
              <div className="section-label">
                <span className="dot dot-red" />
                LUTA EM ANDAMENTO
              </div>

              {tatame.current ? (
                <div className="fight-box active-fight-box">
                  <div className="fight-category">{tatame.current.bracketLabel}</div>
                  
                  <div className="athletes-matchup">
                    <div className="athlete-card athlete-blue">
                      <span className="athlete-tag">FAIXA AZUL</span>
                      <strong className="athlete-name">{tatame.current.athleteA.name}</strong>
                      <span className="athlete-team">{tatame.current.athleteA.academy}</span>
                    </div>

                    <div className="vs-divider">VS</div>

                    <div className="athlete-card athlete-white">
                      <span className="athlete-tag">FAIXA BRANCA</span>
                      <strong className="athlete-name">{tatame.current.athleteB.name}</strong>
                      <span className="athlete-team">{tatame.current.athleteB.academy}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-fight">Tatame livre / Aguardando chave</div>
              )}
            </div>

            {/* 🟡 Próxima Luta (Aquecimento) */}
            <div className="fight-section next-fight">
              <div className="section-label">
                <span className="dot dot-yellow" />
                PRÓXIMA LUTA (AQUECIMENTO NA ÁREA)
              </div>

              {tatame.next ? (
                <div className="fight-box warm-fight-box">
                  <div className="fight-category">{tatame.next.bracketLabel}</div>
                  <div className="next-athletes">
                    <span>🥋 <strong>{tatame.next.athleteA.name}</strong> ({tatame.next.athleteA.academy})</span>
                    <span className="vs-mini">x</span>
                    <span>🥋 <strong>{tatame.next.athleteB.name}</strong> ({tatame.next.athleteB.academy})</span>
                  </div>
                </div>
              ) : (
                <div className="empty-fight-mini">Sem próxima luta escalada</div>
              )}
            </div>

            {/* 🟢 Fila de Espera */}
            <div className="fight-section queue-fight">
              <div className="section-label">
                <span className="dot dot-green" />
                A SEGUIR NA FILA
              </div>

              <div className="queue-list">
                {tatame.waiting.length ? (
                  tatame.waiting.map((waitMatch, wIdx) => (
                    <div key={waitMatch.id} className="queue-item">
                      <span className="queue-pos">#{wIdx + 1}</span>
                      <div className="queue-info">
                        <span className="queue-cat">{waitMatch.bracketLabel}</span>
                        <span className="queue-names">{waitMatch.athleteA.name} vs {waitMatch.athleteB.name}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-fight-mini">Fila do tatame zerada</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
