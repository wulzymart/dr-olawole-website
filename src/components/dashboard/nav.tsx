"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, FileText, LayoutDashboard, Settings, Stethoscope, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/bookings", label: "Consultations", icon: Stethoscope },
  { href: "/dashboard/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/dashboard/services", label: "Prices and durations", icon: Tag },
  { href: "/dashboard/articles", label: "Articles", icon: FileText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardNav({ badge }: { badge?: number }) {
  const path = usePathname();
  return (
    <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.95rem] font-semibold transition-colors",
              active ? "bg-cream text-pine-900" : "text-mint-200/85 hover:bg-white/10 hover:text-cream",
            )}
          >
            <Icon className="size-[1.15rem]" aria-hidden />
            <span className="whitespace-nowrap">{label}</span>
            {href === "/dashboard/bookings" && badge ? (
              <span className="ml-auto rounded-full bg-coral-400 px-2 py-0.5 text-xs font-bold text-pine-950">{badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
