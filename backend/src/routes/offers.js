const express = require('express');
const { google } = require('googleapis');
const { createOAuth2Client } = require('../config/google');
const { requireAuth } = require('../middleware/auth');
const store = require('../store');

const router = express.Router();

/**
 * POST /api/offers
 * Create a new slot offer from owner's selected time windows.
 * Body: { windows: [{ start, end }], duration: 30|45|60 }
 */
router.post('/', requireAuth, (req, res) => {
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

  const offer = store.createOffer({
    ownerEmail: req.session.user.email,
    windows,
    duration,
    tokens: req.session.tokens,
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
router.get('/:offerId', (req, res) => {
  const offer = store.getOffer(req.params.offerId);

  if (!offer) {
    return res.status(404).json({ error: 'Offer not found' });
  }

  if (offer.status === 'expired') {
    return res.status(410).json({ error: 'Offer has expired', code: 'offer_expired' });
  }

  // Public view — no tokens, no owner details beyond email
  res.json({
    offer: {
      id: offer.id,
      duration: offer.duration,
      windows: offer.windows.map((w) => ({ start: w.start, end: w.end })),
      slots: offer.slots.map((s) => ({
        start: s.start,
        end: s.end,
        status: s.status,
      })),
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
 * Does a LIVE conflict check against the owner's Google Calendar
 * before confirming the booking.
 */
router.post('/:offerId/book', async (req, res) => {
  const { slotIndex, name, email } = req.body;

  if (typeof slotIndex !== 'number' || !name || !email) {
    return res.status(400).json({ error: 'slotIndex, name, and email are required' });
  }

  const offer = store.getOffer(req.params.offerId);

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
        store.updateOffer(offer.id, { status: 'expired' });
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

    // No conflict — create the calendar event
    const event = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      requestBody: {
        summary: `Meeting with ${name}`,
        start: { dateTime: slot.start },
        end: { dateTime: slot.end },
        attendees: [{ email }],
        description: `Booked via OpenSlot by ${name} (${email})`,
      },
      sendUpdates: 'all',
    });

    // Mark slot as claimed
    store.claimSlot(offer.id, slotIndex, { name, email });

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

module.exports = router;
