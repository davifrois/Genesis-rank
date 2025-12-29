# Genesis Ranking Style Guide (Minimal)

Goal
Create a minimal, modern interface with generous spacing, clear hierarchy, and a limited color system.

Palette (3 main colors)
- Ink: #111827 (primary text, headers, emphasis)
- Surface: #FFFFFF (cards, panels, inputs)
- Accent: #D14B4B (primary action, highlights)

Derived neutrals
- Backgrounds use surface tints: #F7F7F3 and #EFEFEA
- Borders and muted text use ink with low opacity

Typography
- Body: Manrope (weights 400/500/600/700)
- Display: Space Grotesk (weights 500/600/700)
- Use normal case for body text; reserve uppercase for small badges only.

Spacing system
- Base spacing: 8px
- Common gaps: 8, 12, 16, 24, 32, 48
- Section padding: 24 to 40

Radii
- Small: 10
- Medium: 14
- Large: 18
- Pills: 999

Shadows
- Use subtle shadows only for overlays/modals.
- Prefer borders and whitespace for separation.

Components
- Buttons: rounded pill, solid accent for primary, outline for secondary/ghost.
- Cards/panels: white surface with 1px border and 16-18 radius.
- Inputs: white background, 1px border, 10 radius, soft focus ring using accent.
- Tags/pills: surface-muted background, muted text.

Layout
- Topbar: white, sticky, minimal border, no gradients.
- Sidebar: compact list, subtle hover, no heavy shadows.
- Tables: row cards with soft borders and generous spacing.

Motion
- Keep transitions at 0.2s ease.
- Page transitions use a light fade/slide (framer-motion).

Accessibility
- Maintain focus outlines using accent.
- Ensure contrast between ink and surfaces.
