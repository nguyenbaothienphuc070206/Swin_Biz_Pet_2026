import {getTranslations} from "next-intl/server";
import { privateSignedUrlExpiry } from "@/modules/security/signed-url";
import {Card} from "@/components/ui";
import {VerificationReview} from "@/components/admin/verification-review";
import {requireSensitiveAdmin} from "@/lib/auth/admin";
import {redirect} from "next/navigation";

export const dynamic="force-dynamic";
export default async function AdminVerificationPage({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params;const {supabase,elevated}=await requireSensitiveAdmin(locale as "vi"|"en");if(!elevated)redirect(`/${locale}/settings/security`);const t=await getTranslations("admin");
  const {data:requests}=await supabase.from("clinic_verification_requests").select("id,clinic_name,address,document_paths,status,review_reason,created_at").order("created_at",{ascending:false});
  await supabase.from("audit_logs").insert({actor_id:(await supabase.auth.getUser()).data.user?.id,action:"admin_view",entity_type:"clinic_verification_documents",metadata:{request_count:requests?.length??0}});
  const rows=await Promise.all((requests??[]).map(async request=>({request,links:await Promise.all(request.document_paths.map(async (path:string)=>{
    const {data}=await supabase.storage.from("clinic-verification").createSignedUrl(path,privateSignedUrlExpiry(60));
    return data?.signedUrl??null;
  }))})));
  return <div><h1 className="font-display text-3xl font-bold">{t("verification")}</h1>{rows.length===0?<Card className="mt-6 p-6">{t("noRequests")}</Card>:<div className="mt-6 grid gap-4">{rows.map(({request,links})=><Card key={request.id} className="p-5 md:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{request.clinic_name}</h2><p className="mt-1 text-sm text-muted-foreground">{request.address}</p><p className="mt-2 text-xs text-muted-foreground">{t("requestNo")}: {request.id}</p><p className="text-xs text-muted-foreground">{t("submitted")}: {new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"short"}).format(new Date(request.created_at))}</p></div><span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">{request.status==="pending"?t("pending"):request.status==="approved"?t("approved"):t("rejected")}</span></div><h3 className="mt-5 font-semibold">{t("documents")}</h3><ul className="mt-2 grid gap-2">{links.map((url,index)=>url?<li key={`${request.id}-${index}`}><a href={url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary underline">{t("documents")} {index+1}</a></li>:null)}</ul>{request.status!=="pending"&&request.review_reason&&<p className="mt-4 text-sm">{t("reason")}: {request.review_reason}</p>}<VerificationReview requestId={request.id} pending={request.status==="pending"}/></Card>)}</div>}</div>;
}
