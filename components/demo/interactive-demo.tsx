"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Badge, Button, Card, Input } from "@/components/ui";
import { demoClinics, demoPet, demoPlanTasks, demoProducts, demoTimeline } from "@/modules/demo/fixtures";
import { rankClinics } from "@/modules/clinics/ranking";
import { recommendProducts, whyThis } from "@/modules/commerce/recommendations";
import { lookupBarcode } from "@/modules/passport/barcode";
import { compressPetImage } from "@/modules/passport/image";
import { calculateInvoiceTotal } from "@/modules/billing/invoice";
import { DEMO_SCENARIO_IDS, demoScenarioFixtures, mockDemoAdapters, type DemoScenarioId } from "@/modules/demo/scenarios";
import dynamic from "next/dynamic";

const BarcodeScanner=dynamic(()=>import("@/components/passport/barcode-scanner").then(module=>module.BarcodeScanner),{loading:()=> <div className="h-20 animate-pulse rounded-xl bg-secondary" aria-hidden="true"/>});
const demoCatalog = [
  { code: "DEMO-VAX-CAT-01", name: "Demo feline vaccine A", kind: "vaccine" as const, isDemo: true },
  { code: "DEMO-MED-001", name: "Demo medication A", kind: "medication" as const, activeIngredient: "DEMO-ACTIVE-A", isDemo: true },
];

