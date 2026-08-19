// Vercel Serverless Function: Global Data Sync (/api/data)
let inMemoryData = null;

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

  if (req.method === 'GET') {
    if (inMemoryData) {
      return res.status(200).json(inMemoryData);
    }
    return res.status(200).json({ schemaVersion: 3, events: [], athletes: [], news: [], academies: [] });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      inMemoryData = payload;
      return res.status(200).json({ success: true, message: 'Dados sincronizados com sucesso' });
    } catch (err) {
      return res.status(400).json({ error: 'Payload inválido', message: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
