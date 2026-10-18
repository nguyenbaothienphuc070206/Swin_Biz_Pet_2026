"use client";
import {useState} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";
import {validateBrowserFile} from "@/modules/security/file-validation";

export function ClinicVerificationForm({locale,error}:{locale:string;error?:string}) {
  const t=useTranslations("clinic"); const common=useTranslations("common"); const [pending,setPending]=useState(false); const router=useRouter();
  async function submit(formData:FormData) {
    setPending(true);
    const supabase=createClient(); const {data:{user}}=await supabase.auth.getUser();
    const files=formData.getAll("documents").filter((entry):entry is File=>entry instanceof File&&entry.size>0);
    if(!user||!files.length||files.length>10||files.some(file=>file.size>10*1024*1024||!(["application/pdf","image/jpeg","image/png"].includes(file.type)))) { setPending(false); router.push(`/${locale}/clinic/verification?error=1`); return; }
    for(const file of files){const check=await validateBrowserFile(file,10*1024*1024);if(!check.valid){setPending(false);router.push(`/${locale}/clinic/verification?error=1`);return;}}
    const uploaded:string[]=[];
    for(const file of files) {
      const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_"); const path=`${user.id}/${crypto.randomUUID()}-${safeName}`;
      const {error:uploadError}=await supabase.storage.from("clinic-verification").upload(path,file,{contentType:file.type,upsert:false});
      if(uploadError){if(uploaded.length)await supabase.storage.from("clinic-verification").remove(uploaded);setPending(false);router.push(`/${locale}/clinic/verification?error=1`);return;} uploaded.push(path);
    }
    const {error:saveError}=await supabase.from("clinic_verification_requests").insert({submitted_by:user.id,clinic_name:String(formData.get("clinic_name")??""),address:String(formData.get("address")??""),document_paths:uploaded});
    if(saveError&&uploaded.length)await supabase.storage.from("clinic-verification").remove(uploaded);
    setPending(false); router.push(`/${locale}/clinic/verification?${saveError?"error=1":"sent=1"}`);router.refresh();
  }
  return <form action={submit} className="grid gap-4"><label className="grid gap-1.5 text-sm font-medium">{t("clinicName")}<input name="clinic_name" required maxLength={160} className="rounded-xl border border-border bg-background px-4 py-3"/></label><label className="grid gap-1.5 text-sm font-medium">{t("address")}<input name="address" required maxLength={240} className="rounded-xl border border-border bg-background px-4 py-3"/></label><label className="grid gap-1.5 text-sm font-medium">{t("documents")}<input name="documents" type="file" multiple required accept="application/pdf,image/jpeg,image/png" className="rounded-xl border border-border bg-background px-4 py-3 file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-2"/><span className="text-xs font-normal text-muted-foreground">{t("fileTypes")}</span></label>{error&&<p role="alert" className="text-sm text-destructive">{common("retry")}</p>}<button disabled={pending} className="min-h-12 rounded-full bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-50">{pending?common("loading"):t("submit")}</button></form>;
}
