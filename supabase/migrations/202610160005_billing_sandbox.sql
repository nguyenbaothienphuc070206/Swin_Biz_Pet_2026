-- Owner subscriptions and sandbox payment ledger. No provider credentials or live payment capability.
create table public.billing_plans (
  code text primary key check(code in ('free','plus','premium')),
  amount_vnd bigint check(amount_vnd is null or amount_vnd>=0),
  interval_unit text not null default 'month' check(interval_unit='month'),
  active boolean not null default true,
  is_sandbox boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.billing_plans(code,amount_vnd,is_sandbox) values
 ('free',0,true),('plus',49000,true),('premium',99000,true)
on conflict(code) do nothing;

create table public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id),
  plan_code text not null references public.billing_plans(code), status text not null check(status in ('pending','active','past_due','cancelled','expired')),
  period_starts_at timestamptz not null, period_ends_at timestamptz not null, grace_ends_at timestamptz,
  cancel_at_period_end boolean not null default false, pending_plan_code text references public.billing_plans(code),
  is_sandbox boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(period_ends_at>period_starts_at)
);
create unique index billing_one_live_subscription_per_owner on public.billing_subscriptions(owner_id) where status in ('pending','active','past_due','cancelled');
create index billing_subscriptions_due_idx on public.billing_subscriptions(status,period_ends_at);

create table public.billing_payments (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id), subscription_id uuid not null references public.billing_subscriptions(id),
  provider text not null default 'local-sandbox' check(provider='local-sandbox'), external_reference text not null unique,
  idempotency_key text not null unique, amount_vnd bigint not null check(amount_vnd>0), currency text not null default 'VND' check(currency='VND'),
  status text not null check(status in ('pending','paid','failed','refunded')), checkout_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index billing_payments_owner_idx on public.billing_payments(owner_id,created_at desc);
create unique index billing_one_pending_payment_per_owner on public.billing_payments(owner_id) where status='pending';

create table public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(), provider text not null check(provider='local-sandbox'), event_id text not null,
  payment_id uuid not null references public.billing_payments(id), signature_verified boolean not null,
  outcome text not null check(outcome in ('applied','duplicate','rejected')), payload_redacted jsonb not null default '{}',
  received_at timestamptz not null default now(), unique(provider,event_id)
);
create index billing_webhook_events_payment_idx on public.billing_webhook_events(payment_id,received_at desc);

create table public.billing_documents (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id), subscription_id uuid not null references public.billing_subscriptions(id),
  payment_id uuid references public.billing_payments(id), document_number text not null unique,
  document_type text not null check(document_type in ('sandbox_receipt','sandbox_statement')),
  amount_vnd bigint not null check(amount_vnd>=0), status text not null check(status in ('issued','void')),
  issued_at timestamptz not null default now(), is_sandbox boolean not null default true
);

create table public.billing_reconciliation_jobs (
  id uuid primary key default gen_random_uuid(), payment_id uuid not null references public.billing_payments(id),
  status text not null default 'queued' check(status in ('queued','running','done','failed')),
  attempts integer not null default 0 check(attempts>=0), next_attempt_at timestamptz not null default now(), last_error_code text,
  unique(payment_id)
);
create index billing_reconciliation_due_idx on public.billing_reconciliation_jobs(status,next_attempt_at);

do $$ declare t text; begin
  foreach t in array array['billing_plans','billing_subscriptions','billing_payments','billing_webhook_events','billing_documents','billing_reconciliation_jobs'] loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
end $$;
create policy billing_plans_read on public.billing_plans for select to authenticated using(active);
create policy billing_subscriptions_owner_read on public.billing_subscriptions for select to authenticated using(owner_id=(select auth.uid()) or public.current_app_role()='platform_admin');
create policy billing_payments_owner_read on public.billing_payments for select to authenticated using(owner_id=(select auth.uid()) or public.current_app_role()='platform_admin');
create policy billing_documents_owner_read on public.billing_documents for select to authenticated using(owner_id=(select auth.uid()) or public.current_app_role()='platform_admin');
create policy billing_events_platform_read on public.billing_webhook_events for select to authenticated using(public.current_app_role()='platform_admin');
create policy billing_jobs_platform_read on public.billing_reconciliation_jobs for select to authenticated using(public.current_app_role()='platform_admin');

drop trigger if exists set_updated_at on public.billing_plans;
create trigger set_updated_at before update on public.billing_plans for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.billing_subscriptions;
create trigger set_updated_at before update on public.billing_subscriptions for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.billing_payments;
create trigger set_updated_at before update on public.billing_payments for each row execute function public.set_updated_at();
drop trigger if exists billing_webhook_events_immutable on public.billing_webhook_events;
create trigger billing_webhook_events_immutable before update or delete on public.billing_webhook_events for each row execute function public.prevent_immutable_update();
drop trigger if exists billing_documents_immutable on public.billing_documents;
create trigger billing_documents_immutable before update or delete on public.billing_documents for each row execute function public.prevent_immutable_update();

