-- Internal file scan hook. Private uploads are quarantined until a configured
-- scanner posts a trusted result; this migration does not claim to scan files.
create table if not exists public.private_file_scans (
  bucket_id text not null,
  object_name text not null,
  owner_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check(status in ('pending','clean','infected','error')),
  scanner text,
  sha256 text check(sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  scan_error_code text,
  created_at timestamptz not null default now(),
  scanned_at timestamptz,
  primary key(bucket_id,object_name)
);
alter table public.private_file_scans enable row level security;
create policy private_file_scans_owner_read on public.private_file_scans for select to authenticated using(owner_id=(select auth.uid()));
create policy private_file_scans_service_only on public.private_file_scans for all to service_role using(true) with check(true);
grant select on public.private_file_scans to authenticated;

create or replace function public.track_private_upload_for_scan() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_owner uuid;
begin
  if new.bucket_id not in ('pet-documents','clinic-verification','community-private','rescue-private') then return new; end if;
  begin v_owner:=split_part(new.name,'/',1)::uuid; exception when others then v_owner:=null; end;
  insert into public.private_file_scans(bucket_id,object_name,owner_id,status,scanner,sha256,scan_error_code,scanned_at)
  values(new.bucket_id,new.name,v_owner,'pending',null,null,null,null)
  on conflict(bucket_id,object_name) do update set owner_id=excluded.owner_id,status='pending',scanner=null,sha256=null,scan_error_code=null,scanned_at=null;
  return new;
end $$;
drop trigger if exists track_private_upload_for_scan on storage.objects;
create trigger track_private_upload_for_scan after insert on storage.objects for each row execute function public.track_private_upload_for_scan();

create or replace function public.remove_private_upload_scan_record() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  delete from public.private_file_scans where bucket_id=old.bucket_id and object_name=old.name;
  return old;
end $$;
drop trigger if exists remove_private_upload_scan_record on storage.objects;
create trigger remove_private_upload_scan_record after delete on storage.objects for each row execute function public.remove_private_upload_scan_record();

create or replace function public.record_private_file_scan_result(
  p_bucket text,p_object text,p_status text,p_scanner text,p_sha256 text default null,p_error_code text default null
) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'service role required' using errcode='42501'; end if;
  if p_bucket not in ('pet-documents','clinic-verification','community-private','rescue-private') or p_status not in ('clean','infected','error')
    or length(trim(coalesce(p_scanner,''))) not between 1 and 100 or p_object like '/%' or p_object like '%..%' then raise exception 'invalid_scan_result'; end if;
  if p_status='clean' and (p_sha256 is null or p_sha256 !~ '^[a-f0-9]{64}$') then raise exception 'clean_scan_requires_sha256'; end if;
  update public.private_file_scans set status=p_status,scanner=trim(p_scanner),sha256=p_sha256,scan_error_code=case when p_status='error' then left(p_error_code,100) else null end,scanned_at=now()
  where bucket_id=p_bucket and object_name=p_object and status in ('pending','error');
  return found;
end $$;
revoke all on function public.record_private_file_scan_result(text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.record_private_file_scan_result(text,text,text,text,text,text) to service_role;

create or replace function public.ensure_clean_community_upload() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.image_path is not null and new.image_safety_status='approved'
    and not exists(select 1 from public.private_file_scans s where s.bucket_id='community-private' and s.object_name=new.image_path and s.status='clean') then
    raise exception 'malware_scan_not_clean' using errcode='23514';
  end if;
  return new;
end $$;
drop trigger if exists ensure_clean_community_post on public.community_posts;
create trigger ensure_clean_community_post before insert or update of image_path,image_safety_status on public.community_posts for each row execute function public.ensure_clean_community_upload();
drop trigger if exists ensure_clean_lost_found on public.lost_found_reports;
create trigger ensure_clean_lost_found before insert or update of image_path,image_safety_status on public.lost_found_reports for each row execute function public.ensure_clean_community_upload();
drop trigger if exists ensure_clean_stray_report on public.stray_reports;
create trigger ensure_clean_stray_report before insert or update of image_path,image_safety_status on public.stray_reports for each row execute function public.ensure_clean_community_upload();
drop trigger if exists ensure_clean_rescue_case on public.rescue_cases;
create trigger ensure_clean_rescue_case before insert or update of image_path,image_safety_status on public.rescue_cases for each row execute function public.ensure_clean_community_upload();

-- Hidden internal tables still receive an explicit deny policy. Future tables
-- are checked separately by rls_completeness.test.sql and CI.
create policy community_rate_limits_service_only on public.community_rate_limits for all to service_role using(true) with check(true);
create policy notification_jobs_client_deny on public.notification_jobs for all to anon,authenticated using(false) with check(false);

-- Complete existing public-table RLS gaps with deny-by-default client policies.
do $$ declare t record; begin
  for t in select c.oid,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p') and not c.relispartition
  loop
    execute format('alter table public.%I enable row level security',t.relname);
    if not exists(select 1 from pg_policy p where p.polrelid=t.oid) then
      execute format('create policy rls_deny_clients on public.%I for all to anon,authenticated using(false) with check(false)',t.relname);
    end if;
  end loop;
end $$;
