---
name: Obsidian Lumina
colors:
  surface: '#12131a'
  surface-dim: '#12131a'
  surface-bright: '#383940'
  surface-container-lowest: '#0c0e14'
  surface-container-low: '#1a1b22'
  surface-container: '#1e1f26'
  surface-container-high: '#282a31'
  surface-container-highest: '#33343c'
  on-surface: '#e2e1eb'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e2e1eb'
  inverse-on-surface: '#2f3037'
  outline: '#849495'
  outline-variant: '#3a494b'
  surface-tint: '#00dbe7'
  primary: '#e1fdff'
  on-primary: '#00363a'
  primary-container: '#00f2ff'
  on-primary-container: '#006a71'
  inverse-primary: '#00696f'
  secondary: '#ffabf3'
  on-secondary: '#5b005b'
  secondary-container: '#fe00fe'
  on-secondary-container: '#500050'
  tertiary: '#faf6f6'
  on-tertiary: '#313030'
  tertiary-container: '#dddad9'
  on-tertiary-container: '#615f5f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#74f5ff'
  primary-fixed-dim: '#00dbe7'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#ffd7f5'
  secondary-fixed-dim: '#ffabf3'
  on-secondary-fixed: '#380038'
  on-secondary-fixed-variant: '#810081'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c9c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474646'
  background: '#12131a'
  on-background: '#e2e1eb'
  surface-variant: '#33343c'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.04em
  display-lg-mobile:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-base:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  label-mono:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.1em
  data-numeric:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-safe: 32px
  container-max: 1440px
---

## Brand & Style
The design system embodies a high-end financial technology aesthetic characterized by "Obsidian Minimalism." It is designed for elite analysts who require high-density data visualization without cognitive fatigue. The brand personality is precise, avant-garde, and authoritative. 

The visual style merges **Minimalism** with **Cyber-Corporate** elements. It utilizes a true-black environment to maximize contrast, employing holographic glass textures and neon pulse lines to denote activity and "live" data streams. The emotional response is one of total control, immersion, and sophisticated technical power.

## Colors
The palette is rooted in a deep obsidian base to eliminate edge bleed and focus the eye on data.

- **Background:** Deep Obsidian (#050505) is the bedrock of the UI.
- **Primary (Cyan):** Used for "Active" states, positive trend data, and primary call-to-actions. It should feel like a light-emissive element.
- **Secondary (Magenta):** Reserved for "Alerts," high-volatility indicators, and accents that break the monochrome rhythm.
- **Surface Tiers:** Use subtle variations of grey (#0f0f11, #18181b) to define container depth without losing the "dark space" feel.
- **Neon Pulse:** Functional elements use a 1px glow (box-shadow) utilizing the primary and secondary colors at 40% opacity.

## Typography
This design system utilizes **Geist** exclusively to leverage its technical, developer-centric precision and tabular spacing—essential for financial data.

- **Headlines:** Should be tight, bold, and authoritative.
- **Data Display:** Numeric values use `data-numeric` to ensure alignment in columns and tickers.
- **Micro-copy:** All labels should use `label-mono` with slight letter spacing to evoke a "terminal" or hardware-interface aesthetic.
- **Readability:** Maintain high contrast against the obsidian background using Zinc-100 or White for primary text, and Zinc-400 for secondary metadata.

## Layout & Spacing
The system follows a **Fixed-Fluid Hybrid** model. While the outer containers are fixed to a 1440px max-width on desktop to prevent eye-strain across ultra-wide monitors, internal dashboards use a fluid 12-column grid.

- **Rhythm:** A 4px baseline grid governs all spacing.
- **Desktop:** 24px gutters with 32px safe margins.
- **Tablet:** 16px gutters with 24px margins.
- **Mobile:** 12px gutters with 16px margins.
- **Density:** High-density layout. Components are packed tightly to maximize the "Information Cockpit" feel, separated by thin 1px borders rather than wide gaps.

## Elevation & Depth
Depth is not achieved through shadows, but through **Tonal Layering** and **Glassmorphism**.

- **Level 0 (Base):** #050505.
- **Level 1 (Cards/Panels):** #0f0f11 with a 1px border (#27272a).
- **Level 2 (Modals/Overlays):** #18181b with a 15px backdrop-blur and 20% opacity.
- **Holographic Glass:** For interactive overlays, use a linear gradient border (Cyan to Magenta) at 0.5px thickness to create a "shimmer" effect.
- **Neon Pulse Lines:** Vertical or horizontal 1px separators that use a subtle glow animation to indicate live data transmission.

## Shapes
The shape language is "Sharp yet Refined." While the overall aesthetic is aggressive and technical, 4px corners (Soft) are applied to all interactive elements to provide a hint of premium manufacturing. 

- **Containers:** 4px radius.
- **Buttons:** 4px radius.
- **Data Points:** Square or Diamond shapes for chart markers to maintain the technical edge.

## Components
- **Buttons:** Primary buttons are "Ghost" style with a 1px Cyan border and Cyan text. On hover, they fill with a subtle Cyan-to-Transparent gradient and a soft outer glow.
- **Inputs:** Dark, recessed fields with #050505 background and 1px borders. The cursor and focus border must be Cyan.
- **Cards:** No shadows. Use "Obsidian Glass" styling: a 1px border at 10% white opacity and a slight 2px blur if positioned over other elements.
- **Chips/Tags:** Monospaced text inside a pill-shaped container with a 1px border matching the status color (Cyan for active, Magenta for alert).
- **Pulse Lines:** Use as section dividers. These are 1px lines with a subtle CSS animation that travels from left to right to signify active data polling.
- **Charts:** Line charts should use a "Neon Glow" path with a gradient area fill (Color to Transparent).