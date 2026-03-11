import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import WeekGrid from './components/WeekGrid';
import BookingPage from './components/BookingPage';
import PublicBooking from './components/PublicBooking';
import './App.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('owner');
  const [duration, setDuration] = useState(30);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch {
      // Not authenticated
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAvailability = useCallback(async (weekStart) => {
    try {
      const params = new URLSearchParams();
      if (weekStart) params.set('weekStart', weekStart);
      params.set('daysAhead', '7');
      const res = await fetch(`${API_BASE}/api/availability?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch availability');
      const data = await res.json();
      setSlots(data.slots);
    } catch {
      // Error handled silently
    }
  }, []);

  const createOffer = useCallback(async (windows, offerDuration) => {
    try {
      const res = await fetch(`${API_BASE}/api/offers`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ windows, duration: offerDuration }),
      });
      if (!res.ok) throw new Error('Failed to create offer');
      const data = await res.json();
      return data.offer;
    } catch (err) {
      console.error('Create offer error:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user) fetchAvailability();
  }, [user, fetchAvailability]);

  const handleSignIn = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  const handleSignOut = async () => {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
    setUser(null);
    setSlots([]);
  };

  const [linkCopied, setLinkCopied] = useState(false);
  const [linkSaving, setLinkSaving] = useState(false);

  const handleCopyAvailabilityLink = useCallback(async () => {
    if (linkSaving) return;
    setLinkSaving(true);
    try {
      // Build contiguous windows from all available slots
      const windows = [];
      const sorted = [...slots].sort((a, b) => new Date(a.start) - new Date(b.start));
      for (const slot of sorted) {
        const last = windows[windows.length - 1];
        if (last && new Date(last.end).getTime() >= new Date(slot.start).getTime()) {
          if (new Date(slot.end) > new Date(last.end)) {
            last.end = slot.end;
          }
        } else {
          windows.push({ start: slot.start, end: slot.end });
        }
      }

      const offer = await createOffer(windows, duration);
      if (offer) {
        const url = `${window.location.origin}/book/${offer.id}`;
        await navigator.clipboard.writeText(url);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }
    } finally {
      setLinkSaving(false);
    }
  }, [slots, duration, createOffer, linkSaving]);

  if (loading) {
    return (
      <div className="app-shell">
        <div className="loading-screen">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/book/:offerId" element={<PublicBooking />} />
      <Route path="*" element={
        <div className="app-shell">
          <header className="app-header">
            <div className="app-logo">Open<span>Slot</span></div>
            {user && (
              <div className="app-header-right">
                <div className="duration-selector">
                  <button
                    className={`duration-btn${view === 'owner' ? ' active' : ''}`}
                    onClick={() => setView('owner')}
                  >
                    My Slots
                  </button>
                  <button
                    className={`duration-btn${view === 'booking' ? ' active' : ''}`}
                    onClick={() => setView('booking')}
                  >
                    Booking Preview
                  </button>
                </div>
                <button
                  className={`btn-copy-link${linkCopied ? ' copied' : ''}`}
                  disabled={slots.length === 0 || linkSaving}
                  onClick={handleCopyAvailabilityLink}
                >
                  {linkSaving ? 'Saving...' : linkCopied ? 'Copied!' : 'Copy Availability Link'}
                </button>
                <span className="user-name">{user.name}</span>
                <button className="btn-ghost" onClick={handleSignOut}>Sign Out</button>
              </div>
            )}
          </header>

          <main className="app-main">
            {!user ? (
              <div className="sign-in-page">
                <div className="sign-in-card">
                  <h2>Schedule smarter.<br/>No fees. Ever.</h2>
                  <p>Connect your Google Calendar, pick your available slots, and share a single link. Recipients book in one click.</p>
                  <button className="btn-google" onClick={handleSignIn}>
                    <GoogleIcon />
                    Sign in with Google
                  </button>
                </div>
              </div>
            ) : view === 'owner' ? (
              <WeekGrid
                slots={slots}
                onWeekChange={fetchAvailability}
                onCreateOffer={createOffer}
                duration={duration}
                onDurationChange={setDuration}
              />
            ) : (
              <BookingPage slots={slots} duration={duration} />
            )}
          </main>
        </div>
      } />
    </Routes>
  );
}

export default App;
