# C4 — Level 2: Containers

This section identifies the major runtime containers and how they interact.

## Containers
- Browser (Client)
  - Renders the Next.js app, manages SPA navigation.
  - Persists quiz sessions in `localStorage` (resumable for 7 days).
  - Sends fetch requests to API routes for scores and AI features.
- Next.js Web App (Server / Build)
  - Pages: `pages/index.jsx`, `pages/quiz.jsx`, `pages/papers/[id].jsx`, etc.
  - SSG/SSR: builds SEO-friendly pages, JSON-LD, sitemap via `next-sitemap`.
  - API Routes: `pages/api/*.js` providing score persistence and AI helpers.
- Local JSON Store (Development only)
  - File: `data/scoreHistory.json` (appended by `/api/save-score`, read by `/api/get-scores`).
  - Ephemeral on serverless; replace with DB/KV for production.
- External AI Service (Google Gemini)
  - Used by `/api/generate-mcq` and `/api/interview` to generate MCQs and interview turns.
- Search Engines (Google, Bing)
  - Crawl pre-rendered SEO pages and sitemaps; validate via GSC meta.
- Analytics (GA4)
  - Receives client-side events (optional).

## Container Diagram

```mermaid
flowchart LR
  subgraph Browser
    UI[Next.js App (SPA)]
    LS[(localStorage)]
  end

  subgraph Server[Next.js]
    P[Pages (SSR/SSG)]
    API[/API Routes/]
  end

  DB[(scoreHistory.json)]
  AI[(Google Gemini)]
  SE[(Search Engines)]
  GA[(GA4)]

  UI <--> P
  UI <--> API
  UI --> LS
  API --> DB
  API --> AI
  SE --> P
  UI --> GA
```

## Responsibilities
- Browser:
  - Session management: `mcq_session:${userId}:${paper}:${mode}:${random}`
  - Rendering quiz, results, interview UI, and AI generator.
- Next.js Web App:
  - Routes, SEO, and build-time sitemap generation.
  - APIs for score read/write and AI delegation.
- Local JSON Store:
  - Simple append-only score history in development.
- Gemini:
  - Deterministic JSON responses for MCQ generation and interview flows.

## Non-functional
- Performance: SSG for paper pages; client-side rendering for quiz engine.
- Reliability: Local JSON writes are not durable; use DB/KV in production.
- Security: Secrets in server-side env (`GEMINI_API_KEY`).

