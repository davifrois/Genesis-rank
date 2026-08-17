/* eslint-disable react-refresh/only-export-components */
import { useMemo } from 'react';
import { nextPowerOfTwo, seedSlotsWithRankingAwareByes } from '../services/bracketService';
import { Users, CheckCircle2 } from 'lucide-react';

const STATUS_PENDING = 'PENDING';
const STATUS_READY = 'READY';
const STATUS_LIVE = 'LIVE';
const STATUS_DONE = 'DONE';

const STATUS_COLOR_MAP = {
  [STATUS_PENDING]: 'var(--line-muted, #41506f)',
  [STATUS_READY]: 'var(--line-ready, #3b82f6)',
  [STATUS_LIVE]: 'var(--line-live, #f7b500)',
  [STATUS_DONE]: 'var(--line-done, #3ddc97)'
};

const FALLBACK_STATUS_COLOR = 'var(--line-muted, #41506f)';

const normalizeLiveStatus = (value) => {
  const normalized = (value || '').toString().trim().toUpperCase();
  if (normalized === STATUS_READY) return STATUS_READY;
  if (normalized === STATUS_LIVE) return STATUS_LIVE;
  if (normalized === STATUS_DONE || normalized === 'FINISHED') return STATUS_DONE;
  return STATUS_PENDING;
};

const isPlaceholderToken = (value) => /^__.*__$/.test((value || '').toString().trim());
const looksLikeOpaqueId = (value) => /^[a-f0-9-]{14,}$/i.test((value || '').toString().trim());

