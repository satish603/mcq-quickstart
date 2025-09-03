// pages/api/generate-mcq.js
import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};


// Preferred models in fallback order; override with GEMINI_MODEL
const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
];

function extractJson(text) {
  if (!text || typeof text !== 'string') return null;
  // Try fenced code block first
  const fenceMatch = text.match(/```(?:json)?\n([\s\S]*?)```/i);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1]); } catch {}
  }
  // Fallback: find first { ... } block
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = text.slice(start, end + 1);
    try { return JSON.parse(candidate); } catch {}
  }
  // Or if it's already JSON array
  const arrStart = text.indexOf('[');
  const arrEnd = text.lastIndexOf(']');
  if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
    const candidate = text.slice(arrStart, arrEnd + 1);
    try { return { questions: JSON.parse(candidate) }; } catch {}
  }
  return null;
}

function normalizeQuestions(payload) {
  let arr = [];
  if (Array.isArray(payload)) arr = payload;
  else if (payload && Array.isArray(payload.questions)) arr = payload.questions;
  // sanitize each item
  const out = [];
  let idCounter = 1;
  for (const q of arr) {
    const text = String(q?.text || '').trim();
    const options = Array.isArray(q?.options) ? q.options.map(String) : [];
    const answerIndex = Number.isInteger(q?.answerIndex) ? q.answerIndex : null;
    if (!text || options.length !== 4 || answerIndex == null || answerIndex < 0 || answerIndex > 3) continue;
    out.push({
      id: q?.id != null ? q.id : idCounter++,
      text,
      options,
      answerIndex,
      explanation: q?.explanation ? String(q.explanation) : undefined,
      tags: Array.isArray(q?.tags) ? q.tags.map(String) : undefined,
    });
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).send('Server missing GEMINI_API_KEY');
  }
  const { imageBase64, pdfBase64, mimeType, prompt, numQuestions = 10 } = req.body || {};
  const src = (() => {
    if (prompt && typeof prompt === 'string' && !imageBase64 && !pdfBase64) return 'prompt';
    if (pdfBase64 && mimeType === 'application/pdf') return 'pdf';
    if (imageBase64 && mimeType && typeof imageBase64 === 'string') return 'image';
    return null;
  })();
  if (!src) return res.status(400).send('Provide either prompt, imageBase64+mimeType, or pdfBase64+application/pdf');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    const basePrompt = `You are an expert MCQ maker. Create strictly JSON with shape:
{
  "questions": [
    { "id": 1, "text": "...", "options": ["A", "B", "C", "D"], "answerIndex": 0, "explanation": "...", "tags": ["..."] },
    ...
  ]
}
Rules:
- Return ONLY JSON, no extra commentary.
- Create up to ${Number(numQuestions) || 10} high-quality questions based on the given source.
- Each question must have exactly 4 options and one correct answer.
- Keep text concise and clear. Explanation is optional.
`;

    // Build content parts once
    let parts;
    if (src === 'prompt') {
      parts = [{ text: `${basePrompt}\n\nTopic/Prompt:\n${prompt}` }];
    } else if (src === 'pdf') {
      const pdfPart = { inlineData: { data: pdfBase64, mimeType: 'application/pdf' } };
      parts = [{ text: `${basePrompt}\n\nSource: PDF document.` }, pdfPart];
    } else {
      const imagePart = { inlineData: { data: imageBase64, mimeType } };
      parts = [{ text: `${basePrompt}\n\nSource: Image.` }, imagePart];
    }

    // Try models with simple retry logic
    let aiText = null;
    const errors = [];
    for (const modelName of MODEL_CANDIDATES) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        // up to 2 attempts per model
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const result = await model.generateContent(parts);
            aiText = result?.response?.text?.();
            if (aiText) break;
          } catch (e) {
            if (attempt === 0) await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));
            else throw e;
          }
        }
        if (aiText) break;
      } catch (e) {
        errors.push(`${modelName}: ${e?.message || e}`);
      }
    }

    if (!aiText) {
      const hint = `Generation failed. Check network and GEMINI_API_KEY. Tried models: ${MODEL_CANDIDATES.join(', ')}`;
      const detail = errors.length ? ` Errors: ${errors.join(' | ')}` : '';
      throw new Error(hint + detail);
    }

    const parsed = extractJson(aiText);
    if (!parsed) throw new Error('Failed to parse JSON from model output');

    const questions = normalizeQuestions(parsed);
    if (!questions.length) throw new Error('No valid questions extracted');

    return res.status(200).json({ questions });
  } catch (err) {
    console.error('generate-mcq error:', err);
    const message = String(err?.message || 'Generation failed');
    // Normalize library fetch error into a clearer hint for UI
    if (/Error fetching from/i.test(message)) {
      return res.status(502).json({ error: 'Upstream AI call failed. Verify GEMINI_API_KEY, model access, and server network.', detail: message });
    }
    return res.status(500).json({ error: message });
  }
}
