import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import WeekGrid from './components/WeekGrid';
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

// Format a time window as a single line with range
function formatWindowLine(win) {
  const start = new Date(win.start);
  const end = new Date(win.end);
  const day = start.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const startTime = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const endTime = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  return `${day} @ ${startTime}–${endTime}`;
}

// Generate message with offer link — one line per window
function generateMessage(offer) {
  const baseUrl = window.location.origin;

  if (!offer || !offer.windows) {
    return 'Something went wrong generating your message.';
  }

  const lines = offer.windows.map((w, idx) => {
    return `  ${formatWindowLine(w)} → ${baseUrl}/book/${offer.id}?window=${idx}`;
  });

  return `Hi — happy to connect! Here are a few times that work on my end:\n\n${lines.join('\n')}\n\nJust click whichever works best — it'll book directly on my calendar.`;
}

function App() {
  const [user, setUser] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(30);
  const weekGridRef = useRef(null);

  // Selection state (driven by WeekGrid callback)
  const [selectedCount, setSelectedCount] = useState(0);

  // Send Slots modal state
  const [sendSaving, setSendSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [offerData, setOfferData] = useState(null);
  const [modalCopied, setModalCopied] = useState(false);

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
        body: JSON.stringify({ windows, duration: offerDuration, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
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

  // Copy Availability Link
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkSaving, setLinkSaving] = useState(false);

  const handleCopyAvailabilityLink = useCallback(async () => {
    if (linkSaving) return;
    setLinkSaving(true);
    try {
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

  // Send Slots — get windows from WeekGrid, create offer, show modal
  const handleSendSlots = useCallback(async () => {
    if (sendSaving || !weekGridRef.current) return;
    setSendSaving(true);
    try {
      const windows = weekGridRef.current.getSelectedWindows();
      const offer = await createOffer(windows, duration);
      setOfferData(offer);
      setShowModal(true);
      setModalCopied(false);
    } finally {
      setSendSaving(false);
    }
  }, [sendSaving, duration, createOffer]);

  const handleModalCopy = async () => {
    const msg = generateMessage(offerData);
    await navigator.clipboard.writeText(msg);
    setModalCopied(true);
    setTimeout(() => setModalCopied(false), 2000);
  };

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
                {selectedCount > 0 && (
                  <button
                    className="btn-primary"
                    disabled={sendSaving}
                    onClick={handleSendSlots}
                  >
                    {sendSaving ? 'Saving...' : 'Send Slots'}
                  </button>
                )}
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
            ) : (
              <WeekGrid
                ref={weekGridRef}
                slots={slots}
                onWeekChange={fetchAvailability}
                duration={duration}
                onDurationChange={setDuration}
                onSelectionChange={setSelectedCount}
              />
            )}
          </main>

          {showModal && (
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
              <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <h3>Your message</h3>
                <div className="message-preview">{generateMessage(offerData)}</div>
                <div className="modal-actions">
                  <button className="btn-ghost" onClick={() => setShowModal(false)}>Close</button>
                  <button className={`btn-copy${modalCopied ? ' copied' : ''}`} onClick={handleModalCopy}>
                    {modalCopied ? 'Copied!' : 'Copy to clipboard'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      } />
    </Routes>
  );
}

export default App;
