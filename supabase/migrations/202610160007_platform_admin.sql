alter table public.profiles add column if not exists suspended_at timestamptz;
alter table public.clinic_verification_requests add column if not exists checklist jsonb not null default '{}';
alter table public.clinic_verification_requests add column if not exists review_reason text;
alter table public.clinic_verification_requests add column if not exists reviewed_by uuid references public.profiles(id);
alter table public.clinic_verification_requests add column if not exists reviewed_at timestamptz;
alter table public.rescue_partners add column if not exists review_reason text;

create table if not exists public.feature_flags (
  flag_key text primary key check(flag_key ~ '^[a-z][a-z0-9_.-]{1,79}$'),
  enabled boolean not null default false,
  description_vi text not null,
  description_en text not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
create table if not exists public.ai_eval_runs (
  id uuid primary key default gen_random_uuid(),
  suite text not null,
  provider text not null,
  passed_cases integer not null check(passed_cases>=0),
  total_cases integer not null check(total_cases>0 and passed_cases<=total_cases),
  thresholds_passed boolean not null,
  git_sha text,
  created_at timestamptz not null default now()
);
create index if not exists ai_eval_runs_created_idx on public.ai_eval_runs(created_at desc);
alter table public.ai_eval_runs enable row level security;
create policy ai_eval_runs_platform_read on public.ai_eval_runs for select to authenticated using(public.current_app_role()='platform_admin');
grant select on public.ai_eval_runs to authenticated;
insert into public.feature_flags(flag_key,enabled,description_vi,description_en) values
 ('notifications.live_delivery',false,'Bật gửi thông báo qua nhà cung cấp đã cấu hình','Enable live delivery through configured providers'),
 ('sos.video_priority',false,'Bật quyền ưu tiên video SOS (không ảnh hưởng SOS cơ bản)','Enable priority SOS video features (basic SOS is unaffected)'),
 ('careplans.owner_release',false,'Cho phép hiển thị kế hoạch chăm sóc đã được bác sĩ duyệt','Allow owners to see vet-approved care plans'),
 ('community.public_rescue',false,'Cho phép công khai hồ sơ cứu hộ đã xác minh','Allow verified rescue cases to be public')
on conflict(flag_key) do nothing;
create trigger feature_flags_updated_at before update on public.feature_flags for each row execute function public.set_updated_at();
alter table public.feature_flags enable row level security;
create policy feature_flags_admin_read on public.feature_flags for select to authenticated using(public.current_app_role()='platform_admin');
create policy feature_flags_admin_update on public.feature_flags for update to authenticated using(public.current_app_role()='platform_admin') with check(public.current_app_role()='platform_admin');
create policy clinics_platform_admin_update on public.clinics for update to authenticated using(public.current_app_role()='platform_admin') with check(public.current_app_role()='platform_admin');
create policy reviews_platform_admin_read on public.reviews for select to authenticated using(public.current_app_role()='platform_admin');
create policy reviews_platform_admin_update on public.reviews for update to authenticated using(public.current_app_role()='platform_admin') with check(public.current_app_role()='platform_admin');
grant select,update on public.feature_flags to authenticated;
grant select,insert,update on public.notification_preferences to authenticated;
grant select on public.notification_deliveries to authenticated;
grant select,insert,update on public.web_push_subscriptions to authenticated;

create policy audit_platform_admin_read on public.audit_logs for select to authenticated using(public.current_app_role()='platform_admin');

create or replace function public.audit_platform_admin_change() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid := auth.uid(); item_id text; action_name text;
begin
  if public.current_app_role()<>'platform_admin' then return null; end if;
  if tg_op='INSERT' then item_id:=coalesce(to_jsonb(new)->>'id',to_jsonb(new)->>'flag_key'); action_name:='admin_create';
  elsif tg_op='DELETE' then item_id:=coalesce(to_jsonb(old)->>'id',to_jsonb(old)->>'flag_key'); action_name:='admin_delete';
  else item_id:=coalesce(to_jsonb(new)->>'id',to_jsonb(new)->>'flag_key'); action_name:='admin_update'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(actor,action_name,tg_table_name,item_id,jsonb_strip_nulls(jsonb_build_object('operation',tg_op,'reason',coalesce(to_jsonb(new)->>'review_reason',to_jsonb(old)->>'review_reason'),'decision',coalesce(to_jsonb(new)->>'verification_status',to_jsonb(new)->>'status'))));
  return null;
end $$;

drop trigger if exists admin_audit_verification on public.clinic_verification_requests;
create trigger admin_audit_verification after insert or update or delete on public.clinic_verification_requests for each row execute function public.audit_platform_admin_change();
drop trigger if exists admin_audit_profiles on public.profiles;
create trigger admin_audit_profiles after update of suspended_at,role on public.profiles for each row execute function public.audit_platform_admin_change();
drop trigger if exists admin_audit_clinics on public.clinics;
create trigger admin_audit_clinics after update of verified on public.clinics for each row execute function public.audit_platform_admin_change();
drop trigger if exists admin_audit_flags on public.feature_flags;
create trigger admin_audit_flags after insert or update or delete on public.feature_flags for each row execute function public.audit_platform_admin_change();
drop trigger if exists admin_audit_community_posts on public.community_posts;
create trigger admin_audit_community_posts after update of status on public.community_posts for each row execute function public.audit_platform_admin_change();
drop trigger if exists admin_audit_community_comments on public.community_comments;
create trigger admin_audit_community_comments after update of status on public.community_comments for each row execute function public.audit_platform_admin_change();
drop trigger if exists admin_audit_reviews on public.reviews;
create trigger admin_audit_reviews after update of status on public.reviews for each row execute function public.audit_platform_admin_change();
drop trigger if exists admin_audit_review_reports on public.review_reports;
create trigger admin_audit_review_reports after insert or update or delete on public.review_reports for each row execute function public.audit_platform_admin_change();
drop trigger if exists admin_audit_rescue_cases on public.rescue_cases;
create trigger admin_audit_rescue_cases after update of status,verification_status on public.rescue_cases for each row execute function public.audit_platform_admin_change();
drop trigger if exists admin_audit_rescue_partners on public.rescue_partners;
create trigger admin_audit_rescue_partners after update of verification_status on public.rescue_partners for each row execute function public.audit_platform_admin_change();
drop trigger if exists admin_audit_moderation_reports on public.community_moderation_reports;
create trigger admin_audit_moderation_reports after update of status on public.community_moderation_reports for each row execute function public.audit_platform_admin_change();
drop trigger if exists admin_audit_appeals on public.community_appeals;
create trigger admin_audit_appeals after update of status on public.community_appeals for each row execute function public.audit_platform_admin_change();
drop trigger if exists admin_audit_lost_found on public.lost_found_reports;
create trigger admin_audit_lost_found after update of status on public.lost_found_reports for each row execute function public.audit_platform_admin_change();
drop trigger if exists admin_audit_strays on public.stray_reports;
create trigger admin_audit_strays after update of status on public.stray_reports for each row execute function public.audit_platform_admin_change();

create or replace function public.require_admin_aal2() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if public.current_app_role()='platform_admin' and coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then
    raise exception 'step_up_required' using errcode='42501';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists require_aal2_feature_flags on public.feature_flags;
create trigger require_aal2_feature_flags before insert or update or delete on public.feature_flags for each row execute function public.require_admin_aal2();
drop trigger if exists require_aal2_verification on public.clinic_verification_requests;
create trigger require_aal2_verification before update or delete on public.clinic_verification_requests for each row execute function public.require_admin_aal2();
drop trigger if exists require_aal2_profiles on public.profiles;
create trigger require_aal2_profiles before update of role,suspended_at on public.profiles for each row execute function public.require_admin_aal2();
drop trigger if exists require_aal2_clinics on public.clinics;
create trigger require_aal2_clinics before update of verified on public.clinics for each row execute function public.require_admin_aal2();
drop trigger if exists require_aal2_reviews on public.reviews;
create trigger require_aal2_reviews before update of status on public.reviews for each row execute function public.require_admin_aal2();
drop trigger if exists require_aal2_posts on public.community_posts;
create trigger require_aal2_posts before update or delete on public.community_posts for each row execute function public.require_admin_aal2();
drop trigger if exists require_aal2_comments on public.community_comments;
create trigger require_aal2_comments before update or delete on public.community_comments for each row execute function public.require_admin_aal2();
drop trigger if exists require_aal2_lost_found on public.lost_found_reports;
create trigger require_aal2_lost_found before update or delete on public.lost_found_reports for each row execute function public.require_admin_aal2();
drop trigger if exists require_aal2_strays on public.stray_reports;
create trigger require_aal2_strays before update or delete on public.stray_reports for each row execute function public.require_admin_aal2();
drop trigger if exists require_aal2_rescue_cases on public.rescue_cases;
create trigger require_aal2_rescue_cases before update or delete on public.rescue_cases for each row execute function public.require_admin_aal2();
drop trigger if exists require_aal2_rescue_partners on public.rescue_partners;
create trigger require_aal2_rescue_partners before update or delete on public.rescue_partners for each row execute function public.require_admin_aal2();
drop trigger if exists require_aal2_moderation_reports on public.community_moderation_reports;
create trigger require_aal2_moderation_reports before update or delete on public.community_moderation_reports for each row execute function public.require_admin_aal2();
drop trigger if exists require_aal2_appeals on public.community_appeals;
create trigger require_aal2_appeals before update or delete on public.community_appeals for each row execute function public.require_admin_aal2();

create or replace function public.admin_review_clinic_verification(p_request uuid,p_decision text,p_reason text,p_checklist jsonb)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.clinic_verification_requests;
begin
  if public.current_app_role()<>'platform_admin' then raise exception 'platform_admin_required' using errcode='42501'; end if;
  if coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'step_up_required' using errcode='42501'; end if;
  if p_decision not in ('approved','rejected') or length(trim(coalesce(p_reason,'')))<5 or length(p_reason)>1000 then raise exception 'invalid_review'; end if;
  if jsonb_typeof(coalesce(p_checklist,'{}'))<>'object' then raise exception 'invalid_checklist'; end if;
  if p_decision='approved' and (p_checklist->>'license' is distinct from 'true' or p_checklist->>'address' is distinct from 'true' or p_checklist->>'contact' is distinct from 'true' or p_checklist->>'documents' is distinct from 'true') then raise exception 'checklist_incomplete'; end if;
  update public.clinic_verification_requests set status=p_decision,review_reason=trim(p_reason),checklist=p_checklist,reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
  where id=p_request and status='pending' returning * into r;
  if not found then return false; end if;
  return true;
end $$;
revoke all on function public.admin_review_clinic_verification(uuid,text,text,jsonb) from public,anon;
grant execute on function public.admin_review_clinic_verification(uuid,text,text,jsonb) to authenticated;

create or replace function public.admin_set_user_suspension(p_user uuid,p_suspended boolean,p_reason text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if public.current_app_role()<>'platform_admin' then raise exception 'platform_admin_required' using errcode='42501'; end if;
  if coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'step_up_required' using errcode='42501'; end if;
  if p_user=auth.uid() or length(trim(coalesce(p_reason,'')))<5 or length(p_reason)>1000 then raise exception 'invalid_user_action'; end if;
  update public.profiles set suspended_at=case when p_suspended then now() else null end where id=p_user and role<>'platform_admin';
  if found then insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),case when p_suspended then 'admin_user_suspended' else 'admin_user_reinstated' end,'profiles',p_user::text,jsonb_build_object('reason',trim(p_reason))); end if;
  return found;
end $$;
revoke all on function public.admin_set_user_suspension(uuid,boolean,text) from public,anon;
grant execute on function public.admin_set_user_suspension(uuid,boolean,text) to authenticated;

create or replace function public.admin_set_feature_flag(p_key text,p_enabled boolean)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if public.current_app_role()<>'platform_admin' then raise exception 'platform_admin_required' using errcode='42501'; end if;
  if coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'step_up_required' using errcode='42501'; end if;
  update public.feature_flags set enabled=p_enabled,updated_by=auth.uid(),updated_at=now() where flag_key=p_key;
  return found;
end $$;
revoke all on function public.admin_set_feature_flag(text,boolean) from public,anon;
grant execute on function public.admin_set_feature_flag(text,boolean) to authenticated;
