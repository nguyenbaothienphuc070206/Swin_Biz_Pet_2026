import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireRole, getOptionalUser } from "@/lib/auth/server";
import { OwnerHomeView } from "@/components/owner/owner-home-view";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { effectivePlan } from "@/modules/billing/entitlements";
import { resolveOwnerAccount } from "@/lib/portal-store/server-store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  return {
    title: isEn ? "Owner Portal — PawCare" : "Trang chính Chủ nuôi — PawCare",
    description: isEn
      ? "Comprehensive pet health and medical passport management portal"
      : "Trang chính quản lý y bạ, lịch tiêm phòng và đặt khám cho thú cưng",
  };
}

export const dynamic = "force-dynamic";

export default async function OwnerHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Ensure user is an authenticated owner (redirects to /sign-in if not authenticated)
  await requireRole(["owner"], locale as "vi" | "en");
  const user = await getOptionalUser();

  const ownerAcc = !isSupabaseConfigured()
    ? resolveOwnerAccount(user?.email || user?.id)
    : null;
  const userName =
    ownerAcc?.profile.fullName ||
    user?.name ||
    (locale === "en" ? "Pet Parent" : "Chủ nuôi");

  let initialPlan: "free" | "premium" = ownerAcc?.plan ?? "premium";
  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY && user?.id) {
    try {
      const db = createServiceClient();
      const { data: dbSub } = await db
        .from("billing_subscriptions")
        .select("plan_code,pending_plan_code,status,period_ends_at,grace_ends_at")
        .eq("owner_id", user.id)
        .in("status", ["pending", "active", "past_due", "cancelled"])
        .maybeSingle();
      if (dbSub) {
        const plan = effectivePlan({
          plan: (dbSub.plan_code ?? "free") as any,
          pendingPlan: (dbSub.pending_plan_code ?? null) as any,
          status: dbSub.status as any,
          periodEndsAt: new Date(dbSub.period_ends_at).getTime(),
          graceEndsAt: dbSub.grace_ends_at ? new Date(dbSub.grace_ends_at).getTime() : null,
        });
        initialPlan = plan === "premium" || plan === "plus" ? "premium" : "free";
      }
    } catch {}
  }

  return <OwnerHomeView userName={userName} initialPlan={initialPlan} />;
}
