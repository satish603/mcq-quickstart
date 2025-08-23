import React from 'react';

function formatIST(iso) {
  try {
    return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  } catch {
    return iso;
  }
}

export default function ScoreHistory({ userId, rows, onRefresh, loading }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200/60">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">My Scores</h3>
          <p className="text-sm text-gray-500">
            {userId ? `for ${userId}` : 'Enter a User ID on the Take Quiz tab'}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading || !userId}
          className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
            loading || !userId
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {!userId ? (
        <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
          Add your <strong>User ID</strong> to view saved attempts.
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          No scores yet. Complete a quiz to see your history here.
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b">
                <th className="py-2 pr-4">Date (IST)</th>
                <th className="py-2 pr-4">Paper</th>
                <th className="py-2 pr-4">Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 pr-4">{formatIST(r.timestamp)}</td>
                  <td className="py-2 pr-4">{r.paper}</td>
                  <td className="py-2 pr-4">
                    <span className="inline-flex items-center rounded-full bg-indigo-600/10 px-2.5 py-0.5 text-indigo-700">
                      {Number(r.score).toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
