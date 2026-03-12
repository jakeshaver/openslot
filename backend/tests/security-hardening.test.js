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
