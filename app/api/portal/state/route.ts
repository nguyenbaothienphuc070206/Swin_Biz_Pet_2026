import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getOptionalUser } from "@/lib/auth/server";
import { parseRole, type AppRole } from "@/lib/auth/roles";
import {
  getPortalDatabase,
  persistPortalDatabase,
  resetPortalDatabase,
  getScopedPortalState,
  resolveOwnerAccount,
  resolveClinicAccount,
  syncOwnerPetsToBackend,
  syncClinicPetsToBackend,
  syncAppointmentsToBackend,
  syncCarePlansToBackend,
} from "@/lib/portal-store/server-store";

const syncMutationSchema = z.object({
  action: z.enum([
    "sync_storage_key",
    "sync_owner_pets",
    "sync_clinic_pets",
    "sync_appointments",
    "sync_care_plans",
    "sync_care_plan_chat",
    "sync_sos_lead",
    "sync_user_profile",
    "sync_clinic_profile",
    "sync_weight_history",
    "sync_plan",
    "sync_reminders",
  ]),
  key: z.string().optional(),
  ownerIdentifier: z.string().optional(),
  petId: z.string().optional(),
  planId: z.string().optional(),
  payload: z.unknown(),
});

const accountSwitchSchema = z.object({
  action: z.enum(["switch_account", "reset_database"]),
  targetEmail: z.string().email().optional(),
  role: z.enum(["owner", "clinic_admin", "clinic_staff"]).optional(),
});

export async function GET(request: NextRequest) {
  const user = await getOptionalUser();
  const queryEmail = request.nextUrl.searchParams.get("email");
  const queryRole = parseRole(request.nextUrl.searchParams.get("role"));

  const state = getScopedPortalState({
    userId: user?.id,
    email: queryEmail || user?.email,
    role: (queryRole || user?.role || "owner") as AppRole,
  });

  return NextResponse.json(
    {
      success: true,
      sessionUser: user,
      ...state,
    },
    {
      headers: { "cache-control": "no-store, max-age=0" },
    }
  );
}

