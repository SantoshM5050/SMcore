---
name: SMCore Precision Dark
colors:
  surface: '#121318'
  surface-dim: '#121318'
  surface-bright: '#38393f'
  surface-container-lowest: '#0d0e13'
  surface-container-low: '#1a1b21'
  surface-container: '#1e1f25'
  surface-container-high: '#292a2f'
  surface-container-highest: '#34343a'
  on-surface: '#e3e1e9'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#e3e1e9'
  inverse-on-surface: '#2f3036'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#bdc2ff'
  on-secondary: '#131e8c'
  secondary-container: '#2f3aa3'
  on-secondary-container: '#a8afff'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#00885d'
  on-tertiary-container: '#000703'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#e0e0ff'
  secondary-fixed-dim: '#bdc2ff'
  on-secondary-fixed: '#000767'
  on-secondary-fixed-variant: '#2f3aa3'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#121318'
  on-background: '#e3e1e9'
  surface-variant: '#34343a'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 2.25rem
    fontWeight: '700'
    lineHeight: 2.75rem
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.75rem
    fontWeight: '700'
    lineHeight: 2.25rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.25rem
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: 0.875rem
    letterSpacing: 0.04em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1rem
    letterSpacing: -0.01em
  code-xs:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: 0.875rem
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 1.75rem
---

## Brand & Style

This design system establishes an ultra-refined, developer-grade operations command center built for Discord community executives, security analysts, and moderation teams. The aesthetic marries the technical rigor of Linear, the optical clarity of Vercel, and the compact ergonomics of Raycast. It projects absolute authority, operational reliability, and real-time responsiveness.

### Visual Philosophy
- **Tactical Dark Elegance:** A multi-layered, deep obsidian and zinc-slate environment prioritizing signal over noise.
- **Instrumental Density:** Compact, pixel-precise data layouts engineered for high-throughput review, command-line speed, and audit-level clarity without visual claustrophobia.
- **Luminescent Accentuation:** Intentional use of neon indigo and electric violet to guide focus, balanced by hyper-legible semantic telemetry indicators (emerald for operational integrity, amber for behavioral warnings, rose for critical threat vectors).

## Colors

The palette is tuned specifically for deep-dark displays to minimize optical fatigue during extended incident response and live moderation sessions.

### Semantic & Surface Tiers
- **Canvas Root (`#090a0f`):** The master canvas, absolute void base for high-contrast separation.
- **Surface Elevation 1 (`#0d0f17`):** Primary panel containers, navigation sidebars, and structural columns.
- **Surface Elevation 2 (`#131622`):** Interactive cards, stat modules, table rows, and popovers.
- **Surface Elevation 3 (`#1b1f30`):** Elevated overlays, modal dialogues, input foundations, and hover states.
- **Border Subtle (`#1e2235`):** Structural division lines and perimeter container framing.
- **Border Active / Focus (`#313754` / `#6366f1`):** Dynamic focus indicators and targeted module rings.

### Accent & Functional Status
- **Primary / Indigo Ray (`#6366f1` / `#818cf8`):** Command executions, active selection rings, primary action states.
- **Success / Emerald Sentinel (`#10b981`):** Verified states, clean audits, healthy bot latencies, closed tickets.
- **Warning / Amber Sentry (`#f59e0b`):** Cooldown triggers, rate-limit thresholds, escalated verification queues.
- **Danger / Rose Purge (`#f43f5e`):** Instant bans, raid mitigation activations, permission revocations, malicious token alerts.

## Typography

The typographic hierarchy prioritizes structural balance between expressive, engineered headings and high-density, legible operational telemetry.

- **Plus Jakarta Sans (Headings & Metric Displays):** Delivers clean geometry with authoritative modern proportions, cutting through dark UI planes with tight tracking.
- **Inter (Interface & Data Body):** Provides exceptional neutrality and micro-legibility across tabular datasets, moderation log timelines, and contextual tooltips.
- **JetBrains Mono (Identifiers, Tokens, Audit Hashes):** Standardized across all technical parameters, Discord IDs, guild snowids, IP ranges, automated filter regexes, and security payloads.

## Layout & Spacing

The layout is governed by a fluid-responsive 12-column grid optimized for wide operations displays while collapsing predictably down to mobile hand-held views.

### Screen Adaptations
- **Desktop (1280px+):** Collapsible rail navigation (64px collapsed, 240px expanded), 12-column workspace grid, `gutter-desktop` (1.5rem), and full multi-pane inspection docks for live user auditing and ticket triage.
- **Tablet (768px - 1279px):** 8-column layout, contextual panels transition into stacked overlay sheets, `margin-tablet` (1.5rem).
- **Mobile (< 768px):** 4-column single-stream stack, persistent bottom command bar, horizontal scroll rails for filter chips and segmented controllers, `margin` (1rem).

