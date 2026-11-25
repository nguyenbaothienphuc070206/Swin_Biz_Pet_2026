# ADR 0006: Reduce precise SOS location after closure

- Status: Accepted as an implementation default; legal review pending, 2026-10-27

## Context

Precise location is needed to find clinics and route an accepted case. It should not remain precise in SOS history indefinitely.

## Decision

Add `closed_at` and retain exact geography until `closed_at + sos_privacy_config.location_retention_days`. The database default is 30 days. A daily job converts the point to an approximately 1 km snapped area and clears the exact point. The retention value is configurable in the database. The consent screen and privacy policy state the behavior and identify the default as pending counsel confirmation.

## Consequences

- Searchable SOS history retains only the coarse area after the retention window.
- An accepted case closes when the clinic marks arrival; canceled, expired and no-clinic cases close when their terminal status is written.
- Counsel must confirm lawful basis, retention duration, location precision, exceptions, and required notices before production policy is treated as final.

## Official references

- [Supabase Cron](https://supabase.com/docs/guides/cron)
- Product requirement: legal counsel review recorded in `docs/legal-open-questions.md`.
