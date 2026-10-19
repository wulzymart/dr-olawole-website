"use server";

import { revalidatePath } from "next/cache";
import { DateTime } from "luxon";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { setSecret, SECRET_KEYS, type SecretKey } from "@/lib/secrets";
import { afterConfirmed, loadSettings } from "@/lib/booking/core";
import { confirmationMessage, summaryMessage } from "@/lib/notify/templates";
import { notifyPatient, sendEmail } from "@/lib/notify/send";
import { majorToMinor } from "@/lib/money";
import { readingMinutes, slugify } from "@/lib/utils";
import { sanitizeRich } from "@/lib/sanitize";
import type { Booking, BookingStatus } from "@/lib/types";

export type ActionResult = { ok: true; message?: string; id?: string; slug?: string } | { ok: false; error: string };

const ok = (message?: string, extra: { id?: string; slug?: string } = {}): ActionResult => ({ ok: true, message, ...extra });
const fail = (error: string): ActionResult => ({ ok: false, error });
const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Check the form and try again.";

function refreshPublic() {
  revalidatePath("/", "layout");
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */
const titled = z.array(z.object({ title: z.string().trim().max(120), detail: z.string().trim().max(400) })).max(20);

const profileSchema = z.object({
  doctor_name: z.string().trim().min(2, "Enter your full name").max(120),
  short_name: z.string().trim().min(2, "Enter a short name").max(60),
  post_nominals: z.string().trim().max(60),
  specialty: z.string().trim().min(2, "Enter your specialty line").max(140),
  headline: z.string().trim().min(2).max(140),
  tagline: z.string().trim().max(300),
  short_bio: z.string().trim().max(900),
  about_html: z.string().max(60_000),
  credentials: titled,
  experience: z
    .array(
      z.object({
        role: z.string().trim().max(140),
        place: z.string().trim().max(200),
        period: z.string().trim().max(80),
        summary: z.string().trim().max(700),
      }),
    )
    .max(20),
  education: z
    .array(z.object({ title: z.string().trim().max(160), place: z.string().trim().max(200), year: z.string().trim().max(20) }))
    .max(20),
  interests: titled,
  approach: titled,
  engagements: z.array(z.string().trim().max(200)).max(20),
  mdcn_number: z.string().trim().max(40).nullable(),
  photo_url: z.string().trim().max(500).nullable(),
  contact_email: z.email("Enter a valid contact email").or(z.literal("")).nullable(),
  phone: z.string().trim().max(30).nullable(),
  whatsapp_number: z.string().trim().max(30).nullable(),
  location: z.string().trim().max(120).nullable(),
  socials: z.record(z.string(), z.string().trim().max(300)),
  seo_description: z.string().trim().max(300).nullable(),
  timezone: z.string().trim().min(3).max(64),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export async function saveProfile(raw: unknown): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const p = profileSchema.safeParse(raw);
  if (!p.success) return fail(firstIssue(p.error));
  if (!DateTime.local().setZone(p.data.timezone).isValid) return fail("That time zone is not recognised. Use a name like Africa/Lagos.");

  const clean = {
    ...p.data,
    about_html: sanitizeRich(p.data.about_html),
    contact_email: p.data.contact_email || null,
    mdcn_number: p.data.mdcn_number || null,
    photo_url: p.data.photo_url || null,
    seo_description: p.data.seo_description || null,
    socials: Object.fromEntries(Object.entries(p.data.socials).filter(([, v]) => v)),
    credentials: p.data.credentials.filter((c) => c.title),
    experience: p.data.experience.filter((c) => c.role),
    education: p.data.education.filter((c) => c.title),
    interests: p.data.interests.filter((c) => c.title),
    approach: p.data.approach.filter((c) => c.title),
    engagements: p.data.engagements.filter(Boolean),
  };
  const { error } = await supabase.from("site_settings").update(clean).eq("id", 1);
  if (error) return fail("Could not save your profile. Please try again.");
  refreshPublic();
  return ok("Profile saved");
}

/* ------------------------------------------------------------------ */
/* Booking rules, payments, notifications                              */
/* ------------------------------------------------------------------ */
const rulesSchema = z.object({
  slot_interval_minutes: z.number().int().min(5).max(120),
  buffer_minutes: z.number().int().min(0).max(120),
  min_notice_hours: z.number().int().min(0).max(720),
  max_advance_days: z.number().int().min(1).max(365),
  hold_minutes: z.number().int().min(5).max(240),
  bank_hold_hours: z.number().int().min(1).max(168),
  default_meet_url: z.url("Enter a full link starting with https://").or(z.literal("")).nullable(),
  phone_instructions: z.string().trim().max(500).nullable(),
});

export async function saveBookingRules(raw: unknown): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const p = rulesSchema.safeParse(raw);
  if (!p.success) return fail(firstIssue(p.error));
  const { error } = await supabase
    .from("private_settings")
    .update({ ...p.data, default_meet_url: p.data.default_meet_url || null, phone_instructions: p.data.phone_instructions || null })
    .eq("id", 1);
  if (error) return fail("Could not save the booking rules.");
  return ok("Booking rules saved");
}

const paymentsSchema = z.object({
  payments: z.object({ paystack: z.boolean(), flutterwave: z.boolean(), bank_transfer: z.boolean() }),
  bank_details: z.object({
    bank_name: z.string().trim().max(120).optional(),
    account_name: z.string().trim().max(120).optional(),
    account_number: z.string().trim().max(30).optional(),
    note: z.string().trim().max(300).optional(),
  }),
});

export async function savePayments(raw: unknown): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const p = paymentsSchema.safeParse(raw);
  if (!p.success) return fail(firstIssue(p.error));
  if (p.data.payments.bank_transfer && !p.data.bank_details.account_number) {
    return fail("Add your account number before switching on bank transfer.");
  }
  const { error } = await supabase.from("private_settings").update(p.data).eq("id", 1);
  if (error) return fail("Could not save the payment settings.");
  return ok("Payment settings saved");
}

