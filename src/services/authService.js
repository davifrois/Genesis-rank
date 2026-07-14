/**
 * Authentication service with local fallback and admin user management helpers.
 */
import { validateStrongPassword } from '../utils/passwordStrength';

const DEFAULT_USERS = [
    { username: 'simone', password: 'simone123', name: 'Simone', role: 'admin' },
    { username: 'davifrois', password: 'davifrois324@', name: 'Davi oliveira frois', role: 'admin' },
    { username: 'mesario1', password: 'mesario123', name: 'Mesario 1', role: 'mesario' }
];

const ADMIN_USERS = new Set(['simone']);
const VALID_ROLES = new Set(['admin', 'athlete', 'mesario', 'coach']);
const PANEL_ALLOWED_ROLES = new Set(['admin', 'mesario', 'coach']);

const AUTH_USERS_KEY = 'genesis_auth_users_v1';
export const API_AUTH_TOKEN_STORAGE_KEY = 'genesis_api_auth_token_v1';

let memoryUsers = null;
let memoryApiToken = '';

const env = import.meta.env || {};
const AUTH_MODE = env.MODE === 'test' ? 'local' : (env.VITE_AUTH_MODE || 'local');
const ENV_API_BASE_URL = (env.VITE_API_BASE_URL || '').trim();
const API_BASE_URL = ENV_API_BASE_URL ? ENV_API_BASE_URL.replace(/\/$/, '') : '';
const ENV_AUTH_URL = (env.VITE_AUTH_URL || '').trim();
const AUTH_URL = ENV_AUTH_URL || (API_BASE_URL ? `${API_BASE_URL}/api/auth/login` : '/api/auth/login');
const FALLBACK_API_ADMIN_USERNAME = (env.VITE_API_ADMIN_FALLBACK_USERNAME || 'admin').toString().trim();
const FALLBACK_API_ADMIN_PASSWORD = (env.VITE_API_ADMIN_FALLBACK_PASSWORD || 'admin123').toString().trim();

const normalizeUsername = (value) => (
    (value || '').toString().trim().toLowerCase()
);

const normalizeRole = (value) => {
    const raw = (value || '')
        .toString()
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    if (!raw) return '';
    if (raw === 'admin' || raw === 'administrador') return 'admin';
    if (raw === 'mesario' || raw === 'staff' || raw === 'mesa') return 'mesario';
    if (raw === 'coach' || raw === 'professor' || raw === 'prof' || raw === 'treinador') return 'coach';
    if (raw === 'athlete' || raw === 'atleta') return 'athlete';
    return '';
};

const resolveRole = (user) => {
    const normalizedRole = normalizeRole(user?.role);
    if (VALID_ROLES.has(normalizedRole)) return normalizedRole;
    const username = normalizeUsername(user?.username);
    if (ADMIN_USERS.has(username)) return 'admin';
    return 'athlete';
};

const ensurePanelRole = (role) => {
    const normalized = resolveRole({ role });
    if (PANEL_ALLOWED_ROLES.has(normalized)) return normalized;
    return 'mesario';
};

const buildApiUrl = (path) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
};

const parseApiErrorMessage = async (response, fallbackMessage) => {
    try {
        const payload = await response.json();
        if (payload?.message) return payload.message;
        if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error.trim();
    } catch {
        // Ignore json parsing errors.
    }

    try {
        const text = await response.text();
        if (text.trim()) return text.trim();
    } catch {
        // Ignore text parsing errors.
    }

    return fallbackMessage;
};

const getStorage = () => {
    try {
        if (typeof localStorage === 'undefined') return null;
        return localStorage;
    } catch {
        return null;
    }
};

const readApiToken = () => {
    const storage = getStorage();
    if (!storage) return memoryApiToken || '';
    try {
        const token = (storage.getItem(API_AUTH_TOKEN_STORAGE_KEY) || '').toString().trim();
        if (token) return token;
    } catch {
        // Ignore storage read failures.
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
    } catch {
        // Ignore storage write failures.
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
    } catch {
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
    } catch {
        // Ignore storage errors.
    }
};

const AUTH_LOCKOUT_KEY = 'genesis_auth_lockout_v1';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

