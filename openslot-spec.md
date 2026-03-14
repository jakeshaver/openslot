# OpenSlot — Product Spec & Development Roadmap
**Version:** 1.8  
**Created:** March 2026  
**Owner:** Project lead  
**Stack:** GCP · Google Calendar API · OAuth 2.0 · Node.js · React  
**Repo:** https://github.com/jakeshaver/openslot  
**Design System:** openslot-design-system.md  

---

## What Is OpenSlot?

OpenSlot is an open-source, self-hosted scheduling web app that gives professionals a smarter alternative to third-party scheduling tools — without the monthly fee. It lives on Google Cloud, connects to your Google Calendar, and does two things:

1. **Slot Picker (for you):** Open the app, see your calendar, drag to select which times you want to offer, and get a copyable message with magic links embedded — ready to paste into any email or DM.

2. **Booking Page (for them):** The recipient clicks a link, sees only the times you offered, picks one, and it auto-books on your Google Calendar. No account needed. Confirmation sent to both parties.

---

## Core Principles

- **Own your stack** — no third-party scheduling SaaS, no per-seat fees
- **Open source first** — every architectural decision should be clone-and-deploy friendly
- **Professional grade** — something you'd feel comfortable sending to a hiring manager
- **Mobile-friendly** — recipients are often on their phones
- **GCP-native** — built on Google Cloud to minimize complexity for a Google Calendar user
- **Drag-to-select UX** — drag-to-select availability, copy-paste human touch, not a generic booking link

---

## Two Offer Types

**Type A — "Copy Availability Link" (Full Availability):**
- Single button click in nav → copies one URL to clipboard
- Single-use offer, all available slots across next 7 working days
- Recipient sees full booking page, picks any slot
- No message text generated — just the URL

**Type B — "Curated Offer" (Drag Select):**
- Drag windows on week grid → Generate Message
- Human-readable text, one URL per dragged window
- Recipient clicks a window URL, sees slots within that window
- Personal, intentional, used mid-conversation

Both are single-use. Neither is a persistent reusable link.

---

## User Stories

### As the calendar owner (you):
- I can sign in with my Google account
- I can see my upcoming availability in a week grid view
- I can drag across free time blocks to select what I want to offer
- I can set the booking increment (15 / 30 / 45 / 60 min)
- I can generate a copyable message with each time window as a hyperlink
- I can click "Copy Availability Link" to instantly copy a full-availability booking URL
- I can configure my working days, working hours, buffer time, and default meeting duration via a settings page
- I receive a Gmail notification when someone books a slot
- I can install the app on my iPhone home screen as a PWA
- On mobile, I can copy my availability link without needing the full week grid

### As the recipient (recruiter, colleague, etc.):
- I can open a link and see the specific times offered to me
- I can view available times in my local timezone, with a searchable timezone override dropdown
- I can click a time to claim it
- I can confirm my name and email before booking
- I receive a Google Calendar invite (with Google Meet link) after booking
- I cannot double-book a slot already taken
- I see a clean "no times available" message if all slots are conflicted
- I see a clean expired message if the offer is past its 7-day window

---

## Technical Architecture

```
[Your Browser]
     |
     v
[React Frontend — hosted on GCP Cloud Run]
     |
     v
[Node.js Backend — hosted on GCP Cloud Run]
     |
     ├──> [Google Calendar API] — read/write calendar events
     ├──> [Gmail API] — owner booking notification emails
     ├──> [Google OAuth 2.0] — authenticate the calendar owner
     └──> [Firestore] — store booking offers, sessions & user settings
```

### Key Technical Decisions
| Decision | Choice | Rationale |
|---|---|---|
| Frontend | React | Component-based, large community, easy to hire/get help |
| Backend | Node.js | Same language front-to-back, GCP native support |
| Hosting | GCP Cloud Run | Scales to zero (free when idle), containerized |
| Database | Firestore | Serverless, free tier, no schema management |
| Auth | Google OAuth 2.0 | Direct integration with Google Calendar |
| Calendar | Google Calendar API | Direct integration, no middleware |
| Unique IDs | Node.js `crypto.randomUUID()` | Built-in, no ESM dependency issues |
| Timezones | UTC storage, local render | All times stored in UTC, converted to user/booker timezone on render |
| Email notifications | Gmail API | No third-party email service needed — uses owner's existing OAuth credentials |
| Conference links | Google Meet via conferenceData | No new dependencies — native Calendar API support |
| Rate limiting | Firestore-backed IP counter | Survives cold starts, works across multiple Cloud Run instances |

