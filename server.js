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

// ─── Configuração Mercado Pago ──────────────────────────────────────────────
const MP_PLATFORM_FEE = Number(process.env.MP_PLATFORM_FEE || 0);
const MP_CLIENT_ID = process.env.MP_CLIENT_ID || '';
const MP_CLIENT_SECRET = process.env.MP_CLIENT_SECRET || '';
const MP_REDIRECT_URI = process.env.MP_REDIRECT_URI || 'http://localhost:8080/api/auth/mercadopago/callback';
const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || '';

// ─── Helpers de persistência ────────────────────────────────────────────────
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
            schemaVersion: 3, athletes: [], events: [], news: [], academies: [],
            memberProfiles: [], activeEventId: null, logs: [], notifications: [],
            rankHistory: {}, brackets: [], nextBracketNumber: 1, currentUser: null,
            publicRegistrations: [], organizerTokens: {}
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

/** Retorna o access_token do organizador do evento, ou o token da plataforma como fallback */
const getAccessTokenForEvent = (db, eventId) => {
    if (!eventId) return MP_ACCESS_TOKEN;
    const tokens = db.organizerTokens || {};
    return tokens[eventId]?.accessToken || MP_ACCESS_TOKEN;
};

/** Salva o token OAuth do organizador vinculado ao evento */
const saveOrganizerToken = (db, eventId, tokenData) => {
    if (!db.organizerTokens) db.organizerTokens = {};
    db.organizerTokens[eventId] = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || '',
        mpUserId: String(tokenData.user_id || ''),
        publicKey: tokenData.public_key || '',
        connectedAt: new Date().toISOString(),
        expiresIn: tokenData.expires_in || 0
    };
    writeDb(db);
};

// ═══════════════════════════════════════════════════════════════════════════
//  DADOS E AUTH
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/data', (req, res) => {
    try { res.json(readDb()); } catch (e) { res.status(500).json({ error: 'Erro ao ler o banco de dados.' }); }
});

app.post('/api/data', (req, res) => {
    try { writeDb(req.body); res.json({ success: true }); } catch (e) { res.status(500).json({ error: 'Erro ao salvar no banco de dados.' }); }
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const users = readUsers();
    const normalized = (username || '').toLowerCase().trim();
    const user = users.find(u => u.username.toLowerCase() === normalized);
    if (!user) return res.status(401).json({ message: 'Usuario nao encontrado.' });
    if (user.password !== password) return res.status(401).json({ message: 'Senha incorreta. Verifique suas credenciais e tente novamente.' });
    res.json({ token: 'mock-jwt-token-' + Date.now(), user: { username: user.username, name: user.name, role: user.role }, lastLogin: new Date().toISOString() });
});

app.post('/api/auth/reset-password', (req, res) => {
    const { username, newPassword } = req.body;
    const users = readUsers();
    const normalized = (username || '').toLowerCase().trim();
    const idx = users.findIndex(u => u.username.toLowerCase() === normalized);
    if (idx === -1) return res.status(404).json({ message: 'Usuario nao encontrado.' });
    users[idx].password = newPassword;
    writeUsers(users);
    res.json({ success: true, message: 'Senha atualizada com sucesso.' });
});

app.post('/api/auth/register', (req, res) => {
    const { username, password, name, role = 'athlete' } = req.body;
    const users = readUsers();
    const normalized = (username || '').toLowerCase().trim();
    if (!normalized) return res.status(400).json({ message: 'Usuario invalido.' });
    if (users.find(u => u.username.toLowerCase() === normalized)) return res.status(400).json({ message: 'Usuario ja cadastrado.' });
    const newUser = { username: normalized, password, name: name || normalized, role };
    users.push(newUser);
    writeUsers(users);
    res.json({ id: normalized, username: normalized, name: newUser.name, role: newUser.role });
});

app.get('/api/admin/users', (req, res) => { res.json(readUsers()); });

