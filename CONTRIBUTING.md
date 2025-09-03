# Contributing

Thanks for your interest in improving this project! This guide explains how to set up your environment, make focused changes, and submit effective issues/PRs.

## Getting Started

- Requirements: Node.js 18+ (recommended), npm 8+.
- Install: `npm install`
- Dev: `npm run dev` (Next.js dev server)
- Build: `npm run build` then `npm start`
- Env: copy `.env.local` and set `NEXT_PUBLIC_*` vars. To switch tenants, set `NEXT_PUBLIC_TENANT` to `nursing` or `it`.

## Project Overview

- Framework: Next.js (pages router) + Tailwind CSS
- Data: Question sets in `public/questions/**` referenced by `data/paperList.js`
- Persistence: Quiz session in `localStorage`; score history via JSON file (API routes) for local/dev
- SEO: `next-seo`, `next-sitemap`, per-paper JSON-LD in `pages/papers/[id].jsx`

See AGENTS.md for a deeper technical guide and code touchpoints.

## Development Guidelines

- Keep changes minimal and focused. Match current code style; avoid unrelated refactors.
- Prefer small PRs with a clear purpose and testing notes.
- Avoid adding dependencies unless strictly necessary; justify any additions.
- Escape user-provided HTML; keep the safe highlighter patterns intact.
- Negative marking: source of truth is `getNegativeMark(paperId)` in `data/papers.config.js`. Do not hardcode.
- Serverless caveat: Writing to `data/scoreHistory.json` is not durable in production (e.g., Vercel). Consider a DB adapter for real deployments.

## Common Tasks

- Add a paper:
  1) Create a JSON file under `public/questions/...` (array of questions, or `{ questions: [...] }`).
  2) Add an entry in `data/paperList.js` with `tenant`, `id`, `name`, and `file` path.
  3) (Optional) Configure negative marking in `data/papers.config.js`.
- Adjust negative marking: update `PAPER_DEFAULTS` in `data/papers.config.js`.
- Branding/tenant: tweak `lib/siteConfig.js` and `.env.local`.

## Manual Test Checklist

- Home page loads; tenant branding/SEO looks correct.
- Can select a paper and start a quiz.
- Timer counts down; random order persists across refresh.
- Option selection locks; “Peek” does not incur negative marking, but peeked questions still count toward total marks.
- Map, bookmarks, and in-paper search work.
- Finish shows `ResultSummary`; score matches expectations given negative mark.
- Score history row appears via `/api/get-scores?userId=...`.

## Submitting Issues

Use our issue templates (Bug/Feature). Include:
- Repro steps (paper id, mode, random flag, user id)
- Expected vs actual behavior
- Environment: OS, browser, Node, Next.js version
- Logs/screenshots where helpful
- Attach a small sample question JSON if data-specific

## Pull Requests

- Fork/branch naming suggestion: `feat/...`, `fix/...`, `docs/...`
- Describe the problem and solution briefly in the PR body.
- Include testing notes and screenshots/GIFs when UI changes are involved.
- Keep diff limited to the scope; avoid drive-by changes.

Thanks again for contributing!
