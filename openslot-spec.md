# OpenSlot — Product Spec & Development Roadmap
**Version:** 1.0  
**Created:** March 2026  
**Owner:** Project lead  
**Stack:** GCP · Google Calendar API · OAuth 2.0 · Node.js · React  
**Repo:** github.com/[username]/openslot  

---

## What Is OpenSlot?

OpenSlot is an open-source, self-hosted scheduling web app that gives professionals a smarter alternative to Calendly — without the monthly fee. It lives on Google Cloud, connects to your Google Calendar, and does two things:

1. **Slot Picker (for you):** Open the app, see your calendar, select which times you want to offer, and get a copyable message with magic links embedded — ready to paste into any email or DM.

2. **Booking Page (for them):** The recipient clicks a link, sees only the times you offered, picks one, and it auto-books on your Google Calendar. No account needed. Confirmation sent to both parties.

---

## Core Principles

- **Own your stack** — no third-party scheduling SaaS, no per-seat fees
- **Open source first** — every architectural decision should be clone-and-deploy friendly
- **Professional grade** — something you'd feel comfortable sending to a hiring manager
- **Mobile-friendly** — recipients are often on their phones
- **GCP-native** — built on Google Cloud to minimize complexity for a Google Calendar user

---

## User Stories

### As the calendar owner (you):
- I can sign in with my Google account
- I can see my upcoming availability in a calendar view
- I can select specific time blocks to offer
- I can generate a copyable message with each time as a hyperlink
- I can configure meeting duration, buffer time, and a default meeting title

### As the recipient (recruiter, colleague, etc.):
- I can open a link and see the specific times offered to me
- I can click a time to claim it
- I can confirm my name and email before booking
- I receive a calendar invite / confirmation email after booking
- I cannot double-book a slot already taken

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
     └──> [Firestore or Cloud SQL] — store booking slots & sessions
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

---

## Sprint Roadmap

---

### Sprint 0 — Foundation
**Goal:** Prove the pipes work. Auth + Calendar read. Nothing pretty.  
**Definition of done:** You can sign into the app with Google and see a JSON list of your upcoming calendar events on screen.

**Tasks:**
- [ ] Create new GCP project: `openslot`
- [ ] Enable Google Calendar API in GCP Console
- [ ] Create OAuth 2.0 credentials (web application type)
- [ ] Scaffold Node.js backend with Express
- [ ] Implement `/auth/google` and `/auth/callback` routes
- [ ] Implement `/api/calendar/events` route that returns upcoming events
- [ ] Scaffold React frontend with a "Sign in with Google" button
- [ ] Display raw calendar events on screen post-auth
- [ ] Deploy backend to Cloud Run (or run locally first)
- [ ] Write tests: auth flow, calendar fetch

**Claude Code prompt:**
> "Scaffold a Node.js + Express backend with Google OAuth 2.0 authentication and a route that fetches the next 7 days of events from the authenticated user's Google Calendar API. Include a minimal React frontend with a Sign in with Google button. Use environment variables for all secrets. Include Jest tests for the auth flow and calendar fetch route."

---

### Sprint 1 — Availability Engine
**Goal:** Smart free-slot detection. Given your calendar, return available blocks.  
**Definition of done:** App shows you a list of time slots you're free, filtered by your working hours, with busy times blocked out.

**Tasks:**
- [ ] Define "availability rules" config (working hours, min slot duration, buffer time)
- [ ] Build `/api/availability` endpoint — takes a date range, returns free blocks
- [ ] Handle edge cases: back-to-back meetings, all-day events, multi-day events
- [ ] Display free slots in a simple list UI (ugly is fine)
- [ ] Write tests: slot calculation logic with mock calendar data

**Config shape (example):**
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

---

### Sprint 2 — Slot Picker UI (Your View)
**Goal:** The calendar UI where you select times to offer and generate the magic link text.  
**Definition of done:** You can open the app, see a week view of your calendar with free slots highlighted, click slots to select them, and copy a formatted message.

**Tasks:**
- [ ] Build week-view calendar component showing busy vs. free blocks
- [ ] Click-to-select free slots (toggle on/off)
- [ ] "Generate message" button → produces formatted text
- [ ] Copyable text output with each slot as a hyperlink (pointing to booking page)
- [ ] Persist selected slot offer to database (creates a unique "offer" with an ID)
- [ ] Write tests: slot selection state, message generation format

**Example generated output:**
```
Hi [Name], happy to connect! Here are a few times that work on my end:

• Tuesday, Mar 11 @ 2:00 PM ET → openslot.app/book/abc123?slot=1
• Wednesday, Mar 12 @ 10:00 AM ET → openslot.app/book/abc123?slot=2
• Thursday, Mar 13 @ 3:30 PM ET → openslot.app/book/abc123?slot=3

Feel free to grab whichever works best — the link will book it directly.
```

**Claude Code prompt:**
> "Build a React week-view calendar component that displays busy events from Google Calendar and highlights available time slots. Slots should be selectable (click to toggle). Add a 'Generate Message' button that creates formatted text where each selected slot is a hyperlink to a booking URL pattern `/book/:offerId?slot=:slotIndex`. The offer should be saved to Firestore with a unique ID, expiry (7 days), and the list of offered slots. Include tests for slot selection and message generation."

---

### Sprint 3 — Booking Page (Their View)
**Goal:** The page recipients see. Mobile-friendly, no account needed, auto-books on confirm.  
**Definition of done:** A recipient can open a link, see available (unclaimed) slots, pick one, enter their name/email, and it creates a Google Calendar event for both parties.

**Tasks:**
- [ ] Build public booking page at `/book/:offerId`
- [ ] Fetch offer from Firestore, show only unclaimed slots
- [ ] "Already claimed" state for slots that are taken
- [ ] Booking confirmation form: name + email
- [ ] On confirm: create Google Calendar event, mark slot as claimed in Firestore
- [ ] Send confirmation email to both parties (use Gmail API or SendGrid free tier)
- [ ] Handle expired offers gracefully
- [ ] Write tests: booking flow, double-booking prevention, expired offer handling

**Claude Code prompt:**
> "Build a public-facing React booking page at `/book/:offerId`. It fetches an offer from Firestore and displays available time slots. Already-claimed slots should be shown as unavailable. On slot selection, show a confirmation form (name + email). On submit: create a Google Calendar event via the API, mark the slot as claimed in Firestore, and trigger confirmation emails to both the booker and calendar owner. Handle expired offers with a friendly error state. Include tests for the full booking flow and double-booking prevention."

---

### Sprint 4 — Polish + Ship
**Goal:** Production-ready. Public URL, clean UI, GitHub repo, README.  
**Definition of done:** You can send `openslot.app/book/xyz` to a real person and it works end to end.

**Tasks:**
- [ ] Custom domain setup on GCP (or subdomain if needed)
- [ ] UI polish pass — professional, mobile-responsive
- [ ] Add meeting title / notes field to booking form
- [ ] Settings page: configure working hours, buffer time, default meeting duration
- [ ] Environment variable documentation
- [ ] Write `README.md` with clone-and-deploy instructions
- [ ] Set up GitHub repo, add MIT license
- [ ] End-to-end test: full booking flow from link to calendar event
- [ ] Security review: ensure only the calendar owner can access `/api/availability`

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
- Mobile native app

---

## Success Metrics (Personal)
- You send your first real booking link to a recruiter
- The recruiter books without asking a follow-up question
- Zero Calendly fees paid going forward
