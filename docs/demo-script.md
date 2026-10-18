# PawCare demo guide

All records below are fictional and local to the demo session. Scenario buttons load deterministic mock states. They do not create database records, send notifications, contact clinics, charge payments, call an AI provider, request GPS, or load map tiles. Use the persistent fictional-data banner as the first disclosure. The **Reset demo** control clears scenario and interaction state in the current browser session.

## Five-minute live demo

| Time | Action | What to say/show |
|---|---|---|
| 0:00–0:30 | Open `/vi/demo`; point to the fictional-data banner and scenario controls. | “This is a fully simulated product walkthrough. The scenarios use prepared data and local mock interactions.” |
| 0:30–1:20 | Start **Emergency transfer passport**; tap **Create passport and share with clinic**. Show the grant and receiving-clinic panel. | The owner can share a scoped passport for a transfer; allergies and active medication are placed first for the receiving clinic. The URL is a mock label, not a usable bearer link. |
| 1:20–2:20 | Start **11 p.m. SOS and tele-triage**. Show the 23:00 time and 5 km radius, tap accept clinic, then open mock triage. | Rules-based routing is represented with a deterministic clinic at 4.2 km. No actual dispatch, clinic ping, ETA, video or chat service is contacted. |
| 2:20–3:10 | Start **Scan vaccine and view clinic performance**. Show the prefilled demo barcode fields, save the record, then open Clinic Today/performance. | This is the catalog-match and quick-entry interaction. Dashboard figures are illustrative fictional values, not pilot outcomes. |
| 3:10–3:50 | Start **Vet approves AI-drafted care plan**. Explain the draft label and tap vet approve. | The deterministic mock supplies draft wording only; the vet action controls the verified state. No model is called. |
| 3:50–4:30 | Start **Rescue case and transparent ledger**. Read the estimate, verified receipt and remainder. | A partner verifies the fictional case. Donors pay the clinic/partner directly; PawCare does not hold funds. |
| 4:30–5:00 | Open **Planned pilot KPIs** and point out “planned · no live results”; optionally reset. | Show intended measurement definitions without implying observed results. End with the fictional-data disclosure. |

## Ten-minute video pitch

| Time | Segment | Narration / capture notes |
|---|---|---|
| 0:00–0:45 | Product framing | Introduce PawCare as a Vietnam-focused care platform connecting owners and clinics. Keep claims to implemented/demo-visible behaviors. Show fictional banner. |
| 0:45–2:30 | Passport and emergency transfer | Run scenario 1. Pause on allergies and medication-first receiving view; show share/revoke controls. Explain that the link shown is a mock and that this demo does not persist or transmit health data. |
| 2:30–4:30 | SOS at night | Run scenario 2. Show time, 5 km radius, clinic accept, and mock tele-triage state. Repeat “triage and routing, not diagnosis”; state clearly that clinic dispatch and communications are not live. |
| 4:30–6:00 | Clinic workflow | Run scenario 3, save the prefilled vaccine entry, and show the clinic dashboard with its demo label. Do not describe illustrative dashboard values as pilot measurements. |
| 6:00–7:15 | Vet-reviewed care plan | Run scenario 4 from Draft to Vet-verified. Explain that a deterministic mock drafts wording and a vet must approve. |
| 7:15–8:30 | Rescue transparency | Run scenario 5. Trace estimate → receipt → remaining estimate. State that donors pay verified partners directly and PawCare holds no funds in this MVP. |
| 8:30–9:30 | Pilot measurement | Show the read-only KPI page; describe definitions, privacy limits and the planned status. Do not invent baseline or target values. |
| 9:30–10:00 | Close | Return to demo home, repeat that all records are fictional, and outline what a real pilot would validate. |

## Record-ready state and reset

Start from `/vi/demo` or `/en/demo`, open the interactive demo, and use one scenario button immediately before its segment. Each button reapplies its deterministic seed state, so the sequence is repeatable. For a clean recording, refresh the route and choose the required scenario; **Reset demo** clears share, SOS, booking, care-plan, vaccine-form, role-selector, and reminder-preview state without touching persisted application data. The demo page is excluded from indexing.

Prepared seed states (all marked fictional in code):

- Transfer: Miso, chicken allergy, `DEMO-MED-001` and a mock receiving clinic; the consent/share state activates only after the create-and-share action.
- Late SOS: 23:00, Quận 1 fixed demo location, 5 km radius, clinic 4.2 km away, 12-minute illustrative ETA.
- Clinic entry: `DEMO-VAX-CAT-01`, demo name/dose/lot/date and deterministic clinic dashboard fixture.
- Care plan: unapproved draft from `pawcare-deterministic-mock`; vet approval is an in-session UI state only.
- Rescue: fictional partner-verified case, VND 2,400,000 estimate, VND 1,800,000 receipt and VND 600,000 remaining; no funds held by PawCare.

## If the network fails

1. Use the already-loaded page and start scenarios; all scenario data and interactions are local. No network is needed for scenario switching, SOS accept/triage simulation, care-plan approval or rescue ledger display.
2. If initial navigation fails, use the prepared local recording build or capture the presentation from these preloaded screens. Do not substitute real customer data, clinic accounts, or live SOS/payment integrations.
3. If the demo route loads but a lazily loaded scanner chunk fails, describe the vaccine fixture and continue to the prefilled quick-entry form; do not request camera permissions during the pitch.
4. The map toggle is a static local placeholder and intentionally does not fetch map tiles. Explain that the location list is fictional.
5. If video playback is needed, use a previously recorded fictional-data run. If recording has not yet been made, show the local storyboard in this guide rather than implying a successful live service.
6. Use the read-only KPI page only when it loads. Its definitions are also documented in `docs/metrics.md`; no live KPI values should be quoted.
