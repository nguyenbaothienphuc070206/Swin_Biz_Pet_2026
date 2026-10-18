"use client";
import {useState} from "react";
import {useSearchParams} from "next/navigation";
import {useLocale, useTranslations} from "next-intl";
import {googleSignInAction, signInAction, signUpAction} from "@/app/actions/auth";

export function AuthForm({mode}: {mode: "sign-in" | "sign-up"}) {
  const [pending, setPending] = useState(false);
  const locale = useLocale(); const t = useTranslations("auth"); const common=useTranslations("common");
  const params=useSearchParams();
  const isSignup=mode==="sign-up";
  const action = async (formData: FormData) => { setPending(true); formData.set("locale",locale); formData.set("context",params.get("context")??""); formData.set("next", params.get("next") ?? ""); if(isSignup) await signUpAction(formData); else await signInAction(formData); setPending(false); };
  return <div className="grid gap-5">
    <form action={async (data)=>{data.set("locale",locale);await googleSignInAction(data);}}><button className="w-full rounded-full border border-border bg-card px-5 py-3 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" type="submit">{t("google")}</button></form>
    <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border"/><span>{t("or")}</span><span className="h-px flex-1 bg-border"/></div>
    <form action={action} className="grid gap-4">
      {isSignup&&<label className="grid gap-1.5 text-sm font-medium">{common("name")}<input name="name" autoComplete="name" required maxLength={100} className="rounded-xl border border-border bg-card px-4 py-3"/></label>}
      <label className="grid gap-1.5 text-sm font-medium">{common("email")}<input name="email" type="email" autoComplete="email" required className="rounded-xl border border-border bg-card px-4 py-3"/></label>
      <label className="grid gap-1.5 text-sm font-medium">{common("password")}<input name="password" type="password" minLength={8} autoComplete={isSignup?"new-password":"current-password"} required className="rounded-xl border border-border bg-card px-4 py-3"/><span className="text-xs font-normal text-muted-foreground">{t("passwordHint")}</span></label>
      {params.get("error")&&<p role="alert" className="text-sm text-destructive">{t("error")}</p>}
      {params.get("sent")&&<p role="status" className="text-sm text-primary">{t("checkEmail")}</p>}
      <button disabled={pending} className="rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60">{pending?common("loading"):isSignup?t("confirm"):t("submit")}</button>
    </form>
    <div className="grid gap-2"><button type="button" disabled aria-describedby="phone-otp-note" className="w-full rounded-full border border-border px-5 py-3 font-semibold opacity-60">{t("otp")}</button><p id="phone-otp-note" className="text-center text-xs text-muted-foreground">{t("otpUnavailable")}</p></div>
  </div>;
}
