import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Activity, ArrowLeft, Clock3, Hourglass, Radio, X } from 'lucide-react';
import { normalizeLiveStatus, STATUS_DONE, STATUS_LIVE, STATUS_READY } from '../components/BracketTree';
import { bracketRealtimeService } from '../services/bracketRealtimeService';
import { nextPowerOfTwo, seedSlotsWithRankingAwareByes } from '../services/bracketService';
import { useStore } from '../hooks/useStore';
import { countryCodeFromAthlete, flagFromCountryCode } from '../utils/countryFlags';

const parseScheduledAt = (value) => {
  const parsed = new Date(value || '');
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const stageLabel = (round, totalRounds) => {
  if (round === totalRounds) return 'Final';
  if (round === totalRounds - 1) return 'Semifinals';
  if (round === totalRounds - 2) return 'Quarterfinals';
  return `Fase ${round}`;
};

const isResolved = (id) => {
  const value = (id || '').toString().trim();
  return Boolean(value && value.toUpperCase() !== 'BYE' && !/^__/.test(value));
};

const toAthlete = (id, map) => {
  const value = (id || '').toString().trim();
  if (!value) return { id: '', nome: 'BYE', academia: 'BYE', photoUrl: '', flag: '' };
  const data = map.get(value) || {};
  const nome = (data.nome || data.athleteName || value).toString().trim();
  const academia = (data.academia || data.academy || 'Sem academia').toString().trim();
  const photoUrl = (data.photoUrl || data.fotoUrl || data.avatarUrl || data.foto || '').toString().trim();
  const countryCode = countryCodeFromAthlete(data, 'BR');
  return { id: value, nome, academia, photoUrl, flag: flagFromCountryCode(countryCode) };
};

const buildStages = (bracket, athleteMap) => {
  const seedIds = Array.isArray(bracket?.seedIds) ? bracket.seedIds : [];
  const size = nextPowerOfTwo(Math.max(Number(bracket?.size) || 0, seedIds.length || 2), 2);
  const totalRounds = Math.max(1, Math.round(Math.log2(size)));
  const slots = seedSlotsWithRankingAwareByes(seedIds, size).slice(0, size);
  const liveList = Array.isArray(bracket?.liveMatches) ? bracket.liveMatches : [];
  const liveMap = new Map(liveList.map((item) => [((item?.id || '').toString().trim()), item]));

  let participants = slots.map((id) => toAthlete(id, athleteMap));
  const rounds = [];

  for (let round = 1; round <= totalRounds; round += 1) {
    const matchCount = Math.max(1, participants.length / 2);
    const matches = [];
    const nextParticipants = [];

    for (let matchNumber = 1; matchNumber <= matchCount; matchNumber += 1) {
      const slotA = participants[(matchNumber - 1) * 2] || toAthlete('', athleteMap);
      const slotB = participants[(matchNumber - 1) * 2 + 1] || toAthlete('', athleteMap);
      const id = `r${round}-m${matchNumber}`;
      const live = liveMap.get(id) || (round === 1 ? liveMap.get(`m-${matchNumber}`) : null) || {};
      const winnerId = ((live.winnerId || '').toString().trim());
      const scoreA = Number.isFinite(Number(live.scoreA)) ? Number(live.scoreA) : null;
      const scoreB = Number.isFinite(Number(live.scoreB)) ? Number(live.scoreB) : null;
      const status = normalizeLiveStatus(live.status);

      const autoBye = !isResolved(slotA.id) || !isResolved(slotB.id);
      const finalWinner = winnerId
        ? toAthlete(winnerId, athleteMap)
        : autoBye
          ? (isResolved(slotA.id) ? slotA : slotB)
          : toAthlete('', athleteMap);

      nextParticipants.push(finalWinner);
      matches.push({
        id,
        status,
        slotA,
        slotB,
        fightNumber: Number.isFinite(Number(live.fightNumber)) ? Number(live.fightNumber) : null,
        scheduledAt: parseScheduledAt(live.scheduledAt),
        scoreA,
        scoreB,
        bye: autoBye
      });
    }

    rounds.push({ key: `round-${round}`, title: stageLabel(round, totalRounds), matches });
    participants = nextParticipants;
  }

  return rounds;
};

const BracketLive = () => {
  const { bracketId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { events, athletes, brackets, currentUser } = useStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bracket, setBracket] = useState(null);
  const [connection, setConnection] = useState('connecting');
  const [lastUpdate, setLastUpdate] = useState('');
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      const localBracket = (Array.isArray(brackets) ? brackets : []).find((item) => item?.id === bracketId) || null;

      try {
        const payload = await bracketRealtimeService.getPublicLiveBracket(bracketId);
        if (cancelled) return;
        setBracket(payload || localBracket);
        setLastUpdate(new Date().toISOString());
      } catch {
        if (cancelled) return;
        if (localBracket) {
          setBracket(localBracket);
          setError('Sem conexao com servidor ao vivo. Exibindo dados locais.');
        } else {
          setBracket(null);
          setError('Tentando reconectar...');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [bracketId, brackets]);

  useEffect(() => {
    if (!bracketId) return () => {};
    setConnection('connecting');

    return bracketRealtimeService.connectBracketLiveSocket({
      bracketId,
      onOpen: () => setConnection('connected'),
      onClose: () => setConnection('closed'),
      onError: () => setConnection('error'),
      onMessage: (payload) => {
        if (!payload || typeof payload !== 'object') return;
        if (payload.bracket && payload.bracket.id === bracketId) {
          setBracket(payload.bracket);
          setLastUpdate(payload.timestamp || new Date().toISOString());
          setError('');
        }
      }
    });
  }, [bracketId]);

  const eventName = useMemo(() => {
    if (!bracket?.eventId) return 'Evento';
    return events.find((item) => item.id === bracket.eventId)?.name || bracket.eventId;
  }, [events, bracket?.eventId]);

  const athleteMap = useMemo(() => {
    const map = new Map();
    (Array.isArray(athletes) ? athletes : []).forEach((athlete) => {
      if (athlete?.id) map.set(athlete.id, athlete);
    });
    (Array.isArray(bracket?.seedInfos) ? bracket.seedInfos : []).forEach((info) => {
      const athleteId = (info?.athleteId || '').toString().trim();
      if (!athleteId) return;
      map.set(athleteId, { ...map.get(athleteId), ...info, nome: info.athleteName, academia: info.academy });
    });
    return map;
  }, [athletes, bracket?.seedInfos]);

  const myAthleteFilter = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return (query.get('athlete') || currentUser?.name || '').toString().trim().toLowerCase();
  }, [location.search, currentUser?.name]);

  const stages = useMemo(() => buildStages(bracket, athleteMap), [bracket, athleteMap]);

  const filteredStages = useMemo(() => {
    const searchText = search.trim().toLowerCase();
    return stages
      .map((stage) => ({
        ...stage,
        matches: stage.matches.filter((match) => {
          const names = `${match.slotA.nome} ${match.slotB.nome}`.toLowerCase();
          const searchMatch = !searchText || names.includes(searchText);
          const mineMatch = showAll || !myAthleteFilter || names.includes(myAthleteFilter);
          return searchMatch && mineMatch;
        })
      }))
      .filter((stage) => stage.matches.length > 0);
  }, [stages, search, showAll, myAthleteFilter]);

  const updatedLabel = useMemo(() => {
    if (!lastUpdate) return 'Sem atualizacao registrada';
    const parsed = new Date(lastUpdate);
    if (Number.isNaN(parsed.getTime())) return 'Sem atualizacao registrada';
    return parsed.toLocaleString('pt-BR');
  }, [lastUpdate]);

  const connectionLabel = connection === 'connected'
    ? 'Conectado em tempo real'
    : connection === 'connecting'
      ? 'Conectando...'
      : connection === 'closed'
        ? 'Conexao encerrada'
        : 'Conexao indisponivel';

  const scoreLabel = (match) => {
    if (match.bye) return 'BYE';
    if (match.scoreA === null || match.scoreB === null) return '-';
    return `${match.scoreA}-${match.scoreB}`;
  };

  return (
    <section className="live-bracket-page live-bracket-modal-layout">
      <header className="live-bracket-page__header">
        <div className="live-bracket-head-main">
          <button type="button" className="live-bracket-close" aria-label="Fechar" onClick={() => navigate(-1)}>
            <X size={14} />
          </button>
          <Link to="/eventos" className="btn btn-ghost btn-sm live-bracket-page__back">
            <ArrowLeft size={14} />
            Voltar para eventos
          </Link>
          <h1>{bracket?.label || 'Categoria em definicao'}</h1>
          <p>{eventName}</p>
          <button type="button" className="btn btn-primary live-bracket-view-link">View bracket</button>
        </div>
        <div className="live-bracket-page__meta">
          <span className={`tag live-connection live-connection--${connection}`}><Radio size={12} />{connectionLabel}</span>
          <span className="tag"><Clock3 size={12} />Atualizado: {updatedLabel}</span>
        </div>
      </header>

      <div className="live-bracket-toolbar">
        <input className="input" placeholder="Search" value={search} onChange={(event) => setSearch(event.target.value)} />
        <label className="checkbox-inline">
          <input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} />
          <span>Display all bracket matches</span>
        </label>
      </div>

      {loading && <div className="panel-subtitle">Carregando chave ao vivo...</div>}
      {!loading && error && <div className="status status-info">{error}</div>}

      {!loading && bracket && (
        <div className="live-bracket-stages">
          {filteredStages.map((stage) => (
            <article key={stage.key} className="live-stage">
              <h3>{stage.title}</h3>
              {stage.matches.map((match) => (
                <div key={match.id} className={`live-match-card live-match-card--${match.status.toLowerCase()}`}>
                  <div className="live-match-main">
                    <div className="live-match-side">
                      <div className="live-avatar">{match.slotA.photoUrl ? <img src={match.slotA.photoUrl} alt={match.slotA.nome} /> : <span>{match.slotA.nome.charAt(0) || '?'}</span>}</div>
                      <div className="live-athlete-text">
                        <strong>{match.slotA.flag ? `${match.slotA.flag} ` : ''}{match.slotA.nome}</strong>
                        <div className="table-meta">{match.slotA.academia}</div>
                      </div>
                    </div>
                    <div className="live-match-side">
                      <div className="live-avatar">{match.slotB.photoUrl ? <img src={match.slotB.photoUrl} alt={match.slotB.nome} /> : <span>{match.slotB.nome.charAt(0) || '?'}</span>}</div>
                      <div className="live-athlete-text">
                        <strong>{match.slotB.flag ? `${match.slotB.flag} ` : ''}{match.slotB.nome}</strong>
                        <div className="table-meta">{match.slotB.academia}</div>
                      </div>
                    </div>
                  </div>
                  <div className="live-match-meta">
                    <span className="live-match-meta-icon"><Hourglass size={13} /></span>
                    <strong className="live-match-score">{scoreLabel(match)}</strong>
                    <small>{match.scheduledAt || '-'}</small>
                  </div>
                </div>
              ))}
            </article>
          ))}
          {filteredStages.length === 0 && <div className="panel-subtitle">Nenhuma luta encontrada com os filtros atuais.</div>}
        </div>
      )}

      {!loading && !bracket && <div className="status status-warning">Nao foi possivel carregar esta chave.</div>}

      <footer className="live-bracket-page__footer">
        <span><Activity size={14} /> Pagina publica dedicada para telao, QR e acompanhamento externo.</span>
      </footer>
    </section>
  );
};

export default BracketLive;
