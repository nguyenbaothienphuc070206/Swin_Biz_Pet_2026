# Metrics and observability

## Data policy

PawCare product analytics are computed as server-side aggregates from domain tables. No analytics vendor receives events. We do not collect names, email/phone, pet identifiers, symptoms, medical record contents, chat text, exact location, photo, or other health data in analytics or logs. The admin dashboard renders aggregate totals and rates only. SOS operational logs use an opaque deterministic trace ID for stage correlation and a separate request ID; they contain durations, outcome codes and counts only. Error tracking records route template, method and error class, never exception messages or request bodies.

All reporting windows use UTC timestamps and exclude deleted records where applicable. Demo/seed rows must be excluded from production reporting (`is_demo = false`); seed data remains clearly fictional in the demo environment. AI calls from the deterministic mock provider are marked `is_demo` and excluded from production error-rate alerts. Dashboards suppress interpretation until at least 20 observations for rate/latency alerts. No cohort smaller than 10 owners is displayed.

## Product metric definitions

| Metric | Definition | Source / window |
|---|---|---|
| Owner activation: first pet | Owners in the new-owner cohort (profile created in the period) who create at least one non-deleted pet within 7 days ÷ eligible new owners. | `profiles`, `pets`; cohort + 7 days |
| Owner activation: first health record | Owners in the new-owner cohort who have at least one medical record or vaccination within 14 days ÷ eligible new owners. This is a completion event count only; record content is never analyzed. | `profiles`, `medical_records`, `vaccinations`; cohort + 14 days |
| Booking funnel: request → confirmed | Appointments with `confirmed` or `completed` status ÷ appointments created in the period. | `appointments.created_at`, current status |
| Booking funnel: confirmed → completed | Completed appointments ÷ confirmed-or-completed appointments created in the period. Canceled/no-show states remain visible as funnel losses. | `appointments`; rolling 30 days |
| SOS funnel: submitted → pinged | Requests with at least one clinic dispatch row ÷ SOS requests created in the period. | `sos_requests`, `sos_dispatches`; rolling 30 days |
| SOS funnel: pinged → accepted | Requests accepted by a clinic ÷ requests with at least one ping. | `sos_requests`, `sos_dispatches`; rolling 30 days |
| SOS funnel: accepted → session | Accepted requests with a triage session ÷ accepted requests. | `sos_requests`, `triage_sessions`; rolling 30 days |
| Owner retention cohort | Owners created 31–60 days before the report date with a completed booking or accepted SOS during the following/current 30-day observation window ÷ all eligible owners in that acquisition cohort. Report only aggregate cohorts of 10 or more. | `profiles`, `appointments`, `sos_requests`; monthly cohorts |
| Clinic activation | Currently verified clinics created 31–60 days ago that completed a booking or accepted an SOS within 30 days of creation ÷ all clinics in that mature creation cohort. Verification time is not available in the current schema, so the numerator means currently verified, not verified-within-30-days. | `clinics`, `appointments`, `sos_requests`; mature cohort |

This codebase does not yet persist search-view or availability-view events. Therefore funnel denominators begin at durable appointment/SOS creation; they do not claim to measure anonymous page views or search impressions. Cohort joins use internal database IDs only in the server-side query and return aggregate counts; those IDs are never written to telemetry logs.

The read-only `/{locale}/pilot-kpis` page presents a subset of these proposed definitions and labels each one “planned”; it does not query live operational tables or report pilot outcomes.

## SOS operational trace

Each API request receives an `x-request-id`. SOS request creation derives an opaque `trace_id` from the SOS request UUID; the UUID itself is not emitted. Structured JSON spans cover `sos.request.created`, `sos.dispatch.pinged` (with clinic count), `sos.dispatch.accepted`, and `sos.session.started`, with duration and outcome fields. Failed transitions are logged with a bounded error code. The newly added clinic session RPC locks the accepted request and permits creation only to a member of the accepted clinic; it is idempotent and expires the session after 30 minutes.

The trace currently covers the HTTP request, initial PostGIS-backed dispatch rows, atomic clinic acceptance and session creation. Push-provider delivery and Realtime client receipt are not instrumented as successful delivery because those live adapters/jobs are not fully wired in the current product.

## Alerts and uptime

The authenticated-by-secret `/api/observability/alerts` check evaluates the preceding 30 days and returns only aggregate rules and sample counts. GitHub Actions invokes it every five minutes when deployment variables/secrets are configured. A fired rule returns HTTP 503 so the workflow fails and repository notification settings can alert the on-call team.

| Rule | Trigger | Minimum sample |
|---|---|---:|
| SOS time to first clinic ping p95 | p95 exceeds 30 seconds | 20 SOS requests with a ping |
| SOS dispatch failure rate | At least 10% failed; failure means terminal unmatched/expired or no ping after 90 seconds | 20 SOS requests |
| AI error rate | At least 5% non-success outcomes (`fallback` or error) | 20 AI runs |
| Uptime | `/api/health` is non-200, invalid, or times out after 15 seconds | Every scheduled probe |

The health endpoint is a liveness probe; it does not prove Supabase/PostGIS readiness. The alert job checks database-backed SOS/AI metrics separately and fails if its query cannot run. Configure GitHub Actions `PAWCARE_UPTIME_URL` (repository variable), `OBSERVABILITY_JOB_TOKEN` (secret), and notification routing for the workflow. `SUPABASE_SERVICE_ROLE_KEY` must already be present server-side for the protected alert query and is never exposed to the browser.

## Error tracking and log fields

Next.js `onRequestError` and SOS transitions emit JSON to stdout/stderr for the hosting log collector. Fields are `timestamp`, `level`, `service`, `event`, request/opaque trace IDs, route template or stage, duration, bounded outcome/error code, and aggregate counts. Do not add exception messages, user IDs, clinic IDs, pet IDs, headers, URLs with query strings, request bodies, prompts or medical values. Hosting retention and alert delivery depend on deployment log settings; no third-party error tracker has been added.
