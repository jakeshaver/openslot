import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || '';
const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Reuse TZ_DATA from PublicBooking — same timezone list
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

export default function Reschedule() {
  const { offerId } = useParams();

  const [offer, setOffer] = useState(null);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlotIdx, setSelectedSlotIdx] = useState(null);

  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState(null);
  const [rescheduleSuccess, setRescheduleSuccess] = useState(null);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [tzOpen, setTzOpen] = useState(false);
  const [tzSearch, setTzSearch] = useState('');
  const tzInputRef = useRef(null);
  const tzWrapperRef = useRef(null);

  const fetchRescheduleData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/api/offers/${offerId}/reschedule`);
      if (res.status === 404) {
        setError('This reschedule link is invalid or has been removed.');
        setErrorCode('not_found');
        return;
      }
      if (res.status === 410) {
        const data = await res.json();
        setError(data.error || 'This meeting has already passed and can no longer be rescheduled.');
        setErrorCode(data.code || 'reschedule_expired');
        return;
      }
      if (res.status === 400) {
        const data = await res.json();
        setError(data.error || 'No booking found to reschedule.');
        setErrorCode(data.code || 'not_claimed');
        return;
      }
      if (!res.ok) throw new Error('Failed to load reschedule page');
      const data = await res.json();
      setOffer(data.offer);
      setCurrentBooking(data.currentBooking);
    } catch (err) {
      setError('Something went wrong loading this page.');
      setErrorCode('unknown');
    } finally {
      setLoading(false);
    }
  }, [offerId]);

  useEffect(() => {
    fetchRescheduleData();
  }, [fetchRescheduleData]);

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

  // Group slots by date
  const slotsByDate = useMemo(() => {
    if (!offer) return {};
    const map = {};
    offer.slots.forEach((slot) => {
      const dateStr = new Date(slot.start).toLocaleDateString('en-CA', { timeZone: timezone });
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(slot);
    });
    return map;
  }, [offer, timezone]);

  const datesWithSlots = useMemo(() => {
    return new Set(Object.keys(slotsByDate));
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
    setRescheduleError(null);
  };

  const handleSlotClick = (slotIdx) => {
    setSelectedSlotIdx(slotIdx);
    setRescheduleError(null);
  };

  const handleReschedule = async () => {
    if (selectedSlotIdx === null || rescheduling) return;
    setRescheduling(true);
    setRescheduleError(null);

    try {
      const res = await fetch(`${API_BASE}/api/offers/${offerId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotIndex: selectedSlotIdx }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'reschedule_expired') {
          setError(data.error);
          setErrorCode('reschedule_expired');
          return;
        }
        if (data.code === 'slot_conflict') {
          setRescheduleError('This time is no longer available. Please pick another slot.');
          await fetchRescheduleData();
          setSelectedSlotIdx(null);
          return;
        }
        if (data.code === 'slot_expired') {
          setRescheduleError('This time has already passed. Please pick another slot.');
          await fetchRescheduleData();
          setSelectedSlotIdx(null);
          return;
        }
        throw new Error(data.error || 'Reschedule failed');
      }

      setRescheduleSuccess({
        slot: data.booking.slot,
        name: currentBooking.name,
      });
    } catch (err) {
      setRescheduleError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setRescheduling(false);
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

  // Format the selected new slot for the confirm button
  const selectedSlot = selectedSlotIdx !== null && offer
    ? offer.slots.find((s) => s.idx === selectedSlotIdx)
    : null;
  const confirmLabel = selectedSlot
    ? `Reschedule to ${new Date(selectedSlot.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone })} – ${new Date(selectedSlot.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone })}`
    : 'Select a time';

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

  // Error state
  if (error) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div className="app-logo">Open<span>Slot</span></div>
        </header>
        <main className="app-main">
          <div className="booking-error-page">
            <div className="booking-error-icon">
              {errorCode === 'reschedule_expired' ? '⏰' : errorCode === 'not_claimed' ? '📅' : '🔗'}
            </div>
            <h2>{errorCode === 'reschedule_expired' ? 'Meeting has passed' : errorCode === 'not_claimed' ? 'No booking found' : 'Link not found'}</h2>
            <p>{error}</p>
          </div>
        </main>
      </div>
    );
  }

  // No available slots
  if (offer && offer.slots.length === 0) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div className="app-logo">Open<span>Slot</span></div>
        </header>
        <main className="app-main">
          <div className="booking-error-page">
            <div className="booking-error-icon">📅</div>
            <h2>No other times available</h2>
            <p>No other times from this offer are available. Please reach out to the organizer to find a new time.</p>
          </div>
        </main>
      </div>
    );
  }

  // Success state
  if (rescheduleSuccess) {
    const slot = rescheduleSuccess.slot;
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
            <h2>Meeting rescheduled!</h2>
            <p className="booking-success-detail">{dayLabel}</p>
            <p className="booking-success-time">{startTime} – {endTime}</p>
            <p className="booking-success-note">
              Your calendar invite has been updated. See you then, {rescheduleSuccess.name}!
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Format current booking for display
  const currentStart = new Date(currentBooking.start);
  const currentEnd = new Date(currentBooking.end);
  const currentDayLabel = currentStart.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: timezone });
  const currentStartTime = currentStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone });
  const currentEndTime = currentEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone: timezone });

  // Main reschedule view
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-logo">Open<span>Slot</span></div>
      </header>

      <main className="app-main">
        <div className="booking-page">
          <div className="booking-header">
            <h2>Reschedule</h2>
            <div className="reschedule-current">
              Your current booking: {currentDayLabel} at {currentStartTime} – {currentEndTime}
            </div>
            <p>Select a new {offer.duration}-minute time slot</p>
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

            {/* Slot List */}
            <div className="slot-list">
              {!selectedDate ? (
                <div className="slot-empty">
                  <p>Select a date on the calendar to view available times.</p>
                </div>
              ) : (
                <>
                  <div className="slot-list-header">
                    <h3>{selectedDateLabel}</h3>
                    <p>{selectedDaySlots.length} slots available</p>
                  </div>

                  {rescheduleError && (
                    <div className="booking-inline-error">{rescheduleError}</div>
                  )}

                  <div className="slot-list-items">
                    {selectedDaySlots.map((slot) => {
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

                  {/* Confirm Button */}
                  {selectedSlotIdx !== null && (
                    <button
                      className="btn-book"
                      disabled={rescheduling}
                      onClick={handleReschedule}
                    >
                      {rescheduling ? 'Rescheduling...' : confirmLabel}
                    </button>
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
