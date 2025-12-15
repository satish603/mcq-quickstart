// pages/api/generate-mcq.js
import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};


// Preferred models in fallback order; override with GEMINI_MODEL (first entry wins)
// API versions: 2.5/2.0 use v1beta; 1.5 uses v1.
const DEFAULT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-8b',
];

const MODEL_CANDIDATES = Array.from(
  new Set([process.env.GEMINI_MODEL, ...DEFAULT_MODELS].filter(Boolean))
).map((model) => ({
  model,
  apiVersion: /2\.5|2\.0/.test(model) ? 'v1beta' : 'v1',
}));
const MAX_PER_CALL = 50;        // cap per model call to avoid truncation
const MAX_TOTAL = 200;          // absolute upper bound server-side

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

    const basePromptTmpl = (count) => `You are an expert MCQ maker. Create strictly JSON with shape:
{
  "questions": [
    { "id": 1, "text": "...", "options": ["A", "B", "C", "D"], "answerIndex": 0, "explanation": "...", "tags": ["..."] },
    ...
  ]
}
Rules:
 - Return ONLY JSON, no extra commentary.
 - Create up to ${count} high-quality questions based on the given source.
 - Each question must have exactly 4 options and one correct answer.
 - Keep text concise and clear. Explanation is optional.
`;
    const callOnce = async (count) => {
      // Build content parts for this batch
      let parts;
      if (src === 'prompt') {
        parts = [{ text: `${basePromptTmpl(count)}\n\nTopic/Prompt:\n${prompt}` }];
      } else if (src === 'pdf') {
        const pdfPart = { inlineData: { data: pdfBase64, mimeType: 'application/pdf' } };
        parts = [{ text: `${basePromptTmpl(count)}\n\nSource: PDF document.` }, pdfPart];
      } else {
        const imagePart = { inlineData: { data: imageBase64, mimeType } };
        parts = [{ text: `${basePromptTmpl(count)}\n\nSource: Image.` }, imagePart];
      }

      let aiText = null;
      const errors = [];
      for (const { model: modelName, apiVersion } of MODEL_CANDIDATES) {
        try {
          const generationConfig = {
            maxOutputTokens: 8192,
            temperature: 0.3,
          };
          // responseMimeType is only accepted on v1beta; it 400s on v1.
          if (apiVersion === 'v1beta') {
            generationConfig.responseMimeType = 'application/json';
          }
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig,
          }, { apiVersion });
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
        const quotaIssues = errors.some((msg) =>
          /quota|Too Many Requests|limit: 0|exceeded your current quota/i.test(msg || '')
        );
        const baseHint = quotaIssues
          ? 'Generation failed due to Gemini quota/plan limits for the attempted models. Try a model available on your plan (set GEMINI_MODEL, e.g., gemini-1.5-flash) or update billing/quota.'
          : 'Generation failed. Check network and GEMINI_API_KEY.';
        const detail = errors.length ? ` Errors: ${errors.join(' | ')}` : '';
        const modelList = MODEL_CANDIDATES.map(({ model, apiVersion }) => `${model}(${apiVersion})`).join(', ');
        throw new Error(`${baseHint} Tried models: ${modelList}.${detail}`);
      }
      const parsed = extractJson(aiText);
      if (!parsed) throw new Error('Failed to parse JSON from model output');
      const qs = normalizeQuestions(parsed);
      return qs;
    };

    // Aggregate in safe batches for large requests
    const target = Math.max(1, Math.min(MAX_TOTAL, Number(numQuestions) || 10));
    const seen = new Set();
    const all = [];
    let guard = 0;
    while (all.length < target && guard < 10) {
      const need = Math.min(MAX_PER_CALL, target - all.length);
      const batch = await callOnce(need);
      for (const q of batch) {
        const sig = `${q.text}||${Array.isArray(q.options) ? q.options.join('|') : ''}`.toLowerCase();
        if (!seen.has(sig)) {
          seen.add(sig);
          all.push(q);
          if (all.length >= target) break;
        }
      }
      // stop if model returns nothing new
      if (!batch.length) break;
      guard++;
    }

    if (!all.length) throw new Error('No valid questions extracted');

    // Re-id sequentially
    const questions = all.map((q, idx) => ({ ...q, id: idx + 1 }));
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
