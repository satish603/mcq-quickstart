# C4 — Key Scenarios (Sequences)

The following flows illustrate how major features interact across containers.

## 1) Start a Quiz and Save Score

```mermaid
sequenceDiagram
  actor User
  participant UI as Browser (Quiz Page)
  participant API as Next.js API
  participant FS as scoreHistory.json

  User->>UI: Select paper and start quiz
  UI->>UI: Load /questions/*.json
  UI->>UI: Start timer; persist session to localStorage
  UI->>API: POST /api/save-score (on completion)
  API->>FS: Append row
  API-->>UI: 200 OK
  UI->>API: GET /api/get-scores?userId=...
  API-->>UI: Matching rows
```

## 2) AI MCQ Generation

```mermaid
sequenceDiagram
  actor User
  participant UI as Browser (AI Generator)
  participant API as Next.js /api/generate-mcq
  participant AI as Google Gemini API

  User->>UI: Enter topic and request MCQs
  UI->>API: POST /api/generate-mcq { prompt }
  API->>AI: Prompt + constraints
  AI-->>API: Model response
  API->>API: Validate/normalize MCQ JSON
  API-->>UI: Structured MCQs
```

## 3) Virtual Interview Turn

```mermaid
sequenceDiagram
  actor User
  participant UI as Browser (Virtual Interviewer)
  participant API as Next.js /api/interview
  participant AI as Google Gemini API

  User->>UI: Provide answer (text/voice)
  UI->>API: POST /api/interview { transcript, topic, level, style }
  API->>AI: Prompt with transcript + guidance
  AI-->>API: { next, evaluation, done?, summary? }
  API-->>UI: JSON
  UI->>UI: Update transcript, evaluation, scoring
  UI->>UI: Optionally speak next question (TTS) and/or listen (ASR)
```

## 4) SEO Crawling

```mermaid
sequenceDiagram
  participant Bot as Search Engine
  participant SSR as Next.js SSG Pages

  Bot->>SSR: Crawl /papers/[id]
  SSR-->>Bot: HTML + JSON-LD
  Bot->>SSR: Crawl sitemap.xml / robots.txt
```

## Notes
- Voice features are optional; text input and standard navigation remain primary.
- Error handling includes safe fallbacks and clear user feedback banners.

