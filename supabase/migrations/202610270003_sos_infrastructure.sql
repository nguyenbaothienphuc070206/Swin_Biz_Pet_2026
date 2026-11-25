-- Operational guardrails for SOS: second-level scheduling, private realtime,
-- verified clinic pins, guest OTP quotas, and post-incident location reduction.

alter table public.clinics
  add column if not exists location_verified_at timestamptz,
  add column if not exists location_verified_by uuid references public.profiles(id),
  add column if not exists supports_24h_requested boolean not null default false;

-- Existing clinic-admin edits only request activation. A platform admin must
-- verify the pin and approve emergency coverage before dispatch eligibility.
create or replace function public.update_clinic_sos_settings(
  p_clinic uuid,p_supports_24h boolean,p_lng double precision,p_lat double precision
) returns boolean language plpgsql security definer set search_path=public,extensions,pg_temp as $$
begin
  if not public.is_clinic_admin(p_clinic) then raise exception 'clinic_admin_required'; end if;
  if p_lng is not null and (p_lng not between 102.14 and 109.47 or p_lat is null or p_lat not between 8.18 and 23.39 or (p_lng=0 and p_lat=0)) then
    raise exception 'clinic_location_outside_vietnam';
  end if;
  if p_supports_24h and (p_lng is null or p_lat is null) then raise exception 'clinic_location_required'; end if;
  update public.clinics set
    supports_24h_requested=p_supports_24h,
    supports_24h=case when p_supports_24h then supports_24h else false end,
    is_24_7=case when p_supports_24h then is_24_7 else false end,
    location=case when p_lng is null or p_lat is null then location else extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography end,
    location_verified_at=null,
    location_verified_by=null,
    emergency_status=case when not p_supports_24h then 'offline' else emergency_status end,
    last_heartbeat_at=case when not p_supports_24h then null else last_heartbeat_at end
  where id=p_clinic;
  return found;
end $$;
revoke all on function public.update_clinic_sos_settings(uuid,boolean,double precision,double precision) from public,anon;
grant execute on function public.update_clinic_sos_settings(uuid,boolean,double precision,double precision) to authenticated;

create or replace function public.update_clinic_sos_profile(p_clinic uuid,p_address text,p_supports_24h boolean,p_lng double precision,p_lat double precision)
returns boolean language plpgsql security definer set search_path=public,extensions,pg_temp as $$
begin
  if length(trim(p_address)) not between 5 and 240 then raise exception 'invalid_clinic_address'; end if;
  if not public.update_clinic_sos_settings(p_clinic,p_supports_24h,p_lng,p_lat) then return false; end if;
  update public.clinics set address=trim(p_address) where id=p_clinic;
  return found;
end $$;
revoke all on function public.update_clinic_sos_profile(uuid,text,boolean,double precision,double precision) from public,anon;
grant execute on function public.update_clinic_sos_profile(uuid,text,boolean,double precision,double precision) to authenticated;

create or replace function public.admin_review_sos_clinic(p_clinic uuid,p_approve boolean,p_reason text)
returns boolean language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare v public.clinics%rowtype;
begin
  if public.current_app_role()<>'platform_admin' then raise exception 'platform_admin_required' using errcode='42501'; end if;
  if coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'admin_aal2_required' using errcode='42501'; end if;
  select * into v from public.clinics where id=p_clinic for update;
  if not found then return false; end if;
  if p_approve and (not v.supports_24h_requested or v.location is null or abs(extensions.st_x(v.location::extensions.geometry))<0.000001 or abs(extensions.st_y(v.location::extensions.geometry))<0.000001
      or extensions.st_x(v.location::extensions.geometry) not between 102.14 and 109.47
      or extensions.st_y(v.location::extensions.geometry) not between 8.18 and 23.39) then raise exception 'clinic_location_or_request_invalid'; end if;
  update public.clinics set supports_24h=p_approve,is_24_7=p_approve,supports_24h_requested=p_approve,
    location_verified_at=case when p_approve then now() else null end,
    location_verified_by=case when p_approve then auth.uid() else null end,
    emergency_status=case when p_approve then 'offline' else 'offline' end,
    last_heartbeat_at=null
  where id=p_clinic;
  insert into public.audit_logs(actor_id,clinic_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),p_clinic,'review','clinic_sos_eligibility',p_clinic::text,jsonb_build_object('approved',p_approve,'reason',left(trim(p_reason),500)));
  return true;
