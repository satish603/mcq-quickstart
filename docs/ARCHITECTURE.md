# Architecture Guide

This document explains how the app is put together, how data flows, and how to extend or operate it. It is written without special diagram tooling so it renders well anywhere (GitHub, IDE, in‑app viewer).

## 1) What This Is
- Multi‑tenant MCQ quiz web app (Next.js + Tailwind).
- Two tenants supported out of the box: `nursing` and `it`.
- Questions are plain JSON under `public/questions/**`.
- Quiz sessions persist locally; scores are appended to a JSON file via API (for dev; swap to a DB for production).
- SEO‑friendly pages per paper and a generated sitemap.

## 2) System Overview (Text Diagram)

```
User (browser)
  ├─ Renders Next.js pages (SSR/SSG + SPA)
  ├─ Persists quiz sessions in localStorage
  ├─ Calls API routes for scores + AI features
  └─ (Optional) Text‑to‑speech + speech recognition

Next.js app (server/build)
  ├─ Pages (index, quiz, per‑paper SEO)
  ├─ API routes (get/save score, AI MCQ, AI interview)
  └─ Sitemap/robots generation

Persistence (dev)
  └─ data/scoreHistory.json (append‑only; NOT durable on serverless)

External
  ├─ Google Gemini (AI generation)
  ├─ Search engines (SEO crawl)
  └─ GA4 (optional analytics)
```

## 3) Repo Structure (High Level)
- `pages/`
  - `index.jsx` — Home (tabs for Quiz, Scores, AI Gen, Library, Interview)
  - `quiz.jsx` — Quiz runtime (timer, navigation, search, map, scoring)
  - `papers/[id].jsx` — SEO landing per paper (SSG + JSON‑LD)
  - `api/get-scores.js`, `api/save-score.js` — JSON‑file backed API
  - `api/generate-mcq.js`, `api/interview.js` — AI endpoints (Gemini)
- `components/` — Quiz UI + AI tools (Question card, Result summary, Map, Timer, Theme toggle, AiMcqGenerator, VirtualInterviewer)
- `data/` — Lists & configs (`paperList.js`, `papers.config.js`)
- `lib/siteConfig.js` — Tenant + branding via public env vars
- `public/questions/**` — Question banks (JSON)
- `docs/` — Architecture & C4 docs; in‑app viewer at `/docs`

