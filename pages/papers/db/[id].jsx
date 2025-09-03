import Head from 'next/head';
import { NextSeo } from 'next-seo';
import { useRouter } from 'next/router';
import { getPaperById } from '../../../lib/papersDb';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com').replace(/\/+$/, '');

export default function DBPaperPage({ paper, questionsPreview, canonical }) {
  const router = useRouter();
  if (!paper) return null;

  const title = `${paper.name} | ${paper.tenant === 'it' ? 'IT Interview MCQs' : 'Nursing Officer MCQs'}`;
  const desc = `Free practice for ${paper.name}. Previous questions with answers and explanations. Start quiz or browse explanations.`;

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${paper.name} - Question List`,
    itemListOrder: 'http://schema.org/ItemListOrderAscending',
    numberOfItems: questionsPreview.length,
    itemListElement: questionsPreview.map((q, i) => ({
      '@type': 'Question',
      position: i + 1,
      name: q.text,
      acceptedAnswer: { '@type': 'Answer', text: q.options?.[q.answerIndex] },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Papers', item: `${siteUrl}/papers` },
      { '@type': 'ListItem', position: 3, name: paper.name, item: canonical },
    ],
  };

  return (
    <>
      <NextSeo
        title={title}
        description={desc}
        canonical={canonical}
        openGraph={{ url: canonical, title, description: desc }}
        additionalMetaTags={[{ name: 'robots', content: 'index,follow' }]}
      />
      <Head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      </Head>

      <main className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{paper.name}</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Practice questions with answers and explanations.</p>

        <div className="mt-4">
          <button
            onClick={() => router.push(`/quiz?paper=db:${paper.id}&time=30&userId=guest`)}
            className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
          >
            Start Quiz (30 mins)
          </button>
        </div>

        <section className="mt-6">
          <h2 className="text-lg font-bold mb-2">Sample Questions (preview)</h2>
          <ul className="space-y-3">
            {questionsPreview.map((q, idx) => (
              <li key={q.id ?? idx} className="rounded-xl border p-4 dark:border-gray-800">
                <div className="font-semibold mb-1">{idx + 1}. {q.text}</div>
                {Array.isArray(q.options) && (
                  <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300">
                    {q.options.map((op, i) => (<li key={i}>{op}</li>))}
                  </ul>
                )}
                <div className="text-sm mt-2">
                  <span className="font-medium text-green-700 dark:text-green-300">Answer:</span>{' '}
                  {q.options?.[q.answerIndex]}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Full set available in quiz mode with review & explanations.</p>
        </section>
      </main>
    </>
  );
}

export async function getServerSideProps({ params, res }) {
  try {
    const id = String(params.id || '');
    const row = await getPaperById(id);
    if (!row) return { notFound: true };
    const questions = Array.isArray(row.questions_json) ? row.questions_json : [];
    const questionsPreview = questions.slice(0, 10);
    const canonical = `${siteUrl}/papers/db/${id}`;
    return { props: { paper: { id: row.id, name: row.name, tenant: row.tenant }, questionsPreview, canonical } };
  } catch (e) {
    return { notFound: true };
  }
}

