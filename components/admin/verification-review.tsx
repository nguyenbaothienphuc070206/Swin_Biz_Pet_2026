"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui";

export function VerificationReview({ requestId, pending }: { requestId: string; pending: boolean }) {
  const t = useTranslations("admin"), locale = useLocale();
  const [reason, setReason] = useState(""), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const checklistKeys = ["license", "address", "contact", "documents"] as const;
  async function decide(decision: "approved" | "rejected") {
    setBusy(true); setMessage("");
    try {
      const checklist = Object.fromEntries(checklistKeys.map(key => [key, (document.querySelector(`[name="${requestId}-${key}"]`) as HTMLInputElement | null)?.checked ?? false]));
      const response = await fetch("/api/admin/verification", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId, decision, reason, checklist }) });
      if (response.status === 428) { setMessage(t("stepUpRequired")); return; }
      if (!response.ok) throw new Error();
      setMessage(t("actionSaved")); window.location.reload();
    } catch { setMessage(t("actionFailed")); }
    finally { setBusy(false); }
  }
  return <Card className="mt-5 grid gap-4 bg-secondary/40 p-4">
    <h3 className="font-semibold">{t("reviewChecklist")}</h3>
    {checklistKeys.map(key => <label key={key} className="flex min-h-11 items-center gap-3"><input type="checkbox" name={`${requestId}-${key}`} disabled={!pending}/>{t(`check_${key}`)}</label>)}
    <label className="grid gap-2 text-sm">{t("reason")}<textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={1000} required disabled={!pending} className="min-h-20 rounded-xl border border-border bg-background p-3" /></label>
    {pending && <div className="flex flex-wrap gap-2"><button type="button" disabled={busy || reason.trim().length < 5} onClick={() => void decide("approved")} className="min-h-11 rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50">{t("approve")}</button><button type="button" disabled={busy || reason.trim().length < 5} onClick={() => void decide("rejected")} className="min-h-11 rounded-xl border border-border px-4 font-semibold disabled:opacity-50">{t("reject")}</button></div>}
    {message && <p role="status" className="text-sm" lang={locale}>{message}</p>}
  </Card>;
}
