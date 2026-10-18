"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, Skeleton } from "@/components/ui";

type Item = { id:string; type:string; title?:string; body?:string; summary?:string; description?:string; imageUrl?:string|null };
type Review = { id:string; target_type:string; target_id:string; reason:string };
type Partner = { id:string; organization_name:string; documentUrl?:string|null };
export function ModerationQueue() {
  const t=useTranslations("admin"),tc=useTranslations("community"),common=useTranslations("common");
  const [items,setItems]=useState<Item[]>([]),[reports,setReports]=useState<Review[]>([]),[appeals,setAppeals]=useState<Review[]>([]),[partners,setPartners]=useState<Partner[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState(""),[notes,setNotes]=useState<Record<string,string>>({}),[loading,setLoading]=useState(true),[hasLoaded,setHasLoaded]=useState(false);
  async function load(){
    if(!hasLoaded)setLoading(true);
    try {
      const [r,p]=await Promise.all([fetch("/api/community/moderation",{cache:"no-store"}),fetch("/api/community/rescue/partners",{cache:"no-store"})]);
      if(!r.ok)throw new Error("moderation_queue_unavailable");const v=await r.json();setItems(v.queue??[]);setReports(v.reports??[]);setAppeals(v.appeals??[]);
      if(p.ok){const pv=await p.json();setPartners(pv.partners??[]);}setError("");
    } catch { setError(t("moderationLoadError")); }
    finally { setLoading(false);setHasLoaded(true); }
  }
  useEffect(()=>{void load()},[]);
  async function act(item:Item,action:string){setBusy(item.id);try{const r=await fetch("/api/community/moderation",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:item.type,id:item.id,action,note:notes[item.id]})});if(!r.ok)throw Error();await load()}catch{setError(t("moderationActionError"))}finally{setBusy("")}}
  async function review(kind:"report"|"appeal",item:Review,decision:string){setBusy(item.id);try{const r=await fetch("/api/community/moderation/review",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind,id:item.id,decision})});if(!r.ok)throw Error();await load()}catch{setError(t("moderationActionError"))}finally{setBusy("")}}
  async function partnerAction(partner:Partner,decision:"verified"|"rejected"){setBusy(partner.id);try{const r=await fetch("/api/community/rescue/partners",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({partnerId:partner.id,decision,reason:notes[partner.id]})});if(!r.ok)throw Error();await load()}catch{setError(t("moderationActionError"))}finally{setBusy("")}}
  return <div className="grid gap-4">
    <h1 className="font-display text-3xl font-bold">{t("communityQueue")}</h1>
    {error&&<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-destructive/10 p-3 text-sm" role="alert"><span>{error}</span><button className="min-h-11 rounded-lg border border-destructive/30 px-4 font-semibold" onClick={()=>void load()}>{tc("retry")}</button></div>}
    {loading&&<div role="status" aria-label={common("loading")} className="grid gap-3">{[0,1,2].map((item)=><Card key={item} className="grid gap-3 p-5"><Skeleton className="h-4 w-28"/><Skeleton className="h-6 w-3/4"/><Skeleton className="h-20 w-full"/><Skeleton className="h-11 w-40"/></Card>)}<span className="sr-only">{common("loading")}</span></div>}
    {!loading&&items.length===0&&!error&&<p className="rounded-xl border border-dashed border-border p-6 text-muted-foreground">{t("emptyQueue")}</p>}
    {!loading&&items.map(item=><Card key={`${item.type}-${item.id}`} className="grid gap-3 p-5"><p className="text-xs font-semibold uppercase text-primary">{item.type}</p><h2 className="text-lg font-bold">{item.title??item.summary??item.description??item.type}</h2>{item.body&&<p className="whitespace-pre-wrap">{item.body}</p>}{item.imageUrl&&<img loading="lazy" decoding="async" src={item.imageUrl} alt={item.title??item.type} className="max-h-96 w-fit rounded-xl"/>}<label className="grid gap-1 text-sm">{t("reason")}<textarea value={notes[item.id]??""} maxLength={1000} onChange={event=>setNotes({...notes,[item.id]:event.target.value})} className="min-h-16 rounded-xl border bg-background p-3"/></label><div className="flex flex-wrap gap-2"><button disabled={Boolean(busy)} onClick={()=>void act(item,"approve")} className="min-h-12 rounded-xl bg-primary px-4 font-semibold text-primary-foreground">{t("approve")}</button><button disabled={Boolean(busy)||!(notes[item.id]?.trim().length>=5)} onClick={()=>void act(item,"reject")} className="min-h-12 rounded-xl border px-4 disabled:opacity-50">{t("reject")}</button><button disabled={Boolean(busy)||!(notes[item.id]?.trim().length>=5)} onClick={()=>void act(item,"hide")} className="min-h-12 rounded-xl border px-4 disabled:opacity-50">{t("hide")}</button></div></Card>)}
    <h2 className="mt-6 text-xl font-bold">{t("reportsAndAppeals")}</h2>
    {[...reports.map(item=>({item,kind:"report" as const})),...appeals.map(item=>({item,kind:"appeal" as const}))].map(({item,kind})=><Card key={`${kind}-${item.id}`} className="grid gap-3 p-4"><p className="text-xs font-semibold uppercase">{kind} · {item.target_type} · {item.target_id}</p><p>{item.reason}</p><div className="flex flex-wrap gap-2">{(kind==="report"?["actioned","dismissed"]:["accepted","denied"]).map(decision=><button key={decision} disabled={Boolean(busy)} onClick={()=>void review(kind,item,decision)} className="min-h-11 rounded-xl border px-4">{t(decision)}</button>)}</div></Card>)}
    <h2 className="mt-6 text-xl font-bold">{tc("partnerApplications")}</h2>
    {partners.map(partner=><Card key={partner.id} className="grid gap-3 p-4"><p className="font-semibold">{partner.organization_name}</p>{partner.documentUrl&&<a className="underline" href={partner.documentUrl} target="_blank" rel="noreferrer">{tc("photo")}</a>}<label className="grid gap-1 text-sm">{t("reason")}<textarea value={notes[partner.id]??""} maxLength={1000} onChange={event=>setNotes({...notes,[partner.id]:event.target.value})} className="min-h-16 rounded-xl border bg-background p-3"/></label><div className="flex gap-2"><button disabled={Boolean(busy)||!(notes[partner.id]?.trim().length>=5)} onClick={()=>void partnerAction(partner,"verified")} className="min-h-11 rounded-xl bg-primary px-4 text-primary-foreground disabled:opacity-50">{tc("verifyPartner")}</button><button disabled={Boolean(busy)||!(notes[partner.id]?.trim().length>=5)} onClick={()=>void partnerAction(partner,"rejected")} className="min-h-11 rounded-xl border px-4 disabled:opacity-50">{tc("rejectPartner")}</button></div></Card>)}
  </div>;
}
