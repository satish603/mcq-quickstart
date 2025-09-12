// pages/docs/index.jsx
import fs from 'fs';
import path from 'path';
import Link from 'next/link';

const DOCS_ROOT = path.join(process.cwd(), 'docs');

function walk(dir, base = '') {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const rel = path.join(base, e.name);
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...walk(abs, rel));
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
      out.push({ rel, abs });
    }
  }
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

export async function getStaticProps() {
  let files = [];
  try {
    if (fs.existsSync(DOCS_ROOT)) files = walk(DOCS_ROOT);
  } catch {}

  const items = files.map(({ rel, abs }) => {
    let title = rel.replace(/\\/g, '/');
    try {
      const src = fs.readFileSync(abs, 'utf8');
      const m = src.match(/^#\s+(.+)$/m);
      if (m) title = m[1].trim();
    } catch {}
    const href = '/docs/' + rel.replace(/\\/g, '/').replace(/\.md$/i, '');
    return { title, href, rel: rel.replace(/\\/g, '/') };
  });

  return { props: { items } };
}

export default function DocsIndex({ items }) {
  const groups = items.reduce((acc, it) => {
    const parts = it.rel.split('/');
    const group = parts.length > 1 ? parts[0] : 'docs';
    (acc[group] ||= []).push(it);
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Documentation</h1>
      <p className="text-sm text-gray-600 mb-6">Local Markdown docs rendered in-app. Click a page to view.</p>
      {Object.entries(groups).map(([group, list]) => (
        <section key={group} className="mb-6">
          <h2 className="text-lg font-semibold mb-2">{group}</h2>
          <ul className="space-y-1 list-disc ml-6">
            {list.map((it) => (
              <li key={it.href}>
                <Link href={it.href} className="text-indigo-600 hover:underline">{it.title}</Link>
                <span className="ml-2 text-xs text-gray-400">({it.rel})</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {(!items || items.length === 0) && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">No docs found under <code>docs/</code>.</div>
      )}
    </main>
  );
}

