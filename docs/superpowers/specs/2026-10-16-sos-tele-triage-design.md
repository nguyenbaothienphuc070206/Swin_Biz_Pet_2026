# 24/7 SOS and Tele-Triage design

## Intent

Route a pet owner in a stressful moment to an available veterinary clinic, with a calm and accessible intake flow and a clear handoff. This is the highest-stakes PawCare feature: it routes and summarizes information; it does not diagnose or replace a veterinarian.

## Goals

- Keep SOS reachable in at most two taps from every owner app screen.
- Owner intake supports pet selection, symptom chips (poisoning, breathing, bleeding, seizure, trauma, heatstroke, other), optional photo/voice note, location permission, and manual location fallback.
- A deterministic rules engine assigns preliminary Emergency/Urgent/Monitor urgency from a vet-reviewed versioned table. Seed only synthetic demo rules, visibly flagged and disabled outside demo/test.
- AI, if configured through the shared AI module, may only produce a factual intake summary for the vet. It cannot assign urgency, recommend treatment, or alter routing.
- Find active clinics within 5 km using PostGIS; notify in parallel through Realtime and push. First accept wins atomically.
- If nobody accepts within 90 seconds, expand the radius in configured steps, keep the owner informed, and show a 24/7 clinic fallback list plus a locally configured hotline.
- Owner sees clear searching, clinic accepted, ETA, on the way, and canceled states, and can cancel an active request.
- Start authenticated chat/video tele-triage through vendor adapters, with a development mock for video. Share a minimum, scoped pet record under an explicit, time-boxed grant.
- Vet uses a concise triage note template and records one recommendation: come now, book, or monitor.
- Every screen displays a localized plain-language disclaimer: triage and routing, not diagnosis.
- Clinic SOS inbox has accessible sound/vibration alerts and one-tap accept/decline, with fair load protection.
- Tests cover dispatch races, timeout/radius expansion, rules table behavior, offline owner flow, and a complete E2E path with a simulated clinic.

## Non-goals

- Diagnosis, prescriptions, medication/dose instructions, treatment plans, or AI-selected urgency.
- Guaranteeing that a clinic will respond, that the service is an emergency service, or that a response time is clinically safe.
- Recording video/audio sessions by default. If recording is proposed later, it requires separate consent, retention design, and legal review.
- Sending exact location to every nearby clinic before owner consent; location is used for routing and only disclosed to clinics that are pinged for the request.
- Charging for SOS dispatch or boosting clinic ranking based on payments.

## Current repository and constraints

- The current schema contains only basic profiles, clinics, pets, staff, and identity grants. SOS, triage, PostGIS, realtime publications, push, and medical record data have not yet been implemented.
- Follow the existing modular monolith: SOS owns request lifecycle/dispatch; triage owns session/chat/notes; clinics exposes eligibility and load state; notifications exposes a provider-independent push interface; passport exposes a scoped record share interface; AI (when present) exposes only the vetted summary capability.
- Apply RLS to every new table and authorize every mutation server-side. Dispatch acceptance is a database transaction/RPC with authenticated clinic membership checks, not a client-side check.
- Keep hotline, 24/7 clinic registry, radius steps, and language/configuration by region and effective date. Do not invent a hotline number or make a hotline available until verified and configured.
- Use fictional demo clinics, rules, people, and cases only in demo/test and flag every fixture as fictional. Do not enable demo urgency rules in production.
- Do not decide tele-veterinary legal requirements; add tele-triage, consent, and location-handling questions to `docs/legal-open-questions.md`.

## Owner flow

