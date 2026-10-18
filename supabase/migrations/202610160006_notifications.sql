-- Event-driven notification outbox, preferences, durable queue and delivery history.
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default true,
  in_app_enabled boolean not null default true,
  web_push_enabled boolean not null default false,
  email_enabled boolean not null default true,
  sms_zalo_enabled boolean not null default false,
  appointments_enabled boolean not null default true,
  vaccines_enabled boolean not null default true,
  care_plans_enabled boolean not null default true,
  reviews_enabled boolean not null default true,
  sos_enabled boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  email_unsubscribed_at timestamptz,
  sms_unsubscribed_at timestamptz,
  updated_at timestamptz not null default now(),
  check ((quiet_hours_start is null) = (quiet_hours_end is null))
);
create trigger notification_preferences_updated_at before update on public.notification_preferences
for each row execute function public.set_updated_at();
alter table public.notification_preferences enable row level security;
create policy notification_preferences_owner_read on public.notification_preferences for select to authenticated using(user_id=(select auth.uid()));
create policy notification_preferences_owner_insert on public.notification_preferences for insert to authenticated with check(user_id=(select auth.uid()));
create policy notification_preferences_owner_update on public.notification_preferences for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

alter table public.notifications add column if not exists category text not null default 'appointment'
  check(category in ('appointment','vaccine','care_plan','review','sos'));
alter table public.notifications add column if not exists priority text not null default 'normal' check(priority in ('normal','high'));
alter table public.notifications add column if not exists locale text not null default 'vi' check(locale in ('vi','en'));
alter table public.notifications add column if not exists template_key text;
alter table public.notifications add column if not exists updated_at timestamptz not null default now();
create index if not exists notifications_owner_scheduled_idx on public.notifications(user_id,scheduled_at desc);
create trigger notifications_updated_at before update on public.notifications
for each row execute function public.set_updated_at();

create table if not exists public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade unique,
  priority integer not null default 10 check(priority in (0,10)),
  available_at timestamptz not null default now(),
  status text not null default 'queued' check(status in ('queued','processing','done','dead')),
  attempts integer not null default 0 check(attempts>=0),
  claimed_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notification_jobs_ready_idx on public.notification_jobs(priority,available_at,created_at) where status='queued';
create trigger notification_jobs_updated_at before update on public.notification_jobs
for each row execute function public.set_updated_at();
alter table public.notification_jobs enable row level security;
create policy notification_jobs_service_only on public.notification_jobs for all to service_role using(true) with check(true);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null check(channel in ('in_app','web_push','email','sms_zalo')),
  provider text not null,
  status text not null check(status in ('delivered','mocked','suppressed','failed','unsubscribed')),
  attempt integer not null default 1 check(attempt>0),
  provider_message_id text,
  error_code text,
  created_at timestamptz not null default now()
);
create index if not exists notification_deliveries_owner_idx on public.notification_deliveries(user_id,created_at desc);
create index if not exists notification_deliveries_attempt_idx on public.notification_deliveries(notification_id,channel,attempt);
alter table public.notification_deliveries enable row level security;
create policy notification_deliveries_owner_read on public.notification_deliveries for select to authenticated using(user_id=(select auth.uid()));

create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique check(endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|([a-z0-9-]+\.)*push\.apple\.com)/'),
  p256dh text not null,
  auth_secret text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
alter table public.web_push_subscriptions enable row level security;
create policy web_push_subscriptions_owner_read on public.web_push_subscriptions for select to authenticated using(user_id=(select auth.uid()));
create policy web_push_subscriptions_owner_insert on public.web_push_subscriptions for insert to authenticated with check(user_id=(select auth.uid()));
create policy web_push_subscriptions_owner_update on public.web_push_subscriptions for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create or replace function public.queue_notification_job() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.notification_jobs(notification_id,priority,available_at)
  values(new.id,case when new.category='sos' and new.priority='high' then 0 else 10 end,coalesce(new.scheduled_at,now()))
  on conflict(notification_id) do nothing;
  return new;
end $$;
create trigger notification_enqueue after insert on public.notifications
for each row execute function public.queue_notification_job();

create or replace function public.claim_notification_jobs(p_limit integer default 25)
returns setof public.notification_jobs language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'service role required' using errcode='42501'; end if;
  return query with picked as (
    select id from public.notification_jobs
    where (status='queued' and available_at<=now())
       or (status='processing' and claimed_at<now()-interval '5 minutes')
    order by priority,available_at,created_at
    for update skip locked limit least(greatest(p_limit,1),100)
  ) update public.notification_jobs j set status='processing',attempts=j.attempts+1,claimed_at=now()
    from picked where j.id=picked.id returning j.*;
end $$;
revoke all on function public.claim_notification_jobs(integer) from public,anon,authenticated;
grant execute on function public.claim_notification_jobs(integer) to service_role;

