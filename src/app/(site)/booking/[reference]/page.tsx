import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { CalendarPlus, CheckCircle2, Clock, Hourglass, Video, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransferForm } from "@/components/booking/transfer-form";
import { getBookingByToken, loadSettings, settlePayment } from "@/lib/booking/core";
import { paystackVerify } from "@/lib/payments/paystack";
import { flutterwaveVerifyByReference } from "@/lib/payments/flutterwave";
import { formatMoney } from "@/lib/money";
import { MODE_LABEL, type Booking } from "@/lib/types";

export const metadata: Metadata = { title: "Your booking", robots: { index: false, follow: false } };

async function refreshIfPaid(b: Booking): Promise<Booking> {
  if (b.status !== "pending_payment" || (b.payment_method !== "paystack" && b.payment_method !== "flutterwave")) return b;
  try {
    const v = b.payment_method === "paystack" ? await paystackVerify(b.reference) : await flutterwaveVerifyByReference(b.reference);
    if (v?.paid) {
      await settlePayment({ reference: b.reference, provider: b.payment_method, paidAmountMinor: v.amountMinor, paidCurrency: v.currency });
      const fresh = await getBookingByToken(b.reference, b.access_token);
      return fresh ?? b;
    }
  } catch {}
  return b;
}

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const [{ reference }, { t }] = await Promise.all([params, searchParams]);
  const found = t ? await getBookingByToken(reference, t) : null;
  if (!found) notFound();
  const b = await refreshIfPaid(found);
  const { site, priv } = await loadSettings();

  const when = DateTime.fromISO(b.start_at).setZone(site.timezone);
  const patientZone = b.patient_timezone && b.patient_timezone !== site.timezone ? DateTime.fromISO(b.start_at).setZone(b.patient_timezone) : null;

  const state =
    b.status === "confirmed" || b.status === "completed"
      ? { icon: CheckCircle2, tone: "text-emerald-700", title: b.status === "completed" ? "Consultation complete" : "You are booked in", body: "A confirmation has been sent to your email." }
      : b.status === "awaiting_verification"
        ? { icon: Hourglass, tone: "text-amber-700", title: "Waiting to confirm your transfer", body: "I will confirm as soon as the payment shows in my account." }
        : b.status === "pending_payment"
          ? { icon: Clock, tone: "text-pine-700", title: b.payment_method === "bank_transfer" ? "Send your transfer to hold this time" : "Payment not completed yet", body: "Your time is held for a short while." }
          : { icon: XCircle, tone: "text-destructive", title: b.status === "expired" ? "This hold has expired" : "This booking was cancelled", body: "You are welcome to book another time." };
  const Icon = state.icon;
  const bank = priv.bank_details;

  return (
    <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8 lg:py-20">
      <div className="flex items-start gap-4">
        <Icon className={`mt-1.5 size-9 shrink-0 ${state.tone}`} />
        <div>
          <h1 className="display-2">{state.title}</h1>
          <p className="lede mt-3">{state.body}</p>
        </div>
      </div>

      <dl className="mt-10 divide-y divide-border rounded-3xl border border-border bg-white px-6">
        {[
          ["Consultation", `${b.service_name}, ${b.duration_minutes} minutes`],
          ["When", `${when.toFormat("cccc d LLLL yyyy, h:mm a")} (${site.timezone.replace("_", " ")})`],
          ...(patientZone ? [["In your time zone", patientZone.toFormat("cccc d LLLL, h:mm a")]] : []),
          ["How", MODE_LABEL[b.meeting_mode]],
          ["Amount", b.payment_status === "waived" ? "No charge" : formatMoney(b.amount_minor, b.currency)],
          ["Payment", b.payment_status === "paid" ? "Paid" : b.payment_status === "pending_verification" ? "Awaiting verification" : b.payment_status === "waived" ? "Not required" : "Not yet paid"],
          ["Reference", b.reference],
        ].map(([k, v]) => (
          <div key={k} className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      {b.status === "confirmed" && (
        <div className="mt-8 flex flex-wrap gap-3">
          {b.meeting_mode === "meet" && b.meeting_url && (
            <Button asChild size="lg" variant="coral"><a href={b.meeting_url} target="_blank" rel="noopener noreferrer"><Video />Join video call</a></Button>
          )}
          {b.meeting_mode === "meet" && !b.meeting_url && (
            <p className="rounded-xl bg-mint-100 p-4 text-sm">Your video link will be emailed before the session.</p>
          )}
          {b.meeting_mode === "phone" && <p className="rounded-xl bg-mint-100 p-4 text-sm">I will call you on {b.patient_phone}.{priv.phone_instructions ? ` ${priv.phone_instructions}` : ""}</p>}
          {b.meeting_mode === "whatsapp" && <p className="rounded-xl bg-mint-100 p-4 text-sm">I will call you on WhatsApp ({b.patient_whatsapp || b.patient_phone}).</p>}
          <Button asChild size="lg" variant="outline"><a href={`/booking/${b.reference}/calendar.ics?t=${b.access_token}`}><CalendarPlus />Add to calendar</a></Button>
        </div>
      )}

      {b.status === "pending_payment" && b.payment_method === "bank_transfer" && (
        <section className="mt-10 rounded-3xl bg-pine-900 p-8 text-cream">
          <h2 className="font-display text-2xl font-semibold">Bank transfer details</h2>
          <dl className="mt-5 grid gap-3">
            {[["Amount", formatMoney(b.amount_minor, b.currency)], ["Bank", bank.bank_name], ["Account name", bank.account_name], ["Account number", bank.account_number], ["Use this reference", b.reference]].map(([k, v]) =>
              v ? (
                <div key={k} className="grid gap-1 sm:grid-cols-[11rem_1fr]">
                  <dt className="text-mint-200">{k}</dt>
                  <dd className="font-display text-xl font-semibold tabular-nums">{v}</dd>
                </div>
              ) : null,
            )}
          </dl>
          {bank.note && <p className="mt-4 text-sm text-mint-100/80">{bank.note}</p>}
          {b.hold_expires_at && (
            <p className="mt-4 text-sm text-mint-100/80">Your time is held until {DateTime.fromISO(b.hold_expires_at).setZone(site.timezone).toFormat("cccc d LLL, h:mm a")}.</p>
          )}
          <div className="rounded-2xl bg-white p-6 text-foreground mt-6">
            <p className="font-semibold">Sent the money?</p>
            <TransferForm reference={b.reference} token={b.access_token} />
          </div>
        </section>
      )}

      {b.status === "pending_payment" && b.payment_method !== "bank_transfer" && (
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button asChild size="lg"><Link href={`/booking/${b.reference}?t=${b.access_token}`}>Check payment status</Link></Button>
          <Button asChild size="lg" variant="outline"><Link href="/book">Start again</Link></Button>
        </div>
      )}

      {(b.status === "expired" || b.status === "cancelled") && (
        <Button asChild size="lg" className="mt-8"><Link href="/book">Book another time</Link></Button>
      )}

      <p className="mt-12 text-sm text-muted-foreground">
        Need to change something? {site.contact_email ? <>Email <a className="underline" href={`mailto:${site.contact_email}`}>{site.contact_email}</a>.</> : "Reply to your confirmation email."} For emergencies, go to the nearest hospital.
      </p>
    </div>
  );
}