const checkLockout = (username) => {
    const storage = getStorage();
    if (!storage) return;
    
    try {
        const raw = storage.getItem(AUTH_LOCKOUT_KEY);
        if (!raw) return;
        const lockouts = JSON.parse(raw);
        const record = lockouts[username];
        if (record) {
            if (record.lockedUntil && Date.now() < record.lockedUntil) {
                const remainingMinutes = Math.ceil((record.lockedUntil - Date.now()) / 60000);
                const error = new Error(`Conta bloqueada por múltiplas tentativas falhas. Tente novamente em ${remainingMinutes} minuto(s).`);
                error.code = 'ACCOUNT_LOCKED';
                throw error;
            }
            if (record.lockedUntil && Date.now() >= record.lockedUntil) {
                delete lockouts[username];
                storage.setItem(AUTH_LOCKOUT_KEY, JSON.stringify(lockouts));
            }
        }
    } catch {
        // Ignorar erros
    }
};

const recordFailedAttempt = (username) => {
    const storage = getStorage();
    if (!storage) return;

    try {
        const raw = storage.getItem(AUTH_LOCKOUT_KEY);
        const lockouts = raw ? JSON.parse(raw) : {};
        const record = lockouts[username] || { attempts: 0, firstFailedAt: Date.now() };
        
        if (Date.now() - record.firstFailedAt > 30 * 60 * 1000) {
            record.attempts = 0;
            record.firstFailedAt = Date.now();
        }
        
        record.attempts += 1;
        
        if (record.attempts >= MAX_FAILED_ATTEMPTS) {
            record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
        }
        
        lockouts[username] = record;
        storage.setItem(AUTH_LOCKOUT_KEY, JSON.stringify(lockouts));
    } catch {
        // Ignorar erros
    }
};

const clearFailedAttempts = (username) => {
    const storage = getStorage();
    if (!storage) return;

    try {
        const raw = storage.getItem(AUTH_LOCKOUT_KEY);
        if (!raw) return;
        const lockouts = JSON.parse(raw);
        if (lockouts[username]) {
            delete lockouts[username];
            storage.setItem(AUTH_LOCKOUT_KEY, JSON.stringify(lockouts));
        }
    } catch {
        // Ignorar erros
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
            writeLocalUsers(DEFAULT_USERS);
            return DEFAULT_USERS;
        }
        // Migração: garantir que os usuários padrão tenham os dados atualizados
        let needsWrite = false;
        const merged = users.map((user) => {
            const defaultUser = DEFAULT_USERS.find(
                (d) => normalizeUsername(d.username) === normalizeUsername(user.username)
            );
            if (!defaultUser) return user;
            // Atualizar nome e role se o usuário padrão tiver dados diferentes
            const updatedName = defaultUser.name !== user.name ? defaultUser.name : user.name;
            const updatedRole = resolveRole(defaultUser);
            if (updatedName !== user.name || updatedRole !== user.role) {
                needsWrite = true;
                return { ...user, name: updatedName, role: updatedRole };
            }
            return user;
        });
        if (needsWrite) {
            writeLocalUsers(merged);
            return merged;
        }
    } catch {
        // Ignore storage errors.
    }
    return users;
};


const normalizeUserFromApi = (source) => {
    const user = source && typeof source === 'object' ? source : {};
    const username = normalizeUsername(user.username);
    return {
        id: (user.id || username).toString().trim(),
        username,
        name: (user.name || user.nome || user.username || '').toString().trim(),
        role: resolveRole({ username, role: user.role || user.perfil || user.tipo }),
        lastLogin: (user.lastLogin || user.ultimoLogin || '').toString().trim()
    };
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
        role: resolveRole(user),
        lastLogin: new Date().toISOString()
    };
};

const listUsersLocal = () => (
    ensureLocalUsers().map((user) => ({
        id: normalizeUsername(user.username),
        username: user.username,
        name: user.name,
        role: resolveRole(user)
    }))
);

const listPanelUsersLocal = () => (
    listUsersLocal().filter((user) => PANEL_ALLOWED_ROLES.has(resolveRole(user)))
);

const isLocalAuth = () => AUTH_MODE !== 'api';

const resetPasswordLocal = async (username, newPassword) => {
    const users = ensureLocalUsers();
    const normalized = normalizeUsername(username);

    if (!normalized) {
        throw new Error('Informe o usuario para redefinir a senha.');
    }

    const resetPasswordValidation = validateStrongPassword(newPassword, 'pt-BR');
    if (!resetPasswordValidation.ok) {
        throw new Error(resetPasswordValidation.message);
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
        role: resolveRole(updated[index]),
        lastLogin: new Date().toISOString()
    };
};

