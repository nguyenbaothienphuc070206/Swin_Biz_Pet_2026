# Clinic workspace design

## Intent

Give clinic staff one fast desktop-first workspace for today's work, patient context, schedule, services, team, reviews, retention metrics, reminders, and PawCare commission accounting. Vets should spend time with animals rather than navigating software.

## Goals

- Today view combines appointments, SOS inbox, and walk-ins with clear priorities and one-click actions.
- Patient search opens an authorized patient view and reuses the Digital Health Passport quick-entry components rather than duplicating medical forms.
- Clinic staff can manage schedule, team/roles, services/prices, and reviews/replies.
- A retention/performance dashboard shows new vs returning patients, rebooking rate, no-show rate, average SOS response time, PawCare-attributed revenue, and vaccinations due/overdue.
- Clinic can issue consent-aware vaccination reminder campaigns with one action; only records/pets with current clinic grant and valid reminder consent are eligible.
- Commission ledger clearly lists amounts owed for completed bookings and SOS routing based on contract terms. Invoice PDF generation and lifecycle statuses are included.
- CSV export is available for authorized operational/financial data; exports are scoped, logged, and safe from spreadsheet formula injection.
- Desktop-first layout works on tablets with large touch targets. Keyboard shortcuts and accessible table alternatives support time-poor staff and screen reader users.
- Tests cover in-clinic role permissions, metric calculations with fixtures, and invoice totals.

## Non-goals

- General ledger/accounting, tax filing, payment collection, payroll, or financial advice.
- Setting commission rates or clinic prices on behalf of a clinic/platform without an approved contract or authorized user action.
- Displaying patient medical data to clinic staff without a current matching owner grant.
- Bulk messaging owners who have not consented or whose consent/access is expired or revoked.
- Replacing the owner Passport module's clinical entry logic or duplicating its records.

## Constraints and current repository state

- Follow the Next.js modular monolith and existing clinic shell. Clinic workspace code belongs to clinic-facing modules and calls public interfaces from clinics, booking, SOS, passport, reviews, notifications, and billing.
- The current database only has basic clinic identity, staff membership, pets, and identity grants; appointments, SOS, medical records, vaccines, reviews, invoices, and commissions remain pending schema work.
- Every table uses RLS and each operation also checks server-side clinic membership and capability. Membership in one clinic never grants access to another clinic's data.
- Current top-level roles are `clinic_staff` and `clinic_admin`; use clinic-scoped capabilities for vet, receptionist, and clinic admin duties. Do not trust role values from user-editable profile metadata.
- All operational measures must have visible definitions, date range, timezone, and data completeness. Do not label estimates as actual revenue.
- No fake prices, commissions, services, reviews, revenue, or clinic/staff data in production. All demo fixtures are flagged fictional.
- Use locale-aware VND formatting and vi/en strings. All user-visible strings are localized.

## Workspace information architecture

- Primary desktop navigation: Today, Patients, Schedule, Services, Team, Reviews, Performance, and Finance. Keep SOS inbox visible/urgent from Today and as a persistent route/status indicator.
- Tablet layout preserves the same actions with a collapsible sidebar and large touch-friendly controls.
- Today default is current clinic-local date and displays appointments (time, pet, service, owner, status), SOS inbox (urgency/status/elapsed time), and walk-ins. A quick-action row supports check-in, complete/no-show, accept/decline SOS, and create walk-in.
- Patient search supports pet name, owner contact only where authorized, microchip, and record identifiers. Search results show minimum identifying information; sensitive records load only after access checks and grant audit.
- Patient view opens with safety summary and current consent state, then timeline. Clinic's quick-entry controls are shared with Passport public interfaces.
- Schedule offers day/week views, resource/staff filters, availability exceptions, and conflict explanation. Any editing of clinic hours/staff schedules is scoped to authorized clinic admins or delegated schedulers.
- Services/pricing supports active/inactive, duration, buffer, and displayed price. Changes are versioned/audited and apply prospectively; existing bookings retain a price/policy snapshot.
- Team view invites/removes clinic staff and assigns clinic-scoped capabilities. Remove or downgrade takes effect promptly and is audit logged.
- Reviews view separates eligible response actions, posted replies, and reported/moderation states. Clinic replies cannot edit owner content/rating.