---

## QA Checklist Template
> **Standard practice:** Run this checklist after every sprint before marking it done.
> Adapt the specific test cases per sprint — the structure is always the same.

```
### Sprint [N] — QA Checklist

FUNCTIONALITY
- [x] 1. Core feature works end to end
- [x] 2. Edge case or boundary condition handled
- [x] 3. Error / failure state handled correctly
- [x] 4. Data persists correctly (verify in Firestore or expected location)

UI & DESIGN
- [x] 5. Arc Blue used correctly for info/structure elements
- [x] 6. Amber used correctly for action/CTA elements
- [x] 7. Disabled states are visually dim — no accent colors
- [x] 8. Glassmorphism panels render with blur + border

INTEGRATION
- [x] 9. Feature connects correctly to real Google Calendar data
- [x] 10. No console errors in browser dev tools during normal use
```

---

## Sprint Close & Advance SOP
> Follow this at the end of every sprint before opening a new CC session.

1. **QA sign-off** — all 10 checklist items checked in chat
2. **CC updates `devlog.md`** — re-upload updated devlog to project
3. **Updated `spec.md` generated** — produced as artifact in chat, download and re-upload to project
4. **Deploy to production** — only after files are synced
5. **Next sprint brainstorm** — scope and decisions finalized in chat before any CC prompt is drafted

---

## Bug & Edge Case Backlog
> Known issues discovered during real-world usage.

1. ~~**Invalid email voids offer**~~ — resolved Sprint 7
2. ~~**Stale offer availability display**~~ — resolved Sprint 7
3. **iCloud email recipients don't get calendar invite** — Google Calendar invites sent to iCloud email addresses appear in the recipient's inbox but don't attach to their Apple Calendar. Likely a CalDAV/`.ics` handshake issue between Google and Apple's calendar protocol. Needs investigation.
4. ~~**"Copy Availability Link" copies wrong URL on iOS Firefox**~~ — resolved Sprint 8
5. ~~**Booking form accepts malformed email addresses**~~ — resolved Sprint 8
6. **Owner Gmail notification not firing** — Gmail API send has been silently failing across multiple sprints. Sprint 7 added error logging and fixed RFC 2822 message format but notification still not confirmed on production. Needs dedicated investigation: verify `gmail.send` OAuth scope is present on stored tokens, check Cloud Run logs for actual error, consider whether token refresh on Cloud Run is the root cause. Keep Gmail API, fix the implementation.
7. ~~**Week grid loses context on scroll**~~ — resolved Sprint 12 (sticky headers, stronger separators, time label contrast)

---

## Sprint Roadmap

---

### Sprint 0 — Foundation ✅
**Goal:** Prove the pipes work. Auth + Calendar read. Nothing pretty.  
**Definition of done:** Sign in with Google and see upcoming calendar events on screen.

### Sprint 0 — QA Checklist ✅
- [x] 1. Google OAuth sign-in completes without error
- [x] 2. Calendar events for next 7 days appear on screen after auth
- [x] 3. Sign out works and clears session
- [x] 4. `.env` file is not committed to GitHub — `.env.example` present instead
- [x] 5. No credentials visible in the public repo
- [x] 6. Local server runs cleanly on both frontend and backend ports
- [x] 7. Jest tests pass for auth flow
- [x] 8. Jest tests pass for calendar fetch
- [x] 9. Real calendar data shown matches actual Google Calendar
- [x] 10. No console errors during sign-in flow

---

### Sprint 1 — Availability Engine ✅
**Goal:** Smart free-slot detection. Given your calendar, return available blocks.  
**Definition of done:** App returns free time blocks filtered by working hours with busy times blocked out.

### Sprint 1 — QA Checklist ✅
- [x] 1. `/api/availability` returns free blocks for the next 7 days
- [x] 2. Busy times from Google Calendar are correctly excluded
- [x] 3. Buffer time (15 min) is applied before and after existing events
- [x] 4. All-day events block the entire day
- [x] 5. Saturday and Sunday are never returned as available
- [x] 6. No slots returned outside working hours
- [x] 7. Back-to-back meetings produce no available slot between them
- [x] 8. Jest tests all pass including edge cases
- [x] 9. Response reflects real calendar data, not mock data
- [x] 10. No console errors during availability fetch

---

### Sprint 1.5 — UI Foundation ✅
**Goal:** Week grid for slot picking. Dark glassmorphism aesthetic. Arc Blue + Amber design system applied.  
**Definition of done:** Week grid renders correctly, drag selection works, design system fully applied.

