begin;
select plan(5);
select ok(to_regprocedure('public.create_triage_session(uuid)') is not null,'SOS triage session is created through a database RPC');
select ok(position('public.is_clinic_member' in pg_get_functiondef('public.create_triage_session(uuid)'::regprocedure))>0,'session creation is scoped to accepted clinic members');
select ok(position('v_sos.status' in pg_get_functiondef('public.create_triage_session(uuid)'::regprocedure))>0,'session creation requires an accepted SOS request');
select ok(not has_function_privilege('anon','public.create_triage_session(uuid)','execute'),'anonymous users cannot create SOS sessions');
select ok(exists(select 1 from information_schema.columns where table_schema='public' and table_name='ai_runs' and column_name='is_demo' and is_nullable='NO'),'AI demo calls are explicitly marked');
select * from finish();
rollback;
