describe('getNegativeMark', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('returns a number for unknown paper (defaults to 0 if unset)', () => {
    const mod = require('../data/papers.config');
    const getNegativeMark = mod.getNegativeMark || mod.default?.getNegativeMark || mod.default || mod;
    expect(typeof getNegativeMark).toBe('function');
    const val = getNegativeMark('unknown-paper-id');
    expect(typeof val).toBe('number');
    expect(val).toBeGreaterThanOrEqual(0);
  });
});
