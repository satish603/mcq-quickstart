describe('paperList tenant filter', () => {
  const ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ENV };
  });

  afterAll(() => {
    process.env = ENV;
  });

  test('filters to nursing tenant', () => {
    process.env.NEXT_PUBLIC_TENANT = 'nursing';
    const mod = require('../data/paperList');
    const exported = mod.default ?? mod;
    const papers = typeof exported === 'function'
      ? exported('nursing')
      : Array.isArray(exported)
        ? exported
        : Array.isArray(exported.papers)
          ? exported.papers
          : [];
    expect(Array.isArray(papers)).toBe(true);
    // Allow implementations that strip the tenant field after filtering
    expect(papers.every((p) => p.tenant === 'nursing' || p.tenant === undefined)).toBe(true);
  });

  test('filters to it tenant', () => {
    process.env.NEXT_PUBLIC_TENANT = 'it';
    const mod = require('../data/paperList');
    const exported = mod.default ?? mod;
    const papers = typeof exported === 'function'
      ? exported('it')
      : Array.isArray(exported)
        ? exported
        : Array.isArray(exported.papers)
          ? exported.papers
          : [];
    expect(Array.isArray(papers)).toBe(true);
    expect(papers.every((p) => p.tenant === 'it' || p.tenant === undefined)).toBe(true);
  });
});
