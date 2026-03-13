const request = require('supertest');
const app = require('../src/app');
const store = require('../src/store');

// Future dates for tests
const FUTURE_START_1 = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const FUTURE_END_1 = new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString();
const PAST_START = '2024-01-01T14:00:00Z';
const PAST_END = '2024-01-01T16:00:00Z';

beforeEach(async () => {
  await store.clearAll();
});

describe('GET /api/offers/:offerId/reschedule', () => {
  it('returns 404 for non-existent offer', async () => {
    const res = await request(app).get('/api/offers/nonexistent/reschedule');
    expect(res.status).toBe(404);
  });

  it('returns 400 for unclaimed offer', async () => {
    const offer = await store.createOffer({
      ownerEmail: 'test@example.com',
      windows: [{ start: FUTURE_START_1, end: FUTURE_END_1 }],
      duration: 30,
      tokens: {},
    });

    const res = await request(app).get(`/api/offers/${offer.id}/reschedule`);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('not_claimed');
  });

  it('returns available slots for a claimed offer', async () => {
    const offer = await store.createOffer({
      ownerEmail: 'test@example.com',
      windows: [{ start: FUTURE_START_1, end: FUTURE_END_1 }],
      duration: 30,
      tokens: {},
    });

    // Claim slot 0
    await store.claimSlot(offer.id, 0, {
      name: 'Bob',
      email: 'bob@test.com',
      calendarEventId: 'evt123',
    });

    const res = await request(app).get(`/api/offers/${offer.id}/reschedule`);
    expect(res.status).toBe(200);
    expect(res.body.currentBooking.name).toBe('Bob');
    expect(res.body.offer.slots.length).toBeGreaterThan(0);
    // Claimed slot should not be in available slots
    expect(res.body.offer.slots.every((s) => s.start !== offer.slots[0].start)).toBe(true);
  });

  it('returns reschedule_expired when meeting end time has passed', async () => {
    const offer = await store.createOffer({
      ownerEmail: 'test@example.com',
      windows: [{ start: PAST_START, end: PAST_END }],
      duration: 30,
      tokens: {},
    });

    // Claim slot 0 (past time)
    await store.claimSlot(offer.id, 0, {
      name: 'Bob',
      email: 'bob@test.com',
      calendarEventId: 'evt123',
    });

    const res = await request(app).get(`/api/offers/${offer.id}/reschedule`);
    expect(res.status).toBe(410);
    expect(res.body.code).toBe('reschedule_expired');
  });
});

describe('POST /api/offers/:offerId/reschedule', () => {
  it('returns 404 for non-existent offer', async () => {
    const res = await request(app)
      .post('/api/offers/nonexistent/reschedule')
      .send({ slotIndex: 0 });
    expect(res.status).toBe(404);
  });

  it('returns 400 for unclaimed offer', async () => {
    const offer = await store.createOffer({
      ownerEmail: 'test@example.com',
      windows: [{ start: FUTURE_START_1, end: FUTURE_END_1 }],
      duration: 30,
      tokens: {},
    });

    const res = await request(app)
      .post(`/api/offers/${offer.id}/reschedule`)
      .send({ slotIndex: 1 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('not_claimed');
  });

  it('returns reschedule_expired when meeting end time has passed', async () => {
    const offer = await store.createOffer({
      ownerEmail: 'test@example.com',
      windows: [{ start: PAST_START, end: PAST_END }],
      duration: 30,
      tokens: {},
    });

    await store.claimSlot(offer.id, 0, {
      name: 'Bob',
      email: 'bob@test.com',
      calendarEventId: 'evt123',
    });

    const res = await request(app)
      .post(`/api/offers/${offer.id}/reschedule`)
      .send({ slotIndex: 1 });
    expect(res.status).toBe(410);
    expect(res.body.code).toBe('reschedule_expired');
  });

  it('returns slot_expired for past-time new slot', async () => {
    // Create offer with both past and future slots
    const offer = await store.createOffer({
      ownerEmail: 'test@example.com',
      windows: [
        { start: PAST_START, end: PAST_END },
        { start: FUTURE_START_1, end: FUTURE_END_1 },
      ],
      duration: 30,
      tokens: { access_token: 'test' },
    });

    // Claim a future slot
    const futureSlotIdx = offer.slots.findIndex((s) => new Date(s.start) > new Date());
    await store.claimSlot(offer.id, futureSlotIdx, {
      name: 'Bob',
      email: 'bob@test.com',
      calendarEventId: 'evt123',
    });

    // Try to reschedule to a past slot
    const pastSlotIdx = offer.slots.findIndex((s) => new Date(s.start) < new Date());
    const res = await request(app)
      .post(`/api/offers/${offer.id}/reschedule`)
      .send({ slotIndex: pastSlotIdx });
    expect(res.status).toBe(410);
    expect(res.body.code).toBe('slot_expired');
  });

  it('returns 409 for already-claimed new slot', async () => {
    const offer = await store.createOffer({
      ownerEmail: 'test@example.com',
      windows: [{ start: FUTURE_START_1, end: FUTURE_END_1 }],
      duration: 30,
      tokens: { access_token: 'test' },
    });

    // Claim slot 0
    await store.claimSlot(offer.id, 0, {
      name: 'Bob',
      email: 'bob@test.com',
      calendarEventId: 'evt123',
    });

    // Claim slot 1 by someone else
    await store.claimSlot(offer.id, 1, {
      name: 'Alice',
      email: 'alice@test.com',
      calendarEventId: 'evt456',
    });

    // Try to reschedule to the already-claimed slot 1
    const res = await request(app)
      .post(`/api/offers/${offer.id}/reschedule`)
      .send({ slotIndex: 1 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('slot_claimed');
  });

  it('returns 400 for missing slotIndex', async () => {
    const offer = await store.createOffer({
      ownerEmail: 'test@example.com',
      windows: [{ start: FUTURE_START_1, end: FUTURE_END_1 }],
      duration: 30,
      tokens: {},
    });

    const res = await request(app)
      .post(`/api/offers/${offer.id}/reschedule`)
      .send({});
    expect(res.status).toBe(400);
  });
});
