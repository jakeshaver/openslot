# OpenSlot — Product Spec & Development Roadmap
**Version:** 1.9  
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
- I can label an offer at generation time so I know who it was sent to
- I can see all my active, claimed, and expired offers in a dashboard
- I can revoke or extend an offer from the dashboard
- I can copy an existing offer link from the dashboard without regenerating

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
6. ~~**Owner Gmail notification not firing**~~ — resolved post-Sprint 15. Root cause: Gmail API was never enabled in the GCP project. Enabled via GCP Console. Subject line encoding also fixed (UTF-8 Base64 RFC 2047 encoded-word syntax). Reschedule notifications added at the same time.
7. ~~**Week grid loses context on scroll**~~ — resolved Sprint 12

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
**Goal:** Make the repo ready for a public open source release.  
**Definition of done:** README covers what the app does and local dev setup, with screenshot placeholders. LICENSE file added. `.env.example` reviewed and confirmed complete. Repo is clean of any owner-specific values.

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
**Goal:** Make OpenSlot installable on iPhone home screen. Opens full-screen with no browser chrome, feels native.  
**Definition of done:** OpenSlot can be added to iPhone home screen from Safari. Opens full-screen with no address bar. Custom calendar-slot icon displays correctly. App name shows as "OpenSlot" on home screen. Mobile owner view simplified to Copy Availability Link + duration selector only.

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
2. **Inline confirm on reschedule page** — Replaced separate confirm button with an inline "Confirm" button that slides into the selected slot row. Full slot list stays visible; selecting a different slot moves the confirm button.
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

### Sprint 14 — Extended Hours for Curated Offers ✅
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

### Sprint 14 — QA Checklist ✅
- [x] 1. Week grid renders hours outside configured working hours
- [x] 2. Extended hours are visually distinct from working hours
- [x] 3. Can drag-select time slots in extended hours range
- [x] 4. Curated offer with extended-hours slots saves correctly to Firestore
- [x] 5. Booking page shows extended-hours slots correctly for curated offers
- [x] 6. Full-availability link only includes slots within configured working hours
- [x] 7. Settings page working hours still function correctly
- [x] 8. Changing working hours updates the visual distinction on the grid
- [x] 9. Extended-hours slots bookable end-to-end (book → calendar event created)
- [x] 10. No console errors during extended-hours interaction

---

### Sprint 15 — Offer Dashboard ✅
**Goal:** Give the owner full visibility and control over their offers — see what's active, who booked, and manage expiry or revoke links at any time.  
**Definition of done:** New `/offers` dashboard page lists all offers with status and label. Owner can revoke or extend any active offer. Label field added to generation flow. Global expiry default moved to Settings.

**Key decisions:**
- Dashboard is owner-only, sits behind auth like all other owner routes
- Offers listed using existing Firestore data only — no new event logging or view tracking
- Label is optional at generation time — stored as `label` field (string, nullable) on the offer document
- If no label set, dashboard falls back to displaying the first window's time range as the identifier
- Revoke sets offer status to `expired` in Firestore immediately — the offer link becomes dead instantly
- Extend updates `expiresAt` on the offer document — does not affect other offers
- Global expiry default stored in Firestore settings document as `offerExpiryDays`, applies to all newly generated offers
- Existing offers are unaffected by changes to the global expiry default

