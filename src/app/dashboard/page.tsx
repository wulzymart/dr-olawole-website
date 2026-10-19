import Link from "next/link";
import { DateTime } from "luxon";
import { AlertTriangle, ArrowRight, CheckCircle2, Circle, Phone, Video } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { loadSettings } from "@/lib/booking/core";
import { secretStatus } from "@/lib/secrets";
import { fmtDateTime, fmtTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { MODE_LABEL, type Booking } from "@/lib/types";
import { PageHeader } from "@/components/dashboard/page-header";
import { BookingStatusBadge } from "@/components/dashboard/status";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function Overview() {
  const { supabase } = await requireAdmin();
  const { site, priv } = await loadSettings();
  const zone = site.timezone;
  const now = DateTime.now().setZone(zone);
  const dayStart = now.startOf("day").toUTC().toISO()!;
  const dayEnd = now.endOf("day").toUTC().toISO()!;
  const weekEnd = now.plus({ days: 7 }).endOf("day").toUTC().toISO()!;

  const [today, week, verify, drafts, upcoming, refunds, services, hours, keys] = await Promise.all([
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "confirmed").gte("start_at", dayStart).lte("start_at", dayEnd),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "confirmed").gte("start_at", now.toUTC().toISO()!).lte("start_at", weekEnd),
    supabase.from("bookings").select("*").eq("status", "awaiting_verification").order("created_at"),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("bookings").select("*").eq("status", "confirmed").gte("end_at", now.toUTC().toISO()!).order("start_at").limit(6),
    supabase.from("bookings").select("*").eq("status", "cancelled").eq("payment_status", "paid").order("created_at", { ascending: false }),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("availability_rules").select("id", { count: "exact", head: true }),
    secretStatus(),
  ]);

  const toVerify = (verify.data ?? []) as Booking[];
  const next = (upcoming.data ?? []) as Booking[];
  const toRefund = (refunds.data ?? []) as Booking[];

  const paymentsReady =
    (priv.payments.paystack && keys.paystack_secret.saved) ||
    (priv.payments.flutterwave && keys.flutterwave_secret.saved) ||
    (priv.payments.bank_transfer && Boolean(priv.bank_details.account_number));
  const setup = [
    { done: (services.count ?? 0) > 0, label: "Add a consultation type with a price", href: "/dashboard/services" },
    { done: (hours.count ?? 0) > 0, label: "Set your weekly hours", href: "/dashboard/schedule" },
    { done: paymentsReady, label: "Switch on a way to get paid", href: "/dashboard/settings?tab=payments" },
    { done: keys.resend_api_key.saved && keys.email_from.saved, label: "Connect email so patients get confirmations", href: "/dashboard/settings?tab=integrations" },
    { done: Boolean(priv.default_meet_url), label: "Add your Google Meet link", href: "/dashboard/settings?tab=booking" },
    { done: Boolean(site.contact_email), label: "Add the email where you want booking alerts", href: "/dashboard/settings?tab=profile" },
  ].filter((s) => !s.done);

  const stats = [
    { label: "Today", value: today.count ?? 0, hint: "consultations" },
    { label: "Next 7 days", value: week.count ?? 0, hint: "consultations" },
    { label: "To verify", value: toVerify.length, hint: "bank transfers", alert: toVerify.length > 0 },
    { label: "Drafts", value: drafts.count ?? 0, hint: "articles" },
  ];

  return (
    <>
      <PageHeader title={`Good ${now.hour < 12 ? "morning" : now.hour < 17 ? "afternoon" : "evening"}, ${site.short_name.replace(/^Dr\.?\s+/i, "")}`} description={now.toFormat("cccc d LLLL yyyy")}>
        <Button asChild variant="outline">
          <Link href="/dashboard/articles/new">Write an article</Link>
        </Button>
        <Button asChild>
          <Link href="/dashboard/bookings">All consultations</Link>
        </Button>
      </PageHeader>

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className={s.alert ? "border-coral-400 bg-coral-400/10" : undefined}>
            <CardContent className="p-5">
              <dt className="text-sm font-semibold text-muted-foreground">{s.label}</dt>
              <dd className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-4xl font-semibold tabular-nums">{s.value}</span>
                <span className="text-sm text-muted-foreground">{s.hint}</span>
              </dd>
            </CardContent>
          </Card>
        ))}
      </dl>

      {(toVerify.length > 0 || toRefund.length > 0) && (
        <section aria-labelledby="attention" className="mt-10">
          <h2 id="attention" className="mb-3 flex items-center gap-2 font-display text-2xl font-semibold">
            <AlertTriangle className="size-5 text-coral-700" aria-hidden /> Needs your attention
          </h2>
          <Card>
            <ul className="divide-y">
              {toVerify.map((b) => (
                <li key={b.id}>
                  <Link href={`/dashboard/bookings/${b.id}`} className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-mint-50">
                    <span>
                      <span className="block font-semibold">{b.patient_name} says they have paid {formatMoney(b.amount_minor, b.currency)}</span>
                      <span className="text-sm text-muted-foreground">
                        {b.service_name}, {fmtDateTime(b.start_at, zone)}. Check your bank, then confirm.
                      </span>
                    </span>
                    <BookingStatusBadge status={b.status} />
                  </Link>
                </li>
              ))}
              {toRefund.map((b) => (
                <li key={b.id}>
                  <Link href={`/dashboard/bookings/${b.id}`} className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-mint-50">
                    <span>
                      <span className="block font-semibold">{b.patient_name} paid but has no appointment</span>
                      <span className="text-sm text-muted-foreground">{b.cancelled_reason ?? "Rebook or refund this patient."}</span>
                    </span>
                    <span className="text-sm font-semibold text-coral-700">Rebook or refund</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section aria-labelledby="next">
          <div className="mb-3 flex items-end justify-between">
            <h2 id="next" className="font-display text-2xl font-semibold">Coming up</h2>
            <Link href="/dashboard/bookings" className="inline-flex items-center gap-1 text-sm font-semibold text-coral-700 underline-offset-4 hover:underline">
              See all <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <Card>
            {next.length === 0 ? (
              <CardContent className="py-12 text-center">
                <p className="font-display text-xl font-semibold">No consultations booked yet</p>
                <p className="mx-auto mt-1 max-w-[40ch] text-muted-foreground">
                  When a patient books and pays, it appears here. Share the booking page to get started.
                </p>
              </CardContent>
            ) : (
              <ul className="divide-y">
                {next.map((b) => {
                  const start = DateTime.fromISO(b.start_at).setZone(zone);
                  return (
                    <li key={b.id}>
                      <Link href={`/dashboard/bookings/${b.id}`} className="flex items-center gap-5 p-5 hover:bg-mint-50">
                        <div className="w-16 shrink-0 text-center">
                          <div className="text-xs font-semibold text-muted-foreground">{start.toFormat("ccc")}</div>
                          <div className="font-display text-3xl font-semibold leading-none">{start.toFormat("d")}</div>
                          <div className="text-xs text-muted-foreground">{start.toFormat("LLL")}</div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{b.patient_name}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {fmtTime(b.start_at, zone)} to {fmtTime(b.end_at, zone)}, {b.service_name}
                          </p>
                        </div>
                        <span className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex" title={MODE_LABEL[b.meeting_mode]}>
                          {b.meeting_mode === "meet" ? <Video className="size-4" aria-hidden /> : <Phone className="size-4" aria-hidden />}
                          {b.meeting_mode === "meet" ? "Meet" : b.meeting_mode === "whatsapp" ? "WhatsApp" : "Phone"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </section>

        <section aria-labelledby="setup">
          <h2 id="setup" className="mb-3 font-display text-2xl font-semibold">{setup.length ? "Finish setting up" : "You are all set"}</h2>
          <Card>
            <CardContent className="p-2">
              {setup.length === 0 ? (
                <p className="flex items-center gap-3 p-4 text-muted-foreground">
                  <CheckCircle2 className="size-5 text-emerald-700" aria-hidden /> Everything needed to take bookings is in place.
                </p>
              ) : (
                <ul>
                  {setup.map((s) => (
                    <li key={s.label}>
                      <Link href={s.href} className="flex items-center gap-3 rounded-xl p-3.5 font-medium hover:bg-mint-50">
                        <Circle className="size-5 shrink-0 text-pine-900/35" aria-hidden />
                        <span className="flex-1">{s.label}</span>
                        <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
}