## Clinic-scoped role capabilities

Proposed least-privilege defaults:

| Capability | Vet | Receptionist | Clinic admin |
| --- | --- | --- | --- |
| View Today appointments | yes | yes | yes |
| Manage booking/check-in/walk-in | yes | yes | yes |
| Accept/decline SOS | yes, if on-call | yes, if delegated | yes |
| View passport/medical details | only with active owner grant | no by default; explicit delegation and grant required | no by default; grant required |
| Create/edit clinical record | yes, append-only/amendment model | no | only if also assigned vet capability |
| Manage availability/services/prices | no by default | no by default | yes |
| Manage team and clinic settings | no | no | yes |
| Reply to reviews | yes | delegated | yes |
| View commission ledger/invoices | no | no | yes; read-only finance capability can be delegated |
| Send reminder campaigns | yes, if granted | delegated campaign capability | yes |

The exact matrix is configuration-backed and can be narrowed. Clinical access always additionally requires owner consent where required by the Passport model.

## Dashboard metric definitions

Show definition/tooltips and the selected date range next to every metric. Proposed initial definitions:

- **New patients**: unique pets whose first completed appointment at this clinic falls in the selected range.
- **Returning patients**: unique pets with a completed appointment in range and at least one earlier completed appointment at this clinic.
- **Rebooking rate**: completed appointments in range whose pet has another confirmed appointment with the clinic within 30 days after completion, divided by completed appointments in range. Report denominator and suppress when denominator is zero.
- **No-show rate**: appointments scheduled to start in range and ultimately marked no-show divided by all appointments scheduled to start in range, excluding canceled/rescheduled records; show counts and status completeness.
- **Average SOS response time**: mean seconds from SOS request creation to first clinic acceptance for requests accepted by this clinic in range. Also show sample count; label clearly and exclude unmatched/canceled requests from denominator.
- **PawCare-attributed revenue**: gross value of completed appointments/referrals attributed through PawCare in range, separated from commission owed and clinic-wide revenue. Only show when booking value data and attribution rules are present; otherwise show “not enough data.”
- **Vaccinations due/overdue**: due/overdue passport vaccine entries visible under an active grant and reminder consent. Display sync/as-of time and do not infer a schedule if the record lacks a due date.

Charts include a data table alternative with the same values, labels, and date range. Metric fixtures test inclusions, exclusions, zero denominators, missing data, timezone boundaries, and rounding.

## Consent-aware reminder campaigns

1. Staff chooses due-vaccine cohort and channel from enabled notification adapters.
2. Server filters to active clinic relationship, current record access grant, valid owner reminder consent for that purpose/channel, due/overdue status, and no suppression/previous-send duplicate.
3. Preview shows eligible count, excluded count with reason categories (no consent, grant expired, data incomplete, duplicate/suppressed), localized message template, and send schedule.
4. Authorized user confirms. Campaign and per-recipient delivery records are persisted idempotently; provider result updates delivery state.
5. Owner can opt out; new sends stop promptly. Do not include sensitive diagnosis/history in message body or previews sent to unintended channels.

No message is sent just because a clinic can see a record. Legal basis, message content and channel opt-out rules remain for counsel.

## Commission ledger and invoices

