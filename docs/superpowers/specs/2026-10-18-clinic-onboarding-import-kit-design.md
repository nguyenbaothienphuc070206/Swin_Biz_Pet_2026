# Clinic onboarding and data import kit

## Intent

Help a clinic move from a new PawCare account to a usable patient list and a shareable booking entry point with minimal manual setup. Legacy patient and vaccination data must be previewed before import, scoped to the importing clinic while unclaimed, and recoverable as a whole batch before any owner claims the data.

## Goals

- Import patient and vaccination records from UTF-8 CSV and `.xlsx` files.
- Suggest column mappings for English and Vietnamese headers, including diacritics.
- Return a downloadable/onscreen row-level report for invalid, incomplete, ambiguous-date, and duplicate rows.
- Run a dry-run preview before a clinic commits any records.
- Persist an auditable import batch with a single whole-batch rollback operation.
- Invite a pet owner by email or phone to verify the record, claim the pet, and choose whether to share imported history with the clinic.
- Keep unclaimed imported data private to the clinic that imported it.
- Give a clinic admin a guided checklist from profile setup through hours, services, team, first import, booking link and printable QR poster.
- Provide a resettable 10-minute sales walkthrough with fictional data and mock integrations.
- Measure clinic onboarding time-to-first-value without tracking owner contact data, pet IDs, file content or health data in analytics.

## Non-goals

- Importing `.xls`, macros, arbitrary workbook formulas, multiple sheets, or password-protected workbooks.
- Writing directly into an owner's Digital Health Passport before the owner claims the pet and grants scoped access.
- Merging a clinic import into an existing PawCare pet without an owner-confirmed match.
- Sending SMS/Zalo through a new provider; that adapter remains a stub unless credentials and provider behavior are later approved.
- Automatically correcting ambiguous or invalid dates, silently overwriting duplicates, or inferring missing clinical values.
- Using sales-demo data in production reports or sending external provider calls during demo.

## Decisions and explicit defaults

- **Merged Excel cells:** reject the workbook when any merged range intersects the selected data sheet's used range; report its address. This avoids guessing which patient a merged value belongs to. The user chose this behavior.
- **Duplicates:** leave matching rows in a `needs_review` state and block commit until the clinic explicitly selects skip, keep as separate (with a reason), or associate to an existing clinic-owned imported patient. Never overwrite existing data automatically. The user chose review-first handling.
- **Rollback:** atomically roll back every unclaimed row in a batch. If any row has been claimed by an owner, block batch rollback; correct or remove individual records through audited append-only amendment/claim-revocation paths. The user chose this behavior.
- **Import boundary:** store unclaimed patients and their vaccine history in clinic-scoped import/patient tables. They are not ordinary `pets`, `medical_records` or `vaccinations`, and cannot appear in an owner passport. Claim creates or selects an owner-owned pet and copies eligible clinical facts into the passport only in the same transaction as explicit scoped sharing consent.
- **Library:** use ExcelJS for server-side `.xlsx` parsing after file-size/type validation; it can load workbook data from memory and exposes worksheet merge ranges. Implement a focused RFC 4180 CSV parser in the domain module, so CSV import does not add another dependency. ExcelJS is MIT licensed. The official documentation/repository used for this selection is listed in `docs/integrations.md` before dependency installation.
- **Formula/data safety:** reject formula cells and macro-enabled workbooks; import values only. Do not evaluate formulas or load external links. Escape/untrusted values in all previews and neutralize spreadsheet formulas in downloadable reports.
- **File bounds:** accept at most 10 MiB and one worksheet with at most 5,000 data rows. Do not persist the original file. Store only normalized staging fields needed for validation/commit. Detailed retention for private staging/contact data remains subject to counsel and the existing legal questions; implementation must not invent the final production retention schedule.
- **Date parsing:** accept ISO `YYYY-MM-DD`, Excel date cells, or one explicitly selected text format. If a string date is ambiguous, require format selection; invalid calendar dates are row errors. No best-effort date guessing.
- **Vaccine integrity:** every imported vaccination requires exact vaccine name, code, dose, lot and administration date, matching the existing medical-record entry contract. Catalog association is optional; unknown catalog terms are retained verbatim as clinic-entered facts and flagged for review, not inferred.
- **Duplicate scope:** evaluate exact normalized microchip, owner contact plus normalized pet name, and normalized pet name plus birth date only against this clinic's own records and the current batch. Never search or reveal other clinics' or unrelated owners' records. Contact normalization is server-side and masked in reports.
- **Owner invitations:** create an expiring, single-use claim invitation; send a localized email through the existing notification adapter when configured. For phone, use the existing SMS/Zalo stub and expose a clinic-only copy-link fallback until a real provider is separately approved. The recipient must authenticate/verify the invited contact before claim. Claim does not silently grant future access: it explicitly asks for the import history scope and grant lifetime.
- **Onboarding checklist:** derive completion from clinic profile, hours, services, at least one active team member, first committed import (or explicit “no data to import” choice), first booking link created/copied, and QR poster viewed/downloaded. Each step is resumable and audit-attributed.
- **QR poster:** generate a printable localized page with a PawCare-hosted booking URL. It contains no medical information and no third-party tracking token. Use a maintained QR encoder only after verifying official package docs/license and recording the addition in `docs/integrations.md`.
- **10-minute sales demo:** guided, timed story using clearly fictional data, deterministic import fixtures and mock adapters; actions can reset the scenario. Do not call live email, payment, AI, map, SMS, or push providers.
- **Time-to-first-value:** from clinic creation to the earlier of (a) first committed import with at least one valid patient, or (b) first confirmed booking through the clinic booking link. Persist only event type and timestamps (plus `is_demo`); report aggregate median/p75 by clinic cohort. Keep onboarding step completion as separate aggregate funnel counts. Exclude demo clinics and do not send personal/health data to an analytics vendor.

