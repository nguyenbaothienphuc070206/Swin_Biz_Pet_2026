alter table public.sos_requests
  add column if not exists arrival_status text not null default 'accepted'
    check (arrival_status in ('accepted','on_the_way','arrived')),
  add column if not exists photo_path text;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('sos-private','sos-private',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime')
    and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sos_requests') then
    execute 'alter publication supabase_realtime add table public.sos_requests';
  end if;
end $$;

alter table public.sos_rate_limits drop constraint if exists sos_rate_limits_subject_kind_check;
alter table public.sos_rate_limits add constraint sos_rate_limits_subject_kind_check
  check (subject_kind in ('user','device','phone','geocode_ip'));

create or replace function public.update_sos_arrival_status(p_request uuid,p_status text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_clinic uuid; v_current text; v_rank integer; v_next integer;
begin
  if p_status not in ('on_the_way','arrived') then raise exception 'invalid_arrival_status'; end if;
  select accepted_clinic_id,arrival_status into v_clinic,v_current from public.sos_requests
    where id=p_request and status='accepted' for update;
  if not found or not public.is_clinic_member(v_clinic) then raise exception 'clinic_access_denied'; end if;
  v_rank := case v_current when 'accepted' then 0 when 'on_the_way' then 1 else 2 end;
  v_next := case p_status when 'on_the_way' then 1 else 2 end;
  if v_next <= v_rank then return true; end if;
  if v_next <> v_rank + 1 then return false; end if;
  update public.sos_requests set arrival_status=p_status,updated_at=now() where id=p_request;
  insert into public.audit_logs(actor_id,clinic_id,action,entity_type,entity_id,metadata)
    values((select auth.uid()),v_clinic,'update','sos_arrival_status',p_request::text,jsonb_build_object('status',p_status));
  return true;
end $$;
revoke all on function public.update_sos_arrival_status(uuid,text) from public,anon;
grant execute on function public.update_sos_arrival_status(uuid,text) to authenticated;

drop function public.owner_sos_status(uuid,text);
create function public.owner_sos_status(p_request uuid,p_guest_token_hash text default null)
returns table(status text,accepted_clinic_id uuid,radius_m integer,updated_at timestamptz,fallback jsonb,arrival_status text)
language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare v_sos public.sos_requests%rowtype;
begin
  select * into v_sos from public.sos_requests where id=p_request and
    ((owner_id is not null and owner_id=(select auth.uid())) or (owner_id is null and guest_token_hash=p_guest_token_hash and p_guest_token_hash is not null));
  if not found then raise exception 'owner_access_denied'; end if;
  return query select v_sos.status,v_sos.accepted_clinic_id,(v_sos.radius_km*1000)::integer,v_sos.updated_at,
    case when v_sos.status='no_clinic' then coalesce((select jsonb_agg(to_jsonb(f)) from public.sos_fallback_clinics(v_sos.id,p_guest_token_hash) f),'[]'::jsonb) else '[]'::jsonb end,
    v_sos.arrival_status;
end $$;
revoke all on function public.owner_sos_status(uuid,text) from public,anon;
grant execute on function public.owner_sos_status(uuid,text) to authenticated,service_role;

create or replace function public.accepted_sos_photo(p_request uuid)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare v_clinic uuid; v_pet uuid; v_path text;
begin
  select accepted_clinic_id,pet_id,photo_path into v_clinic,v_pet,v_path from public.sos_requests
    where id=p_request and status='accepted';
  if not found or not public.is_clinic_member(v_clinic) then raise exception 'clinic_access_denied'; end if;
  if v_path is not null then
    insert into public.audit_logs(actor_id,clinic_id,pet_id,action,entity_type,entity_id,metadata)
      values((select auth.uid()),v_clinic,v_pet,'release','sos_photo',p_request::text,'{"reason":"accepted_clinic_access"}');
  end if;
  return v_path;
end $$;
revoke all on function public.accepted_sos_photo(uuid) from public,anon;
grant execute on function public.accepted_sos_photo(uuid) to authenticated;
