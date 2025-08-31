const fs = require('fs');
const path = require('path');

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function isInt(n) {
  return Number.isInteger(n);
}

function validateQuestionShape(q) {
  expect(typeof q).toBe('object');
  expect(q).not.toBeNull();

  expect(q).toHaveProperty('id');
  expect(isInt(q.id)).toBe(true);

  expect(typeof q.text).toBe('string');
  expect(q.text.trim().length).toBeGreaterThan(0);

  expect(Array.isArray(q.options)).toBe(true);
  expect(q.options.length).toBeGreaterThanOrEqual(2);
  expect(q.options.every((o) => typeof o === 'string')).toBe(true);

  expect(isInt(q.answerIndex)).toBe(true);
  expect(q.answerIndex).toBeGreaterThanOrEqual(0);
  expect(q.answerIndex).toBeLessThan(q.options.length);

  if ('explanation' in q && q.explanation != null) {
    expect(typeof q.explanation).toBe('string');
  }
  if ('tags' in q && q.tags != null) {
    expect(Array.isArray(q.tags)).toBe(true);
    expect(q.tags.every((t) => typeof t === 'string')).toBe(true);
  }
}

describe('Question JSONs', () => {
  const questionsDir = path.join(process.cwd(), 'public', 'questions');

  it('exists', () => {
    expect(fs.existsSync(questionsDir)).toBe(true);
  });

  const files = fs.existsSync(questionsDir)
    ? walk(questionsDir).filter((f) => f.toLowerCase().endsWith('.json'))
    : [];

  if (files.length === 0) {
    it('has at least one JSON file', () => {
      expect(files.length).toBeGreaterThan(0);
    });
  } else {
    describe.each(files.map((f) => [path.relative(process.cwd(), f)]))(
      'validate %s',
      (rel) => {
        const abs = path.join(process.cwd(), rel);
        it('parses and matches supported shape', () => {
          const raw = fs.readFileSync(abs, 'utf8');
          const data = JSON.parse(raw);
          const arr = Array.isArray(data) ? data : data.questions;
          expect(Array.isArray(arr)).toBe(true);
          expect(arr.length).toBeGreaterThan(0);
          const ids = new Set();
          for (const q of arr) {
            validateQuestionShape(q);
            if (isInt(q.id)) {
              const key = q.id;
              expect(ids.has(key)).toBe(false);
              ids.add(key);
            }
          }
        });
      }
    );
  }
});

