# Progress

## 2026-10-18 — Scenario-based demo and pilot KPI page

- Added five one-click, deterministic guided demo scenarios for emergency passport transfer, 11 p.m. SOS/5 km dispatch and mock triage, vaccine catalog entry and clinic performance, vet approval of a mock AI care plan, and a verified rescue ledger.
- Added reset for all scenario and interaction state. Demo location, clinic map, clinic acceptance, triage, AI draft, vaccine catalog, reminders and rescue ledger use local mock adapters/fixtures; removed the demo's browser GPS, camera access and external map-tile path.
- Added `/[locale]/pilot-kpis`, a read-only page of planned definitions with no live metrics or invented results, plus the 5-minute live walkthrough and 10-minute video pitch in `docs/demo-script.md`.
- Strict typecheck passes; both locale JSON files parse with matching demo key counts. E2E, accessibility and live integration behavior were not run/claimed; the scenarios deliberately use mock/local state.

## 2026-10-18 — OWASP and privacy hardening pass

- Added a nonce-based CSP, standard security headers and same-origin checks for mutating API routes; retained Next.js Server Action origin checks. Central role guards require AAL2 for clinic/platform administrators.
- Added pure security checks for request origins, CSP, upload file signatures/size, outbound affiliate destinations, private signed-link expiry, admin MFA assurance and AI-log PII redaction.
- Added Supabase migration controls for private file scan state, community approval gating, explicit policies on internal queues and deny-by-default policy coverage. Added pgTAP checks and CI commands for RLS, dependency audit and CycloneDX SBOM generation.
- Expanded authenticated account export across the primary data domains. Updated `docs/legal-open-questions.md` with retention/deletion, processors, malware scanning and analytics questions. Added STRIDE model, data minimization review and rollout risks to `docs/security.md`.
- `npm run typecheck`, `npm run test:unit` (14 files, 46 tests), `npm run build`, `npm run security:deps` (0 vulnerabilities) and `npm run security:sbom` passed. `npm run security:rls` could not run because Supabase CLI is unavailable locally, so pgTAP/migration behavior remains unverified here.
- Residual: deletion remains a recorded request pending legally approved retention policy; malware scanner is an integration hook without a connected scanning engine; export currently applies per-query limits; route-by-route IDOR testing and shared sensitive-route rate limits remain follow-up gates.

## 2026-10-16 — PawCare design system

- Established the Botanical clinic visual direction and semantic light/dark token set.
- Scaffolded the Next.js App Router base because the workspace contained only `AGENTS.md`.
- Completed the reusable component library and development-only `/design-system` showcase.
- Added axe scans for light/dark themes, 360px layout, and open dialog/sheet states; all pass.
- Verified documented WCAG contrast pairs with `npm run contrast`.
- `npm run typecheck` and `npm run build` pass.

## 2026-10-16 — App shell and identity

- Added Vietnamese-first `/vi` and English `/en` routes, locale switcher, localized date/VND/unit formatters, public marketing page, and metadata/Organization structured data.
- Added owner mobile shell, clinic desktop workspace, platform admin shell, Supabase email/Google auth, callback/session refresh, and role guards in Next.js 16 `proxy.ts` plus server layouts/actions.
- Added first-pet progressive onboarding, clinic verification requests with private Storage uploads, account preferences, consent/access-grant listing, data export, and an account-deletion request.
- Added the identity-slice SQL migration with profiles, trusted role provisioning, pets, clinic membership, access grants, verification requests, consent/privacy requests, private document bucket policies, and RLS.
- Added route-role and data-scope E2E specs. `npm run build` and `npm run typecheck` pass. Playwright: 4 passed, 8 skipped because Supabase test account/data environment is not configured.
- `docs/integrations.md` records verified Supabase and next-intl integration behavior. `docs/legal-open-questions.md` lists decisions that need counsel.
- Remaining integration setup: add Supabase project URL/publishable key to runtime env, apply the migration, provision clinic/admin roles through trusted administration, and provide role test accounts plus pet fixture IDs to run the skipped assertions.

## 2026-10-16 — SOS and Tele-Triage design

