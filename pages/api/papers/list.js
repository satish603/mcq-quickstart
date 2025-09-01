// pages/api/papers/list.js
import { isDbConfigured, listPapers } from '../../../lib/papersDb';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  if (!isDbConfigured()) return res.status(500).send('Database not configured: set POSTGRES_URL');
  try {
    const tenant = typeof req.query.tenant === 'string' ? req.query.tenant : undefined;
    const rows = await listPapers({ tenant });
    return res.status(200).json({ rows });
  } catch (e) {
    console.error('list papers error:', e);
    return res.status(500).send('failed to list papers');
  }
}

