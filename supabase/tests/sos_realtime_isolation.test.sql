begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(6);

-- Isolated test identities and data; all records roll back at the end.
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('f0000000-0000-4000-8000-000000000001','authenticated','authenticated','sos-owner-a@pawcare.invalid','',now(),'{}','{}',now(),now()),
('f0000000-0000-4000-8000-000000000002','authenticated','authenticated','sos-owner-b@pawcare.invalid','',now(),'{}','{}',now(),now()),
('f0000000-0000-4000-8000-000000000003','authenticated','authenticated','sos-clinic-a@pawcare.invalid','',now(),'{}','{}',now(),now()),
('f0000000-0000-4000-8000-000000000004','authenticated','authenticated','sos-clinic-b@pawcare.invalid','',now(),'{}','{}',now(),now())
on conflict(id) do nothing;

insert into public.clinics(id,name,address,verified,published,is_demo)
values
('f1000000-0000-4000-8000-000000000001','Fictional SOS Clinic A','Fictional test address',true,true,true),
('f1000000-0000-4000-8000-000000000002','Fictional SOS Clinic B','Fictional test address',true,true,true)
on conflict(id) do nothing;
insert into public.clinic_staff(clinic_id,user_id,staff_role) values
('f1000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000003','clinic_staff'),
('f1000000-0000-4000-8000-000000000002','f0000000-0000-4000-8000-000000000004','clinic_staff')
on conflict do nothing;
insert into public.pets(id,owner_id,name,species) values
('f3000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000001','Fictional test pet A','dog'),
('f3000000-0000-4000-8000-000000000002','f0000000-0000-4000-8000-000000000002','Fictional test pet B','cat')
on conflict(id) do nothing;
insert into public.sos_requests(id,owner_id,pet_id,symptom_chips,urgency,location,idempotency_key)
values
('f2000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000001',array['other'],'urgent',extensions.st_setsrid(extensions.st_makepoint(106.7,10.7),4326)::extensions.geography,'f4000000-0000-4000-8000-000000000001'),
('f2000000-0000-4000-8000-000000000002','f0000000-0000-4000-8000-000000000002','f3000000-0000-4000-8000-000000000002',array['other'],'urgent',extensions.st_setsrid(extensions.st_makepoint(106.8,10.8),4326)::extensions.geography,'f4000000-0000-4000-8000-000000000002')
on conflict(id) do nothing;
insert into public.sos_dispatches(id,request_id,clinic_id,status)
values
('f5000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','pending'),
('f5000000-0000-4000-8000-000000000002','f2000000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000002','pending')
on conflict(id) do nothing;
insert into public.web_push_subscriptions(id,user_id,device_id,endpoint,p256dh,auth_secret)
values
('f6000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000001','f7000000-0000-4000-8000-000000000001','https://fcm.googleapis.com/fake-owner-a-device-one','test-public-key-one','test-auth-secret-one'),
('f6000000-0000-4000-8000-000000000002','f0000000-0000-4000-8000-000000000001','f7000000-0000-4000-8000-000000000002','https://fcm.googleapis.com/fake-owner-a-device-two','test-public-key-two','test-auth-secret-two'),
('f6000000-0000-4000-8000-000000000003','f0000000-0000-4000-8000-000000000002','f7000000-0000-4000-8000-000000000003','https://fcm.googleapis.com/fake-owner-b-device-one','test-public-key-three','test-auth-secret-three')
on conflict(id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','f0000000-0000-4000-8000-000000000001',true);
select extensions.is((select count(*)::integer from public.sos_requests where id::text like 'f2000000-%'),1,'owner A receives only owner A SOS request changes');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','f0000000-0000-4000-8000-000000000003',true);
select extensions.is((select count(*)::integer from public.sos_dispatches where id::text like 'f5000000-%'),1,'clinic A receives only dispatches addressed to clinic A');
select extensions.is((select count(*)::integer from public.sos_dispatches where id='f5000000-0000-4000-8000-000000000002'),0,'clinic A cannot read clinic B dispatch');
select extensions.is((select count(*)::integer from public.sos_requests where id='f2000000-0000-4000-8000-000000000002'),0,'clinic A cannot read owner B request');
select set_config('request.jwt.claim.sub','f0000000-0000-4000-8000-000000000001',true);
select extensions.is((select count(*)::integer from public.web_push_subscriptions where id::text like 'f6000000-%'),2,'owner A sees its own push subscriptions and not owner B device');
update public.web_push_subscriptions set revoked_at=now() where device_id='f7000000-0000-4000-8000-000000000001';
select extensions.is((select count(*)::integer from public.web_push_subscriptions where user_id='f0000000-0000-4000-8000-000000000001' and revoked_at is null),1,'owner can revoke one push device without revoking other devices');

select * from extensions.finish();
rollback;
