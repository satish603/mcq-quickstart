// /data/paperList.js
import { TENANT } from '../lib/siteConfig';

// Keep one master list with a tenant tag per paper
const ALL_PAPERS = [
  // --- Nursing ---
  {
    tenant: 'nursing',
    id: 'nursing_officer_sample_questions',
    name: 'Nursing Officer Sample Questions',
    file: '/questions/nursing_officer_sample_questions_full.json',
  },
  {
    tenant: 'nursing',
    id: 'kgmu-2025-set1',
    name: 'KGMU Staff Nurse 2025 – Set 1',
    file: '/questions/kgmu-staff-nurse-2025-set1.json',
  },
  {
    tenant: 'nursing',
    id: 'kgmu-2025-set2',
    name: 'KGMU Staff Nurse 2025 – Biology',
    file: '/questions/kgmu-staff-nurse-2025-biology.json',
  },

  // --- IT ---
  {
    tenant: 'it',
    id: 'snowflake',
    name: 'Snowflake Interview Questions',
    file: '/questions/snowflake.json',
  },
  {
    tenant: 'it',
    id: 'java',
    name: 'Java Interview Questions',
    file: '/questions/java.json',
  },
  {
    tenant: 'it',
    id: 'adf',
    name: 'Azure Data Factory Questions',
    file: '/questions/adf.json',
  },
  {
    tenant: 'it',
    id: 'data_engineer',
    name: 'Data Engineer Interview Questions',
    file: '/questions/data_engineer.json',
  },
  {
    tenant: 'it',
    id: 'python',
    name: 'Python Interview Questions',
    file: '/questions/python.json',
  },
];

// Export only the papers for the active tenant
export const paperList = ALL_PAPERS.filter(p => p.tenant === TENANT);
