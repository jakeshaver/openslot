const request = require('supertest');
const express = require('express');
const store = require('../src/store');

// Build a test app with auth pre-injected (no cookie-session needed)
const offersRoutes = require('../src/routes/offers');
const settingsRoutes = require('../src/routes/settings');

function createTestApp(userEmail = 'owner@test.com') {
  const app = express();
  app.use(express.json());
  // Inject fake session on every request
  app.use((req, res, next) => {
    req.session = {
      tokens: { access_token: 'test' },
      user: { email: userEmail, name: 'Owner' },
    };
    next();
  });
  app.use('/api/offers', offersRoutes);
  app.use('/api/settings', settingsRoutes);
  return app;
}

const testApp = createTestApp();

function futureDate(hoursAhead) {
  const d = new Date();
  d.setHours(d.getHours() + hoursAhead);
  return d.toISOString();
}

beforeEach(async () => {
  await store.clearAll();
});

describe('GET /api/offers (dashboard)', () => {
  test('returns only offers for the current owner', async () => {
    await store.createOffer({
      ownerEmail: 'owner@test.com',
      windows: [{ start: futureDate(1), end: futureDate(3) }],
      duration: 30,
      tokens: { access_token: 'test' },
      timezone: 'America/New_York',
    });
    await store.createOffer({
      ownerEmail: 'other@test.com',
      windows: [{ start: futureDate(1), end: futureDate(3) }],
      duration: 30,
      tokens: { access_token: 'test' },
      timezone: 'America/New_York',
    });

    const res = await request(testApp).get('/api/offers');
    expect(res.status).toBe(200);
    expect(res.body.offers).toHaveLength(1);
    expect(res.body.offers[0].ownerEmail).toBe('owner@test.com');
  });

  test('returns offers sorted by createdAt descending', async () => {
    const offer1 = await store.createOffer({
      ownerEmail: 'owner@test.com',
      windows: [{ start: futureDate(1), end: futureDate(2) }],
      duration: 30,
      tokens: { access_token: 'test' },
      timezone: 'America/New_York',
    });
    await new Promise(r => setTimeout(r, 10));
    const offer2 = await store.createOffer({
      ownerEmail: 'owner@test.com',
      windows: [{ start: futureDate(3), end: futureDate(4) }],
      duration: 30,
      tokens: { access_token: 'test' },
      timezone: 'America/New_York',
    });

    const res = await request(testApp).get('/api/offers');
    expect(res.body.offers[0].id).toBe(offer2.id);
    expect(res.body.offers[1].id).toBe(offer1.id);
  });

  test('returns 401 without auth', async () => {
    // Use the real app which requires actual session
    const app = require('../src/app');
    const res = await request(app).get('/api/offers');
    expect(res.status).toBe(401);
  });

  test('does not expose tokens in response', async () => {
    await store.createOffer({
      ownerEmail: 'owner@test.com',
      windows: [{ start: futureDate(1), end: futureDate(3) }],
      duration: 30,
      tokens: { access_token: 'secret-token' },
      timezone: 'America/New_York',
    });

    const res = await request(testApp).get('/api/offers');
    expect(res.body.offers[0].tokens).toBeUndefined();
  });
});

describe('PATCH /api/offers/:offerId/expiry', () => {
  test('extends expiry by specified days', async () => {
    const offer = await store.createOffer({
      ownerEmail: 'owner@test.com',
      windows: [{ start: futureDate(1), end: futureDate(3) }],
      duration: 30,
      tokens: { access_token: 'test' },
      timezone: 'America/New_York',
    });

    // Capture original expiry before mutation
    const originalExpiresAt = offer.expiresAt;

    const res = await request(testApp)
      .patch(`/api/offers/${offer.id}/expiry`)
      .send({ extendDays: 7 });

    expect(res.status).toBe(200);
    const originalExpiry = new Date(originalExpiresAt);
    const newExpiry = new Date(res.body.expiresAt);
    const diffDays = Math.round((newExpiry - originalExpiry) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(7);
  });

  test('rejects if offer belongs to another owner', async () => {
    const offer = await store.createOffer({
      ownerEmail: 'other@test.com',
      windows: [{ start: futureDate(1), end: futureDate(3) }],
      duration: 30,
      tokens: { access_token: 'test' },
      timezone: 'America/New_York',
    });

    const res = await request(testApp)
      .patch(`/api/offers/${offer.id}/expiry`)
      .send({ extendDays: 7 });

    expect(res.status).toBe(403);
  });

  test('rejects invalid extendDays', async () => {
    const offer = await store.createOffer({
      ownerEmail: 'owner@test.com',
      windows: [{ start: futureDate(1), end: futureDate(3) }],
      duration: 30,
      tokens: { access_token: 'test' },
      timezone: 'America/New_York',
    });

    const res = await request(testApp)
      .patch(`/api/offers/${offer.id}/expiry`)
      .send({ extendDays: 0 });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/offers/:offerId/revoke', () => {
  test('sets offer status to expired', async () => {
    const offer = await store.createOffer({
      ownerEmail: 'owner@test.com',
      windows: [{ start: futureDate(1), end: futureDate(3) }],
      duration: 30,
      tokens: { access_token: 'test' },
      timezone: 'America/New_York',
    });

    const res = await request(testApp)
      .post(`/api/offers/${offer.id}/revoke`);

    expect(res.status).toBe(200);
    const updated = await store.getOffer(offer.id);
    expect(updated.status).toBe('expired');
  });

  test('rejects if offer belongs to another owner', async () => {
    const offer = await store.createOffer({
      ownerEmail: 'other@test.com',
      windows: [{ start: futureDate(1), end: futureDate(3) }],
      duration: 30,
      tokens: { access_token: 'test' },
      timezone: 'America/New_York',
    });

    const res = await request(testApp)
      .post(`/api/offers/${offer.id}/revoke`);

    expect(res.status).toBe(403);
  });
});

describe('Offer label', () => {
  test('label is saved when provided on offer creation', async () => {
    const offer = await store.createOffer({
      ownerEmail: 'owner@test.com',
      windows: [{ start: futureDate(1), end: futureDate(3) }],
      duration: 30,
      tokens: { access_token: 'test' },
      timezone: 'America/New_York',
      label: 'Goldman recruiter',
    });

    const fetched = await store.getOffer(offer.id);
    expect(fetched.label).toBe('Goldman recruiter');
  });

  test('label is null when not provided', async () => {
    const offer = await store.createOffer({
      ownerEmail: 'owner@test.com',
      windows: [{ start: futureDate(1), end: futureDate(3) }],
      duration: 30,
      tokens: { access_token: 'test' },
      timezone: 'America/New_York',
    });

    const fetched = await store.getOffer(offer.id);
    expect(fetched.label).toBeNull();
  });
});

describe('Offer expiry setting', () => {
  test('offerExpiryDays is saved in settings', async () => {
    const res = await request(testApp)
      .put('/api/settings')
      .send({ offerExpiryDays: 14 });

    expect(res.status).toBe(200);

    const getRes = await request(testApp).get('/api/settings');
    expect(getRes.body.settings.offerExpiryDays).toBe(14);
  });
});
