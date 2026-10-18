# Digital Health Passport design

## Intent

Give owners and veterinary clinic staff a reliable, consent-based pet health record. Owners can understand and share a pet's history; clinic staff can review safety-critical information quickly and enter precise records even when connectivity drops.

## Goals

- Owner pages for a pet profile, chronological health timeline (vaccines, prescriptions, visits, weight), allergies, conditions, documents, co-owners, access history, sharing, and PDF export.
- A clinic view that puts allergies and active medications above the timeline and supports quick vaccine/medication entry by barcode or manual search.
- Consent-scoped, expiring clinic access opened from a QR code only after clinic staff sign in. Owners can revoke access; all access and changes are auditable.
- Immutable clinical entries with append-only amendments and optimistic concurrency.
- An offline-tolerant clinic entry queue that retries idempotently and rechecks role, consent, and pet access at sync time.
- Private document storage, client-side image compression, Vietnamese and English strings, and responsive/mobile accessible UI.
- Tests for grant/revoke, access audit, barcode fixtures, and PDF export output.

## Non-goals

- Diagnosis, prescribing, treatment recommendations, or automated clinical decisions.
- Public or bearer access to a pet's passport. A QR contains an opaque link, but viewing requires an authenticated, authorized clinic user and active scoped consent.
- Editing or deleting an existing clinical record in place. Corrections are appended as amendments; only a separately authorized privacy/deletion workflow may handle removal obligations.
- Full clinic management, booking, tele-triage, or billing features beyond links needed to reach this passport slice.
- Treating demo contraindication rows as medical guidance or enabling them in production.

## Constraints and repository context

- Follow the existing Next.js App Router, TypeScript, Supabase, RLS, Zod, and next-intl conventions. Keep domain code under `modules/passport` and avoid imports across module internals.
- The current database migration is an identity shell; passport tables, policies, storage policies, and generated types must be added in a new versioned migration.
- Never expose Supabase service credentials to the browser. Server actions/route handlers authorize each operation; RLS remains the data boundary.
- Do not decide legal questions. Keep the legal open-questions document current.
- Access grants belong to a pet and clinic and include explicit scopes plus expiry/revocation. The default product call is that any active pet owner may grant/revoke clinic access; co-owners can see the resulting grant and audit history.
- Offline records are new immutable entries or amendments with client-generated idempotency keys. The client stores only a pending outbox, not a long-lived local copy of the medical record. A failed authorization at sync remains queued for user resolution and is never silently discarded.

## Product flow

### Owner

1. Select a pet and land on a compact profile header with identity, allergies, conditions, and active medications.
2. Browse the timeline, filter by record type, and open a record's provenance/amendment history.
3. Add co-owners by an authenticated invitation flow; accepted members see the pet and its record history.
4. Start sharing by selecting a clinic (or scanning its clinic QR), choosing visible categories, and choosing an expiry. Show a plain-language confirmation of the exact scope and expiry.
5. The app creates an opaque high-entropy share token, stores only its hash, and encodes the URL in a QR. Opening it requires clinic sign-in and clinic membership. The server validates token, scope, expiry, revocation, user role, and clinic association before returning data. Every attempt to view records is logged.
6. Revoke from the access list. Revoke invalidates the token/grant immediately and is auditable.
7. Export a printable PDF containing only the selected pet's permitted record history and generated-at timestamp. Documents are omitted unless explicitly selected.

### Clinic

1. Clinic staff open a shared link while signed in. The server verifies active clinic membership and grant before showing the pet.
2. The first screen section is a persistent safety summary: allergies, conditions, active medications, then relevant warning banners.
3. Vaccine/medication entry is a single short form. Scan when supported; otherwise search catalog or enter exact name and code. Require medicine name, code, dose, lot, and date for vaccine entry; validate all fields inline.
4. Save online using an append-only insert. Offline, save a pending item with idempotency key and visible sync state; retry on connectivity and revalidate consent/access before commit.
5. All views, insertions, and amendments emit an audit event. Audit events are append-only and visible to pet owners.

## Data and security shape

