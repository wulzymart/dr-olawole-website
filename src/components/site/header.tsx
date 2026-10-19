import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MobileNav } from "./mobile-nav";
import type { SiteSettings } from "@/lib/types";

export const NAV = [
  { href: "/#consultations", label: "Consultations" },
  { href: "/about", label: "About" },
  { href: "/articles", label: "Articles" },
];

export function Header({ site }: { site: SiteSettings }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" className="group flex items-baseline gap-2" aria-label={`${site.doctor_name}, home`}>
          <span className="font-display text-[1.6rem] font-semibold leading-none tracking-tight">{site.short_name}</span>
          <span className="hidden text-sm text-muted-foreground sm:inline">{site.post_nominals}</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-9 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-[0.95rem] font-medium text-foreground/80 transition-colors hover:text-coral-700">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/book">Book a consultation</Link>
          </Button>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