**Claude Code prompt:**
> "Implement Sprint 15 for OpenSlot — Offer Dashboard.
>
> **Overview:** Add an offer management dashboard so the owner can see all their offers, understand their status, and take action on them. Also adds an optional label to the offer generation flow and moves the expiry default into Settings.
>
> **Deliverable 1 — Optional Offer Label at Generation Time**
>
> Add an optional text input to the Generate Message flow, below the duration selector. Placeholder text: "Label this offer (optional) — e.g. Goldman recruiter, Marcus follow-up". This value is stored on the Firestore offer document as a `label` field (string, nullable). If skipped, `label` is null. The input should match the existing glassmorphism design system — Arc Blue border on focus, Space Mono font.
>
> **Deliverable 2 — Offer Dashboard Page**
>
> Create a new `/offers` route and `Offers.js` component, accessible only to authenticated owners. Add a link to it in the nav (e.g. a list/history icon next to the gear icon).
>
> The dashboard lists all offers for the current owner, sorted by `createdAt` descending (newest first). Each offer row displays:
> - Label (if set) or fallback: the first window's time range formatted as "Mon Mar 16, 1:00–3:00 PM"
> - Status badge: Active / Claimed / Expired — Arc Blue for active, Amber for claimed, dim white for expired
> - Created date and expiry date
> - Booked by name if status is claimed
>
> Group offers into two sections: Active/Claimed on top, Expired below (collapsed or visually separated).
>
> **Deliverable 3 — Per-Offer Actions**
>
> Each active or claimed offer row has three actions:
> - **Copy link** — copies the `/book/:offerId` URL to clipboard, using the same `copyToClipboard` helper already in the codebase
> - **Extend** — opens an inline set of buttons (+7 / +14 / +30 days) to push the `expiresAt` field forward in Firestore
> - **Revoke** — sets offer status to `expired` in Firestore immediately, with a single inline "Are you sure?" confirmation prompt before executing. No modal needed.
>
> Expired offers show no actions.
>
> **Deliverable 4 — Global Expiry Default in Settings**
>
> Add an "Offer expiry" field to the Settings page alongside buffer time and duration. Default is 7 days. Accepts any value from 1–30 days. Stored in Firestore settings document as `offerExpiryDays`. All new offer creation reads this setting and applies it to the `expiresAt` calculation. Existing offers are unaffected.
>
> **Deliverable 5 — Backend Routes**
>
> Add the following authenticated routes:
> - `GET /api/offers` — returns all offers for the current owner, sorted by createdAt descending
> - `PATCH /api/offers/:offerId/expiry` — updates `expiresAt` for an active offer
> - `POST /api/offers/:offerId/revoke` — sets status to `expired`
>
> All three require auth middleware. Revoke and expiry update must validate the offer belongs to the current owner before writing.
>
> **Deliverable 6 — Tests**
>
> Add tests covering:
> - `GET /api/offers` returns only the current owner's offers
> - `PATCH /api/offers/:offerId/expiry` updates correctly and rejects unauthorized owners
> - `POST /api/offers/:offerId/revoke` sets status to expired and rejects unauthorized owners
> - Label field is saved and returned correctly on offer creation
> - Offer expiry setting in Settings is applied to new offer creation
>
> **Important implementation notes:**
> - All new UI follows `openslot-design-system.md` — Arc Blue for info/structure, Amber for actions, glassmorphism panels
> - The `label` field is additive — existing offers without a label must render gracefully using the window time fallback
> - Revoke must show a confirmation before executing — inline prompt only, no modal
> - Copy link on the dashboard uses the same `copyToClipboard` helper already in the codebase
> - The `GET /api/offers` route is new and distinct from the existing `GET /api/offers/:offerId` public route"

**Post-QA fixes (applied before sprint close):**
1. **Label field repositioned** — moved from above the calendar grid into the Send Slots panel. Label input and Copy Message button share a single row (D2 layout) — label takes remaining horizontal space, amber Copy button to its right. Label is optional and non-blocking.
2. **Label not displaying on dashboard** — bug fixed, labeled offers now show the label as the row title.
3. **Claimed badge color** — changed from Amber to `#10B981` (emerald green, `--success`) per design system. Active stays Arc Blue, expired stays dim white.
4. **Offer `27aaacd9` data patch** — status corrected to `claimed` in Firestore. Now shows correctly in dashboard as claimed by Zahra.
5. **Expandable offer rows** — each offer row has a chevron toggle. When expanded, shows the list of offered windows formatted as "Tue, Mar 17 · 11:00 AM – 1:00 PM" in Arc Blue tinted rows with a "OFFERED WINDOWS" section label. Action buttons remain visible whether expanded or collapsed.

**Post-Sprint 15 additions:**
- **Gmail subject encoding fix** — em dash and non-ASCII characters in notification subject were rendering as garbled text (e.g. `Ã¢Â€Â"`). Root cause: Gmail API was never enabled in the GCP project. Enabled via GCP Console. Subject now uses RFC 2047 `=?UTF-8?B?...?=` encoded-word syntax. Resolves bug #6.
- **Reschedule notification** — owner now receives a Gmail notification when a recipient reschedules. Subject: "Rescheduled: [name] — [day] at [time]". Body shows old and new times. Fire-and-forget, UTF-8 Base64 encoded subject.

