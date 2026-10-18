"use client";
import {useState} from "react";
import {useLocale,useTranslations} from "next-intl";
import {Card} from "@/components/ui";

type Plan="free"|"plus"|"premium";
type Props={currentPlan:Plan;status:string|null;periodEndsAt:string|null;plans:{code:Plan;amountVnd:number|null}[]};
export function SubscriptionManager({currentPlan,status,periodEndsAt,plans}:Props){
  const locale=useLocale();const t=useTranslations("billing");const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
  async function choose(plan:Plan){setBusy(true);setMessage("");try{const response=await fetch("/api/billing/checkout",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({plan,locale})});const result=await response.json();if(!response.ok)throw new Error(result.error);if(result.checkoutUrl){window.location.assign(result.checkoutUrl);return;}setMessage(result.scheduled?t("scheduled"):result.cancelled?t("cancelAtEnd"):t("saved"));}catch{setMessage(t("error"));}finally{setBusy(false);}}
  return <div className="grid gap-5"><div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm"><strong>{t("safetyTitle")}</strong><p className="mt-1">{t("safetyBody")}</p></div>
    {message&&<p role="status" className="rounded-xl bg-secondary p-3">{message}</p>}
    <div className="grid gap-4 md:grid-cols-3">{plans.map(plan=><Card key={plan.code} className="flex flex-col gap-4 p-5"><div><h2 className="font-display text-2xl font-bold">{t(plan.code)}</h2><p className="mt-2 text-2xl font-bold tabular-nums">{plan.amountVnd===null?t("notConfigured"):new Intl.NumberFormat(locale,{style:"currency",currency:"VND",maximumFractionDigits:0}).format(plan.amountVnd)}<span className="ml-1 text-sm font-normal text-muted-foreground">{plan.code==="free"?"":t("perMonth")}</span></p></div><ul className="flex-1 list-disc space-y-2 pl-5 text-sm text-muted-foreground"><li>{t(`${plan.code}Feature1`)}</li><li>{t(`${plan.code}Feature2`)}</li></ul><button disabled={busy||plan.amountVnd===null||(plan.code===currentPlan&&status==="active")} onClick={()=>choose(plan.code)} className="min-h-12 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">{plan.code===currentPlan&&status==="active"?t("current"):plan.code===currentPlan&&status==="past_due"?t("retryPayment"):plan.code===currentPlan&&status==="cancelled"?t("resumePlan"):plan.code==="free"?t("cancelPlan"):t("choose")}</button><p className="text-xs text-muted-foreground">{t("sandboxPrice")}</p></Card>)}</div>
    <Card className="p-5"><h2 className="font-display text-xl font-bold">{t("current")}: {t(currentPlan)}</h2><p className="mt-2 text-sm text-muted-foreground">{status?t(status):t("noSubscription")}{periodEndsAt?` · ${new Intl.DateTimeFormat(locale,{dateStyle:"medium"}).format(new Date(periodEndsAt))}`:""}</p><p className="mt-3 text-sm">{t("cancelInfo")}</p></Card>
  </div>;
}

export function SandboxCheckout({reference,amountVnd}:{reference:string;amountVnd:number}){
  const locale=useLocale();const t=useTranslations("billing");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  async function finish(result:"paid"|"failed"){setBusy(true);setError("");try{const response=await fetch("/api/billing/sandbox/complete",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({reference,result})});if(!response.ok)throw new Error();window.location.assign(`/${locale}/owner/billing?result=${result}`);}catch{setError(t("error"));}finally{setBusy(false);}}
  return <Card className="mx-auto grid max-w-xl gap-5 p-6"><p className="rounded-xl bg-warning/20 p-4 text-sm font-semibold">{t("sandboxOnly")}</p><p>{t("amount")}: <strong>{new Intl.NumberFormat(locale,{style:"currency",currency:"VND",maximumFractionDigits:0}).format(amountVnd)}</strong></p>{error&&<p role="alert">{error}</p>}<button disabled={busy} onClick={()=>finish("paid")} className="min-h-12 rounded-xl bg-primary p-3 font-semibold text-primary-foreground disabled:opacity-50">{t("simulatePaid")}</button><button disabled={busy} onClick={()=>finish("failed")} className="min-h-12 rounded-xl border border-border p-3 font-semibold disabled:opacity-50">{t("simulateFailed")}</button></Card>;
}
