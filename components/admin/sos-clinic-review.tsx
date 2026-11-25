"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui";

type Candidate = { id: string; name: string; address: string; phone: string | null; pin: { latitude: number; longitude: number } | null };
export function SosClinicReview() {
  const t = useTranslations("adminSosReview");
  const [rows, setRows] = useState<Candidate[]>([]);
  const [error, setError] = useState("");
  const [reason, setReason] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  async function load() {
    const response = await fetch("/api/admin/sos-clinics", { cache: "no-store" });
    if (!response.ok) { setError(t("loadError")); return; }
    const data = await response.json(); setRows(data.clinics ?? []); setError("");
  }
  useEffect(() => { void load(); }, []);
  async function review(clinicId: string, approve: boolean) {
    const note = reason[clinicId]?.trim() || t(approve ? "approvedNote" : "declinedNote");
    setBusy(clinicId); setError("");
    try {
      const response = await fetch("/api/admin/sos-clinics", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ clinicId, approve, reason: note }) });
      if (!response.ok) throw new Error(); await load();
    } catch { setError(t("saveError")); }
    finally { setBusy(null); }
  }
  return <section className="mt-8 space-y-3"><h2 className="font-display text-2xl font-bold">{t("title")}</h2><p className="text-sm text-muted-foreground">{t("description")}</p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{!rows.length && !error ? <Card className="p-4 text-sm">{t("empty")}</Card> : rows.map((row) => <Card key={row.id} className="grid gap-3 p-4"><div><h3 className="font-bold">{row.name}</h3><p className="text-sm text-muted-foreground">{row.address}</p><p className="text-xs">{row.pin ? `${row.pin.latitude.toFixed(6)}, ${row.pin.longitude.toFixed(6)}` : t("pinInvalid")}</p>{row.pin && <a target="_blank" rel="noreferrer" className="text-sm text-primary underline" href={`https://www.google.com/maps?q=${row.pin.latitude},${row.pin.longitude}`}>{t("inspectPin")}</a>}</div><label className="grid gap-1 text-sm"><span>{t("reviewNote")}</span><input maxLength={500} value={reason[row.id] ?? ""} onChange={(event) => setReason((current) => ({ ...current, [row.id]: event.target.value }))} className="min-h-11 rounded-xl border border-border bg-background px-3" /></label><div className="flex flex-wrap gap-2"><button type="button" disabled={busy === row.id || !row.pin} onClick={() => void review(row.id, true)} className="min-h-11 rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50">{t("approve")}</button><button type="button" disabled={busy === row.id} onClick={() => void review(row.id, false)} className="min-h-11 rounded-xl border border-border px-4 font-semibold">{t("decline")}</button></div></Card>)}</section>;
}
