const express = require('express');
const crypto = require('crypto');
const { google } = require('googleapis');
const { createCalendarClient, fetchBusyEvents, hasConflict, getSlotBounds, CALENDAR_ID } = require('../helpers/calendar');
const { requireAuth } = require('../middleware/auth');
const store = require('../store');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();

/**
 * GET /api/offers
 * Owner-only — returns all offers for the current user.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const offers = await store.getOffersByOwner(req.session.user.email);
    const safeOffers = offers.map(({ tokens, ...rest }) => rest);
    res.json({ offers: safeOffers });
  } catch (err) {
    console.error('Dashboard fetch error:', err.message);
    res.status(500).json({ error: 'Failed to load offers' });
  }
});

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

  if (![15, 30, 45, 60].includes(duration)) {
    return res.status(400).json({ error: 'duration must be 15, 30, 45, or 60' });
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

  const userSettings = await store.getSettings(req.session.user.email) || {};

  const offer = await store.createOffer({
    ownerEmail: req.session.user.email,
    windows,
    duration,
    tokens: req.session.tokens,
    timezone: req.body.timezone || 'America/New_York',
    label: req.body.label || null,
    expiryDays: userSettings.offerExpiryDays || 7,
  });

  // Return offer without tokens
  const { tokens, ...safeOffer } = offer;
  res.status(201).json({ offer: safeOffer });
});

/**
 * PATCH /api/offers/:offerId/label
 * Owner-only — update an offer's label.
 * Body: { label: string|null }
 */
router.patch('/:offerId/label', requireAuth, async (req, res) => {
  const offer = await store.getOffer(req.params.offerId);
  if (!offer) return res.status(404).json({ error: 'Offer not found' });
  if (offer.ownerEmail !== req.session.user.email) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const label = req.body.label || null;
  await store.updateOffer(offer.id, { label });
  res.json({ label });
});

/**
 * PATCH /api/offers/:offerId/expiry
 * Owner-only — extend an offer's expiry date.
 * Body: { extendDays: number }
 */
router.patch('/:offerId/expiry', requireAuth, async (req, res) => {
  const { extendDays } = req.body;

  if (!extendDays || typeof extendDays !== 'number' || extendDays < 1 || extendDays > 30) {
    return res.status(400).json({ error: 'extendDays must be a number between 1 and 30' });
  }

  const offer = await store.getOffer(req.params.offerId);
  if (!offer) return res.status(404).json({ error: 'Offer not found' });
  if (offer.ownerEmail !== req.session.user.email) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const newExpiry = new Date(new Date(offer.expiresAt).getTime() + extendDays * 24 * 60 * 60 * 1000);
  await store.updateOffer(offer.id, {
    expiresAt: newExpiry.toISOString(),
    status: 'active',
  });

  res.json({ expiresAt: newExpiry.toISOString() });
});

/**
 * POST /api/offers/:offerId/revoke
 * Owner-only — immediately expire an offer.
 */
