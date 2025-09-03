// pages/api/get-scores.js
import { getScores, getScoresAfter } from '../../lib/scoreStore';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, limit, afterId } = req.query || {};
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const lim = Number(limit) || 50;
    const after = Number(afterId);
    const rows = Number.isFinite(after) && after > 0
      ? await getScoresAfter(userId, after, lim)
      : await getScores(userId, lim);
    // Keep the same shape your UI expects:
    return res.status(200).json({ rows });
  } catch (err) {
    console.error('get-scores error', err);
    return res.status(500).json({ error: 'Failed to fetch scores' });
  }
}
