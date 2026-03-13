# OpenSlot — Dev Log & Knowledge Base
**Project:** OpenSlot  
**Repo:** https://github.com/jakeshaver/openslot  
**Started:** March 2026  
**Stack:** Node.js · React · GCP Cloud Run · Firestore · Google Calendar API · OAuth 2.0  

---

## What Is OpenSlot?

OpenSlot is an open-source, self-hosted scheduling web app. It lets professionals share availability and let others book time on their calendar — without paying for a third-party scheduling service.

It has two entry points:
1. **Slot Picker (owner):** Drag across a week grid to select available windows, generate a copyable message with embedded booking links
2. **Booking Page (recipient):** Click a link, see available times, pick one, confirm name/email — calendar event auto-created for both parties

No third-party services required beyond a Google account and a GCP project.

---

## Design Philosophy

### Aesthetic
Dark glassmorphism — deep navy base, semi-transparent glass panels with backdrop blur, neon glow on interaction states. Monospace typography for time labels and UI chrome.

**Base color:** `#0a0f1e` (deep navy)  
**Primary accent:** `#00A8FF` Arc Blue — structure, labels, information  
**Secondary accent:** `#F59E0B` Amber — actions, CTAs, selected states  
**Success:** `#10B981` Emerald — used only for booking confirmation  
**Error:** `#F43F5E` Rose — used only for conflict/error states  

**Rule:** Blue informs, Amber acts. Never decorative.

### UX Philosophy
- The owner selects availability by dragging directly on a calendar grid — fast, visual, calendar-native
- Selected windows are free-form; the booking increment is fixed (30/45/60 min set by owner)
- A dragged 10am–4pm window becomes 12 available 30-min slots for the recipient
- No auto-holds on the calendar — real-time conflict check at booking time instead
- Google Calendar's native invite handles confirmation — no email service dependency
- Sending a personal availability message feels human; the booking link is an optional escape hatch embedded in that message

---

## Architecture Decisions

### Why GCP + Cloud Run
Scales to zero when idle (no cost when not in use). GCP-native keeps everything in one ecosystem for a Google Calendar user. Containerized by default — clone-and-deploy friendly.

### Why Firestore
Serverless, free tier, no schema management. Stores booking offers and sessions. Simple key-value access pattern fits the data model well.

### Why no email service
Google Calendar's native attendee invite handles confirmation email automatically when an event is created with the booker added as an attendee. Avoids third-party dependencies (SendGrid etc.) that would create friction for open-source contributors and risk deliverability issues from personal Gmail addresses.

### Why `crypto.randomUUID()` not `uuid` package
The `uuid` package v13+ is ESM-only, which conflicts with CommonJS Node.js backends. Node's built-in `crypto.randomUUID()` is equivalent, dependency-free, and avoids the module format issue entirely.

### No auto-hold calendar events
Auto-holds would clutter the calendar with phantom events that may never materialize, especially when multiple offers are active simultaneously. Instead: offers are a snapshot of availability at creation time. At booking time, a live conflict check runs against the current calendar. If a slot is no longer free, it's shown as unavailable. If all slots in an offer are conflicted, the recipient sees a clean "no times available — contact directly" message (`offer_stale` error code).

---

## Offer Data Model (Firestore)

```json
{
  "offerId": "crypto.randomUUID()",
  "ownerId": "google-user-id",
  "windows": [
    { "start": "2026-03-11T14:00:00-05:00", "end": "2026-03-11T16:00:00-05:00" },
    { "start": "2026-03-12T10:00:00-05:00", "end": "2026-03-12T12:00:00-05:00" }
  ],
  "durationMinutes": 30,
  "status": "active",
  "createdAt": "2026-03-10T...",
  "expiresAt": "2026-03-17T...",
  "claimedSlot": null
}
```

**Status values:** `active` → `claimed` or `expired`

---

## Availability Config Defaults

```json
{
  "workingHours": { "start": "08:00", "end": "20:00" },
  "workingDays": [1, 2, 3, 4, 5],
  "timezone": "America/New_York",
  "minSlotMinutes": 30,
  "bufferMinutes": 15,
  "daysAhead": 7
}
```

All defaults are overridable via the Settings page (saved to Firestore per user).

---

