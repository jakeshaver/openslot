import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || '';
const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Friendly timezone entries: { iana, label, abbr, searchTerms }
const TZ_DATA = [
  { iana: 'Pacific/Honolulu', label: 'Hawaii Time', abbr: 'HST', searchTerms: 'hawaii honolulu hst pacific' },
  { iana: 'America/Anchorage', label: 'Alaska Time', abbr: 'AKT', searchTerms: 'alaska anchorage akt' },
  { iana: 'America/Los_Angeles', label: 'Pacific Time', abbr: 'PT', searchTerms: 'pacific los angeles seattle san francisco vancouver pst pdt pt west coast' },
  { iana: 'America/Phoenix', label: 'Arizona Time', abbr: 'MST', searchTerms: 'arizona phoenix mst mountain no dst' },
  { iana: 'America/Denver', label: 'Mountain Time', abbr: 'MT', searchTerms: 'mountain denver salt lake mst mdt mt colorado' },
  { iana: 'America/Chicago', label: 'Central Time', abbr: 'CT', searchTerms: 'central chicago dallas houston cst cdt ct midwest' },
  { iana: 'America/New_York', label: 'Eastern Time', abbr: 'ET', searchTerms: 'eastern new york boston miami atlanta est edt et east coast' },
  { iana: 'America/Halifax', label: 'Atlantic Time', abbr: 'AT', searchTerms: 'atlantic halifax nova scotia ast adt at' },
  { iana: 'America/St_Johns', label: 'Newfoundland Time', abbr: 'NT', searchTerms: 'newfoundland st johns nst ndt' },
  { iana: 'America/Sao_Paulo', label: 'Brasilia Time', abbr: 'BRT', searchTerms: 'brazil brasilia sao paulo brt south america' },
  { iana: 'America/Argentina/Buenos_Aires', label: 'Argentina Time', abbr: 'ART', searchTerms: 'argentina buenos aires art' },
  { iana: 'America/Mexico_City', label: 'Mexico City Time', abbr: 'CST', searchTerms: 'mexico city cst central' },
  { iana: 'America/Bogota', label: 'Colombia Time', abbr: 'COT', searchTerms: 'colombia bogota cot lima peru' },
  { iana: 'America/Toronto', label: 'Toronto (Eastern)', abbr: 'ET', searchTerms: 'toronto canada eastern est edt ontario' },
  { iana: 'America/Vancouver', label: 'Vancouver (Pacific)', abbr: 'PT', searchTerms: 'vancouver canada pacific pst pdt british columbia' },
  { iana: 'Europe/London', label: 'London (GMT/BST)', abbr: 'GMT', searchTerms: 'london uk united kingdom gmt bst greenwich britain england' },
  { iana: 'Europe/Dublin', label: 'Dublin (GMT/IST)', abbr: 'GMT', searchTerms: 'dublin ireland gmt ist' },
  { iana: 'Europe/Paris', label: 'Central European Time', abbr: 'CET', searchTerms: 'paris france cet cest central european' },
  { iana: 'Europe/Berlin', label: 'Berlin (CET)', abbr: 'CET', searchTerms: 'berlin germany cet cest' },
  { iana: 'Europe/Amsterdam', label: 'Amsterdam (CET)', abbr: 'CET', searchTerms: 'amsterdam netherlands cet cest' },
  { iana: 'Europe/Madrid', label: 'Madrid (CET)', abbr: 'CET', searchTerms: 'madrid spain cet cest' },
  { iana: 'Europe/Rome', label: 'Rome (CET)', abbr: 'CET', searchTerms: 'rome italy cet cest' },
  { iana: 'Europe/Zurich', label: 'Zurich (CET)', abbr: 'CET', searchTerms: 'zurich switzerland cet cest' },
  { iana: 'Europe/Stockholm', label: 'Stockholm (CET)', abbr: 'CET', searchTerms: 'stockholm sweden cet cest' },
  { iana: 'Europe/Warsaw', label: 'Warsaw (CET)', abbr: 'CET', searchTerms: 'warsaw poland cet cest' },
  { iana: 'Europe/Athens', label: 'Eastern European Time', abbr: 'EET', searchTerms: 'athens greece eet eest eastern european' },
  { iana: 'Europe/Bucharest', label: 'Bucharest (EET)', abbr: 'EET', searchTerms: 'bucharest romania eet eest' },
  { iana: 'Europe/Helsinki', label: 'Helsinki (EET)', abbr: 'EET', searchTerms: 'helsinki finland eet eest' },
  { iana: 'Europe/Moscow', label: 'Moscow Time', abbr: 'MSK', searchTerms: 'moscow russia msk' },
  { iana: 'Europe/Istanbul', label: 'Turkey Time', abbr: 'TRT', searchTerms: 'istanbul turkey trt' },
  { iana: 'Africa/Cairo', label: 'Cairo (EET)', abbr: 'EET', searchTerms: 'cairo egypt eet' },
  { iana: 'Africa/Lagos', label: 'West Africa Time', abbr: 'WAT', searchTerms: 'lagos nigeria wat west africa' },
  { iana: 'Africa/Johannesburg', label: 'South Africa Time', abbr: 'SAST', searchTerms: 'johannesburg south africa sast cape town' },
  { iana: 'Africa/Nairobi', label: 'East Africa Time', abbr: 'EAT', searchTerms: 'nairobi kenya eat east africa' },
  { iana: 'Asia/Dubai', label: 'Gulf Standard Time', abbr: 'GST', searchTerms: 'dubai uae gulf gst abu dhabi' },
  { iana: 'Asia/Riyadh', label: 'Arabia Standard Time', abbr: 'AST', searchTerms: 'riyadh saudi arabia ast' },
  { iana: 'Asia/Karachi', label: 'Pakistan Time', abbr: 'PKT', searchTerms: 'karachi pakistan pkt' },
  { iana: 'Asia/Kolkata', label: 'India Standard Time', abbr: 'IST', searchTerms: 'india kolkata mumbai delhi ist calcutta bangalore' },
  { iana: 'Asia/Dhaka', label: 'Bangladesh Time', abbr: 'BST', searchTerms: 'dhaka bangladesh bst' },
  { iana: 'Asia/Bangkok', label: 'Indochina Time', abbr: 'ICT', searchTerms: 'bangkok thailand ict indochina vietnam' },
  { iana: 'Asia/Singapore', label: 'Singapore Time', abbr: 'SGT', searchTerms: 'singapore sgt malaysia kuala lumpur' },
  { iana: 'Asia/Shanghai', label: 'China Standard Time', abbr: 'CST', searchTerms: 'shanghai china cst beijing' },
  { iana: 'Asia/Hong_Kong', label: 'Hong Kong Time', abbr: 'HKT', searchTerms: 'hong kong hkt' },
  { iana: 'Asia/Taipei', label: 'Taipei Time', abbr: 'CST', searchTerms: 'taipei taiwan cst' },
  { iana: 'Asia/Tokyo', label: 'Japan Standard Time', abbr: 'JST', searchTerms: 'tokyo japan jst osaka' },
  { iana: 'Asia/Seoul', label: 'Korea Standard Time', abbr: 'KST', searchTerms: 'seoul korea kst' },
  { iana: 'Australia/Perth', label: 'Australian Western', abbr: 'AWST', searchTerms: 'perth australia western awst' },
  { iana: 'Australia/Adelaide', label: 'Australian Central', abbr: 'ACST', searchTerms: 'adelaide australia central acst acdt' },
  { iana: 'Australia/Sydney', label: 'Australian Eastern', abbr: 'AEST', searchTerms: 'sydney australia eastern aest aedt melbourne' },
  { iana: 'Australia/Melbourne', label: 'Melbourne (AEST)', abbr: 'AEST', searchTerms: 'melbourne australia eastern aest aedt' },
  { iana: 'Pacific/Auckland', label: 'New Zealand Time', abbr: 'NZST', searchTerms: 'auckland new zealand nzst nzdt' },
  { iana: 'Pacific/Fiji', label: 'Fiji Time', abbr: 'FJT', searchTerms: 'fiji fjt' },
];

