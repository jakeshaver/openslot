const express = require('express');
const { google } = require('googleapis');
const { createOAuth2Client } = require('../config/google');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/events', requireAuth, async (req, res) => {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(req.session.tokens);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const now = new Date();
    const oneWeekLater = new Date(now);
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);

    const response = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      timeMin: now.toISOString(),
      timeMax: oneWeekLater.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    // Refresh tokens if updated
    if (oauth2Client.credentials.access_token !== req.session.tokens.access_token) {
      req.session.tokens = oauth2Client.credentials;
    }

    res.json({ events: response.data.items || [] });
  } catch (err) {
    console.error('Calendar fetch error:', err.message);
    if (err.code === 401) {
      return res.status(401).json({ error: 'Token expired, please re-authenticate' });
    }
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

module.exports = router;
