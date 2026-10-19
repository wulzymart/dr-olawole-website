"use client";

import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingRulesForm, NotificationsForm, PaymentsForm, ProfileForm } from "./settings-forms";
import type { SecretKey } from "@/lib/secrets-meta";
import type { PrivateSettings, SiteSettings } from "@/lib/types";

export function SettingsTabs(p: {
  initialTab: string;
  site: SiteSettings;
  priv: PrivateSettings;
  secrets: Record<SecretKey, { saved: boolean; hint: string | null }>;
  webhookBase: string;
}) {
  const router = useRouter();
  const refresh = () => router.refresh();
  const tab = ["profile", "booking", "payments", "integrations"].includes(p.initialTab) ? p.initialTab : "profile";
  return (
    <Tabs defaultValue={tab}>
      <TabsList className="mb-8 flex-wrap">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="booking">Booking rules</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
        <TabsTrigger value="integrations">Reminders and email</TabsTrigger>
      </TabsList>
      <TabsContent value="profile"><ProfileForm site={p.site} /></TabsContent>
      <TabsContent value="booking"><BookingRulesForm priv={p.priv} /></TabsContent>
      <TabsContent value="payments"><PaymentsForm priv={p.priv} secrets={p.secrets} webhookBase={p.webhookBase} refresh={refresh} /></TabsContent>
      <TabsContent value="integrations"><NotificationsForm priv={p.priv} secrets={p.secrets} refresh={refresh} /></TabsContent>
    </Tabs>
  );
}
