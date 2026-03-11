/**
 * Availability Engine
 *
 * Takes calendar events and a config, returns only free time slots.
 * PRIVACY: This module never exposes event details — only free/busy boundaries.
 */

const DEFAULT_CONFIG = {
  workingHours: { start: '08:00', end: '20:00' },
  timezone: 'America/New_York',
  minSlotMinutes: 30,
  bufferMinutes: 15,
  daysAhead: 7,
};

/**
 * Parse "HH:MM" into { hours, minutes }
 */
function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

/**
 * Get the start of a day in the given timezone, then set to the given HH:MM.
 */
function getWorkingBoundary(date, timeStr, timezone) {
  // Build an ISO date string for the given date in the target timezone
  const dateStr = date.toLocaleDateString('en-CA', { timeZone: timezone }); // YYYY-MM-DD
  const { hours, minutes } = parseTime(timeStr);
  const pad = (n) => String(n).padStart(2, '0');
  const dtStr = `${dateStr}T${pad(hours)}:${pad(minutes)}:00`;

  // Get the UTC offset for this datetime in the timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
  });
  const parts = formatter.formatToParts(new Date(dtStr + 'Z'));
  const tzPart = parts.find((p) => p.type === 'timeZoneName');
  // tzPart.value is like "GMT-05:00" or "GMT+05:30"
  const offsetMatch = tzPart.value.match(/GMT([+-]\d{2}):(\d{2})/);
  let offsetMs = 0;
  if (offsetMatch) {
    const sign = offsetMatch[1][0] === '+' ? 1 : -1;
    const offH = parseInt(offsetMatch[1].slice(1), 10);
    const offM = parseInt(offsetMatch[2], 10);
    offsetMs = sign * (offH * 60 + offM) * 60 * 1000;
  }

  // The local datetime in UTC
  const localMs = new Date(dtStr + 'Z').getTime();
  return new Date(localMs - offsetMs);
}

/**
 * Extract only busy intervals from events. No titles, no details.
 * Respects all-day events by expanding them to full working-day blocks.
 */
function extractBusyIntervals(events, config) {
  const intervals = [];

  for (const event of events) {
    // Skip cancelled or transparent (free) events
    if (event.status === 'cancelled' || event.transparency === 'transparent') {
      continue;
    }

    let start, end;

    if (event.start.date) {
      // All-day event: treat as blocking the entire day(s)
      // Use date strings to create midnight boundaries
      start = new Date(event.start.date + 'T00:00:00Z');
      end = new Date(event.end.date + 'T00:00:00Z');
    } else {
      start = new Date(event.start.dateTime);
      end = new Date(event.end.dateTime);
    }

    intervals.push({ start, end });
  }

  // Sort by start time
  intervals.sort((a, b) => a.start - b.start);
  return intervals;
}

/**
 * Merge overlapping busy intervals.
 */
function mergeIntervals(intervals) {
  if (intervals.length === 0) return [];

  const merged = [{ ...intervals[0] }];

  for (let i = 1; i < intervals.length; i++) {
    const last = merged[merged.length - 1];
    const curr = intervals[i];

    if (curr.start <= last.end) {
      last.end = curr.end > last.end ? curr.end : last.end;
    } else {
      merged.push({ ...curr });
    }
  }

  return merged;
}

/**
 * Apply buffer time around busy intervals.
 */
function applyBuffer(intervals, bufferMinutes) {
  if (bufferMinutes <= 0) return intervals;

  const bufferMs = bufferMinutes * 60 * 1000;
  return intervals.map((interval) => ({
    start: new Date(interval.start.getTime() - bufferMs),
    end: new Date(interval.end.getTime() + bufferMs),
  }));
}

/**
 * Calculate available time slots.
 *
 * @param {Array} events - Google Calendar events (raw API response items)
 * @param {Object} userConfig - Partial config, merged with defaults
 * @returns {Array} Available slots as { start: ISO string, end: ISO string, durationMinutes }
 */
function calculateAvailability(events, userConfig = {}) {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  const { workingHours, timezone, minSlotMinutes, bufferMinutes, daysAhead } = config;
  const minSlotMs = minSlotMinutes * 60 * 1000;

  // Strip events down to busy intervals (privacy: no details retained)
  let busy = extractBusyIntervals(events, config);
  busy = applyBuffer(busy, bufferMinutes);
  busy = mergeIntervals(busy);

  const slots = [];
  const now = new Date();
  const baseDate = config._startDate || now;

  for (let d = 0; d < daysAhead; d++) {
    const day = new Date(baseDate);
    day.setDate(baseDate.getDate() + d);

    // Skip weekends (0 = Sunday, 6 = Saturday) in the target timezone
    const dayOfWeek = parseInt(
      new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'narrow' })
        .format(day),
      10
    );
    const localDayStr = day.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'short' });
    if (localDayStr === 'Sat' || localDayStr === 'Sun') continue;

    const dayStart = getWorkingBoundary(day, workingHours.start, timezone);
    const dayEnd = getWorkingBoundary(day, workingHours.end, timezone);

    // Skip if the working day has already ended
    if (dayEnd <= now) continue;

    // Effective start is the later of working hours start or now
    let windowStart = dayStart < now ? now : dayStart;

    // Round windowStart up to next slot boundary (e.g., next 15-min mark)
    const roundMs = 15 * 60 * 1000;
    const remainder = windowStart.getTime() % roundMs;
    if (remainder > 0) {
      windowStart = new Date(windowStart.getTime() + (roundMs - remainder));
    }

    // Find free gaps within [windowStart, dayEnd]
    let cursor = windowStart;

    for (const block of busy) {
      if (block.end <= cursor) continue;
      if (block.start >= dayEnd) break;

      // Free gap before this busy block
      const gapEnd = block.start < dayEnd ? block.start : dayEnd;
      if (gapEnd > cursor) {
        const duration = gapEnd - cursor;
        if (duration >= minSlotMs) {
          slots.push({
            start: cursor.toISOString(),
            end: gapEnd.toISOString(),
            durationMinutes: Math.floor(duration / 60000),
          });
        }
      }

      cursor = block.end > cursor ? block.end : cursor;
    }

    // Free gap after last busy block
    if (cursor < dayEnd) {
      const duration = dayEnd - cursor;
      if (duration >= minSlotMs) {
        slots.push({
          start: cursor.toISOString(),
          end: dayEnd.toISOString(),
          durationMinutes: Math.floor(duration / 60000),
        });
      }
    }
  }

  return slots;
}

module.exports = {
  calculateAvailability,
  extractBusyIntervals,
  mergeIntervals,
  applyBuffer,
  getWorkingBoundary,
  DEFAULT_CONFIG,
};
