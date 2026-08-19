// Vercel Serverless Function: Check Payment Status
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const paymentId = req.query.paymentId || req.query.id;

  if (!paymentId) {
    return res.status(400).json({ error: 'paymentId é obrigatório' });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-5076214841905920-081112-768e0648179ce52ceb48a90a14882388-1214160384';

  try {
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!mpRes.ok) {
      return res.status(200).json({ approved: false, status: 'pending' });
    }

    const data = await mpRes.json();
    const isApproved = data.status === 'approved';

    return res.status(200).json({
      paymentId: data.id,
      status: data.status,
      approved: isApproved,
      externalReference: data.external_reference || '',
      paymentMethodId: data.payment_method_id,
      transactionAmount: data.transaction_amount
    });
  } catch (error) {
    console.error('[Payment Status API] Erro ao consultar pagamento:', error);
    return res.status(200).json({ approved: false, status: 'error', message: error.message });
  }
}
