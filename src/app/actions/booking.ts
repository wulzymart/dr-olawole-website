"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { availableSlots, bookingInput, createBooking, enabledMethods, getBookingByToken, loadSettings } from "@/lib/booking/core";
import { getVisitorCurrency } from "@/lib/geo";
import { paystackInitialize } from "@/lib/payments/paystack";
import { flutterwaveInitialize } from "@/lib/payments/flutterwave";
import { bankTransferMessage } from "@/lib/notify/templates";
import { notifyDoctor, notifyPatient } from "@/lib/notify/send";
import { siteUrl } from "@/lib/utils";
import type { PaymentMethod, Service } from "@/lib/types";

const range = z.object({
  serviceId: z.uuid(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Public: open times for one consultation type across a date range. */
export async function getSlots(raw: z.infer<typeof range>) {
  const parsed = range.safeParse(raw);
  if (!parsed.success) return { slots: {} as Record<string, string[]> };
  const { data } = await createAdminClient().from("services").select("*").eq("id", parsed.data.serviceId).eq("is_active", true).maybeSingle();
  if (!data) return { slots: {} };
  // Cap the window so the endpoint cannot be used to scan far into the future.
  const to = new Date(Math.min(Date.parse(parsed.data.to), Date.parse(parsed.data.from) + 62 * 86_400_000));
  return { slots: await availableSlots(data as Service, parsed.data.from, to.toISOString().slice(0, 10)) };
}

/** Public: the payment methods usable for the visitor's currency. */
export async function getCheckoutOptions() {
  const currency = await getVisitorCurrency();
  const { priv } = await loadSettings();
  return { currency, methods: await enabledMethods(priv, currency) };
}

export type SubmitResult = { ok: true; redirect: string } | { ok: false; error: string; field?: string };

export async function submitBooking(raw: unknown): Promise<SubmitResult> {
  const parsed = bookingInput.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message, field: String(issue.path[0] ?? "") };
  }
  const input = parsed.data;
  const currency = await getVisitorCurrency(); // decided on the server from the visitor's location
  const created = await createBooking(input, currency);
  if (!created.ok) return created;

  const b = created.booking;
  const page = `${siteUrl()}/booking/${b.reference}?t=${b.access_token}`;
  if (!created.needsPayment) return { ok: true, redirect: page };

  const db = createAdminClient();
  try {
    if (input.method === "paystack") {
      const r = await paystackInitialize({
        email: b.patient_email,
        amountMinor: b.amount_minor,
        currency: b.currency,
        reference: b.reference,
        callbackUrl: `${siteUrl()}/booking/callback?provider=paystack&t=${b.access_token}`,
        metadata: { booking_id: b.id },
      });
      return { ok: true, redirect: r.authorizationUrl };
    }
    if (input.method === "flutterwave") {
      const r = await flutterwaveInitialize({
        email: b.patient_email,
        name: b.patient_name,
        phone: b.patient_phone,
        amountMinor: b.amount_minor,
        currency: b.currency,
        reference: b.reference,
        redirectUrl: `${siteUrl()}/booking/callback?provider=flutterwave&t=${b.access_token}`,
        title: b.service_name,
      });
      return { ok: true, redirect: r.link };
    }
    // Bank transfer: the slot is held, the patient pays and then confirms on their booking page.
    const { site, priv } = await loadSettings();
    await notifyPatient(
      priv,
      { email: b.patient_email, whatsapp: b.patient_whatsapp, phone: b.patient_phone },
      bankTransferMessage(b, site, priv.bank_details, b.hold_expires_at!),
    );
    return { ok: true, redirect: page };
  } catch (e) {
    // Release the slot straight away if the payment provider could not start.
    await db.from("bookings").update({ status: "cancelled", cancelled_reason: "Payment could not be started", cancelled_at: new Date().toISOString() }).eq("id", b.id);
    console.error("payment init failed", e);
    return { ok: false, error: "We could not start the payment. Please try another method or try again shortly." };
  }
}

/** Patient says they have sent a bank transfer; the doctor verifies it. */
export async function markTransferSent(reference: string, token: string, transferNote: string) {
  const b = await getBookingByToken(reference, token);
  if (!b) return { ok: false as const, error: "Booking not found." };
  if (b.payment_method !== "bank_transfer" || !["pending_payment"].includes(b.status)) {
    return { ok: false as const, error: "This booking is not waiting for a bank transfer." };
  }
  const db = createAdminClient();
  const { error } = await db
    .from("bookings")
    .update({
      status: "awaiting_verification",
      payment_status: "pending_verification",
      // Keep the time held for as long as a transfer can take to show up.
      hold_expires_at: null,
      payment_reference: transferNote.trim().slice(0, 200) || null,
    })
    .eq("id", b.id);
  if (error) return { ok: false as const, error: "Could not record your transfer. Please try again." };
  await notifyDoctor(
    `Verify transfer: ${b.patient_name}`,
    `${b.patient_name} says they have sent ${b.reference}. Check your bank, then confirm the booking on the dashboard.`,
  );
  return { ok: true as const };
}

export async function paymentMethodsFor(): Promise<PaymentMethod[]> {
  return (await getCheckoutOptions()).methods;
}

