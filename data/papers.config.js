// /data/papers.config.js
export const MODE_PRESETS = {
  easy:   { perQSec: 45,  label: 'Easy' },
  medium: { perQSec: 60,  label: 'Medium' },
  hard:   { perQSec: 75,  label: 'Hard' },
  custom: { perQSec: null, label: 'Custom' },
};

export const PAPER_DEFAULTS = {
  // set per-paper negatives here; falls back to .default
  'kgmu-2025-set1': { negative: 0.25 },
  'kgmu-2025-set2': { negative: 0.25 },
  default:          { negative: 0.25 },
};

// small helper
export const getNegativeMark = (paperId) =>
  (PAPER_DEFAULTS[paperId]?.negative ?? PAPER_DEFAULTS.default.negative);
