import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {Card} from "@/components/ui";
import {ManagementTable} from "@/components/admin/management-table";
import {ModerationQueue} from "@/components/community/moderation-queue";
import {requireSensitiveAdmin} from "@/lib/auth/admin";
import {redirect} from "next/navigation";

export const dynamic="force-dynamic";
export default async function AdminSectionPage({params}:{params:Promise<{locale:string;section:string}>}) {
  const {locale,section}=await params;
  if(section==="community")return <ModerationQueue/>;
  if(!["users","clinics","verification","flags","reviews"].includes(section))notFound();
  const {supabase,userId,elevated}=await requireSensitiveAdmin(locale as "vi"|"en");if(!elevated)redirect(`/${locale}/settings/security`);const t=await getTranslations("admin");
  if(section==="verification")return <Card className="p-6"><h1 className="font-display text-3xl font-bold">{t("verification")}</h1><p className="mt-3 text-muted-foreground">{t("verificationOpen")}</p></Card>;
  const title=section==="users"?t("users"):section==="clinics"?t("clinics"):section==="flags"?t("featureFlags"):t("reviews");
  const table=section==="users"?"users":section==="clinics"?"clinics":section==="flags"?"flags":"reviews";
  let rows:Record<string,unknown>[]=[];
  // Server components use the authenticated Supabase client directly; API rendering remains protected independently.
  if(section==="users") { const {data}=await supabase.from("profiles").select("id,full_name,role,suspended_at,created_at").order("created_at",{ascending:false}).limit(200);rows=(data??[]) as unknown as Record<string,unknown>[]; }
  if(section==="clinics") { const {data}=await supabase.from("clinics").select("id,name,address,verified,created_at").order("created_at",{ascending:false}).limit(200);rows=(data??[]) as unknown as Record<string,unknown>[]; }
  if(section==="flags") { const {data}=await supabase.from("feature_flags").select("flag_key,enabled,description_vi,description_en,updated_at").order("flag_key");rows=(data??[]) as unknown as Record<string,unknown>[]; }
  if(section==="reviews") { const {data}=await supabase.from("reviews").select("id,clinic_id,owner_id,rating,body,status,created_at").in("status",["under_review","published"]).order("created_at",{ascending:false}).limit(100);rows=(data??[]) as unknown as Record<string,unknown>[]; }
  await supabase.from("audit_logs").insert({actor_id:userId,action:"admin_view",entity_type:table,metadata:{row_count:rows.length}});
  return <div><h1 className="font-display text-3xl font-bold">{title}</h1>{section==="flags"&&<p className="mt-2 text-sm text-muted-foreground">{t("flagSafetyNote")}</p>}<ManagementTable section={table} rows={rows}/></div>;
}
