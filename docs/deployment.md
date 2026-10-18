# CI, deployment and migration operations

## Required GitHub setup

Create GitHub Environments named `preview`, `staging` and `production`.

Create a Vercel custom environment named `staging` with its own Supabase staging variables before using the staging workflow. Vercel custom environments are available on Pro and Enterprise plans; if the project plan does not support them, use a separately configured staging Vercel project and its own `VERCEL_PROJECT_ID`.

- `preview`: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Configure preview environment variables in Vercel, including Supabase preview credentials.
- `staging`: the same Vercel secrets plus `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`; environment variable `SUPABASE_PROJECT_REF` must point only to staging.
- `production`: the same secrets with production refs/credentials; configure `PRODUCTION_BACKUP_CONFIRMED=true` only after the release owner confirms a current recoverable backup/PITR and restore procedure. Require reviewer approval and restrict deployment branches to `main`.

In repository Rulesets/branch protection, protect `main` and `staging`: require pull requests, at least one independent approval, dismiss stale approvals, require the latest push to be approved, require status checks `PawCare quality / checks`, `PawCare quality / visual-regression`, `PawCare quality / secret-scan`, and `CodeQL / Analyze TypeScript`, block force pushes/deletion, and require conversation resolution. GitHub plan/organization settings determine which protection controls are available; workflow files alone cannot turn these repository settings on.

Vercel GitHub integration may also create previews automatically. This repository workflow explicitly deploys and runs demo E2E for same-repository pull requests. Fork pull requests do not receive deployment secrets and therefore do not deploy previews.

## CI gates

Pull requests run ESLint, TypeScript, Vitest critical-module coverage, AI golden-set evaluations (deterministic mock unless CI provider secrets are explicitly configured), production dependency audit, Supabase migrations and pgTAP, RLS completeness, hot-query EXPLAIN artifact, SBOM, production build, API/demo E2E, axe, mobile 4G/browser budgets, Lighthouse CI, Gitleaks, and visual snapshots. CodeQL runs on PRs, protected branch pushes and weekly. Dependabot opens weekly npm and GitHub Actions update PRs, including development dependencies. The ESLint 9 / Next.js flat config currently reports a capped baseline of 41 legacy warnings; errors fail immediately and the warning cap prevents new warning growth. npm's current audit database reports an unpatched high-severity `braces` issue through the development-only Next ESLint plugin, so CI's `npm audit --omit=dev` gates shipped dependencies while Dependabot tracks that toolchain advisory.

## Staging and production deployment

Merge reviewed work to `staging` first. The deployment workflow links the staging Supabase project, runs `supabase db push --dry-run --linked`, then applies pending migrations with `supabase db push --linked` (without `--include-seed`), and deploys to the Vercel `staging` custom environment. Verify the deployed health endpoint and demo journeys before promoting the same reviewed commit to `main`.

The `main` deployment waits at the protected GitHub `production` environment. After an authorized reviewer approves and the backup variable is confirmed, it previews migrations, applies forward migrations, builds the production Vercel artifact and deploys it. Additive/expand-contract migrations are required: deploy compatible schema first, deploy code, backfill in bounded jobs, then remove obsolete schema only in a later release.

## Migration safety and recovery

- CI applies every migration from an empty local Supabase database and runs pgTAP/RLS checks before merge.
- Review generated migration SQL for locks, table rewrites, broad updates, RLS grants and destructive statements. Production requires a recent backup/PITR check and a named reviewer.
- Remote deploy uses `db push --dry-run` followed by `db push`; never use `db reset --linked` on staging with valuable data or production. Never use `--include-seed` on production.
- Migrations are forward-only. A failed migration stops deployment. Do not hand-edit migration history to make it appear applied. Write a corrective migration for schema/data errors.
- For data corruption, pause writes to the affected module, preserve the current state, and follow the Supabase restore/PITR process against a recovery target first. Validate integrity and RLS before any approved cutover. Restore can discard writes after the restore point, so the incident lead and data owner must approve the cutover.
- Roll back the Vercel deployment separately when application code is faulty. A code rollback does not reverse an already-applied database migration; keep old and new app versions schema-compatible.

## Environment and seed data

Production startup validates `NEXT_PUBLIC_SITE_URL`, Supabase URL and publishable key, service-role key, and any selected AI provider key in `instrumentation.register`; invalid production configuration fails before requests are served. Build phase is exempt because deployment build systems may not inject runtime secrets. Do not add real secrets to `.env.example` or client variables.

`supabase seed.sql` contains fictional demo records and automatic seeding is disabled in `supabase/config.toml`. Run the guarded `npm run seed:nonprod` script with `PAWCARE_DEPLOY_ENV=local|preview|staging`; remote targets must also match `PAWCARE_NONPROD_PROJECT_REFS`. Production is always refused. Configure no production project ref in that allowlist. The production and staging migration workflows never pass `--include-seed`.

## Risk flags

The server-side allowlisted feature-flag interface is fail-closed on unknown keys or database errors. `sos.enabled` defaults on so basic emergency dispatch remains available; only an incident lead should disable new SOS intake during a confirmed operational emergency, with the static fallback path maintained. `billing.enabled` and `community.fundraising.enabled` default off until their rollout is approved. Do not use billing entitlement checks to gate basic SOS.