## Environment Variables

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GOOGLE_CALENDAR_ID=primary
FIRESTORE_PROJECT_ID=
SESSION_SECRET=
BASE_URL=https://your-domain.com
```

All secrets live in `.env` locally. `.env.example` is committed to the repo as a template — never commit `.env` itself.

---

## Sprint Log

### Sprint 0 — Foundation ✅ March 2026
**Outcome:** GCP project created, Google Calendar API enabled, OAuth 2.0 configured. Node.js + Express backend scaffolded. React frontend with Sign In with Google. Authenticated user can see next 7 days of calendar events. Local server running. Repo pushed to GitHub.

**Key decisions:**
- New GCP project `openslot` created separately from existing job campaign project
- Used Cloud Run architecture (not GCS static hosting) to support backend code
- `.gitignore` correctly excludes `.env` — `.env.example` committed instead

---

### Sprint 1 — Availability Engine ✅ March 2026
**Outcome:** `/api/availability` endpoint built. Returns free time blocks for a date range filtered by working hours, buffer time, Mon–Fri only. Jest tests pass for all edge cases including back-to-back meetings, all-day events, and boundary conditions.

**Key decisions:**
- Buffer time applied as 15 min before AND after each existing event
- All-day events block the entire day
- Weekends excluded at the engine level, not just the UI

---

### Sprint 1.5 — UI Foundation ✅ March 2026
**Outcome:** Full frontend redesign. Dark glassmorphism aesthetic applied. Week grid rebuilt with drag-to-select interaction. Arc Blue + Amber two-tone design system implemented. Duration selector (30m/45m/60m) in Arc Blue. Generate Message button in Amber. Monospace (Space Mono) typography for time labels and UI chrome.

**Key decisions:**
- Drag-to-offer UX: owner drags free-form windows, recipient books fixed increments within those windows
- Design system documented in `openslot-design-system.md` — source of truth for all future UI work
- Arc Blue `#00A8FF` for structure/information, Amber `#F59E0B` for actions/CTAs
- No weekend columns in the grid
- 9am–6pm time range only
- Busy blocks from Google Calendar rendered with hatched unavailable style — not draggable

**Known issues fixed:**
- 9am label clipped by day header row — fixed with additional grid body top padding

---

### Sprint 2 — Offer Engine & Real-Time Conflict Check ✅ March 2026
**Outcome:** `/api/offers` POST endpoint saves offers to Firestore. `/api/offers/:offerId/book` POST endpoint does live conflict check at booking time, creates Google Calendar event on success, returns `conflict` or `offer_stale` error codes. Week grid wired to real availability data. Generate Message produces copyable output panel with Arc Blue hyperlinks and Amber copy button.

**Key decisions:**
- No auto-holds on calendar (see Architecture Decisions above)
- `crypto.randomUUID()` used instead of `uuid` package (ESM compatibility)
- `offer_stale` error code returned when ALL slots in an offer are conflicted
- Recipient shown "no times available — contact directly" message on `offer_stale`

---

### Sprint 3 — Booking Page ✅ March 2026
**Outcome:** Public booking page at `/book/:offerId`. Month calendar on left, time slots for the selected day on right. Booking form (name + email). Google Calendar event created with booker as attendee. Confirmation screen on success. Expired/stale offer error pages. Mobile-friendly layout.

**Key decisions:**
- No account required for recipients
- Claimed slots hidden entirely (not strikethrough)
- Month calendar highlights days with available slots
- Slot items show time range and duration

---

### Sprint 3.5 — Deploy to GCP + Core UX Fixes ✅ March 2026
**Outcome:** App deployed to GCP Cloud Run at `https://openslot-653554267204.us-east1.run.app`. Firestore persistence for offers (survive redeployments). "Copy Availability Link" one-click button in nav. Timezone-aware booking page with searchable timezone selector. Owner Gmail notification on booking. Google OAuth scopes updated for `gmail.send`.

**Key decisions:**
- "Copy Availability Link" copies a single full-availability URL — no modal, no drag required
- Offers stored in Firestore (production) with in-memory fallback for dev/test
- Firestore transactions used for atomic slot claiming (prevents race conditions)
- Timezone auto-detected via `Intl.DateTimeFormat().resolvedOptions().timeZone`, searchable override dropdown with friendly names
- All times stored in UTC, rendered in user's local timezone on frontend
- Owner notification via Gmail API (fire-and-forget) — no third-party email service
- `trust proxy` enabled for secure cookies behind Cloud Run's TLS termination
- Dead BookingPage preview component removed

**Post-launch fixes:**
- Owner added as accepted attendee on booking events (so event appears on their calendar)
- "Send Slots" button lifted to sticky header (visible during scroll)
- Working hours expanded to 8am–8pm ET
- Window-based URLs (`?window=N`) for curated message links

