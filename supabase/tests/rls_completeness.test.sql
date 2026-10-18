begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(2);
select extensions.ok(not exists(
  select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p') and not c.relispartition and not c.relrowsecurity
),'every public table enables row-level security');
select extensions.ok(not exists(
  select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p') and not c.relispartition
    and not exists(select 1 from pg_policy p where p.polrelid=c.oid)
),'every public table has at least one explicit RLS policy');
select * from extensions.finish();
rollback;
