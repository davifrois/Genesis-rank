// Vercel Serverless Function: Confirm Return
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const registrationIds = req.query.registrationIds || req.body?.registrationIds;
  const paymentId = req.query.paymentId || req.body?.paymentId;

  console.log(`[Confirm Return API] RegistrationIds: ${registrationIds}, PaymentId: ${paymentId}`);

  return res.status(200).json({
    success: true,
    registrationIds: registrationIds || null,
    paymentId: paymentId || null,
    status: 'APPROVED',
    confirmedAt: new Date().toISOString()
  });
}
