-- PawCare domain schema: Passport, directory/booking, SOS/triage, care plans,
-- AI audit, workspace finance, and targeted commerce recommendations.
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists btree_gist with schema extensions;

alter table public.clinics
  add column if not exists location extensions.geography(point,4326),
  add column if not exists phone text,
  add column if not exists languages text[] not null default '{}',
  add column if not exists specialties text[] not null default '{}',
  add column if not exists photos text[] not null default '{}',
  add column if not exists is_24_7 boolean not null default false,
  add column if not exists published boolean not null default false,
  add column if not exists is_demo boolean not null default false;
alter table public.profiles add column if not exists is_demo boolean not null default false;
alter table public.pets add column if not exists is_demo boolean not null default false;
create index if not exists clinics_location_gist on public.clinics using gist(location);

create or replace function public.is_clinic_member(p_clinic uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.clinic_staff cs where cs.clinic_id=p_clinic and cs.user_id=(select auth.uid()))
$$;
revoke all on function public.is_clinic_member(uuid) from public;
grant execute on function public.is_clinic_member(uuid) to authenticated;

create or replace function public.is_clinic_admin(p_clinic uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.clinic_staff cs where cs.clinic_id=p_clinic and cs.user_id=(select auth.uid()) and cs.staff_role='clinic_admin')
$$;
revoke all on function public.is_clinic_admin(uuid) from public;
grant execute on function public.is_clinic_admin(uuid) to authenticated;

