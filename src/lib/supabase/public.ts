import { createClient } from "@supabase/supabase-js";

/**
 * Cookie-free anonymous client for public pages. Because it never reads
 * cookies, pages that use it can be statically generated and revalidated.
 * RLS still applies: only published posts, active services and public
 * settings are visible.
 */
export function createPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
