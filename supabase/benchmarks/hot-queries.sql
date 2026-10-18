-- Run against a seeded local/staging database after applying migrations:
-- psql "$DATABASE_URL" -f supabase/benchmarks/hot-queries.sql
-- Keep EXPLAIN output as the CI artifact. Demo rows make this script runnable
-- without production data; timings on the demo seed are not production SLOs.
analyze public.clinics,public.pets,public.record_access_grants,public.medical_records,
  public.vaccinations,public.appointments,public.availability_slots,public.sos_dispatches,
  public.care_plans,public.care_plan_items;

-- 1. Public nearby clinic search (GIST location index).
explain (analyze,buffers,format text)
select id,name from public.clinics
where published and verified and not is_demo and location is not null
  and extensions.st_dwithin(location,extensions.st_setsrid(extensions.st_makepoint(106.7009,10.7769),4326)::extensions.geography,5000)
order by extensions.st_distance(location,extensions.st_setsrid(extensions.st_makepoint(106.7009,10.7769),4326)::extensions.geography) limit 50;

-- 2. SOS 5 km eligible clinic dispatch candidates.
explain (analyze,buffers,format text)
select id from public.clinics where published and verified and not is_demo and location is not null
  and extensions.st_dwithin(location,extensions.st_setsrid(extensions.st_makepoint(106.7009,10.7769),4326)::extensions.geography,5000);

-- 3. Owner home pet list.
explain (analyze,buffers,format text)
select id,name,species,birth_date from public.pets
where owner_id=(select id from public.profiles where is_demo limit 1) and deleted_at is null order by created_at limit 30;

-- 4. Active clinic grant for passport/vaccine access.
explain (analyze,buffers,format text)
select id from public.record_access_grants
where clinic_id=(select id from public.clinics where is_demo limit 1)
  and pet_id=(select id from public.pets where is_demo limit 1) and revoked_at is null and expires_at>now();

-- 5. Recent medical record timeline by pet.
explain (analyze,buffers,format text)
select id,record_type,occurred_at,summary from public.medical_records
where pet_id=(select id from public.pets where is_demo limit 1) order by occurred_at desc limit 100;

-- 6. Vaccinations due soon.
explain (analyze,buffers,format text)
select pet_id,vaccine_name,next_due_at from public.vaccinations
where next_due_at between current_date and current_date+30 order by next_due_at limit 500;

-- 7. Owner appointment list.
explain (analyze,buffers,format text)
select id,clinic_id,starts_at,status from public.appointments
where owner_id=(select id from public.profiles where is_demo limit 1) and starts_at>=now() order by starts_at limit 100;

-- 8. Clinic appointment inbox for the next 14 days.
explain (analyze,buffers,format text)
select id,pet_id,owner_id,starts_at,status from public.appointments
where clinic_id=(select id from public.clinics where is_demo limit 1) and starts_at<now()+interval '14 days'
  and status in ('requested','confirmed','checked_in') order by starts_at limit 200;

-- 9. Clinic SOS inbox dispatches.
explain (analyze,buffers,format text)
select id,request_id,pinged_at from public.sos_dispatches
where clinic_id=(select id from public.clinics where is_demo limit 1) and status='pinged' order by pinged_at desc limit 100;

-- 10. Approved-plan outstanding tasks due next.
explain (analyze,buffers,format text)
select i.id,i.task_key,i.due_from from public.care_plan_items i join public.care_plans p on p.id=i.plan_id
where p.pet_id=(select id from public.pets where is_demo limit 1) and p.status='approved'
  and p.shared_with_owner and i.status='pending' order by i.due_from limit 100;
