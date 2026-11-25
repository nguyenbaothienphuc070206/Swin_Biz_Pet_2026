# ADR 0001: Schedule SOS round advancement in Postgres

- Status: Accepted, 2026-10-27
- Decision owners: Product and engineering

## Context

Vercel Cron can be limited to once per day on Hobby, runs only against production deployments, and can invoke more than once. SOS rounds need durable advancement without an open browser.

## Decision

Use the existing Supabase Postgres Cron extension (`pg_cron`) to run `advance_sos_rounds()` every second. The function locks due requests, advances state conditionally, and is safe to run repeatedly. A separate daily job reduces closed SOS locations after retention.

## Cost and service target

Supabase Cron has no separate per-job fee. The SOS scheduler runs on the existing database compute, which Supabase bills by project and size. At one invocation per second it executes about 2,592,000 times per 30-day month. Current Supabase documentation lists Micro compute at about $10/month before included credits; the scheduler's share cannot be priced separately from the existing database workload.

The one-second cadence is selected to target an observed five-second deadline-to-advance objective. Supabase documents second-level schedules on qualifying Postgres versions but does not publish a hard five-second execution guarantee. Production must monitor actual lag and database load.

## Consequences

- Round advancement survives owner/clinic browsers closing and process restarts.
- Vercel cron frequency and deployment lifecycle do not gate SOS.
- The database receives about 2.59 million scheduler invocations each 30-day month; measure query time and compute before increasing SOS volume.
- A five-second timing bound is not contractually guaranteed by the scheduler documentation.

## Official references

- [Supabase Cron](https://supabase.com/docs/guides/cron)
- [Supabase Cron quickstart](https://supabase.com/docs/guides/cron/quickstart)
- [Supabase compute pricing](https://supabase.com/docs/guides/platform/manage-your-usage/compute)
- [Vercel Cron pricing and timing](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Vercel cron idempotency and duplicate execution](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
