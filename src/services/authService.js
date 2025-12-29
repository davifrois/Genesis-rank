/**
 * Simulated Authentication Service
 * In a real app, this would make API calls to a backend.
 */

const DEFAULT_USERS = [
    { username: 'simone', password: 'simone123', name: 'Simone' },
    { username: 'davifrois', password: 'davifrois324@', name: 'Davifrois' }
];

const AUTH_USERS_KEY = 'genesis_auth_users_v1';
let memoryUsers = null;

const env = import.meta.env || {};
const AUTH_MODE = env.MODE === 'test' ? 'local' : (env.VITE_AUTH_MODE || 'local');
const AUTH_URL = env.VITE_AUTH_URL || '';

const normalizeUsername = (value) => (
    (value || '').toString().trim().toLowerCase()
);

const getStorage = () => {
    try {
        if (typeof localStorage === 'undefined') return null;
        return localStorage;
    } catch (err) {
        return null;
    }
};

const readLocalUsers = () => {
    const storage = getStorage();
    if (!storage) return memoryUsers || DEFAULT_USERS;
    try {
        const raw = storage.getItem(AUTH_USERS_KEY);
        if (!raw) return DEFAULT_USERS;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return DEFAULT_USERS;
        return parsed
            .filter((user) => user && user.username && user.password)
            .map((user) => ({
                username: normalizeUsername(user.username),
                password: user.password,
                name: user.name || user.username
            }));
    } catch (err) {
        return DEFAULT_USERS;
    }
};

const writeLocalUsers = (users) => {
    const storage = getStorage();
    if (!storage) {
        memoryUsers = users;
        return;
    }
    try {
        storage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
    } catch (err) {
        // ignore storage errors
    }
};

const ensureLocalUsers = () => {
    const users = readLocalUsers();
    const storage = getStorage();
    if (!storage) {
        if (!memoryUsers) {
            memoryUsers = users;
        }
        return users;
    }
    try {
        if (!storage.getItem(AUTH_USERS_KEY)) {
            writeLocalUsers(users);
        }
    } catch (err) {
        // ignore storage errors
    }
    return users;
};

const loginLocal = async (username, password) => {
    const users = ensureLocalUsers();
    const normalized = normalizeUsername(username);
    const user = users.find((entry) => normalizeUsername(entry.username) === normalized);

    if (!user) {
        throw new Error('Usuario nao encontrado.');
    }

    if (password !== user.password) {
        throw new Error('Senha incorreta. Verifique suas credenciais e tente novamente.');
    }

    return {
        username: user.username,
        name: user.name,
        lastLogin: new Date().toISOString()
    };
};

const listUsersLocal = () => (
    ensureLocalUsers().map((user) => ({
        username: user.username,
        name: user.name
    }))
);

const isLocalAuth = () => AUTH_MODE !== 'api';

const resetPasswordLocal = async (username, newPassword) => {
    const users = ensureLocalUsers();
    const normalized = normalizeUsername(username);

    if (!normalized) {
        throw new Error('Informe o usuario para redefinir a senha.');
    }

    if (!newPassword || newPassword.length < 6) {
        throw new Error('Senha deve ter ao menos 6 caracteres.');
    }

    const index = users.findIndex((entry) => normalizeUsername(entry.username) === normalized);
    if (index === -1) {
        throw new Error('Usuario nao encontrado.');
    }

    const updated = [...users];
    updated[index] = { ...updated[index], password: newPassword };
    writeLocalUsers(updated);

    return {
        username: updated[index].username,
        name: updated[index].name,
        lastLogin: new Date().toISOString()
    };
};

const loginWithApi = async (username, password) => {
    if (!AUTH_URL) {
        throw new Error('Login remoto nao configurado.');
    }

    const response = await fetch(AUTH_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
        let message = 'Falha ao autenticar. Tente novamente.';
        try {
            const payload = await response.json();
            if (payload?.message) message = payload.message;
        } catch (err) {
            // ignore json parsing errors
        }
        throw new Error(message);
    }

    const data = await response.json();
    return {
        username: data.username || username,
        name: data.name || data.nome || username,
        lastLogin: data.lastLogin || new Date().toISOString()
    };
};

export const authService = {
    /**
     * Performs user login
     * @param {string} username
     * @param {string} password
     * @returns {Promise<Object>} User data if successful
     * @throws {Error} Clear error message if failed
     */
    login: async (username, password) => {
        if (!username) {
            throw new Error('Por favor, informe o nome de usuario.');
        }

        if (!password) {
            throw new Error('Por favor, informe a senha de acesso.');
        }

        if (AUTH_MODE === 'api') {
            return loginWithApi(username, password);
        }

        await new Promise(resolve => setTimeout(resolve, 600));
        return loginLocal(username, password);
    },
    listUsers: () => {
        if (!isLocalAuth()) {
            return [];
        }
        return listUsersLocal();
    },
    isLocalAuth: () => isLocalAuth(),
    resetPassword: async (username, newPassword) => {
        if (AUTH_MODE === 'api') {
            throw new Error('Redefinicao de senha disponivel apenas no modo local.');
        }

        await new Promise(resolve => setTimeout(resolve, 600));
        return resetPasswordLocal(username, newPassword);
    }
};
