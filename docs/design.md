# PawCare design system

## Direction: Botanical clinic

PawCare uses the warmth of a neighborhood animal clinic with the clarity of a well-made field guide: warm paper surfaces, deep evergreen actions, restrained terracotta accents, and small botanical/map-grid details. Rounded but not bubbly cards and editorial display typography keep the interface from looking like a generic SaaS dashboard. In SOS and clinic workflows, ornament drops away: high contrast, short labels, persistent action placement, and clear state changes take precedence.

The direction is for mobile-first Vietnamese pet owners and time-poor clinic staff. It supports a friendly everyday voice while keeping emergency and medical surfaces calm and unambiguous.

## Color tokens

Semantic CSS variables are the source of truth and switch with `.dark`. Tailwind v4 exposes core tokens through `@theme inline` in `app/globals.css`.

| Token | Light | Dark | Use |
|---|---|---|---|
| background / foreground | `#F7F5EF` / `#20332E` | `#111B18` / `#E7EEE9` | Page canvas and default text |
| card / card-foreground | `#FFFDF8` / `#20332E` | `#192521` / `#E7EEE9` | Raised content |
| primary / primary-foreground | `#1E594C` / `#FFFFFF` | `#89D5B5` / `#10231B` | Main actions, links, focus |
| secondary / secondary-foreground | `#E4EEE8` / `#254D40` | `#273B32` / `#D9ECE0` | Secondary surfaces |
| muted / muted-foreground | `#EDF0EA` / `#4B6059` | `#24312C` / `#B4C5BC` | Quiet surfaces and supporting copy |
| accent / accent-foreground | `#A9422E` / `#FFFFFF` | `#F2A18D` / `#32150F` | Warm highlights, never the only status cue |
| destructive / destructive-foreground | `#A52424` / `#FFFFFF` | `#FFB4A9` / `#3D0807` | Destructive and urgent controls |
| warning | `#704500` on `#FFF1CF` | `#FFCF7C` on `#382A14` | Caution, paired with text/icon |
| info | `#174F72` on `#E3F1F8` | `#9BD8FA` on `#152C3A` | Informational content |
| border / ring | `#D7DED6` / `#1E594C` | `#35463E` / `#A0E3C5` | Boundaries and keyboard focus |

SOS uses the destructive semantic token, always accompanied by an explicit label and icon; color alone never communicates urgency. Verified clinics use a checkmark and “Đã xác minh” badge.

### Contrast verification

Contrast ratios were calculated with the WCAG relative-luminance formula. Text pairs meet WCAG 2.1 AA for normal text (4.5:1) in both themes; large text and essential non-text controls meet at least 3:1. The implementation keeps body/supporting text on its documented surface pair and does not use accent or border tokens as body text.

| Theme | Pair | Ratio |
|---|---|---:|
| Light | foreground on background | 12.23:1 |
| Light | card-foreground on card | 13.12:1 |
| Light | primary-foreground on primary | 8.11:1 |
| Light | secondary-foreground on secondary | 7.99:1 |
| Light | muted-foreground on muted | 5.86:1 |
| Light | accent-foreground on accent | 5.99:1 |
| Light | destructive-foreground on destructive | 7.30:1 |
| Light | warning on warning surface | 7.38:1 |
| Light | info on info surface | 7.59:1 |
| Dark | foreground on background | 14.91:1 |
| Dark | card-foreground on card | 13.41:1 |
| Dark | primary-foreground on primary | 9.58:1 |
| Dark | secondary-foreground on secondary | 9.68:1 |
| Dark | muted-foreground on muted | 7.51:1 |
| Dark | accent-foreground on accent | 8.21:1 |
| Dark | destructive-foreground on destructive | 9.99:1 |
| Dark | warning on warning surface | 9.59:1 |
| Dark | info on info surface | 9.36:1 |
| Light | input boundary against card | 4.36:1 |
| Dark | input boundary against card | 3.95:1 |

Ratios are for the exact pairs above. Product teams must preserve the pairings when composing components and re-check any new color/surface combination.

## Typography

- **Display and headings:** DM Sans, medium to bold. Its geometric forms create a distinct, approachable editorial hierarchy.
- **Body and interface:** Be Vietnam Pro, regular to semibold. It is designed for Vietnamese and keeps dấu legible at compact mobile sizes.
- Both are self-hosted via Fontsource packages; system sans-serif fallbacks are declared. Do not substitute a Latin-only face for Vietnamese text.
- Default body is 15px/1.55; compact labels are at least 12px/1.4; long-form content is 16px/1.65. Emergency instructions should be 16px or larger.

