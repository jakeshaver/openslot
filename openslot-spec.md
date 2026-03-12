# OpenSlot — Product Spec & Development Roadmap
**Version:** 1.2  
**Created:** March 2026  
**Owner:** Project lead  
**Stack:** GCP · Google Calendar API · OAuth 2.0 · Node.js · React  
**Repo:** https://github.com/jakeshaver/openslot  
**Design System:** openslot-design-system.md  

---

## What Is OpenSlot?

OpenSlot is an open-source, self-hosted scheduling web app that gives professionals a smarter alternative to Calendly — without the monthly fee. It lives on Google Cloud, connects to your Google Calendar, and does two things:

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
- Single-use offer, all available slots next 7 days
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
- I can set the booking increment (30 / 45 / 60 min)
- I can generate a copyable message with each time window as a hyperlink
- I can click "Copy Availability Link" to instantly copy a full-availability booking URL
- I can configure my working days, working hours, buffer time, and default meeting duration via a settings page
- I receive a Gmail notification when someone books a slot

### As the recipient (recruiter, colleague, etc.):
- I can open a link and see the specific times offered to me
- I can view available times in my local timezone, with a searchable timezone override dropdown
- I can click a time to claim it
- I can confirm my name and email before booking
- I receive a Google Calendar invite (with Google Meet link) after booking
- I cannot double-book a slot already taken
- I see a clean "no times available" message if all slots are conflicted

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

---

## QA Checklist Template
> **Standard practice:** Run this checklist after every sprint before marking it done.
> Adapt the specific test cases per sprint — the structure is always the same.

```
### Sprint [N] — QA Checklist

FUNCTIONALITY
- [ ] 1. Core feature works end to end
- [ ] 2. Edge case or boundary condition handled
- [ ] 3. Error / failure state handled correctly
- [ ] 4. Data persists correctly (verify in Firestore or expected location)

UI & DESIGN
- [ ] 5. Arc Blue used correctly for info/structure elements
- [ ] 6. Amber used correctly for action/CTA elements
- [ ] 7. Disabled states are visually dim — no accent colors
- [ ] 8. Glassmorphism panels render with blur + border

INTEGRATION
- [ ] 9. Feature connects correctly to real Google Calendar data
- [ ] 10. No console errors in browser dev tools during normal use
```

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
- Firestore persistence for offers — offers survive redeployments and cold starts
- Timezone-aware booking page — auto-detects booker's browser timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`, searchable override dropdown
- All times stored in UTC, rendered in local timezone on frontend
- Owner Gmail notification on booking via Gmail API — subject: "New booking: [Guest Name] — [Date] at [Time]"
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

### Sprint 4 — Usefulness ⏳ Up Next
**Goal:** Make the app meaningfully more useful for the owner and booker.  
**Definition of done:** Google Meet added to every invite. Owner can configure their own working days, hours, buffer, and duration via a settings page. All availability calculations respect saved settings.

**Key decisions:**
- Settings stored in Firestore under the owner's user document (keyed by Google user ID)
- Availability engine reads from saved settings, falls back to defaults if none exist
- Working days are fully configurable (any combination of Sun–Sat) to support international users
- Working hours are fully configurable across the full 12am–12am range in 30-min increments
- Buffer time and default duration are free numeric inputs in minutes
- Google Meet added via `conferenceData` in Calendar API — no new dependencies

**Claude Code prompt:**
> "Implement Sprint 4 for OpenSlot. Two features:
>
> **1. Google Meet Integration**
> Add a Google Meet link to every booking invite automatically. When creating the calendar event in the booking route, include `conferenceData` with `createRequest` using `crypto.randomUUID()` as the `requestId`. Pass `conferenceDataVersion: 1` in the API call. Both the owner and guest should see the Meet link in their calendar event.
>
> **2. Settings Page**
> Add a `/settings` route accessible via a gear icon in the top nav. Settings are saved to Firestore under the owner's user document (keyed by their Google user ID) and loaded on app startup to replace all hardcoded config values.
>
> Settings fields:
> - Working days: 7 individual toggles (Sun, Mon, Tue, Wed, Thu, Fri, Sat). Default: Mon–Fri.
> - Working hours: Start time and end time selectors in 30-min increments across the full 12am–12am range. Default: 8am–8pm.
> - Buffer time: Numeric input in minutes. Default: 15.
> - Default meeting duration: Numeric input in minutes. Default: 30.
>
> The availability engine (`/api/availability`) must read from saved settings instead of hardcoded values. If no settings document exists for the user yet, fall back to the current defaults.
>
> Style the settings page using the existing design system: dark glassmorphism panel, Arc Blue labels, Amber 'Save Settings' button with a brief inline 'Saved!' confirmation on success.
>
> Tests: settings Firestore read/write, availability calculation correctly reflects custom working days, custom working hours, and custom buffer time."

### Sprint 4 — QA Checklist
- [ ] 1. Gear icon appears in nav and links to `/settings`
- [ ] 2. Settings page renders with all four config fields
- [ ] 3. Working day toggles save and reload correctly
- [ ] 4. Working hours save and reload correctly
- [ ] 5. Buffer time and duration save and reload correctly
- [ ] 6. Week grid reflects saved working days (e.g. if Monday toggled off, no Monday column)
- [ ] 7. Availability respects saved working hours — no slots outside defined range
- [ ] 8. Every new booking invite includes a Google Meet link (verify in calendar event)
- [ ] 9. Meet link appears in both owner and guest calendar events
- [ ] 10. No console errors during settings save or availability load

---

### Sprint 5 — Resiliency + Security ⏳ Planned
**Goal:** Lock down the API. Add CI to catch regressions on every push.  
**Definition of done:** `/api/availability` is inaccessible to unauthenticated users. GitHub Actions runs tests on every PR.

**Tasks:**
- Lock `/api/availability` to authenticated owner only — return 401 for unauthenticated requests
- Audit all other owner-only routes for the same gap
- GitHub Actions CI — run Jest tests on every PR and push to main

### Sprint 5 — QA Checklist
- [ ] 1. `/api/availability` returns 401 when called without a valid session
- [ ] 2. All other owner routes return 401 when called without a valid session
- [ ] 3. Public `/book/:offerId` route still works without auth
- [ ] 4. GitHub Actions workflow file present in repo
- [ ] 5. CI runs and passes on a test PR
- [ ] 6. CI fails correctly when a test is broken (verify by breaking a test intentionally)
- [ ] 7. No console errors after security changes
- [ ] 8. Full end-to-end booking flow still works after auth middleware changes
- [ ] 9. Owner dashboard still loads normally after sign-in
- [ ] 10. No regressions in availability calculation or offer generation

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

---

## Out of Scope (v1)
- Team/multi-user scheduling
- Round-robin or group availability
- Payment collection
- SMS notifications
- Recurring availability templates
- Auto-hold calendar events
- Mobile native app
- Custom domain
- README / open source documentation (deferred to post-v1)
- Outlook / iCloud calendar support (ideal for community contributions)

---

## Success Metrics (Personal)
- You send your first real booking link to a recruiter
- The recruiter books without asking a follow-up question
- Zero Calendly fees paid going forward