### Sprint 1.5 — QA Checklist ✅
- [x] 1. Week grid shows Mon–Fri only, no weekends
- [x] 2. Time range is 9am–6pm, nothing outside those hours
- [x] 3. Busy blocks from Google Calendar show as hatched/unavailable
- [x] 4. Cannot drag over busy blocks
- [x] 5. Free block drag highlights in Amber with glow
- [x] 6. Multiple selections across different days work simultaneously
- [x] 7. Duration selector (30m/45m/60m) toggles correctly in Arc Blue
- [x] 8. Generate Message button is dim/disabled with no slots selected
- [x] 9. Generate Message button is Amber and glowing when slots are selected
- [x] 10. No console errors during drag interaction

---

### Sprint 2 — Offer Engine & Real-Time Conflict Check ✅
**Goal:** Wire availability to the grid, persist offers to Firestore, real-time conflict check at booking time.  
**Definition of done:** Drag → Generate Message → offer saved to Firestore → copyable message with links → live conflict check when recipient books.

**Key decisions:**
- No auto-hold events on calendar (avoids clutter)
- Real-time conflict check at booking time instead
- If all slots in an offer are conflicted → return `offer_stale` error with "contact directly" message
- Offer expiry: 7 days

### Sprint 2 — QA Checklist ✅
- [x] 1. Week grid loads real Google Calendar data — busy blocks match actual calendar
- [x] 2. Cannot drag over busy blocks
- [x] 3. Generate Message creates a new offer document in Firestore
- [x] 4. Firestore offer document has correct fields: slots, duration, expiry, status=active
- [x] 5. Generated message shows each slot as an Arc Blue hyperlink
- [x] 6. Copy button (Amber) copies full formatted message correctly
- [x] 7. Duration selector changes the number of slots in the generated message
- [x] 8. Week navigation reloads availability for the new week
- [x] 9. Booking a conflicted slot returns an error
- [x] 10. If all slots are conflicted, booking page shows "no times available — contact directly" message

---

### Sprint 3 — Booking Page (Their View) ✅
**Goal:** The page recipients see. Mobile-friendly, no account needed, auto-books on confirm.  
**Definition of done:** Recipient opens link, picks a time, enters name/email, calendar event created for both parties.

### Sprint 3 — QA Checklist ✅
- [x] 1. Booking page loads from a generated link without requiring sign-in
- [x] 2. Month calendar shows correct available days
- [x] 3. Selecting a day shows correct time slots for that day
- [x] 4. Already-claimed slots appear greyed out and unclickable
- [x] 5. Submitting name/email creates the event in Google Calendar
- [x] 6. Confirmation screen appears after successful booking
- [x] 7. Booker receives a Google Calendar invite to the booked event
- [x] 8. Attempting to book a claimed slot returns an appropriate error
- [x] 9. Expired offer link shows a clean friendly error page
- [x] 10. Booking page looks correct and usable on iPhone Safari

---

### Sprint 3.5 — Deploy to GCP + Core UX Fixes ✅
**Goal:** App live on production URL. Full Availability offer type shipped. Firestore persistence. Timezone support. Owner notifications.  
**Definition of done:** Real users can book via production URL. Owner is notified. Offers survive redeployments.

**What was built:**
- Deployed to GCP Cloud Run at `https://openslot-653554267204.us-east1.run.app`
- "Copy Availability Link" button in nav — single click copies full-availability booking URL, no modal
- Firestore persistence for offers — survive redeployments and cold starts
- Timezone-aware booking page — auto-detects booker's browser timezone, searchable override dropdown
- All times stored in UTC, rendered in local timezone on frontend
- Owner Gmail notification on booking via Gmail API
- Google OAuth scopes updated to include `gmail.send`

### Sprint 3.5 — QA Checklist ✅
- [x] 1. "Copy Availability Link" button appears in nav
- [x] 2. Clicking it copies a single URL to clipboard (no modal/panel)
- [x] 3. Button shows "Copied!" in Amber for 2 seconds
- [x] 4. Pasting the URL and opening it shows full booking page with all available slots
- [x] 5. Curated drag-select + Generate Message still works unchanged
- [x] 6. App loads on the Cloud Run URL without errors
- [x] 7. Google OAuth sign-in works on production URL
- [x] 8. Calendar grid loads real data on production
- [x] 9. Generated URLs use the production BASE_URL, not localhost
- [x] 10. End-to-end: copy link → open in incognito → book a slot → event appears on Google Calendar

---

