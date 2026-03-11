const {
  calculateAvailability,
  extractBusyIntervals,
  mergeIntervals,
  applyBuffer,
} = require('../src/availability');

// Fixed "now" for deterministic tests: Monday March 9, 2026 at 00:00 UTC
// This is Sunday March 8 at 7pm ET, so day 0 working hours have passed.
// We'll set daysAhead=7 so we get Mon-Sun availability.
const FIXED_NOW = new Date('2026-03-09T12:00:00Z'); // Mon 7am ET

// Override Date for tests
const RealDate = global.Date;

function mockDate(fixedDate) {
  const fixed = new RealDate(fixedDate);
  class MockDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) return fixed;
      super(...args);
    }

    static now() {
      return fixed.getTime();
    }
  }
  global.Date = MockDate;
}

function restoreDate() {
  global.Date = RealDate;
}

const BASE_CONFIG = {
  workingHours: { start: '09:00', end: '18:00' },
  timezone: 'America/New_York',
  minSlotMinutes: 30,
  bufferMinutes: 0,
  daysAhead: 1,
};

beforeEach(() => mockDate(FIXED_NOW));
afterEach(() => restoreDate());

describe('extractBusyIntervals', () => {
  it('extracts start/end from timed events', () => {
    const events = [
      {
        start: { dateTime: '2026-03-09T14:00:00-05:00' },
        end: { dateTime: '2026-03-09T15:00:00-05:00' },
      },
    ];
    const intervals = extractBusyIntervals(events, BASE_CONFIG);
    expect(intervals).toHaveLength(1);
    expect(intervals[0].start.toISOString()).toBe('2026-03-09T19:00:00.000Z');
    expect(intervals[0].end.toISOString()).toBe('2026-03-09T20:00:00.000Z');
  });

  it('handles all-day events', () => {
    const events = [
      {
        start: { date: '2026-03-09' },
        end: { date: '2026-03-10' },
      },
    ];
    const intervals = extractBusyIntervals(events, BASE_CONFIG);
    expect(intervals).toHaveLength(1);
    expect(intervals[0].start.toISOString()).toBe('2026-03-09T00:00:00.000Z');
    expect(intervals[0].end.toISOString()).toBe('2026-03-10T00:00:00.000Z');
  });

  it('skips cancelled events', () => {
    const events = [
      {
        status: 'cancelled',
        start: { dateTime: '2026-03-09T14:00:00-05:00' },
        end: { dateTime: '2026-03-09T15:00:00-05:00' },
      },
    ];
    const intervals = extractBusyIntervals(events, BASE_CONFIG);
    expect(intervals).toHaveLength(0);
  });

  it('skips transparent (free) events', () => {
    const events = [
      {
        transparency: 'transparent',
        start: { dateTime: '2026-03-09T14:00:00-05:00' },
        end: { dateTime: '2026-03-09T15:00:00-05:00' },
      },
    ];
    const intervals = extractBusyIntervals(events, BASE_CONFIG);
    expect(intervals).toHaveLength(0);
  });

  it('never includes event titles or details in output', () => {
    const events = [
      {
        summary: 'SECRET MEETING',
        description: 'Very private details',
        attendees: [{ email: 'secret@example.com' }],
        start: { dateTime: '2026-03-09T14:00:00-05:00' },
        end: { dateTime: '2026-03-09T15:00:00-05:00' },
      },
    ];
    const intervals = extractBusyIntervals(events, BASE_CONFIG);
    const serialized = JSON.stringify(intervals);
    expect(serialized).not.toContain('SECRET');
    expect(serialized).not.toContain('private');
    expect(serialized).not.toContain('secret@example.com');
  });
});

describe('mergeIntervals', () => {
  it('merges overlapping intervals', () => {
    const intervals = [
      { start: new RealDate('2026-03-09T14:00:00Z'), end: new RealDate('2026-03-09T15:00:00Z') },
      { start: new RealDate('2026-03-09T14:30:00Z'), end: new RealDate('2026-03-09T16:00:00Z') },
    ];
    const merged = mergeIntervals(intervals);
    expect(merged).toHaveLength(1);
    expect(merged[0].start.toISOString()).toBe('2026-03-09T14:00:00.000Z');
    expect(merged[0].end.toISOString()).toBe('2026-03-09T16:00:00.000Z');
  });

  it('keeps non-overlapping intervals separate', () => {
    const intervals = [
      { start: new RealDate('2026-03-09T14:00:00Z'), end: new RealDate('2026-03-09T15:00:00Z') },
      { start: new RealDate('2026-03-09T16:00:00Z'), end: new RealDate('2026-03-09T17:00:00Z') },
    ];
    const merged = mergeIntervals(intervals);
    expect(merged).toHaveLength(2);
  });

  it('handles adjacent intervals (touching boundaries)', () => {
    const intervals = [
      { start: new RealDate('2026-03-09T14:00:00Z'), end: new RealDate('2026-03-09T15:00:00Z') },
      { start: new RealDate('2026-03-09T15:00:00Z'), end: new RealDate('2026-03-09T16:00:00Z') },
    ];
    const merged = mergeIntervals(intervals);
    expect(merged).toHaveLength(1);
    expect(merged[0].end.toISOString()).toBe('2026-03-09T16:00:00.000Z');
  });
});