app.post('/api/admin/users', (req, res) => {
    const { username, password, name, role } = req.body;
    const users = readUsers();
    const normalized = (username || '').toLowerCase().trim();
    if (users.find(u => u.username.toLowerCase() === normalized)) return res.status(400).json({ message: 'Usuario ja cadastrado.' });
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

app.get(['/api/public/events', '/api/events'], (req, res) => {
    try { const db = readDb(); res.json(db.events || []); } catch (e) { res.status(500).json({ error: 'Erro ao listar eventos.' }); }
});

app.post('/api/events', (req, res) => {
    const event = req.body;
    const db = readDb();
    if (!event.name) return res.status(400).json({ message: 'Nome do evento e obrigatorio.' });
    const existing = db.events.find(e => e.name.toLowerCase() === event.name.toLowerCase());
    if (existing) return res.status(400).json({ message: 'Ja existe um evento com este nome.' });
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
    if (index === -1) return res.status(404).json({ message: 'Evento nao encontrado.' });
    db.events[index] = { ...db.events[index], ...updates };
    writeDb(db);
    res.json(db.events[index]);
});

app.get('/api/public/registrations', (req, res) => {
    try {
        const db = readDb();
        const eventId = req.query.eventId;
        let list = db.publicRegistrations || [];
        if (eventId) list = list.filter(r => r.eventId === eventId);
        res.json(list);
    } catch (e) { res.status(500).json({ error: 'Erro ao listar inscricoes.' }); }
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
    } catch (e) { res.status(500).json({ error: 'Erro ao salvar inscricao.' }); }
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
            res.status(404).json({ error: 'Inscricao nao encontrada.' });
        }
    } catch (e) { res.status(500).json({ error: 'Erro ao atualizar pagamento.' }); }
});

app.patch('/api/admin/registrations/:id/details', (req, res) => {
    try {
        const db = readDb();
        if (!db.publicRegistrations) db.publicRegistrations = [];
        const { id } = req.params;
        const updates = req.body;
        const index = db.publicRegistrations.findIndex(r => r.id === id || r.clientRequestId === id);
        if (index !== -1) {
            db.publicRegistrations[index] = { ...db.publicRegistrations[index], ...updates };
            writeDb(db);
            res.json(db.publicRegistrations[index]);
        } else {
            res.status(404).json({ error: 'Inscricao nao encontrada.' });
        }
    } catch (e) { res.status(500).json({ error: 'Erro ao atualizar detalhes.' }); }
});

// ═══════════════════════════════════════════════════════════════════════════
//  ETAPA 1: OAUTH 2.0 — VINCULACAO DA CONTA DO ORGANIZADOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/auth/mercadopago/connect?eventId=xxx
 * Gera URL de autorização e redireciona o organizador para o MP.
 */
app.get('/api/auth/mercadopago/connect', (req, res) => {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ error: 'eventId e obrigatorio.' });
    if (!MP_CLIENT_ID) return res.status(500).json({ error: 'MP_CLIENT_ID nao configurado. Adicione ao .env.' });

    const state = Buffer.from(JSON.stringify({ eventId, ts: Date.now() })).toString('base64');
    const authUrl = new URL('https://auth.mercadopago.com/authorization');
    authUrl.searchParams.set('client_id', MP_CLIENT_ID);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('platform_id', 'mp');
    authUrl.searchParams.set('redirect_uri', MP_REDIRECT_URI);
    authUrl.searchParams.set('state', state);

    console.log(`[MP OAuth] Redirecionando organizador para autorizacao. eventId: ${eventId}`);
    res.redirect(authUrl.toString());
});

/**
 * GET /api/auth/mercadopago/callback?code=xxx&state=xxx
 * Callback OAuth: troca o code pelo access_token e salva no banco.
 */
app.get('/api/auth/mercadopago/callback', async (req, res) => {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
        console.error(`[MP OAuth] Acesso negado: ${oauthError}`);
        return res.redirect(`http://localhost:5173/eventos?mp_error=${oauthError}`);
    }

    if (!code || !state) {
        return res.status(400).send('Parametros invalidos no callback OAuth.');
    }

    let eventId;
    try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
        eventId = decoded.eventId;
    } catch {
        return res.status(400).send('State invalido.');
    }

    try {
        const tokenRes = await fetch('https://api.mercadopago.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                client_id: MP_CLIENT_ID,
                client_secret: MP_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: MP_REDIRECT_URI
            })
        });

        const tokenData = await tokenRes.json();

        if (!tokenData.access_token) {
            console.error('[MP OAuth] Falha ao obter token:', tokenData);
            return res.redirect(`http://localhost:5173/eventos?mp_error=token_failed`);
        }

        const db = readDb();
        saveOrganizerToken(db, eventId, tokenData);

        console.log(`[MP OAuth] Token salvo para evento ${eventId}. MP User ID: ${tokenData.user_id}`);
        res.redirect(`http://localhost:5173/eventos/${eventId}?mp_connected=true`);
    } catch (e) {
        console.error('[MP OAuth] Erro:', e.message);
        res.redirect(`http://localhost:5173/eventos?mp_error=server_error`);
    }
});

