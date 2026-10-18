# Clinic directory and booking design

## Intent

Help pet owners find a suitable, trustworthy clinic and book a real appointment without calling around. Give clinics a dependable schedule and concise incoming appointment workflow.

## Goals

- Public clinic directory with distance, specialty, open-now, 24/7, price range, language filters; map/list views; clinic detail pages with services, vets, hours, photos, verified status, and reviews.
- Search ranking based on a documented formula combining distance, confidence-adjusted ratings, response time, and availability.
- A swappable maps adapter: Google Maps in configured production environments and MapLibre in demo mode.
- Appointment search and booking for a selected pet and service, with reschedule/cancel policies, reminders through notifications, and `.ics` export.
- Availability respects clinic opening hours, vet shifts, service duration, buffers, and holidays. Concurrent booking attempts cannot both claim the same capacity.
- Reviews can be created only for completed appointments, once per visit; clinics can reply; users can report reviews; moderation supports abuse reports without rating incentives.
- Clinic workspace shows incoming requests for confirmation/decline and supports no-show tracking.
- Tests cover concurrent booking, ranking, review eligibility, booking happy path, and cancellation.

## Non-goals

- SOS dispatch, tele-triage, payments, insurance, or a marketplace for sponsored placement.
- Ranking boosts purchased by clinics, paid review incentives, or hidden recommendation criteria.
- A fully offline map. Search and booking require connectivity; appointment confirmations are server-authoritative.
- Automated scheduling decisions that ignore clinic-configured policies or vet capacity.

## Constraints and current state

- Follow the existing Next.js App Router, modular monolith, TypeScript, Supabase/Postgres, RLS, Zod, and next-intl setup. Directory/clinic pages belong to clinics; availability/appointments to booking; reviews to their own domain. Cross-domain calls use public interfaces.
- The current migration contains only basic clinic identity and verification fields. New directory, schedule, appointment, review, and audit schema must be additive and versioned.
- Clinic discovery is public only for verified clinics; private clinic workspace actions require authenticated clinic membership and server-side role checks.
- Each appointment references one pet, clinic, service, slot/capacity, and owner. Existing pet ownership is single-owner today; booking must use that current boundary unless the Passport multi-owner schema lands first.
- No third-party keys or credentials belong in the repo. Maps providers are adapters and are mocked in tests.
- Ranking is transparent and excludes sponsored/payment signals. Explanations expose the component contributions or plain-language reasons.
- Vietnamese is default, English is supported, dates and currency are locale-aware, and the booking flow works at 360px.

## Owner flow

1. Search by location and selected filters. The result list shows clinic name, verified badge, distance, open status, specialties/services, price range, languages, review count/rating confidence, and soonest availability.
2. Toggle map/list without losing filters. Map pins and list cards select the same clinic result; keyboard users can use the list equivalently.
3. Open a clinic page for hours, services and prices, vet profiles/schedules, photos, reviews/replies, and clear directions/contact details.
4. Select pet, service, date, and an available time. Show service duration, clinic cancellation/reschedule policy, and any booking status (instant confirmation vs clinic confirmation) before final submit.
5. Create the appointment atomically. The slot/capacity is reserved in the same transaction as appointment creation. If another request wins, refresh choices and explain the conflict without creating a duplicate.
6. View upcoming/past bookings, request reschedule or cancellation according to policy, export a calendar event, and receive reminders through the notifications module.
7. After a clinic marks the visit completed, show one review form tied to that appointment. A completed appointment is eligible once; clinic reply is one moderated response; report action creates a moderation case.

## Clinic flow

1. See incoming requested appointments with pet, service, proposed time, and owner contact/access details appropriate to the existing privacy grant.
2. Confirm or decline, with a reason for decline. Confirmation atomically retains capacity; decline releases it and triggers notification.
3. Mark checked-in, completed, or no-show with timestamp and staff actor. Only completed status unlocks a review.
4. Configure clinic hours, holiday closures, services/durations/buffers, staff schedules, and booking policies in a later management surface; seed/configuration must support the availability engine from this slice.

## Ranking formula

Document and version the formula in code and user-facing methodology text. Proposed version 1 produces a normalized 0–100 score:

`score = 0.30 * distance + 0.25 * rating_confidence + 0.20 * response_time + 0.25 * availability`

- Distance score decays linearly to zero at the user-selected radius; distance is computed from clinic coordinates.
- Rating confidence uses a Bayesian average with a configurable prior mean and prior weight, so a clinic with few reviews does not outrank on one extreme rating. Display rating count beside the score.
- Response-time score maps median response minutes over a documented rolling window to 0–1; clinics without sufficient observations receive a neutral prior, never a best-case score.
- Availability score maps soonest bookable slot to a documented freshness window; no inventory yields zero.
- Missing signals use documented neutral priors and renormalize weights over available signals so missing data is not treated as a perfect score.
- Filters are applied before ranking. Verified status is a displayed trust attribute/filter, not a hidden paid boost. Ties use stable clinic id ordering.
- Weights, priors, time windows, and decay are product defaults for review, not empirical claims; expose them in configuration and tests.