create table if not exists public.pet_owners (
  pet_id uuid not null references public.pets(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  is_primary boolean not null default false,
  is_demo boolean not null default false,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  primary key(pet_id,owner_id)
);

create or replace function public.owns_pet(p_pet uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.pets p where p.id=p_pet and p.deleted_at is null and (p.owner_id=(select auth.uid()) or exists(select 1 from public.pet_owners po where po.pet_id=p.id and po.owner_id=(select auth.uid()) and po.accepted_at is not null and po.revoked_at is null)))
$$;
revoke all on function public.owns_pet(uuid) from public;
grant execute on function public.owns_pet(uuid) to authenticated;

insert into public.pet_owners(pet_id,owner_id,is_primary,accepted_at)
select id,owner_id,true,created_at from public.pets on conflict do nothing;
create index if not exists pet_owners_owner_idx on public.pet_owners(owner_id,pet_id) where revoked_at is null;

alter table public.record_access_grants
  add column if not exists scopes text[] not null default array['profile','vaccinations','medications','visits','allergies','conditions','weight']::text[],
  add column if not exists issued_by uuid references public.profiles(id),
  add column if not exists share_token_hash text unique;

create table if not exists public.vaccine_catalog (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
  species text[] not null default '{}', notes text, active boolean not null default true,
  is_demo boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.medication_catalog (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
  active_ingredient text not null, notes text, active boolean not null default true,
  is_demo boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.contraindication_rules (
  id uuid primary key default gen_random_uuid(), medication_code text, active_ingredient text, condition_code text,
  allergy_name text, warning_vi text not null, warning_en text not null, severity text not null default 'review'
    check(severity in ('info','caution','review')),
  active boolean not null default false, reviewer_id uuid references public.profiles(id), reviewed_at timestamptz,
  version integer not null default 1, is_demo boolean not null default true, created_at timestamptz not null default now(),
  check(medication_code is not null or active_ingredient is not null)
);
create table if not exists public.pet_allergies (
  id uuid primary key default gen_random_uuid(), pet_id uuid not null references public.pets(id) on delete cascade,
  name text not null, severity text not null default 'unknown' check(severity in ('mild','moderate','severe','unknown')),
  source text not null default 'owner', recorded_by uuid references public.profiles(id), created_at timestamptz not null default now(),
  is_demo boolean not null default false
);
create table if not exists public.pet_conditions (
  id uuid primary key default gen_random_uuid(), pet_id uuid not null references public.pets(id) on delete cascade,
  code text, name text not null, status text not null default 'active' check(status in ('active','resolved','entered_in_error')),
  source text not null default 'owner' check(source in ('owner','clinic')), recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), is_demo boolean not null default false
);
create table if not exists public.weight_entries (
  id uuid primary key default gen_random_uuid(), pet_id uuid not null references public.pets(id) on delete cascade,
  weight_kg numeric(7,3) not null check(weight_kg>0 and weight_kg<500), measured_at timestamptz not null,
  source_clinic uuid references public.clinics(id), actor_id uuid references public.profiles(id),
  created_at timestamptz not null default now(), idempotency_key uuid unique, is_demo boolean not null default false
);
create index if not exists weight_pet_measured_idx on public.weight_entries(pet_id,measured_at desc);
create table if not exists public.medical_records (
  id uuid primary key default gen_random_uuid(), pet_id uuid not null references public.pets(id) on delete cascade,
  clinic_id uuid references public.clinics(id), actor_id uuid not null references public.profiles(id),
  record_type text not null check(record_type in ('vaccination','prescription','visit','weight','note')),
  occurred_at timestamptz not null, summary text not null, payload jsonb not null default '{}',
  source text not null default 'clinic' check(source in ('clinic','owner','import')), version integer not null default 1 check(version>0),
  idempotency_key uuid unique, created_at timestamptz not null default now(), is_demo boolean not null default false
);
create index if not exists medical_records_pet_time_idx on public.medical_records(pet_id,occurred_at desc);
create table if not exists public.vaccinations (
  id uuid primary key default gen_random_uuid(), record_id uuid not null unique references public.medical_records(id) on delete restrict,
  pet_id uuid not null references public.pets(id) on delete cascade, vaccine_id uuid references public.vaccine_catalog(id),
  vaccine_name text not null, code text not null, dose text not null, lot text not null, administered_at date not null,
  next_due_at date, created_at timestamptz not null default now(), is_demo boolean not null default false
);
create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(), record_id uuid not null unique references public.medical_records(id) on delete restrict,
  pet_id uuid not null references public.pets(id) on delete cascade, medication_id uuid references public.medication_catalog(id),
  medication_name text not null, code text not null, active_ingredient text not null, dose text not null,
  started_at date not null, ended_at date, instructions text not null, created_at timestamptz not null default now(),
  check(ended_at is null or ended_at>=started_at), is_demo boolean not null default false
);
create table if not exists public.medical_record_amendments (
  id uuid primary key default gen_random_uuid(), record_id uuid not null references public.medical_records(id) on delete restrict,
  prior_version integer not null, next_version integer not null, patch jsonb not null, reason text not null,
  actor_id uuid not null references public.profiles(id), created_at timestamptz not null default now(),
  unique(record_id,next_version), check(next_version=prior_version+1)
);
create table if not exists public.pet_documents (
  id uuid primary key default gen_random_uuid(), pet_id uuid not null references public.pets(id) on delete cascade,
  owner_id uuid not null references public.profiles(id), storage_path text not null unique,
  title text not null, mime_type text not null, size_bytes bigint not null check(size_bytes between 1 and 20971520),
  created_at timestamptz not null default now(), deleted_at timestamptz, is_demo boolean not null default false
);
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key, actor_id uuid references public.profiles(id),
  clinic_id uuid references public.clinics(id), pet_id uuid references public.pets(id),
  action text not null, entity_type text not null, entity_id text, outcome text not null default 'success',
  metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create or replace function public.prevent_audit_mutation() returns trigger language plpgsql as $$
begin raise exception 'audit_logs are append-only'; end $$;
drop trigger if exists audit_logs_append_only on public.audit_logs;
create trigger audit_logs_append_only before update or delete on public.audit_logs for each row execute function public.prevent_audit_mutation();

create table if not exists public.clinic_services (
  id uuid primary key default gen_random_uuid(), clinic_id uuid not null references public.clinics(id) on delete cascade,
  name text not null, description text, price_vnd bigint check(price_vnd is null or price_vnd>=0),
  duration_minutes integer not null default 30 check(duration_minutes between 5 and 480),
  buffer_minutes integer not null default 0 check(buffer_minutes between 0 and 240), active boolean not null default true,
  is_demo boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.clinic_hours (
  id uuid primary key default gen_random_uuid(), clinic_id uuid not null references public.clinics(id) on delete cascade,
  weekday smallint not null check(weekday between 0 and 6), opens_at time not null, closes_at time not null,
  closed boolean not null default false, timezone text not null default 'Asia/Ho_Chi_Minh', is_demo boolean not null default false, unique(clinic_id,weekday)
);
create table if not exists public.clinic_holidays (
  id uuid primary key default gen_random_uuid(), clinic_id uuid not null references public.clinics(id) on delete cascade,
  starts_at timestamptz not null, ends_at timestamptz not null, label text not null, check(ends_at>starts_at)
);
create table if not exists public.vets (
  id uuid primary key default gen_random_uuid(), clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid references public.profiles(id), display_name text not null, specialties text[] not null default '{}',
  active boolean not null default true, is_demo boolean not null default false
);
create or replace function public.is_clinic_vet(p_clinic uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.vets v where v.clinic_id=p_clinic and v.user_id=(select auth.uid()) and v.active)
$$;
revoke all on function public.is_clinic_vet(uuid) from public;
grant execute on function public.is_clinic_vet(uuid) to authenticated;
create table if not exists public.vet_shifts (
  id uuid primary key default gen_random_uuid(), vet_id uuid not null references public.vets(id) on delete cascade,
  starts_at timestamptz not null, ends_at timestamptz not null, check(ends_at>starts_at)
);
create table if not exists public.availability_slots (
  id uuid primary key default gen_random_uuid(), clinic_id uuid not null references public.clinics(id) on delete cascade,
  service_id uuid not null references public.clinic_services(id), vet_id uuid references public.vets(id),
  starts_at timestamptz not null, ends_at timestamptz not null, capacity integer not null default 1 check(capacity>0),
  reserved integer not null default 0 check(reserved>=0 and reserved<=capacity), active boolean not null default true,
  check(ends_at>starts_at), unique(clinic_id,service_id,vet_id,starts_at)
);
alter table public.availability_slots add column if not exists is_demo boolean not null default false;
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(), clinic_id uuid not null references public.clinics(id),
  service_id uuid not null references public.clinic_services(id), pet_id uuid not null references public.pets(id),
  owner_id uuid not null references public.profiles(id), slot_id uuid not null references public.availability_slots(id),
  vet_id uuid references public.vets(id), starts_at timestamptz not null, ends_at timestamptz not null,
  status text not null default 'requested' check(status in ('requested','confirmed','checked_in','completed','canceled','declined','no_show')),
  price_snapshot_vnd bigint check(price_snapshot_vnd is null or price_snapshot_vnd>=0), policy_snapshot jsonb not null default '{}',
  idempotency_key uuid not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(owner_id,idempotency_key), check(ends_at>starts_at), is_demo boolean not null default false
);
create index if not exists appointments_clinic_start_idx on public.appointments(clinic_id,starts_at,status);
do $$ begin
  alter table public.appointments add constraint appointments_no_vet_overlap
    exclude using gist (clinic_id extensions.gist_uuid_ops with =, vet_id extensions.gist_uuid_ops with =, tstzrange(starts_at,ends_at,'[)') with &&)
    where (vet_id is not null and status in ('requested','confirmed','checked_in'));
exception when duplicate_object then null; end $$;
create table if not exists public.appointment_events (
  id uuid primary key default gen_random_uuid(), appointment_id uuid not null references public.appointments(id) on delete cascade,
  actor_id uuid references public.profiles(id), old_status text, new_status text not null, reason text, created_at timestamptz not null default now()
);
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(), appointment_id uuid not null unique references public.appointments(id),
  clinic_id uuid not null references public.clinics(id), owner_id uuid not null references public.profiles(id),
  rating smallint not null check(rating between 1 and 5), body text not null default '', status text not null default 'published' check(status in ('published','hidden','under_review')),
  created_at timestamptz not null default now(), is_demo boolean not null default false
);
create table if not exists public.review_replies (
  id uuid primary key default gen_random_uuid(), review_id uuid not null unique references public.reviews(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id), actor_id uuid not null references public.profiles(id), body text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.review_reports (
  id uuid primary key default gen_random_uuid(), review_id uuid not null references public.reviews(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id), reason text not null, status text not null default 'open', created_at timestamptz not null default now()
);

create table if not exists public.sos_rules (
  id uuid primary key default gen_random_uuid(), code text not null unique, symptom text not null,
  urgency text not null check(urgency in ('emergency','urgent','monitor')), criteria jsonb not null default '{}',
  owner_message_vi text not null, owner_message_en text not null, reviewer_id uuid references public.profiles(id),
  reviewed_at timestamptz, version integer not null default 1, enabled boolean not null default false,
  is_demo boolean not null default true, effective_from timestamptz, effective_to timestamptz
);
create table if not exists public.sos_requests (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id),
  pet_id uuid not null references public.pets(id), symptom_chips text[] not null check(cardinality(symptom_chips)>0),
  urgency text check(urgency in ('emergency','urgent','monitor')), rule_ids uuid[] not null default '{}',
  rule_version text, status text not null default 'searching' check(status in ('searching','accepted','in_progress','completed','canceled','expired','unmatched')),
  location extensions.geography(point,4326), location_label text, location_consent_at timestamptz,
  radius_km numeric not null default 5 check(radius_km>0 and radius_km<=100), expansion_step integer not null default 0,
  accepted_clinic_id uuid references public.clinics(id), accepted_by uuid references public.profiles(id), accepted_at timestamptz,
  eta_minutes integer check(eta_minutes is null or eta_minutes between 1 and 1440), cancel_reason text,
  idempotency_key uuid not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(owner_id,idempotency_key)
);
create index if not exists sos_location_gist on public.sos_requests using gist(location);
create table if not exists public.sos_dispatches (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.sos_requests(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id), distance_m integer, status text not null default 'pinged' check(status in ('pinged','accepted','declined','expired','canceled')),
  pinged_at timestamptz not null default now(), responded_at timestamptz, unique(request_id,clinic_id)
);
create table if not exists public.triage_sessions (
  id uuid primary key default gen_random_uuid(), request_id uuid not null unique references public.sos_requests(id),
  clinic_id uuid not null references public.clinics(id), owner_id uuid not null references public.profiles(id),
  status text not null default 'open' check(status in ('open','closed','expired')), video_provider text not null default 'mock',
  passport_grant_id uuid references public.record_access_grants(id), recommendation text check(recommendation in ('come_now','book','monitor')),
  vet_note text, vet_id uuid references public.profiles(id), started_at timestamptz not null default now(), expires_at timestamptz not null,
  ended_at timestamptz
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(), session_id uuid not null references public.triage_sessions(id) on delete cascade,
  sender_id uuid not null references public.profiles(id), body text not null check(length(body)<=4000), created_at timestamptz not null default now()
);

