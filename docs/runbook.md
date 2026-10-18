# PawCare incident runbook

Use this runbook for the first response. Incident lead records UTC timestamps, affected services, decisions and owners in the incident channel. Keep medical, owner and payment data out of chat and logs. For a suspected data incident, use the data-leak procedure even if the first symptom looks like another outage.

## Shared response steps

1. Declare an incident, assign an incident lead and a communications owner, and start a timestamped log.
2. Check `/api/health`, the internal observability dashboard, GitHub Actions uptime alerts, Vercel deployment/runtime logs and Supabase status/metrics.
3. Prefer disabling the affected risky feature flag or rolling back the last Vercel deployment. Do not disable basic SOS as a billing action; only the `sos.enabled` incident switch can stop new SOS intake.
4. Preserve logs and relevant audit records before cleanup. Never paste secrets, full request bodies, pet health data or precise owner locations into an incident report.
5. Tell affected users in Vietnamese first and English second when service is restored or an action is required. Escalate privacy, payment and clinical-service impacts to the accountable lead and counsel.

## SOS dispatch outage

**Trigger:** SOS requests fail, dispatch p95 alerts fire, clinics do not receive pings, or acceptance/session creation fails.

1. Treat this as highest severity. Put a visible incident notice and the manually maintained fallback clinic/hotline information on the owner SOS screen if the app is reachable. The fallback list must be verified and available without Realtime.
2. Check Supabase/PostGIS availability, `start_sos_request`, dispatch jobs, Realtime channels, push delivery, clinic availability state, radius-expansion worker and the latest deployment. Use request/trace IDs to follow request → dispatch → accept → session.
3. If the last deployment caused the issue, roll it back in Vercel. If dispatch is overloading a clinic or creating unsafe fan-out, use `sos.enabled=false` to stop new intake, keep status and fallback information available, and escalate to the on-call product/clinical lead.
4. Do not manually claim that a clinic accepted or that a vet is responding. Reconcile outstanding requests from durable database state; contact affected users only through approved, privacy-safe channels.
5. Restore the flag only after a synthetic request reaches a clinic ping and an authenticated accept/session test succeeds. Review missed requests, timeout/radius behavior, audit logs and provider delivery errors.

## AI service outage

**Trigger:** AI error-rate alert, provider timeout/circuit breaker, malformed output, or unexpected blocked-output spike.

1. Confirm affected provider/model and whether the circuit breaker or daily budget is active. Check only redacted `ai_runs` metadata and provider status.
2. AI features must fall back to deterministic rules and non-AI wording. SOS urgency and care-plan baseline remain rule-based; no staff member should re-enable AI output as a workaround for a rules failure.
3. Disable the provider through the server environment/config or use the existing deterministic mock only in demo/test environments. Never switch production to mock output that could be mistaken for live care.
4. If this followed a deploy, roll back. Keep all output filters and schema checks active; do not bypass a blocked response or prompt-injection protection.
5. Re-enable after provider health, budget controls, structured-output validation, and the relevant golden/adversarial evaluation set pass. Record model/provider and outage window without personal data.

## Payment outage

**Trigger:** checkout failures, signature verification errors, duplicate/replayed webhook alerts, reconciliation backlog, or incorrect subscription entitlements.

1. Billing is sandbox-only unless an approved provider adapter and production configuration are explicitly enabled. Verify `billing.enabled`; disable the billing feature flag to stop new checkout attempts while keeping account settings readable.
2. Check webhook signature failures, idempotency/event rows, payment/subscription states, retry queue and provider status. Never infer a paid state from the browser redirect or manually edit a subscription without an audited reconciliation.
3. Preserve webhook event IDs and sanitized references. Retry only through the idempotent reconciliation job. Confirm duplicates do not issue a second entitlement or charge.
4. If an incorrect entitlement or charge is confirmed, pause billing, reconcile affected accounts, and contact the provider and finance owner. Do not delete ledger rows; record corrections append-only.
5. Resume after signature, replay, duplicate, failure and cancellation tests pass in sandbox; perform a small monitored canary if production payments are ever approved.

## Suspected data leak

**Trigger:** exposed signed URL, cross-owner/clinic access, leaked secret, unauthorized export, misdirected notification, or unexpected public health/location data.

1. Declare a security incident and restrict access immediately: revoke the affected grant/signed links, disable the implicated endpoint/feature flag, suspend compromised accounts, and rotate exposed credentials. Preserve audit trails and deployment artifacts.
2. Identify data classes, affected records, time window, access path and whether data was actually retrieved. Use audit logs, storage access logs, request IDs and provider logs; do not copy raw personal or health data into the incident channel.
3. Contain the root cause with a reviewed patch: authorization/RLS, signed-link scope and expiry, storage policy, CSP/input handling or secret rotation. Verify owner isolation and clinic consent before reopening access.
4. Notify the privacy/security owner, executive incident lead and counsel promptly. Counsel determines applicable notice duties, recipients and timing; this runbook does not make legal determinations. Keep a factual evidence log and avoid speculative public statements.
5. Confirm revocation, account/session rotation, RLS tests, IDOR tests, relevant E2E tests and monitoring before recovery. Complete a post-incident review with cause, scope, impact, response timeline and prevention items.

## Recovery and follow-up

- Mark the incident resolved only after the customer-facing path is verified and alerts return to normal.
- Create tracked remediation items with an owner and due date. Preserve append-only audit and financial ledgers.
- Review whether the feature should remain disabled and whether the production feature-flag default needs an approved change.
- Keep emergency clinic/hotline data maintained and independently testable; the SOS flow must communicate triage/routing only, not diagnosis.
