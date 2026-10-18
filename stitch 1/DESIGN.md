---
name: Aether Intelligence
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#5de6ff'
  on-secondary: '#00363e'
  secondary-container: '#00cbe6'
  on-secondary-container: '#00515d'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#00a572'
  on-tertiary-container: '#00311f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#a2eeff'
  secondary-fixed-dim: '#2fd9f4'
  on-secondary-fixed: '#001f25'
  on-secondary-fixed-variant: '#004e5a'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  section-gap: 80px
---

## Brand & Style

The design system is engineered to evoke the precision and authority of a high-tier Labor Market Intelligence platform. The aesthetic is **Sleek Dark Mode**, blending **Minimalism** with **Glassmorphism** to create a sophisticated, data-intelligence environment. 

The personality is authoritative yet visionary—positioning the platform as a multi-million dollar technology leader. Visuals prioritize clarity in complex data sets, using generous whitespace (negative space) to prevent information density from becoming overwhelming. Depth is achieved through light-refracting surfaces and subtle neon glows that signify AI-driven insights.

## Colors

The palette is centered on a "Deep Space" hierarchy. The foundation uses **Deep Slate (#0F172A)** for primary backgrounds to ensure high contrast for data visualizations. **Surface Navy (#1E293B)** is utilized for cards and elevated containers.

- **Primary (Electric Blue):** Used for primary actions, active states, and core branding elements.
- **Secondary (Cyan):** Reserved for AI-suggested insights, highlights, and secondary data points.
- **Tertiary (Emerald):** Denotes growth, positive market trends, and "success" states.
- **Accents/Glows:** Use 20% opacity versions of the primary and secondary colors for backdrop blurs and "neon" edge highlights.

## Typography

This design system utilizes **Geist** for its technical, Swiss-inspired precision, making it ideal for a modern SaaS. Its geometric clarity ensures readability even in dense data dashboards.

**JetBrains Mono** is introduced as a secondary label font for data points, metrics, and metadata to reinforce the "intelligence/technical" nature of the AI platform. 

All headings should use tighter letter-spacing for a premium, editorial feel, while body text maintains standard tracking for optimal legibility against dark backgrounds. Use `text-secondary` (Slate 400) for long-form descriptions to reduce eye strain.

## Layout & Spacing

The system follows a **Fluid Grid** model with a 12-column structure for desktop. To maintain the "premium" feel, the design system employs an expansive spacing rhythm, favoring larger margins and gaps to let data "breathe."

- **Desktop:** 12 columns, 24px gutters, 48px side margins.
- **Tablet:** 8 columns, 16px gutters, 32px side margins.
- **Mobile:** 4 columns, 16px gutters, 16px side margins.

Vertical rhythm is strictly 8px-based. Use `section-gap` for major layout blocks to maintain the high-end, spacious aesthetic typical of top-tier technology firms.

## Elevation & Depth

Hierarchy is established through **Glassmorphism** and **Tonal Layering** rather than traditional heavy shadows.

1.  **Base Layer:** Deep Slate (#0F172A).
2.  **Surface Layer:** Surface Navy (#1E293B) with a 1px subtle border (Slate 800).
3.  **Floating Layer (Glass):** Semi-transparent backgrounds (15% white or primary) with a `24px` backdrop blur. 
4.  **Glows:** For the most important AI-driven elements, apply a `box-shadow` using the primary or secondary color with a 20-30px blur and low (10-15%) opacity to create a "neon" aura.

Borders should be thin (1px) and use low-contrast hex codes to suggest structural boundaries without cluttering the visual field.

## Shapes

The shape language is **Rounded**, striking a balance between the friendliness of AI assistance and the rigidity of data analysis. 

- **Standard Elements:** 0.5rem (8px) radius for inputs, small cards, and buttons.
- **Large Containers:** 1rem (16px) radius for main dashboard cards and modals.
- **Interactive Pill:** Use 100px (full round) for status indicators and specific action tags (chips).

## Components

### Buttons
- **Primary:** Solid Electric Blue with white text. On hover, add a subtle Cyan outer glow.
- **Secondary:** Transparent with a 1px Electric Blue border and 10% Blue fill.
- **Ghost:** No background, white text. Primary blue text on hover.

### Cards
- **Data Cards:** Surface Navy background, 1px Slate 800 border.
- **AI Insight Cards:** Glassmorphic (blurred background) with a thin Cyan top-border or "glow" to distinguish from static data.

### Input Fields
- Dark backgrounds (Slate 950), 1px Slate 700 border. On focus, the border transitions to Electric Blue with a soft 4px blue outer glow.

### Chips & Badges
- Small, uppercase JetBrains Mono text. Use Tertiary (Emerald) for positive market growth and Secondary (Cyan) for AI categories.

### Charts & Visuals
- Use a gradient-stroke approach for line charts (Electric Blue to Cyan). Area charts should use 10% opacity fills to maintain glass-like transparency.