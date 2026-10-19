import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { DashboardNav } from "@/components/dashboard/nav";
import { getSite } from "@/lib/data";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireAdmin();
  const site = await getSite();
  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "awaiting_verification");

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="bg-pine-950 text-cream lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:p-5">
        <div className="flex items-center justify-between gap-3 px-4 py-4 lg:mb-6 lg:px-2 lg:py-0">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-coral-400 font-display text-lg font-semibold text-pine-950">
              {initials(site.short_name)}
            </span>
            <span className="leading-tight">
              <span className="block font-display text-lg font-semibold">{site.short_name}</span>
              <span className="block text-xs text-mint-200/70">Practice dashboard</span>
            </span>
          </Link>
          <Link href="/" target="_blank" className="rounded-full p-2 text-mint-200/80 hover:bg-white/10 lg:hidden" aria-label="View website">
            <ExternalLink className="size-5" />
          </Link>
        </div>
        <div className="px-3 pb-3 lg:flex-1 lg:px-0 lg:pb-0">
          <DashboardNav badge={count ?? 0} />
        </div>
        <div className="hidden border-t border-white/10 pt-4 lg:block">
          <Link href="/" target="_blank" className="mb-1 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.95rem] font-semibold text-mint-200/85 hover:bg-white/10 hover:text-cream">
            <ExternalLink className="size-[1.15rem]" aria-hidden /> View website
          </Link>
          <form action={signOut}>
            <button className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[0.95rem] font-semibold text-mint-200/85 hover:bg-white/10 hover:text-cream">
              <LogOut className="size-[1.15rem]" aria-hidden /> Sign out
            </button>
          </form>
          <p className="mt-3 truncate px-3.5 text-xs text-mint-200/55">{user.email}</p>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="flex justify-end px-4 pt-3 lg:hidden">
          <form action={signOut}>
            <button className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-pine-900 hover:bg-mint-100">
              <LogOut className="size-4" aria-hidden /> Sign out
            </button>
          </form>
        </div>
        <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 lg:py-12">
          {children}
        </main>
      </div>
    </div>
  );
}
