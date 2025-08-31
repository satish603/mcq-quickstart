# Project Guide for Agents

This document helps any agent or contributor quickly understand, run, and extend this codebase with minimal friction.

## 1) What This Is

- Multi-tenant MCQ quiz app built with Next.js + Tailwind CSS.
- Tenants: `nursing` and `it` (switchable by env var).
- Question sets are plain JSON files in `public/questions/**`; a central list maps them to pages and the quiz engine.
- SEO-friendly: per-paper landing pages (SSG) with JSON-LD; global metadata via `next-seo` and a generated sitemap.
- Persistence:
  - Quiz sessions: `localStorage` (resumable, stable ordering).
  - Scores: local JSON file via Next.js API routes (good for dev; ephemeral on serverless).

## 2) Repo Structure (high level)

- `pages/`
  - `_app.jsx`: global CSS + DefaultSeo
  - `_document.jsx`: base HTML; includes GSC meta
  - `index.jsx`: home with quiz setup and scores tab
  - `quiz.jsx`: quiz runtime (timer, navigation, search, map, scoring)
  - `papers/[id].jsx`: per-paper SEO page (SSG + JSON-LD)
  - `kgmu-sgpgi-nursing-officer-questions.jsx`: nursing landing page
  - `api/get-scores.js`, `api/save-score.js`: JSON file backed API
- `components/`: Quiz UI (question card, result summary, review, timer, progress bar, map drawer, theme toggle)
- `data/`: config lists
  - `paperList.js`: all papers (tagged by `tenant`); export filtered list by active tenant
  - `papers.config.js`: mode presets and per-paper negative marking
  - `questions.js`: sample content (not used by current flow)
- `lib/siteConfig.js`: reads public env vars for multi-tenancy and branding
- `public/questions/**.json`: question sets
- `styles/globals.css`, `tailwind.config.js`, `postcss.config.js`: styling

## 3) Install, Run, Build

- Install deps: `npm install`
- Dev server: `npm run dev` (Next.js dev server)
- Prod build: `npm run build` then `npm start`
- Sitemap: `npm run build` triggers `next-sitemap` via `postbuild`

## 4) Environment Variables (.env.local)

- `NEXT_PUBLIC_TENANT` = `nursing` | `it`
- `NEXT_PUBLIC_SITE_URL` = canonical base URL (no trailing slash)
- `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_TAGLINE`, `NEXT_PUBLIC_PRIMARY_KEYWORDS`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` (optional), `NEXT_PUBLIC_GSC_VERIFICATION` (optional)

A sample exists in `.env.local`. Adjust when switching tenants.

## 5) Data Model (Questions)

Question files live under `public/questions/**` and are referenced by `data/paperList.js`.

- Supported shapes:
  - Array: `[{ id, text, options[], answerIndex, explanation?, tags?[] }, ...]`
  - Or object with `questions`: `{ questions: [ ...same shape... ] }`

- Example item:
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

## 6) Adding/Editing Papers

1. Create/modify a JSON file under `public/questions/...` (see shapes above).
2. Add an entry to `data/paperList.js`:
   - `tenant`: `nursing` or `it`
   - `id`: slug (used in URLs `/papers/[id]` and `/quiz?paper=[id]`)
   - `name`: human-friendly paper title
   - `file`: path under `/questions/...` pointing to the JSON file
3. (Optional) Set per-paper negative marking in `data/papers.config.js`:
   - `PAPER_DEFAULTS[paperId] = { negative: 0.25 }`

## 7) Negative Marking (Consistency)

- Source of truth: `getNegativeMark(paperId)` in `data/papers.config.js`.
- Quiz uses this to compute scores.
- Result summary now receives `negativeMark` from the quiz and uses it. Avoid hardcoding values in components.

## 8) Quiz Session Persistence

- Sessions stored in `localStorage` under key:
  - `mcq_session:${userId}:${paper}:${mode}:${randomFlag}`
- Payload v2 includes:
  - `order` (stable keys per question), `orderSig` (joined signature)
  - `selectedIdxs` (array with numbers or `-1`), `peeked`, `bookmarked`, `currentIdx`
  - `initialTimeSec`, `timeLeft`, `ts`, basic context (userId, paper, mode, randomize)
- Resume logic validates length, signature, and age (< 7 days) before restoring.

## 9) Score History (API)

- `POST /api/save-score`: appends `{ userId, paper, score, timestamp }` to `data/scoreHistory.json`.
- `GET /api/get-scores?userId=...`: returns rows filtered by `userId`.
- Note: Writing to disk is not durable on serverless (e.g., Vercel). For production persistence, replace with a DB (Supabase, PlanetScale, etc.) or a KV store. Keep the same API shape to minimize UI changes.

## 10) SEO & Sitemaps

- `next-seo` default config in `next-seo.config.js` (tenant-aware titles/descriptions).
- Per-paper SEO page `pages/papers/[id].jsx` (SSG) adds:
  - `ItemList` JSON-LD for first 10 questions
  - `BreadcrumbList` JSON-LD
- `next-sitemap.config.js` generates sitemaps and robots.txt; excludes `/quiz` and API routes; adds paper pages and tenant-specific landings.

## 11) Styling & A11y

- Tailwind with `darkMode: 'class'`. `ThemeToggle` flips `document.documentElement.classList`.
- Components aim for keyboard support and basic ARIA roles.
- Text highlighting uses a safe escaper before `dangerouslySetInnerHTML`.

## 12) Coding Guidelines (for agents)

- Keep changes minimal and focused on the task; match existing style.
- Prefer small, surgical patches; avoid unrelated refactors.
- No inline copyright/license headers unless requested.
- Avoid one-letter variable names; keep naming self-explanatory.
- Escape user-visible HTML; keep the safe highlighter intact.
- If adding dependencies, ensure they are necessary and justified.
- Tests are currently minimal; add targeted tests only when pattern is already present.

## 13) Local Dev Tips

- Start with `npm run dev`. Validate:
  - Home loads; can select paper and start quiz.
  - Quiz loads questions from `public/questions/...` and timer runs.
  - “Peek” excludes questions from scoring; bookmarking/search/map working.
  - Completing quiz shows `ResultSummary`; a row appears via `GET /api/get-scores`.
- If encoding artifacts (weird replacement characters) appear in UI text, prefer plain ASCII or proper UTF-8 literals.

## 14) Common Tasks & How-To

- Add a new paper set:
  - Create JSON, add to `paperList`, optionally set negative mark, re-run dev.
- Change negative marking:
  - Edit `PAPER_DEFAULTS` or add a specific paper entry.
- Persist scores in production:
  - Swap API handlers to a DB or KV; retain request/response shape.
- Extend SEO:
  - Update `next-seo.config.js`; add more JSON-LD in per-paper pages if needed.

## 15) Known Caveats

- Serverless persistence: JSON writes to `data/scoreHistory.json` are ephemeral.
- There may be stray replacement characters (encoding) in some strings; clean as needed.
- `data/questions.js` is a sample and not used by main flow.


## 16) Contact Points in Code

- Tenant/branding: `lib/siteConfig.js`, `.env.local`
- Paper registry: `data/paperList.js`
- Negative marking: `data/papers.config.js`
- Quiz engine: `pages/quiz.jsx`
- Summary: `components/ResultSummary.jsx`
- API I/O: `pages/api/*.js`

---

If you are an automated agent (e.g., Codex CLI):
- Prefer reading files in chunks <= 250 lines.
- Avoid editing unrelated files; summarize diffs succinctly.
- Use small patches and run the app locally to validate changes when possible.
