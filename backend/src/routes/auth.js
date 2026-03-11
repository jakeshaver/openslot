const express = require('express');
const { createOAuth2Client, SCOPES } = require('../config/google');

const router = express.Router();

router.get('/google', (req, res) => {
  const oauth2Client = createOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
  res.redirect(authUrl);
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const { google } = require('googleapis');
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    req.session.tokens = tokens;
    req.session.user = {
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
    };

    res.redirect(process.env.FRONTEND_URL || '/');
  } catch (err) {
    console.error('OAuth callback error:', err.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

router.get('/me', (req, res) => {
  if (!req.session || !req.session.tokens) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ user: req.session.user });
});

router.post('/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

module.exports = router;
