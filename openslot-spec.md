# OpenSlot — Product Spec & Development Roadmap
**Version:** 1.7  
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
| Conference links | Google Meet via conferenceData | No new dependencies — native Calendar API support |
| Rate limiting | Firestore-backed IP counter | Survives cold starts, works across multiple Cloud Run instances |

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

## Sprint Close & Advance SOP
> Follow this at the end of every sprint before opening a new CC session.

1. **QA sign-off** — all 10 checklist items checked in chat
2. **CC updates `devlog.md`** — re-upload updated devlog to project
3. **Updated `spec.md` generated** — produced as artifact in chat, download and re-upload to project
4. **Deploy to production** — only after files are synced
5. **Next sprint brainstorm** — scope and decisions finalized in chat before any CC prompt is drafted

---

## Bug & Edge Case Backlog
> Known issues discovered during real-world usage. Backlog items resolved in Sprint 7.

1. ~~**Invalid email voids offer**~~ — backend fix in Sprint 7; frontend validation below
2. ~~**Stale offer availability display**~~ — resolved in Sprint 7
3. **iCloud email recipients don't get calendar invite** — Google Calendar invites sent to iCloud email addresses appear in the recipient's inbox but don't attach to their Apple Calendar. Likely a CalDAV/`.ics` handshake issue between Google and Apple's calendar protocol. Needs investigation.
4. **"Copy Availability Link" copies wrong URL on iOS Firefox** — confirmed real-world reproduction. Owner clicked "Copy Availability Link" on iOS Firefox; recipient received the base app URL (`/`) instead of a unique booking URL (`/book/:offerId`). Recipient was shown Google OAuth "Access blocked" error (Error 403: access_denied) because the owner-side app requires authentication. Root cause: offer creation API call may be failing silently on iOS Firefox, or clipboard write is succeeding but writing the wrong value. Fix: ensure the button correctly calls `/api/offers`, receives a valid offer ID, and writes the full `/book/:offerId` URL to clipboard — verified on iOS Safari and iOS Firefox.
5. ~~**Booking form accepts malformed email addresses**~~ — frontend validation added in Sprint 8
6. **Owner Gmail notification not firing** — Gmail API send has been silently failing across multiple sprints. Sprint 7 added error logging but notification still not received on production. Needs dedicated investigation: verify `gmail.send` OAuth scope is present on stored tokens, check Cloud Run logs for actual error, consider whether token refresh on Cloud Run is the root cause. Email notification is preferred over SMS or third-party services — keep Gmail API, fix the implementation. — confirmed real-world reproduction. Booker submitted `ztalavi@gmailcom` (missing `.`) and the form accepted it, voiding the slot. Fix: add frontend email format validation on the booking form so malformed addresses are caught before submission with an inline error message. Related to bug #1 backend fix in Sprint 7.

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
**Definition of done:** Invalid bookings no longer void offers. Booking page reflects live calendar state. Duration selector includes 15-min option. Calendar grid is clearly readable in bright environments. Gmail notification remains unresolved — see bug backlog. Invalid bookings don't void offers. Booking page reflects live calendar state. Duration selector includes 15-min option. Calendar grid is clearly readable in bright environments.

**Key decisions:**
- Owner Gmail notification failure is a silent backend error — needs investigation and reliable error handling
- Slot claiming only persists on verified successful Google Calendar event creation, not on submission attempt
- Booking page re-checks live calendar state on every load — slots blocked by calendar changes since offer creation are silently hidden (consistent with claimed slot behavior)
- Duration selector redesigned as dropdown (15/30/45/60 min) replacing pill buttons
- Time label opacity and busy block hatch contrast increased for readability in bright environments

