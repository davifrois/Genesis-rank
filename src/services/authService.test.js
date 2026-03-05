import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from './authService';

describe('authService', () => {
    beforeEach(() => {
        if (typeof localStorage !== 'undefined') {
            localStorage.clear();
        }
    });

    it('should throw error if username is missing', async () => {
        await expect(authService.login('', 'pass')).rejects.toThrow('Por favor, informe o nome de usuário.');
    });

    it('should throw error if password is missing', async () => {
        await expect(authService.login('simone', '')).rejects.toThrow('Por favor, informe a senha de acesso.');
    });

    it('should throw error for invalid user', async () => {
        await expect(authService.login('wrongUser', 'pass')).rejects.toThrow('Usuário não encontrado.');
    });

    it('should throw error for invalid password', async () => {
        await expect(authService.login('simone', 'wrongPass')).rejects.toThrow('Senha incorreta');
    });

    it('should return user data on successful login', async () => {
        const user = await authService.login('simone', 'simone123');
        expect(user).toHaveProperty('username', 'simone');
        expect(user).toHaveProperty('name', 'Simone');
        expect(user).toHaveProperty('lastLogin');
    });

    it('should reset password for an existing user', async () => {
        await authService.resetPassword('simone', 'novaSenha123');
        const user = await authService.login('simone', 'novaSenha123');
        expect(user).toHaveProperty('username', 'simone');
    });
});
