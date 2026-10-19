import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource-variable/dm-sans/index.css";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { getSite } from "@/lib/data";
import { siteUrl } from "@/lib/utils";

export const viewport: Viewport = {
  themeColor: "#0b3b3c",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  const title = `${site.doctor_name}, ${site.specialty}`;
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: `%s | ${site.short_name}` },
    description: site.seo_description ?? site.tagline,
    openGraph: {
      type: "website",
      siteName: site.doctor_name,
      title,
      description: site.seo_description ?? site.tagline,
      images: [{ url: site.photo_url ?? "/images/doctor.jpg" }],
    },
    twitter: { card: "summary_large_image" },
    alternates: { canonical: "/" },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-pine-900 focus:px-5 focus:py-3 focus:text-cream"
        >
          Skip to content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
