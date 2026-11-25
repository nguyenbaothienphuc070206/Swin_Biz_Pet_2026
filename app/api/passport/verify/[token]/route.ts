import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  hashShareToken,
  verifyPin,
  hashClientIp,
  detectDeviceType,
  projectSharedRecord,
  type ShareType,
} from "@/modules/passport/share-service";
import {
  findMockGrantByTokenOrHash,
  logMockShareAccess,
} from "@/modules/passport/mock-share-store";

// Simple in-memory rate limiter for PIN brute-force prevention
const failedPinAttempts = new Map<string, { count: number; lockedUntil: number }>();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = request.headers.get("user-agent") || "";
  const deviceType = detectDeviceType(userAgent);
  const ipHash = hashClientIp(ip);

  let body: any = {};
  try {
    body = await request.json();
  } catch {}

  const providedPin = body?.pin ? String(body.pin).trim() : undefined;

  // Brute-force rate limiting check
  const rateKey = `${ipHash}:${token.slice(0, 10)}`;
  const attempts = failedPinAttempts.get(rateKey);
  if (attempts && attempts.lockedUntil > Date.now()) {
    return NextResponse.json(
      { error: "too_many_attempts", message: "Quá nhiều lần thử sai mã PIN. Vui lòng thử lại sau 5 phút." },
      { status: 429 }
    );
  }

  const tokenHash = hashShareToken(token);

  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const db = createServiceClient();

    // Find active grant
    const { data: grant, error: grantErr } = await db
      .from("record_access_grants")
      .select("id, pet_id, owner_id, share_type, scopes, expires_at, revoked_at, pin_hash, include_owner_contact")
      .eq("share_token_hash", tokenHash)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (grantErr || !grant) {
      return NextResponse.json(
        { error: "not_found_or_expired", message: "Mã QR hoặc liên kết chia sẻ không tồn tại hoặc đã hết hạn." },
        { status: 404 }
      );
    }

    // Check PIN requirement
    if (grant.pin_hash) {
      if (!providedPin) {
        return NextResponse.json({
          requiresPin: true,
          petSummary: { name: "Thú cưng PawCare" },
          message: "Liên kết này được bảo vệ bằng mã PIN.",
        });
      }
      if (!verifyPin(providedPin, grant.pin_hash)) {
        const current = attempts ? attempts.count + 1 : 1;
        failedPinAttempts.set(rateKey, {
          count: current,
          lockedUntil: current >= 5 ? Date.now() + 5 * 60 * 1000 : 0,
        });
        return NextResponse.json(
          { requiresPin: true, error: "invalid_pin", message: "Mã PIN không chính xác." },
          { status: 401 }
        );
      }
    }

    // Fetch pet details
    const { data: pet } = await db
      .from("pets")
      .select("id, name, species, breed, birth_date, microchip")
      .eq("id", grant.pet_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (!pet) {
      return NextResponse.json({ error: "pet_not_found" }, { status: 404 });
    }

    // Fetch vaccinations
    const { data: vaxList } = await db
      .from("vaccinations")
      .select("vaccine_name, code, dose, lot, administered_at, next_due_at, is_demo")
      .eq("pet_id", grant.pet_id)
      .order("administered_at", { ascending: false });

    // Fetch medications
    const { data: rxList } = await db
      .from("prescriptions")
      .select("medication_name, dose, started_at, instructions")
      .eq("pet_id", grant.pet_id);

    // Fetch allergies
    const { data: allergies } = await db
      .from("pet_allergies")
      .select("name, severity, source")
      .eq("pet_id", grant.pet_id);

    // Fetch conditions
    const { data: conditions } = await db
      .from("pet_conditions")
      .select("name, status, source")
      .eq("pet_id", grant.pet_id);

    // Fetch owner contact if allowed
    let ownerContact = undefined;
    if (grant.include_owner_contact) {
      const { data: owner } = await db
        .from("profiles")
        .select("full_name, phone")
        .eq("id", grant.owner_id)
        .maybeSingle();
      if (owner) {
        ownerContact = { name: owner.full_name, phone: owner.phone };
      }
    }

    const rawPet = {
      ...pet,
      vaccinations: (vaxList ?? []).map((v: any) => ({
        name: v.vaccine_name,
        date: v.administered_at,
        nextDue: v.next_due_at,
        lot: v.lot,
        clinic: "PawCare Partner Clinic",
      })),
      medications: (rxList ?? []).map((r: any) => ({
        name: r.medication_name,
        dose: r.dose,
        instructions: r.instructions,
      })),
      allergies: allergies ?? [],
      conditions: conditions ?? [],
      ownerContact,
    };

    // Log the access per Decree 13/2023/ND-CP
    await db.rpc("log_share_access", {
      p_grant_id: grant.id,
      p_ip_hash: ipHash,
      p_user_agent: userAgent.slice(0, 200),
      p_device_type: deviceType,
      p_coarse_location: "Ho Chi Minh City",
      p_action: "view",
      p_metadata: { pin_verified: Boolean(grant.pin_hash) },
    });

    const projection = projectSharedRecord(rawPet, {
      id: grant.id,
      shareType: grant.share_type as ShareType,
      scopes: grant.scopes,
      expiresAt: grant.expires_at,
      includeOwnerContact: grant.include_owner_contact,
    });

    return NextResponse.json({ success: true, projection });
  }

  // Fallback Dev / Mock Store
  const mockGrant = findMockGrantByTokenOrHash(token);
  if (!mockGrant) {
    // Return sample projection for direct demo token verification
    const fallbackPet = {
      id: "demo-pet-mochi",
      name: "Mochi",
      species: "dog",
      breed: "Corgi Wales Pembroke",
      gender: "male",
      birthDate: "2022-03-15",
      weightKg: 11.5,
      microchip: "982000412345678",
      vaccinations: [
        {
          name: "Vắc-xin phòng dại Rabisin (Boehringer Ingelheim)",
          date: "2026-05-10",
          nextDue: "2027-05-10",
          lot: "RAB-2026-09",
          clinic: "Phòng khám Thú y Bác Sĩ Tâm · Quận 3",
        },
        {
          name: "Vanguard Plus 5/CV-L (Phòng 7 bệnh chó)",
          date: "2026-05-10",
          nextDue: "2027-05-10",
          lot: "VG-2026-44",
          clinic: "Phòng khám Thú y Bác Sĩ Tâm · Quận 3",
        },
      ],
      medications: [
        { name: "NexGard Spectra 7.5 - 15kg", dose: "1 viên", instructions: "Uống phòng ve rận & giun tim" },
      ],
      allergies: [{ name: "Dị ứng đạm bò", severity: "trung bình" }],
      conditions: [{ name: "Viêm da tiếp xúc cơ địa", status: "ổn định" }],
    };

    const isRabiesMode = token.includes("rabies") || token.includes("collar");
    const projection = projectSharedRecord(fallbackPet, {
      id: "demo-grant-default",
      shareType: isRabiesMode ? "rabies_verification" : "full_record",
      scopes: ["profile", "vaccinations", "medications", "allergies", "conditions"],
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      includeOwnerContact: false,
    });

    return NextResponse.json({ success: true, projection });
  }

  // If mock grant has PIN
  if (mockGrant.pinHash) {
    if (!providedPin) {
      return NextResponse.json({
        requiresPin: true,
        petSummary: { name: "Thú cưng PawCare" },
        message: "Hồ sơ y bạ được bảo vệ bằng mã PIN.",
      });
    }
    if (!verifyPin(providedPin, mockGrant.pinHash)) {
      return NextResponse.json(
        { requiresPin: true, error: "invalid_pin", message: "Mã PIN không chính xác." },
        { status: 401 }
      );
    }
  }

  logMockShareAccess(mockGrant.id, {
    ipHash,
    userAgent,
    deviceType,
    action: "view",
    coarseLocation: "TP. Hồ Chí Minh",
  });

  const samplePet = {
    id: mockGrant.petId,
    name: "Mochi",
    species: "dog",
    breed: "Corgi Wales Pembroke",
    gender: "male",
    birthDate: "2022-03-15",
    weightKg: 11.5,
    microchip: "982000412345678",
    vaccinations: [
      {
        name: "Vắc-xin phòng dại Rabisin",
        date: "2026-05-10",
        nextDue: "2027-05-10",
        lot: "RAB-2026-09",
        clinic: "Phòng khám Thú y Bác Sĩ Tâm · Quận 3",
      },
      {
        name: "Vanguard Plus 5/CV-L (Phòng 7 bệnh)",
        date: "2026-05-10",
        nextDue: "2027-05-10",
        lot: "VG-2026-44",
        clinic: "Phòng khám Thú y Bác Sĩ Tâm · Quận 3",
      },
    ],
    medications: [
      { name: "NexGard Spectra 7.5 - 15kg", dose: "1 viên", instructions: "Uống phòng ve rận & giun tim" },
    ],
    allergies: [{ name: "Dị ứng đạm bò", severity: "trung bình" }],
    conditions: [{ name: "Viêm da dị ứng nhẹ", status: "đang kiểm soát" }],
    ownerContact: mockGrant.includeOwnerContact
      ? { name: "Nguyễn Văn An", phone: "0908 123 456", district: "Quận 3, TP.HCM" }
      : undefined,
  };

  const projection = projectSharedRecord(samplePet, {
    id: mockGrant.id,
    shareType: mockGrant.shareType,
    scopes: mockGrant.scopes,
    expiresAt: mockGrant.expiresAt,
    includeOwnerContact: mockGrant.includeOwnerContact,
  });

  return NextResponse.json({ success: true, projection });
}

