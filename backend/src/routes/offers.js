const express = require('express');
const crypto = require('crypto');
const { google } = require('googleapis');
const { createOAuth2Client } = require('../config/google');
const { requireAuth } = require('../middleware/auth');
const store = require('../store');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();

/**
 * POST /api/offers
 * Create a new slot offer from owner's selected time windows.
 * Body: { windows: [{ start, end }], duration: 30|45|60 }
 */
router.post('/', requireAuth, async (req, res) => {
  const { windows, duration } = req.body;

  if (!windows || !Array.isArray(windows) || windows.length === 0) {
    return res.status(400).json({ error: 'windows array is required' });
  }

  if (![30, 45, 60].includes(duration)) {
    return res.status(400).json({ error: 'duration must be 30, 45, or 60' });
  }

  // Validate each window has start/end
  for (const w of windows) {
    if (!w.start || !w.end) {
      return res.status(400).json({ error: 'Each window must have start and end' });
    }
    if (new Date(w.end) <= new Date(w.start)) {
      return res.status(400).json({ error: 'Window end must be after start' });
    }
  }

  const offer = await store.createOffer({
    ownerEmail: req.session.user.email,
    windows,
    duration,
    tokens: req.session.tokens,
    timezone: req.body.timezone || 'America/New_York',
  });

  // Return offer without tokens
  const { tokens, ...safeOffer } = offer;
  res.status(201).json({ offer: safeOffer });
});

/**
 * GET /api/offers/:offerId
 * Public — fetch an offer for the booking page.
 * Only returns available slots, never owner's calendar details.
 */
router.get('/:offerId', async (req, res) => {
  const offer = await store.getOffer(req.params.offerId);

  if (!offer) {
    return res.status(404).json({ error: 'Offer not found' });
  }

  if (offer.status === 'expired') {
    return res.status(410).json({ error: 'Offer has expired', code: 'offer_expired' });
  }

  // Start with Firestore snapshot of slots
  let slots = offer.slots.map((s) => ({
    start: s.start,
    end: s.end,
    status: s.status,
  }));

  // Live calendar check — filter out slots that now conflict with owner's calendar
  if (offer.tokens) {
    try {
      const oauth2Client = createOAuth2Client();
      oauth2Client.setCredentials(offer.tokens);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const availableSlots = slots.filter((s) => s.status === 'available');
      if (availableSlots.length > 0) {
        const earliest = new Date(Math.min(...availableSlots.map((s) => new Date(s.start))));
        const latest = new Date(Math.max(...availableSlots.map((s) => new Date(s.end))));

        const eventsRes = await calendar.events.list({
          calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
          timeMin: earliest.toISOString(),
          timeMax: latest.toISOString(),
          singleEvents: true,
        });

        const busyEvents = (eventsRes.data.items || []).filter(
          (e) => e.status !== 'cancelled' && e.transparency !== 'transparent'
        );

        // Remove slots that now conflict — hide entirely (don't show as unavailable)
        slots = slots.filter((s) => {
          if (s.status !== 'available') return false; // already claimed — hide
          const slotStart = new Date(s.start).getTime();
          const slotEnd = new Date(s.end).getTime();
          const hasConflict = busyEvents.some((e) => {
            const eStart = new Date(e.start.dateTime || e.start.date).getTime();
            const eEnd = new Date(e.end.dateTime || e.end.date).getTime();
            return eStart < slotEnd && eEnd > slotStart;
          });
          return !hasConflict;
        });
      } else {
        // All slots are claimed — filter them out
        slots = [];
      }
    } catch (err) {
      // Live check failed — fall back to snapshot (filter out claimed slots)
      console.error('Live availability check failed, using snapshot:', err.message);
      slots = slots.filter((s) => s.status === 'available');
    }
  } else {
    // No tokens — fall back to snapshot (filter out claimed slots)
    slots = slots.filter((s) => s.status === 'available');
  }

  // SECURITY: Public view — explicitly whitelist returned fields.
  // Never expose: tokens, ownerEmail, bookedBy, calendar metadata (summary, description, attendees, organizer).
  res.json({
    offer: {
      id: offer.id,
      duration: offer.duration,
      timezone: offer.timezone,
      windows: offer.windows.map((w) => ({ start: w.start, end: w.end })),
      slots,
      expiresAt: offer.expiresAt,
      status: offer.status,
    },
  });
});

/**
 * POST /api/offers/:offerId/book
 * Public — book a specific slot.
 * Body: { slotIndex, name, email }
 *
 * SECURITY: Calendar event creation requires BOTH:
 * 1. A valid active offer in Firestore (with stored OAuth tokens)
 * 2. A legitimate unclaimed slot within that offer
 * No calendar event can be created without both preconditions.
 *
 * Does a LIVE conflict check against the owner's Google Calendar
 * before confirming the booking.
 */
