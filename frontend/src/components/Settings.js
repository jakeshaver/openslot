import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || '';

const DAY_LABELS = [
  { num: 0, label: 'Sun' },
  { num: 1, label: 'Mon' },
  { num: 2, label: 'Tue' },
  { num: 3, label: 'Wed' },
  { num: 4, label: 'Thu' },
  { num: 5, label: 'Fri' },
  { num: 6, label: 'Sat' },
];

// Generate time options in 30-min increments from 12:00 AM to 12:00 AM
function generateTimeOptions() {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      const value = `${hh}:${mm}`;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const label = `${displayH}:${mm} ${ampm}`;
      options.push({ value, label });
    }
  }
  // Add midnight end-of-day option
  options.push({ value: '24:00', label: '12:00 AM (end of day)' });
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

const DEFAULTS = {
  workingDays: [1, 2, 3, 4, 5],
  workingHours: { start: '08:00', end: '20:00' },
  bufferMinutes: 15,
  defaultDuration: 30,
};

export default function Settings() {
  const [workingDays, setWorkingDays] = useState(DEFAULTS.workingDays);
  const [workingHoursStart, setWorkingHoursStart] = useState(DEFAULTS.workingHours.start);
  const [workingHoursEnd, setWorkingHoursEnd] = useState(DEFAULTS.workingHours.end);
  const [bufferMinutes, setBufferMinutes] = useState(DEFAULTS.bufferMinutes);
  const [defaultDuration, setDefaultDuration] = useState(DEFAULTS.defaultDuration);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch(`${API_BASE}/api/settings`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            const s = data.settings;
            if (s.workingDays) setWorkingDays(s.workingDays);
            if (s.workingHours) {
              setWorkingHoursStart(s.workingHours.start);
              setWorkingHoursEnd(s.workingHours.end);
            }
            if (s.bufferMinutes !== undefined) setBufferMinutes(s.bufferMinutes);
            if (s.defaultDuration !== undefined) setDefaultDuration(s.defaultDuration);
          }
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const toggleDay = useCallback((dayNum) => {
    setWorkingDays((prev) => {
      if (prev.includes(dayNum)) {
        // Don't allow deselecting all days
        if (prev.length <= 1) return prev;
        return prev.filter((d) => d !== dayNum);
      }
      return [...prev, dayNum].sort((a, b) => a - b);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workingDays,
          workingHours: { start: workingHoursStart, end: workingHoursEnd },
          bufferMinutes: parseInt(bufferMinutes, 10) || 0,
          defaultDuration: parseInt(defaultDuration, 10) || 30,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="loading-screen">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <a href="/" className="settings-back-link">&larr; Back to calendar</a>
      <div className="settings-panel">
        <h2>Settings</h2>
        <p className="settings-subtitle">Configure your availability preferences</p>

        <div className="settings-section">
          <label className="settings-label">Working Days</label>
          <div className="day-toggles">
            {DAY_LABELS.map(({ num, label }) => (
              <button
                key={num}
                className={`day-toggle${workingDays.includes(num) ? ' active' : ''}`}
                onClick={() => toggleDay(num)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <label className="settings-label">Working Hours</label>
          <div className="hours-row">
            <select
              className="settings-select"
              value={workingHoursStart}
              onChange={(e) => setWorkingHoursStart(e.target.value)}
            >
              {TIME_OPTIONS.filter((t) => t.value !== '24:00').map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <span className="hours-divider">to</span>
            <select
              className="settings-select"
              value={workingHoursEnd}
              onChange={(e) => setWorkingHoursEnd(e.target.value)}
            >
              {TIME_OPTIONS.filter((t) => t.value !== '00:00').map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-section settings-section-half">
            <label className="settings-label">Buffer Time (minutes)</label>
            <div className="stepper">
              <button
                className="stepper-btn"
                onClick={() => setBufferMinutes((v) => Math.max(0, parseInt(v, 10) - 5))}
              >−</button>
              <span className="stepper-value">{bufferMinutes}</span>
              <button
                className="stepper-btn"
                onClick={() => setBufferMinutes((v) => Math.min(120, parseInt(v, 10) + 5))}
              >+</button>
            </div>
          </div>

          <div className="settings-section settings-section-half">
            <label className="settings-label">Default Duration (minutes)</label>
            <div className="stepper">
              <button
                className="stepper-btn"
                onClick={() => setDefaultDuration((v) => Math.max(15, parseInt(v, 10) - 15))}
              >−</button>
              <span className="stepper-value">{defaultDuration}</span>
              <button
                className="stepper-btn"
                onClick={() => setDefaultDuration((v) => Math.min(180, parseInt(v, 10) + 15))}
              >+</button>
            </div>
          </div>
        </div>

        <div className="settings-actions">
          <button
            className={`btn-save${saved ? ' saved' : ''}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
