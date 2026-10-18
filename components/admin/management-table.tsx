"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui";

type Row = Record<string, unknown>;
export function ManagementTable({ section, rows }: { section: "users" | "clinics" | "flags" | "reviews"; rows: Row[] }) {
  const t = useTranslations("admin"), locale = useLocale();
  const [busy, setBusy] = useState(""), [status, setStatus] = useState("");
  async function mutate(row: Row, kind: string, action: Record<string, unknown>) {
    const reason = window.prompt(t("reasonPrompt"));
    if (reason === null) return;
    setBusy(String(row.id ?? row.flag_key)); setStatus("");
    try {
      const response = await fetch("/api/admin/management", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, ...action, reason }) });
      if (response.status === 428) { setStatus(t("stepUpRequired")); return; }
      if (!response.ok) throw new Error();
      setStatus(t("actionSaved")); window.location.reload();
    } catch { setStatus(t("actionFailed")); }
    finally { setBusy(""); }
  }
  async function toggleFlag(row: Row) {
    setBusy(String(row.flag_key)); setStatus("");
    try {
      const response = await fetch("/api/admin/management", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "feature_flag", flagKey: row.flag_key, enabled: !row.enabled }) });
      if (response.status === 428) { setStatus(t("stepUpRequired")); return; }
      if (!response.ok) throw new Error();
      window.location.reload();
    } catch { setStatus(t("actionFailed")); }
    finally { setBusy(""); }
  }
  const date = (value: unknown) => value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(String(value))) : t("notAvailable");
  return <div className="mt-6 grid gap-3">{status && <p role="status" className="rounded-xl bg-secondary p-3">{status}</p>}{rows.length===0&&<Card className="p-5">{t("empty")}</Card>}{rows.map(row => {
    const id=String(row.id??row.flag_key);
    return <Card key={id} className="grid gap-3 p-5 md:grid-cols-[1fr_auto] md:items-center"><div className="min-w-0"><h2 className="break-all font-semibold">{String(row.full_name??row.name??row.flag_key??`${t("review")} · ${String(row.rating)}`)}</h2><p className="mt-1 break-all text-xs text-muted-foreground">{section==="users"?`${String(row.role)} · ${date(row.created_at)}`:section==="clinics"?`${String(row.address)} · ${row.verified?t("verifiedLabel"):t("unverifiedLabel")}`:section==="flags"?String(row.description_en??""):section==="reviews"?`${String(row.body??"")} · ${String(row.status)}`:id}</p></div>
      {section==="users"&&<button disabled={Boolean(busy)} onClick={()=>void mutate(row,"suspend_user",{userId:row.id,suspended:!row.suspended_at})} className="min-h-11 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50">{row.suspended_at?t("restoreUser"):t("suspendUser")}</button>}
      {section==="clinics"&&<button disabled={Boolean(busy)} onClick={()=>void mutate(row,"clinic_verified",{clinicId:row.id,verified:!row.verified})} className="min-h-11 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50">{row.verified?t("unverifyClinic"):t("verifyClinic")}</button>}
      {section==="flags"&&<button disabled={Boolean(busy)} onClick={()=>void toggleFlag(row)} className="min-h-11 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50">{row.enabled?t("disableFlag"):t("enableFlag")}</button>}
      {section==="reviews"&&<div className="flex flex-wrap gap-2"><button disabled={Boolean(busy)} onClick={()=>void mutate(row,"review_status",{reviewId:row.id,status:"published"})} className="min-h-11 rounded-xl border px-3 text-sm">{t("publishReview")}</button><button disabled={Boolean(busy)} onClick={()=>void mutate(row,"review_status",{reviewId:row.id,status:"hidden"})} className="min-h-11 rounded-xl border px-3 text-sm">{t("hideReview")}</button></div>}
    </Card>;
  })}</div>;
}