const notifySchema = z.object({
  email: z.boolean(),
  whatsapp: z.boolean(),
  reminder_hours: z.array(z.number().int().min(1).max(168)).max(4),
});

export async function saveNotifications(raw: unknown): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const p = notifySchema.safeParse(raw);
  if (!p.success) return fail(firstIssue(p.error));
  const { error } = await supabase.from("private_settings").update({ notify: p.data }).eq("id", 1);
  if (error) return fail("Could not save the reminder settings.");
  return ok("Reminder settings saved");
}

/** API keys. Each value is encrypted before it is written; an empty value removes the key. */
export async function saveSecrets(values: Partial<Record<SecretKey, string>>): Promise<ActionResult> {
  await requireAdmin();
  const entries = Object.entries(values).filter(([k, v]) => k in SECRET_KEYS && typeof v === "string") as [SecretKey, string][];
  if (entries.length === 0) return ok("Nothing to change");
  try {
    for (const [key, value] of entries) await setSecret(key, value);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/SETTINGS_ENCRYPTION_KEY/.test(msg)) {
      return fail("The encryption key is missing on the server. Add SETTINGS_ENCRYPTION_KEY to the environment, then try again.");
    }
    return fail("Could not save the keys. Please try again.");
  }
  return ok("Keys saved securely");
}

export async function removeSecret(key: SecretKey): Promise<ActionResult> {
  await requireAdmin();
  if (!(key in SECRET_KEYS)) return fail("Unknown key.");
  await setSecret(key, "");
  return ok("Key removed");
}

/* ------------------------------------------------------------------ */
/* Consultation types                                                  */
/* ------------------------------------------------------------------ */
const serviceSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Give the consultation a name").max(80),
  summary: z.string().trim().max(160),
  description: z.string().trim().max(1200),
  duration_minutes: z.number().int().min(5, "Minimum 5 minutes").max(480),
  price_ngn: z.string().trim().min(1, "Enter a price in naira (0 for free)"),
  price_usd: z.string().trim(),
  modes: z.array(z.enum(["meet", "phone", "whatsapp"])).min(1, "Choose at least one way to meet"),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0).max(999),
});

