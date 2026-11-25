"use server";
import {redirect} from "next/navigation";
import {cookies, headers} from "next/headers";
import {z} from "zod";
import {createClient, isSupabaseConfigured} from "@/lib/supabase/server";
import {canAccessRole, homeForRole, parseRole, type AppRole} from "@/lib/auth/roles";

const credentials = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

function safeNext(value: FormDataEntryValue | null, defaultTarget = "") {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") && !path.startsWith("//") ? path : defaultTarget;
}

function resolveTargetUrl(locale: string, path: string | null | undefined, defaultPath: string): string {
  let target = (path && path !== "/settings" && path !== "") ? path : defaultPath;
  if (target.startsWith(`/${locale}/`)) {
    target = target.slice(locale.length + 1);
  } else if (target === `/${locale}`) {
    target = "/";
  }
  if (!target.startsWith("/")) {
    target = `/${target}`;
  }
  return target === "/" ? `/${locale}` : `/${locale}${target}`;
}

export async function signInAction(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "vi";
  const context = formData.get("context") === "clinic" ? "clinic" : "owner";
  // Default target for pet owners is the onboarding setup wizard (/owner/setup), for clinics is /clinic
  const defaultTarget = context === "clinic" ? "/clinic" : "/owner/setup";

  const rawEmail = String(formData.get("email") || "").trim().toLowerCase();
  const rawPassword = String(formData.get("password") || "").trim();

  const parsed = credentials.safeParse({
    email: rawEmail,
    password: rawPassword,
  });
  if (!parsed.success) {
    const isShortPassword = rawPassword.length < 8;
    const isBadEmail = !rawEmail.includes("@");
    const errCode = isShortPassword ? "password_too_short" : isBadEmail ? "invalid_email" : "invalid";
    redirect(`/${locale}/sign-in?error=${errCode}&context=${context}`);
  }

  const rawNext = safeNext(formData.get("next"), defaultTarget);
  const target = rawNext === "/settings" || rawNext === "" ? defaultTarget : rawNext;

  if (!isSupabaseConfigured()) {
    // In local development without Supabase credentials, sign in with a local dev session
    const cookieStore = await cookies();
    const devUser = {
      sub: context === "clinic" ? "dev-clinic-id" : "dev-owner-id",
      email: parsed.data.email,
      role: (context === "clinic" ? "clinic_admin" : "owner") as AppRole,
      name: parsed.data.email.split("@")[0],
    };
    cookieStore.set("pawcare_dev_session", JSON.stringify(devUser), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
    });
    if (!target.includes("clinic-profile-setup")) {
      cookieStore.delete("pawcare_clinic_onboarding");
    }
    redirect(resolveTargetUrl(locale, target, defaultTarget));
  }

  const supabase = await createClient();
  const {error} = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("email not confirmed")) {
      redirect(`/${locale}/sign-in?error=email_not_confirmed`);
    }
    if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
      redirect(`/${locale}/sign-in?error=invalid_credentials&context=${context}`);
    }
    redirect(`/${locale}/sign-in?error=invalid&context=${context}`);
  }

  redirect(resolveTargetUrl(locale, target, defaultTarget));
}

export async function signUpAction(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "vi";
  const intent = formData.get("context") === "clinic" ? "clinic" : "owner";
  const rawEmail = String(formData.get("email") || "").trim().toLowerCase();
  const rawPassword = String(formData.get("password") || "").trim();
  const rawName = String(formData.get("name") || "").trim();

  const parsed = credentials
    .extend({name: z.string().trim().min(1).max(100)})
    .safeParse({
      email: rawEmail,
      password: rawPassword,
      name: rawName || (intent === "clinic" ? "Cơ sở y tế PawCare" : "Chủ nuôi"),
    });

  if (!parsed.success) {
    const isShortPassword = rawPassword.length < 8;
    const isBadEmail = !rawEmail.includes("@");
    const errCode = isShortPassword ? "password_too_short" : isBadEmail ? "invalid_email" : "invalid";
    redirect(`/${locale}/sign-up?error=${errCode}&context=${intent}`);
  }

  const defaultTarget = intent === "clinic" ? "/clinic-profile-setup" : "/owner/setup";
  const rawNext = safeNext(formData.get("next"), defaultTarget);
  const target = rawNext === "/settings" || rawNext === "" ? defaultTarget : rawNext;

  if (!isSupabaseConfigured()) {
    // In local development without Supabase credentials, log in immediately with the new PawCare profile!
    const cookieStore = await cookies();
    const devUser = {
      sub: intent === "clinic" ? `dev-clinic-${Date.now()}` : `dev-owner-${Date.now()}`,
      email: parsed.data.email,
      role: (intent === "clinic" ? "clinic_admin" : "owner") as AppRole,
      name: parsed.data.name,
    };
    cookieStore.set("pawcare_dev_session", JSON.stringify(devUser), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
    });
    if (intent === "clinic") {
      cookieStore.set("pawcare_clinic_onboarding", "1", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60,
      });
      cookieStore.delete("pawcare_clinic_registered");
    } else {
      cookieStore.delete("pawcare_clinic_onboarding");
    }
    redirect(resolveTargetUrl(locale, target, defaultTarget));
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const callbackUrl = new URL("/auth/callback", siteUrl);
  callbackUrl.searchParams.set("locale", locale);
  if (intent === "clinic") callbackUrl.searchParams.set("context", "clinic");
  if (target) callbackUrl.searchParams.set("next", target);

  const {data, error} = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.name,
        onboarding_intent: intent,
      },
      emailRedirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already registered") || msg.includes("already in use") || msg.includes("exists")) {
      redirect(`/${locale}/sign-up?error=email_exists`);
    }
    redirect(`/${locale}/sign-up?error=invalid`);
  }

  if (intent === "clinic") {
    const cookieStore = await cookies();
    cookieStore.set("pawcare_clinic_onboarding", "1", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60,
    });
    cookieStore.delete("pawcare_clinic_registered");
  }

  // After registration, redirect to sign-in page to log in again with the newly created PawCare credentials
  const nextParam = target ? `&next=${encodeURIComponent(target)}` : "";
  redirect(`/${locale}/sign-in?registered=1&context=${intent}${nextParam}`);
}

