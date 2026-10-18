-- A 50m cell can still single out an isolated stray report. Publish a neighborhood
-- count only after at least three approved sightings land in that cell.
create or replace function public.public_stray_neighborhood_counts()
returns table(species text,report_count bigint,latitude double precision,longitude double precision)
language sql stable security definer set search_path = '' as $$
  select s.species,count(*),extensions.st_y(extensions.st_centroid(extensions.st_collect(s.public_location::extensions.geometry))),
    extensions.st_x(extensions.st_centroid(extensions.st_collect(s.public_location::extensions.geometry)))
  from public.stray_reports s where s.status='approved' and s.image_safety_status in ('approved','not_provided') and s.sighted_at>now()-interval '90 days'
    and (not s.is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true')
  group by s.species,extensions.st_snaptogrid(extensions.st_transform(s.public_location::extensions.geometry,3857),250)
  having count(*)>=3
$$;
revoke all on function public.public_stray_neighborhood_counts() from public;
grant execute on function public.public_stray_neighborhood_counts() to anon,authenticated;

-- All vet estimates must pass through the rate-limited, validated RPC.
drop policy if exists rescue_estimate_vet_insert on public.rescue_estimates;
revoke insert,update,delete on public.rescue_estimates from authenticated,anon;
revoke insert,update,delete on public.donation_ledger from authenticated,anon;
revoke insert,update,delete on public.rescue_ledger_events from authenticated,anon;

-- Moderation can inspect quarantined images; the bucket itself remains private.
create policy community_read_moderation_queue on storage.objects for select to authenticated
using(bucket_id in ('community-private','rescue-private') and public.current_app_role()='platform_admin');

create or replace function public.can_read_community_image(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.community_posts p where p.image_path=p_path and p.status='approved' and p.image_safety_status='approved' and (not p.is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true'))
    or exists(select 1 from public.lost_found_reports r where r.image_path=p_path and r.status='open' and r.image_safety_status='approved' and (not r.is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true'))
    or exists(select 1 from public.stray_reports s where s.image_path=p_path and s.status='approved' and s.image_safety_status='approved' and (not s.is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true'))
    or exists(select 1 from public.rescue_cases c where c.image_path=p_path and c.verification_status='verified' and c.status in ('active','funded','completed') and c.image_safety_status='approved' and (not c.is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true'))
$$;
revoke all on function public.can_read_community_image(text) from public;
grant execute on function public.can_read_community_image(text) to anon,authenticated;

create policy community_read_approved_images on storage.objects for select to anon,authenticated using(
  bucket_id='community-private' and public.can_read_community_image(name)
);

-- Pending partner-sponsored cases can be reviewed by verified-clinic vets so a
-- partner-only case can still receive a clinic-authored estimate before approval.
create policy rescue_case_vet_partner_estimate_read on public.rescue_cases for select to authenticated using(
  clinic_id is null and status='pending' and rescue_partner_id is not null
  and exists(select 1 from public.rescue_partners rp where rp.id=rescue_partner_id and rp.verification_status='verified')
  and exists(select 1 from public.clinic_staff cs where cs.user_id=(select auth.uid()) and public.is_clinic_vet(cs.clinic_id))
);

create or replace function public.validate_community_image_upload()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_owner uuid;
begin
  if tg_table_name='community_posts' then v_owner:=new.author_id;
  elsif tg_table_name='lost_found_reports' then v_owner:=new.owner_id;
  elsif tg_table_name='stray_reports' then v_owner:=new.reporter_id;
  elsif tg_table_name='rescue_cases' then v_owner:=new.created_by;
  else raise exception 'invalid_community_image_table'; end if;
  if new.image_path is null then new.image_safety_status:='not_provided';
  else
    if split_part(new.image_path,'/',1)<>v_owner::text or not exists(select 1 from storage.objects o where o.bucket_id='community-private' and o.name=new.image_path) then
      raise exception 'community_image_upload_required';
    end if;
    new.image_safety_status:='pending';
  end if;
  return new;
end $$;
create trigger validate_community_post_upload before insert or update of image_path on public.community_posts for each row execute function public.validate_community_image_upload();
create trigger validate_lost_found_upload before insert or update of image_path on public.lost_found_reports for each row execute function public.validate_community_image_upload();
create trigger validate_stray_upload before insert or update of image_path on public.stray_reports for each row execute function public.validate_community_image_upload();
create trigger validate_rescue_case_upload before insert or update of image_path on public.rescue_cases for each row execute function public.validate_community_image_upload();

create or replace function public.community_public_images()
returns table(target_type text,target_id uuid,image_path text)
language sql stable security definer set search_path = '' as $$
  select 'lost_found',r.id,r.image_path from public.lost_found_reports r where r.status='open' and r.image_safety_status='approved' and r.image_path is not null and (not r.is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true')
  union all
  select 'stray',s.id,s.image_path from public.stray_reports s where s.status='approved' and s.image_safety_status='approved' and s.image_path is not null and (not s.is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true')
  union all
  select 'rescue_case',c.id,c.image_path from public.rescue_cases c where c.verification_status='verified' and c.status in ('active','funded','completed') and c.image_safety_status='approved' and c.image_path is not null and (not c.is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true')
  limit 550
$$;
revoke all on function public.community_public_images() from public;
grant execute on function public.community_public_images() to anon,authenticated;

create or replace function public.review_community_appeal(p_appeal uuid,p_decision text,p_note text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare a public.community_appeals; target_table text;
begin
  if public.current_app_role()<>'platform_admin' then raise exception 'moderator_required'; end if;
  if p_decision not in ('accepted','denied') then raise exception 'invalid_appeal_decision'; end if;
  select * into a from public.community_appeals where id=p_appeal and status='pending' for update;
  if not found then return false; end if;
  update public.community_appeals set status=p_decision,moderator_id=auth.uid(),moderator_note=nullif(trim(p_note),''),resolved_at=now() where id=a.id;
  if p_decision='accepted' then
    if a.target_type='post' then update public.community_posts set status='pending',image_safety_status=case when image_path is null then 'not_provided' else 'pending' end where id=a.target_id and status in ('rejected','hidden');
    elsif a.target_type='comment' then update public.community_comments set status='pending' where id=a.target_id and status in ('rejected','hidden');
    elsif a.target_type='lost_found' then update public.lost_found_reports set status='pending',image_safety_status=case when image_path is null then 'not_provided' else 'pending' end where id=a.target_id and status in ('rejected','hidden');
    elsif a.target_type='stray' then update public.stray_reports set status='pending',image_safety_status=case when image_path is null then 'not_provided' else 'pending' end where id=a.target_id and status in ('rejected','hidden');
    elsif a.target_type='rescue_case' then update public.rescue_cases set status='pending',verification_status='pending',verified_by=null,verified_at=null,image_safety_status=case when image_path is null then 'not_provided' else 'pending' end where id=a.target_id and status in ('rejected','suspended');
    end if;
  end if;
  return true;
end $$;
revoke all on function public.review_community_appeal(uuid,text,text) from public;
grant execute on function public.review_community_appeal(uuid,text,text) to authenticated;

create or replace function public.review_community_report(p_report uuid,p_decision text,p_note text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if public.current_app_role()<>'platform_admin' then raise exception 'moderator_required'; end if;
  if p_decision not in ('actioned','dismissed') then raise exception 'invalid_report_decision'; end if;
  update public.community_moderation_reports set status=p_decision,moderator_id=auth.uid(),moderator_note=nullif(trim(p_note),''),resolved_at=now()
    where id=p_report and status in ('open','reviewing');
  return found;
end $$;
revoke all on function public.review_community_report(uuid,text,text) from public;
grant execute on function public.review_community_report(uuid,text,text) to authenticated;

drop function if exists public.public_rescue_cases(integer);
create function public.public_rescue_cases(p_limit integer default 50)
returns table(id uuid,title text,summary text,species text,status text,recipient_name text,estimated_vnd bigint,verified_total_vnd bigint,is_demo boolean,created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id,c.title,c.summary,c.species,c.status,coalesce(cl.name,rp.organization_name),estimate.amount_vnd,coalesce(ledger.total,0),c.is_demo,c.created_at
  from public.rescue_cases c
  left join public.clinics cl on cl.id=c.clinic_id
  left join public.rescue_partners rp on rp.id=c.rescue_partner_id
  left join lateral (select e.amount_vnd from public.rescue_estimates e where e.rescue_case_id=c.id and e.status='verified' order by e.version desc limit 1) estimate on true
  left join lateral (select sum(d.amount_vnd) total from public.donation_ledger d where d.rescue_case_id=c.id and d.status='verified') ledger on true
  where c.verification_status='verified' and c.status in ('active','funded','completed') and c.image_safety_status in ('approved','not_provided')
    and estimate.amount_vnd is not null and (not c.is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true')
  order by c.created_at desc limit greatest(1,least(p_limit,100))
$$;
revoke all on function public.public_rescue_cases(integer) from public;
grant execute on function public.public_rescue_cases(integer) to anon,authenticated;

drop function if exists public.public_lost_found_matches(uuid,integer);
create function public.public_lost_found_matches(p_report uuid,p_limit integer default 20)
returns table(id uuid,kind text,species text,color_tags text[],latitude double precision,longitude double precision,created_at timestamptz,match_score integer,distance_m double precision)
language sql stable security definer set search_path = '' as $$
  select other.id,other.kind,other.species,other.color_tags,
    extensions.st_y(other.public_location::extensions.geometry),extensions.st_x(other.public_location::extensions.geometry),other.created_at,
    (40+case when other.color_tags && mine.color_tags then 35 else 0 end+round(25*(1-extensions.st_distance(mine.public_location,other.public_location)/10000)))::integer,
    extensions.st_distance(mine.public_location,other.public_location)
  from public.lost_found_reports mine join public.lost_found_reports other on other.id<>mine.id and other.kind<>mine.kind and other.species=mine.species
  where mine.id=p_report and (mine.owner_id=(select auth.uid()) or public.current_app_role()='platform_admin')
    and mine.status in ('open','matched')
    and (other.status='open' or (other.status in ('matched','resolved') and other.matched_report_id=mine.id))
    and extensions.st_dwithin(mine.public_location,other.public_location,10000)
    and (not other.is_demo or coalesce(current_setting('app.demo_mode',true),'false')='true')
  order by match_score desc,distance_m asc,other.id limit greatest(1,least(p_limit,50))
$$;
revoke all on function public.public_lost_found_matches(uuid,integer) from public;
grant execute on function public.public_lost_found_matches(uuid,integer) to authenticated;

create or replace function public.resolve_lost_found_match(p_mine uuid,p_other uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare a public.lost_found_reports; b public.lost_found_reports; v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  perform 1 from public.lost_found_reports where id in (p_mine,p_other) order by id for update;
  select * into a from public.lost_found_reports where id=p_mine;
  select * into b from public.lost_found_reports where id=p_other;
  if a.id is null or b.id is null then return false; end if;
  if a.owner_id<>v_user or a.status not in ('open','matched') or (a.matched_report_id is not null and a.matched_report_id<>b.id)
    or not (b.status='open' or (b.status in ('matched','resolved') and b.matched_report_id=a.id))
    or a.kind=b.kind or a.species<>b.species or not extensions.st_dwithin(a.public_location,b.public_location,10000) then return false; end if;
  update public.lost_found_reports set status='resolved',matched_report_id=b.id,matched_at=coalesce(matched_at,now()),updated_at=now() where id=a.id;
  update public.lost_found_reports set status=case when status='resolved' then 'resolved' when owner_id=v_user then 'resolved' else 'matched' end,
    matched_report_id=a.id,matched_at=coalesce(matched_at,now()),updated_at=now() where id=b.id;
  return true;
end $$;
revoke all on function public.resolve_lost_found_match(uuid,uuid) from public;
grant execute on function public.resolve_lost_found_match(uuid,uuid) to authenticated;

drop policy if exists community_read_rescue_receipt on storage.objects;
create policy community_read_rescue_receipt on storage.objects for select to authenticated using(
  bucket_id='community-private' and exists(
    select 1 from public.donation_ledger d where d.receipt_path=name and d.status in ('pending','verified','rejected')
      and ((d.recipient_clinic_id is not null and public.is_clinic_admin(d.recipient_clinic_id))
        or exists(select 1 from public.rescue_partners rp where rp.id=d.recipient_partner_id and rp.user_id=(select auth.uid())))
  )
);

drop function if exists public.submit_rescue_estimate(uuid,bigint,text,text);
create function public.submit_rescue_estimate(p_case uuid,p_clinic uuid,p_amount bigint,p_notes text,p_document_path text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare c public.rescue_cases; v_user uuid := (select auth.uid()); v_id uuid; v_version integer;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  select * into c from public.rescue_cases where id=p_case for update;
  if not found or c.status<>'pending' or c.verification_status<>'pending' or (c.clinic_id is not null and c.clinic_id<>p_clinic)
    or not exists(select 1 from public.clinics where id=p_clinic and verified) or not public.is_clinic_vet(p_clinic) then raise exception 'clinic_vet_required'; end if;
  if p_amount<=0 or length(trim(p_notes)) not between 10 and 3000 or split_part(p_document_path,'/',1)<>v_user::text
    or not exists(select 1 from storage.objects o where o.bucket_id='rescue-private' and o.name=p_document_path) then raise exception 'invalid_estimate'; end if;
  select coalesce(max(version),0)+1 into v_version from public.rescue_estimates where rescue_case_id=p_case;
  insert into public.rescue_estimates(rescue_case_id,vet_id,clinic_id,amount_vnd,notes,document_path,version,status)
  values(p_case,v_user,p_clinic,p_amount,trim(p_notes),p_document_path,v_version,'submitted') returning id into v_id;
  return v_id;
end $$;
revoke all on function public.submit_rescue_estimate(uuid,uuid,bigint,text,text) from public;
grant execute on function public.submit_rescue_estimate(uuid,uuid,bigint,text,text) to authenticated;

create or replace function public.apply_rescue_partner(p_org_name text,p_clinic uuid default null,p_documents text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_id uuid;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if not public.reserve_community_rate_limit('rescue',2,2592000) then raise exception 'rate_limited'; end if;
  if length(trim(p_org_name)) not between 2 and 160 then raise exception 'invalid_organization'; end if;
  if p_clinic is not null and not public.is_clinic_admin(p_clinic) then raise exception 'clinic_admin_required'; end if;
  if p_clinic is null and (p_documents is null or split_part(p_documents,'/',1)<>v_user::text
    or not exists(select 1 from storage.objects o where o.bucket_id='rescue-private' and o.name=p_documents)) then raise exception 'verification_document_required'; end if;
  insert into public.rescue_partners(user_id,clinic_id,organization_name,verification_status,documents_path)
  values(case when p_clinic is null then v_user else null end,p_clinic,trim(p_org_name),'pending',p_documents)
  on conflict do nothing returning id into v_id;
  if v_id is null then raise exception 'partner_application_exists'; end if;
  return v_id;
end $$;
revoke all on function public.apply_rescue_partner(text,uuid,text) from public;
grant execute on function public.apply_rescue_partner(text,uuid,text) to authenticated;
