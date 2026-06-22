# UI Tokens

Design tokens for TrackFleet — Vehicle Tracking Management. All colors, typography, spacing, and component values are extracted from the delivered prototype (light theme, blue accent). Use these exact values throughout the codebase — never hardcode colors or use raw Tailwind color classes in components.

---

## How to Use

This project uses **Tailwind CSS v4**. All design tokens are defined using the `@theme` directive in `app/globals.css`. No `tailwind.config.ts` needed for colors or tokens.

Tailwind v4 automatically generates utility classes from `@theme` variables:

- `--color-accent` → `bg-accent`, `text-accent`, `border-accent`
- `--color-surface` → `bg-surface`, `text-surface`, `border-surface`

```tsx
// Correct — uses generated utility classes
className="bg-surface text-text-primary border-border"

// Also correct — references CSS variable directly
style={{ color: 'var(--color-text-primary)' }}

// Never — hardcoded hex values
className="bg-[#F5F7FB] text-[#0F1B2D]"

// Never — raw Tailwind color classes
className="bg-blue-500 text-gray-600"
```

---

## globals.css — Complete Token Definition

```css
@import "tailwindcss";

@theme {
  /* Fonts */
  --font-sans: "Inter", sans-serif;
  --font-display: "Sora", sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  /* Page and surface backgrounds */
  --color-background: #f5f7fb;
  --color-surface: #ffffff;
  --color-surface-secondary: #f4f8ff;
  --color-surface-tertiary: #f0f3f8;
  --color-surface-muted: #f5f7fb;

  /* Borders */
  --color-border: #e8ecf3;
  --color-border-light: #f0f3f8;
  --color-border-muted: #dfe1e7;

  /* Text */
  --color-text-primary: #0f1b2d;
  --color-text-secondary: #5b6b82;
  --color-text-muted: #97a4b8;
  --color-text-dark: #364153;
  --color-text-darkest: #0f1b2d;

  /* Primary accent — blue */
  --color-accent: #2d6bff;
  --color-accent-dark: #1e54d6;
  --color-accent-light: #eaf1ff;
  --color-accent-muted: #f4f8ff;
  --color-accent-foreground: #ffffff;

  /* Success — green (active, payment received) */
  --color-success: #13b981;
  --color-success-dark: #047857;
  --color-success-light: #e5f8f1;
  --color-success-lightest: #ecfdf5;
  --color-success-foreground: #047857;

  /* Warning — amber (renewal due, low stock) */
  --color-warning: #f59e0b;
  --color-warning-dark: #b45309;
  --color-warning-light: #fef4e3;
  --color-warning-lightest: #fffbeb;
  --color-warning-foreground: #b45309;

  /* Error — red (overdue, faulty, failed) */
  --color-error: #ef4d5a;
  --color-error-dark: #c2303c;
  --color-error-light: #fdebed;
  --color-error-foreground: #c2303c;

  /* Violet — secondary categorical (charts, accents) */
  --color-violet: #7c5cfc;
  --color-violet-dark: #6d45e0;
  --color-violet-light: #f0ecfe;
  --color-violet-foreground: #6d45e0;

  /* Dark overlay */
  --color-overlay: #0f1b2d;

  /* Border radius */
  --radius-sm: 9px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-full: 9999px;
}
```

Tailwind v4 generates utility classes automatically from every `--color-*` token above:

- `bg-accent`, `text-accent`, `border-accent`
- `bg-surface`, `text-surface-secondary`
- `bg-success-light`, `text-text-muted`
- etc.

---

## Color Usage Guide

### Page Layout

| Element           | Token                  |
| ----------------- | ---------------------- |
| Page background   | `bg-background`        |
| Card / surface    | `bg-surface`           |
| Secondary surface | `bg-surface-secondary` |
| Default border    | `border-border`        |
| Light border      | `border-border-light`  |

### Typography