create table if not exists public.care_plan_rules (
  id uuid primary key default gen_random_uuid(), code text not null unique, species text not null, breed text,
  category text not null check(category in ('vaccination','deworming','weight_check','dental','diet_category')),
  age_min_months integer, age_max_months integer, condition_tags text[] not null default '{}',
  weight_change_pct numeric, horizon_months integer[] not null default array[1,3,6,12], task_key text not null,
  offset_days integer not null default 0, due_window_days integer not null default 30, vet_visit_required boolean not null default false,
  reviewer_id uuid references public.profiles(id), reviewed_at timestamptz, version integer not null default 1,
  enabled boolean not null default false, is_demo boolean not null default true
);
create table if not exists public.care_plans (
  id uuid primary key default gen_random_uuid(), pet_id uuid not null references public.pets(id),
  clinic_id uuid references public.clinics(id), created_by uuid not null references public.profiles(id),
  reviewer_id uuid references public.profiles(id), status text not null default 'draft' check(status in ('draft','pending_review','approved','rejected','superseded','archived')),
  horizon_months integer not null check(horizon_months in (1,3,6,12)), version integer not null default 1,
  rule_set_version text not null, ai_run_id uuid, source_snapshot jsonb not null default '{}', content_hash text,
  shared_with_owner boolean not null default false, approved_at timestamptz, created_at timestamptz not null default now(),
  unique(pet_id,version)
);
create table if not exists public.care_plan_items (
  id uuid primary key default gen_random_uuid(), plan_id uuid not null references public.care_plans(id) on delete cascade,
  rule_id uuid references public.care_plan_rules(id), category text not null check(category in ('vaccination','deworming','weight_check','dental','diet_category')),
  task_key text not null, explanation_vi text not null default '', explanation_en text not null default '',
  due_from date, due_to date, vet_visit_required boolean not null default false,
  status text not null default 'pending' check(status in ('pending','completed','skipped')), completed_by uuid references public.profiles(id), completed_at timestamptz,
  sort_order integer not null default 0, created_at timestamptz not null default now(), check(due_to is null or due_from is null or due_to>=due_from)
);
create table if not exists public.care_plan_events (
  id uuid primary key default gen_random_uuid(), plan_id uuid not null references public.care_plans(id), actor_id uuid references public.profiles(id),
  event text not null, detail jsonb not null default '{}', created_at timestamptz not null default now()
);

