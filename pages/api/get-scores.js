// pages/api/get-scores.js
import { getScores } from '../../lib/scoreStore';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, limit } = req.query || {};
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const rows = await getScores(userId, Number(limit) || 50);
    // Keep the same shape your UI expects:
    return res.status(200).json({ rows });
  } catch (err) {
    console.error('get-scores error', err);
    return res.status(500).json({ error: 'Failed to fetch scores' });
  }
}
