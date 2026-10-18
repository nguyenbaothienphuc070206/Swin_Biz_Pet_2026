# Third-party integrations

Verified on 2026-10-16 against the providers' official documentation.

## Supabase Auth and SSR

- Use `@supabase/ssr` with separate browser and server clients. SSR sessions are cookie-based; Server Components cannot write refreshed cookies.
- Supabase documents `@supabase/ssr` as beta and recommends it while noting its API may change; keep the client wrapper isolated in `lib/supabase/`.
- In Next.js 16, `proxy.ts` refreshes the session with `auth.getClaims()` and copies refreshed cookies to the request and response. Do not use `getSession()` in proxy as an authorization check.
- Proxy is an optimistic redirect layer only. Verify identity and role in server layouts/actions/route handlers, and keep database access protected by RLS.
- Email/password uses Supabase Auth `signUp` and `signInWithPassword`; Google OAuth uses `signInWithOAuth` and the configured callback URL. Provider credentials and callback allowlists are configured in Supabase/Google consoles.
- A phone OTP provider is represented by an application adapter and is not enabled until an SMS provider and project configuration are supplied.
- Roles must be provisioned by trusted server-side administration into Supabase `app_metadata` or an RLS-protected role table; never accept role claims from user-editable metadata. Current repository does not yet contain the profiles/roles schema or role provisioning flow.

## Supabase Storage

- Clinic verification documents go to a private bucket. Private bucket downloads are authorized through Storage RLS or time-limited signed URLs; public URLs would expose the documents.
- Storage object access is governed by policies on `storage.objects`. Uploads are denied by default without an INSERT policy.
- `supabase/migrations/202610160001_identity_shell.sql` creates the private verification bucket and uploader/admin-scoped policies. Apply the migration to the hosted project before enabling uploads; the application does not use a service key for uploads.

## next-intl

- Locale-prefixed App Router routes use `/vi/...` and `/en/...` with `vi` as the default locale.
- `next-intl` routing middleware handles locale redirects/rewrites and alternate-language headers. It must be composed with the session refresh in Next.js 16's single `proxy.ts` entry point.
- Request messages are loaded from typed locale catalogs and exposed to Server and Client Components through the request config/provider. Display formatting uses `Intl.DateTimeFormat` and `Intl.NumberFormat` with the active locale and `VND` currency.

## Sources