create or replace function public.create_sandbox_subscription_checkout(
  p_owner_id uuid,p_plan_code text,p_amount_vnd bigint,p_reference text,p_idempotency_key text,p_checkout_url text
) returns table(subscription_id uuid,payment_id uuid) language plpgsql security definer set search_path = '' as $$
declare v_subscription public.billing_subscriptions%rowtype; v_payment_id uuid; v_now timestamptz:=now();
begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'service_role_required'; end if;
  perform 1 from public.profiles where id=p_owner_id and role='owner' for update;
  if not found then raise exception 'owner_not_found'; end if;
  if p_amount_vnd<=0 or p_reference='' or p_idempotency_key='' or p_checkout_url not like 'http://localhost:%' and p_checkout_url not like 'https://%' then raise exception 'invalid_checkout'; end if;
  if not exists(select 1 from public.billing_plans where code=p_plan_code and active and is_sandbox and amount_vnd is not null) then raise exception 'plan_unavailable'; end if;
  if exists(select 1 from public.billing_payments where owner_id=p_owner_id and status='pending') then raise exception 'billing_checkout_pending'; end if;
  select * into v_subscription from public.billing_subscriptions where owner_id=p_owner_id and status in ('pending','active','past_due','cancelled') for update;
  if found then
    update public.billing_subscriptions set pending_plan_code=p_plan_code,cancel_at_period_end=false where id=v_subscription.id;
    subscription_id:=v_subscription.id;
  else
    insert into public.billing_subscriptions(owner_id,plan_code,pending_plan_code,status,period_starts_at,period_ends_at,is_sandbox)
      values(p_owner_id,'free',p_plan_code,'pending',v_now,v_now+interval '30 days',true) returning id into subscription_id;
  end if;
  insert into public.billing_payments(owner_id,subscription_id,provider,external_reference,idempotency_key,amount_vnd,status,checkout_url)
    values(p_owner_id,subscription_id,'local-sandbox',p_reference,p_idempotency_key,p_amount_vnd,'pending',p_checkout_url) returning id into v_payment_id;
  insert into public.billing_reconciliation_jobs(payment_id,next_attempt_at) values(v_payment_id,v_now+interval '5 minutes');
  payment_id:=v_payment_id;return next;
end $$;
revoke all on function public.create_sandbox_subscription_checkout(uuid,text,bigint,text,text,text) from public,anon,authenticated;
grant execute on function public.create_sandbox_subscription_checkout(uuid,text,bigint,text,text,text) to service_role;

create or replace function public.apply_sandbox_payment_event(
  p_event_id text,p_reference text,p_amount_vnd bigint,p_status text,p_occurred_at timestamptz,p_payload jsonb,p_signature_verified boolean
) returns text language plpgsql security definer set search_path = '' as $$
declare v_payment public.billing_payments%rowtype; v_event_id uuid; v_now timestamptz:=now();
begin
  if not p_signature_verified or p_status not in ('paid','failed') then raise exception 'invalid_payment_event'; end if;
  select * into v_payment from public.billing_payments where external_reference=p_reference and provider='local-sandbox' for update;
  if not found or v_payment.amount_vnd<>p_amount_vnd then raise exception 'payment_reference_or_amount_mismatch'; end if;
  insert into public.billing_webhook_events(provider,event_id,payment_id,signature_verified,outcome,payload_redacted)
    values('local-sandbox',p_event_id,v_payment.id,true,case when v_payment.status='pending' then 'applied' else 'duplicate' end,p_payload)
    on conflict(provider,event_id) do nothing returning id into v_event_id;
  if v_event_id is null then return 'duplicate'; end if;
  if v_payment.status<>'pending' then return 'duplicate'; end if;
  update public.billing_payments set status=p_status where id=v_payment.id;
  if p_status='paid' then
    update public.billing_subscriptions set plan_code=coalesce(pending_plan_code,plan_code),pending_plan_code=null,status='active',period_starts_at=v_now,period_ends_at=v_now+interval '30 days',grace_ends_at=null,cancel_at_period_end=false
      where id=v_payment.subscription_id;
    insert into public.billing_documents(owner_id,subscription_id,payment_id,document_number,document_type,amount_vnd,status,is_sandbox)
      values(v_payment.owner_id,v_payment.subscription_id,v_payment.id,'PC-SB-'||upper(substr(replace(v_payment.id::text,'-',''),1,16)),'sandbox_receipt',v_payment.amount_vnd,'issued',true)
      on conflict(document_number) do nothing;
    update public.billing_reconciliation_jobs set status='done' where payment_id=v_payment.id;
  else
    update public.billing_subscriptions set status='past_due',grace_ends_at=v_now+interval '3 days' where id=v_payment.subscription_id;
    insert into public.billing_reconciliation_jobs(payment_id) values(v_payment.id) on conflict(payment_id) do update set status='queued',next_attempt_at=v_now+interval '5 minutes';
  end if;
  return 'applied';
end $$;
revoke all on function public.apply_sandbox_payment_event(text,text,bigint,text,timestamptz,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.apply_sandbox_payment_event(text,text,bigint,text,timestamptz,jsonb,boolean) to service_role;
