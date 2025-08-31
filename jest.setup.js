import '@testing-library/jest-dom';

// Mock next/router to avoid crashes in components during tests
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(null),
      events: { on: jest.fn(), off: jest.fn() },
      isFallback: false,
    };
  },
}));

afterEach(() => {
  jest.restoreAllMocks();
  jest.resetModules();
});