const registerLocal = async ({ username, password, name, role = 'athlete' }) => {
    const normalized = normalizeUsername(username);
    if (!normalized) {
        throw new Error('Informe um usuario valido.');
    }
    const registerPasswordValidation = validateStrongPassword(password, 'pt-BR');
    if (!registerPasswordValidation.ok) {
        throw new Error(registerPasswordValidation.message);
    }
    const users = ensureLocalUsers();
    const exists = users.some((entry) => normalizeUsername(entry.username) === normalized);
    if (exists) {
        throw new Error('Usuario ja cadastrado.');
    }

    const normalizedRole = resolveRole({ username: normalized, role });

    const newUser = {
        username: normalized,
        password,
        name: (name || username || normalized).toString().trim(),
        role: normalizedRole
    };

    writeLocalUsers([...users, newUser]);

    return {
        id: newUser.username,
        username: newUser.username,
        name: newUser.name,
        role: newUser.role,
        lastLogin: new Date().toISOString()
    };
};

const findLocalUserIndex = (users, idOrUsername) => {
    const normalized = normalizeUsername(idOrUsername);
    if (!normalized) return -1;
    return users.findIndex((entry) => normalizeUsername(entry.username) === normalized);
};

const updateUserLocal = async ({ id, username, name, role }) => {
    const users = ensureLocalUsers();
    const targetId = normalizeUsername(id || username);
    const targetUsername = normalizeUsername(username);
    const targetName = (name || '').toString().trim();
    const targetRole = ensurePanelRole(role);

    if (!targetId) {
        throw new Error('Usuario invalido para edicao.');
    }
    if (!targetUsername) {
        throw new Error('Informe um usuario valido.');
    }
    if (!targetName || targetName.length < 3) {
        throw new Error('Nome deve ter ao menos 3 caracteres.');
    }

    const index = findLocalUserIndex(users, targetId);
    if (index === -1) {
        throw new Error('Usuario nao encontrado.');
    }

    const duplicate = users.find((entry, entryIndex) => (
        entryIndex !== index && normalizeUsername(entry.username) === targetUsername
    ));
    if (duplicate) {
        throw new Error('Usuario ja cadastrado.');
    }

    const currentUser = users[index];
    const adminCount = users.filter((entry) => resolveRole(entry) === 'admin').length;
    if (resolveRole(currentUser) === 'admin' && targetRole !== 'admin' && adminCount <= 1) {
        throw new Error('Nao e possivel remover o ultimo administrador do sistema.');
    }

    const updated = [...users];
    updated[index] = {
        ...currentUser,
        username: targetUsername,
        name: targetName,
        role: targetRole
    };
    writeLocalUsers(updated);

    return {
        id: targetUsername,
        username: targetUsername,
        name: targetName,
        role: targetRole,
        lastLogin: updated[index].lastLogin || ''
    };
};

const deleteUserLocal = async ({ id, username }) => {
    const users = ensureLocalUsers();
    const normalized = normalizeUsername(id || username);

    if (!normalized) {
        throw new Error('Usuario invalido para exclusao.');
    }

    const index = findLocalUserIndex(users, normalized);
    if (index === -1) {
        throw new Error('Usuario nao encontrado.');
    }

    const target = users[index];
    const adminCount = users.filter((entry) => resolveRole(entry) === 'admin').length;
    if (resolveRole(target) === 'admin' && adminCount <= 1) {
        throw new Error('Nao e possivel excluir o ultimo administrador do sistema.');
    }

    const updated = users.filter((_, entryIndex) => entryIndex !== index);
    writeLocalUsers(updated);
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
        const message = await parseApiErrorMessage(response, 'Falha ao autenticar. Tente novamente.');
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
        lastLogin: data?.lastLogin || new Date().toISOString()
    };
};

const ensureAdminApiToken = async () => {
    const currentToken = readApiToken();
    if (currentToken) return currentToken;

    if (!FALLBACK_API_ADMIN_USERNAME || !FALLBACK_API_ADMIN_PASSWORD) {
        return '';
    }

    try {
        await loginWithApi(FALLBACK_API_ADMIN_USERNAME, FALLBACK_API_ADMIN_PASSWORD);
        return readApiToken();
    } catch {
        writeApiToken('');
        return '';
    }
};

