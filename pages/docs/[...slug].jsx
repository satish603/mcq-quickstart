// pages/docs/[...slug].jsx
import fs from 'fs';
import path from 'path';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';

const DOCS_ROOT = path.join(process.cwd(), 'docs');

export async function getServerSideProps(ctx) {
  const slug = ctx.params?.slug || [];
  const safeParts = Array.isArray(slug)
    ? slug.map((s) => String(s).replace(/[^A-Za-z0-9._\-\/]/g, ''))
    : [];
  const rel = safeParts.join('/');
  const absPath = path.join(DOCS_ROOT, rel + (rel.toLowerCase().endsWith('.md') ? '' : '.md'));

  try {
    const resolved = path.resolve(absPath);
    if (!resolved.startsWith(path.resolve(DOCS_ROOT))) throw new Error('Invalid path');
    const md = fs.readFileSync(resolved, 'utf8');
    const title = (md.match(/^#\s+(.+)$/m) || [null, rel])[1];
    return { props: { rel, md, title } };
  } catch (e) {
    return { notFound: true };
  }
}

export default function DocPage({ rel, md, title }) {
  const [html, setHtml] = useState('');
  const [markedReady, setMarkedReady] = useState(false);
  const [mermaidReady, setMermaidReady] = useState(false);

  // Render markdown to HTML using marked (from CDN) and then initialize mermaid blocks
  useEffect(() => {
    const render = () => {
      try {
        if (!markedReady || !window.marked) return;
        const raw = String(md || '');
        const h = window.marked.parse(raw);
        // Convert <pre><code class="language-mermaid"> blocks to <div class="mermaid">
        const container = document.createElement('div');
        container.innerHTML = h;
        container.querySelectorAll('pre > code.language-mermaid').forEach((code) => {
          const pre = code.parentElement;
          const div = document.createElement('div');
          div.className = 'mermaid';
          div.textContent = code.textContent || '';
          pre.replaceWith(div);
        });
        setHtml(container.innerHTML);
        // Wait for content to be in DOM, then run mermaid
        setTimeout(() => {
          try {
            if (mermaidReady && window.mermaid) {
              window.mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });
              if (typeof window.mermaid.run === 'function') {
                window.mermaid.run();
              } else if (typeof window.mermaid.init === 'function') {
                window.mermaid.init(undefined, document.querySelectorAll('.mermaid'));
              }
            }
          } catch {}
        }, 0);
      } catch {}
    };
    render();
  }, [md, markedReady, mermaidReady]);

  const breadcrumb = useMemo(() => {
    const parts = (rel || '').split('/').filter(Boolean);
    const acc = [];
    return parts.map((p, i) => {
      acc.push(p);
      return { label: p.replace(/\.md$/i, ''), href: '/docs/' + acc.join('/') };
    });
  }, [rel]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js" strategy="afterInteractive" onLoad={() => setMarkedReady(true)} />
      <Script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js" strategy="afterInteractive" onLoad={() => setMermaidReady(true)} />

      <div className="mb-4 text-sm text-gray-600">
        <Link href="/docs" className="text-indigo-600 hover:underline">Docs</Link>
        {breadcrumb.map((b, i) => (
          <span key={i}>
            {' '}›{' '}
            <Link href={b.href} className="text-indigo-600 hover:underline">{b.label}</Link>
          </span>
        ))}
      </div>

      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <article className="prose prose-indigo max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: html || '<p>Loading…</p>' }} />
    </main>
  );
}
