import "server-only";
import { DateTime } from "luxon";
import { z } from "zod";
import { createAdminClient } from "../supabase/admin";
import { randomToken } from "../crypto";
import { priceFor } from "../money";
import { computeSlots, type Exception, type Rule } from "./slots";
import { getSecret } from "../secrets";
import { notifyDoctor, notifyPatient } from "../notify/send";
import { confirmationMessage } from "../notify/templates";
import { DEFAULT_SITE } from "../data";
import type { Booking, Currency, PaymentMethod, PrivateSettings, Service, SiteSettings } from "../types";

export const LIVE_STATUSES = ["pending_payment", "awaiting_verification", "confirmed"] as const;

export async function loadSettings() {
  const db = createAdminClient();
  const [{ data: site }, { data: priv }] = await Promise.all([
    db.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    db.from("private_settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  return {
    site: { ...DEFAULT_SITE, ...(site ?? {}) } as SiteSettings,
    priv: priv as PrivateSettings,
  };
}

/** Which payment methods can actually be used right now (enabled and keyed). */
export async function enabledMethods(priv: PrivateSettings, currency: Currency) {
  const methods: PaymentMethod[] = [];
  if (priv.payments.paystack && (await getSecret("paystack_secret"))) methods.push("paystack");
  if (priv.payments.flutterwave && (await getSecret("flutterwave_secret"))) methods.push("flutterwave");
  const b = priv.bank_details;
  if (priv.payments.bank_transfer && b.account_number && currency === "NGN") methods.push("bank_transfer");
  return methods;
}

export async function availableSlots(service: Service, from: string, to: string) {
  const db = createAdminClient();
  const { site, priv } = await loadSettings();
  await db.rpc("expire_stale_holds");
  const range = {
    from: DateTime.fromISO(from, { zone: site.timezone }).startOf("day").minus({ days: 1 }).toUTC().toISO()!,
    to: DateTime.fromISO(to, { zone: site.timezone }).endOf("day").plus({ days: 1 }).toUTC().toISO()!,
  };
  const [{ data: rules }, { data: exceptions }, { data: busy }] = await Promise.all([
    db.from("availability_rules").select("weekday, start_time, end_time"),
    db.from("availability_exceptions").select("on_date, is_closed, start_time, end_time").gte("on_date", from).lte("on_date", to),
    db
      .from("bookings")
      .select("start_at, end_at")
      .in("status", [...LIVE_STATUSES])
      .lt("start_at", range.to)
      .gt("end_at", range.from),
  ]);
  return computeSlots({
    tz: site.timezone,
    rules: (rules ?? []) as Rule[],
    exceptions: (exceptions ?? []) as Exception[],
    busy: busy ?? [],
    now: DateTime.now(),
    durationMinutes: service.duration_minutes,
    intervalMinutes: priv.slot_interval_minutes,
    bufferMinutes: priv.buffer_minutes,
    minNoticeHours: priv.min_notice_hours,
    maxAdvanceDays: priv.max_advance_days,
    from,
    to,
  });
}

export const bookingInput = z.object({
  serviceId: z.uuid(),
  start: z.iso.datetime(),
  mode: z.enum(["meet", "phone", "whatsapp"]),
  method: z.enum(["paystack", "flutterwave", "bank_transfer"]).optional(),
  name: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.email("Enter a valid email address").max(200),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a phone number we can reach")
    .max(30)
    .regex(/^[+\d][\d\s()-]{5,}$/, "Enter a valid phone number"),
  whatsapp: z.string().trim().max(30).optional().or(z.literal("")),
  reason: z.string().trim().max(1500).optional().or(z.literal("")),
  timezone: z.string().max(64).optional(),
  consent: z.literal(true, { error: "Please accept the terms to continue" }),
});
export type BookingInput = z.infer<typeof bookingInput>;

function newReference() {
  const alphabet = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
  let s = "";
  for (const b of crypto.getRandomValues(new Uint8Array(8))) s += alphabet[b % alphabet.length];
  return `CON-${s}`;
}

export type CreateResult =
  | { ok: true; booking: Booking; needsPayment: boolean }
  | { ok: false; error: string; field?: string };

export async function createBooking(input: BookingInput, currency: Currency): Promise<CreateResult> {
  const db = createAdminClient();
  const { site, priv } = await loadSettings();
  await db.rpc("expire_stale_holds");

  const { data: service } = await db.from("services").select("*").eq("id", input.serviceId).eq("is_active", true).maybeSingle();
  if (!service) return { ok: false, error: "That consultation type is no longer available." };
  const svc = service as Service;
  if (!svc.modes.includes(input.mode)) return { ok: false, error: "That way of meeting is not offered for this consultation.", field: "mode" };

  // The slot must still be offered: re-derive it on the server, never trust the client.
  const startLocal = DateTime.fromISO(input.start).setZone(site.timezone);
  const day = startLocal.toFormat("yyyy-MM-dd");
  const slots = await availableSlots(svc, day, day);
  const wanted = DateTime.fromISO(input.start).toUTC().toISO()!;
  if (!(slots[day] ?? []).includes(wanted)) {
    return { ok: false, error: "That time has just been taken. Please choose another.", field: "start" };
  }

  const price = priceFor(svc, currency);
  const free = price.minor === 0;
  if (!free) {
    const methods = await enabledMethods(priv, price.currency);
    if (!input.method || !methods.includes(input.method)) {
      return { ok: false, error: "Choose one of the available payment methods.", field: "method" };
    }
  }

  const start = DateTime.fromISO(input.start).toUTC();
  const holdMinutes = input.method === "bank_transfer" ? priv.bank_hold_hours * 60 : priv.hold_minutes;
  const row = {
    reference: newReference(),
    access_token: randomToken(),
    service_id: svc.id,
    service_name: svc.name,
    duration_minutes: svc.duration_minutes,
    amount_minor: price.minor,
    currency: price.currency,
    patient_name: input.name,
    patient_email: input.email.toLowerCase(),
    patient_phone: input.phone,
    patient_whatsapp: input.whatsapp || null,
    reason: input.reason || null,
    meeting_mode: input.mode,
    patient_timezone: input.timezone ?? null,
    consent_at: new Date().toISOString(),
    start_at: start.toISO()!,
    end_at: start.plus({ minutes: svc.duration_minutes }).toISO()!,
    status: free ? "confirmed" : "pending_payment",
    payment_status: free ? "waived" : "unpaid",
    payment_method: free ? "free" : input.method,
    hold_expires_at: free ? null : DateTime.now().plus({ minutes: holdMinutes }).toUTC().toISO(),
    meeting_url: input.mode === "meet" ? priv.default_meet_url : null,
  };

  const { data, error } = await db.from("bookings").insert(row).select("*").single();
  if (error) {
    // 23P01 = exclusion violation: someone else took the slot a moment ago.
    if (error.code === "23P01") return { ok: false, error: "That time has just been taken. Please choose another.", field: "start" };
    console.error("createBooking", error);
    return { ok: false, error: "We could not save your booking. Please try again." };
  }
  const booking = data as Booking;
  if (free) await afterConfirmed(booking);
  return { ok: true, booking, needsPayment: !free };
}

/** Sends confirmations and tells the doctor. Safe to call once per confirmation. */
export async function afterConfirmed(b: Booking) {
  const { site, priv } = await loadSettings();
  const msg = confirmationMessage(b, site, b.meeting_url ?? "", priv.phone_instructions);
  await notifyPatient(priv, { email: b.patient_email, whatsapp: b.patient_whatsapp, phone: b.patient_phone }, msg);
  await notifyDoctor(
    `New booking: ${b.patient_name}`,
    `${b.service_name} on ${DateTime.fromISO(b.start_at).setZone(site.timezone).toFormat("ccc d LLL, h:mm a")}\nReference ${b.reference}`,
  );
}

/**
 * Marks a booking paid after the provider has been asked directly (never
 * from a redirect alone). Idempotent, and checks amount and currency.
 */
export async function settlePayment(args: {
  reference: string;
  provider: "paystack" | "flutterwave";
  paidAmountMinor: number;
  paidCurrency: string;
}) {
  const db = createAdminClient();
  const { data } = await db.from("bookings").select("*").eq("reference", args.reference).maybeSingle();
  if (!data) return { ok: false as const, reason: "unknown reference" };
  const b = data as Booking;
  if (b.payment_status === "paid") return { ok: true as const, booking: b, already: true };

  if (args.paidAmountMinor < b.amount_minor || args.paidCurrency.toUpperCase() !== b.currency) {
    await db.from("bookings").update({ payment_status: "failed" }).eq("id", b.id);
    return { ok: false as const, reason: "amount or currency mismatch" };
  }

  const patch = {
    status: "confirmed" as const,
    payment_status: "paid" as const,
    payment_method: args.provider,
    payment_reference: args.reference,
    paid_at: new Date().toISOString(),
    hold_expires_at: null,
  };
  const { data: updated, error } = await db.from("bookings").update(patch).eq("id", b.id).select("*").single();

  if (error?.code === "23P01") {
    // The hold lapsed and another patient took the slot. The money is real,
    // so record it and alert the doctor to rebook or refund.
    await db
      .from("bookings")
      .update({ payment_status: "paid", payment_reference: args.reference, paid_at: patch.paid_at })
      .eq("id", b.id);
    await notifyDoctor(
      `Action needed: paid booking ${b.reference} lost its slot`,
      `${b.patient_name} paid after the hold expired and the time was taken. Rebook them or refund. Contact: ${b.patient_email}, ${b.patient_phone}`,
    );
    return { ok: false as const, reason: "slot lost after payment" };
  }
  if (error || !updated) return { ok: false as const, reason: "could not update booking" };

  await afterConfirmed(updated as Booking);
  return { ok: true as const, booking: updated as Booking, already: false };
}

export async function getBookingByToken(reference: string, token: string) {
  const { data } = await createAdminClient().from("bookings").select("*").eq("reference", reference).maybeSingle();
  if (!data) return null;
  const b = data as Booking;
  // Constant-time comparison avoids leaking the token through timing.
  const { safeEqual } = await import("../crypto");
  return safeEqual(b.access_token, token) ? b : null;
}
