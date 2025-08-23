const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com').replace(/\/+$/, '');
const tenant = process.env.NEXT_PUBLIC_TENANT || 'nursing';

module.exports = {
  siteUrl,
  generateRobotsTxt: true,
  exclude: ['/quiz', '/api/*', '/404', '/500'],
  changefreq: 'weekly',
  priority: 0.7,
  additionalPaths: async () => {
    const { paperList } = require('./data/paperList');
    const extra = [];

    if (tenant === 'nursing') {
      extra.push({ loc: '/papers', priority: 0.9 });
      extra.push({ loc: '/kgmu-sgpgi-nursing-officer-questions', priority: 0.9 });
    } else {
      extra.push({ loc: '/it-interview-questions', priority: 0.9 });
      // add /companies or /it-topics if you build them
    }

    paperList.forEach((p) => extra.push({ loc: `/papers/${p.id}`, priority: 0.9 }));
    return extra;
  },
};
