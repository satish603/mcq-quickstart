// /data/paperList.js
import { TENANT } from '../lib/siteConfig';

// Keep one master list with a tenant tag per paper
const ALL_PAPERS = [
  // --- Nursing ---
  {
    tenant: 'nursing',
    id: 'RML_BIO',
    name: 'RML PREVIOUS Year Questions',
    file: '/questions/Medical/kgmu/RML_bio.json',
  },
  {
    tenant: 'nursing',
    id: 'nursing_officer_sample_questions',
    name: 'Nursing Officer Sample Questions',
    file: '/questions/Medical/kgmu/nursing_officer_sample_questions_full.json',
  },
  {
    tenant: 'nursing',
    id: 'kgmu-2025-set1',
    name: 'KGMU Staff Nurse 2025 – Set 1',
    file: '/questions/Medical/kgmu/kgmu-staff-nurse-2025-set1.json',
  },
  {
    tenant: 'nursing',
    id: 'kgmu-2025-set2',
    name: 'KGMU Staff Nurse 2025 – Biology',
    file: '/questions/Medical/kgmu/kgmu-staff-nurse-2025-biology.json',
  },
  {
  tenant: 'nursing',
  id: 'nursing-reasoning',
  name: 'Nursing Officer – Reasoning',
  file: '/questions/Medical/kgmu/nursing_section_reasoning.json',
  },
  {
    tenant: 'nursing',
    id: 'nursing-quant',
    name: 'Nursing Officer – Quant & Aptitude',
    file: '/questions/Medical/kgmu/nursing_section_quant.json',
  },
  {
    tenant: 'nursing',
    id: 'nursing-english',
    name: 'Nursing Officer – English',
    file: '/questions/Medical/kgmu/nursing_section_english.json',
  },
  {
    tenant: 'nursing',
    id: 'nursing-gk',
    name: 'Nursing Officer – General Awareness',
    file: '/questions/Medical/kgmu/nursing_section_general-awareness.json',
  },
  {
    tenant: 'nursing',
    id: 'nursing-clinical',
    name: 'Nursing Officer – Clinical Core',
    file: '/questions/Medical/kgmu/nursing_section_clinical-nursing.json',
  },

  // --- IT ---
  {
    tenant: 'it',
    id: 'snowflake',
    name: 'Snowflake Interview Questions',
    file: '/questions/IT/data/snowflake.json',
  },
  {
    tenant: 'it',
    id: 'java',
    name: 'Java Interview Questions',
    file: '/questions/IT/programming/java.json',
  },
  {
    tenant: 'it',
    id: 'adf',
    name: 'Azure Data Factory Questions',
    file: '/questions/IT/data/adf.json',
  },
  {
    tenant: 'it',
    id: 'data_engineer',
    name: 'Data Engineer Interview Questions',
    file: '/questions/IT/data/data_engineer.json',
  },
  {
    tenant: 'it',
    id: 'python',
    name: 'Python Interview Questions',
    file: '/questions/IT/programming/python.json',
  },
];

// Export only the papers for the active tenant
export const paperList = ALL_PAPERS.filter(p => p.tenant === TENANT);
