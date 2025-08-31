const apiGet = require('../pages/api/get-scores');
const handler = apiGet.default || apiGet;

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

describe('GET /api/get-scores', () => {
  test('returns filtered rows', async () => {
    const req = { method: 'GET', query: { userId: 'u1' } };
    const res = mockRes();
    const fs = require('fs');
    const fsp = require('fs/promises');
    (fs.promises.readFile || fsp.readFile).mockResolvedValue(
      JSON.stringify([
        { userId: 'u1', paper: 'p1', score: 10, timestamp: 1 },
        { userId: 'u2', paper: 'p2', score: 20, timestamp: 2 },
      ])
    );
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([
      { userId: 'u1', paper: 'p1', score: 10, timestamp: 1 },
    ]);
  });

  test('handles missing file gracefully', async () => {
    const req = { method: 'GET', query: { userId: 'u1' } };
    const res = mockRes();
    const fs = require('fs');
    const fsp = require('fs/promises');
    const err = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    (fs.promises.readFile || fsp.readFile).mockRejectedValue(err);
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });
});
