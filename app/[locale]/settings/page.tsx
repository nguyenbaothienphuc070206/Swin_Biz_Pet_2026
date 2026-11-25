import {redirect} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {requireRole} from "@/lib/auth/server";
import {requestPrivacyAction} from "@/app/actions/settings";
import {PersonalSettingsView} from "@/components/settings/personal-settings-view";

export const dynamic="force-dynamic";

export default async function SettingsPage({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{saved?:string;requested?:string;error?:string}>}) {
  const [{locale},query]=await Promise.all([params,searchParams]);
  const {supabase,userId,role}=await requireRole(["owner","clinic_staff","clinic_admin","platform_admin"],locale as "vi"|"en");
  if(role==="clinic_staff"||role==="clinic_admin") redirect(`/${locale}/clinic/settings`);
  const t=await getTranslations("settings");
  const common=await getTranslations("common");

  const [{data:profile},{data:grants},{data:consents},{data:authUser}]=await Promise.all([
    supabase.from("profiles").select("full_name,phone,preferred_locale,email_notifications,appointment_reminders").eq("id",userId).maybeSingle(),
    supabase.from("record_access_grants").select("id,pet_id,clinic_id,expires_at,revoked_at").eq("owner_id",userId).is("revoked_at",null).order("created_at",{ascending:false}),
    supabase.from("consents").select("id,consent_type,granted_at,revoked_at").eq("user_id",userId).order("granted_at",{ascending:false}),
    supabase.auth.getUser(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        {query.saved && <p role="status" className="rounded-xl bg-secondary p-4">{common("saved")}</p>}
        {query.requested && <p role="status" className="rounded-xl bg-secondary p-4">{t("requested")}</p>}
        {query.error && <p role="alert" className="text-destructive">{common("retry")}</p>}

        <PersonalSettingsView
          initialProfile={{
            full_name: profile?.full_name ?? authUser?.user?.user_metadata?.full_name,
            email: authUser?.user?.email,
            phone: profile?.phone ?? "",
          }}
          role={role}
        />

        {/* Advanced Data Export & Privacy Controls */}
        <div className="mx-auto max-w-5xl">
          <details className="group rounded-2xl border border-border bg-card p-5 text-xs">
            <summary className="font-bold text-muted-foreground hover:text-foreground cursor-pointer select-none">
              {locale === "en" ? "▸ Advanced Privacy & Data Grants" : "▸ Quyền riêng tư & Cấp quyền y bạ nâng cao"}
            </summary>
            <div className="mt-4 space-y-4 pt-3 border-t border-border">
              <div>
                <h3 className="font-semibold">{t("consents")}</h3>
                {consents?.length ? (
                  <ul className="mt-2 list-inside list-disc text-muted-foreground">
                    {consents.map((item: any) => (
                      <li key={item.id}>
                        {item.consent_type} · {new Intl.DateTimeFormat(locale).format(new Date(item.granted_at))}
                        {item.revoked_at ? " · revoked" : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-muted-foreground">—</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold">{t("grants")}</h3>
                {grants?.length ? (
                  <ul className="mt-2 grid gap-2">
                    {grants.map((grant: any) => (
                      <li key={grant.id} className="rounded-xl bg-secondary/70 p-3">
                        {grant.clinic_id} · {grant.pet_id}
                        {grant.expires_at ? ` · ${new Intl.DateTimeFormat(locale).format(new Date(grant.expires_at))}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-muted-foreground">{t("noGrants")}</p>
                )}
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <a href="/api/account/export" className="rounded-full border border-border px-4 py-2 font-semibold hover:bg-muted">
                  {t("requestExport")}
                </a>
                <form action={requestPrivacyAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="kind" value="delete" />
                  <button className="rounded-full bg-destructive/10 text-destructive px-4 py-2 font-semibold hover:bg-destructive/20">
                    {t("requestDelete")}
                  </button>
                </form>
              </div>
            </div>
          </details>
        </div>
      </main>
    </div>
  );
}
