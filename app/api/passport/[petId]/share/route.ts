import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  generateShareToken,
  hashShareToken,
  hashPin,
  calculateExpiryDate,
  createShareGrantSchema,
  type ShareType,
  type SharePreset,
} from "@/modules/passport/share-service";
import { saveMockGrant, findMockGrantByTokenOrHash } from "@/modules/passport/mock-share-store";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ petId: string }> }
) {
  const { petId } = await context.params;
  const locale = request.nextUrl.pathname.match(/^\/(vi|en)(?:\/|$)/)?.[1] || "vi";
  const { supabase, userId } = await requireRole(["owner"], locale as "vi" | "en");

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = createShareGrantSchema.safeParse({ ...body, petId });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { shareType, preset, scopes, pin, includeOwnerContact, label } = parsed.data;
  const token = generateShareToken();
  const tokenHash = hashShareToken(token);
  const pinHash = pin ? hashPin(pin) : null;
  const expiresAt = calculateExpiryDate(preset as SharePreset);

  const grantId = crypto.randomUUID();

  if (isSupabaseConfigured()) {
    const { data: petCheck } = await supabase
      .from("pets")
      .select("id")
      .eq("id", petId)
      .eq("owner_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!petCheck) {
      return NextResponse.json({ error: "pet_not_found_or_not_owned" }, { status: 404 });
    }

    const { error: insertErr } = await supabase.from("record_access_grants").insert({
      id: grantId,
      owner_id: userId,
      pet_id: petId,
      consent: `QR Share Grant (${shareType}) authorized under Decree 13/2023/ND-CP`,
      expires_at: expiresAt.toISOString(),
      scopes,
      share_token_hash: tokenHash,
      share_type: shareType,
      pin_hash: pinHash,
      include_owner_contact: includeOwnerContact,
      label: label || (shareType === "rabies_verification" ? "Vòng cổ / Xác nhận dại" : "Chia sẻ hồ sơ y bạ"),
    });

    if (insertErr) {
      return NextResponse.json({ error: "database_insert_failed", detail: insertErr.message }, { status: 500 });
    }
  } else {
    // Dev mock store
    saveMockGrant({
      id: grantId,
      petId,
      ownerId: userId,
      shareType: shareType as ShareType,
      preset: preset as SharePreset,
      scopes,
      pinHash,
      includeOwnerContact,
      label: label || (shareType === "rabies_verification" ? "Vòng cổ / Xác nhận dại" : "Chia sẻ hồ sơ y bạ"),
      tokenHash,
      token,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      accessLogs: [],
    });
  }

  const origin = request.nextUrl.origin;
  const shareUrl = `${origin}/${locale}/records/verify/${token}`;

  return NextResponse.json({
    success: true,
    grantId,
    token,
    shareUrl,
    shareType,
    expiresAt: expiresAt.toISOString(),
    requiresPin: Boolean(pin),
    includeOwnerContact,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ petId: string }> }
) {
  const { petId } = await context.params;
  const locale = request.nextUrl.pathname.match(/^\/(vi|en)(?:\/|$)/)?.[1] || "vi";
  const { supabase, userId } = await requireRole(["owner"], locale as "vi" | "en");

  if (isSupabaseConfigured()) {
    const { data: grants, error } = await supabase
      .from("record_access_grants")
      .select("id, pet_id, share_type, scopes, expires_at, revoked_at, created_at, label, include_owner_contact, share_access_logs(*)")
      .eq("pet_id", petId)
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "database_query_failed" }, { status: 500 });
    }
    return NextResponse.json({ grants });
  }

  // Fallback mock grants for pet
  return NextResponse.json({
    grants: [
      {
        id: "mock-grant-1",
        pet_id: petId,
        share_type: "rabies_verification",
        scopes: ["profile", "vaccinations"],
        expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
        label: "Mã QR vòng cổ cố định",
        includeOwnerContact: false,
        accessLogs: [
          {
            id: "log-1",
            accessedAt: new Date(Date.now() - 3600000).toISOString(),
            ipHash: "9a7f...12c",
            deviceType: "mobile",
            action: "view",
            coarseLocation: "Quận 1, TP.HCM",
          },
        ],
      },
    ],
  });
}

