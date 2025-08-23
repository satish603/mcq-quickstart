// pages/index.jsx
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import 'tailwindcss/tailwind.css';
import { paperList } from '../data/paperList';
import ScoreHistory from '../components/ScoreHistory';
import ThemeToggle from '../components/ThemeToggle';
import { NextSeo } from 'next-seo';
import { SITE_NAME, TAGLINE, SITE_URL, TENANT, GSC_VERIFICATION } from '../lib/siteConfig';

export default function Home() {
  const router = useRouter();

  // state
  const [activeTab, setActiveTab] = useState('quiz'); // 'quiz' | 'scores'
  const [userId, setUserId] = useState('');
  const [selectedPaper, setSelectedPaper] = useState('');
  const [time, setTime] = useState(10);

  // scores state
  const [scores, setScores] = useState([]);
  const [loadingScores, setLoadingScores] = useState(false);

  // hydrate from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mcq_user_id');
    if (saved) setUserId(saved);
  }, []);
  useEffect(() => {
    if (userId) localStorage.setItem('mcq_user_id', userId);
  }, [userId]);

  // paper options
  const papers = useMemo(() => paperList ?? [], []);
  // auto-pick first paper if none selected
  useEffect(() => {
    if (!selectedPaper && papers.length > 0) setSelectedPaper(papers[0].id);
  }, [papers, selectedPaper]);

  const numericTime = Number.isFinite(Number(time))
    ? Math.max(1, Math.min(180, parseInt(time || 0, 10)))
    : 10;
  const canStart = Boolean(userId.trim()) && Boolean(selectedPaper) && numericTime >= 1;

  const handleStart = () => {
    if (!canStart) return;
    router.push(
      `/quiz?paper=${selectedPaper}&time=${numericTime}&userId=${encodeURIComponent(userId)}`
    );
  };

  const fetchScores = async () => {
    if (!userId.trim()) {
      setScores([]);
      return;
    }
    setLoadingScores(true);
    try {
      const res = await fetch(`/api/get-scores?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      setScores(Array.isArray(data?.rows) ? data.rows : []);
    } catch (e) {
      console.error(e);
      setScores([]);
    } finally {
      setLoadingScores(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'scores' && userId) fetchScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userId]);

  // Tenant-aware SEO copy
  const seoTitle =
    TENANT === 'it'
      ? 'IT Interview MCQs (DSA, SQL, OS, DBMS) — Free Practice'
      : 'Practice KGMU & SGPGI Nursing Officer Questions (Free MCQ Test)';
  const seoDesc =
    TENANT === 'it'
      ? 'Practice IT interview questions with explanations. Topic-wise sets (DSA, SQL, OS, DBMS), review mode, map & search, peek without negative marks.'
      : 'Free KGMU & SGPGI Nursing Officer/Staff Nurse questions with explanations, previous papers, review mode, and peek without negative marks.';

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <NextSeo
        title={seoTitle}
        description={seoDesc}
        canonical={`${SITE_URL}/`}
        additionalMetaTags={[
          ...(GSC_VERIFICATION
            ? [{ name: 'google-site-verification', content: GSC_VERIFICATION }]
            : []),
        ]}
        openGraph={{ url: `${SITE_URL}/`, title: `${seoTitle} | ${SITE_NAME}`, description: seoDesc }}
      />

      {/* Top Bar */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur dark:bg-gray-900/80 dark:border-gray-800">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
              {TENANT === 'it' ? 'T' : 'N'}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight dark:text-gray-100">
                {SITE_NAME}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{TAGLINE}</p>
            </div>
          </div>

          {/* RIGHT: badges + theme toggle (always visible toggle) */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              Next.js
            </span>
            <span className="hidden sm:inline rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              Tailwind
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Tabs Card */}
        <div className="rounded-3xl bg-white shadow-sm ring-1 ring-gray-200/60 p-4 sm:p-6 dark:bg-gray-900 dark:ring-gray-800">
          <div className="flex items-center gap-2">
            <button
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                activeTab === 'quiz'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
              }`}
              onClick={() => setActiveTab('quiz')}
              aria-pressed={activeTab === 'quiz'}
            >
              Take Quiz
            </button>
            <button
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                activeTab === 'scores'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
              }`}
              onClick={() => setActiveTab('scores')}
              aria-pressed={activeTab === 'scores'}
            >
              My Scores
            </button>
          </div>

          {/* Shared User ID */}
          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1 dark:text-gray-200">
              User ID
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg
                  className="h-5 w-5 text-gray-400 dark:text-gray-500"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5Zm0 2c-4 0-8 2-8 6v1h16v-1c0-4-4-6-8-6Z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="e.g., shobha01"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full rounded-2xl border border-gray-300 bg-white px-10 py-2.5 text-gray-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                aria-label="User ID"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
              This ID is used to save & fetch your scores on this device.
            </p>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'quiz' && (
          <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Select Paper */}
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200/60 dark:bg-gray-900 dark:ring-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Select Your Question Paper
              </h2>
              <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                Choose a set and a duration, then hit Start.
              </p>

              <div className="mt-5 space-y-4">
                {/* Paper */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 dark:text-gray-200">
                    Paper Set
                  </label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-2xl border border-gray-300 bg-white px-4 py-2.5 pr-10 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                      value={selectedPaper}
                      onChange={(e) => setSelectedPaper(e.target.value)}
                      aria-label="Select paper set"
                    >
                      {papers.length === 0 && <option value="">No papers available</option>}
                      {papers.length > 0 &&
                        papers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg
                        className="h-5 w-5 text-gray-400 dark:text-gray-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.184l3.71-3.953a.75.75 0 1 1 1.08 1.04l-4.24 4.52a.75.75 0 0 1-1.08 0l-4.24-4.52a.75.75 0 0 1 .02-1.06Z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Timer */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Timer (mins)
                    </label>
                    <span className="text-xs text-gray-400 dark:text-gray-500">1–180</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={numericTime}
                    onChange={(e) => setTime(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                    aria-label="Timer in minutes"
                  />
                </div>

                {/* Hints */}
                <ul className="text-xs text-gray-500 space-y-1 dark:text-gray-400">
                  <li>• You can peek an answer without negative marking.</li>
                  <li>• Peeked questions are excluded from scoring.</li>
                </ul>

                {/* Start Button */}
                <button
                  onClick={handleStart}
                  disabled={!canStart}
                  className={`w-full rounded-2xl px-4 py-3 font-semibold shadow-sm transition ${
                    canStart
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400'
                  }`}
                  aria-label="Start Quiz"
                >
                  Start Quiz
                </button>
              </div>
            </div>

            {/* Right: Pro Tips */}
            <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white p-6 shadow-sm">
              <h3 className="text-lg font-bold">Pro tips</h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed">
                <li>• <strong>Use the Map</strong> to jump to any question instantly.</li>
                <li>• <strong>Search inside paper</strong> (header) to find questions by keywords.</li>
                <li>• <strong>Bookmark</strong> tough questions and filter them in review.</li>
                <li>• <strong>Peek</strong> shows the correct answer & explanation and <em>excludes</em> that question from scoring.</li>
                <li>• Toggle <strong>Dark Mode</strong> anytime (top-right) — it’s saved for next time.</li>
              </ul>

              <div className="mt-6 rounded-2xl bg-white/10 p-4">
                <p className="text-sm opacity-90">
                  Tip: Use <kbd>↑/↓</kbd> or <kbd>←/→</kbd> to move between options. Press <kbd>Enter</kbd> to go Next.
                </p>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'scores' && (
          <section className="mt-6">
            <ScoreHistory
              userId={userId}
              rows={scores}
              loading={loadingScores}
              onRefresh={fetchScores}
            />
          </section>
        )}
      </main>

      <footer className="border-t bg-white/70 dark:bg-gray-900/70 dark:border-gray-800">
        <div className="mx-auto max-w-6xl px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Made with <span className="text-red-500">❤</span> in India
        </div>
      </footer>
    </div>
  );
}
