"use server";
import {redirect} from "next/navigation";
import {z} from "zod";
import {createClient,isSupabaseConfigured} from "@/lib/supabase/server";

const credentials = z.object({email: z.string().email(), password: z.string().min(8)});
function safeNext(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") && !path.startsWith("//") ? path : "/owner";
}

export async function signInAction(formData: FormData) {
  const locale=formData.get("locale")==="en"?"en":"vi";
  if(!isSupabaseConfigured()) redirect(`/${locale}/sign-in?error=unavailable`);
  const parsed = credentials.safeParse({email: formData.get("email"), password: formData.get("password")});
  if (!parsed.success) redirect(`/${locale}/sign-in?error=invalid`);
  const supabase = await createClient();
  const {error} = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect(`/${locale}/sign-in?error=invalid`);
  redirect(`/${locale}${safeNext(formData.get("next"))}`);
}

export async function signUpAction(formData: FormData) {
  const locale=formData.get("locale")==="en"?"en":"vi";
  if(!isSupabaseConfigured()) redirect(`/${locale}/sign-up?error=unavailable`);
  const parsed = credentials.extend({name: z.string().trim().min(1).max(100)}).safeParse({email: formData.get("email"), password: formData.get("password"), name: formData.get("name")});
  if (!parsed.success) redirect(`/${locale}/sign-up?error=invalid`);
  const supabase = await createClient();
  const intent=formData.get("context")==="clinic"?"clinic":"owner";
  const {data,error} = await supabase.auth.signUp({email: parsed.data.email, password: parsed.data.password, options: {data: {full_name: parsed.data.name,onboarding_intent:intent}, emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?locale=${locale}`}});
  if (error) redirect(`/${locale}/sign-up?error=invalid`);
  if(data.session) redirect(`/${locale}/${intent==="clinic"?"clinic-apply":"owner"}`);
  redirect(`/${locale}/sign-up?sent=1`);
}

export async function googleSignInAction(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "vi";
  if(!isSupabaseConfigured()) redirect(`/${locale}/sign-in?error=unavailable`);
  const supabase = await createClient();
  const {data, error} = await supabase.auth.signInWithOAuth({provider: "google", options: {redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?locale=${locale}`}});
  if (error || !data.url) redirect(`/${locale}/sign-in?error=invalid`);
  redirect(data.url);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/vi");
}