function Section({ id, title, eyebrow, children }: { id: string; title: string; eyebrow: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-24 space-y-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">{eyebrow}</p><h2 className="mt-1 font-display text-2xl font-bold md:text-3xl">{title}</h2></div>{children}</section>;
}

export function InteractiveDemo({ initialScenario }: { initialScenario?: DemoScenarioId }) {
  const t = useTranslations("demo");
  const locale = useLocale() as "vi" | "en";
  const [grantActive, setGrantActive] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const qrRef = useRef<HTMLDivElement>(null);
  const [vaccine, setVaccine] = useState({ name: "", code: "", dose: "", lot: "", date: "2026-10-18" });
  const [recordSaved, setRecordSaved] = useState(false);
  const [fileNote, setFileNote] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [manualLocation, setManualLocation] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [sosState, setSosState] = useState<"idle" | "searching" | "accepted" | "canceled">("idle");
  const [mapView, setMapView] = useState(false);
  const [clinicQuery, setClinicQuery] = useState("");
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const clinics = useMemo(() => rankClinics(demoClinics.filter((clinic) => clinic.name.toLowerCase().includes(clinicQuery.toLowerCase()) || clinic.district.toLowerCase().includes(clinicQuery.toLowerCase())), 10), [clinicQuery]);
  const mockMapPins = mockDemoAdapters.maps.visibleClinicPins(clinics);
  const rescueLedger = mockDemoAdapters.payments.rescueLedger();
  const localizedDistrict = (district: string) => locale === "vi" && district.startsWith("District ") ? `Qu\u1eadn ${district.slice("District ".length)}` : district;
  const localizedClinicName = (name: string) => locale === "vi" ? name.replace("Clinic Demo", "Ph\u00f2ng kh\u00e1m demo").replace(/District (\d+)/, "Qu\u1eadn $1") : name;
  const localizedServices = (services: string[]) => services.map((service) => {
    const normalized = service.toLowerCase();
    if (normalized.includes("vaccin")) return t("vaccinationService");
    if (normalized.includes("dental")) return t("dentalService");
    if (normalized.includes("general")) return t("generalCheckup");
    return service;
  });
  const localizedHealthTag = (value: string) => {
    if (locale === "vi" && value === "chicken") return t("demoAllergenChicken");
    if (locale === "vi" && value === "diabetes") return t("demoConditionDiabetes");
    if (locale === "vi" && value === "Demo medication A") return t("demoMedicationName");
    return value;
  };
  const localizedRecord = (record: (typeof demoTimeline)[number]) => {
    const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${record.date}T00:00:00Z`));
    if (record.type === "Vaccination") return { title: t("timelineVaccination"), date, detail: t("timelineVaccineDetail", { code: "DEMO-VAX-CAT-01", lot: "DEMO-LOT-01" }) };
    if (record.type === "Weight") return { title: t("timelineWeight"), date, detail: t("timelineWeightDetail", { weight: new Intl.NumberFormat(locale).format(demoPet.weightKg) }) };
    return { title: t("timelineVisit"), date, detail: t("timelineVisitDetail") };
  };
  const [horizon, setHorizon] = useState<1 | 3 | 6 | 12>(3);
  const [planStatus, setPlanStatus] = useState<"draft" | "approved">("draft");
  const [doneTasks, setDoneTasks] = useState<string[]>([]);
  const productResults = recommendProducts({ species: demoPet.species, lifeStage: "adult", conditions: demoPet.conditions, allergies: demoPet.allergies }, demoProducts);
  const [clinicRole, setClinicRole] = useState("vet");
  const [campaignSent, setCampaignSent] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [activeScenario, setActiveScenario] = useState<DemoScenarioId | null>(null);
  const [triageStarted, setTriageStarted] = useState(false);
  const total = calculateInvoiceTotal([{ description: "Demo booking commission", quantity: 2, unitAmountMinor: 25000 }, { description: "Demo SOS routing commission", quantity: 1, unitAmountMinor: 15000 }]);
  const scenarioLabels: Record<DemoScenarioId, string> = {
    "passport-transfer": t("scenario_passport-transfer"),
    "late-night-sos": t("scenario_late-night-sos"),
    "clinic-vaccine": t("scenario_clinic-vaccine"),
    "care-plan-approval": t("scenario_care-plan-approval"),
    "rescue-ledger": t("scenario_rescue-ledger"),
  };
  const scenarioHints: Record<DemoScenarioId, string> = {
    "passport-transfer": t("scenarioHint_passport-transfer"),
    "late-night-sos": t("scenarioHint_late-night-sos"),
    "clinic-vaccine": t("scenarioHint_clinic-vaccine"),
    "care-plan-approval": t("scenarioHint_care-plan-approval"),
    "rescue-ledger": t("scenarioHint_rescue-ledger"),
  };
  const initialScenarioApplied = useRef<DemoScenarioId | null>(null);

  function scrollToSection(id: string) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }

  function resetDemo() {
    setActiveScenario(null); setTriageStarted(false); setGrantActive(false); setShareUrl(""); qrRef.current?.replaceChildren();
    setVaccine({ name: "", code: "", dose: "", lot: "", date: "2026-10-18" }); setRecordSaved(false); setFileNote("");
    setSymptoms([]); setManualLocation(""); setLocationLabel(""); setSosState("idle"); setMapView(false); setClinicQuery("");
    setAppointmentId(null); setHorizon(3); setPlanStatus("draft"); setDoneTasks([]); setClinicRole("vet");
    setCampaignSent(false); setSavedMessage("");
  }

  function startScenario(scenario: DemoScenarioId) {
    resetDemo();
    setActiveScenario(scenario);
    if (scenario === "passport-transfer") {
      scrollToSection("passport");
    } else if (scenario === "late-night-sos") {
      setSymptoms(["breathing"]);
      setManualLocation(demoScenarioFixtures.lateNightSos.ownerLocation.label);
      setSosState(mockDemoAdapters.sos.pingNearbyClinics().state);
      scrollToSection("sos");
    } else if (scenario === "clinic-vaccine") {
      setVaccine({ name: demoScenarioFixtures.vaccine.name, code: demoScenarioFixtures.vaccine.code, dose: demoScenarioFixtures.vaccine.dose, lot: demoScenarioFixtures.vaccine.lot, date: demoScenarioFixtures.vaccine.date });
      setClinicRole("vet");
      scrollToSection("passport");
    } else if (scenario === "care-plan-approval") {
      setPlanStatus("draft");
      const draft = mockDemoAdapters.ai.draftCarePlan();
      setPlanStatus(draft.status);
      setSavedMessage(t("aiDraftReady"));
      scrollToSection("care-plans");
    } else {
      scrollToSection("rescue");
    }
  }

  useEffect(() => {
    if (initialScenario && initialScenarioApplied.current !== initialScenario) {
      initialScenarioApplied.current = initialScenario;
      startScenario(initialScenario);
    }
  }, [initialScenario, startScenario]);

  async function createShare() {
    const token = crypto.randomUUID();
    const url = `${window.location.origin}/${locale}/demo/passport?share=${token}`;
    setShareUrl(url);
    setGrantActive(true);
    if (qrRef.current) {
      qrRef.current.replaceChildren();
      try {
        const { BrowserQRCodeSvgWriter } = await import("@zxing/browser");
        qrRef.current.append(new BrowserQRCodeSvgWriter().write(url, 192, 192));
      } catch { setSavedMessage(t("unknown")); }
    }
  }

  function selectBarcode(code: string) {
    const match = lookupBarcode(code, demoCatalog);
    setVaccine((value) => ({ ...value, code, ...(match ? { name: match.name } : {}) }));
  }

  async function handleLocalFile(file: File | undefined) {
    if (!file) return;
    try {
      const compressed = file.type.startsWith("image/") ? await compressPetImage(file) : file;
      setFileNote(`${file.name} · ${Math.round(file.size / 1024)} KB → ${Math.round(compressed.size / 1024)} KB · ${t("fictional")}`);
    } catch { setFileNote(t("unknown")); }
  }

  function requestLocation() { const location = mockDemoAdapters.maps.ownerLocation(); setLocationLabel(`${location.lat.toFixed(4)}, ${location.lng.toFixed(4)} · ${t("fictional")}`); }

  function exportCsv() {
    const rows = [["clinic", "appointments", "new_patients", "no_show_rate"], ["FICTIONAL DEMO", "24", "12", "0.08"]];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""').replace(/^[=+@\-]/, "'$&")}"`).join(",")).join("\r\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); link.download = "pawcare-demo-metrics.csv"; link.click(); URL.revokeObjectURL(link.href);
  }

  return <div className="space-y-10">
    <div className="rounded-3xl border border-warning/30 bg-warning-surface p-4 text-sm font-semibold text-foreground" role="note">
      <div className="flex flex-wrap items-center gap-2"><Badge variant="warning">{t("fictional")}</Badge><span>{t("subtitle")}</span></div>
    </div>
    <section aria-labelledby="demo-scenarios-title" className="space-y-4 rounded-3xl border border-border bg-card p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="demo-scenarios-title" className="font-display text-xl font-bold">{t("scenarioTitle")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("scenarioIntro")}</p></div><Button variant="outline" onClick={resetDemo}>{t("resetDemo")}</Button></div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">{DEMO_SCENARIO_IDS.map((scenario) => <Button key={scenario} variant={activeScenario === scenario ? "primary" : "outline"} className="h-auto min-h-14 justify-start whitespace-normal text-left" aria-pressed={activeScenario === scenario} onClick={() => startScenario(scenario)}>{scenarioLabels[scenario]}</Button>)}</div>
      {activeScenario ? <p role="status" aria-live="polite" className="rounded-xl bg-secondary p-3 text-sm font-medium">{scenarioHints[activeScenario]}</p> : null}
    </section>
    <nav className="relative z-20 flex gap-2 overflow-x-auto rounded-2xl border border-border bg-background/95 p-2 backdrop-blur md:sticky md:top-2" aria-label={t("title")}>
      {["passport", "sos", "booking", "care-plans", "recommendations", "clinic"].map((id, index) => <a key={id} className="shrink-0 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" href={`#${id}`}>{[t("passport"), t("sos"), t("booking"), t("carePlans"), t("recommendations"), t("clinic")][index]}</a>)}
    </nav>

    <Section id="passport" eyebrow={t("owner")} title={t("passport")}>
      <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
        <Card className="space-y-4 p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-display text-xl font-bold">{demoPet.name}</h3><p className="text-sm text-muted-foreground">{demoPet.species === "cat" ? t("petCat") : t("petDog")} · {t("petBreed")} · {new Intl.NumberFormat(locale).format(demoPet.weightKg)} kg · {t("fictional")}</p></div><Badge variant="verified">{t("fictional")}</Badge></div>
          <div><p className="font-semibold">{t("allergies")}</p><p className="text-sm text-destructive">{demoPet.allergies.map(localizedHealthTag).join(", ")}</p></div><div><p className="font-semibold">{t("conditions")}</p><p className="text-sm">{demoPet.conditions.map(localizedHealthTag).join(", ")}</p></div>
          {activeScenario === "passport-transfer" && !grantActive ? <Button onClick={() => { setGrantActive(true); setShareUrl("/demo/share/emergency-transfer · MOCK LINK"); }}>{t("createAndShareTransfer")}</Button> : null}<div className="flex flex-wrap gap-2"><Button onClick={createShare}>{t("share")}</Button><Button variant="outline" onClick={() => { setGrantActive(false); setShareUrl(""); qrRef.current?.replaceChildren(); }}>{t("revoke")}</Button><a className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold" href={`/api/demo/passport.pdf?locale=${locale}`}>{t("exportPdf")}</a></div>
          {grantActive ? <p className="text-sm text-primary" role="status">{t("grantActive")}</p> : null}{activeScenario === "passport-transfer" && grantActive ? <div className="rounded-2xl border border-destructive/30 bg-sos-surface p-4"><p className="font-bold">{t("clinicSeesFirst")}</p><p className="mt-1 text-xs text-muted-foreground">{localizedClinicName(demoScenarioFixtures.passportTransfer.clinicName)}</p><p className="mt-2 text-sm">{t("allergies")}: {demoScenarioFixtures.passportTransfer.allergies.map(localizedHealthTag).join(", ")}</p>{demoScenarioFixtures.passportTransfer.activeMedications.map((medication) => <p key={medication.code} className="text-sm">{t("activeMedication")}: {localizedHealthTag(medication.name)} · {medication.code} · {medication.ingredient}</p>)}</div> : null}<div ref={qrRef} className="w-fit rounded-xl bg-white p-2" aria-label={t("temporaryDemoQrLabel")}/>{shareUrl ? <p className="break-all text-xs text-muted-foreground">{shareUrl}</p> : null}
          <label className="grid gap-2 text-sm font-semibold">{t("photo")}<span className="relative"><input className="peer sr-only" type="file" accept="image/*,application/pdf" onChange={(event) => void handleLocalFile(event.target.files?.[0])}/><span className="inline-flex min-h-11 items-center rounded-xl border border-input px-4 text-sm font-semibold peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-ring">{t("chooseImage")}</span></span></label>{fileNote ? <p className="text-xs text-muted-foreground">{fileNote}</p> : null}
        </Card>
        <div className="space-y-4"><Card className="p-5"><h3 className="font-semibold">{t("timeline")}</h3><ol className="mt-4 space-y-3">{demoTimeline.map((record) => { const item = localizedRecord(record); return <li key={record.id} className="border-l-2 border-primary/30 pl-4"><p className="font-semibold">{item.title} · {item.date}</p><p className="text-sm text-muted-foreground">{item.detail}</p></li>; })}</ol></Card>
          <Card className="grid gap-4 p-5"><h3 className="font-semibold">{t("scan")}</h3>{activeScenario === "clinic-vaccine" ? <p role="status" className="rounded-xl bg-secondary p-3 text-sm">{t("barcodeFixtureScanned")}</p> : null}<BarcodeScanner onCode={selectBarcode} mockMode/><form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); setRecordSaved(true); }}>
            <label className="grid gap-1 text-sm font-medium">{t("vaccineName")}<Input required value={vaccine.name} onChange={(event) => setVaccine({ ...vaccine, name: event.target.value })}/></label><label className="grid gap-1 text-sm font-medium">{t("code")}<Input required value={vaccine.code} onChange={(event) => setVaccine({ ...vaccine, code: event.target.value })}/></label><label className="grid gap-1 text-sm font-medium">{t("dose")}<Input required value={vaccine.dose} onChange={(event) => setVaccine({ ...vaccine, dose: event.target.value })}/></label><label className="grid gap-1 text-sm font-medium">{t("lot")}<Input required value={vaccine.lot} onChange={(event) => setVaccine({ ...vaccine, lot: event.target.value })}/></label><label className="grid gap-1 text-sm font-medium md:col-span-2">{t("date")}<Input type="date" required value={vaccine.date} onChange={(event) => setVaccine({ ...vaccine, date: event.target.value })}/></label><Button className="md:col-span-2">{t("saveRecord")}</Button>{recordSaved ? <p className="success-enter md:col-span-2 flex items-center gap-2 text-sm font-semibold text-primary" role="status"><span aria-hidden="true">✓</span>{t("recordSaved")}</p> : null}
          </form></Card>
        </div>
      </div>
    </Section>

    <Section id="sos" eyebrow={t("owner")} title={t("sos")}>
      <Card className="space-y-5 border-destructive/30 p-5"><p className="rounded-xl bg-sos-surface p-4 text-sm font-semibold">{t("disclaimer")}</p><div className="grid gap-5 lg:grid-cols-2"><div className="space-y-3"><p className="font-semibold">{t("symptoms")}</p><div className="flex flex-wrap gap-2">{["poisoning", "breathing", "bleeding", "seizure", "trauma", "heatstroke", "other"].map((symptom) => <button key={symptom} type="button" aria-pressed={symptoms.includes(symptom)} onClick={() => setSymptoms((items) => items.includes(symptom) ? items.filter((item) => item !== symptom) : [...items, symptom])} className={`min-h-12 rounded-full border px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${symptoms.includes(symptom) ? "border-destructive bg-sos-surface" : "border-border bg-card"}`}>{t(symptom)}</button>)}</div><p className="text-sm font-medium">{t("location")}</p><div className="grid gap-2 sm:flex sm:flex-wrap"><Button type="button" variant="outline" onClick={requestLocation}>{t("useLocation")}</Button><Input placeholder={t("manualLocation")} value={manualLocation} onChange={(event) => setManualLocation(event.target.value)}/></div>{locationLabel || manualLocation ? <p className="text-xs text-muted-foreground">{locationLabel || manualLocation}</p> : null}
          <label className="grid gap-2 text-sm font-medium">{t("photo")}<span className="relative"><input className="peer sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => void handleLocalFile(event.target.files?.[0])}/><span className="inline-flex min-h-11 items-center rounded-xl border border-input px-4 text-sm font-semibold peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-ring">{t("chooseImage")}</span></span></label><label className="grid gap-2 text-sm font-medium">{t("voice")}<span className="relative"><input className="peer sr-only" type="file" accept="audio/*" capture onChange={(event) => void handleLocalFile(event.target.files?.[0])}/><span className="inline-flex min-h-11 items-center rounded-xl border border-input px-4 text-sm font-semibold peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-ring">{t("chooseAudio")}</span></span></label>
          <Button variant="sos" size="lg" onClick={() => setSosState("searching")} disabled={!symptoms.length || (!locationLabel && !manualLocation)}>{t("sendSos")}</Button><p className="text-xs text-muted-foreground" aria-live="polite">{!symptoms.length ? t("sosNeedsSymptoms") : !locationLabel && !manualLocation ? t("sosNeedsLocation") : t("sosReady")}</p></div>
        <div className="rounded-2xl border border-border bg-muted p-4"><h3 className="font-semibold">{t("clinicToday")}</h3><p className="mt-3" role="status">{sosState === "searching" ? t("searching") : sosState === "accepted" ? t("accepted") : sosState === "canceled" ? t("cancelSos") : t("unknown")}</p>{activeScenario === "late-night-sos" ? <p className="mt-2 text-sm">{t("nightDispatchDetail", { time: locale === "vi" ? "23:00" : "11 p.m.", timeMinutes: demoScenarioFixtures.lateNightSos.clinic.etaMinutes, radius: demoScenarioFixtures.lateNightSos.radiusKm, clinic: localizedClinicName(demoScenarioFixtures.lateNightSos.clinic.name), distance: demoScenarioFixtures.lateNightSos.clinic.distanceKm })}</p> : null}<div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={() => setSosState(mockDemoAdapters.sos.acceptFirstClinic().state)} disabled={sosState !== "searching"}>{t("acceptClinic")}</Button><Button variant="outline" onClick={() => setSosState("canceled")} disabled={sosState === "idle" || sosState === "canceled"}>{t("cancelSos")}</Button>{activeScenario === "late-night-sos" && sosState === "accepted" ? <Button onClick={() => { mockDemoAdapters.video.startTriage(); setTriageStarted(true); }}>{t("startMockTriage")}</Button> : null}</div>{triageStarted ? <p role="status" className="mt-3 rounded-xl bg-secondary p-3 text-sm font-medium">{t("mockTriageReady")}</p> : null}<p className="mt-3 text-xs text-muted-foreground">{t("liveDispatchDisabled")}</p></div></div></Card>
    </Section>

    <Section id="booking" eyebrow={t("owner")} title={t("booking")}>
      <Card className="space-y-4 p-5"><div className="flex flex-wrap items-end justify-between gap-3"><label className="grid min-w-0 flex-1 gap-1 text-sm font-semibold">{t("filters")}<Input value={clinicQuery} onChange={(event) => setClinicQuery(event.target.value)} placeholder={t("districtSearch")}/></label><div className="flex gap-2"><Button variant={mapView ? "outline" : "primary"} onClick={() => setMapView(false)}>{t("list")}</Button><Button variant={mapView ? "primary" : "outline"} onClick={() => setMapView(true)}>{t("map")}</Button></div></div>
        <div className="grid gap-4 lg:grid-cols-2">{mapView ? <div className="grid min-h-80 content-center gap-3 rounded-2xl border border-border bg-[radial-gradient(ellipse_at_center,var(--color-card),var(--color-secondary))] p-5" aria-label={t("mockMapLabel")}><p className="font-semibold">{t("mockMapTitle")}</p><p className="text-sm text-muted-foreground">{t("noExternalMapCalls")}</p>{mockMapPins.map((clinic) => <div key={clinic.id} className="flex items-center justify-between rounded-xl border border-border bg-card/90 p-3"><span className="font-medium">{localizedClinicName(clinic.name)}</span><Badge>{new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(clinic.distanceKm ?? 0)} km</Badge></div>)}</div> : clinics.length === 0 ? <Card className="p-6 text-center text-sm text-muted-foreground">{t("noClinicsFound")}</Card> : <div className="grid gap-3" role="list">{clinics.map((clinic) => <article key={clinic.id} className="rounded-2xl border border-border bg-background p-4" role="listitem"><div className="flex items-start justify-between gap-2"><div><h3 className="font-semibold">{localizedClinicName(clinic.name)}</h3><p className="text-sm text-muted-foreground">{localizedDistrict(clinic.district)} · {new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(clinic.distanceKm ?? 0)} km · {localizedServices(clinic.services).join(" · ")}</p><p className="mt-1 text-sm">{t("soonest")}: {clinic.soonestSlotHours}h · {clinic.reviewCount} {t("demoReviews")}</p></div>{clinic.verified ? <Badge variant="verified">{t("verified")}</Badge> : null}</div><Button className="mt-3" onClick={() => setAppointmentId(clinic.id)} disabled={Boolean(appointmentId)}>{t("book")}</Button></article>)}</div>}
          <div className="rounded-2xl border border-border bg-muted p-4"><h3 className="font-semibold">{t("rankingRules")}</h3><p className="mt-2 text-sm">{t("organicRankingExplanation")}</p><p className="mt-2 text-xs text-muted-foreground">{t("fictional")}</p>{appointmentId ? <p className="mt-4 font-semibold text-primary" role="status">{t("booked")}: {demoClinics.find((clinic) => clinic.id === appointmentId)?.name}<Button className="ml-2" variant="outline" onClick={() => setAppointmentId(null)}>{t("cancelBooking")}</Button></p> : null}</div>
        </div>
      </Card>
    </Section>

    <Section id="care-plans" eyebrow={t("owner")} title={t("carePlans")}>
      <Card className="space-y-4 p-5"><div className="flex flex-wrap items-center gap-3"><label className="font-semibold" htmlFor="horizon">{t("horizon")}</label><select id="horizon" className="h-11 rounded-xl border border-input bg-card px-3" value={horizon} onChange={(event) => setHorizon(Number(event.target.value) as 1 | 3 | 6 | 12)}>{[[1,t("oneMonth")],[3,t("threeMonths")],[6,t("sixMonths")],[12,t("twelveMonths")]].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><Badge variant={planStatus === "approved" ? "verified" : "warning"}>{planStatus === "approved" ? t("vetVerified") : t("draft")}</Badge><Button variant="outline" onClick={() => { const draft = mockDemoAdapters.ai.draftCarePlan(); setPlanStatus(draft.status); setSavedMessage(t("saved")); }}>{t("generate")}</Button><Button onClick={() => setPlanStatus("approved")}>{t("approve")}</Button></div><p className="text-sm text-muted-foreground">{t("carePlanDemoNote")}</p>{activeScenario === "care-plan-approval" ? <p className="rounded-xl bg-secondary p-3 text-sm">{t("aiDraftExplanation")}</p> : null}
        <ol className="grid gap-3 md:grid-cols-2">{demoPlanTasks.map((task) => <li key={task.id} className="rounded-xl border border-border p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{task.category === "weight_check" ? t("planWeight") : t("planDental")}</p><p className="text-sm text-muted-foreground">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(task.due + "T00:00:00Z"))}</p></div>{task.vetVisit ? <Badge variant="warning">{t("needsVisit")}</Badge> : null}</div><label className="mt-3 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={doneTasks.includes(task.id)} onChange={() => setDoneTasks((items) => items.includes(task.id) ? items.filter((id) => id !== task.id) : [...items, task.id])}/>{t("taskDone")}</label></li>)}</ol><p role="status" className="text-sm">{savedMessage}</p>
      </Card>
    </Section>

    <Section id="recommendations" eyebrow={t("owner")} title={t("recommendations")}>
      <div className="grid gap-4 lg:grid-cols-[1fr_.8fr]"><div className="grid gap-3 md:grid-cols-2">{productResults.eligible.map((product) => <Card key={product.id} className="space-y-3 p-4"><div className="flex justify-between gap-2"><h3 className="font-semibold">{t("demoProduct", { number: product.id.slice(-1) })}</h3>{product.sponsored ? <Badge variant="warning">{t("sponsored")}</Badge> : null}</div><p className="text-sm">{t("why")}: {whyThis(product, { species: demoPet.species, lifeStage: "adult", conditions: demoPet.conditions, allergies: demoPet.allergies }, locale).join(" · ")}</p><p className="text-xs text-muted-foreground">{t("affiliateDisclosure")}</p><a href={`/api/demo/affiliate/${product.id}`} className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">{t("outbound")}</a></Card>)}</div>
        <Card className="space-y-4 p-5"><h3 className="font-semibold">{t("shops")}</h3><p className="text-sm">{t("sponsoredSafetyExplanation")}</p><ul className="space-y-2"><li className="rounded-xl border border-border p-3">{t("spaDemo")} · {localizedDistrict("District 1")} <Badge variant="warning">{t("premiumDemo")}</Badge></li><li className="rounded-xl border border-border p-3">{t("shopDemo")} · {localizedDistrict("District 3")} · {t("organicDemo")}</li></ul><h4 className="font-semibold">{t("rankingRules")}</h4><p className="text-sm">{t("premiumListingExplanation")}</p><p className="text-xs text-muted-foreground">{t("filteredProductCount", { count: productResults.excluded.length })}</p></Card>
      </div>
    </Section>

    <Section id="rescue" eyebrow={t("fictional")} title={t("rescueScenarioTitle")}>
      <Card className="space-y-4 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-display text-xl font-bold">{t("rescueCaseName")}</h3><p className="text-sm text-muted-foreground">{t("rescuePartner")}: {localizedClinicName(demoScenarioFixtures.rescue.clinic)}</p></div><Badge variant="verified">{t("rescueVerifiedDemo")}</Badge></div><p className="text-sm">{t("rescueNoFundsHeld")}</p><div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="mb-2 text-left font-semibold">{t("transparentLedger")}</caption><tbody><tr className="border-t border-border"><th className="py-2">{t("treatmentEstimate")}</th><td className="text-right">{new Intl.NumberFormat(locale, { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(rescueLedger.estimateVnd)}</td></tr><tr className="border-t border-border"><th className="py-2">{t("verifiedReceipts")}</th><td className="text-right">{new Intl.NumberFormat(locale, { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(rescueLedger.verifiedReceiptVnd)}</td></tr><tr className="border-t border-border font-bold"><th className="py-2">{t("remainingEstimate")}</th><td className="text-right">{new Intl.NumberFormat(locale, { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(rescueLedger.outstandingVnd)}</td></tr></tbody></table></div><p className="text-xs text-muted-foreground">{t("fictional")}</p></Card>
    </Section>

    <Section id="clinic" eyebrow={t("clinic")} title={t("clinicToday")}>
      <div className="space-y-4"><Card className="flex flex-wrap items-center justify-between gap-3 p-5"><div><h3 className="font-semibold">{t("team")}</h3><p className="text-xs text-muted-foreground">{t("clinicRoleDescription")}</p></div><select aria-label={t("team")} className="min-h-11 rounded-xl border border-input bg-card px-3" value={clinicRole} onChange={(event) => setClinicRole(event.target.value)}><option value="vet">{t("vetRole")}</option><option value="receptionist">{t("receptionistRole")}</option><option value="clinic_admin">{t("clinicAdminRole")}</option></select></Card>
        <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]"><Card className="space-y-4 p-5"><div className="flex flex-wrap gap-2"><Badge>{t("appointments")}: 8</Badge><Badge variant="destructive">{t("demoClinicActions")}: 1</Badge><Badge>{t("walkIns")}: 2</Badge></div>
          <div className="grid gap-3 md:hidden" aria-label={t("clinicToday")}>{["09:00", "09:30", "10:15"].map((time, index) => <article key={time} className="rounded-xl border border-border bg-background p-4"><p className="text-xs font-semibold text-muted-foreground">{t("timeLabel")}</p><p className="font-bold">{time}</p><dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm"><dt className="text-muted-foreground">{t("pet")}</dt><dd className="font-medium">{index === 0 ? demoPet.name : t("demoPet", { number: index + 1 })}</dd><dt className="text-muted-foreground">{t("serviceLabel")}</dt><dd>{index ? t("generalCheckup") : t("vaccinationService")}</dd><dt className="text-muted-foreground">{t("statusLabel")}</dt><dd>{index ? t("confirmed") : t("demoClinicActions")}</dd></dl></article>)}</div>
          <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><caption className="mb-2 text-left font-semibold">{t("clinicToday")} · {t("fictional")}</caption><thead><tr><th className="p-2">{t("timeLabel")}</th><th className="p-2">{t("pet")}</th><th className="p-2">{t("serviceLabel")}</th><th className="p-2">{t("statusLabel")}</th></tr></thead><tbody>{["09:00", "09:30", "10:15"].map((time, index) => <tr key={time} className="border-t border-border"><td className="p-2">{time}</td><td className="p-2">{index === 0 ? demoPet.name : t("demoPet", { number: index + 1 })}</td><td className="p-2">{index ? t("generalCheckup") : t("vaccinationService")}</td><td className="p-2">{index ? t("confirmed") : t("demoClinicActions")}</td></tr>)}</tbody></table></div>
          <div className="flex flex-wrap gap-2">{[t("schedule"), t("patients"), t("services"), t("reviews")].map((label) => <Button key={label} variant="outline" onClick={() => setSavedMessage(`${label} · ${t("fictional")}`)}>{label}</Button>)}</div></Card>
          <div className="grid gap-4"><Card className="p-5"><h3 className="font-semibold">{t("performance")}</h3><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt>{t("newReturning")}</dt><dd className="font-bold">12 / 18</dd></div><div><dt>{t("rebooking")}</dt><dd className="font-bold">42%</dd></div><div><dt>{t("noShow")}</dt><dd className="font-bold">8%</dd></div><div><dt>{t("sosResponse")}</dt><dd className="font-bold">11 phút · n=4</dd></div><div className="col-span-2"><dt>{t("attributedRevenue")}</dt><dd className="font-bold">{t("demoRevenue")}</dd></div><div className="col-span-2"><dt>{t("vaccinesDue")}</dt><dd className="font-bold">6 {t("eligibleCount")} · 3 {t("excludedWithoutConsent")}</dd></div></dl><table className="mt-4 w-full text-left text-xs"><caption className="text-left font-semibold">{t("chartData")}</caption><tbody><tr><th>{t("monthLabel")}</th><th>{t("newLabel")}</th><th>{t("returningLabel")}</th></tr><tr><td>{new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(new Date("2026-09-01T00:00:00Z"))}</td><td>12</td><td>18</td></tr><tr><td>{new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(new Date("2026-10-01T00:00:00Z"))}</td><td>14</td><td>20</td></tr></tbody></table><Button className="mt-3" variant="outline" onClick={exportCsv}>{t("csv")}</Button></Card>
            <Card className="space-y-3 p-5"><h3 className="font-semibold">{t("reminders")}</h3><p className="text-sm">{t("campaignConsentPreview")}</p><Button variant="outline" onClick={() => setCampaignSent(false)}>{t("campaignPreview")}</Button><Button onClick={() => { mockDemoAdapters.notifications.queueCampaignPreview(); setCampaignSent(true); }}>{t("sendCampaign")}</Button>{campaignSent ? <p role="status" className="text-sm text-primary">{t("campaignSent")}</p> : null}</Card>
            <Card className="space-y-3 p-5"><h3 className="font-semibold">{t("finance")}</h3><p className="text-xs text-muted-foreground">{t("ledger")}</p><table className="w-full text-left text-sm"><tbody><tr><td>Demo booking × 2</td><td className="text-right">50,000 ₫</td></tr><tr><td>Demo SOS routing</td><td className="text-right">15,000 ₫</td></tr><tr className="border-t border-border font-bold"><td>Total</td><td className="text-right">{new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US").format(total.totalMinor)} ₫</td></tr></tbody></table><Button variant="outline" disabled={clinicRole !== "clinic_admin"} onClick={() => window.location.assign("/api/demo/invoice.pdf")}>{t("invoice")}</Button><p role="status" className="text-xs">{clinicRole !== "clinic_admin" ? t("unauthorized") : t("invoiceStatus")}: SANDBOX · FICTIONAL</p></Card></div>
        </div>
      </div>
    </Section>
  </div>;
}
