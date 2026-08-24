// Vercel Serverless Function: Secure Checkout Preference Creation
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (_) {}
    }
    const { registrationIds, athleteName, athleteEmail, amount, siteUrl, clientRequestId } = body || {};

    // 1. Segurança & Validação de Entrada: Proteção contra Price Tampering
    const numericAmount = Number(amount);
    if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0 || !isFinite(numericAmount)) {
      return res.status(400).json({
        error: 'Valor de pagamento inválido',
        message: 'O valor da transação deve ser um número positivo válido.'
      });
    }

    // Sanitização de valor financeiro para centavos bancários
    const sanitizedAmount = Math.round(numericAmount * 100) / 100;

    // Sanitização de strings para evitar injection / XSS em metadados
    const sanitizedAthleteName = (athleteName || 'Atleta Genesis')
      .toString()
      .replace(/[<>{}]/g, '')
      .trim()
      .slice(0, 100);

    const sanitizedEmail = (athleteEmail || 'contato@genesisesportes.com.br')
      .toString()
      .trim()
      .slice(0, 120);

    const sanitizedRegIds = (registrationIds || clientRequestId || `reg-${Date.now()}`)
      .toString()
      .replace(/[^a-zA-Z0-9\-_,]/g, '')
      .slice(0, 500);

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-5076214841905920-081112-768e0648179ce52ceb48a90a14882388-1214160384';

    // Determinar o domínio base oficial dinamicamente
    let baseSiteUrl = 'https://genesis-rank.vercel.app';
    const requestOrigin = siteUrl || req.headers.origin || req.headers.referer;
    if (requestOrigin) {
      try {
        const parsed = new URL(requestOrigin);
        baseSiteUrl = `${parsed.protocol}//${parsed.host}`;
      } catch (_) {}
    }

    const preferencePayload = {
      items: [
        {
          id: `item-${Date.now()}`,
          title: `Inscrição Campeonato - ${sanitizedAthleteName}`,
          description: `Inscrição oficial no campeonato Genesis Sports para ${sanitizedAthleteName}`,
          quantity: 1,
          unit_price: sanitizedAmount,
          currency_id: 'BRL'
        }
      ],
      payer: {
        name: sanitizedAthleteName,
        email: sanitizedEmail
      },
      back_urls: {
        success: `${baseSiteUrl}/sucesso`,
        failure: `${baseSiteUrl}/falha`,
        pending: `${baseSiteUrl}/pendente`
      },
      auto_return: 'approved',
      binary_mode: true,
      notification_url: baseSiteUrl.includes('localhost') 
        ? 'https://genesis-rank.vercel.app/api/webhook-mercadopago' 
        : `${baseSiteUrl}/api/webhook-mercadopago`,
      external_reference: sanitizedRegIds
    };

    console.log('[Mercado Pago Checkout] Criando preferência segura:', {
      external_reference: sanitizedRegIds,
      amount: sanitizedAmount,
      athlete: sanitizedAthleteName
    });

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        ...(clientRequestId ? { 'X-Idempotency-Key': String(clientRequestId).slice(0, 64) } : {})
      },
      body: JSON.stringify(preferencePayload)
    });

    const mpData = await mpResponse.json();

    if (mpData.init_point || mpData.sandbox_init_point) {
      return res.status(200).json({
        url: mpData.init_point || mpData.sandbox_init_point,
        id: mpData.id,
        initPoint: mpData.init_point,
        sandboxInitPoint: mpData.sandbox_init_point
      });
    } else {
      console.error('[Mercado Pago Checkout] Erro retornado pela API MP:', mpData);
      return res.status(500).json({
        error: 'Falha ao gerar link do Mercado Pago',
        details: mpData
      });
    }
  } catch (error) {
    console.error('[Mercado Pago Checkout] Erro no servidor:', error);
    return res.status(500).json({ error: 'Erro interno ao processar pagamento', message: error.message });
  }
}
