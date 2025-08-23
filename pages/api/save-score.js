// pages/api/save-score.js
import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, paper, score } = req.body;

  const dataDir = path.join(process.cwd(), 'data');
  const filePath = path.join(dataDir, 'scoreHistory.json');

  // ensure data dir exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  let history = [];
  try {
    history = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    history = [];
  }

  history.push({
    userId: userId ?? '',
    paper: paper ?? '',
    score: Number.isFinite(score) ? score : 0,
    timestamp: new Date().toISOString(),
  });

  fs.writeFileSync(filePath, JSON.stringify(history, null, 2), 'utf8');
  return res.status(200).json({ success: true });
}
