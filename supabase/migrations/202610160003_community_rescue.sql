-- Community and rescue: exact coordinates and receipt artifacts stay private.
create table if not exists public.community_rate_limits (
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check(action in ('post','comment','lost_found','stray','rescue','moderation_report')),
  window_start timestamptz not null,
  attempts integer not null default 0 check(attempts>=0),
  primary key(user_id,action,window_start)
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null check(length(trim(body)) between 1 and 3000),
  status text not null default 'pending' check(status in ('pending','approved','rejected','hidden')),
  moderated_by uuid references public.profiles(id), moderated_at timestamptz,
  created_at timestamptz not null default now(), is_demo boolean not null default false
);
create index if not exists community_comments_post_idx on public.community_comments(post_id,created_at);

alter table public.community_posts
  add column if not exists status text not null default 'pending' check(status in ('pending','approved','rejected','hidden')),
  add column if not exists image_path text,
  add column if not exists image_safety_status text not null default 'not_provided' check(image_safety_status in ('not_provided','pending','approved','rejected')),
  add column if not exists moderated_by uuid references public.profiles(id),
  add column if not exists moderated_at timestamptz,
  add column if not exists report_count integer not null default 0 check(report_count>=0),
  add column if not exists updated_at timestamptz not null default now();
update public.community_posts set status='approved' where is_demo;
drop trigger if exists set_updated_at on public.community_posts;
create trigger set_updated_at before update on public.community_posts for each row execute function public.set_updated_at();

create table if not exists public.lost_found_reports (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id),
  kind text not null check(kind in ('lost','found')), pet_id uuid references public.pets(id),
  species text not null check(species in ('dog','cat','other')), breed text,
  color_tags text[] not null default '{}', description text not null check(length(trim(description)) between 1 and 3000),
  lost_found_at timestamptz not null default now(), exact_location extensions.geography(point,4326) not null,
  public_location extensions.geography(point,4326) not null,
  image_path text, image_safety_status text not null default 'not_provided' check(image_safety_status in ('pending','approved','rejected','not_provided')),
  status text not null default 'pending' check(status in ('pending','open','matched','resolved','rejected','hidden')),
  matched_report_id uuid references public.lost_found_reports(id), matched_at timestamptz,
  moderated_by uuid references public.profiles(id), moderated_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), is_demo boolean not null default false,
  check(kind='found' or pet_id is not null)
);
create index if not exists lost_found_public_gist on public.lost_found_reports using gist(public_location);
create index if not exists lost_found_match_idx on public.lost_found_reports(species,kind,status,created_at desc);

create table if not exists public.stray_reports (
  id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles(id),
  species text not null check(species in ('dog','cat','other')), color_tags text[] not null default '{}',
  description text check(description is null or length(description)<=2000), sighted_at timestamptz not null default now(),
  exact_location extensions.geography(point,4326) not null, public_location extensions.geography(point,4326) not null,
  image_path text, image_safety_status text not null default 'not_provided' check(image_safety_status in ('pending','approved','rejected','not_provided')),
  status text not null default 'pending' check(status in ('pending','approved','rejected','hidden')),
  moderated_by uuid references public.profiles(id), moderated_at timestamptz,
  created_at timestamptz not null default now(), is_demo boolean not null default false
);
create index if not exists stray_public_gist on public.stray_reports using gist(public_location);
create index if not exists stray_neighborhood_count_idx on public.stray_reports(species,status,sighted_at desc);

create table if not exists public.rescue_partners (
  id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id), clinic_id uuid references public.clinics(id),
  organization_name text not null, verification_status text not null default 'pending' check(verification_status in ('pending','verified','rejected','suspended')),
  verified_by uuid references public.profiles(id), verified_at timestamptz, documents_path text,
  created_at timestamptz not null default now(), is_demo boolean not null default false,
  check(user_id is not null or clinic_id is not null), unique(user_id), unique(clinic_id)
);
create table if not exists public.rescue_cases (
  id uuid primary key default gen_random_uuid(), created_by uuid not null references public.profiles(id),
  pet_id uuid references public.pets(id), title text not null check(length(trim(title)) between 5 and 160),
  summary text not null check(length(trim(summary)) between 20 and 4000), species text not null check(species in ('dog','cat','other')),
  clinic_id uuid references public.clinics(id), rescue_partner_id uuid references public.rescue_partners(id),
  verification_status text not null default 'pending' check(verification_status in ('pending','verified','rejected','suspended')),
  verified_by uuid references public.profiles(id), verified_at timestamptz,
  status text not null default 'pending' check(status in ('pending','active','funded','completed','rejected','suspended')),
  image_path text, image_safety_status text not null default 'not_provided' check(image_safety_status in ('pending','approved','rejected','not_provided')),
  report_count integer not null default 0 check(report_count>=0), created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), is_demo boolean not null default false,
  check(clinic_id is not null or rescue_partner_id is not null)
);
create table if not exists public.rescue_estimates (
  id uuid primary key default gen_random_uuid(), rescue_case_id uuid not null references public.rescue_cases(id),
  vet_id uuid not null references public.profiles(id), clinic_id uuid not null references public.clinics(id),
  amount_vnd bigint not null check(amount_vnd>0), currency text not null default 'VND' check(currency='VND'),
  notes text not null check(length(trim(notes)) between 10 and 3000), document_path text not null,
  version integer not null check(version>0), status text not null default 'submitted' check(status in ('submitted','verified','rejected','superseded')),
  verified_by uuid references public.profiles(id), verified_at timestamptz, created_at timestamptz not null default now(), is_demo boolean not null default false,
  unique(rescue_case_id,version)
);
create table if not exists public.donation_ledger (
  id uuid primary key default gen_random_uuid(), rescue_case_id uuid not null references public.rescue_cases(id),
  recipient_type text not null check(recipient_type in ('clinic','rescue_partner')),
  recipient_clinic_id uuid references public.clinics(id), recipient_partner_id uuid references public.rescue_partners(id),
  donor_alias text check(donor_alias is null or length(donor_alias)<=80), amount_vnd bigint not null check(amount_vnd>0),
  currency text not null default 'VND' check(currency='VND'), paid_directly boolean not null default true check(paid_directly),
  receipt_path text not null, receipt_sha256 text not null check(receipt_sha256 ~ '^[a-f0-9]{64}$'),
  status text not null default 'pending' check(status in ('pending','verified','rejected')),
  verified_by uuid references public.profiles(id), verified_at timestamptz,
  created_at timestamptz not null default now(), is_demo boolean not null default false,
  check((recipient_type='clinic' and recipient_clinic_id is not null and recipient_partner_id is null)
     or (recipient_type='rescue_partner' and recipient_partner_id is not null and recipient_clinic_id is null))
);
create index if not exists donation_ledger_public_idx on public.donation_ledger(rescue_case_id,created_at) where status='verified';
create table if not exists public.rescue_ledger_events (
  id bigint generated always as identity primary key, donation_id uuid not null references public.donation_ledger(id),
  actor_id uuid references public.profiles(id), event text not null check(event in ('submitted','verified','rejected')),
  metadata jsonb not null default '{}', created_at timestamptz not null default now(), is_demo boolean not null default false
);