### Layout Model
Layouts enforce strict 4px base increments. Visual density inside modules is kept compact (`space-xs` and `space-sm`) to maximize visible real estate for tables and audit feeds, while macro-containers preserve breathing space via `space-lg` and `space-xl`.

## Elevation & Depth

This system avoids heavy, diffuse drop shadows that wash out dark backgrounds. Depth is achieved via **tonal step-ups, crisp micron borders, and subtle top-edge specularity**.

### Surface Layers
1. **Base Plane:** Canvas `#090a0f` with zero elevation.
2. **Layer 1 (Panels & Shell):** Background `#0d0f17`, framed by a 1px continuous border of `#1e2235`.
3. **Layer 2 (Cards, Table Headers, Metric Cells):** Background `#131622`, 1px border `#262b40`, featuring a subtle 1px internal top highlight (`inset 0 1px 0 0 rgba(255, 255, 255, 0.05)`).
4. **Layer 3 (Modals, Overlays, Dropdowns):** Background `#181c2b`, border `#313754`, accompanied by an ambient occluding shadow: `0 16px 32px -8px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(99, 102, 241, 0.15)`.

### Optical Boundaries
Dividers between items inside the same tier use low-contrast hairpins (`rgba(255, 255, 255, 0.06)`). Active items produce a calibrated linear outer glow using the primary brand token (`0 0 12px -2px rgba(99, 102, 241, 0.35)`).

## Shapes

The design system employs a refined **Soft (Level 1)** curvature system that emphasizes technical rigor and precision tooling.

- **Micro Components (0.25rem / 4px):** Checkbox boxes, inline code tags, switch thumbs, table row selection markers.
- **Standard Controls (0.375rem / 6px):** Action buttons, form inputs, segment toggles, dropdown menu items.
- **Cards & Data Modules (0.5rem / 8px):** Metric panels, log tables, moderation queues, sheet drawers.
- **Structural Modals (0.75rem / 12px):** Central dialogs, verification wizards, server switcher canvas.
- **Pills / Radii Full (`9999px`):** Status indicator dots, online telemetry badges, counter pills, severity tags.

## Components

### Buttons & Interactive Triggers
- **Primary:** Background `#6366f1`, color `#ffffff`, 1px border `#818cf8` (at 40% opacity). Hover: `#4f46e5` with subtle indigo edge-glow. Height: 32px for compact, 38px for default.
- **Secondary / Outline:** Background `#131622`, text `#cbd5e1`, 1px border `#1e2235`. Hover: background `#1b1f30`, border `#313754`.
- **Destructive:** Background `rgba(244, 63, 94, 0.12)`, text `#fda4af`, 1px border `rgba(244, 63, 94, 0.25)`. Hover: background `rgba(244, 63, 94, 0.2)`.

### Compact Data Tables & Audit Logs
- Striped alternating row backgrounds using `#0d0f17` and `#10131e`.
- Cell height fixed at 36px for ultra-dense logs; typography set to `body-sm` with identifiers in `code-sm`.
- Fixed header pinned with `backdrop-filter: blur(8px)` and bottom border 1px `#1e2235`.

### Metric KPI Cards with Trend Sparklines
- Enclosed in Layer 2 containers (`#131622`).
- Metric numbers set in `headline-lg` with `Plus Jakarta Sans`.
- Integrated micro-sparklines rendered as 1.5px vectors with gradient fills decaying from `#6366f1` (20% opacity) to 0% at bottom baseline.
- Real-time status counters paired with a pulsing radial status dot (4px).

### Form Controls, Sliders & Switches
- **Text Inputs:** Background `#0d0f17`, border 1px `#1e2235`, internal padding `space-sm` `space-md`. Focus rings use dual-layer: 1px `#6366f1` and `0 0 0 2px rgba(99, 102, 241, 0.2)`.
- **Segmented Controls:** Enclosed pill track (`#0d0f17`), active segment sits on an elevated `#1b1f30` plate with crisp 1px border `#262b40`.
- **Toggle Switches:** Track width 36px, height 20px in `#1e2235`. Active track `#6366f1`. Thumb is pure white (`#ffffff`), 16px diameter with 2px inset margin.

### Status Badges & Chips
- Semantically tinted translucent fills (`12%` alpha) with matched solid text and `1px` outer boundary at `20%` alpha.
- Emerald (`#10b981`), Rose (`#f43f5e`), Amber (`#f59e0b`), Indigo (`#6366f1`).
- Pill-shaped geometry (`roundedness: 9999px`), utilizing `label-sm` tracking.