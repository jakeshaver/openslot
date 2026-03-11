# OpenSlot — Product Spec & Development Roadmap
**Version:** 1.1  
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
- **Vimcal-inspired UX** — drag-to-select availability, copy-paste human touch, not a generic booking link

---

## User Stories

### As the calendar owner (you):
- I can sign in with my Google account
- I can see my upcoming availability in a week grid view (Mon–Fri, 9am–6pm)
- I can drag across free time blocks to select what I want to offer
- I can set the booking increment (30 / 45 / 60 min)
- I can generate a copyable message with each time window as a hyperlink
- I can configure meeting duration, buffer time, and a default meeting title

### As the recipient (recruiter, colleague, etc.):
- I can open a link and see the specific times offered to me
- I can click a time to claim it
- I can confirm my name and email before booking
- I receive a Google Calendar invite after booking (native invite handles confirmation — no third-party email service needed)
- I cannot double-book a slot already taken
- I see a clean "no times available" message if all slots are conflicted

---

## Technical Architecture

```
[Your Browser]
     |
     v
[React Frontend — hosted on GCP Firebase Hosting or Cloud Run]
     |
     v
[Node.js Backend — hosted on GCP Cloud Run]
     |
     ├──> [Google Calendar API] — read/write calendar events
     ├──> [Google OAuth 2.0] — authenticate the calendar owner
     └──> [Firestore] — store booking offers & sessions
```

### Key Technical Decisions
| Decision | Choice | Rationale |
|---|---|---|
| Frontend | React | Component-based, large community, easy to hire/get help |
| Backend | Node.js | Same language front-to-back, GCP native support |
| Hosting | GCP Cloud Run | Scales to zero (free when idle), containerized |
| Database | Firestore | Serverless, free tier, no schema management |
| Auth | Google OAuth 2.0 | You already use this pattern from job campaign app |
| Calendar | Google Calendar API | Direct integration, no middleware |
| Unique IDs | Node.js `crypto.randomUUID()` | Built-in, no ESM dependency issues |

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

**Claude Code prompt:**
> "Scaffold a Node.js + Express backend with Google OAuth 2.0 authentication and a route that fetches the next 7 days of events from the authenticated user's Google Calendar API. Include a minimal React frontend with a Sign in with Google button. Use environment variables for all secrets. Include Jest tests for the auth flow and calendar fetch route."

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

**Config shape:**
```json
{
  "workingHours": { "start": "09:00", "end": "18:00" },
  "timezone": "America/New_York",
  "minSlotMinutes": 30,
  "bufferMinutes": 15,
  "daysAhead": 7
}
```

**Claude Code prompt:**
> "Build an availability calculation engine in Node.js. It takes a list of existing Google Calendar events and a config object (working hours, timezone, buffer time, min slot duration, days ahead) and returns an array of available time slots. Include comprehensive Jest tests covering: back-to-back meetings, all-day events, slots at boundary of working hours, and buffer time enforcement."

### Sprint 1 — QA Checklist ✅
- [x] 1. `/api/availability` returns free blocks for the next 7 days
- [x] 2. Busy times from Google Calendar are correctly excluded
- [x] 3. Buffer time (15 min) is applied before and after existing events
- [x] 4. All-day events block the entire day
- [x] 5. Saturday and Sunday are never returned as available
- [x] 6. No slots returned outside 9am–6pm working hours
- [x] 7. Back-to-back meetings produce no available slot between them
- [x] 8. Jest tests all pass including edge cases
- [x] 9. Response reflects real calendar data, not mock data
- [x] 10. No console errors during availability fetch

---

### Sprint 1.5 — UI Foundation 🔄 In Progress
**Goal:** Vimcal-inspired week grid for slot picking. Dark glassmorphism aesthetic. Arc Blue + Amber design system applied.  
**Definition of done:** Week grid renders correctly, drag selection works, design system fully applied.

**Design reference:** openslot-design-system.md