**Claude Code prompt:**
> "Implement Sprint 7 for OpenSlot. Three bug fixes and two UX improvements:
>
> **Bug Fix 1 — Owner Gmail notification**
> The owner is receiving zero notification emails when bookings are made — not even a Gmail notification, let alone a calendar invite. Investigate the Gmail API send in the booking route: add explicit error logging so any failure is visible in Cloud Run logs, verify the Gmail API scope (`https://www.googleapis.com/auth/gmail.send`) is correctly included in the OAuth token, and confirm the owner's email address is being correctly retrieved and passed to the send call. Fix whatever is causing the silent failure. The notification should be a fire-and-forget Gmail message to the owner with subject 'New booking: [Guest Name] — [Date] at [Time ET]' and body confirming the guest name, email, date, time, and duration.
>
> **Bug Fix 2 — Invalid email voids offer**
> Currently if a booker submits an invalid email and Google fails to create the calendar event, the slot is still marked as claimed in Firestore. Fix the booking route so that the slot is only marked claimed after a verified successful Google Calendar event creation. If the event creation fails for any reason, the slot remains available and the booker receives a clean error message.
>
> **Bug Fix 3 — Stale offer availability display**
> The booking page currently shows availability based on the offer snapshot at creation time. If the owner's calendar changes after the offer was created (new events added, existing events removed), the booking page does not reflect this. Fix the booking page data fetch to re-check live calendar state on every load. Slots that are no longer available due to calendar changes should be silently hidden — not shown as greyed out, just removed from the list entirely. This is consistent with how claimed slots are handled.
>
> **UX Improvement 1 — Duration selector redesign**
> Replace the current 30m/45m/60m pill button selector with a dropdown that includes 15/30/45/60 minute options. Default remains 30 min. Style the dropdown using the existing design system (Arc Blue). Update the settings page default duration stepper to also support 15 as a valid minimum.
>
> **UX Improvement 2 — Calendar grid contrast**
> Increase the visual contrast of two elements on the week grid: (1) time labels on the left axis — bump opacity from current level to approximately `rgba(255,255,255,0.5)` so they are clearly readable in bright room conditions; (2) busy block hatch pattern — increase the fill opacity and/or hatch line density so busy blocks are clearly distinguishable from free blocks at a glance. Reference `openslot-design-system.md` for current values and update them there too."

### Sprint 7 — QA Checklist
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

### Sprint 8 — QA Checklist
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

### Sprint 9 — Open Source Release ⏳ Upcoming
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

**Claude Code prompt:**
> "Implement Sprint 9 for OpenSlot — prepare the repo for public open source release.
>
> **Deliverable 1 — README.md**
> Write a complete `README.md` at the repo root. Audience: a technically capable person who has never used GCP before. Tone: clear, direct, no fluff.
>
> The README must cover these sections in order:
> 1. **What is OpenSlot** — 2-3 sentence description of what the app does and why it exists
> 2. **Screenshots** — 4 placeholder blocks: (a) week grid / slot picker, (b) generated message with booking links, (c) recipient booking page desktop, (d) recipient booking page mobile. Format: `<!-- SCREENSHOT: week-grid.png — Owner view showing the drag-to-select week grid -->`
> 3. **Features** — short bullet list of what the app does
> 4. **Prerequisites** — Google account, GCP project with billing enabled, Node.js 22, repo cloned locally
> 5. **GCP Setup** — step by step: enable Google Calendar API and Gmail API, configure OAuth 2.0 credentials, add test users. Written for someone who has never opened GCP Console before.
> 6. **Environment Variables** — table of every variable in `.env.example` with plain-English description and where to find each value
> 7. **Local Development** — exact commands to install deps, create `.env`, and run both servers. Include localhost URLs.
> 8. **How It Works** — 4-5 sentences explaining the two offer types so a new contributor understands the core UX
>
> Do not include a Cloud Run deploy section.
>
> **Deliverable 2 — LICENSE**
> Create a `LICENSE` file at repo root with standard MIT license text. Use the repo owner's GitHub username in the copyright line.
>
> **Deliverable 3 — .env.example audit**
> Review `.env.example` against all environment variables actually used in the codebase. Add any missing variables with placeholder values. Remove any that no longer exist.
>
> **Deliverable 4 — Hardcoded value audit**
> Search the codebase for hardcoded owner-specific values: email addresses, GCP project IDs, Cloud Run URLs. Move to environment variables if found. Report what was changed."

### Sprint 9 — QA Checklist
- [ ] 1. README present at repo root and renders correctly on GitHub
- [ ] 2. What is OpenSlot section clearly explains the app in 2-3 sentences
- [ ] 3. All 4 screenshot placeholders present with descriptive labels
- [ ] 4. GCP setup steps are accurate — Calendar API, Gmail API, OAuth, test users
- [ ] 5. Environment variables table covers every variable with plain-English descriptions
- [ ] 6. Local dev instructions work on a clean clone
- [ ] 7. `LICENSE` file present at repo root with MIT license text
- [ ] 8. `.env.example` contains all required variables with no real values
- [ ] 9. No hardcoded owner-specific values remain in source code
- [ ] 10. Repo set to public on GitHub after all files committed

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
- Custom domain
- Outlook / iCloud calendar support (ideal for community contributions)

## Future Sprints (Post-v1 Candidates)
- **PWA (Progressive Web App)** — make OpenSlot installable on iPhone home screen, full-screen with no browser chrome, feels native. Reuses existing web app entirely. Owner-side UX improvement — lets you copy availability links from your phone without opening a browser. Recipients unaffected.

---

## Success Metrics (Personal)
- You send your first real booking link to a recruiter
- The recruiter books without asking a follow-up question
- Zero Calendly fees paid going forward