### Sprint 15 — QA Checklist ✅
- [x] 1. Optional label field appears in Generate Message flow and saves to Firestore
- [x] 2. Dashboard at `/offers` loads and lists all offers for the owner
- [x] 3. Offers without a label show the first window's time range as fallback identifier
- [x] 4. Status badges render correctly — Arc Blue (active), green (claimed), dim (expired)
- [x] 5. Booked-by name appears on claimed offers
- [x] 6. Copy link action copies the correct `/book/:offerId` URL to clipboard
- [x] 7. Extend action updates `expiresAt` in Firestore and reflects new date in the UI
- [x] 8. Revoke action prompts confirmation, then sets status to expired immediately
- [x] 9. Offer expiry default in Settings applies to newly generated offers
- [x] 10. No console errors across all dashboard interactions

---

### Sprint 16 — Refactor & Security Audit ⏳ Upcoming
**Goal:** Harden the codebase against security gaps introduced in Sprints 13–15, refactor duplicated frontend and backend code, fill test coverage gaps, and polish UX rough edges.
**Definition of done:** All Sprint 13/15 routes audited and hardened. Shared frontend utilities extracted. Test coverage gaps filled. Generated message format improved. Mobile layout verified on reschedule and offers pages. Empty states handled.

**Key decisions:**
- Security workstream completed before refactor workstream
- Firestore security rules ring-fenced to Sprint 17 — not in scope here
- No new features — every change is a security fix, refactor, test, or UX polish

**Claude Code prompt:**
> "Implement Sprint 16 for OpenSlot — Refactor & Security Audit. This is a two-workstream sprint. Complete Workstream 1 before starting Workstream 2.
>
> **Workstream 1 — Security Audit & Hardening**
>
> **1a. Owner validation audit on Sprint 13/15 routes**
>
> Audit every route added in Sprint 13 (reschedule) and Sprint 15 (dashboard) for correct owner validation. Every route that reads or writes an offer document must verify the offer belongs to the requesting user before proceeding. Specifically:
> - `GET /api/offers` — must only return offers where `ownerId` matches the authenticated user
> - `PATCH /api/offers/:offerId/expiry` — must verify offer belongs to current user before writing
> - `PATCH /api/offers/:offerId/label` — must verify offer belongs to current user before writing
> - `POST /api/offers/:offerId/revoke` — must verify offer belongs to current user before writing
> - `GET /api/offers/:offerId/reschedule` — public route, must not expose owner email, OAuth tokens, or any calendar metadata beyond whitelisted fields
> - `POST /api/offers/:offerId/reschedule` — must not expose private data in any error response
>
> Fix any gaps found. Document findings in code comments.
>
> **1b. Rate limiting on reschedule endpoint**
>
> Apply the same Firestore-backed IP rate limiter that exists on the booking endpoint to `POST /api/offers/:offerId/reschedule`. Use the same configuration: 10 attempts per IP per 15-minute rolling window, returns `429 { error: "Too many requests. Please try again later." }`.
>
> **1c. Error response audit on Sprint 13/15 routes**
>
> Audit all Sprint 13 and Sprint 15 route error responses. Verify no stack traces, file paths, internal error codes, owner data, or OAuth token values are present in any error response on these routes. All unhandled errors must flow through the global error handler added in Sprint 6.
>
> **1d. Session and token storage audit**
>
> Review how OAuth tokens are stored in Firestore and how sessions are managed on Cloud Run. Document any risks in code comments. Do not make changes unless a clear security gap exists — this is an audit and documentation step.
>
> **Workstream 2 — Refactor & UX Improvements**
>
> **2a. Shared time/date formatting utility**
>
> Audit all time and date formatting logic across the frontend (`WeekGrid.js`, `BookingPage.js`, `Reschedule.js`, `Offers.js`). Extract any duplicated formatting functions into a shared `utils/time.js` utility file. Replace all inline duplicates with imports from the shared utility. No functional changes.
>
> **2b. Reusable slot list component**
>
> `BookingPage.js` and `Reschedule.js` both render a list of time slot pills with selection state and amber highlight. Extract this into a shared `SlotList.js` component. Replace both usages. No visual changes.
>
> **2c. copyToClipboard consistency**
>
> Audit all clipboard write operations across the frontend. Confirm every one uses the existing `copyToClipboard` helper. Replace any that don't. No functional changes.
>
> **2d. Backend naming and error shape consistency**
>
> Audit route files added in Sprint 13 and Sprint 15 for consistency with the patterns established in earlier routes:
> - Error response shapes should match `{ error: "..." }` format used throughout
> - JSDoc comments should be present on all route handlers
> - Variable naming should be consistent with existing conventions
> Make corrections where needed. No functional changes.
>
> **2e. Test coverage gaps**
>
> Audit test coverage for Sprint 13 (reschedule) and Sprint 15 (dashboard) routes. Identify any routes or edge cases with no test coverage. Add tests to fill gaps. All existing tests must continue to pass.
>
> **2f. Performance quick wins**
>
> Identify any sequential API calls in the booking or reschedule flows that could be safely parallelized using `Promise.all`. Apply where the calls are independent. Do not parallelize calls where order matters.
>
> **2g. Generated message format**
>
> Improve the default generated message output so it requires less manual editing before sending. The current format uses a raw URL after an arrow (e.g. `→ https://...`). Replace with a cleaner format where the time range is the hyperlink text, e.g. `Tuesday, March 17 · 11:00 AM – 1:00 PM` as a clickable link. The URL should be the href, not visible inline text. This applies to the curated offer message output only — not the full availability link.
>
> **2h. Mobile audit — reschedule and offers dashboard**
>
> Test `Reschedule.js` and `Offers.js` on a mobile viewport (< 768px). Fix any layout issues: text overflow, buttons too small to tap, panels overflowing the viewport, or content that requires horizontal scrolling. Use existing CSS media query patterns from the rest of the app.
>
> **2i. Empty states**
>
> Add graceful empty states for:
> - `/offers` dashboard with no offers — a dim message in Space Mono, e.g. "No offers yet. Head to the calendar to create your first one." with an Arc Blue link to `/`
> - Reschedule page when no slots are available from the original offer — already partially handled, verify the message is correct and styled per design system
>
> **Important implementation notes:**
> - All security fixes take priority — complete and verify Workstream 1 before starting Workstream 2
> - No new features in this sprint — every change is either a security fix, a refactor, a test, or a UX polish
> - All existing tests must pass after every change
> - Reference `openslot-design-system.md` for any UI changes — no new colors or patterns"

