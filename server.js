import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const dbPath = path.join(__dirname, 'db.json');
const usersPath = path.join(__dirname, 'users.json');

// Default initial state
const defaultUsers = [
    { username: 'simone', password: 'simone123', name: 'Simone', role: 'admin' },
    { username: 'davifrois', password: 'davifrois324@', name: 'Davi oliveira frois', role: 'admin' },
    { username: 'mesario1', password: 'mesario123', name: 'Mesario 1', role: 'mesario' }
];

const ensureDbExists = () => {
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({
            schemaVersion: 3,
            athletes: [],
            events: [],
            news: [],
            academies: [],
            memberProfiles: [],
            activeEventId: null,
            logs: [],
            notifications: [],
            rankHistory: {},
            brackets: [],
            nextBracketNumber: 1,
            currentUser: null,
        }, null, 2));
    }
    if (!fs.existsSync(usersPath)) {
        fs.writeFileSync(usersPath, JSON.stringify(defaultUsers, null, 2));
    }
};

ensureDbExists();

const readDb = () => JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const writeDb = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

const readUsers = () => JSON.parse(fs.readFileSync(usersPath, 'utf8'));
const writeUsers = (data) => fs.writeFileSync(usersPath, JSON.stringify(data, null, 2));

// Data endpoints (for useStore)
app.get('/api/data', (req, res) => {
    try {
        res.json(readDb());
    } catch (e) {
        res.status(500).json({ error: 'Erro ao ler o banco de dados.' });
    }
});

app.post('/api/data', (req, res) => {
    try {
        writeDb(req.body);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Erro ao salvar no banco de dados.' });
    }
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const users = readUsers();
    const normalizedUsername = (username || '').toLowerCase().trim();
    
    const user = users.find(u => u.username.toLowerCase() === normalizedUsername);
    if (!user) {
        return res.status(401).json({ message: 'Usuario nao encontrado.' });
    }
    
    if (user.password !== password) {
        return res.status(401).json({ message: 'Senha incorreta. Verifique suas credenciais e tente novamente.' });
    }
    
    res.json({
        token: 'mock-jwt-token-' + Date.now(),
        user: {
            username: user.username,
            name: user.name,
            role: user.role
        },
        lastLogin: new Date().toISOString()
    });
});

app.get('/api/admin/users', (req, res) => {
    const users = readUsers();
    res.json(users);
});

app.post('/api/admin/users', (req, res) => {
    const { username, password, name, role } = req.body;
    const users = readUsers();
    const normalized = (username || '').toLowerCase().trim();
    
    if (users.find(u => u.username.toLowerCase() === normalized)) {
        return res.status(400).json({ message: 'Usuario ja cadastrado.' });
    }
    
    const newUser = { username: normalized, password, name, role };
    users.push(newUser);
    writeUsers(users);
    res.json(newUser);
});

app.put('/api/admin/users/:id', (req, res) => {
    const { id } = req.params;
    const { username, name, role } = req.body;
    const users = readUsers();
    const normalizedId = (id || '').toLowerCase().trim();
    
    const index = users.findIndex(u => u.username.toLowerCase() === normalizedId);
    if (index === -1) return res.status(404).json({ message: 'Usuario nao encontrado.' });
    
    users[index] = { ...users[index], username: (username || id).toLowerCase().trim(), name, role };
    writeUsers(users);
    res.json(users[index]);
});

app.delete('/api/admin/users/:id', (req, res) => {
    const { id } = req.params;
    const users = readUsers();
    const normalizedId = (id || '').toLowerCase().trim();
    
    const index = users.findIndex(u => u.username.toLowerCase() === normalizedId);
    if (index === -1) return res.status(404).json({ message: 'Usuario nao encontrado.' });
    
    users.splice(index, 1);
    writeUsers(users);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
