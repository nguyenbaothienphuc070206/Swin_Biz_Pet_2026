"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {z} from "zod";
import {requireRole} from "@/lib/auth/server";

export async function updateSettingsAction(formData:FormData) {
  const locale=formData.get("locale")==="en"?"en":"vi";
  const parsed=z.object({full_name:z.string().trim().min(1).max(100),phone:z.string().trim().max(32).optional(),preferred_locale:z.enum(["vi","en"]),email_notifications:z.boolean(),appointment_reminders:z.boolean()}).safeParse({full_name:formData.get("full_name"),phone:formData.get("phone")||undefined,preferred_locale:formData.get("preferred_locale"),email_notifications:formData.get("email_notifications")==="on",appointment_reminders:formData.get("appointment_reminders")==="on"});
  if(!parsed.success) redirect(`/${locale}/settings?error=1`);
  const {supabase,userId}=await requireRole(["owner","clinic_staff","clinic_admin","platform_admin"],locale);
  const {error}=await supabase.from("profiles").update(parsed.data).eq("id",userId);
  if(error) redirect(`/${locale}/settings?error=1`);
  revalidatePath(`/${locale}/settings`); redirect(`/${parsed.data.preferred_locale}/settings?saved=1`);
}

export async function updateNotificationPreferencesAction(formData:FormData) {
  const locale=formData.get("locale")==="en"?"en":"vi";
  const parsed=z.object({enabled:z.boolean(),in_app_enabled:z.boolean(),web_push_enabled:z.boolean(),email_enabled:z.boolean(),sms_zalo_enabled:z.boolean(),appointments_enabled:z.boolean(),vaccines_enabled:z.boolean(),care_plans_enabled:z.boolean(),reviews_enabled:z.boolean(),sos_enabled:z.boolean(),quiet_hours_start:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),quiet_hours_end:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional()}).refine(v=>Boolean(v.quiet_hours_start)===Boolean(v.quiet_hours_end));
  const bool=(name:string)=>formData.get(name)==="on";
  const raw={enabled:bool("enabled"),in_app_enabled:bool("in_app_enabled"),web_push_enabled:bool("web_push_enabled"),email_enabled:bool("email_enabled"),sms_zalo_enabled:bool("sms_zalo_enabled"),appointments_enabled:bool("appointments_enabled"),vaccines_enabled:bool("vaccines_enabled"),care_plans_enabled:bool("care_plans_enabled"),reviews_enabled:bool("reviews_enabled"),sos_enabled:bool("sos_enabled"),quiet_hours_start:String(formData.get("quiet_hours_start")||"")||undefined,quiet_hours_end:String(formData.get("quiet_hours_end")||"")||undefined};
  const result=parsed.safeParse(raw);if(!result.success)redirect(`/${locale}/settings?error=1`);
  const {supabase,userId}=await requireRole(["owner","clinic_staff","clinic_admin","platform_admin"],locale);
  const {error}=await supabase.from("notification_preferences").upsert({user_id:userId,...result.data,timezone:"Asia/Ho_Chi_Minh"});
  if(error)redirect(`/${locale}/settings?error=1`);
  revalidatePath(`/${locale}/settings`);redirect(`/${locale}/settings?saved=1`);
}

export async function requestPrivacyAction(formData:FormData) {
  const locale=formData.get("locale")==="en"?"en":"vi";
  const kind=formData.get("kind");
  if(kind!=="export"&&kind!=="delete") redirect(`/${locale}/settings?error=1`);
  const {supabase,userId}=await requireRole(["owner","clinic_staff","clinic_admin","platform_admin"],locale);
  const {error}=await supabase.from("privacy_requests").insert({user_id:userId,request_type:kind});
  if(error) redirect(`/${locale}/settings?error=1`);
  redirect(`/${locale}/settings?requested=1`);
}