1. SOS is a persistent, thumb-reachable action in the owner shell; any owner screen is at most one tap from the intake start (two taps including confirmation/entry).
2. Start with pet selection and large symptom chips. Explain urgency labels as preliminary routing guidance. A static disclaimer is visible without scrolling.
3. Ask for location only when useful. Permission denial/unavailable location falls back to address/district entry or map pin. Show the location that will be used and ask confirmation before dispatch.
4. Optional photo or voice note can be attached; text entry is optional. Validate size/type/duration, upload privately, and show attachment removal. No camera/microphone permission is requested until the owner taps the corresponding control.
5. Run the vet-reviewed rules locally/server-side with identical versioned rule logic. The result is provisional and accompanied by the disclaimer. If no active production-reviewed rule matches, do not fabricate a level: show that automated routing guidance is unavailable and present the verified emergency clinic/hotline fallback.
6. Before creating the SOS, show selected pet, symptoms, location, urgency, and what information clinic recipients will see. Owner explicitly consents to the bounded location and passport share. Dispatch can still proceed with minimal intake if passport sharing is declined.
7. Show searching state and clinic pings; use progressive live updates. At 90 seconds without accept, expand according to the configured radius schedule and expose the regional verified 24/7 fallback list/hotline.
8. On accept, show clinic name/verified status, accepting staff, expected ETA only when clinic supplies it, and a clear “on the way” status only when explicitly marked. Never infer an ETA.
9. Owner can cancel while searching or after acceptance; cancellation records reason/status and notifies clinics/session participants. Explain whether an accepted clinic should still be contacted directly.
10. Once a clinic accepts, offer authenticated chat/video. Pre-share only owner-selected and configured record categories, for the SOS session's short expiry. Grant is revocable and is closed when the session ends or expires.

## Rules engine and clinical safety

- Store rules in a versioned table with trigger symptom(s), red-flag conditions, urgency, plain-language owner text, clinical rationale/reference supplied by reviewer, reviewer identity/qualification, approved-at, active-from/to, and `is_demo`/enabled flags.
- Rule evaluation is deterministic, ordered, and explainable: match criteria and rule ids are recorded; no model output affects matches or urgency. Conflicting matches resolve to the higher urgency, with the exact precedence documented and tested.
- Only a qualified vet-reviewed and approved non-demo ruleset may be enabled for production. Demo seed cases are synthetic, disabled in production, and carry a visible “demo only / not medical guidance” label. Do not invent real clinical triggers or advice.
- Missing, stale, invalid, or unavailable production rules do not silently downgrade urgency. Show “unable to assess” and route to verified emergency resources; keep clinic search available.
- AI summary is optional and can be missing. It only condenses owner statements into a source-grounded factual summary; symptom chips, coordinates, timestamps, and owner text remain explicit source data. Vet can inspect the original intake.
- Vet recommendation is recorded as structured option (`come_now`, `book`, `monitor`) plus explanatory note and author/time. The note is not auto-executed into a booking or treatment.

## Dispatch lifecycle and race safety

Suggested states: `draft -> searching -> accepted -> in_progress -> completed`, with terminal `canceled`, `expired`, and `unmatched`. Persist every transition with actor, timestamp, and reason.

1. Create an idempotent SOS request and location snapshot only after owner confirms dispatch.
2. Query eligible open/active, verified clinics within the configured initial 5 km PostGIS radius. Eligibility checks clinic SOS opt-in, operating/on-call status, load, region, and current availability.
3. Create unique dispatch rows for recipients and emit Realtime and push through an outbox. A clinic can accept only its own pending dispatch and only if it is still below load limit.
4. First accept wins with a single transaction/row lock or conditional update of the parent SOS state from `searching` to `accepted`. All later accepts return `already_claimed` and cannot view or join the session.
5. At 90 seconds, an idempotent scheduled job expands radius to the next configured step (proposed default schedule: 5 km, then 10 km, then 20 km at subsequent 90-second windows), unless canceled/accepted/expired. Respect configured maximum radius and preserve dispatch history.
6. If no clinic accepts at max radius, transition to `unmatched`, show nearby verified 24/7 listings and the verified regional hotline configuration, and leave owner options clear.
7. Cancel/timeout jobs are idempotent and transactionally compete with acceptance. Exactly one terminal/accepted transition wins; no zombie clinic session can be opened after cancellation.

## Clinic experience and load protection

- Inbox card displays urgency, distance band, symptom chips, pet identity, time elapsed, and only the intake fields consented to share. Avoid loud flashing visuals.
- Sound/vibration are user-configurable and require the browser/device capability; a persistent visual state remains the accessible fallback.
- Accept/decline is one tap and keyboard accessible. Accept requires explicit acknowledgment that the clinic can take the case. Decline may use a simple reason and never penalizes staff automatically.
- Load protection uses clinic-configured max concurrent SOS cases and active staff/on-call capacity. At capacity, exclude the clinic from new fan-out and keep existing cases visible. Use a cooldown/backoff when delivery fails.
- The owner sees clinic identity and status; the clinic cannot see unrelated owner profile/medical data.

