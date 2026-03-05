/**
 * Simulated Authentication Service
 * In a real app, this would make API calls to a backend.
 */

const DEFAULT_USERS = [
    { username: 'simone', password: 'simone123', name: 'Simone', role: 'admin' },
    { username: 'davifrois', password: 'davifrois324@', name: 'Davifrois', role: 'admin' }
];

const ADMIN_USERS = new Set(['simone', 'davifrois']);
const VALID_ROLES = new Set(['admin', 'athlete']);

const AUTH_USERS_KEY = 'genesis_auth_users_v1';
export const API_AUTH_TOKEN_STORAGE_KEY = 'genesis_api_auth_token_v1';
let memoryUsers = null;
let memoryApiToken = '';

const env = import.meta.env || {};
const AUTH_MODE = env.MODE === 'test' ? 'local' : (env.VITE_AUTH_MODE || 'local');
const AUTH_URL = env.VITE_AUTH_URL || '';

const normalizeUsername = (value) => (
    (value || '').toString().trim().toLowerCase()
);

const resolveRole = (user) => {
    const rawRole = (user?.role || '').toString().trim().toLowerCase();
    if (VALID_ROLES.has(rawRole)) return rawRole;
    const username = normalizeUsername(user?.username);
    if (ADMIN_USERS.has(username)) return 'admin';
    return 'athlete';
};

const getStorage = () => {
    try {
        if (typeof localStorage === 'undefined') return null;
        return localStorage;
    } catch (err) {
        return null;
    }
};

const readApiToken = () => {
    const storage = getStorage();
    if (!storage) return memoryApiToken || '';
    try {
        const token = (storage.getItem(API_AUTH_TOKEN_STORAGE_KEY) || '').toString().trim();
        if (token) return token;
    } catch (err) {
        // ignore storage read failures
    }
    return memoryApiToken || '';
};

const writeApiToken = (token) => {
    const normalized = (token || '').toString().trim();
    memoryApiToken = normalized;
    const storage = getStorage();
    if (!storage) return;
    try {
        if (!normalized) {
            storage.removeItem(API_AUTH_TOKEN_STORAGE_KEY);
            return;
        }
        storage.setItem(API_AUTH_TOKEN_STORAGE_KEY, normalized);
    } catch (err) {
        // ignore storage write failures
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
                name: user.name || user.username,
                role: resolveRole(user)
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
        throw new Error('Usuário não encontrado.');
    }

    if (password !== user.password) {
        throw new Error('Senha incorreta. Verifique suas credenciais e tente novamente.');
    }

    return {
        username: user.username,
        name: user.name,
        role: resolveRole(user),
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
        throw new Error('Informe o usuário para redefinir a senha.');
    }

    if (!newPassword || newPassword.length < 6) {
        throw new Error('Senha deve ter ao menos 6 caracteres.');
    }

    const index = users.findIndex((entry) => normalizeUsername(entry.username) === normalized);
    if (index === -1) {
        throw new Error('Usuário não encontrado.');
    }

    const updated = [...users];
    updated[index] = { ...updated[index], password: newPassword };
    writeLocalUsers(updated);

    return {
        username: updated[index].username,
        name: updated[index].name,
        role: resolveRole(updated[index]),
        lastLogin: new Date().toISOString()
    };
};

const registerLocal = async ({ username, password, name }) => {
    const normalized = normalizeUsername(username);
    if (!normalized) {
        throw new Error('Informe um usuário válido.');
    }
    if (!password || password.length < 6) {
        throw new Error('Senha deve ter ao menos 6 caracteres.');
    }
    const users = ensureLocalUsers();
    const exists = users.some((entry) => normalizeUsername(entry.username) === normalized);
    if (exists) {
        throw new Error('Usuário já cadastrado.');
    }

    const newUser = {
        username: normalized,
        password,
        name: (name || username || normalized).toString().trim(),
        role: 'athlete'
    };

    writeLocalUsers([...users, newUser]);

    return {
        username: newUser.username,
        name: newUser.name,
        role: newUser.role,
        lastLogin: new Date().toISOString()
    };
};

const loginWithApi = async (username, password) => {
    if (!AUTH_URL) {
        throw new Error('Login remoto não configurado.');
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
    const token = (data?.token || '').toString().trim();
    writeApiToken(token);
    return {
        username: data?.user?.username || data.username || username,
        name: data?.user?.name || data.name || data.nome || username,
        role: resolveRole({
            username: data?.user?.username || data.username || username,
            role: data?.user?.role || data.role || data.perfil || data.tipo
        }),
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
            throw new Error('Por favor, informe o nome de usuário.');
        }

        if (!password) {
            throw new Error('Por favor, informe a senha de acesso.');
        }

        if (AUTH_MODE === 'api') {
            return loginWithApi(username, password);
        }

        await new Promise(resolve => setTimeout(resolve, 600));
        writeApiToken('');
        return loginLocal(username, password);
    },
    listUsers: () => {
        if (!isLocalAuth()) {
            return [];
        }
        return listUsersLocal();
    },
    isLocalAuth: () => isLocalAuth(),
    getRoleForUsername: (username) => resolveRole({ username }),
    register: async ({ username, password, name }) => {
        if (AUTH_MODE === 'api') {
            throw new Error('Cadastro indisponível no modo remoto.');
        }

        await new Promise(resolve => setTimeout(resolve, 600));
        return registerLocal({ username, password, name });
    },
    resetPassword: async (username, newPassword) => {
        if (AUTH_MODE === 'api') {
            throw new Error('Redefinição de senha disponível apenas no modo local.');
        }

        await new Promise(resolve => setTimeout(resolve, 600));
        return resetPasswordLocal(username, newPassword);
    },
    getApiToken: () => readApiToken(),
    clearApiToken: () => writeApiToken('')
};
