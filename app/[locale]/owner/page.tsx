import Link from "next/link";
import {getTranslations} from "next-intl/server";
import {requireRole} from "@/lib/auth/server";
import {AddPetForm} from "@/components/owner/add-pet-form";
import {Card} from "@/components/ui";
import {SaveOwnerOffline} from "@/components/pwa/save-owner-offline";
import {OwnerOfflinePrivacyBridge} from "@/components/pwa/owner-privacy-bridge";

export default async function OwnerHome({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{created?:string;error?:string}>}) {
  const [{locale},query]=await Promise.all([params,searchParams]); const t=await getTranslations("owner"); const common=await getTranslations("common");
  const {supabase,userId}=await requireRole(["owner"],locale as "vi"|"en");
  const {data:pets}=await supabase.from("pets").select("id,name,species,birth_date").eq("owner_id",userId).is("deleted_at",null).order("created_at");
  return <div className="grid gap-8"><OwnerOfflinePrivacyBridge/><SaveOwnerOffline userId={userId}/><header><p className="text-sm font-semibold text-primary">{common("brand")}</p><h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">{t("welcome")}</h1></header>
    {query.created&&<p role="status" className="rounded-xl bg-secondary p-4">{t("saved")}</p>}
    {!pets?.length?<Card className="max-w-2xl p-6 md:p-8"><h2 className="font-display text-2xl font-bold">{t("firstPet")}</h2><p className="mt-2 text-muted-foreground">{t("underMinute")}</p><AddPetForm locale={locale} error={query.error}/></Card>:<section><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-2xl font-bold">{t("myPets")}</h2><Link href={`/${locale}/owner/pets`} className="font-semibold text-primary">{t("passport")}</Link></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{pets.map((pet)=><Card key={pet.id} className="p-5"><h3 className="text-lg font-bold">{pet.name}</h3><p className="text-sm text-muted-foreground">{pet.species==="dog"?t("dog"):pet.species==="cat"?t("cat"):t("other")}{pet.birth_date?` · ${new Intl.DateTimeFormat(locale).format(new Date(`${pet.birth_date}T12:00:00`))}`:""}</p></Card>)}</div></section>}
    <section className="grid gap-4 sm:grid-cols-2"><Link href={`/${locale}/owner/sos`} className="rounded-2xl bg-destructive p-5 font-semibold text-destructive-foreground">{common("sos")}</Link><Link href={`/${locale}/owner/appointments`} className="rounded-2xl bg-secondary p-5 font-semibold">{t("bookings")}</Link></section>
  </div>;
}
