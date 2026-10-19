import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { ServiceManager } from "@/components/dashboard/service-manager";
import type { Service } from "@/lib/types";

export default async function ServicesPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("services").select("*").order("sort_order").order("duration_minutes");
  return (
    <>
      <PageHeader title="Prices and durations" description="The consultation options patients choose from. Set a naira price for Nigeria and a dollar price for everywhere else." />
      <ServiceManager services={(data ?? []) as Service[]} />
    </>
  );
}
