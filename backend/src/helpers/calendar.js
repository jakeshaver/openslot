const { google } = require('googleapis');
const { createOAuth2Client } = require('../config/google');

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

/**
 * Create an authenticated Google Calendar client from stored tokens.
 */
function createCalendarClient(tokens) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  return { oauth2Client, calendar };
}

/**
 * Filter out cancelled and transparent (free) events — returns only busy events.
 */
function filterBusyEvents(events) {
  return (events || []).filter(
    (e) => e.status !== 'cancelled' && e.transparency !== 'transparent'
  );
}

/**
 * Fetch busy events from Google Calendar for a time range.
 */
async function fetchBusyEvents(calendar, timeMin, timeMax) {
  const eventsRes = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
  });
  return filterBusyEvents(eventsRes.data.items);
}

/**
 * Check if a slot conflicts with any busy events.
 */
function hasConflict(slotStart, slotEnd, busyEvents) {
  return busyEvents.some((e) => {
    const eStart = new Date(e.start.dateTime || e.start.date).getTime();
    const eEnd = new Date(e.end.dateTime || e.end.date).getTime();
    return eStart < slotEnd && eEnd > slotStart;
  });
}

/**
 * Get the earliest start and latest end from a list of slots.
 */
function getSlotBounds(slots) {
  const earliest = new Date(Math.min(...slots.map((s) => new Date(s.start))));
  const latest = new Date(Math.max(...slots.map((s) => new Date(s.end))));
  return { earliest, latest };
}

module.exports = { createCalendarClient, filterBusyEvents, fetchBusyEvents, hasConflict, getSlotBounds, CALENDAR_ID };
