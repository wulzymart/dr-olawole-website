import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { loadSettings } from "@/lib/booking/core";
import { secretStatus } from "@/lib/secrets";
import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsTabs } from "@/components/dashboard/settings-tabs";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  await requireAdmin();
  const { site, priv } = await loadSettings();
  const secrets = await secretStatus();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const webhookBase = `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
  return (
    <>
      <PageHeader title="Settings" description="Your profile, booking rules, payments and reminders." />
      <SettingsTabs initialTab={tab ?? "profile"} site={site} priv={priv} secrets={secrets} webhookBase={webhookBase} />
    </>
  );
}
