// pages/quiz.jsx
import { useEffect, useMemo, useState } from 'react';
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

export default function Quiz() {
  const router = useRouter();
  const { paper, time, userId, mode = 'medium' } = router.query;

  // data + ui
  const [quizSet, setQuizSet] = useState([]);
  const [loading, setLoading] = useState(true);

  // state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState([]);   // index or undefined
  const [peeked, setPeeked] = useState([]);       // boolean[]
  const [bookmarked, setBookmarked] = useState([]); // boolean[]

  // timer (null = not initialized yet)
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

  // load questions
  useEffect(() => {
    if (!filePath) {
      setLoading(false);
      setQuizSet([]);
      setTimeLeft(null);
      return;
    }
    setLoading(true);
    fetch(filePath)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load question set');
        return res.json();
      })
      .then((data) => {
        const arr = Array.isArray(data?.questions)
          ? data.questions
          : Array.isArray(data)
          ? data
          : [];
        setQuizSet(arr);
        setSelected(Array(arr.length).fill(undefined));
        setPeeked(Array(arr.length).fill(false));
        setBookmarked(Array(arr.length).fill(false));
        setCurrentIdx(0);
        setTimeLeft(null); // will be set by mode/custom after load
      })
      .catch((err) => {
        console.error(err);
        setQuizSet([]);
        setTimeLeft(null);
      })
      .finally(() => setLoading(false));
  }, [filePath]);

  // compute time from mode/custom after questions load
  const initialTimeSec = useMemo(() => {
    if (!quizSet.length) return 0;
    if (String(mode) === 'custom') {
      const mins = Math.max(1, Math.min(180, parseInt(time || 10, 10)));
      return mins * 60;
    }
    const perQ = MODE_PRESETS[String(mode)]?.perQSec ?? 60; // default 60s/q
    return perQ * quizSet.length;
  }, [quizSet.length, mode, time]);

  // apply initial time once
  useEffect(() => {
    if (timeLeft === null && initialTimeSec > 0) {
      setTimeLeft(initialTimeSec);
    }
  }, [initialTimeSec, timeLeft]);

  // countdown (only after time initialized)
  useEffect(() => {
    if (timeLeft === null) return;      // not started yet
    if (timeLeft <= 0) {                // ended
      setIsFinished(true);
      return;
    }
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  // selection: lock after first choice; block if peeked
  const handleOptionSelect = (optionIndex) => {
    if (peeked[currentIdx]) return;
    if (selected[currentIdx] !== undefined) return; // lock after first select
    setSelected((prev) => {
      const copy = [...prev];
      copy[currentIdx] = optionIndex;
      return copy;
    });
  };

  // peek only before answering; clears selection; excludes from scoring
  const handlePeek = () => {
    if (selected[currentIdx] !== undefined) return;
    setPeeked((prev) => {
      const copy = [...prev];
      copy[currentIdx] = true;
      return copy;
    });
    setSelected((prev) => {
      const copy = [...prev];
      copy[currentIdx] = undefined;
      return copy;
    });
  };

  const handleNext = () => {
    if (currentIdx < quizSet.length - 1) setCurrentIdx((i) => i + 1);
    else setIsFinished(true);
  };

  const handlePrev = () => {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1);
  };

  const toggleBookmark = () => {
    setBookmarked((prev) => {
      const copy = [...prev];
      copy[currentIdx] = !copy[currentIdx];
      return copy;
    });
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

  // scoring
  const calc = () => {
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
  };

  // save score ONLY when finished
  useEffect(() => {
    if (!quizSet.length) return;
    if (!isFinished) return;
    const { score } = calc();
    fetch('/api/save-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, paper, score }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinished, quizSet.length]);

  const progress = quizSet.length ? ((currentIdx + 1) / quizSet.length) * 100 : 0;

  // -------- UI --------

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
        <ResultSummary
          selected={selected}
          peeked={peeked}
          bookmarked={bookmarked}
          questions={quizSet}
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
              <span>{paperMeta?.name ?? 'Quiz'}</span>
              <span className="mx-1">/</span>
              <span>Q{currentIdx + 1}</span>
              <span className="mx-2 text-gray-400">•</span>
              <span>Mode: <strong className="capitalize">{String(mode)}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMapOpen(true)}
                className="rounded-xl px-3 py-1.5 text-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                title="Open question map"
              >
                Map
              </button>
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

          {/* search-in-paper */}
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
        }}
      />
    </div>
  );
}
