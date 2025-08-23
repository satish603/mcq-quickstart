// components/QuizQuestion.jsx
import React, { useMemo, useCallback } from 'react';

export default function QuizQuestion({
  question,
  questionIndex,
  total,
  selectedOption,
  onSelectOption,
  onNext,
  onPrev,
  onPeek,
  isPeeked,
  isBookmarked,
  onToggleBookmark,
  highlight = '', // <-- new
}) {
  if (!question) return null;

  const letters = ['A', 'B', 'C', 'D'];
  const options = Array.isArray(question.options) ? question.options : [];
  const correctIdx = question.answerIndex;

  const explanationLines = useMemo(() => {
    const exp = question.explanation;
    if (!exp) return [];
    if (Array.isArray(exp)) return exp.map(String);
    return (String(exp).match(/[^.!?]+[.!?]*/g) || []).map((s) => s.trim());
  }, [question.explanation]);

  const handleKeyDown = useCallback(
    (e) => {
      if (isPeeked || !options.length) return;
      const last = options.length - 1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = selectedOption == null ? 0 : Math.min(last, selectedOption + 1);
        onSelectOption(next);
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = selectedOption == null ? 0 : Math.max(0, selectedOption - 1);
        onSelectOption(prev);
      }
      if (e.key === 'Enter' && selectedOption != null) {
        e.preventDefault();
        onNext();
      }
    },
    [isPeeked, options.length, selectedOption, onSelectOption, onNext]
  );

  // highlight helper
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const hi = useCallback(
    (s) => {
      if (!highlight || highlight.length < 2) return esc(s);
      const re = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')})`, 'gi');
      return esc(s).replace(
        re,
        '<mark class="bg-yellow-200 dark:bg-yellow-900 text-black dark:text-yellow-200 rounded px-1">$1</mark>'
      );
    },
    [highlight]
  );

  return (
    <div className="text-gray-900 dark:text-gray-100">
      {/* header row */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="font-semibold">
          Question {questionIndex + 1} of {total}
        </div>
        <button
          onClick={onToggleBookmark}
          className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
            isBookmarked
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
          }`}
          title={isBookmarked ? 'Bookmarked' : 'Bookmark this question'}
        >
          {isBookmarked ? '⭐ Bookmarked' : '☆ Bookmark'}
        </button>
      </div>

      {/* text */}
      <div
        className="mb-3 text-base sm:text-lg"
        dangerouslySetInnerHTML={{ __html: hi(question.text) }}
      />

      {/* tags */}
      {Array.isArray(question.tags) && question.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {question.tags.map((t, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-full bg-indigo-600/10 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 text-xs"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* options */}
      <div
        className="mb-5 space-y-2"
        role="radiogroup"
        aria-label={`Question ${questionIndex + 1}`}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {options.map((opt, idx) => {
          const isSelected = selectedOption === idx;
          const isCorrect = idx === correctIdx;
          const base =
            'w-full text-left p-4 rounded-2xl border transition ring-offset-2 focus:outline-none focus:ring-2';
          const notPeekedStyle = isSelected
            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:border-indigo-400'
            : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800';

          const peekedStyle = isPeeked
            ? isCorrect
              ? 'border-green-600 bg-green-50 dark:bg-green-900/30'
              : 'opacity-60 border-gray-200 dark:border-gray-700'
            : '';

          return (
            <button
              key={idx}
              role="radio"
              aria-checked={isSelected && !isPeeked}
              disabled={isPeeked}
              onClick={() => !isPeeked && onSelectOption(idx)}
              className={[base, isPeeked ? peekedStyle : notPeekedStyle].join(' ')}
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold dark:border-gray-600">
                  {letters[idx] ?? idx + 1}
                </span>
                <div
                  className="flex-1"
                  dangerouslySetInnerHTML={{ __html: hi(opt) }}
                />
                {!isPeeked && isSelected && (
                  <span className="text-indigo-600 dark:text-indigo-300 font-semibold">Selected</span>
                )}
                {isPeeked && isCorrect && (
                  <span className="text-green-700 dark:text-green-300 font-semibold">✔</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <button
          className="py-2 px-4 rounded-xl bg-gray-200 text-gray-900 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          onClick={onPrev}
          disabled={questionIndex === 0}
        >
          ← Previous
        </button>

        <div className="flex items-center gap-2">
          <button
            className="py-2 px-4 rounded-xl bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
            onClick={onPeek}
            disabled={isPeeked}
          >
            Show Answer
          </button>
          <button
            className="py-2 px-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
            onClick={onNext}
          >
            {questionIndex === total - 1 ? 'Submit' : 'Next →'}
          </button>
        </div>
      </div>

      {/* peek panel */}
      {isPeeked && (
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 dark:bg-green-900/20 dark:border-green-900/40">
          <div className="mb-1 font-semibold">
            Correct Answer: {options[correctIdx]}
          </div>
          {explanationLines.length > 0 && (
            <div className="mt-2 text-gray-800 dark:text-gray-200">
              <div className="font-semibold">Explanation:</div>
              <ul className="list-disc pl-5 space-y-1">
                {explanationLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-3 inline-block rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-400/20 dark:text-amber-300">
            Peeked — this question will not affect your score
          </div>
        </div>
      )}
    </div>
  );
}
