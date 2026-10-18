alter table public.ai_runs add column if not exists is_demo boolean not null default false;
update public.ai_runs set is_demo=true where provider='mock' and is_demo=false;
create index if not exists ai_runs_live_created_idx on public.ai_runs(created_at desc) where is_demo=false;
create index if not exists sos_requests_created_idx on public.sos_requests(created_at desc);

create or replace function public.create_triage_session(p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_sos public.sos_requests%rowtype; v_session uuid;
begin
  select * into v_sos from public.sos_requests where id=p_request for update;
  if not found or v_sos.status<>'accepted' or v_sos.accepted_clinic_id is null then
    raise exception 'sos_not_accepted' using errcode='42501';
  end if;
  if not public.is_clinic_member(v_sos.accepted_clinic_id) then
    raise exception 'clinic_access_denied' using errcode='42501';
  end if;
  select id into v_session from public.triage_sessions where request_id=p_request;
  if v_session is not null then return v_session; end if;
  insert into public.triage_sessions(request_id,clinic_id,owner_id,expires_at)
  values(p_request,v_sos.accepted_clinic_id,v_sos.owner_id,now()+interval '30 minutes') returning id into v_session;
  return v_session;
end $$;
revoke all on function public.create_triage_session(uuid) from public,anon;
grant execute on function public.create_triage_session(uuid) to authenticated;
