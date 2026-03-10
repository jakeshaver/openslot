const request = require('supertest');
const app = require('../src/app');

describe('Auth Routes', () => {
  describe('GET /auth/google', () => {
    it('redirects to Google OAuth consent screen', async () => {
      const res = await request(app).get('/auth/google');
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('accounts.google.com');
      expect(res.headers.location).toContain('calendar');
    });
  });

  describe('GET /auth/callback', () => {
    it('returns 400 if no code provided', async () => {
      const res = await request(app).get('/auth/callback');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing authorization code');
    });
  });

  describe('GET /auth/me', () => {
    it('returns 401 if not authenticated', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('clears the session', async () => {
      const res = await request(app).post('/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });
});
