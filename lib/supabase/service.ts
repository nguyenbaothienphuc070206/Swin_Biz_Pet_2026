import "server-only";
import {createClient as createSupabaseClient} from "@supabase/supabase-js";
import {createDevMockSupabaseClient} from "@/lib/supabase/mock";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return createDevMockSupabaseClient("service-role-admin") as any;
  }
  return createSupabaseClient(url, key, {auth: {autoRefreshToken: false, persistSession: false}});
}
