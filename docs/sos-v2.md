> **Update (2026-10-27):** The approved engine is implemented in `supabase/migrations/202610270001_sos_dispatch_engine.sql`, SOS API routes and owner/clinic components. This document records the pre-implementation review; current model and scheduler setup are in `docs/data-model.md` and `docs/integrations.md`.

# SOS v2: current implementation and proposal

## Owner journey implementation update

- Owners keep the existing `/{locale}/owner/sos` flow and owner shell SOS shortcut. Guests can enter the same dispatch panel at `/{locale}/sos`; the public home SOS CTA now opens this route.
- The panel collects a pet or guest species, symptom chips, optional private photo, consented GPS or manual address, and a guest callback number. GPS errors and low accuracy allow address correction. Manual address lookup uses the server-only Google Geocoding adapter documented in `docs/integrations.md`.
- Searching shows the current 5/10/15 km ring, clinics notified in that round, elapsed time, cancel, and a triage/routing disclaimer. The owner subscribes to `sos_requests` Realtime and also polls every five seconds; visibility changes trigger refresh, and a request/token is restored from session storage after the app resumes.
- The accepted state shows the winner's public clinic name, phone and address-based directions, the available ETA if one is stored, pet identity summary, status steps and a 24-hour passport-sharing entry. ETA is unknown when the existing `eta_minutes` is empty; no travel-time estimate is fabricated. Clinic staff can update `accepted → on_the_way → arrived` from the existing accepted SOS card.
- A photo is stored in a private `sos-private` bucket. The accepted clinic receives a five-minute signed URL only through its accepted-detail flow; issuing it is audit-logged. Before acceptance, the clinic inbox remains limited to its existing safe dispatch fields.
- No-clinic state uses the database fallback clinic list, configured hotline and directory link, with Retry. Hardcoded clinic hotline examples were removed from the SOS guide. No hotline is shown when deployment has not configured one.
- The additional migration publishes `sos_requests` for Realtime when the Supabase publication exists, stores owner arrival progress and photo path, and adds clinic-authorized monotonic progress RPC access. The public geocoder endpoint is rate-limited through the existing SOS rate-limit table.
- Verification in this workspace: typecheck passes; unit suite passes 117 tests; SOS Playwright E2E passes six mocked scenarios (three acceptance rings, decline/expansion/fallback, no clinic, network loss/resume). Owner cancellation is skipped unless `E2E_OWNER_EMAIL` and `E2E_OWNER_PASSWORD` are configured. Hosted PostGIS/RLS execution and migration application remain unverified.
- Deployment dependencies: apply both SOS migrations; set `GOOGLE_MAPS_GEOCODING_API_KEY`, `SOS_HASH_SECRET`, the approved `SOS_FALLBACK_HOTLINE`, and existing scheduler configuration. Guest phone retention, location transfer to Google, and SOS service claims remain open counsel/product questions in `docs/legal-open-questions.md`.

## Scope

This is a read-only implementation review. No application code or schema was changed. The requested target is progressive dispatch to clinics that support 24/7 emergency service: search within 5 km, then 10 km, then 15 km, and send the request; the first clinic to accept wins. The existing clinic workspace should be upgraded in place.

## What exists today

### Owner SOS

- The owner home links to `/{locale}/owner/sos`; the route renders `SosGuidance` (`components/owner/sos-guidance.tsx`). It currently contains guidance, example hotline/tele-triage content and local simulated chat state. Inspection found no call to `/api/sos`, no geolocation request and no persisted dispatch/result state in this screen. The interactive demo separately simulates SOS locally and explicitly says no clinic is contacted.
- A server endpoint exists at `POST /api/sos` (`app/api/sos/route.ts`). It validates pet, symptom chips, urgency, longitude/latitude and an idempotency UUID, checks owner role, feature flag and entitlement, then calls `start_sos_request`. It returns `searching` with `radiusKm: 5`.
- A request can be canceled with `PATCH /api/sos/[requestId]`. There is no owner GET/status-polling endpoint in that route, nor a connected owner UI flow found in the current SOS screen.
- The owner home’s always-visible SOS entry goes to the guidance screen; it does not itself send a request.

