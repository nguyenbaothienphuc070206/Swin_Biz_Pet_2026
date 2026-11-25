-- SOS v2: durable rings, explicit clinic readiness, privacy-safe clinic access.
alter table public.clinics
  add column if not exists supports_24h boolean not null default false,
  add column if not exists emergency_status text not null default 'offline',
  add column if not exists last_heartbeat_at timestamptz;
alter table public.clinics drop constraint if exists clinics_emergency_status_check;
alter table public.clinics add constraint clinics_emergency_status_check
  check (emergency_status in ('online','offline','busy'));
update public.clinics set supports_24h=is_24_7 where supports_24h=false and is_24_7=true;

alter table public.sos_requests alter column owner_id drop not null;
alter table public.sos_requests alter column pet_id drop not null;
alter table public.sos_requests add column if not exists guest_phone text;
alter table public.sos_requests add column if not exists guest_name text;
alter table public.sos_requests add column if not exists guest_token_hash text;
alter table public.sos_requests add column if not exists species text;
alter table public.sos_requests add column if not exists false_alarm_flag boolean not null default false;
alter table public.sos_requests add column if not exists device_hash text;
alter table public.sos_requests drop constraint if exists sos_requests_status_check;
update public.sos_requests set status=case status when 'canceled' then 'cancelled' when 'unmatched' then 'no_clinic' when 'in_progress' then 'accepted' when 'completed' then 'accepted' else status end;
alter table public.sos_requests add constraint sos_requests_status_check
  check(status in ('searching','accepted','cancelled','expired','no_clinic'));
alter table public.sos_requests drop constraint if exists sos_requests_owner_id_idempotency_key_key;
create unique index if not exists sos_requests_owner_idempotency_uq on public.sos_requests(owner_id,idempotency_key) where owner_id is not null;
create unique index if not exists sos_requests_guest_idempotency_uq on public.sos_requests(guest_token_hash,idempotency_key) where owner_id is null;

create table if not exists public.sos_rounds (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.sos_requests(id) on delete cascade,
  radius_m integer not null check(radius_m in (5000,10000,15000)),
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(request_id,radius_m)
);
alter table public.sos_dispatches add column if not exists round_id uuid references public.sos_rounds(id);
alter table public.sos_dispatches add column if not exists decline_reason text;
alter table public.sos_dispatches drop constraint if exists sos_dispatches_status_check;
update public.sos_dispatches set status=case status when 'pinged' then 'pending' when 'canceled' then 'expired' else status end;
alter table public.sos_dispatches add constraint sos_dispatches_status_check
  check(status in ('pending','seen','accepted','declined','expired','taken'));
create unique index if not exists sos_dispatches_request_clinic_uq on public.sos_dispatches(request_id,clinic_id);
create index if not exists sos_rounds_due_idx on public.sos_rounds(deadline_at) where processed_at is null;
create index if not exists sos_dispatches_clinic_status_idx on public.sos_dispatches(clinic_id,status,created_at desc);

create table if not exists public.sos_rate_limits (
  subject_kind text not null check(subject_kind in ('user','device','phone')),
  subject_hash text not null,
  window_start timestamptz not null,
  attempts integer not null default 0,
  primary key(subject_kind,subject_hash,window_start)
);
alter table public.sos_rate_limits enable row level security;
create policy sos_rate_limits_service_only on public.sos_rate_limits for all to service_role using(true) with check(true);
alter table public.sos_rounds enable row level security;
alter table public.sos_rounds force row level security;
create policy sos_round_owner_read on public.sos_rounds for select to authenticated using(exists(select 1 from public.sos_requests s where s.id=request_id and s.owner_id=(select auth.uid())));
alter table public.sos_rate_limits force row level security;

create table if not exists public.sos_dispatch_config (
  config_key text primary key default 'default' check(config_key='default'),
  radii_m integer[] not null default array[5000,10000,15000],
  round_timeout_seconds integer not null default 60 check(round_timeout_seconds between 10 and 300),
  max_clinics_per_round integer not null default 10 check(max_clinics_per_round between 1 and 50),
  max_attempts_per_hour integer not null default 3 check(max_attempts_per_hour between 1 and 20),
  check(cardinality(radii_m)=3 and radii_m[1]=5000 and radii_m[2]=10000 and radii_m[3]=15000)
);
insert into public.sos_dispatch_config(config_key) values('default') on conflict do nothing;
alter table public.sos_dispatch_config enable row level security;
alter table public.sos_dispatch_config force row level security;
create policy sos_dispatch_config_service_only on public.sos_dispatch_config for all to service_role using(true) with check(true);
grant execute on function public.is_feature_enabled(text) to service_role;