const truncate = (value, maxLength = 28) => {
  const text = (value || '').toString().trim();
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(1, maxLength - 1))}...`;
};

const resolveAthleteInfo = (athleteMap, seedInfoMap, athleteId) => {
  const normalizedId = (athleteId || '').toString().trim();
  if (!normalizedId) return null;

  if (typeof athleteMap?.get === 'function') {
    const found = athleteMap.get(normalizedId);
    if (found) return found;
  }

  if (typeof seedInfoMap?.get === 'function') {
    const found = seedInfoMap.get(normalizedId);
    if (found) return found;
  }

  if (athleteMap && typeof athleteMap === 'object') {
    return athleteMap[normalizedId] || null;
  }

  return null;
};

const resolveAthleteLabel = (athleteMap, seedInfoMap, athleteId) => {
  const normalizedId = (athleteId || '').toString().trim();
  if (!normalizedId) return 'BYE';

  if (isPlaceholderToken(normalizedId)) {
    if (normalizedId.startsWith('__winner_')) return 'Vencedor anterior';
    if (normalizedId.startsWith('__loser_')) return 'Perdedor anterior';
    if (normalizedId.startsWith('__runner_')) return 'Segundo do grupo';
    return 'A definir';
  }

  const info = resolveAthleteInfo(athleteMap, seedInfoMap, normalizedId);
  const label = info?.nome || info?.athleteName || info?.name || '';
  if (label) return label;
  if (looksLikeOpaqueId(normalizedId)) return 'Atleta nao vinculado';
  return normalizedId;
};

const resolveAthleteAcademy = (athleteMap, seedInfoMap, athleteId) => {
  const info = resolveAthleteInfo(athleteMap, seedInfoMap, athleteId);
  if (!info) return '';
  return (info.academia || info.academy || '').toString().trim();
};

const isResolvedSeed = (seedId) => {
  const normalizedId = (seedId || '').toString().trim();
  if (!normalizedId) return false;
  if (isPlaceholderToken(normalizedId)) return false;
  return normalizedId.toUpperCase() !== 'BYE';
};

const resolveVisualStatus = (match) => {
  const baseStatus = normalizeLiveStatus(match?.status);
  if (baseStatus === STATUS_LIVE || baseStatus === STATUS_DONE) {
    return baseStatus;
  }

  const hasWinner = Boolean((match?.winnerId || '').toString().trim());
  if (hasWinner) return STATUS_DONE;

  const hasBothSidesReady = isResolvedSeed(match?.slotAId) && isResolvedSeed(match?.slotBId);
  if (hasBothSidesReady) return STATUS_READY;

  return STATUS_PENDING;
};

export const buildRounds = ({ seedIds, size, liveMatches, athleteMap, seedInfoMap }) => {
  const orderedSeeds = Array.isArray(seedIds)
    ? seedIds.map((id) => (id || '').toString().trim()).filter(Boolean)
    : [];
  const targetSize = nextPowerOfTwo(Math.max(Number(size) || 0, orderedSeeds.length || 2), 2);
  const totalRounds = Math.max(1, Math.round(Math.log2(targetSize)));
  const slots = seedSlotsWithRankingAwareByes(orderedSeeds, targetSize).slice(0, targetSize);

  const normalizedLiveMatches = Array.isArray(liveMatches)
    ? liveMatches
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        id: (item.id || '').toString().trim(),
        slotAId: (item.slotAId || item.slotA || '').toString().trim(),
        slotBId: (item.slotBId || item.slotB || '').toString().trim(),
        winnerId: (item.winnerId || '').toString().trim(),
        status: normalizeLiveStatus(item.status),
        area: (item.area || '').toString().trim(),
        fightNumber: Number.isFinite(Number(item.fightNumber)) ? Number(item.fightNumber) : null,
        scheduledAt: (item.scheduledAt || '').toString().trim()
      }))
      .filter((item) => item.id)
    : [];

  const liveMatchMap = new Map(normalizedLiveMatches.map((match) => [match.id, match]));

  let previousRoundParticipants = slots.map((athleteId) => ({
    athleteId: athleteId || '',
    label: resolveAthleteLabel(athleteMap, seedInfoMap, athleteId),
    academy: resolveAthleteAcademy(athleteMap, seedInfoMap, athleteId)
  }));

  const rounds = [];

  for (let roundNumber = 1; roundNumber <= totalRounds; roundNumber += 1) {
    const matchCount = Math.max(1, previousRoundParticipants.length / 2);
    const roundMatches = [];
    const nextRoundParticipants = [];

    for (let matchNumber = 1; matchNumber <= matchCount; matchNumber += 1) {
      const participantA = previousRoundParticipants[(matchNumber - 1) * 2] || { athleteId: '', label: 'BYE', academy: '' };
      const participantB = previousRoundParticipants[(matchNumber - 1) * 2 + 1] || { athleteId: '', label: 'BYE', academy: '' };
      const matchId = `r${roundNumber}-m${matchNumber}`;

      const legacyId = roundNumber === 1 ? `m-${matchNumber}` : '';
      const live = liveMatchMap.get(matchId) || (legacyId ? liveMatchMap.get(legacyId) : null) || null;

      const winnerId = (live?.winnerId || '').toString().trim();
      const winnerLabel = winnerId
        ? resolveAthleteLabel(athleteMap, seedInfoMap, winnerId)
        : `Vencedor ${matchId}`;
      const winnerAcademy = winnerId
        ? resolveAthleteAcademy(athleteMap, seedInfoMap, winnerId)
        : '';

      const safeStatus = normalizeLiveStatus(live?.status);

      const match = {
        id: matchId,
        round: roundNumber,
        matchNumber,
        slotAId: live?.slotAId || participantA.athleteId || '',
        slotALabel: participantA.label,
        slotAAcademy: participantA.academy,
        slotBId: live?.slotBId || participantB.athleteId || '',
        slotBLabel: participantB.label,
        slotBAcademy: participantB.academy,
        winnerId,
        winnerLabel,
        winnerAcademy,
        status: safeStatus,
        area: live?.area || '',
        fightNumber: live?.fightNumber ?? null,
        scheduledAt: live?.scheduledAt || ''
      };

      roundMatches.push(match);
      nextRoundParticipants.push({
        athleteId: winnerId,
        label: winnerLabel,
        academy: winnerAcademy
      });
    }

    rounds.push(roundMatches);
    previousRoundParticipants = nextRoundParticipants;
  }

  return rounds;
};

const statusLabel = (status) => {
  if (status === STATUS_LIVE) return 'AO VIVO';
  if (status === STATUS_DONE) return 'OK';
  if (status === STATUS_READY) return 'PRONTA';
  return 'AGUARD.';
};

const BracketTree = ({
  bracket,
  athleteMap,
  seedInfoMap = null,
  liveMatches,
  selectedMatchId = '',
  onMatchClick = null,
  onPickWinner = null,
  className = ''
}) => {
  const rounds = useMemo(() => buildRounds({
    seedIds: bracket?.seedIds,
    size: bracket?.size,
    liveMatches,
    athleteMap,
    seedInfoMap
  }), [bracket?.seedIds, bracket?.size, liveMatches, athleteMap, seedInfoMap]);

  const firstRoundMatchCount = rounds?.[0]?.length || 0;
  const totalRounds = rounds.length;
  const hasData = firstRoundMatchCount > 0;

  const layout = useMemo(() => {
    const rowHeight = 135;
    const cardWidth = 320;
    const cardHeight = 110;
    const columnGap = 118;
    const leftPadding = 18;
    const rightPadding = 34;
    const topPadding = 24;
    const bottomPadding = 24;

    const slotCount = Math.max(2, firstRoundMatchCount * 2);
    const width = leftPadding + rightPadding + (Math.max(1, totalRounds) * cardWidth) + (Math.max(0, totalRounds - 1) * columnGap);
    const height = topPadding + bottomPadding + (slotCount * rowHeight);

    const roundCenters = [];
    for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
      const roundMatchCount = rounds[roundIndex]?.length || 0;
      const centers = [];
      if (roundIndex === 0) {
        for (let matchIndex = 0; matchIndex < roundMatchCount; matchIndex += 1) {
          centers.push(topPadding + ((matchIndex * 2) + 1) * rowHeight);
        }
      } else {
        const previous = roundCenters[roundIndex - 1] || [];
        for (let matchIndex = 0; matchIndex < roundMatchCount; matchIndex += 1) {
          const childA = previous[matchIndex * 2] ?? (topPadding + (matchIndex * 2) * rowHeight);
          const childB = previous[(matchIndex * 2) + 1] ?? childA;
          centers.push((childA + childB) / 2);
        }
      }
      roundCenters.push(centers);
    }

    const xByRound = Array.from({ length: totalRounds }, (_, roundIndex) => (
      leftPadding + roundIndex * (cardWidth + columnGap)
    ));

    return {
      cardWidth,
      cardHeight,
      width,
      height,
      xByRound,
      roundCenters
    };
  }, [rounds, firstRoundMatchCount, totalRounds]);

  if (!hasData) {
    return (
      <div className={`bracket-tree bracket-tree--empty ${className}`.trim()}>
        Sem atletas suficientes para montar a arvore.
      </div>
    );
  }

  const connectors = [];
  const cards = [];

  const handleWinnerPick = (event, match, winnerId) => {
    if (typeof onPickWinner !== 'function') return;
    event.stopPropagation();
    onPickWinner(match, winnerId);
  };

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
    const round = rounds[roundIndex] || [];
    const x = layout.xByRound[roundIndex];
    const centers = layout.roundCenters[roundIndex] || [];

    for (let matchIndex = 0; matchIndex < round.length; matchIndex += 1) {
      const match = round[matchIndex];
      const centerY = centers[matchIndex] || 0;
      const topY = centerY - layout.cardHeight / 2;
      const safeStatus = resolveVisualStatus(match);
      const statusColor = STATUS_COLOR_MAP[safeStatus] || FALLBACK_STATUS_COLOR;

      if (roundIndex > 0) {
        const prevCenters = layout.roundCenters[roundIndex - 1] || [];
        const childA = prevCenters[matchIndex * 2];
        const childB = prevCenters[matchIndex * 2 + 1];
        const prevX = layout.xByRound[roundIndex - 1] + layout.cardWidth;
        const elbowX = x - 28;

        if (Number.isFinite(childA)) {
          const childStatusA = resolveVisualStatus(rounds[roundIndex - 1]?.[matchIndex * 2]);
          const childColorA = STATUS_COLOR_MAP[childStatusA] || FALLBACK_STATUS_COLOR;
          connectors.push(
            <path
              key={`${match.id}-a`}
              d={`M ${prevX} ${childA} H ${elbowX} V ${centerY} H ${x}`}
              fill="none"
              stroke={childColorA}
              strokeWidth="2.2"
              className={`bracket-tree__line bracket-tree__line--${childStatusA.toLowerCase()}`}
            />
          );
        }
        if (Number.isFinite(childB)) {
          const childStatusB = resolveVisualStatus(rounds[roundIndex - 1]?.[matchIndex * 2 + 1]);
          const childColorB = STATUS_COLOR_MAP[childStatusB] || FALLBACK_STATUS_COLOR;
          connectors.push(
            <path
              key={`${match.id}-b`}
              d={`M ${prevX} ${childB} H ${elbowX} V ${centerY} H ${x}`}
              fill="none"
              stroke={childColorB}
              strokeWidth="2.2"
              className={`bracket-tree__line bracket-tree__line--${childStatusB.toLowerCase()}`}
            />
          );
        }
      }

      const isSelected = Boolean(selectedMatchId && selectedMatchId === match.id);
      const isWinnerA = Boolean(match.winnerId && match.winnerId === match.slotAId);
      const isWinnerB = Boolean(match.winnerId && match.winnerId === match.slotBId);
      const canPickA = typeof onPickWinner === 'function' && isResolvedSeed(match.slotAId);
      const canPickB = typeof onPickWinner === 'function' && isResolvedSeed(match.slotBId);
      const isByeA = !isResolvedSeed(match.slotAId);
      const isByeB = !isResolvedSeed(match.slotBId);

      const isLive = safeStatus === STATUS_LIVE;

      cards.push(
        <g
          key={match.id}
          className={`bracket-tree__match bracket-tree__match--${safeStatus.toLowerCase()} ${isSelected ? 'is-selected' : ''}`.trim()}
          onClick={typeof onMatchClick === 'function' ? () => onMatchClick(match) : undefined}
          role={typeof onMatchClick === 'function' ? 'button' : undefined}
          tabIndex={typeof onMatchClick === 'function' ? 0 : undefined}
        >
          {/* Live halo — animated outer ring */}
          {isLive && (
            <rect
              x={x - 3}
              y={topY - 3}
              rx="14"
              ry="14"
              width={layout.cardWidth + 6}
              height={layout.cardHeight + 6}
              className="bracket-tree__live-halo"
            >
              <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.2s" repeatCount="indefinite" />
              <animate attributeName="stroke-width" values="2;3.5;2" dur="1.2s" repeatCount="indefinite" />
            </rect>
          )}

          <foreignObject x={x} y={topY} width={layout.cardWidth} height={layout.cardHeight} style={{ overflow: 'visible' }}>
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: '100%', height: '100%', position: 'relative' }}>
              {/* Match Badge */}
              <span style={{
                backgroundColor: '#2b2b2b', color: '#a0a0a0', fontSize: '0.75rem', fontWeight: 700,
                padding: '5px 8px', borderRadius: '12px', position: 'absolute', left: '-15px', top: '-10px',
                zIndex: 2, border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                {match.fightNumber ? match.fightNumber : match.matchNumber}
              </span>
              
              <div style={{
                backgroundColor: '#242424', border: `1px solid ${isLive ? '#f97316' : 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: '10px', width: '100%', height: '100%', overflow: 'hidden',
                boxShadow: isLive ? '0 0 10px rgba(249, 115, 22, 0.5)' : '0 4px 15px rgba(0, 0, 0, 0.3)',
                display: 'flex', flexDirection: 'column'
              }}>
                {/* Slot A */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', flex: 1, opacity: isByeA || (match.winnerId && !isWinnerA) ? 0.45 : 1 }}>
                  <div style={{ position: 'relative', width: '30px', height: '30px', flexShrink: 0 }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: '#3f3f46', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isByeA ? <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#71717a' }}>BYE</span> : <Users size={16} color="#a1a1aa" />}
                    </div>
                    {isWinnerA && (
                      <span style={{ position: 'absolute', bottom: '-4px', right: '-4px', backgroundColor: '#00c853', color: '#fff', fontSize: '10px', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #242424' }}>
                        <CheckCircle2 size={10} color="#fff" />
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {!isByeA && <span style={{ fontSize: '12px', marginRight: '4px' }}>🇧🇷</span>}
                      {match.slotALabel}
                    </span>
                    {!isByeA && <span style={{ fontSize: '0.7rem', color: '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {match.slotAAcademy || '-'}
                    </span>}
                  </div>
                </div>

                <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.05)', width: '100%' }}></div>

                {/* Slot B */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', flex: 1, opacity: isByeB || (match.winnerId && !isWinnerB) ? 0.45 : 1 }}>
                  <div style={{ position: 'relative', width: '30px', height: '30px', flexShrink: 0 }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: '#3f3f46', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isByeB ? <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#71717a' }}>BYE</span> : <Users size={16} color="#a1a1aa" />}
                    </div>
                    {isWinnerB && (
                      <span style={{ position: 'absolute', bottom: '-4px', right: '-4px', backgroundColor: '#00c853', color: '#fff', fontSize: '10px', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #242424' }}>
                        <CheckCircle2 size={10} color="#fff" />
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {!isByeB && <span style={{ fontSize: '12px', marginRight: '4px' }}>🇧🇷</span>}
                      {match.slotBLabel}
                    </span>
                    {!isByeB && <span style={{ fontSize: '0.7rem', color: '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {match.slotBAcademy || '-'}
                    </span>}
                  </div>
                </div>
              </div>
            </div>
          </foreignObject>

          {canPickA && (
            <g className="bracket-tree__winner-btn" onClick={(event) => handleWinnerPick(event, match, match.slotAId)}>
              <circle cx={x + layout.cardWidth - 20} cy={topY + 37} r="10" className={isWinnerA ? 'is-active' : ''} />
              <text x={x + layout.cardWidth - 20} y={topY + 41} textAnchor="middle" className="bracket-tree__winner-icon">V</text>
            </g>
          )}
          {canPickB && (
            <g className="bracket-tree__winner-btn" onClick={(event) => handleWinnerPick(event, match, match.slotBId)}>
              <circle cx={x + layout.cardWidth - 20} cy={topY + 73} r="10" className={isWinnerB ? 'is-active' : ''} />
              <text x={x + layout.cardWidth - 20} y={topY + 77} textAnchor="middle" className="bracket-tree__winner-icon">V</text>
            </g>
          )}
        </g>
      );
    }
  }

  return (
    <div className={`bracket-tree ${className}`.trim()}>
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        width={layout.width}
        height={layout.height}
        preserveAspectRatio="xMinYMin meet"
        className="bracket-tree__svg"
      >
        {connectors}
        {cards}
      </svg>
    </div>
  );
};

export default BracketTree;
export { normalizeLiveStatus, STATUS_PENDING, STATUS_READY, STATUS_LIVE, STATUS_DONE };
