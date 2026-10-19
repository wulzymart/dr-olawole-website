import Link from "next/link";
import { DateTime } from "luxon";
import { requireAdmin } from "@/lib/auth";
import { loadSettings } from "@/lib/booking/core";
import { fmtDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import type { Booking } from "@/lib/types";
import { PageHeader } from "@/components/dashboard/page-header";
import { BookingStatusBadge, PaymentBadge } from "@/components/dashboard/status";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "action", label: "Needs action" },
  { id: "past", label: "Past" },
  { id: "all", label: "Everything" },
] as const;

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const { tab = "upcoming", q = "" } = await searchParams;
  const { supabase } = await requireAdmin();
  const { site } = await loadSettings();
  const nowIso = DateTime.now().toUTC().toISO()!;

  let query = supabase.from("bookings").select("*").limit(200);
  if (tab === "upcoming") query = query.in("status", ["confirmed", "awaiting_verification"]).gte("end_at", nowIso).order("start_at");
  else if (tab === "action") query = query.or("status.eq.awaiting_verification,and(status.eq.cancelled,payment_status.eq.paid)").order("start_at");
  else if (tab === "past") query = query.in("status", ["confirmed", "completed", "no_show"]).lt("end_at", nowIso).order("start_at", { ascending: false });
  else query = query.neq("status", "pending_payment").order("start_at", { ascending: false });

  const term = q.trim().replace(/[%,()]/g, " ");
  if (term) query = query.or(`patient_name.ilike.%${term}%,patient_email.ilike.%${term}%,reference.ilike.%${term}%`);

  const { data } = await query;
  const rows = (data ?? []) as Booking[];

  return (
    <>
      <PageHeader title="Consultations" description="Everyone who has booked, and everything you need to do for them." />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Filter consultations" className="flex flex-wrap gap-1 rounded-full bg-mint-100 p-1">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard/bookings?tab=${t.id}${term ? `&q=${encodeURIComponent(term)}` : ""}`}
              aria-current={tab === t.id ? "page" : undefined}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                tab === t.id ? "bg-pine-950 text-white" : "text-pine-900 hover:bg-white",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <form className="flex gap-2" role="search">
          <input type="hidden" name="tab" value={tab} />
          <label className="sr-only" htmlFor="q">Search by name, email or reference</label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Search name, email or reference"
            className="h-11 w-72 max-w-full rounded-xl border bg-white px-4 text-[0.95rem] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>
      </div>

      <Card>
        {rows.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-display text-xl font-semibold">Nothing here</p>
            <p className="mt-1 text-muted-foreground">No consultations match this view.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>When</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Consultation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Fee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="whitespace-nowrap">
                    <Link href={`/dashboard/bookings/${b.id}`} className="font-semibold underline-offset-4 hover:underline">
                      {fmtDateTime(b.start_at, site.timezone)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{b.patient_name}</div>
                    <div className="text-sm text-muted-foreground">{b.patient_email}</div>
                  </TableCell>
                  <TableCell>
                    {b.service_name}
                    <div className="text-sm text-muted-foreground">{b.duration_minutes} min</div>
                  </TableCell>
                  <TableCell><BookingStatusBadge status={b.status} /></TableCell>
                  <TableCell><PaymentBadge status={b.payment_status} /></TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(b.amount_minor, b.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