## Layout and surface tokens

- **Spacing:** 4px base scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px. Use 16px minimum mobile page gutters and 24px section gaps.
- **Radii:** 8px controls, 12px small cards, 16px standard cards, 24px hero sheets, pill only for compact tags and avatars.
- **Shadows:** subtle green-tinted card shadow; stronger overlay shadow for dialogs/popovers. Use border and surface hierarchy before adding depth.
- **Motion:** 100ms micro feedback, 160ms standard state transitions, 240ms gentle entrance. Never use motion to communicate urgency. All movement honors `prefers-reduced-motion`.
- **Focus:** 3px semantic ring with 3px offset; never remove the browser-visible focus indication.

## Iconography and illustration

Use Lucide React outline icons at 18–20px, consistent 1.75–2px visual stroke. Pair icons with labels where an action or status might be ambiguous; decorative icons are hidden from assistive tech. Avoid emoji as functional icons.

Illustrations use simple, two-tone botanical linework and rounded animal silhouettes on warm paper. Avoid clinical stock photography, gradients used as decoration, and cartoon medical symbols. The map panel placeholder uses a quiet neighborhood grid until a verified map adapter is introduced.

## Voice and microcopy

Vietnamese is the default; English is the second locale. Write short, plain, supportive sentences. Address owners directly and respectfully (“Bạn”), prefer concrete verbs, and explain the next action. Clinic workflows use concise professional labels.

- SOS and AI surfaces state plainly that PawCare routes and supports triage and does not diagnose or treat.
- Never promise response times, outcomes, or availability that the system cannot guarantee.
- Validation says what is missing and how to fix it; avoid blame (“Vui lòng nhập số điện thoại hợp lệ”).
- Loading explains the action (“Đang tìm phòng khám gần bạn…”); errors preserve user input and offer retry or another path.
- Destructive actions name the consequence and offer undo where reversible (“Đã lưu trữ hồ sơ · Hoàn tác”).
- “Đã xác minh” is reserved for clinics whose status is actually verified.
- Avoid slang, baby talk, all caps, unexplained abbreviations, and alarming language except for a clear emergency instruction.

## UX rules

- Start at 360px. Main actions sit in the lower thumb zone on mobile; SOS remains visible as a persistent control and opens its flow in one tap (two taps maximum from any route).
- Forms validate inline, preserve entered values after errors, and autosave drafts when the user leaves or pauses. Show a non-blocking saved state.
- Reversible changes use optimistic UI and an explicit undo affordance; failures roll back and explain recovery.
- Destructive actions use a confirm step when they cannot be undone. Avoid dead ends: every empty/error state has a next action, retry, or route back.
- Dialogs and sheets trap focus while open, close on Escape, return focus to their trigger, and keep controls reachable at 360px.
- Native keyboard behavior is preserved for controls; tab order follows visual order; dialogs announce titles/descriptions; errors are programmatically associated with fields.

## Component inventory

The reusable implementation lives in `components/ui/`, uses shadcn/ui conventions with Radix primitives, and is previewed at `/design-system` in development only. `components.json` records the shadcn project aliases and Tailwind entry. Component states include default, loading, empty, error, disabled and visible keyboard focus as applicable. Select, Combobox, Dialog, Sheet, Tabs, Toast, Tooltip and Avatar use accessible primitives; other components use semantic HTML and the shared tokens. A `MapPanel` is a non-interactive placeholder, not a map integration.

## References

- [Tailwind CSS theme variables](https://tailwindcss.com/docs/theme)
- [shadcn/ui installation](https://ui.shadcn.com/docs/installation)
- [Next.js App Router installation](https://nextjs.org/docs/app/getting-started/installation)
- [axe-core accessibility engine](https://github.com/dequelabs/axe-core)
- [Be Vietnam Pro self-hosting](https://fontsource.org/fonts/be-vietnam-pro/install)
- [DM Sans self-hosting](https://www.npmjs.com/package/@fontsource/dm-sans)

## Verification record

- Contrast pairs: `npm run contrast` passed in both themes.
- Automated accessibility: `npm run a11y` passed for both themes, the 360px viewport, and open dialog/sheet overlays using WCAG 2.1 A/AA axe rules.
- Production build and strict TypeScript check passed. Automated axe does not replace manual screen reader and real-device review.