-- Replace legacy broad clinic request reads: clinics only receive a safe payload via RPC.
drop policy if exists sos_clinic_read on public.sos_requests;
drop policy if exists sos_owner_read on public.sos_requests;
create policy sos_owner_read on public.sos_requests for select to authenticated using(owner_id=(select auth.uid()));
drop policy if exists sos_owner_insert on public.sos_requests;
drop policy if exists dispatch_owner_read on public.sos_dispatches;
create policy dispatch_owner_read on public.sos_dispatches for select to authenticated using(exists(select 1 from public.sos_requests s where s.id=request_id and s.owner_id=(select auth.uid())));
drop policy if exists dispatch_clinic_update on public.sos_dispatches;

create or replace function public.sos_check_rate_limit(p_kind text,p_hash text,p_limit integer default 3)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_start timestamptz := date_trunc('hour',now()); v_attempts integer;
begin
  insert into public.sos_rate_limits(subject_kind,subject_hash,window_start,attempts)
  values(p_kind,p_hash,v_start,1)
  on conflict(subject_kind,subject_hash,window_start) do update set attempts=sos_rate_limits.attempts+1
    where sos_rate_limits.attempts<p_limit
  returning attempts into v_attempts;
  return v_attempts is not null;
end $$;
revoke all on function public.sos_check_rate_limit(text,text,integer) from public,anon,authenticated;
grant execute on function public.sos_check_rate_limit(text,text,integer) to service_role;

create or replace function public.sos_start_round(p_request uuid,p_radius integer,p_timeout_seconds integer default null,p_max_clinics integer default null)
returns integer language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare v_sos public.sos_requests%rowtype; v_round uuid; v_count integer; v_timeout integer; v_max integer;
begin
  select * into v_sos from public.sos_requests where id=p_request for update;
  if not found or v_sos.status<>'searching' then return 0; end if;
  select coalesce(p_timeout_seconds,round_timeout_seconds),coalesce(p_max_clinics,max_clinics_per_round) into v_timeout,v_max from public.sos_dispatch_config where config_key='default';
  if not exists(select 1 from public.sos_dispatch_config d where d.config_key='default' and p_radius=any(d.radii_m)) then raise exception 'invalid_sos_radius'; end if;
  insert into public.sos_rounds(request_id,radius_m,deadline_at)
  values(p_request,p_radius,now()+make_interval(secs=>greatest(10,least(v_timeout,300))))
  on conflict(request_id,radius_m) do nothing returning id into v_round;
  if v_round is null then return 0; end if;
  insert into public.sos_dispatches(request_id,clinic_id,round_id,distance_m,status)
  select p_request,c.id,v_round,round(extensions.st_distance(c.location,v_sos.location))::integer,'pending'
  from public.clinics c
  where c.verified and c.published and not c.is_demo and c.supports_24h
    and c.emergency_status='online' and c.last_heartbeat_at>now()-interval '2 minutes'
    and c.phone is not null and c.location is not null and v_sos.location is not null
    and extensions.st_dwithin(c.location,v_sos.location,p_radius)
    and not exists(select 1 from public.sos_dispatches old where old.request_id=p_request and old.clinic_id=c.id)
  order by c.location <-> v_sos.location
  limit greatest(1,least(v_max,50))
  on conflict(request_id,clinic_id) do nothing;
  get diagnostics v_count = row_count;
  if v_count=0 then
    update public.sos_rounds set deadline_at=now() where id=v_round;
  end if;
  update public.sos_requests set radius_km=p_radius/1000.0,expansion_step=case p_radius when 5000 then 0 when 10000 then 1 else 2 end,updated_at=now() where id=p_request;
  return v_count;
