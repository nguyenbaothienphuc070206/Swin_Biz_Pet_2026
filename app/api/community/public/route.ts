import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { privateSignedUrlExpiry } from "@/modules/security/signed-url";

export async function GET() {
  if (!isSupabaseConfigured()) return Response.json({ lostFound: [], strays: [], neighborhoods: [], rescues: [] });
  const supabase = await createClient();
  const [lost, strays, neighborhoods, rescues, images] = await Promise.all([
    supabase.rpc("public_lost_found_map", { p_limit: 250 }),
    supabase.rpc("public_stray_map", { p_limit: 250 }),
    supabase.rpc("public_stray_neighborhood_counts"),
    supabase.rpc("public_rescue_cases", { p_limit: 50 }),
    supabase.rpc("community_public_images"),
  ]);
  if (lost.error || strays.error || neighborhoods.error || rescues.error || images.error) return Response.json({ error: "community_unavailable" }, { status: 503 });
  const imageRows=(images.data??[]) as Array<{target_type:string;target_id:string;image_path:string}>;
  const signedImages=await Promise.all(imageRows.map(async image=>{const {data}=await supabase.storage.from("community-private").createSignedUrl(image.image_path,privateSignedUrlExpiry(300));return {key:`${image.target_type}:${image.target_id}`,url:data?.signedUrl};}));
  const imageUrls:Record<string,string>={};for(const image of signedImages)if(image.url)imageUrls[image.key]=image.url;
  return Response.json({ lostFound: lost.data ?? [], strays: strays.data ?? [], neighborhoods: neighborhoods.data ?? [], rescues: rescues.data ?? [], imageUrls }, { headers: { "cache-control": "public, max-age=20, stale-while-revalidate=60" } });
}