export async function saveService(raw: unknown): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const p = serviceSchema.safeParse(raw);
  if (!p.success) return fail(firstIssue(p.error));
  const d = p.data;
  const ngn = majorToMinor(d.price_ngn);
  const usd = d.price_usd === "" ? null : majorToMinor(d.price_usd);
  const row = {
    name: d.name,
    summary: d.summary,
    description: d.description,
    duration_minutes: d.duration_minutes,
    price_ngn_kobo: ngn,
    price_usd_cents: usd,
    modes: d.modes,
    is_active: d.is_active,
    sort_order: d.sort_order,
  };

  if (d.id) {
    const { error } = await supabase.from("services").update(row).eq("id", d.id);
    if (error) return fail("Could not save this consultation type.");
    refreshPublic();
    return ok("Saved", { id: d.id });
  }

  const base = slugify(d.name) || "consultation";
  for (let i = 0; i < 5; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const { data, error } = await supabase.from("services").insert({ ...row, slug }).select("id").single();
    if (!error) {
      refreshPublic();
      return ok("Consultation type added", { id: data.id });
    }
    if (error.code !== "23505") return fail("Could not add this consultation type.");
  }
  return fail("Could not create a unique name. Try a different one.");
}

export async function deleteService(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  // Past bookings keep their own copy of the name, price and length, so deleting is safe.
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) return fail("Could not delete this consultation type.");
  refreshPublic();
  return ok("Deleted");
}

/* ------------------------------------------------------------------ */
/* Availability                                                        */
/* ------------------------------------------------------------------ */
const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
const weeklySchema = z
  .array(
    z.object({
      weekday: z.number().int().min(1).max(7),
      start_time: z.string().regex(hhmm, "Use 24 hour times like 09:00"),
      end_time: z.string().regex(hhmm, "Use 24 hour times like 17:00"),
    }),
  )
  .max(60);

export async function saveWeeklyHours(raw: unknown): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const p = weeklySchema.safeParse(raw);
  if (!p.success) return fail(firstIssue(p.error));
  for (const r of p.data) if (r.end_time <= r.start_time) return fail("Each period must end after it starts.");
  // Overlapping periods on one day would double-list slots.
  for (const day of [1, 2, 3, 4, 5, 6, 7]) {
    const list = p.data.filter((r) => r.weekday === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
    for (let i = 1; i < list.length; i++) if (list[i].start_time < list[i - 1].end_time) return fail("Periods on the same day cannot overlap.");
  }
  const del = await supabase.from("availability_rules").delete().gte("weekday", 1);
  if (del.error) return fail("Could not update your hours.");
  if (p.data.length) {
    const ins = await supabase.from("availability_rules").insert(p.data);
    if (ins.error) return fail("Could not update your hours.");
  }
  return ok("Weekly hours saved");
}

const exceptionSchema = z
  .object({
    on_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
    is_closed: z.boolean(),
    start_time: z.string().regex(hhmm).nullable(),
    end_time: z.string().regex(hhmm).nullable(),
    note: z.string().trim().max(160).nullable(),
  })
  .refine((v) => v.is_closed || (v.start_time && v.end_time && v.end_time > v.start_time), {
    message: "Set start and end times, with the end after the start.",
  });

export async function addException(raw: unknown): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const p = exceptionSchema.safeParse(raw);
  if (!p.success) return fail(firstIssue(p.error));
  const d = p.data;
  const { error } = await supabase.from("availability_exceptions").insert({
    on_date: d.on_date,
    is_closed: d.is_closed,
    start_time: d.is_closed ? null : d.start_time,
    end_time: d.is_closed ? null : d.end_time,
    note: d.note || null,
  });
  if (error) return fail("Could not add that date.");
  return ok(d.is_closed ? "Day marked as time off" : "Special hours added");
}

export async function deleteException(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("availability_exceptions").delete().eq("id", id);
  return error ? fail("Could not remove that date.") : ok("Removed");
}

/* ------------------------------------------------------------------ */
/* Articles                                                            */
/* ------------------------------------------------------------------ */
const postSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().min(3, "Give the article a title").max(160),
  slug: z.string().trim().max(90).optional(),
  excerpt: z.string().trim().max(300),
  cover_url: z.string().trim().max(600).nullable(),
  cover_alt: z.string().trim().max(200).nullable(),
  content_html: z.string().max(400_000),
  content_json: z.unknown(),
  category: z.string().trim().max(60).nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12),
  seo_title: z.string().trim().max(120).nullable(),
  seo_description: z.string().trim().max(300).nullable(),
  status: z.enum(["draft", "published"]),
  published_at: z.string().nullable(),
});