- Drafted `docs/superpowers/specs/2026-10-16-sos-tele-triage-design.md` covering owner intake, vet-reviewed rules, PostGIS dispatch, accept/timeout races, clinic inbox, session-scoped passport sharing, mock video adapter, privacy, offline states, and tests.
- Added counsel questions for location, emergency routing, tele-triage, false-alarm controls, and session data to `docs/legal-open-questions.md`.
- Implementation is pending owner approval of the design. Production requires a vet-reviewed active ruleset and verified regional fallback resources; the video provider remains undecided.

## 2026-10-16 — Clinic workspace design

- Drafted `docs/superpowers/specs/2026-10-16-clinic-workspace-design.md` with Today, patient search, Passport reuse, schedule/team/services/reviews, metric definitions, consent-aware reminders, and commission ledger/invoice behavior.
- Added counsel questions for commission statements, reminder campaigns, clinic role data access, and exports to `docs/legal-open-questions.md`.
- Implementation is pending owner approval. Workspace data sources are not yet present in the database; fee terms, reminder permissions, and financial document classification must be configured/reviewed before production use.

## 2026-10-16 — Personalized Care Plans design

- Drafted `docs/superpowers/specs/2026-10-16-personalized-care-plans-design.md` with deterministic vet-reviewed rules, bounded AI drafting, vet approval/versioning, owner tasks/reminders, re-plan triggers, and evaluation requirements.
- Added counsel questions for Vet-verified plan labeling, approval records, completion reminders, and versioned AI drafts to `docs/legal-open-questions.md`.
- Implementation is pending owner approval. Production plans require supplied vet-reviewed rule tables; no clinical thresholds or schedules were invented.

## 2026-10-16 — Targeted recommendations and affiliate design

- Drafted `docs/superpowers/specs/2026-10-16-targeted-recommendations-affiliate-design.md` for structured product safety filters, relevance and “Why this” explanations, sponsored inventory, affiliate sandbox attribution, and transparent spa/shop placements.
- Added counsel questions for affiliate disclosures/attribution, product-suitability claims, sponsored placement, and directory transparency to `docs/legal-open-questions.md`.
- Implementation is pending owner approval. Product safety metadata and partner terms are not yet present; demo catalog is fictional and cannot provide production medical guidance or payouts.

## 2026-10-16 — Domain implementation (first executable slice)

- Added `202610160002_pawcare_domains.sql`: PostGIS, scoped pet grants, append-only medical records/audit/ledger, clinic directory and slot tables, review eligibility constraints, SOS and triage tables, care plan rules/versions, AI usage accounting, commerce/affiliate tables, RLS, GIST indexes, and transactional RPCs for booking, SOS acceptance/dispatch creation, and vaccine entry.
- Added a fictional local `supabase/seed.sql` with 3 fictional owner accounts, 25 clinics across three HCMC districts, 60 pets, hours, services, appointments, reviews, and community posts. Seed-created domain rows carry `is_demo`; Auth fixture users carry a `pawcare_demo` metadata marker. Supabase local reset/test has not been run in this workspace.
- Implemented shared domain logic and Vitest coverage for scoped passport grants, clinic ranking, availability, SOS urgency/race, product safety and explanations, AI output filtering, care-plan baseline rules, and invoice math.
- Added a server-only AI gateway with OpenAI and Anthropic structured-output adapters, deterministic mock, budget reservation, retry/timeout/circuit breaker, redacted run logging, versioned prompt files, and 120 golden cases (40 each for care-plan drafting, SOS summaries, and record explanations).
- Added the fictional demo route with interactive passport/barcode and PDF, SOS intake simulation, clinic map/directory/booking, care plan approval simulation, safe product recommendations/affiliate disclosure, and clinic dashboard/CSV/invoice. Added server endpoints for authenticated booking, SOS request creation, clinic vaccine entry, passport PDF, and demo invoice/affiliate navigation.
- `npm run typecheck`, 12 unit tests, 120 mock AI evals, and `npm run build` pass. The SQL pgTAP file is structural and still needs execution with Supabase CLI.

### Integration work still required before live rollout