create or replace function public.protect_rescue_ledger()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op='DELETE' then raise exception 'rescue_ledger_is_append_only'; end if;
  if old.status<>'pending' or new.status not in ('verified','rejected')
    or (to_jsonb(new)-array['status','verified_by','verified_at'])<>(to_jsonb(old)-array['status','verified_by','verified_at']) then
    raise exception 'rescue_ledger_correction_requires_new_entry';
  end if;
  return new;
end $$;
create or replace function public.prevent_ledger_event_mutation()
returns trigger language plpgsql set search_path = '' as $$ begin raise exception 'rescue_ledger_events_are_append_only'; end $$;
create trigger rescue_ledger_append_only before update or delete on public.donation_ledger for each row execute function public.protect_rescue_ledger();
create trigger rescue_ledger_events_append_only before update or delete on public.rescue_ledger_events for each row execute function public.prevent_ledger_event_mutation();

create table if not exists public.community_moderation_reports (
  id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles(id),
  target_type text not null check(target_type in ('post','comment','lost_found','stray','rescue_case')),
  target_id uuid not null, reason text not null check(length(trim(reason)) between 5 and 1000),
  status text not null default 'open' check(status in ('open','reviewing','actioned','dismissed')),
  moderator_id uuid references public.profiles(id), moderator_note text, created_at timestamptz not null default now(),
  resolved_at timestamptz, is_demo boolean not null default false
);
create table if not exists public.community_appeals (
  id uuid primary key default gen_random_uuid(), appellant_id uuid not null references public.profiles(id),
  target_type text not null check(target_type in ('post','comment','lost_found','stray','rescue_case')),
  target_id uuid not null, reason text not null check(length(trim(reason)) between 10 and 1500),
  status text not null default 'pending' check(status in ('pending','accepted','denied')),
  moderator_id uuid references public.profiles(id), moderator_note text, created_at timestamptz not null default now(),
  resolved_at timestamptz, is_demo boolean not null default false
);
create unique index if not exists community_appeals_one_open_idx on public.community_appeals(appellant_id,target_type,target_id) where status='pending';

-- All public points are snapped in Web Mercator to a 50m street-level grid.
create or replace function public.fuzz_community_location()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.public_location := extensions.st_transform(
    extensions.st_snaptogrid(extensions.st_transform(new.exact_location::extensions.geometry,3857),50),4326
  )::extensions.geography;
  return new;
end $$;
create trigger fuzz_lost_found_location before insert or update of exact_location on public.lost_found_reports for each row execute function public.fuzz_community_location();
create trigger fuzz_stray_location before insert or update of exact_location on public.stray_reports for each row execute function public.fuzz_community_location();

create or replace function public.reserve_community_rate_limit(p_action text,p_limit integer,p_window_seconds integer default 3600)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_start timestamptz; v_attempts integer;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if p_action not in ('post','comment','lost_found','stray','rescue','moderation_report') or p_limit<1 or p_window_seconds<1 then raise exception 'invalid_limit'; end if;
  v_start := to_timestamp(floor(extract(epoch from now())/p_window_seconds)*p_window_seconds);
  insert into public.community_rate_limits(user_id,action,window_start,attempts) values(v_user,p_action,v_start,1)
  on conflict(user_id,action,window_start) do update set attempts=community_rate_limits.attempts+1
  where community_rate_limits.attempts<p_limit returning attempts into v_attempts;
  return v_attempts is not null;
end $$;
revoke all on function public.reserve_community_rate_limit(text,integer,integer) from public;
grant execute on function public.reserve_community_rate_limit(text,integer,integer) to authenticated;

