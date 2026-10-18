# PawCare security hardening

Last reviewed: 2026-10-18. Scope: the current repository and its configured Next.js/Supabase integrations. This is an engineering review, not a penetration-test certificate.

## Threat model (STRIDE)

| Surface | Spoofing | Tampering | Repudiation | Information disclosure | Denial of service | Elevation of privilege |
|---|---|---|---|---|---|---|
| SOS dispatch | Stolen owner/clinic session; forged clinic acceptance | Race to accept or alter urgency/location | Missing dispatch and triage audit trail | Exact location and passport shared too broadly | SOS fan-out, repeated false alarms, hot clinics | Clinic staff viewing a request outside their clinic/grant |
| Passport sharing | Stolen clinic account or copied QR/link | Altered record or consent scope | Unlogged read/edit or disputed amendment | Medical history, allergies, owner identity in exports and signed links | Large exports or repeated PDF generation | IDOR across pet IDs, expired/revoked grant still honored |
| Community and Rescue | Fake rescuer/clinic, impersonated reporter | Forged receipts, edited report, malicious uploads | Untraceable moderation or ledger changes | Owner address, precise stray location, private evidence | Spam, upload floods, moderation queue overload | Unauthorized approval, partner verification, or ledger mutation |

Controls implemented in this pass: API same-origin checks for mutating requests with explicit webhook/unsubscribe/internal callback exceptions; Next.js Server Action origin validation retained; strict nonce-based CSP and standard response headers; AAL2 checks centralized for clinic and platform administrators; public-table RLS completeness is tested by pgTAP in CI; service-only upload-scan and notification-queue policies; private upload signature/size checks in clinic verification; URL protocol/host checks for affiliate redirects; short signed URL lifetimes; user-facing PII is removed from AI input logs; authenticated export covers account, pet/passport, care-plan, appointment, SOS, community, billing, notification and audit data.

## OWASP mapping