export async function savePost(raw: unknown): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const p = postSchema.safeParse(raw);
  if (!p.success) return fail(firstIssue(p.error));
  const d = p.data;
  if (d.status === "published" && !d.content_html.replace(/<[^>]*>/g, "").trim()) return fail("Write something before publishing.");

  const html = sanitizeRich(d.content_html);
  let publishedAt: string | null = null;
  if (d.status === "published") publishedAt = d.published_at ? new Date(d.published_at).toISOString() : new Date().toISOString();

  const row = {
    title: d.title,
    excerpt: d.excerpt,
    cover_url: d.cover_url || null,
    cover_alt: d.cover_alt || null,
    content_html: html,
    content_json: d.content_json ?? null,
    category: d.category || null,
    tags: d.tags,
    seo_title: d.seo_title || null,
    seo_description: d.seo_description || null,
    status: d.status,
    published_at: publishedAt,
    reading_minutes: readingMinutes(html),
  };

  let id = d.id;
  let slug = "";
  if (id) {
    const { data: current } = await supabase.from("posts").select("slug").eq("id", id).maybeSingle();
    slug = d.slug ? slugify(d.slug) : (current?.slug ?? slugify(d.title));
    const { error } = await supabase.from("posts").update({ ...row, slug }).eq("id", id);
    if (error) return fail(error.code === "23505" ? "Another article already uses that web address." : "Could not save the article.");
  } else {
    const base = slugify(d.slug || d.title) || "article";
    let created = false;
    for (let i = 0; i < 6 && !created; i++) {
      slug = i === 0 ? base : `${base}-${i + 1}`;
      const { data, error } = await supabase.from("posts").insert({ ...row, slug }).select("id").single();
      if (!error) {
        id = data.id;
        created = true;
      } else if (error.code !== "23505") return fail("Could not save the article.");
    }
    if (!created) return fail("That web address is taken. Edit it and try again.");
  }
  revalidatePath("/articles");
  revalidatePath(`/articles/${slug}`);
  revalidatePath("/");
  return ok(d.status === "published" ? "Published" : "Draft saved", { id, slug });
}

export async function deletePost(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) return fail("Could not delete the article.");
  revalidatePath("/articles");
  revalidatePath("/");
  return ok("Article deleted");
}

/* ------------------------------------------------------------------ */
/* Bookings and consultation documentation                             */
/* ------------------------------------------------------------------ */
async function getBooking(id: string) {
  const { data } = await createAdminClient().from("bookings").select("*").eq("id", id).maybeSingle();
  return (data as Booking | null) ?? null;
}