create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id), feature text not null,
  provider text not null, model text not null, prompt_version text not null, redacted_input jsonb not null default '{}',
  output_hash text, latency_ms integer not null default 0, input_tokens integer, output_tokens integer,
  cost_microusd bigint, outcome text not null, error_code text, created_at timestamptz not null default now()
);
create table if not exists public.ai_daily_budgets (
  user_id uuid not null references public.profiles(id) on delete cascade, budget_date date not null,
  calls integer not null default 0, max_calls integer not null default 20, primary key(user_id,budget_date)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(), name text not null, brand text, description text not null default '',
  species text[] not null default '{}', life_stages text[] not null default '{}', ingredients text[] not null default '{}',
  allergens text[] not null default '{}', dietary_tags text[] not null default '{}', condition_exclusions text[] not null default '{}',
  safety_reviewed boolean not null default false, published boolean not null default false, sponsored boolean not null default false,
  demo boolean not null default false, is_demo boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.affiliate_links (
  id uuid primary key default gen_random_uuid(), product_id uuid references public.products(id), partner_name text not null,
  destination_url text not null, active boolean not null default true, disclosure_vi text not null, disclosure_en text not null,
  sandbox boolean not null default true, is_demo boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(), link_id uuid not null references public.affiliate_links(id),
  product_id uuid references public.products(id), pseudonymous_key text, locale text not null default 'vi',
  source text, created_at timestamptz not null default now(), is_sandbox boolean not null default true
);
create table if not exists public.commission_ledger (
  id uuid primary key default gen_random_uuid(), clinic_id uuid references public.clinics(id), source_type text not null,
  source_id uuid, amount_vnd bigint not null default 0, currency text not null default 'VND', status text not null default 'sandbox',
  contract_snapshot jsonb not null default '{}', reversal_of uuid references public.commission_ledger(id), is_sandbox boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(), clinic_id uuid not null references public.clinics(id), invoice_number text not null unique,
  status text not null default 'draft' check(status in ('draft','issued','partially_paid','paid','void','disputed')),
  subtotal_vnd bigint not null default 0, total_vnd bigint not null default 0, currency text not null default 'VND',
  line_items jsonb not null default '[]', pdf_path text, created_at timestamptz not null default now()
);
create table if not exists public.spa_listings (
  id uuid primary key default gen_random_uuid(), name text not null, business_type text not null check(business_type in ('spa','shop')),
  address text not null, location extensions.geography(point,4326), services text[] not null default '{}',
  hours jsonb not null default '{}', languages text[] not null default '{}', published boolean not null default false,
  verified boolean not null default false, is_demo boolean not null default false, created_at timestamptz not null default now()
);
create index if not exists spa_location_gist on public.spa_listings using gist(location);
create table if not exists public.spa_placements (
  id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.spa_listings(id),
  starts_at timestamptz not null, ends_at timestamptz not null, label text not null default 'Premium placement',
  is_demo boolean not null default false, check(ends_at>starts_at)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id), clinic_id uuid references public.clinics(id),
  type text not null, payload jsonb not null default '{}', scheduled_at timestamptz, sent_at timestamptz, status text not null default 'queued',
  idempotency_key text unique, created_at timestamptz not null default now()
);
create table if not exists public.reminder_campaigns (
  id uuid primary key default gen_random_uuid(), clinic_id uuid not null references public.clinics(id), created_by uuid not null references public.profiles(id),
  status text not null default 'draft', eligible_count integer not null default 0, excluded_count integer not null default 0,
  message_template jsonb not null default '{}', created_at timestamptz not null default now()
);
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(), author_id uuid not null references public.profiles(id), title text not null,
  body text not null, created_at timestamptz not null default now(), is_demo boolean not null default false
);

-- Maintain timestamps consistently on every domain table that has updated_at.
do $$ declare t text; begin
  foreach t in array array['profiles','clinics','pets','clinic_verification_requests','clinic_services','appointments','sos_requests'] loop
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='updated_at') then
      execute format('drop trigger if exists set_updated_at on public.%I',t);
      execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',t);
    end if;
  end loop;
end $$;