### Sprint 4 — Usefulness ✅
**Goal:** Make the app meaningfully more useful for the owner and booker.  
**Definition of done:** Google Meet added to every invite. Owner can configure their own working days, hours, buffer, and duration via a settings page. All availability calculations respect saved settings.

**Key decisions:**
- Settings stored in Firestore under the owner's user document (keyed by Google user ID)
- Availability engine reads from saved settings, falls back to defaults if none exist
- Working days fully configurable (any combination of Sun–Sat)
- Working hours fully configurable across full 12am–12am range in 30-min increments
- Buffer time and default duration are free numeric inputs in minutes
- Google Meet added via `conferenceData` in Calendar API — no new dependencies
- `workingDays` stored as array of day numbers `[0=Sun, 1=Mon, ..., 6=Sat]`
- Today button added to week grid header

### Sprint 4 — QA Checklist ✅
- [x] 1. Gear icon appears in nav and links to `/settings`
- [x] 2. Settings page renders with all four config fields
- [x] 3. Working day toggles save and reload correctly
- [x] 4. Working hours save and reload correctly
- [x] 5. Buffer time and duration save and reload correctly
- [x] 6. Week grid reflects saved working days
- [x] 7. Availability respects saved working hours — no slots outside defined range
- [x] 8. Every new booking invite includes a Google Meet link
- [x] 9. Meet link appears in both owner and guest calendar events
- [x] 10. No console errors during settings save or availability load

---

### Sprint 5 — Resiliency + Security ✅
**Goal:** Lock down the API. Add CI to catch regressions on every push.  
**Definition of done:** `/api/availability` is inaccessible to unauthenticated users. GitHub Actions runs tests on every PR.

**Key decisions:**
- All 5 owner routes already had `requireAuth` middleware correctly applied
- New `security.test.js` with 8 tests — 50 total tests
- CI runs frontend build — no frontend unit tests yet
- No deployment step in CI — manual via `gcloud run deploy`
- Node.js bumped to 22 in CI

### Sprint 5 — QA Checklist ✅
- [x] 1. `/api/availability` returns 401 without valid session
- [x] 2. `/api/offers` POST returns 401 without valid session
- [x] 3. `/api/settings` GET and PUT return 401 without valid session
- [x] 4. All other owner routes return 401 without auth
- [x] 5. Public `/book/:offerId` route still works without auth
- [x] 6. GitHub Actions workflow file present in repo
- [x] 7. CI runs and passes on a test PR
- [x] 8. CI fails correctly when a test is broken
- [x] 9. Full end-to-end booking flow still works after auth middleware changes
- [x] 10. No console errors after security changes

---

### Sprint 6 — Security Hardening ✅
**Goal:** Harden the app against abuse and data leakage before open-sourcing.  
**Definition of done:** Rate limiting active. No private calendar data exposed. No secrets leaking through errors or API responses.

**Key decisions:**
- Firestore-backed rate limiting — 10 attempts per IP per 15-minute rolling window on booking endpoint
- CAPTCHA out of scope — rate limiting preferred to avoid user friction
- Offer IDs are `crypto.randomUUID()` (128-bit) — sufficient entropy
- `rateLimits` Firestore collection keyed by sanitized IP address

### Sprint 6 — QA Checklist ✅
- [x] 1. Booking endpoint returns 429 after 10 rapid attempts from same IP
- [x] 2. Normal booking still works after rate limit window resets
- [x] 3. Public offer fetch returns no calendar event titles or attendee data
- [x] 4. Booking confirmation response returns no private calendar metadata
- [x] 5. No OAuth tokens, session secrets, or env var values in any API response
- [x] 6. Error responses on public routes contain no stack traces or file paths
- [x] 7. Booking without valid offer ID returns clean `not_found` error
- [x] 8. No calendar event can be created without valid active offer in Firestore
- [x] 9. All new security tests pass in CI
- [x] 10. Full end-to-end booking flow still works after all hardening changes

---

### Sprint 7 — Bug Fixes + UX Polish ✅
**Goal:** Fix persistent owner notification bug, resolve backlog edge cases, and improve calendar grid readability and duration selector UX.  
**Definition of done:** Invalid bookings no longer void offers. Booking page reflects live calendar state. Duration selector includes 15-min option. Calendar grid is clearly readable in bright environments. Gmail notification partially fixed (message format corrected, still under investigation on production).

