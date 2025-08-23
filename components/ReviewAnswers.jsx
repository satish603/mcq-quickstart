// components/ReviewAnswers.jsx
import React, { useMemo, useState } from 'react';

export default function ReviewAnswers({ questions, selected, peeked = [], bookmarked = [] }) {
  const [filter, setFilter] = useState('all'); // all | incorrect | bookmarked | peeked

  const items = useMemo(() => {
    return questions.map((q, idx) => {
      const userChoice = selected[idx];
      const wasPeeked = !!peeked[idx];
      const isCorrect = !wasPeeked && userChoice === q.answerIndex;
      const isBookmarked = !!bookmarked[idx];
      return { idx, q, userChoice, wasPeeked, isCorrect, isBookmarked };
    });
  }, [questions, selected, peeked, bookmarked]);

  const filtered = items.filter((it) => {
    if (filter === 'incorrect') return !it.wasPeeked && it.userChoice !== undefined && !it.isCorrect;
    if (filter === 'bookmarked') return it.isBookmarked;
    if (filter === 'peeked') return it.wasPeeked;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto mt-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Review Your Answers</h2>
        <div className="ml-auto flex gap-2">
          {['all', 'incorrect', 'bookmarked', 'peeked'].map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                filter === k
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {filtered.map(({ idx, q, userChoice, wasPeeked, isCorrect, isBookmarked }) => (
          <div
            key={q.id ?? idx}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:bg-gray-900 dark:border-gray-800"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {idx + 1}. {q.text}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isBookmarked && (
                  <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-xs font-semibold dark:bg-amber-400/20 dark:text-amber-300">
                    ⭐ Bookmarked
                  </span>
                )}
                {wasPeeked ? (
                  <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-xs font-semibold dark:bg-amber-400/20 dark:text-amber-300">
                    Peeked
                  </span>
                ) : isCorrect ? (
                  <span className="rounded-full bg-green-100 text-green-800 px-2.5 py-0.5 text-xs font-semibold dark:bg-green-400/20 dark:text-green-300">
                    Correct
                  </span>
                ) : userChoice !== undefined ? (
                  <span className="rounded-full bg-rose-100 text-rose-800 px-2.5 py-0.5 text-xs font-semibold dark:bg-rose-400/20 dark:text-rose-300">
                    Wrong
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 text-gray-700 px-2.5 py-0.5 text-xs font-semibold dark:bg-gray-800 dark:text-gray-200">
                    Unanswered
                  </span>
                )}
              </div>
            </div>

            {Array.isArray(q.tags) && q.tags.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {q.tags.map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full bg-indigo-600/10 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 text-xs"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            <div className="mb-2">
              <span className="font-medium">Your answer:&nbsp;</span>
              <span className="font-semibold">
                {wasPeeked
                  ? 'Peeked (not counted)'
                  : userChoice !== undefined
                  ? q.options[userChoice]
                  : 'Unanswered'}
              </span>
            </div>

            <div className="mb-2">
              <span className="font-medium">Correct answer:&nbsp;</span>
              <span className="font-semibold text-green-700 dark:text-green-300">
                {q.options[q.answerIndex]}
              </span>
            </div>

            {q.explanation && (
              <div className="mt-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                {q.explanation}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