| Element                | Token                           |
| ---------------------- | ------------------------------- |
| Headings, primary text | `text-text-primary` (#0F1B2D)   |
| Secondary text, labels | `text-text-secondary` (#5B6B82) |
| Placeholder, muted     | `text-text-muted` (#97A4B8)     |
| Dark labels            | `text-text-dark` (#364153)      |

### Accent (Primary Blue)

Used for: primary buttons, active nav items, focus rings, key figures, revenue chart line, account chips

| Element                | Token                    |
| ---------------------- | ------------------------ |
| Button background      | `bg-accent`              |
| Button text            | `text-accent-foreground` |
| Light badge background | `bg-accent-light`        |
| Subtle background      | `bg-accent-muted`        |

### Status Badges (installations, renewals)

| Status               | Background            | Text                      |
| -------------------- | --------------------- | ------------------------- |
| Active               | `bg-success-light`    | `text-success-foreground` |
| Payment received     | `bg-success-light`    | `text-success-foreground` |
| Renewal due (<=30d)  | `bg-warning-light`    | `text-warning-foreground` |
| Overdue / unpaid     | `bg-error-light`      | `text-error-foreground`   |
| Suspended / inactive | `bg-surface-tertiary` | `text-text-secondary`     |
| Upcoming             | `bg-surface-tertiary` | `text-text-secondary`     |

### Device Status Badges (stock)

| Device status | Background            | Text                      |
| ------------- | --------------------- | ------------------------- |
| In stock      | `bg-accent-light`     | `text-accent-dark`        |
| Installed     | `bg-success-light`    | `text-success-foreground` |
| Faulty        | `bg-error-light`      | `text-error-foreground`   |
| Returned      | `bg-surface-tertiary` | `text-text-secondary`     |

### Payment Account & Category Badges

| Type             | Background            | Text                      |
| ---------------- | --------------------- | ------------------------- |
| Account chip     | `bg-accent-light`     | `text-accent-dark`        |
| Expense: devices | `bg-accent-light`     | `text-accent-dark`        |
| Expense: salary  | `bg-violet-light`     | `text-violet-foreground`  |
| Expense: SIM     | `bg-success-light`    | `text-success-foreground` |
| Expense: fuel    | `bg-warning-light`    | `text-warning-foreground` |
| Expense: rent    | `bg-surface-tertiary` | `text-text-secondary`     |

---

## Typography

| Element              | Size | Weight | Line height | Color token           | Font           |
| -------------------- | ---- | ------ | ----------- | --------------------- | -------------- |
| Logo text            | 18px | 700    | 24px        | `text-text-primary`   | Sora           |
| Page title           | 20px | 700    | 28px        | `text-text-primary`   | Sora           |
| Stat number          | 25px | 700    | 28px        | `text-text-primary`   | Sora           |
| Section heading      | 16px | 600    | 24px        | `text-text-primary`   | Sora           |
| Nav item (active)    | 14px | 600    | 20px        | `text-accent-dark`    | Inter          |
| Nav item (inactive)  | 14px | 500    | 20px        | `text-text-secondary` | Inter          |
| Table header         | 11px | 600    | 16px        | `text-text-muted`     | Inter          |
| Card label           | 13px | 500    | 18px        | `text-text-secondary` | Inter          |
| Body text            | 13px | 400    | 18px        | `text-text-primary`   | Inter          |
| Money / ID figures   | 13px | 500    | 18px        | `text-text-primary`   | JetBrains Mono |
| Status / trend badge | 12px | 600    | 16px        | varies by status      | Inter          |
| Timestamp / muted    | 12px | 400    | 16px        | `text-text-muted`     | Inter          |
| Chart axis labels    | 12px | 400    | 15px        | `text-text-muted`     | Inter          |

Font families: **Sora** for display (logo, page titles, stat numbers, section headings), **Inter** for body and UI, **JetBrains Mono** for money, IMEI, registration numbers, and other figures that need to align. Import all via next/font/google — never use a fallback system font.

---

## Spacing

| Token       | Value      | Usage                 |
| ----------- | ---------- | --------------------- |
| `gap-1`     | 4px        | Tight inline gaps     |
| `gap-2`     | 8px        | Badge and tag gaps    |
| `gap-3`     | 12px       | Form field gaps       |
| `gap-4`     | 16px       | Card / section gaps   |
| `gap-5`     | 20px       | Between panels        |
| `gap-6`     | 24px       | Between sections      |
| `p-4`       | 16px       | KPI card padding      |
| `p-5`       | 20px       | Panel padding         |
| `p-6`       | 24px       | Large card padding    |
| `px-4 py-2` | 16px / 8px | Button padding        |
| `px-3 py-1` | 12px / 4px | Badge padding         |

---

## Component Tokens

### Cards

```
background: bg-surface
border: 1px solid var(--color-border)
border-radius: 20px (--radius-xl)
padding: 20px (p-5) — or 24px (p-6) for large cards
box-shadow: 0 1px 2px rgba(15,27,45,0.05), 0 6px 22px -8px rgba(15,27,45,0.14)
```

### Buttons

**Primary:**

```
background: bg-accent (#2D6BFF)
text: text-accent-foreground
border-radius: rounded-[9px] (--radius-sm)
padding: px-4 py-2.5
font-weight: font-semibold
hover: bg-accent-dark
box-shadow: 0 8px 18px -6px rgba(45,107,255,0.6)
```

**Secondary / Ghost:**

```
background: bg-surface
border: border border-border
text: text-text-secondary
border-radius: rounded-[9px]
padding: px-4 py-2.5
box-shadow: 0 1px 2px rgba(15,27,45,0.05)
hover: text-text-primary, border-text-muted
```

### Input Fields

```
background: bg-surface
border: border border-border
border-radius: rounded-[9px]
padding: px-3 py-2.5
text: text-text-primary
placeholder: text-text-muted
focus: ring-2 ring-accent-light, border-accent
```

### Search Field

```
background: bg-surface
border: border border-border
border-radius: rounded-[9px]
padding: px-3.5 py-2.5
icon: text-text-muted, 16px
box-shadow: 0 1px 2px rgba(15,27,45,0.05)
```

### Segmented Control (filters)

```
container: bg-surface, border border-border, rounded-[9px], p-1
inactive button: text-text-secondary, font-medium
active button: bg-text-primary (#0F1B2D), text-white, font-semibold, rounded-[7px]
padding: px-3.5 py-1.5
```

### Badges / Pills

```
border-radius: rounded-full
padding: px-2.5 py-1
font-size: text-xs (12px)
font-weight: font-semibold
colors: from Status / Device / Category tables above
```

### Trend Badges (KPI cards)

```
up:   background var(--color-success-lightest), text var(--color-success-dark)
down: background var(--color-error-light),      text var(--color-error-foreground)
border-radius: rounded-full
padding: 3px 8px
font-size: 11.5px
font-weight: 600
```

### KPI Card

```
icon chip: 38x38px, rounded-[11px], tinted bg + matching text
  - blue:   bg-accent-light / text-accent-dark
  - green:  bg-success-light / text-success-dark
  - amber:  bg-warning-light / text-warning-dark
  - violet: bg-violet-light / text-violet-dark
stat number: Sora 25px / 700
label: 12.5px / text-text-secondary
sparkline: 38px tall, stroke matches chip color, gradient fill at 15% opacity
```

### Progress Bar (category / make breakdown)

```
track: bg-border-light, height 8px, rounded-full
fill: categorical color (accent / success / violet / warning / text-muted), rounded-full
value label: JetBrains Mono, 12.5px, font-semibold
```

### Entity Avatar / Thumbnail

```
size: 36x36px, rounded-[9px]
background: linear-gradient(135deg, <color>, <color-dark>) per row
text: white, Sora, 12px, 700 (initials)
```

### Activity Feed Dots

| Activity Type    | Background         | Icon color          |
| ---------------- | ------------------ | ------------------- |
| Renewal received | `bg-success-light` | `text-success-dark` |
| New installation | `bg-accent-light`  | `text-accent-dark`  |
| Renewal due soon | `bg-warning-light` | `text-warning-dark` |
| Stock received   | `bg-violet-light`  | `text-violet-dark`  |

Dot container: 34x34px, rounded-[10px], icon 16px.

### Dashboard Chart Colors

| Chart                          | Color                                                          |
| ------------------------------ | -------------------------------------------------------------- |
| Revenue / installs (line+area) | `#2D6BFF` stroke, 3px width, gradient fill rgba(45,107,255,0.2)|
| Renewals (line)                | `#13B981` stroke, 2.5px width                                  |
| Revenue bars                   | `#2D6BFF`                                                      |
| Expenses bars                  | `#F59E0B`                                                      |
| Chart grid lines               | `1px solid #E8ECF3`                                            |
| Chart axis labels              | `#97A4B8`, 12px                                                |

### Logo

```
background: linear-gradient(135deg, #2D6BFF 0%, #5A8BFF 100%)
border-radius: 10px
size: 36x36px
icon: white pin/location glyph, 19px
```

---

## Invariants

- Never use hex values directly in components — always use CSS variables via Tailwind tokens
- Display font is Sora, body is Inter, figures are JetBrains Mono — always import via next/font/google, never use a fallback system font
- Never use raw Tailwind color classes like `bg-blue-500` or `text-gray-600` — use project tokens only
- `--color-accent` (#2D6BFF) is the only blue — never use Tailwind's built-in blue scale
- Money, IMEI, GSM, and registration numbers always render in `--font-mono` for alignment
- Status badge colors always come from the Status / Device / Category tables — never hardcoded per component
- Active nav items use `bg-accent-light` + `text-accent-dark` with a 3px `--color-accent` left bar — never approximate
- All borders default to `--color-border` (#E8ECF3) — never use `border-gray-*`