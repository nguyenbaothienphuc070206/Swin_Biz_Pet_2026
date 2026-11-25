import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { revokeMockGrant } from "@/modules/passport/mock-share-store";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ petId: string; grantId: string }> }
) {
  const { petId, grantId } = await context.params;
  const locale = request.nextUrl.pathname.match(/^\/(vi|en)(?:\/|$)/)?.[1] || "vi";
  const { supabase, userId } = await requireRole(["owner"], locale as "vi" | "en");

  if (isSupabaseConfigured()) {
    const { error } = await supabase
      .from("record_access_grants")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", grantId)
      .eq("owner_id", userId)
      .eq("pet_id", petId);

    if (error) {
      return NextResponse.json({ error: "revoke_failed", detail: error.message }, { status: 500 });
    }
  } else {
    revokeMockGrant(grantId);
  }

  return NextResponse.json({ success: true, revokedAt: new Date().toISOString() });
}

