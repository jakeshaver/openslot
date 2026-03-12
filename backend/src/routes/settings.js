const express = require('express');
const { requireAuth } = require('../middleware/auth');
const store = require('../store');

const router = express.Router();

/**
 * GET /api/settings
 * Returns the authenticated user's settings, or defaults if none saved.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const settings = await store.getSettings(req.session.user.email);
    res.json({ settings: settings || null });
  } catch (err) {
    console.error('Settings fetch error:', err.message);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

/**
 * PUT /api/settings
 * Save user settings.
 */
router.put('/', requireAuth, async (req, res) => {
  try {
    const { workingDays, workingHours, bufferMinutes, defaultDuration } = req.body;

    const settings = {};
    if (workingDays !== undefined) settings.workingDays = workingDays;
    if (workingHours !== undefined) settings.workingHours = workingHours;
    if (bufferMinutes !== undefined) settings.bufferMinutes = bufferMinutes;
    if (defaultDuration !== undefined) settings.defaultDuration = defaultDuration;

    await store.saveSettings(req.session.user.email, settings);
    res.json({ settings });
  } catch (err) {
    console.error('Settings save error:', err.message);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

module.exports = router;