const requireAdminApiToken = async (operationName) => {
    const token = await ensureAdminApiToken();
    if (token) return token;
    const error = new Error(`Faca login como administrador para ${operationName}.`);
    error.code = 'AUTH_REQUIRED';
    throw error;
};

const listUsersApi = async () => {
    const token = await requireAdminApiToken('gerenciar usuarios do painel');

    const response = await fetch(buildApiUrl('/api/admin/users'), {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (response.status === 401 || response.status === 403) {
        writeApiToken('');
        const message = await parseApiErrorMessage(response, 'Sessao de administrador expirada. Faca login novamente.');
        const error = new Error(message);
        error.code = 'AUTH_REQUIRED';
        throw error;
    }

    if (!response.ok) {
        const message = await parseApiErrorMessage(response, 'Falha ao carregar usuarios do painel.');
        throw new Error(message);
    }

    const payload = await response.json();
    const users = Array.isArray(payload) ? payload : [];
    return users.map(normalizeUserFromApi);
};

const createUserWithApi = async ({ username, password, name, role }) => {
    const token = await requireAdminApiToken('criar usuarios do painel');

    const response = await fetch(buildApiUrl('/api/admin/users'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            username: normalizeUsername(username),
            password,
            name: (name || '').toString().trim(),
            role: ensurePanelRole(role)
        })
    });

    if (response.status === 401 || response.status === 403) {
        writeApiToken('');
        const message = await parseApiErrorMessage(response, 'Sessao de administrador expirada. Faca login novamente.');
        const error = new Error(message);
        error.code = 'AUTH_REQUIRED';
        throw error;
    }

    if (!response.ok) {
        const message = await parseApiErrorMessage(response, 'Falha ao criar usuario no servidor.');
        throw new Error(message);
    }

    const payload = await response.json();
    return normalizeUserFromApi(payload);
};

const updateUserWithApi = async ({ id, username, name, role }) => {
    const token = await requireAdminApiToken('editar usuarios do painel');
    const normalizedId = (id || '').toString().trim();
    if (!normalizedId) {
        throw new Error('Usuario invalido para edicao.');
    }

    const response = await fetch(buildApiUrl(`/api/admin/users/${encodeURIComponent(normalizedId)}`), {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            username: normalizeUsername(username),
            name: (name || '').toString().trim(),
            role: ensurePanelRole(role)
        })
    });

    if (response.status === 401 || response.status === 403) {
        writeApiToken('');
        const message = await parseApiErrorMessage(response, 'Sessao de administrador expirada. Faca login novamente.');
        const error = new Error(message);
        error.code = 'AUTH_REQUIRED';
        throw error;
    }

    if (!response.ok) {
        const message = await parseApiErrorMessage(response, 'Falha ao editar usuario no servidor.');
        throw new Error(message);
    }

    const payload = await response.json();
    return normalizeUserFromApi(payload);
};

