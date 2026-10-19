import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { enabledMethods, loadSettings } from "@/lib/booking/core";
import { getServices } from "@/lib/data";
import { getVisitorCurrency } from "@/lib/geo";

export const metadata: Metadata = {
  title: "Book a consultation",
  description: "Choose a time and book an online consultation.",
  alternates: { canonical: "/book" },
};

export default async function BookPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  // Currency comes from the visitor's location, decided here on the server.
  const currency = await getVisitorCurrency();
  const [services, { site, priv }] = await Promise.all([getServices(), loadSettings()]);
  const methods = await enabledMethods(priv, currency);

  return (
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
      <header className="max-w-3xl">
        <h1 className="display-1 !text-[clamp(2.6rem,1.6rem+4.4vw,5rem)]">Book a consultation</h1>
        <p className="lede mt-6 measure">
          Choose a time with {site.short_name}. This service is for non-emergency advice. If you need urgent care, go to the nearest hospital.
        </p>
      </header>
      <div className="mt-14">
        <BookingWizard services={services} currency={currency} methods={methods} initialSlug={service} doctorName={site.short_name} />
      </div>
    </div>
  );
}