The review used the [OWASP Top 10 2025](https://top10.owasp.org/2025/) and [OWASP Top 10 for LLM Applications 2026](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/). The shared AI gateway treats supplied content as data, validates structured output, filters medical directives, logs redacted inputs, and does not execute model-directed tools. These are controls in code, not proof against every prompt injection or model failure.

### RLS and authorization

- `npm run security:rls` runs `supabase test db`; `supabase/tests/rls_completeness.test.sql` fails when a public table has RLS disabled or no policy at all. A deny-by-default client policy is added for existing tables without policies. Review policy semantics separately; existence does not prove correct row scoping.
- Server route/action checks remain distributed across feature modules. Sensitive clinic/platform routes use `requireRole`/`requireSensitiveAdmin`; clinic and platform administrators require AAL2. Database RLS remains the final data boundary.
- CI pgTAP currently checks policy coverage and hardening invariants. Database-backed tests and a route-by-route IDOR adversarial test suite still need a configured Supabase CLI/database and test identities.

### Request, browser and session controls

- Mutating `/api` requests require matching Origin and Host URL origin and reject `Sec-Fetch-Site: cross-site`, except signed webhook, unsubscribe, and internal callback endpoints whose own credentials/signatures are checked.
- Next.js built-in Server Action origin/host validation is relied upon. CSP is nonce-based with no `unsafe-inline` script; `unsafe-eval` is development-only. Styles allow inline styles for framework/component compatibility. `next.config.ts` and Proxy set frame, MIME, referrer, permissions and production HSTS headers.
- Admin MFA is enforced using Supabase AAL2. Production must enable and test the project's MFA factors and session policies; repository code cannot change hosted project settings.
- Supabase auth cookies are required for login. No analytics SDK/cookie was found in the checked app/package sources, so no analytics consent banner is currently required by this code. Reassess before adding analytics or advertising cookies.

### Uploads, outbound URLs and signed access

- Browser validation checks allowed file signatures and size for clinic verification; Storage bucket MIME/size rules and a private scan-state table add server-side gates. Community content cannot be approved until a trusted scan result is marked clean.
- `POST /api/internal/file-scan/result` is only a credential-protected scan-result hook. No antivirus engine, queue consumer, image sanitizer, or provider is installed. Until an actual scanner is connected and fail-closed behavior is observed, uploaded files must not be treated as malware-scanned. This is a release blocker for public uploads.
- No generic server-side URL/image fetcher was found. The affiliate endpoint redirects only to HTTPS public hostnames and does not fetch the destination. Recheck DNS rebinding/redirect behavior if any server fetcher is introduced.
- Private document/image signed links are capped at 300 seconds (clinic verification links use 60 seconds). Revocation cannot invalidate a link already issued, so keep scopes narrow and expiry short.

### Data minimization review

The following is a repository-level purpose/sensitivity review, not a legal basis or retention decision. Every table is in a group below; direct identifiers and medical/location/financial data require narrow RLS, audit, export and retention controls.

| Tables | Purpose and sensitive fields to minimize |
|---|---|
| `profiles`, `consents`, `privacy_requests` | Identity/contact, authorization choices, privacy workflow status; avoid copying contact fields into event payloads. Roles are stored on `profiles`, not in a separate table. |
| `clinics`, `clinic_staff`, `clinic_hours`, `clinic_services`, `clinic_holidays`, `clinic_verification_requests`, `vets`, `vet_shifts`, `availability_slots` | Business contact, staff identity, private verification documents and schedules; expose public listing fields only. |
| `pets`, `pet_owners`, `pet_allergies`, `pet_conditions`, `weight_entries`, `pet_documents`, `vaccinations`, `prescriptions`, `medical_records`, `medical_record_amendments`, `record_access_grants`, `vaccine_catalog`, `medication_catalog`, `contraindication_rules` | Identifiable veterinary/health records, document paths and consent scopes; require owner/grant-scoped access, log views, export owned data, avoid unnecessary document copies. |
| `appointments`, `appointment_events`, `reviews`, `review_replies`, `review_reports` | Owner/clinic visit linkage, feedback and abuse reports; public views must exclude private identity and moderation evidence. |
| `sos_requests`, `sos_dispatches`, `triage_sessions`, `messages`, `sos_rules` | Precise location, symptoms, communications and response history; share only for the active incident and limit retention after counsel decides. |
| `care_plans`, `care_plan_items`, `care_plan_events`, `care_plan_rules` | Health-derived plans, completion and vet approval history; expose only approved owner-visible versions. |
| `products`, `affiliate_links`, `affiliate_clicks`, `spa_listings`, `spa_placements` | Catalog and commercial attribution; minimize linkable identifiers and avoid medical inferences in ad tracking. |
| `community_posts`, `community_comments`, `community_moderation_reports`, `community_appeals`, `community_rate_limits`, `lost_found_reports`, `stray_reports`, `rescue_cases`, `rescue_partners`, `rescue_estimates`, `rescue_ledger_events`, `donation_ledger` | User content, pet images, location, private receipts, partner identity and anti-abuse signals; exact addresses and evidence stay private, public stray points fuzzed. |
| `billing_plans`, `billing_subscriptions`, `billing_payments`, `billing_documents`, `billing_webhook_events`, `billing_reconciliation_jobs`, `invoices`, `commission_ledger` | Subscription, transaction references, amounts and documents; do not store full card credentials; sandbox markers must remain visible. |
| `notifications`, `notification_preferences`, `notification_jobs`, `notification_deliveries`, `web_push_subscriptions`, `reminder_campaigns` | Contact endpoints, push tokens, message payloads and quiet-hour choices; minimize payload PII and honor channel preference/unsubscribe. |
| `audit_logs`, `ai_runs`, `ai_daily_budgets`, `ai_eval_runs`, `feature_flags`, `private_file_scans` | Security/admin events, AI metadata, budget counters, rollout state and file hashes/status; exclude raw PII/secrets and establish retention after legal review. |

Export is authenticated and uses owner-scoped queries across the enumerated data domains. Large datasets currently have per-query limits rather than pagination, so a complete export for accounts exceeding those limits is not yet guaranteed. Account deletion is a recorded request; destructive erasure is intentionally not automated until legal retention exceptions and backup handling are specified. These are open issues, not completed deletion controls.

## Remaining risks and rollout gates

1. Execute migrations and pgTAP against local and staging Supabase; this workspace has no installed Supabase CLI/project credentials, so database behavior is not verified here.
2. Connect a real malware scanning worker; current result endpoint is a hook only. Do not publish user uploads until it is operational and fail-closed.
3. Complete route/action IDOR tests with owner, clinic staff, clinic admin and platform admin identities, including cross-clinic and revoked-grant cases.
4. Choose and enforce legally approved retention/deletion periods for health records, audits, payments, uploaded documents, SOS locations, AI logs and backups.
5. Add shared rate limits for login, exports, SOS creation and other sensitive operations. Do not introduce SOS throttles that can delay urgent routing without a product/veterinary safety policy.
6. Configure hosted Supabase MFA/session settings, secret rotation, production CSP source allowlist, TLS/HSTS, alerting and incident response.
7. CI `npm audit` catches known advisories but does not replace lockfile provenance checks, dependency review, or periodic manual review. CycloneDX SBOM is generated as a CI artifact.
8. No analytics cookie banner is present because no analytics integration is currently used. Add consent UX before enabling non-essential analytics/tracking.
9. AI provider/model behavior and external scanner behavior need independent security testing; mock evaluations are not a security certification.

## Automated checks added

- `modules/security/request-policy.test.ts`: same-origin, cross-origin and callback exception behavior.
- `modules/security/csp.test.ts`: nonce, script policy and framing/object restrictions.
- `modules/security/file-validation.test.ts`: valid magic bytes, spoofing and size/type rejection.
- `modules/security/outbound-url.test.ts`: HTTPS/public-host destination allowlist.
- `modules/security/signed-url.test.ts`: expiry cap and invalid lifetime handling.
- `modules/security/mfa-assurance.test.ts`: AAL2 required for clinic/platform admin roles.
- `modules/ai/privacy.test.ts`: AI log input omits supplied PII.
- `supabase/tests/rls_completeness.test.sql` and `supabase/tests/security_hardening.test.sql`: pgTAP structural checks.

Run `npm run security:deps`, `npm run security:rls`, and `npm run security:sbom` in CI. Unit tests cover the pure security helpers. Passing these checks does not resolve the rollout gates above.
