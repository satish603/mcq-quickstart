// pages/api/papers/get.js
import { isDbConfigured, getPaperById } from '../../../lib/papersDb';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  if (!isDbConfigured()) return res.status(500).send('Database not configured: set POSTGRES_URL');

  const id = typeof req.query.id === 'string' ? req.query.id : '';
  if (!id) return res.status(400).send('id required');
  try {
    const row = await getPaperById(id);
    if (!row) return res.status(404).send('not found');
    return res.status(200).json({
      id: row.id,
      name: row.name,
      tenant: row.tenant,
      createdBy: row.created_by,
      createdAt: row.created_at,
      questions: Array.isArray(row.questions_json) ? row.questions_json : (row.questions_json?.questions || []),
    });
  } catch (e) {
    console.error('get paper error:', e);
    return res.status(500).send('failed to load paper');
  }
}

