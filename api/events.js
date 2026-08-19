// Vercel Serverless Function: Events Management (/api/events)
let inMemoryEvents = [];

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
    return res.status(200).json(inMemoryEvents);
  }

  if (req.method === 'POST') {
    try {
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const newEvent = {
        ...payload,
        id: payload.id || `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: payload.createdAt || new Date().toISOString()
      };
      inMemoryEvents.push(newEvent);
      return res.status(201).json(newEvent);
    } catch (err) {
      return res.status(400).json({ error: 'Erro ao criar evento', message: err.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const id = req.query?.id || payload.id;
      const index = inMemoryEvents.findIndex(e => e.id === id);
      if (index >= 0) {
        inMemoryEvents[index] = { ...inMemoryEvents[index], ...payload };
        return res.status(200).json(inMemoryEvents[index]);
      }
      inMemoryEvents.push(payload);
      return res.status(200).json(payload);
    } catch (err) {
      return res.status(400).json({ error: 'Erro ao atualizar evento', message: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
