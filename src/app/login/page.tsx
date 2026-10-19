import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

const NOTICES: Record<string, string> = {
  "not-admin": "That account does not have dashboard access.",
  "link-expired": "That sign-in link has expired or was already used. Request a new one.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (isAdmin) redirect("/dashboard");
  }
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden bg-pine-900 p-14 text-cream lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="font-display text-2xl font-semibold">← Back to the website</Link>
        <p className="display-2 max-w-md">Care for patients. Write for everyone.</p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <h1 className="display-3">Dashboard sign in</h1>
          <p className="mt-3 text-muted-foreground">Enter your email and we will send you a one-time link. No password to remember.</p>
          <div className="mt-8">
            <LoginForm notice={error ? NOTICES[error] : undefined} />
          </div>
          <Link href="/" className="mt-10 inline-block text-sm text-muted-foreground underline lg:hidden">Back to the website</Link>
        </div>
      </div>
    </div>
  );
}