**Key decisions:**
- Owner Gmail notification failure is a silent backend error — needs investigation and reliable error handling
- Slot claiming only persists on verified successful Google Calendar event creation, not on submission attempt
- Booking page re-checks live calendar state on every load — slots blocked by calendar changes since offer creation are silently hidden (consistent with claimed slot behavior)
- Duration selector redesigned as dropdown (15/30/45/60 min) replacing pill buttons
- Time label opacity and busy block hatch contrast increased for readability in bright environments

### Sprint 7 — QA Checklist ✅
- [~] 1. Owner Gmail notification — NOT RESOLVED. Still not firing on production. Moved to bug backlog #6 for dedicated fix sprint.
- [x] 2. Notification email format correct (unverifiable until send is working)
- [x] 3. Booking with an invalid email returns an error and does not claim the slot
- [x] 4. Slot remains available after a failed booking attempt
- [x] 5. Booking page hides slots that have become unavailable due to calendar changes since offer creation
- [x] 6. Duration selector shows 15/30/45/60 options as a dropdown
- [x] 7. Selecting 15 min correctly generates 15-min slots on the booking page
- [x] 8. Time labels on week grid are clearly readable (test in a bright environment)
- [x] 9. Busy blocks are clearly distinguishable from free blocks at a glance
- [x] 10. No console errors and full end-to-end booking flow works after all changes

---

### Sprint 8 — Bug Fixes from Real-World Usage ✅
**Goal:** Fix the two bugs surfaced from the first real external booking attempt.  
**Definition of done:** "Copy Availability Link" correctly copies a `/book/:offerId` URL on iOS Firefox and iOS Safari. Booking form rejects malformed email addresses before submission.

**Key decisions:**
- "Copy Availability Link" bug is iOS Firefox specific but fix should be verified across iOS Safari and desktop Chrome
- Frontend email validation is a simple format check (must contain `@` and a `.` after it) with inline error — no external validation library needed
- Backend already handles the invalid email case in Sprint 7 — this is purely a frontend UX layer on top

**Bugs addressed:**
- Bug #4 — "Copy Availability Link" copies wrong URL on iOS Firefox
- Bug #5 — Booking form accepts malformed email addresses

### Sprint 8 — QA Checklist ✅
- [x] 1. "Copy Availability Link" on iOS Firefox copies a valid `/book/:offerId` URL
- [x] 2. "Copy Availability Link" on iOS Safari copies a valid `/book/:offerId` URL
- [x] 3. Opening the copied URL on a fresh browser session shows the correct booking page
- [x] 4. Booking form shows inline error for missing `@` in email field
- [x] 5. Booking form shows inline error for missing `.` after `@` (e.g. `user@gmailcom`)
- [x] 6. Form does not submit while email is invalid
- [x] 7. Valid email clears the error and allows submission
- [x] 8. Error message styled correctly per design system (rose red, not amber or blue)
- [x] 9. No console errors during clipboard copy or form validation
- [x] 10. Full end-to-end booking flow still works after all changes

---

### Sprint 9 — Open Source Release ✅
**Goal:** Make the repo ready for a public open source release. A technically capable person who has never used GCP before should be able to clone, configure, and run OpenSlot without asking for help.  
**Definition of done:** README covers what the app does and local dev setup, with screenshot placeholders. LICENSE file added. `.env.example` reviewed and confirmed complete. Repo is clean of any owner-specific values.

**Key decisions:**
- Target audience: technically capable, GCP novice — explain GCP-specific steps clearly, don't assume prior knowledge
- README covers: what the app does, prerequisites, local dev setup, environment variables reference
- Screenshot placeholders included so owner knows exactly which screenshots to capture and add manually
- Full Cloud Run deploy instructions are out of scope for README v1 — local dev is the entry point for contributors
- `LICENSE` file added as MIT at repo root
- `.env.example` reviewed and confirmed to contain all required variables with no real values
- No `CONTRIBUTING.md` required for initial release
- No hardcoded owner-specific values (email, project ID, GCP URL) anywhere in source code

### Sprint 9 — QA Checklist ✅
- [x] 1. README present at repo root and renders correctly on GitHub
- [x] 2. What is OpenSlot section clearly explains the app in 2-3 sentences
- [x] 3. All 4 screenshot placeholders present with descriptive labels
- [x] 4. GCP setup steps are accurate — Calendar API, Gmail API, OAuth, test users
- [x] 5. Environment variables table covers every variable with plain-English descriptions
- [x] 6. Local dev instructions work on a clean clone
- [x] 7. `LICENSE` file present at repo root with MIT license text
- [x] 8. `.env.example` contains all required variables with no real values
- [x] 9. No hardcoded owner-specific values remain in source code
- [x] 10. Repo set to public on GitHub after all files committed

