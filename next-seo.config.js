import { SITE_URL, SITE_NAME, PRIMARY_KEYWORDS, TENANT } from './lib/siteConfig';

const copy = TENANT === 'it'
  ? {
      title: 'IT Interview MCQs (DSA, SQL, OS, DBMS): Free Practice',
      description: 'Practice IT interview MCQs with answers & explanations. Topic-wise sets (DSA, SQL, OS, DBMS) and review mode.',
    }
  : {
      title: 'KGMU & SGPGI Nursing Officer Questions: Free Practice',
      description: 'Practice Nursing Officer MCQs with explanations. KGMU & SGPGI previous papers, review mode, map & search, peek without negative marks.',
    };

export default {
  titleTemplate: `%s | ${SITE_NAME}`,
  defaultTitle: copy.title,
  description: copy.description,
  canonical: SITE_URL,
  openGraph: { type: 'website', url: SITE_URL, site_name: SITE_NAME },
  additionalMetaTags: [
    { name: 'keywords', content: PRIMARY_KEYWORDS },
  ],
};