function getTzLabel(iana) {
  const entry = TZ_DATA.find((t) => t.iana === iana);
  if (entry) return `${entry.label} (${entry.abbr})`;
  return iana.replace(/_/g, ' ').replace(/^.*\//, '');
}

function getMonthData(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, currentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, currentMonth: true });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, currentMonth: false });
  }
  return cells;
}

export default function PublicBooking() {
  const { offerId } = useParams();
  const [searchParams] = useSearchParams();
  const preselectedSlot = searchParams.get('slot');
  const preselectedWindow = searchParams.get('window');

  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlotIdx, setSelectedSlotIdx] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [bookingName, setBookingName] = useState('');
  const [bookingEmail, setBookingEmail] = useState('');
  const [emailError, setEmailError] = useState(null);
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [tzOpen, setTzOpen] = useState(false);
  const [tzSearch, setTzSearch] = useState('');
  const tzInputRef = useRef(null);
  const tzWrapperRef = useRef(null);

  // Fetch offer
  const fetchOffer = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/api/offers/${offerId}`);
      if (res.status === 404) {
        setError('This booking link is invalid or has been removed.');
        setErrorCode('not_found');
        return;
      }
      if (res.status === 410) {
        const data = await res.json();
        setError('This booking link has expired. Please ask for a new one.');
        setErrorCode(data.code || 'offer_expired');
        return;
      }
      if (!res.ok) throw new Error('Failed to load booking page');
      const data = await res.json();
      setOffer(data.offer);

      // Auto-select date from preselected window
      if (preselectedWindow !== null && data.offer.windows && data.offer.windows[parseInt(preselectedWindow, 10)]) {
        const win = data.offer.windows[parseInt(preselectedWindow, 10)];
        const dateStr = new Date(win.start).toLocaleDateString('en-CA', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
        setSelectedDate(dateStr);
        const month = new Date(win.start);
        setViewYear(month.getFullYear());
        setViewMonth(month.getMonth());
      }
      // Auto-select date from preselected slot (legacy)
      else if (preselectedSlot !== null && data.offer.slots[parseInt(preselectedSlot, 10)]) {
        const slot = data.offer.slots[parseInt(preselectedSlot, 10)];
        const dateStr = new Date(slot.start).toLocaleDateString('en-CA', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
        setSelectedDate(dateStr);
        if (slot.status === 'available') {
          setSelectedSlotIdx(parseInt(preselectedSlot, 10));
          setShowForm(true);
        }
      }
    } catch (err) {
      setError('Something went wrong loading this page.');
      setErrorCode('unknown');
    } finally {
      setLoading(false);
    }
  }, [offerId, preselectedSlot, preselectedWindow]);

  useEffect(() => {
    fetchOffer();
  }, [fetchOffer]);

  // Close timezone dropdown on click outside
  useEffect(() => {
    if (!tzOpen) return;
    const handleClickOutside = (e) => {
      if (tzWrapperRef.current && !tzWrapperRef.current.contains(e.target)) {
        setTzOpen(false);
        setTzSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tzOpen]);

  // Group slots by date in the selected timezone
  const slotsByDate = useMemo(() => {
    if (!offer) return {};
    const map = {};
    offer.slots.forEach((slot, idx) => {
      const dateStr = new Date(slot.start).toLocaleDateString('en-CA', { timeZone: timezone });
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push({ ...slot, idx });
    });
    return map;
  }, [offer, timezone]);

  const datesWithSlots = useMemo(() => {
    const set = new Set();
    Object.entries(slotsByDate).forEach(([date, slots]) => {
      if (slots.some((s) => s.status === 'available')) set.add(date);
    });
    return set;
  }, [slotsByDate]);

  const monthCells = getMonthData(viewYear, viewMonth);
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const handleDayClick = (day, currentMonth) => {
    if (!currentMonth) return;
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!datesWithSlots.has(dateStr)) return;
    setSelectedDate(dateStr);
    setSelectedSlotIdx(null);
    setShowForm(false);
    setBookingError(null);
  };

  const handleSlotClick = (slotIdx) => {
    setSelectedSlotIdx(slotIdx);
    setShowForm(true);
    setBookingError(null);
  };

  const validateEmail = (email) => {
    const trimmed = email.trim();
    if (!trimmed) return null; // Don't show error on empty (required handles that)
    if (!trimmed.includes('@')) return 'Email must contain @';
    const afterAt = trimmed.split('@')[1];
    if (!afterAt || !afterAt.includes('.')) return 'Email must contain a . after @';
    return null;
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setBookingEmail(val);
    if (emailError) setEmailError(validateEmail(val));
  };

  const handleEmailBlur = () => {
    setEmailError(validateEmail(bookingEmail));
  };

  const isEmailValid = bookingEmail.trim() && !validateEmail(bookingEmail);

  const handleBook = async (e) => {
    e.preventDefault();
    const emailErr = validateEmail(bookingEmail);
    if (emailErr) {
      setEmailError(emailErr);
      return;
    }
    if (!bookingName.trim() || !bookingEmail.trim()) return;

    setBooking(true);
    setBookingError(null);

    try {
      const res = await fetch(`${API_BASE}/api/offers/${offerId}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotIndex: selectedSlotIdx,
          name: bookingName.trim(),
          email: bookingEmail.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'offer_expired') {
          setError('This booking link has expired. Please ask for a new one.');
          setErrorCode('offer_expired');
          return;
        }
        if (data.code === 'offer_stale') {
          setError('All offered times are no longer available. Please ask for new times.');
          setErrorCode('offer_stale');
          return;
        }
        if (data.code === 'slot_conflict') {
          setBookingError('This time is no longer available. Please pick another slot.');
          // Refresh offer to get updated statuses
          await fetchOffer();
          setShowForm(false);
          setSelectedSlotIdx(null);
          return;
        }
        if (data.code === 'slot_claimed') {
          setBookingError('This slot was just booked by someone else. Please pick another.');
          await fetchOffer();
          setShowForm(false);
          setSelectedSlotIdx(null);
          return;
        }
        throw new Error(data.error || 'Booking failed');
      }

      setBookingSuccess({
        slot: data.booking.slot,
        name: bookingName.trim(),
      });
    } catch (err) {
      setBookingError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  const todayStr = today.toLocaleDateString('en-CA', { timeZone: timezone });
  const selectedDaySlots = selectedDate ? (slotsByDate[selectedDate] || []) : [];
  const selectedDateLabel = selectedDate
    ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      })
    : null;

  // Loading state
  if (loading) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div className="app-logo">Open<span>Slot</span></div>
        </header>
        <main className="app-main">
          <div className="loading-screen">
            <div className="loading-dot" />
            <div className="loading-dot" />
            <div className="loading-dot" />
          </div>
        </main>
      </div>
    );
  }

  // Error / expired state
  if (error) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div className="app-logo">Open<span>Slot</span></div>
        </header>
        <main className="app-main">
          <div className="booking-error-page">
            <div className="booking-error-icon">
              {errorCode === 'offer_expired' || errorCode === 'offer_stale' ? '⏰' : '🔗'}
            </div>
            <h2>{errorCode === 'offer_expired' ? 'Link expired' : errorCode === 'offer_stale' ? 'Times unavailable' : 'Link not found'}</h2>
            <p>{error}</p>
          </div>
        </main>
      </div>
    );
  }

  // All slots claimed — no availability left
  const allSlotsClaimed = offer && offer.slots.every((s) => s.status !== 'available');
  if (!loading && !error && !bookingSuccess && allSlotsClaimed) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div className="app-logo">Open<span>Slot</span></div>
        </header>
        <main className="app-main">
          <div className="booking-error-page">
            <div className="booking-error-icon">📅</div>
            <h2>No times available</h2>
            <p>All offered times have been booked. Please contact the organizer directly for new availability.</p>
          </div>
        </main>
      </div>
    );
  }

  // Success state
  if (bookingSuccess) {
    const slot = bookingSuccess.slot;
    const startDate = new Date(slot.start);
    const endDate = new Date(slot.end);
    const dayLabel = startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: timezone });
    const startTime = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone });
    const endTime = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone: timezone });

    return (
      <div className="app-shell">
        <header className="app-header">
          <div className="app-logo">Open<span>Slot</span></div>
        </header>
        <main className="app-main">
          <div className="booking-success-page">
            <div className="booking-success-check">✓</div>
            <h2>You're booked!</h2>
            <p className="booking-success-detail">{dayLabel}</p>
            <p className="booking-success-time">{startTime} – {endTime}</p>
            <p className="booking-success-note">
              A calendar invite has been sent to your email. See you there, {bookingSuccess.name}!
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Main booking view
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-logo">Open<span>Slot</span></div>
      </header>

      <main className="app-main">
        <div className="booking-page">
          <div className="booking-header">
            <h2>Book a time</h2>
            <p>Select a date to see available {offer.duration}-minute slots</p>
          </div>

          <div className="booking-layout">
            {/* Mini Calendar */}
            <div className="booking-left-col">
              <div className="mini-calendar">
                <div className="mini-cal-nav">
                  <button className="mini-cal-nav-btn" onClick={prevMonth}>&larr;</button>
                  <h4>{monthLabel}</h4>
                  <button className="mini-cal-nav-btn" onClick={nextMonth}>&rarr;</button>
                </div>
                <div className="mini-cal-grid">
                  {DAYS_OF_WEEK.map((d) => (
                    <div key={d} className="mini-cal-dow">{d}</div>
                  ))}
                  {monthCells.map((cell, i) => {
                    const dateStr = cell.currentMonth
                      ? `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`
                      : '';
                    const hasSlots = datesWithSlots.has(dateStr);
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selectedDate;

                    let className = 'mini-cal-day';
                    if (cell.currentMonth) className += ' current-month';
                    if (hasSlots) className += ' has-slots';
                    if (isToday) className += ' today';
                    if (isSelected) className += ' selected';

                    return (
                      <div
                        key={i}
                        className={className}
                        onClick={() => handleDayClick(cell.day, cell.currentMonth)}
                      >
                        {cell.day}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Timezone Selector */}
              <div className="tz-selector" ref={tzWrapperRef}>
                {!tzOpen ? (
                  <button className="tz-toggle" onClick={() => {
                    setTzOpen(true);
                    setTzSearch('');
                    setTimeout(() => tzInputRef.current?.focus(), 0);
                  }}>
                    <span className="tz-icon">🌐</span>
                    <span className="tz-label">{getTzLabel(timezone)}</span>
                    <span className="tz-arrow">▾</span>
                  </button>
                ) : (
                  <div className="tz-search-wrapper">
                    <span className="tz-icon">🌐</span>
                    <input
                      ref={tzInputRef}
                      className="tz-search-input"
                      type="text"
                      value={tzSearch}
                      onChange={(e) => setTzSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setTzOpen(false);
                          setTzSearch('');
                        }
                        if (e.key === 'Enter') {
                          const q = tzSearch.toLowerCase();
                          const match = TZ_DATA.filter((t) =>
                            t.searchTerms.includes(q) ||
                            t.label.toLowerCase().includes(q) ||
                            t.iana.toLowerCase().includes(q)
                          );
                          if (match.length === 1) {
                            setTimezone(match[0].iana);
                            setTzOpen(false);
                            setTzSearch('');
                            setSelectedDate(null);
                            setSelectedSlotIdx(null);
                            setShowForm(false);
                          }
                        }
                      }}
                      placeholder="Search timezone..."
                    />
                  </div>
                )}
                {tzOpen && (
                  <div className="tz-dropdown">
                    {TZ_DATA.filter((t) => {
                      if (!tzSearch) return true;
                      const q = tzSearch.toLowerCase();
                      return (
                        t.searchTerms.includes(q) ||
                        t.label.toLowerCase().includes(q) ||
                        t.iana.toLowerCase().includes(q) ||
                        t.abbr.toLowerCase().includes(q)
                      );
                    }).map((t) => (
                      <div
                        key={t.iana}
                        className={`tz-option${t.iana === timezone ? ' active' : ''}`}
                        onClick={() => {
                          setTimezone(t.iana);
                          setTzOpen(false);
                          setTzSearch('');
                          setSelectedDate(null);
                          setSelectedSlotIdx(null);
                          setShowForm(false);
                        }}
                      >
                        <span className="tz-option-label">{t.label}</span>
                        <span className="tz-option-abbr">{t.abbr}</span>
                      </div>
                    ))}
                    {TZ_DATA.filter((t) => {
                      if (!tzSearch) return true;
                      const q = tzSearch.toLowerCase();
                      return t.searchTerms.includes(q) || t.label.toLowerCase().includes(q) || t.iana.toLowerCase().includes(q) || t.abbr.toLowerCase().includes(q);
                    }).length === 0 && (
                      <div className="tz-no-results">No timezones found</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Slot List + Booking Form */}
            <div className="slot-list">
              {!selectedDate ? (
                <div className="slot-empty">
                  <p>Select a date on the calendar to view available times.</p>
                </div>
              ) : (
                <>
                  <div className="slot-list-header">
                    <h3>{selectedDateLabel}</h3>
                    <p>{selectedDaySlots.filter((s) => s.status === 'available').length} slots available</p>
                  </div>

                  {bookingError && (
                    <div className="booking-inline-error">{bookingError}</div>
                  )}

                  <div className="slot-list-items">
                    {selectedDaySlots.filter((s) => s.status === 'available').map((slot) => {
                      const isSelected = selectedSlotIdx === slot.idx;
                      const startTime = new Date(slot.start).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        timeZone: timezone,
                      });
                      const endTime = new Date(slot.end).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        timeZoneName: 'short',
                        timeZone: timezone,
                      });

                      return (
                        <div
                          key={slot.idx}
                          className={`slot-item${isSelected ? ' selected-slot' : ''}`}
                          onClick={() => handleSlotClick(slot.idx)}
                        >
                          <span className="slot-item-time">{startTime} – {endTime}</span>
                          <span className="slot-item-duration">{offer.duration} min</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Confirmation Form */}
                  {showForm && selectedSlotIdx !== null && (
                    <form className="booking-form" onSubmit={handleBook}>
                      <div className="booking-form-field">
                        <label>Your name</label>
                        <input
                          type="text"
                          value={bookingName}
                          onChange={(e) => setBookingName(e.target.value)}
                          placeholder="Jane Smith"
                          required
                          autoFocus
                        />
                      </div>
                      <div className="booking-form-field">
                        <label>Your email</label>
                        <input
                          type="email"
                          value={bookingEmail}
                          onChange={handleEmailChange}
                          onBlur={handleEmailBlur}
                          placeholder="jane@company.com"
                          className={emailError ? 'input-error' : ''}
                          required
                        />
                        {emailError && <span className="field-error">{emailError}</span>}
                      </div>
                      <button
                        type="submit"
                        className="btn-book"
                        disabled={booking || !bookingName.trim() || !isEmailValid}
                      >
                        {booking ? 'Booking...' : 'Confirm Booking'}
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
