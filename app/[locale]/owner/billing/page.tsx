import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {requireRole} from "@/lib/auth/server";
import {createServiceClient} from "@/lib/supabase/service";
import {Card} from "@/components/ui";
import {SubscriptionManager} from "@/components/billing/subscription-manager";
import {effectivePlan} from "@/modules/billing/entitlements";

export default async function BillingPage({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{result?:string}>}){
  const [{locale},query]=await Promise.all([params,searchParams]);if(locale!=="vi"&&locale!=="en")notFound();const {userId}=await requireRole(["owner"],locale);const t=await getTranslations("billing");const db=createServiceClient();
  const [{data:plans,error:planError},{data:subscription},{data:documents},{data:payments}]=await Promise.all([
    db.from("billing_plans").select("code,amount_vnd").eq("active",true).eq("is_sandbox",true).order("amount_vnd"),
    db.from("billing_subscriptions").select("plan_code,pending_plan_code,status,period_ends_at,grace_ends_at").eq("owner_id",userId).in("status",["pending","active","past_due","cancelled"]).maybeSingle(),
    db.from("billing_documents").select("document_number,document_type,amount_vnd,issued_at,status").eq("owner_id",userId).order("issued_at",{ascending:false}).limit(20),
    db.from("billing_payments").select("external_reference,amount_vnd,status,created_at").eq("owner_id",userId).order("created_at",{ascending:false}).limit(20),
  ]);
  const safePlans=(planError?[]:plans??[]).filter((p):p is {code:"free"|"plus"|"premium";amount_vnd:number|null}=>["free","plus","premium"].includes(p.code));
  const currentPlan=effectivePlan(subscription?{plan:(subscription.plan_code??"free") as "free"|"plus"|"premium",pendingPlan:(subscription.pending_plan_code??null) as "free"|"plus"|"premium"|null,status:subscription.status as "active"|"past_due"|"cancelled"|"expired",periodEndsAt:new Date(subscription.period_ends_at).getTime(),graceEndsAt:subscription.grace_ends_at?new Date(subscription.grace_ends_at).getTime():null}:null);
  return <div className="grid gap-6"><header><h1 className="font-display text-3xl font-bold">{t("title")}</h1><p className="mt-2 text-muted-foreground">{t("intro")}</p></header>{query.result&&<p role="status" className="rounded-xl bg-secondary p-4">{query.result==="paid"?t("paymentSuccess"):t("paymentFailed")}</p>}
    <SubscriptionManager currentPlan={currentPlan} status={subscription?.status??null} periodEndsAt={subscription?.period_ends_at??null} plans={safePlans.map(p=>({code:p.code,amountVnd:p.amount_vnd===null?null:Number(p.amount_vnd)}))}/>
    <Card className="overflow-x-auto p-5"><h2 className="font-display text-xl font-bold">{t("documents")}</h2>{!documents?.length?<p className="mt-3 text-sm text-muted-foreground">{t("empty")}</p>:<table className="mt-4 w-full text-left text-sm"><thead><tr><th className="p-2">{t("number")}</th><th className="p-2">{t("amount")}</th><th className="p-2">{t("statusLabel")}</th></tr></thead><tbody>{documents.map(doc=><tr key={doc.document_number} className="border-t border-border"><td className="p-2">{doc.document_number} · {t(doc.document_type)}</td><td className="p-2">{new Intl.NumberFormat(locale,{style:"currency",currency:"VND",maximumFractionDigits:0}).format(Number(doc.amount_vnd))}</td><td className="p-2">{t(doc.status)}</td></tr>)}</tbody></table>}{payments?.length? <p className="mt-4 text-xs text-muted-foreground">{t("payments")}: {payments.map(p=>`${p.external_reference} · ${t(p.status)} · ${new Intl.NumberFormat(locale,{style:"currency",currency:"VND",maximumFractionDigits:0}).format(Number(p.amount_vnd))}`).join("; ")}</p>:null}</Card>
    <p className="text-xs text-muted-foreground">{t("documentDisclaimer")}</p>
  </div>;
}
