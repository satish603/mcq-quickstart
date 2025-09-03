// components/ResultSummary.jsx
import React from 'react';
import ReviewAnswers from './ReviewAnswers';

export default function ResultSummary({ selected, peeked = [], bookmarked = [], questions, onRetry, negativeMark = 0.25 }) {
  const NEGATIVE_MARK = Number(negativeMark ?? 0.25);
  const total = questions.length;
  const peekCount = peeked.filter(Boolean).length;

  const attempted = selected.reduce(
    (acc, ans, idx) => (!peeked[idx] && ans !== undefined ? acc + 1 : acc), 0
  );
  const correct = selected.reduce(
    (acc, ans, idx) => (!peeked[idx] && ans === questions[idx].answerIndex ? acc + 1 : acc), 0
  );
  const wrong = attempted - correct;
  const negative = wrong * NEGATIVE_MARK;
  const rawScore = correct - negative;
  // Peeked questions count toward total marks; no negative applied for them
  const percent = total > 0 ? ((rawScore / total) * 100).toFixed(2) : '0.00';

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm ring-1 ring-gray-200/60 dark:ring-gray-800 p-6 text-center mb-8">
        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">Quiz Complete!</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mt-2 text-gray-700 dark:text-gray-300">
          <div><span className="font-medium">Total:</span> {total}</div>
          <div><span className="font-medium">Peeked (no negative):</span> {peekCount}</div>
          <div><span className="font-medium">Attempted:</span> {attempted}</div>
          <div><span className="font-medium">Correct:</span> {correct}</div>
          <div><span className="font-medium">Wrong:</span> {wrong}</div>
          <div className="col-span-2 sm:col-span-3">
            <span className="font-medium">Score:</span> {rawScore.toFixed(2)} / {total} ({percent}%)
          </div>
        </div>

        <button
          className="mt-6 py-2 px-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
          onClick={onRetry}
        >
          Back to Home
        </button>
      </div>

      <ReviewAnswers
        questions={questions}
        selected={selected}
        peeked={peeked}
        bookmarked={bookmarked}
      />
    </div>
  );
}
