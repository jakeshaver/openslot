import React, { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

const ALL_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 20;

// Grid always renders this full range — working hours are a visual subset
const GRID_START_HOUR = 6;
const GRID_END_HOUR = 23;

function parseHour(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h + m / 60;
}

function getWeekDates(offset = 0, workingDays = DEFAULT_WORKING_DAYS) {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff + offset * 7);
  monday.setHours(0, 0, 0, 0);

  // Return all 7 days of the week, filtered to working days
  const dates = [];
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() - 1); // Go back to Sunday

  for (let i = 0; i < 7; i++) {
    if (workingDays.includes(i)) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      dates.push({ date: d, dayNum: i });
    }
  }
  return dates;
}

function formatHour(row, startHour, cellMinutes) {
  const totalMinutes = row * cellMinutes;
  const hour = startHour + Math.floor(totalMinutes / 60);
  const min = String(totalMinutes % 60).padStart(2, '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return { label: `${h}:${min} ${ampm}`, isHour: totalMinutes % 60 === 0 };
}

function cellKey(dayIdx, row) {
  return `${dayIdx}-${row}`;
}

function isSlotAvailable(dayDate, row, availableSlots, startHour, cellMinutes) {
  const totalMinutes = row * cellMinutes;
  const cellStart = new Date(dayDate);
  cellStart.setHours(startHour + Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
  const cellEnd = new Date(cellStart);
  cellEnd.setMinutes(cellEnd.getMinutes() + cellMinutes);

  return availableSlots.some((slot) => {
    const slotStart = new Date(slot.start);
    const slotEnd = new Date(slot.end);
    return cellStart >= slotStart && cellEnd <= slotEnd;
  });
}

function isCellBusy(dayDate, row, busyIntervals, startHour, cellMinutes) {
  const totalMinutes = row * cellMinutes;
  const cellStart = new Date(dayDate);
  cellStart.setHours(startHour + Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
  const cellEnd = new Date(cellStart);
  cellEnd.setMinutes(cellEnd.getMinutes() + cellMinutes);

  return busyIntervals.some((interval) => {
    const bStart = new Date(interval.start);
    const bEnd = new Date(interval.end);
    return cellStart < bEnd && cellEnd > bStart;
  });
}

function isWithinWorkingHours(row, workingStartHour, workingEndHour, cellMinutes) {
  const totalMinutes = row * cellMinutes;
  const cellHour = GRID_START_HOUR + totalMinutes / 60;
  const cellEndHour = cellHour + cellMinutes / 60;
  return cellHour >= workingStartHour && cellEndHour <= workingEndHour;
}

const WeekGrid = forwardRef(function WeekGrid({ slots, busyIntervals = [], onWeekChange, duration, onDurationChange, onSelectionChange, workingDays: propWorkingDays, workingHours: propWorkingHours }, ref) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);
  const [dragMode, setDragMode] = useState(null);
  const gridRef = useRef(null);

  const workingDays = propWorkingDays || DEFAULT_WORKING_DAYS;
  const workingStartHour = propWorkingHours ? parseHour(propWorkingHours.start) : DEFAULT_START_HOUR;
  const workingEndHour = propWorkingHours ? parseHour(propWorkingHours.end) : DEFAULT_END_HOUR;
  const cellMinutes = duration === 15 ? 15 : 30;
  const rowsPerHour = 60 / cellMinutes;
  const ROWS = (GRID_END_HOUR - GRID_START_HOUR) * rowsPerHour;

  const weekDatesData = getWeekDates(weekOffset, workingDays);
  const weekDates = weekDatesData.map((d) => d.date);
  const dayNums = weekDatesData.map((d) => d.dayNum);

  const firstDate = weekDates[0];
  const lastDate = weekDates[weekDates.length - 1];
  const weekLabel = firstDate && lastDate
    ? `${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : '';

  // Clear selection when duration changes (cell boundaries shift)
  useEffect(() => {
    setSelected(new Set());
  }, [duration]);

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
      const startMin = startRow * cellMinutes;
      windowStart.setHours(GRID_START_HOUR + Math.floor(startMin / 60), startMin % 60, 0, 0);
      const windowEnd = new Date(date);
      const endMin = (endRow + 1) * cellMinutes;
      windowEnd.setHours(GRID_START_HOUR + Math.floor(endMin / 60), endMin % 60, 0, 0);

      windows.push({
        start: windowStart.toISOString(),
        end: windowEnd.toISOString(),
      });
    }

    return windows;
  }, [selected, weekDates, cellMinutes]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getSelectedWindows,
    clearSelection: () => setSelected(new Set()),
  }), [getSelectedWindows]);

  // Refetch availability when week changes
  const handleWeekChange = (newOffset) => {
    setWeekOffset(newOffset);
    setSelected(new Set());
    const dates = getWeekDates(newOffset, workingDays);
    onWeekChange(dates[0].date.toISOString());
  };

  // Build sets: available (within working hours, free) and selectable (not busy)
  const availableCells = new Set();
  const selectableCells = new Set();
  const extendedCells = new Set();

  weekDates.forEach((date, dayIdx) => {
    for (let row = 0; row < ROWS; row++) {
      const key = cellKey(dayIdx, row);
      const busy = isCellBusy(date, row, busyIntervals, GRID_START_HOUR, cellMinutes);
      const inWorkingHours = isWithinWorkingHours(row, workingStartHour, workingEndHour, cellMinutes);

      if (busy) continue; // unavailable — not selectable

      if (inWorkingHours && isSlotAvailable(date, row, slots, GRID_START_HOUR, cellMinutes)) {
        availableCells.add(key);
        selectableCells.add(key);
      } else if (!inWorkingHours) {
        extendedCells.add(key);
        selectableCells.add(key);
      } else {
        // Within working hours but not in available slots (busy per availability engine)
        // Don't add to selectable
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
        if (selectableCells.has(key)) {
          cells.add(key);
        }
      }
    }
    return cells;
  }, [dragStart, dragCurrent, selectableCells]);

  const dragCells = isDragging ? getDragCells() : new Set();

  const handleMouseDown = (dayIdx, row) => {
    const key = cellKey(dayIdx, row);
    if (!selectableCells.has(key)) return;

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

  // Auto-scroll to working hours on mount
  const scrollRef = useRef(false);
  useEffect(() => {
    if (!scrollRef.current && gridRef.current) {
      const workingRowStart = (workingStartHour - GRID_START_HOUR) * rowsPerHour;
      const cellHeight = 34; // matches CSS .grid-cell height
      const scrollTarget = Math.max(0, (workingRowStart - 1) * cellHeight);
      gridRef.current.scrollTop = scrollTarget;
      scrollRef.current = true;
    }
  }, [workingStartHour, rowsPerHour]);

  return (
    <div className="owner-view">
      <div className="owner-toolbar">
        <h2>Pick your slots</h2>
        <div className="toolbar-controls">
          <select
            className="duration-select"
            value={duration}
            onChange={(e) => onDurationChange(Number(e.target.value))}
          >
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>60 min</option>
          </select>
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
          <div className="week-nav-right">
            <button
              className="week-nav-today"
              disabled={weekOffset === 0}
              onClick={() => handleWeekChange(0)}
            >Today</button>
            <button className="week-nav-btn" onClick={() => handleWeekChange(weekOffset + 1)}>&rarr;</button>
          </div>
        </div>

        <div className="week-grid" style={{ gridTemplateColumns: `64px repeat(${weekDates.length}, 1fr)` }}>
          {/* Header row */}
          <div className="grid-corner" />
          {weekDates.map((date, i) => {
            const isToday = date.getTime() === today.getTime();
            return (
              <div key={i} className="grid-header-cell">
                <div className="grid-header-day">{ALL_DAYS[dayNums[i]]}</div>
                <div className={`grid-header-date${isToday ? ' today' : ''}`}>{date.getDate()}</div>
              </div>
            );
          })}

          {/* Grid rows */}
          {Array.from({ length: ROWS }, (_, row) => {
            const { label, isHour } = formatHour(row, GRID_START_HOUR, cellMinutes);
            const isFirstRow = row === 0;
            return (
              <React.Fragment key={row}>
                <div
                  className={`grid-time-label${!isHour ? ' half-hour' : ''}`}
                  style={isFirstRow ? { marginTop: '0.4rem' } : undefined}
                >
                  {label}
                </div>
                {weekDates.map((_, dayIdx) => {
                  const key = cellKey(dayIdx, row);
                  const isAvailable = availableCells.has(key);
                  const isExtended = extendedCells.has(key);
                  const isSelectable = selectableCells.has(key);
                  const isSelected = selected.has(key);
                  const isSelecting = dragCells.has(key);
                  const willDeselect = isSelecting && dragMode === 'deselect';

                  let className = 'grid-cell';
                  if (!isHour) className += ' hour-start';
                  if (!isSelectable) {
                    className += ' unavailable';
                  } else if (isExtended) {
                    className += ' extended';
                    if (isSelected && !willDeselect) className += ' selected';
                    else if (isSelecting && dragMode === 'select') className += ' selecting';
                  } else {
                    className += ' available';
                    if (isSelected && !willDeselect) className += ' selected';
                    else if (isSelecting && dragMode === 'select') className += ' selecting';
                  }

                  return (
                    <div
                      key={key}
                      className={className}
                      style={isFirstRow ? { marginTop: '0.4rem' } : undefined}
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
