insert into public.feature_flags(flag_key,enabled,description_vi,description_en) values
  ('sos.enabled',true,'Bật hoặc tắt tiếp nhận SOS khi xảy ra sự cố vận hành','Enable SOS intake; disable only during an operational incident'),
  ('billing.enabled',false,'Bật luồng thanh toán sandbox hoặc production đã được phê duyệt','Enable the approved sandbox or production billing flow'),
  ('community.fundraising.enabled',false,'Bật gửi hồ sơ cứu hộ gây quỹ sau khi được phê duyệt','Enable rescue fundraising submissions after approval')
on conflict(flag_key) do nothing;

create or replace function public.is_feature_enabled(p_flag text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce((select enabled from public.feature_flags where flag_key=p_flag and p_flag in ('sos.enabled','billing.enabled','community.fundraising.enabled')),false)
$$;
revoke all on function public.is_feature_enabled(text) from public,anon;
grant execute on function public.is_feature_enabled(text) to authenticated;