### Clinic model and settings

- `clinics` has `location geography(Point,4326)`, `is_24_7`, `verified`, `published` and `is_demo`; the location column has a GIST index (`202610160002_pawcare_domains.sql`). `is_24_7` defaults false.
- `ClinicProfileSetupForm` collects address, hours, an `is247` toggle and service labels. Its form state/local-storage preview includes these values, but `saveClinicProfileAction` only upserts clinic id, name, address, phone and a status string; it does not persist `is_24_7`, coordinates or service values. No geocoding/current clinic-location workflow was found in this form. The SOS matcher uses the DB flag and coordinate, not the local preview or service label.
- The 24/7 emergency flag is a coarse clinic-level boolean, not an explicit structured “emergency service” capability plus confirmed coverage/availability. Clinic hours and `clinic_services` exist separately, but SOS matching does not inspect them.

### Dispatch data and acceptance

- `sos_requests` stores owner, pet, symptom chips, urgency, precise location and consent timestamp, plus status, `radius_km` (default 5), `expansion_step`, accepted clinic/staff and lifecycle timestamps. `sos_dispatches` stores one row per request/clinic with distance, ping/response times and pinged/accepted/declined/expired/canceled states.
- `start_sos_request` creates the request and inserts dispatch rows for `find_sos_clinics(..., 5000)`. The matcher filters verified + published + `is_24_7` clinics with coordinates and excludes demo clinics outside demo mode. It orders by distance. It does not implement 10 km or 15 km expansion, staged delays, or progressive notification fan-out. `radius_km` and `expansion_step` are present but not advanced by this flow.
- `accept_sos` checks clinic membership and conditionally changes a still-searching request with no accepted clinic. Its SQL is intended to make one clinic win, then expires other pinged dispatch rows. The API route calls the RPC and reports conflict when acceptance loses. This is the right reuse point for “first accept wins”; the concurrency/rollback behavior should be confirmed in DB tests before relying on it in production.
- A clinic triage-session endpoint exists after acceptance, backed by `create_triage_session`.

### Clinic workspace UI

- `/[locale]/clinic` renders `ClinicTodayView` (`components/clinic/clinic-today-view.tsx`). It has a prominent SOS banner with accept, decline and sound controls, styled as a high-priority part of the existing Today desk.
- The displayed `INITIAL_SOS`, patient queue, clinic identity and responses are hard-coded/local state. “Realtime SOS inbox” currently does not subscribe to realtime or load authorized dispatch data. Accept/decline only changes React state and adds a local queue row; the accept API is not called. This is an appropriate surface to upgrade in place rather than redesign.
- Clinic shell and role checks exist. RLS allows clinic members to read dispatches for their clinic and update their own pinged dispatches to declined/accepted; the request read policy permits a clinic to see a request while it has a pinged dispatch or it has accepted it. API/RPC authorization remains essential.

### Realtime and notifications

- No Supabase Realtime `channel`, `postgres_changes` or subscription was found for SOS. Current clinic “realtime” wording is not backed by a client subscription.
- DB triggers enqueue high-priority in-app notification jobs for each clinic staff member on dispatch insert, and notify the owner after acceptance (`202610160006_notifications.sql`). A service-only job processor can send in-app, configured web push and configured email; SMS/Zalo is a stub. Push delivery is opt-in and requires browser subscription and VAPID configuration. In-app notification records/jobs are not themselves a live UI subscription.
- The notification processor must be scheduled/deployed and configured. Its delivery ledger records provider outcomes, but dispatch success should not be inferred from enqueue or notification delivery; the persistent dispatch row should remain authoritative.

### Maps and location

