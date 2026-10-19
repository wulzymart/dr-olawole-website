import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

/**
 * Every dashboard page and action calls this. It checks the session with
 * Supabase (not just a cookie) and that the user is in the admins table.
 * The returned client acts as the user, so database RLS applies too.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/login?error=not-admin");
  return { supabase, user };
}
