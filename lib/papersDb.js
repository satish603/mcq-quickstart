// lib/papersDb.js
import { sql } from '@vercel/postgres';
import crypto from 'crypto';

export function isDbConfigured() {
  // Any of these envs work for @vercel/postgres
  return Boolean(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING);
}

export async function ensurePapersTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS papers (
      id TEXT PRIMARY KEY,
      tenant TEXT NOT NULL,
      name TEXT NOT NULL,
      created_by TEXT NOT NULL,
      questions_json JSON NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export function genPaperId() {
  // short, URL-safe id
  const bytes = crypto.randomBytes(6).toString('base64url'); // ~8 chars
  return `p_${bytes}`;
}

export async function insertPaper({ id, tenant, name, created_by, questions }) {
  await ensurePapersTable();
  await sql`
    INSERT INTO papers (id, tenant, name, created_by, questions_json)
    VALUES (${id}, ${tenant}, ${name}, ${created_by}, ${JSON.stringify(questions)})
  `;
}

export async function listPapers({ tenant }) {
  await ensurePapersTable();
  const where = tenant ? sql`WHERE tenant = ${tenant}` : sql``;
  const result = await sql`
    SELECT id, tenant, name, created_by, created_at
    FROM papers
    ${where}
    ORDER BY created_at DESC
    LIMIT 200
  `;
  return result.rows || [];
}

export async function getPaperById(id) {
  await ensurePapersTable();
  const result = await sql`
    SELECT id, tenant, name, created_by, questions_json, created_at
    FROM papers
    WHERE id = ${id}
    LIMIT 1
  `;
  return result.rows?.[0] || null;
}

