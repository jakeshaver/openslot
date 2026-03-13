import React, { useState, useMemo } from 'react';

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getMonthData(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells = [];
  // Previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, currentMonth: false });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, currentMonth: true });
  }
  // Next month padding
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, currentMonth: false });
  }

  return cells;
}

export default function BookingPage({ slots, duration = 30 }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  // Divide free windows into duration-sized increments
  const slotIncrements = useMemo(() => {
    const increments = [];
    for (const slot of slots) {
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      let cursor = new Date(start);

      while (cursor.getTime() + duration * 60000 <= end.getTime()) {
        increments.push({
          start: new Date(cursor),
          end: new Date(cursor.getTime() + duration * 60000),
          id: cursor.toISOString(),
        });
        cursor = new Date(cursor.getTime() + duration * 60000);
      }
    }
    return increments;
  }, [slots, duration]);

  // Group by date string
  const slotsByDate = useMemo(() => {
    const map = {};
    for (const slot of slotIncrements) {
      const key = slot.start.toLocaleDateString('en-CA'); // YYYY-MM-DD
      if (!map[key]) map[key] = [];
      map[key].push(slot);
    }
    return map;
  }, [slotIncrements]);

  // Dates that have available slots
  const datesWithSlots = new Set(Object.keys(slotsByDate));

  const monthCells = getMonthData(viewYear, viewMonth);
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDayClick = (day, currentMonth) => {
    if (!currentMonth) return;
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!datesWithSlots.has(dateStr)) return;
    setSelectedDate(dateStr);
    setSelectedSlot(null);
  };

  const todayStr = today.toLocaleDateString('en-CA');
  const selectedDaySlots = selectedDate ? (slotsByDate[selectedDate] || []) : [];

  const selectedDateLabel = selectedDate
    ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="booking-page">
      <div className="booking-header">
        <h2>Book a time</h2>
        <p>Select a date to see available {duration}-minute slots</p>
      </div>

      <div className="booking-layout">
        {/* Mini Calendar */}
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

        {/* Slot List */}
        <div className="slot-list">
          {!selectedDate ? (
            <div className="slot-empty">
              <p>Select a date on the calendar to view available times.</p>
            </div>
          ) : selectedDaySlots.length === 0 ? (
            <div className="slot-empty">
              <p>No available slots on this date.</p>
            </div>
          ) : (
            <>
              <div className="slot-list-header">
                <h3>{selectedDateLabel}</h3>
                <p>{selectedDaySlots.length} slots available</p>
              </div>
              <div className="slot-list-items">
                {selectedDaySlots.map((slot) => {
                  const isSelected = selectedSlot === slot.id;
                  const timeLabel = slot.start.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  });
                  const endLabel = slot.end.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZoneName: 'short',
                  });

                  let className = 'slot-item';
                  if (isSelected) className += ' selected-slot';

                  return (
                    <div
                      key={slot.id}
                      className={className}
                      onClick={() => setSelectedSlot(isSelected ? null : slot.id)}
                    >
                      <span className="slot-item-time">{timeLabel} – {endLabel}</span>
                      <span className="slot-item-duration">{duration} min</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
