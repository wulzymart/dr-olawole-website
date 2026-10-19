import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Finishes the magic-link sign-in and sends the doctor to the dashboard. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const supabase = await createClient();

  let ok = false;
  if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash) ok = !(await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash })).error;

  if (!ok) return NextResponse.redirect(`${origin}/login?error=link-expired`);
  return NextResponse.redirect(`${origin}/dashboard`);
}
