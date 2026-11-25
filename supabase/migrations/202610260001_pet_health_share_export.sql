-- Migration: Pet Health Record Share & Export Extensions
-- Supports: Time-limited full records, public rabies collar QR verification,
-- access audit logging (Decree 13/2023/ND-CP), and receiving clinic imports.

-- 1. Make clinic_id nullable on record_access_grants so public links & collar QRs can be created without a pre-assigned clinic
alter table public.record_access_grants alter column clinic_id drop not null;

-- 2. Add share_type, pin_hash, include_owner_contact, and label to record_access_grants
alter table public.record_access_grants
  add column if not exists share_type text not null default 'full_record' check (share_type in ('full_record', 'rabies_verification')),
  add column if not exists pin_hash text,
  add column if not exists include_owner_contact boolean not null default false,
  add column if not exists label text;

create index if not exists record_grants_share_token_idx on public.record_access_grants(share_token_hash)
  where revoked_at is null;

-- 3. Access logs table for share links (Visible to pet owners per Decree 13/2023/ND-CP)
create table if not exists public.share_access_logs (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references public.record_access_grants(id) on delete cascade,
  accessed_at timestamptz not null default now(),
  ip_hash text,
  user_agent text,
  device_type text,
  coarse_location text,
  action text not null default 'view' check (action in ('view', 'verify_pin', 'import', 'download_pdf')),
  metadata jsonb not null default '{}'
);

create index if not exists share_access_logs_grant_idx on public.share_access_logs(grant_id, accessed_at desc);

alter table public.share_access_logs enable row level security;

-- Owners can read access logs for their grants
create policy share_logs_owner_read on public.share_access_logs
  for select to authenticated
  using (
    exists (
      select 1 from public.record_access_grants g
      where g.id = share_access_logs.grant_id
      and g.owner_id = (select auth.uid())
    )
  );

-- Service role has full access
create policy share_logs_service_all on public.share_access_logs
  for all to service_role using (true) with check (true);

-- Allow inserting access logs through security-definer function or server action
create or replace function public.log_share_access(
  p_grant_id uuid,
  p_ip_hash text default null,
  p_user_agent text default null,
  p_device_type text default null,
  p_coarse_location text default null,
  p_action text default 'view',
  p_metadata jsonb default '{}'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.share_access_logs (grant_id, ip_hash, user_agent, device_type, coarse_location, action, metadata)
  values (p_grant_id, p_ip_hash, p_user_agent, p_device_type, p_coarse_location, p_action, p_metadata)
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.log_share_access(uuid, text, text, text, text, text, jsonb) from public;
grant execute on function public.log_share_access(uuid, text, text, text, text, text, jsonb) to anon, authenticated, service_role;

-- 4. Import shared record to clinic function (attaches verified history to receiving clinic)
create or replace function public.import_shared_patient_record(
  p_grant_id uuid,
  p_receiving_clinic uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_grant record;
  v_actor uuid := (select auth.uid());
  v_existing_grant uuid;
begin
  if v_actor is null or not public.is_clinic_member(p_receiving_clinic) then
    raise exception 'clinic_permission_denied' using errcode = '42501';
  end if;

  select * into v_grant from public.record_access_grants
  where id = p_grant_id and revoked_at is null and expires_at > now();

  if v_grant.id is null then
    raise exception 'invalid_or_expired_grant' using errcode = '42501';
  end if;

  -- Create or extend clinic active grant
  select id into v_existing_grant from public.record_access_grants
  where pet_id = v_grant.pet_id and clinic_id = p_receiving_clinic and revoked_at is null and expires_at > now()
  limit 1;

  if v_existing_grant is null then
    insert into public.record_access_grants (
      owner_id, pet_id, clinic_id, consent, expires_at, scopes, issued_by, share_type
    ) values (
      v_grant.owner_id,
      v_grant.pet_id,
      p_receiving_clinic,
      'Imported via QR share with owner consent (Decree 13/2023/ND-CP)',
      now() + interval '90 days',
      v_grant.scopes,
      v_grant.owner_id,
      'full_record'
    ) returning id into v_existing_grant;
  end if;

  -- Log the import in share_access_logs and audit_logs
  perform public.log_share_access(
    p_grant_id,
    null,
    null,
    'clinic_portal',
    'Ho Chi Minh City',
    'import',
    jsonb_build_object('clinic_id', p_receiving_clinic, 'actor_id', v_actor)
  );

  insert into public.audit_logs (actor_id, clinic_id, pet_id, action, entity_type, entity_id, metadata)
  values (
    v_actor,
    p_receiving_clinic,
    v_grant.pet_id,
    'import_shared_record',
    'passport',
    v_grant.pet_id::text,
    jsonb_build_object('source_grant_id', p_grant_id)
  );

  return jsonb_build_object(
    'success', true,
    'pet_id', v_grant.pet_id,
    'grant_id', v_existing_grant
  );
end $$;

revoke all on function public.import_shared_patient_record(uuid, uuid) from public;
grant execute on function public.import_shared_patient_record(uuid, uuid) to authenticated;

