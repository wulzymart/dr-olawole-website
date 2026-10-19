import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSite } from "@/lib/data";
import { sanitizeRich } from "@/lib/sanitize";

export const metadata: Metadata = {
  title: "About",
  description: "Background, training and approach of Dr Olawole Olawale Martins, a Resident Doctor in Family Medicine at LUTH.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const site = await getSite();
  return (
    <>
      <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:pt-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="overflow-hidden rounded-[2rem] bg-white shadow-soft">
            <Image
              src={site.photo_url ?? "/images/doctor.jpg"}
              alt={`Portrait of ${site.doctor_name}`}
              width={1029}
              height={1149}
              priority
              sizes="(min-width: 1024px) 34vw, 90vw"
              className="aspect-[4/5] h-auto w-full object-cover object-top"
            />
          </div>
        </div>
        <div>
          <h1 className="display-1 !text-[clamp(2.4rem,1.5rem+4vw,4.5rem)]">{site.doctor_name}</h1>
          <p className="mt-3 text-xl text-muted-foreground">
            {site.post_nominals}, {site.specialty}
          </p>
          <div className="rich mt-10 measure" dangerouslySetInnerHTML={{ __html: sanitizeRich(site.about_html) }} />
          <div className="mt-10 flex flex-wrap gap-4">
            <Button asChild size="lg" variant="coral"><Link href="/book">Book a consultation</Link></Button>
            {site.contact_email && (
              <Button asChild size="lg" variant="outline"><a href={`mailto:${site.contact_email}`}>Send an enquiry</a></Button>
            )}
          </div>
        </div>
      </section>

      {site.experience.length > 0 && (
        <section className="border-t border-border bg-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <h2 className="display-3">Where I have worked</h2>
            <ol className="relative grid gap-12 border-l border-border pl-8">
              {site.experience.map((e) => (
                <li key={e.role + e.period} className="relative">
                  <span aria-hidden className="absolute -left-[2.45rem] top-2 size-3 rounded-full bg-coral-500 ring-4 ring-white" />
                  <p className="text-sm font-semibold text-coral-700">{e.period}</p>
                  <h3 className="mt-1 font-display text-2xl font-semibold leading-snug">{e.role}</h3>
                  <p className="text-muted-foreground">{e.place}</p>
                  <p className="mt-3 measure">{e.summary}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {site.interests.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <h2 className="display-3 max-w-xl">What I care about in medicine</h2>
          <dl className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {site.interests.map((i) => (
              <div key={i.title} className="border-t border-border pt-5">
                <dt className="font-display text-xl font-semibold">{i.title}</dt>
                <dd className="mt-1.5 text-muted-foreground">{i.detail}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {site.education.length > 0 && (
        <section className="bg-mint-100">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <h2 className="display-3">Education and training</h2>
            <ul className="divide-y divide-pine-900/15 border-y border-pine-900/15">
              {site.education.map((e) => (
                <li key={e.title} className="grid gap-1 py-5 sm:grid-cols-[1fr_auto] sm:gap-8">
                  <div>
                    <p className="font-display text-xl font-semibold">{e.title}</p>
                    {e.place && <p className="text-pine-800/80">{e.place}</p>}
                  </div>
                  <p className="text-pine-800/80 sm:text-right">{e.year}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {site.engagements.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <h2 className="display-3">Invite me to speak or collaborate</h2>
              <p className="lede mt-5 measure">I welcome conversations with organisations that want to improve health awareness.</p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {site.engagements.map((e) => (
                <li key={e} className="rounded-2xl border border-border bg-white p-5 font-medium">{e}</li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
