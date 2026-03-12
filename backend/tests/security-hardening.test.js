const request = require('supertest');
const app = require('../src/app');
const store = require('../src/store');

beforeEach(async () => {
  await store.clearAll();
});

describe('Rate limit store functions', () => {
  it('checkRateLimit returns allowed=true when under limit', async () => {
    const result = await store.checkRateLimit('127.0.0.1', 10, 15 * 60 * 1000);
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(1);
  });

  it('checkRateLimit returns allowed=false after 10 attempts', async () => {
    for (let i = 0; i < 10; i++) {
      await store.checkRateLimit('127.0.0.1', 10, 15 * 60 * 1000);
    }
    const result = await store.checkRateLimit('127.0.0.1', 10, 15 * 60 * 1000);
    expect(result.allowed).toBe(false);
    expect(result.count).toBe(10);
  });

  it('checkRateLimit tracks IPs independently', async () => {
    for (let i = 0; i < 10; i++) {
      await store.checkRateLimit('1.1.1.1', 10, 15 * 60 * 1000);
    }
    const result = await store.checkRateLimit('2.2.2.2', 10, 15 * 60 * 1000);
    expect(result.allowed).toBe(true);
  });

  it('checkRateLimit expires old entries outside the window', async () => {
    // Use a tiny window (1ms) so entries expire immediately
    for (let i = 0; i < 10; i++) {
      await store.checkRateLimit('127.0.0.1', 10, 1);
    }
    // Wait a moment for entries to age out
    await new Promise((r) => setTimeout(r, 10));
    const result = await store.checkRateLimit('127.0.0.1', 10, 1);
    expect(result.allowed).toBe(true);
  });
});

describe('Rate limiting on POST /api/offers/:offerId/book', () => {
  let offerId;

  beforeEach(async () => {
    const offer = await store.createOffer({
      ownerEmail: 'test@example.com',
      windows: [{ start: '2026-03-15T14:00:00Z', end: '2026-03-15T16:00:00Z' }],
      duration: 30,
      tokens: { access_token: 'test' },
    });
    offerId = offer.id;
  });

  it('returns 429 after 10 rapid booking attempts from same IP', async () => {
    const body = { slotIndex: 0, name: 'Test', email: 'test@test.com' };

    // First 10 requests should not get 429
    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .post(`/api/offers/${offerId}/book`)
        .send(body);
      expect(res.status).not.toBe(429);
    }

    // 11th request should be rate limited
    const res = await request(app)
      .post(`/api/offers/${offerId}/book`)
      .send(body);
    expect(res.status).toBe(429);
    expect(res.body.error).toBe('Too many requests. Please try again later.');
  });

  it('does not include stack traces or internal details in 429 response', async () => {
    const body = { slotIndex: 0, name: 'Test', email: 'test@test.com' };

    for (let i = 0; i < 10; i++) {
      await request(app).post(`/api/offers/${offerId}/book`).send(body);
    }

    const res = await request(app)
      .post(`/api/offers/${offerId}/book`)
      .send(body);
    expect(res.status).toBe(429);
    const responseText = JSON.stringify(res.body);
    expect(responseText).not.toContain('stack');
    expect(responseText).not.toContain('node_modules');
    expect(responseText).not.toContain('/Users/');
  });
});