describe('applyBuffer', () => {
  it('expands intervals by buffer time', () => {
    const intervals = [
      { start: new RealDate('2026-03-09T15:00:00Z'), end: new RealDate('2026-03-09T16:00:00Z') },
    ];
    const buffered = applyBuffer(intervals, 15);
    expect(buffered[0].start.toISOString()).toBe('2026-03-09T14:45:00.000Z');
    expect(buffered[0].end.toISOString()).toBe('2026-03-09T16:15:00.000Z');
  });

  it('does nothing with zero buffer', () => {
    const intervals = [
      { start: new RealDate('2026-03-09T15:00:00Z'), end: new RealDate('2026-03-09T16:00:00Z') },
    ];
    const buffered = applyBuffer(intervals, 0);
    expect(buffered[0].start.toISOString()).toBe('2026-03-09T15:00:00.000Z');
    expect(buffered[0].end.toISOString()).toBe('2026-03-09T16:00:00.000Z');
  });
});

describe('calculateAvailability', () => {
  it('returns full working day when no events', () => {
    const slots = calculateAvailability([], BASE_CONFIG);
    expect(slots.length).toBeGreaterThanOrEqual(1);
    // Should be a slot covering most of the working day
    const totalMinutes = slots.reduce((sum, s) => sum + s.durationMinutes, 0);
    expect(totalMinutes).toBeGreaterThan(0);
  });

  it('splits around a midday meeting', () => {
    const events = [
      {
        start: { dateTime: '2026-03-09T17:00:00Z' }, // 12pm ET
        end: { dateTime: '2026-03-09T18:00:00Z' },   // 1pm ET
      },
    ];
    const slots = calculateAvailability(events, BASE_CONFIG);
    // Should have a slot before noon and a slot after 1pm
    expect(slots.length).toBeGreaterThanOrEqual(2);
  });

  it('handles back-to-back meetings with no gap', () => {
    const events = [
      {
        start: { dateTime: '2026-03-09T17:00:00Z' }, // 12pm ET
        end: { dateTime: '2026-03-09T18:00:00Z' },   // 1pm ET
      },
      {
        start: { dateTime: '2026-03-09T18:00:00Z' }, // 1pm ET
        end: { dateTime: '2026-03-09T19:00:00Z' },   // 2pm ET
      },
    ];
    const slots = calculateAvailability(events, BASE_CONFIG);
    // No slot should exist between 12pm and 2pm ET
    for (const slot of slots) {
      const start = new RealDate(slot.start).getTime();
      const end = new RealDate(slot.end).getTime();
      const busyStart = new RealDate('2026-03-09T17:00:00Z').getTime();
      const busyEnd = new RealDate('2026-03-09T19:00:00Z').getTime();
      // Slot should not overlap the busy block
      expect(start >= busyEnd || end <= busyStart).toBe(true);
    }
  });

  it('blocks entire day for all-day events', () => {
    const events = [
      {
        start: { date: '2026-03-09' },
        end: { date: '2026-03-10' },
      },
    ];
    const slots = calculateAvailability(events, BASE_CONFIG);
    // No slots should be on March 9
    for (const slot of slots) {
      const slotDate = new RealDate(slot.start)
        .toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      expect(slotDate).not.toBe('2026-03-09');
    }
  });

  it('enforces buffer time around events', () => {
    const events = [
      {
        start: { dateTime: '2026-03-09T17:00:00Z' }, // 12pm ET
        end: { dateTime: '2026-03-09T18:00:00Z' },   // 1pm ET
      },
    ];
    const config = { ...BASE_CONFIG, bufferMinutes: 30 };
    const slots = calculateAvailability(events, config);

    for (const slot of slots) {
      const slotEnd = new RealDate(slot.end).getTime();
      const slotStart = new RealDate(slot.start).getTime();
      const eventStart = new RealDate('2026-03-09T17:00:00Z').getTime();
      const eventEnd = new RealDate('2026-03-09T18:00:00Z').getTime();

      // Slots ending before event must end at least 30min before event start
      if (slotEnd <= eventStart) {
        expect(slotEnd).toBeLessThanOrEqual(eventStart - 30 * 60000);
      }
      // Slots starting after event must start at least 30min after event end
      if (slotStart >= eventEnd) {
        expect(slotStart).toBeGreaterThanOrEqual(eventEnd + 30 * 60000);
      }
    }
  });

  it('respects working hours boundaries', () => {
    const slots = calculateAvailability([], BASE_CONFIG);
    for (const slot of slots) {
      const start = new RealDate(slot.start);
      const end = new RealDate(slot.end);

      // Get hour in ET
      const startHour = parseInt(
        start.toLocaleTimeString('en-US', {
          timeZone: 'America/New_York',
          hour12: false,
          hour: '2-digit',
        }),
        10
      );
      const endHour = parseInt(
        end.toLocaleTimeString('en-US', {
          timeZone: 'America/New_York',
          hour12: false,
          hour: '2-digit',
        }),
        10
      );
      const endMin = parseInt(
        end.toLocaleTimeString('en-US', {
          timeZone: 'America/New_York',
          hour12: false,
          minute: '2-digit',
        }),
        10
      );

      expect(startHour).toBeGreaterThanOrEqual(9);
      // End at 18:00 is valid (endHour=18, endMin=0)
      if (endHour === 18) {
        expect(endMin).toBe(0);
      } else {
        expect(endHour).toBeLessThan(18);
      }
    }
  });

  it('filters out slots shorter than minSlotMinutes', () => {
    // Two meetings with only a 15-min gap, minSlot is 30
    const events = [
      {
        start: { dateTime: '2026-03-09T17:00:00Z' },
        end: { dateTime: '2026-03-09T17:45:00Z' },
      },
      {
        start: { dateTime: '2026-03-09T18:00:00Z' },
        end: { dateTime: '2026-03-09T19:00:00Z' },
      },
    ];
    const config = { ...BASE_CONFIG, minSlotMinutes: 30 };
    const slots = calculateAvailability(events, config);

    for (const slot of slots) {
      expect(slot.durationMinutes).toBeGreaterThanOrEqual(30);
    }
  });

  it('never leaks event details in output', () => {
    const events = [
      {
        summary: 'Interview with CEO',
        description: 'Confidential discussion about acquisition',
        location: '123 Secret St',
        attendees: [{ email: 'ceo@company.com' }],
        start: { dateTime: '2026-03-09T17:00:00Z' },
        end: { dateTime: '2026-03-09T18:00:00Z' },
      },
    ];
    const slots = calculateAvailability(events, BASE_CONFIG);
    const serialized = JSON.stringify(slots);
    expect(serialized).not.toContain('Interview');
    expect(serialized).not.toContain('CEO');
    expect(serialized).not.toContain('Confidential');
    expect(serialized).not.toContain('Secret');
    expect(serialized).not.toContain('ceo@company.com');
    // Slots should only have start, end, durationMinutes
    for (const slot of slots) {
      expect(Object.keys(slot).sort()).toEqual(['durationMinutes', 'end', 'start']);
    }
  });

  it('handles multiple days', () => {
    const config = { ...BASE_CONFIG, daysAhead: 3 };
    const slots = calculateAvailability([], config);
    // Should have slots across multiple days
    const days = new Set(
      slots.map((s) =>
        new RealDate(s.start).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
      )
    );
    expect(days.size).toBeGreaterThanOrEqual(1);
  });

  it('handles multi-day events', () => {
    const events = [
      {
        start: { date: '2026-03-09' },
        end: { date: '2026-03-11' }, // 2-day event
      },
    ];
    const config = { ...BASE_CONFIG, daysAhead: 3 };
    const slots = calculateAvailability(events, config);

    // No slots on March 9 or 10
    for (const slot of slots) {
      const slotDate = new RealDate(slot.start)
        .toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      expect(['2026-03-09', '2026-03-10']).not.toContain(slotDate);
    }
  });

  it('skips weekends (Mon-Fri only)', () => {
    // March 9, 2026 is a Monday. daysAhead=7 covers Mon-Sun.
    const config = { ...BASE_CONFIG, daysAhead: 7 };
    const slots = calculateAvailability([], config);

    for (const slot of slots) {
      const dayStr = new RealDate(slot.start).toLocaleDateString('en-US', {
        timeZone: 'America/New_York',
        weekday: 'short',
      });
      expect(dayStr).not.toBe('Sat');
      expect(dayStr).not.toBe('Sun');
    }
  });
});
