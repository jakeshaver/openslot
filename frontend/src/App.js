import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function App() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const fetchEvents = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/api/calendar/events`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data.events);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user) fetchEvents();
  }, [user, fetchEvents]);

  const handleSignIn = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  const handleSignOut = async () => {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
    setUser(null);
    setEvents([]);
  };

  const formatTime = (dateTime, date) => {
    if (date) return 'All day';
    return new Date(dateTime).toLocaleString();
  };

  if (loading) {
    return <div className="app"><p>Loading...</p></div>;
  }

  return (
    <div className="app">
      <header>
        <h1>OpenSlot</h1>
        {user && (
          <div className="user-info">
            <span>{user.name}</span>
            <button onClick={handleSignOut}>Sign Out</button>
          </div>
        )}
      </header>

      <main>
        {!user ? (
          <div className="sign-in">
            <h2>Schedule smarter. No fees.</h2>
            <p>Connect your Google Calendar to get started.</p>
            <button className="google-btn" onClick={handleSignIn}>
              Sign in with Google
            </button>
          </div>
        ) : (
          <div className="events">
            <h2>Your next 7 days</h2>
            {error && <p className="error">{error}</p>}
            {events.length === 0 && !error ? (
              <p>No events found — your week is wide open!</p>
            ) : (
              <ul>
                {events.map((event) => (
                  <li key={event.id} className="event-card">
                    <strong>{event.summary || '(No title)'}</strong>
                    <span className="event-time">
                      {formatTime(event.start?.dateTime, event.start?.date)}
                      {' — '}
                      {formatTime(event.end?.dateTime, event.end?.date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
