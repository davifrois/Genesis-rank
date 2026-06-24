export const shuffleList = (items) => {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

export const nextPowerOfTwo = (value, minimum = 2) => {
    const target = Math.max(minimum, value || 0);
    let result = 1;
    while (result < target) {
        result *= 2;
    }
    return result;
};

export const BRACKET_FORMAT = {
    SINGLE: 'SINGLE_ELIMINATION',
    DOUBLE: 'DOUBLE_ELIMINATION',
    ROUND_ROBIN: 'ROUND_ROBIN',
    THREE_COMEBACK: 'THREE_PLAYERS_COMEBACK',
    MULTISTAGE: 'MULTISTAGE'
};

const buildSeedPlacementOrder = (size) => {
    if (!Number.isFinite(size) || size < 2) return [1, 2];
    let order = [1, 2];
    while (order.length < size) {
        const nextSize = order.length * 2;
        const next = [];
        order.forEach((seed) => {
            next.push(seed);
            next.push(nextSize + 1 - seed);
        });
        order = next;
    }
    return order;
};

export const seedSlotsWithRankingAwareByes = (seedIds = [], bracketSize = 0) => {
    const size = nextPowerOfTwo(bracketSize || seedIds.length, 2);
    const placements = buildSeedPlacementOrder(size);
    const slots = new Array(size).fill(null);
    seedIds.forEach((seedId, index) => {
        const seedNumber = index + 1;
        const positionIndex = placements.indexOf(seedNumber);
        const slotIndex = positionIndex >= 0 ? positionIndex : index;
        if (slotIndex >= 0 && slotIndex < size) {
            slots[slotIndex] = seedId || null;
        }
    });
    return slots;
};

export const buildBracketMatches = (seedIds, bracketSize) => {
    const size = nextPowerOfTwo(bracketSize, 2);
    const slots = seedSlotsWithRankingAwareByes(seedIds, size);
    while (slots.length < size) {
        slots.push(null);
    }
    const matches = [];
    for (let i = 0; i < slots.length; i += 2) {
        matches.push({
            id: `m-${i / 2 + 1}`,
            slotA: slots[i] || null,
            slotB: slots[i + 1] || null
        });
    }
    return matches;
};

export const buildRoundRobinMatches = (seedIds = []) => {
    const ids = [...(Array.isArray(seedIds) ? seedIds : [])].filter(Boolean);
    const matches = [];
    let count = 1;
    for (let i = 0; i < ids.length; i += 1) {
        for (let j = i + 1; j < ids.length; j += 1) {
            matches.push({
                id: `rr-${count}`,
                slotA: ids[i],
                slotB: ids[j],
                stage: 'ROUND_ROBIN'
            });
            count += 1;
        }
    }
    return matches;
};

export const buildThreePlayerComebackMatches = (seedIds = []) => {
    const ids = [...(Array.isArray(seedIds) ? seedIds : [])].filter(Boolean).slice(0, 3);
    if (ids.length < 2) return [];
    if (ids.length === 2) {
        return [
            {
                id: 'tc-1',
                slotA: ids[0],
                slotB: ids[1],
                stage: 'FINAL'
            }
        ];
    }
    return [
        {
            id: 'tc-1',
            slotA: ids[0],
            slotB: ids[1],
            stage: 'ABERTURA'
        },
        {
            id: 'tc-2',
            slotA: '__winner_tc-1__',
            slotB: ids[2],
            stage: 'SEMI-FINAL'
        },
        {
            id: 'tc-3',
            slotA: '__loser_tc-1__',
            slotB: '__loser_tc-2__',
            stage: '2_LUGAR'
        }
    ];
};

export const buildDoubleEliminationPreview = (seedIds = [], bracketSize = 0) => {
    const upper = buildBracketMatches(seedIds, bracketSize).map((match) => ({
        ...match,
        stage: 'UPPER'
    }));
    const lowerCount = Math.max(1, Math.ceil(upper.length / 2));
    const lower = Array.from({ length: lowerCount }, (_, index) => ({
        id: `de-l-${index + 1}`,
        slotA: `__loser_u${index * 2 + 1}__`,
        slotB: `__loser_u${index * 2 + 2}__`,
        stage: 'LOWER'
    }));
    return [...upper, ...lower];
};

export const buildMultistagePreview = (seedIds = []) => {
    const ids = [...(Array.isArray(seedIds) ? seedIds : [])].filter(Boolean);
    const groupA = ids.filter((_, index) => index % 2 === 0);
    const groupB = ids.filter((_, index) => index % 2 === 1);
    const groupMatches = [
        ...buildRoundRobinMatches(groupA).map((match) => ({ ...match, stage: 'GRUPO_A' })),
        ...buildRoundRobinMatches(groupB).map((match) => ({ ...match, stage: 'GRUPO_B' }))
    ];
    const knockout = [
        {
            id: 'ms-k-1',
            slotA: '__winner_grupo_a__',
            slotB: '__runner_grupo_b__',
            stage: 'SEMI-FINAL'
        },
        {
            id: 'ms-k-2',
            slotA: '__winner_grupo_b__',
            slotB: '__runner_grupo_a__',
            stage: 'SEMI-FINAL'
        },
        {
            id: 'ms-k-3',
            slotA: '__winner_ms-k-1__',
            slotB: '__winner_ms-k-2__',
            stage: 'FINAL'
        }
    ];
    return [...groupMatches, ...knockout];
};

export const buildMatchesByFormat = (format, seedIds = [], bracketSize = 0) => {
    const normalizedFormat = (format || BRACKET_FORMAT.SINGLE).toString().trim().toUpperCase();
    if (normalizedFormat === BRACKET_FORMAT.ROUND_ROBIN) {
        return buildRoundRobinMatches(seedIds);
    }
    if (normalizedFormat === BRACKET_FORMAT.THREE_COMEBACK) {
        return buildThreePlayerComebackMatches(seedIds);
    }
    if (normalizedFormat === BRACKET_FORMAT.DOUBLE) {
        return buildDoubleEliminationPreview(seedIds, bracketSize);
    }
    if (normalizedFormat === BRACKET_FORMAT.MULTISTAGE) {
        return buildMultistagePreview(seedIds);
    }
    return buildBracketMatches(seedIds, bracketSize);
};