## Journey and screens

1. **Checklist:** clinic admin sees seven steps and current progress; can continue or reopen a completed non-destructive step. Setup actions are clinic-scoped and use existing verified clinic/staff roles.
2. **Upload:** select CSV or `.xlsx`, choose one worksheet, see accepted size/row limits, and receive clear file errors (unsupported type, bad encoding, corrupt workbook, merged cells, too many rows, formulas).
3. **Map columns:** show source-header-to-PawCare-field mappings with confidence and examples. Normalize Unicode accents, case, punctuation and Vietnamese `đ`; support synonyms such as `Tên thú cưng`, `Tên bé`, `Tên vật nuôi`, `Ngày sinh`, `Số chip`, `Mã microchip`, `SĐT chủ nuôi`, `Điện thoại`, `Tên vaccine`, `Ngày tiêm`, `Số lô`, and `Liều`. Allow manual correction and explicit date format.
4. **Validate:** show counts for valid, invalid, duplicate-review, and incomplete rows. Each row reports original line number, field, reason, safe masked values and an edit/re-map path. Preserve original source row number through filtering.
5. **Dry-run:** display exact patient and vaccination counts, duplicate decisions, unknown catalog values, owner invitations to be created, and a privacy note. Nothing is written to the clinical tables and no invitation is sent before explicit commit.
6. **Commit and batch:** create one clinic-scoped batch transactionally. Persist import rows, vaccine facts and audit events; idempotency prevents double-click/retry from duplicating a batch. Show result counts and allow rollback while the batch remains unclaimed.
7. **Owner claim:** clinic selects a row and sends/copies an invitation. Owner authenticates, verifies the invited email/phone, selects an existing owned pet or creates one, reviews imported history and chooses explicit clinic sharing scope/expiry. Reject expired, reused, revoked, or mismatched invitations. On success, materialize facts atomically and audit both clinic and owner actions.
8. **Booking setup:** create/copy the clinic booking URL and render the printable QR poster. The public page only reveals already approved public clinic fields.
9. **Sales demo:** show the checklist, import a fictional sample with a Vietnamese header, resolve one duplicate, commit/reset, claim a sample pet as a simulated owner, then copy/print the booking poster. A visible demo banner and reset button remain available throughout.

## Data and module boundaries

- Add the feature to the public clinic module interface and a dedicated import parser/validation submodule. The import parser does not import unrelated module internals.
- Add private tables for clinic onboarding progress/events, import batches, clinic-owned unclaimed patients, imported vaccinations, row validation/results, and expiring claim invitations. Keep `clinic_id` on every clinic-owned row and require it in all indexes and RLS scopes.
- Imported unclaimed rows are not inserted into `pets` or the owner passport. On claim, use one server-authorized transaction/RPC to create/link an owner pet, write immutable medical records and vaccination rows with source `import`, create the scoped access grant chosen by the owner, mark the invitation claimed and append audit entries.
- Batch rollback is a server-authorized transactional RPC: require clinic admin (or the explicitly delegated import capability), lock the batch, reject if any row has been claimed, mark the batch rolled back, make all imported clinic-patient rows inactive, and append a batch rollback event. Audit records contain IDs/counts/reason, never raw phone/email or clinical row values.
- Add unique/idempotency keys for batch commit, claim token hashes, and source-row identity. Add RLS tests for cross-clinic isolation, unclaimed owner invisibility, accepted claim visibility, invitation misuse, rollback and append-only audit.
- CSV export/validation reports neutralize formula-leading text. Do not expose storage paths, claim token values, raw contact values or another clinic's existence in API responses.

