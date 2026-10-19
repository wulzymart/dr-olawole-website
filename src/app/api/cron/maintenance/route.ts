import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/crypto";
import { loadSettings } from "@/lib/booking/core";
import { notifyPatient } from "@/lib/notify/send";
import { reminderMessage } from "@/lib/notify/templates";
import type { Booking } from "@/lib/types";

/**
 * Runs every few minutes (Supabase pg_cron calls this URL). It releases
 * unpaid holds and sends each reminder once, tracked in reminders_sent.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || !given || !safeEqual(secret, given)) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const db = createAdminClient();
  const { data: expired } = await db.rpc("expire_stale_holds");
  const { site, priv } = await loadSettings();

  let sent = 0;
  if (priv.notify.email || priv.notify.whatsapp) {
    const now = DateTime.now();
    const horizon = Math.max(0, ...priv.notify.reminder_hours);
    const { data } = await db
      .from("bookings")
      .select("*")
      .eq("status", "confirmed")
      .gt("start_at", now.toUTC().toISO()!)
      .lt("start_at", now.plus({ hours: horizon + 1 }).toUTC().toISO()!);

    for (const b of (data ?? []) as Booking[]) {
      const hoursLeft = DateTime.fromISO(b.start_at).diff(now, "hours").hours;
      // The smallest reminder window that has been reached and not yet sent.
      const due = [...priv.notify.reminder_hours]
        .sort((a, c) => a - c)
        .find((h) => hoursLeft <= h && !b.reminders_sent[String(h)]);
      if (due === undefined) continue;
      // Skip a reminder that would arrive after a tighter one was due (late bookings).
      const marks = { ...b.reminders_sent };
      for (const h of priv.notify.reminder_hours) if (h >= due || hoursLeft <= h) marks[String(h)] = marks[String(h)] ?? now.toISO()!;
      await db.from("bookings").update({ reminders_sent: marks }).eq("id", b.id);
      await notifyPatient(
        priv,
        { email: b.patient_email, whatsapp: b.patient_whatsapp, phone: b.patient_phone },
        reminderMessage(b, site, b.meeting_url ?? "", due),
      );
      sent++;
    }
  }
  return NextResponse.json({ expired: expired ?? 0, remindersSent: sent });
}
