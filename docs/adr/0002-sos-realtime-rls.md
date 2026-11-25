# ADR 0002: Use Postgres Changes for private SOS updates

- Status: Accepted, 2026-10-27

## Context

Owners need live request status. Clinic staff need new addressed dispatches. SOS exact location and contact must not be visible to non-accepting clinics.

## Decision

Add `sos_requests` and `sos_dispatches` to `supabase_realtime` and use Postgres Changes. Owners' request SELECT policy filters by `auth.uid()`. Clinic dispatch SELECT policy filters by clinic membership; the request table has no clinic read policy. Keep five-second polling as a fallback and keep database transitions authoritative. Guests continue polling through their capability-token endpoint.

## Consequences

- Two-role isolation is checked in `supabase/tests/sos_realtime_isolation.test.sql`.
- Clinic subscriptions can only receive their own dispatch rows through RLS.
- Supabase recommends Broadcast for larger-scale workloads; revisit if event throughput, change fan-out or RLS costs become material.

## Official references

- [Supabase database change subscriptions](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes)
- [Supabase Realtime authorization](https://supabase.com/docs/guides/realtime/authorization)
