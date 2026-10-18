# PawCare UX audit

Date: 2026-10-18
Viewport walkthrough: 360 × 800, Chromium, reduced motion enabled. The demo uses fictional, local-only interactions.

## Coverage and access limits

Walked the owner landing/onboarding entry, passport, sharing and revoke, first vaccination entry, clinic directory search/list/map, booking/cancellation, SOS intake/search/acceptance, care-plan demo, and the clinic workspace demo. Captured light and dark states. Protected clinic patient and moderator routes redirect to sign-in without real role credentials; these are recorded as access gates, not treated as authenticated walkthroughs. The demo clinic selector simulates roles and does not prove persisted permissions.

## Findings and changes

| Heuristic | Before | Change | Evidence |
|---|---|---|---|
| Visibility of system status | SOS submit prerequisites were not explained at the disabled action; save/dispatch outcomes were easy to miss. | Added inline prerequisite guidance, live status messaging, clear searching/accepted states, and a small first-vaccination confirmation. | `before/owner-sos-2am.png` → `after/owner-sos-2am.png`, `after/owner-sos-searching.png`, `after/owner-sos-accepted.png`, `after/owner-first-vaccination-logged.png` |
| Match between system and real world | Demo labels and file inputs exposed English/browser-native wording in a Vietnamese flow. | Localized demo names, districts, service names, record details, health tags, file actions, and demo status copy; used locale-aware date and VND formatting. | `before/owner-passport.png` → `after/owner-passport.png` |
| User control and freedom | Sharing and booking had no clear visual outcome during the demo flow. | Added visible share/revoke and booking/cancel outcomes with immediate local feedback. | `after/owner-passport-shared.png`, `after/owner-booking-confirmed.png` |
| Consistency and standards | Sticky section navigation obscured section headings on a small viewport. | Kept the demo navigation in normal flow on mobile and enabled sticky positioning only at desktop widths. | `before/owner-sos-2am.png` → `after/owner-sos-2am.png` |
| Error prevention | SOS could appear unavailable without explaining the missing symptom/location information. | Added actionable inline guidance and an explicit ready state before simulated dispatch. | `after/owner-sos-2am.png` |
| Recognition rather than recall | Clinic workspace dense table layout was not comfortable at 360px. | Preserved compact schedule rows for mobile and table layout for desktop; made clinic actions and status labels localized. | `before/vet-and-clinic-admin.png` → `after/vet-and-clinic-admin.png` |
| Flexibility and efficiency | Search could leave a blank directory result area. | Added a localized no-results state; retained direct list/map switching. | `after/owner-booking.png` |
| Aesthetic and minimalist design | Initial hierarchy and spacing were crowded by the sticky demo nav. | Removed mobile overlap, retained consistent card spacing and enlarged key SOS actions to thumb-friendly sizes. | `before/owner-sos-2am.png` → `after/owner-sos-2am.png` |
| Help users recognize, diagnose, recover from errors | Moderation queue did not clearly distinguish loading, empty, and failure states. | Added skeleton rows, a clear empty state, retry action, and larger action targets. | Source: `components/community/moderation-queue.tsx`; authenticated admin view unavailable for screenshots. |
| Help and documentation | The demo can be mistaken for a live dispatch or real clinic workflow. | Kept explicit fictional/demo and non-diagnostic framing, with clearer clinic workspace/demo role explanation. | `after/owner-sos-2am.png`, `after/vet-and-clinic-admin.png` |

## Persona walkthrough summary

- **First-time owner:** landing → sign-up entry → demo passport → add vaccination → share/revoke → directory → book/cancel. Key friction fixed: unfamiliar English/demo terms, mobile navigation overlap, and low visibility of success feedback.
- **Owner in an SOS at 2 a.m.:** open demo → SOS → choose pet/symptom → provide location → send → see searching/accepted. Key friction fixed: prerequisite and state feedback, mobile symptom wrapping, file-action language, and touch sizing. This demo does not validate real dispatch timing or emergency fallback behavior.
- **Busy vet:** clinic demo → today schedule → passport quick entry → record saved. Key friction fixed: mobile schedule hierarchy and action status. Real clinic patient data remains behind authentication and was not tested without credentials.
- **Clinic admin:** clinic demo role selector → schedule, performance, reminders, commission preview. Role selection is illustrative; the authenticated clinic-admin path was not available.
- **Moderator:** attempted moderation route and verified the sign-in gate. Queue loading/error/empty states were reviewed in code, but a real authenticated moderation session was unavailable.

## Visual and accessibility checks

Before and after captures are under [`before/`](before/) and [`after/`](after/). After captures include light/dark parity and a reduced-motion SOS state. Vietnamese message files parse as JSON with no duplicate full translation keys; checked UI source files for common UTF-8 mojibake markers and replacement characters. The explicit contrast-token check passes in both themes (text tokens ≥ 4.5:1; control borders ≥ 3:1).

The final axe run passed all 11 checks across the public, demo, and design-system routes, including light/dark design-system checks. An initial run during server recompilation exposed the Next.js development issue overlay; after restart and warm-up, the isolated route and complete suite passed. Contrast tokens also pass the explicit light/dark check (text ≥ 4.5:1; control borders ≥ 3:1).

## Remaining risks

- No real owner, vet, clinic-admin, or moderator credentials were available; protected routes could only be verified to redirect to sign-in.
- The interactive demo uses local state and fictional data. It cannot confirm database persistence, actual offline conflict resolution, notification delivery, SOS fan-out, 90-second expansion, or video/chat behavior.
- Full authenticated viewport and screen-reader walkthroughs remain necessary before release.
