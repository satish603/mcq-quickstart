import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { paperList } from '../data/paperList';

function formatIST(iso) {
  try {
    return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  } catch {
    return iso;
  }
}

function fmtNum(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '-';
  return Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(2);
}

export default function ScoreHistory({ userId, rows, onRefresh, loading }) {
  const [nameMap, setNameMap] = useState({}); // { paperKey -> friendlyName }

  // Seed with built-in papers and meta-provided names
  const builtInMap = useMemo(() => {
    const m = {};
    try {
      (paperList || []).forEach((p) => { m[p.id] = p.name; });
    } catch {}
    return m;
  }, []);

  useEffect(() => {
    const m = { ...builtInMap };
    (rows || []).forEach((r) => {
      const key = String(r.paper || '');
      const metaName = r?.meta?.paperName;
      if (metaName) m[key] = String(metaName);
    });
    setNameMap(m);

    // Fetch names for any DB papers not yet known
    const dbIds = Array.from(
      new Set(
        (rows || [])
          .map((r) => String(r.paper || ''))
          .filter((k) => k.startsWith('db:') && !m[k])
          .map((k) => k.slice(3))
      )
    );
    let cancelled = false;
    (async () => {
      for (const id of dbIds) {
        try {
          const res = await fetch(`/api/papers/get?id=${encodeURIComponent(id)}`);
          if (!res.ok) continue;
          const data = await res.json();
          if (!cancelled && data?.name) {
            setNameMap((prev) => ({ ...prev, [`db:${id}`]: data.name }));
          }
        } catch {
          // ignore
        }
      }
    })();
    return () => { cancelled = true; };
  }, [rows, builtInMap]);

  const displayName = (r) => {
    const key = String(r.paper || '');
    return nameMap[key] || key;
  };

  const denomFor = (r) => {
    const meta = r?.meta || {};
    const t = meta.total;
    if (Number.isFinite(t) && t > 0) return t;
    if (Array.isArray(meta.orderKeys)) return meta.orderKeys.length;
    return null;
  };

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
                <th className="py-2 pr-4">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const denom = denomFor(r);
                const id = r.id;
                return (
                  <tr key={i} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-4">{formatIST(r.timestamp)}</td>
                    <td className="py-2 pr-4">{displayName(r)}</td>
                    <td className="py-2 pr-4">
                      <span className="inline-flex items-center rounded-full bg-indigo-600/10 px-2.5 py-0.5 text-indigo-700">
                        {fmtNum(r.score)}{denom ? `/${denom}` : ''}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      {id ? (
                        <Link href={`/attempt/${id}`} className="rounded-lg px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700">
                          View attempt
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-500">Unavailable</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