- This environment has no Supabase credentials or local CLI; migrations, RLS behavior, PostGIS queries, and seeded database have not been executed. Provision a project and run `supabase db reset`/`supabase test db` before enabling live routes.
- SOS initial dispatch and single-winner acceptance are implemented in database RPCs, but Realtime/push fan-out, the 90-second radius-expansion scheduler, clinic SOS inbox, video provider, and offline outbox synchronization are not connected to live clients/jobs yet.
- Directory/booking database primitives and authenticated booking endpoint exist; public live directory filters, schedule generation, cancellation/reschedule policy, .ics export, clinic confirmation/no-show workflow, and full E2E concurrency tests remain to be wired.
- Live clinic workspace, care-plan review/approval APIs, signed consent QR links/revocation workflow, document compression/upload, real affiliate click attribution, scheduled reminders, invoice persistence, and multi-owner invitations remain incomplete. Current broad feature walkthrough is explicitly fictional demo UI.
- AI adapters require provider secrets and provider-backed CI evaluation. Provider evals have not been run; only the deterministic mock golden set was evaluated. Rules and health content remain demo-only until reviewed and supplied by licensed veterinary professionals.
- Follow-up hardening: added authenticated safety-filtered recommendations, affiliate click logging with HTTPS/HTTP destination validation, SOS owner cancellation and clinic acceptance endpoints, tighter clinic-admin scheduling/service RLS, vet-only care-plan review writes, scoped SOS owner inserts, and generic `updated_at` triggers.
- Axe initially found the root layout lacked a document title; added global metadata. `npm run a11y` now passes all 3 scans (light/dark, 360px, open dialog/sheet).
- Added vet-reviewed contraindication rule storage plus a deterministic scope matcher; the rule seed is demo-only and a new unit case checks production exclusion.
- Final verification after these changes: typecheck/build pass; 13 unit tests pass; all 120 mock AI eval cases pass; all 3 Axe scans pass.

## 2026-10-16 — Community and Rescue implementation

- Added `202610160003_community_rescue.sql` and privacy hardening migration `202610160004_community_privacy_hardening.sql`: owner-private exact locations, 50m public location snapping, PostGIS map/match RPCs, stray count suppression below three reports, rate-limited submissions, moderation reports/appeals, partner verification, vet estimates, and a direct-payment receipt ledger with append-only events.
- Added owner UI/API for lost/found reports, stray sightings, photos, public maps, match suggestions and owner-confirmed resolution, community posts/comments, partner applications, rescue case submissions, direct-payment receipt evidence, and public verified totals. Added clinic estimate/verification workspace and platform-admin moderation/appeals/partner queue.
- Community images stay in private Storage until a moderator approves both content and image safety; approved public images are shared only through short-lived signed URLs. Donation and estimate documents remain private. Exact coordinates are never returned by public map RPCs.
- Added unit coverage for location fuzzing, matching, ledger validation and moderation appeal behavior; added structural pgTAP assertions and a configured-fixture Playwright lost-report-to-resolution test.
- Verification still required in a Supabase environment: this workspace has no Supabase CLI/project credentials, so migration execution, RLS/pgTAP and the database-backed E2E flow were not run here. Image safety is human moderator review; no automated image-classification provider was added. Public direct payment currently shows the verified recipient name and requires donor receipt evidence, but does not expose payment account details.

## 2026-10-16 — Billing sandbox and entitlements

- Researched official payOS, VNPAY, and MoMo pages and recorded fees, limit visibility, signature/webhook details, and sandbox availability in `docs/integrations.md` before implementation. payOS has no separate sandbox; only a local deterministic adapter is enabled in this task.
- Added owner billing schema/RLS, unique payment references and idempotency keys, webhook event ledger, transactional locked event RPC, sandbox receipts, and a backoff reconciliation endpoint. `SUPABASE_SERVICE_ROLE_KEY` is server-only; webhooks never trust client-provided plan changes.
- Added the central entitlement matrix and access function. Every plan retains basic SOS and clinic dispatch; Plus unlocks care plans/extended passport, Premium adds priority video features. Cancellation preserves access until period end; failed payment receives a three-day grace window.
- Added localized owner subscription/checkout UI, explicitly fictional sandbox prices, clinic commission ledger view and sandbox statement PDF. Billing receipts/statements disclaim tax-invoice status pending counsel review.
- Risks: commercial plan prices and payment/legal obligations need product/counsel review; automated recurring charges are not enabled and renewal is a new sandbox checkout. Migrations need Supabase CLI/project execution. Reconciliation needs a scheduled caller configured with `BILLING_JOB_TOKEN`.
- Verification: entitlement, proration, cancellation, signature, replay, duplicate, and failed-payment unit tests pass (28 total); typecheck and production build pass. The build required the previously approved elevated run because the default SWC cache path was inaccessible.

