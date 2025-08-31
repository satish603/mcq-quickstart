describe('siteConfig', () => {
  const ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ENV };
  });

  afterAll(() => {
    process.env = ENV;
  });

  test('uses env vars when provided', () => {
    process.env.NEXT_PUBLIC_TENANT = 'nursing';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
    process.env.NEXT_PUBLIC_SITE_NAME = 'My Site';
    process.env.NEXT_PUBLIC_TAGLINE = 'Tag';
    process.env.NEXT_PUBLIC_PRIMARY_KEYWORDS = 'a,b,c';
    const mod = require('../lib/siteConfig');
    let site = mod.default ?? mod.site ?? mod;
    if (typeof site === 'function') site = site();
    expect(site.tenant).toBe('nursing');
    expect(site.siteUrl).toBe('https://example.com');
    expect(site.siteName).toBe('My Site');
    expect(site.tagline).toBe('Tag');
    expect(site.primaryKeywords).toBe('a,b,c');
  });

  test('has sensible defaults', () => {
    delete process.env.NEXT_PUBLIC_TENANT;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const mod = require('../lib/siteConfig');
    let site = mod.default ?? mod.site ?? mod;
    if (typeof site === 'function') site = site();
    expect(['nursing', 'it']).toContain(site.tenant);
    expect(typeof site.siteUrl).toBe('string');
  });
});
