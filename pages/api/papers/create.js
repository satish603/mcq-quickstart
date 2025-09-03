// pages/api/papers/create.js
import { isDbConfigured, genPaperId, insertPaper } from '../../../lib/papersDb';
import { TENANT } from '../../../lib/siteConfig';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  if (!isDbConfigured()) return res.status(500).send('Database not configured: set POSTGRES_URL');

  const { name, userId, questions, tenant } = req.body || {};
  if (!name || typeof name !== 'string') return res.status(400).send('name is required');
  if (!userId || typeof userId !== 'string') return res.status(400).send('userId is required');
  if (!Array.isArray(questions)) return res.status(400).send('questions[] is required');

  // sanitize minimal question shape
  const cleaned = questions
    .map((q, idx) => ({
      id: q?.id ?? idx + 1,
      text: String(q?.text || '').trim(),
      options: Array.isArray(q?.options) ? q.options.map(String) : [],
      answerIndex: Number.isInteger(q?.answerIndex) ? q.answerIndex : null,
      explanation: q?.explanation ? String(q.explanation) : undefined,
      tags: Array.isArray(q?.tags) ? q.tags.map(String) : undefined,
    }))
    .filter((q) => q.text && q.options.length === 4 && q.answerIndex != null && q.answerIndex >= 0 && q.answerIndex < 4);

  if (!cleaned.length) return res.status(400).send('no valid questions to save');

  const id = genPaperId();
  try {
    await insertPaper({ id, tenant: tenant || TENANT, name: name.trim(), created_by: userId.trim(), questions: cleaned });

    // Non-blocking sitemap ping (best-effort)
    try {
      const base = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
      if (base) {
        const sitemapUrl = `${base}/sitemap-db.xml`;
        // Fire and forget pings
        fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`).catch(() => {});
        fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`).catch(() => {});
      }
    } catch {}

    return res.status(200).json({ id, slug: id });
  } catch (e) {
    console.error('create paper error:', e);
    return res.status(500).send('failed to save paper');
  }
}