- Keep catalog data separate from immutable clinical record events. Record events have a stable id, pet id, type, effective date, actor, source clinic, and monotonically increasing version/sequence.
- Typed record details cover vaccinations, prescriptions, visits, and weight. Vaccine and medication entries preserve exact catalog code/name snapshots so later catalog edits do not rewrite history.
- Amendments reference the original record and prior version; they append a correction payload, reason, actor, and timestamp. A transaction/unique sequence constraint detects stale concurrent amendments.
- `record_access_grants` (or its extension) carries clinic, pet, scope, issued-by, expiry, revoked-at, and optional opaque token hash. Scopes are an allowlist of categories, not arbitrary SQL or client-supplied columns.
- Every record read/write endpoint uses a shared audited access function. The audit insert and read response should be coupled so failure to audit fails closed for sensitive views.
- RLS applies to every table and Storage object. Owners/co-owners can access their pets; clinic staff require both active clinic membership and a matching, unexpired, unrevoked grant. Public anonymous access is denied.
- Private documents use a private bucket, pet-scoped object paths, allowlisted MIME/size, image downscaling before upload, and short-lived authorized reads. Do not put document URLs in QR payloads or PDFs by default.
- Contraindication rules have provenance, reviewer, version, enabled status, and `is_demo`. Only vet-reviewed non-demo rules can be production-active. Seed synthetic demo rows with `enabled=false`; UI labels them demo and never presents them as medical advice.

## Technical choices (builder defaults)

- Use `BarcodeDetector` when available; dynamically load `@zxing/browser` as the library fallback. Always retain catalog search/manual entry. Do not make scanning a prerequisite for saving.
- Compress images in the browser using canvas/Web APIs before upload, preserving the original only when the user explicitly chooses a document type where fidelity matters; cap upload size and validate again server-side.
- Generate the passport PDF on the server from authorized data and a localized, accessible print template. Keep output independent of storage URLs and avoid embedding private documents by default.
- Persist offline outbox records in IndexedDB with schema version, mutation UUID, created timestamp, payload, and status. Sync serially per pet, deduplicate with a unique idempotency key, and expose retry/resolve UI.
- Use server time for grant expiry, signed-link lifetime, audit timestamps, and record ordering. Use optimistic concurrency versions for amendments; immutable initial inserts need idempotency, not last-write-wins.
- Use feature-detected camera access and explain permission denial with the manual fallback. Do not retain camera frames after barcode extraction.

## UX and accessibility

- Mobile-first at 360px; owner actions reachable by thumb. Clinic form keeps barcode/search and required fields on one screen with a compact visual hierarchy.
- Allergies and active medications remain visible before scrolling on clinic pet view; warnings are text-first and not color-only.
- Every screen has loading, empty, error, and offline states; forms have inline validation, keyboard access, focus visibility, and translated labels.
- Vietnamese is default, English is available; use locale-aware dates and preserve the exact entered/catalog medicine name in the record.
- Consent uses a review step naming clinic, categories, and expiry. Revocation is immediate and offers confirmation/undo only where undo cannot restore unauthorized access.

## Tests and acceptance criteria

- RLS/SQL tests prove owner/co-owner boundaries, clinic access only under active matching consent, anonymous QR denial, expiry and revocation denial, and append-only audit/record history.
- Unit tests cover scope validation, token hashing/validation, stale amendment conflicts, idempotent offline replay, and contraindication rule eligibility (`is_demo` cannot activate in production).
- Consent E2E: grant with selected scopes, verify allowed fields only, revoke, then verify the clinic can no longer view and owner can see access events.
- Access logging test: successful and denied record-view attempts are recorded without leaking record data; audit mutation is rejected.
- Barcode fixture test exercises native API and library fallback paths, successful lookup, unknown code, camera denial, and manual fallback.
- PDF export test downloads the file, checks PDF signature and stable extracted text/snapshot for localized headings and selected record content, and confirms unselected categories/documents are absent.
- Clinic entry form requires exact medicine name, code, dose, lot, and date, with a usability timing check/manual walkthrough target under 20 seconds for a known catalog item.

## Open implementation calls

- Existing Supabase credentials are not present in this workspace; migrations and RLS tests can be authored, but hosted project application requires local credentials later.
- Confirm the current `pet_owners`, clinical record, grant, and audit schemas before finalizing migration compatibility. The repository currently only has the identity slice.
- Clinical contraindication content requires a qualified vet reviewer. The initial seed stays synthetic, disabled, and demo-only until such content is supplied.
- A lawyer must answer the existing legal questions on medical record sharing, data retention/deletion, and consent scope; implementation must not turn these into legal conclusions.

## Builder check

Self-review: the design covers each requested surface, enforces clinic login for QR access, retains manual entry, and specifies immutable/offline behavior. The only clinical content left deliberately empty is real contraindication data; synthetic disabled demo rows avoid presenting invented medical guidance. PDF contents and document inclusion are explicit. This document is ready for owner review before implementation.
