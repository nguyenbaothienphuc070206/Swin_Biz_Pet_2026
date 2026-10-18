-- LOCAL RESET ONLY. This seed uses fictional people, pets, prices, clinics, and reviews.
-- Supabase CLI applies seed.sql during `supabase db reset`; never apply it to production.
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'authenticated','authenticated',
       'demo-owner-'||n||'@pawcare.invalid',crypt('fictional-demo-password',gen_salt('bf')),now(),
       '{"provider":"email","providers":["email"],"pawcare_demo":true}'::jsonb,
       jsonb_build_object('full_name','Fictional Demo Owner '||n),now(),now()
from generate_series(1,3) n
on conflict(id) do nothing;
update public.profiles set full_name='Fictional Demo Owner '||right(id::text,1),is_demo=true
where id in (select id from auth.users where email like 'demo-owner-%@pawcare.invalid');

insert into public.clinics(id,name,address,verified,location,phone,languages,specialties,photos,is_24_7,published,is_demo)
select ('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
       'Fictional PawCare Clinic '||lpad(n::text,2,'0'),
       case when n<=9 then 'District 1, Ho Chi Minh City' when n<=17 then 'District 3, Ho Chi Minh City' else 'Binh Thanh, Ho Chi Minh City' end,
       (n%5<>0),
       extensions.st_setsrid(extensions.st_makepoint(106.68+(n%7)*0.006,10.76+(n%9)*0.006),4326)::extensions.geography,
       '+840000000000',array['vi','en'],array[case when n%2=0 then 'vaccination' else 'general' end],array[]::text[],(n%4=0),true,true
from generate_series(1,25) n
on conflict(id) do nothing;

insert into public.clinic_services(id,clinic_id,name,description,price_vnd,duration_minutes,buffer_minutes,active,is_demo)
select ('20000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
       ('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'Fictional general visit',
       'Fictional demo service, not a real offer',250000,30,10,true,true
from generate_series(1,25) n on conflict(id) do nothing;

insert into public.clinic_hours(clinic_id,weekday,opens_at,closes_at,closed,timezone,is_demo)
select ('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,d,'08:00','20:00',false,'Asia/Ho_Chi_Minh',true
from generate_series(1,25) n cross join generate_series(0,6) d
on conflict(clinic_id,weekday) do nothing;

insert into public.pets(id,owner_id,name,species,breed,birth_date,is_demo)
select ('30000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
       ('00000000-0000-4000-8000-'||lpad(((n-1)%3+1)::text,12,'0'))::uuid,
       'Fictional Pet '||lpad(n::text,2,'0'),case when n%3=0 then 'dog' else 'cat' end,
       case when n%3=0 then 'Demo mixed breed' else 'Demo domestic shorthair' end,
       date '2020-01-01'+(n%1800),true
from generate_series(1,60) n on conflict(id) do nothing;
insert into public.pet_owners(pet_id,owner_id,is_primary,is_demo,accepted_at)
select id,owner_id,true,true,now() from public.pets where is_demo on conflict do nothing;

insert into public.availability_slots(id,clinic_id,service_id,starts_at,ends_at,capacity,reserved,active,is_demo)
select ('40000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
       ('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
       ('20000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
       now()+n*interval '1 day',now()+n*interval '1 day'+interval '30 minutes',2,0,true,true
from generate_series(1,25) n on conflict(id) do nothing;

insert into public.appointments(id,clinic_id,service_id,pet_id,owner_id,slot_id,starts_at,ends_at,status,idempotency_key,is_demo,price_snapshot_vnd)
select ('50000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
       ('10000000-0000-4000-8000-'||lpad(((n-1)%25+1)::text,12,'0'))::uuid,
       ('20000000-0000-4000-8000-'||lpad(((n-1)%25+1)::text,12,'0'))::uuid,
       p.id,p.owner_id,s.id,s.starts_at,s.ends_at,'completed',
       ('60000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,true,250000
from generate_series(1,25) n
join public.pets p on p.id=('30000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid
join public.availability_slots s on s.id=('40000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid
on conflict(id) do nothing;

insert into public.reviews(id,appointment_id,clinic_id,owner_id,rating,body,status,is_demo)
select ('70000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,a.id,a.clinic_id,a.owner_id,4,
       'Fictional demo review '||n,'published',true
from generate_series(1,25) n join public.appointments a on a.id=('50000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid
on conflict(appointment_id) do nothing;

insert into public.community_posts(id,author_id,title,body,is_demo)
select ('80000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
       ('00000000-0000-4000-8000-'||lpad(((n-1)%3+1)::text,12,'0'))::uuid,
       'Fictional community post '||n,'Synthetic seed content for local development only.',true
from generate_series(1,12) n on conflict(id) do nothing;

insert into public.products(id,name,brand,description,species,life_stages,ingredients,allergens,dietary_tags,condition_exclusions,safety_reviewed,published,sponsored,is_demo)
values
('90000000-0000-4000-8000-000000000001','Fictional salmon cat food','Demo brand','Synthetic catalog row, not a veterinary endorsement',array['cat'],array['adult'],array['salmon'],array[]::text[],array[]::text[],array[]::text[],true,true,false,true),
('90000000-0000-4000-8000-000000000002','Fictional chicken cat food','Demo brand','Synthetic catalog row with a demo chicken allergen',array['cat'],array['adult'],array['chicken'],array['chicken'],array[]::text[],array[]::text[],true,true,true,true),
('90000000-0000-4000-8000-000000000003','Fictional diet-tagged cat food','Demo brand','Synthetic catalog row with a demo condition exclusion',array['cat'],array['adult'],array['fish'],array[]::text[],array['diabetes'],array['diabetes'],true,true,true,true),
('90000000-0000-4000-8000-000000000004','Fictional unreviewed pet food','Demo brand','Synthetic catalog row with unknown safety metadata',array['cat'],array['adult'],array['rabbit'],array[]::text[],array[]::text[],array[]::text[],false,true,true,true)
on conflict(id) do nothing;

insert into public.affiliate_links(id,product_id,partner_name,destination_url,active,disclosure_vi,disclosure_en,sandbox,is_demo)
select ('91000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
       ('90000000-0000-4000-8000-00000000000'||n)::uuid,'Fictional demo partner',
       'https://partner.example.invalid/demo/'||n,true,
       'Liên kết liên kết giả lập; có thể phát sinh hoa hồng trong sandbox.',
       'Fictional sandbox affiliate link; may record demo attribution.',true,true
from generate_series(1,4) n on conflict(id) do nothing;

insert into public.spa_listings(id,name,business_type,address,location,services,hours,languages,published,verified,is_demo)
values
('92000000-0000-4000-8000-000000000001','Fictional Pet Spa Demo','spa','District 1, Ho Chi Minh City',extensions.st_setsrid(extensions.st_makepoint(106.7009,10.7769),4326)::extensions.geography,array['grooming'], '{"demo":true}'::jsonb,array['vi','en'],true,false,true),
('92000000-0000-4000-8000-000000000002','Fictional Pet Shop Demo','shop','District 3, Ho Chi Minh City',extensions.st_setsrid(extensions.st_makepoint(106.6866,10.7821),4326)::extensions.geography,array['supplies'], '{"demo":true}'::jsonb,array['vi'],true,false,true)
on conflict(id) do nothing;
insert into public.spa_placements(id,listing_id,starts_at,ends_at,label,is_demo)
values('93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001',now(),now()+interval '30 days','Fictional premium placement',true)
on conflict(id) do nothing;

insert into public.contraindication_rules(id,medication_code,condition_code,warning_vi,warning_en,severity,active,reviewed_at,is_demo)
values
('94000000-0000-4000-8000-000000000001','DEMO-MED-001','DEMO-CONDITION-A','Cảnh báo giả lập: quy tắc cần bác sĩ thú y xác minh trước khi dùng.','Fictional demo warning: a veterinarian must verify this rule before use.','review',true,now(),true),
('94000000-0000-4000-8000-000000000002','DEMO-MED-001',null,'Cảnh báo giả lập: kiểm tra dị ứng trong hồ sơ; dữ liệu này không phải hướng dẫn điều trị.','Fictional demo warning: check recorded allergies; this is not treatment guidance.','caution',true,now(),true)
on conflict(id) do nothing;