end $$;
revoke all on function public.admin_review_sos_clinic(uuid,boolean,text) from public,anon;
grant execute on function public.admin_review_sos_clinic(uuid,boolean,text) to authenticated;

create or replace function public.admin_sos_clinics_for_review()
returns table(clinic_id uuid,clinic_name text,address text,phone text,latitude double precision,longitude double precision)
language sql stable security definer set search_path=public,extensions,pg_temp as $$
  select c.id,c.name,c.address,c.phone,extensions.st_y(c.location::extensions.geometry),extensions.st_x(c.location::extensions.geometry)
  from public.clinics c where public.current_app_role()='platform_admin' and coalesce(auth.jwt()->>'aal','aal1')='aal2' and c.supports_24h_requested and c.location_verified_at is null
  order by c.created_at limit 100
$$;
revoke all on function public.admin_sos_clinics_for_review() from public,anon;
grant execute on function public.admin_sos_clinics_for_review() to authenticated;

-- Only clinics with an admin-verified, nonzero Vietnam pin can receive SOS.
create or replace function public.sos_start_round(p_request uuid,p_radius integer,p_timeout_seconds integer default null,p_max_clinics integer default null)
returns integer language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare v_sos public.sos_requests%rowtype; v_round uuid; v_count integer; v_timeout integer; v_max integer;
begin
  select * into v_sos from public.sos_requests where id=p_request for update;
  if not found or v_sos.status<>'searching' then return 0; end if;
  select coalesce(p_timeout_seconds,round_timeout_seconds),coalesce(p_max_clinics,max_clinics_per_round) into v_timeout,v_max from public.sos_dispatch_config where config_key='default';
  if not exists(select 1 from public.sos_dispatch_config d where d.config_key='default' and p_radius=any(d.radii_m)) then raise exception 'invalid_sos_radius'; end if;
  insert into public.sos_rounds(request_id,radius_m,deadline_at) values(p_request,p_radius,now()+make_interval(secs=>greatest(10,least(v_timeout,300))))
  on conflict(request_id,radius_m) do nothing returning id into v_round;
  if v_round is null then return 0; end if;
  insert into public.sos_dispatches(request_id,clinic_id,round_id,distance_m,status)
  select p_request,c.id,v_round,round(extensions.st_distance(c.location,v_sos.location))::integer,'pending'
  from public.clinics c where c.verified and c.published and not c.is_demo and c.supports_24h and c.location_verified_at is not null
    and c.emergency_status='online' and c.last_heartbeat_at>now()-interval '2 minutes' and c.phone is not null and c.location is not null
    and v_sos.location is not null and extensions.st_dwithin(c.location,v_sos.location,p_radius)
    and not exists(select 1 from public.sos_dispatches old where old.request_id=p_request and old.clinic_id=c.id)
  order by c.location <-> v_sos.location limit greatest(1,least(v_max,50)) on conflict(request_id,clinic_id) do nothing;
  get diagnostics v_count = row_count;
  if v_count=0 then update public.sos_rounds set deadline_at=now() where id=v_round; end if;
  update public.sos_requests set radius_km=p_radius/1000.0,expansion_step=case p_radius when 5000 then 0 when 10000 then 1 else 2 end,updated_at=now() where id=p_request;
  return v_count;
end $$;
revoke all on function public.sos_start_round(uuid,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.sos_start_round(uuid,integer,integer,integer) to service_role;

create or replace function public.sos_fallback_clinics(p_request uuid,p_guest_token_hash text default null)
returns table(clinic_id uuid,name text,phone text,distance_m integer)
language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare v_sos public.sos_requests%rowtype;
begin
  select * into v_sos from public.sos_requests where id=p_request and status='no_clinic'
    and ((owner_id is not null and owner_id=(select auth.uid())) or (owner_id is null and guest_token_hash=p_guest_token_hash and p_guest_token_hash is not null));
  if not found then raise exception 'owner_access_denied'; end if;
  return query select c.id,c.name,c.phone,round(extensions.st_distance(c.location,v_sos.location))::integer
  from public.clinics c where c.verified and c.published and c.supports_24h and c.location_verified_at is not null and c.phone is not null and c.location is not null
  order by c.location <-> v_sos.location limit 20;
end $$;
revoke all on function public.sos_fallback_clinics(uuid,text) from public,anon;
grant execute on function public.sos_fallback_clinics(uuid,text) to authenticated,service_role;

-- Publish only request status and addressed dispatch rows. Postgres Changes
-- applies each table's RLS to each subscriber.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sos_requests') then execute 'alter publication supabase_realtime add table public.sos_requests'; end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sos_dispatches') then execute 'alter publication supabase_realtime add table public.sos_dispatches'; end if;
  end if;
