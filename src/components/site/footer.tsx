import Link from "next/link";
import type { SiteSettings } from "@/lib/types";

export function Footer({ site }: { site: SiteSettings }) {
  const socials = Object.entries(site.socials ?? {}).filter(([, v]) => v);
  return (
    <footer className="bg-pine-950 text-mint-100">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-md">
          <p className="font-display text-3xl font-semibold tracking-tight text-cream">{site.doctor_name}</p>
          <p className="mt-1 text-mint-200">{site.specialty}</p>
          <p className="mt-5 text-[0.95rem] leading-relaxed text-mint-100/75">
            Online consultations and plain-language health education. Not a substitute for emergency care.
          </p>
        </div>
        <nav aria-label="Footer" className="grid content-start gap-3 text-[0.95rem]">
          <Link className="hover:text-coral-400" href="/#consultations">Consultations</Link>
          <Link className="hover:text-coral-400" href="/book">Book a consultation</Link>
          <Link className="hover:text-coral-400" href="/articles">Articles</Link>
          <Link className="hover:text-coral-400" href="/about">About</Link>
        </nav>
        <div className="grid content-start gap-3 text-[0.95rem]">
          {site.contact_email && (
            <a className="hover:text-coral-400" href={`mailto:${site.contact_email}`}>{site.contact_email}</a>
          )}
          {site.whatsapp_number && (
            <a className="hover:text-coral-400" href={`https://wa.me/${site.whatsapp_number.replace(/\D/g, "")}`} rel="noopener">
              WhatsApp
            </a>
          )}
          {socials.map(([k, v]) => (
            <a key={k} className="capitalize hover:text-coral-400" href={v} rel="noopener noreferrer" target="_blank">
              {k}
            </a>
          ))}
          {site.location && <p className="text-mint-100/75">{site.location}</p>}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-sm text-mint-100/65 sm:px-8 md:flex-row md:justify-between">
          <p>
            Health information here is educational and does not replace a consultation. In an emergency, go to the nearest hospital.
          </p>
          <p className="flex gap-5">
            <Link className="hover:text-coral-400" href="/privacy">Privacy</Link>
            <Link className="hover:text-coral-400" href="/terms">Terms</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
