import {getTranslations} from "next-intl/server";
import {requireSensitiveAdmin} from "@/lib/auth/admin";
import {Card} from "@/components/ui";
import {redirect} from "next/navigation";

export const dynamic="force-dynamic";
export default async function AdminAuditPage({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{action?:string;entity?:string;from?:string;to?:string}>}) {
  const [{locale},filters]=await Promise.all([params,searchParams]);const {supabase,userId,elevated}=await requireSensitiveAdmin(locale as "vi"|"en");if(!elevated)redirect(`/${locale}/settings/security`);const t=await getTranslations("admin");
  let query=supabase.from("audit_logs").select("id,actor_id,action,entity_type,entity_id,outcome,metadata,created_at").order("created_at",{ascending:false}).limit(200);
  if(filters.action)query=query.ilike("action",`%${filters.action.slice(0,80)}%`);
  if(filters.entity)query=query.ilike("entity_type",`%${filters.entity.slice(0,80)}%`);
  const dateOnly=/^\d{4}-\d{2}-\d{2}$/;
  if(filters.from&&dateOnly.test(filters.from)&&Number.isFinite(Date.parse(`${filters.from}T00:00:00Z`)))query=query.gte("created_at",new Date(`${filters.from}T00:00:00Z`).toISOString());
  if(filters.to&&dateOnly.test(filters.to)&&Number.isFinite(Date.parse(`${filters.to}T23:59:59.999Z`)))query=query.lte("created_at",new Date(`${filters.to}T23:59:59.999Z`).toISOString());
  const {data}=await query;
  await supabase.from("audit_logs").insert({actor_id:userId,action:"admin_view",entity_type:"audit_logs",metadata:{filter_count:Object.values(filters).filter(Boolean).length}});
  return <div><h1 className="font-display text-3xl font-bold">{t("auditLog")}</h1><form className="mt-5 grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-4"><label className="grid gap-1 text-sm">{t("action")}<input name="action" defaultValue={filters.action} className="min-h-11 rounded-lg border bg-background px-3"/></label><label className="grid gap-1 text-sm">{t("entity")}<input name="entity" defaultValue={filters.entity} className="min-h-11 rounded-lg border bg-background px-3"/></label><label className="grid gap-1 text-sm">{t("from")}<input type="date" name="from" defaultValue={filters.from} className="min-h-11 rounded-lg border bg-background px-3"/></label><label className="grid gap-1 text-sm">{t("to")}<input type="date" name="to" defaultValue={filters.to} className="min-h-11 rounded-lg border bg-background px-3"/></label><button className="min-h-11 rounded-xl bg-primary px-4 font-semibold text-primary-foreground md:col-span-4">{t("filter")}</button></form><div className="mt-5 grid gap-3">{!data?.length?<Card className="p-5">{t("empty")}</Card>:data.map(row=><Card key={row.id} className="grid gap-1 p-4 text-sm sm:grid-cols-[1.3fr_1fr_1fr_1.5fr]"><strong>{row.action}</strong><span>{row.entity_type}{row.entity_id?` · ${row.entity_id}`:""}</span><span>{row.actor_id??t("system")}</span><time dateTime={row.created_at}>{new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"short"}).format(new Date(row.created_at))}</time><pre className="overflow-auto whitespace-pre-wrap text-xs text-muted-foreground sm:col-span-4">{JSON.stringify(row.metadata)}</pre></Card>)}</div></div>;
}