create or replace function public.book_slot(p_slot uuid,p_pet uuid,p_key uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.availability_slots; a_id uuid; p_owner uuid;
begin
  select owner_id into p_owner from public.pets where id=p_pet and deleted_at is null;
  if p_owner is null or p_owner<>(select auth.uid()) then raise exception 'pet_access_denied'; end if;
  select * into s from public.availability_slots where id=p_slot and active for update;
  if not found then raise exception 'slot_unavailable'; end if;
  if s.reserved>=s.capacity then raise exception 'slot_full'; end if;
  update public.availability_slots set reserved=reserved+1 where id=p_slot and reserved<capacity;
  if not found then raise exception 'slot_full'; end if;
  insert into public.appointments(clinic_id,service_id,pet_id,owner_id,slot_id,vet_id,starts_at,ends_at,status,idempotency_key,price_snapshot_vnd)
  select s.clinic_id,s.service_id,p_pet,p_owner,s.id,s.vet_id,s.starts_at,s.ends_at,'requested',p_key,cs.price_vnd
  from public.clinic_services cs where cs.id=s.service_id returning id into a_id;
  insert into public.appointment_events(appointment_id,actor_id,new_status) values(a_id,(select auth.uid()),'requested');
  return a_id;
exception when unique_violation then
  select id into a_id from public.appointments where owner_id=(select auth.uid()) and idempotency_key=p_key;
  if a_id is not null then return a_id; end if;
  raise;
end $$;
revoke all on function public.book_slot(uuid,uuid,uuid) from public;
grant execute on function public.book_slot(uuid,uuid,uuid) to authenticated;

create or replace function public.record_vaccination(
  p_pet uuid,p_clinic uuid,p_name text,p_code text,p_dose text,p_lot text,p_date date,p_catalog uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_record uuid; v_actor uuid := (select auth.uid());
begin
  if v_actor is null or not public.is_clinic_member(p_clinic) then raise exception 'clinic_access_denied'; end if;
  if not exists(select 1 from public.pets p where p.id=p_pet and p.deleted_at is null)
     or not exists(select 1 from public.record_access_grants g where g.pet_id=p_pet and g.clinic_id=p_clinic and g.revoked_at is null and g.expires_at>now() and 'vaccinations'=any(g.scopes)) then
    raise exception 'active_vaccination_grant_required';
  end if;
  if length(trim(p_name))=0 or length(trim(p_code))=0 or length(trim(p_dose))=0 or length(trim(p_lot))=0 then raise exception 'required_vaccination_fields'; end if;
  insert into public.medical_records(pet_id,clinic_id,actor_id,record_type,occurred_at,summary,payload,source)
  values(p_pet,p_clinic,v_actor,'vaccination',p_date::timestamptz,p_name,jsonb_build_object('code',p_code,'dose',p_dose,'lot',p_lot),'clinic') returning id into v_record;
  insert into public.vaccinations(record_id,pet_id,vaccine_id,vaccine_name,code,dose,lot,administered_at)
  values(v_record,p_pet,p_catalog,p_name,p_code,p_dose,p_lot,p_date);
  insert into public.audit_logs(actor_id,clinic_id,pet_id,action,entity_type,entity_id)
  values(v_actor,p_clinic,p_pet,'create','vaccination',v_record::text);
  return v_record;
end $$;
revoke all on function public.record_vaccination(uuid,uuid,text,text,text,text,date,uuid) from public;
grant execute on function public.record_vaccination(uuid,uuid,text,text,text,text,date,uuid) to authenticated;

create or replace function public.accept_sos(p_request uuid,p_clinic uuid,p_dispatch uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  if not public.is_clinic_member(p_clinic) then raise exception 'clinic_access_denied'; end if;
  update public.sos_requests set status='accepted',accepted_clinic_id=p_clinic,accepted_by=(select auth.uid()),accepted_at=now(),updated_at=now()
    where id=p_request and status='searching' and accepted_clinic_id is null;
  get diagnostics changed = row_count;
  if changed=0 then return false; end if;
  update public.sos_dispatches set status='accepted',responded_at=now() where id=p_dispatch and request_id=p_request and clinic_id=p_clinic and status='pinged';
  if not found then raise exception 'dispatch_not_available'; end if;
  update public.sos_dispatches set status='expired',responded_at=now() where request_id=p_request and clinic_id<>p_clinic and status='pinged';
  return true;
end $$;
revoke all on function public.accept_sos(uuid,uuid,uuid) from public;
grant execute on function public.accept_sos(uuid,uuid,uuid) to authenticated;

create or replace function public.cancel_sos(p_request uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  update public.sos_requests set status='canceled',cancel_reason='owner_canceled',updated_at=now()
  where id=p_request and owner_id=(select auth.uid()) and status='searching' and accepted_clinic_id is null;
  get diagnostics changed = row_count;
  return changed=1;
end $$;
revoke all on function public.cancel_sos(uuid) from public;
grant execute on function public.cancel_sos(uuid) to authenticated;

create or replace function public.start_sos_request(
  p_pet uuid,p_symptoms text[],p_urgency text,p_lng double precision,p_lat double precision,p_key uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := (select auth.uid()); v_id uuid; v_point extensions.geography;
begin
  if v_owner is null or not public.owns_pet(p_pet) then raise exception 'pet_access_denied'; end if;
  if coalesce(cardinality(p_symptoms),0)=0 then raise exception 'symptoms_required'; end if;
  if p_urgency not in ('emergency','urgent','monitor') then raise exception 'invalid_urgency'; end if;
  v_point := extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography;
  insert into public.sos_requests(owner_id,pet_id,symptom_chips,urgency,location,location_consent_at,idempotency_key)
  values(v_owner,p_pet,p_symptoms,p_urgency,v_point,now(),p_key) on conflict(owner_id,idempotency_key) do update set updated_at=now() returning id into v_id;
  insert into public.sos_dispatches(request_id,clinic_id,distance_m)
  select v_id,nearby.clinic_id,nearby.distance_m::integer
  from public.find_sos_clinics(p_lng,p_lat,5000) nearby on conflict(request_id,clinic_id) do nothing;
  return v_id;
end $$;
revoke all on function public.start_sos_request(uuid,text[],text,double precision,double precision,uuid) from public;
grant execute on function public.start_sos_request(uuid,text[],text,double precision,double precision,uuid) to authenticated;

create or replace function public.find_sos_clinics(p_lng double precision,p_lat double precision,p_radius_m integer)
returns table(clinic_id uuid,distance_m double precision)
language sql stable security invoker set search_path = '' as $$
  select c.id,extensions.st_distance(c.location,extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography)
  from public.clinics c
  where c.verified and c.published and c.is_24_7 and c.location is not null and (not c.is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true')
    and extensions.st_dwithin(c.location,extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography,p_radius_m)
  order by c.location <-> extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography
$$;
revoke all on function public.find_sos_clinics(double precision,double precision,integer) from public;
grant execute on function public.find_sos_clinics(double precision,double precision,integer) to authenticated;

create or replace function public.reserve_ai_daily_budget(p_max_calls integer default 20)
returns boolean language plpgsql security definer set search_path = '' as $$
declare used integer;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  insert into public.ai_daily_budgets(user_id,budget_date,calls,max_calls)
  values((select auth.uid()),(now() at time zone 'utc')::date,1,p_max_calls)
  on conflict(user_id,budget_date) do update set calls=ai_daily_budgets.calls+1,max_calls=excluded.max_calls
    where ai_daily_budgets.calls<ai_daily_budgets.max_calls
  returning calls into used;
  return used is not null;
end $$;
revoke all on function public.reserve_ai_daily_budget(integer) from public;
grant execute on function public.reserve_ai_daily_budget(integer) to authenticated;

create or replace function public.enforce_review_eligibility()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.appointments a where a.id=new.appointment_id and a.owner_id=new.owner_id and a.clinic_id=new.clinic_id and a.status='completed') then
    raise exception 'review_requires_completed_appointment';
  end if;
  return new;
end $$;
drop trigger if exists review_completed_appointment on public.reviews;
create trigger review_completed_appointment before insert on public.reviews for each row execute function public.enforce_review_eligibility();

-- Enable RLS everywhere, including the existing tables extended by this migration.
do $$ declare t text; begin
  foreach t in array array[
    'pet_owners','vaccine_catalog','medication_catalog','contraindication_rules','pet_allergies','pet_conditions','weight_entries','medical_records','vaccinations','prescriptions','medical_record_amendments','pet_documents','audit_logs',
    'clinic_services','clinic_hours','clinic_holidays','vets','vet_shifts','availability_slots','appointments','appointment_events','reviews','review_replies','review_reports',
    'sos_rules','sos_requests','sos_dispatches','triage_sessions','messages','care_plan_rules','care_plans','care_plan_items','care_plan_events','ai_runs','ai_daily_budgets',
    'products','affiliate_links','affiliate_clicks','commission_ledger','invoices','spa_listings','spa_placements','notifications','reminder_campaigns','community_posts'
  ] loop execute format('alter table public.%I enable row level security',t); end loop;
end $$;

-- Catalogs and published listings are readable; writes are restricted to platform admins.
create policy catalog_read_active on public.vaccine_catalog for select to authenticated using(active and (not is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true'));
create policy meds_catalog_read_active on public.medication_catalog for select to authenticated using(active and (not is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true'));
create policy contraindication_rules_read on public.contraindication_rules for select to authenticated using(active and reviewed_at is not null and (not is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true'));
create policy products_read_published on public.products for select to anon,authenticated using(published and (not is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true'));
create policy affiliate_links_read_active on public.affiliate_links for select to anon,authenticated using(active and (not is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true'));
create policy spa_public_read on public.spa_listings for select to anon,authenticated using(published and (not is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true'));
create policy clinic_services_public_read on public.clinic_services for select to anon,authenticated using(active and (not is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true') and exists(select 1 from public.clinics c where c.id=clinic_id and c.published and c.verified and (not c.is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true')));
create policy clinic_hours_public_read on public.clinic_hours for select to anon,authenticated using((not is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true') and exists(select 1 from public.clinics c where c.id=clinic_id and c.published and c.verified and (not c.is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true')));
create policy clinics_public_read on public.clinics for select to anon,authenticated using(verified and published and (not is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true'));

-- Owner/co-owner data. Clinics see pet-linked data only through a live scoped access grant.
create policy pet_owners_self_read on public.pet_owners for select to authenticated using(owner_id=(select auth.uid()) or public.owns_pet(pet_id));
create policy pet_owners_owner_write on public.pet_owners for all to authenticated using(exists(select 1 from public.pets p where p.id=pet_id and p.owner_id=(select auth.uid()))) with check(exists(select 1 from public.pets p where p.id=pet_id and p.owner_id=(select auth.uid())));
create policy allergies_owner_all on public.pet_allergies for all to authenticated using(public.owns_pet(pet_id)) with check(public.owns_pet(pet_id));
create policy allergies_clinic_grant_read on public.pet_allergies for select to authenticated using(exists(select 1 from public.record_access_grants g where g.pet_id=pet_allergies.pet_id and g.clinic_id is not null and public.is_clinic_member(g.clinic_id) and g.revoked_at is null and g.expires_at>now() and 'allergies'=any(g.scopes)));
create policy conditions_owner_all on public.pet_conditions for all to authenticated using(public.owns_pet(pet_id)) with check(public.owns_pet(pet_id));
create policy conditions_clinic_grant_read on public.pet_conditions for select to authenticated using(exists(select 1 from public.record_access_grants g where g.pet_id=pet_conditions.pet_id and g.clinic_id is not null and public.is_clinic_member(g.clinic_id) and g.revoked_at is null and g.expires_at>now() and 'conditions'=any(g.scopes)));
create policy weight_owner_all on public.weight_entries for all to authenticated using(public.owns_pet(pet_id)) with check(public.owns_pet(pet_id));
create policy weight_clinic_grant_read on public.weight_entries for select to authenticated using(exists(select 1 from public.record_access_grants g where g.pet_id=weight_entries.pet_id and g.clinic_id is not null and public.is_clinic_member(g.clinic_id) and g.revoked_at is null and g.expires_at>now() and 'weight'=any(g.scopes)));
create policy records_owner_read on public.medical_records for select to authenticated using(public.owns_pet(pet_id));
create policy records_owner_insert on public.medical_records for insert to authenticated with check(public.owns_pet(pet_id) and source='owner');
create policy records_clinic_read on public.medical_records for select to authenticated using(clinic_id is not null and public.is_clinic_member(clinic_id) and exists(select 1 from public.record_access_grants g where g.pet_id=medical_records.pet_id and g.clinic_id=medical_records.clinic_id and g.revoked_at is null and g.expires_at>now()));
create policy records_clinic_insert on public.medical_records for insert to authenticated with check(clinic_id is not null and public.is_clinic_member(clinic_id) and exists(select 1 from public.record_access_grants g where g.pet_id=medical_records.pet_id and g.clinic_id=medical_records.clinic_id and g.revoked_at is null and g.expires_at>now()));
create policy vaccines_owner_read on public.vaccinations for select to authenticated using(public.owns_pet(pet_id));
create policy vaccines_clinic_grant_read on public.vaccinations for select to authenticated using(exists(select 1 from public.record_access_grants g where g.pet_id=vaccinations.pet_id and g.clinic_id is not null and public.is_clinic_member(g.clinic_id) and g.revoked_at is null and g.expires_at>now() and 'vaccinations'=any(g.scopes)));
create policy vaccines_clinic_read on public.vaccinations for select to authenticated using(exists(select 1 from public.medical_records r where r.id=record_id));
create policy prescriptions_owner_read on public.prescriptions for select to authenticated using(public.owns_pet(pet_id));
create policy prescriptions_clinic_grant_read on public.prescriptions for select to authenticated using(exists(select 1 from public.record_access_grants g where g.pet_id=prescriptions.pet_id and g.clinic_id is not null and public.is_clinic_member(g.clinic_id) and g.revoked_at is null and g.expires_at>now() and 'medications'=any(g.scopes)));
create policy amendments_owner_read on public.medical_record_amendments for select to authenticated using(exists(select 1 from public.medical_records r where r.id=record_id and public.owns_pet(r.pet_id)));
create policy docs_owner_all on public.pet_documents for all to authenticated using(owner_id=(select auth.uid()) and public.owns_pet(pet_id)) with check(owner_id=(select auth.uid()) and public.owns_pet(pet_id));
create policy grants_owner_all on public.record_access_grants for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()) and public.owns_pet(pet_id));
create policy audit_owner_read on public.audit_logs for select to authenticated using(actor_id=(select auth.uid()) or (pet_id is not null and public.owns_pet(pet_id)));
create policy audit_clinic_read on public.audit_logs for select to authenticated using(clinic_id is not null and public.is_clinic_member(clinic_id));
create policy audit_insert_authenticated on public.audit_logs for insert to authenticated with check(actor_id=(select auth.uid()));

-- Clinic tenant access.
create policy clinic_services_member_read on public.clinic_services for select to authenticated using(public.is_clinic_member(clinic_id));
create policy clinic_services_admin_write on public.clinic_services for all to authenticated using(public.is_clinic_admin(clinic_id)) with check(public.is_clinic_admin(clinic_id));
create policy clinic_hours_member_read on public.clinic_hours for select to authenticated using(public.is_clinic_member(clinic_id));
create policy clinic_hours_admin_write on public.clinic_hours for all to authenticated using(public.is_clinic_admin(clinic_id)) with check(public.is_clinic_admin(clinic_id));
create policy clinic_holidays_member_read on public.clinic_holidays for select to authenticated using(public.is_clinic_member(clinic_id));
create policy clinic_holidays_admin_write on public.clinic_holidays for all to authenticated using(public.is_clinic_admin(clinic_id)) with check(public.is_clinic_admin(clinic_id));
create policy vets_member_read on public.vets for select to authenticated using(public.is_clinic_member(clinic_id));
create policy vets_admin_write on public.vets for all to authenticated using(public.is_clinic_admin(clinic_id)) with check(public.is_clinic_admin(clinic_id));
create policy shifts_clinic_read on public.vet_shifts for select to authenticated using(exists(select 1 from public.vets v where v.id=vet_id and public.is_clinic_member(v.clinic_id)));
create policy shifts_admin_write on public.vet_shifts for all to authenticated using(exists(select 1 from public.vets v where v.id=vet_id and public.is_clinic_admin(v.clinic_id))) with check(exists(select 1 from public.vets v where v.id=vet_id and public.is_clinic_admin(v.clinic_id)));
create policy slots_clinic_read on public.availability_slots for select to authenticated using(public.is_clinic_member(clinic_id));
create policy slots_admin_write on public.availability_slots for all to authenticated using(public.is_clinic_admin(clinic_id)) with check(public.is_clinic_admin(clinic_id));
create policy slots_public_read on public.availability_slots for select to anon,authenticated using(active and exists(select 1 from public.clinics c where c.id=clinic_id and c.verified and c.published));
create policy appointments_owner_read on public.appointments for select to authenticated using(owner_id=(select auth.uid()) or public.owns_pet(pet_id));
create policy appointments_clinic_read on public.appointments for select to authenticated using(public.is_clinic_member(clinic_id));
create policy appointments_owner_insert on public.appointments for insert to authenticated with check(owner_id=(select auth.uid()) and public.owns_pet(pet_id));
create policy appointments_clinic_update on public.appointments for update to authenticated using(public.is_clinic_member(clinic_id)) with check(public.is_clinic_member(clinic_id));
create policy appointment_events_member on public.appointment_events for select to authenticated using(exists(select 1 from public.appointments a where a.id=appointment_id and (a.owner_id=(select auth.uid()) or public.is_clinic_member(a.clinic_id))));
create policy reviews_public_read on public.reviews for select to anon,authenticated using(status='published' and (not is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true'));
create policy reviews_owner_insert on public.reviews for insert to authenticated with check(owner_id=(select auth.uid()) and exists(select 1 from public.appointments a where a.id=appointment_id and a.owner_id=(select auth.uid()) and a.status='completed'));
create policy replies_public_read on public.review_replies for select to anon,authenticated using(true);
create policy replies_clinic_write on public.review_replies for insert to authenticated with check(public.is_clinic_member(clinic_id) and exists(select 1 from public.reviews r where r.id=review_id and r.clinic_id=clinic_id));
create policy reports_insert_self on public.review_reports for insert to authenticated with check(reporter_id=(select auth.uid()));

-- SOS recipients, owners, and accepted triage participants.
create policy sos_rules_read on public.sos_rules for select to authenticated using(enabled and not is_demo);
create policy sos_owner_read on public.sos_requests for select to authenticated using(owner_id=(select auth.uid()) and public.owns_pet(pet_id));
create policy sos_owner_insert on public.sos_requests for insert to authenticated with check(owner_id=(select auth.uid()) and public.owns_pet(pet_id) and status='searching' and accepted_clinic_id is null);
create policy sos_clinic_read on public.sos_requests for select to authenticated using((accepted_clinic_id is not null and public.is_clinic_member(accepted_clinic_id)) or exists(select 1 from public.sos_dispatches d where d.request_id=sos_requests.id and public.is_clinic_member(d.clinic_id) and d.status='pinged'));
create policy dispatch_owner_read on public.sos_dispatches for select to authenticated using(exists(select 1 from public.sos_requests s where s.id=request_id and s.owner_id=(select auth.uid())));
create policy dispatch_clinic_read on public.sos_dispatches for select to authenticated using(public.is_clinic_member(clinic_id));
create policy dispatch_clinic_update on public.sos_dispatches for update to authenticated using(public.is_clinic_member(clinic_id) and status='pinged') with check(public.is_clinic_member(clinic_id) and status in ('declined','accepted'));
create policy triage_participants_read on public.triage_sessions for select to authenticated using(owner_id=(select auth.uid()) or public.is_clinic_member(clinic_id));
create policy messages_participants_all on public.messages for all to authenticated using(exists(select 1 from public.triage_sessions t where t.id=session_id and (t.owner_id=(select auth.uid()) or public.is_clinic_member(t.clinic_id)))) with check(sender_id=(select auth.uid()) and exists(select 1 from public.triage_sessions t where t.id=session_id and (t.owner_id=(select auth.uid()) or public.is_clinic_member(t.clinic_id))));

-- Care plans: owner read is limited to approved or explicitly shared drafts.
create policy care_rules_read on public.care_plan_rules for select to authenticated using(enabled and not is_demo);
create policy plans_owner_read on public.care_plans for select to authenticated using(public.owns_pet(pet_id) and (status='approved' or shared_with_owner));
create policy plans_clinic_read on public.care_plans for select to authenticated using(clinic_id is not null and public.is_clinic_member(clinic_id));
create policy plans_clinic_insert on public.care_plans for insert to authenticated with check(clinic_id is not null and public.is_clinic_member(clinic_id));
create policy plans_clinic_update on public.care_plans for update to authenticated using(clinic_id is not null and public.is_clinic_vet(clinic_id)) with check(clinic_id is not null and public.is_clinic_vet(clinic_id));
create policy plan_items_owner_read on public.care_plan_items for select to authenticated using(exists(select 1 from public.care_plans p where p.id=plan_id and public.owns_pet(p.pet_id) and (p.status='approved' or p.shared_with_owner)));
create policy plan_items_clinic_all on public.care_plan_items for all to authenticated using(exists(select 1 from public.care_plans p where p.id=plan_id and p.clinic_id is not null and public.is_clinic_vet(p.clinic_id))) with check(exists(select 1 from public.care_plans p where p.id=plan_id and p.clinic_id is not null and public.is_clinic_vet(p.clinic_id)));
create policy plan_events_owner_read on public.care_plan_events for select to authenticated using(exists(select 1 from public.care_plans p where p.id=plan_id and public.owns_pet(p.pet_id)));
create policy plan_events_clinic_all on public.care_plan_events for all to authenticated using(exists(select 1 from public.care_plans p where p.id=plan_id and p.clinic_id is not null and public.is_clinic_vet(p.clinic_id))) with check(exists(select 1 from public.care_plans p where p.id=plan_id and p.clinic_id is not null and public.is_clinic_vet(p.clinic_id)));

-- AI logs and budgets are private to the user; global admin visibility is deliberate.
create policy ai_runs_private on public.ai_runs for select to authenticated using(user_id=(select auth.uid()) or public.current_app_role()='platform_admin');
create policy ai_runs_insert on public.ai_runs for insert to authenticated with check(user_id=(select auth.uid()));
create policy ai_budgets_owner on public.ai_daily_budgets for select to authenticated using(user_id=(select auth.uid()));

-- Commerce: public catalog/listing reads; no user can write affiliate financial data.
create policy affiliate_click_insert on public.affiliate_clicks for insert to anon,authenticated with check(true);
create policy affiliate_click_admin_read on public.affiliate_clicks for select to authenticated using(public.current_app_role()='platform_admin');
create policy commission_admin_read on public.commission_ledger for select to authenticated using(public.current_app_role()='platform_admin' or (clinic_id is not null and public.is_clinic_member(clinic_id)));
create policy invoices_clinic_read on public.invoices for select to authenticated using(public.is_clinic_member(clinic_id));
create policy placements_public_read on public.spa_placements for select to anon,authenticated using(ends_at>now() and (not is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true'));
create policy reminders_clinic_read on public.reminder_campaigns for select to authenticated using(public.is_clinic_member(clinic_id));
create policy reminders_clinic_insert on public.reminder_campaigns for insert to authenticated with check(public.is_clinic_member(clinic_id) and created_by=(select auth.uid()));
create policy notifications_owner_read on public.notifications for select to authenticated using(user_id=(select auth.uid()));
create policy community_published_read on public.community_posts for select to anon,authenticated using(not is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true');

-- Append-only clinical facts and accounting records; amendments/reversals carry corrections.
create or replace function public.prevent_immutable_update() returns trigger language plpgsql as $$
begin raise exception '% is append-only',tg_table_name; end $$;
drop trigger if exists medical_records_immutable on public.medical_records;
create trigger medical_records_immutable before update or delete on public.medical_records for each row execute function public.prevent_immutable_update();
drop trigger if exists commission_ledger_immutable on public.commission_ledger;
create trigger commission_ledger_immutable before update or delete on public.commission_ledger for each row execute function public.prevent_immutable_update();

-- Private pet documents bucket. Owner paths begin with the owner UUID.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('pet-documents','pet-documents',false,20971520,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy pet_docs_upload_own on storage.objects for insert to authenticated with check(bucket_id='pet-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy pet_docs_read_own on storage.objects for select to authenticated using(bucket_id='pet-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Fictional catalog fixtures. No clinical suitability is asserted by these rows.
insert into public.vaccine_catalog(code,name,species,notes,is_demo) values
('DEMO-VAX-DOG-01','Demo canine vaccine A',array['dog'],'Fictional demo catalog entry',true),
('DEMO-VAX-CAT-01','Demo feline vaccine A',array['cat'],'Fictional demo catalog entry',true)
on conflict(code) do nothing;
insert into public.medication_catalog(code,name,active_ingredient,notes,is_demo) values
('DEMO-MED-001','Demo medication A','DEMO-ACTIVE-A','Fictional demo catalog entry',true)
on conflict(code) do nothing;
insert into public.sos_rules(code,symptom,urgency,criteria,owner_message_vi,owner_message_en,enabled,is_demo) values
('DEMO-SOS-BREATHING','breathing','emergency','{"fixture":"synthetic"}','Quy tắc demo — cần xác minh thú y.','Demo rule — requires veterinary validation.',false,true),
('DEMO-SOS-MONITOR','other','monitor','{"fixture":"synthetic"}','Quy tắc demo — không dùng làm hướng dẫn y tế.','Demo rule — not medical guidance.',false,true)
on conflict(code) do nothing;
insert into public.care_plan_rules(code,species,category,task_key,offset_days,due_window_days,enabled,is_demo) values
('DEMO-CARE-DENTAL-DOG','dog','dental','demo.dental.check',0,30,false,true),
('DEMO-CARE-WEIGHT-CAT','cat','weight_check','demo.weight.check',30,14,false,true)
on conflict(code) do nothing;
