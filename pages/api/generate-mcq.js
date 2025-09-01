// pages/api/generate-mcq.js
import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const MODEL_NAME = 'gemini-1.5-flash';

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
  const { imageBase64, mimeType, numQuestions = 10 } = req.body || {};
  if (!imageBase64 || !mimeType || typeof imageBase64 !== 'string' || typeof mimeType !== 'string') {
    return res.status(400).send('imageBase64 and mimeType are required');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `You are an expert MCQ maker. Analyze the provided image and create strictly JSON with shape:
{
  "questions": [
    { "id": 1, "text": "...", "options": ["A", "B", "C", "D"], "answerIndex": 0, "explanation": "...", "tags": ["..."] },
    ...
  ]
}
Rules:
- Return ONLY JSON, no extra commentary.
- Create up to ${Number(numQuestions) || 10} high-quality questions based on the image text.
- Each question must have exactly 4 options and one correct answer.
- Keep text concise and clear. Explanation is optional.
`;

    const imagePart = { inlineData: { data: imageBase64, mimeType } };
    const result = await model.generateContent([{ text: prompt }, imagePart]);
    const aiText = result?.response?.text?.();
    if (!aiText) throw new Error('Empty response from model');

    const parsed = extractJson(aiText);
    if (!parsed) throw new Error('Failed to parse JSON from model output');

    const questions = normalizeQuestions(parsed);
    if (!questions.length) throw new Error('No valid questions extracted');

    return res.status(200).json({ questions });
  } catch (err) {
    console.error('generate-mcq error:', err);
    return res.status(500).send(err?.message || 'Generation failed');
  }
}