export async function POST(request: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = syncMutationSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const user = await getOptionalUser();
  const { action, key, ownerIdentifier, petId, planId, payload } = parsed.data;
  const actorId = ownerIdentifier || user?.email || user?.id || "owner-premium-01";
  const isClinicActor = user?.role === "clinic_admin" || user?.role === "clinic_staff";
  const db = getPortalDatabase();

  switch (action) {
    case "sync_owner_pets": {
      if (Array.isArray(payload)) {
        syncOwnerPetsToBackend(actorId, payload as any);
      }
      break;
    }
    case "sync_clinic_pets": {
      if (Array.isArray(payload)) {
        syncClinicPetsToBackend(payload as any);
      }
      break;
    }
    case "sync_appointments": {
      if (Array.isArray(payload)) {
        syncAppointmentsToBackend(payload as any, isClinicActor ? undefined : actorId);
      }
      break;
    }
    case "sync_care_plans": {
      if (Array.isArray(payload)) {
        syncCarePlansToBackend(
          payload as any,
          isClinicActor,
          isClinicActor ? "clinic" : "owner"
        );
      }
      break;
    }
    case "sync_care_plan_chat": {
      if (planId && Array.isArray(payload)) {
        db.carePlanChats[planId] = payload as any;
        persistPortalDatabase(db);
      }
      break;
    }
    case "sync_sos_lead": {
      db.activeSosLead = (payload as any) || null;
      persistPortalDatabase(db);
      break;
    }
    case "sync_user_profile": {
      if (payload && typeof payload === "object") {
        const ownerAcc = resolveOwnerAccount(actorId);
        ownerAcc.profile = {
          ...ownerAcc.profile,
          ...(payload as any),
          updatedAt: new Date().toISOString(),
        };
        ownerAcc.onboardingCompleted = true;
        // Propagate updated owner name/phone/address into paired pets & clinic records
        for (const pid of ownerAcc.petIds) {
          if (db.ownerPets[pid]) {
            db.ownerPets[pid].ownerName = ownerAcc.profile.fullName;
            db.ownerPets[pid].ownerPhone = ownerAcc.profile.phone;
          }
          if (db.clinicPetRecords[pid]) {
            db.clinicPetRecords[pid].owner.name = ownerAcc.profile.fullName;
            db.clinicPetRecords[pid].owner.phone = ownerAcc.profile.phone;
            db.clinicPetRecords[pid].owner.address = ownerAcc.profile.address;
          }
        }
        persistPortalDatabase(db);
      }
      break;
    }
    case "sync_clinic_profile": {
      if (payload && typeof payload === "object") {
        const clinicAcc = resolveClinicAccount(user?.email || user?.id);
        const incoming = payload as any;
        if (incoming.profile) {
          clinicAcc.profile = { ...clinicAcc.profile, ...incoming.profile };
          clinicAcc.name = clinicAcc.profile.name;
        } else if (incoming.name && incoming.address) {
          clinicAcc.profile = { ...clinicAcc.profile, ...incoming };
          clinicAcc.name = clinicAcc.profile.name;
        }
        if (incoming.settings && typeof incoming.settings === "object") {
          clinicAcc.settings = { ...clinicAcc.settings, ...incoming.settings };
        }
        clinicAcc.onboardingCompleted = true;
        persistPortalDatabase(db);
      }
      break;
    }
    case "sync_weight_history": {
      if (petId && Array.isArray(payload)) {
        db.weightHistoryByPet[petId] = payload as any;
        const latestWeight = Number((payload as any)[0]?.weightKg);
        if (latestWeight > 0) {
          if (db.ownerPets[petId]) db.ownerPets[petId].weightKg = latestWeight;
          if (db.clinicPetRecords[petId]) db.clinicPetRecords[petId].weightKg = latestWeight;
        }
        persistPortalDatabase(db);
      }
      break;
    }
    case "sync_plan": {
      const ownerAcc = resolveOwnerAccount(actorId);
      ownerAcc.plan = payload === "free" ? "free" : "premium";
      persistPortalDatabase(db);
      break;
    }
    case "sync_reminders": {
      if (Array.isArray(payload)) {
        const ownerAcc = resolveOwnerAccount(actorId);
        db.remindersByOwner[ownerAcc.id] = payload as any;
        persistPortalDatabase(db);
      }
      break;
    }
    case "sync_storage_key": {
      if (!key) break;
      if (key === "pawcare-user-pets" && Array.isArray(payload)) {
        syncOwnerPetsToBackend(actorId, payload as any);
      } else if (key === "pawcare-clinic-pet-records" && Array.isArray(payload)) {
        syncClinicPetsToBackend(payload as any);
      } else if (key === "pawcare-appointments" && Array.isArray(payload)) {
        syncAppointmentsToBackend(payload as any, isClinicActor ? undefined : actorId);
      } else if (key === "pawcare-care-plans" && Array.isArray(payload)) {
        syncCarePlansToBackend(
          payload as any,
          isClinicActor,
          isClinicActor ? "clinic" : "owner"
        );
      } else if (key.startsWith("pawcare_chat_") && Array.isArray(payload)) {
        const extractedPlanId = key.replace("pawcare_chat_", "");
        db.carePlanChats[extractedPlanId] = payload as any;
        persistPortalDatabase(db);
      } else if (key === "pawcare-active-sos-lead") {
        db.activeSosLead = (payload as any) || null;
        persistPortalDatabase(db);
      } else if (key === "pawcare-user-profile" && payload && typeof payload === "object") {
        const ownerAcc = resolveOwnerAccount(actorId);
        ownerAcc.profile = {
          ...ownerAcc.profile,
          ...(payload as any),
          updatedAt: new Date().toISOString(),
        };
        persistPortalDatabase(db);
      } else if (
        (key === "pawcare-clinic-profile" || key === "pawcare-registered-clinic") &&
        payload &&
        typeof payload === "object"
      ) {
        const clinicAcc = resolveClinicAccount(user?.email || user?.id);
        clinicAcc.profile = { ...clinicAcc.profile, ...(payload as any) };
        clinicAcc.name = clinicAcc.profile.name;
        persistPortalDatabase(db);
      } else if (key === "pawcare-clinic-portal-settings" && payload && typeof payload === "object") {
        const clinicAcc = resolveClinicAccount(user?.email || user?.id);
        clinicAcc.settings = { ...clinicAcc.settings, ...(payload as any) };
        persistPortalDatabase(db);
      } else if (key.startsWith("pawcare-weight-history-") && Array.isArray(payload)) {
        const extractedPetId = key.replace("pawcare-weight-history-", "");
        db.weightHistoryByPet[extractedPetId] = payload as any;
        const latestWeight = Number((payload as any)[0]?.weightKg);
        if (latestWeight > 0) {
          if (db.ownerPets[extractedPetId]) db.ownerPets[extractedPetId].weightKg = latestWeight;
          if (db.clinicPetRecords[extractedPetId]) db.clinicPetRecords[extractedPetId].weightKg = latestWeight;
        }
        persistPortalDatabase(db);
      } else if (key === "pawcare_active_pet_id" && typeof payload === "string") {
        const ownerAcc = resolveOwnerAccount(actorId);
        ownerAcc.activePetId = payload;
        persistPortalDatabase(db);
      } else if (
        (key === "pawcare_subscription_plan" || key === "pawcare_plan") &&
        (payload === "premium" || payload === "free")
      ) {
        const ownerAcc = resolveOwnerAccount(actorId);
        ownerAcc.plan = payload;
        persistPortalDatabase(db);
      } else if (key === "pawcare-care-reminders" && Array.isArray(payload)) {
        const ownerAcc = resolveOwnerAccount(actorId);
        db.remindersByOwner[ownerAcc.id] = payload as any;
        persistPortalDatabase(db);
      }
      break;
    }
  }

  const updatedState = getScopedPortalState({
    userId: user?.id,
    email: ownerIdentifier || user?.email,
    role: (user?.role || "owner") as AppRole,
  });

  return NextResponse.json({
    success: true,
    ...updatedState,
  });
}

