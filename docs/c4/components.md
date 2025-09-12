# C4 — Level 3: Components

This section maps key components inside each container.

## Browser Components (React)
- Quiz Runtime (pages/quiz.jsx)
  - Timer, Progress, Question navigation/map, Search, Peek.
  - Components: `components/QuizQuestion.jsx`, `components/ProgressBar.jsx`, `components/QuestionMapDrawer.jsx`, `components/Timer.jsx`, `components/ResultSummary.jsx`, `components/ReviewAnswers.jsx`.
  - Uses `data/papers.config.js` for negative marking via `getNegativeMark(paperId)`.
  - Loads question sets from `public/questions/**.json` as plain fetch.
- Score History (components/ScoreHistory.jsx)
  - Client-side display; fetches via `/api/get-scores` and caches results.
- AI MCQ Generator (components/AiMcqGenerator.jsx)
  - Sends prompts to `/api/generate-mcq`; displays generated MCQs.
- Virtual Interviewer (components/VirtualInterviewer.jsx)
  - Voice (ASR/TTS) optional; manages transcript, evaluation, and flow.
  - Calls `/api/interview` for next question and evaluation.
  - Persists lightweight session transcript to `localStorage`.
- SEO Defaults & Theme
  - `next-seo.config.js` + `pages/_app.jsx` for DefaultSeo.
  - `components/ThemeToggle.jsx` toggles dark mode (`class` on html).

## Server Components (Next.js)
- SEO Pages
  - `pages/papers/[id].jsx`: SSG paper landing pages with JSON-LD.
  - `pages/kgmu-sgpgi-nursing-officer-questions.jsx`: tenant-specific landing.
- API Routes
  - `pages/api/get-scores.js`: returns filtered score rows by `userId`.
  - `pages/api/save-score.js`: appends score row to `data/scoreHistory.json`.
  - `pages/api/generate-mcq.js`: prompts Gemini; returns validated MCQs.
  - `pages/api/interview.js`: prompts Gemini; returns next question + evaluation.
- Data & Config
  - `data/paperList.js`: registry of available papers; filtered by tenant.
  - `data/papers.config.js`: per-paper defaults and negative marking.
  - `lib/siteConfig.js`: reads public env for tenant, URL, branding.

## Component Diagram (logical)

```mermaid
flowchart TB
  subgraph Client[Browser]
    Quiz[Quiz Runtime]
    Scores[Score History]
    Gen[AI MCQ Generator]
    VI[Virtual Interviewer]
    LS[(localStorage)]
  end

  subgraph Server[Next.js]
    SEO[SEO Pages (SSG)]
    APIget[/GET /api/get-scores/]
    APIsave[/POST /api/save-score/]
    APImcq[/POST /api/generate-mcq/]
    APIiv[/POST /api/interview/]
    Data[paperList + papers.config]
  end

  AI[(Google Gemini)]
  File[(data/scoreHistory.json)]

  Quiz --> APIget
  Quiz --> APIsave
  Scores --> APIget
  Gen --> APImcq
  VI --> APIiv
  APImcq --> AI
  APIiv --> AI
  APIsave --> File
  SEO --> Client
  Quiz <--> LS
```

## Security / Boundaries
- Only server-side routes read `GEMINI_API_KEY` and call Gemini.
- Public env vars drive tenant branding; no secrets shipped to client.
- Client session data stays in-browser.