---

### Sprint 4 — Usefulness ✅ March 2026
**Outcome:** Google Meet links added to every booking invite automatically. Settings page at `/settings` with gear icon in nav. Working days, working hours, buffer time, and default duration are all configurable and saved to Firestore. Availability engine and WeekGrid both respect saved settings.

**Feature 1 — Google Meet Integration:**
- `conferenceData` with `createRequest` using `crypto.randomUUID()` added to calendar event insert
- `conferenceDataVersion: 1` passed in API call
- Both owner and guest see Meet link in their calendar event

**Feature 2 — Settings Page:**
- Backend: `GET/PUT /api/settings` routes, Firestore persistence keyed by user email
- Working days: 7 individual toggles (Sun–Sat), default Mon–Fri
- Working hours: start/end selectors in 30-min increments across full 12am–12am range, default 8am–8pm
- Buffer time and default duration: custom +/− stepper buttons (Arc Blue), replacing native number inputs
- Availability engine reads from saved settings, falls back to defaults if none exist
- WeekGrid dynamically renders columns based on `workingDays` and adjusts row range based on `workingHours`
- Styled with existing design system: dark glassmorphism panel, Arc Blue labels, Amber "Save Settings" button with inline "Saved!" confirmation
- "Back to calendar" link (Arc Blue) at top of settings page; gear icon toggles between settings and calendar

**Key decisions:**
- Settings stored in Firestore `settings` collection, keyed by owner email
- `workingDays` stored as array of day numbers `[0=Sun, 1=Mon, ..., 6=Sat]`
- Availability engine replaced hardcoded Sat/Sun skip with configurable `workingDays` array
- `DEFAULT_CONFIG` updated to include `workingDays: [1, 2, 3, 4, 5]`
- Query param overrides preserved for backward compatibility

**Local dev fix:**
- Fixed OAuth login loop on localhost — `REACT_APP_API_URL` was bypassing CRA proxy, causing cross-origin cookie issues. API calls now route through the CRA proxy (same-origin); separate `REACT_APP_BACKEND_URL` used only for OAuth full-page redirect.

**QA fixes:**
- Week navigation prev/next crash: `getWeekDates` return shape changed to `{date, dayNum}` objects but `handleWeekChange` still called `.toISOString()` on the wrapper object — fixed to access `.date` property
- "Today" pill button added to week nav header — sits left of the right arrow, Arc Blue when active, greyed out + disabled when already on current week
- Settings page back navigation: gear icon on `/settings` navigates to `/`; "Back to calendar" Arc Blue link above the panel

---

### Sprint 5 — Resiliency + Security ✅ March 2026
**Outcome:** All owner-only API routes audited and confirmed behind `requireAuth` middleware. New security test suite validates auth enforcement. GitHub Actions CI pipeline runs on every push to main and every PR.

**API Security Audit:**
- All 5 owner routes already had `requireAuth`: `GET /api/availability`, `POST /api/offers`, `GET/PUT /api/settings`, `GET /api/calendar/events`
- Public routes confirmed accessible without auth: `GET /api/offers/:offerId`, `POST /api/offers/:offerId/book`, `GET /health`
- No code changes needed — auth middleware was correctly applied from earlier sprints
- New `security.test.js` with 8 tests locking down the auth contract (50 total tests now)

**GitHub Actions CI:**
- `.github/workflows/ci.yml` — triggers on push to main and PRs
- Installs backend + frontend deps, runs Jest tests, builds frontend
- Node.js 22 (bumped from 20 to avoid deprecation warnings)
- Verified red/green cycle: intentionally broke a test → CI failed → reverted → CI passed

**Key decisions:**
- CI runs frontend build (not frontend tests) since there are no frontend unit tests yet — build step catches syntax/import errors
- No deployment step in CI — deploys remain manual via `gcloud run deploy`

---

### Sprint 6 — Security Hardening ✅ March 2026
**Outcome:** App hardened against abuse and data leakage across 5 areas. Firestore-backed IP rate limiting on the public booking endpoint. Calendar data leakage audit confirmed clean. Global error handler added. All public error responses verified to expose no internal details. 61 total tests, all passing in CI.

