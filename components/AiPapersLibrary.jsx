// components/AiPapersLibrary.jsx
import { useEffect, useMemo, useState } from 'react';
import { TENANT } from '../lib/siteConfig';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const PREVIEW_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function writeCache(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export default function AiPapersLibrary({ userId = '' }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [openPreviewId, setOpenPreviewId] = useState(null);
  const [previewCache, setPreviewCache] = useState({}); // id -> { questions: [] }
  const cacheKey = `aiLibrary:${TENANT}`;

  const load = async ({ force = false } = {}) => {
    setError('');
    const cached = readCache(cacheKey);
    const fresh = cached && Date.now() - (cached.ts || 0) < CACHE_TTL_MS;
    if (cached) {
      setRows(Array.isArray(cached.rows) ? cached.rows : []);
      if (fresh && !force) return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/papers/list?tenant=${encodeURIComponent(TENANT)}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const list = Array.isArray(data?.rows) ? data.rows : [];
      setRows(list);
      writeCache(cacheKey, { ts: Date.now(), rows: list });
    } catch (e) {
      setError(e?.message || 'Failed to load');
      if (cached?.rows) setRows(cached.rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // hydrate preview cache from localStorage
    try {
      const prefix = 'aiPreview:';
      const keys = Object.keys(localStorage);
      const entries = {};
      for (const k of keys) {
        if (k.startsWith(prefix)) {
          const cached = readCache(k);
          if (cached && Date.now() - (cached.ts || 0) < PREVIEW_TTL_MS) {
            const id = k.slice(prefix.length);
            entries[id] = { questions: cached.questions || [] };
          }
        }
      }
      if (Object.keys(entries).length) setPreviewCache(entries);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let list = rows;
    if (mineOnly && userId) list = list.filter((r) => String(r.created_by || '') === String(userId));
    if (query && query.trim().length > 1) {
      const q = query.trim().toLowerCase();
      list = list.filter((r) =>
        String(r.name || '').toLowerCase().includes(q) ||
        String(r.created_by || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, mineOnly, userId, query]);

  const togglePreview = async (id) => {
    if (openPreviewId === id) {
      setOpenPreviewId(null);
      return;
    }
    setOpenPreviewId(id);
    if (previewCache[id]) return;
    const localKey = `aiPreview:${id}`;
    const cached = readCache(localKey);
    if (cached && Date.now() - (cached.ts || 0) < PREVIEW_TTL_MS) {
      setPreviewCache((prev) => ({ ...prev, [id]: { questions: cached.questions || [] } }));
      return;
    }
    try {
      const res = await fetch(`/api/papers/get?id=${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        const entry = { questions: data?.questions || [] };
        setPreviewCache((prev) => ({ ...prev, [id]: entry }));
        writeCache(localKey, { ts: Date.now(), ...entry });
      }
    } catch {
      // ignore
    }
  };

  return (
    <section className="mt-6 space-y-4">
      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-200/60 dark:bg-gray-900 dark:ring-gray-800">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">AI Library</div>
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or author"
              className="w-64 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            />
            {userId && (
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
                My papers
              </label>
            )}
            <button onClick={() => load({ force: true })} className="rounded-xl px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200">Refresh</button>
          </div>
      </div>
    </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200/60 dark:bg-gray-900 dark:ring-gray-800 animate-pulse">
              <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-800 rounded"></div>
              <div className="mt-2 h-3 w-1/3 bg-gray-200 dark:bg-gray-800 rounded"></div>
              <div className="mt-4 h-8 w-full bg-gray-200 dark:bg-gray-800 rounded"></div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200/60 dark:bg-gray-900 dark:ring-gray-800">Loading…</div>
      )}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-700 text-sm dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      )}

      {filtered.length === 0 && !loading && !error && (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200/60 dark:bg-gray-900 dark:ring-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-300">No AI papers found.</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((r) => (
          <div key={r.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200/60 dark:bg-gray-900 dark:ring-gray-800">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{r.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">by {r.created_by || 'unknown'}</div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/quiz?paper=db:${r.id}`}
                  className="rounded-xl px-3 py-1.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Take Test
                </a>
                <button
                  onClick={() => navigator.clipboard?.writeText(`${location.origin}/quiz?paper=db:${r.id}`)}
                  className="rounded-xl px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
                  title="Copy link"
                >Copy Link</button>
                <button
                  onClick={() => togglePreview(r.id)}
                  className="rounded-xl px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
                >{openPreviewId === r.id ? 'Hide' : 'Preview'}</button>
              </div>
            </div>
            {openPreviewId === r.id && (
              <div className="mt-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
                {previewCache[r.id]?.questions?.length ? (
                  <ul className="space-y-2">
                    {previewCache[r.id].questions.slice(0, 5).map((q, i) => (
                      <li key={i}>
                        <div className="font-medium">Q{i + 1}. {q.text}</div>
                        <ol className="list-decimal ml-5 text-gray-600 dark:text-gray-300">
                          {Array.isArray(q.options) && q.options.slice(0, 4).map((o, j) => (
                            <li key={j}>{o}</li>
                          ))}
                        </ol>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400">Loading preview…</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