- Keep clinic service pricing, booking transaction amounts, commission contract terms, ledger entries, invoices, and payment status as separate records.
- Commission terms are versioned contract data with effective dates, basis (fixed or percentage), scope (booking/SOS routing), currency, and authorized approver. Never hard-code an amount/rate or backdate a term silently.
- At a qualifying event, calculate the commission from the applicable contract snapshot and persist an immutable ledger entry with source appointment/SOS id, gross basis, rate/fixed amount snapshot, currency, calculation version, and reversal reference.
- Corrections use a reversal/adjustment ledger entry; no in-place edits to posted ledger items. Reconcile rounding at invoice total using integer minor units/defined currency precision.
- Invoice generation groups eligible posted ledger items by clinic and billing period, stores a PDF snapshot and immutable line-item snapshot, then moves through explicit statuses such as draft, issued, partially paid, paid, void, or disputed. Allowed transitions are audited.
- PDF clearly identifies PawCare commission payable, source bookings/SOS events, calculation basis, period, invoice date/number, currency, totals, and current status. It is a platform-issued statement, not a tax invoice unless counsel confirms that status and required fields.
- CSV export has date range and filters, explicit generated-at metadata, permission checks, audit logging, and formula injection neutralization for text fields.

## Security and audit

- All records are tenant-scoped by clinic id and RLS-tested. Cross-clinic reads/writes fail even when a user has membership in another clinic.
- Sensitive patient searches, record views/edits, reminders, team changes, price/contract changes, exports, invoice issue/void, and ledger adjustments write audit events.
- Reminder recipient details and exports are private; signed files expire and are checked against clinic/finance role.
- Financial ledgers and issued invoice snapshots are append-only; corrections create reversal or void events with actor, reason, and timestamp.
- SOS and passport access requires specific capability plus applicable owner consent; dashboard aggregates may use de-identified counts but cannot bypass RLS with an unscoped query.

## UX and accessibility

- Desktop-first, dense but calm information hierarchy. Today uses a compact queue; primary vet actions take one click, and keyboard navigation covers all actions.
- Keyboard shortcuts are discoverable, customizable/disableable, avoid overriding text inputs, and require confirmation for destructive/irreversible actions.
- Minimum 44px touch targets for tablet actions, visible focus ring, skip links, semantic headings, screen-reader status announcements, reduced motion, and no color-only status.
- Loading, empty, error, and offline states on every view. Offline state never claims an appointment, SOS, invoice, or reminder action was persisted until server confirms it.
- Charts render equivalent accessible tables and CSV exports use the same metric definitions.

## Tests and acceptance criteria

- Clinic-scoped permission tests cover each capability and prove a staff member cannot access another clinic's patients, appointments, reviews, exports, contracts, or invoices.
- Metric unit tests use fictional fixtures for new/returning, rebooking, no-show, SOS response, attributed revenue, vaccine due/overdue, missing data, and date/timezone boundaries.
- Invoice tests cover contract effective-date selection, fixed and percentage basis, currency precision/rounding, reversals, partial payment, status transitions, and PDF/line-item total equality.
- Reminder tests cover consent/grant filters, opt-out, duplicate prevention, preview counts, and dispatch failure/retry.
- CSV tests verify authorization, stable columns, escaping, and formula injection neutralization.
- E2E covers Today queue actions, team role denial, chart table alternative, reminder preview, commission invoice generation, and cancellation/void where permitted.
- Accessibility checks cover keyboard-only paths, large tablet targets, table alternatives, and chart labels.

## Proposed defaults to review

- Commission terms are configured by an authorized platform finance role from signed commercial terms; clinic admins can view but cannot change the payable rate. No amounts are invented in seed/demo outside explicitly fictional fixtures.
- Separate read-only finance capability can be delegated inside a clinic without granting patient clinical access.
- Reminder campaigns require both current record grant and purpose/channel-specific owner consent, even if the clinic relationship is active.
- Invoices are PawCare-issued commission statements; any tax-invoice treatment is blocked pending counsel review.
- Dashboard attribution definitions above are initial product definitions and should be shown in the UI; missing source data produces an explicit empty state, not a fabricated metric.

## Builder check

Self-review: all requested workspace views and metrics are defined. Role permissions are clinic-scoped and least-privilege. Clinical record access remains consent-bound. Contract-derived commission calculations are snapshotted and reversible only through append-only adjustments. Reminder sending and invoice/tax language are explicitly gated by consent and legal review. No real fee, hotline, clinic, or financial data is invented.
