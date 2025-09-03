// pages/attempt/[id].jsx
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import 'tailwindcss/tailwind.css';
import { paperList } from '../../data/paperList';

const stableKey = (q) => {
  if (q && q.id != null) return `id:${q.id}`;
  const text = String(q?.text || '');
  const opts = Array.isArray(q?.options) ? q.options.join('||') : '';
  const raw = `${text}|||${opts}`;
  let h = 5381;
  for (let i = 0; i < raw.length; i++) h = ((h << 5) + h) ^ raw.charCodeAt(i);
  return `h:${(h >>> 0).toString(36)}`;
};

// Simple client-side cache with localStorage fallback to reduce API calls
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const attemptCache = new Map();
const paperCache = new Map();

function loadFromLS(key) {
  try {
    const s = localStorage.getItem(key);
    if (!s) return null;
    const obj = JSON.parse(s);
    if (!obj || typeof obj.ts !== 'number') return null;
    if (Date.now() - obj.ts > CACHE_TTL_MS) return null;
    return obj.value;
  } catch {
    return null;
  }
}
function saveToLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), value }));
  } catch {}
}

function formatIST(iso) {
  try { return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }); } catch { return iso; }
}

export default function AttemptDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [showExplanations, setShowExplanations] = useState(true);

  // Fetch attempt record
  useEffect(() => {
    if (!router.isReady || !id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        let rec = attemptCache.get(String(id)) || loadFromLS(`attempt_cache:${id}`);
        if (!rec) {
          const res = await fetch(`/api/get-attempt?id=${encodeURIComponent(id)}`);
          if (!res.ok) throw new Error('Attempt not found');
          const data = await res.json();
          rec = data?.record || null;
          if (rec) {
            attemptCache.set(String(id), rec);
            saveToLS(`attempt_cache:${id}`, rec);
          }
        }
        if (!cancelled) setRecord(rec);
      } catch (e) {
        if (!cancelled) setRecord(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router.isReady, id]);

  // Fetch paper questions once record is ready
  useEffect(() => {
    if (!record) return;
    let cancelled = false;
    (async () => {
      try {
        const paperKey = String(record.paper || '');
        let qs = paperCache.get(paperKey) || loadFromLS(`paper_cache:${paperKey}`);
        if (!qs) {
          if (paperKey.startsWith('db:')) {
            const dbId = paperKey.slice(3);
            const res = await fetch(`/api/papers/get?id=${encodeURIComponent(dbId)}`);
            if (res.ok) {
              const data = await res.json();
              qs = Array.isArray(data?.questions) ? data.questions : [];
            }
          } else {
            const p = (paperList || []).find((p) => p.id === paperKey);
            if (p && p.file) {
              const res = await fetch(p.file);
              if (res.ok) {
                const data = await res.json();
                qs = Array.isArray(data?.questions) ? data.questions : Array.isArray(data) ? data : [];
              }
            }
          }
          if (qs && Array.isArray(qs)) {
            paperCache.set(paperKey, qs);
            saveToLS(`paper_cache:${paperKey}`, qs);
          }
        }
        if (!cancelled) setQuestions(qs || []);
      } catch {
        if (!cancelled) setQuestions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [record]);

  const [filter, setFilter] = useState('all'); // all | wrong | unanswered | correct | peeked

  const items = useMemo(() => {
    if (!record) return [];
    const responses = Array.isArray(record?.meta?.responses) ? record.meta.responses : [];
    const qMap = new Map();
    const iMap = new Map();
    (questions || []).forEach((q, i) => {
      const k = stableKey(q);
      qMap.set(k, q);
      iMap.set(k, i);
      if (q && q.id != null) {
        const idKey = `id:${q.id}`;
        qMap.set(idKey, q);
        iMap.set(idKey, i);
      }
    });
    return responses.map((r, idx) => {
      const q = qMap.get(r.key) || (r.id != null ? qMap.get(`id:${r.id}`) : undefined);
      const qIndex = q ? (iMap.get(r.key) ?? (r.id != null ? iMap.get(`id:${r.id}`) : undefined)) : undefined;
      const selectedIdx = r.selectedIdx == null ? null : r.selectedIdx;
      const correctIdx = r.correctIdx == null ? null : r.correctIdx;
      const wasPeeked = !!r.peeked;
      const isCorrect = !wasPeeked && selectedIdx != null && correctIdx != null && selectedIdx === correctIdx;
      const isUnanswered = !wasPeeked && selectedIdx == null;
      const isWrong = !wasPeeked && !isCorrect && (selectedIdx == null || (correctIdx != null && selectedIdx !== correctIdx));
      return {
        key: r.key || `r${idx}`,
        qIndex: Number.isFinite(qIndex) ? qIndex : null,
        question: q || null,
        selectedIdx,
        correctIdx,
        wasPeeked,
        isCorrect,
        isWrong,
        isUnanswered,
      };
    });
  }, [record, questions]);

  const denom = useMemo(() => {
    const t = record?.meta?.total;
    if (Number.isFinite(t) && t > 0) return t;
    if (Array.isArray(record?.meta?.orderKeys)) return record.meta.orderKeys.length;
    return questions.length || null;
  }, [record, questions.length]);

  const paperName = useMemo(() => record?.meta?.paperName || record?.paper || 'Attempt', [record]);

  const stats = useMemo(() => {
    const total = denom || (Array.isArray(items) ? items.length : 0);
    let peeked = 0, correct = 0, wrong = 0, unanswered = 0, attempted = 0;
    items.forEach((it) => {
      if (it.wasPeeked) { peeked++; return; }
      if (it.isCorrect) { correct++; attempted++; return; }
      if (it.isUnanswered) { wrong++; unanswered++; return; }
      if (it.isWrong) { wrong++; attempted++; return; }
    });
    return { total, peeked, attempted, correct, wrong, unanswered };
  }, [items, denom]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="mx-auto max-w-5xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <button className="hover:underline" onClick={() => (typeof window !== 'undefined' ? window.history.back() : null)}>Back</button>
            <span className="mx-1">/</span>
            <Link href="/?tab=scores" className="hover:underline">My Scores</Link>
            <span className="mx-1">/</span>
            <span>Attempt #{record?.id ?? id}</span>
          </div>
          <Link href="/?tab=scores" className="rounded-xl bg-indigo-600 text-white px-3 py-2 text-xs">Back to Scores</Link>
        </div>

        <div className="rounded-3xl bg-white dark:bg-gray-900 p-6 shadow-sm ring-1 ring-gray-200/60 dark:ring-gray-800">
          {loading && <div>Loading attempt…</div>}
          {!loading && !record && (
            <div className="text-rose-600">Attempt not found.</div>
          )}
          {!loading && record && (
            <div>
              <h1 className="text-xl font-bold mb-1">{paperName}</h1>
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                {formatIST(record.timestamp)} • Score: <strong>{Number(record.score).toFixed(2)}</strong>{denom ? `/${denom}` : ''}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mt-2 text-gray-700 dark:text-gray-300 mb-4">
                <div><span className="font-medium">Total:</span> {stats.total}</div>
                <div><span className="font-medium">Peeked:</span> {stats.peeked}</div>
                <div><span className="font-medium">Attempted:</span> {stats.attempted}</div>
                <div><span className="font-medium">Correct:</span> {stats.correct}</div>
                <div><span className="font-medium">Wrong:</span> {stats.wrong}</div>
                <div><span className="font-medium">Unanswered:</span> {stats.unanswered}</div>
              </div>

              {/* Filter */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {['all','wrong','unanswered','peeked','correct'].map((k) => (
                  <button
                    key={k}
                    onClick={() => setFilter(k)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      filter === k
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {k[0].toUpperCase() + k.slice(1)}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <label htmlFor="toggle-expl" className="cursor-pointer">Show explanations</label>
                  <input
                    id="toggle-expl"
                    type="checkbox"
                    checked={showExplanations}
                    onChange={(e) => setShowExplanations(e.target.checked)}
                  />
                </div>
              </div>

              {Array.isArray(record?.meta?.responses) ? null : (
                <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:border-amber-900/30 dark:text-amber-200">
                  Detailed responses were not stored for this attempt.
                </div>
              )}
              <AttemptList items={items} filter={filter} showExplanations={showExplanations} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AttemptList({ items, filter, showExplanations }) {
  const filtered = (items || []).filter((it) => {
    if (filter === 'wrong') return it.isWrong;
    if (filter === 'unanswered') return it.isUnanswered;
    if (filter === 'peeked') return it.wasPeeked;
    if (filter === 'correct') return it.isCorrect;
    return true;
  });
  if (!filtered.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-800/50 dark:text-gray-200">No items to show.</div>
    );
  }
  return (
    <div className="space-y-4">
      {filtered.map((it, i) => {
        const q = it.question;
        const qNum = it.qIndex != null ? it.qIndex + 1 : i + 1;
        const options = Array.isArray(q?.options) ? q.options : [];
        return (
          <div key={it.key || i} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:bg-gray-900 dark:border-gray-800">
            <div className="flex items-start justify-between mb-2">
              <div className="text-sm text-white-600">Q{qNum}</div>
              <div className="flex flex-wrap gap-2">
                {it.wasPeeked ? (
                  <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-xs font-semibold dark:bg-amber-400/20 dark:text-amber-300">Peeked</span>
                ) : it.isCorrect ? (
                  <span className="rounded-full bg-green-100 text-green-800 px-2.5 py-0.5 text-xs font-semibold dark:bg-green-400/20 dark:text-green-300">Correct</span>
                ) : it.isUnanswered ? (
                  <span className="rounded-full bg-gray-100 text-gray-700 px-2.5 py-0.5 text-xs font-semibold dark:bg-gray-800 dark:text-gray-200">Unanswered</span>
                ) : (
                  <span className="rounded-full bg-rose-100 text-rose-800 px-2.5 py-0.5 text-xs font-semibold dark:bg-rose-400/20 dark:text-rose-300">Wrong</span>
                )}
              </div>
            </div>
            <div className="text-gray-900 dark:text-gray-100 font-medium mb-3">{q?.text || 'Question not found in current paper version.'}</div>
            {/* Options visual */}
            {options.length > 0 && (
              <ul className="space-y-2">
                {options.map((opt, idx) => {
                  const isCorrect = it.correctIdx === idx;
                  const isSelected = it.selectedIdx === idx;
                  const base = 'rounded-xl px-3 py-2 text-sm border flex items-start';
                  const cls = isCorrect
                    ? `${base} border-green-300 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300`
                    : isSelected && !isCorrect
                    ? `${base} border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-900/20 dark:text-rose-300`
                    : `${base} border-gray-200 bg-gray-50 text-gray-800 dark:bg-gray-800/50 dark:text-gray-200`;
                  return (
                    <li key={idx} className={cls}>
                      <span className="mr-2 font-semibold">{String.fromCharCode(65 + idx)}.</span>
                      <span>{opt}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {/* Explanation */}
            {showExplanations && q?.explanation && (
              <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-800/60 dark:text-gray-200">
                {q.explanation}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