create or replace function public.create_event_notification(
  p_user_id uuid,p_category text,p_template_key text,p_idempotency_key text,p_payload jsonb,p_scheduled_at timestamptz default now(),p_priority text default 'normal'
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare user_locale text;
begin
  select preferred_locale into user_locale from public.profiles where id=p_user_id;
  if user_locale is null then return; end if;
  insert into public.notifications(user_id,type,category,priority,locale,template_key,payload,scheduled_at,status,idempotency_key)
  values(p_user_id,p_category,p_category,p_priority,user_locale,p_template_key,p_payload,p_scheduled_at,'queued',p_idempotency_key)
  on conflict(idempotency_key) do nothing;
end $$;
revoke all on function public.create_event_notification(uuid,text,text,text,jsonb,timestamp with time zone,text) from public,anon,authenticated;
grant execute on function public.create_event_notification(uuid,text,text,text,jsonb,timestamp with time zone,text) to service_role;

-- Appointment reminders are queued one day before confirmed visits; completion queues one review request.
create or replace function public.notify_appointment_event() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare changed boolean := true;
begin
  if tg_op='UPDATE' then changed:=old.status is distinct from new.status; end if;
  if new.status='confirmed' and changed then
    perform public.create_event_notification(new.owner_id,'appointment','appointment_reminder',
      'appointment-reminder:'||new.id::text,jsonb_build_object('appointment_id',new.id,'starts_at',new.starts_at),greatest(now(),new.starts_at-interval '24 hours'),'normal');
  end if;
  if new.status='completed' and changed then
    perform public.create_event_notification(new.owner_id,'review','review_request',
      'review-request:'||new.id::text,jsonb_build_object('appointment_id',new.id),now(),'normal');
  end if;
  return new;
end $$;
create trigger appointment_notification_events after insert or update of status on public.appointments
for each row execute function public.notify_appointment_event();

create or replace function public.notify_vaccine_due() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare owner_row record;
begin
  if tg_op='UPDATE' and old.next_due_at is not distinct from new.next_due_at then return new; end if;
  if new.next_due_at is null then return new; end if;
  for owner_row in select owner_id from public.pet_owners where pet_id=new.pet_id union select owner_id from public.pets where id=new.pet_id loop
    perform public.create_event_notification(owner_row.owner_id,'vaccine','vaccine_due',
      'vaccine-due:'||new.id::text||':'||new.next_due_at::text,jsonb_build_object('pet_id',new.pet_id,'vaccine_name',new.vaccine_name,'due_at',new.next_due_at),greatest(now(),new.next_due_at::timestamptz-interval '7 days'),'normal');
  end loop;
  return new;
end $$;
create trigger vaccine_due_notification after insert or update of next_due_at on public.vaccinations
for each row execute function public.notify_vaccine_due();

create or replace function public.notify_care_plan_task_due() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare owner_row record; pet_key uuid;
begin
  if new.due_from is null or new.status<>'pending' then return new; end if;
  select pet_id into pet_key from public.care_plans where id=new.plan_id and status='approved' and shared_with_owner;
  if pet_key is null then return new; end if;
  for owner_row in select owner_id from public.pet_owners where pet_id=pet_key union select owner_id from public.pets where id=pet_key loop
    perform public.create_event_notification(owner_row.owner_id,'care_plan','care_plan_task',
      'care-plan-task:'||new.id::text||':'||new.due_from::text,jsonb_build_object('task_key',new.task_key,'due_at',new.due_from),greatest(now(),new.due_from::timestamptz-interval '1 day'),'normal');
  end loop;
  return new;
end $$;
create trigger care_plan_task_notification after insert or update of status,due_from on public.care_plan_items
for each row execute function public.notify_care_plan_task_due();

create or replace function public.notify_approved_care_plan_tasks() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare item_row record; owner_row record; changed boolean := true;
begin
  if tg_op='UPDATE' then changed:=old.status is distinct from new.status or old.shared_with_owner is distinct from new.shared_with_owner; end if;
  if new.status='approved' and new.shared_with_owner and changed then
    for item_row in select id,task_key,due_from from public.care_plan_items where plan_id=new.id and status='pending' and due_from is not null loop
      for owner_row in select owner_id from public.pet_owners where pet_id=new.pet_id union select owner_id from public.pets where id=new.pet_id loop
        perform public.create_event_notification(owner_row.owner_id,'care_plan','care_plan_task',
          'care-plan-task:'||item_row.id::text||':'||item_row.due_from::text,jsonb_build_object('task_key',item_row.task_key,'due_at',item_row.due_from),greatest(now(),item_row.due_from::timestamptz-interval '1 day'),'normal');
      end loop;
    end loop;
  end if;
  return new;
end $$;
create trigger care_plan_approval_notification after insert or update of status,shared_with_owner on public.care_plans
for each row execute function public.notify_approved_care_plan_tasks();

-- SOS clinic dispatch alerts are high-priority; acceptance updates the originating owner's inbox.
create or replace function public.notify_sos_dispatch() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare staff_row record;
begin
  for staff_row in select user_id from public.clinic_staff where clinic_id=new.clinic_id loop
    perform public.create_event_notification(staff_row.user_id,'sos','sos_clinic_dispatch',
      'sos-dispatch:'||new.id::text,jsonb_build_object('request_id',new.request_id),now(),'high');
  end loop;
  return new;
end $$;
create trigger sos_dispatch_notification after insert on public.sos_dispatches
for each row execute function public.notify_sos_dispatch();

create or replace function public.notify_sos_owner() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.status='accepted' and old.status is distinct from new.status then
    perform public.create_event_notification(new.owner_id,'sos','sos_clinic_accepted',
      'sos-accepted:'||new.id::text,jsonb_build_object('request_id',new.id),now(),'high');
  end if;
  return new;
end $$;
create trigger sos_owner_notification after update of status on public.sos_requests
for each row execute function public.notify_sos_owner();

-- Treat provider-specific unsubscribe/bounce signals as durable channel suppression.
create or replace function public.suppress_notification_email(p_user_id uuid) returns void language sql security definer set search_path=public,pg_temp as $$
  insert into public.notification_preferences(user_id,email_unsubscribed_at) values(p_user_id,now())
  on conflict(user_id) do update set email_unsubscribed_at=coalesce(public.notification_preferences.email_unsubscribed_at,now());
$$;
revoke all on function public.suppress_notification_email(uuid) from public,anon,authenticated;
grant execute on function public.suppress_notification_email(uuid) to service_role;
