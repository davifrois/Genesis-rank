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

export const buildBracketMatches = (seedIds, bracketSize) => {
    const size = nextPowerOfTwo(bracketSize, 2);
    const slots = [...seedIds];
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
