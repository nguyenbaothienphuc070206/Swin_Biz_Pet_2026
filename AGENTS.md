# PawCare: instructions for coding agents

## Product
PawCare is a data-driven pet care platform for Vietnam. It connects pet owners (B2C) with veterinary clinics (B2B) through six modules: Digital Health Passport, Smart Booking and Clinic Network, 24/7 SOS and Tele-Triage, vet-verified AI Care Plans, health-based Product Recommendations (affiliate), and a Community and Rescue forum.
Context: Swin-Biz Rockstar 2026 (Gen Z Economy / Technology track). A polished, working, demo-ready product beats breadth. Depth order: Passport, Booking and SOS first (P0), then the rest.

## Roles
owner, clinic_staff (vet, receptionist), clinic_admin, platform_admin. Owners are Gen Z and mobile-first. Vets are time-poor: minimum clicks.

## Non-negotiable principles
1. AI never diagnoses, prescribes, sets urgency or decides alone. Rules decide, AI drafts or explains, a vet verifies anything medical before it is shown as official.
2. The product does triage and routing only. Never claim diagnosis or treatment. Show a plain-language disclaimer on every SOS and AI screen.
3. Privacy by design: minimum data, explicit consent for sharing a pet record with a clinic, every record access audit-logged, owners can revoke access, export and delete. Owner contact data is personal data under Vietnam's Law on Personal Data Protection (91/2025/QH15) and Decree 356/2025/ND-CP. Put every open legal question in docs/legal-open-questions.md. Do not decide legal questions yourself.
4. Security by default: Row Level Security on every table, server-side authorization on every action, Zod validation on every input, no secrets in the client or the repo, rate limits on sensitive endpoints.
5. Never invent third-party APIs, prices, regulations or statistics. Read the official documentation first, summarize it in docs/integrations.md, then code. If you cannot verify something, stop and ask me.
6. All seed and demo data is fictional and flagged as such. Fake clinics, vets, reviews or donations must never appear as real in any production path.

## Stack (change only through an ADR in docs/adr/)
Next.js (current stable, App Router) with TypeScript strict, Tailwind, shadcn/ui, Framer Motion; Supabase (Postgres with PostGIS, Auth, RLS, Storage, Realtime); Zod, TanStack Query, react-hook-form; next-intl (vi default, en); Vitest, Playwright, axe; Vercel; GitHub Actions.
Vendors sit behind adapters so they can be swapped and mocked: AI, maps, video, payments, notifications. AI keys live on the server only.

## Engineering rules
- Modular monolith. One module per domain: passport, clinics, booking, sos, triage, careplans, commerce, community, billing, notifications, admin, ai. No cross-module imports except through a module's public interface.
- Vertical slices: UI, server logic, database and tests together. Small commits with clear messages.
- Write tests first for logic with business rules (ranking, slots, rules engines, entitlements). RLS policies have tests.
- No hard-coded user-facing strings: use i18n (Vietnamese first, English second).
- Accessibility: WCAG 2.1 AA, keyboard and screen reader support, reduced motion respected.
- Every screen has loading, empty, error and offline states.
- Prefer boring, proven solutions. No new dependency without a reason written in the commit message.

## Definition of done
The feature works end to end on a 360px phone and on desktop; tests pass (unit, RLS, E2E for the happy path); no console errors; axe is clean; strings are translated; docs are updated; no TODO is left without an entry in docs/backlog.md.

## Workflow
Work on one prompt at a time. Before coding, state your plan in 5 lines or fewer and name the risks. At the end of every task report: files changed, tests run with results, decisions taken, risks left, and what you need from me. Update docs/progress.md each time. Ask me before any architecture-level change, new vendor, or legal-sensitive decision.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