function refreshBooking(id: string) {
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/dashboard/bookings/${id}`);
}

/** The doctor has seen the transfer arrive: confirm the booking and tell the patient. */
export async function confirmBankPayment(id: string): Promise<ActionResult> {
  await requireAdmin();
  const b = await getBooking(id);
  if (!b) return fail("Booking not found.");
  if (b.payment_status === "paid") return ok("Already confirmed");
  const { priv } = await loadSettings();
  const { data, error } = await createAdminClient()
    .from("bookings")
    .update({
      status: "confirmed",
      payment_status: "paid",
      payment_method: "bank_transfer",
      paid_at: new Date().toISOString(),
      hold_expires_at: null,
      meeting_url: b.meeting_mode === "meet" ? (b.meeting_url ?? priv.default_meet_url) : b.meeting_url,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error?.code === "23P01") return fail("That time has since been taken by another booking. Reschedule this patient first.");
  if (error || !data) return fail("Could not confirm the booking.");
  await afterConfirmed(data as Booking);
  refreshBooking(id);
  return ok("Payment confirmed and the patient has been told");
}

const statusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["completed", "no_show", "cancelled", "confirmed"]),
  reason: z.string().trim().max(300).optional(),
});

export async function setBookingStatus(raw: unknown): Promise<ActionResult> {
  await requireAdmin();
  const p = statusSchema.safeParse(raw);
  if (!p.success) return fail(firstIssue(p.error));
  const { id, status, reason } = p.data;
  const patch: Record<string, unknown> = { status: status satisfies BookingStatus };
  if (status === "cancelled") {
    patch.cancelled_at = new Date().toISOString();
    patch.cancelled_reason = reason || "Cancelled by the doctor";
    patch.hold_expires_at = null;
  }
  const { error } = await createAdminClient().from("bookings").update(patch).eq("id", id);
  if (error) return fail(error.code === "23P01" ? "That time is no longer free, so this booking cannot be restored." : "Could not update the booking.");
  refreshBooking(id);
  return ok(status === "cancelled" ? "Booking cancelled" : "Updated");
}

export async function markRefunded(id: string): Promise<ActionResult> {
  await requireAdmin();
  const { error } = await createAdminClient().from("bookings").update({ payment_status: "refunded" }).eq("id", id);
  if (error) return fail("Could not update the payment.");
  refreshBooking(id);
  return ok("Marked as refunded");
}

export async function setMeetingUrl(id: string, url: string): Promise<ActionResult> {
  await requireAdmin();
  const clean = url.trim();
  if (clean && !z.url().safeParse(clean).success) return fail("Enter a full link starting with https://");
  const { error } = await createAdminClient().from("bookings").update({ meeting_url: clean || null }).eq("id", id);
  if (error) return fail("Could not save the link.");
  refreshBooking(id);
  return ok("Meeting link saved");
}

const resched = z.object({ id: z.uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(hhmm), notify: z.boolean() });

export async function rescheduleBooking(raw: unknown): Promise<ActionResult> {
  await requireAdmin();
  const p = resched.safeParse(raw);
  if (!p.success) return fail("Choose a date and a time.");
  const b = await getBooking(p.data.id);
  if (!b) return fail("Booking not found.");
  const { site, priv } = await loadSettings();
  const start = DateTime.fromISO(`${p.data.date}T${p.data.time}`, { zone: site.timezone });
  if (!start.isValid) return fail("That date or time is not valid.");
  const end = start.plus({ minutes: b.duration_minutes });

  const { data, error } = await createAdminClient()
    .from("bookings")
    .update({ start_at: start.toUTC().toISO(), end_at: end.toUTC().toISO(), reminders_sent: {} })
    .eq("id", b.id)
    .select("*")
    .single();
  if (error?.code === "23P01") return fail("Another booking already holds part of that time.");
  if (error || !data) return fail("Could not move the booking.");

  if (p.data.notify && ["confirmed", "awaiting_verification"].includes(data.status)) {
    const moved = data as Booking;
    const msg = confirmationMessage(moved, site, moved.meeting_url ?? "", priv.phone_instructions);
    await notifyPatient(
      priv,
      { email: moved.patient_email, whatsapp: moved.patient_whatsapp, phone: moved.patient_phone },
      { ...msg, subject: `New time for your consultation (${moved.reference})` },
    );
  }
  refreshBooking(b.id);
  return ok("Booking moved");
}

const notesSchema = z.object({
  booking_id: z.uuid(),
  clinical_html: z.string().max(300_000),
  clinical_json: z.unknown(),
  summary_html: z.string().max(300_000),
  summary_json: z.unknown(),
  follow_up_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

export async function saveNotes(raw: unknown): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const p = notesSchema.safeParse(raw);
  if (!p.success) return fail(firstIssue(p.error));
  const d = p.data;
  const { error } = await supabase.from("consultation_notes").upsert({
    booking_id: d.booking_id,
    clinical_html: sanitizeRich(d.clinical_html),
    clinical_json: d.clinical_json ?? null,
    summary_html: sanitizeRich(d.summary_html),
    summary_json: d.summary_json ?? null,
    follow_up_on: d.follow_up_on,
  });
  if (error) return fail("Could not save the notes.");
  return ok("Notes saved");
}

/** Sends the patient-facing summary only. Clinical notes are never sent anywhere. */
export async function sendSummary(bookingId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const b = await getBooking(bookingId);
  if (!b) return fail("Booking not found.");
  const { data: note } = await supabase.from("consultation_notes").select("summary_html").eq("booking_id", bookingId).maybeSingle();
  const html = sanitizeRich(note?.summary_html ?? "");
  const text = html.replace(/<\/(p|h2|h3|li)>/g, "\n").replace(/<[^>]*>/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return fail("Write and save the patient summary first.");

  const { site } = await loadSettings();
  const msg = summaryMessage(b, site, html, text);
  // Email only: a summary can be long, and WhatsApp template messages are short.
  const sent = await sendEmail(b.patient_email, msg.subject, msg.html, msg.text);
  if (!sent.ok) return fail(`${sent.reason} Check the email key and sender under Settings, Integrations.`);
  await supabase.from("consultation_notes").update({ summary_sent_at: new Date().toISOString() }).eq("booking_id", bookingId);
  refreshBooking(bookingId);
  return ok("Summary emailed to the patient");
}
