// components/QuestionMapDrawer.jsx
import React from 'react';

export default function QuestionMapDrawer({
  open,
  onClose,
  total = 0,
  currentIdx = 0,
  selected = [],
  peeked = [],
  bookmarked = [],
  onJump,
}) {
  if (!open) return null;

  const btnBase =
    'relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border transition select-none';

  const cell = (i) => {
    const idx = i;
    const isCurrent = idx === currentIdx;
    const isPeeked = !!peeked[idx];
    const isAnswered = !isPeeked && selected[idx] !== undefined;
    const isBookmarked = !!bookmarked[idx];

    let cls =
      'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700';

    if (isPeeked) cls = 'bg-amber-500 text-white border-amber-500';
    else if (isAnswered) cls = 'bg-indigo-600 text-white border-indigo-600';

    return (
      <button
        key={idx}
        onClick={() => onJump(idx)}
        className={`${btnBase} ${cls} ${isCurrent ? 'ring-2 ring-indigo-600' : ''}`}
        title={`Go to Q${idx + 1}`}
      >
        {idx + 1}
        {isBookmarked && (
          <span className="absolute -top-1 -right-1 text-[10px] leading-none">⭐</span>
        )}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-40">
      {/* backdrop */}
      <button
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-label="Close map"
        onClick={onClose}
      />
      {/* panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-xl p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Question Map</h3>
          <button
            className="rounded-xl px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* legend */}
        <div className="flex flex-wrap gap-2 text-xs mb-4">
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block" /> Answered
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Peeked
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-700 inline-block" /> Unanswered
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block text-[10px]">⭐</span> Bookmarked
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full ring-2 ring-indigo-600 inline-block" /> Current
          </span>
        </div>

        {/* grid */}
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
          {Array.from({ length: total }).map((_, i) => cell(i))}
        </div>
      </div>
    </div>
  );
}
