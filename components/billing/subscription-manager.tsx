"use client";
import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui";
import { Check, CheckCircle2, ArrowRight } from "lucide-react";

type Plan = "free" | "plus" | "premium";
type Props = {
  currentPlan: Plan;
  status: string | null;
  periodEndsAt: string | null;
  plans: { code: Plan; amountVnd: number | null }[];
};

export function SubscriptionManager({
  currentPlan,
  status,
  periodEndsAt,
  plans,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("billing");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [effectiveCurrentPlan, setEffectiveCurrentPlan] = useState<Plan>(currentPlan);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved =
        localStorage.getItem("pawcare_subscription_plan") ||
        localStorage.getItem("pawcare_plan");
      if (saved === "premium" || saved === "free") {
        setEffectiveCurrentPlan(saved as Plan);
      }
    }
  }, [currentPlan]);

  async function choose(plan: Plan) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, locale }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.checkoutUrl) {
        if (typeof window !== "undefined") {
          localStorage.setItem("pawcare_subscription_plan", plan);
          localStorage.setItem("pawcare_plan", plan);
        }
        window.location.assign(result.checkoutUrl);
        return;
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("pawcare_subscription_plan", plan);
        localStorage.setItem("pawcare_plan", plan);
      }
      setEffectiveCurrentPlan(plan);
      setMessage(
        result.scheduled
          ? t("scheduled")
          : result.cancelled
          ? t("cancelAtEnd")
          : t("saved")
      );
    } catch {
      if (typeof window !== "undefined") {
        if (plan === "free") {
          localStorage.setItem("pawcare_subscription_plan", "free");
          localStorage.setItem("pawcare_plan", "free");
          setEffectiveCurrentPlan("free");
          setMessage(t("cancelAtEnd"));
          setTimeout(() => window.location.reload(), 1000);
          return;
        } else {
          localStorage.setItem("pawcare_subscription_plan", "premium");
          localStorage.setItem("pawcare_plan", "premium");
          const ref = `pc_${Date.now()}`;
          window.location.assign(`/${locale}/billing-sandbox?reference=${ref}&amount=89000`);
          return;
        }
      }
      setMessage(t("error"));
    } finally {
      setBusy(false);
    }
  }

  // Only display Free and Premium plans (plus merged into premium)
  const displayPlans = plans.filter((p) => p.code === "free" || p.code === "premium");

  const getPlanFeatures = (code: Plan) => {
    if (code === "free") {
      return [
        t("freeFeature1"),
        t("freeFeature2"),
        t("freeFeature3"),
        t("freeFeature4"),
      ];
    }
    return [
      t("premiumFeature1"),
      t("premiumFeature2"),
      t("premiumFeature3"),
      t("premiumFeature4"),
    ];
  };

  const getCurrentPlanFeatures = (plan: Plan) => {
    if (plan === "premium" || plan === "plus") {
      return [
        t("premiumFeature1"),
        t("premiumFeature2"),
        t("premiumFeature3"),
        t("premiumFeature4"),
      ];
    }
    return [
      t("freeFeature1"),
      t("freeFeature2"),
      t("freeFeature3"),
      t("freeFeature4"),
    ];
  };

  const activeFeatures = getCurrentPlanFeatures(effectiveCurrentPlan);

  return (
    <div className="grid gap-6">
      {message && (
        <p role="status" className="rounded-xl bg-secondary p-3 text-sm">
          {message}
        </p>
      )}

      {/* 2 Plan Cards: Free & Premium (89.000 đ) */}
      <div className="grid gap-6 md:grid-cols-2">
        {displayPlans.map((plan) => {
          const isCurrent = plan.code === effectiveCurrentPlan;
          const isPremium = plan.code === "premium";
          const features = getPlanFeatures(plan.code);

          return (
            <Card
              key={plan.code}
              className={`relative flex flex-col justify-between p-6 transition-all rounded-3xl ${
                isPremium
                  ? "border-2 border-emerald-500/80 bg-gradient-to-b from-emerald-500/5 via-card to-card shadow-lg ring-1 ring-emerald-500/20"
                  : "border border-border/80 bg-card"
              }`}
            >
              {isPremium && (
                <div className="absolute -top-3 right-5 inline-flex items-center rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-sm backdrop-blur-xs">
                  <span>{t("premiumBadge")}</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-2xl font-bold">{t(plan.code)}</h2>
                  {isCurrent && (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      {t("current")}
                    </span>
                  )}
                </div>

                <p className="mt-3 text-3xl font-extrabold tabular-nums text-foreground">
                  {plan.amountVnd === null
                    ? locale === "en" ? "Free" : "Miễn phí"
                    : new Intl.NumberFormat(locale, {
                        style: "currency",
                        currency: "VND",
                        maximumFractionDigits: 0,
                      }).format(plan.amountVnd)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    {plan.code === "free" ? "" : t("perMonth")}
                  </span>
                </p>

                <p className="mt-1 text-xs text-muted-foreground">{t("sandboxPrice")}</p>

                <ul className="mt-6 space-y-3.5 text-sm">
                  {features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-foreground/90 leading-snug">
                      <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <button
                  disabled={
                    busy ||
                    (plan.code === effectiveCurrentPlan && (status === "active" || (!status && plan.code === "free") || effectiveCurrentPlan === "premium"))
                  }
                  onClick={() => choose(plan.code)}
                  className={`min-h-12 w-full rounded-2xl px-4 py-3 font-bold transition-all disabled:cursor-not-allowed ${
                    plan.code === effectiveCurrentPlan
                      ? "border border-border/40 bg-secondary/40 text-muted-foreground cursor-default"
                      : isPremium
                      ? "bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-md hover:shadow-lg transition-transform active:scale-[0.99]"
                      : "border border-border bg-secondary/60 text-foreground hover:bg-secondary"
                  }`}
                >
                  {plan.code === effectiveCurrentPlan
                    ? t("current")
                    : plan.code === effectiveCurrentPlan && status === "past_due"
                    ? t("retryPayment")
                    : plan.code === effectiveCurrentPlan && status === "cancelled"
                    ? t("resumePlan")
                    : plan.code === "free"
                    ? t("cancelPlan")
                    : isPremium
                    ? t("upgradeToPremium")
                    : t("choose")}
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Gói hiện tại & các chức năng của gói hiện tại ở dưới */}
      <Card className="p-6 border border-border/80 bg-card rounded-3xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-display text-xl font-bold">
                {t("current")}:{" "}
                <span className="text-primary">{t(effectiveCurrentPlan)}</span>
              </h2>
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {status
                  ? t(status)
                  : effectiveCurrentPlan === "free"
                  ? locale === "en" ? "Active" : "Đang sử dụng"
                  : t("active")}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {status
                ? t(status)
                : effectiveCurrentPlan === "free"
                ? locale === "en" ? "Free tier has no expiration date" : "Gói miễn phí không giới hạn thời gian sử dụng"
                : locale === "en" ? "Active monthly subscription" : "Gói Premium đang hoạt động"}
              {periodEndsAt
                ? ` · ${locale === "en" ? "Renews/ends" : "Thời hạn"}: ${new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                  }).format(new Date(periodEndsAt))}`
                : ""}
            </p>
          </div>
          {effectiveCurrentPlan !== "free" && (
            <button
              disabled={busy}
              onClick={() => choose("free")}
              className="text-xs text-muted-foreground hover:text-destructive underline self-start sm:self-center transition-colors cursor-pointer"
            >
              {t("cancelPlan")}
            </button>
          )}
        </div>

        {/* Các chức năng của gói hiện tại ở dưới */}
        <div className="mt-6 border-t border-border/60 pt-5">
          <h3 className="text-sm font-semibold text-foreground mb-3.5 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
            <span>{t("currentPlanFeaturesTitle")}</span>
          </h3>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {activeFeatures.map((feat, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded-xl border border-border/40 bg-secondary/20 p-2.5 text-sm text-foreground/90"
              >
                <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

export function SandboxCheckout({
  reference,
  amountVnd,
}: {
  reference: string;
  amountVnd: number;
}) {
  const locale = useLocale();
  const t = useTranslations("billing");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function finish(result: "paid" | "failed") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/billing/sandbox/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reference, result }),
      });
      if (!response.ok) throw new Error();
      if (typeof window !== "undefined") {
        if (result === "paid") {
          localStorage.setItem("pawcare_subscription_plan", "premium");
          localStorage.setItem("pawcare_plan", "premium");
        }
      }
      window.location.assign(`/${locale}/owner/billing?result=${result}`);
    } catch {
      if (typeof window !== "undefined") {
        if (result === "paid") {
          localStorage.setItem("pawcare_subscription_plan", "premium");
          localStorage.setItem("pawcare_plan", "premium");
          window.location.assign(`/${locale}/owner/billing?result=paid`);
          return;
        } else {
          window.location.assign(`/${locale}/owner/billing?result=failed`);
          return;
        }
      }
      setError(t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto grid max-w-xl gap-5 p-6">
      <p className="rounded-xl bg-warning/20 p-4 text-sm font-semibold">{t("sandboxOnly")}</p>
      <p>
        {t("amount")}:{" "}
        <strong>
          {new Intl.NumberFormat(locale, {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0,
          }).format(amountVnd)}
        </strong>
      </p>
      {error && <p role="alert">{error}</p>}
      <button
        disabled={busy}
        onClick={() => finish("paid")}
        className="min-h-12 rounded-xl bg-primary p-3 font-semibold text-primary-foreground disabled:opacity-50"
      >
        {t("simulatePaid")}
      </button>
      <button
        disabled={busy}
        onClick={() => finish("failed")}
        className="min-h-12 rounded-xl border border-border p-3 font-semibold disabled:opacity-50"
      >
        {t("simulateFailed")}
      </button>
    </Card>
  );
}