## Tele-triage and privacy

- `VideoAdapter` exposes create/join/end session and health status. Development/demo uses a deterministic mock transport. No production video vendor is selected in this design; vendor choice requires owner approval, official documentation review, and a follow-up integration note.
- Chat messages and triage notes are scoped to participants and the session, with retention and audit metadata. No audio/video recording by default.
- Passport grant is session-specific, category-scoped, limited to the accepting clinic, and expires at session end or configured short TTL. Declining passport access does not block dispatch or tele-triage.
- Precise coordinates are visible only to dispatch recipients and accepted clinic as necessary, not directory users. Encrypt/limit retention and remove exact location according to a counsel-reviewed retention policy; keep non-identifying aggregate dispatch metrics separately.
- Rate limits are enforced per user, device/session, and network risk signals. False-alarm indicators create reviewable internal flags, not automatic public shaming or denial of emergency access. Abuse controls must not block a credible emergency without a safe fallback.
- Add legal open questions for SOS location consent/retention, clinic push contact, false-alarm flags, hotline representation, tele-triage scope, and session data retention.

## UX and accessibility

- Calm high-contrast screen with large targets, minimal typing, clear state progression, persistent disclaimer, and no decorative animation during SOS.
- Vietnamese-first copy, English support, clear emergency terminology, screen-reader status announcements, keyboard and switch access, reduced motion, and non-color status cues.
- Every state has network failure handling. If offline before dispatch, preserve a local draft, explain that no clinic has been contacted, and offer direct call/manual emergency resources. Do not display “searching” until server confirms request creation.
- If connection drops after creation, show last confirmed server state with a stale/offline label and automatically resume realtime subscription; never imply an accept that was not confirmed.

## Tests and acceptance criteria

- SQL/RPC race test launches concurrent accepts and asserts one clinic wins; concurrent cancel/accept and duplicate request retry are also deterministic.
- Scheduler tests cover 90-second timeout, each radius expansion, canceled/accepted no-op, max-radius unmatched, duplicate job delivery, and fallback configuration.
- Rules table tests cover all symptom categories, higher-urgency conflict precedence, unknown input, stale/missing rules, demo rows excluded in production, and vet-review activation requirements.
- Owner offline tests prove unsent draft is labeled unsubmitted, comes back online idempotently, and never shows a false searching/accepted state.
- E2E uses a simulated clinic account: owner creates SOS, clinic receives and accepts, owner sees acceptance, session joins, vet records recommendation, and owner sees completion. Include decline, timeout, cancel, and reconnect paths.
- RLS tests cover owner request ownership, dispatch recipient visibility, clinic membership, accepted-session access, passport scope, and access/logging boundaries.
- CI/deployment checks prevent production operation without a vetted active ruleset and a verified regional fallback resource configuration.
- Accessibility tests include keyboard path, screen-reader live state, reduced motion, and axe; manual device pass verifies thumb reach and alert behavior.

## Proposed defaults to review

- Regional hotline and 24/7 fallback data are configured per city/province, not hard-coded globally; region comes from confirmed location and can be manually changed.
- Radius schedule is 5 km initially, 10 km after the first 90-second timeout, then 20 km after each further 90 seconds, with regional maximum configurable.
- SOS owner flow is available from owner app screens; unauthenticated users receive emergency resources and sign-in may not block viewing verified contact resources, but creating a dispatch requires an account to limit abuse and preserve response continuity.
- Production urgency requires a vet-reviewed active ruleset. Without one, the feature routes to verified emergency resources but does not assign a fake urgency level.
- Video provider is intentionally undecided; mock-only development mode is supported until selected and approved.

## Builder check

Self-review: the design covers the owner, dispatch, clinic, and tele-triage flows and the requested tests. AI is outside the urgency path. Accept/cancel/timeout races resolve in the database. Offline UI never claims a request was dispatched when it was not. Demo clinical rules cannot run in production. The missing real vet-approved rules and production video provider are explicitly deployment gates.
