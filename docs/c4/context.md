# C4 — Level 1: System Context

The product is a multi-tenant MCQ quiz and interview practice application. It serves end-users (candidates) on web browsers and integrates with external AI services and search engines for SEO.

## Scope and Purpose
- Practice MCQs with review/peek/search/map and resumable sessions.
- AI-powered: generate MCQs and run a virtual interviewer.
- SEO-friendly landing pages and sitemaps.

## Primary Actors
- Candidate: practices quizzes, views scores, uses AI tools.
- Search Engine: crawls SEO pages and sitemaps.
- Analytics Platform (GA4): observes usage (optional).

## System Context Diagram

```mermaid
flowchart TB
  user([Candidate])
  se[(Search Engines)]
  ga[(GA4)]
  ai[(Google Gemini API)]
  fs[(Local JSON File: scoreHistory.json)]
  ls[(Browser localStorage)]

  subgraph System[MCQ App (Next.js)]
    web[Web App (SSR/SSG + SPA)]
    api[/API Routes/]
  end

  user -->|Uses| web
  web -->|Reads/Writes| ls
  web -->|Calls| api
  api -->|Append/Read Scores| fs
  api -->|Generate MCQs & Interview| ai
  se -->|Crawls| web
  web -->|Sends events| ga
```

## Relationships
- Candidate uses the Web App.
- Web App stores quiz sessions in localStorage.
- API routes persist score history to a local JSON file (development) or to a production database (future/optional).
- API routes call Google Gemini for MCQ generation and interviews.
- Search engines crawl pre-rendered SEO pages and sitemaps.
- GA4 optionally receives usage events.

## Notes
- JSON-on-disk persistence is not durable on serverless; switch to DB/KV for production.
- Multi-tenant branding and SEO differ by environment variables.

