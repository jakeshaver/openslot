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
  "workingHours": { "start": "09:00", "end": "18:00" },
  "timezone": "America/New_York",
  "minSlotMinutes": 30,
  "bufferMinutes": 15,
  "daysAhead": 7,
  "weekendsEnabled": false
}
```

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

### Sprint 3 — Booking Page 🔄 In Progress
**Goal:** Public-facing booking page at `/book/:offerId`. Month calendar + time slot picker. Confirmation form. Google Calendar event created with booker as attendee. Confirmation screen on success.

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
