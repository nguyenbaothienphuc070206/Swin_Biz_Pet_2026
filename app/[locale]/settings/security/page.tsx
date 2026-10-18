import {getTranslations} from "next-intl/server";
import {requireRole} from "@/lib/auth/server";
import {MfaEnrollment,MfaStepUp} from "@/components/admin/mfa-enrollment";
export const dynamic="force-dynamic";
export default async function SecuritySettingsPage({params}:{params:Promise<{locale:string}>}){const {locale}=await params;const {supabase}=await requireRole(["owner","clinic_staff","clinic_admin","platform_admin"],locale as "vi"|"en",{allowMfaEnrollment:true});const t=await getTranslations("admin");const {data}=await supabase.auth.mfa.listFactors();const factor=data?.totp?.find(item=>item.status==="verified");return <div className="mx-auto grid max-w-2xl gap-5"><h1 className="font-display text-3xl font-bold">{t("security")}</h1>{factor?<MfaStepUp factorId={factor.id}/>:<MfaEnrollment/>}</div>}
