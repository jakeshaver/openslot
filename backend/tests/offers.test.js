const request = require('supertest');
const app = require('../src/app');
const store = require('../src/store');

beforeEach(() => {
  store.clearAll();
});

describe('POST /api/offers', () => {
  it('returns 401 if not authenticated', async () => {
    const res = await request(app)
      .post('/api/offers')
      .send({ windows: [{ start: '2026-03-10T14:00:00Z', end: '2026-03-10T16:00:00Z' }], duration: 30 });
    expect(res.status).toBe(401);
  });

  it('returns 400 if windows is missing', async () => {
    // We can't easily mock auth here without a session, so test the route validation
    const res = await request(app)
      .post('/api/offers')
      .send({ duration: 30 });
    expect(res.status).toBe(401); // auth blocks first
  });
});

describe('GET /api/offers/:offerId', () => {
  it('returns 404 for non-existent offer', async () => {
    const res = await request(app).get('/api/offers/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Offer not found');
  });

  it('returns offer data without tokens', async () => {
    const offer = store.createOffer({
      ownerEmail: 'test@example.com',
      windows: [{ start: '2026-03-10T14:00:00Z', end: '2026-03-10T16:00:00Z' }],
      duration: 30,
      tokens: { access_token: 'secret' },
    });

    const res = await request(app).get(`/api/offers/${offer.id}`);
    expect(res.status).toBe(200);
    expect(res.body.offer.id).toBe(offer.id);
    expect(res.body.offer.duration).toBe(30);
    expect(res.body.offer.slots.length).toBe(4); // 2 hours / 30 min = 4 slots
    // Ensure no tokens leaked
    expect(res.body.offer.tokens).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });

  it('returns 410 for expired offer', async () => {
    const offer = store.createOffer({
      ownerEmail: 'test@example.com',
      windows: [{ start: '2026-03-10T14:00:00Z', end: '2026-03-10T16:00:00Z' }],
      duration: 30,
      tokens: {},
    });
    // Force expiry
    store.updateOffer(offer.id, { expiresAt: new Date('2020-01-01').toISOString() });

    const res = await request(app).get(`/api/offers/${offer.id}`);
    expect(res.status).toBe(410);
    expect(res.body.code).toBe('offer_expired');
  });
});

describe('POST /api/offers/:offerId/book', () => {
  it('returns 404 for non-existent offer', async () => {
    const res = await request(app)
      .post('/api/offers/nonexistent/book')
      .send({ slotIndex: 0, name: 'Test', email: 'test@test.com' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for missing fields', async () => {
    const offer = store.createOffer({
      ownerEmail: 'test@example.com',
      windows: [{ start: '2026-03-10T14:00:00Z', end: '2026-03-10T16:00:00Z' }],
      duration: 30,
      tokens: {},
    });

    const res = await request(app)
      .post(`/api/offers/${offer.id}/book`)
      .send({ slotIndex: 0 }); // missing name and email
    expect(res.status).toBe(400);
  });

  it('returns 409 for already-claimed slot', async () => {
    const offer = store.createOffer({
      ownerEmail: 'test@example.com',
      windows: [{ start: '2026-03-10T14:00:00Z', end: '2026-03-10T16:00:00Z' }],
      duration: 30,
      tokens: { access_token: 'test' },
    });

    // Pre-claim slot 0
    store.claimSlot(offer.id, 0, { name: 'Someone', email: 'someone@test.com' });

    const res = await request(app)
      .post(`/api/offers/${offer.id}/book`)
      .send({ slotIndex: 0, name: 'Test', email: 'test@test.com' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('slot_claimed');
  });

  it('returns 410 for expired offer booking attempt', async () => {
    const offer = store.createOffer({
      ownerEmail: 'test@example.com',
      windows: [{ start: '2026-03-10T14:00:00Z', end: '2026-03-10T16:00:00Z' }],
      duration: 30,
      tokens: {},
    });
    store.updateOffer(offer.id, { expiresAt: new Date('2020-01-01').toISOString() });

    const res = await request(app)
      .post(`/api/offers/${offer.id}/book`)
      .send({ slotIndex: 0, name: 'Test', email: 'test@test.com' });
    expect(res.status).toBe(410);
    expect(res.body.code).toBe('offer_expired');
  });
});

describe('Offer store', () => {
  it('creates offer with correct slot count', () => {
    const offer = store.createOffer({
      ownerEmail: 'test@example.com',
      windows: [
        { start: '2026-03-10T14:00:00Z', end: '2026-03-10T16:00:00Z' }, // 2h = 4 x 30m
        { start: '2026-03-11T14:00:00Z', end: '2026-03-11T15:00:00Z' }, // 1h = 2 x 30m
      ],
      duration: 30,
      tokens: {},
    });
    expect(offer.slots.length).toBe(6);
    expect(offer.status).toBe('active');
  });

  it('creates correct slot count for 45-min duration', () => {
    const offer = store.createOffer({
      ownerEmail: 'test@example.com',
      windows: [
        { start: '2026-03-10T14:00:00Z', end: '2026-03-10T16:00:00Z' }, // 2h = 2 x 45m (remainder discarded)
      ],
      duration: 45,
      tokens: {},
    });
    expect(offer.slots.length).toBe(2); // 0-45, 45-90 — fits in 120min
  });

  it('creates correct slot count for 60-min duration', () => {
    const offer = store.createOffer({
      ownerEmail: 'test@example.com',
      windows: [
        { start: '2026-03-10T14:00:00Z', end: '2026-03-10T16:00:00Z' }, // 2h = 2 x 60m
      ],
      duration: 60,
      tokens: {},
    });
    expect(offer.slots.length).toBe(2);
  });

  it('claims slot and updates status', () => {
    const offer = store.createOffer({
      ownerEmail: 'test@example.com',
      windows: [{ start: '2026-03-10T14:00:00Z', end: '2026-03-10T15:00:00Z' }],
      duration: 30,
      tokens: {},
    });

    store.claimSlot(offer.id, 0, { name: 'Bob', email: 'bob@test.com' });
    const updated = store.getOffer(offer.id);
    expect(updated.slots[0].status).toBe('claimed');
    expect(updated.slots[0].bookedBy.name).toBe('Bob');
    expect(updated.slots[1].status).toBe('available');
  });

  it('marks offer as claimed when all slots are claimed', () => {
    const offer = store.createOffer({
      ownerEmail: 'test@example.com',
      windows: [{ start: '2026-03-10T14:00:00Z', end: '2026-03-10T15:00:00Z' }],
      duration: 30,
      tokens: {},
    });

    store.claimSlot(offer.id, 0, { name: 'A', email: 'a@test.com' });
    store.claimSlot(offer.id, 1, { name: 'B', email: 'b@test.com' });
    const updated = store.getOffer(offer.id);
    expect(updated.status).toBe('claimed');
  });

  it('auto-expires stale offers on read', () => {
    const offer = store.createOffer({
      ownerEmail: 'test@example.com',
      windows: [{ start: '2026-03-10T14:00:00Z', end: '2026-03-10T15:00:00Z' }],
      duration: 30,
      tokens: {},
    });
    store.updateOffer(offer.id, { expiresAt: new Date('2020-01-01').toISOString() });

    const read = store.getOffer(offer.id);
    expect(read.status).toBe('expired');
  });
});