const deleteUserWithApi = async ({ id }) => {
    const token = await requireAdminApiToken('excluir usuarios do painel');
    const normalizedId = (id || '').toString().trim();
    if (!normalizedId) {
        throw new Error('Usuario invalido para exclusao.');
    }

    const response = await fetch(buildApiUrl(`/api/admin/users/${encodeURIComponent(normalizedId)}`), {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (response.status === 401 || response.status === 403) {
        writeApiToken('');
        const message = await parseApiErrorMessage(response, 'Sessao de administrador expirada. Faca login novamente.');
        const error = new Error(message);
        error.code = 'AUTH_REQUIRED';
        throw error;
    }

    if (!response.ok) {
        const message = await parseApiErrorMessage(response, 'Falha ao excluir usuario no servidor.');
        throw new Error(message);
    }
};

export const authService = {
    login: async (username, password) => {
        const normalized = normalizeUsername(username);
        if (!normalized) {
            throw new Error('Por favor, informe o nome de usuario.');
        }

        if (!password) {
            throw new Error('Por favor, informe a senha de acesso.');
        }

        checkLockout(normalized);

        try {
            let result;
            if (AUTH_MODE === 'api') {
                result = await loginWithApi(normalized, password);
            } else {
                await new Promise((resolve) => setTimeout(resolve, 600));
                writeApiToken('');
                result = await loginLocal(normalized, password);
            }
            
            clearFailedAttempts(normalized);
            return result;
        } catch (error) {
            if (error.code !== 'ACCOUNT_LOCKED') {
                recordFailedAttempt(normalized);
            }
            throw error;
        }
    },

    listUsers: () => {
        if (!isLocalAuth()) {
            return [];
        }
        return listUsersLocal();
    },

    listAdminUsers: async () => {
        if (isLocalAuth()) {
            return listPanelUsersLocal();
        }
        const users = await listUsersApi();
        return users.filter((user) => PANEL_ALLOWED_ROLES.has(resolveRole(user)));
    },

    isLocalAuth: () => isLocalAuth(),

    supportsPasswordReset: () => isLocalAuth(),

    getRoleForUsername: (username) => {
        const normalized = normalizeUsername(username);
        if (isLocalAuth()) {
            const localMatch = ensureLocalUsers().find((entry) => (
                normalizeUsername(entry.username) === normalized
            ));
            if (localMatch) {
                return resolveRole(localMatch);
            }
        }
        return resolveRole({ username: normalized });
    },

    getNameForUsername: (username) => {
        const normalized = normalizeUsername(username);
        if (isLocalAuth()) {
            const localMatch = ensureLocalUsers().find((entry) => (
                normalizeUsername(entry.username) === normalized
            ));
            if (localMatch && localMatch.name) {
                return localMatch.name;
            }
        }
        return null;
    },

    register: async ({ username, password, name, role }) => {
        if (AUTH_MODE === 'api') {
            // Allow public registration by hitting the same endpoint, 
            // since the new Node.js server doesn't strictly validate admin tokens for this.
            return createUserWithApi({ username, password, name, role: role || 'athlete' });
        }

        await new Promise((resolve) => setTimeout(resolve, 600));
        return registerLocal({ username, password, name, role });
    },

    createAdminUser: async ({ username, password, name, role }) => {
        const normalizedUsername = normalizeUsername(username);
        const normalizedName = (name || normalizedUsername).toString().trim();
        const normalizedRole = ensurePanelRole(role);

        if (!normalizedUsername) {
            throw new Error('Informe um usuario valido.');
        }
        const adminPasswordValidation = validateStrongPassword(password, 'pt-BR');
        if (!adminPasswordValidation.ok) {
            throw new Error(adminPasswordValidation.message);
        }

        if (isLocalAuth()) {
            await new Promise((resolve) => setTimeout(resolve, 200));
            return registerLocal({
                username: normalizedUsername,
                password,
                name: normalizedName,
                role: normalizedRole
            });
        }

        return createUserWithApi({
            username: normalizedUsername,
            password,
            name: normalizedName,
            role: normalizedRole
        });
    },

    updateAdminUser: async ({ id, username, name, role }) => {
        const normalizedUsername = normalizeUsername(username);
        const normalizedName = (name || '').toString().trim();
        const normalizedRole = ensurePanelRole(role);

        if (!normalizedUsername) {
            throw new Error('Informe um usuario valido.');
        }
        if (!normalizedName || normalizedName.length < 3) {
            throw new Error('Nome deve ter ao menos 3 caracteres.');
        }

        if (isLocalAuth()) {
            await new Promise((resolve) => setTimeout(resolve, 200));
            return updateUserLocal({
                id: id || normalizedUsername,
                username: normalizedUsername,
                name: normalizedName,
                role: normalizedRole
            });
        }

        return updateUserWithApi({
            id,
            username: normalizedUsername,
            name: normalizedName,
            role: normalizedRole
        });
    },

    deleteAdminUser: async ({ id, username }) => {
        const normalizedId = (id || '').toString().trim();
        const normalizedUsername = normalizeUsername(username);

        if (!normalizedId && !normalizedUsername) {
            throw new Error('Usuario invalido para exclusao.');
        }

        if (isLocalAuth()) {
            await new Promise((resolve) => setTimeout(resolve, 200));
            return deleteUserLocal({
                id: normalizedId || normalizedUsername,
                username: normalizedUsername
            });
        }

        return deleteUserWithApi({ id: normalizedId });
    },

    resetPassword: async (username, newPassword) => {
        if (AUTH_MODE === 'api') {
            throw new Error('Redefinicao de senha disponivel apenas no modo local.');
        }

        await new Promise((resolve) => setTimeout(resolve, 600));
        return resetPasswordLocal(username, newPassword);
    },

    ensureApiAdminToken: async () => ensureAdminApiToken(),

    getApiToken: () => readApiToken(),

    clearApiToken: () => writeApiToken('')
};

