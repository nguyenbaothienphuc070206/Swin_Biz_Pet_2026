create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('owner','clinic_staff','clinic_admin','platform_admin');
exception when duplicate_object then null; end $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role public.app_role not null default 'owner',
  preferred_locale text not null default 'vi' check (preferred_locale in ('vi','en')),
  email_notifications boolean not null default true,
  appointment_reminders boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_staff (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  staff_role public.app_role not null check (staff_role in ('clinic_staff','clinic_admin')),
  created_at timestamptz not null default now(),
  primary key (clinic_id,user_id)
);

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  species text not null check (species in ('dog','cat','other')),
  breed text,
  birth_date date,
  microchip text,
  photo_path text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pets_owner_created_idx on public.pets(owner_id,created_at) where deleted_at is null;

create table if not exists public.record_access_grants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  consent text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);
create index if not exists record_access_grants_active_idx on public.record_access_grants(pet_id,clinic_id,expires_at) where revoked_at is null;

create table if not exists public.clinic_verification_requests (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  clinic_name text not null check (length(trim(clinic_name)) between 1 and 160),
  address text not null check (length(trim(address)) between 1 and 240),
  document_paths text[] not null check (cardinality(document_paths) between 1 and 10),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  consent_type text not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null check (request_type in ('export','delete')),
  status text not null default 'received' check (status in ('received','in_progress','completed','declined')),
  created_at timestamptz not null default now()
);

create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid())
$$;
revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id,full_name,role)
  values (new.id,coalesce(new.raw_user_meta_data->>'full_name',''),'owner')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created_pawcare on auth.users;
create trigger on_auth_user_created_pawcare after insert on auth.users for each row execute procedure public.handle_new_auth_user();

create or replace function public.protect_profile_role()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role and coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'role is managed by platform administrators';
  end if;
  return new;
end $$;
drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role before update on public.profiles for each row execute function public.protect_profile_role();

do $$ declare t text; begin
  foreach t in array array['profiles','clinics','clinic_staff','pets','record_access_grants','clinic_verification_requests','consents','privacy_requests'] loop
    execute format('drop trigger if exists set_updated_at on public.%I',t);
  end loop;
end $$;
create trigger set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.clinics for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.pets for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.clinic_verification_requests for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.clinics enable row level security;
alter table public.clinic_staff enable row level security;
alter table public.pets enable row level security;
alter table public.record_access_grants enable row level security;
alter table public.clinic_verification_requests enable row level security;
alter table public.consents enable row level security;
alter table public.privacy_requests enable row level security;

create policy profiles_read_self_or_platform on public.profiles for select to authenticated using (id = (select auth.uid()) or public.current_app_role() = 'platform_admin');
create policy profiles_update_self on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy clinics_read_member_or_public_verified on public.clinics for select to authenticated using (verified or exists (select 1 from public.clinic_staff cs where cs.clinic_id = id and cs.user_id = (select auth.uid())) or public.current_app_role()='platform_admin');
create policy clinic_staff_read_self_or_platform on public.clinic_staff for select to authenticated using (user_id = (select auth.uid()) or public.current_app_role()='platform_admin');

create policy pets_owner_all on public.pets for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy pets_clinic_with_active_grant on public.pets for select to authenticated using (
  deleted_at is null and exists (
    select 1 from public.record_access_grants g
    join public.clinic_staff cs on cs.clinic_id=g.clinic_id and cs.user_id=(select auth.uid())
    where g.pet_id=pets.id and g.owner_id=pets.owner_id and g.revoked_at is null and g.expires_at > now()
  )
);
create policy pets_platform_admin_read on public.pets for select to authenticated using (public.current_app_role()='platform_admin');

create policy grants_owner_read on public.record_access_grants for select to authenticated using (owner_id=(select auth.uid()));
create policy grants_owner_create on public.record_access_grants for insert to authenticated with check (owner_id=(select auth.uid()) and exists (select 1 from public.pets p where p.id=pet_id and p.owner_id=(select auth.uid())));
create policy grants_owner_revoke on public.record_access_grants for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy grants_clinic_active_read on public.record_access_grants for select to authenticated using (revoked_at is null and expires_at>now() and exists (select 1 from public.clinic_staff cs where cs.clinic_id=clinic_id and cs.user_id=(select auth.uid())));

create policy verification_submit_authenticated_user on public.clinic_verification_requests for insert to authenticated with check (submitted_by=(select auth.uid()));
create policy verification_read_submitter_or_platform on public.clinic_verification_requests for select to authenticated using (submitted_by=(select auth.uid()) or public.current_app_role()='platform_admin');
create policy verification_admin_update on public.clinic_verification_requests for update to authenticated using (public.current_app_role()='platform_admin') with check (public.current_app_role()='platform_admin');

create policy consents_owner_read on public.consents for select to authenticated using (user_id=(select auth.uid()));
create policy consents_owner_insert on public.consents for insert to authenticated with check (user_id=(select auth.uid()));
create policy consents_owner_revoke on public.consents for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy privacy_requests_owner_read on public.privacy_requests for select to authenticated using (user_id=(select auth.uid()));
create policy privacy_requests_owner_insert on public.privacy_requests for insert to authenticated with check (user_id=(select auth.uid()));

grant select,update on public.profiles to authenticated;
grant select on public.clinics,public.clinic_staff to authenticated;
grant select,insert,update,delete on public.pets to authenticated;
grant select,insert,update on public.record_access_grants to authenticated;
grant select,insert on public.clinic_verification_requests to authenticated;
grant update on public.clinic_verification_requests to authenticated;
grant select,insert,update on public.consents to authenticated;
grant select,insert on public.privacy_requests to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('clinic-verification','clinic-verification',false,10485760,array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

create policy clinic_docs_upload_own_folder on storage.objects for insert to authenticated with check (
  bucket_id='clinic-verification' and (storage.foldername(name))[1]=(select auth.uid())::text and
  public.current_app_role() in ('owner','clinic_admin')
);
create policy clinic_docs_read_submitter_or_platform on storage.objects for select to authenticated using (
  bucket_id='clinic-verification' and (
    (storage.foldername(name))[1]=(select auth.uid())::text or
    public.current_app_role()='platform_admin'
  )
);
create policy clinic_docs_delete_own_folder on storage.objects for delete to authenticated using (
  bucket_id='clinic-verification' and (storage.foldername(name))[1]=(select auth.uid())::text and
  public.current_app_role() in ('owner','clinic_admin')
);
