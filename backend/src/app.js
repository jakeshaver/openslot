const express = require('express');
const cookieSession = require('cookie-session');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const calendarRoutes = require('./routes/calendar');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

app.use(cookieSession({
  name: 'openslot_session',
  keys: [process.env.SESSION_SECRET || 'dev-secret-change-me'],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
}));

app.use('/auth', authRoutes);
app.use('/api/calendar', calendarRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;
