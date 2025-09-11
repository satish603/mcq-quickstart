// pages/api/interview.js
import { GoogleGenerativeAI } from '@google/generative-ai';

// Reuse body size similar to MCQ generation in case of large transcripts
export const config = {
  api: {
    bodyParser: { sizeLimit: '2mb' },
  },
};

// Prefer same model family as MCQ generator for consistency
const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
];

function extractJson(text) {
  if (!text || typeof text !== 'string') return null;
  const fenceMatch = text.match(/```(?:json)?\n([\s\S]*?)```/i);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1]); } catch {}
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = text.slice(start, end + 1);
    try { return JSON.parse(candidate); } catch {}
  }
  return null;
}

function clampScore(n) {
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).send('Server missing GEMINI_API_KEY');

  const {
    topic = '',
    level = 'medium', // easy|medium|hard
    transcript = [],   // [{ role: 'interviewer'|'candidate', content: '...' }]
    maxQuestions = 8,
    style = 'technical', // technical|behavioral
  } = req.body || {};

  const safeTopic = String(topic || '').slice(0, 200);
  const lvl = ['easy', 'medium', 'hard'].includes(String(level)) ? String(level) : 'medium';
  const sty = ['technical', 'behavioral'].includes(String(style)) ? String(style) : 'technical';
  const turns = Array.isArray(transcript) ? transcript.slice(-16) : [];
  const askedCount = turns.filter((t) => t && t.role === 'interviewer').length;
  const remaining = Math.max(0, Math.min(50, Number(maxQuestions) || 8) - askedCount);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    let aiText = null;
    const errors = [];

    const rubric = sty === 'behavioral'
      ? `Interview style: Behavioral (STAR). Focus on Situation, Task, Action, Result. Evaluate clarity, ownership, impact, and reflection.`
      : `Interview style: Technical. Focus on correctness, depth, trade-offs, time/space complexity (when relevant), and practical examples.`;

    const guidance = `You are an expert ${sty} interviewer.
Ask ONE question at a time, adaptively based on the topic and the candidate's last answer. Be concise and specific.
Return ONLY JSON with this shape:
{
  "next": {
    "question": "...",
    "type": "open", // keep open-ended for now
    "difficulty": "easy|medium|hard",
    "followups": ["...", "..."]
  },
  "evaluation": {
    "lastAnswerScore": 0.0, // 0..1, null on first turn
    "feedback": "one short paragraph of actionable feedback",
    "strengths": ["..."],
    "weaknesses": ["..."],
    "corrections": "provide the correct/ideal points if the answer was incomplete or wrong"
  },
  "done": false,
  "summary": null // when done: { "overallScore": 0..1, "notes": "...", "recommendation": "..." }
}
Rules:
- Keep the JSON valid. No markdown. No commentary outside JSON.
- If there is no candidate answer yet, set evaluation fields appropriately and start with a scoped first question.
- If enough questions have been asked (target ${Math.max(1, Math.min(20, Number(maxQuestions) || 8))}), set done=true and include a concise summary.`;

    const transcriptSnippet = JSON.stringify(turns.map((t) => ({
      role: t?.role === 'candidate' ? 'candidate' : 'interviewer',
      content: String(t?.content || '').slice(0, 2000)
    })), null, 2);

    const userParts = [{
      text: `${guidance}
Topic: ${safeTopic || '(general)'}
Target level: ${lvl}
${rubric}
Asked so far: ${askedCount}. Remaining budget (approx): ${remaining}.

Recent transcript (most recent last):\n${transcriptSnippet}
` }];

    for (const modelName of MODEL_CANDIDATES) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 2048,
            temperature: 0.4,
          },
        });
        // up to 2 attempts per model
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const result = await model.generateContent(userParts);
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
    if (!parsed || typeof parsed !== 'object') throw new Error('Failed to parse JSON from model output');

    // light normalization/validation
    const next = parsed.next && typeof parsed.next === 'object' ? parsed.next : {};
    const evaluation = parsed.evaluation && typeof parsed.evaluation === 'object' ? parsed.evaluation : {};
    const resp = {
      next: {
        question: String(next.question || '').trim() || 'Let’s begin. Briefly outline your understanding of the topic.',
        type: 'open',
        difficulty: ['easy', 'medium', 'hard'].includes(String(next.difficulty)) ? next.difficulty : lvl,
        followups: Array.isArray(next.followups) ? next.followups.map(String).slice(0, 4) : [],
      },
      evaluation: {
        lastAnswerScore: evaluation.lastAnswerScore == null ? null : clampScore(Number(evaluation.lastAnswerScore)),
        feedback: evaluation.feedback ? String(evaluation.feedback) : '',
        strengths: Array.isArray(evaluation.strengths) ? evaluation.strengths.map(String).slice(0, 5) : [],
        weaknesses: Array.isArray(evaluation.weaknesses) ? evaluation.weaknesses.map(String).slice(0, 5) : [],
        corrections: evaluation.corrections ? String(evaluation.corrections) : '',
      },
      done: Boolean(parsed.done),
      summary: parsed.summary && typeof parsed.summary === 'object' ? parsed.summary : null,
    };

    return res.status(200).json(resp);
  } catch (err) {
    console.error('interview api error:', err);
    const message = String(err?.message || 'Interview generation failed');
    if (/Error fetching from/i.test(message)) {
      return res.status(502).json({ error: 'Upstream AI call failed. Verify GEMINI_API_KEY, model access, and server network.', detail: message });
    }
    return res.status(500).json({ error: message });
  }
}