**1. Rate Limiting:**
- Firestore-backed (production) / in-memory (dev/test) IP rate limiter
- `checkRateLimit` function in `store.js` — tracks attempt timestamps per IP, prunes expired entries
- Express middleware in `middleware/rateLimit.js` — configurable `maxAttempts` and `windowMs`
- Applied to `POST /api/offers/:offerId/book` — 10 attempts per IP per 15-minute rolling window
- Returns clean `429 { error: "Too many requests. Please try again later." }`
- Fails open if Firestore check errors (doesn't block legitimate users)

**2. Calendar Data Leakage Audit:**
- GET `/api/offers/:offerId` returns only whitelisted fields: id, duration, timezone, windows, slots, expiresAt, status
- No tokens, ownerEmail, bookedBy, or calendar metadata (summary, description, attendees, organizer) exposed
- Tests lock in the whitelist behavior

**3. Credential & Secret Exposure Audit:**
- All routes audited — no tokens, session secrets, or env var values in any API response
- Tokens stripped via destructuring (`const { tokens, ...safeOffer } = offer`) on create
- Public GET uses explicit field whitelist (not spread)

**4. Unauthorized Calendar Manipulation Audit:**
- Calendar events only created in booking POST route, requiring: valid active offer in Firestore + unclaimed slot + stored OAuth tokens
- Security preconditions documented in JSDoc comments

**5. Error Message Hardening:**
- Global Express error handler added to `app.js` — catches unhandled errors, returns `{ error: "Internal server error" }` with no stack traces
- All public route errors verified to contain no file paths, stack traces, or internal error codes beyond the defined set

**Key decisions:**
- Firestore-backed rate limiting chosen over in-memory to survive Cloud Run cold starts and work across multiple instances
- Rate limiting scoped to booking endpoint only — owner routes are auth-gated, GET offer is read-only
- `rateLimits` Firestore collection keyed by sanitized IP address

---

### Sprint 7 — Bug Fixes + UX Polish ✅ March 2026
**Outcome:** Owner Gmail notification fixed, live calendar availability check added to booking page, duration selector redesigned as glassmorphism dropdown with 15-min support, calendar grid contrast improved. Dynamic grid cell granularity for 15-min duration.

**Bug Fix 1 — Owner Gmail Notification:**
- Fixed RFC 2822 message format: added `From:` header, `MIME-Version: 1.0`, switched to `\r\n` line endings
- Full error details now logged (not just `err.message`) for visibility in Cloud Run logs

**Bug Fix 2 — Stale Offer Availability (skipped):**
- Already handled — `calendar.events.insert` runs before `store.claimSlot`, so invalid emails never claim slots

**Bug Fix 3 — Live Calendar Check on Booking Page:**
- `GET /api/offers/:offerId` now queries owner's Google Calendar using stored OAuth tokens
- Slots that conflict with current calendar events are filtered out entirely (not shown as unavailable)
- Falls back silently to Firestore snapshot if live check fails (expired token, API error)

**UX 1 — Duration Selector Redesign:**
- Pill buttons replaced with glassmorphism `<select>` dropdown
- Supports 15, 30, 45, 60 min (added 15-min option)
- Backend validation updated to accept `[15, 30, 45, 60]`
- Styled with Arc Blue border, custom chevron, glass background, JetBrains Mono font

**UX 2 — Calendar Grid Contrast (Variant B: Medium):**
- Time labels: opacity 0.3 → 0.5
- Busy hatch stripe: opacity 0.04 → 0.08, spacing 5px → 3px
- Busy block base fill: added `rgba(255,255,255,0.05)`

**Post-testing fix — Dynamic Grid Cell Granularity:**
- WeekGrid grid cells were hardcoded to 30-min. When 15-min duration selected, grid now renders 4 cells per hour (15-min each) instead of 2 (30-min each)
- `formatHour`, `isSlotAvailable`, `getSelectedWindows` all parameterized by `cellMinutes`
- Selection auto-clears when duration changes (cell boundaries shift)
- Fixes both the grid visual and the generated message copy (window times now match actual cell size)

**Key decisions:**
- Cell granularity is 15 min when duration is 15, otherwise 30 min — keeps grid manageable for longer durations
- Bug Fix 2 skipped after confirming existing code already prevents the issue

---

### Sprint 8 — Bug Fixes from Real-World Usage ✅ March 2026
**Outcome:** Two bugs from the first real external booking attempt fixed. Clipboard copy now works across iOS Firefox/Safari via fallback. Booking form validates email format before submission.

**Bug Fix 1 — Copy Availability Link on iOS Firefox:**
- Added `copyToClipboard` helper with `navigator.clipboard.writeText` as primary method
- Fallback: creates temporary `<textarea>`, selects text with `setSelectionRange`, uses `document.execCommand('copy')`
- Applied to all three clipboard write locations (Copy Availability Link, Send Slots modal, message copy)

**Bug Fix 2 — Email Validation on Booking Form:**
- Frontend validation: must contain `@` and a `.` after the `@`
- Error shown on blur, clears as user corrects input
- Submit button disabled while email is invalid
- Inline error styled in Rose Red (`#F43F5E`) per design system
- Backend already rejects invalid emails (Sprint 7) — this is the UX layer on top

**Key decisions:**
- Simple email check preferred over RFC 5322 regex — catches real typos like `user@gmailcom` without overcomplicating
- No external validation library needed
- Clipboard fallback uses `readonly` textarea to prevent iOS keyboard flash

---

### Sprint 9 — Open Source Release ✅ March 2026
**Outcome:** Repo prepared for public open source release. README, LICENSE, and .env.example all in place.

**Deliverable 1 — README.md:**
- What is OpenSlot (2-sentence pitch)
- 4 screenshot placeholders with descriptive labels
- Features bullet list
- Prerequisites (Google account, GCP project, Node.js 22)
- Full GCP setup walkthrough: create project, enable Calendar + Gmail APIs, OAuth consent screen with all 5 scopes, create credentials
- Environment variables table with plain-English descriptions and where to find each value
- Local dev instructions with exact commands
- How It Works section explaining both offer types
- No Cloud Run deploy section (out of scope per spec)

**Deliverable 2 — LICENSE:**
- MIT license at repo root, copyright jakeshaver

**Deliverable 3 — .env.example audit:**
- Updated redirect URI and FRONTEND_URL to localhost defaults (was pointing to production placeholder)
- Added NODE_ENV=development
- Confirmed all env vars used in codebase are covered
- `BASE_URL` and `FIRESTORE_PROJECT_ID` from spec are NOT used in code — omitted

**Deliverable 4 — Hardcoded value audit:**
- No owner-specific values (email, project ID, Cloud Run URL) found in source code
- Cloud Run URL only appears in devlog and spec (documentation, not code)

---

### Sprint 10 — PWA ✅ March 2026
**Outcome:** OpenSlot is now installable as a PWA on iPhone home screen. Opens full-screen with no browser chrome. Mobile owner experience simplified. App icon matches approved Option B design.

**Deliverable 1 — Web App Manifest:**
- `manifest.json` in `public/` with `standalone` display mode, navy theme color, OpenSlot name
- Icons at 192×192 and 512×512 linked in manifest

**Deliverable 2 — App Icons:**
- Option B calendar design: dark navy background, rounded calendar outline, header bar, grid lines, single amber cell
- Generated programmatically via one-time Node.js Canvas script (script deleted after use)
- Three sizes: 192×192, 512×512, 180×180 (Apple touch icon)

**Deliverable 3 — Service Worker:**
- Minimal `sw.js` — install and activate only, no caching or offline support
- Satisfies PWA installability criteria without unnecessary complexity

**Deliverable 4 — iOS Meta Tags:**
- `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` (black-translucent), `apple-mobile-web-app-title`
- `theme-color` meta tag for Android/Chrome
- Apple touch icon linked in `index.html`

**Deliverable 5 — Mobile Owner Experience:**
- On screens < 768px: week grid hidden, replaced with simplified mobile view
- Mobile view contains only: duration selector dropdown (Arc Blue) and full-width "Copy Availability Link" button (Amber)
- Nav bar on mobile hides redundant "Copy Availability Link" button and username — only gear icon and Sign Out remain
- Desktop view completely unchanged

**Key decisions:**
- No offline support — app requires live calendar data, service worker is minimal
- `cloudbuild.yaml` region corrected from `us-central1` to `us-east1` to match actual service
- Mobile owner view uses CSS media queries for show/hide — no JS-based responsive logic needed

---

### Sprint 11 — Refactor & Code Quality ✅ March 2026
**Outcome:** Zero-functional-change cleanup sprint. Duplicated backend logic extracted into shared helpers. Frontend dead code removed. Hardcoded CSS hex values replaced with design system variables.

**Backend — Shared Calendar Helpers:**
- Created `backend/src/helpers/calendar.js` with 5 extracted functions:
  - `createCalendarClient(tokens)` — OAuth2 client setup (was duplicated 5× across routes)
  - `filterBusyEvents(events)` — strips declined/transparent events (was duplicated 3×)
  - `fetchBusyEvents(calendar, timeMin, timeMax)` — fetches + filters in one call
  - `hasConflict(calendar, start, end)` — live conflict check against current calendar
  - `getSlotBounds(slot, duration)` — computes slot start/end from offer window
- Refactored `offers.js`, `calendar.js`, `availability.js` to use shared helpers
- `offers.js` reduced from ~360 lines to ~300 lines

**Frontend — Dead Code & CSS Variables:**
- Removed unused `claimed` state and all references from `BookingPage.js`
- Added CSS variables `--error: #F43F5E` and `--option-bg: #0f1628`
- Replaced hardcoded hex values with CSS variable references
- Moved inline `style` on logo link to CSS class

**Key decisions:**
- All 63 tests pass unchanged — confirms zero functional impact
- Frontend build succeeds with no warnings from changed code
- No new abstractions beyond what was directly duplicated

---

### Bug Fixes — March 13, 2026
**Outcome:** Four bugs fixed and deployed. Copy Availability Link now works correctly across all scenarios.

**Bug Fix 1 — Copy Availability Link only showing today's slots:**
- `handleCopyAvailabilityLink` was building the offer from the `slots` React state, which was scoped to whichever week the WeekGrid was displaying. On a Friday, the current week view only had today left as a working day.
- Fix: the function now fetches fresh availability directly from the API, independent of the WeekGrid view.

**Bug Fix 2 — Copy Availability Link spans 7 working days (not 7 calendar days):**
- Previously passed `daysAhead=7` (calendar days). On a Friday with Mon–Fri schedule, that only reached Wednesday — missing 2 working days.
- Fix: calculates how many calendar days are needed to cover 7 working days based on the user's configured schedule. On Friday with Mon–Fri, fetches 11 calendar days (Fri + next Mon–Fri + following Mon).

**Bug Fix 3 — iOS Safari clipboard silently failing:**
- Clipboard write happened after async API calls, breaking iOS's requirement that clipboard access occurs within a synchronous user gesture handler.
- Fix: hidden textarea is created, focused, and selected immediately on click (preserving gesture context). After async work completes, the textarea is updated and `execCommand('copy')` is called. Modern `navigator.clipboard` API tried first for desktop browsers.

**Bug Fix 4 — Busy block rendering with custom working days:**
- CSS rule `.week-grid > :nth-child(n+7):nth-child(-n+12)` hardcoded 6 columns (1 time label + 5 Mon–Fri days). Changing working days in Settings caused grid cells to misalign across columns.
- Fix: removed hardcoded CSS rule, first-row margin applied dynamically via inline styles in WeekGrid.js.

**Bug Fix 5 — Expired offer not handled in booking form:**
- If an offer expired between page load and booking submission, the POST returned `offer_expired` but the frontend didn't check for that code, falling through to a generic error.
- Fix: added `offer_expired` handler to the booking submission error flow, showing the proper expired error page.

---

## QA Standard
Every sprint ships with a 10-item QA checklist covering:
- Core functionality end to end
- Edge cases and error states
- Data persistence (verify in Firestore)
- Design system compliance (Arc Blue / Amber usage)
- Google Calendar integration accuracy
- Browser console clean (no errors)

See `openslot-spec.md` for sprint-specific checklists.

---

## Open Source Notes

### For contributors cloning this repo:
- You need a Google account and a GCP project — nothing else
- No paid services, no third-party email providers, no subscription dependencies
- All secrets go in `.env` (see `.env.example` for required variables)
- Google Calendar native invites handle booking confirmations

### Design contributions:
- All UI decisions reference `openslot-design-system.md`
- Do not introduce new accent colors without updating the design system doc
- The two-color system (Arc Blue + Amber) is intentional — keep it

### License: MIT
Clone it, fork it, build on it.

---

## Glossary

| Term | Definition |
|---|---|
| Offer | A set of time windows the owner has made available for booking, stored in Firestore with a unique ID and 7-day expiry |
| Window | A free-form dragged time block (e.g. 10am–4pm) — contains multiple bookable slots |
| Slot | A fixed-increment bookable unit within a window (e.g. a 30-min slot at 2:00pm) |
| offer_stale | Error code returned when all slots in an offer have been made unavailable by calendar changes since the offer was created |
| Buffer | 15-minute padding applied before and after existing calendar events — slots cannot start or end within this buffer |
| Arc Blue | `#00A8FF` — primary accent, used for structure and information elements |
| Amber | `#F59E0B` — secondary accent, used for actions and CTAs |
