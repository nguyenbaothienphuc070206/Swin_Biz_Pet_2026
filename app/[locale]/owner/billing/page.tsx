import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { SubscriptionManager } from "@/components/billing/subscription-manager";
import { effectivePlan } from "@/modules/billing/entitlements";
import { BackButton } from "@/components/ui/back-button";
import { resolveOwnerAccount } from "@/lib/portal-store/server-store";

const defaultBillingPlans: { code: "free" | "premium"; amount_vnd: number | null }[] = [
  { code: "free", amount_vnd: null },
  { code: "premium", amount_vnd: 89000 },
];

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (locale !== "vi" && locale !== "en") notFound();
  const { userId } = await requireRole(["owner"], locale);
  const t = await getTranslations("billing");

  let plans: { code: string; amount_vnd: number | null }[] | null = null;
  let subscription: any = null;

  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const db = createServiceClient();
      const [
        { data: dbPlans },
        { data: dbSub },
      ] = await Promise.all([
        db
          .from("billing_plans")
          .select("code,amount_vnd")
          .eq("active", true)
          .eq("is_sandbox", true)
          .in("code", ["free", "premium"])
          .order("amount_vnd"),
        db
          .from("billing_subscriptions")
          .select("plan_code,pending_plan_code,status,period_ends_at,grace_ends_at")
          .eq("owner_id", userId)
          .in("status", ["pending", "active", "past_due", "cancelled"])
          .maybeSingle(),
      ]);
      plans = dbPlans;
      subscription = dbSub;
    } catch {}
  }

  const rawPlans = plans && plans.length > 0 ? plans : defaultBillingPlans;
  const safePlans = rawPlans.filter((p): p is { code: "free" | "premium"; amount_vnd: number | null } =>
    ["free", "premium"].includes(p.code as any)
  );

  const fallbackOwnerPlan = !isSupabaseConfigured()
    ? resolveOwnerAccount(userId).plan
    : "free";

  const currentPlan = subscription
    ? effectivePlan({
        plan: (subscription.plan_code ?? "free") as "free" | "plus" | "premium",
        pendingPlan: (subscription.pending_plan_code ?? null) as "free" | "plus" | "premium" | null,
        status: subscription.status as "active" | "past_due" | "cancelled" | "expired",
        periodEndsAt: new Date(subscription.period_ends_at).getTime(),
        graceEndsAt: subscription.grace_ends_at ? new Date(subscription.grace_ends_at).getTime() : null,
      })
    : fallbackOwnerPlan;

  return (
    <div className="grid gap-6">
      <div>
        <BackButton fallbackHref={`/${locale}/owner`} label={locale === "en" ? "Back to Main" : "Quay về Trang chính"} variant="pill" />
      </div>
      <header>
        <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("intro")}</p>
      </header>

      {query.result && (
        <p role="status" className="rounded-xl bg-secondary p-4">
          {query.result === "paid" ? t("paymentSuccess") : t("paymentFailed")}
        </p>
      )}

      <SubscriptionManager
        currentPlan={currentPlan}
        status={subscription?.status ?? null}
        periodEndsAt={subscription?.period_ends_at ?? null}
        plans={safePlans.map((p) => ({
          code: p.code,
          amountVnd: p.amount_vnd === null ? null : Number(p.amount_vnd),
        }))}
      />
    </div>
  );
}
