// next-seo.config.js
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kgmu-sgpgi-nursing.vercel.app/';

export default {
  titleTemplate: '%s | Nursing Officer Practice (KGMU · SGPGI)',
  defaultTitle: 'KGMU & SGPGI Nursing Officer Questions: Free Practice',
  description:
    'Practice KGMU and SGPGI Nursing Officer questions with explanations. Previous year papers, topic tags, review mode, and smart features like peek without negative marking.',
  canonical: siteUrl,
  openGraph: {
    type: 'website',
    url: siteUrl,
    site_name: 'Nursing Officer Practice',
  },
  additionalMetaTags: [
    { name: 'keywords', content: 'KGMU nursing officer, SGPGI nursing officer, staff nurse previous year paper, nursing officer questions, KGMU SGPGI MCQ' },
  ],
};