---

### Sprint 10 — PWA ✅
**Goal:** Make OpenSlot installable on iPhone home screen. Opens full-screen with no browser chrome, feels native. Owner-side improvement only — recipients are unaffected.  
**Definition of done:** OpenSlot can be added to iPhone home screen from Safari. Opens full-screen with no address bar. Custom calendar-slot icon displays correctly. App name shows as "OpenSlot" on home screen. Mobile owner view simplified to Copy Availability Link + duration selector only.

**Key decisions:**
- No offline support needed — app requires live calendar data, service worker is minimal (install criteria only)
- Icon design: dark navy background (`#0a0f1e`), calendar grid with one amber (`#F59E0B`) highlighted cell — Option B from icon exploration
- Display mode: `standalone` — full screen, no browser chrome
- Theme color: `#0a0f1e` to match app background
- Icons generated at all required Apple sizes: 192×192, 512×512, 180×180 (apple-touch-icon)
- Mobile owner view (< 768px): week grid hidden, replaced with duration selector + full-width Copy Availability Link button
- Nav bar on mobile hides redundant Copy Availability Link button and username — only gear icon and Sign Out remain
- PWA installed via Safari only — Firefox iOS doesn't support PWA install APIs (Apple restriction)

### Sprint 10 — QA Checklist ✅
- [x] 1. `manifest.json` present in public folder and linked in index.html
- [x] 2. Service worker registered with no console errors
- [x] 3. Lighthouse PWA audit passes installability criteria
- [x] 4. Safari on iPhone shows "Add to Home Screen" option when visiting the production URL
- [x] 5. App opens full-screen with no address bar after adding to home screen
- [x] 6. Home screen icon shows the calendar grid with amber cell design
- [x] 7. App name displays as "OpenSlot" on the home screen (not the full Cloud Run URL)
- [x] 8. Status bar color matches the app background (`#0a0f1e`)
- [x] 9. App loads correctly when launched from home screen (auth flow works)
- [x] 10. No regressions — existing booking flow works normally after PWA changes

---

### Sprint 11 — Refactor & Code Quality ✅
**Goal:** Zero-functional-change cleanup sprint. Duplicated backend logic extracted into shared helpers. Frontend dead code removed. Hardcoded CSS hex values replaced with design system variables.  
**Definition of done:** All duplicated calendar helper logic extracted. Dead code removed. CSS variables used consistently. All existing tests pass unchanged.

**Key decisions:**
- Created `backend/src/helpers/calendar.js` with 5 extracted functions (was duplicated across 3–5 files)
- `offers.js` reduced from ~360 lines to ~300 lines
- Removed unused `claimed` state from `BookingPage.js`
- Added CSS variables `--error` and `--option-bg`, replaced hardcoded hex values
- All 63 tests pass unchanged — confirms zero functional impact

### Sprint 11 — QA Checklist ✅
- [x] 1. All 63 existing tests pass with no changes
- [x] 2. Frontend build succeeds with no warnings from changed code
- [x] 3. Calendar helper functions work correctly in offers route
- [x] 4. Calendar helper functions work correctly in availability route
- [x] 5. Calendar helper functions work correctly in calendar route
- [x] 6. No duplicated OAuth client setup code remains
- [x] 7. No duplicated busy event filtering code remains
- [x] 8. CSS variables used consistently — no hardcoded hex values in changed files
- [x] 9. Dead code removed from BookingPage.js
- [x] 10. Full end-to-end booking flow works after refactor

---

### Sprint 12 — QA Bug Fixes ✅
**Goal:** Fix bugs discovered during the comprehensive post-Sprint 11 QA pass.  
**Definition of done:** Copy Availability Link covers full 7 working days. iOS Safari clipboard write works reliably. Busy blocks render correctly with custom working days. Expired offers show proper error page.