## Availability and booking integrity

- Represent weekly clinic hours, date-specific holiday/exception closures, vet shifts, services, service duration, pre/post buffers, and slot capacity explicitly.
- Generate candidate slots in the clinic's configured timezone; persist appointment instants in UTC with the source timezone retained for display and policy evaluation.
- Reject slots outside clinic hours, closures, staff schedules, or service-compatible capacity.
- Prevent double booking with database transaction plus a unique/exclusion constraint over staff/resource and occupied time range (including buffer). If the clinic uses pooled capacity, lock the capacity row and decrement it conditionally in the same transaction.
- Keep reservation and appointment state transitions in a server-side booking service/RPC with idempotency key. Never rely on client availability checks as the concurrency control.
- Reschedule performs release-and-reserve atomically. Cancellation uses the clinic policy snapshot stored on the booking and records actor/time/reason.
- Reminder jobs enqueue notifications at configured offsets. Calendar output includes timezone-aware DTSTART/DTEND, stable UID, and policy/contact summary.

## Data, privacy, and moderation

- Directory data: clinic location/address, verification, photos, language/specialty tags, hours, service catalog and prices, vet profiles, and listing status.
- Booking data: exception calendar, staff schedules/resources, service duration/buffer, appointments, status history, policy snapshot, notification scheduling key, and idempotency key.
- Review data: appointment unique key, rating, text, moderation state, clinic reply, report records, and audit events. Database constraints enforce one review per completed appointment; transition validation ensures only completed visits qualify.
- Apply RLS to every table. Public reads are limited to published directory fields and verified public clinic data. Staff mutations require clinic membership and appropriate role. Appointment owner access is scoped to the booked pet's owner; future multi-owner access must be explicitly wired.
- Review reports are private to the reporter/moderators; clinic reply cannot mutate review content/rating. Abuse handling records every state transition.
- Store photos behind controlled upload paths with MIME/size limits and moderation status. Do not expose verification documents as clinic marketing photos.

## Maps and integrations

- `MapsAdapter` owns geocoding, map rendering, marker interaction, and navigation URL generation; directory query/ranking stays provider-independent.
- Google Maps is selected for configured production use; API keys are environment variables restricted in the provider console by application and API. MapLibre is the no-key demo implementation with clearly labeled fictional seed clinics.
- Map provider failures preserve the list and filters. Do not block booking on map loading.
- Reminders call the existing notifications module interface; booking does not send provider-specific messages directly.

## UX and accessibility

- Vietnamese-first copy, with clear distinction among verified clinic, rating confidence, clinic confirmation pending, and confirmed booking.
- Keep filters usable on mobile through a bottom sheet; keep the primary booking action reachable. On desktop, use a stable list/map split view.
- Show no-results, location denied, map unavailable, slot conflict, clinic response pending, and cancellation policy states with a recovery action.
- Forms support keyboard navigation, focus visibility, screen readers, inline validation, and reduced motion. Never communicate ranking or booking state only through color.
- Do not show unsupported precision (e.g. exact response time) when there are too few observations; label sample limitations.

## Tests and acceptance criteria

- Ranking unit tests cover weight calculation, distance decay, Bayesian rating confidence for low/high sample counts, missing-data renormalization, deterministic ties, and absence of paid/verified boosts.
- Availability unit tests cover open hours, overnight/holiday closures, vet schedule, service duration, buffers, timezone boundaries, and unavailable capacity.
- Concurrent DB/integration test submits at least two requests for the same final capacity in parallel and asserts exactly one succeeds with one persisted appointment.
- Review eligibility tests cover non-completed, completed, duplicate, clinic reply, and report transitions.
- E2E happy path searches/filter clinics, opens details, books for a pet/service, and sees confirmed or pending status. Cancellation E2E verifies policy and slot release.
- Calendar export validates `.ics` content and timezone fields. Map adapter tests cover provider failure and list fallback.

## Implementation calls to review

- Assume clinics can choose instant confirmation or manual confirmation; only the latter appears as pending. Booking is confirmed only after the server accepts the slot.
- Assume cancellation/reschedule windows and fees are clinic-configured, stored as a policy snapshot per appointment, and enforced consistently; legal/consumer-policy wording stays an open question for counsel.
- Use a fixed default search radius with user control, and ask for location only when needed; manual district/address search remains available.
- Keep initial map and list results consistent and preserve search filters across view switches.
- The requested ranking weights are starter defaults requiring product approval and later calibration with real data; no claim is made that they are empirically optimal.

## Builder check

Self-review: all requested discovery, ranking, maps, booking, reviews, clinic hooks, and test cases are represented. Database constraints, not UI checks, are the concurrency authority. Public data is separated from private appointment data. The formula is explainable and excludes monetization. Remaining meaningful calls are marked above for owner approval.
