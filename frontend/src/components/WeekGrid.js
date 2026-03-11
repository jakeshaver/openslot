import React, { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const START_HOUR = 8;
const END_HOUR = 20;
const ROWS = (END_HOUR - START_HOUR) * 2; // 30-min increments

function getWeekDates(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff + offset * 7);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatHour(row) {
  const hour = START_HOUR + Math.floor(row / 2);
  const min = row % 2 === 0 ? '00' : '30';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour > 12 ? hour - 12 : hour;
  return { label: `${h}:${min} ${ampm}`, isHour: row % 2 === 0 };
}

function cellKey(dayIdx, row) {
  return `${dayIdx}-${row}`;
}

function isSlotAvailable(dayDate, row, availableSlots) {
  const cellStart = new Date(dayDate);
  cellStart.setHours(START_HOUR + Math.floor(row / 2), (row % 2) * 30, 0, 0);
  const cellEnd = new Date(cellStart);
  cellEnd.setMinutes(cellEnd.getMinutes() + 30);

  return availableSlots.some((slot) => {
    const slotStart = new Date(slot.start);
    const slotEnd = new Date(slot.end);
    return cellStart >= slotStart && cellEnd <= slotEnd;
  });
}

const WeekGrid = forwardRef(function WeekGrid({ slots, onWeekChange, duration, onDurationChange, onSelectionChange }, ref) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);
  const [dragMode, setDragMode] = useState(null);
  const gridRef = useRef(null);

  const weekDates = getWeekDates(weekOffset);
  const weekLabel = `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDates[4].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange(selected.size);
  }, [selected, onSelectionChange]);

  // Build contiguous time windows from selected cells
  const getSelectedWindows = useCallback(() => {
    const sortedKeys = [...selected].sort((a, b) => {
      const [ad, ar] = a.split('-').map(Number);
      const [bd, br] = b.split('-').map(Number);
      return ad - bd || ar - br;
    });

    const windows = [];
    let i = 0;
    while (i < sortedKeys.length) {
      const [dayIdx, startRow] = sortedKeys[i].split('-').map(Number);
      let endRow = startRow;

      while (i + 1 < sortedKeys.length) {
        const [nd, nr] = sortedKeys[i + 1].split('-').map(Number);
        if (nd === dayIdx && nr === endRow + 1) {
          endRow = nr;
          i++;
        } else {
          break;
        }
      }
      i++;

      const date = weekDates[dayIdx];
      const windowStart = new Date(date);
      windowStart.setHours(START_HOUR + Math.floor(startRow / 2), (startRow % 2) * 30, 0, 0);
      const windowEnd = new Date(date);
      windowEnd.setHours(START_HOUR + Math.floor((endRow + 1) / 2), ((endRow + 1) % 2) * 30, 0, 0);

      windows.push({
        start: windowStart.toISOString(),
        end: windowEnd.toISOString(),
      });
    }

    return windows;
  }, [selected, weekDates]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getSelectedWindows,
    clearSelection: () => setSelected(new Set()),
  }), [getSelectedWindows]);

  // Refetch availability when week changes
  const handleWeekChange = (newOffset) => {
    setWeekOffset(newOffset);
    setSelected(new Set());
    const dates = getWeekDates(newOffset);
    onWeekChange(dates[0].toISOString());
  };

  // Build set of available cells
  const availableCells = new Set();
  weekDates.forEach((date, dayIdx) => {
    for (let row = 0; row < ROWS; row++) {
      if (isSlotAvailable(date, row, slots)) {
        availableCells.add(cellKey(dayIdx, row));
      }
    }
  });

  // Get cells in drag rectangle
  const getDragCells = useCallback(() => {
    if (!dragStart || !dragCurrent) return new Set();
    const minDay = Math.min(dragStart.day, dragCurrent.day);
    const maxDay = Math.max(dragStart.day, dragCurrent.day);
    const minRow = Math.min(dragStart.row, dragCurrent.row);
    const maxRow = Math.max(dragStart.row, dragCurrent.row);

    const cells = new Set();
    for (let d = minDay; d <= maxDay; d++) {
      for (let r = minRow; r <= maxRow; r++) {
        const key = cellKey(d, r);
        if (availableCells.has(key)) {
          cells.add(key);
        }
      }
    }
    return cells;
  }, [dragStart, dragCurrent, availableCells]);

  const dragCells = isDragging ? getDragCells() : new Set();

  const handleMouseDown = (dayIdx, row) => {
    const key = cellKey(dayIdx, row);
    if (!availableCells.has(key)) return;

    const mode = selected.has(key) ? 'deselect' : 'select';
    setIsDragging(true);
    setDragStart({ day: dayIdx, row });
    setDragCurrent({ day: dayIdx, row });
    setDragMode(mode);
  };

  const handleMouseEnter = (dayIdx, row) => {
    if (!isDragging) return;
    setDragCurrent({ day: dayIdx, row });
  };

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    const cells = getDragCells();

    setSelected((prev) => {
      const next = new Set(prev);
      cells.forEach((key) => {
        if (dragMode === 'select') {
          next.add(key);
        } else {
          next.delete(key);
        }
      });
      return next;
    });

    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
    setDragMode(null);
  }, [isDragging, getDragCells, dragMode]);

  useEffect(() => {
    const up = () => handleMouseUp();
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, [handleMouseUp]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="owner-view">
      <div className="owner-toolbar">
        <h2>Pick your slots</h2>
        <div className="toolbar-controls">
          <div className="duration-selector">
            {[30, 45, 60].map((d) => (
              <button
                key={d}
                className={`duration-btn${duration === d ? ' active' : ''}`}
                onClick={() => onDurationChange(d)}
              >
                {d}m
              </button>
            ))}
          </div>
          {selected.size > 0 && (
            <button className="btn-clear" onClick={() => setSelected(new Set())}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="week-grid-wrapper" ref={gridRef}>
        <div className="week-nav">
          <button className="week-nav-btn" onClick={() => handleWeekChange(weekOffset - 1)}>&larr;</button>
          <h3>{weekLabel}</h3>
          <button className="week-nav-btn" onClick={() => handleWeekChange(weekOffset + 1)}>&rarr;</button>
        </div>

        <div className="week-grid">
          {/* Header row */}
          <div className="grid-corner" />
          {weekDates.map((date, i) => {
            const isToday = date.getTime() === today.getTime();
            return (
              <div key={i} className="grid-header-cell">
                <div className="grid-header-day">{DAYS[i]}</div>
                <div className={`grid-header-date${isToday ? ' today' : ''}`}>{date.getDate()}</div>
              </div>
            );
          })}

          {/* Grid rows */}
          {Array.from({ length: ROWS }, (_, row) => {
            const { label, isHour } = formatHour(row);
            return (
              <React.Fragment key={row}>
                <div className={`grid-time-label${!isHour ? ' half-hour' : ''}`}>
                  {label}
                </div>
                {weekDates.map((_, dayIdx) => {
                  const key = cellKey(dayIdx, row);
                  const available = availableCells.has(key);
                  const isSelected = selected.has(key);
                  const isSelecting = dragCells.has(key);
                  const willDeselect = isSelecting && dragMode === 'deselect';

                  let className = 'grid-cell';
                  if (!isHour) className += ' hour-start';
                  if (!available) {
                    className += ' unavailable';
                  } else {
                    className += ' available';
                    if (isSelected && !willDeselect) className += ' selected';
                    else if (isSelecting && dragMode === 'select') className += ' selecting';
                  }

                  return (
                    <div
                      key={key}
                      className={className}
                      onMouseDown={() => handleMouseDown(dayIdx, row)}
                      onMouseEnter={() => handleMouseEnter(dayIdx, row)}
                    />
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default WeekGrid;