## 2026-10-16 — Notifications and platform admin console

- Added a private, RLS-enabled Postgres notification job queue, event triggers for appointment/vaccine/care-plan/review/SOS events, dedupe keys, retry backoff and recovery of jobs left processing for over five minutes. SOS notifications bypass quiet hours only; preferences and unsubscribe suppression still apply.
- Added Vietnamese and English templates, preference and quiet-hours settings, delivery history, Web Push subscription controls, Resend email adapter with signed one-click unsubscribe, and a non-sending SMS/Zalo stub. Without provider credentials, configured transports use deterministic mock behavior.
- Added the platform admin console: metrics and AI monitoring, verification checklist and document review, user/clinic/review management, feature flags, moderation/appeals/rescue partner queue, audit filters, AAL2 enrollment/step-up, server checks and database-side AAL2 guards. Admin decisions and sensitive views are audited; decision reasons are retained for verification, moderation and suspension actions.
- Added notification policy tests and admin authorization tests; added pgTAP structural checks for RLS, queue privileges, event hooks, audit triggers and AAL2 enforcement.
- Verification: `npm.cmd run typecheck`, `npm.cmd run test:unit` (7 files, 35 tests), `npm.cmd run test:ai-evals` (120/120 mock cases) and `npm.cmd run build` passed. Supabase CLI is unavailable in this workspace, so migrations and pgTAP have not been executed against a database.
- Remaining rollout requirements: configure Resend/VAPID secrets and verified sender/domain, establish a scheduled caller for the notification worker, configure Supabase MFA and run migrations/pgTAP in the project. Zalo/SMS remains disabled pending credentials and confirmed provider requirements.

## 2026-10-18 — Performance, PWA and public SEO

- Added mobile performance budgets to CI using production Chromium, a 390×844 viewport, 4× CPU throttle and simulated slow 4G. Five public routes measured LCP 936–1,348 ms, observed Event Timing proxy 0–96 ms, CLS 0–0.002 and initial JS 152–153 KB; all pass the 2.5 s / 200 ms / 0.1 and route JS gates.
- Added an installable PWA manifest/icons, precached offline shell, network-first navigation fallback, explicit owner passport snapshot to IndexedDB with sign-out clearing, and a clinic offline vaccine outbox with idempotency and visible conflict states. Automated smoke check verifies manifest and cached shell. End-to-end real offline navigation remains unverified because Chromium's offline emulation did not consistently force service-worker navigation fetch failure.
- Added route-level splitting for demo/scanner/map, compressed community uploads, lazy-loaded feed images, dynamic sitemap, canonical/alternate locale metadata and verified-clinic LocalBusiness/VeterinaryCare structured data.
- Reviewed 10 hot query shapes, added targeted PostGIS/owner/clinic/health/task indexes, and configured CI to save `EXPLAIN (ANALYZE, BUFFERS)` plans as an artifact. The local workspace has no Supabase CLI/database, so plans and migrations were not executed here.
- Raw final build chunks: 2,980,691 bytes (JS 2,844,867; CSS 135,824), compared with 2,950,144 bytes before this pass. Initial route transfer sizes are separately budgeted and pass; total build artifacts increased slightly as the PWA shell and routes were added.
- Verification: production build, unit tests (15 files / 48 cases), typecheck and mobile budget gate passed. Database EXPLAIN/pgTAP and a true offline browser navigation still need a configured Supabase environment and reliable offline-browser harness respectively.

## 2026-10-18 — Observability and privacy-safe analytics

