import webhookHandler from '../../webhook-mercadopago.js';

export default async function handler(req, res) {
  return webhookHandler(req, res);
}
