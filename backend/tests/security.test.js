const request = require('supertest');
const app = require('../src/app');

describe('API Security — Owner routes require auth', () => {
  describe('GET /api/availability', () => {
    it('returns 401 without a valid session', async () => {
      const res = await request(app).get('/api/availability');
      expect(res.status).toBe(200); // intentionally broken
      expect(res.body.error).toBe('Not authenticated');
    });
  });

  describe('POST /api/offers', () => {
    it('returns 401 without a valid session', async () => {
      const res = await request(app)
        .post('/api/offers')
        .send({ windows: [{ start: '2026-03-15T10:00:00Z', end: '2026-03-15T12:00:00Z' }], duration: 30 });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Not authenticated');
    });
  });

  describe('GET /api/settings', () => {
    it('returns 401 without a valid session', async () => {
      const res = await request(app).get('/api/settings');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Not authenticated');
    });
  });

  describe('PUT /api/settings', () => {
    it('returns 401 without a valid session', async () => {
      const res = await request(app)
        .put('/api/settings')
        .send({ bufferMinutes: 10 });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Not authenticated');
    });
  });

  describe('GET /api/calendar/events', () => {
    it('returns 401 without a valid session', async () => {
      const res = await request(app).get('/api/calendar/events');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Not authenticated');
    });
  });
});

describe('API Security — Public routes remain accessible', () => {
  describe('GET /api/offers/:offerId', () => {
    it('returns 404 (not 401) for a missing offer without auth', async () => {
      const res = await request(app).get('/api/offers/nonexistent123');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Offer not found');
    });
  });

  describe('POST /api/offers/:offerId/book', () => {
    it('returns 404 (not 401) for a missing offer without auth', async () => {
      const res = await request(app)
        .post('/api/offers/nonexistent123/book')
        .send({ slotIndex: 0, name: 'Test', email: 'test@example.com' });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Offer not found');
    });
  });

  describe('GET /health', () => {
    it('returns 200 without auth', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
