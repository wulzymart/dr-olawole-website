"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/#consultations", label: "Consultations" },
  { href: "/about", label: "About" },
  { href: "/articles", label: "Articles" },
  { href: "/book", label: "Book a consultation" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="top-0 max-w-none translate-y-0 rounded-t-none sm:max-w-none" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Menu</DialogTitle>
        <nav aria-label="Mobile" className="grid gap-1 pt-6">
          {NAV.map((n) => (
            <DialogClose asChild key={n.href}>
              <Link href={n.href} className="rounded-xl px-3 py-3.5 font-display text-3xl font-medium tracking-tight hover:bg-mint-100">
                {n.label}
              </Link>
            </DialogClose>
          ))}
        </nav>
      </DialogContent>
    </Dialog>
  );
}
