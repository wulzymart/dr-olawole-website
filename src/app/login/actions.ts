"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/utils";

export type LoginState = { ok: boolean; message: string };

/**
 * Passwordless sign-in. A link is only sent when the address matches the
 * administrator email, and the reply is identical either way so the form
 * cannot be used to discover which address is the admin's.
 */
export async function sendSignInLink(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const generic = { ok: true, message: "If that is the administrator address, a sign-in link is on its way. Check your inbox." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, message: "Enter a valid email address." };

  const { data } = await createAdminClient().from("app_config").select("value").eq("key", "admin_email").maybeSingle();
  if (!data || data.value.toLowerCase() !== email) return generic;

  // Rate limit by letting Supabase's own limits apply; surface a friendly message if hit.
  const h = await headers();
  const origin = h.get("origin") || siteUrl();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) {
    if (/rate|seconds|limit/i.test(error.message)) return { ok: false, message: "Too many requests. Please wait a minute and try again." };
    console.error("sendSignInLink", error.message);
    return { ok: false, message: "Could not send the link. Please try again shortly." };
  }
  return generic;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