- SOS accepts numeric coordinates and stores them as PostGIS geography; the database matcher uses `ST_DWithin` and distance ordering. No owner SOS GPS consent/request or manual location-to-coordinate path is connected to it in the current screen.
- `modules/clinics/maps-adapter.ts` only selects Google when configured, MapLibre in demo mode, otherwise no provider. `components/maps/map-view.tsx` renders directory/demo clinic pins and a fallback state. The map is not part of SOS dispatch and does not geocode clinic setup addresses. Demo MapLibre loads demo tiles; this is separate from live routing.
- SOS uses a location-consent timestamp at request creation. The exact-location consent wording, retention/deletion behavior and clinic disclosure should follow the existing privacy/legal open questions, not be decided in implementation by assumption.

## What is missing for the target behavior

1. An owner SOS submit flow connected to `POST /api/sos`, including explicit location acquisition/entry and consent, request progress, cancel/failure/unmatched/accepted states, and recovery when the browser closes or loses network.
2. A progressive dispatch orchestrator that queries eligible clinics at 5 km, waits/advances to 10 km, then 15 km, persists radius/step and dispatch rows transactionally/idempotently, stops on acceptance/cancel/expiry, and reports no-match clearly. Current request creation only dispatches the first 5 km set. The required wait window and whether rings go sequentially or are cumulative need a product decision.
3. Persisted clinic qualification data. Clinic onboarding currently does not save the fields used by the matcher (coordinates and 24/7 flag) and lacks a clear structured emergency-service setting. Clinic self-attestation should not be presented as verified availability without an agreed review/operational process.
4. A real clinic inbox using authorized database reads and an update path to `/api/sos/[requestId]/accept` (and decline handling), showing only the dispatch payload needed to respond. Current banner is fictional local state. The existing layout/banner styles can stay.
5. A reliable alert path. Notification triggers and job processing exist, but the workspace does not consume notifications or dispatch records, there is no Realtime channel, and live push/email depends on deployment/preferences/configuration. Pick and document the supported alert mechanism and fallback/reconnect strategy.
6. Owner status refresh/subscription and loser/accepted updates. No owner live status reader is wired. The acceptance RPC should preserve single-winner semantics under simultaneous clicks and dispatch state changes should promptly reach other clinics and the owner.
7. Operational limits and observable lifecycle: response/ring timeout policy, maximum active requests, retries/idempotency, cancellation after fan-out, expired/unmatched terminal state and alerting. Existing schema/status fields and trace metrics offer reuse points but no expansion worker is wired.
8. Real-world qualification and map data source for clinic coordinates, plus UI strings and accessible loading/empty/error/offline states in Vietnamese and English.

## Minimal-change plan (pending approval)

1. Reuse `sos_requests`, `sos_dispatches`, `start_sos_request`, `find_sos_clinics`, `accept_sos`, existing RLS, feature checks, observability and notification jobs. Extend the SOS RPC/migration for durable, idempotent 5/10/15 km stages and terminal-state checks; avoid a second dispatch model. Keep eligibility limited to verified, published, non-demo clinics with coordinates and an explicitly agreed emergency qualification.
2. Wire `SosGuidance`’s existing SOS affordance to the existing POST endpoint. Add focused location/consent, progress and terminal states using the current SOS visual language; use the existing request ID and idempotency key. Add only the status read/poll/subscription mechanism needed for owner feedback and recovery.
3. Make clinic profile persistence save only the already-collected relevant fields plus coordinates from an agreed source. Reuse the existing 24/7 toggle and emergency service option; do not infer coordinates from free-text address. Add explicit validation/review only after deciding how clinic availability is verified.
4. Replace the hard-coded `INITIAL_SOS` banner data with dispatch rows scoped to the current member clinic. Keep its current banner, decision buttons, sound control and Today desk placement. Wire accept to the current API and decline to a narrowly authorized server action/RPC. Preserve the existing queue presentation and add only a real accepted case to it.
5. Use notification jobs for durable alerting and evaluate Supabase Realtime only as a UI freshness enhancement; define periodic refetch/reconnect fallback. Do not make acceptance depend on successful push, email or Realtime delivery. Keep the request/dispatch DB state authoritative.
6. Add focused tests for 5/10/15 km eligibility/order/stage idempotency, cancellation/acceptance races, concurrent accept single winner, RLS/member isolation and owner/clinic status transitions. Add a happy-path E2E only after the agreed behavior and operational timing are set.

