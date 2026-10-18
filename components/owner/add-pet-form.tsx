"use client";
import {addPetAction} from "@/app/actions/owner";
import {useTranslations} from "next-intl";

export function AddPetForm({locale,error}:{locale:string;error?:string}) {
  const t=useTranslations("owner"); const common=useTranslations("common");
  return <form action={addPetAction} className="mt-6 grid gap-4"><input type="hidden" name="locale" value={locale}/>
    <label className="grid gap-1.5 text-sm font-medium">{t("petName")}<input required name="name" maxLength={80} autoFocus className="rounded-xl border border-border bg-background px-4 py-3"/></label>
    <label className="grid gap-1.5 text-sm font-medium">{t("species")}<select name="species" required defaultValue="dog" className="rounded-xl border border-border bg-background px-4 py-3"><option value="dog">{t("dog")}</option><option value="cat">{t("cat")}</option><option value="other">{t("other")}</option></select></label>
    <details><summary className="cursor-pointer text-sm font-semibold text-primary">{common("continue")}</summary><label className="mt-3 grid gap-1.5 text-sm font-medium">{t("birthDate")}<input name="birth_date" type="date" className="rounded-xl border border-border bg-background px-4 py-3"/></label></details>
    {error&&<p role="alert" className="text-sm text-destructive">{common("retry")}</p>}
    <button className="mt-2 min-h-12 rounded-full bg-primary px-5 font-semibold text-primary-foreground">{t("addPet")}</button>
  </form>;
}
