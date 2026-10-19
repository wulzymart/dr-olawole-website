import { getBookingByToken, loadSettings } from "@/lib/booking/core";
import { MODE_LABEL } from "@/lib/types";

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

export async function GET(request: Request, ctx: { params: Promise<{ reference: string }> }) {
  const { reference } = await ctx.params;
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const b = await getBookingByToken(reference, token);
  if (!b || b.status !== "confirmed") return new Response("Not found", { status: 404 });
  const { site } = await loadSettings();

  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dr Olawole//Consultations//EN",
    "BEGIN:VEVENT",
    `UID:${b.reference}@consultation`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(b.start_at)}`,
    `DTEND:${stamp(b.end_at)}`,
    `SUMMARY:${esc(`${b.service_name} with ${site.short_name}`)}`,
    `DESCRIPTION:${esc(`${MODE_LABEL[b.meeting_mode]}${b.meeting_url ? `\n${b.meeting_url}` : ""}\nReference ${b.reference}`)}`,
    ...(b.meeting_url ? [`URL:${b.meeting_url}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Consultation in one hour",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${b.reference}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
