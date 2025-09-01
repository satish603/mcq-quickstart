// pages/quiz.jsx
import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import 'tailwindcss/tailwind.css';

import QuizQuestion from '../components/QuizQuestion';
import Timer from '../components/Timer';
import ResultSummary from '../components/ResultSummary';
import ProgressBar from '../components/ProgressBar';
import ThemeToggle from '../components/ThemeToggle';
import QuestionMapDrawer from '../components/QuestionMapDrawer';

import { paperList } from '../data/paperList';
import { getNegativeMark, MODE_PRESETS } from '../data/papers.config';

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// -------- stable key helpers (no index involved) --------
const stableKey = (q) => {
  if (q && q.id != null) return `id:${q.id}`;
  const text = String(q?.text || '');
  const opts = Array.isArray(q?.options) ? q.options.join('||') : '';
  const raw = `${text}|||${opts}`;
  // djb2 xor hash
  let h = 5381;
  for (let i = 0; i < raw.length; i++) h = ((h << 5) + h) ^ raw.charCodeAt(i);
  return `h:${(h >>> 0).toString(36)}`;
};
const makeOrder = (arr) => arr.map(stableKey);
const makeSig = (order) => order.join('|');

// -------- encode/decode so we never keep `null` in state --------
const encodeSelected = (arr) => (Array.isArray(arr) ? arr.map((v) => (v == null ? -1 : v)) : []);
const decodeSelected = (arr, len) => {
  const a = Array.isArray(arr) ? arr : [];
  const out = new Array(len);
  for (let i = 0; i < len; i++) {
    const v = a[i];
    out[i] = v == null || v === -1 ? undefined : v;
  }
  return out;
};
const coerceBoolArray = (arr, len) => {
  const out = new Array(len);
  for (let i = 0; i < len; i++) out[i] = !!(arr && arr[i]);
  return out;
};

const loadSaved = (key) => {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
};

