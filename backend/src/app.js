const express = require('express');
const cookieSession = require('cookie-session');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const calendarRoutes = require('./routes/calendar');
const availabilityRoutes = require('./routes/availability');
const offersRoutes = require('./routes/offers');

const app = express();

// Trust Cloud Run's reverse proxy so secure cookies work
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

app.use(express.json());

app.use(cookieSession({
  name: 'openslot_session',
  keys: [process.env.SESSION_SECRET],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
}));

app.use('/auth', authRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/offers', offersRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve React frontend static files in production
const path = require('path');
const frontendBuild = path.join(__dirname, '../../frontend/build');
app.use(express.static(frontendBuild));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuild, 'index.html'));
});

module.exports = app;