## Risks

- A wrong/missing clinic coordinate, unmaintained 24/7 status or unverified emergency capability can route an owner to a clinic that cannot receive them. The current setup path fails to persist the two fields needed by the matcher.
- Precise location and symptom/pet data are sensitive. Consent, access limits, audit coverage, retention, deletion and transmission content must be reviewed against the existing legal questions.
- A synchronous request handler cannot safely implement staged waiting; a durable scheduled/worker mechanism and operationally configured scheduler are required for predictable ring expansion and retries.
- A first-accept winner must remain correct under racing requests, duplicate clicks, retries and partial database errors. Review the existing RPC transaction behavior and test it before expanding dispatch.
- Push/email may be disabled or mocked, notification processing may be unscheduled, and browsers may be offline. UI must not promise clinic receipt/response based on notification enqueue.
- 24/7 and response-time claims carry product/legal and clinic-operations risk; existing `docs/legal-open-questions.md` already asks what claims are permitted.
- Radius boundaries are straight-line geographic distance, not road travel distance or ETA. Maps adapter does not supply routing/ETA.

## Open questions for approval

1. What waiting interval should each ring use before expanding (5→10 and 10→15 km), and do later rings include all earlier clinics or only new clinics?
2. Should the app contact every eligible clinic within each ring at once, or cap/sequence clinics within a ring? What should happen when no clinic exists within 15 km?
3. What counts as “supports 24/7 emergency service”: the existing `is_24_7` flag plus emergency service selection, and who verifies/refreshes that claim?
4. What coordinate source should clinic admins use: map pin/current GPS, a verified address geocoder, or admin-entered coordinates? Do not infer from free-text address.
5. What exact owner consent copy and location precision/retention should be used? These are legal-sensitive and already tracked in `docs/legal-open-questions.md`.
6. Which clinic alert channels are required for launch (in-app, web push, email, SMS/Zalo), and what operational scheduler/realtime fallback will be available?
7. When a clinic accepts, what owner-facing details are needed immediately (clinic name/contact/directions), and should acceptance end dispatch instantly for all other clinics?
8. Confirm the clinic workspace constraint: keep Today desk layout and current SOS banner styling while replacing mock content and wiring actions.

## Files inspected

Owner: `app/[locale]/owner/[section]/page.tsx`, `components/owner/owner-home-view.tsx`, `components/owner/sos-guidance.tsx`.
Clinic: `app/[locale]/clinic/page.tsx`, `components/clinic/clinic-today-view.tsx`, `components/clinic/clinic-profile-setup-form.tsx`, `app/actions/clinic.ts`.
SOS/API/schema: `app/api/sos/route.ts`, `app/api/sos/[requestId]/route.ts`, `app/api/sos/[requestId]/accept/route.ts`, `app/api/sos/[requestId]/session/route.ts`, `supabase/migrations/202610160002_pawcare_domains.sql`.
Notifications/maps/support: `supabase/migrations/202610160006_notifications.sql`, `app/api/internal/notifications/process/route.ts`, `modules/notifications/{adapters,templates,policy}.ts`, `lib/supabase/client.ts`, `modules/clinics/maps-adapter.ts`, `components/maps/map-view.tsx`, `docs/data-model.md`, `docs/integrations.md`, `docs/metrics.md`, `docs/legal-open-questions.md`.