/**
 * GET /api/organizer-token-status?eventId=xxx
 * Informa se o organizador do evento conectou a conta MP.
 */
app.get('/api/organizer-token-status', (req, res) => {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ error: 'eventId e obrigatorio.' });
    const db = readDb();
    const tokenData = (db.organizerTokens || {})[eventId];
    if (tokenData?.accessToken) {
        res.json({ connected: true, mpUserId: tokenData.mpUserId, connectedAt: tokenData.connectedAt });
    } else {
        res.json({ connected: false });
    }
});

/**
 * DELETE /api/organizer-token?eventId=xxx
 * Desconecta a conta MP do evento.
 */
app.delete('/api/organizer-token', (req, res) => {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ error: 'eventId e obrigatorio.' });
    const db = readDb();
    if (db.organizerTokens && db.organizerTokens[eventId]) {
        delete db.organizerTokens[eventId];
        writeDb(db);
    }
    res.json({ success: true, message: 'Conta Mercado Pago desconectada do evento.' });
});

// ═══════════════════════════════════════════════════════════════════════════
//  ETAPA 2: PIX COM SPLIT (application_fee)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/webhooks/payment/pix
 * Gera PIX Transparente. Se o evento tem token MP do organizador, usa split.
 * Body: { registrationIds, eventId, athleteName, email, cpf, firstName, lastName, amount, applicationFee, dateOfExpiration }
 */
app.post('/api/webhooks/payment/pix', async (req, res) => {
    try {
        const { registrationIds, eventId, athleteName, email, cpf, firstName, lastName, amount, applicationFee, dateOfExpiration } = req.body;
        const db = readDb();
        const accessToken = getAccessTokenForEvent(db, eventId);
        const platformFee = Number(applicationFee ?? MP_PLATFORM_FEE ?? 0);

        const expiration = dateOfExpiration || (() => {
            const d = new Date();
            d.setHours(d.getHours() + 24);
            return d.toISOString().replace('Z', '-03:00');
        })();

        const nameParts = (athleteName || '').trim().split(' ');
        const payer = {
            email: email || 'atleta@genesisesportes.com.br',
            first_name: firstName || nameParts[0] || 'Atleta',
            last_name: lastName || nameParts.slice(1).join(' ') || 'Genesis',
        };
        if (cpf) payer.identification = { type: 'CPF', number: String(cpf).replace(/\D/g, '') };

        const payload = {
            transaction_amount: Number(amount || 0),
            description: `Inscricao Campeonato Genesis - ${athleteName || 'Atleta'}`,
            payment_method_id: 'pix',
            external_reference: String(registrationIds || ''),
            date_of_expiration: expiration,
            payer,
            ...(platformFee > 0 ? { application_fee: platformFee } : {})
        };

        console.log(`[PIX] Gerando. Valor: R$${payload.transaction_amount}, Taxa: R$${platformFee}, Evento: ${eventId}`);

        const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-Idempotency-Key': `genesis-pix-${registrationIds}-${Date.now()}`
            },
            body: JSON.stringify(payload)
        });

        const data = await mpRes.json();

        if (data.id && data.point_of_interaction) {
            const txData = data.point_of_interaction.transaction_data;
            console.log(`[PIX] Gerado com sucesso. ID: ${data.id}, Status: ${data.status}`);
            res.json({
                paymentId: data.id,
                status: data.status,
                qrCode: txData.qr_code,
                qrCodeBase64: txData.qr_code_base64,
                ticketUrl: txData.ticket_url,
                externalReference: registrationIds,
                expiresAt: expiration,
                transactionAmount: data.transaction_amount,
                applicationFee: platformFee
            });
        } else {
            const errMsg = data?.message || data?.error || 'Erro desconhecido';
            console.error('[PIX] Erro MP:', JSON.stringify(data));
            res.status(500).json({ error: `Erro ao gerar PIX: ${errMsg}`, details: data });
        }
    } catch (e) {
        console.error('[PIX] Excecao:', e.message);
        res.status(500).json({ error: 'Erro interno ao gerar PIX.', message: e.message });
    }
});