- Added server-generated `x-request-id` propagation, JSON structured logs and Next.js `onRequestError` capture. Error messages, payloads, identity values and health content are excluded from the emitted log fields.
- Traced SOS request creation, dispatch ping count, atomic accept and clinic session start with a stable opaque trace ID, stage timing and bounded error codes. Added an idempotent, accepted-clinic-only `create_triage_session` RPC and `POST /api/sos/[requestId]/session` with a 30-minute session expiry.
- Added p95 time-to-first-ping, terminal/no-ping dispatch failure and AI fallback/error alert rules, with minimum sample thresholds. `/api/observability/alerts` is protected by a bearer job secret and server-only Supabase service role. GitHub Actions runs health and alert checks every five minutes when deployment URL/secrets are configured; workflow failure is the notification signal.
- Added internal platform-admin observability dashboard with SOS/AI alert status and aggregate owner activation, booking, SOS, retention and clinic activation funnels. Definitions and privacy constraints are documented in `docs/metrics.md`. Added `is_demo` to AI run records and exclude deterministic mock/test runs from production error-rate reporting.
- Verification: typecheck passed; unit tests pass (16 files / 51 tests); production build passed. Supabase migration/pgTAP and live uptime/alert execution require a configured project, `SUPABASE_SERVICE_ROLE_KEY`, `OBSERVABILITY_JOB_TOKEN`, `PAWCARE_UPTIME_URL`, and workflow notifications.

## 2026-10-18 — Test strategy and quality gates

- Added `docs/testing.md` with the layered test matrix, critical-only coverage thresholds, pgTAP/RLS CI gate, adapter contract rules, authenticated fixture requirements, E2E/axe/visual/load policies, and known journey gaps.
- Split focused unit suites for clinic ranking, booking availability, care-plan rules and product recommendation safety. Added deterministic contract tests for OpenAI/Anthropic response normalization, sandbox payments (existing suite), map provider selection, and notification adapters. V8 coverage gates the five critical pure modules at 80% lines/functions/statements and 75% branches.
- Removed all Playwright skip conditions; missing auth/test fixtures now fail with setup information. Added API schema/health integration checks and a 390 × 844 demo E2E covering share/revoke, booking/cancel, simulated SOS accept and care-plan approval.
- Added axe checks for eight public routes and fixed the design-system test route being redirected into a localized 404. Caught and fixed an unhandled Background Sync promise rejection. Added stable mobile screenshot baselines for landing, directory and sign-in.
- CI now runs API contracts, demo E2E, axe and visual snapshots; unit coverage, pgTAP, and the RLS completeness script remain merge gates. Added an isolated, opt-in Node load driver for SOS request fan-out and same-slot booking races.
- Verification: unit tests 23 files / 71 tests pass; the five critical modules each clear the 80% per-module line/function/statement/branch gates (aggregate coverage: 98.38% lines, 98.11% statements, 95% functions and 90.90% branches). API contracts 2/2, demo mobile E2E 1/1, axe 11/11 and visual regression 3/3 pass. Typecheck passes. `test:e2e` and load tests were not run because this workspace lacks the required disposable Supabase identities/fixtures. Supabase CLI/RLS execution also remains unavailable here.
- Remaining testing gaps are documented explicitly: persisted E2E for onboarding, real passport grants, booking cancellation, live SOS/session, care-plan approval, rescue receipt and sandbox purchase; authenticated-role axe inventory; behavioral multi-user pgTAP and true concurrent database races. The video adapter has no contract yet because no video adapter exists.
# 2026-10-18 — CI/CD, deployment safety and incident operations

- Added ESLint and Lighthouse CI to the pull request workflow alongside the existing typecheck, unit/integration, pgTAP/RLS, E2E, axe, performance, dependency and SBOM checks. Added Gitleaks, CodeQL and Dependabot. ESLint's existing legacy-warning baseline is capped; dependency audit gates production packages because npm currently has no patched release for the high severity `braces` advisory inherited from the development-only Next ESLint plugin.
- Added same-repository PR preview deployment followed by mobile demo E2E, plus staging and protected production deployment workflows. Supabase migrations are dry-run then forward-applied without seed; production requires GitHub Environment approval and a confirmed backup setting.
- Added production boot environment validation, an allowlisted fail-closed server feature-flag interface for SOS, billing and rescue fundraising, and a guarded non-production seed script.
- Added `docs/deployment.md` with branch/environment configuration, migration rollback plan, seed policy and rollout gates; added `docs/runbook.md` for SOS, AI, payment and data-leak incidents.
- Verification: `npm run lint` passes with 0 errors (41 pre-existing warnings at the configured cap); `npm run typecheck` passes; unit tests pass (24 files / 73 cases); all 120 mock AI golden cases pass; production dependency audit reports 0 vulnerabilities; `npm run build` passes. The seed script was checked with `PAWCARE_DEPLOY_ENV=production` and refused the operation. Supabase migrations/pgTAP, Lighthouse GitHub Action, preview deploy/E2E and hosted environment approvals cannot be executed locally without the CLI and GitHub/Vercel/Supabase credentials. The local `perf:budget` launch was blocked by this Windows runner's missing SWC native addon and restricted cache ACL, before any page measurement.
- Deployment remains gated on repository setup: configure GitHub Environments/secrets and branch rulesets, create the Vercel `staging` custom environment (or a separate staging project), and add Supabase staging/production project refs and database credentials. Production releases require a confirmed backup and protected environment approval.