export default function Quiz() {
  const router = useRouter();
  const { paper, time, userId: userIdParam, mode = 'medium', random } = router.query;
  const [uid, setUid] = useState('');

  // data + ui
  const [quizSet, setQuizSet] = useState([]);
  const [loading, setLoading] = useState(true);

  // state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState([]);     // number | undefined (never null)
  const [peeked, setPeeked] = useState([]);         // boolean[]
  const [bookmarked, setBookmarked] = useState([]); // boolean[]
  const [order, setOrder] = useState([]);           // stable keys

  // timer
  const [timeLeft, setTimeLeft] = useState(null);
  const [isFinished, setIsFinished] = useState(false);

  // map/search
  const [mapOpen, setMapOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [matchCursor, setMatchCursor] = useState(0);

  // config
  const NEGATIVE_MARK = useMemo(() => getNegativeMark(String(paper || '')), [paper]);
  const paperMeta = useMemo(() => paperList.find((p) => p.id === paper), [paper]);
  const filePath = paperMeta ? paperMeta.file : null;
  const isDbPaper = useMemo(() => !paperMeta && typeof paper === 'string' && paper.startsWith('db:'), [paperMeta, paper]);
  const dbPaperId = useMemo(() => (isDbPaper ? String(paper).slice(3) : null), [isDbPaper, paper]);
  const [paperMetaDb, setPaperMetaDb] = useState(null); // { name, createdBy }
  const randomize = random === '1' || random === 'true';

  // session keys/flags
  const sessionKey = useMemo(() => {
    if (!uid || !paper) return null;
    return `mcq_session:${uid}:${paper}:${mode}:${randomize ? '1' : '0'}`;
  }, [uid, paper, mode, randomize]);
  const scoredRef = useRef(false);
  const resumedRef = useRef(false);
  const [needUserId, setNeedUserId] = useState(false);

  // Initialize user ID from query or localStorage; sync URL if missing
  useEffect(() => {
    if (!router.isReady) return;
    const q = String(userIdParam || '').trim();
    if (q) {
      setUid(q);
      try { localStorage.setItem('mcq_user_id', q); } catch {}
      return;
    }
    try {
      const fromLs = localStorage.getItem('mcq_user_id');
      if (fromLs) {
        setUid(fromLs);
        const newQuery = { ...router.query, userId: fromLs };
        router.replace({ pathname: router.pathname, query: newQuery }, undefined, { shallow: true });
      }
    } catch {}
  }, [router.isReady]);

  // load questions (from file or DB) with saved order restoration if present
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        let data = null;
        if (filePath) {
          const res = await fetch(filePath);
          if (!res.ok) throw new Error('Failed to load question set');
          data = await res.json();
        } else if (isDbPaper && dbPaperId) {
          const res = await fetch(`/api/papers/get?id=${encodeURIComponent(dbPaperId)}`);
          if (!res.ok) throw new Error('Failed to load DB paper');
          const json = await res.json();
          setPaperMetaDb({ name: json?.name, createdBy: json?.createdBy });
          data = { questions: Array.isArray(json?.questions) ? json.questions : [] };
        } else {
          setQuizSet([]);
          setOrder([]);
          setTimeLeft(null);
          setLoading(false);
          return;
        }

        const rawArr = Array.isArray(data?.questions)
          ? data.questions
          : Array.isArray(data)
          ? data
          : [];

        let final = rawArr;
        let finalOrder = makeOrder(rawArr);

        if (randomize) {
          const saved = sessionKey ? loadSaved(sessionKey) : null;
          if (
            saved &&
            saved.version === 2 &&
            saved.total === rawArr.length &&
            Array.isArray(saved.order)
          ) {
            const dict = new Map(rawArr.map((q) => [stableKey(q), q]));
            const attempt = saved.order.map((k) => dict.get(k)).filter(Boolean);
            if (attempt.length === rawArr.length) {
              final = attempt;
              finalOrder = [...saved.order];
            } else {
              final = shuffle(rawArr);
              finalOrder = makeOrder(final);
            }
          } else {
            final = shuffle(rawArr);
            finalOrder = makeOrder(final);
          }
        }

        setQuizSet(final);
        setOrder(finalOrder);
        setSelected(new Array(final.length).fill(undefined));
        setPeeked(new Array(final.length).fill(false));
        setBookmarked(new Array(final.length).fill(false));
        setCurrentIdx(0);
        setTimeLeft(null);
        resumedRef.current = false;
      } catch (err) {
        console.error(err);
        setQuizSet([]);
        setOrder([]);
        setTimeLeft(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filePath, isDbPaper, dbPaperId, randomize, sessionKey]);

  // initial total time
  const initialTimeSec = useMemo(() => {
    if (!quizSet.length) return 0;
    if (String(mode) === 'custom') {
      const mins = Math.max(1, Math.min(180, parseInt(time || 10, 10)));
      return mins * 60;
    }
    const perQ = MODE_PRESETS[String(mode)]?.perQSec ?? 60;
    return perQ * quizSet.length;
  }, [quizSet.length, mode, time]);

  // attempt resume (after quizSet+order ready)
  useEffect(() => {
    if (!sessionKey || !quizSet.length || !order.length) return;

    try {
      const saved = loadSaved(sessionKey);
      if (!saved || saved.version !== 2) return;

      const sameLen = saved.total === quizSet.length;
      const sameSig = saved.orderSig === makeSig(order);
      const notExpired = Date.now() - (saved.ts || 0) < 7 * 24 * 60 * 60 * 1000;

      if (sameLen && sameSig && notExpired) {
        const sel = Array.isArray(saved.selectedIdxs)
          ? decodeSelected(saved.selectedIdxs, quizSet.length)
          : decodeSelected(saved.selected, quizSet.length); // backward-compat

        setSelected(sel);
        setPeeked(coerceBoolArray(saved.peeked, quizSet.length));
        setBookmarked(coerceBoolArray(saved.bookmarked, quizSet.length));
        setCurrentIdx(Math.min(Math.max(0, saved.currentIdx || 0), quizSet.length - 1));

        const base = Number(saved.initialTimeSec || initialTimeSec || 0);
        const t = Math.min(Math.max(0, Number(saved.timeLeft ?? base)), base || initialTimeSec || 0);
        setTimeLeft(Number.isFinite(t) ? t : initialTimeSec);

        resumedRef.current = true;
      }
    } catch {
      // ignore
    }
  }, [sessionKey, quizSet.length, order, initialTimeSec]);

  // set initial time once if not resumed
  useEffect(() => {
    if (timeLeft === null && initialTimeSec > 0 && !resumedRef.current) {
      setTimeLeft(initialTimeSec);
    }
  }, [initialTimeSec, timeLeft]);

  // scoring
  const calc = useCallback(() => {
    const attempted = selected.reduce(
      (acc, cur, idx) => (!peeked[idx] && cur !== undefined ? acc + 1 : acc),
      0
    );
    const correct = selected.reduce(
      (acc, cur, idx) =>
        !peeked[idx] && cur === quizSet[idx].answerIndex ? acc + 1 : acc,
      0
    );
    const wrong = attempted - correct;
    const negative = wrong * Number(NEGATIVE_MARK || 0);
    const score = correct - negative;
    return { attempted, correct, wrong, negative, score };
  }, [selected, peeked, quizSet, NEGATIVE_MARK]);

  // persist session (sanitize before writing)
  const saveSession = useCallback(
    (override = {}) => {
      if (!sessionKey || !quizSet.length) return;
      try {
        const selRaw = override.selected ?? selected;
        const selectedIdxs = encodeSelected(selRaw);
        const payload = {
          version: 2,
          ts: Date.now(),
          userId: uid,
          paper,
          mode,
          randomize,
          total: quizSet.length,
          order,
          orderSig: makeSig(order),
          selectedIdxs,                           // canonical (numbers or -1)
          selected: selectedIdxs.map((v) => (v === -1 ? null : v)), // legacy-friendly
          peeked: override.peeked ?? peeked,
          bookmarked: override.bookmarked ?? bookmarked,
          currentIdx: override.currentIdx ?? currentIdx,
          timeLeft: override.timeLeft ?? timeLeft,
          initialTimeSec,
        };
        localStorage.setItem(sessionKey, JSON.stringify(payload));
      } catch {
        // storage may be unavailable
      }
    },
    [
      sessionKey,
      uid,
      paper,
      mode,
      randomize,
      quizSet.length,
      order,
      selected,
      peeked,
      bookmarked,
      currentIdx,
      timeLeft,
      initialTimeSec,
    ]
  );

  // throttle timer saves (every ~15 ticks)
  const tickRef = useRef(0);
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    tickRef.current = (tickRef.current + 1) % 15;
    if (tickRef.current === 0) saveSession();
  }, [timeLeft, saveSession]);

  // save on unload
  useEffect(() => {
    const handler = () => saveSession();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveSession]);

  // finalize & score
  const hasSavedRef = useRef(false);
  const saveScore = useCallback(() => {
    if (scoredRef.current || !quizSet.length) return;
    if (!uid) { setNeedUserId(true); return; }
    const meta = calc();
    const paperName = (paperMeta?.name) || (paperMetaDb?.name) || String(paper || '');
    const payload = {
      userId: uid,
      paper,
      score: meta.score,
      meta: {
        ...meta,
        total: quizSet.length,
        mode,
        randomize,
        durationSec: initialTimeSec,
        timeLeftSec: timeLeft ?? 0,
        elapsedSec: Math.max(0, (initialTimeSec || 0) - (timeLeft ?? 0)),
        paperName,
      },
    };
    fetch('/api/save-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(() => { scoredRef.current = true; })
      .catch(() => {});
    try {
      if (sessionKey) localStorage.removeItem(sessionKey);
    } catch {}
  }, [uid, paper, calc, quizSet.length, mode, randomize, initialTimeSec, timeLeft, sessionKey]);

  // countdown
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      setIsFinished(true);
      saveScore();
      return;
    }
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft, saveScore]);

  // handlers
  const handleOptionSelect = (optionIndex) => {
    // guard
    if (!quizSet[currentIdx]) return;
    if (peeked[currentIdx]) return;

    // (state never contains null, only number|undefined)
    if (selected[currentIdx] !== undefined) return; // lock after first select

    const nextSel = [...selected];
    nextSel[currentIdx] = optionIndex;
    setSelected(nextSel);
    saveSession({ selected: nextSel });
  };

  const handlePeek = () => {
    if (selected[currentIdx] !== undefined) return;
    const nextPeek = [...peeked];
    nextPeek[currentIdx] = true;
    const nextSel = [...selected];
    nextSel[currentIdx] = undefined;
    setPeeked(nextPeek);
    setSelected(nextSel);
    saveSession({ peeked: nextPeek, selected: nextSel });
  };

  const handleSubmit = () => {
    setIsFinished(true);
    saveScore();
  };

  const handleNext = () => {
    if (currentIdx < quizSet.length - 1) {
      const next = currentIdx + 1;
      setCurrentIdx(next);
      saveSession({ currentIdx: next });
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      const prev = currentIdx - 1;
      setCurrentIdx(prev);
      saveSession({ currentIdx: prev });
    }
  };

  const toggleBookmark = () => {
    const next = [...bookmarked];
    next[currentIdx] = !next[currentIdx];
    setBookmarked(next);
    saveSession({ bookmarked: next });
  };

  // search inside paper
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setMatches([]);
      setMatchCursor(0);
      return;
    }
    const needle = query.toLowerCase();
    const results = [];
    quizSet.forEach((q, i) => {
      const hay =
        (q.text || '') +
        ' ' +
        (Array.isArray(q.options) ? q.options.join(' ') : '') +
        ' ' +
        (Array.isArray(q.tags) ? q.tags.join(' ') : '') +
        ' ' +
        (q.explanation || '');
      if (hay.toLowerCase().includes(needle)) results.push(i);
    });
    setMatches(results);
    if (results.length) {
      setCurrentIdx(results[0]);
      setMatchCursor(0);
    } else {
      setMatchCursor(0);
    }
  }, [query, quizSet]);

  const gotoPrevMatch = () => {
    if (!matches.length) return;
    const nextPos = (matchCursor - 1 + matches.length) % matches.length;
    setMatchCursor(nextPos);
    setCurrentIdx(matches[nextPos]);
  };
  const gotoNextMatch = () => {
    if (!matches.length) return;
    const nextPos = (matchCursor + 1) % matches.length;
    setMatchCursor(nextPos);
    setCurrentIdx(matches[nextPos]);
  };

  const progress = quizSet.length ? ((currentIdx + 1) / quizSet.length) * 100 : 0;

  // UI
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-200">
        Loading questions…
      </div>
    );
  }

  if (!quizSet.length) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50 dark:bg-gray-950">
        <div className="rounded-2xl bg-white dark:bg-gray-900 p-6 shadow ring-1 ring-gray-200/60 dark:ring-gray-800 text-center">
          <p className="text-rose-600 dark:text-rose-300 mb-4">No questions found for this paper.</p>
          <button
            className="py-2 px-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
            onClick={() => router.push('/')}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6 px-4">
        {!uid && (
          <div className="mx-auto max-w-5xl mb-4">
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:border-amber-900/30 dark:text-amber-200">
              Enter your User ID to save this score.
              <div className="mt-2 flex items-center gap-2">
                <input
                  placeholder="e.g., john01"
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const v = e.currentTarget.value.trim();
                      if (v) {
                        setUid(v);
                        try { localStorage.setItem('mcq_user_id', v); } catch {}
                        const newQuery = { ...router.query, userId: v };
                        router.replace({ pathname: router.pathname, query: newQuery }, undefined, { shallow: true });
                      }
                    }
                  }}
                />
                <button
                  className="rounded-xl bg-indigo-600 text-white px-3 py-2 text-sm"
                  onClick={() => {
                    const el = document.activeElement;
                    const v = el && el.value ? String(el.value).trim() : '';
                    if (v) {
                      setUid(v);
                      try { localStorage.setItem('mcq_user_id', v); } catch {}
                      const newQuery = { ...router.query, userId: v };
                      router.replace({ pathname: router.pathname, query: newQuery }, undefined, { shallow: true });
                    }
                  }}
                >Save</button>
              </div>
            </div>
          </div>
        )}
        <ResultSummary
          selected={selected}
          peeked={peeked}
          bookmarked={bookmarked}
          questions={quizSet}
          negativeMark={NEGATIVE_MARK}
          onRetry={() => router.push('/')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <button className="hover:underline" onClick={() => router.push('/')}>Home</button>
              <span className="mx-1">/</span>
              <span>{paperMeta?.name ?? paperMetaDb?.name ?? 'Quiz'}</span>
              <span className="mx-1">/</span>
              <span>Q{currentIdx + 1}</span>
              <span className="mx-2 text-gray-400">•</span>
              <span>Mode: <strong className="capitalize">{String(mode)}</strong></span>
              {paperMetaDb?.createdBy && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">by {paperMetaDb.createdBy}</span>
              )}
              {randomize && (
                <span className="ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  random
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMapOpen(true)}
                className="rounded-xl px-3 py-1.5 text-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                title="Open question map"
              >
                Map
              </button>
              {!uid && (
                <div className="hidden sm:flex items-center gap-2">
                  <input
                    placeholder="Enter User ID"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const v = e.currentTarget.value.trim();
                        if (v) {
                          setUid(v);
                          try { localStorage.setItem('mcq_user_id', v); } catch {}
                          setNeedUserId(false);
                          const newQuery = { ...router.query, userId: v };
                          router.replace({ pathname: router.pathname, query: newQuery }, undefined, { shallow: true });
                        }
                      }
                    }}
                    className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-900"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">needed to save scores</span>
                </div>
              )}
              {timeLeft !== null ? (
                <Timer timeLeft={timeLeft} />
              ) : (
                <div className="px-4 py-2 rounded-full text-xs text-gray-500 dark:text-gray-400">
                  Preparing timer…
                </div>
              )}
              <ThemeToggle />
            </div>
          </div>

          {/* search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search in this paper (min 2 chars)…"
                className="w-full rounded-2xl border border-gray-300 bg-white px-10 py-2.5 text-gray-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 2a8 8 0 105.3 14.3l4.2 4.2 1.4-1.4-4.2-4.2A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4z"/>
                </svg>
              </div>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300 min-w-[100px] text-right">
              {matches.length ? `${matchCursor + 1}/${matches.length}` : '0 matches'}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={gotoPrevMatch}
                disabled={!matches.length}
                className="rounded-lg px-2 py-1 text-sm bg-gray-200 disabled:opacity-50 dark:bg-gray-800"
                title="Previous match"
              >
                ←
              </button>
              <button
                onClick={gotoNextMatch}
                disabled={!matches.length}
                className="rounded-lg px-2 py-1 text-sm bg-gray-200 disabled:opacity-50 dark:bg-gray-800"
                title="Next match"
              >
                →
              </button>
            </div>
          </div>
        </div>
      <div className="mx-auto max-w-5xl px-4 pb-2">
        <ProgressBar value={progress} />
      </div>
    </div>

    {/* Ask for User ID when needed (mobile friendly) */}
    {!uid && needUserId && (
      <div className="mx-auto max-w-5xl px-4 mt-3">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:border-amber-900/30 dark:text-amber-200">
          Enter your User ID to save progress & scores.
          <div className="mt-2 flex items-center gap-2">
            <input
              placeholder="e.g., john01"
              className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = e.currentTarget.value.trim();
                  if (v) {
                    setUid(v);
                    try { localStorage.setItem('mcq_user_id', v); } catch {}
                    setNeedUserId(false);
                    const newQuery = { ...router.query, userId: v };
                    router.replace({ pathname: router.pathname, query: newQuery }, undefined, { shallow: true });
                  }
                }
              }}
            />
            <button
              className="rounded-xl bg-indigo-600 text-white px-3 py-2 text-sm"
              onClick={() => {
                const el = document.activeElement;
                const v = el && el.value ? String(el.value).trim() : '';
                if (v) {
                  setUid(v);
                  try { localStorage.setItem('mcq_user_id', v); } catch {}
                  setNeedUserId(false);
                  const newQuery = { ...router.query, userId: v };
                  router.replace({ pathname: router.pathname, query: newQuery }, undefined, { shallow: true });
                }
              }}
            >Save</button>
          </div>
        </div>
      </div>
    )}

      {/* Body */}
      <div className="mx-auto max-w-5xl p-4">
        <div className="rounded-3xl bg-white dark:bg-gray-900 p-6 shadow-sm ring-1 ring-gray-200/60 dark:ring-gray-800">
          <div className="mb-3 text-sm text-gray-600 dark:text-gray-300">
            Negative marking: <strong>{NEGATIVE_MARK}</strong> (peeked questions excluded)
          </div>
          <QuizQuestion
            question={quizSet[currentIdx]}
            questionIndex={currentIdx}
            total={quizSet.length}
            selectedOption={selected[currentIdx]}
            onSelectOption={handleOptionSelect}
            onNext={handleNext}
            onPrev={handlePrev}
            onPeek={handlePeek}
            isPeeked={peeked[currentIdx]}
            isBookmarked={bookmarked[currentIdx]}
            onToggleBookmark={toggleBookmark}
            highlight={query}
          />
        </div>
      </div>

      {/* Map Drawer */}
      <QuestionMapDrawer
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        total={quizSet.length}
        currentIdx={currentIdx}
        selected={selected}
        peeked={peeked}
        bookmarked={bookmarked}
        onJump={(i) => {
          setCurrentIdx(i);
          setMapOpen(false);
          saveSession({ currentIdx: i });
        }}
      />
    </div>
  );
}
