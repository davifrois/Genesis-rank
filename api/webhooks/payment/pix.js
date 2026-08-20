// Vercel Serverless Function: PIX Transparente via Mercado Pago
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
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
    const { registrationIds, athleteName, email, amount } = body || {};
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-5076214841905920-081112-768e0648179ce52ceb48a90a14882388-1214160384';

    const transactionAmount = Number(amount || 0);
    if (transactionAmount <= 0) {
      return res.status(400).json({ error: 'Valor inválido para PIX', amount });
    }

    const payerEmail = email || 'atleta@genesisesportes.com.br';
    const payerName = athleteName || 'Atleta';

    const pixPayload = {
      transaction_amount: transactionAmount,
      description: `Inscrição Campeonato - ${payerName}`,
      payment_method_id: 'pix',
      external_reference: String(registrationIds || ''),
      notification_url: 'https://genesis-rank.vercel.app/api/webhook-mercadopago',
      payer: {
        email: payerEmail,
        first_name: payerName.split(' ')[0] || payerName,
        last_name: payerName.split(' ').slice(1).join(' ') || ''
      }
    };

    console.log('[PIX API] Gerando PIX transparente:', { amount: transactionAmount, registrationIds, payerEmail });

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Idempotency-Key': `pix-${registrationIds}-${Date.now()}`
      },
      body: JSON.stringify(pixPayload)
    });

    const data = await mpResponse.json();

    console.log('[PIX API] Resposta Mercado Pago status:', mpResponse.status, 'id:', data.id, 'status:', data.status);

    if (data.id && data.point_of_interaction) {
      const txData = data.point_of_interaction.transaction_data || {};
      return res.status(200).json({
        paymentId: data.id,
        status: data.status,
        qrCode: txData.qr_code || null,
        qrCodeBase64: txData.qr_code_base64 || null,
        ticketUrl: txData.ticket_url || null,
        externalReference: registrationIds
      });
    }

    console.error('[PIX API] Erro retornado pelo Mercado Pago:', JSON.stringify(data));
    return res.status(500).json({
      error: data.message || 'Erro ao gerar PIX no Mercado Pago',
      cause: data.cause || [],
      details: data
    });
  } catch (error) {
    console.error('[PIX API] Erro interno:', error);
    return res.status(500).json({ error: 'Erro interno ao processar PIX', message: error.message });
  }
}
