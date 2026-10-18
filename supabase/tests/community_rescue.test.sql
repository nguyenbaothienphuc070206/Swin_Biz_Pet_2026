-- Run after migrations with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(19);

select ok((select relrowsecurity from pg_class where oid='public.lost_found_reports'::regclass),'lost/found reports have RLS');
select ok((select relrowsecurity from pg_class where oid='public.stray_reports'::regclass),'stray reports have RLS');
select ok((select relrowsecurity from pg_class where oid='public.rescue_cases'::regclass),'rescue cases have RLS');
select ok((select relrowsecurity from pg_class where oid='public.donation_ledger'::regclass),'donation ledger has RLS');
select ok((select relrowsecurity from pg_class where oid='public.community_appeals'::regclass),'appeals have RLS');
select ok(not exists(select 1 from pg_policies where schemaname='public' and tablename='lost_found_reports' and 'anon'=any(roles) and cmd='SELECT'),'anonymous users have no exact lost report read policy');
select ok(not exists(select 1 from pg_policies where schemaname='public' and tablename='stray_reports' and 'anon'=any(roles) and cmd='SELECT'),'anonymous users have no exact stray report read policy');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='donation_ledger' and cmd='SELECT' and qual not in ('true','(true)')),'donation rows require recipient or admin RLS scope');
select ok(not exists(select 1 from pg_policies where schemaname='public' and tablename='rescue_estimates' and cmd='INSERT'),'estimates must pass the guarded RPC');
select ok(exists(select 1 from pg_trigger where tgrelid='public.lost_found_reports'::regclass and tgname='fuzz_lost_found_location'),'lost/found coordinates get fuzzed on write');
select ok(exists(select 1 from pg_trigger where tgrelid='public.stray_reports'::regclass and tgname='fuzz_stray_location'),'stray coordinates get fuzzed on write');
select ok(exists(select 1 from pg_trigger where tgname='validate_community_post_upload') and exists(select 1 from pg_trigger where tgname='validate_lost_found_upload'),'uploaded photos must exist before entering moderation');
select ok(exists(select 1 from pg_trigger where tgrelid='public.donation_ledger'::regclass and tgname='rescue_ledger_append_only'),'donation ledger corrections are append-only');
select ok(exists(select 1 from pg_trigger where tgrelid='public.rescue_ledger_events'::regclass and tgname='rescue_ledger_events_append_only'),'ledger events are append-only');
select ok(not (select "public" from storage.buckets where id='community-private'),'community uploads remain in a private bucket');
select ok(has_function_privilege('authenticated','public.public_lost_found_matches(uuid,integer)','execute'),'only authenticated reporters can request matching RPC');
select ok(pg_get_functiondef('public.public_stray_neighborhood_counts()'::regprocedure) ilike '%having count(*)%3%','neighborhood counts suppress groups with fewer than three reports');
select ok(exists(select 1 from pg_proc where proname='moderate_community_content') and exists(select 1 from pg_proc where proname='review_community_appeal'),'moderation and appeal decisions are server-guarded RPCs');
select ok(exists(select 1 from pg_proc where proname='resolve_lost_found_match') and pg_get_functiondef('public.resolve_lost_found_match(uuid,uuid)'::regprocedure) ilike '%for update%','confirmed matches lock both reports before resolution');

select * from extensions.finish();
rollback;
