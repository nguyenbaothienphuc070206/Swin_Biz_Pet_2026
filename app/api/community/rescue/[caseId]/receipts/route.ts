import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
const schema = z.object({ amountVnd: z.number().int().positive().max(10_000_000_000), donorAlias: z.string().trim().max(80).nullable().optional(), receiptPath: z.string().min(5).max(500), receiptSha256: z.string().regex(/^[a-f0-9]{64}$/) });
export async function POST(request: Request, context: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await context.params;
  if (!z.string().uuid().safeParse(caseId).success) return Response.json({ error: "invalid_case_id" }, { status: 400 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "invalid_receipt", details: input.error.flatten() }, { status: 400 });
  const { supabase } = await requireRole(["owner"], "vi");
  const value = input.data;
  const { data, error } = await supabase.rpc("submit_donation_receipt", { p_case: caseId, p_amount: value.amountVnd, p_donor_alias: value.donorAlias ?? null, p_path: value.receiptPath, p_sha256: value.receiptSha256 });
  if (error) return Response.json({ error: error.message }, { status: error.message.includes("rate_limited") ? 429 : 400 });
  return Response.json({ donationId: data, status: "receipt_pending_verification", fundsHeldByPawCare: false }, { status: 201 });
}
