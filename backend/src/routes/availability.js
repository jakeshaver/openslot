const express = require('express');
const { createCalendarClient } = require('../helpers/calendar');
const { requireAuth } = require('../middleware/auth');
const { calculateAvailability, DEFAULT_CONFIG } = require('../availability');
const store = require('../store');

const router = express.Router();

/**
 * GET /api/availability
 *
 * Returns free time slots only. No event details are ever exposed.
 * Loads user's saved settings from Firestore, falls back to defaults.
 * Query params: daysAhead, minSlotMinutes, bufferMinutes, timezone,
 *               workingStart, workingEnd, weekStart (ISO date)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { oauth2Client, calendar } = createCalendarClient(req.session.tokens);

    // Load user's saved settings
    const userSettings = await store.getSettings(req.session.user.email) || {};

    const config = {
      ...DEFAULT_CONFIG,
      daysAhead: parseInt(req.query.daysAhead, 10) || DEFAULT_CONFIG.daysAhead,
      minSlotMinutes: parseInt(req.query.minSlotMinutes, 10) || DEFAULT_CONFIG.minSlotMinutes,
      bufferMinutes: userSettings.bufferMinutes ?? DEFAULT_CONFIG.bufferMinutes,
      timezone: req.query.timezone || DEFAULT_CONFIG.timezone,
    };

    // Apply saved working hours
    if (userSettings.workingHours) {
      config.workingHours = userSettings.workingHours;
    }

    // Apply saved working days
    if (userSettings.workingDays) {
      config.workingDays = userSettings.workingDays;
    }

    // Query param overrides (for backward compat)
    if (req.query.workingStart && req.query.workingEnd) {
      config.workingHours = {
        start: req.query.workingStart,
        end: req.query.workingEnd,
      };
    }

    // Support custom start date for week navigation
    const startDate = req.query.weekStart ? new Date(req.query.weekStart) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + config.daysAhead);

    const response = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    // Refresh tokens if updated
    if (oauth2Client.credentials.access_token !== req.session.tokens.access_token) {
      req.session.tokens = oauth2Client.credentials;
    }

    // PRIVACY: Only free slots are returned — never event details
    const slots = calculateAvailability(response.data.items || [], {
      ...config,
      _startDate: startDate, // pass custom start to engine
    });

    res.json({ slots, config: { ...config } });
  } catch (err) {
    console.error('Availability fetch error:', err.message);
    if (err.code === 401) {
      return res.status(401).json({ error: 'Token expired, please re-authenticate' });
    }
    res.status(500).json({ error: 'Failed to calculate availability' });
  }
});

module.exports = router;
