// pages/api/save-score.js
import { saveScore } from '../../lib/scoreStore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, paper, score, meta } = req.body || {};
    if (!userId || !paper || typeof score !== 'number') {
      return res.status(400).json({ error: 'userId, paper, score are required' });
    }

    const record = await saveScore({ userId, paper, score, meta: meta || {} });
    return res.status(200).json({ ok: true, record });
  } catch (err) {
    console.error('save-score error', err);
    return res.status(500).json({ error: 'Failed to save score' });
  }
}