export async function PUT(request: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = accountSwitchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  if (parsed.data.action === "reset_database") {
    resetPortalDatabase();
    return NextResponse.json({ success: true, reset: true });
  }

  const cookieStore = await cookies();
  const targetRole = parsed.data.role || "owner";

  if (targetRole === "clinic_admin" || targetRole === "clinic_staff") {
    const clinicAcc = resolveClinicAccount(parsed.data.targetEmail || "clinic@pawcare.vn");
    const devUser = {
      sub: clinicAcc.id,
      email: clinicAcc.email,
      role: targetRole as AppRole,
      name: clinicAcc.name,
    };
    cookieStore.set("pawcare_dev_session", JSON.stringify(devUser), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
    });
    const state = getScopedPortalState({
      userId: clinicAcc.id,
      email: clinicAcc.email,
      role: targetRole,
    });
    return NextResponse.json({ success: true, sessionUser: devUser, ...state });
  }

  const ownerAcc = resolveOwnerAccount(parsed.data.targetEmail || "yen.le@pawcare.vn");
  const devUser = {
    sub: ownerAcc.id,
    email: ownerAcc.email,
    role: "owner" as AppRole,
    name: ownerAcc.profile.fullName,
  };
  cookieStore.set("pawcare_dev_session", JSON.stringify(devUser), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  });
  const state = getScopedPortalState({
    userId: ownerAcc.id,
    email: ownerAcc.email,
    role: "owner",
  });
  return NextResponse.json({ success: true, sessionUser: devUser, ...state });
}
