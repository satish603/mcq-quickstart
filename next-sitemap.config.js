// next-sitemap.config.js
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kgmu-sgpgi-nursing.vercel.app';

module.exports = {
  siteUrl,
  generateRobotsTxt: true,
  changefreq: 'weekly',
  priority: 0.7,
  exclude: ['/quiz', '/api/*', '/404', '/500'], // optional extra excludes
  transform: async (config, path) => {
    return {
      loc: path,
      changefreq: path === '/' ? 'weekly' : 'monthly',
      priority: path === '/' ? 1.0 : 0.8,
      lastmod: new Date().toISOString(),
      alternateRefs: [],
    };
  },
  additionalPaths: async (config) => {
    const { paperList } = require('./data/paperList');
    const extra = [
      { loc: '/kgmu-sgpgi-nursing-officer-questions', priority: 0.9 },
      // If you have a /papers index page, include it too:
      // { loc: '/papers', priority: 0.9 },
    ];
    paperList.forEach((p) => extra.push({ loc: `/papers/${p.id}`, priority: 0.9 }));
    return extra;
  },
};
