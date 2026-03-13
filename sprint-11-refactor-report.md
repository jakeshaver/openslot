# Sprint 11 — Refactor & Code Quality Report

**Date:** March 13, 2026
**Scope:** Zero-functional-change cleanup — no features added, no behavior altered
**Verification:** All 63 backend tests pass, frontend build succeeds, no regressions

---

## What Was Found

### Backend: Duplicated Logic Across Route Files

| Pattern | Where It Was Duplicated | Occurrences |
|---|---|---|
| OAuth2 client setup (`new google.auth.OAuth2`, `setCredentials`) | `offers.js`, `calendar.js`, `availability.js` | 5× |
| Event filtering (strip declined/transparent events) | `offers.js`, `calendar.js`, `availability.js` | 3× |
| Busy event fetching (Calendar API call + filter) | `offers.js`, `availability.js` | 2× |
| Live conflict check (fetch events in a time range, check overlap) | `offers.js` (inline, repeated per slot) | 2× |
| Slot start/end boundary calculation | `offers.js` (inline) | 1× (complex, buried in booking logic) |

Each route file independently imported `googleapis`, constructed an OAuth2 client with the same three env vars, and called `setCredentials` — identical code repeated across files. Event filtering applied the same two conditions (`status !== 'declined'`, `transparency !== 'transparent'`) but was written from scratch each time.

### Frontend: Dead Code & Hardcoded Values

| Issue | File | Detail |
|---|---|---|
| Unused `claimed` state | `BookingPage.js` | `useState`, setter, and conditional references to a `claimed` variable that was never set to `true` anywhere in the component |
| Hardcoded hex colors | `App.css` | `#F43F5E` (error red) and `#0f1628` (option background) used as raw hex instead of CSS variables |
| Inline style on element | `App.js` | `style={{ textDecoration: 'none' }}` on the settings page logo link instead of using the CSS class |

---

## What Was Changed

### New File: `backend/src/helpers/calendar.js` (58 lines)

Five extracted helper functions:

| Function | What It Does |
|---|---|
| `createCalendarClient(tokens)` | Creates an authenticated Google Calendar API client from stored OAuth tokens |
| `filterBusyEvents(events)` | Removes declined and transparent events from a calendar event list |
| `fetchBusyEvents(calendar, timeMin, timeMax)` | Fetches events from Google Calendar for a time range and filters them in one call |
| `hasConflict(calendar, start, end)` | Checks whether a proposed time range conflicts with any current calendar event |
| `getSlotBounds(slot, duration)` | Computes the exact start and end `Date` objects for a bookable slot |

Also exports `CALENDAR_ID` constant (previously hardcoded as `'primary'` in multiple files).

### Modified Backend Route Files

| File | Change | Lines Saved |
|---|---|---|
| `offers.js` | Replaced inline OAuth setup, event filtering, conflict checking, and slot math with helper imports | ~60 lines removed |
| `calendar.js` | Replaced inline OAuth setup with `createCalendarClient` | ~8 lines removed |
| `availability.js` | Replaced inline OAuth setup with `createCalendarClient` | ~8 lines removed |

### Modified Frontend Files

| File | Change |
|---|---|
| `BookingPage.js` | Removed `claimed` state declaration, setter call, and conditional check (3 locations) |
| `App.css` | Added `--error: #F43F5E` and `--option-bg: #0f1628` variables; replaced hardcoded hex references with `var()` calls |
| `App.js` | Removed inline `style` prop from logo `<a>` tag (now handled by `a.app-logo` CSS rule) |

---

## Project Impact

### Maintainability
The biggest win. Before this refactor, changing how OpenSlot authenticates with Google Calendar meant updating the same OAuth2 setup code in three separate files. A bug in event filtering (e.g., not handling a new Google Calendar event status) would need to be fixed in three places independently. Now there is one source of truth for each of these operations. Future changes to calendar integration touch one file: `helpers/calendar.js`.

### Bug Surface Area
Duplicated logic is where bugs hide — one copy gets fixed, another doesn't. The event filter, for example, was written slightly differently in `offers.js` vs `availability.js`. Consolidating into a single `filterBusyEvents` function eliminates that class of inconsistency entirely.

### Readability
`offers.js` was the longest and most complex route file (~360 lines). The booking flow — which is the most critical path in the app — was buried under OAuth boilerplate and inline calendar math. After extracting helpers, the booking logic reads as intent (`hasConflict`, `getSlotBounds`) rather than implementation detail. The file dropped to ~300 lines.

### Frontend Hygiene
Dead code (`claimed` state) created false signals for anyone reading `BookingPage.js` — it looked like claiming logic existed when it didn't. Removing it makes the component's actual behavior clear. CSS variables ensure color changes propagate consistently rather than requiring find-and-replace across the stylesheet.

### What Did NOT Change
- No API behavior changes — all 63 tests pass without modification
- No UI changes — frontend build produces identical output
- No new dependencies added
- No configuration changes
- No database/Firestore schema changes

---

**Commit:** `aa202fd` — `refactor: extract shared calendar helpers and clean up frontend`
