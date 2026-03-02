import { describe, it, expect } from 'vitest';
import { calculateTotalPoints, rankAthletes } from './scoringService';

describe('scoringService', () => {
    it('should calculate points correctly for wins', () => {
        const history = [{ type: 'win' }, { type: 'win' }];
        expect(calculateTotalPoints(history)).toBe(0);
    });

    it('should calculate points correctly for podiums', () => {
        const history = [
            { type: 'podium', position: 1 }, // 3
            { type: 'podium', position: 2 }, // 2
            { type: 'podium', position: 3 }  // 1
        ];
        expect(calculateTotalPoints(history)).toBe(6);
    });

    it('should handle mixed history', () => {
        const history = [
            { type: 'win' }, // 0
            { type: 'podium', position: 1 } // 3
        ];
        expect(calculateTotalPoints(history)).toBe(3);
    });

    it('should break ties by first-place podiums', () => {
        const athletes = [
            { id: 'a', nome: 'Atleta A', pontos: 20, historico: [{ type: 'podium', position: 1 }] },
            { id: 'b', nome: 'Atleta B', pontos: 20, historico: [] }
        ];
        const ranked = rankAthletes(athletes);
        expect(ranked[0].id).toBe('a');
    });
});
