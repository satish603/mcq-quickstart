import Head from 'next/head';
import { NextSeo } from 'next-seo';
import { paperList } from '../data/paperList';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kgmu-sgpgi-nursing.vercel.app/';
const canonical = `${siteUrl}/kgmu-sgpgi-nursing-officer-questions`;

export default function KGMU_SGPGI_Landing() {
  const title = 'KGMU & SGPGI Nursing Officer Questions (Free Practice & Previous Papers)';
  const desc =
    'Practice KGMU and SGPGI Nursing Officer (Staff Nurse) MCQs with answers and explanations. Browse previous year papers, attempt timed quizzes, and review solutions.';

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How can I practice KGMU Nursing Officer questions?',
        acceptedAnswer: { '@type': 'Answer', text: 'Open any paper set and click Start Quiz. Use Peek to reveal answers without negative marking.' }
      },
      {
        '@type': 'Question',
        name: 'Do SGPGI Staff Nurse papers have explanations?',
        acceptedAnswer: { '@type': 'Answer', text: 'Yes. Review mode shows the correct answer and explanation for every question.' }
      },
      {
        '@type': 'Question',
        name: 'Is negative marking applied after peeking?',
        acceptedAnswer: { '@type': 'Answer', text: 'No. Peeked questions count toward total marks but do not incur negative marking.' }
      }
    ],
  };

  return (
    <>
      <NextSeo title={title} description={desc} canonical={canonical}
        openGraph={{ url: canonical, title, description: desc }} />
      <Head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      </Head>

      <main className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{title}</h1>
        <p className="mt-2 text-gray-700 dark:text-gray-300">{desc}</p>

        <section className="mt-6">
          <h2 className="text-lg font-bold">Available Paper Sets</h2>
          <ul className="mt-3 grid sm:grid-cols-2 gap-3">
            {paperList.map((p) => (
              <li key={p.id} className="rounded-xl border p-4 dark:border-gray-800">
                <div className="font-semibold">{p.name}</div>
                <div className="mt-2 flex gap-2">
                  <a className="text-indigo-600 hover:underline" href={`/papers/${p.id}`}>View details</a>
                  <a className="text-indigo-600 hover:underline" href={`/quiz?paper=${p.id}&time=30&userId=guest`}>Start quiz</a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