router.post('/:offerId/revoke', requireAuth, async (req, res) => {
  const offer = await store.getOffer(req.params.offerId);
  if (!offer) return res.status(404).json({ error: 'Offer not found' });
  if (offer.ownerEmail !== req.session.user.email) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  await store.updateOffer(offer.id, { status: 'expired' });
  res.json({ status: 'expired' });
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

  // Filter out past slots — silently remove any slot whose start time has passed
  const now = new Date();
  slots = slots.filter((s) => new Date(s.start) > now);

  // Live calendar check — filter out slots that now conflict with owner's calendar
  if (offer.tokens) {
    try {
      const { calendar } = createCalendarClient(offer.tokens);

      const availableSlots = slots.filter((s) => s.status === 'available');
      if (availableSlots.length > 0) {
        const { earliest, latest } = getSlotBounds(availableSlots);

        const busyEvents = await fetchBusyEvents(calendar, earliest, latest);

        // Remove slots that now conflict — hide entirely (don't show as unavailable)
        slots = slots.filter((s) => {
          if (s.status !== 'available') return false; // already claimed — hide
          const slotStart = new Date(s.start).getTime();
          const slotEnd = new Date(s.end).getTime();
          return !hasConflict(slotStart, slotEnd, busyEvents);
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

  // If no slots remain after filtering, treat as stale
  if (slots.length === 0) {
    return res.status(410).json({ error: 'All offered times have passed or are no longer available', code: 'offer_stale' });
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

  // Check if the slot's start time has already passed
  if (new Date(slot.start) <= new Date()) {
    return res.status(410).json({ error: 'This time has already passed. Please pick another slot.', code: 'slot_expired' });
  }

  // Real-time conflict check against owner's Google Calendar
  try {
    const { oauth2Client, calendar } = createCalendarClient(offer.tokens);

    const slotStart = new Date(slot.start);
    const slotEnd = new Date(slot.end);

    // Check for conflicts in the slot's time window
    const conflicts = await fetchBusyEvents(calendar, slotStart, slotEnd);

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
      calendarId: CALENDAR_ID,
      conferenceDataVersion: 1,
      requestBody: {
        summary: `Meeting with ${name}`,
        start: { dateTime: slot.start },
        end: { dateTime: slot.end },
        attendees: [
          { email: offer.ownerEmail, responseStatus: 'accepted' },
          { email },
        ],
        description: `Reschedule: ${process.env.FRONTEND_URL || 'https://openslot-653554267204.us-east1.run.app'}/reschedule/${offer.id}\n\nBooked via OpenSlot by ${name} (${email})`,
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
      sendUpdates: 'all',
    });

    // Mark slot as claimed — include calendarEventId for rescheduling
    await store.claimSlot(offer.id, slotIndex, { name, email, calendarEventId: event.data.id });

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
 * GET /api/offers/:offerId/reschedule
 * Public — fetch available slots for rescheduling.
 */
router.get('/:offerId/reschedule', async (req, res) => {
  const offer = await store.getOffer(req.params.offerId);

  if (!offer) {
    return res.status(404).json({ error: 'Offer not found' });
  }

  // Only claimed offers can be rescheduled
  const claimedSlot = offer.slots.find((s) => s.status === 'claimed' && s.bookedBy);
  if (!claimedSlot) {
    return res.status(400).json({ error: 'No booking found to reschedule', code: 'not_claimed' });
  }

  // Check if the original meeting end time has passed
  if (new Date(claimedSlot.end) <= new Date()) {
    return res.status(410).json({ error: 'This meeting has already passed and can no longer be rescheduled.', code: 'reschedule_expired' });
  }

  const now = new Date();

  // Get available slots from the original offer windows with live conflict check
  let availableSlots = offer.slots
    .map((s, idx) => ({ ...s, idx }))
    .filter((s) => s.status === 'available' && new Date(s.start) > now);

  if (offer.tokens && availableSlots.length > 0) {
    try {
      const { calendar } = createCalendarClient(offer.tokens);
      const { earliest, latest } = getSlotBounds(availableSlots);
      const busyEvents = await fetchBusyEvents(calendar, earliest, latest);

      availableSlots = availableSlots.filter((s) => {
        const slotStart = new Date(s.start).getTime();
        const slotEnd = new Date(s.end).getTime();
        return !hasConflict(slotStart, slotEnd, busyEvents);
      });
    } catch (err) {
      console.error('Reschedule live check failed, using snapshot:', err.message);
    }
  }

  res.json({
    offer: {
      id: offer.id,
      duration: offer.duration,
      timezone: offer.timezone,
      slots: availableSlots.map((s) => ({ start: s.start, end: s.end, idx: s.idx })),
    },
    currentBooking: {
      start: claimedSlot.start,
      end: claimedSlot.end,
      name: claimedSlot.bookedBy.name,
    },
  });
});

/**
 * POST /api/offers/:offerId/reschedule
 * Public — reschedule a booking to a new slot.
 * Body: { slotIndex }
 */
router.post('/:offerId/reschedule', rateLimit({ maxAttempts: 10, windowMs: 15 * 60 * 1000 }), async (req, res) => {
  const { slotIndex } = req.body;

  if (typeof slotIndex !== 'number') {
    return res.status(400).json({ error: 'slotIndex is required' });
  }

  const offer = await store.getOffer(req.params.offerId);

  if (!offer) {
    return res.status(404).json({ error: 'Offer not found' });
  }

  // Find the currently claimed slot
  const claimedIdx = offer.slots.findIndex((s) => s.status === 'claimed' && s.bookedBy);
  const claimedSlot = claimedIdx >= 0 ? offer.slots[claimedIdx] : null;

  if (!claimedSlot) {
    return res.status(400).json({ error: 'No booking found to reschedule', code: 'not_claimed' });
  }

  // Check if the original meeting end time has passed
  if (new Date(claimedSlot.end) <= new Date()) {
    return res.status(410).json({ error: 'This meeting has already passed and can no longer be rescheduled.', code: 'reschedule_expired' });
  }

  const newSlot = offer.slots[slotIndex];
  if (!newSlot) {
    return res.status(400).json({ error: 'Invalid slot index' });
  }

  if (newSlot.status !== 'available') {
    return res.status(409).json({ error: 'This slot is not available', code: 'slot_claimed' });
  }

  // Check if the new slot's start time has passed
  if (new Date(newSlot.start) <= new Date()) {
    return res.status(410).json({ error: 'This time has already passed. Please pick another slot.', code: 'slot_expired' });
  }

  try {
    const { calendar } = createCalendarClient(offer.tokens);

    // Live conflict check on the new slot
    const conflicts = await fetchBusyEvents(calendar, new Date(newSlot.start), new Date(newSlot.end));

    if (conflicts.length > 0) {
      return res.status(409).json({ error: 'This time slot is no longer available', code: 'slot_conflict' });
    }

    // Patch the existing calendar event — only update start/end
    const calendarEventId = claimedSlot.bookedBy.calendarEventId;
    await calendar.events.patch({
      calendarId: CALENDAR_ID,
      eventId: calendarEventId,
      requestBody: {
        start: { dateTime: newSlot.start },
        end: { dateTime: newSlot.end },
      },
      sendUpdates: 'all',
    });

    // Free up the old slot, claim the new one
    const updatedSlots = [...offer.slots];
    updatedSlots[claimedIdx] = { ...updatedSlots[claimedIdx], status: 'available', bookedBy: null };
    updatedSlots[slotIndex] = {
      ...updatedSlots[slotIndex],
      status: 'claimed',
      bookedBy: { ...claimedSlot.bookedBy },
    };

    // Update offer status — if it was fully claimed before, it's active again
    const allClaimed = updatedSlots.every((s) => s.status === 'claimed');
    const newStatus = allClaimed ? 'claimed' : 'active';

    await store.updateOffer(offer.id, { slots: updatedSlots, status: newStatus });

    res.json({
      success: true,
      booking: {
        slot: { start: newSlot.start, end: newSlot.end },
      },
    });
  } catch (err) {
    console.error('Reschedule error:', err.message);
    if (err.code === 401) {
      return res.status(401).json({ error: 'Owner calendar access expired', code: 'auth_expired' });
    }
    res.status(500).json({ error: 'Failed to reschedule booking' });
  }
});

/**
 * Check if ALL available slots in an offer conflict with current calendar.
 */
async function checkAllSlotsConflicted(offer, calendar) {
  const availableSlots = offer.slots.filter((s) => s.status === 'available');
  if (availableSlots.length === 0) return true;

  // Find the earliest and latest slot times for a single query
  const { earliest, latest } = getSlotBounds(availableSlots);

  const busyEvents = await fetchBusyEvents(calendar, earliest, latest);

  // Check each available slot for conflicts
  for (const slot of availableSlots) {
    const slotStart = new Date(slot.start).getTime();
    const slotEnd = new Date(slot.end).getTime();

    if (!hasConflict(slotStart, slotEnd, busyEvents)) return false; // At least one slot is still free
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
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;
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
    `Subject: ${encodedSubject}`,
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
