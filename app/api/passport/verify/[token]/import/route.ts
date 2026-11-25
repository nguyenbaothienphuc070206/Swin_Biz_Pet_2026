import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { hashShareToken } from "@/modules/passport/share-service";
import { findMockGrantByTokenOrHash } from "@/modules/passport/mock-share-store";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const locale = request.nextUrl.pathname.match(/^\/(vi|en)(?:\/|$)/)?.[1] || "vi";

  // Receiving clinic must be authenticated as clinic_staff or clinic_admin
  const { supabase, userId } = await requireRole(["clinic_staff", "clinic_admin"], locale as "vi" | "en");

  let clinicId: string | null = null;
  let body: any = {};
  try {
    body = await request.json();
    clinicId = body?.clinicId || null;
  } catch {}

  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const db = createServiceClient();

    // If clinicId not provided, get staff's clinic
    if (!clinicId) {
      const { data: staff } = await supabase
        .from("clinic_staff")
        .select("clinic_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      clinicId = staff?.clinic_id;
    }

    if (!clinicId) {
      return NextResponse.json({ error: "clinic_membership_required" }, { status: 403 });
    }

    const tokenHash = hashShareToken(token);
    const { data: grant } = await db
      .from("record_access_grants")
      .select("id, pet_id")
      .eq("share_token_hash", tokenHash)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!grant) {
      return NextResponse.json({ error: "grant_expired_or_invalid" }, { status: 404 });
    }

    // Call stored procedure to safely import and audit
    const { data: importResult, error: importErr } = await db.rpc(
      "import_shared_patient_record",
      {
        p_grant_id: grant.id,
        p_receiving_clinic: clinicId,
      }
    );

    if (importErr) {
      return NextResponse.json({ error: "import_failed", detail: importErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Hồ sơ y bạ đã được tiếp nhận thành công vào cơ sở phòng khám.",
      petId: grant.pet_id,
      clinicId,
    });
  }

  // Dev / Mock fallback
  const mockGrant = findMockGrantByTokenOrHash(token);
  return NextResponse.json({
    success: true,
    message: "Hồ sơ y bạ đã được tiếp nhận thành công vào cơ sở phòng khám (Demo mode).",
    petId: mockGrant?.petId || "demo-pet-mochi",
    clinicId: clinicId || "vetcare-d3",
  });
}

