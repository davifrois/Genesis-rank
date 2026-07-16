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
    { username: 'davifrois', password: 'Davifrois324@', name: 'Davi oliveira frois', role: 'admin' },
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

app.post('/api/auth/reset-password', (req, res) => {
    const { username, newPassword } = req.body;
    const users = readUsers();
    const normalizedUsername = (username || '').toLowerCase().trim();
    
    const userIndex = users.findIndex(u => u.username.toLowerCase() === normalizedUsername);
    if (userIndex === -1) {
        return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    
    users[userIndex].password = newPassword;
    writeUsers(users);
    
    res.json({ success: true, message: 'Senha atualizada com sucesso.' });
});

app.post('/api/events', (req, res) => {
    const event = req.body;
    const db = readDb();
    
    if (!event.name) {
        return res.status(400).json({ message: 'Nome do evento é obrigatório.' });
    }
    
    const existing = db.events.find(e => e.name.toLowerCase() === event.name.toLowerCase());
    if (existing) {
        return res.status(400).json({ message: 'Já existe um evento com este nome.' });
    }
    
    if (!event.id) event.id = Date.now().toString();
    db.events.push(event);
    writeDb(db);
    
    res.json(event);
});

app.put('/api/events/:eventId', (req, res) => {
    const { eventId } = req.params;
    const updates = req.body;
    const db = readDb();
    
    const index = db.events.findIndex(e => e.id === eventId);
    if (index === -1) {
        return res.status(404).json({ message: 'Evento não encontrado.' });
    }
    
    if (updates.name && updates.name.toLowerCase() !== db.events[index].name.toLowerCase()) {
        const existing = db.events.find(e => e.name.toLowerCase() === updates.name.toLowerCase() && e.id !== eventId);
        if (existing) {
            return res.status(400).json({ message: 'Já existe um evento com este nome.' });
        }
    }
    
    db.events[index] = { ...db.events[index], ...updates };
    writeDb(db);
    
    res.json(db.events[index]);
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