### Sprint 16 — QA Checklist
- [ ] 1. All Sprint 13/15 owner validation gaps identified and fixed
- [ ] 2. Reschedule endpoint rate limited — returns 429 after 10 attempts per IP per 15 min
- [ ] 3. No private data exposed in any Sprint 13/15 error response
- [ ] 4. Session and token storage audit documented in code comments
- [ ] 5. Shared `utils/time.js` utility in place, no duplicated formatting functions remain
- [ ] 6. `SlotList.js` component extracted and used in both BookingPage and Reschedule
- [ ] 7. All clipboard writes use the `copyToClipboard` helper
- [ ] 8. Generated message uses hyperlinked time ranges, no raw URLs visible
- [ ] 9. Reschedule and offers dashboard display correctly on mobile (< 768px)
- [ ] 10. Empty states render correctly on `/offers` and reschedule page

---

### Sprint 17 — Firestore Security Rules ⏳ Upcoming
**Goal:** Lock down Firestore at the database level so all direct client access is denied. Security currently relies entirely on Express middleware — if the API were bypassed, Firestore would be wide open.
**Definition of done:** Firestore security rules written and deployed. All existing functionality works unchanged. Rules verified in the Firestore emulator.

**Key decisions:**
- Firestore rules should deny all direct client reads and writes
- Only the backend service account should have read/write access
- This sprint is education + implementation — document what the rules do and why

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
- **Message output cleanup** — improve the generated message format so it requires less manual editing before sending (e.g. cleaner URL presentation, better default copy).

---

## Success Metrics (Personal)
- You send your first real booking link to a recruiter ✅
- The recruiter books without asking a follow-up question ✅ (Zahra)
- Zero third-party scheduling tool fees paid going forward
