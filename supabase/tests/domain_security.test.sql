-- Run with Supabase CLI: supabase test db.
-- These pgTAP checks lock down the structural authorization primitives and invariants.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(10);
select ok((select relrowsecurity from pg_class where oid='public.medical_records'::regclass), 'medical_records has RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.pets'::regclass), 'pets has RLS enabled');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='pets' and policyname='pets_clinic_with_active_grant'), 'clinic pet reads require active grant policy');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='medical_records' and policyname='records_clinic_read'), 'clinic record reads require active grant policy');
select ok(exists(select 1 from pg_trigger where tgrelid='public.reviews'::regclass and tgname='review_completed_appointment'), 'review insert trigger enforces completed appointment');
select ok(exists(select 1 from pg_constraint where conrelid='public.reviews'::regclass and contype='u' and conname like '%appointment_id%'), 'one review per appointment constraint exists');
select ok(exists(select 1 from pg_trigger where tgrelid='public.audit_logs'::regclass and tgname='audit_logs_append_only'), 'audit logs have append-only trigger');
select ok(exists(select 1 from pg_indexes where schemaname='public' and tablename='clinics' and indexdef ilike '%using gist%location%'), 'clinic geography has GIST index');
select ok(exists(select 1 from pg_proc where proname='book_slot') and exists(select 1 from pg_proc where proname='accept_sos'), 'atomic booking and SOS RPCs exist');
select is((select count(*)::integer from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity),0,'every public base table has RLS enabled');
select * from extensions.finish();
rollback;
