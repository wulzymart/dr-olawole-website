import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarClock, ShieldCheck, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/site/price";
import { getPosts, getServices, getSite } from "@/lib/data";
import { nextAvailable } from "@/lib/booking/next";
import { siteUrl } from "@/lib/utils";

const PROOF = [
  { k: "Training", v: "Resident Doctor, Family Medicine, Lagos University Teaching Hospital" },
  { k: "Experience", v: "Nearly a decade across public and private hospitals" },
  { k: "Recognition", v: "Doctor of the Year 2022, Solid Rock Hospital" },
  { k: "Life support", v: "BLS and ACLS certified, 2024" },
];

export default async function HomePage() {
  const [site, services, posts] = await Promise.all([getSite(), getServices(), getPosts({ limit: 3 })]);
  const next = await nextAvailable(services, site.timezone);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: site.doctor_name,
    medicalSpecialty: "Family medicine",
    url: siteUrl(),
    image: `${siteUrl()}${site.photo_url ?? "/images/doctor.jpg"}`,
    description: site.short_bio,
    availableService: services.map((s) => ({ "@type": "MedicalProcedure", name: s.name })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8 lg:pb-28 lg:pt-20">
          <div>
            <p className="rise text-lg font-medium text-pine-700" style={{ "--d": "0ms" } as React.CSSProperties}>
              {site.doctor_name}, {site.post_nominals}
            </p>
            <h1 className="display-1 rise mt-5 max-w-[12ch]" style={{ "--d": "90ms" } as React.CSSProperties}>
              {site.headline}
            </h1>
            <p className="lede rise mt-7 measure" style={{ "--d": "200ms" } as React.CSSProperties}>
              {site.tagline}
            </p>
            <div className="rise mt-10 flex flex-wrap items-center gap-4" style={{ "--d": "300ms" } as React.CSSProperties}>
              <Button asChild size="lg" variant="coral">
                <Link href="/book">Book a consultation</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/articles">Read the articles</Link>
              </Button>
            </div>
          </div>

          <div className="rise relative mx-auto w-full max-w-md lg:max-w-none" style={{ "--d": "250ms" } as React.CSSProperties}>
            <div aria-hidden className="absolute -right-4 top-6 h-full w-full rounded-t-[999px] rounded-b-[2rem] bg-mint-200 lg:-right-6" />
            <div className="relative overflow-hidden rounded-t-[999px] rounded-b-[2rem] bg-white shadow-lift">
              <Image
                src={site.photo_url ?? "/images/doctor.jpg"}
                alt={`Portrait of ${site.doctor_name}`}
                width={1029}
                height={1149}
                priority
                sizes="(min-width: 1024px) 40vw, 90vw"
                className="aspect-[4/5] h-auto w-full object-cover object-top"
              />
            </div>
            {next && (
              <Link
                href="/book"
                className="group absolute -bottom-6 left-3 right-3 flex items-center gap-4 rounded-2xl bg-pine-900 p-4 text-cream shadow-lift transition-transform hover:-translate-y-0.5 sm:left-auto sm:right-[-1.5rem] sm:w-72"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-coral-400 text-pine-950">
                  <CalendarClock className="size-5" />
                </span>
                <span className="leading-tight">
                  <span className="block text-sm text-mint-200">Next available</span>
                  <span className="block font-display text-xl font-semibold">
                    {next.day}, {next.time}
                  </span>
                </span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Credentials */}
      <section className="bg-pine-900 text-cream" aria-label="Background">
        <dl className="mx-auto grid max-w-7xl gap-x-10 gap-y-8 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          {PROOF.map((p) => (
            <div key={p.k} className="border-l-2 border-coral-400 pl-5">
              <dt className="text-sm font-medium text-mint-200">{p.k}</dt>
              <dd className="mt-1.5 font-display text-xl leading-snug">{p.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Consultations */}
      <section id="consultations" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 sm:px-8 lg:py-32">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="display-2">Time to talk it through</h2>
            <p className="lede mt-6 measure">
              Choose the length that fits your question. Every consultation ends with clear next steps in writing.
            </p>
            <ul className="mt-8 grid gap-4 text-[0.98rem]">
              <li className="flex items-start gap-3"><Video className="mt-1 size-5 shrink-0 text-coral-700" />Video on Google Meet, or a call by phone or WhatsApp</li>
              <li className="flex items-start gap-3"><ShieldCheck className="mt-1 size-5 shrink-0 text-coral-700" />Private. Your details are used only for your care</li>
            </ul>
          </div>

          <ul className="divide-y divide-border border-y border-border">
            {services.length === 0 && (
              <li className="py-10 text-muted-foreground">Consultation options will appear here soon.</li>
            )}
            {services.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/book?service=${s.slug}`}
                  className="group grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-3 py-8 transition-colors hover:bg-mint-50 sm:grid-cols-[7rem_1fr_auto] sm:px-4 sm:-mx-4"
                >
                  <p className="font-display text-5xl font-medium leading-none tracking-tight text-pine-800 sm:text-6xl">
                    {s.duration_minutes}
                    <span className="ml-1 text-lg font-normal text-muted-foreground">min</span>
                  </p>
                  <div>
                    <h3 className="font-display text-2xl font-semibold leading-tight">{s.name}</h3>
                    <p className="mt-1.5 text-muted-foreground">{s.summary}</p>
                  </div>
                  <div className="col-span-2 flex items-center justify-between gap-6 sm:col-span-1 sm:flex-col sm:items-end sm:gap-2">
                    <p className="font-display text-2xl font-semibold"><Price service={s} /></p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-coral-700 group-hover:underline">
                      Book this <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How booking works: a real sequence, so numbered */}
      <section className="bg-mint-100">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
          <h2 className="display-3 max-w-xl">Booking takes about two minutes</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {[
              ["Pick a time", "Choose a consultation and a slot that suits you. Times show in your own time zone."],
              ["Pay securely", "Pay by card or bank transfer. Your slot is held while you complete payment."],
              ["Meet and follow up", "Join at the time. Afterwards you receive a written summary of the plan."],
            ].map(([t, d], i) => (
              <li key={t} className="relative border-t-2 border-pine-900 pt-6">
                <span className="font-display text-sm font-semibold text-coral-700">Step {i + 1}</span>
                <h3 className="mt-2 font-display text-2xl font-semibold">{t}</h3>
                <p className="mt-2 text-pine-800/85">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Approach */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
          <div>
            <h2 className="display-2">Good medicine listens first</h2>
            <p className="lede mt-6 measure">
              {site.short_bio ||
                "I combine scientific evidence with empathy, clear communication and respect for each person's circumstances."}
            </p>
            <Button asChild variant="outline" className="mt-8">
              <Link href="/about">More about me</Link>
            </Button>
          </div>
          <dl className="grid gap-8">
            {site.approach.slice(0, 4).map((a) => (
              <div key={a.title} className="grid gap-1 border-t border-border pt-6 sm:grid-cols-[14rem_1fr] sm:gap-8">
                <dt className="font-display text-xl font-semibold leading-snug">{a.title}</dt>
                <dd className="text-muted-foreground">{a.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Articles */}
      {posts.length > 0 && (
        <section className="border-t border-border bg-white">
          <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 className="display-2 max-w-xl">Health facts, in plain language</h2>
              <Link href="/articles" className="inline-flex items-center gap-2 font-semibold text-coral-700 hover:underline">
                All articles <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="mt-14 grid gap-x-8 gap-y-12 md:grid-cols-3">
              {posts.map((p) => (
                <Link key={p.id} href={`/articles/${p.slug}`} className="group block">
                  <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-mint-100">
                    {p.cover_url && (
                      <Image
                        src={p.cover_url}
                        alt={p.cover_alt ?? ""}
                        width={800}
                        height={600}
                        sizes="(min-width: 768px) 33vw, 100vw"
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    )}
                  </div>
                  {p.category && <p className="mt-5 text-sm font-semibold text-coral-700">{p.category}</p>}
                  <h3 className="mt-1.5 font-display text-2xl font-semibold leading-tight group-hover:underline">{p.title}</h3>
                  <p className="mt-2 line-clamp-3 text-muted-foreground">{p.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Closing call */}
      <section className="bg-pine-900 text-cream">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-5 py-20 sm:px-8 md:flex-row md:items-center md:justify-between">
          <h2 className="display-2 max-w-2xl">Have a health question that needs a real answer?</h2>
          <Button asChild size="lg" variant="coral">
            <Link href="/book">Book a consultation</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