**Claude Code prompt:**
> "Rebuild the OpenSlot frontend with a dark glassmorphism aesthetic per the design system in openslot-design-system.md. Week grid: Mon–Fri, 9am–6pm, 30-min row increments. Free drag-to-select across free blocks only — selected blocks glow amber. Busy blocks render with hatched unavailable style. Duration selector (30m/45m/60m) in Arc Blue. Generate Message button in Amber — disabled until slots selected. No minutes tally. No weekends. Backend untouched. Accent colors: Arc Blue #00A8FF (structure/info), Amber #F59E0B (action/CTA)."

### Sprint 1.5 — QA Checklist
- [ ] 1. Week grid shows Mon–Fri only, no weekends
- [ ] 2. Time range is 9am–6pm, nothing outside those hours
- [ ] 3. Busy blocks from Google Calendar show as hatched/unavailable
- [ ] 4. Cannot drag over busy blocks
- [ ] 5. Free block drag highlights in Amber with glow
- [ ] 6. Multiple selections across different days work simultaneously
- [ ] 7. Duration selector (30m/45m/60m) toggles correctly in Arc Blue
- [ ] 8. Generate Message button is dim/disabled with no slots selected
- [ ] 9. Generate Message button is Amber and glowing when slots are selected
- [ ] 10. No console errors during drag interaction

---

### Sprint 2 — Offer Engine & Real-Time Conflict Check
**Goal:** Wire availability to the grid, persist offers to Firestore, real-time conflict check at booking time.  
**Definition of done:** Drag → Generate Message → offer saved to Firestore → copyable message with links → live conflict check when recipient books.

**Key decisions:**
- No auto-hold events on calendar (avoids clutter)
- Real-time conflict check at booking time instead
- If all slots in an offer are conflicted → return `offer_stale` error with "contact directly" message
- Offer expiry: 7 days

**Claude Code prompt:**
> "Build the availability engine for OpenSlot. Reference the design system in openslot-design-system.md for all UI elements.
>
> Backend:
> 1. `/api/availability` — returns free blocks for date range, Mon–Fri, 9am–6pm ET, 15-min buffer, from authenticated user's Google Calendar.
> 2. `/api/offers` POST — saves offer to Firestore: unique ID via crypto.randomUUID(), array of dragged time windows, booking duration, created timestamp, 7-day expiry, status (active/expired/claimed).
> 3. `/api/offers/:offerId/book` POST — fetches offer, does live real-time conflict check against current Google Calendar, creates calendar event if clear, marks slot claimed, returns conflict error if unavailable. If ALL slots conflicted, return offer_stale error code.
>
> Frontend:
> 1. Wire week grid to `/api/availability` on load and week navigation.
> 2. Drag selection only works over free blocks.
> 3. Generate Message calls `/api/offers`, renders copyable output panel — each time window as Arc Blue hyperlink, copy button in Amber.
>
> Tests: availability calculation, buffer enforcement, offer creation, real-time conflict check, offer_stale error state."

### Sprint 2 — QA Checklist
- [ ] 1. Week grid loads real Google Calendar data — busy blocks match actual calendar
- [ ] 2. Cannot drag over busy blocks
- [ ] 3. Generate Message creates a new offer document in Firestore (verify in GCP Console)
- [ ] 4. Firestore offer document has correct fields: slots, duration, expiry, status=active
- [ ] 5. Generated message shows each slot as an Arc Blue hyperlink
- [ ] 6. Copy button (Amber) copies full formatted message correctly
- [ ] 7. Duration selector changes the number of slots in the generated message
- [ ] 8. Week navigation reloads availability for the new week
- [ ] 9. Booking a conflicted slot returns an error (test: add conflicting GCal event after generating offer)
- [ ] 10. If all slots are conflicted, booking page shows "no times available — contact directly" message

---

