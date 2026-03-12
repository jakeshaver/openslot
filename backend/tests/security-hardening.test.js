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

describe('Calendar data leakage — public routes', () => {
  it('GET /api/offers/:offerId returns no calendar metadata', async () => {
    const offer = await store.createOffer({
      ownerEmail: 'owner@example.com',
      windows: [{ start: '2026-03-15T14:00:00Z', end: '2026-03-15T16:00:00Z' }],
      duration: 30,
      tokens: { access_token: 'secret-token', refresh_token: 'secret-refresh' },
    });

    const res = await request(app).get(`/api/offers/${offer.id}`);
    expect(res.status).toBe(200);

    const body = JSON.stringify(res.body);

    // No tokens or credentials
    expect(body).not.toContain('secret-token');
    expect(body).not.toContain('secret-refresh');
    expect(body).not.toContain('access_token');
    expect(body).not.toContain('refresh_token');

    // No calendar metadata fields
    expect(res.body.offer.summary).toBeUndefined();
    expect(res.body.offer.description).toBeUndefined();
    expect(res.body.offer.attendees).toBeUndefined();
    expect(res.body.offer.organizer).toBeUndefined();

    // No owner email in public response
    expect(body).not.toContain('owner@example.com');

    // No bookedBy data in slots
    for (const slot of res.body.offer.slots) {
      expect(slot.bookedBy).toBeUndefined();
      expect(Object.keys(slot)).toEqual(['start', 'end', 'status']);
    }
  });

  it('GET /api/offers/:offerId returns only whitelisted offer fields', async () => {
    const offer = await store.createOffer({
      ownerEmail: 'owner@example.com',
      windows: [{ start: '2026-03-15T14:00:00Z', end: '2026-03-15T16:00:00Z' }],
      duration: 30,
      tokens: { access_token: 'test' },
      timezone: 'America/New_York',
    });

    const res = await request(app).get(`/api/offers/${offer.id}`);
    const allowedFields = ['id', 'duration', 'timezone', 'windows', 'slots', 'expiresAt', 'status'];
    expect(Object.keys(res.body.offer).sort()).toEqual(allowedFields.sort());
  });
});

describe('Error message hardening — public routes', () => {
  it('returns clean not_found error for invalid offer ID', async () => {
    const res = await request(app).get('/api/offers/doesnotexist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Offer not found');

    const body = JSON.stringify(res.body);
    expect(body).not.toContain('stack');
    expect(body).not.toContain('node_modules');
    expect(body).not.toContain('/Users/');
    expect(body).not.toContain('Error:');
  });

  it('returns clean not_found for booking with invalid offer ID', async () => {
    const res = await request(app)
      .post('/api/offers/doesnotexist/book')
      .send({ slotIndex: 0, name: 'Test', email: 'test@test.com' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Offer not found');

    const body = JSON.stringify(res.body);
    expect(body).not.toContain('stack');
    expect(body).not.toContain('node_modules');
  });

  it('booking error responses use only allowed error codes', async () => {
    const offer = await store.createOffer({
      ownerEmail: 'test@example.com',
      windows: [{ start: '2026-03-15T14:00:00Z', end: '2026-03-15T16:00:00Z' }],
      duration: 30,
      tokens: {},
    });
    await store.updateOffer(offer.id, { expiresAt: new Date('2020-01-01').toISOString() });

    const res = await request(app)
      .post(`/api/offers/${offer.id}/book`)
      .send({ slotIndex: 0, name: 'Test', email: 'test@test.com' });

    // Should be one of the allowed error codes
    const allowedCodes = ['conflict', 'offer_stale', 'expired', 'offer_expired', 'not_found', 'slot_claimed', 'slot_conflict', 'auth_expired'];
    if (res.body.code) {
      expect(allowedCodes).toContain(res.body.code);
    }
  });
});
