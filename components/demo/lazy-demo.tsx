"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { DemoScenarioId } from "@/modules/demo/scenarios";

function DemoLoading() {
  const t = useTranslations("common");
  return <div role="status" aria-busy="true" aria-label={t("loading")} className="mx-auto grid min-h-96 max-w-7xl place-items-center rounded-3xl bg-secondary"><div className="w-full space-y-3 p-6" aria-hidden="true"><div className="h-6 w-1/2 animate-pulse rounded bg-muted motion-reduce:animate-none"/><div className="h-32 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none"/><div className="h-11 w-40 animate-pulse rounded-xl bg-muted motion-reduce:animate-none"/></div><span className="sr-only">{t("loading")}</span></div>;
}

const InteractiveDemo = dynamic(() => import("./interactive-demo").then((module) => module.InteractiveDemo), { loading: () => <DemoLoading/> });

export function LazyDemo() {
  const t = useTranslations("demo");
  const [scenario, setScenario] = useState<DemoScenarioId | null>(null);
  const [started, setStarted] = useState(false);
  if (started) return <InteractiveDemo initialScenario={scenario ?? undefined}/>;

  const scenarios: { id: DemoScenarioId; label: string }[] = [
    { id: "passport-transfer", label: t("scenario_passport-transfer") },
    { id: "late-night-sos", label: t("scenario_late-night-sos") },
    { id: "clinic-vaccine", label: t("scenario_clinic-vaccine") },
    { id: "care-plan-approval", label: t("scenario_care-plan-approval") },
    { id: "rescue-ledger", label: t("scenario_rescue-ledger") },
  ];
  return <section className="space-y-5 rounded-3xl border border-border bg-card p-5 md:p-7">
    <p className="mx-auto max-w-2xl text-center text-muted-foreground">{t("lazyIntro")}</p>
    <h2 className="text-center font-display text-xl font-bold">{t("scenarioTitle")}</h2>
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">{scenarios.map(({ id, label }) => <button key={id} type="button" onClick={() => { setScenario(id); setStarted(true); }} className="min-h-14 rounded-xl border border-border bg-background p-3 text-left text-sm font-semibold hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">{label}</button>)}</div>
    <p className="text-center text-xs text-muted-foreground">{t("scenarioIntro")}</p>
    <div className="text-center"><button type="button" onClick={() => setStarted(true)} className="min-h-12 rounded-full bg-primary px-6 font-semibold text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">{t("startInteractiveDemo")}</button></div>
  </section>;
}