create or replace function public.submit_community_post(p_title text,p_body text,p_image_path text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_id uuid;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if not public.reserve_community_rate_limit('post',5,3600) then raise exception 'rate_limited'; end if;
  if length(trim(p_title)) not between 3 and 160 or length(trim(p_body)) not between 10 and 5000 then raise exception 'invalid_post'; end if;
  if p_image_path is not null and split_part(p_image_path,'/',1)<>v_user::text then raise exception 'invalid_image_path'; end if;
  insert into public.community_posts(author_id,title,body,status,image_path,image_safety_status)
  values(v_user,trim(p_title),trim(p_body),'pending',p_image_path,case when p_image_path is null then 'not_provided' else 'pending' end)
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.submit_community_post(text,text,text) from public;
grant execute on function public.submit_community_post(text,text,text) to authenticated;

create or replace function public.submit_community_comment(p_post uuid,p_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_id uuid;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if not public.reserve_community_rate_limit('comment',30,3600) then raise exception 'rate_limited'; end if;
  if length(trim(p_body)) not between 1 and 3000 then raise exception 'invalid_comment'; end if;
  insert into public.community_comments(post_id,author_id,body,status)
  select p.id,v_user,trim(p_body),'pending' from public.community_posts p where p.id=p_post and p.status='approved'
  returning id into v_id;
  if not found then raise exception 'post_not_available'; end if;
  return v_id;
end $$;
revoke all on function public.submit_community_comment(uuid,text) from public;
grant execute on function public.submit_community_comment(uuid,text) to authenticated;

create or replace function public.submit_lost_found_report(
  p_kind text,p_pet uuid,p_species text,p_breed text,p_colors text[],p_description text,p_reported_at timestamptz,
  p_lat double precision,p_lng double precision,p_image_path text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_id uuid; v_point extensions.geography;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if not public.reserve_community_rate_limit('lost_found',5,86400) then raise exception 'rate_limited'; end if;
  if p_kind not in ('lost','found') or p_species not in ('dog','cat','other') or length(trim(p_description)) not between 1 and 3000 then raise exception 'invalid_report'; end if;
  if p_kind='lost' and (p_pet is null or not public.owns_pet(p_pet)) then raise exception 'pet_access_denied'; end if;
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'invalid_location'; end if;
  if p_image_path is not null and split_part(p_image_path,'/',1)<>v_user::text then raise exception 'invalid_image_path'; end if;
  v_point:=extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography;
  insert into public.lost_found_reports(owner_id,kind,pet_id,species,breed,color_tags,description,lost_found_at,exact_location,public_location,image_path,image_safety_status,status)
  values(v_user,p_kind,p_pet,p_species,nullif(trim(p_breed),''),coalesce(p_colors,'{}'),trim(p_description),coalesce(p_reported_at,now()),v_point,v_point,p_image_path,case when p_image_path is null then 'not_provided' else 'pending' end,'pending')
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.submit_lost_found_report(text,uuid,text,text,text[],text,timestamptz,double precision,double precision,text) from public;
grant execute on function public.submit_lost_found_report(text,uuid,text,text,text[],text,timestamptz,double precision,double precision,text) to authenticated;

create or replace function public.submit_stray_report(
  p_species text,p_colors text[],p_description text,p_sighted_at timestamptz,p_lat double precision,p_lng double precision,p_image_path text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_id uuid; v_point extensions.geography;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if not public.reserve_community_rate_limit('stray',20,86400) then raise exception 'rate_limited'; end if;
  if p_species not in ('dog','cat','other') or (p_description is not null and length(trim(p_description))>2000) then raise exception 'invalid_report'; end if;
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'invalid_location'; end if;
  if p_image_path is not null and split_part(p_image_path,'/',1)<>v_user::text then raise exception 'invalid_image_path'; end if;
  v_point:=extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography;
  insert into public.stray_reports(reporter_id,species,color_tags,description,sighted_at,exact_location,public_location,image_path,image_safety_status,status)
  values(v_user,p_species,coalesce(p_colors,'{}'),nullif(trim(p_description),''),coalesce(p_sighted_at,now()),v_point,v_point,p_image_path,case when p_image_path is null then 'not_provided' else 'pending' end,'pending') returning id into v_id;
  return v_id;
end $$;
revoke all on function public.submit_stray_report(text,text[],text,timestamptz,double precision,double precision,text) from public;
grant execute on function public.submit_stray_report(text,text[],text,timestamptz,double precision,double precision,text) to authenticated;

create or replace function public.submit_rescue_case(
  p_title text,p_summary text,p_species text,p_pet uuid,p_clinic uuid,p_partner uuid,p_image_path text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_id uuid;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if not public.reserve_community_rate_limit('rescue',3,86400) then raise exception 'rate_limited'; end if;
  if length(trim(p_title)) not between 5 and 160 or length(trim(p_summary)) not between 20 and 4000 or p_species not in ('dog','cat','other') then raise exception 'invalid_rescue_case'; end if;
  if p_pet is not null and not public.owns_pet(p_pet) then raise exception 'pet_access_denied'; end if;
  if p_clinic is null and p_partner is null then raise exception 'verified_partner_required'; end if;
  if p_clinic is not null and not exists(select 1 from public.clinics where id=p_clinic and verified) then raise exception 'clinic_not_verified'; end if;
  if p_partner is not null and not exists(select 1 from public.rescue_partners where id=p_partner and verification_status='verified') then raise exception 'rescuer_not_verified'; end if;
  if p_image_path is not null and split_part(p_image_path,'/',1)<>v_user::text then raise exception 'invalid_image_path'; end if;
  insert into public.rescue_cases(created_by,pet_id,title,summary,species,clinic_id,rescue_partner_id,status,verification_status,image_path,image_safety_status)
  values(v_user,p_pet,trim(p_title),trim(p_summary),p_species,p_clinic,p_partner,'pending','pending',p_image_path,case when p_image_path is null then 'not_provided' else 'pending' end) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.submit_rescue_case(text,text,text,uuid,uuid,uuid,text) from public;
grant execute on function public.submit_rescue_case(text,text,text,uuid,uuid,uuid,text) to authenticated;

create or replace function public.submit_rescue_estimate(p_case uuid,p_amount bigint,p_notes text,p_document_path text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare c public.rescue_cases; v_user uuid := (select auth.uid()); v_id uuid; v_version integer;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  select * into c from public.rescue_cases where id=p_case for update;
  if not found or c.clinic_id is null or not public.is_clinic_vet(c.clinic_id) then raise exception 'clinic_vet_required'; end if;
  if p_amount<=0 or length(trim(p_notes)) not between 10 and 3000 or split_part(p_document_path,'/',1)<>v_user::text then raise exception 'invalid_estimate'; end if;
  select coalesce(max(version),0)+1 into v_version from public.rescue_estimates where rescue_case_id=p_case;
  insert into public.rescue_estimates(rescue_case_id,vet_id,clinic_id,amount_vnd,notes,document_path,version,status)
  values(p_case,v_user,c.clinic_id,p_amount,trim(p_notes),p_document_path,v_version,'submitted') returning id into v_id;
  return v_id;
end $$;
revoke all on function public.submit_rescue_estimate(uuid,bigint,text,text) from public;
grant execute on function public.submit_rescue_estimate(uuid,bigint,text,text) to authenticated;

create or replace function public.submit_donation_receipt(p_case uuid,p_amount bigint,p_donor_alias text,p_path text,p_sha256 text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare c public.rescue_cases; v_user uuid := (select auth.uid()); v_id uuid; recipient text; clinic uuid; partner uuid;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if not public.reserve_community_rate_limit('rescue',20,86400) then raise exception 'rate_limited'; end if;
  select * into c from public.rescue_cases where id=p_case and verification_status='verified' and status='active';
  if not found or not exists(select 1 from public.rescue_estimates e where e.rescue_case_id=p_case and e.status='verified') then raise exception 'verified_rescue_case_required'; end if;
  if p_amount<=0 or split_part(p_path,'/',1)<>v_user::text or p_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'invalid_receipt'; end if;
  if not exists(select 1 from storage.objects o where o.bucket_id='community-private' and o.name=p_path) then raise exception 'receipt_upload_required'; end if;
  if c.clinic_id is not null then recipient:='clinic';clinic:=c.clinic_id;partner:=null;
  else recipient:='rescue_partner';clinic:=null;partner:=c.rescue_partner_id; end if;
  insert into public.donation_ledger(rescue_case_id,recipient_type,recipient_clinic_id,recipient_partner_id,donor_alias,amount_vnd,receipt_path,receipt_sha256,status)
  values(p_case,recipient,clinic,partner,nullif(trim(p_donor_alias),''),p_amount,p_path,p_sha256,'pending') returning id into v_id;
  insert into public.rescue_ledger_events(donation_id,actor_id,event,metadata,is_demo)
  values(v_id,v_user,'submitted',jsonb_build_object('amount_vnd',p_amount),c.is_demo);
  return v_id;
end $$;
revoke all on function public.submit_donation_receipt(uuid,bigint,text,text,text) from public;
grant execute on function public.submit_donation_receipt(uuid,bigint,text,text,text) to authenticated;

create or replace function public.submit_community_moderation_report(p_type text,p_target uuid,p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_id uuid; v_exists boolean := false;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if not public.reserve_community_rate_limit('moderation_report',10,86400) then raise exception 'rate_limited'; end if;
  if length(trim(p_reason)) not between 5 and 1000 then raise exception 'invalid_report_reason'; end if;
  if p_type='post' then select exists(select 1 from public.community_posts where id=p_target and author_id<>v_user) into v_exists;
  elsif p_type='comment' then select exists(select 1 from public.community_comments where id=p_target and author_id<>v_user) into v_exists;
  elsif p_type='lost_found' then select exists(select 1 from public.lost_found_reports where id=p_target and owner_id<>v_user) into v_exists;
  elsif p_type='stray' then select exists(select 1 from public.stray_reports where id=p_target and reporter_id<>v_user) into v_exists;
  elsif p_type='rescue_case' then select exists(select 1 from public.rescue_cases where id=p_target and created_by<>v_user) into v_exists;
  else raise exception 'invalid_target_type'; end if;
  if not v_exists then raise exception 'target_not_reportable'; end if;
  insert into public.community_moderation_reports(reporter_id,target_type,target_id,reason) values(v_user,p_type,p_target,trim(p_reason)) returning id into v_id;
  if p_type='post' then update public.community_posts set report_count=report_count+1 where id=p_target;
  elsif p_type='lost_found' then update public.lost_found_reports set report_count=report_count+1 where id=p_target;
  elsif p_type='rescue_case' then update public.rescue_cases set report_count=report_count+1 where id=p_target;
  end if;
  return v_id;
end $$;
revoke all on function public.submit_community_moderation_report(text,uuid,text) from public;
grant execute on function public.submit_community_moderation_report(text,uuid,text) to authenticated;

create or replace function public.submit_community_appeal(p_type text,p_target uuid,p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_owner uuid; v_status text; v_id uuid;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if not public.reserve_community_rate_limit('moderation_report',3,86400) then raise exception 'rate_limited'; end if;
  if length(trim(p_reason)) not between 10 and 1500 then raise exception 'invalid_appeal_reason'; end if;
  if p_type='post' then select author_id,status into v_owner,v_status from public.community_posts where id=p_target;
  elsif p_type='comment' then select author_id,status into v_owner,v_status from public.community_comments where id=p_target;
  elsif p_type='lost_found' then select owner_id,status into v_owner,v_status from public.lost_found_reports where id=p_target;
  elsif p_type='stray' then select reporter_id,status into v_owner,v_status from public.stray_reports where id=p_target;
  elsif p_type='rescue_case' then select created_by,status into v_owner,v_status from public.rescue_cases where id=p_target;
  else raise exception 'invalid_target_type'; end if;
  if v_owner<>v_user or v_status not in ('rejected','hidden') then raise exception 'appeal_not_allowed'; end if;
  insert into public.community_appeals(appellant_id,target_type,target_id,reason) values(v_user,p_type,p_target,trim(p_reason)) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.submit_community_appeal(text,uuid,text) from public;
grant execute on function public.submit_community_appeal(text,uuid,text) to authenticated;

create or replace function public.apply_rescue_partner(p_org_name text,p_clinic uuid default null,p_documents text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_id uuid;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if not public.reserve_community_rate_limit('rescue',2,2592000) then raise exception 'rate_limited'; end if;
  if length(trim(p_org_name)) not between 2 and 160 then raise exception 'invalid_organization'; end if;
  if p_clinic is not null and not public.is_clinic_admin(p_clinic) then raise exception 'clinic_admin_required'; end if;
  if p_clinic is null and p_documents is not null and split_part(p_documents,'/',1)<>v_user::text then raise exception 'invalid_document_path'; end if;
  insert into public.rescue_partners(user_id,clinic_id,organization_name,verification_status,documents_path)
  values(case when p_clinic is null then v_user else null end,p_clinic,trim(p_org_name),'pending',p_documents)
  on conflict do nothing returning id into v_id;
  if v_id is null then raise exception 'partner_application_exists'; end if;
  return v_id;
end $$;
revoke all on function public.apply_rescue_partner(text,uuid,text) from public;
grant execute on function public.apply_rescue_partner(text,uuid,text) to authenticated;

create or replace function public.moderate_community_content(p_type text,p_id uuid,p_action text,p_note text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_status text; v_user uuid := (select auth.uid());
begin
  if (select public.current_app_role())<>'platform_admin' then raise exception 'moderator_required'; end if;
  if p_action not in ('approve','reject','hide') then raise exception 'invalid_action'; end if;
  if p_type='post' then
    update public.community_posts set status=case p_action when 'approve' then 'approved' when 'reject' then 'rejected' else 'hidden' end,
      image_safety_status=case when image_path is null then 'not_provided' when p_action='approve' then 'approved' when p_action='reject' then 'rejected' else 'pending' end,
      moderated_by=v_user,moderated_at=now() where id=p_id and status='pending' returning status into v_status;
  elsif p_type='comment' then
    update public.community_comments set status=case p_action when 'approve' then 'approved' when 'reject' then 'rejected' else 'hidden' end,
      moderated_by=v_user,moderated_at=now() where id=p_id and status='pending' returning status into v_status;
  elsif p_type='lost_found' then
    update public.lost_found_reports set status=case p_action when 'approve' then 'open' when 'reject' then 'rejected' else 'hidden' end,
      image_safety_status=case when image_path is null then 'not_provided' when p_action='approve' then 'approved' when p_action='reject' then 'rejected' else 'pending' end,
      moderated_by=v_user,moderated_at=now() where id=p_id and status='pending' returning status into v_status;
  elsif p_type='stray' then
    update public.stray_reports set status=case p_action when 'approve' then 'approved' when 'reject' then 'rejected' else 'hidden' end,
      image_safety_status=case when image_path is null then 'not_provided' when p_action='approve' then 'approved' when p_action='reject' then 'rejected' else 'pending' end,
      moderated_by=v_user,moderated_at=now() where id=p_id and status='pending' returning status into v_status;
  elsif p_type='rescue_case' then
    update public.rescue_cases set status=case p_action when 'approve' then 'active' when 'reject' then 'rejected' else 'suspended' end,
      image_safety_status=case when image_path is null then 'not_provided' when p_action='approve' then 'approved' when p_action='reject' then 'rejected' else 'pending' end,
      updated_at=now() where id=p_id and status='pending' returning status into v_status;
  else raise exception 'invalid_content_type'; end if;
  if v_status is null then return false; end if;
  return true;
end $$;
revoke all on function public.moderate_community_content(text,uuid,text,text) from public;
grant execute on function public.moderate_community_content(text,uuid,text,text) to authenticated;

create or replace function public.verify_donation_receipt(p_donation uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare d public.donation_ledger; c public.rescue_cases; authorized boolean := false; v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  select * into d from public.donation_ledger where id=p_donation for update;
  if not found or d.status<>'pending' then return false; end if;
  select * into c from public.rescue_cases where id=d.rescue_case_id;
  if d.recipient_type='clinic' then
    authorized := public.current_app_role()='platform_admin' or (d.recipient_clinic_id is not null and public.is_clinic_admin(d.recipient_clinic_id));
  else
    authorized := public.current_app_role()='platform_admin' or exists(select 1 from public.rescue_partners rp where rp.id=d.recipient_partner_id and rp.user_id=v_user and rp.verification_status='verified');
  end if;
  if not authorized or c.status not in ('active','funded','completed') or c.verification_status<>'verified'
     or not exists(select 1 from public.rescue_estimates e where e.rescue_case_id=c.id and e.status='verified') then raise exception 'receipt_verification_not_authorized'; end if;
  if (d.recipient_type='clinic' and d.recipient_clinic_id is distinct from c.clinic_id)
    or (d.recipient_type='rescue_partner' and d.recipient_partner_id is distinct from c.rescue_partner_id) then raise exception 'receipt_recipient_mismatch'; end if;
  update public.donation_ledger set status='verified',verified_by=v_user,verified_at=now() where id=d.id;
  insert into public.rescue_ledger_events(donation_id,actor_id,event,metadata,is_demo)
  values(d.id,v_user,'verified',jsonb_build_object('receipt_sha256',d.receipt_sha256,'amount_vnd',d.amount_vnd),d.is_demo);
  return true;
end $$;
revoke all on function public.verify_donation_receipt(uuid) from public;
grant execute on function public.verify_donation_receipt(uuid) to authenticated;

create or replace function public.verify_rescue_case(p_case uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare c public.rescue_cases; authorized boolean := false; v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  select * into c from public.rescue_cases where id=p_case for update;
  if not found or c.verification_status<>'pending' then return false; end if;
  if c.clinic_id is not null then
    authorized := exists(select 1 from public.clinics cl where cl.id=c.clinic_id and cl.verified)
      and public.is_clinic_admin(c.clinic_id);
  elsif c.rescue_partner_id is not null then
    authorized := exists(select 1 from public.rescue_partners rp where rp.id=c.rescue_partner_id and rp.user_id=v_user and rp.verification_status='verified');
  end if;
  if not authorized or not exists(select 1 from public.rescue_estimates e join public.clinics cl on cl.id=e.clinic_id where e.rescue_case_id=c.id and (c.clinic_id is null or e.clinic_id=c.clinic_id) and e.status in ('submitted','verified') and cl.verified) then
    raise exception 'verified_partner_and_vet_estimate_required';
  end if;
  update public.rescue_estimates set status='verified',verified_by=v_user,verified_at=now()
    where id=(select e.id from public.rescue_estimates e join public.clinics cl on cl.id=e.clinic_id where e.rescue_case_id=c.id and (c.clinic_id is null or e.clinic_id=c.clinic_id) and e.status in ('submitted','verified') and cl.verified order by e.version desc limit 1);
  update public.rescue_cases set verification_status='verified',verified_by=v_user,verified_at=now(),status='active',updated_at=now() where id=c.id;
  return true;
end $$;
revoke all on function public.verify_rescue_case(uuid) from public;
grant execute on function public.verify_rescue_case(uuid) to authenticated;

create or replace function public.resolve_lost_found_match(p_mine uuid,p_other uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare a public.lost_found_reports; b public.lost_found_reports; v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  perform 1 from public.lost_found_reports where id in (p_mine,p_other) order by id for update;
  select * into a from public.lost_found_reports where id=p_mine;
  select * into b from public.lost_found_reports where id=p_other;
  if a.owner_id<>v_user or a.status<>'open' or b.status<>'open' or a.kind=b.kind or a.species<>b.species
    or not extensions.st_dwithin(a.public_location,b.public_location,10000) then return false; end if;
  update public.lost_found_reports set status='resolved',matched_report_id=b.id,matched_at=now(),updated_at=now() where id=a.id and status='open';
  return found;
end $$;
revoke all on function public.resolve_lost_found_match(uuid,uuid) from public;
grant execute on function public.resolve_lost_found_match(uuid,uuid) to authenticated;

create or replace function public.public_lost_found_map(p_limit integer default 300)
returns table(id uuid,kind text,species text,color_tags text[],latitude double precision,longitude double precision,created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id,r.kind,r.species,r.color_tags,extensions.st_y(r.public_location::extensions.geometry),extensions.st_x(r.public_location::extensions.geometry),r.created_at
  from public.lost_found_reports r where r.status='open' and r.image_safety_status in ('approved','not_provided')
    and (not r.is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true')
  order by r.created_at desc limit greatest(1,least(p_limit,500))
$$;
revoke all on function public.public_lost_found_map(integer) from public;
grant execute on function public.public_lost_found_map(integer) to anon,authenticated;

create or replace function public.public_stray_map(p_limit integer default 300)
returns table(id uuid,species text,color_tags text[],sighted_at timestamptz,latitude double precision,longitude double precision)
language sql stable security definer set search_path = '' as $$
  select s.id,s.species,s.color_tags,s.sighted_at,extensions.st_y(s.public_location::extensions.geometry),extensions.st_x(s.public_location::extensions.geometry)
  from public.stray_reports s where s.status='approved' and s.image_safety_status in ('approved','not_provided') and (not s.is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true')
  order by s.sighted_at desc limit greatest(1,least(p_limit,500))
$$;
revoke all on function public.public_stray_map(integer) from public;
grant execute on function public.public_stray_map(integer) to anon,authenticated;

create or replace function public.public_stray_neighborhood_counts()
returns table(species text,report_count bigint,latitude double precision,longitude double precision)
language sql stable security definer set search_path = '' as $$
  select s.species,count(*),extensions.st_y(extensions.st_centroid(extensions.st_collect(s.public_location::extensions.geometry))),
    extensions.st_x(extensions.st_centroid(extensions.st_collect(s.public_location::extensions.geometry)))
  from public.stray_reports s where s.status='approved' and s.image_safety_status in ('approved','not_provided') and s.sighted_at>now()-interval '90 days'
    and (not s.is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true')
  group by s.species,extensions.st_snaptogrid(extensions.st_transform(s.public_location::extensions.geometry,3857),250)
$$;
revoke all on function public.public_stray_neighborhood_counts() from public;
grant execute on function public.public_stray_neighborhood_counts() to anon,authenticated;

create or replace function public.public_lost_found_matches(p_report uuid,p_limit integer default 20)
returns table(id uuid,kind text,species text,color_tags text[],latitude double precision,longitude double precision,created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select other.id,other.kind,other.species,other.color_tags,
    extensions.st_y(other.public_location::extensions.geometry),extensions.st_x(other.public_location::extensions.geometry),other.created_at
  from public.lost_found_reports mine join public.lost_found_reports other on other.id<>mine.id and other.kind<>mine.kind and other.species=mine.species
  where mine.id=p_report and (mine.owner_id=(select auth.uid()) or public.current_app_role()='platform_admin')
    and mine.status in ('open','matched') and other.status='open'
    and extensions.st_dwithin(mine.public_location,other.public_location,10000)
    and (not other.is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true')
  order by other.public_location <-> mine.public_location limit greatest(1,least(p_limit,50))
$$;
revoke all on function public.public_lost_found_matches(uuid,integer) from public;
grant execute on function public.public_lost_found_matches(uuid,integer) to authenticated;

create or replace function public.public_rescue_case(p_case uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id',c.id,'title',c.title,'summary',c.summary,'species',c.species,'status',c.status,
    'estimated_vnd',estimate.amount_vnd,'estimated_currency',estimate.currency,
    'verified_total_vnd',coalesce(ledger.total,0),'verified_donations',coalesce(ledger.entries,'[]'::jsonb),
    'is_demo',c.is_demo
  )
  from public.rescue_cases c
  left join lateral (select e.amount_vnd,e.currency from public.rescue_estimates e where e.rescue_case_id=c.id and e.status='verified' order by e.version desc limit 1) estimate on true
  left join lateral (select sum(d.amount_vnd) total,jsonb_agg(jsonb_build_object('amount_vnd',d.amount_vnd,'recipient_type',d.recipient_type,'verified_at',d.verified_at) order by d.verified_at) entries from public.donation_ledger d where d.rescue_case_id=c.id and d.status='verified') ledger on true
  where c.id=p_case and c.verification_status='verified' and c.status in ('active','funded','completed')
    and c.image_safety_status in ('approved','not_provided')
    and (not c.is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true')
$$;
revoke all on function public.public_rescue_case(uuid) from public;
grant execute on function public.public_rescue_case(uuid) to anon,authenticated;

create or replace function public.public_rescue_cases(p_limit integer default 50)
returns table(id uuid,title text,summary text,species text,status text,estimated_vnd bigint,verified_total_vnd bigint,is_demo boolean,created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id,c.title,c.summary,c.species,c.status,estimate.amount_vnd,coalesce(ledger.total,0),c.is_demo,c.created_at
  from public.rescue_cases c
  left join lateral (select e.amount_vnd from public.rescue_estimates e where e.rescue_case_id=c.id and e.status='verified' order by e.version desc limit 1) estimate on true
  left join lateral (select sum(d.amount_vnd) total from public.donation_ledger d where d.rescue_case_id=c.id and d.status='verified') ledger on true
  where c.verification_status='verified' and c.status in ('active','funded','completed') and c.image_safety_status in ('approved','not_provided')
    and estimate.amount_vnd is not null and (not c.is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true')
  order by c.created_at desc limit greatest(1,least(p_limit,100))
$$;
revoke all on function public.public_rescue_cases(integer) from public;
grant execute on function public.public_rescue_cases(integer) to anon,authenticated;

-- Every new relation gets RLS. Public maps and ledgers are narrow security-definer RPCs.
alter table public.community_rate_limits enable row level security;
create policy community_rate_limits_deny_clients on public.community_rate_limits for all to anon,authenticated using(false) with check(false);
alter table public.community_comments enable row level security;
alter table public.lost_found_reports enable row level security;
alter table public.stray_reports enable row level security;
alter table public.rescue_partners enable row level security;
alter table public.rescue_cases enable row level security;
alter table public.rescue_estimates enable row level security;
alter table public.donation_ledger enable row level security;
alter table public.rescue_ledger_events enable row level security;
alter table public.community_moderation_reports enable row level security;
alter table public.community_appeals enable row level security;

do $$ declare t text; begin
  foreach t in array array['lost_found_reports','rescue_cases'] loop
    execute format('drop trigger if exists set_updated_at on public.%I',t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',t);
  end loop;
end $$;

drop policy if exists community_published_read on public.community_posts;
create policy community_post_public_read on public.community_posts for select to anon,authenticated using(status='approved' and image_safety_status in ('approved','not_provided') and (not is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true'));
create policy community_post_owner_read on public.community_posts for select to authenticated using(author_id=(select auth.uid()));
create policy community_post_owner_update_pending on public.community_posts for update to authenticated using(author_id=(select auth.uid()) and status='pending') with check(author_id=(select auth.uid()) and status='pending');
create policy community_post_admin_all on public.community_posts for all to authenticated using(public.current_app_role()='platform_admin') with check(public.current_app_role()='platform_admin');

create policy community_comment_public_read on public.community_comments for select to anon,authenticated using(status='approved' and exists(select 1 from public.community_posts p where p.id=post_id and p.status='approved'));
create policy community_comment_owner_read on public.community_comments for select to authenticated using(author_id=(select auth.uid()));
create policy community_comment_admin_all on public.community_comments for all to authenticated using(public.current_app_role()='platform_admin') with check(public.current_app_role()='platform_admin');

create policy lost_found_owner_read on public.lost_found_reports for select to authenticated using(owner_id=(select auth.uid()));
create policy lost_found_admin_all on public.lost_found_reports for all to authenticated using(public.current_app_role()='platform_admin') with check(public.current_app_role()='platform_admin');
create policy stray_owner_read on public.stray_reports for select to authenticated using(reporter_id=(select auth.uid()));
create policy stray_admin_all on public.stray_reports for all to authenticated using(public.current_app_role()='platform_admin') with check(public.current_app_role()='platform_admin');

create policy rescue_partner_self_read on public.rescue_partners for select to authenticated using(user_id=(select auth.uid()) or public.current_app_role()='platform_admin' or (clinic_id is not null and public.is_clinic_member(clinic_id)));
create policy rescue_partner_admin_all on public.rescue_partners for all to authenticated using(public.current_app_role()='platform_admin') with check(public.current_app_role()='platform_admin');
create policy rescue_case_public_read on public.rescue_cases for select to authenticated using(verification_status='verified' and status in ('active','funded','completed') and (not is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true'));
create policy rescue_case_owner_read on public.rescue_cases for select to authenticated using(created_by=(select auth.uid()));
create policy rescue_case_partner_read on public.rescue_cases for select to authenticated using((clinic_id is not null and public.is_clinic_member(clinic_id)) or exists(select 1 from public.rescue_partners rp where rp.id=rescue_partner_id and rp.user_id=(select auth.uid())));
create policy rescue_case_admin_all on public.rescue_cases for all to authenticated using(public.current_app_role()='platform_admin') with check(public.current_app_role()='platform_admin');
create policy rescue_estimate_partner_read on public.rescue_estimates for select to authenticated using(public.is_clinic_member(clinic_id) or public.current_app_role()='platform_admin');
create policy rescue_estimate_vet_insert on public.rescue_estimates for insert to authenticated with check(vet_id=(select auth.uid()) and public.is_clinic_vet(clinic_id) and status='submitted');
create policy donation_admin_read on public.donation_ledger for select to authenticated using(public.current_app_role()='platform_admin' or (recipient_clinic_id is not null and public.is_clinic_admin(recipient_clinic_id)) or exists(select 1 from public.rescue_partners rp where rp.id=recipient_partner_id and rp.user_id=(select auth.uid())));
create policy ledger_events_admin_read on public.rescue_ledger_events for select to authenticated using(public.current_app_role()='platform_admin');
create policy moderation_reports_owner_read on public.community_moderation_reports for select to authenticated using(reporter_id=(select auth.uid()));
create policy moderation_reports_admin_all on public.community_moderation_reports for all to authenticated using(public.current_app_role()='platform_admin') with check(public.current_app_role()='platform_admin');
create policy appeals_owner_read on public.community_appeals for select to authenticated using(appellant_id=(select auth.uid()));
create policy appeals_admin_all on public.community_appeals for all to authenticated using(public.current_app_role()='platform_admin') with check(public.current_app_role()='platform_admin');

-- Private uploads: review media is quarantined until moderation sets a safe status.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('community-private','community-private',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy community_upload_own on storage.objects for insert to authenticated with check(bucket_id='community-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy community_read_own on storage.objects for select to authenticated using(bucket_id='community-private' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.current_app_role()='platform_admin'));
create policy community_read_rescue_receipt on storage.objects for select to authenticated using(bucket_id='community-private' and exists(
  select 1 from public.donation_ledger d where d.receipt_path=name and d.status='pending'
    and ((d.recipient_clinic_id is not null and public.is_clinic_admin(d.recipient_clinic_id))
      or exists(select 1 from public.rescue_partners rp where rp.id=d.recipient_partner_id and rp.user_id=(select auth.uid())))));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('rescue-private','rescue-private',false,20971520,array['application/pdf','image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy rescue_upload_own on storage.objects for insert to authenticated with check(bucket_id='rescue-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy rescue_read_own_admin on storage.objects for select to authenticated using(bucket_id='rescue-private' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.current_app_role()='platform_admin'));
create policy rescue_estimate_clinic_read on storage.objects for select to authenticated using(bucket_id='rescue-private' and exists(select 1 from public.rescue_estimates e where e.document_path=name and public.is_clinic_member(e.clinic_id)));

insert into public.community_moderation_reports(reporter_id,target_type,target_id,reason,status,is_demo)
select profile.id,'post',post.id,'Fictional demo moderation fixture','dismissed',true
from public.profiles profile cross join public.community_posts post where profile.is_demo and post.is_demo limit 1
on conflict do nothing;
