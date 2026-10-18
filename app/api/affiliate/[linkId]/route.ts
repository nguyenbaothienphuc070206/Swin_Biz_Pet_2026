import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSafeAffiliateDestination } from "@/modules/security/outbound-url";

export async function GET(request: Request, context: { params: Promise<{ linkId: string }> }) {
  const { linkId } = await context.params;
  if (!z.string().uuid().safeParse(linkId).success) return Response.json({ error: "invalid_link" }, { status: 400 });
  const supabase = await createClient();
  const { data: link, error } = await supabase.from("affiliate_links").select("id,product_id,destination_url,active,sandbox").eq("id", linkId).eq("active", true).maybeSingle();
  if (error || !link) return Response.json({ error: "link_unavailable" }, { status: 404 });
  let target: URL;
  try { target = new URL(link.destination_url); } catch { return Response.json({ error: "invalid_destination" }, { status: 422 }); }
  if (!isSafeAffiliateDestination(target.toString())) return Response.json({ error: "invalid_destination" }, { status: 422 });
  const { data: user } = await supabase.auth.getUser();
  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "vi";
  await supabase.from("affiliate_clicks").insert({ link_id: link.id, product_id: link.product_id, locale, source: "recommendation", is_sandbox: link.sandbox });
  return Response.redirect(target, 303);
}
