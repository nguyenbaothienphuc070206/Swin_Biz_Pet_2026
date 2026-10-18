# PawCare test strategy

## Test layers and merge gates

| Layer | What it proves | Command / CI gate |
| --- | --- | --- |
| Pure logic | Ranking weights and Bayesian confidence; opening hours, holidays, shifts, buffers and slot capacity; SOS urgency/radius/first-accept rules; care-plan baseline selection; recommendation safety and explanations | `npm run test:unit` (V8 coverage thresholds below) |
| Adapter contracts | Common request/response behavior and error handling for OpenAI/Anthropic, sandbox payments, maps provider selection, email/web-push/in-app/SMS-Zalo notification adapters | `npm run test:unit`; deterministic fetch stubs only, no vendor calls |
| Database integration | RLS visibility and write rules, append-only audit ledger, eligibility constraints, grants, concurrency RPC invariants | `supabase test db` on every PR; `npm run security:rls` is a separate CI completeness gate |
| Server/API integration | Zod rejection, auth/role enforcement, status codes, idempotency and side effects for route handlers and server actions | Playwright API requests against the local Supabase stack and authenticated fixtures; never mock the authorization boundary |
| E2E | Mobile owner and clinic journeys: onboarding, passport grant/revoke, booking/cancel, SOS to clinic accept/session, care-plan draft/approval, rescue report, sandbox subscription checkout; role isolation | `npm run test:e2e` with the dedicated E2E environment described below |
| Accessibility | Axe WCAG 2.1 A/AA for public routes, the design system, and authenticated owner/clinic/admin pages; keyboard and 360 px layout checks | `npm run a11y` |
| Visual regression | Mobile screenshots of landing, directory and sign-in, with animation and caret disabled | `npm run test:visual`; reviewed baselines in `tests/visual-regression.spec.ts-snapshots/` |
| Load and race | SOS request fan-out under parallel owner requests; a same-slot booking race has exactly one winner | `npm run load:sos-booking` against local or dedicated staging only; booking RPC concurrency assertion also belongs in pgTAP |

## Critical-module coverage

Coverage is intentionally limited to business-critical pure modules, rather than imposing a misleading repository-wide percentage. `vitest.config.ts` gates each of clinic ranking, booking availability, SOS rules, care-plan rules, and product recommendations at **80% lines, functions, statements and branches**. Add cases to these module suites when behavior changes. The threshold can rise when the modules have stable coverage; it must not be lowered to make a failing change pass.

## Database and RLS gate

`supabase test db` executes pgTAP tests against the Supabase CI database. Current pgTAP coverage includes RLS/policy structure, append-only audit trigger, review-eligibility trigger, and atomic booking/SOS RPC presence. `security:rls` independently fails when any public table has RLS disabled or lacks a policy. This is the structural CI gate; it does not yet replace behavioral multi-user RLS fixtures. The configured `data-authorization.spec.ts` exercises owner, other-owner, clinic and admin visibility through Supabase Auth and must run with the isolated E2E accounts. Do not replace these checks with mocked Supabase clients.

## Adapter contract rules

Every adapter contract test exercises the same observable contract with deterministic fixtures: valid input, invalid response, provider failure, timeout/cancellation where supported, idempotency where supported, and safe mock/fallback behavior. No contract suite calls a live vendor. Current code has contracts for AI providers, sandbox payments, maps selection, and notification transports. A production video adapter is not present yet; when added, define its interface and contract suite before wiring it to triage. Do not claim video provider coverage until that exists.

## E2E environment and fixture discipline

