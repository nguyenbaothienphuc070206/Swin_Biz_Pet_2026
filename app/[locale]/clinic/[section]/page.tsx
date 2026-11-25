import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui";
import { ClinicRescueWorkspace } from "@/components/community/clinic-rescue-workspace";
import { requireRole, getOptionalUser } from "@/lib/auth/server";
import { OfflineVaccineEntry } from "@/components/clinic/offline-vaccine-entry";
import { ClinicAppointmentsView } from "@/components/clinic/clinic-appointments-view";
import { ClinicCarePlansView } from "@/components/clinic/clinic-care-plans-view";
import { ClinicTodayView } from "@/components/clinic/clinic-today-view";
import { ClinicPetRecordsView } from "@/components/clinic/clinic-pet-records-view";
import { BackButton } from "@/components/ui/back-button";
import { ClinicSosSettings } from "@/components/clinic/clinic-sos-settings";
import { ClinicSettingsView } from "@/components/clinic/clinic-settings-view";

export default async function ClinicSectionPage({
  params,
}: {
  params: Promise<{ locale: string; section: string }>;
}) {
  const { locale, section } = await params;
  if (!["appointments", "patients", "records", "pet-records", "rescue", "billing", "care-plans", "sos-settings", "settings"].includes(section)) notFound();

  if (section === "settings") {
    const { role } = await requireRole(["clinic_staff", "clinic_admin"], locale as "vi" | "en");
    const optionalUser = await getOptionalUser();
    return (
      <div className="space-y-5">
        <div>
          <BackButton fallbackHref={`/${locale}/clinic`} label={locale === "en" ? "Back to overview" : "Quay về tổng quan"} variant="pill" hideIcon />
        </div>
        <ClinicSettingsView
          key={locale}
          locale={locale}
          role={role}
          userEmail={optionalUser?.email}
          clinicName={optionalUser?.name}
        />
      </div>
    );
  }

  if (section === "sos-settings") {
    await requireRole(["clinic_staff", "clinic_admin"], locale as "vi" | "en");
    const common = await getTranslations("common");
    return <div className="space-y-5"><BackButton fallbackHref={`/${locale}/clinic`} label={common("back")} variant="pill" hideIcon/><ClinicSosSettings/></div>;
  }

  if (section === "care-plans") {
    await requireRole(["clinic_staff", "clinic_admin"], locale as "vi" | "en");
    return <ClinicCarePlansView key={locale} locale={locale} />;
  }

  if (section === "appointments") {
    await requireRole(["clinic_staff", "clinic_admin"], locale as "vi" | "en");
    return <ClinicAppointmentsView key={locale} locale={locale} />;
  }

  if (section === "rescue") {
    const { role } = await requireRole(["clinic_staff", "clinic_admin"], locale as "vi" | "en");
    return (
      <div className="space-y-6">
        <div>
          <BackButton fallbackHref={`/${locale}/clinic`} label={locale === "en" ? "Back to overview" : "Quay về tổng quan"} variant="pill" hideIcon />
        </div>
        <ClinicRescueWorkspace canVerify={role === "clinic_admin"} />
      </div>
    );
  }

  if (section === "billing") {
    const { supabase, userId } = await requireRole(["clinic_staff", "clinic_admin"], locale as "vi" | "en");
    const t = await getTranslations("billing");
    const { data: memberships } = await supabase.from("clinic_staff").select("clinic_id").eq("user_id", userId);
    const clinicIds = ((memberships ?? []) as any[]).map((x: any) => x.clinic_id);
    const [ledger, invoices] = clinicIds.length
      ? await Promise.all([
          supabase
            .from("commission_ledger")
            .select("id,source_type,amount_vnd,status,created_at,is_sandbox")
            .in("clinic_id", clinicIds)
            .order("created_at", { ascending: false })
            .limit(100),
          supabase
            .from("invoices")
            .select("invoice_number,status,total_vnd,created_at")
            .in("clinic_id", clinicIds)
            .order("created_at", { ascending: false })
            .limit(50),
        ])
      : [{ data: [] }, { data: [] }];
    const total = ((ledger.data ?? []) as any[]).reduce((sum: number, row: any) => sum + Number(row.amount_vnd), 0);
    return (
      <div className="grid gap-6">
        <div>
          <BackButton fallbackHref={`/${locale}/clinic`} label={locale === "en" ? "Back to overview" : "Quay về tổng quan"} variant="pill" hideIcon />
        </div>
        <header>
          <h1 className="font-display text-3xl font-bold">{t("clinicFinance")}</h1>
          <p className="mt-2 text-muted-foreground">{t("clinicFinanceIntro")}</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">{t("commissionTotal")}</p>
            <p className="mt-2 text-2xl font-bold">
              {new Intl.NumberFormat(locale, { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(
                total
              )}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{t("sandboxOnly")}</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">{t("statementCount")}</p>
            <p className="mt-2 text-2xl font-bold">{invoices.data?.length ?? 0}</p>
          </Card>
        </div>
        <Card className="p-5">
          <h2 className="font-display text-xl font-bold">{t("generateStatement")}</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {clinicIds.map((clinicId: string) => (
              <a
                key={clinicId}
                href={`/api/clinic/billing/statement?clinic_id=${encodeURIComponent(clinicId)}&locale=${locale}`}
                className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
              >
                {t("downloadStatement")}: {clinicId.slice(0, 8)}
              </a>
            ))}
          </div>
        </Card>
        <Card className="overflow-x-auto p-5">
          <h2 className="font-display text-xl font-bold">{t("commissionLedger")}</h2>
          {!ledger.data?.length ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("noLedger")}</p>
          ) : (
            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="p-2">{t("sourceType")}</th>
                  <th className="p-2">{t("amount")}</th>
                  <th className="p-2">{t("statusLabel")}</th>
                  <th className="p-2">{t("dateLabel")}</th>
                </tr>
              </thead>
              <tbody>
                {((ledger.data ?? []) as any[]).map((row: any) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="p-2">
                      {row.source_type === "booking"
                        ? t("bookingCommission")
                        : row.source_type === "sos"
                        ? t("sosCommission")
                        : t("otherCommission")}
                    </td>
                    <td className="p-2">
                      {new Intl.NumberFormat(locale, {
                        style: "currency",
                        currency: "VND",
                        maximumFractionDigits: 0,
                      }).format(Number(row.amount_vnd))}
                    </td>
                    <td className="p-2">{row.is_sandbox ? t("sandboxOnly") : row.status}</td>
                    <td className="p-2">
                      {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(row.created_at))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card className="overflow-x-auto p-5">
          <h2 className="font-display text-xl font-bold">{t("invoices")}</h2>
          {!invoices.data?.length ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("noInvoices")}</p>
          ) : (
            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="p-2">{t("number")}</th>
                  <th className="p-2">{t("amount")}</th>
                  <th className="p-2">{t("statusLabel")}</th>
                </tr>
              </thead>
              <tbody>
                {((invoices.data ?? []) as any[]).map((row: any) => (
                  <tr key={row.invoice_number} className="border-t border-border">
                    <td className="p-2">{row.invoice_number}</td>
                    <td className="p-2">
                      {new Intl.NumberFormat(locale, {
                        style: "currency",
                        currency: "VND",
                        maximumFractionDigits: 0,
                      }).format(Number(row.total_vnd))}
                    </td>
                    <td className="p-2">{t(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    );
  }

  if (section === "records" || section === "pet-records" || section === "patients") {
    await requireRole(["clinic_staff", "clinic_admin"], locale as "vi" | "en");
    return (
      <div className="space-y-4">
        <div>
          <BackButton fallbackHref={`/${locale}/clinic`} label={locale === "en" ? "Back to overview" : "Quay về tổng quan"} variant="pill" hideIcon />
        </div>
        <ClinicPetRecordsView key={locale} locale={locale} />
      </div>
    );
  }

  const t = await getTranslations("clinic");
  return (
    <Card className="p-6">
      <h1 className="font-display text-3xl font-bold">{t("appointments")}</h1>
      <Link href={`/${locale}/clinic`} className="mt-5 inline-block font-semibold text-primary underline">
        {t("overview")}
      </Link>
    </Card>
  );
}