end $$;

-- Replace the previous 10-second job. One-second scheduling is supported by
-- the documented Supabase Cron interface on the required Postgres build.
do $$ begin
  if exists(select 1 from pg_namespace where nspname='cron') then
    perform cron.unschedule(jobid) from cron.job where jobname='pawcare-sos-round-advance';
    perform cron.schedule('pawcare-sos-round-advance','1 second','select public.advance_sos_rounds()');
  end if;
end $$;

-- A single-use proof row bridges Twilio Verify to unauthenticated guest SOS.
create table if not exists public.sos_guest_phone_verifications(
  proof_hash text primary key,
  phone_hash text not null,
  device_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.sos_guest_phone_verifications enable row level security;
alter table public.sos_guest_phone_verifications force row level security;
create policy sos_guest_phone_verifications_service_only on public.sos_guest_phone_verifications for all to service_role using(true) with check(true);
revoke all on public.sos_guest_phone_verifications from anon,authenticated;

create table if not exists public.sos_guest_otp_daily_usage(
  usage_day date not null,
  subject_kind text not null check(subject_kind in ('phone','device','ip')),
  subject_hash text not null,
  send_count integer not null default 0,
  primary key(usage_day,subject_kind,subject_hash)
);
alter table public.sos_guest_otp_daily_usage enable row level security;
alter table public.sos_guest_otp_daily_usage force row level security;
create policy sos_guest_otp_usage_service_only on public.sos_guest_otp_daily_usage for all to service_role using(true) with check(true);
revoke all on public.sos_guest_otp_daily_usage from anon,authenticated;

create table if not exists public.sos_guest_otp_budget(
  usage_day date primary key,
  reserved_usd numeric(10,4) not null default 0 check(reserved_usd>=0)
);
alter table public.sos_guest_otp_budget enable row level security;
alter table public.sos_guest_otp_budget force row level security;
create policy sos_guest_otp_budget_service_only on public.sos_guest_otp_budget for all to service_role using(true) with check(true);
revoke all on public.sos_guest_otp_budget from anon,authenticated;

create or replace function public.reserve_sos_guest_otp_budget(p_daily_cap_usd numeric,p_estimated_send_usd numeric)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_day date:=current_date; v_reserved numeric;
begin
  if p_daily_cap_usd<=0 or p_estimated_send_usd<=0 or p_estimated_send_usd>p_daily_cap_usd then return false; end if;
  insert into public.sos_guest_otp_budget(usage_day,reserved_usd) values(v_day,p_estimated_send_usd)
  on conflict(usage_day) do update set reserved_usd=sos_guest_otp_budget.reserved_usd+p_estimated_send_usd
    where sos_guest_otp_budget.reserved_usd+p_estimated_send_usd<=p_daily_cap_usd returning reserved_usd into v_reserved;
  return v_reserved is not null;
end $$;
revoke all on function public.reserve_sos_guest_otp_budget(numeric,numeric) from public,anon,authenticated;
grant execute on function public.reserve_sos_guest_otp_budget(numeric,numeric) to service_role;

create or replace function public.reserve_sos_guest_otp(p_phone_hash text,p_device_hash text,p_ip_hash text,p_daily_cap integer default 50)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_day date:=current_date; v_limit integer:=greatest(1,least(p_daily_cap,10000)); v_phone integer; v_device integer; v_ip integer;
begin
  insert into public.sos_guest_otp_daily_usage values(v_day,'phone',p_phone_hash,1) on conflict(usage_day,subject_kind,subject_hash) do update set send_count=sos_guest_otp_daily_usage.send_count+1 where sos_guest_otp_daily_usage.send_count<v_limit returning send_count into v_phone;
  if v_phone is null then return false; end if;
  insert into public.sos_guest_otp_daily_usage values(v_day,'device',p_device_hash,1) on conflict(usage_day,subject_kind,subject_hash) do update set send_count=sos_guest_otp_daily_usage.send_count+1 where sos_guest_otp_daily_usage.send_count<v_limit returning send_count into v_device;
  if v_device is null then update public.sos_guest_otp_daily_usage set send_count=send_count-1 where usage_day=v_day and subject_kind='phone' and subject_hash=p_phone_hash; return false; end if;
  insert into public.sos_guest_otp_daily_usage values(v_day,'ip',p_ip_hash,1) on conflict(usage_day,subject_kind,subject_hash) do update set send_count=sos_guest_otp_daily_usage.send_count+1 where sos_guest_otp_daily_usage.send_count<v_limit returning send_count into v_ip;
  if v_ip is null then
    update public.sos_guest_otp_daily_usage set send_count=send_count-1 where usage_day=v_day and subject_kind='phone' and subject_hash=p_phone_hash;
    update public.sos_guest_otp_daily_usage set send_count=send_count-1 where usage_day=v_day and subject_kind='device' and subject_hash=p_device_hash;
    return false;
  end if;
  return true;
end $$;
revoke all on function public.reserve_sos_guest_otp(text,text,text,integer) from public,anon,authenticated;
grant execute on function public.reserve_sos_guest_otp(text,text,text,integer) to service_role;

create or replace function public.save_sos_guest_phone_proof(p_proof_hash text,p_phone_hash text,p_device_hash text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.sos_guest_phone_verifications(proof_hash,phone_hash,device_hash,expires_at)
  values(p_proof_hash,p_phone_hash,p_device_hash,now()+interval '10 minutes') on conflict(proof_hash) do nothing;
  return found;
end $$;
revoke all on function public.save_sos_guest_phone_proof(text,text,text) from public,anon,authenticated;
grant execute on function public.save_sos_guest_phone_proof(text,text,text) to service_role;

create or replace function public.consume_sos_guest_phone_proof(p_proof_hash text,p_phone_hash text,p_device_hash text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update public.sos_guest_phone_verifications set consumed_at=now()
  where proof_hash=p_proof_hash and phone_hash=p_phone_hash and device_hash=p_device_hash and consumed_at is null and expires_at>now();
  return found;
end $$;
revoke all on function public.consume_sos_guest_phone_proof(text,text,text) from public,anon,authenticated;
grant execute on function public.consume_sos_guest_phone_proof(text,text,text) to service_role;

alter table public.sos_guest_otp_daily_usage drop constraint if exists sos_guest_otp_daily_usage_subject_kind_check;
alter table public.sos_guest_otp_daily_usage add constraint sos_guest_otp_daily_usage_subject_kind_check
  check(subject_kind in ('phone','device','ip','fallback_phone','fallback_device','fallback_ip'));

create or replace function public.reserve_sos_guest_fallback(p_phone_hash text,p_device_hash text,p_ip_hash text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_day date:=current_date; v_phone integer; v_device integer; v_ip integer;
begin
  insert into public.sos_guest_otp_daily_usage values(v_day,'fallback_phone',p_phone_hash,1) on conflict(usage_day,subject_kind,subject_hash) do update set send_count=sos_guest_otp_daily_usage.send_count+1 where sos_guest_otp_daily_usage.send_count<1 returning send_count into v_phone;
  if v_phone is null then return false; end if;
  insert into public.sos_guest_otp_daily_usage values(v_day,'fallback_device',p_device_hash,1) on conflict(usage_day,subject_kind,subject_hash) do update set send_count=sos_guest_otp_daily_usage.send_count+1 where sos_guest_otp_daily_usage.send_count<1 returning send_count into v_device;
  if v_device is null then update public.sos_guest_otp_daily_usage set send_count=send_count-1 where usage_day=v_day and subject_kind='fallback_phone' and subject_hash=p_phone_hash; return false; end if;
  insert into public.sos_guest_otp_daily_usage values(v_day,'fallback_ip',p_ip_hash,1) on conflict(usage_day,subject_kind,subject_hash) do update set send_count=sos_guest_otp_daily_usage.send_count+1 where sos_guest_otp_daily_usage.send_count<1 returning send_count into v_ip;
  if v_ip is null then
    update public.sos_guest_otp_daily_usage set send_count=send_count-1 where usage_day=v_day and subject_kind='fallback_phone' and subject_hash=p_phone_hash;
    update public.sos_guest_otp_daily_usage set send_count=send_count-1 where usage_day=v_day and subject_kind='fallback_device' and subject_hash=p_device_hash;
    return false;
  end if;
  return true;
end $$;
revoke all on function public.reserve_sos_guest_fallback(text,text,text) from public,anon,authenticated;
grant execute on function public.reserve_sos_guest_fallback(text,text,text) to service_role;

drop function if exists public.clinic_sos_settings();
create function public.clinic_sos_settings()
returns table(clinic_id uuid,clinic_name text,supports_24h boolean,supports_24h_requested boolean,emergency_status text,address text,latitude double precision,longitude double precision,location_verified_at timestamptz,is_admin boolean)
language sql stable security definer set search_path=public,extensions,pg_temp as $$
  select c.id,c.name,c.supports_24h,c.supports_24h_requested,c.emergency_status,c.address,
    case when c.location is null then null else extensions.st_y(c.location::extensions.geometry) end,
    case when c.location is null then null else extensions.st_x(c.location::extensions.geometry) end,
    c.location_verified_at,cs.staff_role='clinic_admin'
  from public.clinics c join public.clinic_staff cs on cs.clinic_id=c.id
  where cs.user_id=(select auth.uid())
$$;
revoke all on function public.clinic_sos_settings() from public,anon;
grant execute on function public.clinic_sos_settings() to authenticated;

create or replace function public.create_sos(
  p_owner uuid,p_pet uuid,p_guest_phone text,p_guest_name text,p_guest_token_hash text,p_phone_hash text,p_species text,
  p_symptoms text[],p_urgency text,p_rule_ids uuid[],p_lng double precision,p_lat double precision,p_idempotency uuid,p_device_hash text,
  p_guest_proof_hash text default null,p_unverified_fallback boolean default false,p_ip_hash text default null
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
  if p_owner is null then
    select id into v_id from public.sos_requests where owner_id is null and guest_token_hash=p_guest_token_hash and idempotency_key=p_idempotency;
  else
    select id into v_id from public.sos_requests where owner_id=p_owner and idempotency_key=p_idempotency;
  end if;
  if v_id is not null then return v_id; end if;
  if not public.sos_check_rate_limit('device',p_device_hash,v_rate_limit) then raise exception 'rate_limited_device'; end if;
  if p_owner is not null and not public.sos_check_rate_limit('user',p_owner::text,v_rate_limit) then raise exception 'rate_limited_user'; end if;
  if p_owner is null then
    if not public.sos_check_rate_limit('phone',p_phone_hash,v_rate_limit) then raise exception 'rate_limited_phone'; end if;
    if p_guest_proof_hash is not null then
      if not public.consume_sos_guest_phone_proof(p_guest_proof_hash,p_phone_hash,p_device_hash) then raise exception 'guest_phone_verification_required'; end if;
    else
      if not p_unverified_fallback or not public.reserve_sos_guest_fallback(p_phone_hash,p_device_hash,coalesce(p_ip_hash,'unknown')) then raise exception 'guest_phone_verification_required'; end if;
    end if;
  elsif p_phone_hash is not null then
    if not public.sos_check_rate_limit('phone',p_phone_hash,v_rate_limit) then raise exception 'rate_limited_phone'; end if;
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
    for i in 1..array_length(v_radii,1) loop perform public.sos_start_round(v_id,v_radii[i],null,null); exit when exists(select 1 from public.sos_dispatches where request_id=v_id); end loop;
    if not exists(select 1 from public.sos_dispatches where request_id=v_id) then update public.sos_requests set status='no_clinic' where id=v_id; end if;
  end if;
  return v_id;
end $$;
revoke all on function public.create_sos(uuid,uuid,text,text,text,text,text,text[],text,uuid[],double precision,double precision,uuid,text,text,boolean,text) from public,anon,authenticated;
grant execute on function public.create_sos(uuid,uuid,text,text,text,text,text[],text,uuid[],double precision,double precision,uuid,text,text,boolean,text) to service_role;

create table if not exists public.sos_privacy_config(
  config_key text primary key default 'default' check(config_key='default'),
  location_retention_days integer not null default 30 check(location_retention_days between 1 and 3650)
);
insert into public.sos_privacy_config(config_key) values('default') on conflict do nothing;
alter table public.sos_privacy_config enable row level security;
alter table public.sos_privacy_config force row level security;
create policy sos_privacy_config_service_only on public.sos_privacy_config for all to service_role using(true) with check(true);

alter table public.sos_requests add column if not exists coarse_location extensions.geography(point,4326);
alter table public.sos_requests add column if not exists closed_at timestamptz;
update public.sos_requests set closed_at=updated_at where status in ('cancelled','expired','no_clinic') and closed_at is null;
create index if not exists sos_closed_location_retention_idx on public.sos_requests(closed_at) where closed_at is not null and location is not null;

create or replace function public.mark_sos_closed_at()
returns trigger language plpgsql as $$
begin
  if new.closed_at is null and new.status in ('cancelled','expired','no_clinic') then new.closed_at:=now(); end if;
  return new;
end $$;
drop trigger if exists sos_mark_closed_at on public.sos_requests;
create trigger sos_mark_closed_at before insert or update of status on public.sos_requests for each row execute function public.mark_sos_closed_at();

create or replace function public.update_sos_arrival_status(p_request uuid,p_status text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_clinic uuid; v_current text; v_rank integer; v_next integer;
begin
  if p_status not in ('on_the_way','arrived') then raise exception 'invalid_arrival_status'; end if;
  select accepted_clinic_id,arrival_status into v_clinic,v_current from public.sos_requests where id=p_request and status='accepted' for update;
  if not found or not public.is_clinic_member(v_clinic) then raise exception 'clinic_access_denied'; end if;
  v_rank:=case v_current when 'accepted' then 0 when 'on_the_way' then 1 else 2 end;
  v_next:=case p_status when 'on_the_way' then 1 else 2 end;
  if v_next<=v_rank then return true; end if;
  if v_next<>v_rank+1 then return false; end if;
  update public.sos_requests set arrival_status=p_status,closed_at=case when p_status='arrived' then coalesce(closed_at,now()) else closed_at end,updated_at=now() where id=p_request;
  insert into public.audit_logs(actor_id,clinic_id,action,entity_type,entity_id,metadata) values((select auth.uid()),v_clinic,'update','sos_arrival_status',p_request::text,jsonb_build_object('status',p_status));
  return true;
end $$;
revoke all on function public.update_sos_arrival_status(uuid,text) from public,anon;
grant execute on function public.update_sos_arrival_status(uuid,text) to authenticated;
alter table public.web_push_subscriptions add column if not exists device_id uuid not null default gen_random_uuid();
create unique index if not exists web_push_user_device_uq on public.web_push_subscriptions(user_id,device_id);
create index if not exists web_push_active_user_device_idx on public.web_push_subscriptions(user_id,device_id) where revoked_at is null;
create or replace function public.reduce_closed_sos_locations(p_retention_days integer default null)
returns integer language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare v_days integer; v_count integer;
begin
  select coalesce(p_retention_days,location_retention_days) into v_days from public.sos_privacy_config where config_key='default';
  update public.sos_requests set
    coarse_location=extensions.st_transform(extensions.st_snaptogrid(extensions.st_transform(location::extensions.geometry,3857),1000),4326)::extensions.geography,
    location=null,updated_at=now()
  where location is not null and closed_at is not null and closed_at<now()-make_interval(days=>greatest(1,least(v_days,3650)));
  get diagnostics v_count=row_count;
  return v_count;
end $$;
revoke all on function public.reduce_closed_sos_locations(integer) from public,anon,authenticated;
grant execute on function public.reduce_closed_sos_locations(integer) to service_role;
do $$ begin
  if exists(select 1 from pg_namespace where nspname='cron') then
    perform cron.schedule('pawcare-sos-location-reduction','15 3 * * *','select public.reduce_closed_sos_locations()');
  end if;
end $$;
