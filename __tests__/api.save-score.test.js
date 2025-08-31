const apiSave = require('../pages/api/save-score');
const handler = apiSave.default || apiSave;

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
}));
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

describe('POST /api/save-score', () => {
  test('appends a row and returns 200', async () => {
    const req = {
      method: 'POST',
      body: { userId: 'u1', paper: 'p1', score: 50, timestamp: 123 },
    };
    const res = mockRes();
    const fs = require('fs');
    const fsp = require('fs/promises');
    (fs.promises.readFile || fsp.readFile).mockResolvedValue('[]');
    (fs.promises.writeFile || fsp.writeFile).mockResolvedValue();
    await handler(req, res);
    expect(fs.promises.writeFile).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('rejects non-POST', async () => {
    const req = { method: 'GET', body: {} };
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(expect.any(Number));
  });
});
