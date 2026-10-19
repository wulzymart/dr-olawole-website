import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { loadSettings } from "@/lib/booking/core";
import { fmtDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { MODE_LABEL, type Booking } from "@/lib/types";
import { PageHeader } from "@/components/dashboard/page-header";
import { BookingStatusBadge, PaymentBadge } from "@/components/dashboard/status";
import { BookingActions } from "@/components/dashboard/booking-actions";
import { NotesEditor } from "@/components/dashboard/notes-editor";
import { Card, CardContent } from "@/components/ui/card";

export default async function BookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { site } = await loadSettings();
  const { data } = await supabase.from("bookings").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const b = data as Booking;
  const { data: note } = await supabase.from("consultation_notes").select("*").eq("booking_id", id).maybeSingle();
  const start = DateTime.fromISO(b.start_at).setZone(site.timezone);

  const rows: [string, React.ReactNode][] = [
    ["Email", <a key="e" className="underline underline-offset-4" href={`mailto:${b.patient_email}`}>{b.patient_email}</a>],
    ["Phone", <a key="p" className="underline underline-offset-4" href={`tel:${b.patient_phone}`}>{b.patient_phone}</a>],
    ["WhatsApp", b.patient_whatsapp ?? "Same as phone"],
    ["How", MODE_LABEL[b.meeting_mode]],
    ["Reference", b.reference],
    ["Fee", formatMoney(b.amount_minor, b.currency)],
    ["Paid with", b.payment_method ? b.payment_method.replace("_", " ") : "Not paid yet"],
  ];

  return (
    <>
      <Link href="/dashboard/bookings" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-coral-700 underline-offset-4 hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> All consultations
      </Link>
      <PageHeader title={b.patient_name} description={`${b.service_name}, ${b.duration_minutes} min, ${fmtDateTime(b.start_at, site.timezone)}`}>
        <BookingStatusBadge status={b.status} />
        <PaymentBadge status={b.payment_status} />
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <div className="grid content-start gap-6">
          <Card>
            <CardContent className="p-6">
              <dl className="grid gap-3">
                {rows.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[7rem_1fr] gap-3">
                    <dt className="text-sm font-semibold text-muted-foreground">{k}</dt>
                    <dd className="break-words">{v}</dd>
                  </div>
                ))}
              </dl>
              {b.reason && (
                <div className="mt-5 border-t pt-5">
                  <p className="text-sm font-semibold text-muted-foreground">Reason for the visit</p>
                  <p className="mt-1 whitespace-pre-wrap">{b.reason}</p>
                </div>
              )}
              {b.cancelled_reason && (
                <div className="mt-5 border-t pt-5">
                  <p className="text-sm font-semibold text-muted-foreground">Cancelled</p>
                  <p className="mt-1">{b.cancelled_reason}</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <BookingActions
                id={b.id}
                status={b.status}
                paymentStatus={b.payment_status}
                meetingMode={b.meeting_mode}
                meetingUrl={b.meeting_url}
                dateValue={start.toFormat("yyyy-MM-dd")}
                timeValue={start.toFormat("HH:mm")}
              />
            </CardContent>
          </Card>
        </div>

        <Card className="content-start">
          <CardContent className="p-6">
            {b.payment_status === "paid" || b.status === "completed" || b.status === "confirmed" ? (
              <NotesEditor
                bookingId={b.id}
                clinicalHtml={note?.clinical_html ?? ""}
                clinicalJson={note?.clinical_json ?? null}
                summaryHtml={note?.summary_html ?? ""}
                summaryJson={note?.summary_json ?? null}
                followUpOn={note?.follow_up_on ?? null}
                summarySentAt={note?.summary_sent_at ?? null}
              />
            ) : (
              <p className="py-10 text-center text-muted-foreground">Notes open once the consultation is confirmed.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
