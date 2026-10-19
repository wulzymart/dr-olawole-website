"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  confirmBankPayment,
  markRefunded,
  rescheduleBooking,
  setBookingStatus,
  setMeetingUrl,
  type ActionResult,
} from "@/app/dashboard/actions";
import type { BookingStatus, PaymentStatus } from "@/lib/types";

interface Props {
  id: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  meetingMode: string;
  meetingUrl: string | null;
  dateValue: string;
  timeValue: string;
}

export function BookingActions({ id, status, paymentStatus, meetingMode, meetingUrl, dateValue, timeValue }: Props) {
  const [pending, start] = useTransition();
  const [url, setUrl] = useState(meetingUrl ?? "");
  const [date, setDate] = useState(dateValue);
  const [time, setTime] = useState(timeValue);
  const [notify, setNotify] = useState(true);
  const [reason, setReason] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  function run(fn: () => Promise<ActionResult>, after?: () => void) {
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message ?? "Done");
        after?.();
      } else toast.error(r.error);
    });
  }

  const live = status === "confirmed" || status === "awaiting_verification";

  return (
    <div className="grid gap-8">
      {status === "awaiting_verification" && (
        <section className="rounded-2xl border border-coral-400 bg-coral-400/10 p-5">
          <h3 className="font-display text-xl font-semibold">Confirm the transfer</h3>
          <p className="mt-1 text-sm text-muted-foreground">Only confirm once the money is in your bank account. The patient is told straight away.</p>
          <Button className="mt-4" disabled={pending} onClick={() => run(() => confirmBankPayment(id))}>
            {pending ? <Loader2 className="animate-spin" /> : null} I have received the payment
          </Button>
        </section>
      )}

      {status === "confirmed" && (
        <div className="flex flex-wrap gap-3">
          <Button disabled={pending} onClick={() => run(() => setBookingStatus({ id, status: "completed" }))}>Mark as completed</Button>
          <Button variant="outline" disabled={pending} onClick={() => run(() => setBookingStatus({ id, status: "no_show" }))}>Patient did not attend</Button>
        </div>
      )}

      {(status === "completed" || status === "no_show") && (
        <Button variant="outline" className="w-fit" disabled={pending} onClick={() => run(() => setBookingStatus({ id, status: "confirmed" }))}>
          Move back to confirmed
        </Button>
      )}

      {meetingMode === "meet" && (
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => setMeetingUrl(id, url));
          }}
        >
          <Label htmlFor="meet">Google Meet link for this patient</Label>
          <div className="flex gap-2">
            <Input id="meet" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://meet.google.com/..." inputMode="url" />
            <Button type="submit" variant="outline" disabled={pending}>Save</Button>
          </div>
        </form>
      )}

      {live && (
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => rescheduleBooking({ id, date, time, notify }));
          }}
        >
          <h3 className="font-display text-xl font-semibold">Move to another time</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="rs-date">Date</Label>
              <Input id="rs-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rs-time">Start time</Label>
              <Input id="rs-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Checkbox id="rs-notify" checked={notify} onCheckedChange={(v) => setNotify(v === true)} />
            <Label htmlFor="rs-notify" className="font-normal">Tell the patient about the new time</Label>
          </div>
          <Button type="submit" variant="outline" className="w-fit" disabled={pending}>Move consultation</Button>
        </form>
      )}

      {paymentStatus === "paid" && status === "cancelled" && (
        <section className="rounded-2xl border p-5">
          <h3 className="font-display text-xl font-semibold">Refund</h3>
          <p className="mt-1 text-sm text-muted-foreground">Refund the patient from your Paystack, Flutterwave or bank account first, then record it here.</p>
          <Button className="mt-4" variant="outline" disabled={pending} onClick={() => run(() => markRefunded(id))}>I have refunded this patient</Button>
        </section>
      )}

      {live && (
        <section className="rounded-2xl border p-5">
          <h3 className="font-display text-xl font-semibold">Cancel this consultation</h3>
          {!confirmCancel ? (
            <Button className="mt-3" variant="outline" onClick={() => setConfirmCancel(true)}>Cancel consultation</Button>
          ) : (
            <div className="mt-3 grid gap-3">
              <Label htmlFor="reason">Reason (kept on record)</Label>
              <Textarea id="reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  disabled={pending}
                  onClick={() => run(() => setBookingStatus({ id, status: "cancelled", reason }), () => setConfirmCancel(false))}
                >
                  Yes, cancel it
                </Button>
                <Button variant="ghost" onClick={() => setConfirmCancel(false)}>Keep it</Button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