### Sprint 3 — Booking Page (Their View)
**Goal:** The page recipients see. Mobile-friendly, no account needed, auto-books on confirm.  
**Definition of done:** Recipient opens link, picks a time, enters name/email, calendar event created for both parties.

**Claude Code prompt:**
> "Build a public-facing React booking page at `/book/:offerId`. Fetch offer from Firestore, display available time slots in Calendly-style layout: month calendar left, time slots for selected day right. Claimed/conflicted slots shown as unavailable. On slot selection show confirmation form (name + email). On submit: create a Google Calendar event with the booker added as an attendee — Google Calendar's native invite handles email confirmation to both parties automatically, no third-party email service needed. Mark slot as claimed in Firestore. Show a confirmation screen after successful booking. Handle expired offers with a friendly error state. Mobile-responsive. Apply design system from openslot-design-system.md — Arc Blue for calendar chrome and slot pills, Amber for the confirm/book button. Tests: full booking flow, double-booking prevention, expired offer handling."

### Sprint 3 — QA Checklist
- [ ] 1. Booking page loads from a generated link without requiring sign-in
- [ ] 2. Month calendar shows correct available days
- [ ] 3. Selecting a day shows correct time slots for that day
- [ ] 4. Already-claimed slots appear greyed out and unclickable
- [ ] 5. Submitting name/email creates the event in Google Calendar
- [ ] 6. Confirmation screen appears after successful booking
- [ ] 7. Booker receives a Google Calendar invite to the booked event (check their email)
- [ ] 8. Attempting to book a claimed slot returns an appropriate error
- [ ] 9. Expired offer link shows a clean friendly error page
- [ ] 10. Booking page looks correct and usable on iPhone Safari

---

### Sprint 4 — Polish + Ship
**Goal:** Production-ready. Public URL, clean UI, GitHub repo, README.  
**Definition of done:** Send a real booking link to a real person and it works end to end.

**Tasks:**
- [ ] Custom domain setup on GCP
- [ ] UI polish pass — mobile-responsive throughout
- [ ] Meeting title / notes field on booking form
- [ ] Settings page: working hours, buffer time, default duration
- [ ] Write `README.md` with clone-and-deploy instructions
- [ ] Add MIT license to GitHub repo
- [ ] Add `CONTRIBUTING.md`
- [ ] GitHub Actions CI — run tests on every PR
- [ ] Security review: `/api/availability` locked to calendar owner only
- [ ] End-to-end test: full booking flow from link to calendar event

### Sprint 4 — QA Checklist
- [ ] 1. App loads correctly on the public URL (not localhost)
- [ ] 2. Google OAuth works on production URL (redirect URI updated in GCP)
- [ ] 3. Full end-to-end flow: drag → generate → send link → recipient books → event on calendar
- [ ] 4. App is usable on iPhone Safari — no broken layouts
- [ ] 5. Settings page saves working hours and buffer time correctly
- [ ] 6. Meeting title field appears on booking form and shows on the calendar event
- [ ] 7. README has accurate setup instructions (verify by following them fresh)
- [ ] 8. `.env` still not in the repo after all Sprint 4 commits
- [ ] 9. GitHub Actions CI runs and passes on the main branch
- [ ] 10. No console errors on the production URL during normal use

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

## Open Source Checklist (Sprint 4)
- [ ] MIT License file
- [ ] README with: what it is, demo screenshot, setup steps, env var guide
- [ ] `.env.example` file (no real secrets)
- [ ] `CONTRIBUTING.md`
- [ ] GitHub Actions CI (run tests on PR)
- [ ] Docker-friendly (Cloud Run already handles this)

---

## Out of Scope (v1)
- Team/multi-user scheduling
- Round-robin or group availability
- Payment collection
- SMS notifications
- Recurring availability templates
- Auto-hold calendar events
- Mobile native app

---

## Success Metrics (Personal)
- You send your first real booking link to a recruiter
- The recruiter books without asking a follow-up question
- Zero Calendly fees paid going forward
