// pages/sitemap-db.xml.js
import { listPapers, isDbConfigured } from '../lib/papersDb';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com').replace(/\/+$/, '');

export async function getServerSideProps({ res, query }) {
  try {
    const rows = isDbConfigured() ? await listPapers({ tenant: query?.tenant }) : [];
    const urls = rows.map((r) => {
      const loc = `${siteUrl}/papers/db/${r.id}`;
      const lastmod = new Date(r.created_at || Date.now()).toISOString();
      return `<url><loc>${loc}</loc><changefreq>weekly</changefreq><priority>0.9</priority><lastmod>${lastmod}</lastmod></url>`;
    });
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
    res.setHeader('Content-Type', 'text/xml');
    res.write(xml);
    res.end();
  } catch (e) {
    res.setHeader('Content-Type', 'text/xml');
    res.write('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
    res.end();
  }
  return { props: {} };
}

export default function SiteMap() { return null; }

