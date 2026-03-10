const request = require('supertest');
const app = require('../src/app');

describe('Calendar Routes', () => {
  describe('GET /api/calendar/events', () => {
    it('returns 401 if not authenticated', async () => {
      const res = await request(app).get('/api/calendar/events');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Not authenticated');
    });
  });
});

describe('Health Check', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