end $$;
revoke all on function public.sos_start_round(uuid,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.sos_start_round(uuid,integer,integer,integer) to service_role;

create or replace function public.update_clinic_sos_settings(p_clinic uuid,p_supports_24h boolean,p_lng double precision,p_lat double precision)
returns boolean language plpgsql security definer set search_path=public,extensions,pg_temp as $$
begin
  if not public.is_clinic_admin(p_clinic) then raise exception 'clinic_admin_required'; end if;
  if p_supports_24h and (p_lng is null or p_lat is null) then raise exception 'clinic_location_required'; end if;
  update public.clinics set supports_24h=p_supports_24h,is_24_7=p_supports_24h,
    location=case when p_lng is null or p_lat is null then location else extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography end,
    emergency_status=case when p_supports_24h then emergency_status else 'offline' end,
    last_heartbeat_at=case when p_supports_24h then last_heartbeat_at else null end
  where id=p_clinic;
  return found;
end $$;
revoke all on function public.update_clinic_sos_settings(uuid,boolean,double precision,double precision) from public,anon;
grant execute on function public.update_clinic_sos_settings(uuid,boolean,double precision,double precision) to authenticated;

create or replace function public.update_clinic_emergency_status(p_clinic uuid,p_status text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not public.is_clinic_member(p_clinic) then raise exception 'clinic_access_denied'; end if;
  if p_status not in ('online','offline','busy') then raise exception 'invalid_emergency_status'; end if;
  update public.clinics set emergency_status=p_status,last_heartbeat_at=case when p_status='offline' then last_heartbeat_at else now() end
  where id=p_clinic and (p_status='offline' or (supports_24h and location is not null));
  if not found and p_status<>'offline' then raise exception 'clinic_not_configured_for_emergency'; end if;
  return true;
end $$;
revoke all on function public.update_clinic_emergency_status(uuid,text) from public,anon;
grant execute on function public.update_clinic_emergency_status(uuid,text) to authenticated;

create or replace function public.clinic_sos_settings()
returns table(clinic_id uuid,clinic_name text,supports_24h boolean,emergency_status text,latitude double precision,longitude double precision,is_admin boolean)
language sql stable security definer set search_path=public,extensions,pg_temp as $$
  select c.id,c.name,c.supports_24h,c.emergency_status,
    case when c.location is null then null else extensions.st_y(c.location::extensions.geometry) end,
    case when c.location is null then null else extensions.st_x(c.location::extensions.geometry) end,
    cs.staff_role='clinic_admin'
  from public.clinics c join public.clinic_staff cs on cs.clinic_id=c.id
  where cs.user_id=(select auth.uid())
$$;
revoke all on function public.clinic_sos_settings() from public,anon;
grant execute on function public.clinic_sos_settings() to authenticated;

create or replace function public.create_sos(
  p_owner uuid,p_pet uuid,p_guest_phone text,p_guest_name text,p_guest_token_hash text,p_phone_hash text,p_species text,
  p_symptoms text[],p_urgency text,p_rule_ids uuid[],p_lng double precision,p_lat double precision,p_idempotency uuid,p_device_hash text
) returns uuid language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare v_id uuid; v_location extensions.geography; v_radii integer[]; v_rate_limit integer; i integer;
begin
  if p_owner is null and coalesce(length(trim(p_guest_phone)),0)<7 then raise exception 'guest_phone_required'; end if;
  if p_owner is not null and p_pet is null then raise exception 'pet_required'; end if;
  if p_owner is not null and p_pet is not null and not public.owns_pet(p_pet) then raise exception 'pet_access_denied'; end if;
  if p_owner is null and p_pet is not null then raise exception 'guest_pet_not_allowed'; end if;
  if coalesce(cardinality(p_symptoms),0)<1 or cardinality(p_symptoms)>7 then raise exception 'symptoms_required'; end if;
  if p_urgency not in ('emergency','urgent','monitor') then raise exception 'invalid_urgency'; end if;
  select radii_m,max_attempts_per_hour into v_radii,v_rate_limit from public.sos_dispatch_config where config_key='default';
  if p_owner is null then select id into v_id from public.sos_requests where owner_id is null and guest_token_hash=p_guest_token_hash and idempotency_key=p_idempotency;
  else select id into v_id from public.sos_requests where owner_id=p_owner and idempotency_key=p_idempotency;
  end if;
  if v_id is not null then return v_id; end if;
  if not public.sos_check_rate_limit('device',p_device_hash,v_rate_limit) then raise exception 'rate_limited_device'; end if;
  if p_owner is not null and not public.sos_check_rate_limit('user',p_owner::text,v_rate_limit) then raise exception 'rate_limited_user'; end if;
  if p_owner is null then
    if not public.sos_check_rate_limit('phone',p_phone_hash,v_rate_limit) then raise exception 'rate_limited_phone'; end if;
  else
    if p_phone_hash is not null and not public.sos_check_rate_limit('phone',p_phone_hash,v_rate_limit) then raise exception 'rate_limited_phone'; end if;
  end if;
  v_location:=extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography;
  if p_owner is null then
    insert into public.sos_requests(owner_id,pet_id,guest_phone,guest_name,guest_token_hash,species,symptom_chips,urgency,rule_ids,rule_version,location,location_consent_at,idempotency_key,device_hash)
    values(null,null,trim(p_guest_phone),nullif(trim(p_guest_name),''),p_guest_token_hash,p_species,p_symptoms,p_urgency,coalesce(p_rule_ids,'{}'),'sos-rules-v1',v_location,now(),p_idempotency,p_device_hash)
    on conflict(guest_token_hash,idempotency_key) where owner_id is null do update set updated_at=sos_requests.updated_at returning id into v_id;
  else
    insert into public.sos_requests(owner_id,pet_id,guest_phone,guest_name,guest_token_hash,species,symptom_chips,urgency,rule_ids,rule_version,location,location_consent_at,idempotency_key,device_hash)
    values(p_owner,p_pet,null,null,null,p_species,p_symptoms,p_urgency,coalesce(p_rule_ids,'{}'),'sos-rules-v1',v_location,now(),p_idempotency,p_device_hash)
    on conflict(owner_id,idempotency_key) where owner_id is not null do update set updated_at=sos_requests.updated_at returning id into v_id;
  end if;
  if not exists(select 1 from public.sos_rounds where request_id=v_id and radius_m=5000) then
    for i in 1..array_length(v_radii,1) loop
      perform public.sos_start_round(v_id,v_radii[i],null,null);
      exit when exists(select 1 from public.sos_dispatches where request_id=v_id);
    end loop;
    if not exists(select 1 from public.sos_dispatches where request_id=v_id) then update public.sos_requests set status='no_clinic' where id=v_id; end if;
  end if;
  return v_id;
end $$;
revoke all on function public.create_sos(uuid,uuid,text,text,text,text,text,text[],text,uuid[],double precision,double precision,uuid,text) from public,anon,authenticated;
grant execute on function public.create_sos(uuid,uuid,text,text,text,text,text,text[],text,uuid[],double precision,double precision,uuid,text) to service_role;

-- Remove callable legacy paths that predate rate limits, rounds and redacted clinic reads.
revoke all on function public.start_sos_request(uuid,text[],text,double precision,double precision,uuid) from public,anon,authenticated;
revoke all on function public.accept_sos(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.cancel_sos(uuid) from public,anon,authenticated;

create or replace function public.advance_sos_rounds(p_timeout_seconds integer default null,p_max_clinics integer default null)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare v record; v_next integer; v_index integer; v_radii integer[]; v_inserted integer; v_done integer:=0;
begin
  select radii_m into v_radii from public.sos_dispatch_config where config_key='default';
  for v in select r.id,rounds.id as round_id,rounds.radius_m,rounds.deadline_at,rounds.request_id from public.sos_rounds rounds join public.sos_requests r on r.id=rounds.request_id
    where r.status='searching' and rounds.deadline_at<=now() and rounds.processed_at is null
    order by rounds.deadline_at limit 100 for update of r skip locked loop
    update public.sos_rounds set processed_at=now() where id=v.round_id and processed_at is null;
    if not found then continue; end if;
    update public.sos_dispatches set status='expired',responded_at=coalesce(responded_at,now()) where round_id=v.round_id and status in ('pending','seen');
    v_index:=array_position(v_radii,v.radius_m);
    v_next:=case when v_index is not null and v_index<array_length(v_radii,1) then v_radii[v_index+1] else null end;
    if v_next is null then
      update public.sos_requests set status='no_clinic',updated_at=now() where id=v.request_id and status='searching';
      v_done:=v_done+1;
    else
      while v_next is not null loop
        v_inserted:=public.sos_start_round(v.request_id,v_next,p_timeout_seconds,p_max_clinics);
        v_done:=v_done+1;
        if v_inserted>0 then exit; end if;
        update public.sos_rounds set deadline_at=now(),processed_at=now() where request_id=v.request_id and radius_m=v_next;
        v_index:=array_position(v_radii,v_next);
        v_next:=case when v_index is not null and v_index<array_length(v_radii,1) then v_radii[v_index+1] else null end;
        if v_next is null then update public.sos_requests set status='no_clinic',updated_at=now() where id=v.request_id and status='searching'; end if;
      end loop;
    end if;
  end loop;
  return v_done;
end $$;
revoke all on function public.advance_sos_rounds(integer,integer) from public,anon,authenticated;
grant execute on function public.advance_sos_rounds(integer,integer) to service_role;

create or replace function public.accept_sos_v2(p_request uuid,p_dispatch uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_clinic uuid; v_dispatch_status text; v_request_status text; v_accepted_clinic uuid; v_changed integer;
begin
  select clinic_id into v_clinic from public.sos_dispatches where id=p_dispatch and request_id=p_request;
  if v_clinic is null or not public.is_clinic_member(v_clinic) then raise exception 'clinic_access_denied'; end if;
  select status,accepted_clinic_id into v_request_status,v_accepted_clinic from public.sos_requests where id=p_request for update;
  if not found then return false; end if;
  if v_request_status='accepted' then return v_accepted_clinic=v_clinic; end if;
  if v_request_status<>'searching' then return false; end if;
  select status into v_dispatch_status from public.sos_dispatches where id=p_dispatch and request_id=p_request for update;
  if v_dispatch_status not in ('pending','seen') then return false; end if;
  update public.sos_requests set status='accepted',accepted_clinic_id=v_clinic,accepted_by=(select auth.uid()),accepted_at=now(),updated_at=now()
  where id=p_request and status='searching' and accepted_clinic_id is null;
  get diagnostics v_changed = row_count;
  if v_changed=0 then return false; end if;
  update public.sos_dispatches set status=case when id=p_dispatch then 'accepted' else 'taken' end,responded_at=now()
    where request_id=p_request and status in ('pending','seen','declined','expired');
  insert into public.audit_logs(actor_id,clinic_id,action,entity_type,entity_id,metadata)
    values((select auth.uid()),v_clinic,'release','sos_owner_contact',p_request::text,'{"reason":"clinic_accepted"}');
  return true;
end $$;
revoke all on function public.accept_sos_v2(uuid,uuid) from public,anon;
grant execute on function public.accept_sos_v2(uuid,uuid) to authenticated;

create or replace function public.decline_sos_v2(p_dispatch uuid,p_reason text default null)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_clinic uuid;
begin
  select clinic_id into v_clinic from public.sos_dispatches where id=p_dispatch;
  if v_clinic is null or not public.is_clinic_member(v_clinic) then raise exception 'clinic_access_denied'; end if;
  update public.sos_dispatches set status='declined',decline_reason=nullif(left(trim(coalesce(p_reason,'')),240),''),responded_at=coalesce(responded_at,now())
    where id=p_dispatch and status in ('pending','seen');
  return found or exists(select 1 from public.sos_dispatches where id=p_dispatch and status='declined');
end $$;
revoke all on function public.decline_sos_v2(uuid,text) from public,anon;
grant execute on function public.decline_sos_v2(uuid,text) to authenticated;

create or replace function public.cancel_sos_v2(p_request uuid,p_guest_token_hash text default null)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_owner uuid; v_guest_hash text;
begin
  select owner_id,guest_token_hash into v_owner,v_guest_hash from public.sos_requests where id=p_request for update;
  if not found then return false; end if;
  if v_owner is not null and v_owner<>(select auth.uid()) then raise exception 'owner_access_denied'; end if;
  if v_owner is null and (p_guest_token_hash is null or v_guest_hash<>p_guest_token_hash) then raise exception 'owner_access_denied'; end if;
  update public.sos_requests set status='cancelled',cancel_reason='owner_cancelled',updated_at=now() where id=p_request and status='searching';
  if found then update public.sos_dispatches set status='expired',responded_at=now() where request_id=p_request and status in ('pending','seen'); end if;
  return found or exists(select 1 from public.sos_requests where id=p_request and status='cancelled');
end $$;
revoke all on function public.cancel_sos_v2(uuid,text) from public,anon;
grant execute on function public.cancel_sos_v2(uuid,text) to authenticated,service_role;

create or replace function public.clinic_sos_inbox()
returns table(request_id uuid,dispatch_id uuid,clinic_id uuid,species text,symptom_chips text[],urgency text,distance_band text,round_radius_m integer,created_at timestamptz)
language sql stable security definer set search_path=public,extensions,pg_temp as $$
  select s.id,d.id,d.clinic_id,coalesce(s.species,p.species,'other'),s.symptom_chips,s.urgency,
    case when d.distance_m<=2000 then 'within_2_km' when d.distance_m<=5000 then 'within_5_km' when d.distance_m<=10000 then 'within_10_km' else 'within_15_km' end,
    r.radius_m,s.created_at
  from public.sos_dispatches d join public.sos_requests s on s.id=d.request_id
  left join public.pets p on p.id=s.pet_id join public.sos_rounds r on r.id=d.round_id
  where public.is_clinic_member(d.clinic_id) and d.status in ('pending','seen') and s.status='searching'
  order by s.created_at asc
$$;
revoke all on function public.clinic_sos_inbox() from public,anon;
grant execute on function public.clinic_sos_inbox() to authenticated;

create or replace function public.accepted_sos_details(p_request uuid)
returns table(latitude double precision,longitude double precision,owner_phone text)
language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare v_sos public.sos_requests%rowtype;
begin
  select * into v_sos from public.sos_requests where id=p_request and status='accepted' and accepted_clinic_id is not null;
  if not found or not public.is_clinic_member(v_sos.accepted_clinic_id) then raise exception 'clinic_access_denied'; end if;
  insert into public.audit_logs(actor_id,clinic_id,pet_id,action,entity_type,entity_id,metadata)
  values((select auth.uid()),v_sos.accepted_clinic_id,v_sos.pet_id,'release','sos_exact_location_contact',p_request::text,'{"reason":"accepted_clinic_access"}');
  return query select extensions.st_y(v_sos.location::extensions.geometry),extensions.st_x(v_sos.location::extensions.geometry),coalesce(v_sos.guest_phone,(select p.phone from public.profiles p where p.id=v_sos.owner_id));
end $$;
revoke all on function public.accepted_sos_details(uuid) from public,anon;
grant execute on function public.accepted_sos_details(uuid) to authenticated;

create or replace function public.sos_fallback_clinics(p_request uuid,p_guest_token_hash text default null)
returns table(clinic_id uuid,name text,phone text,distance_m integer)
language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare v_sos public.sos_requests%rowtype;
begin
  select * into v_sos from public.sos_requests where id=p_request and status='no_clinic'
    and ((owner_id is not null and owner_id=(select auth.uid())) or (owner_id is null and guest_token_hash=p_guest_token_hash and p_guest_token_hash is not null));
  if not found then raise exception 'owner_access_denied'; end if;
  return query select c.id,c.name,c.phone,round(extensions.st_distance(c.location,v_sos.location))::integer
    from public.clinics c where c.verified and c.published and c.supports_24h and c.phone is not null and c.location is not null
    order by c.location <-> v_sos.location limit 20;
end $$;
revoke all on function public.sos_fallback_clinics(uuid,text) from public,anon;
grant execute on function public.sos_fallback_clinics(uuid,text) to authenticated,service_role;

create or replace function public.owner_sos_status(p_request uuid,p_guest_token_hash text default null)
returns table(status text,accepted_clinic_id uuid,radius_m integer,updated_at timestamptz,fallback jsonb)
language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare v_sos public.sos_requests%rowtype;
begin
  select * into v_sos from public.sos_requests where id=p_request and
    ((owner_id is not null and owner_id=(select auth.uid())) or (owner_id is null and guest_token_hash=p_guest_token_hash and p_guest_token_hash is not null));
  if not found then raise exception 'owner_access_denied'; end if;
  return query select v_sos.status,v_sos.accepted_clinic_id,(v_sos.radius_km*1000)::integer,v_sos.updated_at,
    case when v_sos.status='no_clinic' then coalesce((select jsonb_agg(to_jsonb(f)) from public.sos_fallback_clinics(v_sos.id,p_guest_token_hash) f),'[]'::jsonb) else '[]'::jsonb end;
end $$;
revoke all on function public.owner_sos_status(uuid,text) from public,anon;
grant execute on function public.owner_sos_status(uuid,text) to authenticated,service_role;

create or replace function public.set_sos_false_alarm(p_request uuid,p_value boolean)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if public.current_app_role()<>'platform_admin' then raise exception 'platform_admin_required'; end if;
  update public.sos_requests set false_alarm_flag=p_value,updated_at=now() where id=p_request;
  if not found then return false; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values((select auth.uid()),'update','sos_false_alarm',p_request::text,jsonb_build_object('false_alarm_flag',p_value));
  return true;
end $$;
revoke all on function public.set_sos_false_alarm(uuid,boolean) from public,anon;
grant execute on function public.set_sos_false_alarm(uuid,boolean) to authenticated;

-- Run expiry/expansion from Postgres; a browser or web process is not the scheduler.
create extension if not exists pg_cron with schema pg_catalog;
do $$ begin
  if exists(select 1 from pg_namespace where nspname='cron') then
  perform cron.schedule('pawcare-sos-round-advance','10 seconds','select public.advance_sos_rounds()');
  end if;
exception when duplicate_object then null;
end $$;
