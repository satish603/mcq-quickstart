// pages/api/get-scores.js
import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;
  const filePath = path.join(process.cwd(), 'data', 'scoreHistory.json');

  let all = [];
  try {
    all = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    all = [];
  }

  const filtered = userId
    ? all.filter((r) => r.userId === userId)
    : all;

  // newest first
  filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return res.status(200).json({ rows: filtered });
}
