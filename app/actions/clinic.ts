"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";
import {
  getPortalDatabase,
  persistPortalDatabase,
  resolveClinicAccount,
} from "@/lib/portal-store/server-store";

export interface ClinicProfileData {
  id: string;
  name: string;
  licenseNumber: string;
  chiefVet: string;
  facilityType: "private_clinic" | "hospital" | "emergency_center";
  address: string;
  city: string;
  phone: string;
  hotline?: string;
  email: string;
  openHours: string;
  closeHours: string;
  is247: boolean;
  hasHomeVisit: boolean;
  services: string[];
  bio?: string;
  createdAt: string;
}

export async function ensureClinicSessionAction(locale: "vi" | "en" = "vi") {
  const cookieStore = await cookies();
  const existingCookie = cookieStore.get("pawcare_dev_session");
  if (!existingCookie?.value) {
    const devUser = {
      sub: "dev-clinic-admin-id",
      email: "clinic@pawcare.vn",
      role: "clinic_admin",
      name: locale === "en" ? "Veterinary Clinic Admin" : "Quản lý cơ sở thú y PawCare",
    };
    cookieStore.set("pawcare_dev_session", JSON.stringify(devUser), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return { success: true };
}

export async function saveClinicProfileAction(
  data: ClinicProfileData,
  options?: { completeOnboarding?: boolean; locale?: "vi" | "en" }
) {
  try {
    const db = getPortalDatabase();
    const clinicAcc = resolveClinicAccount(data.email || "clinic@pawcare.vn");
    clinicAcc.profile = {
      ...clinicAcc.profile,
      ...data,
    };
    clinicAcc.name = data.name || clinicAcc.name;
    clinicAcc.onboardingCompleted = true;
    persistPortalDatabase(db);
  } catch {}

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.from("clinics").upsert({
        id: data.id,
        name: data.name,
        address: `${data.address}, ${data.city}`,
        phone: data.phone,
        status: "verified",
      });
    } catch (e) {
      console.error("Error saving clinic to supabase:", e);
    }
  }
  if (options?.completeOnboarding) {
    const cookieStore = await cookies();
    cookieStore.set("pawcare_clinic_registered", "1", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    cookieStore.delete("pawcare_clinic_onboarding");
    const targetLocale = options.locale === "en" ? "en" : "vi";
    redirect(`/${targetLocale}/clinic/settings?activated=1`);
  }
  return { success: true, clinicId: data.id };
}
