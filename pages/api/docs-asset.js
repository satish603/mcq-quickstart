// pages/api/docs-asset.js
import fs from 'fs';
import path from 'path';

const DOCS_ROOT = path.join(process.cwd(), 'docs');

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

export const config = { api: { bodyParser: false } };

export default function handler(req, res) {
  try {
    const q = String(req.query?.f || '').replace(/\\/g, '/');
    if (!q || q.includes('..')) return res.status(400).send('Bad path');
    const abs = path.resolve(path.join(DOCS_ROOT, q));
    if (!abs.startsWith(path.resolve(DOCS_ROOT))) return res.status(400).send('Bad path');
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return res.status(404).send('Not found');
    const ext = path.extname(abs).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', type);
    // Basic caching for static docs assets
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const stream = fs.createReadStream(abs);
    stream.pipe(res);
  } catch (e) {
    res.status(500).send('Error');
  }
}