- [Supabase SSR client setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Next.js 16 Proxy](https://nextjs.org/docs/app/getting-started/proxy)
- [next-intl routing configuration](https://next-intl.dev/docs/routing/configuration)
- [next-intl Proxy/middleware](https://next-intl.dev/docs/routing/middleware)

## Vietnam payment gateways (research for sandbox billing)

Researched 2026-10-16 from official provider documentation and public pricing pages. This implementation remains **sandbox-only** and uses a deterministic local payment adapter; no gateway account, credentials, or real-money call is enabled.

| Provider | Public fee information verified | Public limits verified | Integration and sandbox notes |
|---|---|---|---|
| payOS | The official payOS website describes free transaction tiers / direct bank transfer for certain channel products. This is product-specific marketing, not a universal merchant fee schedule; the partner integration incentive of 100 VND/transaction is not a merchant processing fee. | No general payment amount/volume limit found in the cited API docs. API calls may return HTTP 429. | Official API documents production host `https://api-merchant.payos.vn`, API credentials, payment-link creation, HMAC-SHA256 signatures, webhook verification, and invoice endpoints. Official test-environment guidance explicitly says payOS has **no separate sandbox**; testing uses a verified account and real production flows. Therefore payOS cannot be called in this sandbox-only slice. |
| VNPAY | Official service fee page says service may be free or charged, with a maximum fee of 2.5% of transaction value. Its official merchant onboarding page says actual costs vary by solution, transaction type/channel, and current offers. | No public transaction amount limits were identified in the cited official pricing/onboarding pages. | A public integration fee ceiling is not enough to infer a merchant-specific quote or production API contract. Do not build or call VNPAY until current official technical documentation, credentials, merchant agreement, sandbox access, and limits are supplied/verified. |
| MoMo | Official business material advertises solutions with costs “from 0 VND”; official marketplace terms describe partner fees as contractually agreed. No universal online gateway merchant fee schedule was identified. | No general merchant transaction amount limits were identified in the cited integration docs. | Official developer docs provide test and production environments with distinct credentials, HMAC-SHA256 signatures, and IPN notification flow. Actual merchant onboarding/UAT is required before production. The app will not call MoMo in this sandbox-only slice. |

**Decision for this task:** use a deterministic mock adapter whose checkout and webhook events are generated locally, and keep the `PaymentAdapter` contract provider-neutral. A UI “sandbox payment” must never be described as a real gateway payment. Retry/reconciliation logic is exercised against the local event ledger. Fees/limits above are comparison notes only; they are not used for pricing or invoice calculations. No vendor fee is invented.

The local plan catalog seeds fictional monthly prices (49,000 VND for Plus and 99,000 VND for Premium) solely to exercise VND checkout and proration; they are marked `is_sandbox=true`, are not a PawCare commercial offer, and require product approval before use outside demo. Renewals require a new sandbox checkout; automated recurring debits are disabled because the local adapter has no payment instrument. `SUPABASE_SERVICE_ROLE_KEY` is required by server-only checkout/webhook code and must be configured as a deployment secret. `BILLING_SANDBOX_WEBHOOK_SECRET` can override the development-only test signature key. Never expose either value to the browser.

Official payment sources:

- [payOS API documentation](https://payos.vn/docs/api/)
- [payOS webhook signature validation](https://payos.vn/docs/tich-hop-webhook/kiem-tra-du-lieu-voi-signature/)
- [payOS test environment (no separate sandbox)](https://payos.vn/docs/moi-truong-test/)
- [payOS public channel products](https://payos.vn/thu-ho/)
- [VNPAY service fee schedule](https://vnpay.vn/bieu-phi-dich-vu-0f61zmr3hwgs)
- [VNPAY merchant onboarding and fee variability](https://vnpay.vn/dang-ky-vnpay-qr-cho-cua-hang-00izi3uzy80zq)
- [MoMo for Business](https://business.momo.vn/)
- [MoMo integration process and test environment](https://developers.momo.vn/v3/docs/payment/onboarding/integration-process/)
- [MoMo payment notifications / IPN](https://developers.momo.vn/v3/docs/payment/api/result-handling/notification/)
- [MoMo digital signatures](https://developers.momo.vn/v3/docs/payment/api/other/signature/)
- [MoMo business marketplace terms on contract-based fees](https://www.momo.vn/quy-che-hoat-dong-ung-dung-tmdt)

## Next.js route handlers for payment events

- Next.js 16 route handlers live in `app/**/route.ts`, use Web `Request`/`Response`, and non-GET methods are not cached by default. Webhook handlers must still perform signature validation, Zod parsing, idempotency and authorization in server logic; `proxy.ts` is not a substitute for these checks.
- [Installed Next.js Route Handlers guide](../node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md)
- [Installed Next.js Proxy guide](../node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md)

## Implementation constraints

No secrets belong in the repository or client bundle. Required public runtime values are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Browser auth and storage flows do not use the service role; the billing webhook and trusted billing mutations require `SUPABASE_SERVICE_ROLE_KEY` only on the server. OAuth and storage behavior require matching provider/project configuration.

## Domain integrations added for Passport, booking, SOS, AI, and recommendations

Verified 2026-10-16 against official documentation before provider implementation:

- **PostGIS**: install the extension in the `extensions` schema, model coordinates as `extensions.geography(point,4326)`, and add GIST indexes. The domain migration uses geography storage and distance functions for clinic/SOS search. Query access must still be constrained by RLS and the request's explicit purpose.
- **Supabase Realtime**: client subscriptions are for live status updates only; the database remains authoritative for dispatch acceptance, booking capacity, and cancellations. Atomic updates/RPCs resolve races. Channel authorization and table RLS are required.
- **OpenAI Responses API**: send structured text output using `text.format` with `type: "json_schema"`; do not enable function tools. Parse the returned JSON and validate again with Zod locally.
- **Anthropic Messages API**: send structured JSON through `output_config.format` with `type: "json_schema"`; do not provide tools. Parse the text content block and validate again with Zod locally.
- **Google Maps JavaScript API**: key is browser-visible by design, so it must be API/application restricted in the Google console and injected from an environment variable; no key is committed. Map loads only when configured; list results remain usable without it.
- **MapLibre GL JS**: client-side map adapter uses a configured style/tile source. The public demo style is for demonstration only; production tile hosting/provider and attribution must be configured separately.
- **PDF output**: use `pdf-lib` in a server route for generated exports/invoices. Documents include only authorized data; invoice semantics remain subject to legal review.
- **Barcode**: prefer browser `BarcodeDetector` when available and use `@zxing/browser` fallback. Camera permission is requested only after user action; manual catalog lookup remains available.
- **Push/video/notifications**: keep provider APIs behind adapters. Demo uses deterministic mock/no-op transport; production delivery requires environment configuration and verified vendor documentation before enabling sends or video sessions.

Official sources:

- [Supabase PostGIS geo queries](https://supabase.com/docs/guides/database/extensions/postgis)
- [Supabase Realtime architecture](https://supabase.com/docs/guides/realtime/architecture)
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)
- [Anthropic Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Google Maps API key setup](https://developers.google.com/maps/documentation/javascript/get-api-key)
- [Google Maps JavaScript API loader](https://developers.google.com/maps/documentation/javascript/load-maps-js-api)
- [MapLibre GL JS docs](https://maplibre.org/maplibre-gl-js/docs/)
- [pdf-lib documentation](https://pdf-lib.js.org/)
- [ZXing browser repository](https://github.com/zxing-js/browser)

Operational constraints:

- All model requests are opt-in/configured per feature, server-only, timeout-bounded, and rejected unless their response passes local Zod and feature safety validation. Provider errors use a deterministic fallback.
- Provider model identifiers and keys are deployment environment values; supported structured output and model access vary by account. This repository does not claim a provider key or production model is configured.
- Do not send personal pet/owner data to an AI or affiliate destination unless the feature's consent and legal basis have been reviewed. Current live AI is disabled unless explicit server config is present; mock mode is the default.
- Maps, video, and push features remain useful in demo when their providers are not configured; no fake accept, notification delivery, or live map data is implied.

## Notifications (research for event-driven delivery)

Verified 2026-10-16 against official documentation:

- **Queue:** Supabase Queues is a Postgres-backed durable queue built on PGMQ. Its pull-based API supports `send`, `read`, `delete` and `archive`; `read` uses a visibility timeout, and failed processing can leave a message available for retry. This slice uses an application-owned Postgres job table with `FOR UPDATE SKIP LOCKED` and a delivery ledger, avoiding a requirement to enable the PGMQ extension. The table is RLS-enabled and service-role-only; notifications and recipients remain in protected `public` rows.
- **Email:** Resend's `POST /emails` supports an `Idempotency-Key`; its documentation states keys are retained for 24 hours and requests must use the same payload on retries. The API accepts custom message headers. The sender API key and sender identity are server-only environment configuration. Resend is optional; absent credentials use the deterministic mock transport. No marketing email is enabled by this adapter.
- **Email unsubscribe/bounce events:** Resend webhooks can report email events, and webhook signature verification must use the raw request body with the provider's signing secret. Unsubscribe and bounce handling is implemented as a local suppression update; provider webhook setup is optional and remains disabled unless configured.
- **Web Push:** browsers require an active service worker to subscribe; the browser returns a `PushSubscription` containing endpoint and encryption material. The endpoint is a secret capability URL and must be stored privately and never exposed in logs. This project keeps subscription management behind an adapter and requires HTTPS plus configured VAPID keys before sending. Browser-side unsubscribe uses `PushSubscription.unsubscribe()` and removes the server-side subscription record.
- **Web Push server library:** use the established `web-push` Node library to handle VAPID signing and Web Push payload encryption rather than implementing the protocol cryptography in application code. The adapter remains disabled until VAPID keys are configured.
- **Email unsubscribe:** delivery messages use `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` with a signed, expiring token. The POST handler suppresses that user's email channel. RFC 8058 requires the unsubscribe headers to be covered by a valid DKIM signature; sender-domain/DKIM setup remains a deployment requirement.
- **Zalo:** official Zalo Developer docs describe Zalo OA and ZBS Template Message, including delivery by phone number or Zalo UID. They do not establish PawCare's account eligibility, recipient consent, approved templates, pricing, or lawful message categories. Therefore the Zalo/SMS adapter is a non-sending stub until credentials, official technical details, approved templates and counsel review are available. No undocumented endpoint or message policy is assumed.
- **Policy decision:** priority SOS jobs bypass configured quiet hours only. They still respect channel availability, user preferences and explicit unsubscribe/suppression state. In-app delivery remains available when an external channel is disabled. Event and reminder jobs are deduplicated by stable entity/event keys. Retries are performed by the app worker with bounded exponential backoff and an application delivery log; provider-specific retry guarantees are not treated as a replacement for local idempotency.

Official sources:

- [Supabase Queues overview](https://supabase.com/docs/guides/queues)
- [Supabase Queues quickstart and visibility behavior](https://supabase.com/docs/guides/queues/quickstart)
- [Supabase Queues API](https://supabase.com/docs/guides/queues/api)
- [Resend email API](https://resend.com/features/email-api)
- [Resend idempotency keys](https://resend.com/changelog/idempotency-keys)
- [Resend webhook signature verification](https://www.resend.com/changelog/managing-webhooks-via-api)
- [Resend send email API reference](https://resend.com/docs/api-reference/emails/send-email)
- [IETF RFC 8058 one-click unsubscribe](https://www.rfc-editor.org/rfc/rfc8058.html)
- [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [MDN PushManager.subscribe](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe)
- [MDN PushSubscription.unsubscribe](https://developer.mozilla.org/en-US/docs/Web/API/PushSubscription/unsubscribe)
- [Apple Web Push server guidance](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers)
- [web-push Node library](https://github.com/web-push-libs/web-push)
- [Zalo for Developers](https://developers.zalo.me/docs/)

## Admin step-up authentication

Supabase Auth exposes `auth.mfa.getAuthenticatorAssuranceLevel()` for the current session. AAL2 means the session was additionally verified with a configured MFA factor; the platform documentation recommends enforcing this in server-side rendering/API/database paths. Sensitive admin mutation endpoints will require both `platform_admin` and AAL2 and will fail closed if MFA is not enrolled/configured. Enrolling an MFA factor in the PawCare UI remains a separate rollout prerequisite; the app does not claim password re-entry or AAL1 as step-up verification.

- [Supabase MFA and server-side enforcement](https://supabase.com/docs/guides/auth/auth-mfa)
- [Supabase JavaScript assurance level API](https://supabase.com/docs/reference/javascript/auth-mfa-getauthenticatorassurancelevel)