**Bugs fixed:**
- Copy Availability Link only showing today's slots — now fetches fresh availability from API independent of WeekGrid view
- Copy Availability Link scoped to 7 calendar days instead of 7 working days — now calculates calendar days needed to cover 7 working days based on user's schedule
- iOS Safari clipboard silently failing — hidden textarea created and focused immediately on click to preserve gesture context; async API result written after
- Busy block rendering with custom working days — removed hardcoded CSS nth-child rule, first-row margin applied dynamically via inline styles
- Expired offer showing slots instead of error page — added `offer_expired` handler to booking submission error flow
- iOS PWA clipboard write silently fails — split behavior by platform: desktop keeps auto-copy, mobile/PWA shows "Generate Availability Link" button that reveals inline glassmorphism panel with read-only URL field and amber copy icon; copy happens from fresh user gesture
- Copy icon on mobile URL panel — replaced clipboard icon with open-corner copy icon (two overlapping rectangles) for clearer affordance
- Past-time slots still showing as bookable — GET `/api/offers/:offerId` now filters out slots whose start time is before `now` (UTC); if zero remain, returns 410 with `offer_stale`; POST booking route checks slot time before conflict check, returns `slot_expired` if past
- Sticky day headers on week grid — day header row and week nav bar stick to top of grid container on scroll
- Column and row separators too faint — vertical separators increased to `rgba(255,255,255,0.10)`, horizontal hour lines to `rgba(255,255,255,0.08)`
- Time labels too faint at scroll depth — Y-axis label opacity increased from 0.5 to 0.8

### Sprint 12 — QA Checklist ✅
- [x] 1. Copy Availability Link booking page shows slots across all 7 working days (not just today)
- [x] 2. On a Friday with Mon–Fri schedule, offer covers through next Monday+
- [x] 3. iOS Safari "Copy Availability Link" pastes the correct `/book/:offerId` URL
- [x] 4. "Copied!" confirmation only shows after verified clipboard write
- [x] 5. Busy blocks render within correct day columns after changing working days in Settings
- [x] 6. Busy blocks render correctly after changing working hours in Settings
- [x] 7. Expired offer URL shows expired error page immediately — no slot picker visible
- [x] 8. Booking attempt on expired offer returns expiry error, not conflict error
- [x] 9. No console errors across all fix scenarios
- [x] 10. Full end-to-end booking flow works after all changes

---

