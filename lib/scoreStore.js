// lib/scoreStore.js
import { sql } from '@vercel/postgres';

export async function ensureSchema() {
  // Safe to run many times; IF NOT EXISTS prevents recreation
  await sql`
    CREATE TABLE IF NOT EXISTS scores (
      id        BIGSERIAL PRIMARY KEY,
      user_id   TEXT NOT NULL,
      paper     TEXT NOT NULL,
      score     DOUBLE PRECISION NOT NULL,
      meta      JSONB,
      ts        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS scores_user_id_idx ON scores(user_id);`;
}

export async function saveScore({ userId, paper, score, meta = {} }) {
  await ensureSchema();
  const { rows } = await sql`
    INSERT INTO scores (user_id, paper, score, meta)
    VALUES (${userId}, ${paper}, ${score}, ${JSON.stringify(meta)}::jsonb)
    RETURNING id, user_id, paper, score, meta, ts;
  `;
  const r = rows[0];
  return {
    id: Number(r.id),
    userId: r.user_id,
    paper: r.paper,
    score: Number(r.score),
    meta: r.meta || {},
    timestamp: (r.ts instanceof Date ? r.ts.toISOString() : String(r.ts)),
  };
}

export async function getScores(userId, limit = 50) {
  await ensureSchema();
  const { rows } = await sql`
    SELECT id, user_id, paper, score, (meta - 'responses') AS meta, ts
    FROM scores
    WHERE user_id = ${userId}
    ORDER BY ts DESC
    LIMIT ${limit};
  `;
  return rows.map((r) => ({
    id: Number(r.id),
    userId: r.user_id,
    paper: r.paper,
    score: Number(r.score),
    meta: r.meta || {},
    timestamp: (r.ts instanceof Date ? r.ts.toISOString() : String(r.ts)),
  }));
}

export async function getScoresAfter(userId, afterId, limit = 50) {
  await ensureSchema();
  const { rows } = await sql`
    SELECT id, user_id, paper, score, (meta - 'responses') AS meta, ts
    FROM scores
    WHERE user_id = ${userId} AND id > ${afterId}
    ORDER BY id DESC
    LIMIT ${limit};
  `;
  return rows.map((r) => ({
    id: Number(r.id),
    userId: r.user_id,
    paper: r.paper,
    score: Number(r.score),
    meta: r.meta || {},
    timestamp: (r.ts instanceof Date ? r.ts.toISOString() : String(r.ts)),
  }));
}

export async function getAttempt(id) {
  await ensureSchema();
  const { rows } = await sql`
    SELECT id, user_id, paper, score, meta, ts
    FROM scores
    WHERE id = ${id}
    LIMIT 1;
  `;
  const r = rows[0];
  if (!r) return null;
  return {
    id: Number(r.id),
    userId: r.user_id,
    paper: r.paper,
    score: Number(r.score),
    meta: r.meta || {},
    timestamp: (r.ts instanceof Date ? r.ts.toISOString() : String(r.ts)),
  };
}
