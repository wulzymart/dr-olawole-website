import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { CurrencyProvider } from "@/components/site/price";
import { getSite } from "@/lib/data";

export const revalidate = 300;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const site = await getSite();
  return (
    <CurrencyProvider>
      <Header site={site} />
      <main id="main">{children}</main>
      <Footer site={site} />
    </CurrencyProvider>
  );
}
