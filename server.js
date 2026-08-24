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
    { username: 'simone', password: '12345678', name: 'Simone', role: 'admin' },
    { username: 'davifrois', password: 'Davifrois324@', name: 'Davi oliveira frois', role: 'admin' },
    { username: 'vinicius', password: '12345678', name: 'Vinicius', role: 'admin' },
    { username: 'gabriel', password: '12345678', name: 'Gabriel', role: 'admin' },
    { username: 'tarciso', password: '12345678', name: 'Tarciso', role: 'admin' },
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

// Registration API endpoints
app.get('/api/public/events', (req, res) => {
    try {
        const db = readDb();
        res.json(db.events || []);
    } catch (e) {
        res.status(500).json({ error: 'Erro ao listar eventos.' });
    }
});

app.get('/api/public/registrations', (req, res) => {
    try {
        const db = readDb();
        const eventId = req.query.eventId;
        let list = db.publicRegistrations || [];
        if (eventId) {
            list = list.filter(r => r.eventId === eventId);
        }
        res.json(list);
    } catch (e) {
        res.status(500).json({ error: 'Erro ao listar inscrições.' });
    }
});

app.post('/api/public/registrations', (req, res) => {
    try {
        const db = readDb();
        if (!db.publicRegistrations) db.publicRegistrations = [];
        const registration = req.body;
        
        const index = db.publicRegistrations.findIndex(r => 
            (r.clientRequestId && registration.clientRequestId && r.clientRequestId === registration.clientRequestId) ||
            (r.id && registration.id && r.id === registration.id)
        );
        
        if (index !== -1) {
            db.publicRegistrations[index] = { ...db.publicRegistrations[index], ...registration };
        } else {
            db.publicRegistrations.push(registration);
        }
        
        writeDb(db);
        res.json(registration);
    } catch (e) {
        res.status(500).json({ error: 'Erro ao salvar inscrição.' });
    }
});

