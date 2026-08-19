// Vercel Serverless Function: Webhook Mercado Pago
export default async function handler(req, res) {
  // Configurar cabeçalhos CORS
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

  try {
    const body = req.body || {};
    const query = req.query || {};

    // O Mercado Pago pode enviar o ID de diferentes formas dependendo do tipo de notificação (Webhooks v1 vs IPN)
    const paymentId = 
      body?.data?.id || 
      body?.id || 
      query?.['data.id'] || 
      query?.id || 
      (body?.type === 'payment' && body?.data?.id);

    const type = body?.type || body?.topic || query?.topic || query?.type || 'payment';

    console.log(`[Mercado Pago Webhook] Recebido: tipo=${type}, paymentId=${paymentId}`, {
      body,
      query
    });

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-5076214841905920-081112-768e0648179ce52ceb48a90a14882388-1214160384';

    if (paymentId && accessToken) {
      try {
        // Consultar status atualizado do pagamento na API do Mercado Pago
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (mpRes.ok) {
          const paymentData = await mpRes.json();
          const isApproved = paymentData.status === 'approved';
          const externalRef = paymentData.external_reference;

          console.log(`[Mercado Pago Webhook] Pagamento ID ${paymentId} -> Status: ${paymentData.status}, Ref: ${externalRef}`);

          if (isApproved) {
            console.log(`[Mercado Pago Webhook] Pagamento APROVADO para referência: ${externalRef}`);
          }

          return res.status(200).json({
            received: true,
            paymentId,
            status: paymentData.status,
            approved: isApproved,
            externalReference: externalRef
          });
        }
      } catch (mpError) {
        console.error('[Mercado Pago Webhook] Erro ao consultar pagamento na API MP:', mpError);
      }
    }

    // Sempre responder 200 OK para o Mercado Pago não reenviar a notificação repetidamente
    return res.status(200).json({ received: true, paymentId: paymentId || null });
  } catch (error) {
    console.error('[Mercado Pago Webhook] Erro ao processar:', error);
    // Mesmo em caso de erro interno, responder 200 para evitar flood do webhook
    return res.status(200).json({ received: true, error: error.message });
  }
}
