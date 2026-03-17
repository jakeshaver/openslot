import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || '';

function formatWindowFallback(windows) {
  if (!windows || windows.length === 0) return 'Untitled offer';
  const win = windows[0];
  const start = new Date(win.start);
  const end = new Date(win.end);
  const day = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const startTime = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const endTime = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day}, ${startTime}–${endTime}`;
}

function StatusBadge({ status }) {
  let className = 'offer-badge';
  let label = status;
  if (status === 'active') { className += ' badge-active'; label = 'Active'; }
  else if (status === 'claimed') { className += ' badge-claimed'; label = 'Claimed'; }
  else { className += ' badge-expired'; label = 'Expired'; }
  return <span className={className}>{label}</span>;
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text));
  }
  return Promise.resolve(fallbackCopy(text));
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  try { document.execCommand('copy'); return true; }
  catch { return false; }
  finally { document.body.removeChild(textarea); }
}

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [extendingId, setExtendingId] = useState(null);
  const [revokingId, setRevokingId] = useState(null);

  const fetchOffers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/offers`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setOffers(data.offers);
      }
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const handleCopyLink = async (offerId) => {
    const url = `${window.location.origin}/book/${offerId}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedId(offerId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleExtend = async (offerId, days) => {
    try {
      const res = await fetch(`${API_BASE}/api/offers/${offerId}/expiry`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extendDays: days }),
      });
      if (res.ok) {
        setExtendingId(null);
        await fetchOffers();
      }
    } catch { /* silently fail */ }
  };

  const handleRevoke = async (offerId) => {
    try {
      const res = await fetch(`${API_BASE}/api/offers/${offerId}/revoke`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setRevokingId(null);
        await fetchOffers();
      }
    } catch { /* silently fail */ }
  };

  const activeOffers = offers.filter((o) => o.status === 'active' || o.status === 'claimed');
  const expiredOffers = offers.filter((o) => o.status === 'expired');

  if (loading) {
    return (
      <div className="offers-page">
        <div className="loading-screen">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
      </div>
    );
  }

  return (
    <div className="offers-page">
      <a href="/" className="settings-back-link">&larr; Back to calendar</a>
      <div className="offers-panel">
        <h2>Your Offers</h2>

        {offers.length === 0 && (
          <p className="offers-empty">No offers yet. Generate one from the calendar view.</p>
        )}

        {activeOffers.length > 0 && (
          <div className="offers-section">
            {activeOffers.map((offer) => (
              <div key={offer.id} className="offer-row">
                <div className="offer-row-main">
                  <div className="offer-row-label">
                    {offer.label || formatWindowFallback(offer.windows)}
                  </div>
                  <StatusBadge status={offer.status} />
                </div>
                <div className="offer-row-meta">
                  <span>Created {new Date(offer.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span>Expires {new Date(offer.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  {offer.status === 'claimed' && offer.slots && (() => {
                    const claimed = offer.slots.find((s) => s.status === 'claimed' && s.bookedBy);
                    return claimed ? <span className="offer-booked-by">Booked by {claimed.bookedBy.name}</span> : null;
                  })()}
                </div>
                <div className="offer-row-actions">
                  <button
                    className={`btn-offer-action${copiedId === offer.id ? ' copied' : ''}`}
                    onClick={() => handleCopyLink(offer.id)}
                  >
                    {copiedId === offer.id ? 'Copied!' : 'Copy Link'}
                  </button>

                  {extendingId === offer.id ? (
                    <div className="extend-options">
                      {[7, 14, 30].map((d) => (
                        <button key={d} className="btn-extend-option" onClick={() => handleExtend(offer.id, d)}>
                          +{d}d
                        </button>
                      ))}
                      <button className="btn-extend-cancel" onClick={() => setExtendingId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <button className="btn-offer-action" onClick={() => setExtendingId(offer.id)}>
                      Extend
                    </button>
                  )}

                  {revokingId === offer.id ? (
                    <div className="revoke-confirm">
                      <span>Are you sure?</span>
                      <button className="btn-revoke-yes" onClick={() => handleRevoke(offer.id)}>Yes</button>
                      <button className="btn-extend-cancel" onClick={() => setRevokingId(null)}>No</button>
                    </div>
                  ) : (
                    <button className="btn-offer-action btn-revoke" onClick={() => setRevokingId(offer.id)}>
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {expiredOffers.length > 0 && (
          <div className="offers-section offers-expired-section">
            <h3 className="offers-section-title">Expired</h3>
            {expiredOffers.map((offer) => (
              <div key={offer.id} className="offer-row offer-row-expired">
                <div className="offer-row-main">
                  <div className="offer-row-label">
                    {offer.label || formatWindowFallback(offer.windows)}
                  </div>
                  <StatusBadge status={offer.status} />
                </div>
                <div className="offer-row-meta">
                  <span>Created {new Date(offer.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span>Expired {new Date(offer.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  {offer.slots && (() => {
                    const claimed = offer.slots.find((s) => s.status === 'claimed' && s.bookedBy);
                    return claimed ? <span className="offer-booked-by">Booked by {claimed.bookedBy.name}</span> : null;
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
