-- Query indexes supporting high-frequency nearby search, passport and care-task reads.
create index if not exists clinics_public_verified_location_gist on public.clinics using gist(location)
  where published=true and verified=true and is_demo=false;
create index if not exists record_grants_clinic_active_idx on public.record_access_grants(clinic_id,pet_id,expires_at)
  where revoked_at is null;
create index if not exists care_plans_owner_pet_idx on public.care_plans(pet_id,status,created_at desc);
create index if not exists care_plan_items_open_due_idx on public.care_plan_items(plan_id,due_from)
  where status='pending';
create index if not exists medical_records_clinic_pet_time_idx on public.medical_records(clinic_id,pet_id,occurred_at desc);
create index if not exists appointments_owner_start_idx on public.appointments(owner_id,starts_at,status);
create index if not exists sos_dispatch_clinic_pending_idx on public.sos_dispatches(clinic_id,pinged_at desc)
  where status='pinged';
create index if not exists vaccinations_due_pet_idx on public.vaccinations(next_due_at,pet_id)
  where next_due_at is not null;
create index if not exists pet_allergies_pet_idx on public.pet_allergies(pet_id);
create index if not exists pet_conditions_active_pet_idx on public.pet_conditions(pet_id)
  where status='active';
create index if not exists notifications_user_recent_idx on public.notifications(user_id,created_at desc);

-- Recreate the append-only vaccination RPC with a stable idempotency key so a
-- clinic outbox can safely retry after a network failure without duplicating a record.
drop function if exists public.record_vaccination(uuid,uuid,text,text,text,text,date,uuid);
create function public.record_vaccination(
  p_pet uuid,p_clinic uuid,p_name text,p_code text,p_dose text,p_lot text,p_date date,
  p_catalog uuid default null,p_idempotency_key uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_record uuid; v_actor uuid := (select auth.uid());
begin
  if v_actor is null or not public.is_clinic_member(p_clinic) then raise exception 'clinic_access_denied' using errcode='42501'; end if;
  if p_idempotency_key is not null then
    select id into v_record from public.medical_records where actor_id=v_actor and idempotency_key=p_idempotency_key;
    if v_record is not null then return v_record; end if;
  end if;
  if not exists(select 1 from public.pets p where p.id=p_pet and p.deleted_at is null)
     or not exists(select 1 from public.record_access_grants g where g.pet_id=p_pet and g.clinic_id=p_clinic and g.revoked_at is null and g.expires_at>now() and 'vaccinations'=any(g.scopes)) then
    raise exception 'active_vaccination_grant_required' using errcode='42501';
  end if;
  if length(trim(p_name))=0 or length(trim(p_code))=0 or length(trim(p_dose))=0 or length(trim(p_lot))=0 then raise exception 'required_vaccination_fields'; end if;
  insert into public.medical_records(pet_id,clinic_id,actor_id,record_type,occurred_at,summary,payload,source,idempotency_key)
  values(p_pet,p_clinic,v_actor,'vaccination',p_date::timestamptz,p_name,jsonb_build_object('code',p_code,'dose',p_dose,'lot',p_lot),'clinic',p_idempotency_key)
  on conflict(idempotency_key) do nothing returning id into v_record;
  if v_record is null and p_idempotency_key is not null then
    select id into v_record from public.medical_records where actor_id=v_actor and idempotency_key=p_idempotency_key;
    if v_record is not null then return v_record; end if;
    raise exception 'idempotency_key_conflict' using errcode='23505';
  end if;
  insert into public.vaccinations(record_id,pet_id,vaccine_id,vaccine_name,code,dose,lot,administered_at)
  values(v_record,p_pet,p_catalog,p_name,p_code,p_dose,p_lot,p_date);
  insert into public.audit_logs(actor_id,clinic_id,pet_id,action,entity_type,entity_id)
  values(v_actor,p_clinic,p_pet,'create','vaccination',v_record::text);
  return v_record;
end $$;
revoke all on function public.record_vaccination(uuid,uuid,text,text,text,text,date,uuid,uuid) from public,anon;
grant execute on function public.record_vaccination(uuid,uuid,text,text,text,text,date,uuid,uuid) to authenticated;
