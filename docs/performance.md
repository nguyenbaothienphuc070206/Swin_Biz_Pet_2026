# Performance, offline and SEO

## Budgets

CI runs Chromium at a 390 × 844 mobile viewport, 4× CPU throttling and a simulated 150 ms / 1.6 Mbps down / 750 Kbps up cellular connection. `scripts/performance-budget.mjs` measures LCP, layout shift, event timing for a real interaction, and transferred same-origin route JavaScript on `/vi`, `/en`, both clinic directories and `/vi/demo`.

| Metric | CI limit |
|---|---:|
| LCP | ≤ 2,500 ms |
| INP proxy (worst observed browser Event Timing interaction in this lab run) | ≤ 200 ms |
| CLS | ≤ 0.10 |
| Initial route JS | 240 KB for public landing routes; 280 KB for clinic directories; 380 KB for the interactive demo shell |

The lab event-duration measure is an INP proxy; Chrome's Event Timing entries below its 16 ms observation floor are not exposed, so a `0 ms` result means no observed interaction exceeded that floor. Field INP requires real-user monitoring and is not claimed by this harness. CI is a regression gate and does not guarantee a particular handset/network result.

## Before/after measurements

| Measure | Before this pass | After this pass |
|---|---:|---:|
| All built static JS/CSS chunks, raw | 2,950,144 bytes total; 2,818,043 bytes JS and 132,101 bytes CSS | 2,980,691 bytes total; 2,844,867 bytes JS and 135,824 bytes CSS |
| LCP / INP proxy / CLS under the requested profile | `/vi`: 1,268 ms / 120 ms / 0.002; `/en`: 1,216 ms / 56 ms / 0.001; `/vi/clinics`: 936 ms / 48 ms / 0; `/vi/demo`: 1,068 ms / 376 ms / 0.002 | `/vi`: 1,348 ms / 64 ms / 0; `/en`: 1,156 ms / 96 ms / 0; `/vi/clinics`: 944 ms / 0 ms observed / 0; `/en/clinics`: 936 ms / 0 ms observed / 0; `/vi/demo`: 1,040 ms / 64 ms / 0.002 |
| Transferred initial route JavaScript | Not budgeted | `/vi` 152 KB; `/en` 152 KB; clinic directories 152 KB; `/vi/demo` 153 KB |
| Per-route JS budgets | None | 240 KB landing; 280 KB clinic directory; 380 KB interactive demo shell |
| Image work | Community images uploaded at original size; no lazy loading | Community photo uploads compressed to max 1,200 px at JPEG quality 0.78; feed/moderation images lazy-load |
| Clinic and passport lookup indexes | Existing baseline indexes only | Added active grant, owner appointment, clinic SOS inbox, vaccination due, pet health, plan task and public geospatial indexes |

Raw chunk totals are build artifacts, not transfer-size budgets; the CI script uses browser transfer sizes. Do not compare those measures as if they were the same metric.

## PWA behavior

- The App Router manifest and 192/512 PNG icons provide installation metadata; `/sw.js` precaches only the offline shell, SVG icon and its script. It uses network-first page navigation with an offline document fallback, and caches same-origin Next static assets. It never caches `/api`, auth or personalized HTML responses.
- CI verifies the installable manifest and confirms `/offline.html` is present in Cache Storage after service-worker activation. The headless Chromium offline network emulation did not consistently force navigation fetch failures, so the CI check does not claim to exercise the navigation fallback end to end.
- Owners explicitly choose “Save for offline use”. The authenticated snapshot includes their pets, allergies, active conditions, vaccination/record timeline and approved shared care-plan tasks. It is held in IndexedDB in that browser, can be cleared from the owner screen, and is cleared on Supabase sign-out. The offline page renders text via `textContent` and never exposes precise owner address/location.
- Clinic vaccination entries can be stored in an IndexedDB outbox and sent by Background Sync where supported, or on reconnection otherwise. A stable idempotency UUID prevents network retries from duplicating records. Authorization/grant conflicts are retained with a visible conflict state for clinic review; records are not silently discarded or overwritten.
- Offline IndexedDB is local plaintext browser storage, not encrypted. Owners should use this only on a trusted device and clear the offline copy on shared devices. Browser storage can be evicted; it is a convenience copy, not the source of truth. SOS dispatch and booking are not promised offline.

## Query plan review

`supabase/benchmarks/hot-queries.sql` contains 10 `EXPLAIN (ANALYZE, BUFFERS)` queries for clinic radius search, SOS clinic candidates, owner pet list, grant check, passport timeline, due vaccinations, owner appointments, clinic inbox, clinic SOS inbox, and approved care-plan tasks. CI's seeded database should run this after migrations and upload its plan output. This workspace lacks Supabase CLI/DB, so actual plans, row counts and timings have not been captured here; the following are index changes based on those predicates and existing application query shapes, not a claim that measured plans improved:

- Keep the existing full GIST index on clinic geography; add a partial public verified/published/non-demo GIST index for directory searches.
- Add clinic-first active grant lookup, owner/start appointment lookup, clinic/pinged SOS dispatch lookup, due-date vaccination lookup, pet allergy/active-condition lookup, clinic/pet/time medical-record lookup, and pet/status/date care-task lookup.
- Existing indexes retained for pet owner list, clinic appointment schedule, SOS location, and queued notification dispatch.

Inspect the uploaded plan artifact for sequential scans on large tables and compare `actual rows`, `loops`, `Buffers`, and execution time using realistic staging volume before adding more indexes. Indexes add storage and write cost; do not add an index solely because a demo-seed query chooses a sequential scan.

## SEO

Public clinic directory and profile routes expose only verified, published, non-demo clinics. Profile pages include canonical URLs, vi/en alternate links, localized metadata, and JSON-LD with `LocalBusiness` plus Schema.org `VeterinaryCare`. Sitemap contains only public marketing/directory pages and eligible clinics; configure `NEXT_PUBLIC_SITE_URL` to the production origin for canonical and sitemap URLs. Google treats structured data as a description, not a ranking guarantee; its [Local Business guidance](https://developers.google.com/search/docs/appearance/structured-data/local-business) asks for accurate business details. `VeterinaryCare` is a Schema.org subtype for a vet's office ([Schema.org](https://www.schema.org/VeterinaryCare)).

Implementation follows the installed Next.js 16.4.2 guides for [PWA](../node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md), [offline support](../node_modules/next/dist/docs/01-app/02-guides/offline-support.md), [lazy loading](../node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md), [metadata](../node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md), [sitemap](../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md), and [manifest](../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md).