# 2026-10-18 — UX audit and mobile walkthrough

- Walked the first-time owner, SOS owner, vet, clinic-admin, and moderator journeys at 360 × 800 with reduced motion. Saved before/after screenshots under `docs/ux-audit/` and documented Nielsen heuristic findings, exact coverage, and access limits in `docs/ux-audit/report.md`.
- Removed the sticky demo section navigation on mobile, clarified SOS prerequisites and state feedback, added a first-vaccination success confirmation, localized the visible demo health labels and missing clinic-results state, and reviewed the clinic workspace's mobile schedule hierarchy.
- Added moderation queue skeleton, empty and retry/error presentation with thumb-friendly targets. Added translated loading microcopy in lazy demo states and kept the success motion disabled for reduced-motion users.
- Verified translation JSON validity/unique keys and checked changed UI files for common mojibake markers. Contrast checks pass for light and dark tokens. Final axe suite passed 11/11; mobile demo flow passed 1/1; typecheck passed.
- Remaining limitation: no authenticated role fixtures were available, so protected clinic and moderator pages were only verified at the sign-in gate; the role walkthrough uses the fictional demo where available.

## 2026-10-18 — Independent release audit

- Audited the available product/design specs, security controls, RLS and authorization setup, AI safeguards, a11y, i18n, performance gates, docs, source markers, dependency audit and lockfile license metadata. The requested consolidated `docs/spec.md` is absent; detailed module specs are present under `docs/superpowers/specs/`.
- Fixed unused design-system imports and an unused MFA helper import in `proxy.ts`; `npm run lint` remains within its configured warning cap. No TODO/FIXME/XXX/shortcut markers were found in inspected source or docs paths.
- Verified: unit 24 files / 73 tests, AI mock evaluations 120/120, API contracts 2/2, fictional mobile demo E2E 1/1, axe 11/11, visual 3/3, typecheck, contrast, production dependency audit (0 advisories), SBOM generation and locale key parity (703 keys each). License metadata scan covered 232 production packages with no unknown or strong-copyleft declaration found.
- Not verified: Supabase migrations/RLS/pgTAP because Supabase CLI is absent; authenticated E2E because disposable accounts/fixtures are absent (4 passed, 9 failed during required setup checks); fresh mobile performance budget because the production server exited before readiness. The first parallel Playwright attempt also collided on port 3100; sequential API, demo E2E and visual runs passed.
- Added `docs/release-checklist.md` with severity-ranked findings, P0 evidence status, exact remaining gates and owners (product/platform, lawyer, vet adviser, clinic partner and payment account owner). The live SOS fan-out/timeouts, persistent P0 journeys, malware worker, legal/clinical approvals and hosted setup remain release blockers as documented there.

## 2026-10-18 — Clinic onboarding/import kit design

- Read the clinic workspace, database model, metrics definitions and local Next.js 16 Proxy/Route Handler guides. Researched official ExcelJS documentation and license before selecting it for server-only `.xlsx` parsing; recorded the parser and QR choices in the design as implementation prerequisites.
- Prepared the interactive clinic import wizard mockup under `.superpowers/brainstorm/` after user requested browser preview; added all seven checklist steps. Decisions confirmed: reject Excel merges in the data area, hold duplicates for clinic review, and block whole-batch rollback after any owner claim.
- Drafted `docs/superpowers/specs/2026-10-18-clinic-onboarding-import-kit-design.md`. No application code or dependencies have been changed. Implementation is pending user approval of the written design.
