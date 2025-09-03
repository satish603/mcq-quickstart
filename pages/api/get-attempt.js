// pages/api/get-attempt.js
import { getAttempt } from '../../lib/scoreStore';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query || {};
    const numId = Number(id);
    if (!Number.isFinite(numId) || numId <= 0) {
      return res.status(400).json({ error: 'valid id is required' });
    }
    const record = await getAttempt(numId);
    if (!record) return res.status(404).json({ error: 'Attempt not found' });
    return res.status(200).json({ record });
  } catch (err) {
    console.error('get-attempt error', err);
    return res.status(500).json({ error: 'Failed to fetch attempt' });
  }
}