## 4) Install, Run, Build
- Install: `npm install`
- Dev: `npm run dev` (http://localhost:3000)
- Build: `npm run build` → `npm start`
- Sitemap: `postbuild` runs `next-sitemap`

## 5) Environment (.env.local)
- `NEXT_PUBLIC_TENANT` = `nursing` | `it`
- `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_TAGLINE`, `NEXT_PUBLIC_PRIMARY_KEYWORDS`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` (optional), `NEXT_PUBLIC_GSC_VERIFICATION` (optional)
- `GEMINI_API_KEY` (server‑side only)

## 6) Data Model (Questions)
- File shapes:
  - Array of items: `[{ id, text, options[], answerIndex, explanation?, tags?[] }, ...]`
  - Or wrapped: `{ questions: [ ... ] }`

Example:

```
{
  "id": 42,
  "text": "Which keyword defines a function in Python?",
  "options": ["func", "def", "function", "lambda"],
  "answerIndex": 1,
  "explanation": "Functions are defined using the def keyword.",
  "tags": ["python", "basics"]
}
```

## 7) Negative Marking
- Source of truth: `data/papers.config.js` → `getNegativeMark(paperId)`.
- Quiz uses this value for scoring; summary receives `negativeMark` from quiz.

## 8) Quiz Session Persistence
- Key: `mcq_session:${userId}:${paper}:${mode}:${randomFlag}`
- Payload v2:
  - `order`, `orderSig`, `selectedIdxs`, `peeked`, `bookmarked`, `currentIdx`
  - `initialTimeSec`, `timeLeft`, `ts`, and context
- Resume validates length, signature, and age (< 7 days).

## 9) Score History API (Dev JSON)
- POST `/api/save-score` → append `{ userId, paper, score, timestamp, meta? }` to `data/scoreHistory.json`.
- GET `/api/get-scores?userId=...&afterId?=&limit?=` → returns rows filtered by `userId`.
- Production note: replace JSON file with a proper DB/KV while keeping the same API shape.

## 10) AI Endpoints (Gemini)
### MCQ Generator — `pages/api/generate-mcq.js`
- Input: topic + constraints.
- Output: normalized MCQ list (valid JSON).

### Virtual Interviewer — `pages/api/interview.js`
- Input: `{ topic, level, style, transcript, maxQuestions }`
- Output JSON:
  - `next: { question, type: 'open', difficulty, followups[] }`
  - `evaluation: { lastAnswerScore 0..1|null, feedback, strengths[], weaknesses[], corrections }`
  - `done: boolean`, `summary?: { overallScore, notes, recommendation }`

## 11) Voice Features (Client)
- TTS (speechSynthesis) and ASR (SpeechRecognition/webkitSpeechRecognition) are optional.
- Auto‑listen is off by default; users can opt in.
- End‑of‑answer phrases and silence timeout control voice submission.

## 12) SEO & Sitemaps
- Default SEO via `next-seo.config.js`.
- Per‑paper SSG adds JSON‑LD (`ItemList` + `BreadcrumbList`).
- `next-sitemap` generates sitemaps/robots at build.

## 13) Tenancy & Branding
- `NEXT_PUBLIC_TENANT` switches copy, landing pages, and paper set filtering.
- Branding + canonical URL via `NEXT_PUBLIC_*` env vars.

## 14) Known Caveats
- JSON file persistence is not durable on serverless platforms (e.g., Vercel). Swap to DB/KV for production.
- Some legacy content may contain encoding artifacts; prefer plain ASCII or UTF‑8.

## 15) Extending
- Add papers: drop JSON under `public/questions/**`, then register in `data/paperList.js`.
- Change negative marking: edit `data/papers.config.js` (`PAPER_DEFAULTS` or per‑paper).
- DB persistence: replace score APIs with DB/KV calls; preserve request/response shape.
- SEO: extend `next-seo.config.js` or add more JSON‑LD in `pages/papers/[id].jsx`.

## 16) C4 Summary (Textual)

Context:
- Users interact via the browser → Next.js web app.
- Web app uses localStorage and calls API routes for persistence and AI.
- API routes call Gemini and touch JSON score history (dev).
- Search engines crawl SEO pages; GA4 collects events (optional).

Containers:
- Browser client; Next.js web app (pages + API); local JSON store (dev); Gemini; Search engines; GA4.

Components:
- Client: Quiz runtime, ScoreHistory, AiMcqGenerator, VirtualInterviewer, ThemeToggle.
- Server: SEO pages, API routes (scores, MCQ generator, interviewer), data configs.

Scenarios:
1) Start/complete quiz → append score → fetch history.
2) Generate MCQs → call Gemini → normalize JSON → render.
3) Interview turn → call Gemini → render `next` + `evaluation`.
4) SEO crawl → pre‑rendered pages + JSON‑LD.

---
If you want PNG/SVG diagrams, open a PR with exported images under `docs/diagrams/*` and reference them here using standard Markdown image syntax.

## 17) Screenshots

These images render in the in‑app viewer via an API that serves files from `docs/screenshots/*`.

- Home

  ![Home](/api/docs-asset?f=screenshots/home.png)

- Quiz Runtime

  ![Quiz](/api/docs-asset?f=screenshots/quiz.png)

- Scores

  ![Scores](/api/docs-asset?f=screenshots/scores.png)

- AI Generator

  ![AI Generator](/api/docs-asset?f=screenshots/ai-generator.png)

- AI Library

  ![AI Library](/api/docs-asset?f=screenshots/ai-library.png)

- AI Preview

  ![AI Preview](/api/docs-asset?f=screenshots/ai-preview.png)

