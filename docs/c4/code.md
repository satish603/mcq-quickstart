# C4 — Level 4: Code (Selected Details)

This level highlights selected code-level shapes relevant for maintainers.

## Questions Data Model
- Location: `public/questions/**.json`
- Shapes:
  - Array of items: `[{ id, text, options[], answerIndex, explanation?, tags?[] }, ...]`
  - Or wrapper with `questions`: `{ questions: [ ... ] }`

Example item:

```json
{
  "id": 42,
  "text": "Which keyword defines a function in Python?",
  "options": ["func", "def", "function", "lambda"],
  "answerIndex": 1,
  "explanation": "Functions are defined using the def keyword.",
  "tags": ["python", "basics"]
}
```

## Negative Marking
- Source of truth: `data/papers.config.js`
- Function: `getNegativeMark(paperId)`
- Consumers: quiz runtime scoring and `components/ResultSummary.jsx`

## Session Persistence (Quiz)
- Key: `mcq_session:${userId}:${paper}:${mode}:${randomFlag}`
- Payload (v2):
  - `order`, `orderSig`, `selectedIdxs`, `peeked`, `bookmarked`, `currentIdx`
  - `initialTimeSec`, `timeLeft`, `ts`, and basic context
- Validation on resume: length, signature, age (< 7 days)

## Score History API
- `POST /api/save-score` appends `{ userId, paper, score, timestamp }` to `data/scoreHistory.json`.
- `GET /api/get-scores?userId=...` filters return by `userId`.
- Note: Use a DB/KV for production durability.

## AI APIs
- MCQ Generator: `pages/api/generate-mcq.js`
  - Uses `@google/generative-ai` client.
  - Validates/normalizes model output into a consistent MCQ JSON shape.
- Virtual Interviewer: `pages/api/interview.js`
  - Prompts Gemini for a single next question + evaluation per turn.
  - Expects pure JSON (no markdown). Handles errors and retries across models.

## SEO
- Default SEO: `next-seo.config.js` + `pages/_app.jsx`.
- Per-paper SSG: `pages/papers/[id].jsx` with JSON-LD (`ItemList`, `BreadcrumbList`).
- Sitemaps: `next-sitemap.config.js` via `npm run build` → `postbuild` hook.

