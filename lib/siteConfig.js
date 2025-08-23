export const TENANT = process.env.NEXT_PUBLIC_TENANT || 'nursing';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com').replace(/\/+$/, '');
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || (TENANT === 'it' ? 'TechDrill' : 'Nursing Officer Practice');
export const TAGLINE = process.env.NEXT_PUBLIC_TAGLINE || (TENANT === 'it' ? 'IT interview MCQs — DSA, SQL, OS, DBMS' : 'KGMU · SGPGI — question index & quizzes');
export const PRIMARY_KEYWORDS = process.env.NEXT_PUBLIC_PRIMARY_KEYWORDS || (TENANT === 'it'
  ? 'IT interview questions, DSA MCQ, SQL questions, coding interview prep'
  : 'KGMU nursing officer, SGPGI staff nurse, nursing officer questions, previous papers, MCQ');
export const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';
export const GSC_VERIFICATION = process.env.NEXT_PUBLIC_GSC_VERIFICATION || '';