export async function googleSignInAction(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "vi";
  const context = formData.get("context") === "clinic" ? "clinic" : "owner";
  const mode = formData.get("mode") === "sign-up" ? "sign-up" : "sign-in";
  const next = safeNext(formData.get("next"));

  const mainPath = context === "clinic" ? (mode === "sign-up" ? "/clinic-profile-setup" : "/clinic") : "/owner/setup";

  if (!isSupabaseConfigured()) {
    // When Supabase is not yet configured, simulate a Google/Gmail login for preview testing
    const cookieStore = await cookies();
    const devUser = {
      sub: "dev-google-user-id",
      email: "google-user@gmail.com",
      role: context === "clinic" ? "clinic_admin" : "owner",
      name: locale === "en" ? "Google Demo Account" : "Tài khoản Google Demo",
    };
    cookieStore.set("pawcare_dev_session", JSON.stringify(devUser), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
    });
    if (context === "clinic" && mode === "sign-up") {
      cookieStore.set("pawcare_clinic_onboarding", "1", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60,
      });
      cookieStore.delete("pawcare_clinic_registered");
    } else {
      cookieStore.delete("pawcare_clinic_onboarding");
    }

    redirect(resolveTargetUrl(locale, next, mainPath));
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const callbackUrl = new URL("/auth/callback", siteUrl);
  callbackUrl.searchParams.set("locale", locale);
  if (context === "clinic") callbackUrl.searchParams.set("context", "clinic");
  if (next && next !== "/owner" && next !== "/clinic" && next !== "/settings") {
    callbackUrl.searchParams.set("next", next);
  }

  const {data, error} = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    console.error("Google OAuth initialization error:", error);
    redirect(`/${locale}/sign-in?error=oauth_error`);
  }

  redirect(data.url);
}

export async function devSignInAction(formData: FormData) {
  const roleInput = formData.get("role");
  const role = parseRole(roleInput) ?? "owner";
  const locale = formData.get("locale") === "en" ? "en" : "vi";
  const next = safeNext(formData.get("next"));

  const cookieStore = await cookies();
  const roleNames: Record<AppRole, string> = {
    owner: "",
    clinic_staff: locale === "en" ? "Demo Clinic Staff" : "Nhân viên phòng khám",
    clinic_admin: locale === "en" ? "Demo Clinic Manager" : "Quản lý phòng khám",
    platform_admin: locale === "en" ? "Demo Platform Admin" : "Quản trị viên nền tảng",
  };

  const devUser = {
    sub: `dev-${role}-id`,
    email: role === "owner" ? "owner@pawcare.vn" : `dev-${role}@pawcare.vn`,
    role,
    name: (roleNames[role] || (role === "owner" ? "Chủ nuôi PawCare" : "Người dùng thử nghiệm")),
  };

  cookieStore.set("pawcare_dev_session", JSON.stringify(devUser), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  });
  if (!next.includes("clinic-profile-setup")) {
    cookieStore.delete("pawcare_clinic_onboarding");
  }

  const defaultTarget =
    role === "clinic_admin" || role === "clinic_staff"
      ? "/clinic"
      : role === "platform_admin"
      ? "/admin"
      : "/owner/setup";
  redirect(resolveTargetUrl(locale, next, defaultTarget));
}

export async function signOutAction(formData?: FormData) {
  const cookieStore = await cookies();
  cookieStore.delete("pawcare_dev_session");
  cookieStore.delete("pawcare_clinic_onboarding");
  cookieStore.delete("pawcare_clinic_registered");
  cookieStore.set("pawcare_dev_session", "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax",
  });
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
  }

  let locale = "vi";
  if (formData && typeof formData.get === "function") {
    const l = formData.get("locale");
    if (l === "en" || l === "vi") locale = l;
  }
  if (locale === "vi") {
    try {
      const headerList = await headers();
      const referer = headerList.get("referer") || "";
      if (referer.includes("/en/") || referer.endsWith("/en")) {
        locale = "en";
      }
    } catch {}
  }
  redirect(`/${locale}/sign-in`);
}