app.patch('/api/admin/registrations/:id/payment', (req, res) => {
    try {
        const db = readDb();
        if (!db.publicRegistrations) db.publicRegistrations = [];
        const { id } = req.params;
        const { status, paymentProofUrl, notes } = req.body;
        const index = db.publicRegistrations.findIndex(r => r.id === id || r.clientRequestId === id);
        if (index !== -1) {
            db.publicRegistrations[index] = {
                ...db.publicRegistrations[index],
                status: status || db.publicRegistrations[index].status,
                paymentProofUrl: paymentProofUrl !== undefined ? paymentProofUrl : db.publicRegistrations[index].paymentProofUrl,
                notes: notes !== undefined ? notes : db.publicRegistrations[index].notes
            };
            writeDb(db);
            res.json(db.publicRegistrations[index]);
        } else {
            res.status(404).json({ error: 'Inscrição não encontrada.' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Erro ao atualizar pagamento.' });
    }
});

app.patch('/api/admin/registrations/:id/details', (req, res) => {
    try {
        const db = readDb();
        if (!db.publicRegistrations) db.publicRegistrations = [];
        const { id } = req.params;
        const updates = req.body;
        const index = db.publicRegistrations.findIndex(r => r.id === id || r.clientRequestId === id);
        if (index !== -1) {
            db.publicRegistrations[index] = {
                ...db.publicRegistrations[index],
                ...updates
            };
            writeDb(db);
            res.json(db.publicRegistrations[index]);
        } else {
            res.status(404).json({ error: 'Inscrição não encontrada.' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Erro ao atualizar detalhes.' });
    }
});

app.post('/api/webhooks/payment/checkout', async (req, res) => {
    try {
        const { registrationIds, athleteName, athleteEmail, amount } = req.body;
        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-5076214841905920-081112-768e0648179ce52ceb48a90a14882388-1214160384';
        
        const origin = req.headers.origin || 'https://genesis-rank.vercel.app';
        const baseSiteUrl = origin.includes('localhost') ? 'https://genesis-rank.vercel.app' : origin;

        const preferencePayload = {
            items: [
                {
                    title: `Inscrição Campeonato - ${athleteName || 'Atleta'}`,
                    description: `Inscrição oficial no campeonato Genesis Sports para ${athleteName || 'Atleta'}`,
                    quantity: 1,
                    unit_price: Number(amount || 0),
                    currency_id: 'BRL'
                }
            ],
            payer: {
                name: athleteName || 'Atleta Genesis',
                email: athleteEmail || 'contato@genesisesportes.com.br'
            },
            back_urls: {
                success: `${baseSiteUrl}/sucesso`,
                failure: `${baseSiteUrl}/falha`,
                pending: `${baseSiteUrl}/pendente`
            },
            auto_return: 'approved',
            notification_url: `${baseSiteUrl}/api/webhook-mercadopago`,
            external_reference: String(registrationIds || '')
        };

        const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(preferencePayload)
        });

        const mpData = await mpResponse.json();
        
        if (mpData.init_point || mpData.sandbox_init_point) {
            res.json({ 
                url: mpData.init_point || mpData.sandbox_init_point,
                id: mpData.id 
            });
        } else {
            console.error('Mercado Pago Erro:', mpData);
            res.status(500).json({ error: 'Falha ao gerar link do Mercado Pago', details: mpData });
        }
    } catch (e) {
        console.error('Erro no checkout:', e);
        res.status(500).json({ error: 'Erro interno ao processar pagamento.' });
    }
});

// Direct PIX Generation (Transparent Checkout)
app.post('/api/webhooks/payment/pix', async (req, res) => {
    try {
        const { registrationIds, athleteName, email, amount } = req.body;
        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-5076214841905920-081112-768e0648179ce52ceb48a90a14882388-1214160384';

        const payload = {
            transaction_amount: Number(amount || 0),
            description: `Inscrição Campeonato - ${athleteName || 'Atleta'}`,
            payment_method_id: 'pix',
            external_reference: String(registrationIds || ''),
            payer: {
                email: email || 'atleta@genesisesportes.com.br',
                first_name: athleteName || 'Atleta'
            }
        };

        const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(payload)
        });

        const data = await mpRes.json();
        if (data.id && data.point_of_interaction) {
            const qrCode = data.point_of_interaction.transaction_data.qr_code;
            const qrCodeBase64 = data.point_of_interaction.transaction_data.qr_code_base64;
            const ticketUrl = data.point_of_interaction.transaction_data.ticket_url;

            res.json({
                paymentId: data.id,
                status: data.status,
                qrCode,
                qrCodeBase64,
                ticketUrl,
                externalReference: registrationIds
            });
        } else {
            console.error('Erro ao gerar PIX Mercado Pago:', data);
            res.status(500).json({ error: 'Erro ao gerar PIX', details: data });
        }
    } catch (e) {
        console.error('Erro no PIX:', e);
        res.status(500).json({ error: 'Erro interno ao gerar PIX.' });
    }
});

// Direct Payment Status Polling
app.get(['/api/webhooks/payment/status/:paymentId', '/api/webhooks/payment/status', '/api/status'], async (req, res) => {
    try {
        const paymentId = req.params.paymentId || req.query.paymentId || req.query.id || req.query.collection_id;
        if (!paymentId) {
            return res.status(400).json({ error: 'paymentId é obrigatório' });
        }
        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-5076214841905920-081112-768e0648179ce52ceb48a90a14882388-1214160384';

        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!mpRes.ok) {
            return res.json({ approved: false, status: 'pending' });
        }

        const data = await mpRes.json();
        const isApproved = data.status === 'approved';

        if (isApproved && data.external_reference) {
            const regIds = data.external_reference.split(',');
            const db = readDb();
            if (!db.publicRegistrations) db.publicRegistrations = [];

            let updated = false;
            regIds.forEach(rawId => {
                const rId = rawId.trim();
                const idx = db.publicRegistrations.findIndex(r => r.id === rId || r.clientRequestId === rId);
                if (idx !== -1) {
                    db.publicRegistrations[idx].status = 'APPROVED';
                    db.publicRegistrations[idx].paymentMethod = 'Mercado Pago';
                    db.publicRegistrations[idx].transactionId = String(paymentId);
                    updated = true;
                }
            });

            if (updated) {
                writeDb(db);
            }
        }

        res.json({
            paymentId: data.id,
            status: data.status,
            approved: isApproved,
            externalReference: data.external_reference || '',
            paymentMethodId: data.payment_method_id,
            transactionAmount: data.transaction_amount
        });
    } catch (e) {
        console.error('[Payment Status API] Erro:', e);
        res.json({ approved: false, status: 'pending' });
    }
});

// Confirm Return endpoint - Valida status real no Mercado Pago antes de aprovar
app.all(['/api/webhooks/payment/confirm-return', '/api/payment/confirm-return'], async (req, res) => {
    try {
        const registrationIds = req.query.registrationIds || req.body?.registrationIds;
        const paymentId = req.query.paymentId || req.body?.paymentId;

        if (registrationIds && paymentId && paymentId !== 'null' && paymentId !== 'undefined') {
            const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-5076214841905920-081112-768e0648179ce52ceb48a90a14882388-1214160384';
            try {
                const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                if (payRes.ok) {
                    const paymentInfo = await payRes.json();
                    if (paymentInfo.status === 'approved') {
                        const regIds = String(registrationIds).split(',');
                        const db = readDb();
                        if (!db.publicRegistrations) db.publicRegistrations = [];

                        let updated = false;
                        regIds.forEach(rawId => {
                            const rId = rawId.trim();
                            const idx = db.publicRegistrations.findIndex(r => r.id === rId || r.clientRequestId === rId);
                            if (idx !== -1) {
                                db.publicRegistrations[idx].status = 'APPROVED';
                                db.publicRegistrations[idx].paymentMethod = 'Mercado Pago';
                                db.publicRegistrations[idx].transactionId = String(paymentId);
                                updated = true;
                            }
                        });

                        if (updated) writeDb(db);
                        return res.json({ success: true, status: 'APPROVED' });
                    } else {
                        console.warn(`[Confirm-return] Pagamento ${paymentId} não aprovado. Status retornado pelo MP: ${paymentInfo.status}`);
                        return res.json({ success: false, status: paymentInfo.status || 'pending' });
                    }
                }
            } catch (err) {
                console.error('[Confirm-return] Erro ao consultar API Mercado Pago:', err);
            }
        }
        res.json({ success: false, status: 'pending', message: 'Pagamento não confirmado ou ID ausente' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Mercado Pago Webhook Handler (Suporta /api/webhook-mercadopago e /api/webhooks/payment/mercadopago)
app.all(['/api/webhook-mercadopago', '/api/webhooks/payment/mercadopago'], async (req, res) => {
    try {
        const { type, data } = req.body || {};
        const paymentId = data?.id || req.body?.id || req.query['data.id'] || req.query?.id;
        
        console.log(`[Mercado Pago Webhook] Recebido: tipo=${type}, paymentId=${paymentId}`);
        
        // Imediatamente responder 200 OK
        res.status(200).json({ received: true, paymentId });

        if (paymentId) {
            const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-5076214841905920-081112-768e0648179ce52ceb48a90a14882388-1214160384';
            const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            
            if (payRes.ok) {
                const paymentInfo = await payRes.json();
                console.log(`[Mercado Pago Webhook] Status pagamento ${paymentId}: ${paymentInfo.status}`);

                if (paymentInfo.status === 'approved' && paymentInfo.external_reference) {
                    const regIds = paymentInfo.external_reference.split(',');
                    const db = readDb();
                    if (!db.publicRegistrations) db.publicRegistrations = [];
                    
                    let updated = false;
                    regIds.forEach(rawId => {
                        const rId = rawId.trim();
                        const idx = db.publicRegistrations.findIndex(r => r.id === rId || r.clientRequestId === rId);
                        if (idx !== -1) {
                            db.publicRegistrations[idx].status = 'APPROVED';
                            db.publicRegistrations[idx].paymentMethod = 'Mercado Pago';
                            db.publicRegistrations[idx].transactionId = String(paymentId);
                            db.publicRegistrations[idx].notes = JSON.stringify({
                                ...(JSON.parse(db.publicRegistrations[idx].notes || '{}')),
                                statusPagamento: 'APROVADO_MERCADO_PAGO',
                                transactionId: String(paymentId),
                                aprovadoEm: new Date().toISOString()
                            });
                            updated = true;
                        }
                    });
                    
                    if (updated) {
                        writeDb(db);
                        console.log(`Inscrições [${paymentInfo.external_reference}] aprovadas com sucesso via Webhook Mercado Pago!`);
                    }
                }
            }
        }
    } catch (e) {
        console.error('Erro no webhook Mercado Pago:', e);
    }
});


app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