## Environment Variables Reference

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GOOGLE_CALENDAR_ID=primary
FIRESTORE_PROJECT_ID=
SESSION_SECRET=
BASE_URL=https://your-domain.com
```

All secrets live in `.env` locally and in Cloud Run environment variables on production. See `.env.example` in the repo for the full list. Never include actual values in planning documents.

---

## Out of Scope (v1)
- Team/multi-user scheduling
- Round-robin or group availability
- Payment collection
- SMS notifications
- Recurring availability templates
- Auto-hold calendar events
- Custom domain
- Outlook / iCloud calendar support (ideal for community contributions)

## Future Sprints (Post-v1 Candidates)
- **Gmail Fix Sprint** — dedicated investigation of bug #6 (owner Gmail notification). Verify `gmail.send` OAuth scope on stored tokens, check Cloud Run logs, test token refresh behavior.
- **Reschedule Notifications** — once Gmail notifications are working, extend to cover reschedule events ("Jane moved your meeting from Thursday 2pm to Friday 10am").

---

### Sprint 13 — Rescheduling ✅
**Goal:** Recipients can self-service reschedule a booking without owner involvement.  
**Definition of done:** Every booking confirmation includes a reschedule link. Recipient clicks it, sees available times, picks a new one, calendar event is moved. Old slot freed up.

**Key decisions:**
- Reschedule link included in every Google Calendar invite (both offer types)
- **Full-availability offers:** reschedule shows fresh full availability (live calendar check, working hours rules apply)
- **Curated offers:** reschedule shows only remaining slots from the original offer (live conflict check). If none available, show "No other times from this offer are available — reach out to [owner] to find a new time."
- Reschedule is a move, not an add — recipient cannot hold two slots
- Old slot is freed up when reschedule completes
- Reschedule link expires when meeting end time has passed (`meeting end time < now`)
- No reschedule notification to owner — deferred until Gmail notification (bug #6) is fixed
- Successful reschedule updates calendar event in place via `events.patch` — preserves attendees, Meet link, everything except start/end time

**UX Fixes (post-delivery):**
1. **Slot snapping** — Buffer time was creating awkward :15/:45 start times on 30-min slots. Added `snapForward()` to the availability engine that snaps slot boundaries to clean intervals matching the duration (30-min → :00/:30, 45-min → :00/:45, 60-min → :00). Applied to both window start and post-busy-block cursor.
2. **Inline confirm on reschedule page** — Replaced separate confirm button with an inline "Confirm" button that slides into the selected slot row. Full slot list stays visible; selecting a different slot moves the confirm button. Tested via interactive HTML mockup (Option A: bar below list vs Option B: inline on row — Option B chosen).
3. **Booking page consistency** — Same always-visible slot list with amber highlight on selected slot. Booking form appears below the list (not collapsed).

### Sprint 13 — QA Checklist ✅
- [x] 1. Booking confirmation calendar invite includes a reschedule link
- [x] 2. Clicking reschedule link shows available times from the original offer
- [x] 3. Selecting a new time moves the calendar event to the new slot
- [x] 4. Old slot is freed up and available for others after reschedule
- [x] 5. Curated offer reschedule only shows remaining slots from original offer
- [x] 6. Full-availability offer reschedule shows current full availability
- [x] 7. Curated offer with no remaining slots shows "reach out to owner" message
- [x] 8. Reschedule link expires after meeting end time has passed
- [x] 9. Google Meet link present on rescheduled event
- [x] 10. No console errors during reschedule flow

---

### Sprint 14 — Extended Hours for Curated Offers ⏳ Upcoming
**Goal:** Owner can drag-select and offer times outside their configured working hours for curated offers. Working hours only gate the full-availability link.  
**Definition of done:** Week grid allows selection on any hour. Full-availability link still respects working hours. Visual distinction between working and extended hours on the grid.

**Key decisions:**
- Week grid renders 6 AM – 11 PM regardless of configured working hours
- Visual distinction on grid between working hours (normal) and extended hours (dimmer or subtly marked)
- Drag selection allowed across both working and extended hours
- Full-availability link generation continues to respect working hours settings
- Settings page unchanged — working hours still configurable, still apply to full-availability offers

**Claude Code prompt:**
> "Implement Sprint 14 for OpenSlot — extended hours for curated offers.
>
> **Overview:** The week grid currently only renders the owner's configured working hours. This sprint extends the grid to show 6 AM – 11 PM so owners can drag-select and offer times outside their working hours for curated offers. Working hours continue to restrict the full-availability link only.
>
> **Deliverable 1 — Extended Grid Range**
>
> Update WeekGrid to always render from 6:00 AM to 11:00 PM, regardless of the owner's configured working hours. The grid should show this full range on load.
>
> **Deliverable 2 — Visual Distinction**
>
> Hours outside the owner's configured working hours should be visually distinct from working hours. Use a dimmer background or subtle visual marker to indicate extended hours — something like a slightly darker fill (`rgba(255,255,255,0.02)`) or a subtle left-border accent. The distinction should be clear enough that the owner can see where their normal range ends, but not so heavy that it discourages selection. Working hours should look exactly as they do today — no visual change within the configured range.
>
> **Deliverable 3 — Drag Selection on Extended Hours**
>
> Drag selection must work across both working hours and extended hours. An owner can start a drag in working hours and extend into extended hours (or vice versa). The selected window is saved to the offer the same way it is today — no special handling for extended-hours slots.
>
> **Deliverable 4 — Full-Availability Link Unchanged**
>
> The 'Copy Availability Link' / 'Generate Availability Link' flow must continue to respect the owner's configured working hours. Only slots within configured working hours should be included in full-availability offers. Verify this still works correctly after the grid changes.
>
> **Deliverable 5 — Tests**
>
> Add or update tests to verify:
> - Curated offers can include slots outside working hours
> - Full-availability offers only include slots within working hours
> - Booking page renders extended-hours slots correctly for curated offers
> - Extended-hours slots are bookable end-to-end
>
> **Important implementation notes:**
> - The grid range (6 AM – 11 PM) is hardcoded, not configurable. Working hours within that range are configurable via Settings.
> - Busy blocks from Google Calendar should render in the extended hours range too — if the owner has a 7 AM meeting, it should show as blocked.
> - The extended hours visual distinction should update dynamically if the owner changes their working hours in Settings.
> - Reference `openslot-design-system.md` for all styling — use existing color tokens, do not introduce new accent colors."

### Sprint 14 — QA Checklist
- [ ] 1. Week grid renders hours outside configured working hours
- [ ] 2. Extended hours are visually distinct from working hours
- [ ] 3. Can drag-select time slots in extended hours range
- [ ] 4. Curated offer with extended-hours slots saves correctly to Firestore
- [ ] 5. Booking page shows extended-hours slots correctly for curated offers
- [ ] 6. Full-availability link only includes slots within configured working hours
- [ ] 7. Settings page working hours still function correctly
- [ ] 8. Changing working hours updates the visual distinction on the grid
- [ ] 9. Extended-hours slots bookable end-to-end (book → calendar event created)
- [ ] 10. No console errors during extended-hours interaction

---

## Success Metrics (Personal)
- You send your first real booking link to a recruiter
- The recruiter books without asking a follow-up question
- Zero third-party scheduling tool fees paid going forward