router.post('/:offerId/book', rateLimit({ maxAttempts: 10, windowMs: 15 * 60 * 1000 }), async (req, res) => {
  const { slotIndex, name, email } = req.body;

  if (typeof slotIndex !== 'number' || !name || !email) {
    return res.status(400).json({ error: 'slotIndex, name, and email are required' });
  }

  const offer = await store.getOffer(req.params.offerId);

  if (!offer) {
    return res.status(404).json({ error: 'Offer not found' });
  }

  if (offer.status === 'expired') {
    return res.status(410).json({ error: 'Offer has expired', code: 'offer_expired' });
  }

  const slot = offer.slots[slotIndex];
  if (!slot) {
    return res.status(400).json({ error: 'Invalid slot index' });
  }

  if (slot.status === 'claimed') {
    return res.status(409).json({ error: 'Slot already claimed', code: 'slot_claimed' });
  }

  // Real-time conflict check against owner's Google Calendar
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(offer.tokens);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const slotStart = new Date(slot.start);
    const slotEnd = new Date(slot.end);

    // Check for conflicts in the slot's time window
    const eventsRes = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      timeMin: slotStart.toISOString(),
      timeMax: slotEnd.toISOString(),
      singleEvents: true,
    });

    const conflicts = (eventsRes.data.items || []).filter(
      (e) => e.status !== 'cancelled' && e.transparency !== 'transparent'
    );

    if (conflicts.length > 0) {
      // This specific slot has a conflict — check if ALL slots are now stale
      const allConflicted = await checkAllSlotsConflicted(offer, calendar);

      if (allConflicted) {
        await store.updateOffer(offer.id, { status: 'expired' });
        return res.status(409).json({
          error: 'All offered times are no longer available',
          code: 'offer_stale',
        });
      }

      return res.status(409).json({
        error: 'This time slot is no longer available',
        code: 'slot_conflict',
      });
    }

    // No conflict — create the calendar event with Google Meet
    const event = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary: `Meeting with ${name}`,
        start: { dateTime: slot.start },
        end: { dateTime: slot.end },
        attendees: [
          { email: offer.ownerEmail, responseStatus: 'accepted' },
          { email },
        ],
        description: `Booked via OpenSlot by ${name} (${email})`,
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
      sendUpdates: 'all',
    });

    // Mark slot as claimed
    await store.claimSlot(offer.id, slotIndex, { name, email });

    // Fire-and-forget: send owner a notification email via Gmail
    sendOwnerNotification(oauth2Client, offer, slot, name, email).catch((err) => {
      console.error('Owner notification email failed:', err.message, err.response?.data || err.code || '');
    });

    res.json({
      success: true,
      booking: {
        slot: { start: slot.start, end: slot.end },
        calendarEventId: event.data.id,
      },
    });
  } catch (err) {
    console.error('Booking error:', err.message);
    if (err.code === 401) {
      return res.status(401).json({ error: 'Owner calendar access expired', code: 'auth_expired' });
    }
    res.status(500).json({ error: 'Failed to complete booking' });
  }
});

/**
 * Check if ALL available slots in an offer conflict with current calendar.
 */
async function checkAllSlotsConflicted(offer, calendar) {
  const availableSlots = offer.slots.filter((s) => s.status === 'available');
  if (availableSlots.length === 0) return true;

  // Find the earliest and latest slot times for a single query
  const earliest = new Date(Math.min(...availableSlots.map((s) => new Date(s.start))));
  const latest = new Date(Math.max(...availableSlots.map((s) => new Date(s.end))));

  const eventsRes = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    timeMin: earliest.toISOString(),
    timeMax: latest.toISOString(),
    singleEvents: true,
  });

  const busyEvents = (eventsRes.data.items || []).filter(
    (e) => e.status !== 'cancelled' && e.transparency !== 'transparent'
  );

  // Check each available slot for conflicts
  for (const slot of availableSlots) {
    const slotStart = new Date(slot.start).getTime();
    const slotEnd = new Date(slot.end).getTime();

    const hasConflict = busyEvents.some((e) => {
      const eStart = new Date(e.start.dateTime || e.start.date).getTime();
      const eEnd = new Date(e.end.dateTime || e.end.date).getTime();
      return eStart < slotEnd && eEnd > slotStart;
    });

    if (!hasConflict) return false; // At least one slot is still free
  }

  return true; // All slots are conflicted
}

/**
 * Send a notification email to the owner via Gmail API.
 */
async function sendOwnerNotification(oauth2Client, offer, slot, guestName, guestEmail) {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const tz = offer.timezone || 'America/New_York';

  const startDate = new Date(slot.start);
  const dayLabel = startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: tz });
  const startTime = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz });
  const endTime = new Date(slot.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone: tz });

  const subject = `New booking: ${guestName} — ${dayLabel} at ${startTime}`;
  const body = [
    `You have a new booking via OpenSlot.`,
    ``,
    `Guest: ${guestName}`,
    `Email: ${guestEmail}`,
    `Date: ${dayLabel}`,
    `Time: ${startTime} – ${endTime}`,
    `Duration: ${offer.duration} minutes`,
    ``,
    `A calendar event has been created automatically.`,
  ].join('\n');

  const message = [
    `From: ${offer.ownerEmail}`,
    `To: ${offer.ownerEmail}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    body,
  ].join('\r\n');

  const encoded = Buffer.from(message).toString('base64url');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encoded },
  });
}

module.exports = router;
