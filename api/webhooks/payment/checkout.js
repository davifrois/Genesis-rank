// Vercel Serverless Function: Checkout Preference Creation
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
    const { registrationIds, athleteName, athleteEmail, amount } = req.body || {};
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-5076214841905920-081112-768e0648179ce52ceb48a90a14882388-1214160384';

    // Determinar o domínio base
    const hostHeader = req.headers['x-forwarded-host'] || req.headers.host || 'genesis-rank.vercel.app';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const origin = `${proto}://${hostHeader}`;
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

    console.log('[Mercado Pago Checkout] Criando preferência:', preferencePayload);

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