/**
 * POST /api/webhooks/payment/checkout — Checkout MP padrao com split
 */
app.post('/api/webhooks/payment/checkout', async (req, res) => {
    try {
        const { registrationIds, eventId, athleteName, athleteEmail, amount, applicationFee } = req.body;
        const db = readDb();
        const accessToken = getAccessTokenForEvent(db, eventId);
        const platformFee = Number(applicationFee ?? MP_PLATFORM_FEE ?? 0);

        const origin = req.headers.origin || 'https://genesis-rank.vercel.app';
        const baseSiteUrl = origin.includes('localhost') ? 'https://genesis-rank.vercel.app' : origin;

        const preferencePayload = {
            items: [{ title: `Inscricao Campeonato - ${athleteName || 'Atleta'}`, quantity: 1, unit_price: Number(amount || 0), currency_id: 'BRL' }],
            payer: { name: athleteName || 'Atleta Genesis', email: athleteEmail || 'contato@genesisesportes.com.br' },
            back_urls: { success: `${baseSiteUrl}/sucesso`, failure: `${baseSiteUrl}/falha`, pending: `${baseSiteUrl}/pendente` },
            auto_return: 'approved',
            notification_url: `${baseSiteUrl}/api/webhook-mercadopago`,
            external_reference: String(registrationIds || ''),
            ...(platformFee > 0 ? { marketplace_fee: platformFee } : {})
        };

        const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
            body: JSON.stringify(preferencePayload)
        });

        const mpData = await mpResponse.json();
        if (mpData.init_point || mpData.sandbox_init_point) {
            res.json({ url: mpData.init_point || mpData.sandbox_init_point, id: mpData.id });
        } else {
            console.error('MP Checkout Erro:', mpData);
            res.status(500).json({ error: 'Falha ao gerar link do Mercado Pago', details: mpData });
        }
    } catch (e) {
        console.error('Erro no checkout:', e.message);
        res.status(500).json({ error: 'Erro interno ao processar pagamento.' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
//  ETAPA 3: WEBHOOK MERCADO PAGO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Processa a notificacao do MP e atualiza as inscricoes no banco.
 */
const processWebhookPayment = async (paymentId) => {
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
    });

    if (!mpRes.ok) {
        console.warn(`[Webhook MP] Falha ao consultar pagamento ${paymentId}: HTTP ${mpRes.status}`);
        return;
    }

    const payment = await mpRes.json();
    const status = payment.status;
    const externalRef = payment.external_reference || '';

    console.log(`[Webhook MP] Pagamento ${paymentId}: status=${status}, ref=${externalRef}`);
    if (!externalRef) return;

    const db = readDb();
    if (!db.publicRegistrations) db.publicRegistrations = [];

    const regIds = externalRef.split(',').map(s => s.trim()).filter(Boolean);
    let updated = false;

    regIds.forEach(rId => {
        const idx = db.publicRegistrations.findIndex(r => r.id === rId || r.clientRequestId === rId);
        if (idx === -1) return;

        const reg = db.publicRegistrations[idx];

        if (status === 'approved') {
            db.publicRegistrations[idx] = {
                ...reg, status: 'APPROVED', paymentMethod: 'Mercado Pago PIX',
                transactionId: String(paymentId), paidAt: new Date().toISOString(), webhookUpdatedAt: new Date().toISOString()
            };
            updated = true;
            console.log(`[Webhook MP] Inscricao ${rId}: APPROVED`);
        } else if (status === 'rejected' || status === 'cancelled') {
            db.publicRegistrations[idx] = {
                ...reg, status: 'CANCELLED', mpStatus: status, webhookUpdatedAt: new Date().toISOString()
            };
            updated = true;
            console.log(`[Webhook MP] Inscricao ${rId}: CANCELLED (MP: ${status})`);
        }
    });

    if (updated) {
        writeDb(db);
        console.log(`[Webhook MP] DB atualizado para ref: ${externalRef}`);
    }
};

app.all(['/api/webhook-mercadopago', '/api/webhooks/payment/mercadopago'], async (req, res) => {
    // Responde 200 imediatamente para o MP nao reenviar
    res.status(200).json({ received: true });

    try {
        const body = req.body || {};
        const type = body.type || body.action || '';
        const paymentId = body.data?.id || body.id || req.query['data.id'] || req.query?.id;

        console.log(`[Webhook MP] Recebido: tipo=${type}, paymentId=${paymentId}`);

        if (!paymentId || !type) return;
        if (!type.includes('payment')) return; // Ignora notificacoes nao relacionadas a pagamento

        await processWebhookPayment(paymentId);
    } catch (e) {
        console.error('[Webhook MP] Erro:', e.message);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
//  CONSULTA DE STATUS DO PAGAMENTO (POLLING)
// ═══════════════════════════════════════════════════════════════════════════

app.get(['/api/webhooks/payment/status/:paymentId', '/api/webhooks/payment/status', '/api/status'], async (req, res) => {
    try {
        const paymentId = req.params.paymentId || req.query.paymentId || req.query.id || req.query.collection_id;
        const eventId = req.query.eventId;
        if (!paymentId) return res.status(400).json({ error: 'paymentId e obrigatorio' });

        const db = readDb();
        const accessToken = getAccessTokenForEvent(db, eventId);

        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!mpRes.ok) return res.json({ approved: false, status: 'pending' });

        const data = await mpRes.json();
        const isApproved = data.status === 'approved';

        if (isApproved && data.external_reference) {
            const dbFresh = readDb();
            if (!dbFresh.publicRegistrations) dbFresh.publicRegistrations = [];
            const regIds = data.external_reference.split(',').map(s => s.trim());
            let updated = false;
            regIds.forEach(rId => {
                const idx = dbFresh.publicRegistrations.findIndex(r => r.id === rId || r.clientRequestId === rId);
                if (idx !== -1 && dbFresh.publicRegistrations[idx].status !== 'APPROVED') {
                    dbFresh.publicRegistrations[idx].status = 'APPROVED';
                    dbFresh.publicRegistrations[idx].paymentMethod = 'Mercado Pago PIX';
                    dbFresh.publicRegistrations[idx].transactionId = String(paymentId);
                    dbFresh.publicRegistrations[idx].paidAt = new Date().toISOString();
                    updated = true;
                }
            });
            if (updated) writeDb(dbFresh);
        }

        res.json({ paymentId: data.id, status: data.status, approved: isApproved, externalReference: data.external_reference || '', paymentMethodId: data.payment_method_id, transactionAmount: data.transaction_amount });
    } catch (e) {
        console.error('[Payment Status] Erro:', e.message);
        res.json({ approved: false, status: 'unknown', error: true });
    }
});

app.all(['/api/webhooks/payment/confirm-return', '/api/payment/confirm-return'], async (req, res) => {
    try {
        const registrationIds = req.query.registrationIds || req.body?.registrationIds;
        const paymentId = req.query.paymentId || req.body?.paymentId;
        const eventId = req.query.eventId || req.body?.eventId;

        if (registrationIds && paymentId && paymentId !== 'null' && paymentId !== 'undefined') {
            const db = readDb();
            const accessToken = getAccessTokenForEvent(db, eventId);
            try {
                const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                if (payRes.ok) {
                    const paymentInfo = await payRes.json();
                    if (paymentInfo.status === 'approved') {
                        const regIds = String(registrationIds).split(',').map(s => s.trim());
                        const dbFresh = readDb();
                        if (!dbFresh.publicRegistrations) dbFresh.publicRegistrations = [];
                        let updated = false;
                        regIds.forEach(rId => {
                            const idx = dbFresh.publicRegistrations.findIndex(r => r.id === rId || r.clientRequestId === rId);
                            if (idx !== -1) {
                                dbFresh.publicRegistrations[idx].status = 'APPROVED';
                                dbFresh.publicRegistrations[idx].paymentMethod = 'Mercado Pago';
                                dbFresh.publicRegistrations[idx].transactionId = String(paymentId);
                                updated = true;
                            }
                        });
                        if (updated) writeDb(dbFresh);
                        return res.json({ success: true, status: 'APPROVED' });
                    } else {
                        return res.json({ success: false, status: paymentInfo.status || 'pending' });
                    }
                }
            } catch (err) {
                console.error('[Confirm-return] Erro:', err.message);
            }
        }
        res.json({ success: false, status: 'pending', message: 'Pagamento nao confirmado ou ID ausente' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
//  ETAPA 4: CANCELAMENTO DE INSCRICOES PENDENTES EXPIRADAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/admin/registrations/expire-pending
 * Cancela inscricoes PENDING de eventos com inscricoes encerradas.
 * Body opcional: { eventId } — cancela somente do evento especificado.
 */
app.post('/api/admin/registrations/expire-pending', (req, res) => {
    try {
        const { eventId } = req.body || {};
        const db = readDb();
        if (!db.publicRegistrations) return res.json({ cancelled: 0 });

        const now = new Date();
        let cancelledCount = 0;
        const cancelledIds = [];

        db.publicRegistrations = db.publicRegistrations.map(reg => {
            if (eventId && reg.eventId !== eventId) return reg;
            if (reg.status !== 'PENDING' && reg.status !== 'pending') return reg;

            const event = (db.events || []).find(e => e.id === reg.eventId);
            const closeDate = event?.registrationCloseDate || event?.endDate;
            if (!closeDate) return reg;

            if (now > new Date(closeDate)) {
                cancelledCount++;
                cancelledIds.push(reg.id || reg.clientRequestId);
                console.log(`[Expire] Inscricao ${reg.id} cancelada — evento encerrou em ${closeDate}`);
                return { ...reg, status: 'CANCELLED', cancelledReason: 'EXPIRED_REGISTRATION_PERIOD', cancelledAt: now.toISOString() };
            }
            return reg;
        });

        if (cancelledCount > 0) writeDb(db);

        res.json({ success: true, cancelled: cancelledCount, cancelledIds, processedAt: now.toISOString() });
    } catch (e) {
        console.error('[Expire Pending] Erro:', e.message);
        res.status(500).json({ error: 'Erro ao cancelar inscricoes expiradas.', message: e.message });
    }
});

// Cron interno: roda a cada hora
const runExpirePendingCron = () => {
    try {
        const db = readDb();
        if (!db.publicRegistrations) return;
        const now = new Date();
        let count = 0;

        db.publicRegistrations = db.publicRegistrations.map(reg => {
            if (reg.status !== 'PENDING' && reg.status !== 'pending') return reg;
            const event = (db.events || []).find(e => e.id === reg.eventId);
            const closeDate = event?.registrationCloseDate || event?.endDate;
            if (!closeDate || now <= new Date(closeDate)) return reg;
            count++;
            return { ...reg, status: 'CANCELLED', cancelledReason: 'EXPIRED_REGISTRATION_PERIOD', cancelledAt: now.toISOString() };
        });

        if (count > 0) {
            writeDb(db);
            console.log(`[Cron] ${count} inscricao(oes) cancelada(s) automaticamente.`);
        }
    } catch (e) {
        console.error('[Cron Expire] Erro:', e.message);
    }
};

runExpirePendingCron();
setInterval(runExpirePendingCron, 60 * 60 * 1000);

// ═══════════════════════════════════════════════════════════════════════════
//  START
// ═══════════════════════════════════════════════════════════════════════════
app.listen(PORT, () => {
    console.log(`Backend Genesis: http://localhost:${PORT}`);
    console.log(`MP_ACCESS_TOKEN: ${MP_ACCESS_TOKEN ? 'configurado OK' : 'NAO CONFIGURADO'}`);
    console.log(`MP_CLIENT_ID (OAuth): ${MP_CLIENT_ID ? 'configurado OK' : 'NAO CONFIGURADO'}`);
    console.log(`Taxa da plataforma: R$ ${MP_PLATFORM_FEE}`);
});