The full E2E suite requires a disposable Supabase project/database, confirmed accounts for owner, second owner, clinic staff, clinic admin and platform admin, plus pet, clinic, completed appointment, open SOS, available slot and community-match fixtures. Set the `E2E_*` credentials/IDs and `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the isolated E2E environment. Fixtures must be reset before each run, carry `is_fictional = true`, and use no real people or clinic information. Never point write flows at production. Missing variables fail the test with setup guidance; tests must not be skipped or marked fixme. Authenticated flows assert both the visible result and persisted API/database state.

The browser suite uses a 390 × 844 mobile viewport for owner journeys, and tablet/desktop only for clinic/admin workflows. For SOS, the fixture clinic accepts the request through the same API path; the test asserts request, dispatch, atomic accept and triage session. For passport sharing, assert the clinic can read only granted scopes and immediately loses access after revocation. For booking race coverage, submit concurrent distinct idempotency keys for the same single-capacity slot and assert one successful reservation. Subscription checkout uses only the local sandbox adapter and replays the webhook to assert idempotency.

## Accessibility and visual policy

The axe page inventory is explicit in `tests/a11y-key-pages.spec.ts`; authenticated role pages must be included after the fixture login helper succeeds. Fix violations at source, do not mute a rule globally. Dialog/sheet tests check the open state and Escape behavior. Screenshots run in Chromium at a fixed mobile viewport with motion disabled; CI uses Windows to match the checked-in baselines. Update a baseline only after reviewing the rendered difference and confirming it is intentional. Do not mask meaningful UI content to hide regressions.

## Load-test safety and operation

`scripts/load-sos-booking.mjs` uses Node's built-in fetch so the test adds no load framework dependency. It sends parallel requests to `/api/sos` and `/api/appointments`, reports p50/p95 and status counts, and asserts one winner for a shared booking slot. Configure `PAWCARE_LOAD_BASE_URL`, a dedicated test-user `PAWCARE_LOAD_COOKIE`, `PAWCARE_LOAD_SOS_BODY`, and `PAWCARE_LOAD_BOOKING_BODY`; tune concurrency with `PAWCARE_LOAD_CONCURRENCY` (default 20, maximum 100). Loopback targets require `PAWCARE_LOAD_ENV=local`; remote targets require `PAWCARE_LOAD_ENV=staging` and `PAWCARE_LOAD_ALLOW_REMOTE=1`. Production is rejected. Use a fresh slot and disposable pet per run. SOS requests are real writes and should only run against the isolated test environment.

## Flake policy

No skipped tests, `fixme`, conditional test registration, or blanket retries. Use locator-based waits and assertions on observable state instead of sleeps. Every failure must be reproduced locally or in the same CI image, then fixed at its source. Retries may be used temporarily for diagnosis but are not a passing gate and must be removed in the fix. Keep traces/screenshots on failure and report deterministic reproduction steps.

## Current limitations to close

- `demo-core-flows.spec.ts` runs passport sharing/revocation, booking/cancel, simulated SOS accept, and care-plan approval in the clearly fictional interactive demo. It validates mobile interactions, not persisted server behavior.
- The authenticated Playwright suite currently covers sign-in/sign-up, role route isolation, Supabase data authorization, and lost-pet report-to-resolution. It does not yet have persisted E2E cases for first-pet onboarding, passport scope grant/revoke, booking cancellation, live SOS dispatch/session, vet care-plan approval, rescue receipt verification, or sandbox subscription purchase. These require disposable fixtures and should be added before claiming those journeys are E2E-covered.
- E2E test credentials and a disposable Supabase fixture project are environment configuration, not repository secrets; run `npm run test:e2e` only in that isolated fixture environment. Missing configuration throws; tests are never skipped.
- Axe currently covers all public routes in `a11y-key-pages.spec.ts` and the design system in light/dark, 360 px, dialog and sheet states. Owner, clinic and admin authenticated page inventory still needs to be added to the configured fixture job.
- The repository does not yet include a video vendor adapter. The triage contract remains an explicit gap.
- pgTAP currently checks the presence of atomic RPCs and key triggers; it does not yet race concurrent transactions against `book_slot` or `accept_sos`. The local load script makes that operational check possible only with a disposable authenticated database. The in-memory capacity unit test is not a substitute.
