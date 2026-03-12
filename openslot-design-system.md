# OpenSlot Design System v1.0

## Philosophy
Dark glassmorphism base. Two warm-cool accent colors that complement without competing.
Arc Blue anchors structure and information. Amber signals action and energy.
Everything else recedes into the dark background — letting the accents do the work.

---

## Base Palette

| Token             | Hex       | Usage                                              |
|-------------------|-----------|----------------------------------------------------|
| `--bg-base`       | `#0a0f1e` | Page background — deepest navy                     |
| `--bg-surface`    | `#0f1628` | Slightly lifted surface (cards, panels)            |
| `--bg-glass`      | `rgba(255,255,255,0.04)` | Glassmorphism card fill              |
| `--bg-glass-hover`| `rgba(255,255,255,0.07)` | Glass card on hover                  |
| `--border-subtle` | `rgba(255,255,255,0.08)` | Default panel borders                |
| `--border-dim`    | `rgba(255,255,255,0.04)` | Dividers, grid lines                 |

---

## Accent Palette

| Token              | Hex       | Usage                                             |
|--------------------|-----------|---------------------------------------------------|
| `--arc-blue`       | `#00A8FF` | Primary accent — structure, labels, info          |
| `--arc-blue-glow`  | `rgba(0,168,255,0.35)` | Blue glow for box-shadow             |
| `--arc-blue-dim`   | `rgba(0,168,255,0.15)` | Subtle blue tint fills               |
| `--amber`          | `#F59E0B` | Secondary accent — action, selection, CTA         |
| `--amber-glow`     | `rgba(245,158,11,0.35)` | Amber glow for box-shadow           |
| `--amber-dim`      | `rgba(245,158,11,0.12)` | Subtle amber tint fills              |

---

## Semantic Color Assignments

### Navigation & Chrome
- App logo "Open" → `--arc-blue`, "Slot" → white
- Nav links (idle) → `rgba(255,255,255,0.5)`
- Nav links (active/current page) → `--arc-blue`
- Sign Out button → `rgba(255,255,255,0.3)` border, white text

### Week Grid (Owner Slot Picker)
- Grid background → `--bg-base`
- Grid lines → `--border-dim`
- Day headers (idle) → `rgba(255,255,255,0.4)`
- Today's date → `--arc-blue` with subtle blue circle
- Time labels (left axis) → `rgba(255,255,255,0.5)` monospace
- **Busy/blocked slots** → `rgba(255,255,255,0.05)` fill + hatching pattern in `rgba(255,255,255,0.08)` at 3px spacing — clearly unavailable, no glow
- **Drag selection (in progress)** → `--amber-dim` fill + `--amber` border + `--amber-glow` box-shadow
- **Confirmed selected block** → `--amber` border, `--amber-dim` fill, amber glow, time range label in `--amber`
- **Hover on free slot (pre-drag)** → `--arc-blue-dim` fill, `--arc-blue` border subtle

### Duration Selector (15m / 30m / 45m / 60m)
- Glassmorphism `<select>` dropdown → `--bg-glass` fill, `rgba(0,168,255,0.3)` border, `--arc-blue` text
- Custom SVG chevron in Arc Blue, JetBrains Mono font
- Hover/focus → `--arc-blue` border, `--shadow-blue-sm` glow

### Generate Message Button
- Default (slots selected) → `--amber` background, `#0a0f1e` text, `--amber-glow` box-shadow
- Hover → brighter amber `#FBBF24`, stronger glow
- Disabled (no slots selected) → `rgba(255,255,255,0.08)` fill, `rgba(255,255,255,0.2)` text, no glow

### Generated Message Output Panel
- Panel → glassmorphism, `--arc-blue` border
- Link text (each time slot) → `--arc-blue`, underline on hover
- Copy button → `--amber` border + text, amber glow on hover

### Booking Page (Recipient View)
- Month calendar → glassmorphism panel, `--arc-blue` border
- Selected date → `--arc-blue` circle fill, white text
- Available dates → white text, `--arc-blue` glow on hover
- Unavailable dates → `rgba(255,255,255,0.15)` — greyed, no interaction
- Time slot pills (available) → `--bg-glass` fill, `--arc-blue` border, `--arc-blue` text
- Time slot pills (hover) → `--arc-blue-dim` fill, `--arc-blue` glow
- Time slot pills (selected) → `--amber-dim` fill, `--amber` border, `--amber` text, amber glow
- Time slot pills (unavailable/claimed) → `rgba(255,255,255,0.04)` fill, `--border-subtle` border, strikethrough text
- Confirm/Book button → `--amber` background, `#0a0f1e` text, amber glow

### Booking Confirmation Form
- Input fields → `--bg-glass` fill, `--border-subtle` border
- Input focus → `--arc-blue` border, soft blue glow
- Labels → `rgba(255,255,255,0.5)` monospace
- Submit button → `--amber`, same as Book button

### Status & Feedback States
- Success (booking confirmed) → `#10B981` (emerald green) — reserved only for success, used sparingly
- Error / conflict detected → `#F43F5E` (rose red) — reserved only for errors
- Expired offer page → `rgba(255,255,255,0.2)` text, no accent colors — intentionally dim/dead

---

## Typography

| Role              | Font             | Size  | Weight | Color                        |
|-------------------|------------------|-------|--------|------------------------------|
| App name / Logo   | Space Mono       | 18px  | 700    | White + Arc Blue             |
| Page titles       | Space Mono       | 22px  | 700    | White                        |
| Section labels    | Space Mono       | 11px  | 400    | `rgba(255,255,255,0.4)` caps |
| Time labels       | Space Mono       | 13px  | 400    | `rgba(255,255,255,0.3)`      |
| Body / UI text    | Inter or DM Sans | 14px  | 400    | `rgba(255,255,255,0.7)`      |
| CTA buttons       | Space Mono       | 12px  | 700    | Contextual                   |
| Input placeholder | DM Sans          | 14px  | 400    | `rgba(255,255,255,0.25)`     |

---

## Interaction Principles

1. **Glow on action** — anything clickable should emit its accent glow on hover/active
2. **Blue informs, Amber acts** — info/structure = blue, decisions/CTAs = amber
3. **Disabled = invisible** — disabled states fade into the background, no bright colors
4. **Success and error = reserved** — green and red only appear for outcome states, never decoratively
5. **Transitions** — all color/glow transitions at `0.2s ease`

---

## Glassmorphism Recipe (apply to all panels/cards)

```css
background: rgba(255, 255, 255, 0.04);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 12px;
```

---

## Do Not Use
- Purple, pink, or warm red as accents (reserved for error states only)
- White backgrounds or light mode elements
- Drop shadows (use glow instead)
- More than 2 accent colors in any single view
