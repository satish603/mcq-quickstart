import Link from 'next/link';
import { NextSeo } from 'next-seo';
import { paperList } from '../../data/paperList';
import { isDbConfigured, listPapers } from '../../lib/papersDb';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com').replace(/\/+$/, '');

export default function PapersIndex({ builtIn, community }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <NextSeo title="All Papers" description="Browse available MCQ papers" canonical={`${siteUrl}/papers`} />
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="text-2xl font-extrabold">All Papers</h1>

        <section className="mt-6">
          <h2 className="text-lg font-bold">Built-in</h2>
          <ul className="mt-3 grid sm:grid-cols-2 gap-3">
            {builtIn.map((p) => (
              <li key={p.id} className="rounded-xl border p-4 dark:border-gray-800">
                <div className="font-semibold">{p.name}</div>
                <div className="mt-2 flex gap-2 text-sm">
                  <Link href={`/papers/${p.id}`} className="text-indigo-600 hover:underline">SEO page</Link>
                  <Link href={`/quiz?paper=${p.id}&time=30&userId=guest`} className="text-indigo-600 hover:underline">Start quiz</Link>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold">Community</h2>
          {community.length === 0 ? (
            <p className="text-sm text-gray-500 mt-2">No community papers found.</p>
          ) : (
            <ul className="mt-3 grid sm:grid-cols-2 gap-3">
              {community.map((r) => (
                <li key={r.id} className="rounded-xl border p-4 dark:border-gray-800">
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-xs text-gray-500">by {r.created_by}</div>
                  <div className="mt-2 flex gap-2 text-sm">
                    <Link href={`/papers/db/${r.id}`} className="text-indigo-600 hover:underline">SEO page</Link>
                    <Link href={`/quiz?paper=db:${r.id}&time=30&userId=guest`} className="text-indigo-600 hover:underline">Start quiz</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

export async function getServerSideProps() {
  let community = [];
  try {
    community = isDbConfigured() ? (await listPapers({})).slice(0, 50) : [];
  } catch { community = []; }
  return { props: { builtIn: paperList, community } };
}