## Validation rules

- Patient name and species are required; supported species map to the existing enum and unknown values require a manual mapping or row correction.
- Vaccination name, code, dose, lot and administered date are all required. Vaccine date must be a valid real calendar date and not outside the documented supported range.
- Contact must be a valid normalized email or phone to create an invitation; it is optional for importing a clinic-private record. Mask contact details in errors and duplicate reports.
- Duplicate signals are explicit reasons, not a silent drop. The clinic resolves every duplicate before commit; keeping a separate duplicate requires a reason stored in audit metadata.
- Imported history must preserve source rows and exact entered values. No invented vet, manufacturer, diagnosis, dose or schedule.

## Privacy, security and reliability

- Check clinic membership and import capability on every server action/API and rely on RLS as a second boundary. No service-role key reaches a browser.
- Zod-validate file metadata, mapping config, duplicate decisions, import commit, rollback, invite and claim inputs.
- Validate extension, MIME, magic bytes, size and workbook structure; treat files/cell content as hostile. No general URL fetch, formula execution or external workbook reference resolution.
- Rate-limit imports, invitation sends, claims and rollbacks; use idempotency on commit, invite and claim.
- The original uploaded file remains in request memory only. Enforce row/column/cell count limits and return a safe parse error instead of a stack trace.
- Do not send owner invites before the clinic reviews the recipient and message. All invitation actions are audited. Claim tokens are random, hashed at rest, single-use, short-lived and revoked on batch rollback.
- UI has loading, empty, parse-error, validation-error, offline, commit-in-progress, success, and rollback-conflict states; mobile adapts at 360 px despite desktop-first clinic workspace. Import uses keyboard accessible table/grid controls and Vietnamese-first translations.

## Tests and acceptance criteria

- Unit: Vietnamese diacritics and `đ` normalization; header suggestions; quoted CSV/newlines/BOM; UTF-8; ambiguous/invalid dates; Excel serial dates; formulas; merged cells; corrupt/oversized/multi-sheet workbook; maximum rows/cells; exact required vaccine fields; duplicate signals and decisions; formula injection neutralization.
- Database/integration: batch dry-run stores only staging; commit is all-or-nothing and idempotent; rollback deactivates every unclaimed row and is idempotent; rollback is rejected after any claim; cross-clinic isolation; unclaimed imported rows invisible to owners and other clinics; accepted claim links only the invited pet and selected scopes; replayed/expired/mismatched invitation rejected; every import/claim/rollback action appends audit rows.
- E2E (390 px mobile owner claim; clinic desktop): import Vietnamese fixture with a bad date, resolve errors and duplicate, dry-run then commit; claim with an invited account and confirm consent; attempt rollback after claim and see a clear blocked state; complete clinic checklist, generate booking URL and print-ready QR; run/reset 10-minute fictional demo.
- Analytics: deterministic fixture asserts time-to-first-value uses only first eligible event; demo excluded; no contact/pet/medical fields in event schema or logs.
- A11y/quality: `npm run lint`, `npm run typecheck`, unit coverage for pure parsing/validation logic, RLS tests, Playwright, axe for checklist/import/claim/QR pages, and visual snapshot for import validation state.

## Risks

1. **Legacy data is inconsistent:** ambiguous date formats and unknown vaccine values are common. Mitigation: explicit date format, exact-field errors, clinic correction, no guessing.
2. **Duplicate false positives:** pets can share names/households. Mitigation: multi-signal reasons, masked suggestions, clinic resolution, no automatic merge.
3. **Privacy breach across clinics or owners:** unclaimed rows contain contact and health data. Mitigation: separate clinic-owned schema/RLS, narrow API responses, negative RLS tests and no normal owner-table insertion before claim.
4. **Import/rollback conflicts with immutable medical records:** mitigate by keeping unclaimed rows outside the passport and allowing whole-batch rollback only before claim.
5. **Email/SMS availability:** email depends on existing Resend configuration and SMS/Zalo remains a stub. Mitigation: show delivery state and clinic-only copy-link fallback; do not claim an invite was delivered unless adapter confirms it.

## Builder notes / items needing confirmation

- The user approved rejecting merged cells, keeping duplicates for clinic review, and blocking whole-batch rollback after any owner claim.
- Default import is `.csv` and `.xlsx` only; `.xls` is deliberately unsupported.
- This design does not decide legal consent, retention, or invitation rules. Add any newly identified questions to `docs/legal-open-questions.md` without answering them.
- Before implementation, append official ExcelJS and QR library research to `docs/integrations.md`, then install only the dependency needed by the approved implementation.
